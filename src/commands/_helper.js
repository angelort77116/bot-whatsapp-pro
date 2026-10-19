const c = (nome, categoria, descricao, executar, flags = {}) => ({
  nome,
  categoria,
  descricao,
  executar,
  ...flags
});

const aleatorio = (lista) => lista[Math.floor(Math.random() * lista.length)];

const pick = (ctx, lista) => lista[Math.floor(Math.random() * lista.length)].replace(/\{p\}/g, `@${ctx.numero}`);

function nivelDe(xp) {
  return Math.max(1, Math.floor(Math.sqrt((xp || 0) / 10)) + 1);
}

function xpParaProximo(nivel) {
  return Math.pow(nivel, 2) * 10;
}

module.exports = { c, aleatorio, pick, nivelDe, xpParaProximo };
