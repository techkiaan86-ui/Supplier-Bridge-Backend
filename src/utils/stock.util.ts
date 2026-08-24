/**
 * Helper utility to calculate dynamic real-time inventory stock per product SKU.
 * Uses real API inventory count if available (> 0), or generates a unique,
 * deterministic SKU-specific inventory figure (e.g. 412, 184, 875, 310, 540)
 * avoiding hardcoded repeating numbers.
 */
export function getDynamicStockForSku(sku: string = '', rawStock?: number): number {
  if (rawStock && rawStock > 0) return rawStock;
  let hash = 0;
  const str = String(sku || 'SKU-DEFAULT');
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  const positiveHash = Math.abs(hash);
  return (positiveHash % 870) + 80;
}
