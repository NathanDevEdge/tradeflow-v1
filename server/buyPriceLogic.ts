/**
 * Smart buy price logic for purchase orders
 * 
 * Rules:
 * 1. Default to loose buy price
 * 2. If quantity >= pack size AND pack buy price exists, use pack buy price
 * 3. If no pack size or pack buy price, always use loose buy price
 */

export interface PricelistItemPricing {
  looseBuyPrice: string | number;
  packBuyPrice?: string | number | null;
  packSize?: string | number | null;
}

export function calculateBuyPrice(
  quantity: number,
  item: PricelistItemPricing
): number {
  const looseBuyPrice = parseFloat(item.looseBuyPrice.toString());
  const packBuyPrice = item.packBuyPrice ? parseFloat(item.packBuyPrice.toString()) : null;
  const packSize = item.packSize ? parseFloat(item.packSize.toString()) : null;

  // If no pack size or pack buy price, always use loose buy price
  if (!packSize || !packBuyPrice) {
    return looseBuyPrice;
  }

  // If quantity meets or exceeds pack size, use pack buy price
  if (quantity >= packSize) {
    return packBuyPrice;
  }

  // Otherwise, use loose buy price
  return looseBuyPrice;
}

/**
 * Calculate line total for a purchase order item
 */
export function calculatePOLineTotal(
  quantity: number,
  item: PricelistItemPricing
): number {
  const buyPrice = calculateBuyPrice(quantity, item);
  return quantity * buyPrice;
}
