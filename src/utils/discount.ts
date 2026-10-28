export type DiscountKind = 'fixed' | 'percent';

/** A discount definition as stored in `fee_discounts`. */
export interface DiscountRule {
  discount_type: DiscountKind;
  amount: number | string | null;
}

/**
 * Money value of a discount against a given base amount.
 * Percentage discounts resolve against the base, fixed ones are capped at it.
 * `override` lets a single allotment use a different value than the catalogue row.
 */
export function discountValue(
  discount: DiscountRule,
  base: number,
  override?: number | string | null,
): number {
  const safeBase = Number.isFinite(base) && base > 0 ? base : 0;
  const value = Number(override ?? discount.amount ?? 0);
  if (!Number.isFinite(value) || value <= 0 || safeBase === 0) return 0;
  if (discount.discount_type === 'percent') {
    return Math.round(((safeBase * Math.min(value, 100)) / 100) * 100) / 100;
  }
  return Math.min(value, safeBase);
}

export function roundMoney(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * 100) / 100;
}