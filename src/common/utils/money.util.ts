/**
 * Politica monetaria Jordan:
 * - Los valores de entrada/salida siguen siendo `number` por compatibilidad con entidades decimal(12,2).
 * - Toda aritmetica se normaliza a centavos enteros para evitar errores binarios de punto flotante.
 * - El resultado vuelve como decimal con maximo 2 digitos, listo para TypeORM/MySQL.
 */
export class MoneyUtil {
  static readonly SCALE = 100;

  static toCents(value: number | string | null | undefined): number {
    const raw = String(value ?? 0).trim();
    if (!/^-?\d+(\.\d+)?$/.test(raw)) {
      throw new Error(`Valor monetario invalido: ${value}`);
    }

    const sign = raw.startsWith('-') ? -1 : 1;
    const unsigned = sign < 0 ? raw.slice(1) : raw;
    const [wholePart, fractionPart = ''] = unsigned.split('.');
    const fraction = fractionPart.padEnd(3, '0');
    const wholeCents = Number(wholePart) * MoneyUtil.SCALE;
    const decimalCents = Number(fraction.slice(0, 2));
    const roundUp = Number(fraction.charAt(2)) >= 5 ? 1 : 0;

    return sign * (wholeCents + decimalCents + roundUp);
  }

  static fromCents(cents: number): number {
    if (!Number.isFinite(cents)) {
      throw new Error(`Centavos invalidos: ${cents}`);
    }
    return Number((Math.round(cents) / MoneyUtil.SCALE).toFixed(2));
  }

  static normalize(value: number | string | null | undefined): number {
    return MoneyUtil.fromCents(MoneyUtil.toCents(value));
  }

  static add(...values: Array<number | string | null | undefined>): number {
    const cents = values.reduce<number>(
      (sum, value) => sum + MoneyUtil.toCents(value),
      0,
    );
    return MoneyUtil.fromCents(cents);
  }

  static subtract(
    base: number | string | null | undefined,
    ...values: Array<number | string | null | undefined>
  ): number {
    const cents = values.reduce<number>(
      (sum, value) => sum - MoneyUtil.toCents(value),
      MoneyUtil.toCents(base),
    );
    return MoneyUtil.fromCents(cents);
  }

  static multiply(
    value: number | string | null | undefined,
    multiplier: number,
  ): number {
    if (!Number.isFinite(multiplier)) {
      throw new Error(`Multiplicador monetario invalido: ${multiplier}`);
    }
    return MoneyUtil.fromCents(Math.round(MoneyUtil.toCents(value) * multiplier));
  }

  static maxZero(value: number | string | null | undefined): number {
    return Math.max(0, MoneyUtil.normalize(value));
  }

  static compare(
    left: number | string | null | undefined,
    right: number | string | null | undefined,
  ): number {
    return MoneyUtil.toCents(left) - MoneyUtil.toCents(right);
  }
}
