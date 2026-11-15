import * as THREE from 'three';

export type HumanRole = 'player' | 'guard' | 'npc';
export type HumanAnimMode = 'idle' | 'walk' | 'run' | 'jump' | 'seated' | 'chat';

export interface HumanRig {
  root: THREE.Group;
  hips: THREE.Group;
  torso: THREE.Group;
  head: THREE.Group;
  leftArmPivot: THREE.Group;
  rightArmPivot: THREE.Group;
  leftLegPivot: THREE.Group;
  rightLegPivot: THREE.Group;
  dispose: () => void;
}

export interface HumanAppearance {
  role: HumanRole;
  shirtHex?: number;
  pantsHex?: number;
  skinHex?: number;
  hasCap?: boolean;
  hasDupatta?: boolean;
}

const SKIN_TONES = [0x9e6b47, 0xb87f56, 0x875638, 0xc7926a];
const NPC_SHIRTS = [0xd96b27, 0x2f6d80, 0xc93b3b, 0x3b7a57, 0xe0a938, 0x7b4b94, 0xebe5d8];
const NPC_PANTS = [0x262f3b, 0x3f3831, 0x1d232b, 0x544b3d];

export function createHumanRig(app: HumanAppearance, isSoftwareGl: boolean): HumanRig {
  const root = new THREE.Group();
  const hips = new THREE.Group();
  hips.position.y = 0.88;
  root.add(hips);

  const skinColor = app.skinHex ?? SKIN_TONES[Math.floor(Math.random() * SKIN_TONES.length)];
  const shirtColor =
    app.role === 'player'
      ? 0xd96b27
      : app.role === 'guard'
      ? 0x1f334d
      : app.shirtHex ?? NPC_SHIRTS[Math.floor(Math.random() * NPC_SHIRTS.length)];
  const pantsColor =
    app.role === 'player'
      ? 0x202b38
      : app.role === 'guard'
      ? 0x151e29
      : app.pantsHex ?? NPC_PANTS[Math.floor(Math.random() * NPC_PANTS.length)];

  const skinMat = new THREE.MeshStandardMaterial({ color: skinColor, roughness: 0.72 });
  const shirtMat = new THREE.MeshStandardMaterial({ color: shirtColor, roughness: 0.78 });
  const pantsMat = new THREE.MeshStandardMaterial({ color: pantsColor, roughness: 0.84 });
  const shoeMat = new THREE.MeshStandardMaterial({ color: 0x181a1d, roughness: 0.8 });
  const hairMat = new THREE.MeshStandardMaterial({ color: 0x171412, roughness: 0.85 });

  // Torso
  const torso = new THREE.Group();
  hips.add(torso);

  const chestMesh = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.56, 0.24), shirtMat);
  chestMesh.position.y = 0.3;
  chestMesh.castShadow = !isSoftwareGl;
  torso.add(chestMesh);

  if (app.role === 'guard') {
    // Guard tactical belt & golden chest badge
    const belt = new THREE.Mesh(
      new THREE.BoxGeometry(0.46, 0.08, 0.26),
      new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.5, metalness: 0.3 }),
    );
    belt.position.y = 0.06;
    torso.add(belt);

    const badge = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.08, 0.03),
      new THREE.MeshStandardMaterial({ color: 0xf0b840, roughness: 0.25, metalness: 0.85 }),
    );
    badge.position.set(0.11, 0.42, 0.13);
    torso.add(badge);
  } else if (app.role === 'player') {
    // Player dark jacket collar / vest accent
    const vest = new THREE.Mesh(
      new THREE.BoxGeometry(0.46, 0.42, 0.26),
      new THREE.MeshStandardMaterial({ color: 0x242a30, roughness: 0.7 }),
    );
    vest.position.y = 0.34;
    torso.add(vest);
  } else if (app.hasDupatta) {
    const scarf = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.54, 0.27),
      new THREE.MeshStandardMaterial({ color: 0xf4c430, roughness: 0.78 }),
    );
    scarf.position.set(0.12, 0.28, 0);
    torso.add(scarf);
  }

  // Head
  const head = new THREE.Group();
  head.position.y = 0.64;
  torso.add(head);

  const cranium = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.26, 0.24), skinMat);
  cranium.position.y = 0.13;
  cranium.castShadow = !isSoftwareGl;
  head.add(cranium);

  const hair = new THREE.Mesh(new THREE.BoxGeometry(0.255, 0.09, 0.255), hairMat);
  hair.position.y = 0.24;
  head.add(hair);

  if (app.role === 'guard' || app.hasCap) {
    const capMat = new THREE.MeshStandardMaterial({
      color: app.role === 'guard' ? 0x182a40 : 0xb92b27,
      roughness: 0.65,
    });
    const capCrown = new THREE.Mesh(new THREE.CylinderGeometry(0.145, 0.14, 0.09, 10), capMat);
    capCrown.position.y = 0.28;
    const capBrim = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.03, 0.14), capMat);
    capBrim.position.set(0, 0.24, 0.14);
    head.add(capCrown, capBrim);
  }

  // Arms
  const armGeo = new THREE.BoxGeometry(0.13, 0.5, 0.13);
  armGeo.translate(0, -0.22, 0);
  const handGeo = new THREE.BoxGeometry(0.11, 0.11, 0.11);
  handGeo.translate(0, -0.49, 0);

  const leftArmPivot = new THREE.Group();
  leftArmPivot.position.set(0.3, 0.54, 0);
  const lArm = new THREE.Mesh(armGeo, shirtMat);
  const lHand = new THREE.Mesh(handGeo, skinMat);
  lArm.castShadow = !isSoftwareGl;
  leftArmPivot.add(lArm, lHand);
  torso.add(leftArmPivot);

  const rightArmPivot = new THREE.Group();
  rightArmPivot.position.set(-0.3, 0.54, 0);
  const rArm = new THREE.Mesh(armGeo, shirtMat);
  const rHand = new THREE.Mesh(handGeo, skinMat);
  rArm.castShadow = !isSoftwareGl;
  rightArmPivot.add(rArm, rHand);
  torso.add(rightArmPivot);

  // Legs
  const legGeo = new THREE.BoxGeometry(0.17, 0.72, 0.18);
  legGeo.translate(0, -0.36, 0);
  const shoeGeo = new THREE.BoxGeometry(0.18, 0.12, 0.25);
  shoeGeo.translate(0, -0.76, 0.03);

  const leftLegPivot = new THREE.Group();
  leftLegPivot.position.set(0.12, 0.02, 0);
  const lLeg = new THREE.Mesh(legGeo, pantsMat);
  const lShoe = new THREE.Mesh(shoeGeo, shoeMat);
  lLeg.castShadow = !isSoftwareGl;
  leftLegPivot.add(lLeg, lShoe);
  hips.add(leftLegPivot);

  const rightLegPivot = new THREE.Group();
  rightLegPivot.position.set(-0.12, 0.02, 0);
  const rLeg = new THREE.Mesh(legGeo, pantsMat);
  const rShoe = new THREE.Mesh(shoeGeo, shoeMat);
  rLeg.castShadow = !isSoftwareGl;
  rightLegPivot.add(rLeg, rShoe);
  hips.add(rightLegPivot);

  return {
    root,
    hips,
    torso,
    head,
    leftArmPivot,
    rightArmPivot,
    leftLegPivot,
    rightLegPivot,
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

export function animateHumanRig(
  rig: HumanRig,
  mode: HumanAnimMode,
  phase: number,
  dt: number,
): void {
  const k = Math.min(1, 14 * dt);

  if (mode === 'seated') {
    rig.hips.position.y = THREE.MathUtils.lerp(rig.hips.position.y, 0.42, k);
    rig.torso.rotation.x = THREE.MathUtils.lerp(rig.torso.rotation.x, -0.06, k);
    rig.leftLegPivot.rotation.x = THREE.MathUtils.lerp(rig.leftLegPivot.rotation.x, -Math.PI * 0.48, k);
    rig.rightLegPivot.rotation.x = THREE.MathUtils.lerp(rig.rightLegPivot.rotation.x, -Math.PI * 0.48, k);
    rig.leftArmPivot.rotation.x = THREE.MathUtils.lerp(rig.leftArmPivot.rotation.x, -Math.PI * 0.34, k);
    rig.rightArmPivot.rotation.x = THREE.MathUtils.lerp(rig.rightArmPivot.rotation.x, -Math.PI * 0.34, k);
    rig.leftArmPivot.rotation.z = THREE.MathUtils.lerp(rig.leftArmPivot.rotation.z, -0.1, k);
    rig.rightArmPivot.rotation.z = THREE.MathUtils.lerp(rig.rightArmPivot.rotation.z, 0.1, k);
    return;
  }

  if (mode === 'jump') {
    rig.hips.position.y = THREE.MathUtils.lerp(rig.hips.position.y, 0.94, k);
    rig.leftLegPivot.rotation.x = THREE.MathUtils.lerp(rig.leftLegPivot.rotation.x, -0.45, k);
    rig.rightLegPivot.rotation.x = THREE.MathUtils.lerp(rig.rightLegPivot.rotation.x, 0.35, k);
    rig.leftArmPivot.rotation.x = THREE.MathUtils.lerp(rig.leftArmPivot.rotation.x, -1.2, k);
    rig.rightArmPivot.rotation.x = THREE.MathUtils.lerp(rig.rightArmPivot.rotation.x, -1.0, k);
    return;
  }

  if (mode === 'walk' || mode === 'run') {
    const amp = mode === 'run' ? 0.92 : 0.58;
    const armAmp = mode === 'run' ? 0.85 : 0.48;
    const swing = Math.sin(phase);
    rig.hips.position.y = 0.88 + Math.abs(Math.cos(phase)) * (mode === 'run' ? 0.08 : 0.04);
    rig.torso.rotation.x = THREE.MathUtils.lerp(rig.torso.rotation.x, mode === 'run' ? 0.14 : 0.05, k);
    rig.leftLegPivot.rotation.x = swing * amp;
    rig.rightLegPivot.rotation.x = -swing * amp;
    rig.leftArmPivot.rotation.x = -swing * armAmp;
    rig.rightArmPivot.rotation.x = swing * armAmp;
    rig.leftArmPivot.rotation.z = 0.06;
    rig.rightArmPivot.rotation.z = -0.06;
    return;
  }

  if (mode === 'chat') {
    rig.hips.position.y = THREE.MathUtils.lerp(rig.hips.position.y, 0.88, k);
    rig.torso.rotation.x = THREE.MathUtils.lerp(rig.torso.rotation.x, 0, k);
    rig.leftLegPivot.rotation.x = THREE.MathUtils.lerp(rig.leftLegPivot.rotation.x, 0, k);
    rig.rightLegPivot.rotation.x = THREE.MathUtils.lerp(rig.rightLegPivot.rotation.x, 0, k);
    rig.leftArmPivot.rotation.x = -0.35 + Math.sin(phase * 0.7) * 0.25;
    rig.rightArmPivot.rotation.x = -0.25 + Math.cos(phase * 0.85) * 0.22;
    rig.head.rotation.y = Math.sin(phase * 0.4) * 0.22;
    return;
  }

  // Idle breathing
  rig.hips.position.y = THREE.MathUtils.lerp(rig.hips.position.y, 0.88, k);
  rig.torso.rotation.x = THREE.MathUtils.lerp(rig.torso.rotation.x, 0, k);
  rig.leftLegPivot.rotation.x = THREE.MathUtils.lerp(rig.leftLegPivot.rotation.x, 0, k);
  rig.rightLegPivot.rotation.x = THREE.MathUtils.lerp(rig.rightLegPivot.rotation.x, 0, k);
  rig.leftArmPivot.rotation.x = THREE.MathUtils.lerp(rig.leftArmPivot.rotation.x, Math.sin(phase * 0.4) * 0.04, k);
  rig.rightArmPivot.rotation.x = THREE.MathUtils.lerp(rig.rightArmPivot.rotation.x, -Math.sin(phase * 0.4) * 0.04, k);
  rig.leftArmPivot.rotation.z = 0.06;
  rig.rightArmPivot.rotation.z = -0.06;
}
