import { MoneyUtil } from './money.util';

describe('MoneyUtil', () => {
  it('adds using cents instead of floating point arithmetic', () => {
    expect(MoneyUtil.add(0.1, 0.2)).toBe(0.3);
  });

  it('normalizes values to two decimal places', () => {
    expect(MoneyUtil.normalize(10.235)).toBe(10.24);
    expect(MoneyUtil.normalize('10.234')).toBe(10.23);
  });

  it('calculates line subtotals with cent precision', () => {
    expect(MoneyUtil.multiply(1234.56, 3)).toBe(3703.68);
  });

  it('compares normalized values', () => {
    expect(MoneyUtil.compare(1.005, 1.01)).toBe(0);
    expect(MoneyUtil.compare(1.01, 1)).toBe(1);
  });
});
