import * as THREE from 'three';
import {
  BoxCollider,
  CircleCollider,
  WORLD_HALF_SIZE,
  groundHeightAt,
  surfaceTypeAt,
  terrainNormalAt,
} from './terrain';
import { ControlInput, GearValue, SurfaceType, TransmissionMode, VehicleConfig } from './types';

export interface VehiclePhysicsState {
  x: number;
  y: number;
  z: number;
  heading: number;
  vx: number;
  vy: number;
  vz: number;
  forwardSpeed: number;
  lateralSpeed: number;
  steerAngle: number;
  wheelSpin: number;
  pitch: number;
  roll: number;
  heave: number;
  wheelOffsets: [number, number, number, number];
  surface: SurfaceType;
  selectedGear: GearValue;
  actualGear: string;
  transmissionMode: TransmissionMode;
  engineRunning: boolean;
  gearShiftPulse: number;
  rpmNorm: number;
  skidIntensity: number;
  fuelLiters: number;
  bumpStrength: number;
  doorOpenAmt: number;
}

export interface PlayerWalkState {
  x: number;
  y: number;
  z: number;
  vy: number;
  heading: number;
  speed: number;
  grounded: boolean;
  animPhase: number;
  mode: 'idle' | 'walk' | 'run' | 'jump';
}

const _normal = { x: 0, y: 1, z: 0 };

// Speed ceilings (fraction of vehicle maxSpeedKmh) & torque multipliers for gears 1..4
const GEAR_SPECS: Record<string, { speedFrac: number; torqueMult: number }> = {
  '1': { speedFrac: 0.28, torqueMult: 1.55 },
  '2': { speedFrac: 0.52, torqueMult: 1.18 },
  '3': { speedFrac: 0.78, torqueMult: 0.92 },
  '4': { speedFrac: 1.0, torqueMult: 0.76 },
};

export function createInitialVehicleState(
  config: VehicleConfig,
  x = 0,
  z = -138,
  heading = 0,
  transmissionMode: TransmissionMode = 'manual',
): VehiclePhysicsState {
  const y = groundHeightAt(x, z);
  return {
    x,
    y,
    z,
    heading,
    vx: 0,
    vy: 0,
    vz: 0,
    forwardSpeed: 0,
    lateralSpeed: 0,
    steerAngle: 0,
    wheelSpin: 0,
    pitch: 0,
    roll: 0,
    heave: 0,
    wheelOffsets: [0, 0, 0, 0],
    surface: surfaceTypeAt(x, z, y),
    selectedGear: transmissionMode === 'manual' ? '1' : 'D',
    actualGear: '1',
    transmissionMode,
    engineRunning: true,
    gearShiftPulse: 0,
    rpmNorm: 0.16,
    skidIntensity: 0,
    fuelLiters: config.fuelTankLiters,
    bumpStrength: 0,
    doorOpenAmt: 0,
  };
}

export function stepVehiclePhysics(
  state: VehiclePhysicsState,
  config: VehicleConfig,
  input: ControlInput,
  circleColliders: CircleCollider[],
  boxColliders: BoxCollider[],
  dt: number,
  rainActive = false,
): void {
  state.bumpStrength = 0;

  const surf = surfaceTypeAt(state.x, state.z, state.y);
  state.surface = surf;

  let grip = 0.92 * config.steeringGrip;
  let rollingDrag = 0.42;
  let speedScale = 1.0;

  switch (surf) {
    case 'asphalt':
    case 'bridge':
      grip = 1.04 * config.steeringGrip;
      rollingDrag = 0.34;
      speedScale = 1.0;
      break;
    case 'dirt':
      grip = 0.78 * config.steeringGrip;
      rollingDrag = 0.58;
      speedScale = 0.9;
      break;
    case 'grass':
      grip = 0.72 * config.steeringGrip;
      rollingDrag = 0.72;
      speedScale = 0.84;
      break;
    case 'mud':
      grip = (0.48 + config.mudGrip * 0.22) * config.steeringGrip;
      rollingDrag = 2.4 - config.mudGrip * 0.9;
      speedScale = 0.46 + config.mudGrip * 0.22;
      break;
    case 'water':
      grip = 0.56 * config.steeringGrip;
      rollingDrag = 1.85;
      speedScale = 0.52 + config.mudGrip * 0.15;
      break;
  }

  if (rainActive && (surf === 'asphalt' || surf === 'dirt')) {
    grip *= 0.84;
  }

  const baseMaxSpeedMs = (config.maxSpeedKmh / 3.6) * speedScale;
  const maxReverseMs = baseMaxSpeedMs * 0.38;

  const sinH = Math.sin(state.heading);
  const cosH = Math.cos(state.heading);
  const fwdX = sinH;
  const fwdZ = cosH;
  const rightX = cosH;
  const rightZ = -sinH;

  let vFwd = state.vx * fwdX + state.vz * fwdZ;
  let vLat = state.vx * rightX + state.vz * rightZ;

  // Mass inertia factor (heavier trucks feel weightier on accel/braking)
  const weightFactor = Math.max(0.68, Math.min(1.18, 1800 / config.massKg));
  const hasFuel = state.fuelLiters > 0.05;
  const engineActive = state.engineRunning && (hasFuel || input.throttle < 0.01);
  const fuelFactor = hasFuel ? 1.0 : 0.25;

  // Gear selection & Auto-shifting logic
  const prevActual = state.actualGear;
  const speedKmh = Math.abs(vFwd) * 3.6;

  if (state.selectedGear === 'P') {
    state.actualGear = 'P';
  } else if (state.selectedGear === 'N') {
    state.actualGear = 'N';
  } else if (state.selectedGear === 'R') {
    state.actualGear = 'R';
  } else if (state.selectedGear === 'D' || state.transmissionMode === 'auto') {
    // Automatic shifting between 1..4 based on speed
    if (input.reverse && vFwd <= 0.5) {
      state.actualGear = 'R';
    } else if (speedKmh < 26) {
      state.actualGear = '1';
    } else if (speedKmh < 56) {
      state.actualGear = '2';
    } else if (speedKmh < 92) {
      state.actualGear = '3';
    } else {
      state.actualGear = '4';
    }
  } else {
    // Manual locked gear 1..4
    state.actualGear = state.selectedGear;
  }

  if (state.actualGear !== prevActual) {
    state.gearShiftPulse++;
  }

  // Longitudinal Drive Force
  let driveAccel = 0;
  const isBraking = input.brake > 0.05;
  const gearSpec = GEAR_SPECS[state.actualGear] || GEAR_SPECS['1'];
  const gearMaxMs = baseMaxSpeedMs * gearSpec.speedFrac;

  if (state.selectedGear === 'P') {
    // Park locks transmission firmly
    vFwd *= Math.max(0, 1 - 12 * dt);
  } else if (!state.engineRunning) {
    // Engine off: coasts only, no drive power
  } else if (state.actualGear === 'N') {
    // Neutral: free revving, coasts smoothly
  } else if (state.actualGear === 'R' || input.reverse) {
    const accelInput = input.reverse ? 1 : input.throttle;
    if (vFwd > 1.0) {
      driveAccel -= config.engineForce * 1.45 * config.brakingPower;
    } else if (accelInput > 0.02) {
      const revTarget = Math.max(0, 1 - Math.abs(vFwd) / maxReverseMs);
      driveAccel -= accelInput * config.engineForce * 0.72 * revTarget * fuelFactor;
    }
  } else if (input.throttle > 0.02) {
    if (vFwd < -0.8) {
      driveAccel += config.engineForce * 1.45 * config.brakingPower;
    } else if (vFwd < gearMaxMs) {
      const gearRatioProg = Math.max(0, Math.min(1, vFwd / gearMaxMs));
      const torqueCurve = (1.15 - 0.45 * gearRatioProg) * gearSpec.torqueMult;
      driveAccel += input.throttle * config.engineForce * torqueCurve * weightFactor * fuelFactor;
    } else {
      // Soft engine limiter in low manual gears
      driveAccel -= (vFwd - gearMaxMs) * 4.5;
    }
  }

  if (isBraking && state.selectedGear !== 'P') {
    if (vFwd > 0.6) {
      driveAccel -= input.brake * config.engineForce * 1.75 * config.brakingPower;
    } else if (vFwd < -0.6 && state.actualGear !== 'R') {
      driveAccel += input.brake * config.engineForce * 1.55 * config.brakingPower;
    } else if (state.transmissionMode === 'auto' && state.selectedGear === 'D' && !input.reverse && input.throttle < 0.02) {
      // In Auto Drive, holding S while stopped reverses gently
      const revTarget = Math.max(0, 1 - Math.abs(vFwd) / maxReverseMs);
      driveAccel -= input.brake * config.engineForce * 0.58 * revTarget * fuelFactor;
    }
  }

  if (input.handbrake) {
    const sign = vFwd >= 0 ? 1 : -1;
    if (Math.abs(vFwd) > 0.3) {
      driveAccel -= sign * config.engineForce * 1.35 * config.brakingPower;
    } else {
      vFwd *= 0.75;
    }
  }

  // Slope gravity
  terrainNormalAt(state.x, state.z, _normal);
  const slopeFwd = _normal.x * fwdX + _normal.z * fwdZ;
  const slopeLat = _normal.x * rightX + _normal.z * rightZ;
  if (state.selectedGear !== 'P') {
    driveAccel += slopeFwd * 9.81 * 0.88;
  }

  vFwd += driveAccel * dt;
  vFwd -= vFwd * rollingDrag * dt;

  if (vFwd > baseMaxSpeedMs) vFwd = THREE.MathUtils.lerp(vFwd, baseMaxSpeedMs, 1 - Math.exp(-3 * dt));
  if (vFwd < -maxReverseMs) vFwd = -maxReverseMs;

  // Steering
  const speedAbs = Math.abs(vFwd);
  const maxSteer = THREE.MathUtils.lerp(0.62, 0.32, Math.min(1, speedAbs / 30));
  const targetSteer = input.steer * maxSteer;
  state.steerAngle = THREE.MathUtils.damp(state.steerAngle, targetSteer, 11, dt);

  if (speedAbs > 0.25 && state.selectedGear !== 'P') {
    const turnFactor = (vFwd / config.wheelBase) * Math.tan(state.steerAngle);
    const handbrakeBoost = input.handbrake ? 1.45 : 1.0;
    const lowSpeedBoost = Math.min(1, speedAbs / 2.4);
    state.heading += turnFactor * lowSpeedBoost * handbrakeBoost * dt;
  }

  const lateralGrip = input.handbrake ? grip * 2.1 : grip * 6.9;
  vLat += slopeLat * 9.81 * 0.45 * dt;
  vLat -= vLat * Math.min(14, lateralGrip) * dt;

  const newSin = Math.sin(state.heading);
  const newCos = Math.cos(state.heading);
  state.vx = newSin * vFwd + newCos * vLat;
  state.vz = newCos * vFwd - newSin * vLat;
  state.forwardSpeed = vFwd;
  state.lateralSpeed = vLat;

  let nextX = state.x + state.vx * dt;
  let nextZ = state.z + state.vz * dt;

  const limit = WORLD_HALF_SIZE - 8;
  if (nextX > limit) { nextX = limit; state.vx *= -0.3; }
  else if (nextX < -limit) { nextX = -limit; state.vx *= -0.3; }
  if (nextZ > limit) { nextZ = limit; state.vz *= -0.3; }
  else if (nextZ < -limit) { nextZ = -limit; state.vz *= -0.3; }

  const carRadius = Math.max(0.55, config.chassisWidth * 0.54);

  // Circle Colliders
  for (let i = 0; i < circleColliders.length; i++) {
    const col = circleColliders[i];
    const dx = nextX - col.x;
    const dz = nextZ - col.z;
    const minDist = carRadius + col.radius;
    const distSq = dx * dx + dz * dz;
    if (distSq < minDist * minDist && distSq > 0.00001) {
      const dist = Math.sqrt(distSq);
      const nx = dx / dist;
      const nz = dz / dist;
      const pen = minDist - dist;
      nextX += nx * pen;
      nextZ += nz * pen;
      const relVn = state.vx * nx + state.vz * nz;
      if (relVn < 0) {
        state.bumpStrength = Math.max(state.bumpStrength, Math.min(1, -relVn / 14));
        state.vx -= 1.3 * relVn * nx;
        state.vz -= 1.3 * relVn * nz;
        state.forwardSpeed *= 0.68;
      }
    }
  }

  // Box Colliders
  for (let i = 0; i < boxColliders.length; i++) {
    const box = boxColliders[i];
    const dx = nextX - box.cx;
    const dz = nextZ - box.cz;
    const maxDim = box.halfW + box.halfD + carRadius;
    if (Math.abs(dx) > maxDim || Math.abs(dz) > maxDim) continue;

    const cR = Math.cos(-box.rotationY);
    const sR = Math.sin(-box.rotationY);
    const localX = dx * cR - dz * sR;
    const localZ = dx * sR + dz * cR;

    const clampedX = Math.max(-box.halfW, Math.min(box.halfW, localX));
    const clampedZ = Math.max(-box.halfD, Math.min(box.halfD, localZ));

    const offX = localX - clampedX;
    const offZ = localZ - clampedZ;
    const distSq = offX * offX + offZ * offZ;

    if (distSq < carRadius * carRadius) {
      let pushLocalX = 0;
      let pushLocalZ = 0;
      if (distSq > 0.0001) {
        const dist = Math.sqrt(distSq);
        const pen = carRadius - dist;
        pushLocalX = (offX / dist) * pen;
        pushLocalZ = (offZ / dist) * pen;
      } else {
        pushLocalZ = carRadius;
      }

      const icR = Math.cos(box.rotationY);
      const isR = Math.sin(box.rotationY);
      const worldPushX = pushLocalX * icR - pushLocalZ * isR;
      const worldPushZ = pushLocalX * isR + pushLocalZ * icR;

      nextX += worldPushX;
      nextZ += worldPushZ;

      const pLen = Math.hypot(worldPushX, worldPushZ) || 1;
      const nx = worldPushX / pLen;
      const nz = worldPushZ / pLen;
      const relVn = state.vx * nx + state.vz * nz;
      if (relVn < 0) {
        state.bumpStrength = Math.max(state.bumpStrength, Math.min(1, -relVn / 14));
        state.vx -= 1.28 * relVn * nx;
        state.vz -= 1.28 * relVn * nz;
        state.forwardSpeed *= 0.68;
      }
    }
  }

  state.x = nextX;
  state.z = nextZ;

  // 4-Corner Wheel Suspension
  const halfT = config.trackWidth * 0.5;
  const halfW = config.wheelBase * 0.5;
  const hFL = groundHeightAt(state.x + (-halfT * newCos + halfW * newSin), state.z + (halfT * newSin + halfW * newCos), state.y);
  const hFR = groundHeightAt(state.x + (halfT * newCos + halfW * newSin), state.z + (-halfT * newSin + halfW * newCos), state.y);
  const hRL = groundHeightAt(state.x + (-halfT * newCos - halfW * newSin), state.z + (halfT * newSin - halfW * newCos), state.y);
  const hRR = groundHeightAt(state.x + (halfT * newCos - halfW * newSin), state.z + (-halfT * newSin - halfW * newCos), state.y);

  const avgWheelGround = (hFL + hFR + hRL + hRR) * 0.25;
  const targetChassisY = avgWheelGround + config.groundClearance;

  if (state.y > targetChassisY + 0.08) {
    state.vy -= 18.5 * dt;
    state.y += state.vy * dt;
    if (state.y < targetChassisY) {
      state.heave = Math.max(-0.18, state.vy * 0.015);
      state.y = targetChassisY;
      state.vy = 0;
    }
  } else {
    state.y = THREE.MathUtils.damp(state.y, targetChassisY, 18, dt);
    state.vy = 0;
  }

  const mudSink = surf === 'mud' ? -0.09 : surf === 'water' ? -0.05 : 0;
  state.heave = THREE.MathUtils.damp(state.heave, mudSink, 8, dt);

  const terrainPitch = Math.atan2((hRL + hRR) * 0.5 - (hFL + hFR) * 0.5, config.wheelBase);
  const terrainRoll = Math.atan2((hFR + hRR) * 0.5 - (hFL + hRL) * 0.5, config.trackWidth);
  const accelSquat = THREE.MathUtils.clamp(-driveAccel * 0.0028, -0.07, 0.07);
  // Motorcycles lean into turns!
  const motoLean = config.style === 'motorcycle' ? input.steer * (speedAbs / 24) * 0.28 : 0;
  const cornerRoll = config.style === 'motorcycle'
    ? motoLean
    : THREE.MathUtils.clamp(-vLat * 0.012 + input.steer * (speedAbs / 30) * 0.055, -0.09, 0.09);

  state.pitch = THREE.MathUtils.damp(state.pitch, terrainPitch + accelSquat, 10, dt);
  state.roll = THREE.MathUtils.damp(state.roll, terrainRoll + cornerRoll, 10, dt);

  const wheelGrounds = [hFL, hFR, hRL, hRR];
  for (let i = 0; i < 4; i++) {
    const desiredOffset = wheelGrounds[i] + config.wheelRadius - state.y;
    state.wheelOffsets[i] = THREE.MathUtils.damp(state.wheelOffsets[i], THREE.MathUtils.clamp(desiredOffset, -0.42, 0.14), 22, dt);
  }

  const spinDelta = (vFwd / config.wheelRadius) * dt;
  const mudSpinBoost = surf === 'mud' && input.throttle > 0.2 ? 1.55 : 1.0;
  state.wheelSpin += spinDelta * mudSpinBoost;

  // Realistic RPM calculation based on active gear
  let targetRpm = 0;
  if (!engineActive) {
    targetRpm = 0;
  } else if (state.actualGear === 'N' || state.actualGear === 'P') {
    targetRpm = 0.15 + input.throttle * 0.72;
  } else if (state.actualGear === 'R') {
    targetRpm = Math.min(0.92, 0.16 + Math.abs(vFwd) / maxReverseMs * 0.76);
  } else {
    const ratio = Math.min(1, Math.max(0, vFwd / gearMaxMs));
    targetRpm = 0.18 + ratio * 0.78 + input.throttle * 0.08;
  }
  state.rpmNorm = THREE.MathUtils.damp(state.rpmNorm, Math.min(1, targetRpm), 9, dt);

  const lateralSlip = Math.abs(vLat) / 7.5;
  const handbrakeSlip = input.handbrake && speedKmh > 12 ? 0.85 : 0;
  const mudSlip = (surf === 'mud' || surf === 'dirt') && input.throttle > 0.5 && speedKmh > 10 ? 0.35 : 0;
  state.skidIntensity = Math.min(1, Math.max(lateralSlip, handbrakeSlip, mudSlip));

  if (state.engineRunning) {
    const burnRate = (0.03 + input.throttle * 0.2) * (surf === 'mud' ? 1.35 : 1.0);
    state.fuelLiters = Math.max(0, state.fuelLiters - burnRate * dt);
  }
}

export function stepPlayerWalkPhysics(
  walk: PlayerWalkState,
  input: ControlInput,
  cameraYaw: number,
  circleColliders: CircleCollider[],
  boxColliders: BoxCollider[],
  dt: number,
): void {
  const moveMag = Math.hypot(input.walkX, input.walkY);
  const maxWalkSpeed = input.sprint ? 8.8 : 4.6;

  if (moveMag > 0.08) {
    // Camera-relative movement direction
    const nx = input.walkX / Math.max(1, moveMag);
    const ny = input.walkY / Math.max(1, moveMag);
    const sinC = Math.sin(cameraYaw);
    const cosC = Math.cos(cameraYaw);
    // Forward along camera yaw (-sinC, -cosC) or +Z? Let cameraYaw=0 mean looking toward +Z:
    const worldDirX = sinC * ny - cosC * nx;
    const worldDirZ = cosC * ny + sinC * nx;

    const targetSpeed = Math.min(1, moveMag) * maxWalkSpeed;
    walk.speed = THREE.MathUtils.damp(walk.speed, targetSpeed, 12, dt);

    const desiredHeading = Math.atan2(worldDirX, worldDirZ);
    // Shortest angle interpolation
    let diff = desiredHeading - walk.heading;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    walk.heading += diff * Math.min(1, 12 * dt);
  } else {
    walk.speed = THREE.MathUtils.damp(walk.speed, 0, 14, dt);
  }

  let nextX = walk.x + Math.sin(walk.heading) * walk.speed * dt;
  let nextZ = walk.z + Math.cos(walk.heading) * walk.speed * dt;

  const limit = WORLD_HALF_SIZE - 6;
  nextX = Math.max(-limit, Math.min(limit, nextX));
  nextZ = Math.max(-limit, Math.min(limit, nextZ));

  // Human capsule radius collision
  const r = 0.48;
  for (let i = 0; i < circleColliders.length; i++) {
    const col = circleColliders[i];
    const dx = nextX - col.x;
    const dz = nextZ - col.z;
    const minD = r + col.radius;
    const dSq = dx * dx + dz * dz;
    if (dSq < minD * minD && dSq > 0.0001) {
      const d = Math.sqrt(dSq);
      nextX = col.x + (dx / d) * minD;
      nextZ = col.z + (dz / d) * minD;
    }
  }

  for (let i = 0; i < boxColliders.length; i++) {
    const box = boxColliders[i];
    const dx = nextX - box.cx;
    const dz = nextZ - box.cz;
    if (Math.abs(dx) > box.halfW + r || Math.abs(dz) > box.halfD + r) continue;
    const cR = Math.cos(-box.rotationY);
    const sR = Math.sin(-box.rotationY);
    const lx = dx * cR - dz * sR;
    const lz = dx * sR + dz * cR;
    const cx = Math.max(-box.halfW, Math.min(box.halfW, lx));
    const cz = Math.max(-box.halfD, Math.min(box.halfD, lz));
    const ox = lx - cx;
    const oz = lz - cz;
    const dSq = ox * ox + oz * oz;
    if (dSq < r * r) {
      const d = Math.sqrt(dSq) || 0.001;
      const pen = r - d;
      const px = (ox / d) * pen;
      const pz = (oz / d) * pen;
      const icR = Math.cos(box.rotationY);
      const isR = Math.sin(box.rotationY);
      nextX += px * icR - pz * isR;
      nextZ += px * isR + pz * icR;
    }
  }

  walk.x = nextX;
  walk.z = nextZ;

  const groundY = groundHeightAt(walk.x, walk.z, walk.y);
  if (input.jump && walk.grounded) {
    walk.vy = 6.8;
    walk.grounded = false;
  }

  walk.vy -= 19.5 * dt;
  walk.y += walk.vy * dt;
  if (walk.y <= groundY) {
    walk.y = groundY;
    walk.vy = 0;
    walk.grounded = true;
  } else if (walk.y > groundY + 0.12) {
    walk.grounded = false;
  }

  if (!walk.grounded) {
    walk.mode = 'jump';
  } else if (walk.speed > 5.8) {
    walk.mode = 'run';
    walk.animPhase += walk.speed * 1.8 * dt;
  } else if (walk.speed > 0.45) {
    walk.mode = 'walk';
    walk.animPhase += walk.speed * 2.2 * dt;
  } else {
    walk.mode = 'idle';
    walk.animPhase += dt * 2.0;
  }
}
