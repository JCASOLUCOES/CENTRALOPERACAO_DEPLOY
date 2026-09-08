/**
 * Utilitário centralizado para normalização e busca de texto.
 * Elimina a duplicação de lógica de normalize + search espalhada nos services.
 */

const REGEX_ACENTOS = /[\u0300-\u036f]/g;

/** Normaliza texto: lowercase + remove acentos (NFD decomposition). */
export function normalizar(texto: string): string {
  return texto
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(REGEX_ACENTOS, '');
}

/**
 * Busca single-term: verifica se o termo normalizado aparece em algum dos campos.
 *
 * @param termo Texto de busca do usuário
 * @param campos Campos a serem normalizados e concatenados para busca
 * @returns true se o termo for encontrado em qualquer campo
 */
export function buscarSingleTerm(termo: string, ...campos: string[]): boolean {
  const t = normalizar(termo);
  if (!t) return true;
  return campos.some(campo => normalizar(campo).includes(t));
}

/**
 * Busca multi-term: divide o termo por espaços e verifica se TODAS as palavras
 * aparecem no texto concatenado dos campos (AND lógico).
 *
 * @param termo Texto de busca do usuário (pode conter múltiplas palavras)
 * @param campos Campos a serem normalizados e concatenados para busca
 * @returns true se todas as palavras forem encontradas
 */
export function buscarMultiTerm(termo: string, ...campos: string[]): boolean {
  const t = normalizar(termo);
  if (!t) return true;
  const texto = campos.map(c => normalizar(c)).join(' ');
  return t.split(/\s+/).every(palavra => texto.includes(palavra));
}

/**
 * Busca multi-term com sinônimos: expande o termo usando um mapa de sinônimos
 * antes de fazer a busca multi-term.
 *
 * @param termo Texto de busca do usuário
 * @param sinonimos Mapa de sinônimos (chave normalizada → expansão)
 * @param campos Campos a serem concatenados para busca
 * @returns true se o termo (ou sua expansão) for encontrado
 */
export function buscarComSinonimos(
  termo: string,
  sinonimos: Record<string, string>,
  ...campos: string[]
): boolean {
  const t = normalizar(termo);
  if (!t) return true;
  const expandido = sinonimos[t] ? `${t} ${sinonimos[t]}` : t;
  const texto = campos.map(c => normalizar(c)).join(' ');
  return texto.includes(expandido);
}
