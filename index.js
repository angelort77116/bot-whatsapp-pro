const http = require("http");
const { iniciar } = require("./src/connection");
const DB = require("./src/database");
const E = require("./src/lib/estado");
const { NOME_BOT, DONO_NUMERO } = require("./config");

global.__inicio = Date.now();

function pagina() {
  const uptime = Math.floor((Date.now() - global.__inicio) / 1000);
  const comandos = require("./src/commands").total();
  const grupos = Object.keys(DB.grupos()).length;
  const codigo = E.conexao.pareamento;
  const formatado = codigo
    ? (codigo.length === 8 ? `${codigo.slice(0, 4)}-${codigo.slice(4)}` : codigo)
    : "";

  let bloco;
  if (E.conexao.conectado) {
    bloco = `<h2 style="color:#25D366">Bot conectado e online</h2>
      <p>Numero: +${E.conexao.numero || DONO_NUMERO}</p>
      <p>Uma notificacao foi enviada para o seu WhatsApp.</p>`;
  } else if (formatado) {
    bloco = `<p>Conecte com o codigo de pareamento</p>
      <div class="codigo">${formatado}</div>
      <ol style="text-align:left;max-width:360px;margin:18px auto;line-height:1.6">
        <li>Abra o WhatsApp no celular <b>+${DONO_NUMERO}</b></li>
        <li>Aparelhos conectados</li>
        <li>Conectar um aparelho</li>
        <li>Conectar com numero de telefone</li>
        <li>Digite o codigo acima</li>
      </ol>
      <p style="opacity:.7">O codigo e gerado toda vez que o bot sobe sem sessao salva.</p>`;
  } else if (E.conexao.erro) {
    bloco = `<p>Aguardando codigo... ${E.conexao.erro}</p>`;
  } else {
    bloco = `<p>Gerando codigo de pareamento...</p>`;
  }

  return `<!doctype html><html lang="pt-br"><head><meta charset="utf-8">
  <title>${NOME_BOT}</title><meta name="viewport" content="width=device-width,initial-scale=1">
  <meta http-equiv="refresh" content="8">
  <style>body{font-family:system-ui,Segoe UI,Arial;background:#0b141a;color:#e9edef;text-align:center;padding:40px 16px}
  .card{max-width:560px;margin:auto;background:#111b21;border-radius:16px;padding:28px}
  b{color:#25D366}.grid{display:flex;gap:12px;justify-content:center;flex-wrap:wrap;margin:18px 0}
  .box{background:#1f2c33;border-radius:10px;padding:14px 18px;min-width:110px}
  .n{font-size:24px;font-weight:700;color:#25D366}
  .codigo{font-size:42px;letter-spacing:6px;font-weight:800;color:#25D366;background:#1f2c33;border-radius:12px;padding:18px 12px;margin:16px 0}</style></head>
  <body><div class="card">
  <h1>${NOME_BOT}</h1>
  <div class="grid">
    <div class="box"><div class="n">${comandos}</div>comandos</div>
    <div class="box"><div class="n">${grupos}</div>grupos</div>
    <div class="box"><div class="n">${uptime}s</div>uptime</div>
  </div>
  ${bloco}
  <p style="opacity:.6;font-size:13px">Dono: +${DONO_NUMERO}</p>
  </div></body></html>`;
}

function subirServidorStatus() {
  const porta = process.env.PORT || 3000;
  const servidor = http.createServer(async (req, res) => {
    if (req.url === "/status") {
      res.writeHead(200, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({
        online: E.conexao.conectado,
        comandos: require("./src/commands").total(),
        pairing: E.conexao.pareamento,
        numero: E.conexao.numero
      }));
    }
    if (req.url === "/codigo" || req.url === "/pairing") {
      res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
      return res.end(E.conexao.pareamento || "");
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
  console.log(`Dono: +${DONO_NUMERO}`);
  console.log(`Comandos carregados: ${require("./src/commands").total()}\n`);
  subirServidorStatus();
  await iniciar();
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
