import * as THREE from 'three';

interface ParticleItem {
  active: boolean;
  life: number;
  maxLife: number;
  vx: number;
  vy: number;
  vz: number;
  startScale: number;
  endScale: number;
  x: number;
  y: number;
  z: number;
  color: THREE.Color;
}

interface SkidItem {
  life: number;
  maxLife: number;
}

export class ParticleAndSkidSystem {
  private group = new THREE.Group();
  private particles: ParticleItem[] = [];
  private particleInstanced: THREE.InstancedMesh;
  private maxParticles = 240;
  private dummy = new THREE.Object3D();

  private skidInstanced: THREE.InstancedMesh;
  private skids: SkidItem[] = [];
  private maxSkids = 160;
  private skidCursor = 0;

  constructor(scene: THREE.Scene, particleTex: THREE.Texture, skidTex: THREE.Texture) {
    scene.add(this.group);

    // Pooled billboard-like puff spheres/planes for dust, mud, water splash, exhaust
    const pGeo = new THREE.SphereGeometry(0.45, 7, 6);
    const pMat = new THREE.MeshBasicMaterial({
      map: particleTex,
      transparent: true,
      opacity: 0.72,
      depthWrite: false,
    });
    this.particleInstanced = new THREE.InstancedMesh(pGeo, pMat, this.maxParticles);
    this.particleInstanced.frustumCulled = false;
    this.particleInstanced.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

    const zeroMat = new THREE.Matrix4().makeScale(0, 0, 0);
    for (let i = 0; i < this.maxParticles; i++) {
      this.particles.push({
        active: false,
        life: 0,
        maxLife: 1,
        vx: 0,
        vy: 0,
        vz: 0,
        startScale: 0.4,
        endScale: 1.5,
        x: 0,
        y: -100,
        z: 0,
        color: new THREE.Color(0xc8a97e),
      });
      this.particleInstanced.setMatrixAt(i, zeroMat);
      this.particleInstanced.setColorAt(i, new THREE.Color(0xc8a97e));
    }
    this.group.add(this.particleInstanced);

    // Pooled ground-aligned skid marks
    const sGeo = new THREE.PlaneGeometry(1.75, 1.35);
    sGeo.rotateX(-Math.PI / 2);
    const sMat = new THREE.MeshBasicMaterial({
      map: skidTex,
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });
    this.skidInstanced = new THREE.InstancedMesh(sGeo, sMat, this.maxSkids);
    this.skidInstanced.frustumCulled = false;
    for (let i = 0; i < this.maxSkids; i++) {
      this.skids.push({ life: 0, maxLife: 10 });
      this.skidInstanced.setMatrixAt(i, zeroMat);
    }
    this.group.add(this.skidInstanced);
  }

  emit(
    x: number,
    y: number,
    z: number,
    vx: number,
    vy: number,
    vz: number,
    colorHex: number,
    startScale = 0.45,
    endScale = 1.6,
    maxLife = 0.75,
  ) {
    for (let i = 0; i < this.maxParticles; i++) {
      const p = this.particles[i];
      if (!p.active) {
        p.active = true;
        p.life = 0;
        p.maxLife = maxLife;
        p.x = x;
        p.y = y;
        p.z = z;
        p.vx = vx;
        p.vy = vy;
        p.vz = vz;
        p.startScale = startScale;
        p.endScale = endScale;
        p.color.setHex(colorHex);
        this.particleInstanced.setColorAt(i, p.color);
        if (this.particleInstanced.instanceColor) {
          this.particleInstanced.instanceColor.needsUpdate = true;
        }
        return;
      }
    }
  }

  addSkidMark(x: number, y: number, z: number, heading: number, slopePitch = 0, slopeRoll = 0) {
    const idx = this.skidCursor;
    this.skidCursor = (this.skidCursor + 1) % this.maxSkids;
    this.skids[idx].life = 0;
    this.skids[idx].maxLife = 14;

    this.dummy.position.set(x, y + 0.04, z);
    this.dummy.rotation.set(slopePitch, heading, slopeRoll, 'YXZ');
    this.dummy.scale.set(1, 1, 1);
    this.dummy.updateMatrix();
    this.skidInstanced.setMatrixAt(idx, this.dummy.matrix);
    this.skidInstanced.instanceMatrix.needsUpdate = true;
  }

  update(dt: number) {
    let anyDirty = false;
    for (let i = 0; i < this.maxParticles; i++) {
      const p = this.particles[i];
      if (!p.active) continue;
      anyDirty = true;
      p.life += dt;
      if (p.life >= p.maxLife) {
        p.active = false;
        this.dummy.scale.set(0, 0, 0);
        this.dummy.updateMatrix();
        this.particleInstanced.setMatrixAt(i, this.dummy.matrix);
        continue;
      }
      const t = p.life / p.maxLife;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      p.vy -= 2.2 * dt; // subtle gravity for mud/water droplets
      p.vx *= 1 - 1.5 * dt;
      p.vz *= 1 - 1.5 * dt;

      const s = THREE.MathUtils.lerp(p.startScale, p.endScale, t) * (1 - t * 0.45);
      this.dummy.position.set(p.x, p.y, p.z);
      this.dummy.rotation.set(0, 0, 0);
      this.dummy.scale.set(s, s * 0.85, s);
      this.dummy.updateMatrix();
      this.particleInstanced.setMatrixAt(i, this.dummy.matrix);
    }
    if (anyDirty) {
      this.particleInstanced.instanceMatrix.needsUpdate = true;
    }
  }

  dispose() {
    this.particleInstanced.geometry.dispose();
    (this.particleInstanced.material as THREE.Material).dispose();
    this.skidInstanced.geometry.dispose();
    (this.skidInstanced.material as THREE.Material).dispose();
  }
}
