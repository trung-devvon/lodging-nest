import { Prisma } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  registerDecorator,
} from 'class-validator';

type DecimalInputOptions = {
  maxScale?: number;
  min?: number | string;
};

function buildDecimalRegex(maxScale: number) {
  return maxScale === 0
    ? /^\d+$/
    : new RegExp(`^\\d+(\\.\\d{1,${maxScale}})?$`);
}

function normalizeDecimalString(value: unknown, maxScale: number) {
  if (typeof value !== 'string') return value;

  const trimmed = value.trim();
  if (!buildDecimalRegex(maxScale).test(trimmed)) return value;

  return new Prisma.Decimal(trimmed);
}

@ValidatorConstraint({ name: 'DecimalInput', async: false })
class DecimalInputConstraint implements ValidatorConstraintInterface {
  validate(value: unknown, args: ValidationArguments) {
    if (value === undefined || value === null) return true;

    const [options] = args.constraints as [DecimalInputOptions | undefined];
    const maxScale = options?.maxScale ?? 2;
    const min = options?.min;

    let decimal: Prisma.Decimal;

    if (value instanceof Prisma.Decimal) {
      decimal = value;
    } else if (
      typeof value === 'string' &&
      buildDecimalRegex(maxScale).test(value.trim())
    ) {
      decimal = new Prisma.Decimal(value.trim());
    } else {
      return false;
    }

    if (decimal.decimalPlaces() > maxScale) return false;
    if (
      min !== undefined &&
      decimal.lessThan(new Prisma.Decimal(min.toString()))
    ) {
      return false;
    }

    return true;
  }

  defaultMessage(args: ValidationArguments) {
    const [options] = args.constraints as [DecimalInputOptions | undefined];
    const maxScale = options?.maxScale ?? 2;
    const min = options?.min;

    if (min !== undefined) {
      return `${args.property} must be a decimal string >= ${min} with up to ${maxScale} fraction digits`;
    }

    return `${args.property} must be a decimal string with up to ${maxScale} fraction digits`;
  }
}

export function DecimalInput(
  options: DecimalInputOptions = {},
  validationOptions?: ValidationOptions,
) {
  const maxScale = options.maxScale ?? 2;

  return (target: object, propertyName: string) => {
    Transform(({ value }) => normalizeDecimalString(value, maxScale))(
      target,
      propertyName,
    );

    registerDecorator({
      target: target.constructor,
      propertyName,
      options: validationOptions,
      constraints: [options],
      validator: DecimalInputConstraint,
    });
  };
}
