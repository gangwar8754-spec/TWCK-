import * as THREE from 'three';

function configureColorTexture(canvas: HTMLCanvasElement, maxAniso: number, repeatX = 1, repeatY = 1): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = maxAniso;
  tex.needsUpdate = true;
  return tex;
}

export interface ProceduralTextures {
  terrainDetail: THREE.CanvasTexture;
  terrainRoughness: THREE.CanvasTexture;
  plasterWall: THREE.CanvasTexture;
  corrugatedSheet: THREE.CanvasTexture;
  timberPlank: THREE.CanvasTexture;
  stoneBrick: THREE.CanvasTexture;
  marbleTile: THREE.CanvasTexture;
  roadLaneDash: THREE.CanvasTexture;
  contactShadow: THREE.CanvasTexture;
  particleSoft: THREE.CanvasTexture;
  skidMark: THREE.CanvasTexture;
  makeSignTexture: (text: string, bg: string, fg: string, subText?: string) => THREE.CanvasTexture;
  dispose: () => void;
}

export function createProceduralTextures(maxAniso: number): ProceduralTextures {
  const created: THREE.Texture[] = [];

  // 1. Terrain micro-detail overlay
  const terrainCanvas = document.createElement('canvas');
  terrainCanvas.width = 256;
  terrainCanvas.height = 256;
  const tctx = terrainCanvas.getContext('2d')!;
  tctx.fillStyle = '#dcdcdc';
  tctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 4500; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    const v = 195 + Math.floor(Math.random() * 55);
    tctx.fillStyle = `rgb(${v},${v},${v})`;
    tctx.fillRect(x, y, 2, 2);
  }
  const terrainDetail = configureColorTexture(terrainCanvas, maxAniso, 48, 48);
  created.push(terrainDetail);

  // Linear roughness detail map
  const roughCanvas = document.createElement('canvas');
  roughCanvas.width = 128;
  roughCanvas.height = 128;
  const rctx = roughCanvas.getContext('2d')!;
  rctx.fillStyle = '#d4d4d4';
  rctx.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 1500; i++) {
    const v = 175 + Math.floor(Math.random() * 75);
    rctx.fillStyle = `rgb(${v},${v},${v})`;
    rctx.fillRect(Math.random() * 128, Math.random() * 128, 3, 3);
  }
  const terrainRoughness = new THREE.CanvasTexture(roughCanvas);
  terrainRoughness.wrapS = THREE.RepeatWrapping;
  terrainRoughness.wrapT = THREE.RepeatWrapping;
  terrainRoughness.repeat.set(42, 42);
  terrainRoughness.anisotropy = maxAniso;
  created.push(terrainRoughness);

  // 2. Weathered Indian plaster wall texture
  const plasterCanvas = document.createElement('canvas');
  plasterCanvas.width = 256;
  plasterCanvas.height = 256;
  const pctx = plasterCanvas.getContext('2d')!;
  pctx.fillStyle = '#ece6dc';
  pctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 2400; i++) {
    const v = 210 + Math.floor(Math.random() * 38);
    pctx.fillStyle = `rgba(${v},${v - 6},${v - 14},0.35)`;
    pctx.fillRect(Math.random() * 256, Math.random() * 256, 4, 4);
  }
  const grad = pctx.createLinearGradient(0, 190, 0, 256);
  grad.addColorStop(0, 'rgba(90,70,50,0)');
  grad.addColorStop(1, 'rgba(90,70,50,0.22)');
  pctx.fillStyle = grad;
  pctx.fillRect(0, 190, 256, 66);
  const plasterWall = configureColorTexture(plasterCanvas, maxAniso, 1, 1);
  created.push(plasterWall);

  // 3. Corrugated tin shop awning
  const corrCanvas = document.createElement('canvas');
  corrCanvas.width = 128;
  corrCanvas.height = 128;
  const cctx = corrCanvas.getContext('2d')!;
  for (let x = 0; x < 128; x += 8) {
    cctx.fillStyle = x % 16 === 0 ? '#8c99a6' : '#657380';
    cctx.fillRect(x, 0, 4, 128);
    cctx.fillStyle = '#aeb9c4';
    cctx.fillRect(x + 4, 0, 4, 128);
  }
  const corrugatedSheet = configureColorTexture(corrCanvas, maxAniso, 3, 1);
  created.push(corrugatedSheet);

  // 4. Timber planks
  const woodCanvas = document.createElement('canvas');
  woodCanvas.width = 256;
  woodCanvas.height = 256;
  const wctx = woodCanvas.getContext('2d')!;
  wctx.fillStyle = '#734b2b';
  wctx.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 32) {
    wctx.fillStyle = y % 64 === 0 ? '#7d5331' : '#684326';
    wctx.fillRect(0, y + 2, 256, 28);
    wctx.fillStyle = '#3b2413';
    wctx.fillRect(0, y, 256, 2);
  }
  const timberPlank = configureColorTexture(woodCanvas, maxAniso, 4, 2);
  created.push(timberPlank);

  // 5. Stone masonry
  const stoneCanvas = document.createElement('canvas');
  stoneCanvas.width = 256;
  stoneCanvas.height = 256;
  const sctx = stoneCanvas.getContext('2d')!;
  sctx.fillStyle = '#9c8669';
  sctx.fillRect(0, 0, 256, 256);
  for (let row = 0; row < 8; row++) {
    const offset = (row % 2) * 32;
    for (let col = -1; col < 5; col++) {
      const shade = 135 + Math.floor(Math.random() * 40);
      sctx.fillStyle = `rgb(${shade},${shade - 18},${shade - 38})`;
      sctx.fillRect(col * 64 + offset + 3, row * 32 + 3, 58, 26);
    }
  }
  const stoneBrick = configureColorTexture(stoneCanvas, maxAniso, 3, 2);
  created.push(stoneBrick);

  // 6. Munish House Luxury Marble / Travertine Tile
  const marbleCanvas = document.createElement('canvas');
  marbleCanvas.width = 256;
  marbleCanvas.height = 256;
  const mctx = marbleCanvas.getContext('2d')!;
  mctx.fillStyle = '#f3eee5';
  mctx.fillRect(0, 0, 256, 256);
  mctx.strokeStyle = 'rgba(180,165,142,0.45)';
  mctx.lineWidth = 2;
  for (let i = 0; i <= 256; i += 64) {
    mctx.beginPath();
    mctx.moveTo(i, 0);
    mctx.lineTo(i, 256);
    mctx.stroke();
    mctx.beginPath();
    mctx.moveTo(0, i);
    mctx.lineTo(256, i);
    mctx.stroke();
  }
  const marbleTile = configureColorTexture(marbleCanvas, maxAniso, 3, 3);
  created.push(marbleTile);

  // 7. Asphalt Road with Yellow Edge Lines & White Dashed Centerline
  const roadCanvas = document.createElement('canvas');
  roadCanvas.width = 256;
  roadCanvas.height = 256;
  const rdctx = roadCanvas.getContext('2d')!;
  rdctx.fillStyle = '#32363d';
  rdctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 1800; i++) {
    const g = 42 + Math.floor(Math.random() * 24);
    rdctx.fillStyle = `rgb(${g},${g + 2},${g + 5})`;
    rdctx.fillRect(Math.random() * 256, Math.random() * 256, 2, 2);
  }
  // Yellow shoulder stripes
  rdctx.fillStyle = '#e0a938';
  rdctx.fillRect(10, 0, 6, 256);
  rdctx.fillRect(240, 0, 6, 256);
  // White center dashes
  rdctx.fillStyle = '#f1f3f5';
  rdctx.fillRect(124, 18, 8, 92);
  rdctx.fillRect(124, 146, 8, 92);
  const roadLaneDash = configureColorTexture(roadCanvas, maxAniso, 1, 1);
  created.push(roadLaneDash);

  // 8. Soft radial contact shadow
  const shadCanvas = document.createElement('canvas');
  shadCanvas.width = 128;
  shadCanvas.height = 128;
  const shctx = shadCanvas.getContext('2d')!;
  const rg = shctx.createRadialGradient(64, 64, 12, 64, 64, 62);
  rg.addColorStop(0, 'rgba(0,0,0,0.65)');
  rg.addColorStop(0.55, 'rgba(0,0,0,0.32)');
  rg.addColorStop(1, 'rgba(0,0,0,0)');
  shctx.fillStyle = rg;
  shctx.fillRect(0, 0, 128, 128);
  const contactShadow = new THREE.CanvasTexture(shadCanvas);
  created.push(contactShadow);

  // 9. Soft particle puff
  const partCanvas = document.createElement('canvas');
  partCanvas.width = 64;
  partCanvas.height = 64;
  const ptctx = partCanvas.getContext('2d')!;
  const prg = ptctx.createRadialGradient(32, 32, 4, 32, 32, 30);
  prg.addColorStop(0, 'rgba(255,255,255,0.9)');
  prg.addColorStop(0.45, 'rgba(255,255,255,0.45)');
  prg.addColorStop(1, 'rgba(255,255,255,0)');
  ptctx.fillStyle = prg;
  ptctx.fillRect(0, 0, 64, 64);
  const particleSoft = new THREE.CanvasTexture(partCanvas);
  created.push(particleSoft);

  // 10. Tire skid mark texture
  const skidCanvas = document.createElement('canvas');
  skidCanvas.width = 64;
  skidCanvas.height = 64;
  const skctx = skidCanvas.getContext('2d')!;
  skctx.fillStyle = 'rgba(22, 18, 16, 0.72)';
  skctx.fillRect(8, 0, 18, 64);
  skctx.fillRect(38, 0, 18, 64);
  const skidMark = new THREE.CanvasTexture(skidCanvas);
  created.push(skidMark);

  const makeSignTexture = (text: string, bg: string, fg: string, subText?: string): THREE.CanvasTexture => {
    const sc = document.createElement('canvas');
    sc.width = 512;
    sc.height = 128;
    const ctx = sc.getContext('2d')!;
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 512, 128);
    ctx.strokeStyle = fg;
    ctx.lineWidth = 6;
    ctx.strokeRect(8, 8, 496, 112);
    ctx.fillStyle = fg;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (subText) {
      ctx.font = '700 36px "Plus Jakarta Sans", sans-serif';
      ctx.fillText(text, 256, 48);
      ctx.font = '600 20px "Plus Jakarta Sans", sans-serif';
      ctx.fillText(subText, 256, 92);
    } else {
      ctx.font = '700 38px "Plus Jakarta Sans", sans-serif';
      ctx.fillText(text, 256, 66);
    }
    const tex = configureColorTexture(sc, maxAniso, 1, 1);
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    created.push(tex);
    return tex;
  };

  return {
    terrainDetail,
    terrainRoughness,
    plasterWall,
    corrugatedSheet,
    timberPlank,
    stoneBrick,
    marbleTile,
    roadLaneDash,
    contactShadow,
    particleSoft,
    skidMark,
    makeSignTexture,
    dispose: () => {
      created.forEach((t) => t.dispose());
    },
  };
}
