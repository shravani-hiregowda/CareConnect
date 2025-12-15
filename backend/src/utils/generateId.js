/**
 * Generate custom CareConnect IDs
 * Example:
 *  generateId("P") → P-2025-0123
 *  generateId("N") → N-2025-0004
 *  generateId("APT") → APT-2025-0031
 */

export default function generateId(prefix) {
  const year = new Date().getFullYear();
  const random = Math.floor(1000 + Math.random() * 9000);

  return `${prefix}-${year}-${random}`;
}
