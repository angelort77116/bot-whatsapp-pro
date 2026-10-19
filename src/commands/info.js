const { c, nivelDe, xpParaProximo } = require("./_helper");
const { NOME_BOT, DONO_NUMERO } = require("../../config");
const DB = require("../database");
const U = require("../utils");

function gerarMenu(ctx) {
  const comandos = require("./index");
  const cats = comandos.categorias();
  const ordem = ["info", "grupo", "admin", "dono", "vip", "diversao", "ferramentas", "midia", "downloads"];
  const titulos = {
    info: "INFORMACOES",
    grupo: "GRUPO",
    admin: "ADMINISTRACAO",
    dono: "DONO",
    vip: "VIP",
    diversao: "DIVERSAO",
    ferramentas: "FERRAMENTAS",
    midia: "MIDIA/FIGURINHAS",
    downloads: "DOWNLOADS"
  };
  let texto = `*${NOME_BOT}*\nTotal de comandos: *${comandos.total()}*\nPrefixo: /  |  Ex: /menu\n`;
  for (const cat of ordem) {
    if (!cats[cat]) continue;
    texto += `\n*=== ${titulos[cat] || cat.toUpperCase()} ===*\n`;
    for (const cmd of cats[cat]) {
      const marca = cmd.dono ? "[DONO] " : cmd.admin ? "[ADM] " : cmd.vip ? "[VIP] " : "";
      texto += `/${cmd.nome} - ${marca}${cmd.descricao || ""}\n`;
    }
  }
  texto += `\nDono: wa.me/${DONO_NUMERO}`;
  return texto;
}

module.exports = [
  c("menu", "info", "Mostra todos os comandos", (ctx) => {
    const menu = gerarMenu(ctx);
    if (menu.length <= 950) return ctx.responder(menu, "info");
    ctx.responderTexto(menu);
  }, { aliases: ["help", "ajuda", "comandos"] }),

  c("ping", "info", "Testa a latencia do bot", (ctx) => ctx.responder(`Pong! ${Date.now() - ctx.inicio}ms`, "sucesso")),

  c("infobot", "info", "Informacoes do bot", (ctx) =>
    ctx.responder(
      `*${NOME_BOT}*\nComandos: ${require("./index").total()}\nDono: ${DONO_NUMERO}\nStatus: online\nGrupo ativo: ${ctx.isGrupo ? (ctx.dadosGrupo?.ativo ? "sim" : "nao") : "-"}`,
      "info"
    )),

  c("versao", "info", "Versao do bot", (ctx) => ctx.responder(`${NOME_BOT} v1.0.0`, "info"), { aliases: ["version"] }),

  c("id", "info", "Mostra IDs da conversa", (ctx) =>
    ctx.responder(`Chat: ${ctx.chatId}\nVoce: ${ctx.remetenteJid}\nNumero: ${ctx.numero}`, "info"), { aliases: ["ids"] }),

  c("meuid", "info", "Mostra seu ID", (ctx) => ctx.responder(`Seu ID: ${ctx.remetenteJid}`, "info"), { aliases: ["meuid"] }),

  c("idgrupo", "info", "Mostra o ID do grupo", (ctx) => ctx.responder(`ID do grupo: ${ctx.chatId}`, "info"), { grupo: true }),

  c("meunumero", "info", "Mostra seu numero", (ctx) => ctx.responder(`Seu numero: ${ctx.numero}`, "info")),

  c("dono", "info", "Contato do dono", (ctx) => ctx.responder(`O dono e: +${DONO_NUMERO}\nwa.me/${DONO_NUMERO}`, "info"), { aliases: ["owner"] }),

  c("horario", "info", "Hora atual", (ctx) => ctx.responder(`Hora: ${new Date().toLocaleTimeString("pt-BR")}`, "info"), { aliases: ["hora"] }),

  c("data", "info", "Data atual", (ctx) => ctx.responder(`Data: ${new Date().toLocaleDateString("pt-BR")}`, "info")),

  c("datahora", "info", "Data e hora atuais", (ctx) => ctx.responder(`Agora: ${new Date().toLocaleString("pt-BR")}`, "info")),

  c("runtime", "info", "Tempo ligado", (ctx) =>
    ctx.responder(`Ligado ha: ${U.formatarDuracao(Date.now() - (global.__inicio || Date.now()))}`, "info"), { aliases: ["uptime"] }),

  c("sistema", "info", "Informacoes do sistema", (ctx) => {
    const mem = process.memoryUsage();
    ctx.responder(
      `Node: ${process.version}\nMemoria: ${(mem.rss / 1048576).toFixed(1)} MB\nSistema: ${process.platform}\nPID: ${process.pid}`,
      "info"
    );
  }),

  c("statusbot", "info", "Status do bot", (ctx) =>
    ctx.responder(`Bot online.\nUptime: ${U.formatarDuracao(Date.now() - (global.__inicio || Date.now()))}\nComandos: ${require("./index").total()}`, "sucesso")),

  c("perfil", "info", "Seu perfil", (ctx) => {
    const u = DB.usuario(ctx.remetenteJid);
    const nivel = nivelDe(u.xp);
    ctx.responder(
      `*Perfil de ${ctx.numero}*\nXP: ${u.xp || 0}\nNivel: ${nivel}\nProximo nivel: ${xpParaProximo(nivel)} XP\nAdvertencias: ${u.avisos || 0}\nVIP: ${u.vip ? "sim" : "nao"}`,
      "info"
    );
  }, { aliases: ["meu-perfil"] }),

  c("meunivel", "info", "Seu nivel", (ctx) => {
    const u = DB.usuario(ctx.remetenteJid);
    return ctx.responder(`Nivel: ${nivelDe(u.xp)} (${u.xp || 0} XP)`, "info");
  }, { aliases: ["nivel"] }),

  c("ranking", "info", "Top usuarios por XP", (ctx) => {
    const todos = Object.entries(DB.usuarios()).sort((a, b) => (b[1].xp || 0) - (a[1].xp || 0)).slice(0, 10);
    if (!todos.length) return ctx.responder("Ranking vazio ainda.", "info");
    let texto = "*RANKING TOP 10*\n";
    todos.forEach(([jid, u], i) => {
      texto += `${i + 1}. ${jid.split("@")[0]} - ${u.xp || 0} XP\n`;
    });
    ctx.responder(texto, "vip");
  }, { aliases: ["top"] }),

  c("regras", "info", "Regras do grupo", (ctx) => {
    const r = ctx.dadosGrupo?.regras || "Nenhuma regra definida pelo admin.";
    ctx.responder(`*Regras do grupo*\n\n${r}`, "info");
  }, { grupo: true }),

  c("creditos", "info", "Creditos do bot", (ctx) => ctx.responder(`Bot criado para +${DONO_NUMERO}\n${NOME_BOT} v1.0.0`, "info")),

  c("reportar", "info", "Reportar algo ao dono", (ctx) => {
    if (!ctx.texto) return ctx.responder("Uso: /reportar <mensagem>", "aviso");
    ctx.responder("Report enviado ao dono. Obrigado!", "sucesso");
    ctx.sock.sendMessage(`${DONO_NUMERO}@s.whatsapp.net`, {
      text: `*REPORT*\nDe: ${ctx.numero}\nGrupo: ${ctx.isGrupo ? ctx.chatId : "privado"}\n\n${ctx.texto}`
    }).catch(() => {});
  }),

  c("sugestao", "info", "Enviar sugestao ao dono", (ctx) => {
    if (!ctx.texto) return ctx.responder("Uso: /sugestao <texto>", "aviso");
    ctx.responder("Sugestao enviada. Obrigado!", "sucesso");
    ctx.sock.sendMessage(`${DONO_NUMERO}@s.whatsapp.net`, { text: `*SUGESTAO*\nDe: ${ctx.numero}\n\n${ctx.texto}` }).catch(() => {});
  }, { aliases: ["sugerir"] }),

  c("convite", "info", "Link para adicionar o bot", (ctx) =>
    ctx.responder(`Adicione-me: wa.me/${ctx.sock.user?.id?.split(":")[0]}`, "info"), { aliases: ["linkbot"] }),

  c("velocidade", "info", "Velocidade de resposta", (ctx) => {
    const t = Date.now();
    ctx.reagir("⚡");
    ctx.responder(`Respondi em ${Date.now() - t}ms (local).`, "sucesso");
  }, { aliases: ["speed"] }),

  c("eu", "info", "Detalhes de voce na conversa", (ctx) =>
    ctx.responder(`Voce: ${ctx.remetenteJid}\nAdmin: ${ctx.isAdmin ? "sim" : "nao"}\nDono: ${ctx.isDono ? "sim" : "nao"}`, "info")),

  c("grupoinfo", "info", "Informacoes do grupo", (ctx) => {
    if (!ctx.metadados) return ctx.responder("So funciona em grupos.", "aviso");
    const d = ctx.dadosGrupo || {};
    ctx.responder(
      `*${ctx.metadados.subject}*\nMembros: ${ctx.metadados.participants.length}\nAtivo: ${d.ativo ? "sim" : "nao"}\nVIP: ${d.vip ? "sim" : "nao"}\nExpira: ${d.permanente ? "permanente" : U.formatarData(d.expiraEm)}`,
      "info"
    );
  }, { grupo: true }),

  c("admins", "info", "Lista admins do grupo", (ctx) => {
    if (!ctx.metadados) return ctx.responder("So funciona em grupos.", "aviso");
    const admins = ctx.metadados.participants.filter((p) => p.admin).map((p) => `@${p.id.split("@")[0]}`);
    ctx.responder(`Admins (${admins.length}):\n${admins.join("\n") || "nenhum"}`, "info");
  }, { grupo: true }),

  c("listamembros", "info", "Lista membros do grupo", (ctx) => {
    if (!ctx.metadados) return ctx.responder("So funciona em grupos.", "aviso");
    const lista = ctx.metadados.participants.map((p, i) => `${i + 1}. @${p.id.split("@")[0]}`).join("\n");
    ctx.responder(`*Membros (${ctx.metadados.participants.length})*\n${lista}`.slice(0, 900), "info");
  }, { grupo: true }),

  c("meunome", "info", "Seu nome no WhatsApp", (ctx) => ctx.responder(`Seu nome: ${ctx.msg.pushName || "sem nome"}`, "info")),

  c("tamanhotexto", "info", "Conta caracteres do texto", (ctx) => ctx.responder(`Caracteres: ${(ctx.texto || "").length}`, "info"))
];
