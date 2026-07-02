import { create } from 'zustand';
import type { UsuarioDB } from '@/types';
import { USUARIOS_DEMO, type DemoProfileKey } from '@/core/db/mockDb';
import { upsertUsuario } from '@/core/db/repositories';

// ───── Auth types ─────

export type UserRole = 'Cliente' | 'Admin' | 'Comercio' | 'Constructora' | 'Banco' | 'Fiduciaria';

export interface AuthState {
  /** Currently active demo user — null when not "logged in" */
  currentUser: UsuarioDB | null;
  /** Key of the active demo profile for quick-switching */
  activeProfile: DemoProfileKey | null;

  /** Switch to a specific demo profile */
  switchProfile: (profile: DemoProfileKey) => void;
  /** Clear the session */
  logout: () => void;
  /** Get the redirect path for the current user role */
  getRedirectPath: () => string;
}

// ───── Role → route mapping ─────

const ROLE_ROUTES: Record<UserRole, string> = {
  Cliente: '/portal',
  Admin: '/admin',
  Comercio: '/comercios',
  Constructora: '/constructoras',
  Banco: '/banca',
  Fiduciaria: '/admin',
};

export const useAuthStore = create<AuthState>((set, get) => ({
  currentUser: null,
  activeProfile: null,

  switchProfile: (profile: DemoProfileKey) => {
    const user = USUARIOS_DEMO[profile];
    if (!user) return;
    set({ currentUser: user, activeProfile: profile });
    // Self-healing seed: garantiza que el usuario demo exista en la BD real
    void upsertUsuario(user);
  },

  logout: () => {
    set({ currentUser: null, activeProfile: null });
  },

  getRedirectPath: () => {
    const user = get().currentUser;
    if (!user) return '/';
    return ROLE_ROUTES[user.rol] || '/';
  },
}));
