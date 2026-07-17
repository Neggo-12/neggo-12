import { describe, it, expect } from 'vitest';
import { formatCOP } from '@/lib/utils';

// Intl.NumberFormat('es-CO', { style: 'currency' }) usa un espacio NO
// separable (U+00A0) entre "$" y el numero, no un espacio normal (U+0020) -
// escape real de JavaScript, sin caracteres ambiguos en el archivo fuente.
const NBSP = '\u00A0';

describe('formatCOP', () => {
  it('formatea un monto en pesos colombianos sin decimales', () => {
    expect(formatCOP(1_500_000)).toBe(`$${NBSP}1.500.000`);
  });

  it('formatea cero correctamente', () => {
    expect(formatCOP(0)).toBe(`$${NBSP}0`);
  });
});
