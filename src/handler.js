const { getContentType, downloadContentFromMessage, jidNormalizedUser } = require("@whiskeysockets/baileys");
const { PREFIXOS, ANTI_SPAM_MS, MAX_ADVERTENCIAS, NOME_BOT } = require("../config");
const DB = require("./database");
const U = require("./utils");
const E = require("./lib/estado");
const { gerarGifAnimado } = require("./lib/animacao");
const comandos = require("./commands");

const LIMITE_TEXTO_GIF = 950;
const ENVIAR_GIF = true;

const suspeitaSpam = new Map();

function textoDaMensagem(m) {
  const tipo = getContentType(m);
  const c = m[tipo] || {};
  return (
    c.text ||
    c.caption ||
    m.conversation ||
    (tipo === "listResponseMessage" && c.title) ||
    (tipo === "buttonsResponseMessage" && c.selectedDisplayText) ||
    ""
  );
}

function contemLink(texto = "") {
  return /(https?:\/\/|www\.|chat\.whatsapp\.com|t\.me\/|wa\.me\/|[a-z0-9-]+\.(com|net|org|br|io|gg|xyz)\b)/i.test(texto);
}

async function responder(sock, chatId, msg, texto, tipo = "info") {
  const opcoes = { quoted: msg };
  try {
    if (ENVIAR_GIF && texto && texto.length <= LIMITE_TEXTO_GIF) {
      const gif = gerarGifAnimado(tipo);
      const enviado = await sock.sendMessage(chatId, { image: gif, caption: texto, mimetype: "image/gif" }, opcoes);
      E.marcarEnviado(enviado?.key?.id);
      return enviado;
    }
    const enviado = await sock.sendMessage(chatId, { text: texto }, opcoes);
    E.marcarEnviado(enviado?.key?.id);
    return enviado;
  } catch (e) {
    try {
      const enviado = await sock.sendMessage(chatId, { text: texto });
      E.marcarEnviado(enviado?.key?.id);
      return enviado;
    } catch (_) {
      return null;
    }
  }
}

async function responderTexto(sock, chatId, msg, texto) {
  try {
    const enviado = await sock.sendMessage(chatId, { text: texto }, { quoted: msg });
    E.marcarEnviado(enviado?.key?.id);
    return enviado;
  } catch (_) {
    return null;
  }
}

async function carregarMidia(msg, tipo) {
  const m = msg.message;
  const alvo =
    tipo === "image" ? m.imageMessage : tipo === "video" ? m.videoMessage : m.stickerMessage;
  if (!alvo) return null;
  const stream = await downloadContentFromMessage(alvo, tipo);
  const pedacos = [];
  for await (const pedaco of stream) pedacos.push(pedaco);
  return Buffer.concat(pedacos);
}

async function tratarMensagem(sock, msg) {
  try {
    if (!msg.message) return;
    const chatId = msg.key.remoteJid;
    if (!chatId || chatId === "status@broadcast") return;
    if (E.foiEnviadoPeloBot(msg.key.id)) return;
    if (msg.message.protocolMessage || msg.message.reactionMessage) return;

    const tipo = getContentType(msg.message);
    if (tipo === "senderKeyDistributionMessage" || tipo === "messageContextInfo") return;

    const isGrupo = chatId.endsWith("@g.us");
    const fromMe = !!msg.key.fromMe;
    const meuJid = jidNormalizedUser(sock.user?.id || "");
    const remetenteJid = fromMe
      ? meuJid
      : jidNormalizedUser(msg.key.participant || msg.key.remoteJid);

    const texto = textoDaMensagem(msg.message);
    const isDono = U.ehDono(remetenteJid);

    const extras = DB.extras();
    if (!isDono && (extras.bloqueados || []).includes(U.numeroDeJid(remetenteJid))) return;

    const afk = extras.afk || {};
    if (afk[remetenteJid] && !fromMe) {
      delete afk[remetenteJid];
      DB.salvarExtra({ afk });
      responder(sock, chatId, msg, `Bem-vindo de volta, @${U.numeroDeJid(remetenteJid)}!`, "sucesso");
    }

    E.guardarRecente(chatId, {
      id: msg.key.id,
      jid: remetenteJid,
      texto,
      em: Date.now(),
      fromMe
    });

    if (!isGrupo && !texto) return;

    const prefixos = DB.extras().prefixos || PREFIXOS;
    const primeiro = texto ? texto[0] : "";
    const temPrefixo = prefixos.includes(primeiro);

    let dadosGrupo = null;
    let ativo = true;
    if (isGrupo) {
      dadosGrupo = DB.grupo(chatId);
      if (dadosGrupo) {
        ativo = !!dadosGrupo.ativo && (dadosGrupo.permanente || (dadosGrupo.expiraEm || 0) > Date.now());
        if (!ativo) dadosGrupo.ativo = false;
      } else {
        ativo = false;
      }
      if (!temPrefixo && (dadosGrupo?.antilink || dadosGrupo?.palavras?.length)) {
        await aplicarModeracao(sock, chatId, msg, remetenteJid, texto, dadosGrupo, isDono, isGrupo);
      }
      if (dadosGrupo?.antispam && !isDono && texto) {
        const bloqueado = await aplicarAntispam(sock, chatId, msg, remetenteJid);
        if (bloqueado) return;
      }
    }

    if (!temPrefixo) return;

    const semPrefixo = texto.slice(1).trim();
    const [nomeComando, ...argumentos] = semPrefixo.split(/\s+/);
    const comando = (nomeComando || "").toLowerCase();
    if (!comando) return;

    const def = comandos.buscar(comando);
    if (!def) return;

    if (isGrupo && !ativo && !isDono && !def.dono) {
      return;
    }

    let metadados = null;
    let isAdmin = isDono;
    let botAdmin = false;

    if (isGrupo) {
      metadados = await E.metadados(sock, chatId);
      const participantes = metadados.participants || [];
      const eu = participantes.find((p) => jidNormalizedUser(p.id) === meuJid);
      botAdmin = !!(eu && (eu.admin === "admin" || eu.admin === "superadmin"));
      const euP = participantes.find((p) => jidNormalizedUser(p.id) === remetenteJid);
      isAdmin = isDono || !!(euP && (euP.admin === "admin" || euP.admin === "superadmin"));
    }

    const grupoVip = !!(dadosGrupo?.vip && (dadosGrupo?.permanente || (dadosGrupo?.vipExpiraEm || 0) > Date.now()));
    const usuario = DB.usuario(remetenteJid);
    const usuarioVip = !!(isDono || (usuario.vip && (!usuario.vipExpiraEm || usuario.vipExpiraEm > Date.now())));

    if (isGrupo && !isAdmin && E.estaMudo(chatId, remetenteJid)) {
      await deletarMensagem(sock, chatId, msg.key);
      return;
    }

    if (def.dono && !isDono) {
      return responder(sock, chatId, msg, "Apenas o DONO pode usar este comando.", "erro");
    }
    if (def.admin && !isAdmin) {
      return responder(sock, chatId, msg, "Apenas ADMINS do grupo podem usar este comando.", "erro");
    }
    if (def.vip && !(isDono || grupoVip || usuarioVip)) {
      return responder(sock, chatId, msg, "Comando exclusivo VIP. Grupo/Usuario sem VIP ativo.", "vip");
    }
    if (def.grupo && !isGrupo) {
      return responder(sock, chatId, msg, "Este comando so funciona dentro de grupos.", "aviso");
    }
    if (def.botAdmin && !botAdmin) {
      return responder(sock, chatId, msg, "Preciso ser ADMIN do grupo para executar isso.", "aviso");
    }

    const ctx = {
      sock,
      msg,
      chatId,
      remetenteJid,
      numero: U.numeroDeJid(remetenteJid),
      isGrupo,
      isDono,
      isAdmin,
      botAdmin,
      metadados,
      dadosGrupo,
      grupoVip,
      usuarioVip,
      usuario,
      comando,
      args: argumentos,
      texto: argumentos.join(" "),
      textoCompleto: semPrefixo,
      prefixo: primeiro,
      def,
      inicio: Date.now(),
      DB,
      U,
      E,
      responder: (t, tipoAnim = def.animacao || "info") => responder(sock, chatId, msg, t, tipoAnim),
      responderTexto: (t) => responderTexto(sock, chatId, msg, t),
      carregarImagem: () => carregarMidia(msg, "image"),
      carregarVideo: () => carregarMidia(msg, "video"),
      carregarSticker: () => carregarMidia(msg, "sticker"),
      reagir: async (emoji) => {
        try {
          await sock.sendMessage(chatId, { react: { text: emoji, key: msg.key } });
        } catch (_) {}
      },
      deletar: async (chave = msg.key) => deletarMensagem(sock, chatId, chave),
      mencionados: msg.message.extendedTextMessage?.contextInfo?.mentionedJid || []
    };

    try {
      await def.executar(ctx);
      const u2 = DB.usuario(remetenteJid);
      DB.salvarUsuario(remetenteJid, { xp: (u2.xp || 0) + U.inteiro(1, 3) });
    } catch (e) {
      console.error(`[erro comando ${comando}]`, e?.message || e);
      await responder(sock, chatId, msg, `Ocorreu um erro ao executar /${comando}.\nDetalhe: ${e?.message || e}`, "erro");
    }
  } catch (e) {
    console.error("[erro geral]", e?.message || e);
  }
}

async function deletarMensagem(sock, chatId, chave) {
  try {
    await sock.sendMessage(chatId, { delete: chave });
    return true;
  } catch (_) {
    return false;
  }
}

async function advertir(sock, chatId, jid, motivo, dadosGrupo) {
  const u = DB.usuario(jid);
  u.avisos = (u.avisos || 0) + 1;
  DB.salvarUsuario(jid, { avisos: u.avisos });
  const max = dadosGrupo?.maxAvisos || MAX_ADVERTENCIAS;
  if (u.avisos >= max) {
    try {
      await sock.groupParticipantsUpdate(chatId, [jid], "remove");
    } catch (_) {}
    u.avisos = 0;
    DB.salvarUsuario(jid, { avisos: 0 });
  }
  return u.avisos;
}

async function aplicarModeracao(sock, chatId, msg, jid, texto, dadosGrupo, isDono, isGrupo) {
  if (isDono) return;
  let metadados;
  try {
    metadados = await E.metadados(sock, chatId);
  } catch (_) {
    return;
  }
  const eu = metadados.participants.find((p) => p.id === jidNormalizedUser(msg.key.participant || ""));
  const admin = eu && (eu.admin === "admin" || eu.admin === "superadmin");
  if (admin) return;

  if (dadosGrupo.antilink && contemLink(texto)) {
    await deletarMensagem(sock, chatId, msg.key);
    const avisos = await advertir(sock, chatId, jid, "link", dadosGrupo);
    await sock.sendMessage(chatId, {
      text: `Link removido. @${jid.split("@")[0]} recebeu advertência (${avisos}).`,
      mentions: [jid]
    }).then((m) => E.marcarEnviado(m?.key?.id)).catch(() => {});
    return;
  }

  if (dadosGrupo.palavras?.length) {
    const baixo = texto.toLowerCase();
    const achou = dadosGrupo.palavras.find((p) => baixo.includes(p.toLowerCase()));
    if (achou) {
      await deletarMensagem(sock, chatId, msg.key);
      const avisos = await advertir(sock, chatId, jid, "palavra", dadosGrupo);
      await sock.sendMessage(chatId, {
        text: `Palavra proibida detectada. @${jid.split("@")[0]} advertido (${avisos}).`,
        mentions: [jid]
      }).then((m) => E.marcarEnviado(m?.key?.id)).catch(() => {});
    }
  }
}

async function aplicarAntispam(sock, chatId, msg, jid) {
  const chave = `${chatId}:${jid}`;
  const agora = Date.now();
  const lista = (suspeitaSpam.get(chave) || []).filter((t) => agora - t < 5000);
  lista.push(agora);
  suspeitaSpam.set(chave, lista);
  if (lista.length > 6) {
    suspeitaSpam.set(chave, []);
    await deletarMensagem(sock, chatId, msg.key);
    return true;
  }
  return false;
}

module.exports = { tratarMensagem, responder, responderTexto, deletarMensagem };
