const { c } = require("./_helper");

async function buscar(url, tipo = "json", timeout = 12000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeout);
  try {
    const resp = await fetch(url, { signal: ctrl.signal, headers: { "User-Agent": "WhatsApp-Bot/1.0" } });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    if (tipo === "json") return await resp.json();
    if (tipo === "buffer") return { buffer: Buffer.from(await resp.arrayBuffer()), headers: resp.headers };
    return await resp.text();
  } finally {
    clearTimeout(t);
  }
}

module.exports = [
  c("baixarmidia", "downloads", "Baixa uma midia de um link direto", async (ctx) => {
    const url = ctx.args.find((a) => /^https?:\/\//.test(a));
    if (!url) return ctx.responder("Uso: /baixarmidia <link direto>", "aviso");
    try {
      const { buffer, headers } = await buscar(url, "buffer");
      const ct = headers.get("content-type") || "";
      if (buffer.length > 15 * 1024 * 1024) return ctx.responder("Arquivo grande demais (limite 15MB).", "aviso");
      if (ct.startsWith("image/")) await ctx.sock.sendMessage(ctx.chatId, { image: buffer, caption: "Midia baixada." }, { quoted: ctx.msg });
      else if (ct.startsWith("video/")) await ctx.sock.sendMessage(ctx.chatId, { video: buffer, caption: "Video baixado." }, { quoted: ctx.msg });
      else await ctx.sock.sendMessage(ctx.chatId, { document: buffer, fileName: "arquivo", mimetype: ct || "application/octet-stream" }, { quoted: ctx.msg });
    } catch (e) {
      ctx.responder(`Nao consegui baixar: ${e.message}`, "erro");
    }
  }, { aliases: ["baixar", "dl"] }),

  c("encurtar", "downloads", "Encurta uma URL", async (ctx) => {
    const url = ctx.args.find((a) => /^https?:\/\//.test(a));
    if (!url) return ctx.responder("Uso: /encurtar <link>", "aviso");
    try {
      const curto = await buscar(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(url)}`, "text");
      ctx.responder(`Link curto: ${curto}`, "sucesso");
    } catch (e) {
      ctx.responder(`Falha ao encurtar: ${e.message}`, "erro");
    }
  }, { aliases: ["short", "tinyurl"] }),

  c("cep", "downloads", "Consulta um CEP", async (ctx) => {
    const cep = (ctx.args[0] || "").replace(/\D/g, "");
    if (cep.length !== 8) return ctx.responder("Uso: /cep 01001000", "aviso");
    try {
      const d = await buscar(`https://viacep.com.br/ws/${cep}/json/`);
      if (d.erro) return ctx.responder("CEP nao encontrado.", "aviso");
      ctx.responder(`*CEP ${cep}*\n${d.logradouro}\n${d.bairro}\n${d.localidade} - ${d.uf}`, "sucesso");
    } catch (e) {
      ctx.responder(`Falha na consulta: ${e.message}`, "erro");
    }
  }, { aliases: ["viacep", "consultarcep"] }),

  c("clima", "downloads", "Mostra o clima de uma cidade", async (ctx) => {
    const cidade = encodeURIComponent(ctx.texto);
    if (!ctx.texto) return ctx.responder("Uso: /clima <cidade>", "aviso");
    try {
      const d = await buscar(`https://wttr.in/${cidade}?format=j1`);
      const atual = d.current_condition?.[0];
      if (!atual) throw new Error("sem dados");
      ctx.responder(`*Clima em ${ctx.texto}*\nTemp: ${atual.temp_C}C (sensacao ${atual.FeelsLikeC}C)\n${atual.weatherDesc?.[0]?.value}\nUmidade: ${atual.humidity}%`, "info");
    } catch (e) {
      ctx.responder(`Nao consegui obter o clima: ${e.message}`, "erro");
    }
  }, { aliases: ["tempo", "weather"] }),

  c("moeda", "downloads", "Converte moedas", async (ctx) => {
    const [valor, de, para] = ctx.args;
    if (!valor || !de || !para) return ctx.responder("Uso: /moeda 100 USD BRL", "aviso");
    try {
      const d = await buscar(`https://open.er-api.com/v6/latest/${de.toUpperCase()}`);
      const taxa = d.rates?.[para.toUpperCase()];
      if (!taxa) throw new Error("moeda invalida");
      ctx.responder(`${valor} ${de.toUpperCase()} = *${(parseFloat(valor) * taxa).toFixed(2)} ${para.toUpperCase()}*`, "sucesso");
    } catch (e) {
      ctx.responder(`Falha na conversao: ${e.message}`, "erro");
    }
  }, { aliases: ["cambio", "convertermoeda"] }),

  c("ip", "downloads", "Consulta informacoes de um IP", async (ctx) => {
    const ip = ctx.args[0] || "";
    try {
      const d = await buscar(`https://ipapi.co/${ip}/json/`);
      if (d.error) return ctx.responder("IP invalido.", "aviso");
      ctx.responder(`*IP ${d.ip || ip}*\nPais: ${d.country_name}\nRegiao: ${d.region}\nCidade: ${d.city}\nProvedor: ${d.org}`, "info");
    } catch (e) {
      ctx.responder(`Falha: ${e.message}`, "erro");
    }
  }, { aliases: ["ipinfo"] }),

  c("ddd", "downloads", "Lista DDDs de um estado", (ctx) => {
    const mapa = {
      SP: "11,12,13,14,15,16,17,18,19", RJ: "21,22,24", MG: "31,32,33,34,35,37,38", BA: "71,73,74,75,77",
      PR: "41,42,43,44,45,46", RS: "51,53,54,55", PE: "81,87", CE: "85,88", SC: "47,48,49", GO: "62,64",
      DF: "61", AM: "92,97", PA: "91,93,94", MA: "98,99"
    };
    const uf = (ctx.args[0] || "").toUpperCase();
    if (!mapa[uf]) return ctx.responder(`Estados: ${Object.keys(mapa).join(", ")}`, "aviso");
    ctx.responder(`DDDs de ${uf}: ${mapa[uf]}`, "info");
  }, { aliases: ["ddds"] }),

  c("traduzir", "downloads", "Traduz um texto (pt<->en)", async (ctx) => {
    if (!ctx.texto) return ctx.responder("Uso: /traduzir <texto>", "aviso");
    try {
      const d = await buscar(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(ctx.texto)}&langpair=pt|en`);
      const t = d.responseData?.translatedText;
      if (!t) throw new Error("sem traducao");
      ctx.responder(`Traducao: ${t}`, "info");
    } catch (e) {
      ctx.responder(`Falha ao traduzir: ${e.message}`, "erro");
    }
  }, { aliases: ["translate"] }),

  c("feriados", "downloads", "Feriados nacionais de um ano", async (ctx) => {
    const ano = ctx.args[0] || new Date().getFullYear();
    try {
      const d = await buscar(`https://brasilapi.com.br/api/feriados/v1/${ano}`);
      const lista = d.slice(0, 12).map((f) => `${f.date.slice(8, 10)}/${f.date.slice(5, 7)} - ${f.name}`).join("\n");
      ctx.responder(`*Feriados ${ano}*\n${lista}`, "info");
    } catch (e) {
      ctx.responder(`Falha: ${e.message}`, "erro");
    }
  }, { aliases: ["feriado"] }),

  c("bancos", "downloads", "Lista bancos brasileiros", async (ctx) => {
    try {
      const d = await buscar("https://brasilapi.com.br/api/banks/v1");
      ctx.responder(`Total de bancos: ${d.length}\nExemplos: ${d.slice(0, 5).map((b) => b.name).join(", ")}`, "info");
    } catch (e) {
      ctx.responder(`Falha: ${e.message}`, "erro");
    }
  }, { aliases: ["listabancos"] }),

  c("cnpj", "downloads", "Consulta um CNPJ", async (ctx) => {
    const cnpj = (ctx.args[0] || "").replace(/\D/g, "");
    if (cnpj.length !== 14) return ctx.responder("Uso: /cnpj 00000000000000", "aviso");
    try {
      const d = await buscar(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`);
      ctx.responder(`*${d.razao_social}*\nNome fantasia: ${d.nome_fantasia || "-"}\nSituacao: ${d.descricao_situacao_cadastral}\nCidade: ${d.municipio} - ${d.uf}`, "sucesso");
    } catch (e) {
      ctx.responder(`Falha na consulta: ${e.message}`, "erro");
    }
  }, { aliases: ["consultarcnpj"] })
];
