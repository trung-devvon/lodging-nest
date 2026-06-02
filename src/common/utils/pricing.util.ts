import { Prisma, PriceAdjustType } from '@prisma/client';

export function toDecimal(
  value: Prisma.Decimal | number | string | null | undefined,
): Prisma.Decimal | null {
  if (value == null) return null;
  if (value instanceof Prisma.Decimal) return value;
  return new Prisma.Decimal(value.toString());
}

export function toMoneyDecimal(
  value: Prisma.Decimal | number | string | null | undefined,
): Prisma.Decimal | null {
  const decimal = toDecimal(value);
  return decimal ? decimal.toDecimalPlaces(2) : null;
}

export function calculatePrice(
  basePrice: Prisma.Decimal | number | string,
  adjustType: PriceAdjustType,
  adjustValue: Prisma.Decimal | number | string,
  overridePrice?: Prisma.Decimal | number | string | null,
): Prisma.Decimal {
  const base = toDecimal(basePrice);
  const adjust = toDecimal(adjustValue);
  const override = toMoneyDecimal(overridePrice);

  if (!base || !adjust) {
    throw new Error('basePrice and adjustValue are required');
  }

  if (adjustType === 'FIXED' && override) return override;
  if (adjustType === 'PERCENT_INCREASE') {
    return toMoneyDecimal(
      base.mul(new Prisma.Decimal(1).plus(adjust.div(100))),
    ) as Prisma.Decimal;
  }
  if (adjustType === 'PERCENT_DECREASE') {
    return toMoneyDecimal(
      base.mul(new Prisma.Decimal(1).minus(adjust.div(100))),
    ) as Prisma.Decimal;
  }
  return toMoneyDecimal(base) as Prisma.Decimal;
}
