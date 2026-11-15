import * as THREE from 'three';
import { VehicleConfig } from './types';

export interface BuiltVehicle {
  root: THREE.Group;
  chassisGroup: THREE.Group;
  doorPivot: THREE.Group;
  driverSeatAnchor: THREE.Object3D;
  wheelPivots: [THREE.Group, THREE.Group, THREE.Group, THREE.Group];
  wheelMeshes: [THREE.Group, THREE.Group, THREE.Group, THREE.Group];
  brakeMaterials: THREE.MeshStandardMaterial[];
  headlightMaterials: THREE.MeshStandardMaterial[];
  headlightSpots: THREE.SpotLight[];
  contactShadow: THREE.Mesh;
  cockpitAnchor: THREE.Object3D;
  hoodAnchor: THREE.Object3D;
  dispose: () => void;
}

function createWheelMesh(radius: number, width: number, isSoftwareGl: boolean): THREE.Group {
  const wheel = new THREE.Group();
  const tireMat = new THREE.MeshStandardMaterial({
    color: 0x1c1e20,
    roughness: 0.88,
    metalness: 0.05,
  });
  const tireGeo = new THREE.CylinderGeometry(radius, radius, width, isSoftwareGl ? 14 : 22, 1);
  tireGeo.rotateZ(Math.PI / 2);
  const tire = new THREE.Mesh(tireGeo, tireMat);
  tire.castShadow = !isSoftwareGl;
  tire.receiveShadow = true;
  wheel.add(tire);

  const rimMat = new THREE.MeshStandardMaterial({
    color: 0x9aa4ad,
    roughness: 0.28,
    metalness: 0.85,
  });
  const rimGeo = new THREE.CylinderGeometry(radius * 0.56, radius * 0.56, width * 0.94, 12);
  rimGeo.rotateZ(Math.PI / 2);
  const rim = new THREE.Mesh(rimGeo, rimMat);
  wheel.add(rim);

  const spokeGeo = new THREE.BoxGeometry(width * 0.98, radius * 0.92, radius * 0.14);
  const spoke1 = new THREE.Mesh(spokeGeo, rimMat);
  const spoke2 = new THREE.Mesh(spokeGeo, rimMat);
  spoke2.rotation.x = Math.PI / 2;
  wheel.add(spoke1, spoke2);

  return wheel;
}

export function buildVehicleModel(
  config: VehicleConfig,
  paintHex: string,
  contactShadowTex: THREE.Texture,
  isSoftwareGl: boolean,
  withSpotlights = true,
): BuiltVehicle {
  const root = new THREE.Group();
  const chassisGroup = new THREE.Group();
  root.add(chassisGroup);

  const W = config.chassisWidth;
  const L = config.chassisLength;
  const H = config.chassisHeight;

  const paintMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(paintHex),
    roughness: 0.32,
    metalness: 0.36,
    clearcoat: 0.65,
    clearcoatRoughness: 0.18,
  });

  const trimMat = new THREE.MeshStandardMaterial({
    color: 0x1f2328,
    roughness: 0.82,
    metalness: 0.12,
  });

  const steelMat = new THREE.MeshStandardMaterial({
    color: 0x555e68,
    roughness: 0.35,
    metalness: 0.82,
  });

  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0x162430,
    roughness: 0.08,
    metalness: 0.12,
    transparent: true,
    opacity: 0.7,
    clearcoat: 1.0,
  });

  const headlightMat = new THREE.MeshStandardMaterial({
    color: 0xfff5d6,
    emissive: 0xffdf99,
    emissiveIntensity: 0.4,
    roughness: 0.2,
    metalness: 0.1,
  });

  const brakeMat = new THREE.MeshStandardMaterial({
    color: 0x8a1515,
    emissive: 0xff1e1e,
    emissiveIntensity: 0.25,
    roughness: 0.25,
    metalness: 0.1,
  });

  const doorPivot = new THREE.Group();
  const driverSeatAnchor = new THREE.Object3D();

  if (config.style === 'motorcycle') {
    // Sleek Indian Street Motorcycle
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.36, L * 0.72), trimMat);
    frame.position.set(0, 0.25, 0);
    chassisGroup.add(frame);

    const tank = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.28, 0.65), paintMat);
    tank.position.set(0, 0.52, 0.22);
    tank.castShadow = !isSoftwareGl;
    chassisGroup.add(tank);

    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.14, 0.68), trimMat);
    seat.position.set(0, 0.46, -0.32);
    chassisGroup.add(seat);

    const handleBar = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.06, 0.08), steelMat);
    handleBar.position.set(0, 0.74, 0.56);
    chassisGroup.add(handleBar);

    const hl = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.12, 12), headlightMat);
    hl.rotation.x = Math.PI / 2;
    hl.position.set(0, 0.62, 0.72);
    chassisGroup.add(hl);

    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.08, 0.08), brakeMat);
    tl.position.set(0, 0.48, -0.78);
    chassisGroup.add(tl);

    driverSeatAnchor.position.set(0, 0.24, -0.22);
    chassisGroup.add(driverSeatAnchor);
    chassisGroup.add(doorPivot);
  } else {
    // Underbody
    const underbody = new THREE.Mesh(new THREE.BoxGeometry(W * 0.74, 0.2, L * 0.92), trimMat);
    underbody.position.set(0, 0.08, 0);
    chassisGroup.add(underbody);

    const isSedanOrHatch = config.style === 'verna' || config.style === 'hatchback';
    const isTruckOrBus = config.style === 'truck' || config.style === 'bus';
    const isPickup = config.style === 'pickup';

    if (config.style === 'bus') {
      // City Bus Silhouette
      const hull = new THREE.Mesh(new THREE.BoxGeometry(W, H, L * 0.96), paintMat);
      hull.position.set(0, H * 0.52, 0);
      hull.castShadow = !isSoftwareGl;
      hull.receiveShadow = true;
      chassisGroup.add(hull);

      const stripe = new THREE.Mesh(new THREE.BoxGeometry(W + 0.04, 0.28, L * 0.96), trimMat);
      stripe.position.set(0, H * 0.35, 0);
      chassisGroup.add(stripe);

      const glassBand = new THREE.Mesh(new THREE.BoxGeometry(W + 0.03, H * 0.38, L * 0.88), glassMat);
      glassBand.position.set(0, H * 0.74, 0.12);
      chassisGroup.add(glassBand);

      const roof = new THREE.Mesh(new THREE.BoxGeometry(W * 0.96, 0.12, L * 0.94), new THREE.MeshStandardMaterial({ color: 0xeee9df, roughness: 0.7 }));
      roof.position.set(0, H + 0.06, 0);
      chassisGroup.add(roof);

      driverSeatAnchor.position.set(-W * 0.28, 0.32, L * 0.34);
    } else if (config.style === 'truck') {
      // Indian Heavy Highway Lorry (Tall cab + decorated cargo carrier)
      const cab = new THREE.Mesh(new THREE.BoxGeometry(W * 0.96, H * 0.96, L * 0.34), paintMat);
      cab.position.set(0, H * 0.54, L * 0.28);
      cab.castShadow = !isSoftwareGl;
      chassisGroup.add(cab);

      const cabGlass = new THREE.Mesh(new THREE.BoxGeometry(W * 0.9, H * 0.36, L * 0.35), glassMat);
      cabGlass.position.set(0, H * 0.72, L * 0.29);
      chassisGroup.add(cabGlass);

      const cargoMat = new THREE.MeshStandardMaterial({ color: 0xb87333, roughness: 0.82 });
      const cargo = new THREE.Mesh(new THREE.BoxGeometry(W, H * 0.98, L * 0.58), cargoMat);
      cargo.position.set(0, H * 0.58, -L * 0.2);
      cargo.castShadow = !isSoftwareGl;
      cargo.receiveShadow = true;
      chassisGroup.add(cargo);

      const bumper = new THREE.Mesh(new THREE.BoxGeometry(W * 0.98, 0.26, 0.22), steelMat);
      bumper.position.set(0, 0.18, L * 0.48);
      chassisGroup.add(bumper);

      driverSeatAnchor.position.set(-W * 0.26, 0.45, L * 0.28);
    } else if (isPickup) {
      // Pickup Truck (Front cabin + open cargo bed)
      const lower = new THREE.Mesh(new THREE.BoxGeometry(W, H * 0.65, L * 0.94), paintMat);
      lower.position.set(0, H * 0.4, 0);
      lower.castShadow = !isSoftwareGl;
      chassisGroup.add(lower);

      const cab = new THREE.Mesh(new THREE.BoxGeometry(W * 0.9, H * 0.78, L * 0.38), paintMat);
      cab.position.set(0, H * 0.98, L * 0.08);
      cab.castShadow = !isSoftwareGl;
      chassisGroup.add(cab);

      const glass = new THREE.Mesh(new THREE.BoxGeometry(W * 0.92, H * 0.55, L * 0.34), glassMat);
      glass.position.set(0, H * 1.0, L * 0.08);
      chassisGroup.add(glass);

      const bedFloor = new THREE.Mesh(new THREE.BoxGeometry(W * 0.84, 0.08, L * 0.36), trimMat);
      bedFloor.position.set(0, H * 0.68, -L * 0.28);
      chassisGroup.add(bedFloor);

      driverSeatAnchor.position.set(-W * 0.24, 0.36, L * 0.06);
    } else {
      // Thar, Verna, Scorpio, Fortuner, Hatchback
      const lowerBody = new THREE.Mesh(new THREE.BoxGeometry(W, H * 0.74, L * 0.92), paintMat);
      lowerBody.position.set(0, H * 0.44, 0);
      lowerBody.castShadow = !isSoftwareGl;
      lowerBody.receiveShadow = true;
      chassisGroup.add(lowerBody);

      const hoodLen = isSedanOrHatch ? L * 0.36 : L * 0.34;
      const hood = new THREE.Mesh(new THREE.BoxGeometry(W * 0.92, H * 0.28, hoodLen), paintMat);
      hood.position.set(0, H * 0.82, L * 0.25);
      hood.castShadow = !isSoftwareGl;
      chassisGroup.add(hood);

      const cabinLen = config.style === 'thar' ? L * 0.44 : config.style === 'hatchback' ? L * 0.54 : L * 0.5;
      const cabinZ = config.style === 'verna' ? -L * 0.08 : -L * 0.12;
      const cabinH = isSedanOrHatch ? H * 0.92 : H * 0.82;

      const cabin = new THREE.Mesh(
        new THREE.BoxGeometry(W * 0.86, cabinH, cabinLen),
        config.style === 'thar' ? trimMat : paintMat,
      );
      cabin.position.set(0, H * 0.78 + cabinH * 0.45, cabinZ);
      cabin.castShadow = !isSoftwareGl;
      chassisGroup.add(cabin);

      const glassWrap = new THREE.Mesh(
        new THREE.BoxGeometry(W * 0.88, cabinH * 0.72, cabinLen * 0.94),
        glassMat,
      );
      glassWrap.position.set(0, H * 0.78 + cabinH * 0.44, cabinZ);
      chassisGroup.add(glassWrap);

      const roofCap = new THREE.Mesh(
        new THREE.BoxGeometry(W * 0.88, 0.09, cabinLen * 1.02),
        config.style === 'thar' ? trimMat : paintMat,
      );
      roofCap.position.set(0, H * 0.78 + cabinH * 0.92, cabinZ);
      chassisGroup.add(roofCap);

      // Spare wheel on Thar/Scorpio tailgate
      if (config.style === 'thar') {
        const spare = createWheelMesh(config.wheelRadius * 0.82, config.wheelWidth * 0.8, isSoftwareGl);
        spare.rotation.y = Math.PI / 2;
        spare.position.set(0, H * 0.65, -L * 0.5);
        chassisGroup.add(spare);
      }

      // Chrome Grille & Roof Rails for Fortuner / Scorpio
      if (config.style === 'fortuner' || config.style === 'scorpio' || config.style === 'verna') {
        const chromeBar = new THREE.Mesh(new THREE.BoxGeometry(W * 0.65, 0.14, 0.14), steelMat);
        chromeBar.position.set(0, H * 0.64, L * 0.46);
        chassisGroup.add(chromeBar);
      }

      driverSeatAnchor.position.set(-W * 0.24, H * 0.44, cabinZ + 0.12);
    }

    // Articulated Driver-Side Door (Right-hand drive -> -X side)
    doorPivot.position.set(-W * 0.5, H * 0.46, L * 0.14);
    const doorMesh = new THREE.Mesh(new THREE.BoxGeometry(0.08, H * 0.64, 0.95), paintMat);
    doorMesh.position.set(0, 0, -0.47);
    doorPivot.add(doorMesh);
    chassisGroup.add(doorPivot);
    chassisGroup.add(driverSeatAnchor);

    // Bumpers & Grille
    if (!isTruckOrBus) {
      const frontBumper = new THREE.Mesh(new THREE.BoxGeometry(W * 0.98, 0.18, 0.2), trimMat);
      frontBumper.position.set(0, 0.16, L * 0.47);
      const rearBumper = new THREE.Mesh(new THREE.BoxGeometry(W * 0.96, 0.18, 0.2), trimMat);
      rearBumper.position.set(0, 0.18, -L * 0.47);
      chassisGroup.add(frontBumper, rearBumper);
    }

    // Headlights & Taillights
    const headGeo = new THREE.BoxGeometry(0.26, 0.14, 0.08);
    for (const side of [-1, 1]) {
      const hl = new THREE.Mesh(headGeo, headlightMat);
      hl.position.set(side * (W * 0.35), H * 0.52, L * 0.47);
      const tl = new THREE.Mesh(headGeo, brakeMat);
      tl.position.set(side * (W * 0.36), H * 0.52, -L * 0.47);
      chassisGroup.add(hl, tl);
    }
  }

  // Optional Headlight SpotLights (enabled for active player vehicle to preserve GPU budget)
  const headlightSpots: THREE.SpotLight[] = [];
  if (withSpotlights) {
    const offsets = config.style === 'motorcycle' ? [0] : [-W * 0.34, W * 0.34];
    for (const ox of offsets) {
      const spot = new THREE.SpotLight(0xffe8b8, 0, 48, Math.PI / 4.5, 0.45, 1.4);
      spot.position.set(ox, H * 0.62, L * 0.48);
      spot.target.position.set(ox * 1.4, -1.2, L * 0.48 + 18);
      chassisGroup.add(spot);
      chassisGroup.add(spot.target);
      headlightSpots.push(spot);
    }
  }

  // Four Wheel Pivots (for motorcycle, rear/front center pairs overlap cleanly)
  const wheelCoords: Array<[number, number]> =
    config.style === 'motorcycle'
      ? [
          [0, config.wheelBase * 0.5],
          [0, config.wheelBase * 0.5],
          [0, -config.wheelBase * 0.5],
          [0, -config.wheelBase * 0.5],
        ]
      : [
          [-config.trackWidth * 0.5, config.wheelBase * 0.5],
          [config.trackWidth * 0.5, config.wheelBase * 0.5],
          [-config.trackWidth * 0.5, -config.wheelBase * 0.5],
          [config.trackWidth * 0.5, -config.wheelBase * 0.5],
        ];

  const wheelPivots: THREE.Group[] = [];
  const wheelMeshes: THREE.Group[] = [];
  for (let i = 0; i < 4; i++) {
    const [wx, wz] = wheelCoords[i];
    const pivot = new THREE.Group();
    pivot.position.set(wx, 0, wz);
    const wm = createWheelMesh(config.wheelRadius, config.wheelWidth, isSoftwareGl);
    if (config.style === 'motorcycle' && (i === 1 || i === 3)) {
      wm.visible = false; // single front/rear tire for motorcycle
    }
    pivot.add(wm);
    root.add(pivot);
    wheelPivots.push(pivot);
    wheelMeshes.push(wm);
  }

  // Soft Radial Contact Shadow
  const contactGeo = new THREE.PlaneGeometry(Math.max(1.2, W * 1.35), L * 1.15);
  contactGeo.rotateX(-Math.PI / 2);
  const contactMat = new THREE.MeshBasicMaterial({
    map: contactShadowTex,
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
  });
  const contactShadow = new THREE.Mesh(contactGeo, contactMat);
  contactShadow.position.set(0, -config.groundClearance + 0.04, 0);
  root.add(contactShadow);

  const cockpitAnchor = new THREE.Object3D();
  cockpitAnchor.position.set(-W * 0.22, H * 1.38, config.style === 'truck' ? L * 0.34 : 0.1);
  chassisGroup.add(cockpitAnchor);

  const hoodAnchor = new THREE.Object3D();
  hoodAnchor.position.set(0, H * 1.15, L * 0.24);
  chassisGroup.add(hoodAnchor);

  return {
    root,
    chassisGroup,
    doorPivot,
    driverSeatAnchor,
    wheelPivots: wheelPivots as [THREE.Group, THREE.Group, THREE.Group, THREE.Group],
    wheelMeshes: wheelMeshes as [THREE.Group, THREE.Group, THREE.Group, THREE.Group],
    brakeMaterials: [brakeMat],
    headlightMaterials: [headlightMat],
    headlightSpots,
    contactShadow,
    cockpitAnchor,
    hoodAnchor,
    dispose: () => {
      root.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          const m = obj as THREE.Mesh;
          m.geometry.dispose();
          if (Array.isArray(m.material)) m.material.forEach((mt) => mt.dispose());
          else m.material.dispose();
        }
      });
    },
  };
}
