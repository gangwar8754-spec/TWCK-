import * as THREE from 'three';
import { HumanAnimMode, HumanRig, animateHumanRig, createHumanRig } from './humanBuilder';
import { VehiclePhysicsState, createInitialVehicleState } from './physics';
import { PEDESTRIAN_PATHS, TRAFFIC_ROUTES, groundHeightAt } from './terrain';
import {
  ALL_VEHICLE_CONFIGS,
  TrafficDensity,
  VehicleConfig,
  findVehicleConfig,
} from './types';
import { BuiltVehicle, buildVehicleModel } from './vehicleBuilder';

export interface WorldVehicleEntity {
  uid: number;
  config: VehicleConfig;
  paintHex: string;
  model: BuiltVehicle;
  physics: VehiclePhysicsState;
  isTraffic: boolean;
  routeIndex: number;
  waypointIndex: number;
  cruiseSpeedMs: number;
  stopTimer: number;
  driverNpc: HumanRig | null;
}

interface HumanNpcEntity {
  rig: HumanRig;
  kind: 'guard' | 'npc';
  x: number;
  y: number;
  z: number;
  heading: number;
  mode: HumanAnimMode;
  phase: number;
  speed: number;
  path?: Array<{ x: number; z: number }>;
  wpIdx: number;
  waitTimer: number;
}

export class CityLivingWorld {
  public vehicles: WorldVehicleEntity[] = [];
  public humans: HumanNpcEntity[] = [];
  private root = new THREE.Group();
  private contactShadowTex: THREE.Texture;
  private isSoftwareGl: boolean;
  private nextUid = 1;
  private trafficDensity: TrafficDensity = 'light';

  constructor(
    scene: THREE.Scene,
    contactShadowTex: THREE.Texture,
    isSoftwareGl: boolean,
    initialDensity: TrafficDensity,
  ) {
    this.contactShadowTex = contactShadowTex;
    this.isSoftwareGl = isSoftwareGl;
    this.trafficDensity = initialDensity;
    scene.add(this.root);

    this.spawnParkedShowcaseFleet();
    this.spawnMunishHouseGuards();
    this.spawnCityPedestrians();
    this.syncTrafficCount();
  }

  private spawnVehicleEntity(
    configId: string,
    paintHex: string,
    x: number,
    z: number,
    heading: number,
    isTraffic: boolean,
    routeIndex = 0,
    waypointIndex = 0,
  ): WorldVehicleEntity {
    const config = findVehicleConfig(configId);
    const model = buildVehicleModel(config, paintHex, this.contactShadowTex, this.isSoftwareGl, false);
    const physics = createInitialVehicleState(config, x, z, heading, 'manual');
    model.root.position.set(physics.x, physics.y, physics.z);
    model.root.rotation.set(0, physics.heading, 0);
    this.root.add(model.root);

    let driverNpc: HumanRig | null = null;
    if (isTraffic) {
      driverNpc = createHumanRig({ role: 'npc', hasCap: Math.random() > 0.6 }, this.isSoftwareGl);
      model.driverSeatAnchor.add(driverNpc.root);
      animateHumanRig(driverNpc, 'seated', 0, 1);
    }

    const entity: WorldVehicleEntity = {
      uid: this.nextUid++,
      config,
      paintHex,
      model,
      physics,
      isTraffic,
      routeIndex,
      waypointIndex,
      cruiseSpeedMs: config.style === 'bus' || config.style === 'truck' ? 8.5 : 11.5,
      stopTimer: 0,
      driverNpc,
    };
    this.vehicles.push(entity);
    return entity;
  }

  private spawnParkedShowcaseFleet() {
    // Parked Hyundai Verna & Fortuner inside Munish House estate parking apron!
    this.spawnVehicleEntity('hyundai_verna', '#ece9e1', 39, -71, -Math.PI * 0.5, false);
    this.spawnVehicleEntity('toyota_fortuner', '#1e242b', 39, -85, -Math.PI * 0.5, false);
    // Scorpio parked near Kasba Auto & 4x4
    this.spawnVehicleEntity('mahindra_scorpio', '#1e242b', 10, 10, 0.25, false);
    // Pickup Truck parked near East Market Mandi
    this.spawnVehicleEntity('pickup_truck', '#d96b27', 110, -16, -0.4, false);
    // Heavy Truck parked by Fuel Station / Highway Depot
    this.spawnVehicleEntity('heavy_truck', '#224f8c', -12, -48, 0, false);
    // Street Motorcycle parked outside Sharma Chai
    this.spawnVehicleEntity('street_moto', '#b92b27', -14, -15, Math.PI * 0.4, false);
  }

  private spawnMunishHouseGuards() {
    // 2 Stationary Security Guards flanking Munish House Main Entrance Gate & Checkpoint
    const stationaryGuards: Array<[number, number, number]> = [
      [29.5, -83.2, -Math.PI * 0.5], // By Security Checkpoint Booth
      [29.5, -72.8, -Math.PI * 0.5], // Opposite Gate Pillar
    ];
    for (const [gx, gz, grot] of stationaryGuards) {
      const rig = createHumanRig({ role: 'guard' }, this.isSoftwareGl);
      const gy = groundHeightAt(gx, gz);
      rig.root.position.set(gx, gy, gz);
      rig.root.rotation.y = grot;
      this.root.add(rig.root);
      this.humans.push({
        rig,
        kind: 'guard',
        x: gx,
        y: gy,
        z: gz,
        heading: grot,
        mode: 'idle',
        phase: Math.random() * 6,
        speed: 0,
        wpIdx: 0,
        waitTimer: 0,
      });
    }

    // 2 Patrolling Security Guards along Munish House Courtyard & Perimeter
    const patrol1 = [{ x: 34, z: -88 }, { x: 34, z: -68 }];
    const patrol2 = [{ x: 43, z: -66 }, { x: 43, z: -90 }];
    for (const path of [patrol1, patrol2]) {
      const rig = createHumanRig({ role: 'guard' }, this.isSoftwareGl);
      const gy = groundHeightAt(path[0].x, path[0].z);
      rig.root.position.set(path[0].x, gy, path[0].z);
      this.root.add(rig.root);
      this.humans.push({
        rig,
        kind: 'guard',
        x: path[0].x,
        y: gy,
        z: path[0].z,
        heading: 0,
        mode: 'walk',
        phase: Math.random() * 6,
        speed: 1.55,
        path,
        wpIdx: 1,
        waitTimer: 0,
      });
    }
  }

  private spawnCityPedestrians() {
    // Walking sidewalk & street-crossing Indian pedestrians
    for (let p = 0; p < PEDESTRIAN_PATHS.length; p++) {
      const path = PEDESTRIAN_PATHS[p];
      const countPerPath = 3;
      for (let k = 0; k < countPerPath; k++) {
        const startIdx = k % path.length;
        const pt = path[startIdx];
        const rig = createHumanRig(
          { role: 'npc', hasDupatta: k % 2 === 1, hasCap: k === 2 },
          this.isSoftwareGl,
        );
        const py = groundHeightAt(pt.x, pt.z);
        rig.root.position.set(pt.x, py, pt.z);
        this.root.add(rig.root);
        this.humans.push({
          rig,
          kind: 'npc',
          x: pt.x,
          y: py,
          z: pt.z,
          heading: 0,
          mode: 'walk',
          phase: Math.random() * 6,
          speed: 1.4 + Math.random() * 0.5,
          path,
          wpIdx: (startIdx + 1) % path.length,
          waitTimer: 0,
        });
      }
    }

    // Standing / Conversing NPCs near shops, houses, and Munish House
    const standingSpots: Array<[number, number, number]> = [
      [-15, -14.5, 0.2],
      [-16.4, -14.5, -2.8],
      [-26, -14.5, 0.4],
      [16, -2.5, Math.PI],
      [31, -2.5, 2.7],
      [32.4, -2.5, -0.5],
      [106, -16, 0.1],
      [-17, 13, 0.5],
      [25, -86, -1.2],
      [25, -70, -1.8],
    ];
    for (let i = 0; i < standingSpots.length; i++) {
      const [sx, sz, rot] = standingSpots[i];
      const rig = createHumanRig(
        { role: 'npc', hasDupatta: i % 3 === 0 },
        this.isSoftwareGl,
      );
      const sy = groundHeightAt(sx, sz);
      rig.root.position.set(sx, sy, sz);
      rig.root.rotation.y = rot;
      this.root.add(rig.root);
      this.humans.push({
        rig,
        kind: 'npc',
        x: sx,
        y: sy,
        z: sz,
        heading: rot,
        mode: 'chat',
        phase: Math.random() * 6,
        speed: 0,
        wpIdx: 0,
        waitTimer: 0,
      });
    }
  }

  public setTrafficDensity(density: TrafficDensity) {
    if (this.trafficDensity === density) return;
    this.trafficDensity = density;
    this.syncTrafficCount();
  }

  private syncTrafficCount() {
    const targetCount = this.trafficDensity === 'light' ? 6 : this.trafficDensity === 'medium' ? 10 : 15;
    const currentTraffic = this.vehicles.filter((v) => v.isTraffic);

    // Remove excess traffic vehicles
    if (currentTraffic.length > targetCount) {
      let toRemove = currentTraffic.length - targetCount;
      for (let i = this.vehicles.length - 1; i >= 0 && toRemove > 0; i--) {
        if (this.vehicles[i].isTraffic) {
          const rem = this.vehicles[i];
          this.root.remove(rem.model.root);
          rem.model.dispose();
          this.vehicles.splice(i, 1);
          toRemove--;
        }
      }
      return;
    }

    // Spawn additional traffic vehicles across all requested classes
    const trafficPool: Array<{ id: string; color: string }> = [
      { id: 'hyundai_verna', color: '#ece9e1' },
      { id: 'hatchback_car', color: '#2a7b88' },
      { id: 'mahindra_scorpio', color: '#1e242b' },
      { id: 'city_bus', color: '#d97724' },
      { id: 'heavy_truck', color: '#224f8c' },
      { id: 'street_moto', color: '#b92b27' },
      { id: 'toyota_fortuner', color: '#c8a97e' },
      { id: 'pickup_truck', color: '#3d5a40' },
      { id: 'mahindra_thar', color: '#d96b27' },
    ];

    let needed = targetCount - currentTraffic.length;
    let idx = currentTraffic.length;
    while (needed > 0) {
      const routeIdx = idx % TRAFFIC_ROUTES.length;
      const route = TRAFFIC_ROUTES[routeIdx];
      const wpIdx = (idx * 3) % route.length;
      const nextWpIdx = (wpIdx + 1) % route.length;
      const a = route[wpIdx];
      const b = route[nextWpIdx];
      const heading = Math.atan2(b.x - a.x, b.z - a.z);
      const pick = trafficPool[idx % trafficPool.length];
      this.spawnVehicleEntity(pick.id, pick.color, a.x, a.z, heading, true, routeIdx, nextWpIdx);
      idx++;
      needed--;
    }
  }

  public findNearestEnterableVehicle(px: number, pz: number, maxRadius = 4.6): WorldVehicleEntity | null {
    let best: WorldVehicleEntity | null = null;
    let bestDist = maxRadius;
    for (const v of this.vehicles) {
      const d = Math.hypot(px - v.physics.x, pz - v.physics.z);
      if (d < bestDist) {
        bestDist = d;
        best = v;
      }
    }
    return best;
  }

  // Extract a world vehicle when player enters it, and optionally leave previous vehicle parked in world
  public takeOverVehicle(uid: number): WorldVehicleEntity | null {
    const idx = this.vehicles.findIndex((v) => v.uid === uid);
    if (idx === -1) return null;
    const [picked] = this.vehicles.splice(idx, 1);
    if (picked.driverNpc) {
      picked.model.driverSeatAnchor.remove(picked.driverNpc.root);
      picked.driverNpc.dispose();
      picked.driverNpc = null;
    }
    this.root.remove(picked.model.root);
    return picked;
  }

  public parkPlayerVehicleInWorld(
    config: VehicleConfig,
    paintHex: string,
    physics: VehiclePhysicsState,
  ): void {
    const ent = this.spawnVehicleEntity(
      config.id,
      paintHex,
      physics.x,
      physics.z,
      physics.heading,
      false,
    );
    ent.physics = { ...physics, vx: 0, vz: 0, forwardSpeed: 0, lateralSpeed: 0, doorOpenAmt: 0 };
    ent.model.root.position.set(ent.physics.x, ent.physics.y, ent.physics.z);
    ent.model.root.rotation.set(0, ent.physics.heading, 0);
  }

  public update(playerX: number, playerZ: number, dt: number) {
    // 1. Update Traffic AI Vehicles
    for (let i = 0; i < this.vehicles.length; i++) {
      const v = this.vehicles[i];
      if (!v.isTraffic) {
        // Gentle door close animation for parked cars
        if (v.physics.doorOpenAmt > 0.01) {
          v.physics.doorOpenAmt = THREE.MathUtils.damp(v.physics.doorOpenAmt, 0, 8, dt);
          v.model.doorPivot.rotation.y = v.physics.doorOpenAmt * 1.05;
        }
        continue;
      }

      const route = TRAFFIC_ROUTES[v.routeIndex];
      const target = route[v.waypointIndex];
      const dx = target.x - v.physics.x;
      const dz = target.z - v.physics.z;
      const dist = Math.hypot(dx, dz);

      if (dist < 3.2) {
        if (target.isIntersection && v.stopTimer <= 0 && Math.random() < 0.35) {
          v.stopTimer = 1.6 + Math.random() * 1.4;
        }
        v.waypointIndex = (v.waypointIndex + 1) % route.length;
      }

      if (v.stopTimer > 0) {
        v.stopTimer -= dt;
        v.physics.forwardSpeed = THREE.MathUtils.damp(v.physics.forwardSpeed, 0, 7, dt);
      } else {
        // Collision avoidance against player & lead traffic vehicles
        let blocked = false;
        const fwdX = Math.sin(v.physics.heading);
        const fwdZ = Math.cos(v.physics.heading);

        // Check player distance in front
        const pdx = playerX - v.physics.x;
        const pdz = playerZ - v.physics.z;
        const pDist = Math.hypot(pdx, pdz);
        if (pDist < 9.5 && (pdx * fwdX + pdz * fwdZ) > 0.35 * pDist) {
          blocked = true;
        }

        if (!blocked) {
          for (let j = 0; j < this.vehicles.length; j++) {
            if (i === j) continue;
            const other = this.vehicles[j];
            const odx = other.physics.x - v.physics.x;
            const odz = other.physics.z - v.physics.z;
            const oDist = Math.hypot(odx, odz);
            if (oDist < 9.5 && (odx * fwdX + odz * fwdZ) > 0.45 * oDist) {
              blocked = true;
              break;
            }
          }
        }

        const desiredSpeed = blocked ? 0 : v.cruiseSpeedMs;
        v.physics.forwardSpeed = THREE.MathUtils.damp(v.physics.forwardSpeed, desiredSpeed, blocked ? 8 : 3.5, dt);

        if (v.physics.forwardSpeed > 0.3) {
          const targetHeading = Math.atan2(dx, dz);
          let diff = targetHeading - v.physics.heading;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          v.physics.heading += diff * Math.min(1, 4.2 * dt);
          v.physics.steerAngle = THREE.MathUtils.clamp(diff * 0.45, -0.4, 0.4);
        }
      }

      v.physics.x += Math.sin(v.physics.heading) * v.physics.forwardSpeed * dt;
      v.physics.z += Math.cos(v.physics.heading) * v.physics.forwardSpeed * dt;
      v.physics.y = groundHeightAt(v.physics.x, v.physics.z) + v.config.groundClearance;
      v.physics.wheelSpin += (v.physics.forwardSpeed / v.config.wheelRadius) * dt;

      v.model.root.position.set(v.physics.x, v.physics.y, v.physics.z);
      v.model.root.rotation.set(0, v.physics.heading, 0);
      for (let w = 0; w < 4; w++) {
        if (w < 2) v.model.wheelPivots[w].rotation.y = v.physics.steerAngle;
        v.model.wheelMeshes[w].rotation.x = v.physics.wheelSpin;
      }
      for (const bm of v.model.brakeMaterials) {
        bm.emissiveIntensity = v.physics.forwardSpeed < 0.8 ? 2.1 : 0.2;
      }
    }

    // 2. Update Security Guards & City NPC Pedestrians
    for (let i = 0; i < this.humans.length; i++) {
      const h = this.humans[i];
      if (h.path && h.speed > 0) {
        if (h.waitTimer > 0) {
          h.waitTimer -= dt;
          h.phase += dt * 2;
          animateHumanRig(h.rig, 'idle', h.phase, dt);
          continue;
        }
        const target = h.path[h.wpIdx];
        const dx = target.x - h.x;
        const dz = target.z - h.z;
        const dist = Math.hypot(dx, dz);
        if (dist < 0.7) {
          h.wpIdx = (h.wpIdx + 1) % h.path.length;
          if (Math.random() < 0.25) h.waitTimer = 1.2 + Math.random() * 1.5;
        } else {
          const desiredH = Math.atan2(dx, dz);
          let diff = desiredH - h.heading;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          h.heading += diff * Math.min(1, 8 * dt);
          h.x += Math.sin(h.heading) * h.speed * dt;
          h.z += Math.cos(h.heading) * h.speed * dt;
          h.y = groundHeightAt(h.x, h.z);
          h.rig.root.position.set(h.x, h.y, h.z);
          h.rig.root.rotation.y = h.heading;
          h.phase += h.speed * 3.2 * dt;
          animateHumanRig(h.rig, 'walk', h.phase, dt);
        }
      } else {
        h.phase += dt * 2.2;
        animateHumanRig(h.rig, h.mode, h.phase, dt);
      }
    }
  }

  public dispose() {
    for (const v of this.vehicles) {
      if (v.driverNpc) v.driverNpc.dispose();
      v.model.dispose();
    }
    for (const h of this.humans) {
      h.rig.dispose();
    }
    this.vehicles = [];
    this.humans = [];
  }
}

export { ALL_VEHICLE_CONFIGS };
