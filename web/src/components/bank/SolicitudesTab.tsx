import { useState, useMemo } from 'react';
import {
  Users, TrendingUp, Target, ShieldAlert, Award, AlertTriangle,
  Phone, MessageCircle, UserCheck, Eye, Flag, ArrowRightLeft,
  Search, Filter, SlidersHorizontal, ChevronDown, ChevronUp,
  ArrowUpDown, Download, Landmark, ShieldCheck
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import KPICard from '@/components/KPICard';
import ScoreBadge from '@/components/ScoreBadge';
import LeadStatusBadge from '@/components/LeadStatusBadge';
import ClientTypeBadge from '@/components/ClientTypeBadge';
import PriorityBadge from '@/components/PriorityBadge';
import BankClientBadge from '@/components/BankClientBadge';
import GestionarClienteDialog from '@/components/bank/GestionarClienteDialog';
import { leads, kpiData, productNames, banks, cities, ejecutivos } from '@/data/mock';
import { cn } from '@/lib/utils';
import type { Lead, ProductType, ClientType, LeadStatus, Priority } from '@/types';

type SortKey = keyof Lead;
type SortDir = 'asc' | 'desc';

export default function SolicitudesTab() {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('createdAt');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [filters, setFilters] = useState<{
    product?: ProductType;
    clientType?: ClientType;
    status?: LeadStatus;
    priority?: Priority;
    bank?: string;
    city?: string;
    assignedTo?: string;
    isBankClient?: boolean;
  }>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [seguridadLead, setSeguridadLead] = useState<Lead | null>(null);

  const filteredLeads = useMemo(() => {
    let result = [...leads];

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (l) =>
          l.name.toLowerCase().includes(q) ||
          l.phone.includes(q) ||
          l.email.toLowerCase().includes(q) ||
          l.id.toLowerCase().includes(q)
      );
    }

    if (filters.product) result = result.filter((l) => l.product === filters.product);
    if (filters.clientType) result = result.filter((l) => l.clientType === filters.clientType);
    if (filters.status) result = result.filter((l) => l.status === filters.status);
    if (filters.priority) result = result.filter((l) => l.priority === filters.priority);
    if (filters.bank) result = result.filter((l) => l.bank === filters.bank);
    if (filters.city) result = result.filter((l) => l.city === filters.city);
    if (filters.assignedTo) result = result.filter((l) => l.assignedTo === filters.assignedTo);
    if (filters.isBankClient !== undefined) result = result.filter((l) => l.isBankClient === filters.isBankClient);

    result.sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
      }
      const aStr = String(aVal).toLowerCase();
      const bStr = String(bVal).toLowerCase();
      return sortDir === 'asc' ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr);
    });

    return result;
  }, [search, sortKey, sortDir, filters]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const clearFilters = () => setFilters({});
  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  return (
    <>
      <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
        <KPICard
          title="Total Solicitudes"
          value={kpiData.totalSolicitudes.toLocaleString()}
          delta={kpiData.deltaSolicitudes}
          icon={Users}
          gradient="green"
        />
        <KPICard
          title="Convertidas"
          value={kpiData.convertidas.toLocaleString()}
          delta={kpiData.deltaConversion}
          icon={Target}
          gradient="blue"
        />
        <KPICard
          title="Tasa Conversión"
          value={kpiData.tasaConversion}
          suffix="%"
          delta={kpiData.deltaConversion}
          icon={TrendingUp}
          gradient="emerald"
        />
        <KPICard
          title="Score Promedio"
          value={kpiData.scorePromedio}
          delta={kpiData.deltaScore}
          icon={Award}
          gradient="purple"
        />
        <KPICard
          title="Alta Prioridad"
          value={kpiData.altaPrioridad}
          delta={kpiData.deltaPrioridad}
          icon={ShieldAlert}
          gradient="amber"
        />
        <KPICard
          title="Leads en Riesgo"
          value={kpiData.leadsRiesgo}
          icon={AlertTriangle}
          gradient="red"
        />
        <KPICard
          title="Clientes Banco"
          value={leads.filter((l) => l.isBankClient).length}
          icon={Landmark}
          gradient="cyan"
        />
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre, teléfono, email o ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-card/60 border-border/40 text-sm"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {activeFilterCount > 0 && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs text-muted-foreground hover:text-foreground">
              Limpiar filtros ({activeFilterCount})
            </Button>
          )}
          <FilterDropdown label="Producto" options={Object.entries(productNames).map(([k, v]) => ({ value: k, label: v }))} value={filters.product} onChange={(v) => setFilters({ ...filters, product: v as ProductType })} />
          <FilterDropdown label="Banco" options={banks.map((b) => ({ value: b, label: b }))} value={filters.bank} onChange={(v) => setFilters({ ...filters, bank: v })} />
          <FilterDropdown label="Ciudad" options={cities.map((c) => ({ value: c, label: c }))} value={filters.city} onChange={(v) => setFilters({ ...filters, city: v })} />
          <FilterDropdown label="Estado" options={['pendiente', 'contactado', 'en-proceso', 'documentacion', 'viable', 'aprobado', 'desembolsado', 'perdido'].map((s) => ({ value: s, label: s.charAt(0).toUpperCase() + s.slice(1).replace('-', ' ') }))} value={filters.status} onChange={(v) => setFilters({ ...filters, status: v as LeadStatus })} />
          <FilterDropdown label="Prioridad" options={['baja', 'media', 'alta', 'maxima'].map((p) => ({ value: p, label: p.charAt(0).toUpperCase() + p.slice(1) }))} value={filters.priority} onChange={(v) => setFilters({ ...filters, priority: v as Priority })} />
          <FilterDropdown label="Cliente Banco" options={[{ value: 'true', label: 'Cliente' }, { value: 'false', label: 'No Cliente' }]} value={filters.isBankClient === undefined ? undefined : String(filters.isBankClient)} onChange={(v) => setFilters({ ...filters, isBankClient: v === undefined ? undefined : v === 'true' })} />
          <Button variant="outline" size="sm" className="gap-1.5 text-xs border-border/40 bg-card/40">
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Más filtros
          </Button>
        </div>
      </div>

      {/* Leads Table */}
      <div className="rounded-xl border border-border/40 bg-card/40 overflow-hidden">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/40 bg-card/60">
                <SortableHeader label="Cliente" sortKey="name" currentKey={sortKey} dir={sortDir} onSort={toggleSort} />
                <SortableHeader label="Teléfono" sortKey="phone" currentKey={sortKey} dir={sortDir} onSort={toggleSort} className="hidden md:table-cell" />
                <SortableHeader label="Producto" sortKey="product" currentKey={sortKey} dir={sortDir} onSort={toggleSort} />
                <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground hidden lg:table-cell">Tipo</th>
                <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground hidden lg:table-cell">Cliente Banco</th>
                <SortableHeader label="Score" sortKey="score" currentKey={sortKey} dir={sortDir} onSort={toggleSort} />
                <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground hidden xl:table-cell">Prioridad</th>
                <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Estado</th>
                <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground hidden xl:table-cell">Actividad</th>
                <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground hidden lg:table-cell">Ejecutivo</th>
                <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {filteredLeads.map((lead) => (
                <>
                  <tr
                    key={lead.id}
                    className="group transition-colors hover:bg-card/60 cursor-pointer"
                    onClick={() => setExpandedId(expandedId === lead.id ? null : lead.id)}
                  >
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                          {lead.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                        </div>
                        <div>
                          <div className="font-medium text-foreground">{lead.name}</div>
                          <div className="text-[11px] text-muted-foreground font-mono">{lead.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 hidden md:table-cell">
                      <span className="font-mono text-xs text-muted-foreground">{lead.phone}</span>
                    </td>
                    <td className="px-3 py-3">
                      <Badge variant="outline" className="text-xs border-border/40 bg-secondary/40">
                        {productNames[lead.product]}
                      </Badge>
                    </td>
                    <td className="px-3 py-3 hidden lg:table-cell">
                      <ClientTypeBadge type={lead.clientType} />
                    </td>
                    <td className="px-3 py-3 hidden lg:table-cell">
                      <BankClientBadge isClient={lead.isBankClient} />
                    </td>
                    <td className="px-3 py-3">
                      <ScoreBadge score={lead.score} showLabel={false} size="sm" />
                    </td>
                    <td className="px-3 py-3 hidden xl:table-cell">
                      <PriorityBadge priority={lead.priority} />
                    </td>
                    <td className="px-3 py-3">
                      <LeadStatusBadge status={lead.status} />
                    </td>
                    <td className="px-3 py-3 hidden xl:table-cell">
                      <span className="text-xs text-muted-foreground">
                        {new Date(lead.lastActivity).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}
                      </span>
                    </td>
                    <td className="px-3 py-3 hidden lg:table-cell">
                      <span className="text-xs text-muted-foreground">{lead.assignedTo}</span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <ActionButton icon={Phone} tooltip="Llamar" />
                        <ActionButton icon={MessageCircle} tooltip="WhatsApp" />
                        <ActionButton icon={UserCheck} tooltip="Asignar" />
                        <ActionButton icon={Eye} tooltip="Ver perfil" />
                        <button className="ml-1 p-1 rounded hover:bg-muted transition-colors">
                          {expandedId === lead.id ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                  {expandedId === lead.id && (
                    <tr>
                      <td colSpan={11} className="px-3 py-4 bg-card/30 border-b border-border/20">
                        <ExpandedLead lead={lead} onGestionSegura={() => setSeguridadLead(lead)} />
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
        {filteredLeads.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Search className="h-10 w-10 text-muted-foreground/40 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">No se encontraron leads</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Intenta ajustar tus filtros o término de búsqueda</p>
          </div>
        )}
      </div>
    </div>
    {seguridadLead && (
      <GestionarClienteDialog
        open={seguridadLead !== null}
        onOpenChange={(open) => { if (!open) setSeguridadLead(null); }}
        lead={seguridadLead}
      />
    )}
    </>
  );
}

function SortableHeader({ label, sortKey, currentKey, dir, onSort, className }: {
  label: string;
  sortKey: SortKey;
  currentKey: SortKey;
  dir: SortDir;
  onSort: (k: SortKey) => void;
  className?: string;
}) {
  const isActive = currentKey === sortKey;
  return (
    <th
      className={cn('px-3 py-3 text-left cursor-pointer select-none hover:text-foreground transition-colors', className)}
      onClick={() => onSort(sortKey)}
    >
      <div className="flex items-center gap-1">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
        <ArrowUpDown className={cn('h-3 w-3 transition-colors', isActive ? 'text-primary' : 'text-muted-foreground/40')} />
        {isActive && <span className="text-[10px] text-primary font-mono">{dir === 'asc' ? '↑' : '↓'}</span>}
      </div>
    </th>
  );
}

function FilterDropdown({ label, options, value, onChange }: {
  label: string;
  options: { value: string; label: string }[];
  value?: string;
  onChange: (v: string | undefined) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className={cn('gap-1.5 text-xs border-border/40 bg-card/40', value && 'border-primary/40 text-primary')}>
          {label}
          <ChevronDown className="h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[160px] bg-card border-border/60">
        <DropdownMenuItem onClick={() => onChange(undefined)} className="text-xs text-muted-foreground">
          Todos
        </DropdownMenuItem>
        {options.map((opt) => (
          <DropdownMenuItem key={opt.value} onClick={() => onChange(opt.value)} className={cn('text-xs', value === opt.value && 'bg-primary/10 text-primary')}>
            {opt.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ActionButton({ icon: Icon, tooltip }: { icon: typeof Phone; tooltip: string }) {
  return (
    <button
      className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
      title={tooltip}
    >
      <Icon className="h-3.5 w-3.5" />
    </button>
  );
}

function ExpandedLead({ lead, onGestionSegura }: { lead: Lead; onGestionSegura: () => void }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="space-y-3">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Información Financiera</h4>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="rounded-lg bg-card/60 border border-border/30 p-2.5">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Score Datacrédito</div>
            <ScoreBadge score={lead.score} showLabel={true} size="md" />
          </div>
          <div className="rounded-lg bg-card/60 border border-border/30 p-2.5">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Ingresos Estimados</div>
            <div className="text-sm font-semibold text-foreground font-mono">
              ${lead.income?.toLocaleString('es-CO')}
            </div>
          </div>
        </div>
      </div>
      <div className="space-y-3">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Datos Operativos</h4>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">Banco</span><span className="font-medium">{lead.bank}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Ciudad</span><span className="font-medium">{lead.city}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Campaña</span><span className="font-medium">{lead.campaign}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Cliente Banco</span><span className="font-medium"><BankClientBadge isClient={lead.isBankClient} /></span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Creado</span><span className="font-mono text-xs">{new Date(lead.createdAt).toLocaleDateString('es-CO')}</span></div>
        </div>
      </div>
      <div className="space-y-3">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Acciones Rápidas</h4>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" className="gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700">
            <Phone className="h-3.5 w-3.5" /> Llamar
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5 text-xs border-border/40">
            <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5 text-xs border-border/40">
            <ArrowRightLeft className="h-3.5 w-3.5" /> Mover Pipeline
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5 text-xs border-border/40">
            <Flag className="h-3.5 w-3.5" /> Seguimiento
          </Button>
          <Button
            size="sm"
            onClick={onGestionSegura}
            className="gap-1.5 text-xs bg-cyan-600 hover:bg-cyan-500 text-white"
          >
            <ShieldCheck className="h-3.5 w-3.5" /> Gestión Segura
          </Button>
        </div>
      </div>
    </div>
  );
}
