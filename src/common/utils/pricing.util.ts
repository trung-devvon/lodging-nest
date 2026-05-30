import { PriceAdjustType } from '@prisma/client';

export function calculatePrice(
  basePrice: number,
  adjustType: PriceAdjustType,
  adjustValue: number,
  overridePrice?: number | null,
): number {
  if (adjustType === 'FIXED' && overridePrice != null) return overridePrice;
  if (adjustType === 'PERCENT_INCREASE') return basePrice * (1 + adjustValue / 100);
  if (adjustType === 'PERCENT_DECREASE') return basePrice * (1 - adjustValue / 100);
  return basePrice;
}
