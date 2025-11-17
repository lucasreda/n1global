/**
 * Utilitários para processar SKUs, incluindo detecção e divisão de SKUs concatenados
 */

/**
 * Normaliza um SKU para minúsculas para comparações case-insensitive
 * 
 * @param sku - String com SKU
 * @returns SKU normalizado em minúsculas
 */
export function normalizeSku(sku: string | null | undefined): string {
  if (!sku || typeof sku !== 'string') {
    return '';
  }
  return sku.toLowerCase().trim();
}

/**
 * Extrai SKUs individuais de uma string que pode conter SKUs concatenados com "+"
 * Exemplo: "ridery bike cycling bag+rescue card+oximetro" -> ["ridery bike cycling bag", "rescue card", "oximetro"]
 * 
 * @param sku - String com SKU(s) que pode conter múltiplos SKUs separados por "+"
 * @returns Array de SKUs individuais limpos (sem espaços extras) e normalizados em minúsculas
 */
export function extractSkusFromString(sku: string | null | undefined): string[] {
  if (!sku || typeof sku !== 'string') {
    return [];
  }

  // Divide por "+" e remove espaços em branco extras, normalizando para minúsculas
  return sku
    .split('+')
    .map(s => normalizeSku(s))
    .filter(s => s.length > 0); // Remove strings vazias
}

/**
 * Extrai todos os SKUs únicos de um array de produtos, incluindo SKUs concatenados
 * 
 * @param products - Array de produtos que podem ter SKUs concatenados
 * @returns Array de SKUs únicos individuais normalizados em minúsculas
 */
export function extractAllSkusFromProducts(products: any[]): string[] {
  if (!products || !Array.isArray(products) || products.length === 0) {
    return [];
  }

  const allSkus = new Set<string>();

  // Percorre todos os produtos
  for (const product of products) {
    if (product?.sku) {
      // Extrai SKUs individuais de cada produto (pode estar concatenado)
      // extractSkusFromString já normaliza para minúsculas
      const individualSkus = extractSkusFromString(product.sku);
      individualSkus.forEach(sku => allSkus.add(sku));
    }
  }

  return Array.from(allSkus);
}

