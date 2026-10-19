const fs = require("fs");
const path = require("path");
const comandos = require("../src/commands");

const linhas = [];
const porCategoria = {};
for (const cmd of comandos.listar()) {
  (porCategoria[cmd.categoria] = porCategoria[cmd.categoria] || []).push(cmd);
}

const ordem = ["info", "grupo", "admin", "dono", "vip", "diversao", "ferramentas", "midia", "downloads"];
const marcas = (cmd) =>
  [cmd.dono && "DONO", cmd.admin && "ADMIN", cmd.vip && "VIP", cmd.grupo && "GRUPO", cmd.botAdmin && "BOT-ADMIN"]
    .filter(Boolean)
    .join(",");

let texto = `# ${comandos.total()} COMANDOS - um por linha\n# Prefixo padrao: /\n\n`;
for (const cat of ordem) {
  if (!porCategoria[cat]) continue;
  texto += `## ${cat.toUpperCase()} (${porCategoria[cat].length})\n`;
  for (const cmd of porCategoria[cat]) {
    const marca = marcas(cmd);
    linhas.push(`/${cmd.nome} - ${cmd.descricao}${marca ? ` [${marca}]` : ""}`);
    texto += `/${cmd.nome} - ${cmd.descricao}${marca ? ` [${marca}]` : ""}\n`;
    if (cmd.aliases?.length) {
      texto += `  aliases: ${cmd.aliases.map((a) => "/" + a).join(", ")}\n`;
    }
  }
  texto += "\n";
}

const destino = path.join(__dirname, "..", "comandos.txt");
fs.writeFileSync(destino, texto);
console.log(`Total de comandos: ${comandos.total()}`);
console.log(`Arquivo gerado: ${destino}`);
