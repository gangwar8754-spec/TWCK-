import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { ProceduralAudio } from './audio';
import { HumanRig, animateHumanRig, createHumanRig } from './humanBuilder';
import { CityLivingWorld } from './npcAndTraffic';
import { ParticleAndSkidSystem } from './particles';
import {
  PlayerWalkState,
  VehiclePhysicsState,
  createInitialVehicleState,
  stepPlayerWalkPhysics,
  stepVehiclePhysics,
} from './physics';
import {
  generateWorldProps,
  groundHeightAt,
  zoneNameAt,
} from './terrain';
import { ProceduralTextures, createProceduralTextures } from './textures';
import {
  ActiveMissionState,
  CameraMode,
  ControlInput,
  GameScreen,
  GameSettings,
  GearValue,
  HIDDEN_LOCATIONS,
  LiveTelemetry,
  MISSIONS,
  MinimapBlip,
  MissionDef,
  VEHICLES,
  VehicleConfig,
  findVehicleConfig,
} from './types';
import { BuiltVehicle, buildVehicleModel } from './vehicleBuilder';
import { WorldHandles, buildKasbapurWorld } from './worldBuilder';

// Pre-allocated scratch math objects (Zero GC inside rAF loop)
const _camTargetPos = new THREE.Vector3();
const _camLookAt = new THREE.Vector3();
const _worldAnchorPos = new THREE.Vector3();
const _worldLookPos = new THREE.Vector3();
const _skyTop = new THREE.Color();
const _skyHoriz = new THREE.Color();
const _skyGround = new THREE.Color();
const _sunColor = new THREE.Color();
const _weatherFogTint = new THREE.Color(0x525d6b);

const SKY_STOPS = {
  dawn: { top: 0x2c4e78, horiz: 0xf49d6e, ground: 0x6b5642, sun: 0xffba7a, sunInt: 1.55, hemiInt: 0.58 },
  golden: { top: 0x2a5f94, horiz: 0xf6b36b, ground: 0x7c6348, sun: 0xffcf88, sunInt: 1.85, hemiInt: 0.65 },
  midday: { top: 0x357ec7, horiz: 0xbfe0f5, ground: 0x867a63, sun: 0xfff5e0, sunInt: 2.05, hemiInt: 0.78 },
  dusk: { top: 0x1e2c54, horiz: 0xe66f51, ground: 0x45342d, sun: 0xff8254, sunInt: 1.35, hemiInt: 0.45 },
  night: { top: 0x070d1c, horiz: 0x162238, ground: 0x10141c, sun: 0x88a6d8, sunInt: 0.42, hemiInt: 0.28 },
};

const MANUAL_GEAR_ORDER: GearValue[] = ['P', 'R', 'N', '1', '2', '3', '4'];
const AUTO_GEAR_ORDER: GearValue[] = ['P', 'R', 'N', 'D'];

export interface EngineCallbacks {
  onTelemetry: (t: LiveTelemetry) => void;
  onCoinCollected: (coinId: number, amount: number) => void;
  onLocationDiscovered: (locId: string, rewardCoins: number) => void;
  onMissionCompleted: (missionId: string, rewardCoins: number) => void;
}

export class KasbapurEngine {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private isSoftwareGl: boolean;
  private textures: ProceduralTextures;
  private worldProps = generateWorldProps();
  private world: WorldHandles;
  private particles: ParticleAndSkidSystem;
  private livingWorld: CityLivingWorld;
  public audio = new ProceduralAudio();

  private sunLight: THREE.DirectionalLight;
  private hemiLight: THREE.HemisphereLight;
  private fog: THREE.FogExp2;
  private envRT: THREE.WebGLRenderTarget;

  private vehicleConfig: VehicleConfig = VEHICLES[0];
  private vehicleColor = VEHICLES[0].defaultColor;
  private vehicleModel: BuiltVehicle | null = null;
  private physics: VehiclePhysicsState;

  // Player character rig & on-foot state
  private playerRig: HumanRig;
  private isOnFoot = false;
  private walkState: PlayerWalkState = {
    x: 0,
    y: 0.2,
    z: -138,
    vy: 0,
    heading: 0,
    speed: 0,
    grounded: true,
    animPhase: 0,
    mode: 'idle',
  };
  private cameraYawOffset = 0; // Relative camera orbit offset when driving or yaw when walking
  private walkCameraYaw = 0;
  private walkCameraPitch = 0.28;

  private screen: GameScreen = 'menu';
  private cameraMode: CameraMode = 'chase';
  private settings: GameSettings;
  private headlightsManual: boolean | null = null;

  private input: ControlInput = {
    throttle: 0,
    brake: 0,
    reverse: false,
    steer: 0,
    handbrake: false,
    walkX: 0,
    walkY: 0,
    sprint: false,
    jump: false,
  };
  private keys = new Set<string>();

  private clock = new THREE.Clock();
  private elapsed = 0;
  private frameId = 0;
  private disposed = false;
  private timeHours = 17.3;

  // Gameplay state
  private coins = 60;
  private collectedCoins = new Set<number>();
  private discoveredLocs = new Set<string>();
  private activeMission: MissionDef | null = null;
  private missionCpIndex = 0;
  private missionTimer = 0;
  private notificationQueue: LiveTelemetry['notification'] = null;
  private notifExpiry = 0;
  private notifCounter = 1;
  private particleTimer = 0;
  private skidTimer = 0;
  private uiEmitTimer = 0;
  private garageOrbitAngle = 0.6;
  private isDraggingCanvas = false;
  private lastPointerX = 0;
  private lastPointerY = 0;
  private fuelRefillCooldown = 0;
  private fuelEmptyNotified = false;
  private rainActive = false;
  private weatherLabel = 'Clear Golden Sky';
  private minimapBlips: MinimapBlip[] = [];

  private callbacks: EngineCallbacks;

  constructor(
    container: HTMLElement,
    initialSettings: GameSettings,
    initialVehicleId: string,
    initialColor: string,
    initialCoins: number,
    collectedCoinIds: number[],
    discoveredLocIds: string[],
    callbacks: EngineCallbacks,
  ) {
    this.container = container;
    this.settings = { ...initialSettings };
    this.coins = initialCoins;
    collectedCoinIds.forEach((id) => this.collectedCoins.add(id));
    discoveredLocIds.forEach((id) => this.discoveredLocs.add(id));
    this.callbacks = callbacks;

    this.timeHours = this.presetToHours(this.settings.timePreset);

    // 1. Software WebGL detection
    this.isSoftwareGl = (() => {
      const probe = document.createElement('canvas').getContext('webgl2');
      if (!probe) return true;
      const ext = probe.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : probe.RENDERER;
      const gpu = String(probe.getParameter(param));
      probe.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    // 2. Renderer Setup (ACESFilmic + SRGBColorSpace)
    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(container.clientWidth || window.innerWidth, container.clientHeight || window.innerHeight);
    this.renderer.shadowMap.enabled = !this.isSoftwareGl && this.settings.shadows;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);

    // 3. Scene & Procedural Studio Environment IBL
    this.scene = new THREE.Scene();
    this.fog = new THREE.FogExp2(0xf6b36b, 0.0026);
    this.scene.fog = this.fog;

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    const roomEnv = new RoomEnvironment();
    this.envRT = pmrem.fromScene(roomEnv, 0.04);
    this.scene.environment = this.envRT.texture;
    this.scene.environmentIntensity = 0.65;
    roomEnv.dispose();
    pmrem.dispose();

    // 4. Camera
    const aspect = (container.clientWidth || window.innerWidth) / (container.clientHeight || window.innerHeight);
    this.camera = new THREE.PerspectiveCamera(62, aspect, 0.2, 740);
    this.camera.position.set(14, 10, -118);

    // 5. Outdoor Lighting Rig
    this.hemiLight = new THREE.HemisphereLight(0x8ec5fc, 0x7c5d41, 0.65);
    this.scene.add(this.hemiLight);

    this.sunLight = new THREE.DirectionalLight(0xffcf88, 1.85);
    this.sunLight.castShadow = !this.isSoftwareGl && this.settings.shadows;
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    const d = 60;
    this.sunLight.shadow.camera.left = -d;
    this.sunLight.shadow.camera.right = d;
    this.sunLight.shadow.camera.top = d;
    this.sunLight.shadow.camera.bottom = -d;
    this.sunLight.shadow.camera.near = 2;
    this.sunLight.shadow.camera.far = 230;
    this.sunLight.shadow.bias = -0.0005;
    this.sunLight.shadow.normalBias = 0.02;
    this.scene.add(this.sunLight);
    this.scene.add(this.sunLight.target);

    // 6. Textures, World, Particles & Living City (Traffic + Guards + NPCs)
    const maxAniso = this.renderer.capabilities.getMaxAnisotropy();
    this.textures = createProceduralTextures(maxAniso);
    this.world = buildKasbapurWorld(this.scene, this.textures, this.worldProps, this.isSoftwareGl);
    this.particles = new ParticleAndSkidSystem(this.scene, this.textures.particleSoft, this.textures.skidMark);
    this.livingWorld = new CityLivingWorld(
      this.scene,
      this.textures.contactShadow,
      this.isSoftwareGl,
      this.settings.trafficDensity,
    );

    // Hide already-collected coins
    this.collectedCoins.forEach((cid) => {
      const m = this.world.coinMeshes.get(cid);
      if (m) m.visible = false;
    });

    // 7. Player Character Rig & Initial Vehicle OUTSIDE KASBAPUR ENTRY GATE (z = -138, facing +Z into gate)
    this.playerRig = createHumanRig({ role: 'player' }, this.isSoftwareGl);

    const foundV = findVehicleConfig(initialVehicleId);
    this.vehicleConfig = foundV;
    this.vehicleColor = initialColor || foundV.defaultColor;
    this.physics = createInitialVehicleState(
      this.vehicleConfig,
      0,
      -138,
      0,
      this.settings.transmissionMode,
    );
    this.rebuildVehicle();
    this.attachPlayerToSeat();
    this.audio.setVolume(this.settings.soundVolume);

    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }

    // Event listeners
    window.addEventListener('resize', this.handleResize);
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    this.renderer.domElement.addEventListener('pointerdown', this.handleCanvasPointerDown);
    window.addEventListener('pointermove', this.handleCanvasPointerMove);
    window.addEventListener('pointerup', this.handleCanvasPointerUp);
    this.renderer.domElement.addEventListener('webglcontextlost', this.handleContextLost);

    this.applyAtmosphere(0);
    this.clock.start();
    this.tick();
  }

  private presetToHours(preset: GameSettings['timePreset']): number {
    switch (preset) {
      case 'golden':
        return 17.3;
      case 'midday':
        return 12.5;
      case 'dusk':
        return 18.6;
      case 'night':
        return 22.5;
      default:
        return 17.3;
    }
  }

  private attachPlayerToSeat() {
    if (!this.vehicleModel) return;
    this.scene.remove(this.playerRig.root);
    this.playerRig.root.position.set(0, 0, 0);
    this.playerRig.root.rotation.set(0, 0, 0);
    this.vehicleModel.driverSeatAnchor.add(this.playerRig.root);
    animateHumanRig(this.playerRig, 'seated', 0, 1);
  }

  private detachPlayerToFoot(wx: number, wz: number, heading: number) {
    if (this.vehicleModel) {
      this.vehicleModel.driverSeatAnchor.remove(this.playerRig.root);
    }
    const wy = groundHeightAt(wx, wz);
    this.walkState = {
      x: wx,
      y: wy,
      z: wz,
      vy: 0,
      heading,
      speed: 0,
      grounded: true,
      animPhase: 0,
      mode: 'idle',
    };
    this.walkCameraYaw = heading;
    this.playerRig.root.visible = true;
    this.playerRig.root.position.set(wx, wy, wz);
    this.playerRig.root.rotation.set(0, heading, 0);
    this.scene.add(this.playerRig.root);
    animateHumanRig(this.playerRig, 'idle', 0, 1);
  }

  private rebuildVehicle() {
    if (this.vehicleModel) {
      this.vehicleModel.driverSeatAnchor.remove(this.playerRig.root);
      this.scene.remove(this.vehicleModel.root);
      this.vehicleModel.dispose();
    }
    this.vehicleModel = buildVehicleModel(
      this.vehicleConfig,
      this.vehicleColor,
      this.textures.contactShadow,
      this.isSoftwareGl,
      true,
    );
    this.scene.add(this.vehicleModel.root);
    if (!this.isOnFoot) {
      this.attachPlayerToSeat();
    }
    this.syncVehicleTransform();
  }

  public setVehicle(vehicleId: string, paintHex: string) {
    const v = findVehicleConfig(vehicleId);
    const changedModel = v.id !== this.vehicleConfig.id || paintHex !== this.vehicleColor;
    this.vehicleConfig = v;
    this.vehicleColor = paintHex;
    if (changedModel) {
      this.physics.fuelLiters = v.fuelTankLiters;
      this.rebuildVehicle();
    }
  }

  public setScreen(screen: GameScreen) {
    const prev = this.screen;
    this.screen = screen;
    if (screen === 'playing') {
      this.audio.unlock();
      if (prev === 'garage') {
        this.resetVehicleToTownGate();
      } else if (prev === 'menu' && !this.isOnFoot) {
        this.attachPlayerToSeat();
      }
    } else if (screen === 'garage') {
      this.isOnFoot = false;
      this.physics = createInitialVehicleState(
        this.vehicleConfig,
        0,
        -28,
        0.45,
        this.settings.transmissionMode,
      );
      this.attachPlayerToSeat();
      this.syncVehicleTransform();
    }
  }

  public resetVehicleToTownGate() {
    this.isOnFoot = false;
    this.cameraYawOffset = 0;
    this.physics = createInitialVehicleState(
      this.vehicleConfig,
      0,
      -138,
      0,
      this.settings.transmissionMode,
    );
    this.physics.fuelLiters = this.vehicleConfig.fuelTankLiters;
    this.attachPlayerToSeat();
    this.syncVehicleTransform();
    this.pushNotification('Kasbapur City Gate', 'Ready outside the main entrance gate', 'amber');
  }

  public toggleEnterExitVehicle() {
    if (this.screen !== 'playing') return;
    this.audio.unlock();

    if (!this.isOnFoot) {
      // Exit current vehicle: park it in the living world and step out onto driver side
      const p = this.physics;
      const cosH = Math.cos(p.heading);
      const sinH = Math.sin(p.heading);
      const sideDist = Math.max(1.35, this.vehicleConfig.chassisWidth * 0.55 + 0.72);
      const exitX = p.x - cosH * sideDist;
      const exitZ = p.z + sinH * sideDist;

      // Park vehicle in world so player can re-enter it or walk away and enter any other vehicle
      const parkedPhysics: VehiclePhysicsState = {
        ...p,
        vx: 0,
        vz: 0,
        forwardSpeed: 0,
        lateralSpeed: 0,
        engineRunning: false,
        doorOpenAmt: 1.0,
      };
      this.livingWorld.parkPlayerVehicleInWorld(this.vehicleConfig, this.vehicleColor, parkedPhysics);

      // Hide dedicated player-vehicle mesh until player enters another vehicle
      if (this.vehicleModel) {
        this.vehicleModel.root.visible = false;
      }

      this.isOnFoot = true;
      this.detachPlayerToFoot(exitX, exitZ, p.heading);
      this.audio.playDoorToggle();
      this.pushNotification('On Foot', `Exited ${this.vehicleConfig.name} · Approach any car + E`, 'amber');
    } else {
      // Enter nearest vehicle in Kasbapur (parked fleet or live traffic!)
      const nearest = this.livingWorld.findNearestEnterableVehicle(this.walkState.x, this.walkState.z, 5.4);
      if (!nearest) {
        this.pushNotification('No Vehicle Nearby', 'Walk closer to any parked or traffic vehicle', 'amber');
        return;
      }

      const taken = this.livingWorld.takeOverVehicle(nearest.uid);
      if (!taken) return;

      this.vehicleConfig = taken.config;
      this.vehicleColor = taken.paintHex;
      this.physics = {
        ...taken.physics,
        vx: 0,
        vz: 0,
        forwardSpeed: 0,
        lateralSpeed: 0,
        transmissionMode: this.settings.transmissionMode,
        selectedGear: this.settings.transmissionMode === 'manual' ? '1' : 'D',
        actualGear: '1',
        engineRunning: true,
        doorOpenAmt: 1.0,
      };
      this.isOnFoot = false;
      this.cameraYawOffset = 0;
      this.rebuildVehicle();
      if (this.vehicleModel) {
        this.vehicleModel.root.visible = true;
      }
      this.audio.playDoorToggle();
      this.audio.playStarterCrank();
      this.pushNotification(`Entered ${taken.config.name}`, 'Engine running · Press W to drive', 'green');
    }
  }

  public setGear(gear: GearValue) {
    if (this.isOnFoot) return;
    this.audio.unlock();
    if (gear === 'D') {
      this.settings.transmissionMode = 'auto';
      this.physics.transmissionMode = 'auto';
      this.physics.selectedGear = 'D';
    } else if (gear === '1' || gear === '2' || gear === '3' || gear === '4') {
      this.settings.transmissionMode = 'manual';
      this.physics.transmissionMode = 'manual';
      this.physics.selectedGear = gear;
    } else {
      this.physics.selectedGear = gear;
    }
    this.physics.gearShiftPulse++;
    this.audio.playGearShift();
  }

  public shiftGear(delta: 1 | -1) {
    if (this.isOnFoot) return;
    this.audio.unlock();
    const list = this.physics.transmissionMode === 'manual' ? MANUAL_GEAR_ORDER : AUTO_GEAR_ORDER;
    const idx = list.indexOf(this.physics.selectedGear);
    const cur = idx === -1 ? (this.physics.transmissionMode === 'manual' ? 3 : 3) : idx;
    const nextIdx = Math.max(0, Math.min(list.length - 1, cur + delta));
    if (nextIdx !== cur) {
      this.physics.selectedGear = list[nextIdx];
      this.physics.gearShiftPulse++;
      this.audio.playGearShift();
    }
  }

  public toggleTransmissionMode() {
    this.audio.unlock();
    const next = this.settings.transmissionMode === 'manual' ? 'auto' : 'manual';
    this.settings.transmissionMode = next;
    this.physics.transmissionMode = next;
    if (next === 'auto') {
      this.physics.selectedGear = 'D';
    } else {
      const a = this.physics.actualGear;
      this.physics.selectedGear = a === '1' || a === '2' || a === '3' || a === '4' ? a : '1';
    }
    this.physics.gearShiftPulse++;
    this.audio.playGearShift();
    this.pushNotification(
      next === 'manual' ? 'Manual Transmission' : 'Automatic Transmission',
      next === 'manual' ? 'Use 1-4 / Q & F or gear buttons to shift' : 'Gears shift automatically with RPM',
      'amber',
    );
  }

  public toggleEngine() {
    if (this.isOnFoot) return;
    this.audio.unlock();
    this.physics.engineRunning = !this.physics.engineRunning;
    if (this.physics.engineRunning) {
      this.audio.playStarterCrank();
      this.pushNotification('Engine Started', `${this.vehicleConfig.name} ignition ON`, 'green');
    } else {
      this.pushNotification('Engine Stopped', 'Ignition turned OFF', 'amber');
    }
  }

  public cycleCamera() {
    const order: CameraMode[] = ['chase', 'far', 'cockpit', 'hood'];
    const idx = order.indexOf(this.cameraMode);
    this.cameraMode = order[(idx + 1) % order.length];
    this.cameraYawOffset = 0;
    this.pushNotification('Camera View', this.cameraMode.toUpperCase(), 'amber');
  }

  public rotateCameraBy(dx: number, dy: number) {
    if (this.isOnFoot) {
      this.walkCameraYaw -= dx * 0.0065;
      this.walkCameraPitch = THREE.MathUtils.clamp(this.walkCameraPitch + dy * 0.004, 0.05, 0.72);
    } else {
      this.cameraYawOffset -= dx * 0.006;
    }
  }

  public toggleHeadlights() {
    const autoOn = this.timeHours >= 18.2 || this.timeHours < 6.0;
    const current = this.headlightsManual !== null ? this.headlightsManual : autoOn;
    this.headlightsManual = !current;
  }

  public setTouchInput(partial: Partial<ControlInput>) {
    this.audio.unlock();
    Object.assign(this.input, partial);
  }

  public updateSettings(next: GameSettings) {
    const prevPreset = this.settings.timePreset;
    this.settings = { ...next };
    if (next.timePreset !== 'cycle' && next.timePreset !== prevPreset) {
      this.timeHours = this.presetToHours(next.timePreset);
    }
    this.physics.transmissionMode = next.transmissionMode;
    if (next.transmissionMode === 'auto' && ['1', '2', '3', '4'].includes(this.physics.selectedGear)) {
      this.physics.selectedGear = 'D';
    } else if (next.transmissionMode === 'manual' && this.physics.selectedGear === 'D') {
      this.physics.selectedGear = '1';
    }
    this.livingWorld.setTrafficDensity(next.trafficDensity);
    this.renderer.shadowMap.enabled = !this.isSoftwareGl && next.shadows;
    this.sunLight.castShadow = !this.isSoftwareGl && next.shadows;
    this.audio.setVolume(next.soundVolume);
  }

  public startMission(missionId: string) {
    const m = MISSIONS.find((item) => item.id === missionId);
    if (!m) return;
    this.activeMission = m;
    this.missionCpIndex = 0;
    this.missionTimer = m.timeLimitSec;
    const cp = m.checkpoints[0];
    this.world.checkpointBeacon.visible = true;
    this.world.checkpointBeacon.position.set(cp.x, groundHeightAt(cp.x, cp.z) + 0.15, cp.z);

    if (this.isOnFoot) {
      this.isOnFoot = false;
      if (this.vehicleModel) this.vehicleModel.root.visible = true;
      this.attachPlayerToSeat();
    }

    const startX = m.id === 'gate_to_munish' ? 0 : cp.x - (cp.x === 0 ? 0 : 12);
    const startZ = m.id === 'gate_to_munish' ? -136 : cp.z - 14;
    const heading = Math.atan2(cp.x - startX, cp.z - startZ);
    this.physics = createInitialVehicleState(
      this.vehicleConfig,
      startX,
      startZ,
      heading,
      this.settings.transmissionMode,
    );
    this.syncVehicleTransform();
    this.pushNotification(`Mission: ${m.title}`, `Drive to ${cp.label}`, 'green');
  }

  public cancelMission() {
    this.activeMission = null;
    this.world.checkpointBeacon.visible = false;
  }

  public refuelFull() {
    this.physics.fuelLiters = this.vehicleConfig.fuelTankLiters;
    this.fuelEmptyNotified = false;
    this.pushNotification('Tank Refueled', 'Fuel tank 100% full', 'green');
  }

  private pushNotification(title: string, subtitle: string, tone: 'gold' | 'green' | 'amber') {
    this.notificationQueue = { id: this.notifCounter++, title, subtitle, tone };
    this.notifExpiry = this.elapsed + 3.8;
  }

  private handleResize = () => {
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  };

  private handleKeyDown = (e: KeyboardEvent) => {
    this.audio.unlock();
    const code = e.code;
    this.keys.add(code);
    if (this.screen === 'playing') {
      if (code === 'KeyE') this.toggleEnterExitVehicle();
      if (code === 'KeyC') this.cycleCamera();
      if (code === 'KeyL') this.toggleHeadlights();
      if (code === 'KeyR') this.resetVehicleToTownGate();
      if (code === 'KeyX') this.toggleEngine();
      if (code === 'KeyG') this.toggleTransmissionMode();
      if (code === 'KeyQ') this.shiftGear(-1);
      if (code === 'KeyF') this.shiftGear(1);
      if (code === 'Digit1') this.setGear('1');
      if (code === 'Digit2') this.setGear('2');
      if (code === 'Digit3') this.setGear('3');
      if (code === 'Digit4') this.setGear('4');
      if (code === 'KeyN') this.setGear('N');
      if (code === 'KeyP') this.setGear('P');
    }
  };

  private handleKeyUp = (e: KeyboardEvent) => {
    this.keys.delete(e.code);
  };

  private handleCanvasPointerDown = (e: PointerEvent) => {
    if (this.screen === 'garage' || this.screen === 'playing') {
      this.isDraggingCanvas = true;
      this.lastPointerX = e.clientX;
      this.lastPointerY = e.clientY;
    }
  };

  private handleCanvasPointerMove = (e: PointerEvent) => {
    if (!this.isDraggingCanvas) return;
    const dx = e.clientX - this.lastPointerX;
    const dy = e.clientY - this.lastPointerY;
    this.lastPointerX = e.clientX;
    this.lastPointerY = e.clientY;

    if (this.screen === 'garage') {
      this.garageOrbitAngle -= dx * 0.008;
    } else if (this.screen === 'playing') {
      this.rotateCameraBy(dx, dy);
    }
  };

  private handleCanvasPointerUp = () => {
    this.isDraggingCanvas = false;
  };

  private handleContextLost = (e: Event) => {
    e.preventDefault();
  };

  private readKeyboardAndMergeInput(): ControlInput {
    const w = this.keys.has('KeyW') || this.keys.has('ArrowUp');
    const s = this.keys.has('KeyS') || this.keys.has('ArrowDown');
    const a = this.keys.has('KeyA') || this.keys.has('ArrowLeft');
    const d = this.keys.has('KeyD') || this.keys.has('ArrowRight');
    const space = this.keys.has('Space');
    const shift = this.keys.has('ShiftLeft') || this.keys.has('ShiftRight');

    const kbSteer = (a ? 1 : 0) - (d ? 1 : 0);
    const kbWalkX = (d ? 1 : 0) - (a ? 1 : 0);
    const kbWalkY = (w ? 1 : 0) - (s ? 1 : 0);

    return {
      throttle: Math.max(this.input.throttle, w ? 1 : 0),
      brake: Math.max(this.input.brake, s ? 1 : 0),
      reverse: this.input.reverse,
      steer: Math.abs(this.input.steer) > 0.05 ? this.input.steer : kbSteer,
      handbrake: this.input.handbrake || space,
      walkX: Math.abs(this.input.walkX) > 0.08 ? this.input.walkX : kbWalkX,
      walkY: Math.abs(this.input.walkY) > 0.08 ? this.input.walkY : kbWalkY,
      sprint: this.input.sprint || shift,
      jump: this.input.jump || space,
    };
  }

  private getActivePlayerPosition(): { x: number; y: number; z: number; heading: number } {
    if (this.isOnFoot) {
      return {
        x: this.walkState.x,
        y: this.walkState.y,
        z: this.walkState.z,
        heading: this.walkState.heading,
      };
    }
    return {
      x: this.physics.x,
      y: this.physics.y,
      z: this.physics.z,
      heading: this.physics.heading,
    };
  }

  private applyAtmosphere(dt: number) {
    if (this.settings.timePreset === 'cycle' && this.screen !== 'paused') {
      this.timeHours = (this.timeHours + dt * 0.1 * this.settings.dayCycleSpeed) % 24;
    }

    const h = this.timeHours;
    let a = SKY_STOPS.golden;
    let b = SKY_STOPS.golden;
    let t = 0;

    if (h >= 5 && h < 8) {
      a = SKY_STOPS.night;
      b = SKY_STOPS.dawn;
      t = (h - 5) / 3;
    } else if (h >= 8 && h < 15.5) {
      a = SKY_STOPS.dawn;
      b = SKY_STOPS.midday;
      t = Math.min(1, (h - 8) / 2.5);
    } else if (h >= 15.5 && h < 18) {
      a = SKY_STOPS.midday;
      b = SKY_STOPS.golden;
      t = (h - 15.5) / 2.5;
    } else if (h >= 18 && h < 19.6) {
      a = SKY_STOPS.golden;
      b = SKY_STOPS.dusk;
      t = (h - 18) / 1.6;
    } else if (h >= 19.6 && h < 21.2) {
      a = SKY_STOPS.dusk;
      b = SKY_STOPS.night;
      t = (h - 19.6) / 1.6;
    } else {
      a = SKY_STOPS.night;
      b = SKY_STOPS.night;
      t = 0;
    }

    // Weather resolution
    let weatherDensity = 0.0025;
    let rainOn = false;
    const wm = this.settings.weatherMode;
    if (wm === 'rain') {
      rainOn = true;
      weatherDensity = 0.0052;
      this.weatherLabel = 'Monsoon Rain';
    } else if (wm === 'fog') {
      rainOn = false;
      weatherDensity = 0.0115;
      this.weatherLabel = 'Valley Fog';
    } else if (wm === 'dynamic') {
      const cyclePhase = (this.elapsed * 0.018) % 3;
      if (cyclePhase < 1.2) {
        rainOn = false;
        weatherDensity = 0.0025;
        this.weatherLabel = 'Clear Sky';
      } else if (cyclePhase < 2.2) {
        rainOn = true;
        weatherDensity = 0.0055;
        this.weatherLabel = 'Passing Showers';
      } else {
        rainOn = false;
        weatherDensity = 0.0085;
        this.weatherLabel = 'Morning Mist';
      }
    } else {
      rainOn = false;
      weatherDensity = 0.0025;
      this.weatherLabel = 'Clear Sky';
    }
    this.rainActive = rainOn;
    this.fog.density = THREE.MathUtils.damp(this.fog.density, weatherDensity, 2.5, Math.max(dt, 0.016));

    _skyTop.setHex(a.top).lerp(_skyHoriz.setHex(b.top), t);
    if (rainOn) _skyTop.lerp(_weatherFogTint, 0.45);
    this.world.skyMaterial.uniforms.uTopColor.value.copy(_skyTop);

    _skyHoriz.setHex(a.horiz).lerp(_skyGround.setHex(b.horiz), t);
    if (rainOn || wm === 'fog') _skyHoriz.lerp(_weatherFogTint, 0.35);
    this.world.skyMaterial.uniforms.uHorizonColor.value.copy(_skyHoriz);
    this.fog.color.copy(_skyHoriz);

    _skyGround.setHex(a.ground).lerp(_sunColor.setHex(b.ground), t);
    this.world.skyMaterial.uniforms.uGroundColor.value.copy(_skyGround);

    _sunColor.setHex(a.sun).lerp(_skyTop.setHex(b.sun), t);
    this.sunLight.color.copy(_sunColor);
    const weatherLightScale = rainOn ? 0.65 : wm === 'fog' ? 0.78 : 1.0;
    this.sunLight.intensity = THREE.MathUtils.lerp(a.sunInt, b.sunInt, t) * weatherLightScale;
    this.hemiLight.intensity = THREE.MathUtils.lerp(a.hemiInt, b.hemiInt, t) * (rainOn ? 0.85 : 1.0);

    const pos = this.getActivePlayerPosition();
    const sunAngle = ((h - 6) / 24) * Math.PI * 2;
    const sunY = Math.sin(sunAngle);
    const sunX = Math.cos(sunAngle);
    const sunDirX = sunX * 110;
    const sunDirY = Math.max(12, sunY * 110);
    const sunDirZ = 45;

    this.sunLight.position.set(pos.x + sunDirX, pos.y + sunDirY, pos.z + sunDirZ);
    this.sunLight.target.position.set(pos.x, pos.y, pos.z);
    this.sunLight.target.updateMatrixWorld();

    this.world.sunDisc.position.set(sunX * 390, sunY * 390, 120);
    this.world.sunDisc.visible = sunY > -0.08 && !rainOn;
    this.world.moonDisc.position.set(-sunX * 390, -sunY * 390, -120);
    this.world.moonDisc.visible = sunY < 0.1 && !rainOn;

    const isNight = h >= 18.2 || h < 6.0;
    const hlOn = this.headlightsManual !== null ? this.headlightsManual : isNight;
    if (this.vehicleModel) {
      for (const spot of this.vehicleModel.headlightSpots) {
        spot.intensity = hlOn && !this.isOnFoot && this.physics.engineRunning ? 18 : 0;
      }
      for (const mat of this.vehicleModel.headlightMaterials) {
        mat.emissiveIntensity = hlOn && !this.isOnFoot ? 2.4 : 0.3;
      }
    }

    const nightFactor = isNight ? Math.min(1, h >= 18.2 ? (h - 18.2) / 1.8 : 1 - h / 6) : 0;
    this.world.updateDynamicProps(this.elapsed, nightFactor, rainOn, pos.x, pos.z, dt);
  }

  private syncVehicleTransform() {
    if (!this.vehicleModel) return;
    const m = this.vehicleModel;
    const p = this.physics;

    m.root.position.set(p.x, p.y, p.z);
    m.root.rotation.set(0, p.heading, 0);

    m.chassisGroup.position.y = p.heave;
    m.chassisGroup.rotation.set(p.pitch, 0, p.roll, 'YXZ');

    m.contactShadow.position.y = -this.vehicleConfig.groundClearance + 0.05;

    // Gentle door close animation after entering
    if (p.doorOpenAmt > 0.005) {
      p.doorOpenAmt = THREE.MathUtils.damp(p.doorOpenAmt, 0, 8, 0.016);
      m.doorPivot.rotation.y = p.doorOpenAmt * 1.05;
    } else {
      m.doorPivot.rotation.y = 0;
    }

    for (let i = 0; i < 4; i++) {
      m.wheelPivots[i].position.y = p.wheelOffsets[i];
      if (i < 2) {
        m.wheelPivots[i].rotation.y = p.steerAngle;
      }
      m.wheelMeshes[i].rotation.x = p.wheelSpin;
    }

    const merged = this.readKeyboardAndMergeInput();
    const braking = !this.isOnFoot && (merged.brake > 0.08 || merged.handbrake || p.selectedGear === 'P');
    for (const mat of m.brakeMaterials) {
      mat.emissiveIntensity = braking ? 2.6 : 0.28;
    }
  }

  private updateParticlesAndFX(mergedInput: ControlInput, dt: number) {
    const p = this.physics;
    const speedKmh = Math.abs(p.forwardSpeed) * 3.6;

    this.particleTimer += dt;
    this.skidTimer += dt;

    const sinH = Math.sin(p.heading);
    const cosH = Math.cos(p.heading);
    const rearOffset = -this.vehicleConfig.wheelBase * 0.5;
    const halfT = this.vehicleConfig.trackWidth * 0.5;

    if (!this.isOnFoot && speedKmh > 6 && this.particleTimer > 0.045) {
      this.particleTimer = 0;
      const emitColor =
        p.surface === 'mud'
          ? 0x3e2a1c
          : p.surface === 'water'
          ? 0xcbe8f0
          : p.surface === 'dirt' || p.surface === 'grass'
          ? 0xb89668
          : 0x000000;

      if (emitColor !== 0x000000 || mergedInput.handbrake) {
        const finalColor = emitColor === 0x000000 ? 0x9aa0a6 : emitColor;
        for (const side of [-1, 1]) {
          const wx = p.x + side * halfT * cosH + rearOffset * sinH;
          const wz = p.z - side * halfT * sinH + rearOffset * cosH;
          const wy = groundHeightAt(wx, wz, p.y) + 0.22;
          const upVel = p.surface === 'water' ? 2.4 + Math.random() * 1.5 : 0.8 + Math.random() * 0.9;
          this.particles.emit(
            wx + (Math.random() - 0.5) * 0.3,
            wy,
            wz + (Math.random() - 0.5) * 0.3,
            -p.vx * 0.18 + (Math.random() - 0.5) * 1.2,
            upVel,
            -p.vz * 0.18 + (Math.random() - 0.5) * 1.2,
            finalColor,
            p.surface === 'water' ? 0.32 : 0.45,
            p.surface === 'mud' ? 1.15 : 1.75,
            p.surface === 'water' ? 0.55 : 0.8,
          );
        }
      }
    }

    if (!this.isOnFoot && p.skidIntensity > 0.36 && speedKmh > 8 && this.skidTimer > 0.055 && p.surface !== 'water') {
      this.skidTimer = 0;
      const rx = p.x + rearOffset * sinH;
      const rz = p.z + rearOffset * cosH;
      const ry = groundHeightAt(rx, rz, p.y);
      this.particles.addSkidMark(rx, ry, rz, p.heading, p.pitch, p.roll);
    }

    this.particles.update(dt);
  }

  private updateGameplayTriggers(dt: number) {
    const pos = this.getActivePlayerPosition();

    // 1. Coin Collection
    for (const coin of this.worldProps.coins) {
      if (this.collectedCoins.has(coin.id)) continue;
      const dx = pos.x - coin.x;
      const dz = pos.z - coin.z;
      if (dx * dx + dz * dz < 10.5) {
        this.collectedCoins.add(coin.id);
        const mesh = this.world.coinMeshes.get(coin.id);
        if (mesh) mesh.visible = false;
        this.coins += 20;
        this.audio.playCoin();
        this.callbacks.onCoinCollected(coin.id, 20);
        this.pushNotification('+20 Coins', 'Collected Kasbapur coin', 'gold');
      }
    }

    // 2. Fuel Jerrycan Pickups & Kasba Fuel Pump Auto-Refill (when in vehicle)
    if (!this.isOnFoot) {
      if (this.fuelRefillCooldown > 0) this.fuelRefillCooldown -= dt;

      if (Math.hypot(pos.x - 22, pos.z + 20) < 6.5 && this.physics.fuelLiters < this.vehicleConfig.fuelTankLiters * 0.96) {
        this.physics.fuelLiters = Math.min(this.vehicleConfig.fuelTankLiters, this.physics.fuelLiters + 18 * dt);
        if (this.fuelRefillCooldown <= 0) {
          this.fuelRefillCooldown = 3.5;
          this.fuelEmptyNotified = false;
          this.pushNotification('Kasba Fuel Pump', 'Refueling tank...', 'green');
        }
      }

      for (const fc of this.worldProps.fuelCans) {
        const fg = this.world.fuelMeshes.get(fc.id);
        if (!fg || !fg.visible) continue;
        if (Math.hypot(pos.x - fc.x, pos.z - fc.z) < 3.4) {
          fg.visible = false;
          this.physics.fuelLiters = this.vehicleConfig.fuelTankLiters;
          this.fuelEmptyNotified = false;
          this.audio.playCheckpoint(false);
          this.pushNotification('Fuel Jerrycan', 'Fuel restored to 100%', 'green');
          window.setTimeout(() => {
            if (!this.disposed) fg.visible = true;
          }, 35000);
        }
      }

      if (this.physics.fuelLiters <= 0.1 && !this.fuelEmptyNotified) {
        this.fuelEmptyNotified = true;
        this.pushNotification('Low Fuel!', 'Visit Kasba Fuel Pump or grab a red jerrycan', 'amber');
      }
    }

    // 3. Hidden Locations Discovery
    for (const loc of HIDDEN_LOCATIONS) {
      if (this.discoveredLocs.has(loc.id)) continue;
      if (Math.hypot(pos.x - loc.x, pos.z - loc.z) < loc.radius) {
        this.discoveredLocs.add(loc.id);
        this.coins += loc.rewardCoins;
        this.audio.playCheckpoint(true);
        this.callbacks.onLocationDiscovered(loc.id, loc.rewardCoins);
        this.pushNotification(`Discovered: ${loc.name}`, `+${loc.rewardCoins} Bonus Coins`, 'gold');
      }
    }

    // 4. Active Mission Checkpoints & Countdown
    if (this.activeMission) {
      this.missionTimer -= dt;
      const cp = this.activeMission.checkpoints[this.missionCpIndex];
      const dist = Math.hypot(pos.x - cp.x, pos.z - cp.z);

      if (dist < 6.8) {
        this.missionCpIndex++;
        if (this.missionCpIndex >= this.activeMission.checkpoints.length) {
          const reward = this.activeMission.rewardCoins;
          const mId = this.activeMission.id;
          const mTitle = this.activeMission.title;
          this.coins += reward;
          this.activeMission = null;
          this.world.checkpointBeacon.visible = false;
          this.audio.playCheckpoint(true);
          this.callbacks.onMissionCompleted(mId, reward);
          this.pushNotification(`Completed: ${mTitle}`, `+${reward} Coins Awarded`, 'gold');
        } else {
          const nextCp = this.activeMission.checkpoints[this.missionCpIndex];
          this.world.checkpointBeacon.position.set(nextCp.x, groundHeightAt(nextCp.x, nextCp.z) + 0.15, nextCp.z);
          this.audio.playCheckpoint(false);
          this.pushNotification('Checkpoint Reached', `Next: ${nextCp.label}`, 'green');
        }
      } else if (this.missionTimer <= 0) {
        this.pushNotification('Mission Time Up', 'Try again from the Missions menu', 'amber');
        this.activeMission = null;
        this.world.checkpointBeacon.visible = false;
      }
    }
  }

  private updateCamera(dt: number) {
    const smooth = 1 - Math.exp(-7.5 * this.settings.cameraSmoothing * dt);

    if (this.screen === 'menu') {
      // Sweeping view showcasing Kasbapur Entry Gate & Munish House boulevard
      const orbitA = this.elapsed * 0.085;
      _camTargetPos.set(Math.cos(orbitA) * 58, 22 + Math.sin(orbitA * 0.7) * 4, -85 + Math.sin(orbitA) * 46);
      this.camera.position.lerp(_camTargetPos, 0.08);
      _camLookAt.set(16, 4, -92);
      this.camera.lookAt(_camLookAt);
      this.camera.fov = THREE.MathUtils.damp(this.camera.fov, 54, 5, dt);
      this.camera.updateProjectionMatrix();
      return;
    }

    if (this.screen === 'garage') {
      const r = 6.8;
      if (!this.isDraggingCanvas) {
        this.garageOrbitAngle += dt * 0.22;
      }
      _camTargetPos.set(
        this.physics.x + Math.cos(this.garageOrbitAngle) * r,
        this.physics.y + 2.35,
        this.physics.z + Math.sin(this.garageOrbitAngle) * r,
      );
      this.camera.position.lerp(_camTargetPos, 1 - Math.exp(-9 * dt));
      _camLookAt.set(this.physics.x, this.physics.y + 0.85, this.physics.z);
      this.camera.lookAt(_camLookAt);
      this.camera.fov = THREE.MathUtils.damp(this.camera.fov, 48, 6, dt);
      this.camera.updateProjectionMatrix();
      return;
    }

    // GTA On-Foot Third-Person Camera
    if (this.isOnFoot) {
      const dist = 4.4;
      const sinC = Math.sin(this.walkCameraYaw);
      const cosC = Math.cos(this.walkCameraYaw);
      const horiz = Math.cos(this.walkCameraPitch) * dist;
      const vert = 1.65 + Math.sin(this.walkCameraPitch) * dist;

      _camTargetPos.set(
        this.walkState.x - sinC * horiz,
        this.walkState.y + vert,
        this.walkState.z - cosC * horiz,
      );
      const minY = groundHeightAt(_camTargetPos.x, _camTargetPos.z) + 0.85;
      if (_camTargetPos.y < minY) _camTargetPos.y = minY;

      this.camera.position.lerp(_camTargetPos, 1 - Math.exp(-12 * dt));
      _camLookAt.set(this.walkState.x + sinC * 2.5, this.walkState.y + 1.4, this.walkState.z + cosC * 2.5);
      this.camera.lookAt(_camLookAt);
      this.camera.fov = THREE.MathUtils.damp(this.camera.fov, 60, 6, dt);
      this.camera.updateProjectionMatrix();
      return;
    }

    if (!this.vehicleModel) return;
    const p = this.physics;
    const sinH = Math.sin(p.heading);
    const cosH = Math.cos(p.heading);
    const speedKmh = Math.abs(p.forwardSpeed) * 3.6;

    // Hide driver head mesh in first-person cockpit so view stays unobstructed
    this.playerRig.root.visible = this.cameraMode !== 'cockpit';

    if (this.cameraMode === 'cockpit') {
      this.vehicleModel.cockpitAnchor.getWorldPosition(_worldAnchorPos);
      this.camera.position.copy(_worldAnchorPos);
      _worldLookPos.set(
        _worldAnchorPos.x + sinH * 24,
        _worldAnchorPos.y - p.pitch * 12 - 0.5,
        _worldAnchorPos.z + cosH * 24,
      );
      this.camera.lookAt(_worldLookPos);
      this.camera.fov = THREE.MathUtils.damp(this.camera.fov, 68 + Math.min(8, speedKmh * 0.06), 6, dt);
      this.camera.updateProjectionMatrix();
      return;
    }

    if (this.cameraMode === 'hood') {
      this.vehicleModel.hoodAnchor.getWorldPosition(_worldAnchorPos);
      this.camera.position.copy(_worldAnchorPos);
      _worldLookPos.set(
        _worldAnchorPos.x + sinH * 26,
        _worldAnchorPos.y - p.pitch * 12 - 0.7,
        _worldAnchorPos.z + cosH * 26,
      );
      this.camera.lookAt(_worldLookPos);
      this.camera.fov = THREE.MathUtils.damp(this.camera.fov, 64 + Math.min(10, speedKmh * 0.08), 6, dt);
      this.camera.updateProjectionMatrix();
      return;
    }

    // Gently decay manual camera orbit offset back toward rear chase view while moving fast
    if (!this.isDraggingCanvas && speedKmh > 12) {
      this.cameraYawOffset = THREE.MathUtils.damp(this.cameraYawOffset, 0, 2.2, dt);
    }

    const baseScale = this.vehicleConfig.style === 'bus' || this.vehicleConfig.style === 'truck' ? 1.25 : 1.0;
    const dist = (this.cameraMode === 'far' ? 11.4 : 7.8) * baseScale;
    const height = (this.cameraMode === 'far' ? 4.5 : 3.1) * baseScale;
    const reverseSign = p.forwardSpeed < -2.2 ? -1 : 1;
    const camYaw = p.heading + this.cameraYawOffset;
    const sinCam = Math.sin(camYaw);
    const cosCam = Math.cos(camYaw);

    _camTargetPos.set(
      p.x - sinCam * dist * reverseSign,
      p.y + height,
      p.z - cosCam * dist * reverseSign,
    );
    const minCamY = groundHeightAt(_camTargetPos.x, _camTargetPos.z) + 1.35;
    if (_camTargetPos.y < minCamY) _camTargetPos.y = minCamY;

    this.camera.position.lerp(_camTargetPos, smooth);
    _camLookAt.set(p.x + sinH * 4.2 * reverseSign, p.y + 1.2, p.z + cosH * 4.2 * reverseSign);
    this.camera.lookAt(_camLookAt);

    const targetFov = 60 + Math.min(12, speedKmh * 0.095);
    this.camera.fov = THREE.MathUtils.damp(this.camera.fov, targetFov, 5, dt);
    this.camera.updateProjectionMatrix();
  }

  private afterDraw(cb: () => void) {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    if (!gl || typeof gl.fenceSync !== 'function') {
      this.frameId = window.setTimeout(cb, 80);
      return;
    }
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      if (this.disposed) return;
      const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        this.frameId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        this.frameId = window.setTimeout(cb, 80);
      }
    };
    this.frameId = window.setTimeout(poll, 5);
  }

  private tick = () => {
    if (this.disposed) return;

    const rawDt = this.clock.getDelta();
    const dt = Math.min(rawDt, 0.05);
    this.elapsed += dt;

    if (this.screen === 'playing') {
      const mergedInput = this.readKeyboardAndMergeInput();

      if (this.isOnFoot) {
        // On-Foot Walk / Run / Jump Physics
        stepPlayerWalkPhysics(
          this.walkState,
          mergedInput,
          this.walkCameraYaw,
          this.worldProps.colliders,
          this.worldProps.boxColliders,
          dt,
        );
        this.playerRig.root.position.set(this.walkState.x, this.walkState.y, this.walkState.z);
        this.playerRig.root.rotation.y = this.walkState.heading;
        animateHumanRig(this.playerRig, this.walkState.mode, this.walkState.animPhase, dt);

        this.livingWorld.update(this.walkState.x, this.walkState.z, dt);
        this.audio.updateVehicleAudio(false, false, this.vehicleConfig.engineSound, 0, 0, 0, 0, 'asphalt');
      } else {
        // Vehicle Physics (2 substeps)
        const subDt = dt * 0.5;
        stepVehiclePhysics(
          this.physics,
          this.vehicleConfig,
          mergedInput,
          this.worldProps.colliders,
          this.worldProps.boxColliders,
          subDt,
          this.rainActive,
        );
        stepVehiclePhysics(
          this.physics,
          this.vehicleConfig,
          mergedInput,
          this.worldProps.colliders,
          this.worldProps.boxColliders,
          subDt,
          this.rainActive,
        );

        if (this.physics.bumpStrength > 0.15) {
          this.audio.playBump(this.physics.bumpStrength);
        }

        this.syncVehicleTransform();
        this.livingWorld.update(this.physics.x, this.physics.z, dt);

        const speedKmh = Math.abs(this.physics.forwardSpeed) * 3.6;
        this.audio.updateVehicleAudio(
          true,
          this.physics.engineRunning,
          this.vehicleConfig.engineSound,
          this.physics.rpmNorm,
          mergedInput.throttle,
          speedKmh,
          this.physics.skidIntensity,
          this.physics.surface,
        );
      }

      this.updateParticlesAndFX(mergedInput, dt);
      this.updateGameplayTriggers(dt);
    } else {
      // Keep Kasbapur living traffic & guards smoothly animated on Menu!
      if (this.screen === 'menu') {
        this.livingWorld.update(0, -138, dt);
      }
      this.audio.updateVehicleAudio(false, false, this.vehicleConfig.engineSound, 0, 0, 0, 0, 'asphalt');
    }

    this.applyAtmosphere(dt);
    this.updateCamera(dt);

    this.renderer.render(this.scene, this.camera);

    // Emit HUD telemetry at ~20Hz
    this.uiEmitTimer += dt;
    if (this.uiEmitTimer >= 0.05) {
      this.uiEmitTimer = 0;
      if (this.notificationQueue && this.elapsed > this.notifExpiry) {
        this.notificationQueue = null;
      }

      const activePos = this.getActivePlayerPosition();
      let missionState: ActiveMissionState | null = null;
      if (this.activeMission) {
        const cp = this.activeMission.checkpoints[this.missionCpIndex];
        missionState = {
          missionId: this.activeMission.id,
          title: this.activeMission.title,
          checkpointIndex: this.missionCpIndex,
          totalCheckpoints: this.activeMission.checkpoints.length,
          checkpointLabel: cp.label,
          remainingSec: Math.max(0, Math.ceil(this.missionTimer)),
          distanceToNextM: Math.round(Math.hypot(activePos.x - cp.x, activePos.z - cp.z)),
        };
      }

      const nearbyEnt = this.isOnFoot
        ? this.livingWorld.findNearestEnterableVehicle(this.walkState.x, this.walkState.z, 5.4)
        : null;

      // Refresh blips array cleanly without allocating extra arrays if length matches
      this.minimapBlips.length = 0;
      for (const v of this.livingWorld.vehicles) {
        this.minimapBlips.push({
          x: v.physics.x,
          z: v.physics.z,
          kind: v.isTraffic ? 'traffic' : 'parked',
        });
      }
      for (const h of this.livingWorld.humans) {
        this.minimapBlips.push({
          x: h.x,
          z: h.z,
          kind: h.kind,
        });
      }

      const isNight = this.timeHours >= 18.2 || this.timeHours < 6.0;
      const hlOn = this.headlightsManual !== null ? this.headlightsManual : isNight;
      const speedKmhOut = this.isOnFoot
        ? Math.round(this.walkState.speed * 3.6)
        : Math.round(Math.abs(this.physics.forwardSpeed) * 3.6);

      this.callbacks.onTelemetry({
        speedKmh: speedKmhOut,
        isOnFoot: this.isOnFoot,
        vehicleName: this.vehicleConfig.name,
        selectedGear: this.physics.selectedGear,
        actualGear: this.physics.actualGear,
        transmissionMode: this.physics.transmissionMode,
        engineRunning: this.physics.engineRunning,
        gearShiftPulse: this.physics.gearShiftPulse,
        rpmNorm: this.isOnFoot ? 0 : this.physics.rpmNorm,
        fuelPct: Math.round((this.physics.fuelLiters / this.vehicleConfig.fuelTankLiters) * 100),
        surface: this.isOnFoot ? 'asphalt' : this.physics.surface,
        zoneName: zoneNameAt(activePos.x, activePos.z),
        timeHours: this.timeHours,
        weatherLabel: this.weatherLabel,
        headlightsOn: hlOn,
        cameraMode: this.cameraMode,
        coins: this.coins,
        nearbyVehicleName: nearbyEnt ? nearbyEnt.config.name : null,
        activeMission: missionState,
        playerX: activePos.x,
        playerZ: activePos.z,
        playerHeading: this.isOnFoot ? this.walkCameraYaw : this.physics.heading,
        minimapBlips: this.minimapBlips,
        notification: this.notificationQueue,
      });
    }

    if (this.isSoftwareGl) {
      this.afterDraw(this.tick);
    } else {
      this.frameId = requestAnimationFrame(this.tick);
    }
  };

  public dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);

    window.removeEventListener('resize', this.handleResize);
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    this.renderer.domElement.removeEventListener('pointerdown', this.handleCanvasPointerDown);
    window.removeEventListener('pointermove', this.handleCanvasPointerMove);
    window.removeEventListener('pointerup', this.handleCanvasPointerUp);
    this.renderer.domElement.removeEventListener('webglcontextlost', this.handleContextLost);

    this.audio.dispose();
    this.particles.dispose();
    this.livingWorld.dispose();
    this.playerRig.dispose();
    this.world.dispose();
    if (this.vehicleModel) this.vehicleModel.dispose();
    this.textures.dispose();
    this.envRT.dispose();
    this.renderer.dispose();
    if (this.renderer.domElement.parentElement === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
