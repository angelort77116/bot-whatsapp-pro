const { c } = require("./_helper");
const DB = require("../database");
const U = require("../utils");
const E = require("../lib/estado");
const { jidNormalizedUser } = require("@whiskeysockets/baileys");

function alvoNumero(ctx) {
  if (ctx.mencionados[0]) return U.numeroDeJid(ctx.mencionados[0]);
  const n = U.apenasDigitos(ctx.args[0] || "");
  return n || null;
}

function toggle(campo, nome) {
  return (ctx) => {
    if (!ctx.isGrupo) return ctx.responder("So em grupos.", "aviso");
    const atual = !!ctx.dadosGrupo?.[campo];
    const valor = ctx.args[0] ? /^(on|1|sim|ativar|ligar)$/i.test(ctx.args[0]) : !atual;
    DB.salvarGrupo(ctx.chatId, { [campo]: valor });
    ctx.responder(`${nome} agora esta ${valor ? "ATIVADO" : "DESATIVADO"}.`, valor ? "sucesso" : "aviso");
  };
}

module.exports = [
  c("abrir", "admin", "Abre o grupo (todos falam)", async (ctx) => {
    await ctx.sock.groupSettingUpdate(ctx.chatId, "not_announcement");
    ctx.responder("Grupo ABERTO. Todos podem enviar mensagens.", "sucesso");
  }, { admin: true, grupo: true, botAdmin: true, aliases: ["desmutargrupo"] }),

  c("fechar", "admin", "Fecha o grupo (so admins falam)", async (ctx) => {
    await ctx.sock.groupSettingUpdate(ctx.chatId, "announcement");
    ctx.responder("Grupo FECHADO. Apenas admins falam.", "aviso");
  }, { admin: true, grupo: true, botAdmin: true, aliases: ["mutargrupo"] }),

  c("promover", "admin", "Promove membro a admin", async (ctx) => {
    const numero = alvoNumero(ctx);
    if (!numero) return ctx.responder("Uso: /promover @membro ou /promover numero", "aviso");
    const jid = U.jidDeNumero(numero);
    await ctx.sock.groupParticipantsUpdate(ctx.chatId, [jid], "promote");
    E.invalidarMeta(ctx.chatId);
    ctx.responder(`@${numero} agora e ADMIN.`, "sucesso");
  }, { admin: true, grupo: true, botAdmin: true, aliases: ["promote"] }),

  c("rebaixar", "admin", "Remove admin de um membro", async (ctx) => {
    const numero = alvoNumero(ctx);
    if (!numero) return ctx.responder("Uso: /rebaixar @membro", "aviso");
    const jid = U.jidDeNumero(numero);
    await ctx.sock.groupParticipantsUpdate(ctx.chatId, [jid], "demote");
    E.invalidarMeta(ctx.chatId);
    ctx.responder(`@${numero} nao e mais admin.`, "aviso");
  }, { admin: true, grupo: true, botAdmin: true, aliases: ["demote"] }),

  c("banir", "admin", "Remove um membro do grupo", async (ctx) => {
    const numero = alvoNumero(ctx);
    if (!numero) return ctx.responder("Uso: /banir @membro", "aviso");
    await ctx.sock.groupParticipantsUpdate(ctx.chatId, [U.jidDeNumero(numero)], "remove");
    E.invalidarMeta(ctx.chatId);
    ctx.responder(`@${numero} foi removido.`, "ban");
  }, { admin: true, grupo: true, botAdmin: true, aliases: ["expulsar", "remover", "kick", "ban"] }),

  c("adicionar", "admin", "Adiciona um membro ao grupo", async (ctx) => {
    const numero = alvoNumero(ctx);
    if (!numero) return ctx.responder("Uso: /adicionar <numero>", "aviso");
    const r = await ctx.sock.groupParticipantsUpdate(ctx.chatId, [U.jidDeNumero(numero)], "add");
    E.invalidarMeta(ctx.chatId);
    const status = r?.[0]?.status;
    ctx.responder(status === "200" ? `@${numero} adicionado.` : `Nao foi possivel adicionar @${numero} (status ${status}).`, status === "200" ? "sucesso" : "erro");
  }, { admin: true, grupo: true, botAdmin: true, aliases: ["addmembro"] }),

  c("antilink", "admin", "Liga/desliga o antilink", toggle("antilink", "Antilink"), { admin: true, grupo: true }),

  c("antispam", "admin", "Liga/desliga o antispam", toggle("antispam", "Antispam"), { admin: true, grupo: true }),

  c("antifake", "admin", "Liga/desliga o antifake", toggle("antifake", "Antifake"), { admin: true, grupo: true }),

  c("bemvindo", "admin", "Liga/desliga boas-vindas", toggle("bemvindo", "Boas-vindas"), { admin: true, grupo: true, aliases: ["welcome"] }),

  c("adeus", "admin", "Liga/desliga despedida", toggle("adeus", "Despedida"), { admin: true, grupo: true, aliases: ["despedida"] }),

  c("setbemvindo", "admin", "Define a mensagem de boas-vindas", (ctx) => {
    if (!ctx.texto) return ctx.responder("Uso: /setbemvindo sua mensagem (@user e {grupo})", "aviso");
    DB.salvarGrupo(ctx.chatId, { mensagemBemvindo: ctx.texto, bemvindo: true });
    ctx.responder("Mensagem de boas-vindas definida.", "sucesso");
  }, { admin: true, grupo: true }),

  c("setadeus", "admin", "Define a mensagem de despedida", (ctx) => {
    if (!ctx.texto) return ctx.responder("Uso: /setadeus sua mensagem (@user e {grupo})", "aviso");
    DB.salvarGrupo(ctx.chatId, { mensagemAdeus: ctx.texto, adeus: true });
    ctx.responder("Mensagem de despedida definida.", "sucesso");
  }, { admin: true, grupo: true }),

  c("setregras", "admin", "Define as regras do grupo", (ctx) => {
    if (!ctx.texto) return ctx.responder("Uso: /setregras <texto>", "aviso");
    DB.salvarGrupo(ctx.chatId, { regras: ctx.texto });
    ctx.responder("Regras atualizadas. Use /regras para ver.", "sucesso");
  }, { admin: true, grupo: true }),

  c("addpalavra", "admin", "Adiciona palavra proibida", (ctx) => {
    if (!ctx.texto) return ctx.responder("Uso: /addpalavra <palavra>", "aviso");
    const g = ctx.dadosGrupo || {};
    const palavras = Array.from(new Set([...(g.palavras || []), ctx.texto.toLowerCase()]));
    DB.salvarGrupo(ctx.chatId, { palavras });
    ctx.responder(`Palavra "${ctx.texto}" adicionada a lista negra.`, "sucesso");
  }, { admin: true, grupo: true, aliases: ["addproibida"] }),

  c("delpalavra", "admin", "Remove palavra proibida", (ctx) => {
    const g = ctx.dadosGrupo || {};
    const palavras = (g.palavras || []).filter((p) => p !== (ctx.texto || "").toLowerCase());
    DB.salvarGrupo(ctx.chatId, { palavras });
    ctx.responder(`Palavra removida.`, "aviso");
  }, { admin: true, grupo: true, aliases: ["delproibida"] }),

  c("listarpalavras", "admin", "Lista palavras proibidas", (ctx) => {
    ctx.responder(`*Palavras proibidas*\n${(ctx.dadosGrupo?.palavras || []).join(", ") || "nenhuma"}`, "info");
  }, { admin: true, grupo: true, aliases: ["palavras"] }),

  c("marcar", "admin", "Marca todos os membros", async (ctx) => {
    if (!ctx.metadados) return ctx.responder("So em grupos.", "aviso");
    const membros = ctx.metadados.participants.map((p) => p.id);
    await ctx.sock.sendMessage(ctx.chatId, { text: `Atencao! ${ctx.texto || ""}`, mentions: membros });
  }, { admin: true, grupo: true, aliases: ["todos", "marcartodos", "@todos"] }),

  c("link", "admin", "Obtem o link de convite do grupo", async (ctx) => {
    const codigo = await ctx.sock.groupInviteCode(ctx.chatId);
    ctx.responder(`Link do grupo:\nhttps://chat.whatsapp.com/${codigo}`, "info");
  }, { admin: true, grupo: true, botAdmin: true, aliases: ["linkgp", "convitegrupo"] }),

  c("revogar", "admin", "Revoga o link de convite atual", async (ctx) => {
    const codigo = await ctx.sock.groupRevokeInvite(ctx.chatId);
    ctx.responder(`Novo link gerado:\nhttps://chat.whatsapp.com/${codigo}`, "aviso");
  }, { admin: true, grupo: true, botAdmin: true, aliases: ["revogarlink", "novolink"] }),

  c("setnome", "admin", "Muda o nome do grupo", async (ctx) => {
    if (!ctx.texto) return ctx.responder("Uso: /setnome <nome>", "aviso");
    await ctx.sock.groupUpdateSubject(ctx.chatId, ctx.texto);
    E.invalidarMeta(ctx.chatId);
    ctx.responder("Nome do grupo atualizado.", "sucesso");
  }, { admin: true, grupo: true, botAdmin: true, aliases: ["nomedogrupo"] }),

  c("setdesc", "admin", "Muda a descricao do grupo", async (ctx) => {
    if (!ctx.texto) return ctx.responder("Uso: /setdesc <descricao>", "aviso");
    await ctx.sock.groupUpdateDescription(ctx.chatId, ctx.texto);
    ctx.responder("Descricao atualizada.", "sucesso");
  }, { admin: true, grupo: true, botAdmin: true, aliases: ["descricao"] }),

  c("warn", "admin", "Adverte um membro", async (ctx) => {
    const numero = alvoNumero(ctx);
    if (!numero) return ctx.responder("Uso: /warn @membro [motivo]", "aviso");
    const jid = U.jidDeNumero(numero);
    const u = DB.usuario(jid);
    u.avisos = (u.avisos || 0) + 1;
    const max = ctx.dadosGrupo?.maxAvisos || 3;
    DB.salvarUsuario(jid, { avisos: u.avisos });
    if (u.avisos >= max && ctx.botAdmin) {
      await ctx.sock.groupParticipantsUpdate(ctx.chatId, [jid], "remove");
      u.avisos = 0;
      DB.salvarUsuario(jid, { avisos: 0 });
      return ctx.responder(`@${numero} atingiu ${max} avisos e foi removido.`, "ban");
    }
    ctx.responder(`@${numero} advertido (${u.avisos}/${max}).${ctx.texto ? `\nMotivo: ${ctx.texto}` : ""}`, "aviso");
  }, { admin: true, grupo: true, aliases: ["advertir"] }),

  c("unwarn", "admin", "Remove uma advertencia", (ctx) => {
    const numero = alvoNumero(ctx);
    if (!numero) return ctx.responder("Uso: /unwarn @membro", "aviso");
    const jid = U.jidDeNumero(numero);
    const u = DB.usuario(jid);
    u.avisos = Math.max(0, (u.avisos || 0) - 1);
    DB.salvarUsuario(jid, { avisos: u.avisos });
    ctx.responder(`@${numero} agora tem ${u.avisos} aviso(s).`, "sucesso");
  }, { admin: true, grupo: true }),

  c("resetwarn", "admin", "Zera as advertencias de um membro", (ctx) => {
    const numero = alvoNumero(ctx);
    if (!numero) return ctx.responder("Uso: /resetwarn @membro", "aviso");
    DB.salvarUsuario(U.jidDeNumero(numero), { avisos: 0 });
    ctx.responder(`Advertencias de @${numero} zeradas.`, "sucesso");
  }, { admin: true, grupo: true }),

  c("listwarn", "admin", "Lista advertencias do grupo", (ctx) => {
    const us = Object.entries(DB.usuarios()).filter(([, u]) => (u.avisos || 0) > 0);
    ctx.responder(`*Advertencias*\n${us.map(([j, u]) => `${j.split("@")[0]}: ${u.avisos}`).join("\n") || "nenhuma"}`, "info");
  }, { admin: true, grupo: true, aliases: ["avisos", "listaravisos"] }),

  c("setmaxwarn", "admin", "Define o maximo de avisos", (ctx) => {
    const n = parseInt(ctx.args[0] || "3", 10);
    DB.salvarGrupo(ctx.chatId, { maxAvisos: n });
    ctx.responder(`Maximo de avisos: ${n}`, "sucesso");
  }, { admin: true, grupo: true }),

  c("mute", "admin", "Silencia um membro por X minutos", (ctx) => {
    const numero = alvoNumero(ctx);
    const min = parseInt(ctx.args[ctx.mencionados[0] ? 0 : 1] || "10", 10);
    if (!numero) return ctx.responder("Uso: /mute @membro <min>", "aviso");
    E.setMute(ctx.chatId, U.jidDeNumero(numero), min * 60000);
    ctx.responder(`@${numero} silenciado por ${min} min.`, "aviso");
  }, { admin: true, grupo: true, aliases: ["silenciar"] }),

  c("desmute", "admin", "Remove o silencio de um membro", (ctx) => {
    const numero = alvoNumero(ctx);
    if (!numero) return ctx.responder("Uso: /desmute @membro", "aviso");
    E.desmutar(ctx.chatId, U.jidDeNumero(numero));
    ctx.responder(`@${numero} pode falar novamente.`, "sucesso");
  }, { admin: true, grupo: true, aliases: ["dessilenciar"] }),

  c("enquete", "admin", "Cria uma enquete", async (ctx) => {
    const partes = ctx.textoCompleto.split("|").map((s) => s.trim()).filter(Boolean);
    if (partes.length < 3) return ctx.responder("Uso: /enquete Pergunta | Opcao1 | Opcao2", "aviso");
    await ctx.sock.sendMessage(ctx.chatId, {
      poll: { name: partes[0], values: partes.slice(1), selectableCount: 1 }
    });
  }, { admin: true, grupo: true, aliases: ["votacao", "poll"] }),

  c("d", "admin", "Apaga a mensagem respondida", async (ctx) => {
    const info = ctx.msg.message.extendedTextMessage?.contextInfo || ctx.msg.message.imageMessage?.contextInfo || {};
    if (!info.stanzaId) return ctx.responder("Responda a uma mensagem com /d para apaga-la.", "aviso");
    const meuNumero = U.numeroDeJid(jidNormalizedUser(ctx.sock.user?.id || ""));
    const chave = { remoteJid: ctx.chatId, id: info.stanzaId };
    if (info.participant) {
      if (U.numeroDeJid(info.participant) === meuNumero) chave.fromMe = true;
      else chave.participant = info.participant;
    }
    const ok = await ctx.deletar(chave);
    if (ok) ctx.reagir("🗑️");
    else ctx.responder("Nao consegui apagar (preciso ser admin).", "erro");
  }, { admin: true, grupo: true, botAdmin: true, aliases: ["apagar", "delete"] }),

  c("dclear", "admin", "Apaga as ultimas N mensagens do bot", async (ctx) => {
    const n = Math.min(parseInt(ctx.args[0] || "5", 10), 20);
    const meuNumero = U.numeroDeJid(jidNormalizedUser(ctx.sock.user?.id || ""));
    const recentes = E.ultimosRecentes(ctx.chatId).filter((r) => U.numeroDeJid(r.jid) === meuNumero).slice(-n);
    let ok = 0;
    for (const r of recentes) {
      if (await ctx.deletar({ remoteJid: ctx.chatId, id: r.id, fromMe: true })) ok++;
    }
    ctx.reagir("🧹");
    if (!ok) ctx.responder("Nao consegui apagar as mensagens (preciso ser admin).", "erro");
  }, { admin: true, grupo: true, botAdmin: true, aliases: ["limpar"] }),

  c("marcaradmins", "admin", "Marca apenas os admins", async (ctx) => {
    if (!ctx.metadados) return ctx.responder("So em grupos.", "aviso");
    const admins = ctx.metadados.participants.filter((p) => p.admin).map((p) => p.id);
    await ctx.sock.sendMessage(ctx.chatId, { text: `Atencao admins! ${ctx.texto || ""}`, mentions: admins });
  }, { admin: true, grupo: true, aliases: ["adms"] }),

  c("promovertodos", "admin", "Promove varios membros marcados", async (ctx) => {
    if (!ctx.mencionados.length) return ctx.responder("Marque os membros a promover.", "aviso");
    for (const jid of ctx.mencionados) {
      try { await ctx.sock.groupParticipantsUpdate(ctx.chatId, [jid], "promote"); } catch (_) {}
    }
    E.invalidarMeta(ctx.chatId);
    ctx.responder(`${ctx.mencionados.length} membro(s) promovido(s).`, "sucesso");
  }, { admin: true, grupo: true, botAdmin: true }),

  c("rebaixartodos", "admin", "Rebaixa varios membros marcados", async (ctx) => {
    if (!ctx.mencionados.length) return ctx.responder("Marque os membros a rebaixar.", "aviso");
    for (const jid of ctx.mencionados) {
      try { await ctx.sock.groupParticipantsUpdate(ctx.chatId, [jid], "demote"); } catch (_) {}
    }
    E.invalidarMeta(ctx.chatId);
    ctx.responder(`${ctx.mencionados.length} membro(s) rebaixado(s).`, "aviso");
  }, { admin: true, grupo: true, botAdmin: true }),

  c("aceitarlink", "admin", "Permite membros verem o link", (ctx) => {
    DB.salvarGrupo(ctx.chatId, { linkVisivel: true });
    ctx.responder("Link liberado para membros.", "sucesso");
  }, { admin: true, grupo: true }),

  c("negar", "admin", "Restringe o link apenas a admins", (ctx) => {
    DB.salvarGrupo(ctx.chatId, { linkVisivel: false });
    ctx.responder("Link restrito a admins.", "aviso");
  }, { admin: true, grupo: true })
];
