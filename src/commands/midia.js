const { c } = require("./_helper");
const sharp = require("sharp");
const QRCode = require("qrcode");
const { downloadContentFromMessage } = require("@whiskeysockets/baileys");

const ctxInfo = (ctx) => {
  const m = ctx.msg.message;
  return (
    m.extendedTextMessage?.contextInfo ||
    m.imageMessage?.contextInfo ||
    m.videoMessage?.contextInfo ||
    m.stickerMessage?.contextInfo ||
    {}
  );
};

function tipoDoCitado(ctx) {
  const q = ctxInfo(ctx).quotedMessage;
  if (!q) return null;
  if (q.imageMessage) return "image";
  if (q.videoMessage) return "video";
  if (q.stickerMessage) return "sticker";
  return null;
}

async function baixarCitado(ctx, tipo) {
  const q = ctxInfo(ctx).quotedMessage;
  const alvo = tipo === "image" ? q.imageMessage : tipo === "video" ? q.videoMessage : q.stickerMessage;
  const stream = await downloadContentFromMessage(alvo, tipo);
  const pedacos = [];
  for await (const p of stream) pedacos.push(p);
  return Buffer.concat(pedacos);
}

module.exports = [
  c("sticker", "midia", "Transforma imagem/video em figurinha", async (ctx) => {
    const tipo = tipoDoCitado(ctx) || (ctx.msg.message.imageMessage ? "image" : ctx.msg.message.videoMessage ? "video" : null);
    if (!tipo) return ctx.responder("Responda a uma imagem ou video com /sticker.", "aviso");
    try {
      let buffer;
      if (tipoDoCitado(ctx)) buffer = await baixarCitado(ctx, tipo);
      else buffer = await ctx.carregarImagem();
      const webp = await sharp(buffer, { animated: tipo === "video" })
        .resize(512, 512, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .webp({ quality: 80 })
        .toBuffer();
      await ctx.sock.sendMessage(ctx.chatId, { sticker: webp }, { quoted: ctx.msg });
    } catch (e) {
      ctx.responder(`Falha ao criar figurinha: ${e.message}`, "erro");
    }
  }, { aliases: ["figurinha", "fig", "s"] }),

  c("toimg", "midia", "Transforma figurinha em imagem", async (ctx) => {
    if (tipoDoCitado(ctx) !== "sticker" && !ctx.msg.message.stickerMessage) {
      return ctx.responder("Responda a uma figurinha com /toimg.", "aviso");
    }
    try {
      const buffer = tipoDoCitado(ctx) ? await baixarCitado(ctx, "sticker") : await ctx.carregarSticker();
      const png = await sharp(buffer).png().toBuffer();
      await ctx.sock.sendMessage(ctx.chatId, { image: png, caption: "Figurinha convertida." }, { quoted: ctx.msg });
    } catch (e) {
      ctx.responder(`Falha ao converter: ${e.message}`, "erro");
    }
  }, { aliases: ["toimage", "fig2img", "imagem"] }),

  c("viewonce", "midia", "Revela midia de visualizacao unica", async (ctx) => {
    const q = ctxInfo(ctx).quotedMessage;
    const conteudo = q?.viewOnceMessageV2?.message || q?.viewOnceMessage?.message;
    if (!conteudo) return ctx.responder("Responda a uma midia de visualizacao unica com /viewonce.", "aviso");
    try {
      const tipo = conteudo.imageMessage ? "image" : "video";
      const alvo = conteudo[`${tipo}Message`];
      const stream = await downloadContentFromMessage(alvo, tipo);
      const pedacos = [];
      for await (const p of stream) pedacos.push(p);
      const buffer = Buffer.concat(pedacos);
      await ctx.sock.sendMessage(ctx.chatId, { [tipo]: buffer, caption: "Midia revelada." }, { quoted: ctx.msg });
    } catch (e) {
      ctx.responder(`Falha ao revelar: ${e.message}`, "erro");
    }
  }, { aliases: ["revelar", "vo", "veronce"] }),

  c("qr", "midia", "Gera um QR Code", async (ctx) => {
    if (!ctx.texto) return ctx.responder("Uso: /qr <texto ou link>", "aviso");
    try {
      const buffer = await QRCode.toBuffer(ctx.texto, { width: 512 });
      await ctx.sock.sendMessage(ctx.chatId, { image: buffer, caption: `QR Code: ${ctx.texto}` }, { quoted: ctx.msg });
    } catch (e) {
      ctx.responder(`Falha ao gerar QR: ${e.message}`, "erro");
    }
  }, { aliases: ["qrcode", "gerarqr"] }),

  c("fotogrupo", "midia", "Define a foto do grupo (responda a imagem)", async (ctx) => {
    const tipo = tipoDoCitado(ctx);
    if (tipo !== "image") return ctx.responder("Responda a uma imagem com /fotogrupo.", "aviso");
    try {
      const buffer = await baixarCitado(ctx, "image");
      await ctx.sock.updateProfilePicture(ctx.chatId, buffer);
      ctx.responder("Foto do grupo atualizada.", "sucesso");
    } catch (e) {
      ctx.responder(`Falha: ${e.message}`, "erro");
    }
  }, { admin: true, grupo: true, botAdmin: true, aliases: ["setfoto"] }),

  c("redimensionar", "midia", "Redimensiona uma imagem (responda)", async (ctx) => {
    const lado = Math.min(Math.max(parseInt(ctx.args[0] || "512", 10), 32), 2048);
    if (tipoDoCitado(ctx) !== "image") return ctx.responder("Responda a uma imagem com /redimensionar 512.", "aviso");
    try {
      const buffer = await baixarCitado(ctx, "image");
      const out = await sharp(buffer).resize(lado, lado, { fit: "inside" }).png().toBuffer();
      await ctx.sock.sendMessage(ctx.chatId, { image: out, caption: `Redimensionado para ${lado}px.` }, { quoted: ctx.msg });
    } catch (e) {
      ctx.responder(`Falha: ${e.message}`, "erro");
    }
  }, { aliases: ["resize"] }),

  c("girar", "midia", "Gira uma imagem (responda)", async (ctx) => {
    if (tipoDoCitado(ctx) !== "image") return ctx.responder("Responda a uma imagem com /girar.", "aviso");
    try {
      const buffer = await baixarCitado(ctx, "image");
      const out = await sharp(buffer).rotate(90).png().toBuffer();
      await ctx.sock.sendMessage(ctx.chatId, { image: out, caption: "Imagem girada." }, { quoted: ctx.msg });
    } catch (e) {
      ctx.responder(`Falha: ${e.message}`, "erro");
    }
  }, { aliases: ["rotacionar"] }),

  c("cinza", "midia", "Deixa a imagem em preto e branco", async (ctx) => {
    if (tipoDoCitado(ctx) !== "image") return ctx.responder("Responda a uma imagem com /cinza.", "aviso");
    try {
      const buffer = await baixarCitado(ctx, "image");
      const out = await sharp(buffer).grayscale().png().toBuffer();
      await ctx.sock.sendMessage(ctx.chatId, { image: out, caption: "Preto e branco." }, { quoted: ctx.msg });
    } catch (e) {
      ctx.responder(`Falha: ${e.message}`, "erro");
    }
  }, { aliases: ["pb", "grayscale"] }),

  c("desfoque", "midia", "Aplica desfoque na imagem", async (ctx) => {
    if (tipoDoCitado(ctx) !== "image") return ctx.responder("Responda a uma imagem com /desfoque.", "aviso");
    try {
      const buffer = await baixarCitado(ctx, "image");
      const out = await sharp(buffer).blur(8).png().toBuffer();
      await ctx.sock.sendMessage(ctx.chatId, { image: out, caption: "Imagem desfocada." }, { quoted: ctx.msg });
    } catch (e) {
      ctx.responder(`Falha: ${e.message}`, "erro");
    }
  }, { aliases: ["blur"] }),

  c("negativo", "midia", "Inverte as cores da imagem", async (ctx) => {
    if (tipoDoCitado(ctx) !== "image") return ctx.responder("Responda a uma imagem com /negativo.", "aviso");
    try {
      const buffer = await baixarCitado(ctx, "image");
      const out = await sharp(buffer).negate().png().toBuffer();
      await ctx.sock.sendMessage(ctx.chatId, { image: out, caption: "Cores invertidas." }, { quoted: ctx.msg });
    } catch (e) {
      ctx.responder(`Falha: ${e.message}`, "erro");
    }
  }, { aliases: ["invert"] })
];
