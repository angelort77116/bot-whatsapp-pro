const { c, aleatorio, nivelDe } = require("./_helper");
const DB = require("../database");
const U = require("../utils");
const { gerarGifAnimado } = require("../lib/animacao");

function membros(ctx) {
  return (ctx.metadados?.participants || []).map((p) => p.id);
}

module.exports = [
  c("vipmenu", "vip", "Lista os comandos VIP", (ctx) => {
    const cmds = require("./index").listar().filter((x) => x.vip);
    ctx.responder(`*COMANDOS VIP (${cmds.length})*\n` + cmds.map((x) => `/${x.nome} - ${x.descricao}`).join("\n"), "vip");
  }, { vip: true, aliases: ["vipajuda"] }),

  c("vipstatus", "vip", "Mostra seu status VIP", (ctx) => {
    const u = ctx.usuario;
    const g = ctx.dadosGrupo || {};
    ctx.responder(
      `*STATUS VIP*\nVoce: ${u.vip ? (u.vipPermanente ? "VIP permanente" : "VIP ate " + U.formatarData(u.vipExpiraEm)) : "nao VIP"}\nGrupo: ${g.vip ? (g.vipPermanente ? "VIP permanente" : "VIP ate " + U.formatarData(g.vipExpiraEm)) : "nao VIP"}`,
      "vip"
    );
  }, { vip: true, aliases: ["meuvip"] }),

  c("sorteio", "vip", "Sorteia um membro do grupo", (ctx) => {
    const m = membros(ctx);
    if (!m.length) return ctx.responder("So funciona em grupos.", "aviso");
    const escolhido = aleatorio(m);
    ctx.responder(`O sorteado foi:\n@${escolhido.split("@")[0]}\nParabens!`, "vip");
  }, { vip: true, grupo: true, aliases: ["sortear"] }),

  c("rifa", "vip", "Sorteia um numero da rifa", (ctx) => {
    const max = parseInt(ctx.args[0] || "100", 10);
    ctx.responder(`Numero sorteado: *${Math.floor(Math.random() * max) + 1}* (de 1 a ${max})`, "vip");
  }, { vip: true }),

  c("megasorteio", "vip", "Sorteia 3 membros do grupo", (ctx) => {
    const m = membros(ctx);
    if (m.length < 3) return ctx.responder("Precisa de pelo menos 3 membros.", "aviso");
    const copia = [...m].sort(() => Math.random() - 0.5).slice(0, 3);
    ctx.responder(`*MEGA SORTEIO*\n1o: @${copia[0].split("@")[0]}\n2o: @${copia[1].split("@")[0]}\n3o: @${copia[2].split("@")[0]}`, "vip");
  }, { vip: true, grupo: true }),

  c("superdado", "vip", "Rola um dado de 100 lados", (ctx) => {
    const n = Math.floor(Math.random() * 100) + 1;
    ctx.responder(`Voce rolou: *${n}* / 100 ${n >= 90 ? "(CRITICO!)" : ""}`, "vip");
  }, { vip: true }),

  c("vipbroadcast", "vip", "Envia um aviso VIP no grupo", async (ctx) => {
    if (!ctx.texto) return ctx.responder("Uso: /vipbroadcast <mensagem>", "aviso");
    await ctx.sock.sendMessage(ctx.chatId, { image: gerarGifAnimado("vip"), caption: `*AVISO VIP*\n\n${ctx.texto}`, mimetype: "image/gif" });
  }, { vip: true, grupo: true }),

  c("vipsorte", "vip", "Sorte/destino premium", (ctx) => {
    const opcoes = ["Sorte grande!", "Dia excelente!", "Muita energia positiva!", "Sucesso garantido!", "Boas noticias chegando!"];
    ctx.responder(`Sua sorte hoje: *${aleatorio(opcoes)}*`, "vip");
  }, { vip: true }),

  c("vipelogio", "vip", "Elogio premium", (ctx) => {
    const opcoes = ["Voce e uma lenda!", "Inteligencia de outro nivel!", "Simplesmente magnifico!", "Voce inspira o grupo!"];
    ctx.responder(aleatorio(opcoes), "vip");
  }, { vip: true }),

  c("vipcontador", "vip", "Contagem regressiva no grupo", async (ctx) => {
    const n = Math.min(parseInt(ctx.args[0] || "5", 10), 15);
    await ctx.responder(`Contagem regressiva de ${n}...`, "vip");
    for (let i = n; i > 0; i--) {
      await ctx.sock.sendMessage(ctx.chatId, { text: `${i}...` });
      await U.sleep(1000);
    }
    await ctx.sock.sendMessage(ctx.chatId, { text: "*JA!*" });
  }, { vip: true, grupo: true, aliases: ["contagem"] }),

  c("vipanimacao", "vip", "Envia uma animacao aleatoria", async (ctx) => {
    const tipos = ["sucesso", "fun", "vip", "coracao", "bemvindo"];
    await ctx.sock.sendMessage(ctx.chatId, { image: gerarGifAnimado(aleatorio(tipos)), caption: "Animacao VIP", mimetype: "image/gif" });
  }, { vip: true }),

  c("vipfoto", "vip", "Envia um cartao VIP animado", async (ctx) => {
    await ctx.sock.sendMessage(ctx.chatId, { image: gerarGifAnimado("vip"), caption: `Cartao VIP para @${ctx.numero}`, mimetype: "image/gif" });
  }, { vip: true }),

  c("vipestatisticas", "vip", "Estatisticas avancadas do bot", (ctx) => {
    const g = Object.keys(DB.grupos()).length;
    const u = Object.keys(DB.usuarios()).length;
    const mem = process.memoryUsage();
    ctx.responder(`*ESTATISTICAS VIP*\nGrupos: ${g}\nUsuarios: ${u}\nComandos: ${require("./index").total()}\nMemoria: ${(mem.rss / 1048576).toFixed(1)} MB`, "vip");
  }, { vip: true, aliases: ["vipstats"] }),

  c("vipprioridade", "vip", "Confirma sua prioridade VIP", (ctx) => {
    ctx.responder(`@${ctx.numero}, voce tem PRIORIDADE VIP! Seu nivel: ${nivelDe(ctx.usuario.xp)}`, "vip");
  }, { vip: true, aliases: ["prioridade"] }),

  c("vipmodo", "vip", "Ativa o modo destaque do grupo", (ctx) => {
    DB.salvarGrupo(ctx.chatId, { vip: true, vipPermanente: ctx.dadosGrupo?.vipPermanente });
    ctx.responder("Modo destaque VIP ativado neste grupo.", "vip");
  }, { vip: true, grupo: true, admin: true })
];
