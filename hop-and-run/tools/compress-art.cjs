// Comprime el arte generado para cumplir el presupuesto de descarga de
// CrazyGames (≤20MB): redimensiona con canvas (Chrome headless) y re-encodea
// — PNG para sprites con alfa, JPG para fondos opacos. Los originales se
// mueven a assets/art-src/ (gitignored).
// Uso: NODE_PATH=<repo>\games\elizabeth-flofy\tools\node_modules node compress-art.cjs

const { chromium } = require("playwright-core");
const fs = require("fs");
const path = require("path");

const artDir = path.join(__dirname, "..", "assets", "art");
const srcDir = path.join(__dirname, "..", "assets", "art-src");

// [patrón, alto/ancho objetivo, formato, calidad]
const RULES = [
  [/^cristian-.*-cut$/, { h: 400 }, "png"],
  [/^(fruit|animal|item|obstacle)-.*-cut$/, { h: 256 }, "png"],
  [/^rooftop-/, { w: 960 }, "jpeg", 0.85],
  [/^skyline-/, { w: 1600, cropY: 0.08 }, "jpeg", 0.8], // fuera barras cinemáticas de la IA
  [/^key-art$/, { w: 1600 }, "jpeg", 0.85],
];

(async () => {
  fs.mkdirSync(srcDir, { recursive: true });
  const b = await chromium.launch({ channel: "chrome" });
  const p = await b.newPage();

  for (const file of fs.readdirSync(artDir)) {
    if (!file.endsWith(".png")) continue;
    const name = file.replace(/\.png$/, "");
    const rule = RULES.find(([re]) => re.test(name));
    if (!rule) {
      // Originales sin regla (versiones sin -cut): fuera del juego, a art-src.
      fs.renameSync(path.join(artDir, file), path.join(srcDir, file));
      continue;
    }
    const [, size, fmt, q] = rule;
    const dataUri = "data:image/png;base64," + fs.readFileSync(path.join(artDir, file)).toString("base64");
    const out = await p.evaluate(async ({ dataUri, size, fmt, q }) => {
      const img = new Image();
      await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = dataUri; });
      const cropY = Math.round((size.cropY || 0) * img.height);
      const srcH = img.height - cropY * 2;
      const scale = size.h ? size.h / srcH : size.w / img.width;
      const w = Math.round(img.width * Math.min(1, scale));
      const h = Math.round(srcH * Math.min(1, scale));
      const c = document.createElement("canvas");
      c.width = w; c.height = h;
      const ctx = c.getContext("2d");
      if (fmt === "jpeg") { ctx.fillStyle = "#888"; ctx.fillRect(0, 0, w, h); }
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, cropY, img.width, srcH, 0, 0, w, h);
      return c.toDataURL(fmt === "jpeg" ? "image/jpeg" : "image/png", q);
    }, { dataUri, size, fmt, q });

    fs.renameSync(path.join(artDir, file), path.join(srcDir, file)); // conserva el original
    const ext = fmt === "jpeg" ? ".jpg" : ".png";
    const buf = Buffer.from(out.split(",")[1], "base64");
    fs.writeFileSync(path.join(artDir, name + ext), buf);
    console.log(`OK ${name}${ext} ${(buf.length / 1024).toFixed(0)}KB`);
  }
  await b.close();

  const total = fs.readdirSync(artDir).reduce((a, f) => a + fs.statSync(path.join(artDir, f)).size, 0);
  console.log(`TOTAL assets/art: ${(total / 1024 / 1024).toFixed(2)}MB`);
})();
