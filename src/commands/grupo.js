const { c, nivelDe, xpParaProximo } = require("./_helper");
const DB = require("../database");
const U = require("../utils");

function darXp(jid, qtd) {
  const u = DB.usuario(jid);
  const novo = Math.max(0, (u.xp || 0) + qtd);
  DB.salvarUsuario(jid, { xp: novo, nivel: nivelDe(novo) });
  return novo;
}

module.exports = [
  c("statusgp", "grupo", "Tempo de ativacao do grupo", (ctx) => {
    const g = ctx.dadosGrupo;
    if (!g) return ctx.responder("Grupo nao registrado. Peca ao dono (/addgrupo).", "aviso");
    const rest = g.permanente ? "permanente" : U.formatarDuracao((g.expiraEm || 0) - Date.now());
    ctx.responder(`*STATUS DO GRUPO*\nAtivo: ${g.ativo ? "sim" : "nao"}\nTempo restante: ${rest}\nVIP: ${g.vip ? "sim" : "nao"}`, "info");
  }, { grupo: true, aliases: ["ativogp", "checkgp"] }),

  c("niveisgp", "grupo", "Ranking de niveis no grupo", (ctx) => {
    if (!ctx.metadados) return ctx.responder("So em grupos.", "aviso");
    const ids = ctx.metadados.participants.map((p) => p.id);
    const lista = Object.entries(DB.usuarios()).filter(([jid]) => ids.includes(jid))
      .sort((a, b) => (b[1].xp || 0) - (a[1].xp || 0)).slice(0, 10);
    let texto = "*NIVEIS DO GRUPO*\n";
    lista.forEach(([jid, u], i) => (texto += `${i + 1}. ${jid.split("@")[0]} - Nv ${nivelDe(u.xp)} (${u.xp || 0} XP)\n`));
    ctx.responder(texto || "Sem dados ainda.", "info");
  }, { grupo: true, aliases: ["rankgp"] }),

  c("membrosgp", "grupo", "Lista membros com indice", (ctx) => {
    if (!ctx.metadados) return ctx.responder("So em grupos.", "aviso");
    const lista = ctx.metadados.participants.map((p, i) => `${i + 1}. ${p.id.split("@")[0]}${p.admin ? " [ADM]" : ""}`).join("\n");
    ctx.responder(`*MEMBROS*\n${lista}`.slice(0, 900), "info");
  }, { grupo: true, aliases: ["membros"] }),

  c("adminlist", "grupo", "Lista os admins", (ctx) => {
    if (!ctx.metadados) return ctx.responder("So em grupos.", "aviso");
    const admins = ctx.metadados.participants.filter((p) => p.admin).map((p) => p.id.split("@")[0]);
    ctx.responder(`*ADMINS (${admins.length})*\n${admins.join("\n") || "nenhum"}`, "info");
  }, { grupo: true, aliases: ["admlist"] }),

  c("denunciar", "grupo", "Denuncia um membro aos admins", async (ctx) => {
    if (!ctx.texto) return ctx.responder("Uso: /denunciar @membro motivo", "aviso");
    if (!ctx.metadados) return ctx.responder("So em grupos.", "aviso");
    const admins = ctx.metadados.participants.filter((p) => p.admin).map((p) => p.id);
    await ctx.sock.sendMessage(ctx.chatId, {
      text: `*DENUNCIA*\nDe: @${ctx.numero}\nMotivo: ${ctx.texto}`,
      mentions: [...admins, ctx.remetenteJid]
    });
  }, { grupo: true }),

  c("pediradmin", "grupo", "Pede para ser promovido a admin", async (ctx) => {
    if (!ctx.metadados) return ctx.responder("So em grupos.", "aviso");
    const admins = ctx.metadados.participants.filter((p) => p.admin).map((p) => p.id);
    await ctx.sock.sendMessage(ctx.chatId, {
      text: `@${ctx.numero} esta pedindo para ser ADMIN. Justificativa: ${ctx.texto || "nenhuma"}`,
      mentions: [...admins, ctx.remetenteJid]
    });
  }, { grupo: true }),

  c("sugestaogp", "grupo", "Envia sugestao ao grupo", async (ctx) => {
    if (!ctx.texto) return ctx.responder("Uso: /sugestaogp <texto>", "aviso");
    await ctx.sock.sendMessage(ctx.chatId, { image: null, text: `*SUGESTAO*\nPor @${ctx.numero}:\n\n${ctx.texto}` }).catch(async () => {
      await ctx.sock.sendMessage(ctx.chatId, { text: `*SUGESTAO*\nPor @${ctx.numero}:\n\n${ctx.texto}` });
    });
  }, { grupo: true, aliases: ["sugerirgp"] }),

  c("daily", "grupo", "Resgata XP diario", (ctx) => {
    const u = DB.usuario(ctx.remetenteJid);
    const agora = Date.now();
    const passou = agora - (u.ultimoDaily || 0);
    if (passou < 86400000) return ctx.responder(`Volte em ${U.formatarDuracao(86400000 - passou)}.`, "aviso");
    const ganho = 50 + Math.floor(Math.random() * 50);
    DB.salvarUsuario(ctx.remetenteJid, { ultimoDaily: agora });
    darXp(ctx.remetenteJid, ganho);
    ctx.responder(`Voce resgatou *${ganho} XP* de recompensa diaria!`, "sucesso");
  }, { aliases: ["diario"] }),

  c("trabalhar", "grupo", "Ganha XP trabalhando", (ctx) => {
    const u = DB.usuario(ctx.remetenteJid);
    const agora = Date.now();
    const passou = agora - (u.ultimoTrabalho || 0);
    if (passou < 3600000) return ctx.responder(`Descanse mais ${U.formatarDuracao(3600000 - passou)}.`, "aviso");
    const ganho = 10 + Math.floor(Math.random() * 40);
    DB.salvarUsuario(ctx.remetenteJid, { ultimoTrabalho: agora });
    darXp(ctx.remetenteJid, ganho);
    const trabalhos = ["entregador", "programador", "motorista", "vendedor", "designer", "chef"];
    ctx.responder(`Voce trabalhou como ${trabalhos[Math.floor(Math.random() * trabalhos.length)]} e ganhou *${ganho} XP*.`, "sucesso");
  }, { aliases: ["work"] }),

  c("apostar", "grupo", "Aposta XP num 50/50", (ctx) => {
    const qtd = parseInt(ctx.args[0] || "10", 10);
    const u = DB.usuario(ctx.remetenteJid);
    if (qtd <= 0 || qtd > (u.xp || 0)) return ctx.responder(`Voce tem ${u.xp || 0} XP. Aposta invalida.`, "aviso");
    if (Math.random() < 0.5) {
      darXp(ctx.remetenteJid, qtd);
      ctx.responder(`Voce GANHOU! +${qtd} XP (total: ${darXp(ctx.remetenteJid, 0)}).`, "sucesso");
    } else {
      darXp(ctx.remetenteJid, -qtd);
      ctx.responder(`Voce PERDEU! -${qtd} XP (total: ${darXp(ctx.remetenteJid, 0)}).`, "erro");
    }
  }, { aliases: ["bet"] }),

  c("pontos", "grupo", "Mostra seus XP", (ctx) => {
    const u = DB.usuario(ctx.remetenteJid);
    ctx.responder(`Voce tem *${u.xp || 0} XP* (Nivel ${nivelDe(u.xp)}).`, "info");
  }, { aliases: ["xp", "saldo"] }),

  c("presentear", "grupo", "Transfere XP para alguem", (ctx) => {
    const numero = ctx.mencionados[0] ? U.numeroDeJid(ctx.mencionados[0]) : U.apenasDigitos(ctx.args[0] || "");
    const qtd = parseInt(ctx.args[ctx.mencionados[0] ? 0 : 1] || "0", 10);
    const u = DB.usuario(ctx.remetenteJid);
    if (!numero || qtd <= 0 || qtd > (u.xp || 0)) return ctx.responder("Uso: /presentear @membro <qtd>", "aviso");
    darXp(ctx.remetenteJid, -qtd);
    darXp(U.jidDeNumero(numero), qtd);
    ctx.responder(`Voce presenteou @${numero} com *${qtd} XP*!`, "sucesso");
  }, { aliases: ["transferir", "doar"] }),

  c("nivelgp", "grupo", "Progresso de nivel do grupo", (ctx) => {
    if (!ctx.metadados) return ctx.responder("So em grupos.", "aviso");
    const ids = ctx.metadados.participants.map((p) => p.id);
    const totalXp = Object.entries(DB.usuarios()).filter(([j]) => ids.includes(j)).reduce((s, [, u]) => s + (u.xp || 0), 0);
    const media = Math.round(totalXp / (ids.length || 1));
    ctx.responder(`*NIVEL DO GRUPO*\nXP total: ${totalXp}\nMedia por membro: ${media}\nNivel medio: ${nivelDe(media)}`, "info");
  }, { grupo: true }),

  c("batalha", "grupo", "Batalha entre dois membros marcados", (ctx) => {
    if (ctx.mencionados.length < 2) return ctx.responder("Marque dois membros: /batalha @a @b", "aviso");
    const [a, b] = ctx.mencionados;
    const forcaA = Math.random();
    const forcaB = Math.random();
    const vencedor = forcaA >= forcaB ? a : b;
    ctx.responder(`*BATALHA*\n@${a.split("@")[0]} vs @${b.split("@")[0]}\nVencedor: @${vencedor.split("@")[0]}!`, "fun");
  }, { grupo: true }),

  c("duelo", "grupo", "Duelo de XP entre dois membros", (ctx) => {
    if (ctx.mencionados.length < 2) return ctx.responder("Marque dois membros: /duelo @a @b", "aviso");
    const xpA = DB.usuario(ctx.mencionados[0]).xp || 0;
    const xpB = DB.usuario(ctx.mencionados[1]).xp || 0;
    const vencedor = xpA >= xpB ? ctx.mencionados[0] : ctx.mencionados[1];
    ctx.responder(`*DUELO*\n@${ctx.mencionados[0].split("@")[0]}: ${xpA} XP\n@${ctx.mencionados[1].split("@")[0]}: ${xpB} XP\nVencedor: @${vencedor.split("@")[0]}`, "fun");
  }, { grupo: true }),

  c("minhavip", "grupo", "Verifica acesso VIP", (ctx) => {
    ctx.responder(`VIP grupo: ${ctx.dadosGrupo?.vip ? "sim" : "nao"}\nVIP usuario: ${ctx.usuario.vip ? "sim" : "nao"}\nAcesso VIP: ${ctx.grupoVip || ctx.usuarioVip || ctx.isDono ? "LIBERADO" : "bloqueado"}`, "vip");
  }, { grupo: true }),

  c("progresso", "grupo", "Mostra progresso para o proximo nivel", (ctx) => {
    const u = DB.usuario(ctx.remetenteJid);
    const nv = nivelDe(u.xp);
    const atual = u.xp || 0;
    const prox = xpParaProximo(nv);
    ctx.responder(`Nivel ${nv}: ${atual}/${prox} XP\nFaltam ${Math.max(0, prox - atual)} XP.`, "info");
  }, { aliases: ["nivelinfo"] }),

  c("meuidgp", "grupo", "Seu ID neste grupo", (ctx) => ctx.responder(`Seu ID: ${ctx.remetenteJid}\nGrupo: ${ctx.chatId}`, "info"), { grupo: true })
];
