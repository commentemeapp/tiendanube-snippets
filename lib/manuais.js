// @ts-check
"use strict";

// Snippets escritos à mão: a estrutura de sections, blocks e templates de um tema
// seccionável. Ficam em dados (e não direto no .code-snippets) para os testes validarem
// cada {% schema %} e cada template. Lógica pura, sem `vscode`.

const DOCS = "https://nuvemshop.dev/en-US/themes/sectionable-themes";

/**
 * `arquivo` e `fragmento` são internos (só os testes usam, e o gerar.js tira):
 * `arquivo` diz onde o snippet, sozinho, vira um arquivo válido (um .tpl com {% schema %}
 * ou um template .json); `fragmento` diz em que lugar de um schema o pedaço entra
 * ("setting", "bloco" ou "preset"), para o teste montar o schema em volta.
 * @type {Record<string, { prefix: string, body: string[], description: string, arquivo?: string, fragmento?: "setting" | "bloco" | "preset" }>}
 */
const MANUAIS = {
	"section completa": {
		prefix: "section-file",
		arquivo: "sections/exemplo.tpl",
		description: `Section con lectura de settings, bloques y {% schema %} con preset.\n${DOCS}/sections`,
		body: [
			"{% set settings = section.settings %}",
			"",
			"<div class=\"${1:nombre}\" data-section-id=\"{{ section.id }}\">",
			"\t{% for block in section.blocks %}",
			"\t\t{% include 'blocks/' ~ block.type ~ '.tpl' with { block: block } %}",
			"\t{% endfor %}",
			"</div>",
			"",
			"{% schema %}",
			"{",
			"\t\"name\": \"${2:t:names.nombre}\",",
			"\t\"blocks\": [{ \"tags\": [\"general\"] }],",
			"\t\"settings\": [$0],",
			"\t\"presets\": [{ \"name\": \"${2:t:names.nombre}\" }]",
			"}",
			"{% endschema %}"
		]
	},
	"block completo": {
		prefix: "block-file",
		arquivo: "blocks/exemplo.tpl",
		description: `Bloque general con block_attributes en la raíz y {% schema %}.\n${DOCS}/blocks`,
		body: [
			"{% set settings = block.settings %}",
			"",
			"<div class=\"${1:nombre}\" {{ block | block_attributes }}>",
			"\t$0",
			"</div>",
			"",
			"{% schema %}",
			"{",
			"\t\"name\": \"${2:t:names.nombre}\",",
			"\t\"tags\": [\"general\"],",
			"\t\"settings\": []",
			"}",
			"{% endschema %}"
		]
	},
	"schema de section": {
		prefix: "schema-section",
		arquivo: "sections/exemplo.tpl",
		description: `Solo el {% schema %} de una section, con las claves más usadas.\n${DOCS}/sections`,
		body: [
			"{% schema %}",
			"{",
			"\t\"name\": \"${1:t:names.nombre}\",",
			"\t\"icon\": \"${2:SectionIcon}\",",
			"\t\"class\": \"section ${3:section-nombre}\",",
			"\t\"blocks\": [{ \"tags\": [\"general\"] }],",
			"\t\"settings\": [$0],",
			"\t\"presets\": [{ \"name\": \"${1:t:names.nombre}\", \"category\": \"${4:t:categories.text}\" }]",
			"}",
			"{% endschema %}"
		]
	},
	"schema de block": {
		prefix: "schema-block",
		arquivo: "blocks/exemplo.tpl",
		description: `Solo el {% schema %} de un bloque.\n${DOCS}/blocks`,
		body: ["{% schema %}", "{", "\t\"name\": \"${1:t:names.nombre}\",", "\t\"tags\": [\"general\"],", "\t\"settings\": [$0]", "}", "{% endschema %}"]
	},
	"recorrer bloques de la section": {
		prefix: "section-blocks",
		description: `Renderiza los bloques de la section en el orden que eligió el comerciante.\n${DOCS}/sections`,
		body: ["{% for block in section.blocks %}", "\t{% include 'blocks/' ~ block.type ~ '.tpl' with { block: block } %}", "{% endfor %}"]
	},
	"recorrer bloques hijos": {
		prefix: "block-blocks",
		description: `Renderiza los bloques hijos de un bloque contenedor.\n${DOCS}/blocks`,
		body: ["{% for child_block in block.blocks %}", "\t{% include 'blocks/' ~ child_block.type ~ '.tpl' with { block: child_block } %}", "{% endfor %}"]
	},
	"block_attributes": {
		prefix: "block-attributes",
		description: `Atributos que el editor necesita en el elemento raíz de cada bloque.\n${DOCS}/blocks`,
		body: ["{{ block | block_attributes }}"]
	},
	"imagen de setting": {
		prefix: "setting-image",
		description: `Imagen de un setting image_picker, resuelta con resolve_media.\nhttps://nuvemshop.dev/en-US/themes/twig-reference/filters-methods`,
		body: ["{% set media = ${1:section}.settings.${2:image} | resolve_media %}", "{% if media %}", "\t<img src=\"{{ media.sourceUrl }}\" alt=\"${3}\" loading=\"lazy\">", "{% endif %}"]
	},
	"header de settings": {
		prefix: "setting-header",
		fragmento: "setting",
		description: `Divisor con título que agrupa los settings que vienen después.\n${DOCS}/schema-reference`,
		body: ["{ \"type\": \"header\", \"content\": \"${1:t:names.design}\" }"]
	},
	"paragraph de settings": {
		prefix: "setting-paragraph",
		fragmento: "setting",
		description: `Texto explicativo en el panel de settings.\n${DOCS}/schema-reference`,
		body: ["{ \"type\": \"paragraph\", \"content\": \"${1:t:content.descripcion}\" }"]
	},
	"toggle con header_toggle": {
		prefix: "setting-header-toggle",
		fragmento: "setting",
		description: `Toggle que muestra u oculta el resto de su grupo; combínalo con visible_if.\n${DOCS}/schema-reference`,
		body: [
			"{ \"type\": \"header\", \"content\": \"${1:t:names.overlay}\" },",
			"{ \"type\": \"setting\", \"setting_type\": \"toggle\", \"id\": \"${2:show_overlay}\", \"label\": \"${3:t:names.overlay}\", \"default\": false, \"header_toggle\": true },",
			"{ \"type\": \"setting\", \"setting_type\": \"color\", \"id\": \"${4:overlay_color}\", \"label\": \"${5:t:settings.color}\", \"visible_if\": \"{{ section.settings.${2:show_overlay} }}\" }"
		]
	},
	"bloque aceptado por tipo": {
		prefix: "blocks-type",
		fragmento: "bloco",
		description: `Acepta un tipo de bloque, con límite opcional.\n${DOCS}/blocks`,
		body: ["{ \"type\": \"${1:tipo}\", \"limit\": ${2:1} }"]
	},
	"bloques aceptados por tag": {
		prefix: "blocks-tags",
		fragmento: "bloco",
		description: `Acepta todo bloque con el tag; los genéricos usan general.\n${DOCS}/blocks`,
		body: ["{ \"tags\": [\"${1:general}\"] }"]
	},
	"preset": {
		prefix: "preset",
		fragmento: "preset",
		description: `Configuración inicial cuando el comerciante agrega la section.\n${DOCS}/sections`,
		body: [
			"{",
			"\t\"name\": \"${1:t:names.nombre}\",",
			"\t\"category\": \"${2:t:categories.text}\",",
			"\t\"blocks\": [{ \"type\": \"${3:heading}\" }]",
			"}"
		]
	},
	"template de página": {
		prefix: "template-page",
		arquivo: "templates/pages/exemplo.json",
		description: `Template JSON de una página: sections por id y su orden.\n${DOCS}/templates`,
		body: [
			"{",
			"\t\"sections\": {",
			"\t\t\"${1:id}\": {",
			"\t\t\t\"type\": \"${2:tipo}\",",
			"\t\t\t\"settings\": {},",
			"\t\t\t\"blocks\": {},",
			"\t\t\t\"block_order\": []",
			"\t\t}",
			"\t},",
			"\t\"order\": [\"${1:id}\"]",
			"}"
		]
	},
	"layout seccionable": {
		prefix: "layout-file",
		description: `Esqueleto de layouts/layout.tpl de un tema seccionable.\n${DOCS}/layouts`,
		body: [
			"<!DOCTYPE html>",
			"<html>",
			"<head>",
			"\t$1",
			"\t{% platform_head_content %}",
			"</head>",
			"<body>",
			"\t{% layout_template 'header' %}",
			"\t{{ page_template_content }}",
			"\t{% layout_template 'footer' %}",
			"\t{% platform_body_content %}",
			"</body>",
			"</html>"
		]
	}
};

module.exports = { MANUAIS };
