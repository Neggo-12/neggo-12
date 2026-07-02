import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/useAuthStore';
import { USUARIOS_DEMO, type DemoProfileKey } from '@/core/db/mockDb';
import { cn } from '@/lib/utils';
import {
  UserCircle, Building2, Landmark, ShoppingBag,
  Crown, Sparkles, ChevronRight, LogOut,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

// ───── Icon mapping per profile ─────

// ───── Profile metadata ─────

interface ProfileMeta {
  key: DemoProfileKey;
  label: string;
  subtitle: string;
  redirectTo: string;
}

const PROFILE_METAS: ProfileMeta[] = [
  { key: 'cliente', label: 'Modo Cliente', subtitle: 'Portal B2C — Jhon Edison Flórez', redirectTo: '/portal' },
  { key: 'constructora', label: 'Modo Constructora', subtitle: 'Captación Inmobiliaria — Marval', redirectTo: '/constructoras' },
  { key: 'banco', label: 'Modo Banco', subtitle: 'Pipeline Bancario — Bancolombia', redirectTo: '/banca' },
  { key: 'comercio', label: 'Modo Comercio', subtitle: 'Portal B2B — AutoMercado', redirectTo: '/comercios' },
  { key: 'admin', label: 'Modo Admin Neggo', subtitle: 'Super Admin — Control Global', redirectTo: '/admin' },
];

const profileIcons: Record<DemoProfileKey, LucideIcon> = {
  cliente: UserCircle,
  constructora: Building2,
  banco: Landmark,
  comercio: ShoppingBag,
  admin: Crown,
};

const profileAccentRing: Record<DemoProfileKey, string> = {
  cliente: 'ring-cyan-500/50',
  constructora: 'ring-blue-500/50',
  banco: 'ring-emerald-500/50',
  comercio: 'ring-amber-500/50',
  admin: 'ring-slate-400/50',
};

// ───── Component ─────

export default function ProfileSwitcher() {
  const navigate = useNavigate();
  const { currentUser, activeProfile, switchProfile, logout } = useAuthStore();

  const handleSwitch = (profile: DemoProfileKey) => {
    const meta = PROFILE_METAS.find((p) => p.key === profile);
    if (!meta) return;

    switchProfile(profile);
    toast.success(`Entorno Conmutado: Operando como ${USUARIOS_DEMO[profile].rol}`, {
      description: meta.subtitle,
      duration: 3000,
    });
    navigate(meta.redirectTo);
  };

  const handleLogout = () => {
    logout();
    toast.info('Sesión cerrada — Volviendo al Hub Central');
    navigate('/');
  };

  return (
    <div className="rounded-2xl border border-border/40 bg-card/50 backdrop-blur-sm">
      {/* Header */}
      <div className="flex items-center gap-2 px-5 py-3 border-b border-border/30">
        <Sparkles className="h-4 w-4 text-emerald-400" />
        <h3 className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">
          Acceso a Entorno Regulado
        </h3>
      </div>

      {/* Session indicator or profile pills */}
      <div className="p-4 space-y-3">
        {currentUser ? (
          /* ── Active session ── */
          <div className="space-y-3">
            <div className={cn(
              'flex items-center gap-3 rounded-xl border bg-card/60 p-3 ring-1',
              activeProfile ? profileAccentRing[activeProfile] : 'ring-border/30',
            )}>
              <div className={cn(
                'flex h-10 w-10 shrink-0 items-center justify-center rounded-full border text-sm font-bold',
                activeProfile === 'cliente' && 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
                activeProfile === 'constructora' && 'bg-blue-500/10 text-blue-400 border-blue-500/20',
                activeProfile === 'banco' && 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
                activeProfile === 'comercio' && 'bg-amber-500/10 text-amber-400 border-amber-500/20',
                activeProfile === 'admin' && 'bg-slate-500/10 text-slate-300 border-slate-500/20',
              )}>
                {activeProfile && (() => {
                  const Icon = profileIcons[activeProfile];
                  return <Icon className="h-5 w-5" />;
                })()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground truncate">{currentUser.nombre}</p>
                <p className="text-[10px] text-muted-foreground">
                  {currentUser.rol} · {currentUser.ciudad}
                </p>
              </div>
              <button
                onClick={handleLogout}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-all"
                title="Cerrar sesión"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Quick switch pills when already logged in */}
            <div className="flex flex-wrap gap-1.5">
              {PROFILE_METAS.filter((p) => p.key !== activeProfile).map((profile) => (
                <button
                  key={profile.key}
                  onClick={() => handleSwitch(profile.key)}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-lg border border-border/40 bg-card/40 px-2.5 py-1.5 text-[10px] font-medium transition-all',
                    'text-muted-foreground hover:text-foreground hover:border-border/60 hover:bg-card/80',
                  )}
                >
                  {(() => { const Icon = profileIcons[profile.key]; return <Icon className="h-3 w-3" />; })()}
                  {profile.label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* ── No active session — full profile pills ── */
          <>
            <p className="text-[11px] text-muted-foreground/70 leading-relaxed">
              Selecciona un perfil de demo para acceder instantáneamente a cada entorno operativo del ecosistema Neggo.
            </p>
            <div className="grid gap-2">
              {PROFILE_METAS.map((profile) => {
                const Icon = profileIcons[profile.key];
                return (
                  <button
                    key={profile.key}
                    onClick={() => handleSwitch(profile.key)}
                    className={cn(
                      'group flex items-center gap-3 rounded-xl border border-border/40 bg-card/40 p-3 text-left transition-all',
                      'hover:scale-[1.01] hover:border-border/60 hover:bg-card/80 hover:shadow-sm',
                    )}
                  >
                    <div className={cn(
                      'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition-colors',
                      profile.key === 'cliente' && 'border-cyan-500/20 bg-cyan-500/10 text-cyan-400 group-hover:bg-cyan-500/20',
                      profile.key === 'constructora' && 'border-blue-500/20 bg-blue-500/10 text-blue-400 group-hover:bg-blue-500/20',
                      profile.key === 'banco' && 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500/20',
                      profile.key === 'comercio' && 'border-amber-500/20 bg-amber-500/10 text-amber-400 group-hover:bg-amber-500/20',
                      profile.key === 'admin' && 'border-slate-500/20 bg-slate-500/10 text-slate-300 group-hover:bg-slate-500/20',
                    )}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-foreground">{profile.label}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{profile.subtitle}</p>
                    </div>
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 transition-transform group-hover:translate-x-0.5" />
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
