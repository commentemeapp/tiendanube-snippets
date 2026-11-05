// @ts-check
"use strict";

// Valida o JSON dentro de {% schema %} de sections/*.tpl e blocks/*.tpl de um tema
// seccionável de Tiendanube / Nuvemshop. A plataforma não publica um JSON Schema: o de
// schemas/schema-tpl.json foi escrito a partir da documentação e é conservador (erro só no
// que a documentação deixa claro; o resto vira aviso em regrasDaTiendanube).
// Lógica pura, sem `vscode`: devolve erros com offsets, e o extension.js converte
// para posições do editor.

const fs = require("fs");
const path = require("path");
const Ajv = require("ajv");
const jsonc = require("jsonc-parser");

const BASE = "https://schemas.tiendanube-snippets.local/";
const PASTA = path.join(__dirname, "..", "schemas");
const ESQUEMA = "schema-tpl.json";

/** @type {import("ajv").default | undefined} */
let ajv;

function validador() {
	if (ajv) return ajv;
	// `strict: false` para aceitar `description` e `title` em qualquer lugar.
	ajv = new Ajv({ strict: false, allErrors: true, allowUnionTypes: true, verbose: true });
	for (const arquivo of fs.readdirSync(PASTA).filter((f) => f.endsWith(".json")).sort()) {
		const esquema = JSON.parse(fs.readFileSync(path.join(PASTA, arquivo), "utf8"));
		esquema.$id = BASE + arquivo;
		ajv.addSchema(esquema);
	}
	return ajv;
}

/**
 * Qual esquema vale para o arquivo: só os .tpl de sections/ e blocks/ têm {% schema %}.
 * `undefined` quando o arquivo não tem esquema.
 * @param {string} caminho
 */
function esquemaDoArquivo(caminho) {
	const partes = caminho.split(/[\\/]/);
	const pasta = partes[partes.length - 2];
	if (!caminho.endsWith(".tpl")) return undefined;
	if (pasta === "sections" || pasta === "blocks") return ESQUEMA;
	return undefined;
}

/**
 * Acha o conteúdo de {% schema %} ... {% endschema %} (com ou sem os traços de
 * controle de espaço). `inicio` é o offset do primeiro caractere do JSON.
 * @param {string} texto
 * @returns {{ inicio: number, conteudo: string } | undefined}
 */
function extrairSchema(texto) {
	const m = /{%-?\s*schema\s*-?%}([\s\S]*?){%-?\s*endschema\s*-?%}/.exec(texto);
	if (!m) return undefined;
	return { inicio: m.index + m[0].indexOf(m[1], m[0].indexOf("%}") + 2), conteudo: m[1] };
}

/**
 * Distância de edição (Levenshtein), para sugerir a opção mais próxima.
 * @param {string} a
 * @param {string} b
 */
function distancia(a, b) {
	const linha = Array.from({ length: b.length + 1 }, (_, i) => i);
	for (let i = 1; i <= a.length; i++) {
		let diagonal = linha[0];
		linha[0] = i;
		for (let j = 1; j <= b.length; j++) {
			const acima = linha[j];
			linha[j] = Math.min(linha[j] + 1, linha[j - 1] + 1, diagonal + (a[i - 1] === b[j - 1] ? 0 : 1));
			diagonal = acima;
		}
	}
	return linha[b.length];
}

/** Até quantas opções a mensagem lista todas; acima disso, sugere a mais próxima. */
const MAX_OPCOES = 6;

/**
 * @param {unknown} valor o valor digitado
 * @param {unknown[]} permitidos
 */
function mensagemDeEnum(valor, permitidos) {
	if (permitidos.length <= MAX_OPCOES) return `Valor no permitido. Opciones: ${permitidos.map((v) => JSON.stringify(v)).join(", ")}.`;
	if (typeof valor === "string") {
		const candidatos = permitidos.filter((v) => typeof v === "string").map((v) => ({ v: String(v), d: distancia(valor.toLowerCase(), String(v).toLowerCase()) }));
		candidatos.sort((a, b) => a.d - b.d || a.v.localeCompare(b.v));
		const melhor = candidatos[0];
		if (melhor && melhor.d <= Math.max(2, Math.floor(valor.length / 3))) return `Valor ${JSON.stringify(valor)} no permitido. ¿Quisiste decir ${JSON.stringify(melhor.v)}?`;
	}
	return `Valor ${JSON.stringify(valor)} no permitido (hay ${permitidos.length} opciones válidas).`;
}

/** Nome em espanhol de cada tipo do JSON Schema, para as mensagens de tipo errado. */
const TIPOS = {
	string: "un texto",
	number: "un número",
	integer: "un número entero",
	boolean: "true o false",
	object: "un objeto",
	array: "una lista",
	null: "null"
};

/**
 * Tipo JSON do valor, no vocabulário do JSON Schema.
 * @param {unknown} valor
 */
function tipoDe(valor) {
	if (valor === null) return "null";
	if (Array.isArray(valor)) return "array";
	return typeof valor;
}

/**
 * "Se esperaba un número, pero hay un texto." O ajv manda o tipo esperado como
 * "string" ou, em união, "string,array".
 * @param {string | string[]} esperado
 * @param {unknown} valor
 */
function mensagemDeTipo(esperado, valor) {
	const lista = (Array.isArray(esperado) ? esperado : String(esperado).split(",")).map((t) => /** @type {Record<string, string>} */ (TIPOS)[t] || t);
	const texto = lista.length > 1 ? `${lista.slice(0, -1).join(", ")} o ${lista[lista.length - 1]}` : lista[0];
	const atual = /** @type {Record<string, string>} */ (TIPOS)[tipoDe(valor)];
	return atual ? `Se esperaba ${texto}, pero hay ${atual}.` : `Se esperaba ${texto}.`;
}

/** @type {Record<string, (e: import("ajv").ErrorObject) => string>} */
const MENSAGENS = {
	required: (e) => `Falta la propiedad obligatoria "${e.params.missingProperty}".`,
	additionalProperties: (e) => `La propiedad "${e.params.additionalProperty}" no está permitida aquí.`,
	enum: (e) => mensagemDeEnum(e.data, e.params.allowedValues),
	const: (e) => `El valor debe ser ${JSON.stringify(e.params.allowedValue)}.`,
	type: (e) => mensagemDeTipo(e.params.type, e.data),
	minimum: (e) => `Debe ser mayor o igual a ${e.params.limit}.`,
	maximum: (e) => `Debe ser menor o igual a ${e.params.limit}.`,
	minItems: (e) => `Debe tener al menos ${e.params.limit} elemento(s).`,
	maxItems: (e) => `Debe tener como máximo ${e.params.limit} elemento(s).`,
	minLength: (e) => `Debe tener al menos ${e.params.limit} carácter(es).`,
	maxLength: (e) => `Debe tener como máximo ${e.params.limit} carácter(es).`,
	pattern: () => "El valor no tiene el formato esperado.",
	uniqueItems: () => "Los elementos deben ser únicos."
};

/**
 * Palavras-chave que só agrupam outras (if/then, anyOf...) e repetiriam o mesmo
 * erro com outro texto. Os erros de verdade vêm junto, nas palavras de baixo.
 */
const AGRUPADORAS = new Set(["if", "anyOf", "oneOf", "allOf", "not", "then", "else"]);

/**
 * @param {import("ajv").ErrorObject} erro
 * @param {Record<string, any>} esquema o subesquema do erro, para uma mensagem própria
 */
function mensagem(erro, esquema) {
	const propria = esquema && (esquema.errorMessage || esquema.patternErrorMessage);
	if (typeof propria === "string" && erro.keyword !== "required" && erro.keyword !== "additionalProperties") return propria;
	const traduzir = MENSAGENS[erro.keyword];
	return traduzir ? traduzir(erro) : erro.message || "Valor inválido.";
}

/**
 * @typedef {{ inicio: number, fim: number, mensagem: string, severidade: "erro" | "aviso" }} Problema
 */

/**
 * A propriedade que identifica um objeto, para marcar no lugar dele inteiro.
 * @param {jsonc.Node} objeto
 * @returns {jsonc.Node | undefined}
 */
function identificador(objeto) {
	const props = objeto.children || [];
	for (const chave of ["type", "name", "id"]) {
		const prop = props.find((c) => c.children && c.children[0].value === chave);
		if (prop) return prop;
	}
	return props[0];
}

/**
 * Converte o instancePath do ajv ("/settings/0/type") no nó do JSON, para marcar o
 * trecho certo. Em erro de propriedade sobrando, marca a chave sobrando.
 * @param {jsonc.Node} arvore
 * @param {import("ajv").ErrorObject} erro
 */
function noDoErro(arvore, erro) {
	const caminho = erro.instancePath
		.split("/")
		.slice(1)
		.map((p) => p.replace(/~1/g, "/").replace(/~0/g, "~"))
		.map((p) => (/^\d+$/.test(p) ? Number(p) : p));
	let no = jsonc.findNodeAtLocation(arvore, caminho) || arvore;
	if (erro.keyword === "additionalProperties" && no.type === "object") {
		const prop = (no.children || []).find((c) => c.children && c.children[0].value === erro.params.additionalProperty);
		if (prop && prop.children) no = prop.children[0];
	} else if (no.parent && no.parent.type === "property" && no.parent.children && no.parent.children[1] === no && no.type !== "object" && no.type !== "array") {
		// Valor primitivo: marca o valor, que é o que está errado.
	} else if (no.type === "object" && no.parent && no.parent.type === "property" && no.parent.children) {
		// Objeto inteiro: marca só a chave, para não sublinhar dezenas de linhas.
		no = no.parent.children[0];
	} else if (no.type === "object") {
		// Objeto sem chave (item de lista ou a raiz do schema): marca a propriedade que
		// o identifica ("type", "name" ou "id"), ou a primeira, em vez do objeto inteiro.
		no = identificador(no) || no;
	}
	return no;
}

/**
 * @typedef {{ caminho: (string | number)[], mensagem: string, severidade: "erro" | "aviso", chave?: boolean }} Regra
 */

/** @param {unknown} v */
const ehObjeto = (v) => typeof v === "object" && v !== null && !Array.isArray(v);

/** @param {unknown} v */
const ehNumero = (v) => typeof v === "number" && Number.isFinite(v);

/** Os `setting_type` da referência de schema, mais o `custom_code` do bloco code. */
const TIPOS_DE_SETTING = [
	"text",
	"number",
	"richtext",
	"html",
	"custom_css",
	"custom_code",
	"url",
	"video_url",
	"select",
	"radio",
	"toggle",
	"checkbox",
	"range",
	"color",
	"image_picker",
	"font_picker",
	"text_alignment",
	"alignment",
	"button_preview",
	"label_preview"
];

/**
 * Settings de layout que as sections usam sem declarar no próprio schema: o exemplo real
 * da section de vídeo na documentação os usa no preset sem declará-los, e a referência
 * diz que a maioria das sections os tem. Não geram aviso.
 */
const LAYOUT = ["section_width", "vertical_padding", "horizontal_padding"];

/**
 * Os ids de setting citados num visible_if / disabled_if: `section.settings.x` e
 * `block.settings.x`.
 * @param {string} expressao
 */
function idsCitados(expressao) {
	return [...expressao.matchAll(/\b(?:section|block)\.settings\.([A-Za-z_][\w]*)/g)].map((m) => m[1]);
}

/**
 * Regras que o JSON Schema não expressa. A plataforma não documenta o que recusa ao
 * subir o tema, então tudo aqui é aviso, salvo o id repetido, que deixa um setting
 * inacessível.
 * @param {unknown} valor o schema já lido
 * @returns {Regra[]}
 */
function regrasDaTiendanube(valor) {
	/** @type {Regra[]} */
	const regras = [];
	if (!ehObjeto(valor)) return regras;
	const raiz = /** @type {Record<string, unknown>} */ (valor);

	/**
	 * @param {unknown} settings
	 * @param {(string | number)[]} base
	 * @param {string} onde
	 */
	function conferirSettings(settings, base, onde) {
		/** @type {Set<string>} */
		const ids = new Set();
		if (!Array.isArray(settings)) return ids;
		/** @type {[Record<string, unknown>, (string | number)[]][]} */
		const declarados = [];
		settings.forEach((setting, i) => {
			if (!ehObjeto(setting)) return;
			const s = /** @type {Record<string, unknown>} */ (setting);
			const aqui = [...base, i];
			declarados.push([s, aqui]);
			if (typeof s.id === "string") {
				if (ids.has(s.id)) regras.push({ caminho: [...aqui, "id"], mensagem: `El id "${s.id}" está repetido en los settings ${onde}: cada setting necesita un id único.`, severidade: "erro" });
				ids.add(s.id);
				// El alignment crea solo el eje vertical con el sufijo _vertical.
				if (s.setting_type === "alignment") ids.add(`${s.id}_vertical`);
			}
			if (s.type === "setting" && typeof s.setting_type === "string" && !TIPOS_DE_SETTING.includes(s.setting_type)) {
				regras.push({ caminho: [...aqui, "setting_type"], mensagem: `${mensagemDeEnum(s.setting_type, TIPOS_DE_SETTING)} (setting_type que la documentación no lista: revísalo si el editor no lo muestra).`, severidade: "aviso" });
			}
			if (s.setting_type === "range") conferirRange(s, aqui);
			conferirDefault(s, "options", "default", aqui);
			if (s.setting_type === "alignment") conferirDefault(s, "vertical_options", "vertical_default", aqui);
		});
		// visible_if y disabled_if que citan un setting que no existe en este archivo.
		for (const [s, aqui] of declarados) {
			for (const chave of ["visible_if", "disabled_if"]) {
				const expr = s[chave];
				if (typeof expr !== "string") continue;
				for (const id of idsCitados(expr)) {
					if (!ids.has(id) && !LAYOUT.includes(id)) regras.push({ caminho: [...aqui, chave], mensagem: `${chave} cita el setting "${id}", que no está declarado ${onde}.`, severidade: "aviso" });
				}
			}
		}
		return ids;
	}

	/**
	 * @param {Record<string, unknown>} s
	 * @param {string} chaveOpcoes
	 * @param {string} chaveDefault
	 * @param {(string | number)[]} aqui
	 */
	function conferirDefault(s, chaveOpcoes, chaveDefault, aqui) {
		const opcoes = s[chaveOpcoes];
		const padrao = s[chaveDefault];
		if (!Array.isArray(opcoes) || padrao === undefined) return;
		const valores = opcoes.filter(ehObjeto).map((o) => /** @type {Record<string, unknown>} */ (o).value);
		if (valores.length && !valores.includes(padrao)) {
			regras.push({ caminho: [...aqui, chaveDefault], mensagem: `El ${chaveDefault} ${JSON.stringify(padrao)} no es el value de ninguna opción de ${chaveOpcoes} (${valores.map((v) => JSON.stringify(v)).join(", ")}).`, severidade: "aviso" });
		}
	}

	/**
	 * @param {Record<string, unknown>} s
	 * @param {(string | number)[]} aqui
	 */
	function conferirRange(s, aqui) {
		const { min, max } = s;
		if (!ehNumero(min) || !ehNumero(max)) return;
		const [a, b] = /** @type {number[]} */ ([min, max]);
		if (b <= a) {
			regras.push({ caminho: [...aqui, "max"], mensagem: `El max (${b}) tiene que ser mayor que el min (${a}).`, severidade: "erro" });
			return;
		}
		const padrao = s.default;
		if (ehNumero(padrao) && (/** @type {number} */ (padrao) < a || /** @type {number} */ (padrao) > b)) {
			regras.push({ caminho: [...aqui, "default"], mensagem: `El default (${padrao}) está fuera del intervalo, entre ${a} y ${b}.`, severidade: "aviso" });
		}
	}

	/**
	 * Bloques aceptados (y bloques definidos en línea, que traen settings propios).
	 * @param {unknown} blocos
	 * @param {(string | number)[]} base
	 */
	function conferirBlocos(blocos, base) {
		if (!Array.isArray(blocos)) return;
		const tipos = new Set();
		blocos.forEach((bloco, i) => {
			if (!ehObjeto(bloco)) return;
			const b = /** @type {Record<string, unknown>} */ (bloco);
			if (typeof b.type === "string") {
				if (tipos.has(b.type)) regras.push({ caminho: [...base, i, "type"], mensagem: `El tipo de bloque "${b.type}" está repetido en blocks.`, severidade: "aviso" });
				tipos.add(b.type);
			}
			if (Array.isArray(b.settings)) conferirSettings(b.settings, [...base, i, "settings"], `del bloque "${b.type}"`);
			conferirBlocos(b.blocks, [...base, i, "blocks"]);
		});
	}

	const ids = conferirSettings(raiz.settings, ["settings"], "en este archivo");
	conferirBlocos(raiz.blocks, ["blocks"]);

	// Settings de los presets que no existen en el archivo.
	if (Array.isArray(raiz.settings)) {
		const presets = Array.isArray(raiz.presets) ? raiz.presets.map((p, i) => /** @type {[unknown, (string | number)[]]} */ ([p, ["presets", i]])) : [];
		if (ehObjeto(raiz.default)) presets.push([raiz.default, ["default"]]);
		for (const [preset, base] of presets) {
			if (!ehObjeto(preset)) continue;
			const p = /** @type {Record<string, unknown>} */ (preset);
			if (!ehObjeto(p.settings)) continue;
			for (const chave of Object.keys(/** @type {object} */ (p.settings))) {
				if (!ids.has(chave) && !LAYOUT.includes(chave)) regras.push({ caminho: [...base, "settings", chave], mensagem: `El preset usa el setting "${chave}", que no está declarado en este archivo.`, severidade: "aviso", chave: true });
			}
		}
	}
	return regras;
}

/**
 * Valida o texto de um arquivo .tpl. Devolve a lista de problemas com offsets no texto
 * inteiro; lista vazia quando está tudo certo ou quando o arquivo não tem esquema.
 * @param {string} caminho
 * @param {string} texto
 * @returns {Problema[]}
 */
function validarTpl(caminho, texto) {
	const nome = esquemaDoArquivo(caminho);
	if (!nome) return [];
	const bloco = extrairSchema(texto);
	if (!bloco) return [];
	/** @type {jsonc.ParseError[]} */
	const errosDeSintaxe = [];
	const arvore = jsonc.parseTree(bloco.conteudo, errosDeSintaxe, { allowTrailingComma: false, disallowComments: true });
	if (errosDeSintaxe.length || !arvore) {
		return errosDeSintaxe.map((e) => ({
			inicio: bloco.inicio + e.offset,
			fim: bloco.inicio + e.offset + Math.max(e.length, 1),
			mensagem: `JSON inválido en {% schema %}: ${jsonc.printParseErrorCode(e.error)}.`,
			severidade: "erro"
		}));
	}

	const valor = jsonc.getNodeValue(arvore);
	const validar = validador().getSchema(BASE + nome);
	if (!validar) return [];
	const valido = validar(valor);

	/** @type {Problema[]} */
	const problemas = [];
	const vistos = new Set();
	for (const erro of (!valido && validar.errors) || []) {
		if (AGRUPADORAS.has(erro.keyword)) continue;
		const no = noDoErro(arvore, erro);
		const texto = mensagem(erro, /** @type {any} */ (erro.parentSchema));
		const chave = `${no.offset}:${texto}`;
		if (vistos.has(chave)) continue;
		vistos.add(chave);
		problemas.push({ inicio: bloco.inicio + no.offset, fim: bloco.inicio + no.offset + no.length, mensagem: texto, severidade: "erro" });
	}
	for (const regra of regrasDaTiendanube(valor)) {
		let no = jsonc.findNodeAtLocation(arvore, regra.caminho);
		if (!no) continue;
		// Quando o problema é a chave (as de settings de preset), marca a chave, não o valor.
		if (regra.chave && no.parent && no.parent.type === "property" && no.parent.children) no = no.parent.children[0];
		problemas.push({ inicio: bloco.inicio + no.offset, fim: bloco.inicio + no.offset + no.length, mensagem: regra.mensagem, severidade: regra.severidade });
	}
	return problemas;
}

module.exports = { esquemaDoArquivo, extrairSchema, validarTpl, validador, mensagemDeEnum, mensagemDeTipo, regrasDaTiendanube, TIPOS_DE_SETTING, BASE };
