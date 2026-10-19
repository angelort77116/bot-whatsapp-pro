const {
  makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  Browsers,
  makeCacheableSignalKeyStore
} = require("@whiskeysockets/baileys");
const P = require("pino");
const fs = require("fs");
const path = require("path");
const { PASTA_SESSAO, PASTA_DADOS, NOME_BOT, DONO_NUMERO, DONO_JID } = require("../config");
const { tratarMensagem } = require("./handler");
const { tratarParticipantes } = require("./eventos");
const E = require("./lib/estado");

const logger = P({ level: "silent" });

if (!fs.existsSync(PASTA_SESSAO)) fs.mkdirSync(PASTA_SESSAO, { recursive: true });
if (!fs.existsSync(PASTA_DADOS)) fs.mkdirSync(PASTA_DADOS, { recursive: true });

let tentativas = 0;
let pareando = false;
let avisoEnviado = false;
let iniciando = false;

function formatarCodigo(codigo) {
  const limpo = String(codigo || "").replace(/[^A-Z0-9]/gi, "").toUpperCase();
  if (limpo.length === 8) return `${limpo.slice(0, 4)}-${limpo.slice(4)}`;
  return limpo;
}

function salvarCodigo(codigo) {
  try {
    fs.writeFileSync(path.join(PASTA_DADOS, "pareamento.txt"), formatarCodigo(codigo));
  } catch (_) {}
}

function arquivarSessao() {
  if (!fs.existsSync(PASTA_SESSAO)) {
    fs.mkdirSync(PASTA_SESSAO, { recursive: true });
    return;
  }
  const arquivos = fs.readdirSync(PASTA_SESSAO);
  if (!arquivos.length) return;
  const destino = `${PASTA_SESSAO}-antiga-${Date.now()}`;
  try {
    fs.renameSync(PASTA_SESSAO, destino);
  } catch (_) {
    return;
  }
  fs.mkdirSync(PASTA_SESSAO, { recursive: true });
  console.log(`[sessao] sessao anterior movida para ${path.basename(destino)}`);
}

async function pedirPareamento(sock) {
  if (pareando) return;
  if (sock.authState?.creds?.registered) return;
  pareando = true;
  try {
    await new Promise((r) => setTimeout(r, 2000));
    const bruto = await sock.requestPairingCode(DONO_NUMERO);
    const codigo = formatarCodigo(bruto);
    E.setPareamento(codigo);
    salvarCodigo(codigo);
    console.log("\n==============================================");
    console.log(` ${NOME_BOT} - CODIGO DE PAREAMENTO`);
    console.log("==============================================");
    console.log(`\n  NUMERO: +${DONO_NUMERO}`);
    console.log(`  CODIGO: ${codigo}\n`);
    console.log("No WhatsApp:");
    console.log("  Aparelhos conectados > Conectar um aparelho");
    console.log("  > Conectar com numero de telefone");
    console.log(`  Digite o codigo: ${codigo}\n`);
    console.log("==============================================\n");
  } catch (e) {
    pareando = false;
    E.setErroConexao(e?.message || String(e));
    console.error("[pareamento] falha ao gerar codigo:", e?.message || e);
    setTimeout(() => pedirPareamento(sock), 10000);
  }
}

async function avisarDono(sock) {
  if (avisoEnviado) return;
  avisoEnviado = true;
  const numero = sock.user?.id?.split(":")[0] || DONO_NUMERO;
  const texto =
    `*${NOME_BOT} conectado*\n\n` +
    `Numero: +${numero}\n` +
    `Comandos: ${require("./commands").total()}\n` +
    `Hora: ${new Date().toLocaleString("pt-BR")}\n\n` +
    `O bot esta no ar. Use /menu no privado ou no grupo.\n` +
    `Para ativar um grupo: /addgrupo 30 dias`;
  try {
    await sock.sendMessage(DONO_JID, { text: texto });
    console.log(`[aviso] notificacao enviada para +${DONO_NUMERO}`);
  } catch (e) {
    console.error("[aviso] nao consegui notificar o dono:", e?.message || e);
    avisoEnviado = false;
  }
}

async function iniciar() {
  if (iniciando) return;
  iniciando = true;

  const forcarPareamento = process.env.NOVO_PAREAMENTO === "1";
  if (forcarPareamento) arquivarSessao();

  const { state, saveCreds } = await useMultiFileAuthState(PASTA_SESSAO);
  const { version } = await fetchLatestBaileysVersion();
  const jaRegistrado = !!state.creds?.registered;
  const historico = new Map();

  const sock = makeWASocket({
    version,
    logger,
    printQRInTerminal: false,
    browser: Browsers.ubuntu("Chrome"),
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger)
    },
    generateHighQualityLinkPreview: false,
    syncFullHistory: false,
    markOnlineOnConnect: true,
    defaultQueryTimeoutMs: undefined,
    connectTimeoutMs: 60000,
    keepAliveIntervalMs: 25000,
    getMessage: async (key) => historico.get(`${key.remoteJid}:${key.id}`) || undefined
  });

  sock.ev.on("creds.update", saveCreds);

  if (!jaRegistrado) {
    setTimeout(() => pedirPareamento(sock), 2500);
  }

  sock.ev.on("connection.update", async (atualizacao) => {
    const { connection, lastDisconnect } = atualizacao;

    if (atualizacao.qr && !sock.authState?.creds?.registered) {
      pedirPareamento(sock);
    }

    if (connection === "open") {
      tentativas = 0;
      pareando = false;
      iniciando = false;
      const numero = sock.user?.id?.split(":")[0] || DONO_NUMERO;
      E.setConectado(true, numero);
      console.log(`\n[OK] ${NOME_BOT} conectado com sucesso.`);
      console.log(`     Numero: ${numero}`);
      await avisarDono(sock);
    }

    if (connection === "close") {
      iniciando = false;
      E.setConectado(false);
      const codigo = lastDisconnect?.error?.output?.statusCode;
      const deslogado = codigo === DisconnectReason.loggedOut || codigo === 401 || codigo === 403;
      console.log(`\n[!] Conexao fechada (codigo ${codigo}).`);
      pareando = false;
      if (deslogado) {
        avisoEnviado = false;
        E.setPareamento(null);
        E.setErroConexao("Sessao encerrada. Gerando novo codigo de pareamento...");
        console.log("Sessao encerrada. Gerando novo codigo de pareamento...");
        arquivarSessao();
        tentativas = 0;
        setTimeout(iniciar, 2000);
      } else {
        tentativas++;
        const espera = Math.min(15000, 2000 * tentativas);
        console.log(`Reconectando em ${espera / 1000}s...`);
        setTimeout(iniciar, espera);
      }
    }
  });

  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    for (const msg of messages) {
      try {
        if (msg?.key?.id && msg.message) {
          historico.set(`${msg.key.remoteJid}:${msg.key.id}`, msg.message);
          if (historico.size > 400) {
            const primeiro = historico.keys().next().value;
            historico.delete(primeiro);
          }
        }
        const texto = msg?.message?.conversation
          || msg?.message?.extendedTextMessage?.text
          || msg?.message?.ephemeralMessage?.message?.conversation
          || msg?.message?.ephemeralMessage?.message?.extendedTextMessage?.text
          || "";
        if (texto) console.log(`[msg ${type}] ${msg.key.remoteJid} fromMe=${!!msg.key.fromMe} :: ${String(texto).slice(0, 80)}`);
        await tratarMensagem(sock, msg);
      } catch (e) {
        console.error("[erro mensagem]", e?.message || e);
      }
    }
  });

  sock.ev.on("group-participants.update", async (evento) => {
    try {
      await tratarParticipantes(sock, evento);
    } catch (e) {
      console.error("[erro participantes]", e?.message || e);
    }
  });

  return sock;
}

module.exports = { iniciar };
