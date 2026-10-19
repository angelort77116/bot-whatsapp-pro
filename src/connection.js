const {
  makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  Browsers,
  makeCacheableSignalKeyStore
} = require("@whiskeysockets/baileys");
const P = require("pino");
const qrcode = require("qrcode-terminal");
const fs = require("fs");
const { PASTA_SESSAO, NOME_BOT } = require("../config");
const { tratarMensagem } = require("./handler");
const { tratarParticipantes } = require("./eventos");

const logger = P({ level: "silent" });

if (!fs.existsSync(PASTA_SESSAO)) fs.mkdirSync(PASTA_SESSAO, { recursive: true });

let tentativas = 0;

async function iniciar() {
  const { state, saveCreds } = await useMultiFileAuthState(PASTA_SESSAO);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    logger,
    printQRInTerminal: false,
    browser: Browsers.appropriate("Desktop"),
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger)
    },
    generateHighQualityLinkPreview: false,
    syncFullHistory: false,
    markOnlineOnConnect: false,
    defaultQueryTimeoutMs: 60000,
    connectTimeoutMs: 60000,
    keepAliveIntervalMs: 25000
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", (atualizacao) => {
    const { connection, lastDisconnect, qr } = atualizacao;

    if (qr) {
      console.log("\n==============================");
      console.log(` ${NOME_BOT} - LEIA O QR CODE ABAIXO`);
      console.log("==============================\n");
      qrcode.generate(qr, { small: true });
      console.log("\nAbra o WhatsApp > Aparelhos conectados > Conectar aparelho\n");
    }

    if (connection === "open") {
      tentativas = 0;
      console.log(`\n[OK] ${NOME_BOT} conectado com sucesso.`);
      console.log(`     Numero: ${sock.user?.id?.split(":")[0]}`);
    }

    if (connection === "close") {
      const codigo = lastDisconnect?.error?.output?.statusCode;
      const deslogado = codigo === DisconnectReason.loggedOut;
      console.log(`\n[!] Conexao fechada (codigo ${codigo}).`);
      if (deslogado) {
        console.log("Sessao encerrada. Apague a pasta 'sessao' e leia o QR novamente.");
        process.exit(1);
      } else {
        tentativas++;
        const espera = Math.min(15000, 2000 * tentativas);
        console.log(`Reconectando em ${espera / 1000}s...`);
        setTimeout(iniciar, espera);
      }
    }
  });

  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    if (type !== "notify") return;
    for (const msg of messages) {
      try {
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
