// @ts-check
"use strict";

// Catálogo de settings do Brand Editor: um exemplo concreto e válido de cada `setting_type`
// da referência de schema. Os testes garantem que todo tipo de lib/schema.js está aqui e
// que cada exemplo passa na validação. Lógica pura, sem `vscode`.

const { escaparCampo } = require("./twig");

const REFERENCIA = "https://nuvemshop.dev/en-US/themes/sectionable-themes/schema-reference";

/**
 * Os rótulos usam chaves `t:` como o tema base; troque pela chave do seu translations/.
 * @type {Record<string, { descricao: string, exemplo: Record<string, unknown> }>}
 */
const CATALOGO = {
	text: { descricao: "Texto de una línea.", exemplo: { type: "setting", setting_type: "text", id: "title", label: "t:settings.title", default: "" } },
	richtext: { descricao: "Texto con formato.", exemplo: { type: "setting", setting_type: "richtext", id: "text", label: "t:settings.text", default: "" } },
	number: { descricao: "Número sin límites; si hay mínimo y máximo, mejor range.", exemplo: { type: "setting", setting_type: "number", id: "quantity", label: "t:settings.quantity", default: 4 } },
	range: {
		descricao: "Control deslizante con min, max, step y unit.",
		exemplo: { type: "setting", setting_type: "range", id: "vertical_padding", label: "t:settings.vertical_padding", min: 0, max: 80, step: 4, unit: "px", default: 32 }
	},
	toggle: { descricao: "Interruptor de sí o no.", exemplo: { type: "setting", setting_type: "toggle", id: "show_title", label: "t:settings.show_title", default: true } },
	checkbox: { descricao: "Casilla de sí o no (heredada; en settings nuevos, toggle).", exemplo: { type: "setting", setting_type: "checkbox", id: "show_border", label: "t:settings.show_border", default: false } },
	select: {
		descricao: "Lista desplegable, para muchas opciones.",
		exemplo: {
			type: "setting",
			setting_type: "select",
			id: "size",
			label: "t:settings.size",
			options: [
				{ value: "h2", label: "t:options.heading_2" },
				{ value: "h3", label: "t:options.heading_3" },
				{ value: "h4", label: "t:options.heading_4" }
			],
			default: "h3"
		}
	},
	radio: {
		descricao: "Selección visual, para 2 a 4 opciones.",
		exemplo: {
			type: "setting",
			setting_type: "radio",
			id: "width",
			label: "t:settings.section_width",
			options: [
				{ value: "fit", label: "t:options.fit" },
				{ value: "fill", label: "t:options.fill" }
			],
			default: "fill"
		}
	},
	text_alignment: { descricao: "Alineación del texto: izquierda, centro o derecha.", exemplo: { type: "setting", setting_type: "text_alignment", id: "text_alignment", label: "t:settings.text_alignment", default: "center" } },
	alignment: {
		descricao: "Alineación en dos ejes; en el .tpl, el vertical se lee como <id>_vertical.",
		exemplo: {
			type: "setting",
			setting_type: "alignment",
			id: "alignment",
			label: "t:settings.alignment",
			options: [
				{ value: "start", label: "t:options.left" },
				{ value: "center", label: "t:options.center" },
				{ value: "end", label: "t:options.right" }
			],
			default: "center",
			vertical_options: [
				{ value: "top", label: "t:options.top" },
				{ value: "center", label: "t:options.center" },
				{ value: "bottom", label: "t:options.bottom" }
			],
			vertical_default: "center"
		}
	},
	color: { descricao: "Selector de color; con default_setting hereda un color global.", exemplo: { type: "setting", setting_type: "color", id: "background_color", label: "t:settings.background", default_setting: "background_color" } },
	image_picker: { descricao: "Imagen subida; en el .tpl, resolve_media o settings_image_url.", exemplo: { type: "setting", setting_type: "image_picker", id: "image", label: "t:settings.image" } },
	url: { descricao: "Selector de enlace.", exemplo: { type: "setting", setting_type: "url", id: "link", label: "t:settings.link" } },
	video_url: { descricao: "URL de YouTube o Vimeo; en el .tpl tiene id, type y thumbnail.", exemplo: { type: "setting", setting_type: "video_url", id: "video_url", label: "t:settings.video_url" } },
	font_picker: { descricao: "Familia de fuente, de la lista de Google Fonts del tema.", exemplo: { type: "setting", setting_type: "font_picker", id: "font", label: "t:settings.font" } },
	html: { descricao: "Editor de HTML.", exemplo: { type: "setting", setting_type: "html", id: "html", label: "t:settings.html", default: "" } },
	custom_css: { descricao: "Editor de CSS, como el CSS propio global del tema.", exemplo: { type: "setting", setting_type: "custom_css", id: "custom_css", label: "t:settings.custom_css", default: "" } },
	custom_code: { descricao: "Editor de HTML, CSS y JS, como el del bloque code (hasta 50.000 caracteres).", exemplo: { type: "setting", setting_type: "custom_code", id: "code", label: "t:settings.code", default: "" } },
	button_preview: { descricao: "Vista previa, no editable, del botón configurado en el mismo panel.", exemplo: { type: "setting", setting_type: "button_preview", id: "button_preview" } },
	label_preview: { descricao: "Vista previa, no editable, de la etiqueta configurada en el mismo panel.", exemplo: { type: "setting", setting_type: "label_preview", id: "label_preview" } }
};

/**
 * Converte um valor do exemplo em texto de snippet: strings viram campos editáveis
 * (`${n:texto}`) na ordem em que aparecem, exceto `type` e `setting_type`.
 * @param {Record<string, unknown>} exemplo
 */
function corpoDoSetting(exemplo) {
	let n = 1;
	const linhas = ["{"];
	const entradas = Object.entries(exemplo);
	entradas.forEach(([chave, valor], i) => {
		const virgula = i < entradas.length - 1 ? "," : "";
		let texto;
		if (typeof valor === "string" && chave !== "type" && chave !== "setting_type") texto = `"\${${n++}:${escaparCampo(valor)}}"`;
		else texto = JSON.stringify(valor);
		linhas.push(`\t"${chave}": ${texto}${virgula}`);
	});
	linhas.push("}");
	return linhas;
}

/**
 * @returns {Record<string, { prefix: string, body: string[], description: string }>}
 */
function snippetsDeSettings() {
	/** @type {Record<string, { prefix: string, body: string[], description: string }>} */
	const saida = {};
	for (const [tipo, { descricao, exemplo }] of Object.entries(CATALOGO)) {
		saida[`setting ${tipo}`] = {
			prefix: `setting-${tipo.replace(/_/g, "-")}`,
			body: corpoDoSetting(exemplo),
			description: `${descricao}\n${REFERENCIA}`
		};
	}
	return saida;
}

module.exports = { CATALOGO, snippetsDeSettings, corpoDoSetting, REFERENCIA };
