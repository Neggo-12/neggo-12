import { describe, it, expect } from 'vitest';
import { sanitizeFileName } from './repositories';

describe('sanitizeFileName', () => {
  it('quita tildes, reemplaza espacios por guiones, colapsa guiones repetidos y preserva la extensión', () => {
    // Caso real que causó "Invalid key" en Supabase Storage (Fase 15.2).
    expect(sanitizeFileName('Documento sin título - Documentos de Google.pdf')).toBe(
      'Documento-sin-titulo-Documentos-de-Google.pdf',
    );
  });

  it('elimina caracteres fuera de [a-zA-Z0-9.-]', () => {
    expect(sanitizeFileName('factura#123 (final)!.png')).toBe('factura123-final.png');
  });

  it('no rompe un nombre ya válido', () => {
    expect(sanitizeFileName('factura-2026-07.pdf')).toBe('factura-2026-07.pdf');
  });
});
