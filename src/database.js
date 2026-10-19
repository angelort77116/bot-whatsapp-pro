const fs = require("fs");
const path = require("path");
const { PASTA_DADOS } = require("../config");

if (!fs.existsSync(PASTA_DADOS)) fs.mkdirSync(PASTA_DADOS, { recursive: true });

const cache = {};

function arquivo(nome) {
  return path.join(PASTA_DADOS, `${nome}.json`);
}

function carregar(nome, padrao = {}) {
  if (cache[nome]) return cache[nome];
  const p = arquivo(nome);
  let dados = padrao;
  try {
    if (fs.existsSync(p)) dados = JSON.parse(fs.readFileSync(p, "utf8"));
  } catch (e) {
    dados = padrao;
  }
  cache[nome] = dados;
  return dados;
}

let gravando = false;
function salvar(nome, dados) {
  cache[nome] = dados;
  const p = arquivo(nome);
  const tmp = `${p}.tmp`;
  try {
    fs.writeFileSync(tmp, JSON.stringify(dados, null, 2));
    fs.renameSync(tmp, p);
  } catch (e) {
    try {
      fs.writeFileSync(p, JSON.stringify(dados, null, 2));
    } catch (_) {}
  }
}

function salvarAgendado(nome) {
  if (gravando) return;
  gravando = true;
  setTimeout(() => {
    gravando = false;
    salvar(nome, cache[nome]);
  }, 300);
}

const DB = {
  grupos: () => carregar("grupos", {}),
  usuarios: () => carregar("usuarios", {}),
  extras: () => carregar("extras", { donos: [], bloqueados: [], afk: {}, notas: {}, lembretes: [], sorteios: {} }),

  salvarGrupo: (id, obj) => {
    const g = DB.grupos();
    g[id] = { ...(g[id] || {}), ...obj };
    salvarAgendado("grupos");
    return g[id];
  },
  grupo: (id) => DB.grupos()[id],
  salvarUsuario: (jid, obj) => {
    const u = DB.usuarios();
    u[jid] = { ...(u[jid] || {}), ...obj };
    salvarAgendado("usuarios");
    return u[jid];
  },
  usuario: (jid) => {
    const u = DB.usuarios();
    if (!u[jid]) {
      u[jid] = { xp: 0, nivel: 1, avisos: 0, vip: false, vipExpiraEm: null, banido: false, criadoEm: Date.now() };
      salvarAgendado("usuarios");
    }
    return u[jid];
  },
  salvarExtra: (obj) => {
    const e = DB.extras();
    Object.assign(e, obj);
    salvarAgendado("extras");
    return e;
  },
  salvarTudo: () => {
    salvar("grupos", DB.grupos());
    salvar("usuarios", DB.usuarios());
    salvar("extras", DB.extras());
  }
};

module.exports = DB;
