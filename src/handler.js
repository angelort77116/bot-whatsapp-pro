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

function desempacotar(message) {
  if (!message) return message;
  const wrappers = [
    "ephemeralMessage",
    "viewOnceMessage",
    "viewOnceMessageV2",
    "viewOnceMessageV2Extension",
    "documentWithCaptionMessage",
    "editedMessage",
    "futureProofMessage",
    "deviceSentMessage",
    "associatedChildMessage"
  ];
  for (const w of wrappers) {
    if (message[w]?.message) return desempacotar(message[w].message);
  }
  return message;
}

function textoDaMensagem(m) {
  if (!m) return "";
  const tipo = getContentType(m);
  const c = m[tipo] || {};
  return (
    m.conversation ||
    c.text ||
    c.caption ||
    c.selectedDisplayText ||
    c.selectedId ||
    (tipo === "listResponseMessage" && (c.title || c.singleSelectReply?.selectedRowId)) ||
    (tipo === "templateButtonReplyMessage" && c.selectedDisplayText) ||
    (m.extendedTextMessage && m.extendedTextMessage.text) ||
    (m.imageMessage && m.imageMessage.caption) ||
    (m.videoMessage && m.videoMessage.caption) ||
    (m.documentMessage && m.documentMessage.caption) ||
    ""
  );
}

function contemLink(texto = "") {
  return /(https?:\/\/|www\.|chat\.whatsapp\.com|t\.me\/|wa\.me\/|[a-z0-9-]+\.(com|net|org|br|io|gg|xyz)\b)/i.test(texto);
}

async function responder(sock, chatId, msg, texto, tipo = "info") {
  const opcoes = msg?.key?.id ? { quoted: msg } : {};
  try {
    const enviado = await sock.sendMessage(chatId, { text: texto }, opcoes);
    E.marcarEnviado(enviado?.key?.id);
    if (ENVIAR_GIF && texto && texto.length <= LIMITE_TEXTO_GIF) {
      try {
        const gif = gerarGifAnimado(tipo);
        const extra = await sock.sendMessage(chatId, { image: gif, caption: "" });
        E.marcarEnviado(extra?.key?.id);
      } catch (_) {}
    }
    return enviado;
  } catch (e) {
    try {
      const enviado = await sock.sendMessage(chatId, { text: String(texto || "") });
      E.marcarEnviado(enviado?.key?.id);
      return enviado;
    } catch (e2) {
      console.error("[responder]", e2?.message || e?.message || e2);
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

function limparTexto(texto) {
  return String(texto || "")
    .replace(/[\u200e\u200f\u202a-\u202e\u2066-\u2069\u00a0]/g, "")
    .trim();
}

function jidDonoDoSock(sock) {
  const id = sock.user?.id || "";
  const lid = sock.user?.lid || "";
  return {
    jid: id ? jidNormalizedUser(id) : "",
    lid: lid ? jidNormalizedUser(lid) : "",
    numero: U.numeroDeJid(id)
  };
}

async function tratarMensagem(sock, msg) {
  try {
    if (!msg || !msg.key) return;

    const chatId = msg.key.remoteJid;
    if (!chatId || chatId === "status@broadcast") return;
    if (msg.key.id && E.foiEnviadoPeloBot(msg.key.id)) return;

    const bruto = msg.message;
    if (!bruto) return;
    if (bruto.protocolMessage || bruto.reactionMessage || bruto.pollUpdateMessage) return;

    const message = desempacotar(bruto) || bruto;
    const tipo = getContentType(message);
    if (!tipo || tipo === "senderKeyDistributionMessage" || tipo === "messageContextInfo") return;

    msg.message = message;

    const isGrupo = chatId.endsWith("@g.us");
    const fromMe = !!msg.key.fromMe;
    const eu = jidDonoDoSock(sock);
    const remetenteBruto = fromMe
      ? (msg.key.participantAlt || msg.key.participant || eu.jid || chatId)
      : (msg.key.participantAlt || msg.key.participant || msg.key.remoteJidAlt || msg.key.remoteJid);
    const remetenteJid = jidNormalizedUser(remetenteBruto || "");
    const remetenteLid = String(remetenteBruto || "").includes("@lid") ? jidNormalizedUser(remetenteBruto) : "";

    const texto = limparTexto(textoDaMensagem(message));
    const isDono =
      fromMe ||
      U.ehDono(remetenteJid) ||
      U.ehDono(msg.key.participant) ||
      U.ehDono(msg.key.participantAlt) ||
      U.ehDono(msg.key.remoteJidAlt) ||
      !!(eu.lid && remetenteLid && eu.lid === remetenteLid);

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
    const temPrefixo = prefixos.includes(primeiro) || "/!.#／！．＃".includes(primeiro);

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
    console.log(`[cmd] /${comando} grupo=${isGrupo} dono=${isDono} fromMe=${fromMe} chat=${chatId} de=${remetenteJid}`);

    const def = comandos.buscar(comando);
    if (!def) {
      if (isDono || !isGrupo) {
        await responder(sock, chatId, msg, `Comando /${comando} nao existe. Use /menu para ver a lista.`, "aviso");
      }
      return;
    }

    if (isGrupo && !ativo && isDono) {
      ativo = true;
    }
    if (isGrupo && !ativo && !def.dono) {
      return responder(sock, chatId, msg, "Este grupo ainda nao foi ativado.\nDono: envie /addgrupo 30 dias (ou /addgrupo permanente).", "aviso");
    }

    let metadados = null;
    let isAdmin = isDono;
    let botAdmin = false;

    if (isGrupo) {
      try {
        metadados = await E.metadados(sock, chatId);
      } catch (e) {
        console.error("[meta]", e?.message || e);
        metadados = { participants: [] };
      }
      const participantes = metadados.participants || [];
      const euPart = participantes.find((p) => {
        const pid = jidNormalizedUser(p.id || "");
        const pphone = jidNormalizedUser(p.phoneNumber || p.jid || "");
        return pid === eu.jid || pid === eu.lid || pphone === eu.jid || U.ehDono(pid) || U.ehDono(pphone);
      });
      botAdmin = !!(euPart && (euPart.admin === "admin" || euPart.admin === "superadmin"));
      const euP = participantes.find((p) => {
        const pid = jidNormalizedUser(p.id || "");
        const pphone = jidNormalizedUser(p.phoneNumber || p.jid || "");
        return pid === remetenteJid || pphone === remetenteJid || pid === remetenteLid;
      });
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
