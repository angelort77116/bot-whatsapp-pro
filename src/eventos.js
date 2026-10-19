const DB = require("./database");
const E = require("./lib/estado");
const { gerarGifAnimado } = require("./lib/animacao");

async function tratarParticipantes(sock, evento) {
  const { id: chatId, participants, action } = evento;
  if (!chatId.endsWith("@g.us")) return;

  const dados = DB.grupo(chatId);
  if (!dados) return;
  const ativo = dados.ativo && (dados.permanente || (dados.expiraEm || 0) > Date.now());
  if (!ativo) return;

  let metadados;
  try {
    metadados = await sock.groupMetadata(chatId);
  } catch (_) {
    return;
  }
  const nomeGrupo = metadados.subject || "Grupo";

  for (const jid of participants) {
    const numero = jid.split("@")[0];

    if (action === "add" && dados.antifake && numero.replace(/\D/g, "").length < 11) {
      try {
        await sock.groupParticipantsUpdate(chatId, [jid], "remove");
        await sock.sendMessage(chatId, { text: `Antifake: @${numero} foi removido (numero suspeito).`, mentions: [jid] });
      } catch (_) {}
      continue;
    }

    if (action === "add" && dados.bemvindo) {
      const tpl =
        dados.mensagemBemvindo ||
        "Bem-vindo(a) @user ao grupo *{grupo}*!\nLeia as regras e divirta-se.";
      const texto = tpl.replace(/@user/g, `@${numero}`).replace(/\{grupo\}/g, nomeGrupo);
      try {
        const gif = gerarGifAnimado("bemvindo");
        const enviado = await sock.sendMessage(chatId, {
          image: gif,
          caption: texto,
          mentions: [jid],
          mimetype: "image/gif"
        });
        E.marcarEnviado(enviado?.key?.id);
      } catch (_) {}
    }

    if (action === "remove" && dados.adeus) {
      const tpl = dados.mensagemAdeus || "@user saiu do grupo *{grupo}*. Ate logo!";
      const texto = tpl.replace(/@user/g, `@${numero}`).replace(/\{grupo\}/g, nomeGrupo);
      try {
        const gif = gerarGifAnimado("aviso");
        const enviado = await sock.sendMessage(chatId, {
          image: gif,
          caption: texto,
          mentions: [jid],
          mimetype: "image/gif"
        });
        E.marcarEnviado(enviado?.key?.id);
      } catch (_) {}
    }
  }

  E.invalidarMeta(chatId);
}

module.exports = { tratarParticipantes };
