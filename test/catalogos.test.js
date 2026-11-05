// @ts-check
"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const Ajv = require("ajv");
const { validarTpl, TIPOS_DE_SETTING } = require("../lib/schema");
const { CATALOGO, snippetsDeSettings } = require("../lib/settings");
const { MANUAIS } = require("../lib/manuais");
const { resolver, camposBemFormados } = require("./auxiliares");

/** @param {string} conteudo */
const comoTpl = (conteudo) => `<div></div>\n{% schema %}\n${conteudo}\n{% endschema %}\n`;

test("o catálogo de settings cobre exatamente os setting_type do validador", () => {
	assert.deepEqual(Object.keys(CATALOGO).sort(), [...TIPOS_DE_SETTING].sort());
});

test("cada snippet de setting, resolvido, passa no validador sem nenhum problema", () => {
	for (const [nome, s] of Object.entries(snippetsDeSettings())) {
		assert.ok(camposBemFormados(s.body), nome);
		const setting = JSON.parse(resolver(s.body));
		const ps = validarTpl("tema/sections/x.tpl", comoTpl(JSON.stringify({ name: "x", settings: [setting] })));
		assert.deepEqual(ps, [], `${nome}: ${ps.map((p) => p.mensagem).join("; ")}`);
	}
});

const template = new Ajv({ strict: false, allErrors: true }).compile(JSON.parse(fs.readFileSync(path.join(__dirname, "..", "schemas", "template.json"), "utf8")));

test("snippets manuais com arquivo geram um arquivo válido", () => {
	for (const [nome, s] of Object.entries(MANUAIS)) {
		assert.ok(camposBemFormados(s.body), nome);
		assert.match(s.description, /\nhttps:\/\/nuvemshop\.dev\/en-US\//, `${nome}: sem link`);
		if (!s.arquivo) continue;
		const texto = resolver(s.body);
		if (s.arquivo.endsWith(".json")) assert.ok(template(JSON.parse(texto)), `${nome}: ${JSON.stringify(template.errors)}`);
		else {
			const ps = validarTpl(`tema/${s.arquivo}`, texto);
			assert.deepEqual(ps, [], `${nome}: ${ps.map((p) => p.mensagem).join("; ")}`);
		}
	}
});

test("fragmentos de schema, montados no lugar, passam no validador", () => {
	for (const [nome, s] of Object.entries(MANUAIS)) {
		if (!s.fragmento) continue;
		const pedaco = resolver(s.body);
		/** @type {Record<string, string>} */
		const montar = {
			setting: `{ "name": "x", "settings": [${pedaco}] }`,
			bloco: `{ "name": "x", "blocks": [${pedaco}] }`,
			preset: `{ "name": "x", "presets": [${pedaco}] }`
		};
		const ps = validarTpl("tema/sections/x.tpl", comoTpl(montar[s.fragmento]));
		assert.deepEqual(ps, [], `${nome}: ${ps.map((p) => p.mensagem).join("; ")}`);
	}
});
