# Bot Pro - WhatsApp Bot para Grupos

Bot de WhatsApp com **264 comandos** para grupos, sistema de **ADM**, **DONO**, **VIP**,
captcha de grupo por tempo (`/addgrupo 30 dias`), imagens animadas nas respostas e
comando `/d` para apagar mensagens.

Roda no seu proprio numero: **+55 65 9351-1752**.

## Recursos

- 264 comandos (um por linha em `comandos.txt`)
- Ativacao de grupo por tempo: 30 dias, 7 dias, 1 ano ou **permanente**
- Sistema **VIP** (grupo VIP e usuario VIP)
- Comandos de **ADM** (antilink, antispam, antifake, bem-vindo, banir, promover...) com o bot como admin
- Comandos de **DONO** (addgrupo, delgrupo, broadcast, donos, bloqueios...)
- **Imagem animada (GIF)** em cada resposta, com tema diferente por tipo de mensagem
- `/d` apaga a mensagem respondida (bot precisa ser admin)
- Painel web em `http://localhost:PORT` com **codigo de pareamento**
- Notificacao no WhatsApp do dono quando o bot conecta
- Dados salvos em JSON (`dados/`)

## Requisitos

- Node.js 18+ (testado no Node 22)

## Instalacao

```bash
npm install
```

## Iniciar o bot

```bash
npm start
```

Para gerar um **codigo de pareamento novo** (recomendado a cada vez que for conectar):

```bash
NOVO_PAREAMENTO=1 npm start
```

O codigo aparece no terminal e em `http://localhost:3000`.
No celular com o numero **556593511752**:

1. WhatsApp > Aparelhos conectados > Conectar um aparelho
2. Conectar com numero de telefone
3. Digite o codigo de 8 caracteres (ex: `ABCD-1234`)

Depois de conectado, o bot envia uma mensagem no seu WhatsApp avisando que esta no ar.

Repo: https://github.com/angelort77116/bot-whatsapp-pro

## Como adicionar um grupo

1. Adicione o bot no grupo (o bot roda no seu numero).
2. Envie no grupo:

```
/addgrupo 30 dias
```

- `/addgrupo 7 dias` -> ativa por 7 dias
- `/addgrupo 12 horas` -> ativa por 12 horas
- `/addgrupo permanente` -> ativa para sempre
- `/renovargrupo 30 dias` -> renova
- `/delgrupo` -> desativa
- `/listargrupos` -> lista grupos ativos

### VIP

```
/addgrupo-vip 30 dias      (grupo VIP por 30 dias)
/setvip 30 dias            (marca grupo atual como VIP)
/addvip 5565999999999 30 dias  (usuario VIP)
/remvip                    (remove VIP)
/listarvip                 (lista VIPs)
```

## Comandos principais

- `/menu` - mostra todos os 264 comandos
- `/d` - apaga a mensagem respondida (responda a mensagem e mande `/d`)
- `/abrir` `/fechar` `/banir` `/promover` `/rebaixar` `/antilink` `/antispam`
- `/sticker` (figurinha), `/toimg`, `/viewonce`, `/qr`
- `/calcular`, `/base64`, `/gerarqr`, `/cep`, `/cnpj`, `/clima`, `/moeda`

Lista completa: arquivo `comandos.txt`.

## Painel / codigo de pareamento

Com o bot rodando, abra `http://localhost:3000` para ver o codigo de pareamento.
Endpoint `/status` devolve JSON (`online`, `pairing`, `numero`).

## Configuracao

Edite `config.js`:

- `DONO_NUMERO` - numero do dono (padrao 556593511752)
- `PREFIXOS` - prefixos aceitos (padrao `/`, `!`, `.`, `#`)
- `DIAS_PADRAO_GRUPO` / `DIAS_PADRAO_VIP` - tempo padrao

Variavel de ambiente:

- `PORT` - porta do painel web (padrao 3000)

## Observacoes importantes

- O bot usa a biblioteca **Baileys** (nao oficial). Use com uma conta que voce controla.
- Nao exponha a pasta `sessao/` (contem a credencial da sua conta).
- O pareamento usa o numero do dono em `config.js` (`DONO_NUMERO`).
- Comandos de "downloads" (`/cep`, `/cnpj`, `/clima`, `/moeda`, `/feriados`, `/bancos`,
  `/traduzir`, `/ip`, `/encurtar`) usam APIs publicas gratuitas e exigem internet.
- Tudo tem tratamento de erro: se uma API externa falhar, o bot responde com uma
  mensagem amigavel em vez de travar.

## Publicar no GitHub

```bash
git add .
git commit -m "feat: bot de WhatsApp com 264 comandos"
git remote add origin https://github.com/SEU_USUARIO/SEU_REPO.git
git push -u origin master
```

## Estrutura

```
index.js                 entrada + painel web/QR
config.js                configuracoes (dono, prefixos)
comandos.txt             lista de todos os comandos (um por linha)
src/
  connection.js          conexao Baileys
  handler.js             leitura de mensagens e permissoes
  eventos.js             bem-vindo/adeus/antifake
  database.js            banco em JSON
  utils.js               utilitarios (tempo, jid, etc)
  lib/animacao.js        gerador de GIF animado
  lib/estado.js          cache/estado em memoria
  commands/              todos os comandos por categoria
```
