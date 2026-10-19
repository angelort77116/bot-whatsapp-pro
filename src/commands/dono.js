const { c } = require("./_helper");
const { DONO_NUMERO, NOME_BOT } = require("../../config");
const DB = require("../database");
const U = require("../utils");
const E = require("../lib/estado");

function separarAlvo(ctx) {
  const args = [...ctx.args];
  if (args[0] && args[0].includes("@g.us")) return { id: args.shift(), resto: args };
  if (ctx.isGrupo) return { id: ctx.chatId, resto: args };
  return { id: args.shift(), resto: args };
}

async function nomeDoGrupo(sock, id) {
  try {
    const meta = await sock.groupMetadata(id);
    return meta.subject || id;
  } catch (_) {
    return DB.grupo(id)?.nome || id;
  }
}

async function ativarGrupo(ctx, vip) {
  const { id, resto } = separarAlvo(ctx);
  if (!id || !id.includes("@g.us")) return ctx.responder("Informe o ID do grupo (ex: /addgrupo 123@g.us 30 dias).", "erro");
  const dur = U.interpretarDuracao(resto.join(" ")) || { permanente: false, ms: 30 * 86400000 };
  const agora = Date.now();
  const nome = await nomeDoGrupo(ctx.sock, id);
  const base = {
    nome,
    ativo: true,
    registradoPor: ctx.numero,
    atualizadoEm: agora
  };
  if (dur.permanente) {
    base.permanente = true;
    base.expiraEm = null;
  } else {
    base.permanente = false;
    base.expiraEm = agora + dur.ms;
  }
  if (vip) {
    base.vip = true;
    base.vipPermanente = !!dur.permanente;
    base.vipExpiraEm = dur.permanente ? null : agora + dur.ms;
  }
  DB.salvarGrupo(id, base);
  const tipo = vip ? "VIP" : "";
  const tempo = dur.permanente ? "PERMANENTE" : U.formatarDuracao(dur.ms);
  return ctx.responder(
    `Grupo adicionado${tipo ? " (" + tipo + ")" : ""}!\nGrupo: ${nome}\nID: ${id}\nDuracao: ${tempo}\nExpira em: ${dur.permanente ? "nunca" : U.formatarData(base.expiraEm)}`,
    "sucesso"
  );
}

module.exports = [
  c("addgrupo", "dono", "Ativa um grupo por X dias ou permanente", (ctx) => ativarGrupo(ctx, false), { dono: true, aliases: ["addgp", "ativargrupo"] }),

  c("addgrupo-vip", "dono", "Ativa um grupo como VIP por X dias ou permanente", (ctx) => ativarGrupo(ctx, true), { dono: true, aliases: ["addvipgrupo", "vipgrupo"] }),

  c("renovargrupo", "dono", "Renova o tempo de um grupo ativo", async (ctx) => {
    const { id, resto } = separarAlvo(ctx);
    const g = DB.grupo(id);
    if (!g) return ctx.responder("Grupo nao esta ativo. Use /addgrupo primeiro.", "erro");
    const dur = U.interpretarDuracao(resto.join(" "));
    if (!dur) return ctx.responder("Uso: /renovargrupo <tempo> (ex: 30 dias)", "aviso");
    if (dur.permanente) {
      DB.salvarGrupo(id, { permanente: true, expiraEm: null, ativo: true });
      return ctx.responder("Grupo renovado para PERMANENTE.", "sucesso");
    }
    const base = g.permanente ? Date.now() : Math.max(Date.now(), g.expiraEm || Date.now());
    DB.salvarGrupo(id, { permanente: false, ativo: true, expiraEm: base + dur.ms });
    ctx.responder(`Grupo renovado por ${U.formatarDuracao(dur.ms)}.\nExpira: ${U.formatarData(base + dur.ms)}`, "sucesso");
  }, { dono: true, aliases: ["renovar"] }),

  c("tornarpermanente", "dono", "Deixa o grupo permanente", (ctx) => {
    const { id } = separarAlvo(ctx);
    if (!DB.grupo(id)) return ctx.responder("Grupo nao ativo.", "erro");
    DB.salvarGrupo(id, { permanente: true, expiraEm: null, ativo: true });
    ctx.responder("Grupo agora e PERMANENTE.", "sucesso");
  }, { dono: true }),

  c("delgrupo", "dono", "Desativa um grupo", (ctx) => {
    const { id } = separarAlvo(ctx);
    if (!DB.grupo(id)) return ctx.responder("Grupo nao encontrado.", "erro");
    DB.salvarGrupo(id, { ativo: false, expiraEm: Date.now() - 1, permanente: false });
    ctx.responder(`Grupo ${id} desativado.`, "aviso");
  }, { dono: true, aliases: ["removegrupo", "desativargrupo", "removergrupo"] }),

  c("listargrupos", "dono", "Lista grupos ativos", (ctx) => {
    const grupos = Object.entries(DB.grupos()).filter(([, g]) => g.ativo);
    if (!grupos.length) return ctx.responder("Nenhum grupo ativo.", "aviso");
    let texto = `*GRUPOS ATIVOS (${grupos.length})*\n`;
    for (const [id, g] of grupos) {
      const rest = g.permanente ? "permanente" : U.formatarDuracao((g.expiraEm || 0) - Date.now());
      texto += `\n${g.nome || id}\n${id}\nVIP: ${g.vip ? "sim" : "nao"} | Resta: ${rest}\n`;
    }
    ctx.responder(texto.slice(0, 900), "info");
    if (texto.length > 900) ctx.responderTexto(texto);
  }, { dono: true, aliases: ["grupos", "listagrupo"] }),

  c("infogrupo", "dono", "Detalhes de um grupo ativo", (ctx) => {
    const { id } = separarAlvo(ctx);
    const g = DB.grupo(id);
    if (!g) return ctx.responder("Grupo nao encontrado.", "erro");
    ctx.responder(
      `*${g.nome || id}*\nID: ${id}\nAtivo: ${g.ativo}\nPermanente: ${g.permanente ? "sim" : "nao"}\nExpira: ${g.permanente ? "nunca" : U.formatarData(g.expiraEm)}\nVIP: ${g.vip ? "sim" : "nao"}\nAntilink: ${g.antilink ? "on" : "off"}\nAntispam: ${g.antispam ? "on" : "off"}\nBemvindo: ${g.bemvindo ? "on" : "off"}\nRegistrado por: ${g.registradoPor}`,
      "info"
    );
  }, { dono: true, aliases: ["detalhesgrupo"] }),

  c("setvip", "dono", "Torna o grupo VIP por X tempo", async (ctx) => {
    const { id, resto } = separarAlvo(ctx);
    if (!DB.grupo(id)) return ctx.responder("Ative o grupo primeiro com /addgrupo.", "erro");
    const dur = U.interpretarDuracao(resto.join(" ")) || { permanente: false, ms: 30 * 86400000 };
    const dados = { vip: true, vipPermanente: !!dur.permanente, vipExpiraEm: dur.permanente ? null : Date.now() + dur.ms };
    DB.salvarGrupo(id, dados);
    ctx.responder(`Grupo ${await nomeDoGrupo(ctx.sock, id)} agora e VIP (${dur.permanente ? "permanente" : U.formatarDuracao(dur.ms)}).`, "vip");
  }, { dono: true, aliases: ["vipset"] }),

  c("remvip", "dono", "Remove o VIP do grupo", (ctx) => {
    const { id } = separarAlvo(ctx);
    if (!DB.grupo(id)) return ctx.responder("Grupo nao encontrado.", "erro");
    DB.salvarGrupo(id, { vip: false, vipPermanente: false, vipExpiraEm: null });
    ctx.responder("VIP removido do grupo.", "aviso");
  }, { dono: true, aliases: ["delvip"] }),

  c("addvip", "dono", "Da VIP a um usuario por X tempo", (ctx) => {
    const numero = U.apenasDigitos(ctx.args[0] || "");
    if (!numero) return ctx.responder("Uso: /addvip <numero> <tempo>", "aviso");
    const dur = U.interpretarDuracao(ctx.args.slice(1).join(" ")) || { permanente: false, ms: 30 * 86400000 };
    const jid = U.jidDeNumero(numero);
    DB.salvarUsuario(jid, { vip: true, vipPermanente: !!dur.permanente, vipExpiraEm: dur.permanente ? null : Date.now() + dur.ms });
    ctx.responder(`Usuario ${numero} agora e VIP (${dur.permanente ? "permanente" : U.formatarDuracao(dur.ms)}).`, "vip");
  }, { dono: true, aliases: ["addvipuser"] }),

  c("remvipuser", "dono", "Remove VIP de um usuario", (ctx) => {
    const numero = U.apenasDigitos(ctx.args[0] || "");
    if (!numero) return ctx.responder("Uso: /remvipuser <numero>", "aviso");
    DB.salvarUsuario(U.jidDeNumero(numero), { vip: false, vipExpiraEm: null });
    ctx.responder(`VIP removido de ${numero}.`, "aviso");
  }, { dono: true, aliases: ["delvipuser"] }),

  c("listarvip", "dono", "Lista VIPs (grupos e usuarios)", (ctx) => {
    const grupos = Object.entries(DB.grupos()).filter(([, g]) => g.vip && g.ativo);
    const usuarios = Object.entries(DB.usuarios()).filter(([, u]) => u.vip);
    let texto = "*VIP GRUPOS*\n";
    texto += grupos.map(([id, g]) => `${g.nome || id} - ${g.vipPermanente ? "permanente" : U.formatarDuracao((g.vipExpiraEm || 0) - Date.now())}`).join("\n") || "nenhum";
    texto += "\n\n*VIP USUARIOS*\n";
    texto += usuarios.map(([jid, u]) => `${jid.split("@")[0]} - ${u.vipPermanente ? "permanente" : U.formatarDuracao((u.vipExpiraEm || 0) - Date.now())}`).join("\n") || "nenhum";
    ctx.responder(texto.slice(0, 900), "vip");
  }, { dono: true, aliases: ["vips"] }),

  c("adddono", "dono", "Adiciona um dono adicional", (ctx) => {
    const numero = U.apenasDigitos(ctx.args[0] || "");
    if (!numero) return ctx.responder("Uso: /adddono <numero>", "aviso");
    const extras = DB.extras();
    extras.donos = Array.from(new Set([...(extras.donos || []), numero]));
    DB.salvarExtra({ donos: extras.donos });
    ctx.responder(`Dono ${numero} adicionado.`, "sucesso");
  }, { dono: true }),

  c("remdono", "dono", "Remove um dono adicional", (ctx) => {
    const numero = U.apenasDigitos(ctx.args[0] || "");
    const extras = DB.extras();
    extras.donos = (extras.donos || []).filter((d) => d !== numero);
    DB.salvarExtra({ donos: extras.donos });
    ctx.responder(`Dono ${numero} removido.`, "aviso");
  }, { dono: true }),

  c("listardono", "dono", "Lista donos", (ctx) => {
    const extras = DB.extras().donos || [];
    ctx.responder(`*DONOS*\nPrincipal: ${DONO_NUMERO}\nAdicionais: ${extras.join(", ") || "nenhum"}`, "info");
  }, { dono: true, aliases: ["donos"] }),

  c("block", "dono", "Bloqueia um usuario do bot", (ctx) => {
    const numero = U.apenasDigitos(ctx.args[0] || "") || (ctx.mencionados[0] && U.numeroDeJid(ctx.mencionados[0]));
    if (!numero) return ctx.responder("Uso: /block <numero> ou marque alguem", "aviso");
    const extras = DB.extras();
    extras.bloqueados = Array.from(new Set([...(extras.bloqueados || []), numero]));
    DB.salvarExtra({ bloqueados: extras.bloqueados });
    ctx.responder(`Usuario ${numero} bloqueado.`, "aviso");
  }, { dono: true, aliases: ["bloquear"] }),

  c("unblock", "dono", "Desbloqueia um usuario", (ctx) => {
    const numero = U.apenasDigitos(ctx.args[0] || "");
    const extras = DB.extras();
    extras.bloqueados = (extras.bloqueados || []).filter((b) => b !== numero);
    DB.salvarExtra({ bloqueados: extras.bloqueados });
    ctx.responder(`Usuario ${numero} desbloqueado.`, "sucesso");
  }, { dono: true, aliases: ["desbloquear"] }),

  c("listablock", "dono", "Lista bloqueados", (ctx) => {
    ctx.responder(`Bloqueados: ${(DB.extras().bloqueados || []).join(", ") || "nenhum"}`, "info");
  }, { dono: true, aliases: ["bloqueados"] }),

  c("setprefix", "dono", "Define os prefixos do bot", (ctx) => {
    const p = ctx.texto.replace(/\s/g, "").split("");
    if (!p.length) return ctx.responder("Uso: /setprefix /!", "aviso");
    DB.salvarExtra({ prefixos: p });
    ctx.responder(`Prefixos definidos: ${p.join(" ")}`, "sucesso");
  }, { dono: true }),

  c("setnomebot", "dono", "Muda o nome do bot", (ctx) => {
    if (!ctx.texto) return ctx.responder("Uso: /setnomebot <nome>", "aviso");
    DB.salvarExtra({ nomeBot: ctx.texto });
    ctx.responder(`Nome do bot: ${ctx.texto}`, "sucesso");
  }, { dono: true }),

  c("config", "dono", "Mostra configuracoes atuais", (ctx) => {
    const extras = DB.extras();
    ctx.responder(`*CONFIG*\nPrefixo: ${(extras.prefixos || ["/"]).join(" ")}\nNome: ${extras.nomeBot || NOME_BOT}\nDonos extra: ${(extras.donos || []).length}\nBloqueados: ${(extras.bloqueados || []).length}`, "info");
  }, { dono: true }),

  c("broadcast", "dono", "Envia mensagem a todos os grupos ativos", async (ctx) => {
    if (!ctx.texto) return ctx.responder("Uso: /broadcast <mensagem>", "aviso");
    const grupos = Object.entries(DB.grupos()).filter(([, g]) => g.ativo && (g.permanente || (g.expiraEm || 0) > Date.now()));
    let ok = 0;
    for (const [id] of grupos) {
      try {
        await ctx.sock.sendMessage(id, { text: `*AVISO DO DONO*\n\n${ctx.texto}` });
        ok++;
      } catch (_) {}
    }
    ctx.responder(`Broadcast enviado para ${ok}/${grupos.length} grupos.`, "sucesso");
  }, { dono: true, aliases: ["avisartodos"] }),

  c("sair", "dono", "Faz o bot sair do grupo", async (ctx) => {
    if (!ctx.isGrupo) return ctx.responder("So em grupos.", "aviso");
    await ctx.responder("Saindo do grupo...", "aviso");
    try {
      await ctx.sock.groupLeave(ctx.chatId);
    } catch (e) {
      ctx.responder(`Falha ao sair: ${e.message}`, "erro");
    }
  }, { dono: true, aliases: ["sairgrupo"] }),

  c("entrar", "dono", "Entra em um grupo por link", async (ctx) => {
    const link = ctx.args[0] || "";
    const codigo = (link.match(/([A-Za-z0-9]{15,})/) || [])[1];
    if (!codigo) return ctx.responder("Uso: /entrar https://chat.whatsapp.com/CODIGO", "aviso");
    try {
      await ctx.sock.groupAcceptInvite(codigo);
      ctx.responder("Entrei no grupo com sucesso!", "sucesso");
    } catch (e) {
      ctx.responder(`Nao consegui entrar: ${e.message}`, "erro");
    }
  }, { dono: true, aliases: ["join"] }),

  c("sincronizar", "dono", "Lista todos os grupos que o bot participa", async (ctx) => {
    try {
      const grupos = await ctx.sock.groupFetchAllParticipating();
      const lista = Object.values(grupos);
      let texto = `*GRUPOS DO BOT (${lista.length})*\n`;
      for (const g of lista) texto += `\n${g.subject}\n${g.id}\n`;
      ctx.responder(texto.slice(0, 900), "info");
      if (texto.length > 900) ctx.responderTexto(texto);
    } catch (e) {
      ctx.responder(`Erro: ${e.message}`, "erro");
    }
  }, { dono: true, aliases: ["meusgrupos"] }),

  c("salvardb", "dono", "Salva o banco de dados em disco", (ctx) => {
    DB.salvarTudo();
    ctx.responder("Banco de dados salvo.", "sucesso");
  }, { dono: true, aliases: ["salvar"] }),

  c("limpargrupo", "dono", "Reseta as configuracoes do grupo atual", (ctx) => {
    if (!ctx.isGrupo) return ctx.responder("So em grupos.", "aviso");
    DB.salvarGrupo(ctx.chatId, {
      antilink: false,
      antispam: false,
      antifake: false,
      bemvindo: false,
      adeus: false,
      palavras: [],
      regras: ""
    });
    ctx.responder("Configuracoes do grupo resetadas.", "aviso");
  }, { dono: true, aliases: ["resetgrupo"] }),

  c("forcerrank", "dono", "Mostra o ranking interno", (ctx) => {
    const us = Object.entries(DB.usuarios()).sort((a, b) => (b[1].xp || 0) - (a[1].xp || 0)).slice(0, 10);
    ctx.responder(us.map(([j, u], i) => `${i + 1}. ${j.split("@")[0]} - ${u.xp || 0}`).join("\n") || "vazio", "info");
  }, { dono: true }),

  c("resetxp", "dono", "Zera o XP de um usuario", (ctx) => {
    const numero = U.apenasDigitos(ctx.args[0] || "");
    if (!numero) return ctx.responder("Uso: /resetxp <numero>", "aviso");
    DB.salvarUsuario(U.jidDeNumero(numero), { xp: 0, nivel: 1 });
    ctx.responder(`XP de ${numero} zerado.`, "aviso");
  }, { dono: true }),

  c("addxp", "dono", "Adiciona XP a um usuario", (ctx) => {
    const numero = U.apenasDigitos(ctx.args[0] || "");
    const qtd = parseInt(ctx.args[1] || "0", 10);
    if (!numero || !qtd) return ctx.responder("Uso: /addxp <numero> <qtd>", "aviso");
    const u = DB.usuario(U.jidDeNumero(numero));
    DB.salvarUsuario(U.jidDeNumero(numero), { xp: (u.xp || 0) + qtd });
    ctx.responder(`+${qtd} XP para ${numero}.`, "sucesso");
  }, { dono: true }),

  c("dadoinv", "dono", "Mostra o tamanho do banco de dados", (ctx) => {
    const g = Object.keys(DB.grupos()).length;
    const u = Object.keys(DB.usuarios()).length;
    ctx.responder(`Grupos salvos: ${g}\nUsuarios salvos: ${u}`, "info");
  }, { dono: true })
];
