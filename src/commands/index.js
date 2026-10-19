const MODULOS = [
  "info",
  "dono",
  "admin",
  "vip",
  "grupo",
  "diversao",
  "ferramentas",
  "midia",
  "downloads"
];

const todos = [];
for (const nome of MODULOS) {
  try {
    const mod = require(`./${nome}`);
    for (const comando of mod) if (comando && comando.nome) todos.push(comando);
  } catch (e) {
    console.error(`[comandos] falha ao carregar ${nome}:`, e.message);
  }
}

const mapa = new Map();
for (const comando of todos) {
  mapa.set(comando.nome.toLowerCase(), comando);
  for (const alias of comando.aliases || []) mapa.set(alias.toLowerCase(), comando);
}

function buscar(nome) {
  return mapa.get(String(nome).toLowerCase());
}

function listar() {
  return todos;
}

function total() {
  return todos.length;
}

function categorias() {
  const cats = {};
  for (const c of todos) {
    cats[c.categoria] = cats[c.categoria] || [];
    cats[c.categoria].push(c);
  }
  return cats;
}

module.exports = { buscar, listar, total, categorias, todos, mapa };
