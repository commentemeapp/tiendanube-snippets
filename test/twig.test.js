// @ts-check
"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const { snippetsDeTwig } = require("../lib/twig");
const { camposBemFormados } = require("./auxiliares");

const dados = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "twig.json"), "utf8"));
const snippets = snippetsDeTwig(dados);

test("todo filtro e toda tag do dado tem snippet", () => {
	for (const f of dados.filtros) assert.ok(snippets[`filtro ${f.nome}`], f.nome);
	for (const t of dados.tags) assert.ok(snippets[`tag ${t.nome}`], t.nome);
	assert.equal(Object.keys(snippets).length, dados.filtros.length + dados.tags.length);
});

test("cada entrada cita uma fonte conhecida de nuvemshop.dev e diz onde vale", () => {
	for (const url of Object.values(dados.fontes)) assert.match(url, /^https:\/\/nuvemshop\.dev\/en-US\/themes\//);
	for (const e of [...dados.filtros, ...dados.tags]) {
		assert.ok(dados.fontes[e.fonte], `${e.nome}: fonte ${e.fonte}`);
		assert.ok(["ambos", "sectionable", "classic"].includes(e.tema), `${e.nome}: tema ${e.tema}`);
	}
});

test("os corpos dos snippets são bem formados", () => {
	for (const [nome, s] of Object.entries(snippets)) assert.ok(camposBemFormados(s.body), nome);
});

test("filtros entram depois de um pipe e as tags abrem e fecham", () => {
	for (const f of dados.filtros) assert.match(snippets[`filtro ${f.nome}`].body[0], new RegExp(`^\\| ${f.nome}\\b`));
	for (const t of dados.tags) {
		const texto = t.corpo.join("\n");
		const abertos = (texto.match(/{%/g) || []).length;
		assert.equal(abertos, (texto.match(/%}/g) || []).length, t.nome);
	}
});
