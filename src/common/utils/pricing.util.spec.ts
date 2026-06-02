import { Prisma } from '@prisma/client';
import { calculatePrice, toMoneyDecimal } from './pricing.util';

describe('pricing.util', () => {
  it('calculates percent increase with Decimal and rounds to 2 decimal places', () => {
    const result = calculatePrice(
      new Prisma.Decimal('100.10'),
      'PERCENT_INCREASE',
      new Prisma.Decimal('12.5'),
    );

    expect(result.toFixed(2)).toBe('112.61');
  });

  it('normalizes money input to 2 decimal places', () => {
    const result = toMoneyDecimal(123.456);

    expect(result?.toFixed(2)).toBe('123.46');
  });
});
