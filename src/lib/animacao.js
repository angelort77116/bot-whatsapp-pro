const { GIFEncoder } = require("gifenc");

const LARGURA = 480;
const ALTURA = 160;

function novoTampao(corFundo) {
  return new Uint8Array(LARGURA * ALTURA).fill(corFundo);
}

function pixel(buf, x, y, c) {
  if (x < 0 || y < 0 || x >= LARGURA || y >= ALTURA) return;
  buf[y * LARGURA + x] = c;
}

function blob(buf, cx, cy, r, c) {
  const r2 = r * r;
  const x0 = Math.max(0, Math.floor(cx - r));
  const x1 = Math.min(LARGURA - 1, Math.ceil(cx + r));
  const y0 = Math.max(0, Math.floor(cy - r));
  const y1 = Math.min(ALTURA - 1, Math.ceil(cy + r));
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy <= r2) buf[y * LARGURA + x] = c;
    }
  }
}

function anel(buf, cx, cy, r, espessura, c) {
  const re2 = r * r;
  const ri = Math.max(0, r - espessura);
  const ri2 = ri * ri;
  const x0 = Math.max(0, Math.floor(cx - r));
  const x1 = Math.min(LARGURA - 1, Math.ceil(cx + r));
  const y0 = Math.max(0, Math.floor(cy - r));
  const y1 = Math.min(ALTURA - 1, Math.ceil(cy + r));
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const d = dx * dx + dy * dy;
      if (d <= re2 && d >= ri2) buf[y * LARGURA + x] = c;
    }
  }
}

function linha(buf, x0, y0, x1, y1, c, espessura = 8) {
  x0 = Math.round(x0);
  y0 = Math.round(y0);
  x1 = Math.round(x1);
  y1 = Math.round(y1);
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const passos = Math.max(dx, dy) || 1;
  for (let i = 0; i <= passos; i++) {
    const t = i / passos;
    blob(buf, x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, espessura / 2, c);
  }
}

function retangulo(buf, x, y, w, h, c) {
  for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) pixel(buf, xx, yy, c);
}

const PALETAS = {
  sucesso: [
    [12, 24, 18],
    [37, 211, 102],
    [180, 255, 210],
    [255, 255, 255]
  ],
  erro: [
    [28, 12, 14],
    [240, 71, 71],
    [255, 190, 190],
    [255, 255, 255]
  ],
  aviso: [
    [30, 24, 8],
    [245, 190, 40],
    [255, 235, 170],
    [255, 255, 255]
  ],
  info: [
    [10, 20, 34],
    [64, 156, 255],
    [190, 220, 255],
    [255, 255, 255]
  ],
  ban: [
    [26, 8, 10],
    [220, 40, 60],
    [255, 160, 170],
    [255, 255, 255]
  ],
  bemvindo: [
    [16, 12, 30],
    [140, 90, 255],
    [120, 220, 255],
    [255, 255, 255]
  ],
  fun: [
    [14, 14, 22],
    [255, 99, 132],
    [90, 220, 255],
    [255, 220, 90]
  ],
  vip: [
    [26, 20, 6],
    [255, 200, 40],
    [255, 245, 190],
    [255, 255, 255]
  ],
  coracao: [
    [30, 10, 20],
    [255, 70, 130],
    [255, 190, 215],
    [255, 255, 255]
  ]
};

function desenharSimbolo(buf, tipo, cor) {
  const cx = LARGURA / 2;
  const cy = ALTURA / 2;
  if (tipo === "sucesso") {
    linha(buf, cx - 46, cy + 2, cx - 12, cy + 34, cor, 16);
    linha(buf, cx - 12, cy + 34, cx + 52, cy - 34, cor, 16);
  } else if (tipo === "erro" || tipo === "ban") {
    linha(buf, cx - 34, cy - 34, cx + 34, cy + 34, cor, 16);
    linha(buf, cx + 34, cy - 34, cx - 34, cy + 34, cor, 16);
  } else if (tipo === "aviso") {
    blob(buf, cx, cy - 14, 9, cor);
    retangulo(buf, cx - 8, cy + 4, 16, 46, cor);
  } else if (tipo === "info") {
    blob(buf, cx, cy - 30, 9, cor);
    retangulo(buf, cx - 8, cy - 12, 16, 60, cor);
  }
}

function gerarQuadros(tipo) {
  const paleta = PALETAS[tipo] || PALETAS.info;
  const paletaRGB = paleta.map((c) => c);
  const quadros = [];
  const TOTAL = 14;
  const aleatorio = (() => {
    let s = 12345;
    return () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  })();

  const particulas = [];
  if (tipo === "fun" || tipo === "bemvindo" || tipo === "vip" || tipo === "coracao") {
    for (let i = 0; i < 90; i++) {
      particulas.push({
        x: aleatorio() * LARGURA,
        y: aleatorio() * ALTURA,
        v: 0.6 + aleatorio() * 2.2,
        c: 1 + Math.floor(aleatorio() * 3)
      });
    }
  }

  for (let f = 0; f < TOTAL; f++) {
    const buf = novoTampao(0);
    const fase = (f / TOTAL) * Math.PI * 2;

    if (tipo === "sucesso" || tipo === "erro" || tipo === "aviso" || tipo === "info") {
      const r = 52 + 10 * Math.sin(fase);
      anel(buf, LARGURA / 2, ALTURA / 2, r, 5, 2);
      anel(buf, LARGURA / 2, ALTURA / 2, 66 + 8 * Math.cos(fase), 3, 1);
      desenharSimbolo(buf, tipo, 3);
    } else if (tipo === "ban") {
      const off = (f / TOTAL) * 60;
      for (let y = 0; y < ALTURA; y++)
        for (let x = 0; x < LARGURA; x++)
          if ((x + y + off) % 56 < 14) {}
      for (let i = 0; i < 3; i++) {
        const r = ((f / TOTAL) * (LARGURA / 1.4) + i * 70) % (LARGURA / 1.4);
        anel(buf, LARGURA / 2, ALTURA / 2, r, 6, i === 1 ? 2 : 1);
      }
      desenharSimbolo(buf, "ban", 3);
    } else if (tipo === "bemvindo" || tipo === "vip" || tipo === "fun" || tipo === "coracao") {
      for (const p of particulas) {
        p.y -= p.v;
        if (p.y < -4) p.y = ALTURA + 4;
        const c = p.c;
        retangulo(buf, Math.floor(p.x), Math.floor(p.y), 4, 6, c);
      }
      const pulso = 1 + 0.12 * Math.sin(fase);
      blob(buf, LARGURA / 2, ALTURA / 2, 30 * pulso, 1);
      if (tipo === "coracao") {
        blob(buf, LARGURA / 2 - 14, ALTURA / 2 - 10, 18, 3);
        blob(buf, LARGURA / 2 + 14, ALTURA / 2 - 10, 18, 3);
        desenharSimbolo(buf, "sucesso", 1);
      }
    }

    quadros.push({ indice: buf, paleta: paletaRGB });
  }

  return quadros;
}

const cacheGif = new Map();

function gerarGifAnimado(tipo = "info") {
  if (cacheGif.has(tipo)) return cacheGif.get(tipo);

  const gif = GIFEncoder();
  const quadros = gerarQuadros(tipo);
  for (const q of quadros) {
    gif.writeFrame(q.indice, LARGURA, ALTURA, {
      palette: q.paleta,
      delay: 90,
      dispose: 1
    });
  }
  gif.finish();
  const buffer = Buffer.from(gif.bytes());
  cacheGif.set(tipo, buffer);
  return buffer;
}

module.exports = { gerarGifAnimado, LARGURA, ALTURA, PALETAS };
