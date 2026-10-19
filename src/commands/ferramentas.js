const { c } = require("./_helper");
const DB = require("../database");
const U = require("../utils");

const ROMANOS = [[1000, "M"], [900, "CM"], [500, "D"], [400, "CD"], [100, "C"], [90, "XC"], [50, "L"], [40, "XL"], [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]];

function calcSeguro(expr) {
  const limpo = expr.replace(/\^/g, "**").replace(/,/g, ".").replace(/x/gi, "*");
  if (!/^[0-9+\-*/%.()\s*]+$/.test(limpo)) throw new Error("Expressao invalida");
  const resultado = Function(`"use strict"; return (${limpo});`)();
  if (typeof resultado !== "number" || !isFinite(resultado)) throw new Error("Resultado invalido");
  return resultado;
}

function paraBinario(texto) {
  return texto.split("").map((ch) => ch.charCodeAt(0).toString(2).padStart(8, "0")).join(" ");
}

function paraMorse(texto) {
  const mapa = { A: ".-", B: "-...", C: "-.-.", D: "-..", E: ".", F: "..-.", G: "--.", H: "....", I: "..", J: ".---", K: "-.-", L: ".-..", M: "--", N: "-.", O: "---", P: ".--.", Q: "--.-", R: ".-.", S: "...", T: "-", U: "..-", V: "...-", W: ".--", X: "-..-", Y: "-.--", Z: "--..", "0": "-----", "1": ".----", "2": "..---", "3": "...--", "4": "....-", "5": ".....", "6": "-....", "7": "--...", "8": "---..", "9": "----.", " ": "/" };
  return texto.toUpperCase().split("").map((ch) => mapa[ch] || "?").join(" ");
}

module.exports = [
  c("calcular", "ferramentas", "Calcula uma expressao matematica", (ctx) => {
    if (!ctx.texto) return ctx.responder("Uso: /calcular 2+2*3", "aviso");
    try {
      ctx.responder(`Resultado: *${calcSeguro(ctx.texto)}*`, "sucesso");
    } catch (e) {
      ctx.responder(`Nao consegui calcular: ${e.message}`, "erro");
    }
  }, { aliases: ["calc", "conta"] }),

  c("somar", "ferramentas", "Soma dois numeros", (ctx) => {
    const a = parseFloat(ctx.args[0]);
    const b = parseFloat(ctx.args[1]);
    if (isNaN(a) || isNaN(b)) return ctx.responder("Uso: /somar 2 3", "aviso");
    ctx.responder(`${a} + ${b} = *${a + b}*`, "sucesso");
  }, { aliases: ["soma"] }),

  c("subtrair", "ferramentas", "Subtrai dois numeros", (ctx) => {
    const a = parseFloat(ctx.args[0]);
    const b = parseFloat(ctx.args[1]);
    if (isNaN(a) || isNaN(b)) return ctx.responder("Uso: /subtrair 5 3", "aviso");
    ctx.responder(`${a} - ${b} = *${a - b}*`, "sucesso");
  }),

  c("multiplicar", "ferramentas", "Multiplica dois numeros", (ctx) => {
    const a = parseFloat(ctx.args[0]);
    const b = parseFloat(ctx.args[1]);
    if (isNaN(a) || isNaN(b)) return ctx.responder("Uso: /multiplicar 4 5", "aviso");
    ctx.responder(`${a} x ${b} = *${a * b}*`, "sucesso");
  }, { aliases: ["multi"] }),

  c("dividir", "ferramentas", "Divide dois numeros", (ctx) => {
    const a = parseFloat(ctx.args[0]);
    const b = parseFloat(ctx.args[1]);
    if (isNaN(a) || isNaN(b) || b === 0) return ctx.responder("Uso: /dividir <a> <b> (b diferente de 0)", "aviso");
    ctx.responder(`${a} / ${b} = *${a / b}*`, "sucesso");
  }),

  c("media", "ferramentas", "Media de varios numeros", (ctx) => {
    const nums = ctx.args.map(Number).filter((n) => !isNaN(n));
    if (!nums.length) return ctx.responder("Uso: /media 1 2 3 4", "aviso");
    const soma = nums.reduce((a, b) => a + b, 0);
    ctx.responder(`Media: *${(soma / nums.length).toFixed(2)}*`, "sucesso");
  }),

  c("porcentagem", "ferramentas", "Calcula porcentagem", (ctx) => {
    const p = parseFloat(ctx.args[0]);
    const v = parseFloat(ctx.args[1]);
    if (isNaN(p) || isNaN(v)) return ctx.responder("Uso: /porcentagem 20 150 (20% de 150)", "aviso");
    ctx.responder(`${p}% de ${v} = *${((p / 100) * v).toFixed(2)}*`, "sucesso");
  }, { aliases: ["pct"] }),

  c("fatorial", "ferramentas", "Fatorial de um numero", (ctx) => {
    const n = parseInt(ctx.args[0] || "0", 10);
    if (n < 0 || n > 170) return ctx.responder("Informe um numero entre 0 e 170.", "aviso");
    let r = 1;
    for (let i = 2; i <= n; i++) r *= i;
    ctx.responder(`${n}! = *${r}*`, "sucesso");
  }),

  c("primo", "ferramentas", "Verifica se e primo", (ctx) => {
    const n = parseInt(ctx.args[0] || "0", 10);
    if (isNaN(n)) return ctx.responder("Uso: /primo 17", "aviso");
    let primo = n > 1;
    for (let i = 2; i * i <= n; i++) if (n % i === 0) { primo = false; break; }
    ctx.responder(`${n} ${primo ? "e" : "nao e"} primo.`, primo ? "sucesso" : "info");
  }),

  c("raiz", "ferramentas", "Raiz quadrada", (ctx) => {
    const n = parseFloat(ctx.args[0]);
    if (isNaN(n) || n < 0) return ctx.responder("Uso: /raiz 16", "aviso");
    ctx.responder(`Raiz de ${n} = *${Math.sqrt(n).toFixed(4)}*`, "sucesso");
  }),

  c("potencia", "ferramentas", "Potencia de um numero", (ctx) => {
    const a = parseFloat(ctx.args[0]);
    const b = parseFloat(ctx.args[1]);
    if (isNaN(a) || isNaN(b)) return ctx.responder("Uso: /potencia 2 10", "aviso");
    ctx.responder(`${a}^${b} = *${Math.pow(a, b)}*`, "sucesso");
  }, { aliases: ["pot"] }),

  c("tabuada", "ferramentas", "Tabuada de um numero", (ctx) => {
    const n = parseInt(ctx.args[0] || "0", 10);
    if (isNaN(n)) return ctx.responder("Uso: /tabuada 7", "aviso");
    let texto = `*Tabuada de ${n}*\n`;
    for (let i = 1; i <= 10; i++) texto += `${n} x ${i} = ${n * i}\n`;
    ctx.responder(texto, "info");
  }),

  c("inverter", "ferramentas", "Inverte um texto", (ctx) => {
    if (!ctx.texto) return ctx.responder("Uso: /inverter texto", "aviso");
    ctx.responder(ctx.texto.split("").reverse().join(""), "info");
  }, { aliases: ["reverse"] }),

  c("maiuscula", "ferramentas", "Converte para MAIUSCULA", (ctx) => ctx.responder((ctx.texto || "").toUpperCase() || "Uso: /maiuscula texto", "info"), { aliases: ["upper"] }),
  c("minuscula", "ferramentas", "Converte para minuscula", (ctx) => ctx.responder((ctx.texto || "").toLowerCase() || "Uso: /minuscula texto", "info"), { aliases: ["lower"] }),
  c("capitalizar", "ferramentas", "Capitaliza o texto", (ctx) => ctx.responder((ctx.texto || "").replace(/\b\w/g, (m) => m.toUpperCase()) || "Uso: /capitalizar texto", "info")),

  c("contarpalavras", "ferramentas", "Conta palavras", (ctx) => {
    const p = (ctx.texto || "").trim().split(/\s+/).filter(Boolean);
    ctx.responder(`Palavras: *${p.length}*`, "info");
  }, { aliases: ["palavras"] }),

  c("contarcaracteres", "ferramentas", "Conta caracteres", (ctx) => ctx.responder(`Caracteres: *${(ctx.texto || "").length}*`, "info"), { aliases: ["len"] }),

  c("vogais", "ferramentas", "Conta as vogais", (ctx) => {
    const v = (ctx.texto || "").toLowerCase().match(/[aeiouáéíóúãẽĩõũâêîôû]/g);
    ctx.responder(`Vogais: *${v ? v.length : 0}*`, "info");
  }),

  c("consoantes", "ferramentas", "Conta as consoantes", (ctx) => {
    const c2 = (ctx.texto || "").toLowerCase().match(/[bcdfghjklmnpqrstvwxyz]/g);
    ctx.responder(`Consoantes: *${c2 ? c2.length : 0}*`, "info");
  }),

  c("palindromo", "ferramentas", "Verifica se e palindromo", (ctx) => {
    const limpo = (ctx.texto || "").toLowerCase().replace(/[^a-z0-9]/g, "");
    if (!limpo) return ctx.responder("Uso: /palindromo ovo", "aviso");
    const ok = limpo === limpo.split("").reverse().join("");
    ctx.responder(`"${ctx.texto}" ${ok ? "E" : "NAO e"} palindromo.`, ok ? "sucesso" : "info");
  }),

  c("binario", "ferramentas", "Converte texto em binario", (ctx) => {
    if (!ctx.texto) return ctx.responder("Uso: /binario ola", "aviso");
    ctx.responder(paraBinario(ctx.texto), "info");
  }),

  c("hex", "ferramentas", "Converte texto em hexadecimal", (ctx) => {
    if (!ctx.texto) return ctx.responder("Uso: /hex ola", "aviso");
    ctx.responder(Buffer.from(ctx.texto).toString("hex"), "info");
  }),

  c("base64", "ferramentas", "Codifica em base64", (ctx) => {
    if (!ctx.texto) return ctx.responder("Uso: /base64 texto", "aviso");
    ctx.responder(Buffer.from(ctx.texto).toString("base64"), "info");
  }, { aliases: ["b64"] }),

  c("base64d", "ferramentas", "Decodifica base64", (ctx) => {
    try {
      ctx.responder(Buffer.from(ctx.texto, "base64").toString("utf8"), "info");
    } catch (_) {
      ctx.responder("Base64 invalido.", "erro");
    }
  }, { aliases: ["unbase64"] }),

  c("morse", "ferramentas", "Converte texto em morse", (ctx) => {
    if (!ctx.texto) return ctx.responder("Uso: /morse sos", "aviso");
    ctx.responder(paraMorse(ctx.texto), "info");
  }),

  c("removerespacos", "ferramentas", "Remove espacos do texto", (ctx) => ctx.responder((ctx.texto || "").replace(/\s+/g, "") || "Uso: /removerespacos texto", "info")),

  c("repetir", "ferramentas", "Repete um texto N vezes", (ctx) => {
    const n = Math.min(parseInt(ctx.args[0] || "0", 10), 50);
    const txt = ctx.args.slice(1).join(" ");
    if (!n || !txt) return ctx.responder("Uso: /repetir 3 texto", "aviso");
    ctx.responder(Array(n).fill(txt).join(" "), "info");
  }),

  c("gerarsenha", "ferramentas", "Gera uma senha forte", (ctx) => {
    const n = Math.min(Math.max(parseInt(ctx.args[0] || "16", 10), 6), 64);
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*";
    let s = "";
    for (let i = 0; i < n; i++) s += chars[Math.floor(Math.random() * chars.length)];
    ctx.responder(`Senha: \`${s}\``, "sucesso");
  }, { aliases: ["senha"] }),

  c("uuid", "ferramentas", "Gera um UUID", (ctx) => {
    const u = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (ch) => {
      const r = (Math.random() * 16) | 0;
      return (ch === "x" ? r : (r & 0x3) | 0x8).toString(16);
    });
    ctx.responder(`UUID: \`${u}\``, "info");
  }),

  c("timestamp", "ferramentas", "Timestamp atual", (ctx) => ctx.responder(`Timestamp: \`${Date.now()}\`\nData: ${new Date().toISOString()}`, "info")),

  c("sortear", "ferramentas", "Sorteia entre opcoes (separe por virgula)", (ctx) => {
    const opcoes = ctx.textoCompleto.split(",").map((s) => s.trim()).filter(Boolean);
    if (opcoes.length < 2) return ctx.responder("Uso: /sortear opcao1, opcao2, opcao3", "aviso");
    ctx.responder(`Escolhido: *${opcoes[Math.floor(Math.random() * opcoes.length)]}*`, "fun");
  }),

  c("imc", "ferramentas", "Calcula o IMC", (ctx) => {
    const peso = parseFloat(ctx.args[0]);
    const alt = parseFloat(ctx.args[1]);
    if (isNaN(peso) || isNaN(alt) || alt <= 0) return ctx.responder("Uso: /imc <peso> <altura em metros>", "aviso");
    const imc = peso / (alt * alt);
    let cls = "Normal";
    if (imc < 18.5) cls = "Abaixo do peso";
    else if (imc >= 25 && imc < 30) cls = "Sobrepeso";
    else if (imc >= 30) cls = "Obesidade";
    ctx.responder(`IMC: *${imc.toFixed(2)}* (${cls})`, "info");
  }),

  c("romanos", "ferramentas", "Converte numero para romano", (ctx) => {
    let n = parseInt(ctx.args[0] || "0", 10);
    if (isNaN(n) || n <= 0 || n > 3999) return ctx.responder("Uso: /romanos 2024 (1-3999)", "aviso");
    let r = "";
    for (const [v, s] of ROMANOS) while (n >= v) { r += s; n -= v; }
    ctx.responder(`Romano: *${r}*`, "info");
  }),

  c("anagrama", "ferramentas", "Embaralha as letras", (ctx) => {
    if (!ctx.texto) return ctx.responder("Uso: /anagrama texto", "aviso");
    ctx.responder(ctx.texto.split("").sort(() => Math.random() - 0.5).join(""), "fun");
  }),

  c("primeiraletra", "ferramentas", "Primeira letra do texto", (ctx) => ctx.responder(`Primeira: *${(ctx.texto || "?")[0]}*`, "info")),
  c("ultimaletra", "ferramentas", "Ultima letra do texto", (ctx) => ctx.responder(`Ultima: *${(ctx.texto || "?").slice(-1)}*`, "info")),

  c("cor", "ferramentas", "Converte hex para RGB", (ctx) => {
    const hex = (ctx.args[0] || "").replace("#", "");
    if (!/^[0-9a-fA-F]{6}$/.test(hex)) return ctx.responder("Uso: /cor FF8800", "aviso");
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    ctx.responder(`RGB: rgb(${r}, ${g}, ${b})`, "info");
  }),

  c("afk", "ferramentas", "Marca voce como ausente", (ctx) => {
    const afk = DB.extras().afk || {};
    afk[ctx.remetenteJid] = { motivo: ctx.texto || "sem motivo", em: Date.now() };
    DB.salvarExtra({ afk });
    ctx.responder(`Voce esta AFK: ${ctx.texto || "sem motivo"}`, "aviso");
  }, { aliases: ["ausente"] }),

  c("voltar", "ferramentas", "Remove o status AFK", (ctx) => {
    const afk = DB.extras().afk || {};
    delete afk[ctx.remetenteJid];
    DB.salvarExtra({ afk });
    ctx.responder("Voce voltou! Bem-vindo de volta.", "sucesso");
  }, { aliases: ["naoafk"] }),

  c("anotar", "ferramentas", "Cria uma anotacao", (ctx) => {
    if (!ctx.texto) return ctx.responder("Uso: /anotar <texto>", "aviso");
    const notas = DB.extras().notas || {};
    notas[ctx.remetenteJid] = notas[ctx.remetenteJid] || [];
    notas[ctx.remetenteJid].push(ctx.texto);
    DB.salvarExtra({ notas });
    ctx.responder(`Anotacao ${notas[ctx.remetenteJid].length} salva.`, "sucesso");
  }, { aliases: ["nota"] }),

  c("notas", "ferramentas", "Lista suas anotacoes", (ctx) => {
    const notas = (DB.extras().notas || {})[ctx.remetenteJid] || [];
    ctx.responder(notas.length ? `*Suas notas*\n${notas.map((n, i) => `${i + 1}. ${n}`).join("\n")}` : "Voce nao tem anotacoes.", "info");
  }, { aliases: ["minhasnotas"] }),

  c("apagarnota", "ferramentas", "Apaga uma anotacao", (ctx) => {
    const notas = DB.extras().notas || {};
    const lista = notas[ctx.remetenteJid] || [];
    const i = parseInt(ctx.args[0] || "0", 10) - 1;
    if (i < 0 || i >= lista.length) return ctx.responder("Uso: /apagarnota <numero>", "aviso");
    lista.splice(i, 1);
    notas[ctx.remetenteJid] = lista;
    DB.salvarExtra({ notas });
    ctx.responder("Anotacao apagada.", "aviso");
  }, { aliases: ["delnota"] }),

  c("lembrar", "ferramentas", "Cria um lembrete em minutos", (ctx) => {
    const min = parseInt(ctx.args[0] || "0", 10);
    const msg = ctx.args.slice(1).join(" ");
    if (!min || !msg) return ctx.responder("Uso: /lembrar <minutos> <texto>", "aviso");
    setTimeout(() => {
      ctx.sock.sendMessage(ctx.chatId, { text: `*LEMBRETE* @${ctx.numero}\n${msg}`, mentions: [ctx.remetenteJid] }).catch(() => {});
    }, min * 60000);
    ctx.responder(`Lembrete criado para daqui a ${min} min.`, "sucesso");
  }, { aliases: ["lembrete"] }),

  c("invertersimbolo", "ferramentas", "Deixa o texto de cabeca para baixo", (ctx) => {
    if (!ctx.texto) return ctx.responder("Uso: /invertersimbolo texto", "aviso");
    ctx.responder(ctx.texto.split("").reverse().join(""), "fun");
  }, { aliases: ["flip"] })
];
