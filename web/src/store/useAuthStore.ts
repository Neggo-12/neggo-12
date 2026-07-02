import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { UsuarioDB } from '@/types';
// Demo-only: used exclusively by ProfileSwitcher on the /admin page
// Production users authenticate via /login-ecosistema → Supabase Auth
import { USUARIOS_DEMO, type DemoProfileKey } from '@/core/db/mockDb';
import {
  login as authServiceLogin,
  logout as authServiceLogout,
  restoreSession as authServiceRestoreSession,
  registerB2B as authServiceRegisterB2B,
  registerB2C as authServiceRegisterB2C,
  getLastLoginSession,
  clearLastLoginSession,
} from '@/core/domain/auth/authService';
import type {
  LoginInput,
  AuthSession,
  RegisterB2BInput,
  RegisterB2CInput,
  RegisterResult,
  LoginResult,
} from '@/core/domain/auth/types';

// ───── Auth types ─────

export type UserRole = 'Cliente' | 'Admin' | 'Comercio' | 'Constructora' | 'Banco' | 'Fiduciaria';

export type SessionMode = 'demo' | 'production';

export interface AuthState {
  /** Currently active demo user — null when not in demo mode */
  currentUser: UsuarioDB | null;
  /** Key of the active demo profile for quick-switching */
  activeProfile: DemoProfileKey | null;
  /** Real Supabase Auth session — null when not in production mode */
  session: AuthSession | null;
  /** Whether we're in demo or production mode */
  sessionMode: SessionMode;
  /** Whether the session restore has been attempted on app load */
  isSessionRestored: boolean;

  /** Switch to a specific demo profile (demo mode) */
  switchProfile: (profile: DemoProfileKey) => void;
  /** Authenticate via Supabase Auth (production mode) */
  loginWithCredentials: (input: LoginInput) => Promise<LoginResult>;
  /** Register a B2B organization (production mode) */
  registerB2BOrganization: (input: RegisterB2BInput) => Promise<RegisterResult>;
  /** Register a B2C client (production mode) */
  registerB2CClient: (input: RegisterB2CInput) => Promise<RegisterResult>;
  /** Restore session from Supabase Auth on app load */
  restoreSession: () => Promise<void>;
  /** Clear the session (logout) */
  logout: () => Promise<void>;
  /** Get the redirect path for the current session (demo or production) */
  getRedirectPath: () => string;
  /** True when a real production session is active */
  isAuthenticated: () => boolean;
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

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      currentUser: null,
      activeProfile: null,
      session: null,
      sessionMode: 'demo' as SessionMode,
      isSessionRestored: false,

      switchProfile: (profile: DemoProfileKey) => {
        const user = USUARIOS_DEMO[profile];
        if (!user) return;
        // Switching to demo mode clears any production session
        set({
          currentUser: user,
          activeProfile: profile,
          session: null,
          sessionMode: 'demo',
        });

      },

      loginWithCredentials: async (input: LoginInput) => {
        const result = await authServiceLogin(input);
        if (result.success) {
          // Pick up the session established by authService
          const session = getLastLoginSession();
          clearLastLoginSession();

          // Also set currentUser for backward-compat with components that read it
          const demoUser: UsuarioDB | null = session
            ? {
                id: session.userId,
                nombre: session.email,
                correo: session.email,
                telefono: '',
                ciudad: '',
                rol: session.role as UsuarioDB['rol'],
                rangoIngresos: '',
                scoreEstimado: 0,
                fechaRegistro: new Date().toISOString(),
              }
            : null;

          set({
            session,
            sessionMode: 'production',
            currentUser: demoUser,
            activeProfile: null,
          });
        }
        return result;
      },

      registerB2BOrganization: async (input: RegisterB2BInput) => {
        const result = await authServiceRegisterB2B(input);
        // B2B organizations always need admin approval — never auto-login.
        // If email confirmation is required, the result includes the flag.
        return result;
      },

      registerB2CClient: async (input: RegisterB2CInput) => {
        const result = await authServiceRegisterB2C(input);
        // B2C clients are auto-approved — auto-login after registration
        // UNLESS email confirmation is required (Supabase Auth config)
        if (result.success && !result.pendingApproval && !result.requiresEmailConfirmation) {
          // Auto-login so the client goes straight to the portal
          const loginResult = await authServiceLogin({
            email: input.email,
            password: input.password,
          });
          if (loginResult.success) {
            const session = getLastLoginSession();
            clearLastLoginSession();
            const demoUser: UsuarioDB | null = session
              ? {
                  id: session.userId,
                  nombre: `${input.nombres} ${input.apellidos}`,
                  correo: session.email,
                  telefono: input.celular,
                  ciudad: '',
                  rol: 'Cliente',
                  rangoIngresos: '',
                  scoreEstimado: 0,
                  fechaRegistro: new Date().toISOString(),
                }
              : null;
            set({
              session,
              sessionMode: 'production',
              currentUser: demoUser,
              activeProfile: null,
            });
          }
        }
        return result;
      },

      restoreSession: async () => {
        const result = await authServiceRestoreSession();
        if (result.success && result.userId) {
          const session = getLastLoginSession();
          clearLastLoginSession();
          if (session) {
            const demoUser: UsuarioDB = {
              id: session.userId,
              nombre: session.email,
              correo: session.email,
              telefono: '',
              ciudad: '',
              rol: session.role as UsuarioDB['rol'],
              rangoIngresos: '',
              scoreEstimado: 0,
              fechaRegistro: new Date().toISOString(),
            };
            set({
              session,
              sessionMode: 'production',
              currentUser: demoUser,
              activeProfile: null,
              isSessionRestored: true,
            });
            return;
          }
        }
        set({ isSessionRestored: true });
      },

      logout: async () => {
        // If in production mode, sign out from Supabase
        if (get().sessionMode === 'production') {
          await authServiceLogout();
        }
        set({
          currentUser: null,
          activeProfile: null,
          session: null,
          sessionMode: 'demo',
        });
      },

      getRedirectPath: () => {
        const state = get();
        // Production session takes priority
        if (state.session) {
          return state.session.dashboardRoute;
        }
        // Demo profile
        const user = state.currentUser;
        if (!user) return '/';
        return ROLE_ROUTES[user.rol] || '/';
      },

      isAuthenticated: () => {
        return get().session !== null;
      },
    }),
    {
      name: 'neggo-auth-store',
      storage: createJSONStorage(() => sessionStorage),
      // Only persist demo mode data, never persist production sessions
      // (Supabase Auth manages its own session persistence via localStorage)
      partialize: (state) => ({
        currentUser: state.currentUser,
        activeProfile: state.activeProfile,
        sessionMode: state.sessionMode,
      }),
    }
  )
);
