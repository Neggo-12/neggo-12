import { describe, it, expect } from 'vitest';
import { shouldReactToForeignAuthChange } from './authChangeRule';

// Los 4 casos ya validados en producción durante la Fase de confiabilidad
// (bug real: un SIGNED_IN de un login normal en la misma pestaña se
// interpretaba como sesión ajena y reseteaba el store a mitad del login).
describe('shouldReactToForeignAuthChange', () => {
  it('login normal en la misma pestaña (store aún null) — no reacciona', () => {
    expect(shouldReactToForeignAuthChange('SIGNED_IN', null, 'user-a')).toBe(false);
  });

  it('TOKEN_REFRESHED del mismo usuario — no reacciona', () => {
    expect(shouldReactToForeignAuthChange('TOKEN_REFRESHED', 'user-a', 'user-a')).toBe(false);
  });

  it('hijack cross-tab — SIGNED_IN de un usuario distinto al que el store cree tener — reacciona', () => {
    expect(shouldReactToForeignAuthChange('SIGNED_IN', 'user-a', 'user-b')).toBe(true);
  });

  it('SIGNED_OUT con el store todavía poblado — reacciona', () => {
    expect(shouldReactToForeignAuthChange('SIGNED_OUT', 'user-a', null)).toBe(true);
  });

  it('SIGNED_OUT normal (store ya limpiado antes de signOut) — no reacciona', () => {
    expect(shouldReactToForeignAuthChange('SIGNED_OUT', null, null)).toBe(false);
  });
});
