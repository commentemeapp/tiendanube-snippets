// @ts-check
"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const RAIZ = path.join(__dirname, "..");
const pacote = JSON.parse(fs.readFileSync(path.join(RAIZ, "package.json"), "utf8"));

test("todo arquivo citado no package.json existe e é JSON válido", () => {
	const c = pacote.contributes;
	const caminhos = [
		pacote.main,
		...c.snippets.map((/** @type {{path: string}} */ s) => s.path),
		...c.jsonValidation.map((/** @type {{url: string}} */ j) => j.url),
		...c.languages.map((/** @type {{configuration: string}} */ l) => l.configuration)
	];
	for (const relativo of caminhos) {
		const arquivo = path.join(RAIZ, relativo);
		assert.ok(fs.existsSync(arquivo), relativo);
		if (relativo.endsWith(".json") || relativo.endsWith(".code-snippets")) JSON.parse(fs.readFileSync(arquivo, "utf8"));
	}
});

test("prefixos não se repetem entre os arquivos de snippets", () => {
	/** @type {Map<string, string>} */
	const vistos = new Map();
	for (const arquivo of ["twig", "tiendanube", "settings"]) {
		const snippets = JSON.parse(fs.readFileSync(path.join(RAIZ, `snippets/${arquivo}.code-snippets`), "utf8"));
		for (const [nome, s] of Object.entries(snippets)) {
			if (vistos.has(s.prefix)) assert.fail(`prefixo ${s.prefix} em ${vistos.get(s.prefix)} e ${nome}`);
			vistos.set(s.prefix, nome);
		}
	}
});

test("a configuração da extensão usa o prefixo tiendanubeSnippets", () => {
	for (const chave of Object.keys(pacote.contributes.configuration.properties)) assert.match(chave, /^tiendanubeSnippets\./);
	const ext = fs.readFileSync(path.join(RAIZ, "extension.js"), "utf8");
	assert.match(ext, /getConfiguration\("tiendanubeSnippets"/);
});
