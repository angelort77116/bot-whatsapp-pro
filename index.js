const http = require("http");
const fs = require("fs");
const path = require("path");
const QRCode = require("qrcode");
const { iniciar } = require("./src/connection");
const DB = require("./src/database");
const { NOME_BOT, PASTA_DADOS } = require("./config");

global.__inicio = Date.now();

let ultimoQR = null;
let conectado = false;

function pagina() {
  const uptime = Math.floor((Date.now() - global.__inicio) / 1000);
  const comandos = require("./src/commands").total();
  const grupos = Object.keys(DB.grupos()).length;
  const qrImg = ultimoQR
    ? `<img src="/qr" style="width:320px;height:320px;background:#fff;padding:12px;border-radius:12px" />`
    : conectado
    ? `<h2 style="color:#25D366">Bot conectado e online</h2>`
    : `<p>Aguardando QR Code...</p>`;
  return `<!doctype html><html lang="pt-br"><head><meta charset="utf-8">
  <title>${NOME_BOT}</title><meta name="viewport" content="width=device-width,initial-scale=1">
  <style>body{font-family:system-ui,Segoe UI,Arial;background:#0b141a;color:#e9edef;text-align:center;padding:40px 16px}
  .card{max-width:520px;margin:auto;background:#111b21;border-radius:16px;padding:28px}
  b{color:#25D366}.grid{display:flex;gap:12px;justify-content:center;flex-wrap:wrap;margin:18px 0}
  .box{background:#1f2c33;border-radius:10px;padding:14px 18px;min-width:110px}
  .n{font-size:24px;font-weight:700;color:#25D366}</style></head>
  <body><div class="card">
  <h1>${NOME_BOT}</h1>
  <div class="grid">
    <div class="box"><div class="n">${comandos}</div>comandos</div>
    <div class="box"><div class="n">${grupos}</div>grupos</div>
    <div class="box"><div class="n">${uptime}s</div>uptime</div>
  </div>
  ${qrImg}
  <p>Leia o QR Code no WhatsApp: Aparelhos conectados &gt; Conectar aparelho.</p>
  <p style="opacity:.6;font-size:13px">Dono: +556593511752</p>
  </div></body></html>`;
}

function subirServidorStatus() {
  const porta = process.env.PORT || 3000;
  const servidor = http.createServer(async (req, res) => {
    if (req.url === "/qr") {
      if (!ultimoQR) {
        res.writeHead(404);
        return res.end("sem qr");
      }
      try {
        const png = await QRCode.toBuffer(ultimoQR, { width: 512, margin: 2 });
        res.writeHead(200, { "Content-Type": "image/png" });
        return res.end(png);
      } catch (_) {
        res.writeHead(500);
        return res.end("erro");
      }
    }
    if (req.url === "/status") {
      res.writeHead(200, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ online: conectado, comandos: require("./src/commands").total() }));
    }
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(pagina());
  });
  servidor.listen(porta, () => console.log(`[painel] http://localhost:${porta}`)).on("error", (e) => {
    console.log(`[painel] porta ${porta} indisponivel: ${e.message}`);
  });
}

async function main() {
  console.log(`\n=== ${NOME_BOT} ===`);
  console.log(`Dono: +556593511752`);
  console.log(`Comandos carregados: ${require("./src/commands").total()}\n`);

  subirServidorStatus();

  const sock = await iniciar();

  sock.ev.on("connection.update", (u) => {
    if (u.qr) {
      ultimoQR = u.qr;
      try {
        fs.writeFileSync(path.join(PASTA_DADOS, "qrcode.txt"), u.qr);
      } catch (_) {}
    }
    if (u.connection === "open") {
      conectado = true;
      ultimoQR = null;
    }
    if (u.connection === "close") conectado = false;
  });
}

process.on("SIGINT", () => {
  console.log("\nSalvando dados e saindo...");
  try { DB.salvarTudo(); } catch (_) {}
  process.exit(0);
});

process.on("unhandledRejection", (e) => console.error("[unhandledRejection]", e?.message || e));
process.on("uncaughtException", (e) => console.error("[uncaughtException]", e?.message || e));

main().catch((e) => {
  console.error("Falha ao iniciar:", e?.message || e);
  process.exit(1);
});
