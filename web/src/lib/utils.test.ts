import { describe, it, expect } from 'vitest';
import { normalizeCiudad } from './utils';

describe('normalizeCiudad', () => {
  it('quita tildes y normaliza a minúsculas para que el match de ciudad no dependa de acentos/mayúsculas', () => {
    expect(normalizeCiudad('Bogotá')).toBe('bogota');
    expect(normalizeCiudad('BOGOTÁ')).toBe('bogota');
    expect(normalizeCiudad('bogota')).toBe('bogota');
  });

  it('recorta espacios sobrantes', () => {
    expect(normalizeCiudad('  Medellín  ')).toBe('medellin');
  });
});
