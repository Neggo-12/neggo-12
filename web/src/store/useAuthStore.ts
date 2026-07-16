import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { UsuarioDB } from '@/types';
import {
  login as authServiceLogin,
  logout as authServiceLogout,
  restoreSession as authServiceRestoreSession,
  registerB2B as authServiceRegisterB2B,
  registerB2C as authServiceRegisterB2C,
  completeMfaChallenge as authServiceCompleteMfaChallenge,
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
  /** Real Supabase Auth session — null when not in production mode */
  session: AuthSession | null;
  /** Whether we're in demo or production mode */
  sessionMode: SessionMode;
  /** Whether the session restore has been attempted on app load */
  isSessionRestored: boolean;

  /** Authenticate via Supabase Auth (production mode) */
  loginWithCredentials: (input: LoginInput) => Promise<LoginResult>;
  /** Finishes a login left pending by requiresMfaChallenge — verifies the TOTP code */
  completeMfaLogin: (factorId: string, code: string) => Promise<LoginResult>;
  /** Register a B2B organization (production mode) */
  registerB2BOrganization: (input: RegisterB2BInput) => Promise<RegisterResult>;
  /** Register a B2C client (production mode) */
  registerB2CClient: (input: RegisterB2CInput) => Promise<RegisterResult>;
  /** Restore session from Supabase Auth on app load */
  restoreSession: () => Promise<void>;
  /** Clear the session (logout) */
  logout: () => Promise<void>;
  /** Returns the active organization ID from the production session, or null */
  getOrganizationId: () => string | null;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      currentUser: null,
      session: null,
      sessionMode: 'demo' as SessionMode,
      isSessionRestored: false,

      loginWithCredentials: async (input: LoginInput) => {
        // Clear the previous identity BEFORE calling signInWithPassword —
        // same reasoning as logout(): signInWithPassword fires SIGNED_IN as
        // part of its own processing, and the app's onAuthStateChange
        // listener (App.tsx) treats a SIGNED_IN with a different user id
        // than the store's current session as a foreign (cross-tab) sign-in.
        // Without this, logging into a different portal in the SAME tab
        // (store still holds the previous session) trips that rule mid-login
        // and resets the store before the new session is ever set.
        set({ session: null, currentUser: null });
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
          });
        }
        return result;
      },

      completeMfaLogin: async (factorId: string, code: string) => {
        const result = await authServiceCompleteMfaChallenge(factorId, code);
        if (result.success) {
          const session = getLastLoginSession();
          clearLastLoginSession();
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
          // Same reasoning as loginWithCredentials: clear any previous
          // identity before signing in, so the onAuthStateChange listener
          // never mistakes this auto-login for a foreign cross-tab sign-in.
          set({ session: null, currentUser: null });
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
              isSessionRestored: true,
            });
            return;
          }
        }
        set({ isSessionRestored: true });
      },

      logout: async () => {
        // Clear the store BEFORE calling supabase.auth.signOut() — signOut()
        // fires a SIGNED_OUT auth event synchronously as part of its own
        // processing, and the app's onAuthStateChange listener (App.tsx)
        // treats an unexpected SIGNED_OUT while session is still non-null as
        // a foreign session change. Clearing first makes session null by the
        // time the event fires, so a normal logout is never mistaken for one.
        const wasProduction = get().sessionMode === 'production';
        set({
          currentUser: null,
          session: null,
          sessionMode: 'demo',
        });
        if (wasProduction) {
          await authServiceLogout();
        }
      },

      getOrganizationId: () => {
        return get().session?.organizationId ?? null;
      },
    }),
    {
      name: 'neggo-auth-store',
      storage: createJSONStorage(() => sessionStorage),
      // Only persist demo mode data, never persist production sessions
      // (Supabase Auth manages its own session persistence via localStorage)
      partialize: (state) => ({
        currentUser: state.currentUser,
        sessionMode: state.sessionMode,
      }),
    }
  )
);
