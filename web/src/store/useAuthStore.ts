import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
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

export interface AuthState {
  /** Real Supabase Auth session — null when not authenticated */
  session: AuthSession | null;
  /** Whether the session restore has been attempted on app load */
  isSessionRestored: boolean;

  /** Authenticate via Supabase Auth */
  loginWithCredentials: (input: LoginInput) => Promise<LoginResult>;
  /** Finishes a login left pending by requiresMfaChallenge — verifies the TOTP code */
  completeMfaLogin: (factorId: string, code: string) => Promise<LoginResult>;
  /** Register a B2B organization */
  registerB2BOrganization: (input: RegisterB2BInput) => Promise<RegisterResult>;
  /** Register a B2C client */
  registerB2CClient: (input: RegisterB2CInput) => Promise<RegisterResult>;
  /** Restore session from Supabase Auth on app load */
  restoreSession: () => Promise<void>;
  /** Clear the session (logout) */
  logout: () => Promise<void>;
  /** Returns the active organization ID from the session, or null */
  getOrganizationId: () => string | null;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      session: null,
      isSessionRestored: false,

      loginWithCredentials: async (input: LoginInput) => {
        // Clear the previous session BEFORE calling signInWithPassword —
        // same reasoning as logout(): signInWithPassword fires SIGNED_IN as
        // part of its own processing, and the app's onAuthStateChange
        // listener (App.tsx) treats a SIGNED_IN with a different user id
        // than the store's current session as a foreign (cross-tab) sign-in.
        // Without this, logging into a different portal in the SAME tab
        // (store still holds the previous session) trips that rule mid-login
        // and resets the store before the new session is ever set.
        set({ session: null });
        const result = await authServiceLogin(input);
        if (result.success) {
          const session = getLastLoginSession();
          clearLastLoginSession();
          set({ session });
        }
        return result;
      },

      completeMfaLogin: async (factorId: string, code: string) => {
        const result = await authServiceCompleteMfaChallenge(factorId, code);
        if (result.success) {
          const session = getLastLoginSession();
          clearLastLoginSession();
          set({ session });
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
          // Same reasoning as loginWithCredentials: clear the previous
          // session before signing in, so the onAuthStateChange listener
          // never mistakes this auto-login for a foreign cross-tab sign-in.
          set({ session: null });
          // Auto-login so the client goes straight to the portal
          const loginResult = await authServiceLogin({
            email: input.email,
            password: input.password,
          });
          if (loginResult.success) {
            const session = getLastLoginSession();
            clearLastLoginSession();
            set({ session });
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
            set({ session, isSessionRestored: true });
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
        const wasAuthenticated = get().session !== null;
        set({ session: null });
        if (wasAuthenticated) {
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
      // Nothing left to persist: Supabase Auth already manages session
      // persistence via its own localStorage entry, and `session` here is
      // always rebuilt from it through restoreSession() on app load.
      partialize: () => ({}),
    }
  )
);
