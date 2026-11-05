// @ts-check
"use strict";

// Converte data/twig.json (filtros e tags de Twig dos temas de Tiendanube / Nuvemshop)
// em snippets do VS Code. Lógica pura, sem `vscode`, para ser testável.

/**
 * Escapa o que o VS Code interpretaria no corpo de um snippet, fora de um campo.
 * @param {string} texto
 */
function escaparSnippet(texto) {
	return texto.replace(/\\/g, "\\\\").replace(/\$/g, "\\$");
}

/**
 * Escapa o texto padrão de um campo (`${1:texto}`), onde o `}` fecharia o campo.
 * @param {string} texto
 */
function escaparCampo(texto) {
	return escaparSnippet(texto).replace(/}/g, "\\}");
}

/** @param {string} tema */
function rotulo(tema) {
	if (tema === "classic") return " (temas clásicos)";
	if (tema === "sectionable") return " (temas seccionables)";
	return "";
}

/**
 * @typedef {{ prefix: string, body: string[], description: string }} Snippet
 * @typedef {{ nome: string, corpo: string, descricao: string, fonte: string, tema: string }} Filtro
 * @typedef {{ nome: string, prefixo: string, corpo: string[], descricao: string, fonte: string, tema: string }} Tag
 * @typedef {{ fontes: Record<string, string>, filtros: Filtro[], tags: Tag[] }} Dados
 */

/**
 * Cada filtro vira um snippet com prefixo `|nome`, que insere `| nome(...)`.
 * Cada tag vira um snippet com o prefixo próprio.
 * @param {Dados} dados
 * @returns {Record<string, Snippet>}
 */
function snippetsDeTwig(dados) {
	/** @type {Record<string, Snippet>} */
	const saida = {};
	for (const t of dados.tags) {
		saida[`tag ${t.nome}`] = {
			prefix: t.prefixo,
			body: t.corpo,
			description: `${t.descricao}${rotulo(t.tema)}\n${dados.fontes[t.fonte]}`
		};
	}
	for (const f of dados.filtros) {
		saida[`filtro ${f.nome}`] = {
			prefix: `|${f.nome}`,
			body: [`| ${f.corpo}`],
			description: `${f.descricao}${rotulo(f.tema)}\n${dados.fontes[f.fonte]}`
		};
	}
	return saida;
}

module.exports = { snippetsDeTwig, escaparSnippet, escaparCampo };
