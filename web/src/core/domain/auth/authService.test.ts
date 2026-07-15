import { describe, it, expect } from 'vitest';
import { friendlyDuplicateMessage, isAlreadyRegisteredError } from './authService';

describe('friendlyDuplicateMessage', () => {
  it('traduce un 23505 de numero_documento', () => {
    const error = { code: '23505', message: 'duplicate key value violates unique constraint "users_numero_documento_key"' };
    expect(friendlyDuplicateMessage(error)).toBe('Esta cédula/documento ya está registrado en el ecosistema.');
  });

  it('traduce un 23505 de nit', () => {
    const error = { code: '23505', message: 'duplicate key value violates unique constraint "organizations_nit_key"' };
    expect(friendlyDuplicateMessage(error)).toBe('Este NIT ya está registrado en el ecosistema.');
  });

  it('traduce un 23505 de email', () => {
    const error = { code: '23505', message: 'duplicate key value violates unique constraint "users_email_key"' };
    expect(friendlyDuplicateMessage(error)).toBe('Este correo ya está registrado.');
  });

  it('devuelve null cuando el código no es 23505 (ej. un RAISE EXCEPTION custom)', () => {
    const error = { code: 'P0001', message: 'Este NIT ya está registrado por otra cuenta en el sistema.' };
    expect(friendlyDuplicateMessage(error)).toBeNull();
  });

  it('devuelve null para un error sin forma reconocible', () => {
    expect(friendlyDuplicateMessage(null)).toBeNull();
    expect(friendlyDuplicateMessage('texto plano')).toBeNull();
  });
});

describe('isAlreadyRegisteredError', () => {
  it('detecta el código user_already_exists', () => {
    expect(isAlreadyRegisteredError({ code: 'user_already_exists', message: 'x' })).toBe(true);
  });

  it('detecta el mensaje "already registered" como fallback', () => {
    expect(isAlreadyRegisteredError({ message: 'User already registered' })).toBe(true);
  });

  it('es false para errores no relacionados', () => {
    expect(isAlreadyRegisteredError({ code: '23505', message: 'duplicate key nit' })).toBe(false);
    expect(isAlreadyRegisteredError(null)).toBe(false);
  });
});
