const idsEnviados = new Set();
const recentes = new Map();
const cacheMeta = new Map();
const ultimaMensagem = new Map();
const mute = new Map();

const conexao = {
  pareamento: null,
  conectado: false,
  numero: null,
  erro: null
};

function setPareamento(codigo) {
  conexao.pareamento = codigo ? String(codigo).replace(/[^A-Z0-9]/gi, "").toUpperCase() : null;
  conexao.erro = null;
}

function setConectado(valor, numero = null) {
  conexao.conectado = !!valor;
  if (valor) conexao.pareamento = null;
  if (numero) conexao.numero = numero;
}

function setErroConexao(msg) {
  conexao.erro = msg || null;
}

function marcarEnviado(id) {
  if (!id) return;
  idsEnviados.add(id);
  if (idsEnviados.size > 5000) {
    const it = idsEnviados.values();
    for (let i = 0; i < 1000; i++) idsEnviados.delete(it.next().value);
  }
}

function foiEnviadoPeloBot(id) {
  return id ? idsEnviados.has(id) : false;
}

function guardarRecente(chatId, item) {
  const lista = recentes.get(chatId) || [];
  lista.push(item);
  while (lista.length > 60) lista.shift();
  recentes.set(chatId, lista);
}

function ultimosRecentes(chatId) {
  return recentes.get(chatId) || [];
}

async function metadados(sock, chatId, forcar = false) {
  const agora = Date.now();
  const cache = cacheMeta.get(chatId);
  if (!forcar && cache && agora - cache.em < 15000) return cache.dados;
  const dados = await sock.groupMetadata(chatId);
  cacheMeta.set(chatId, { dados, em: agora });
  return dados;
}

function invalidarMeta(chatId) {
  cacheMeta.delete(chatId);
}

function setMute(chatId, jid, tempo) {
  const mapa = mute.get(chatId) || new Map();
  mapa.set(jid, Date.now() + tempo);
  mute.set(chatId, mapa);
}

function estaMudo(chatId, jid) {
  const mapa = mute.get(chatId);
  if (!mapa) return false;
  const fim = mapa.get(jid);
  if (!fim) return false;
  if (fim < Date.now()) {
    mapa.delete(jid);
    return false;
  }
  return true;
}

function desmutar(chatId, jid) {
  const mapa = mute.get(chatId);
  if (mapa) mapa.delete(jid);
}

module.exports = {
  marcarEnviado,
  foiEnviadoPeloBot,
  guardarRecente,
  ultimosRecentes,
  metadados,
  invalidarMeta,
  setMute,
  estaMudo,
  desmutar,
  ultimaMensagem,
  conexao,
  setPareamento,
  setConectado,
  setErroConexao
};
