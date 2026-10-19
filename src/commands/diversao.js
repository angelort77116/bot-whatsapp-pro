const { c } = require("./_helper");
const U = require("../utils");

const sorteia = (lista) => lista[Math.floor(Math.random() * lista.length)];
const alvo = (ctx) => (ctx.mencionados[0] ? `@${U.numeroDeJid(ctx.mencionados[0])}` : `@${ctx.numero}`);

const r = (nome, desc, respostas, anim = "fun", flags = {}) =>
  c(nome, "diversao", desc, (ctx) => {
    const base = sorteia(respostas);
    ctx.responder(base.replace(/\{p\}/g, alvo(ctx)), anim);
  }, flags);

const nivel = (ctx, rotulo) => {
  const pct = Math.floor(Math.random() * 101);
  ctx.responder(`${rotulo}: *${pct}%*`, "fun");
};

module.exports = [
  c("dado", "diversao", "Rola um dado de 6 lados", (ctx) => ctx.responder(`Voce rolou: *${Math.floor(Math.random() * 6) + 1}*`, "fun"), { aliases: ["d6"] }),
  c("d20", "diversao", "Rola um dado de 20 lados", (ctx) => ctx.responder(`D20: *${Math.floor(Math.random() * 20) + 1}*`, "fun")),
  c("moeda", "diversao", "Cara ou coroa", (ctx) => ctx.responder(`Deu: *${sorteia(["CARA", "COROA"])}*`, "fun"), { aliases: ["caraoucoroa"] }),

  c("jokenpo", "diversao", "Pedra, papel ou tesoura", (ctx) => {
    const opcoes = ["pedra", "papel", "tesoura"];
    const eu = (ctx.args[0] || "").toLowerCase();
    if (!opcoes.includes(eu)) return ctx.responder("Uso: /jokenpo pedra|papel|tesoura", "aviso");
    const bot = sorteia(opcoes);
    const vence = { pedra: "tesoura", papel: "pedra", tesoura: "papel" };
    const res = eu === bot ? "EMPATE" : vence[eu] === bot ? "VOCE VENCEU" : "BOT VENCEU";
    ctx.responder(`Voce: ${eu}\nBot: ${bot}\nResultado: *${res}*`, "fun");
  }, { aliases: ["ppt"] }),

  c("parouimpar", "diversao", "Par ou impar", (ctx) => {
    const escolha = (ctx.args[0] || "").toLowerCase();
    if (!["par", "impar"].includes(escolha)) return ctx.responder("Uso: /parouimpar par|impar", "aviso");
    const soma = Math.floor(Math.random() * 5) + 1 + Math.floor(Math.random() * 5) + 1;
    const resultado = soma % 2 === 0 ? "par" : "impar";
    ctx.responder(`Soma: ${soma}\nResultado: *${resultado}*\n${escolha === resultado ? "VOCE VENCEU!" : "BOT VENCEU!"}`, "fun");
  }, { aliases: ["pi"] }),

  c("roletarussa", "diversao", "Roleta russa", (ctx) => {
    const balas = ["💥 BANG! Voce morreu!", "clique... sorte sua!", "clique... sorte sua!", "clique... sorte sua!"];
    ctx.responder(sorteia(balas), "fun");
  }),

  c("bingo", "diversao", "Sorteia um numero de bingo", (ctx) => ctx.responder(`Bingo! Numero: *${Math.floor(Math.random() * 75) + 1}*`, "fun")),

  r("frase", "Frase motivacional", [
    "Acredite em voce e siga em frente!",
    "Grandes coisas exigem grandes esforcos.",
    "O sucesso e a soma de pequenos esforcos.",
    "Nunca desista dos seus sonhos!"
  ]),

  r("conselho", "Conselho do dia", [
    "Seja gentil com quem esta aprendendo.",
    "Organize suas tarefas antes de comecar.",
    "Beba agua e faca pausas.",
    "Valorize quem esta do seu lado."
  ]),

  r("piada", "Conta uma piada", [
    "Por que o programador foi ao medico? Porque estava com um bug no estomago!",
    "O que o pato disse para a pata? Vem qua! Vem qua!",
    "Por que o livro de matematica se suicidou? Porque tinha muitos problemas!"
  ]),

  r("elogio", "Elogia alguem", [
    "{p} voce e incrivel!",
    "{p} sua energia contagia todo mundo!",
    "{p} inteligencia e sua marca!",
    "{p} nunca mude, voce e otimo!"
  ]),

  r("cantada", "Lanca uma cantada", [
    "{p} voce nao e Wi-Fi, mas meu coracao conectou em voce.",
    "{p} se eu fosse um bug, queria ser corrigido por voce.",
    "{p} voce e a excecao do meu try/catch."
  ]),

  r("cantada2", "Mais cantadas", [
    "{p} voce tem mapa? Me perdi nos seus olhos.",
    "{p} e seu aniversario? Porque voce e um presente."
  ]),

  r("gado", "Mugido de gado", ["{p} MUUUUUU GADO DETECTADO!", "O gado mugiu: MUUUU {p}"]),

  r("fofoca", "Solta uma fofoca", ["Fiquei sabendo que {p} mandou 200 mensagens ontem...", "Dizem que {p} e o mais ativo secretamente!"]),

  r("previsao", "Previsao do dia", ["Hoje vai ser um grande dia!", "Prepare-se para boas noticias.", "Cuidado com distracoes hoje."]),

  r("signo", "Seu signo", ["Seu signo: *Leao*", "Seu signo: *Escorpiao*", "Seu signo: *Touro*", "Seu signo: *Aquario*"]),

  r("animal", "Seu animal espiritual", ["Seu animal: *Leao*", "Seu animal: *Lobo*", "Seu animal: *Aguia*", "Seu animal: *Golfinho*"]),

  r("comida", "Comida da sua personalidade", ["Pizza", "Sushi", "Feijoada", "Hamburguer", "Açaí"]),

  r("superpoder", "Seu superpoder", ["Invisibilidade", "Velocidade", "Telepatia", "Super forca", "Voar"]),

  r("apelido", "Seu apelido", ["Chefe", "Lenda", "Fera", "Craque", "Mito"]),

  r("musica", "Musica recomendada", ["Lo-fi beats", "Rock classico", "Samba", "Pop hits", "MPB"]),

  r("filme", "Filme recomendado", ["Interestelar", "Cidade de Deus", "O Auto da Compadecida", "Matrix"]),

  r("serie", "Serie recomendada", ["Breaking Bad", "Dark", "La Casa de Papel", "Stranger Things"]),

  r("jogo", "Jogo recomendado", ["Minecraft", "Free Fire", "GTA", "FIFA", "Valorant"]),

  r("time", "Time recomendado", ["Flamengo", "Palmeiras", "Corinthians", "Sao Paulo", "Real Madrid"]),

  r("bomdia", "Manda bom dia", ["Bom dia {p}! Que seu dia seja otimo!", "Bom dia! Cafe e boas vibes! {p}"]),
  r("boatarde", "Manda boa tarde", ["Boa tarde {p}! Continue firme!", "Boa tarde! Nao desista agora {p}!"]),
  r("boanoite", "Manda boa noite", ["Boa noite {p}! Sonhos bons!", "Boa noite! Descanse bem {p}!"]),
  r("tchau", "Manda tchau", ["Tchau {p}! Ate logo!", "Falou {p}, volte sempre!"]),
  r("parabens", "Manda parabens", ["Parabens {p}! Merecido demais!", "Parabens {p}! Voce e fera!"]),

  c("abraco", "diversao", "Manda um abraco", (ctx) => ctx.responder(`{p} recebeu um abraco caloroso!`.replace("{p}", alvo(ctx)), "coracao"), { aliases: ["hug"] }),
  c("beijo", "diversao", "Manda um beijo", (ctx) => ctx.responder(`${alvo(ctx)} ganhou um beijo!`, "coracao"), { aliases: ["kiss"] }),
  c("tapa", "diversao", "Manda um tapa", (ctx) => ctx.responder(`${alvo(ctx)} levou um tapa!`, "aviso"), { aliases: ["slap"] }),
  c("carinho", "diversao", "Manda carinho", (ctx) => ctx.responder(`${alvo(ctx)} recebeu carinho!`, "coracao")),
  c("cafune", "diversao", "Manda cafune", (ctx) => ctx.responder(`${alvo(ctx)} recebeu um cafune!`, "coracao")),
  c("morder", "diversao", "Morde alguem", (ctx) => ctx.responder(`${alvo(ctx)} foi mordido(a)!`, "fun")),
  c("soco", "diversao", "Da um soco (brincadeira)", (ctx) => ctx.responder(`${alvo(ctx)} levou um soco de brincadeira!`, "aviso")),
  c("aplica", "diversao", "Da um tapa de luva", (ctx) => ctx.responder(`${alvo(ctx)} levou uma luva!`, "fun")),
  c("lutar", "diversao", "Luta com alguem", (ctx) => ctx.responder(`${alvo(ctx)} e o bot entraram em combate! Empate tecnico.`, "fun")),
  c("namorar", "diversao", "Pede em namoro", (ctx) => ctx.responder(`${alvo(ctx)} aceitou namorar! Parabens ao casal!`, "coracao")),
  c("divorciar", "diversao", "Divorcia de alguem", (ctx) => ctx.responder(`${alvo(ctx)} foi divorciado(a)! Que pena...`, "fun")),
  c("ciumes", "diversao", "Fica com ciumes", (ctx) => ctx.responder(`${alvo(ctx)} esta com ciumes!`, "fun")),
  c("reviver", "diversao", "Revive alguem", (ctx) => ctx.responder(`${alvo(ctx)} foi revivido(a)!`, "sucesso"), { aliases: ["revive"] }),
  c("dancar", "diversao", "Convida para dancar", (ctx) => ctx.responder(`Vamos dancar ${alvo(ctx)}!`, "fun")),
  c("dormir", "diversao", "Manda dormir", (ctx) => ctx.responder(`${alvo(ctx)} foi dormir! Boa noite...`, "info")),

  c("ship", "diversao", "Shipa dois membros", (ctx) => {
    if (ctx.mencionados.length < 2) return ctx.responder("Marque dois: /ship @a @b", "aviso");
    const pct = Math.floor(Math.random() * 101);
    ctx.responder(`*SHIP*\n@${U.numeroDeJid(ctx.mencionados[0])} + @${U.numeroDeJid(ctx.mencionados[1])}\nCompatibilidade: *${pct}%*`, "coracao");
  }, { aliases: ["casal"] }),

  c("amar", "diversao", "Quanto voce ama alguem", (ctx) => ctx.responder(`${alvo(ctx)} voce ama *${Math.floor(Math.random() * 101)}%*!`, "coracao")),
  c("odiar", "diversao", "Quanto voce odeia alguem", (ctx) => ctx.responder(`Voce odeia ${alvo(ctx)} *${Math.floor(Math.random() * 101)}%*!`, "fun")),

  c("beleza", "diversao", "Nota de beleza", (ctx) => nivel(ctx, "Beleza"), {}),
  c("inteligencia", "diversao", "Nota de inteligencia", (ctx) => nivel(ctx, "Inteligencia")),
  c("nota", "diversao", "Nota geral de alguem", (ctx) => nivel(ctx, `${alvo(ctx)} recebeu nota`)),
  c("sorte", "diversao", "Sua sorte hoje", (ctx) => nivel(ctx, "Sorte")),
  c("gado-nivel", "diversao", "Nivel de gado", (ctx) => nivel(ctx, "Gadisse"), { aliases: ["gadometro"] }),
  c("sinceridade", "diversao", "Nivel de sinceridade", (ctx) => nivel(ctx, "Sinceridade")),
  c("louco", "diversao", "Nivel de loucura", (ctx) => nivel(ctx, "Loucura"), { aliases: ["loucura"] }),
  c("cafe", "diversao", "Nivel de vicio em cafe", (ctx) => nivel(ctx, "Cafe")),

  r("adivinha", "Adivinhacao", ["O que e, o que e: tem dentes mas nao morde? *O pente*", "Quanto mais voce tira, maior fica? *O buraco*", "Tem olhos mas nao ve? *A agulha*"]),
  r("curiosidade", "Curiosidade aleatoria", ["O mel nunca estraga.", "Os polvos tem 3 coracoes.", "A luz do Sol demora 8 minutos para chegar a Terra."]),
  r("motivacional", "Frase motivacional", ["Voce e mais forte do que imagina!", "Comece hoje, nao amanha.", "Pequenos passos levam longe."]),
  r("escolha", "Escolha para voce", ["Escolha: sim!", "Escolha: nao.", "Escolha: pense melhor.", "Escolha: siga em frente."]),
  r("simounao", "Resposta de sim ou nao", ["Sim!", "Nao.", "Talvez.", "Com certeza!", "Nem pensar."]),
  r("risada", "Ri de algo", ["HAHAHAHA!", "kkkkkk", "Morri de rir!", "😂"]),
  r("chorao", "Drama", ["buáááá 😭", "*chorando no canto*", "por queee??"]),

  c("dado-duplo", "diversao", "Rola dois dados", (ctx) => {
    const a = Math.floor(Math.random() * 6) + 1;
    const b = Math.floor(Math.random() * 6) + 1;
    ctx.responder(`Dados: ${a} e ${b} = *${a + b}*`, "fun");
  }, { aliases: ["2d6"] }),

  c("numero", "diversao", "Sorteia um numero no intervalo", (ctx) => {
    const min = parseInt(ctx.args[0] || "1", 10);
    const max = parseInt(ctx.args[1] || "100", 10);
    if (isNaN(min) || isNaN(max) || max < min) return ctx.responder("Uso: /numero <min> <max>", "aviso");
    ctx.responder(`Numero sorteado: *${Math.floor(Math.random() * (max - min + 1)) + min}*`, "fun");
  }, { aliases: ["rand"] }),

  c("roleta", "diversao", "Roleta da sorte", (ctx) => {
    const pr = ["nada", "nada", "nada", "10 XP", "50 XP", "premio misterioso", "perdeu tudo"];
    ctx.responder(`A roleta parou em: *${sorteia(pr)}*`, "fun");
  })
];
