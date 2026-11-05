# CLAUDE.md

Guia para trabalhar neste repositório. É a extensão de VS Code **"Snippets for Tiendanube"** (publisher
`commenteme`, id `commenteme.tiendanube-snippets`). Irmã de `vtex-io-snippets`, `shopify-snippets` e
`adobe-commerce-snippets`, para temas de Tiendanube / Nuvemshop.

## O que a extensão faz

1. **Snippets de Twig** gerados de `data/twig.json`: filtros e tags próprios da plataforma, cada um marcado como
   `sectionable`, `classic` ou `ambos`.
2. **Snippets de estrutura** escritos à mão em `lib/manuais.js` (section, block, schema, template, layout...).
3. **Um snippet por `setting_type`** a partir do catálogo de `lib/settings.js`.
4. **Validação do `{% schema %}`** de `sections/*.tpl` e `blocks/*.tpl` (ajv contra `schemas/schema-tpl.json` mais
   as regras de `regrasDaTiendanube` em `lib/schema.js`) e dos templates JSON por `jsonValidation`
   (`schemas/template.json`).

Registra o lenguaje `twig` para `.tpl`, sem gramática.

## De onde vêm os dados

A documentação de nuvemshop.dev **não tem licença aberta nem repositório público**, e a plataforma não publica um
JSON Schema. Por isso `data/twig.json` e `schemas/` são escritos à mão a partir dela: só nomes, parâmetros e
estruturas, com descrição própria em espanhol e o link de cada página. Nunca copie texto da documentação. As páginas
em Markdown (`https://nuvemshop.dev/en-US/<caminho>.md`) servem para ler.

## Regras que os testes cobram

- **Todo filtro e toda tag de `data/twig.json` tem snippet**, com fonte conhecida e tema marcado.
- **O catálogo de settings cobre exatamente `TIPOS_DE_SETTING`**, e cada exemplo passa no validador sem aviso.
- **Os snippets de section, block e template geram arquivos válidos**, e os fragmentos também, montados no lugar.
- **Os arquivos de `snippets/` são gerados**: nunca edite à mão. Mude `lib/` ou `data/` e rode
  `node scripts/gerar.js`; o CI falha se o gerado divergir do commitado.
- **Sem falso positivo**: o validador é conservador. Erro só no que a documentação deixa claro; o resto é aviso;
  chave desconhecida não é erro. Ainda não foi rodado contra um tema seccionável real (o `TiendaNube/base-theme`
  público é clássico): antes de endurecer uma regra, puxe um tema com `nuvemshop theme pull` e rode o validador
  em todo `sections/` e `blocks/`.

## Convenções

- JavaScript puro, CommonJS, sem build step. Todo arquivo começa com `// @ts-check` e `"use strict"`.
- Estilo: tab (largura 2), aspas duplas e ponto e vírgula.
- `lib/*.js` é lógica pura, sem `vscode`, testável com `node:test`. Só o `extension.js` importa `vscode`.
- Comentários e mensagens de commit em português; README, CHANGELOG, descrições de snippets e mensagens de
  diagnóstico em espanhol.
- Dependências de runtime só `ajv` e `jsonc-parser`.

## Marca

Kit da commente.me (skill `marca-commente`): ícone de produto para devs (`images/icon.svg`) com destaque **amarelo**
`#FFBD38`, porque Tiendanube não tem cor de plataforma na marca, e glifo `</>`; cabeçalho do Marketplace
`#005278` com `theme: dark` (regra para produto sem plataforma). README no padrão Atacama, header em
`assets/banner.png` (fora do .vsix), assinatura «Hecho por commente.me · hablecon@commente.me».

## Comandos

```bash
npm install
npm run check        # gera, confere o diff de snippets/ e roda os testes (é o gate)
npm run empacotar    # gera o .vsix
npm run icone        # images/icon.png a partir de images/icon.svg (sharp)
```

## Branches e versão

`branch de trabalho` → PR contra `dev` → `main`, por merge da branch inteira. O workflow `ramas` cobra que `main` só
tenha o que está em `dev` e que o commit de `main` tenha **tag anotada de versão**. Uma tag `v*` dispara o
`publish.yml`, que só anexa o `.vsix` à Release; o Marketplace é manual (`vsce publish`).
