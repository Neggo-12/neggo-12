/**
 * Demo database — DEMO/PRESENTATION ONLY.
 *
 * These profiles power the {@link ProfileSwitcher} on the `/admin` page so the
 * ecosystem can be demoed without real credentials. Production users always
 * authenticate through `/login-ecosistema` → Supabase Auth.
 *
 * This is client-side demo data only and grants no real access: the app's real
 * security depends on Supabase Auth + RLS, never on these objects.
 */
import type { UsuarioDB } from '@/types';

/** Keys of the available demo profiles. */
export type DemoProfileKey =
  | 'cliente'
  | 'constructora'
  | 'banco'
  | 'comercio'
  | 'admin';

/** Demo users keyed by profile, used exclusively by the demo profile switcher. */
export const USUARIOS_DEMO: Record<DemoProfileKey, UsuarioDB> = {
  cliente: {
    id: 'USR-CLIENTE-01',
    nombre: 'Jhon Edison Florez',
    correo: 'jhon.florez@email.com',
    telefono: '+57 300 123 4567',
    ciudad: 'Medellín',
    rol: 'Cliente',
    rangoIngresos: '$3M - $6M COP',
    scoreEstimado: 726,
    fechaRegistro: '2024-01-15T10:00:00.000Z',
  },
  constructora: {
    id: 'USR-CONSTRUCTORA-01',
    nombre: 'Marval S.A.',
    correo: 'gerencia@marval.com.co',
    telefono: '+57 601 555 0100',
    ciudad: 'Bogotá',
    rol: 'Constructora',
    rangoIngresos: '',
    scoreEstimado: 0,
    fechaRegistro: '2024-01-10T10:00:00.000Z',
  },
  banco: {
    id: 'USR-BANCO-01',
    nombre: 'Bancolombia',
    correo: 'alianzas@bancolombia.com.co',
    telefono: '+57 604 555 0200',
    ciudad: 'Medellín',
    rol: 'Banco',
    rangoIngresos: '',
    scoreEstimado: 0,
    fechaRegistro: '2024-01-05T10:00:00.000Z',
  },
  comercio: {
    id: 'USR-COMERCIO-01',
    nombre: 'AutoMercado Premium',
    correo: 'ventas@automercado.com.co',
    telefono: '+57 602 555 0300',
    ciudad: 'Cali',
    rol: 'Comercio',
    rangoIngresos: '',
    scoreEstimado: 0,
    fechaRegistro: '2024-02-01T10:00:00.000Z',
  },
  admin: {
    id: 'USR-ADMIN-01',
    nombre: 'Admin Neggo',
    correo: 'admin@neggo.co',
    telefono: '+57 300 000 0000',
    ciudad: 'Bogotá',
    rol: 'Admin',
    rangoIngresos: '',
    scoreEstimado: 0,
    fechaRegistro: '2024-01-01T10:00:00.000Z',
  },
};
