import { describe, it, expect } from 'vitest';
import { calcularScoreEstimado } from './types';

describe('calcularScoreEstimado', () => {
  it('mapea cada rango de ingresos al score fijo acordado', () => {
    expect(calcularScoreEstimado('0-2M')).toBe(450);
    expect(calcularScoreEstimado('2M-4M')).toBe(600);
    expect(calcularScoreEstimado('4M-8M')).toBe(720);
    expect(calcularScoreEstimado('8M+')).toBe(820);
  });
});
