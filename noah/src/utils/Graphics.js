export function drawBackground(g) {
  // Sky gradient effect (top to horizon)
  g.fillStyle(0x87CEEB);
  g.fillRect(0, 0, 390, 500);

  // Horizon / lighter sky
  g.fillStyle(0xb0e0ff);
  g.fillRect(0, 450, 390, 100);

  // Ground / grass
  g.fillStyle(0x5cb85c);
  g.fillRect(0, 530, 390, 314);

  // Sun
  g.fillStyle(0xffd700);
  g.fillCircle(320, 80, 45);
  // Sun rays
  g.lineStyle(4, 0xffd700, 1);
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    g.lineBetween(
      320 + Math.cos(angle) * 52, 80 + Math.sin(angle) * 52,
      320 + Math.cos(angle) * 70, 80 + Math.sin(angle) * 70
    );
  }

  // Clouds
  drawCloud(g, 60, 120);
  drawCloud(g, 220, 90);
  drawCloud(g, 100, 200);
}

function drawCloud(g, x, y) {
  g.fillStyle(0xffffff, 0.9);
  g.fillCircle(x, y, 28);
  g.fillCircle(x + 30, y - 8, 22);
  g.fillCircle(x + 55, y, 26);
  g.fillCircle(x + 25, y + 12, 20);
}

export function drawWater(g) {
  g.fillStyle(0x1a8ccf);
  g.fillRect(0, 0, 390, 120);
  // Waves
  g.lineStyle(2, 0x5bb5e8, 0.7);
  for (let i = 0; i < 6; i++) {
    const y = 20 + i * 18;
    for (let x = 0; x < 390; x += 40) {
      g.strokePoints([
        { x, y },
        { x: x + 10, y: y - 6 },
        { x: x + 20, y },
        { x: x + 30, y: y - 6 },
        { x: x + 40, y },
      ], false);
    }
  }
}

export function drawNoah(g) {
  // Body
  g.fillStyle(0x8B4513);
  g.fillRect(14, 28, 20, 26);

  // Robe
  g.fillStyle(0x8b6914);
  g.fillRect(10, 30, 28, 24);
  g.fillTriangle(10, 54, 38, 54, 24, 64);

  // Head
  g.fillStyle(0xf5cba7);
  g.fillCircle(24, 18, 14);

  // Beard
  g.fillStyle(0xffffff);
  g.fillTriangle(16, 26, 32, 26, 24, 38);

  // Hat / Hood
  g.fillStyle(0x6b4226);
  g.fillRect(12, 6, 24, 10);
  g.fillRect(10, 4, 28, 8);

  // Eyes
  g.fillStyle(0x333333);
  g.fillCircle(20, 16, 2);
  g.fillCircle(28, 16, 2);

  // Smile
  g.lineStyle(2, 0x333333, 1);
  g.strokePoints([{ x: 20, y: 22 }, { x: 24, y: 25 }, { x: 28, y: 22 }], false);

  // Staff
  g.lineStyle(3, 0x7b5c2a, 1);
  g.lineBetween(38, 20, 42, 64);
}

export function drawArk(g) {
  // Hull
  g.fillStyle(0x8B4513);
  g.fillRect(0, 50, 120, 50);
  g.fillTriangle(0, 50, 0, 100, 20, 100);
  g.fillTriangle(120, 50, 120, 100, 100, 100);
  g.fillStyle(0xa0522d);
  g.fillRect(5, 55, 110, 40);

  // Cabin
  g.fillStyle(0xcd853f);
  g.fillRect(20, 20, 80, 35);
  g.fillRect(35, 5, 50, 20);

  // Roof
  g.fillStyle(0x8B0000);
  g.fillTriangle(15, 20, 105, 20, 60, 2);

  // Windows
  g.fillStyle(0x87CEEB);
  g.fillRect(28, 28, 14, 12);
  g.fillRect(53, 28, 14, 12);
  g.fillRect(78, 28, 14, 12);

  // Wood planks
  g.lineStyle(1, 0x5c3200, 0.5);
  for (let x = 15; x < 120; x += 15) {
    g.lineBetween(x, 50, x, 100);
  }
}

export function drawAnimal(g, bodyColor, type) {
  g.fillStyle(bodyColor);

  switch (type) {
    case 'elephant':
      g.fillCircle(20, 20, 14); // body
      g.fillCircle(20, 8, 9);   // head
      g.fillStyle(0x999999);
      g.fillRect(12, 14, 4, 14); // trunk
      g.fillRect(8, 30, 6, 10);  // legs
      g.fillRect(26, 30, 6, 10);
      g.fillStyle(0xf5a0a0);
      g.fillEllipse(10, 6, 8, 10); // ear
      g.fillStyle(0x333333);
      g.fillCircle(17, 8, 2);
      break;

    case 'giraffe':
      g.fillStyle(bodyColor);
      g.fillRect(10, 20, 20, 18); // body
      g.fillRect(17, 4, 7, 20);   // neck
      g.fillRect(20, 0, 12, 8);   // head
      g.fillStyle(0xc49a00);
      // spots
      g.fillRect(12, 22, 5, 5);
      g.fillRect(22, 26, 5, 5);
      g.fillRect(13, 30, 5, 5);
      g.fillStyle(0x333333);
      g.fillCircle(24, 4, 2);
      break;

    case 'lion':
      // Mane
      g.fillStyle(0xc8860a);
      g.fillCircle(20, 20, 18);
      // Face
      g.fillStyle(bodyColor);
      g.fillCircle(20, 20, 13);
      g.fillStyle(0x333333);
      g.fillCircle(16, 17, 2);
      g.fillCircle(24, 17, 2);
      g.fillStyle(0xff9999);
      g.fillCircle(20, 22, 4);
      break;

    case 'zebra':
      g.fillStyle(0xffffff);
      g.fillRect(8, 14, 24, 20);
      g.fillCircle(20, 10, 9);
      // Stripes
      g.fillStyle(0x111111);
      g.fillRect(10, 16, 3, 16);
      g.fillRect(16, 14, 3, 18);
      g.fillRect(22, 14, 3, 18);
      g.fillRect(28, 16, 3, 16);
      g.fillStyle(0x111111);
      g.fillCircle(17, 10, 2);
      g.fillCircle(23, 10, 2);
      break;

    case 'monkey':
      g.fillStyle(bodyColor);
      g.fillCircle(20, 18, 13);
      g.fillStyle(0xf5cba7);
      g.fillEllipse(20, 22, 12, 10); // face
      g.fillCircle(8, 16, 6);  // ear L
      g.fillCircle(32, 16, 6); // ear R
      g.fillStyle(0x333333);
      g.fillCircle(17, 18, 2);
      g.fillCircle(23, 18, 2);
      g.fillStyle(0xf5cba7);
      g.fillEllipse(20, 25, 8, 5); // mouth area
      break;

    case 'rabbit':
      g.fillStyle(bodyColor);
      g.fillCircle(20, 24, 13);
      g.fillCircle(20, 12, 9);
      // Ears
      g.fillRect(14, 0, 6, 14);
      g.fillRect(22, 0, 6, 14);
      g.fillStyle(0xffaaaa);
      g.fillRect(15, 1, 4, 11);
      g.fillRect(23, 1, 4, 11);
      g.fillStyle(0x333333);
      g.fillCircle(17, 12, 2);
      g.fillCircle(23, 12, 2);
      g.fillStyle(0xff9999);
      g.fillCircle(20, 17, 2);
      break;

    case 'penguin':
      g.fillStyle(0x1a1a2e);
      g.fillEllipse(20, 22, 22, 28);
      g.fillStyle(0xffffff);
      g.fillEllipse(20, 24, 14, 20);
      g.fillStyle(0x1a1a2e);
      g.fillCircle(20, 10, 9);
      g.fillStyle(0xffd700);
      g.fillTriangle(17, 14, 23, 14, 20, 19); // beak
      g.fillStyle(0xffffff);
      g.fillCircle(17, 10, 3);
      g.fillCircle(23, 10, 3);
      g.fillStyle(0x333333);
      g.fillCircle(17, 10, 2);
      g.fillCircle(23, 10, 2);
      break;

    case 'bear':
      g.fillStyle(bodyColor);
      g.fillCircle(20, 22, 15);
      g.fillCircle(20, 10, 10);
      g.fillCircle(10, 6, 7);  // ear L
      g.fillCircle(30, 6, 7);  // ear R
      g.fillStyle(0xc87941);
      g.fillEllipse(20, 24, 10, 8);
      g.fillStyle(0x333333);
      g.fillCircle(17, 10, 2);
      g.fillCircle(23, 10, 2);
      g.fillCircle(20, 14, 2); // nose
      break;
  }
}

export function drawRainDrop(g) {
  g.fillStyle(0x5bb5e8, 0.8);
  g.fillRect(2, 4, 2, 8);
  g.fillTriangle(0, 4, 6, 4, 3, 0);
}

export function drawCoin(g) {
  const pts = starPoints(14, 14, 5, 12, 5);
  g.fillStyle(0xffd700);
  g.fillPoints(pts, true);
  g.lineStyle(2, 0xe6b800, 1);
  g.strokePoints(pts, true);
}

function starPoints(cx, cy, numPoints, outerR, innerR) {
  const pts = [];
  for (let i = 0; i < numPoints * 2; i++) {
    const angle = (i / (numPoints * 2)) * Math.PI * 2 - Math.PI / 2;
    const r = i % 2 === 0 ? outerR : innerR;
    pts.push({ x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r });
  }
  return pts;
}

export function drawPlatform(g) {
  // 96x18 wood plank
  g.fillStyle(0xb06820);
  g.fillRect(0, 0, 96, 18);
  g.fillStyle(0xd4924a);
  g.fillRect(0, 0, 96, 5);
  g.lineStyle(1, 0x7a4010, 0.9);
  for (let x = 24; x < 96; x += 24) g.lineBetween(x, 0, x, 18);
  g.lineStyle(1, 0x7a4010, 0.4);
  g.lineBetween(0, 9, 96, 9);
}

export function drawIcePlatform(g) {
  // 96x18 ice slab
  g.fillStyle(0x88d8f0);
  g.fillRect(0, 0, 96, 18);
  g.fillStyle(0xffffff);
  g.fillRect(2, 2, 92, 5);
  g.fillStyle(0x44a8d8);
  g.fillRect(0, 12, 96, 6);
  g.lineStyle(1, 0x5bb5e8, 0.6);
  for (let x = 16; x < 96; x += 16) g.lineBetween(x, 0, x, 18);
}

export function drawArkOpen(g) {
  // Hull
  g.fillStyle(0x8B4513);
  g.fillRect(0, 50, 120, 50);
  g.fillTriangle(0, 50, 0, 100, 20, 100);
  g.fillTriangle(120, 50, 120, 100, 100, 100);
  g.fillStyle(0xa0522d);
  g.fillRect(5, 55, 110, 40);

  // Cabin
  g.fillStyle(0xcd853f);
  g.fillRect(20, 20, 80, 35);
  g.fillRect(35, 5, 50, 20);

  // Roof
  g.fillStyle(0x8B0000);
  g.fillTriangle(15, 20, 105, 20, 60, 2);

  // Side windows
  g.fillStyle(0x87CEEB);
  g.fillRect(28, 28, 14, 12);
  g.fillRect(78, 28, 14, 12);

  // Open door — warm golden light
  g.fillStyle(0xffdd44);
  g.fillRect(48, 22, 24, 33);
  g.fillStyle(0xff9900, 0.6);
  g.fillRect(51, 25, 18, 26);

  // Wood planks on hull
  g.lineStyle(1, 0x5c3200, 0.5);
  for (let x = 15; x < 120; x += 15) g.lineBetween(x, 50, x, 100);
}

export function drawHeart(g) {
  g.fillStyle(0xff3333);
  g.fillCircle(7, 7, 6);
  g.fillCircle(17, 7, 6);
  g.fillTriangle(1, 9, 23, 9, 12, 22);
  g.fillStyle(0xff8888);
  g.fillCircle(5, 5, 2);
}
