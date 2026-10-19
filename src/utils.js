const { DONO_NUMERO, DONOS_ADICIONAIS } = require("../config");
const DB = require("./database");

function apenasDigitos(v = "") {
  return String(v).replace(/\D/g, "");
}

function numeroDeJid(jid = "") {
  return apenasDigitos(String(jid).split("@")[0].split(":")[0]);
}

function jidDeNumero(numero) {
  return `${apenasDigitos(numero)}@s.whatsapp.net`;
}

function mesmaPessoa(a, b) {
  const x = apenasDigitos(a);
  const y = apenasDigitos(b);
  if (!x || !y) return false;
  if (x === y) return true;
  const curto = x.length < y.length ? x : y;
  const longo = x.length < y.length ? y : x;
  return curto.length >= 10 && longo.endsWith(curto);
}

function ehDono(jid) {
  const n = numeroDeJid(jid);
  if (mesmaPessoa(n, DONO_NUMERO)) return true;
  if (DONOS_ADICIONAIS.some((d) => mesmaPessoa(n, d))) return true;
  const extras = DB.extras();
  return (extras.donos || []).some((d) => mesmaPessoa(n, d));
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function escolher(lista) {
  return lista[Math.floor(Math.random() * lista.length)];
}

function inteiro(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

const UNIDADES = {
  seg: 1000,
  segundo: 1000,
  segundos: 1000,
  s: 1000,
  min: 60000,
  minuto: 60000,
  minutos: 60000,
  m: 60000,
  h: 3600000,
  hora: 3600000,
  horas: 3600000,
  dia: 86400000,
  dias: 86400000,
  d: 86400000,
  semana: 604800000,
  semanas: 604800000,
  mes: 2592000000,
  meses: 2592000000,
  ano: 31536000000,
  anos: 31536000000
};

function interpretarDuracao(entrada) {
  const texto = String(entrada || "").toLowerCase().trim();
  if (!texto) return null;
  if (/(permanente|permanente|eterno|infinito|vitalicio|forever)/.test(texto)) {
    return { permanente: true, ms: null };
  }
  const m = texto.match(/(\d+(?:[.,]\d+)?)/);
  if (!m) return null;
  const qtd = parseFloat(m[1].replace(",", "."));
  const resto = texto.replace(m[1], "").replace(/[^a-z]/g, "");
  let unidade = "dia";
  for (const chave of Object.keys(UNIDADES)) {
    if (resto.startsWith(chave) || resto === chave) {
      unidade = chave;
      break;
    }
  }
  return { permanente: false, ms: Math.round(qtd * UNIDADES[unidade]), unidade, qtd };
}

function formatarDuracao(ms) {
  if (ms === null || ms === undefined) return "permanente";
  if (ms <= 0) return "expirado";
  const dias = Math.floor(ms / 86400000);
  const horas = Math.floor((ms % 86400000) / 3600000);
  const minutos = Math.floor((ms % 3600000) / 60000);
  const segundos = Math.floor((ms % 60000) / 1000);
  const partes = [];
  if (dias) partes.push(`${dias}d`);
  if (horas) partes.push(`${horas}h`);
  if (minutos) partes.push(`${minutos}min`);
  if (segundos && !dias && !horas) partes.push(`${segundos}s`);
  return partes.join(" ") || "0s";
}

function restante(expiraEm) {
  if (!expiraEm) return null;
  return expiraEm - Date.now();
}

function formatarData(ts) {
  if (!ts) return "permanente";
  const d = new Date(ts);
  const p = (v) => String(v).padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

module.exports = {
  apenasDigitos,
  numeroDeJid,
  jidDeNumero,
  mesmaPessoa,
  ehDono,
  sleep,
  escolher,
  inteiro,
  interpretarDuracao,
  formatarDuracao,
  restante,
  formatarData
};
