// @ts-check
"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { validarTpl, esquemaDoArquivo } = require("../lib/schema");

/** @param {unknown} schema */
const tpl = (schema) => `<div></div>\n{% schema %}\n${JSON.stringify(schema, null, 2)}\n{% endschema %}\n`;

/** @param {string} texto */
const problemas = (texto, arquivo = "tema/sections/x.tpl") => validarTpl(arquivo, texto);

const erros = (/** @type {any[]} */ ps) => ps.filter((p) => p.severidade === "erro");
const avisos = (/** @type {any[]} */ ps) => ps.filter((p) => p.severidade === "aviso");

const VALIDO = {
	name: "t:names.video",
	icon: "VideoIcon",
	class: "section section-video",
	blocks: [{ tags: ["general"] }, { type: "banner", limit: 2 }],
	settings: [
		{ type: "setting", setting_type: "video_url", id: "video_url", label: "t:settings.video_url" },
		{ type: "header", content: "t:names.colors" },
		{ type: "setting", setting_type: "toggle", id: "show_overlay", label: "t:names.overlay", default: false, header_toggle: true },
		{ type: "setting", setting_type: "color", id: "overlay_color", label: "t:settings.color", visible_if: "{{ section.settings.show_overlay }}" },
		{
			type: "setting",
			setting_type: "alignment",
			id: "alignment",
			label: "t:settings.alignment",
			options: [{ value: "start" }, { value: "center" }],
			default: "center",
			vertical_options: [{ value: "top" }, { value: "center" }],
			vertical_default: "top"
		},
		{ type: "setting", setting_type: "range", id: "gap", label: "t:settings.gap", min: 0, max: 40, step: 4, default: 16, visible_if: "{{ section.settings.alignment_vertical == 'top' }}" }
	],
	presets: [{ name: "t:names.video", settings: { gap: 8 }, blocks: [{ type: "heading", settings: { title: "Hola" } }] }]
};

test("só os .tpl de sections/ e blocks/ têm esquema", () => {
	assert.ok(esquemaDoArquivo("tema/sections/hero.tpl"));
	assert.ok(esquemaDoArquivo("tema/blocks/heading.tpl"));
	assert.equal(esquemaDoArquivo("tema/snippets/x.tpl"), undefined);
	assert.equal(esquemaDoArquivo("tema/sections/hero.liquid"), undefined);
	assert.deepEqual(problemas(tpl({ settings: 1 }), "tema/layouts/layout.tpl"), []);
});

test("um schema completo e correto não gera nada", () => {
	assert.deepEqual(problemas(tpl(VALIDO)), []);
});

test("arquivo sem {% schema %} não gera nada", () => {
	assert.deepEqual(problemas("<div>{{ section.settings.title }}</div>"), []);
});

test("JSON inválido é erro com posição dentro do schema", () => {
	const texto = "{% schema %}\n{ \"name\": \"x\", }\n{% endschema %}";
	const [p] = problemas(texto);
	assert.equal(p.severidade, "erro");
	assert.match(p.mensagem, /JSON inválido/);
	assert.ok(p.inicio > texto.indexOf("{ "));
});

test("setting sem id ou sem setting_type, e header sem content, são erro", () => {
	const ps = problemas(tpl({ settings: [{ type: "setting", setting_type: "text" }, { type: "setting", id: "x" }, { type: "header" }] }));
	const textos = erros(ps).map((p) => p.mensagem).join("\n");
	assert.match(textos, /"id"/);
	assert.match(textos, /"setting_type"/);
	assert.match(textos, /"content"/);
});

test("select sem options e range sem min/max são erro; range invertido também", () => {
	const ps = problemas(
		tpl({
			settings: [
				{ type: "setting", setting_type: "select", id: "a" },
				{ type: "setting", setting_type: "range", id: "b" },
				{ type: "setting", setting_type: "range", id: "c", min: 10, max: 5 }
			]
		})
	);
	const textos = erros(ps).map((p) => p.mensagem).join("\n");
	assert.match(textos, /"options"/);
	assert.match(textos, /"min"/);
	assert.match(textos, /mayor que el min/);
});

test("id repetido é erro", () => {
	const s = { type: "setting", setting_type: "text", id: "title", label: "x" };
	assert.match(erros(problemas(tpl({ settings: [s, s] })))[0].mensagem, /repetido/);
});

test("bloco aceito sem type nem tags é erro", () => {
	assert.equal(erros(problemas(tpl({ blocks: [{ limit: 1 }] }))).length > 0, true);
});

test("setting_type desconhecido, default fora das opções e visible_if órfão são aviso", () => {
	const ps = problemas(
		tpl({
			settings: [
				{ type: "setting", setting_type: "tex", id: "a", label: "x" },
				{ type: "setting", setting_type: "radio", id: "b", label: "x", options: [{ value: "fit" }, { value: "fill" }], default: "full" },
				{ type: "setting", setting_type: "text", id: "c", label: "x", visible_if: "{{ block.settings.nao_existe }}" }
			]
		})
	);
	assert.equal(erros(ps).length, 0);
	const textos = avisos(ps).map((p) => p.mensagem).join("\n");
	assert.match(textos, /Quisiste decir "text"/);
	assert.match(textos, /"full" no es el value/);
	assert.match(textos, /"nao_existe"/);
});

test("preset com setting que não existe é aviso; claves desconocidas no son error", () => {
	const ps = problemas(tpl({ settings: [], presets: [{ name: "x", settings: { titulo: "a" } }], clave_nueva: true }));
	assert.equal(erros(ps).length, 0);
	assert.match(avisos(ps)[0].mensagem, /"titulo"/);
});

test("custom_code, do bloco code, é aceito", () => {
	assert.deepEqual(problemas(tpl({ settings: [{ type: "setting", setting_type: "custom_code", id: "code", label: "x" }] })), []);
});

test("os settings de layout da plataforma não geram aviso no preset nem no visible_if", () => {
	const ps = problemas(
		tpl({
			settings: [{ type: "setting", setting_type: "color", id: "c", label: "x", visible_if: "{{ section.settings.section_width == 'page' }}" }],
			presets: [{ name: "x", settings: { vertical_padding: 32, horizontal_padding: 16 } }]
		})
	);
	assert.deepEqual(ps, []);
});
