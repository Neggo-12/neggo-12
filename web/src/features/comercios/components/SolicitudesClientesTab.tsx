import { useState, useEffect, useCallback } from 'react';
import { Loader2, AlertTriangle, Clock, CheckCircle2, MessageCircle, KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  fetchComercioContactos,
  marcarComercioContactoAtendido,
  fetchOrganizationTelefono,
  type ComercioContactoRow,
} from '@/core/db/repositories';
import { isDbConfigured } from '@/core/db/dbClient';

function formatFecha(iso: string): string {
  return new Date(iso).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** Normaliza a formato wa.me con código de país Colombia — mismo criterio que ExpandedLeadCRM. */
function toWhatsAppUrl(telefono: string, mensaje: string): string {
  const digits = telefono.replace(/\D/g, '');
  const withCountryCode = digits.startsWith('57') && digits.length > 10 ? digits : `57${digits}`;
  return `https://wa.me/${withCountryCode}?text=${encodeURIComponent(mensaje)}`;
}

function ContactoCard({
  contacto,
  comercioTelefono,
  onMarcarAtendido,
}: {
  contacto: ComercioContactoRow;
  comercioTelefono: string | null;
  onMarcarAtendido: (id: string) => Promise<void>;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleClick = useCallback(async () => {
    setIsSubmitting(true);
    await onMarcarAtendido(contacto.id);
    setIsSubmitting(false);
  }, [contacto.id, onMarcarAtendido]);

  const mensajeWhatsApp = `Hola ${contacto.nombre}, nos escribiste por Neggo sobre: ${contacto.descripcion}. Tu código de verificación es: ${contacto.codigoVerificacion}.`;

  return (
    <div className="rounded-xl border border-border/40 bg-card/40 p-4 space-y-2.5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-foreground">{contacto.nombre}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5 font-mono">
            {contacto.telefono}
            {contacto.whatsapp && ` · WhatsApp ${contacto.whatsapp}`}
          </p>
        </div>
        <span className="text-[10px] text-muted-foreground shrink-0">{formatFecha(contacto.createdAt)}</span>
      </div>

      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{contacto.descripcion}</p>

      <div className="inline-flex items-center gap-1.5 rounded-lg border border-purple-500/20 bg-purple-500/5 px-2.5 py-1.5">
        <KeyRound className="h-3 w-3 text-purple-400" />
        <span className="text-[10px] text-muted-foreground">Código de verificación:</span>
        <span className="text-xs font-mono font-semibold text-purple-400">{contacto.codigoVerificacion}</span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {comercioTelefono && (
          <a
            href={toWhatsAppUrl(comercioTelefono, mensajeWhatsApp)}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10">
              <MessageCircle className="h-3.5 w-3.5" />
              Contactar por WhatsApp
            </Button>
          </a>
        )}

        {contacto.status === 'pendiente' ? (
          <Button
            size="sm"
            onClick={handleClick}
            disabled={isSubmitting}
            className="h-8 gap-1.5 text-xs bg-purple-600 hover:bg-purple-500 text-white"
          >
            {isSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
            Marcar Atendido
          </Button>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-400">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Atendido
          </span>
        )}
      </div>
    </div>
  );
}

export default function SolicitudesClientesTab({ organizationId }: { organizationId: string | null }) {
  const [contactos, setContactos] = useState<ComercioContactoRow[]>([]);
  const [comercioTelefono, setComercioTelefono] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadContactos = useCallback(async () => {
    if (!isDbConfigured || !organizationId) { setIsLoading(false); return; }
    setIsLoading(true);
    setError(null);
    const { data, error: fetchError } = await fetchComercioContactos(organizationId);
    if (fetchError) {
      setError(fetchError);
      setContactos([]);
    } else {
      setContactos(data ?? []);
    }
    setIsLoading(false);
  }, [organizationId]);

  useEffect(() => { loadContactos(); }, [loadContactos]);

  // Teléfono verificado de la organización — nunca un campo libre, para
  // construir un link de WhatsApp confiable en cada solicitud.
  useEffect(() => {
    if (!isDbConfigured || !organizationId) return;
    fetchOrganizationTelefono(organizationId).then(({ data }) => setComercioTelefono(data));
  }, [organizationId]);

  const handleMarcarAtendido = useCallback(async (id: string) => {
    if (!organizationId) return;
    setContactos((prev) => prev.map((c) => (c.id === id ? { ...c, status: 'atendido' } : c)));
    const { error: updateError } = await marcarComercioContactoAtendido(id, organizationId);
    if (updateError) {
      toast.error('No se pudo actualizar la solicitud', { description: updateError });
      await loadContactos();
    }
  }, [organizationId, loadContactos]);

  if (!isDbConfigured) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/20 mb-5">
          <AlertTriangle className="h-8 w-8 text-amber-400" />
        </div>
        <h3 className="text-base font-semibold text-foreground mb-2">Base de datos no configurada</h3>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in">
        <Loader2 className="h-10 w-10 text-primary animate-spin mb-4" />
        <p className="text-sm font-medium text-muted-foreground">Cargando solicitudes de clientes...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/10 border border-red-500/20 mb-5">
          <AlertTriangle className="h-8 w-8 text-red-400" />
        </div>
        <h3 className="text-base font-semibold text-foreground mb-2">Error al cargar solicitudes</h3>
        <p className="text-sm text-muted-foreground mb-4 max-w-md">{error}</p>
        <Button variant="outline" size="sm" onClick={loadContactos}>Reintentar</Button>
      </div>
    );
  }

  const pendientes = contactos.filter((c) => c.status === 'pendiente');
  const atendidos = contactos.filter((c) => c.status === 'atendido');

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-lg font-bold tracking-tight text-foreground">Solicitudes de Clientes</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Clientes que te contactaron desde el Buscador de Comercios del Portal
        </p>
      </div>

      {contactos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center rounded-2xl border border-border/40 bg-card/40">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-500/10 border border-purple-500/20 mb-4">
            <MessageCircle className="h-6 w-6 text-purple-400" />
          </div>
          <h4 className="text-sm font-semibold text-foreground mb-1">Aún no tienes solicitudes de clientes</h4>
          <p className="text-xs text-muted-foreground max-w-sm">
            Cuando un cliente te encuentre en el Buscador de Comercios y te contacte, aparecerá aquí.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {pendientes.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                Pendientes ({pendientes.length})
              </h3>
              {pendientes.map((c) => (
                <ContactoCard key={c.id} contacto={c} comercioTelefono={comercioTelefono} onMarcarAtendido={handleMarcarAtendido} />
              ))}
            </div>
          )}

          {atendidos.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Atendidas ({atendidos.length})
              </h3>
              {atendidos.map((c) => (
                <ContactoCard key={c.id} contacto={c} comercioTelefono={comercioTelefono} onMarcarAtendido={handleMarcarAtendido} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
