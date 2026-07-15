import { describe, it, expect } from 'vitest';
import { formatCOP } from './MiFacturacionTab';

/**
 * DEUDA TECNICA (documentada a proposito, no resuelta en esta fase):
 * formatCOP NO es una funcion centralizada - existen 3 implementaciones
 * DISTINTAS (no copias identicas) repartidas en 7 archivos:
 *   1. `${value.toLocaleString('es-CO')} COP` (con signo $ manual) en
 *      FacturasView.tsx y MisPropuestasTab.tsx.
 *   2. Version abreviada con sufijos M/MMM (umbrales distintos entre si) en
 *      MetasView.tsx y OportunidadesInmobiliariasView.tsx.
 *   3. `Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' })`
 *      (con leves diferencias de opciones) en AlgorithmMonitor.tsx,
 *      MiFacturacionTab.tsx y AdminDashboard.tsx.
 * Este test cubre solo la copia de MiFacturacionTab.tsx (variante 3) como
 * representativa - consolidar en una sola funcion compartida queda
 * pendiente para una fase futura.
 */

// Intl.NumberFormat('es-CO', { style: 'currency' }) usa un espacio NO
// separable (U+00A0) entre "$" y el numero, no un espacio normal (U+0020) -
// escape real de JavaScript, sin caracteres ambiguos en el archivo fuente.
const NBSP = '\u00A0';

describe('formatCOP (MiFacturacionTab)', () => {
  it('formatea un monto en pesos colombianos sin decimales', () => {
    expect(formatCOP(1_500_000)).toBe(`$${NBSP}1.500.000`);
  });

  it('formatea cero correctamente', () => {
    expect(formatCOP(0)).toBe(`$${NBSP}0`);
  });
});
