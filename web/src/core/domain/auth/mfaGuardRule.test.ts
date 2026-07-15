import { describe, it, expect } from 'vitest';
import { shouldDenyForMfa } from './mfaGuardRule';

// Bug real cazado en producción: los guards exigían aal2 incondicionalmente,
// bloqueando a cualquier usuario SIN factor inscrito (huevo y gallina: nunca
// podía llegar a "Seguridad" para inscribirse).
describe('shouldDenyForMfa', () => {
  it('sin factor inscrito (nextLevel aal1) — permite, el rol basta', () => {
    expect(shouldDenyForMfa('aal1', 'aal1')).toBe(false);
  });

  it('con factor verificado pero sin challenge cumplido (currentLevel aal1, nextLevel aal2) — deniega', () => {
    expect(shouldDenyForMfa('aal1', 'aal2')).toBe(true);
  });

  it('con factor y challenge ya cumplido en esta sesión (ambos aal2) — permite', () => {
    expect(shouldDenyForMfa('aal2', 'aal2')).toBe(false);
  });
});
