const path = require("path");

const DONO_NUMERO = "556593511752";

module.exports = {
  DONO_NUMERO,
  DONO_JID: `${DONO_NUMERO}@s.whatsapp.net`,
  DONOS_ADICIONAIS: [],

  NOME_BOT: "Bot Pro",
  PREFIXOS: ["/", "!", ".", "#"],

  DIAS_PADRAO_GRUPO: 30,
  DIAS_PADRAO_VIP: 30,

  PASTA_DADOS: path.join(__dirname, "dados"),
  PASTA_SESSAO: path.join(__dirname, "sessao"),
  PASTA_ASSETS: path.join(__dirname, "assets"),

  ANTI_SPAM_MS: 1500,
  MAX_ADVERTENCIAS: 3,

  LIMITE_TAMANHO_MB: 500
};
