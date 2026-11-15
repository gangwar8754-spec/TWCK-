import * as THREE from 'three';
import {
  ASPHALT_SEGMENTS,
  BRIDGES,
  BUILDINGS,
  BuildingFootprint,
  WATER_LEVEL,
  WorldPropsData,
  groundHeightAt,
  rawTerrainHeightAt,
  riverCenterX,
  surfaceTypeAt,
} from './terrain';
import { ProceduralTextures } from './textures';

export interface WorldHandles {
  root: THREE.Group;
  waterUniforms: { uTime: { value: number } };
  cloudsGroup: THREE.Group;
  sunDisc: THREE.Mesh;
  moonDisc: THREE.Mesh;
  skyMaterial: THREE.ShaderMaterial;
  nightGlowMaterials: THREE.MeshStandardMaterial[];
  coinMeshes: Map<number, THREE.Group>;
  fuelMeshes: Map<number, THREE.Group>;
  checkpointBeacon: THREE.Group;
  rainPoints: THREE.Points;
  updateDynamicProps: (elapsed: number, nightFactor: number, rainActive: boolean, playerX: number, playerZ: number, dt: number) => void;
  dispose: () => void;
}

// Helper to build crisp 3D extruded block letters on top of gates / Munish House
const BLOCK_FONT: Record<string, Array<[number, number, number, number]>> = {
  K: [[0, 0, 0.25, 1], [0.25, 0.45, 0.35, 0.16], [0.45, 0.55, 0.3, 0.45], [0.45, 0, 0.3, 0.45]],
  A: [[0, 0, 0.22, 1], [0.58, 0, 0.22, 1], [0.18, 0.8, 0.44, 0.2], [0.18, 0.42, 0.44, 0.16]],
  S: [[0, 0.8, 0.78, 0.2], [0, 0.42, 0.78, 0.18], [0, 0, 0.78, 0.2], [0, 0.5, 0.22, 0.4], [0.56, 0.1, 0.22, 0.4]],
  B: [[0, 0, 0.22, 1], [0.18, 0.8, 0.52, 0.2], [0.18, 0.42, 0.5, 0.16], [0.18, 0, 0.52, 0.2], [0.58, 0.52, 0.2, 0.35], [0.58, 0.12, 0.2, 0.35]],
  P: [[0, 0, 0.22, 1], [0.18, 0.8, 0.55, 0.2], [0.18, 0.44, 0.55, 0.18], [0.56, 0.52, 0.22, 0.36]],
  U: [[0, 0.15, 0.22, 0.85], [0.58, 0.15, 0.22, 0.85], [0.1, 0, 0.6, 0.2]],
  R: [[0, 0, 0.22, 1], [0.18, 0.8, 0.52, 0.2], [0.18, 0.44, 0.52, 0.18], [0.56, 0.52, 0.22, 0.36], [0.48, 0, 0.25, 0.46]],
  M: [[0, 0, 0.2, 1], [0.64, 0, 0.2, 1], [0.2, 0.55, 0.16, 0.35], [0.48, 0.55, 0.16, 0.35], [0.32, 0.38, 0.2, 0.3]],
  N: [[0, 0, 0.22, 1], [0.58, 0, 0.22, 1], [0.2, 0.5, 0.2, 0.4], [0.4, 0.25, 0.2, 0.4]],
  I: [[0.15, 0.8, 0.5, 0.2], [0.29, 0.15, 0.22, 0.7], [0.15, 0, 0.5, 0.2]],
  H: [[0, 0, 0.22, 1], [0.58, 0, 0.22, 1], [0.18, 0.42, 0.44, 0.18]],
  O: [[0, 0.1, 0.22, 0.8], [0.58, 0.1, 0.22, 0.8], [0.12, 0.8, 0.56, 0.2], [0.12, 0, 0.56, 0.2]],
  E: [[0, 0, 0.22, 1], [0.18, 0.8, 0.58, 0.2], [0.18, 0.42, 0.48, 0.18], [0.18, 0, 0.58, 0.2]],
  ' ': [],
};

function create3DTextBanner(text: string, letterSize: number, depth: number, material: THREE.Material): THREE.Group {
  const grp = new THREE.Group();
  const spacing = letterSize * 1.08;
  const totalW = text.length * spacing - letterSize * 0.2;
  let cursorX = -totalW * 0.5;

  for (const ch of text.toUpperCase()) {
    const rects = BLOCK_FONT[ch] || [];
    for (const [rx, ry, rw, rh] of rects) {
      const box = new THREE.Mesh(
        new THREE.BoxGeometry(rw * letterSize, rh * letterSize, depth),
        material,
      );
      box.position.set(
        cursorX + (rx + rw * 0.5) * letterSize,
        (ry + rh * 0.5) * letterSize,
        0,
      );
      grp.add(box);
    }
    cursorX += ch === ' ' ? spacing * 0.65 : spacing;
  }
  return grp;
}

function buildIndianBuilding(
  b: BuildingFootprint,
  textures: ProceduralTextures,
  nightGlowMaterials: THREE.MeshStandardMaterial[],
  isSoftwareGl: boolean,
): THREE.Group {
  const group = new THREE.Group();
  const baseH = rawTerrainHeightAt(b.cx, b.cz);
  group.position.set(b.cx, baseH - 0.12, b.cz);
  group.rotation.y = b.rotationY;

  const wallMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(b.color),
    map: b.type === 'ruin' ? textures.stoneBrick : b.type === 'munish' ? textures.marbleTile : textures.plasterWall,
    roughness: b.type === 'munish' ? 0.42 : 0.85,
    metalness: 0.06,
  });

  const accentMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(b.accentColor),
    roughness: 0.52,
    metalness: 0.22,
  });

  const trimMat = new THREE.MeshStandardMaterial({
    color: 0x3b2f26,
    roughness: 0.8,
    metalness: 0.1,
  });

  const windowGlowMat = new THREE.MeshStandardMaterial({
    color: 0x2a343d,
    emissive: 0xffb347,
    emissiveIntensity: 0.12,
    roughness: 0.25,
    metalness: 0.3,
  });
  nightGlowMaterials.push(windowGlowMat);

  const gold3DTextMat = new THREE.MeshStandardMaterial({
    color: 0xffcf56,
    emissive: 0xff9f1c,
    emissiveIntensity: 0.45,
    roughness: 0.24,
    metalness: 0.82,
  });
  nightGlowMaterials.push(gold3DTextMat);

  if (b.type === 'gate') {
    // MONUMENTAL KASBAPUR CITY ENTRY GATE (Indian Arch + Chhatri Domes + 3D "KASBAPUR" Letters)
    const pillarGeo = new THREE.BoxGeometry(3.4, b.height, b.depth);
    for (const side of [-1, 1]) {
      const px = side * 8.2;
      const basePlinth = new THREE.Mesh(new THREE.BoxGeometry(4.4, 1.4, b.depth + 0.9), accentMat);
      basePlinth.position.set(px, 0.7, 0);
      group.add(basePlinth);

      const pillar = new THREE.Mesh(pillarGeo, wallMat);
      pillar.position.set(px, b.height * 0.5 + 0.6, 0);
      pillar.castShadow = !isSoftwareGl;
      pillar.receiveShadow = true;
      group.add(pillar);

      const cap = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.7, b.depth + 0.6), accentMat);
      cap.position.set(px, b.height + 0.8, 0);
      group.add(cap);

      // Chhatri Pavilion Dome on each tower
      const dome = new THREE.Mesh(
        new THREE.SphereGeometry(1.45, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.55),
        accentMat,
      );
      dome.position.set(px, b.height + 1.15, 0);
      group.add(dome);

      // Decorative warm uplights on pillar faces
      const lantern = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.85, 0.45), windowGlowMat);
      lantern.position.set(px, 4.5, -b.depth * 0.5 - 0.1);
      group.add(lantern);
    }

    // Main Overhead Arch Span
    const spanBeam = new THREE.Mesh(new THREE.BoxGeometry(b.width, 2.35, b.depth * 0.88), wallMat);
    spanBeam.position.set(0, b.height - 1.0, 0);
    spanBeam.castShadow = !isSoftwareGl;
    group.add(spanBeam);

    const trimStrip = new THREE.Mesh(new THREE.BoxGeometry(b.width + 0.4, 0.35, b.depth * 0.96), accentMat);
    trimStrip.position.set(0, b.height + 0.25, 0);
    group.add(trimStrip);

    // Huge 3D "KASBAPUR" Lettering atop the gate facing incoming players (-Z) and inside city (+Z)
    const bannerNorth = create3DTextBanner('KASBAPUR', 1.65, 0.42, gold3DTextMat);
    bannerNorth.position.set(0, b.height + 0.55, -b.depth * 0.36);
    bannerNorth.rotation.y = Math.PI;
    group.add(bannerNorth);

    const bannerSouth = create3DTextBanner('KASBAPUR', 1.65, 0.42, gold3DTextMat);
    bannerSouth.position.set(0, b.height + 0.55, b.depth * 0.36);
    group.add(bannerSouth);

    // Welcome Signage Board below arch span
    const welcomeTex = textures.makeSignTexture(
      'WELCOME TO KASBAPUR',
      '#7a2617',
      '#fde6ba',
      'OPEN-WORLD HERITAGE & OFFROAD CITY',
    );
    const signMat = new THREE.MeshStandardMaterial({ map: welcomeTex, roughness: 0.4 });
    const signFront = new THREE.Mesh(new THREE.BoxGeometry(12.2, 1.55, 0.2), signMat);
    signFront.position.set(0, b.height - 1.0, -b.depth * 0.46);
    signFront.rotation.y = Math.PI;
    const signBack = signFront.clone();
    signBack.position.z = b.depth * 0.46;
    signBack.rotation.y = 0;
    group.add(signFront, signBack);

    return group;
  }

  if (b.type === 'munish') {
    // MUNISH HOUSE — Grand Multi-Story Modern Luxury Mansion Estate (centered around cx=48, cz=-78)
    // Relative to (b.cx, b.cz):
    // Estate boundary walls (West gate opens at x = -19, z = 0)
    const wallH = 2.6;
    const wallMatExt = new THREE.MeshStandardMaterial({ color: 0xe6dfd3, roughness: 0.72 });
    const railIron = new THREE.MeshStandardMaterial({ color: 0x1b2026, roughness: 0.4, metalness: 0.78 });

    // North, South, East boundary walls
    const nWall = new THREE.Mesh(new THREE.BoxGeometry(38, wallH, 0.6), wallMatExt);
    nWall.position.set(0, wallH * 0.5, -16);
    const sWall = nWall.clone();
    sWall.position.z = 16;
    const eWall = new THREE.Mesh(new THREE.BoxGeometry(0.6, wallH, 32), wallMatExt);
    eWall.position.set(19, wallH * 0.5, 0);
    group.add(nWall, sWall, eWall);

    // West front boundary walls flanking the open 9m grand gate
    const wWallN = new THREE.Mesh(new THREE.BoxGeometry(0.6, wallH, 11.2), wallMatExt);
    wWallN.position.set(-19, wallH * 0.5, -10.5);
    const wWallS = wWallN.clone();
    wWallS.position.z = 10.5;
    group.add(wWallN, wWallS);

    // Grand Entrance Gate Pillars + Overhead Arch + Large 3D "MUNISH HOUSE" Sign
    for (const gz of [-4.8, 4.8]) {
      const gPillar = new THREE.Mesh(new THREE.BoxGeometry(1.4, 5.2, 1.4), wallMat);
      gPillar.position.set(-19, 2.6, gz);
      gPillar.castShadow = !isSoftwareGl;
      const gLamp = new THREE.Mesh(new THREE.SphereGeometry(0.38, 10, 8), windowGlowMat);
      gLamp.position.set(-19, 5.5, gz);
      group.add(gPillar, gLamp);
    }
    const gateHeader = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.4, 11.0), accentMat);
    gateHeader.position.set(-19, 5.4, 0);
    group.add(gateHeader);

    const gate3DText = create3DTextBanner('MUNISH HOUSE', 0.74, 0.22, gold3DTextMat);
    gate3DText.position.set(-19.65, 5.1, 0);
    gate3DText.rotation.y = -Math.PI / 2;
    group.add(gate3DText);

    // Security Checkpoint Booth beside Gate
    const booth = new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.8, 2.6), wallMatExt);
    booth.position.set(-17, 1.4, -7.5);
    const boothRoof = new THREE.Mesh(new THREE.BoxGeometry(3.1, 0.35, 3.1), accentMat);
    boothRoof.position.set(-17, 2.95, -7.5);
    const boothWin = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.1, 2.65), windowGlowMat);
    boothWin.position.set(-17, 1.85, -7.5);
    group.add(booth, boothRoof, boothWin);

    // Garden Lawn & Circular Courtyard Fountain
    const lawnMat = new THREE.MeshStandardMaterial({ color: 0x3b7a38, roughness: 0.9 });
    for (const lz of [-10, 10]) {
      const lawn = new THREE.Mesh(new THREE.BoxGeometry(14, 0.14, 8.5), lawnMat);
      lawn.position.set(-8, 0.08, lz);
      lawn.receiveShadow = true;
      group.add(lawn);
    }
    const fountainBase = new THREE.Mesh(new THREE.CylinderGeometry(2.8, 3.1, 0.55, 18), wallMat);
    fountainBase.position.set(-6, 0.28, 0);
    const fountainWater = new THREE.Mesh(
      new THREE.CylinderGeometry(2.4, 2.4, 0.62, 18),
      new THREE.MeshPhysicalMaterial({ color: 0x36a2b8, roughness: 0.1, clearcoat: 0.9 }),
    );
    fountainWater.position.set(-6, 0.3, 0);
    const fountainSpire = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.65, 1.8, 12), accentMat);
    fountainSpire.position.set(-6, 1.1, 0);
    group.add(fountainBase, fountainWater, fountainSpire);

    // Main Multi-Floor Modern Luxury Mansion (x = +6 relative -> world x = 54)
    const plinth = new THREE.Mesh(new THREE.BoxGeometry(18, 0.6, 22), trimMat);
    plinth.position.set(6, 0.3, 0);
    plinth.receiveShadow = true;
    group.add(plinth);

    const floor1 = new THREE.Mesh(new THREE.BoxGeometry(16, 4.4, 20), wallMat);
    floor1.position.set(6, 2.8, 0);
    floor1.castShadow = !isSoftwareGl;
    floor1.receiveShadow = true;
    group.add(floor1);

    const floor2 = new THREE.Mesh(new THREE.BoxGeometry(15.2, 4.2, 18.5), wallMat);
    floor2.position.set(6.4, 7.1, 0);
    floor2.castShadow = !isSoftwareGl;
    group.add(floor2);

    const floor3Penthouse = new THREE.Mesh(new THREE.BoxGeometry(10.5, 3.2, 12.0), accentMat);
    floor3Penthouse.position.set(7.2, 10.8, 0);
    floor3Penthouse.castShadow = !isSoftwareGl;
    group.add(floor3Penthouse);

    // Cantilevered Balconies + Portico Pillars + Warm Illuminated Glass Facade
    const balcony = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.32, 14), accentMat);
    balcony.position.set(-2.5, 5.0, 0);
    const glassRail = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 1.0, 13.8),
      new THREE.MeshPhysicalMaterial({ color: 0x7ec4e8, roughness: 0.1, transparent: true, opacity: 0.55 }),
    );
    glassRail.position.set(-4.0, 5.65, 0);
    group.add(balcony, glassRail);

    for (const pz of [-6, -2.2, 2.2, 6]) {
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.36, 4.6, 10), accentMat);
      col.position.set(-2.8, 2.6, pz);
      group.add(col);
    }

    // Large Glowing Panoramic Mansion Windows
    for (const wz of [-5.5, 0, 5.5]) {
      const w1 = new THREE.Mesh(new THREE.BoxGeometry(0.2, 2.4, 3.6), windowGlowMat);
      w1.position.set(-2.05, 2.8, wz);
      const w2 = new THREE.Mesh(new THREE.BoxGeometry(0.2, 2.4, 3.6), windowGlowMat);
      w2.position.set(-1.25, 7.2, wz);
      group.add(w1, w2);
    }

    // Large 3D Facade Signage "MUNISH HOUSE" overlooking the driveway & main road
    const mansionSign = create3DTextBanner('MUNISH HOUSE', 1.15, 0.3, gold3DTextMat);
    mansionSign.position.set(-1.35, 9.7, 0);
    mansionSign.rotation.y = -Math.PI / 2;
    group.add(mansionSign);

    // Subtle iron trim along top of wall
    const gateBar = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.12, 11.2), railIron);
    gateBar.position.set(-19, wallH + 0.15, -10.5);
    group.add(gateBar);

    return group;
  }

  if (b.type === 'fuel') {
    const canopyMat = new THREE.MeshStandardMaterial({ color: 0xe05a19, roughness: 0.42, metalness: 0.25 });
    const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf4f1ea, roughness: 0.65 });

    const roof = new THREE.Mesh(new THREE.BoxGeometry(b.width, 0.75, b.depth), canopyMat);
    roof.position.set(0, b.height, 0);
    roof.castShadow = !isSoftwareGl;
    group.add(roof);

    const fascia = new THREE.Mesh(new THREE.BoxGeometry(b.width + 0.2, 0.35, b.depth + 0.2), whiteMat);
    fascia.position.set(0, b.height - 0.3, 0);
    group.add(fascia);

    const colGeo = new THREE.CylinderGeometry(0.22, 0.24, b.height, 10);
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const col = new THREE.Mesh(colGeo, whiteMat);
        col.position.set(sx * (b.width * 0.42), b.height * 0.5, sz * (b.depth * 0.38));
        col.castShadow = !isSoftwareGl;
        group.add(col);
      }
    }

    const island = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.22, 1.4), whiteMat);
    island.position.set(0, 0.11, -1.5);
    group.add(island);

    const pump = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.8, 0.55), canopyMat);
    pump.position.set(0, 1.0, -1.5);
    group.add(pump);

    if (b.signText) {
      const signTex = textures.makeSignTexture(b.signText, '#e05a19', '#ffffff');
      const sign = new THREE.Mesh(
        new THREE.BoxGeometry(7.2, 0.7, 0.15),
        new THREE.MeshStandardMaterial({ map: signTex, roughness: 0.45 }),
      );
      sign.position.set(0, b.height + 0.05, b.depth * 0.51);
      group.add(sign);
    }
    return group;
  }

  if (b.type === 'ruin') {
    const tower = new THREE.Mesh(new THREE.CylinderGeometry(3.1, 3.8, b.height, 8), wallMat);
    tower.position.set(0, b.height * 0.5, 0);
    tower.castShadow = !isSoftwareGl;
    tower.receiveShadow = true;
    group.add(tower);

    for (let i = 0; i < 8; i++) {
      const ang = (i / 8) * Math.PI * 2;
      const merlon = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.2, 0.7), accentMat);
      merlon.position.set(Math.cos(ang) * 2.8, b.height + 0.5, Math.sin(ang) * 2.8);
      merlon.rotation.y = -ang;
      group.add(merlon);
    }
    return group;
  }

  // Indian Houses & Bazaar Shops
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(b.width + 0.8, 0.45, b.depth + 1.2), trimMat);
  plinth.position.set(0, 0.22, 0.35);
  plinth.receiveShadow = true;
  group.add(plinth);

  const body = new THREE.Mesh(new THREE.BoxGeometry(b.width, b.height, b.depth), wallMat);
  body.position.set(0, b.height * 0.5 + 0.35, 0);
  body.castShadow = !isSoftwareGl;
  body.receiveShadow = true;
  group.add(body);

  const band = new THREE.Mesh(new THREE.BoxGeometry(b.width + 0.24, 0.28, b.depth + 0.24), accentMat);
  band.position.set(0, b.height * 0.54, 0);
  group.add(band);

  const parapetH = 0.65;
  const roofY = b.height + 0.35 + parapetH * 0.5;
  const pFront = new THREE.Mesh(new THREE.BoxGeometry(b.width, parapetH, 0.28), accentMat);
  pFront.position.set(0, roofY, b.depth * 0.5 - 0.14);
  const pBack = pFront.clone();
  pBack.position.z = -b.depth * 0.5 + 0.14;
  const pLeft = new THREE.Mesh(new THREE.BoxGeometry(0.28, parapetH, b.depth), accentMat);
  pLeft.position.set(-b.width * 0.5 + 0.14, roofY, 0);
  const pRight = pLeft.clone();
  pRight.position.x = b.width * 0.5 - 0.14;
  group.add(pFront, pBack, pLeft, pRight);

  const tankMat = new THREE.MeshStandardMaterial({
    color: b.id.endsWith('2') || b.id.endsWith('5') ? 0x1a1e24 : 0x1d6fa5,
    roughness: 0.42,
    metalness: 0.1,
  });
  const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.65, 1.35, 12), tankMat);
  tank.position.set(-b.width * 0.24, b.height + 1.0, -b.depth * 0.22);
  group.add(tank);

  const winGeo = new THREE.BoxGeometry(1.15, 1.25, 0.12);
  for (const wx of [-b.width * 0.26, b.width * 0.26]) {
    const win = new THREE.Mesh(winGeo, windowGlowMat);
    win.position.set(wx, b.height * 0.72, b.depth * 0.5 + 0.04);
    group.add(win);
  }

  if (b.type === 'shop') {
    const awningMat = new THREE.MeshStandardMaterial({
      map: textures.corrugatedSheet,
      color: 0xd9e0e6,
      roughness: 0.48,
      metalness: 0.55,
    });
    const awning = new THREE.Mesh(new THREE.BoxGeometry(b.width * 0.96, 0.1, 2.2), awningMat);
    awning.position.set(0, 3.05, b.depth * 0.5 + 1.0);
    awning.rotation.x = 0.24;
    awning.castShadow = !isSoftwareGl;
    group.add(awning);

    const counter = new THREE.Mesh(new THREE.BoxGeometry(b.width * 0.78, 2.4, 0.2), accentMat);
    counter.position.set(0, 1.6, b.depth * 0.5 + 0.05);
    group.add(counter);

    if (b.signText) {
      const signTex = textures.makeSignTexture(b.signText, b.accentColor, '#fff6df');
      const sign = new THREE.Mesh(
        new THREE.BoxGeometry(b.width * 0.86, 0.95, 0.16),
        new THREE.MeshStandardMaterial({ map: signTex, roughness: 0.45 }),
      );
      sign.position.set(0, 3.9, b.depth * 0.5 + 0.14);
      group.add(sign);
    }
  } else {
    const door = new THREE.Mesh(new THREE.BoxGeometry(1.4, 2.3, 0.16), trimMat);
    door.position.set(0, 1.55, b.depth * 0.5 + 0.05);
    group.add(door);

    const chajja = new THREE.Mesh(new THREE.BoxGeometry(b.width * 0.65, 0.16, 1.2), accentMat);
    chajja.position.set(0, 3.1, b.depth * 0.5 + 0.55);
    group.add(chajja);
  }

  return group;
}

export function buildKasbapurWorld(
  scene: THREE.Scene,
  textures: ProceduralTextures,
  props: WorldPropsData,
  isSoftwareGl: boolean,
): WorldHandles {
  const root = new THREE.Group();
  scene.add(root);

  const nightGlowMaterials: THREE.MeshStandardMaterial[] = [];

  // 1. Sky Dome
  const skyUniforms = {
    uTopColor: { value: new THREE.Color(0x2d5e8e) },
    uHorizonColor: { value: new THREE.Color(0xf4b072) },
    uGroundColor: { value: new THREE.Color(0x7a634b) },
  };
  const skyMaterial = new THREE.ShaderMaterial({
    uniforms: skyUniforms,
    side: THREE.BackSide,
    depthWrite: false,
    vertexShader: `
      varying vec3 vWorldPos;
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorldPos = wp.xyz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: `
      uniform vec3 uTopColor;
      uniform vec3 uHorizonColor;
      uniform vec3 uGroundColor;
      varying vec3 vWorldPos;
      void main() {
        float h = normalize(vWorldPos).y;
        vec3 col = mix(uHorizonColor, uTopColor, smoothstep(0.0, 0.55, max(h, 0.0)));
        col = mix(col, uGroundColor, smoothstep(0.0, -0.25, min(h, 0.0)));
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
  const skyDome = new THREE.Mesh(new THREE.SphereGeometry(520, 24, 16), skyMaterial);
  root.add(skyDome);

  const sunDisc = new THREE.Mesh(
    new THREE.SphereGeometry(14, 16, 12),
    new THREE.MeshBasicMaterial({ color: 0xffe4a0, fog: false }),
  );
  root.add(sunDisc);

  const moonDisc = new THREE.Mesh(
    new THREE.SphereGeometry(9, 14, 10),
    new THREE.MeshBasicMaterial({ color: 0xdde7ff, fog: false }),
  );
  root.add(moonDisc);

  // Clouds
  const cloudsGroup = new THREE.Group();
  const cloudMat = new THREE.MeshStandardMaterial({
    color: 0xfff5ea,
    roughness: 0.95,
    transparent: true,
    opacity: 0.88,
  });
  const puffGeo = new THREE.SphereGeometry(1, 10, 8);
  for (let i = 0; i < 24; i++) {
    const cloud = new THREE.Group();
    const ang = (i / 24) * Math.PI * 2;
    const dist = 120 + (i % 4) * 65;
    cloud.position.set(Math.cos(ang) * dist, 75 + (i % 3) * 14, Math.sin(ang) * dist);
    for (let p = 0; p < 4; p++) {
      const puff = new THREE.Mesh(puffGeo, cloudMat);
      puff.position.set((p - 1.5) * 6.5, Math.sin(p) * 1.8, (p % 2) * 3.0);
      puff.scale.set(9 + (p % 2) * 3, 4.2, 6.5);
      cloud.add(puff);
    }
    cloudsGroup.add(cloud);
  }
  root.add(cloudsGroup);

  // 2. Terrain Mesh
  const terrainSize = 640;
  const segs = isSoftwareGl ? 150 : 200;
  const terrainGeo = new THREE.PlaneGeometry(terrainSize, terrainSize, segs, segs);
  terrainGeo.rotateX(-Math.PI / 2);

  const posAttr = terrainGeo.attributes.position as THREE.BufferAttribute;
  const colors = new Float32Array(posAttr.count * 3);
  const c = new THREE.Color();

  for (let i = 0; i < posAttr.count; i++) {
    const vx = posAttr.getX(i);
    const vz = posAttr.getZ(i);
    const h = rawTerrainHeightAt(vx, vz);
    posAttr.setY(i, h);

    const surf = surfaceTypeAt(vx, vz, -10);
    if (surf === 'asphalt') {
      c.setHex(0x373b42);
    } else if (surf === 'mud') {
      c.setHex(0x4b3626);
    } else if (surf === 'dirt') {
      c.setHex(0xa87c52);
    } else if (surf === 'water') {
      c.setHex(0x7c6a4e);
    } else {
      if (h > 22) c.setHex(0x7a7168);
      else if (h > 9) c.setHex(0x6d7c4c);
      else {
        const riverNear = Math.abs(vx - riverCenterX(vz)) < 16;
        c.setHex(riverNear ? 0x9c8b68 : 0x5c7f43);
      }
    }
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  terrainGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  terrainGeo.computeVertexNormals();

  const terrainMat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    map: textures.terrainDetail,
    roughnessMap: textures.terrainRoughness,
    roughness: 0.92,
    metalness: 0.02,
  });
  const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
  terrainMesh.receiveShadow = true;
  root.add(terrainMesh);

  // 2B. High-Quality Asphalt Road Lane Markings on Town Streets & Entry Highway
  for (const seg of ASPHALT_SEGMENTS) {
    const [ax, az, bx, bz, halfW] = seg;
    // Skip river span for road overlay (bridge deck handles river!)
    if (Math.abs(az - (-8)) < 2 && bx > 50) {
      // Draw western half up to bridge and eastern half after bridge
      const lenW = 55 + 52;
      const geoW = new THREE.PlaneGeometry(halfW * 1.75, lenW);
      geoW.rotateX(-Math.PI / 2);
      const texW = textures.roadLaneDash.clone();
      texW.repeat.set(1, Math.max(1, Math.round(lenW / 12)));
      texW.needsUpdate = true;
      const matW = new THREE.MeshStandardMaterial({
        map: texW,
        roughness: 0.78,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1,
      });
      const meshW = new THREE.Mesh(geoW, matW);
      meshW.position.set(-1.5, rawTerrainHeightAt(-1.5, -8) + 0.03, -8);
      meshW.rotation.y = Math.PI / 2;
      meshW.receiveShadow = true;
      root.add(meshW);
      continue;
    }

    const dx = bx - ax;
    const dz = bz - az;
    const len = Math.hypot(dx, dz);
    const angle = Math.atan2(dx, dz);
    const cx = (ax + bx) * 0.5;
    const cz = (az + bz) * 0.5;

    const roadGeo = new THREE.PlaneGeometry(halfW * 1.65, len);
    roadGeo.rotateX(-Math.PI / 2);
    const tex = textures.roadLaneDash.clone();
    tex.repeat.set(1, Math.max(1, Math.round(len / 12)));
    tex.needsUpdate = true;

    const roadMat = new THREE.MeshStandardMaterial({
      map: tex,
      roughness: 0.78,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    const roadMesh = new THREE.Mesh(roadGeo, roadMat);
    roadMesh.position.set(cx, rawTerrainHeightAt(cx, cz) + 0.035, cz);
    roadMesh.rotation.y = angle;
    roadMesh.receiveShadow = true;
    root.add(roadMesh);
  }

  // 3. Flowing Kasba River
  const waterUniforms = { uTime: { value: 0 } };
  const riverSegsZ = 140;
  const riverGeo = new THREE.PlaneGeometry(34, 620, 12, riverSegsZ);
  riverGeo.rotateX(-Math.PI / 2);
  const wPos = riverGeo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < wPos.count; i++) {
    const localX = wPos.getX(i);
    const wz = wPos.getZ(i);
    wPos.setX(i, riverCenterX(wz) + localX);
    wPos.setY(i, WATER_LEVEL);
  }
  riverGeo.computeVertexNormals();

  const waterMat = new THREE.MeshPhysicalMaterial({
    color: 0x267582,
    roughness: 0.14,
    metalness: 0.1,
    clearcoat: 0.9,
    clearcoatRoughness: 0.1,
    transparent: true,
    opacity: 0.78,
  });
  waterMat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = waterUniforms.uTime;
    shader.vertexShader = `uniform float uTime;\n` + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
       transformed.y += sin(transformed.z * 0.25 + uTime * 2.1) * 0.045 + cos(transformed.x * 0.4 + uTime * 1.7) * 0.035;`,
    );
  };
  const riverMesh = new THREE.Mesh(riverGeo, waterMat);
  riverMesh.receiveShadow = true;
  root.add(riverMesh);

  // 4. Bridges
  for (const br of BRIDGES) {
    const bGroup = new THREE.Group();
    const isStone = br.style === 'stone';
    const deckMat = new THREE.MeshStandardMaterial({
      map: isStone ? textures.stoneBrick : textures.timberPlank,
      color: isStone ? 0xb5a38c : 0x996d47,
      roughness: 0.85,
      metalness: 0.05,
    });
    const railMat = new THREE.MeshStandardMaterial({
      color: isStone ? 0x8e7960 : 0x573b22,
      roughness: 0.88,
    });

    const deckPieces = 16;
    const pieceLen = br.length / deckPieces;
    for (let p = 0; p < deckPieces; p++) {
      const lx = -br.length * 0.5 + (p + 0.5) * pieceLen;
      const wx = br.cx + lx;
      const h = groundHeightAt(wx, br.cz);
      const nextH = groundHeightAt(wx + pieceLen * 0.5, br.cz);
      const prevH = groundHeightAt(wx - pieceLen * 0.5, br.cz);
      const pitch = Math.atan2(nextH - prevH, pieceLen);

      const plank = new THREE.Mesh(new THREE.BoxGeometry(pieceLen + 0.15, 0.42, br.width), deckMat);
      plank.position.set(wx, h - 0.18, br.cz);
      plank.rotation.z = pitch;
      plank.castShadow = !isSoftwareGl;
      plank.receiveShadow = true;
      bGroup.add(plank);

      for (const side of [-1, 1]) {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(pieceLen + 0.1, 0.85, 0.36), railMat);
        rail.position.set(wx, h + 0.4, br.cz + side * (br.width * 0.5 - 0.25));
        rail.rotation.z = pitch;
        rail.castShadow = !isSoftwareGl;
        bGroup.add(rail);
      }
    }

    for (const px of [-br.length * 0.26, br.length * 0.26]) {
      for (const pz of [-br.width * 0.38, br.width * 0.38]) {
        const pier = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.55, 4.2, 8), railMat);
        pier.position.set(br.cx + px, -0.4, br.cz + pz);
        bGroup.add(pier);
      }
    }
    root.add(bGroup);
  }

  // 5. All Buildings (Kasbapur Entry Gate, Munish House, Shops, Houses, Fuel Station, Watchtower)
  for (const b of BUILDINGS) {
    root.add(buildIndianBuilding(b, textures, nightGlowMaterials, isSoftwareGl));
  }

  // 6. Streetlamps
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x2d3339, roughness: 0.5, metalness: 0.7 });
  const bulbMat = new THREE.MeshStandardMaterial({
    color: 0xfff3d1,
    emissive: 0xffb74d,
    emissiveIntensity: 0.15,
    roughness: 0.2,
  });
  nightGlowMaterials.push(bulbMat);

  for (const l of props.lamps) {
    const lampGroup = new THREE.Group();
    const ly = rawTerrainHeightAt(l.x, l.z);
    lampGroup.position.set(l.x, ly, l.z);
    lampGroup.rotation.y = l.rotY;

    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 5.2, 8), poleMat);
    pole.position.y = 2.6;
    lampGroup.add(pole);

    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 1.3), poleMat);
    arm.position.set(0, 5.1, 0.55);
    lampGroup.add(arm);

    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 8), bulbMat);
    bulb.position.set(0, 4.95, 1.15);
    lampGroup.add(bulb);

    root.add(lampGroup);
  }

  // 7. Instanced Trees & Boulders
  const neemTrees = props.trees.filter((t) => t.kind === 'neem');
  const pineTrees = props.trees.filter((t) => t.kind === 'pine');
  const dummy = new THREE.Object3D();
  const color = new THREE.Color();

  if (neemTrees.length > 0) {
    const trunkGeo = new THREE.CylinderGeometry(0.22, 0.38, 3.2, 7);
    trunkGeo.translate(0, 1.6, 0);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5c422c, roughness: 0.92 });
    const trunkInst = new THREE.InstancedMesh(trunkGeo, trunkMat, neemTrees.length);
    trunkInst.castShadow = !isSoftwareGl;

    const crownGeo = new THREE.DodecahedronGeometry(2.3, 1);
    crownGeo.scale(1.15, 0.78, 1.15);
    crownGeo.translate(0, 4.2, 0);
    const crownMat = new THREE.MeshStandardMaterial({ color: 0x3b6e34, roughness: 0.85 });
    const crownInst = new THREE.InstancedMesh(crownGeo, crownMat, neemTrees.length);
    crownInst.castShadow = !isSoftwareGl;
    crownInst.receiveShadow = true;

    neemTrees.forEach((t, i) => {
      const ty = rawTerrainHeightAt(t.x, t.z) - 0.15;
      dummy.position.set(t.x, ty, t.z);
      dummy.rotation.set(0, (i * 1.37) % (Math.PI * 2), 0);
      dummy.scale.setScalar(t.scale);
      dummy.updateMatrix();
      trunkInst.setMatrixAt(i, dummy.matrix);
      crownInst.setMatrixAt(i, dummy.matrix);

      color.setHex(0x3b6e34).multiplyScalar(t.tint);
      crownInst.setColorAt(i, color);
    });
    trunkInst.computeBoundingSphere();
    crownInst.computeBoundingSphere();
    root.add(trunkInst, crownInst);
  }

  if (pineTrees.length > 0) {
    const pTrunkGeo = new THREE.CylinderGeometry(0.18, 0.32, 3.0, 6);
    pTrunkGeo.translate(0, 1.5, 0);
    const pTrunkMat = new THREE.MeshStandardMaterial({ color: 0x4f3824, roughness: 0.9 });
    const pTrunkInst = new THREE.InstancedMesh(pTrunkGeo, pTrunkMat, pineTrees.length);

    const pConeGeo = new THREE.ConeGeometry(1.9, 5.2, 7);
    pConeGeo.translate(0, 4.6, 0);
    const pConeMat = new THREE.MeshStandardMaterial({ color: 0x2c5636, roughness: 0.86 });
    const pConeInst = new THREE.InstancedMesh(pConeGeo, pConeMat, pineTrees.length);
    pConeInst.castShadow = !isSoftwareGl;

    pineTrees.forEach((t, i) => {
      const ty = rawTerrainHeightAt(t.x, t.z) - 0.15;
      dummy.position.set(t.x, ty, t.z);
      dummy.rotation.set(0, (i * 0.9) % (Math.PI * 2), 0);
      dummy.scale.setScalar(t.scale);
      dummy.updateMatrix();
      pTrunkInst.setMatrixAt(i, dummy.matrix);
      pConeInst.setMatrixAt(i, dummy.matrix);
      color.setHex(0x2c5636).multiplyScalar(t.tint);
      pConeInst.setColorAt(i, color);
    });
    pTrunkInst.computeBoundingSphere();
    pConeInst.computeBoundingSphere();
    root.add(pTrunkInst, pConeInst);
  }

  if (props.rocks.length > 0) {
    const rockGeo = new THREE.DodecahedronGeometry(1.15, 0);
    rockGeo.scale(1.2, 0.72, 1.0);
    const rockMat = new THREE.MeshStandardMaterial({ color: 0x7a746c, roughness: 0.92, metalness: 0.05 });
    const rockInst = new THREE.InstancedMesh(rockGeo, rockMat, props.rocks.length);
    rockInst.castShadow = !isSoftwareGl;
    rockInst.receiveShadow = true;

    props.rocks.forEach((r, i) => {
      const ry = rawTerrainHeightAt(r.x, r.z);
      dummy.position.set(r.x, ry + 0.25 * r.scale, r.z);
      dummy.rotation.set(0.2, r.rotY, 0.15);
      dummy.scale.setScalar(r.scale);
      dummy.updateMatrix();
      rockInst.setMatrixAt(i, dummy.matrix);
      color.setHex(0x7a746c).multiplyScalar(r.tint);
      rockInst.setColorAt(i, color);
    });
    rockInst.computeBoundingSphere();
    root.add(rockInst);
  }

  // 8. Coins
  const coinMeshes = new Map<number, THREE.Group>();
  const coinGeo = new THREE.CylinderGeometry(0.65, 0.65, 0.16, 16);
  coinGeo.rotateX(Math.PI / 2);
  const coinRimGeo = new THREE.TorusGeometry(0.66, 0.07, 8, 16);
  const coinMat = new THREE.MeshStandardMaterial({
    color: 0xffc633,
    emissive: 0xd98200,
    emissiveIntensity: 0.35,
    roughness: 0.22,
    metalness: 0.85,
  });

  for (const coin of props.coins) {
    const cg = new THREE.Group();
    const cy = groundHeightAt(coin.x, coin.z) + 1.1;
    cg.position.set(coin.x, cy, coin.z);
    cg.add(new THREE.Mesh(coinGeo, coinMat), new THREE.Mesh(coinRimGeo, coinMat));
    root.add(cg);
    coinMeshes.set(coin.id, cg);
  }

  // 9. Fuel Jerrycans
  const fuelMeshes = new Map<number, THREE.Group>();
  const jerryMat = new THREE.MeshStandardMaterial({
    color: 0xe03e2d,
    emissive: 0x6e120a,
    emissiveIntensity: 0.25,
    roughness: 0.42,
    metalness: 0.2,
  });
  const capMat = new THREE.MeshStandardMaterial({ color: 0xf4c430, roughness: 0.4 });
  for (const fc of props.fuelCans) {
    const fg = new THREE.Group();
    const fy = groundHeightAt(fc.x, fc.z) + 0.95;
    fg.position.set(fc.x, fy, fc.z);
    const can = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.82, 0.42), jerryMat);
    const spout = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.25, 8), capMat);
    spout.position.set(0.16, 0.48, 0);
    fg.add(can, spout);
    root.add(fg);
    fuelMeshes.set(fc.id, fg);
  }

  // 10. Active Mission Checkpoint Beacon Ring
  const checkpointBeacon = new THREE.Group();
  checkpointBeacon.visible = false;
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0x10b981,
    transparent: true,
    opacity: 0.78,
    side: THREE.DoubleSide,
  });
  const baseRing = new THREE.Mesh(new THREE.TorusGeometry(4.2, 0.22, 10, 32), ringMat);
  baseRing.rotation.x = Math.PI / 2;
  const pillarBeam = new THREE.Mesh(
    new THREE.CylinderGeometry(2.6, 3.8, 22, 16, 1, true),
    new THREE.MeshBasicMaterial({
      color: 0x10b981,
      transparent: true,
      opacity: 0.16,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  pillarBeam.position.y = 11;
  checkpointBeacon.add(baseRing, pillarBeam);
  root.add(checkpointBeacon);

  // 11. Monsoon Weather Rain Particles
  const rainCount = 600;
  const rainPos = new Float32Array(rainCount * 3);
  for (let i = 0; i < rainCount; i++) {
    rainPos[i * 3] = (Math.random() - 0.5) * 90;
    rainPos[i * 3 + 1] = Math.random() * 34;
    rainPos[i * 3 + 2] = (Math.random() - 0.5) * 90;
  }
  const rainGeo = new THREE.BufferGeometry();
  rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
  const rainMat = new THREE.PointsMaterial({
    color: 0xcbe4ff,
    size: 0.28,
    transparent: true,
    opacity: 0.55,
  });
  const rainPoints = new THREE.Points(rainGeo, rainMat);
  rainPoints.visible = false;
  root.add(rainPoints);

  const updateDynamicProps = (
    elapsed: number,
    nightFactor: number,
    rainActive: boolean,
    playerX: number,
    playerZ: number,
    dt: number,
  ) => {
    waterUniforms.uTime.value = elapsed;
    cloudsGroup.rotation.y = elapsed * 0.004;

    coinMeshes.forEach((cg, id) => {
      if (!cg.visible) return;
      cg.rotation.y = elapsed * 2.2 + id * 0.5;
      cg.position.y += Math.sin(elapsed * 3.0 + id) * 0.004;
    });

    fuelMeshes.forEach((fg, id) => {
      if (!fg.visible) return;
      fg.rotation.y = elapsed * 1.4 + id;
    });

    if (checkpointBeacon.visible) {
      checkpointBeacon.children[0].rotation.z = elapsed * 1.6;
    }

    const glowIntensity = nightFactor > 0.2 ? 0.45 + nightFactor * 2.1 : 0.14;
    for (let i = 0; i < nightGlowMaterials.length; i++) {
      nightGlowMaterials[i].emissiveIntensity = glowIntensity;
    }

    rainPoints.visible = rainActive;
    if (rainActive) {
      rainPoints.position.set(playerX, 0, playerZ);
      const attr = rainGeo.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < rainCount; i++) {
        let ry = attr.getY(i) - 38 * dt;
        if (ry < 0) ry = 32;
        attr.setY(i, ry);
      }
      attr.needsUpdate = true;
    }
  };

  return {
    root,
    waterUniforms,
    cloudsGroup,
    sunDisc,
    moonDisc,
    skyMaterial,
    nightGlowMaterials,
    coinMeshes,
    fuelMeshes,
    checkpointBeacon,
    rainPoints,
    updateDynamicProps,
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
