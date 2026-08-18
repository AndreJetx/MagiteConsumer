import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Check,
  Clock3,
  Copy,
  Download,
  Edit3,
  Gauge,
  Layers3,
  LogOut,
  Pencil,
  Plus,
  Save,
  Sparkles,
  Trash2,
  TrendingDown,
  TrendingUp,
  Upload,
  X,
  RotateCcw,
} from 'lucide-react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Route, Switch, Router as WouterRouter } from 'wouter';
import NotFound from '@/pages/not-found';
import { LoginScreen } from '@/pages/login';
import { AuthError, fetchAppState, fetchCurrentUser, logout, persistAppState, type AuthUser } from '@/lib/api';
import { readCachedState, writeCachedState } from '@/lib/storage';
import { cleanInput, sanitizeImportedState, sanitizeInt, sanitizeText } from '@/lib/sanitize';
import type { AppState, Frequency, Period, Scenario, Source, SourceKind } from '@/lib/types';

interface SourceDraft extends Omit<Source, 'id'> {
  id?: string;
  kind: SourceKind;
  cadence: 'recurring' | 'once';
}

const RECURRING_FREQUENCIES = ['minute', 'hour', 'day', 'week', 'interval'] as const;

const PERIOD_MINUTES: Record<Period, number> = { minute: 1, hour: 60, day: 1440, week: 10080 };
const FREQUENCY_MINUTES: Record<Exclude<Frequency, 'once' | 'interval'>, number> = {
  minute: 1,
  hour: 60,
  day: 1440,
  week: 10080,
};
const PERIOD_LABELS: Record<Period, string> = { minute: 'Minuto', hour: 'Hora', day: 'Dia', week: 'Semana' };
const FREQUENCY_LABELS: Record<Frequency, string> = {
  once: 'Uma vez',
  minute: 'Por minuto',
  hour: 'Por hora',
  day: 'Por dia',
  week: 'Por semana',
  interval: 'A cada N dias',
};
const HORIZONS = [
  { key: '1h', label: '1h', minutes: 60 },
  { key: '6h', label: '6h', minutes: 360 },
  { key: '12h', label: '12h', minutes: 720 },
  { key: '1d', label: '1d', minutes: 1440 },
  { key: '7d', label: '7d', minutes: 10080 },
  { key: '30d', label: '30d', minutes: 43200 },
  { key: '365d', label: '365d', minutes: 525600 },
] as const;

const makeId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

function createBlankScenario(name: string): Scenario {
  return {
    id: makeId('scenario'),
    name,
    resourceName: '',
    balance: 0,
    period: 'day',
    gains: [],
    consumptions: [],
    simulation: { battles: 0, activities: 0, gainAdjustment: 0, consumptionAdjustment: 0 },
  };
}

const defaultScenario = createBlankScenario('Cenário 1');
const defaultState: AppState = { scenarios: [defaultScenario], activeId: defaultScenario.id };

function sourceCount(state: AppState): number {
  return state.scenarios.reduce(
    (total, scenario) => total + scenario.gains.length + scenario.consumptions.length,
    0,
  );
}

function richerState(left: AppState, right: AppState): AppState {
  return sourceCount(left) > sourceCount(right) ? left : right;
}

function parseSourceDate(value?: string): Date {
  if (!value) return new Date();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function stampSource(source: Source): Source {
  if (source.addedAt || source.frequency === 'once') return source;
  return { ...source, addedAt: new Date().toISOString() };
}

function stampState(state: AppState): AppState {
  return {
    ...state,
    scenarios: state.scenarios.map((scenario) => ({
      ...scenario,
      gains: scenario.gains.map(stampSource),
      consumptions: scenario.consumptions.map(stampSource),
    })),
  };
}

function mergeSourceDates(primary: AppState, fallback: AppState): AppState {
  const byId = new Map<string, string>();
  for (const scenario of fallback.scenarios) {
    for (const source of [...scenario.gains, ...scenario.consumptions]) {
      if (source.addedAt) byId.set(source.id, source.addedAt);
    }
  }
  return {
    ...primary,
    scenarios: primary.scenarios.map((scenario) => ({
      ...scenario,
      gains: scenario.gains.map((source) => ({
        ...source,
        addedAt: source.addedAt ?? byId.get(source.id),
      })),
      consumptions: scenario.consumptions.map((source) => ({
        ...source,
        addedAt: source.addedAt ?? byId.get(source.id),
      })),
    })),
  };
}

function parseState(raw: string | null): AppState | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as AppState;
    if (!parsed?.scenarios?.length || !parsed.activeId) return null;
    const activeId = parsed.scenarios.some((scenario) => scenario.id === parsed.activeId)
      ? parsed.activeId
      : parsed.scenarios[0].id;
    return stampState({ ...parsed, activeId });
  } catch {
    return null;
  }
}

function isWeeklyDueToday(source: Pick<Source, 'frequency' | 'addedAt'>): boolean {
  if (source.frequency !== 'week') return false;
  return parseSourceDate(source.addedAt).getDay() === new Date().getDay();
}

function intervalDaysOf(source: Pick<Source, 'intervalDays'>): number {
  return Math.max(2, Math.round(source.intervalDays ?? 15));
}

function frequencyLabel(source: Pick<Source, 'frequency' | 'intervalDays'>): string {
  if (source.frequency === 'interval') return `A cada ${intervalDaysOf(source)} dias`;
  return FREQUENCY_LABELS[source.frequency];
}

function startOfLocalDay(date: Date): number {
  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
}

function isIntervalDueToday(source: Pick<Source, 'frequency' | 'addedAt' | 'intervalDays'>): boolean {
  if (source.frequency !== 'interval') return false;
  const added = parseSourceDate(source.addedAt);
  const diff = Math.round((startOfLocalDay(new Date()) - startOfLocalDay(added)) / 86_400_000);
  return diff >= 0 && diff % intervalDaysOf(source) === 0;
}

function listedHitTotal(sources: Source[], matches: (source: Source) => boolean): number {
  return sources
    .filter(matches)
    .reduce((sum, source) => sum + Math.round(source.amount * source.occurrences), 0);
}

function loadState(userId?: string): AppState {
  return parseState(readCachedState(userId)) ?? defaultState;
}

function formatNumber(value: number, digits = 0): string {
  return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: digits }).format(Math.round(value * 10 ** digits) / 10 ** digits);
}

function formatSigned(value: number, digits = 0): string {
  const rounded = digits === 0 ? Math.round(value) : value;
  return `${rounded > 0 ? '+' : ''}${formatNumber(rounded, digits)}`;
}

function isOnce(source: Pick<Source, 'frequency'>): boolean {
  return source.frequency === 'once';
}

function isAddedToday(source: Pick<Source, 'addedAt'>): boolean {
  if (!source.addedAt) return false;
  return startOfLocalDay(parseSourceDate(source.addedAt)) === startOfLocalDay(new Date());
}

function isOnceToday(source: Pick<Source, 'frequency' | 'addedAt'>): boolean {
  return isOnce(source) && isAddedToday(source);
}

function sourceOccurrences(source: Source, minutes: number): number {
  if (source.frequency === 'once') return source.occurrences;
  const cycleMinutes = source.frequency === 'interval'
    ? intervalDaysOf(source) * 1440
    : FREQUENCY_MINUTES[source.frequency];
  return (minutes / cycleMinutes) * source.occurrences;
}

function sourceTotal(source: Source, minutes: number): number {
  return Math.round(source.amount * sourceOccurrences(source, minutes));
}

function sourceListedTotal(source: Source): number {
  return Math.round(source.amount * source.occurrences);
}

function sumSources(sources: Source[], minutes: number): number {
  return sources.reduce((sum, source) => sum + sourceTotal(source, minutes), 0);
}

function sumListed(sources: Source[]): number {
  return sources.reduce((sum, source) => sum + sourceListedTotal(source), 0);
}

function formatDuration(minutes: number): string {
  if (!Number.isFinite(minutes)) return 'Nunca';
  if (minutes <= 0) return 'Agora';
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const mins = Math.round(minutes % 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}min`;
  return `${Math.max(1, mins)} min`;
}

function formatChartTime(minutes: number): string {
  if (minutes < 60) return `${Math.round(minutes)}m`;
  if (minutes < 1440) return `${Math.round(minutes / 60)}h`;
  if (minutes < 10080) return `${Math.round(minutes / 1440)}d`;
  return `${Math.round(minutes / 10080)}sem`;
}

function App({ user, onLogout }: { user: AuthUser; onLogout: () => void }) {
  const [state, setState] = useState<AppState>(defaultState);
  const [hydrated, setHydrated] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'loading' | 'cloud' | 'local'>('loading');
  const [draft, setDraft] = useState<SourceDraft | null>(null);
  const [horizonKey, setHorizonKey] = useState<(typeof HORIZONS)[number]['key']>('7d');
  const skipPersistRef = useRef(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const activeScenario = state.scenarios.find((scenario) => scenario.id === state.activeId);
  const active = activeScenario ?? state.scenarios[0] ?? defaultScenario;

  useEffect(() => {
    let cancelled = false;
    const cached = loadState(user.id);

    (async () => {
      try {
        const cloud = await fetchAppState(user.token);
        if (cancelled) return;
        const chosen = cloud.scenarios?.length ? richerState(cached, cloud) : cached;
        const next = stampState(mergeSourceDates(chosen, cached));
        if (next.scenarios.length) {
          setState(next);
          writeCachedState(JSON.stringify(next), user.id);
        }
        setSyncStatus('cloud');
      } catch (error) {
        if (cancelled) return;
        if (cached.scenarios.length) setState(cached);
        setSyncStatus('local');
      }
      if (!cancelled) setHydrated(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [user.id]);

  useEffect(() => {
    if (!hydrated) return;
    writeCachedState(JSON.stringify(state), user.id);
    if (skipPersistRef.current) {
      skipPersistRef.current = false;
      return;
    }
    const timer = window.setTimeout(() => {
      persistAppState(state, user.token)
        .then(() => setSyncStatus('cloud'))
        .catch((error) => {
          if (error instanceof AuthError) {
            onLogout();
            return;
          }
          setSyncStatus('local');
        });
    }, 450);
    return () => window.clearTimeout(timer);
  }, [state, hydrated, user.id]);

  const updateActive = (updates: Partial<Scenario>) => {
    setState((previous) => ({
      ...previous,
      scenarios: previous.scenarios.map((scenario) =>
        scenario.id === previous.activeId ? { ...scenario, ...updates } : scenario,
      ),
    }));
  };

  const calculations = useMemo(() => {
    const minutes = PERIOD_MINUTES[active.period];
    const recurringGains = active.gains.filter((source) => !isOnce(source));
    const variableGains = active.gains.filter(isOnceToday);
    const recurringLosses = active.consumptions.filter((source) => !isOnce(source));
    const variableLosses = active.consumptions.filter(isOnceToday);
    const recurringGainsTotal = sumSources(recurringGains, minutes);
    const variableGainsTotal = sumSources(variableGains, minutes);
    const recurringLossesTotal = sumSources(recurringLosses, minutes);
    const variableLossesTotal = sumSources(variableLosses, minutes);
    const recurringGainsListed = sumListed(recurringGains);
    const variableGainsListed = sumListed(variableGains);
    const recurringLossesListed = sumListed(recurringLosses);
    const variableLossesListed = sumListed(variableLosses);
    const gainsTotal = recurringGainsTotal + variableGainsTotal;
    const consumptionTotal = recurringLossesTotal + variableLossesTotal;
    const gainsPerMinute = gainsTotal / minutes;
    const consumptionPerMinute = consumptionTotal / minutes;
    const netPerMinute = gainsPerMinute - consumptionPerMinute;
    const dailyGains = sumSources(active.gains.filter((source) => source.frequency === 'day'), 1440);
    const dailyVariableGains = sumListed(variableGains);
    const weeklyGainsToday = listedHitTotal(active.gains, isWeeklyDueToday);
    const intervalGainsToday = listedHitTotal(active.gains, isIntervalDueToday);
    const dailyLosses = sumSources(active.consumptions.filter((source) => source.frequency === 'day'), 1440);
    const dailyVariableLosses = sumListed(variableLosses);
    const weeklyLossesToday = listedHitTotal(active.consumptions, isWeeklyDueToday);
    const intervalLossesToday = listedHitTotal(active.consumptions, isIntervalDueToday);
    const realDayGains = dailyGains + dailyVariableGains + weeklyGainsToday + intervalGainsToday;
    const realDayLosses = dailyLosses + dailyVariableLosses + weeklyLossesToday + intervalLossesToday;
    const realDayNet = realDayGains - realDayLosses;
    const netPeriod = active.period === 'day' ? realDayNet : Math.round(gainsTotal - consumptionTotal);
    const depletionMinutes = netPerMinute < 0 ? active.balance / Math.abs(netPerMinute) : Infinity;
    return {
      periodMinutes: minutes,
      recurringGainsTotal,
      variableGainsTotal,
      recurringLossesTotal,
      variableLossesTotal,
      recurringGainsListed,
      variableGainsListed,
      recurringLossesListed,
      variableLossesListed,
      gainsTotal,
      consumptionTotal,
      netPeriod,
      gainsPerMinute,
      consumptionPerMinute,
      netPerMinute,
      gainsPerDay: gainsPerMinute * 1440,
      consumptionPerDay: consumptionPerMinute * 1440,
      netPerDay: Math.round(netPerMinute * 1440),
      finalBalance: Math.round(active.balance + netPeriod),
      depletionMinutes,
      dailyGains,
      dailyVariableGains,
      weeklyGainsToday,
      intervalGainsToday,
      dailyLosses,
      dailyVariableLosses,
      weeklyLossesToday,
      intervalLossesToday,
      realDayGains,
      realDayLosses,
      realDayNet,
    };
  }, [active]);

  const simulation = useMemo(() => {
    const cadence = Math.max(0.2, (active.simulation.battles + active.simulation.activities) / 12);
    const gains = calculations.gainsPerDay * cadence * (1 + active.simulation.gainAdjustment / 100);
    const consumption = calculations.consumptionPerDay * cadence
      * Math.max(0, 1 - active.simulation.consumptionAdjustment / 100);
    const net = gains - consumption;
    return { gains: Math.round(gains), consumption: Math.round(consumption), net: Math.round(net), balanceIn30Days: Math.round(active.balance + net * 30) };
  }, [active, calculations]);

  const horizon = HORIZONS.find((item) => item.key === horizonKey) ?? HORIZONS[4];
  const chartData = useMemo(() => {
    const points = 48;
    return Array.from({ length: points + 1 }, (_, index) => {
      const minutes = (horizon.minutes / points) * index;
      return {
        minutes,
        label: formatChartTime(minutes),
        balance: Math.max(0, Math.round(active.balance + calculations.netPerMinute * minutes)),
      };
    });
  }, [active.balance, calculations.netPerMinute, horizon.minutes]);
  const chartDepletion = Number.isFinite(calculations.depletionMinutes)
    && calculations.depletionMinutes > 0
    && calculations.depletionMinutes <= horizon.minutes
    ? calculations.depletionMinutes
    : undefined;

  const openSourceEditor = (kind: SourceKind, cadence: 'recurring' | 'once', source?: Source) => {
    setDraft(source
      ? { ...source, kind, cadence: isOnce(source) ? 'once' : 'recurring' }
      : { kind, cadence, name: '', amount: 0, frequency: cadence === 'once' ? 'once' : 'day', occurrences: 1, intervalDays: 15 });
  };

  const saveSource = () => {
    if (!draft) return;
    const name = sanitizeText(draft.name);
    if (!name || draft.amount < 0 || draft.occurrences < 1) return;
    const key = draft.kind === 'gain' ? 'gains' : 'consumptions';
    const frequency: Frequency = draft.cadence === 'once' ? 'once' : (draft.frequency === 'once' ? 'day' : draft.frequency);
    const previous = draft.id ? active[key].find((item) => item.id === draft.id) : undefined;
    const addedAt = frequency === 'week' && previous?.frequency === 'week' && previous.addedAt
      ? previous.addedAt
      : previous?.frequency === frequency && previous.addedAt
        ? previous.addedAt
        : new Date().toISOString();
    const source: Source = {
      id: draft.id ?? makeId(draft.kind),
      name,
      amount: sanitizeInt(draft.amount, 0, 1_000_000_000_000, 0),
      frequency,
      occurrences: sanitizeInt(draft.occurrences, 1, 9_999, 1),
      addedAt,
      intervalDays: frequency === 'interval' ? intervalDaysOf(draft) : undefined,
    };
    const sources = draft.id
      ? active[key].map((item) => item.id === draft.id ? source : item)
      : [...active[key], source];
    updateActive({ [key]: sources });
    setDraft(null);
  };

  const deleteSource = (kind: SourceKind, sourceId: string) => {
    if (!window.confirm('Remover esta fonte do cenário?')) return;
    const key = kind === 'gain' ? 'gains' : 'consumptions';
    updateActive({ [key]: active[key].filter((source) => source.id !== sourceId) });
  };

  const createScenario = () => {
    const name = sanitizeText(window.prompt('Nome do novo cenário', 'Novo cenário') ?? '');
    if (!name) return;
    const scenario = createBlankScenario(name);
    setState((previous) => ({ scenarios: [...previous.scenarios, scenario], activeId: scenario.id }));
  };

  const renameScenario = () => {
    const name = sanitizeText(window.prompt('Novo nome para este cenário', active.name) ?? '');
    if (name) updateActive({ name });
  };

  const duplicateScenario = () => {
    const copy: Scenario = {
      ...active,
      id: makeId('scenario'),
      name: sanitizeText(`${active.name} — cópia`),
      gains: active.gains.map((source) => ({ ...source, id: makeId('gain') })),
      consumptions: active.consumptions.map((source) => ({ ...source, id: makeId('consume') })),
    };
    setState((previous) => ({ scenarios: [...previous.scenarios, copy], activeId: copy.id }));
  };

  const deleteScenario = () => {
    if (state.scenarios.length === 1) {
      window.alert('Mantenha pelo menos um cenário para continuar.');
      return;
    }
    if (!window.confirm(`Excluir o cenário “${active.name}”? Esta ação não pode ser desfeita.`)) return;
    setState((previous) => {
      const scenarios = previous.scenarios.filter((scenario) => scenario.id !== previous.activeId);
      return { scenarios, activeId: scenarios[0].id };
    });
  };

  const exportState = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'resource-balance-cenarios.json';
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const importState = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      const imported = sanitizeImportedState(JSON.parse(await file.text()));
      if (!imported) throw new Error('invalid');
      setState(imported);
    } catch {
      window.alert('Não foi possível importar este arquivo. Verifique se ele é um JSON do Resource Balance.');
    }
  };

  const resetScenario = () => {
    if (!window.confirm('Limpar este cenário? Ganhos, consumos e saldo voltam a zero.')) return;
    setState((previous) => ({
      ...previous,
      scenarios: previous.scenarios.map((scenario) => scenario.id === previous.activeId
        ? { ...createBlankScenario(scenario.name), id: scenario.id }
        : scenario),
    }));
  };

  return (
    <div className="app-frame">
      <header className="topbar">
        <div className="brand-lockup" data-testid="brand-resource-balance">
          <div className="brand-mark"><Gauge size={20} /></div>
          <div>
            <div className="brand-name">Resource Balance</div>
            <div className="brand-subtitle">clareza para cada recurso</div>
          </div>
        </div>
        <div className="topbar-actions">
          <div className="save-note" data-testid="status-local-saved">
            <span className="save-dot" />
            {syncStatus === 'cloud'
              ? 'salvo no Supabase'
              : syncStatus === 'loading'
                ? 'sincronizando...'
                : 'salvo neste dispositivo'}
          </div>
          <span className="save-note user-email" title={user.email}>{user.email}</span>
          <button className="button" onClick={onLogout} data-testid="button-logout" aria-label="Sair">
            <LogOut size={16} /><span>Sair</span>
          </button>
          <button className="button" onClick={exportState} data-testid="button-export-json" aria-label="Exportar cenários em JSON">
            <Download size={16} /><span>Exportar</span>
          </button>
          <button className="icon-button" onClick={() => fileInputRef.current?.click()} data-testid="button-import-json" aria-label="Importar cenários em JSON">
            <Upload size={16} />
          </button>
          <input ref={fileInputRef} type="file" accept="application/json,.json" onChange={importState} className="sr-only" data-testid="input-import-json" />
        </div>
      </header>

      <div className="workspace">
        <aside className="rail reveal" aria-label="Gerenciador de cenários">
          <div className="rail-top">
            <div>
              <div className="eyebrow">Seu atlas</div>
              <div className="rail-title">Cenários</div>
            </div>
            <Layers3 size={20} color="hsl(var(--primary))" />
          </div>
          <div className="rail-controls">
            <select
              className="scenario-select"
              value={active.id}
              onChange={(event) => setState((previous) => ({ ...previous, activeId: event.target.value }))}
              aria-label="Selecionar cenário"
              data-testid="select-scenario"
            >
              {state.scenarios.map((scenario) => <option key={scenario.id} value={scenario.id}>{scenario.name}</option>)}
            </select>
            <div className="rail-actions">
              <button className="button small soft" onClick={createScenario} data-testid="button-new-scenario"><Plus size={14} /> novo</button>
              <button className="button small" onClick={duplicateScenario} data-testid="button-duplicate-scenario"><Copy size={14} /> duplicar</button>
              <button className="button small" onClick={renameScenario} data-testid="button-rename-scenario"><Pencil size={13} /> nome</button>
            </div>
          </div>
          <hr className="rail-divider" />
          <p className="rail-note">
            Ajuste o ritmo do seu jogo, sem depender de memória. O cenário ativo é salvo
            <strong> automaticamente </strong>
            no banco.
          </p>
          <div className="quick-key"><span className="key-line" /> saldo vivo, calculado agora</div>
          <div className="rail-actions" style={{ marginTop: 18 }}>
              <button className="button small" onClick={resetScenario} data-testid="button-reset-example"><RotateCcw size={13} /> limpar</button>
            <button className="button small danger" onClick={deleteScenario} data-testid="button-delete-scenario"><Trash2 size={13} /> excluir</button>
          </div>
        </aside>

        <main className="main-content">
          <section className="hero reveal" data-testid="section-summary">
            <div className="hero-top">
              <div>
                <div className="eyebrow hero-label">Leitura do cenário · {active.name}</div>
                <h1>{active.resourceName || 'Seu recurso'} está {calculations.netPerMinute >= 0 ? 'ganhando fôlego' : 'pedindo atenção'}.</h1>
                <p className="hero-copy">
                  {calculations.netPerMinute >= 0
                    ? 'O ritmo atual acumula saldo. Você pode planejar a próxima sessão com tranquilidade.'
                    : 'O consumo supera os ganhos. Veja quando a reserva cruza o zero e escolha seu próximo movimento.'}
                </p>
              </div>
              <div className="hero-metric">
                <div className="metric-label">saldo após {PERIOD_LABELS[active.period].toLowerCase()}</div>
                <div className={`metric-value ${calculations.finalBalance >= active.balance ? 'positive' : 'negative'}`} data-testid="value-final-balance">
                  {formatSigned(calculations.finalBalance)}
                </div>
                <div className="metric-label">{formatSigned(calculations.netPeriod)} no período</div>
              </div>
            </div>
            <div className="hero-bottom">
              <span className="pill">ganhos recorrentes <strong>{formatNumber(calculations.recurringGainsListed)}</strong></span>
              <span className="pill">ganhos 1x hoje <strong>{formatNumber(calculations.variableGainsListed)}</strong></span>
              <span className="pill">perdas recorrentes <strong>{formatNumber(calculations.recurringLossesListed)}</strong></span>
              <span className="pill">perdas 1x hoje <strong>{formatNumber(calculations.variableLossesListed)}</strong></span>
              <span className="pill">duração <strong>{formatDuration(calculations.depletionMinutes)}</strong></span>
            </div>
          </section>

          <section className="section reveal delay-1" aria-labelledby="setup-title">
            <div className="section-heading">
              <div><div className="eyebrow">Ponto de partida</div><h2 id="setup-title">O que você está acompanhando?</h2></div>
              <span className="eyebrow">cenário editável</span>
            </div>
            <div className="setup-grid">
              <div className="card pad">
                <div className="field-grid">
                  <div className="field">
                    <label htmlFor="resource-name">Nome do recurso</label>
                    <input id="resource-name" maxLength={40} value={active.resourceName} onChange={(event) => updateActive({ resourceName: cleanInput(event.target.value, 40) })} data-testid="input-resource-name" />
                    <div className="field-help">O nome aparece no resumo e nas projeções.</div>
                  </div>
                  <div className="field">
                    <label htmlFor="initial-balance">Saldo inicial</label>
                    <input id="initial-balance" type="number" min="0" max="1000000000000" step="1" value={active.balance} onChange={(event) => updateActive({ balance: sanitizeInt(event.target.value, 0, 1_000_000_000_000, 0) })} data-testid="input-initial-balance" />
                    <div className="field-help">Unidades disponíveis agora.</div>
                  </div>
                </div>
                <div className="field" style={{ marginTop: 18 }}>
                  <label>Período de leitura</label>
                  <div className="period-wrap" role="group" aria-label="Período de leitura">
                    {(Object.keys(PERIOD_LABELS) as Period[]).map((period) => (
                      <button key={period} className={`period-button ${active.period === period ? 'active' : ''}`} onClick={() => updateActive({ period })} data-testid={`button-period-${period}`}>
                        {PERIOD_LABELS[period]}
                      </button>
                    ))}
                  </div>
                  <div className="field-help">Totais de cada fonte são normalizados para este período.</div>
                </div>
              </div>
              <div className="card pad balance-card">
                <div><div className="eyebrow">saldo neste momento</div><div className="metric-value" data-testid="value-current-balance">{formatNumber(active.balance)}</div></div>
                <div className="balance-foot"><Check size={14} /> base usada em todas as projeções</div>
              </div>
            </div>
          </section>

          <section className="section reveal delay-2" aria-labelledby="sources-title">
            <div className="section-heading">
              <div><div className="eyebrow">Cadência</div><h2 id="sources-title">Entradas e saídas</h2><p>Separe o que se repete do que acontece uma vez. Ganhos e gastos variáveis só aparecem no dia em que foram lançados.</p></div>
              <span className="eyebrow">{
                active.gains.filter((source) => !isOnce(source) || isOnceToday(source)).length
                + active.consumptions.filter((source) => !isOnce(source) || isOnceToday(source)).length
              } fontes ativas</span>
            </div>
            <div className="source-columns">
              <SourcePanel
                kind="gain"
                cadence="recurring"
                sources={active.gains.filter((source) => !isOnce(source))}
                total={calculations.recurringGainsListed}
                onAdd={() => openSourceEditor('gain', 'recurring')}
                onEdit={(source) => openSourceEditor('gain', 'recurring', source)}
                onDelete={(id) => deleteSource('gain', id)}
              />
              <SourcePanel
                kind="gain"
                cadence="once"
                sources={active.gains.filter(isOnceToday)}
                total={calculations.variableGainsListed}
                onAdd={() => openSourceEditor('gain', 'once')}
                onEdit={(source) => openSourceEditor('gain', 'once', source)}
                onDelete={(id) => deleteSource('gain', id)}
              />
              <SourcePanel
                kind="consume"
                cadence="recurring"
                sources={active.consumptions.filter((source) => !isOnce(source))}
                total={calculations.recurringLossesListed}
                onAdd={() => openSourceEditor('consume', 'recurring')}
                onEdit={(source) => openSourceEditor('consume', 'recurring', source)}
                onDelete={(id) => deleteSource('consume', id)}
              />
              <SourcePanel
                kind="consume"
                cadence="once"
                sources={active.consumptions.filter(isOnceToday)}
                total={calculations.variableLossesListed}
                onAdd={() => openSourceEditor('consume', 'once')}
                onEdit={(source) => openSourceEditor('consume', 'once', source)}
                onDelete={(id) => deleteSource('consume', id)}
              />
            </div>
          </section>

          <section className="section day-real" aria-labelledby="day-real-title">
            <div className="section-heading">
              <div>
                <div className="eyebrow">Hoje</div>
                <h2 id="day-real-title">Resultado real do dia</h2>
                <p>Recorrente diário, variáveis lançadas hoje, semanal no dia em que cai e recorrência maior (ex.: a cada 15 dias) no dia em que cai.</p>
              </div>
            </div>
            <div className="day-real-grid">
              <div className="card pad day-real-card">
                <div className="eyebrow">Ganhos do dia</div>
                <div className="day-real-row"><span>Recorrente diário</span><strong className="gain-text">+{formatNumber(calculations.dailyGains)}</strong></div>
                <div className="day-real-row"><span>Variáveis (hoje)</span><strong className="gain-text">+{formatNumber(calculations.dailyVariableGains)}</strong></div>
                <div className="day-real-row"><span>Semanal (hoje)</span><strong className="gain-text">+{formatNumber(calculations.weeklyGainsToday)}</strong></div>
                <div className="day-real-row"><span>A cada N dias (hoje)</span><strong className="gain-text">+{formatNumber(calculations.intervalGainsToday)}</strong></div>
                <div className="day-real-row total"><span>Total ganho</span><strong className="gain-text">+{formatNumber(calculations.realDayGains)}</strong></div>
              </div>
              <div className="card pad day-real-card consume">
                <div className="eyebrow">Gastos do dia</div>
                <div className="day-real-row"><span>Recorrente diário</span><strong className="loss-text">−{formatNumber(calculations.dailyLosses)}</strong></div>
                <div className="day-real-row"><span>Variáveis (hoje)</span><strong className="loss-text">−{formatNumber(calculations.dailyVariableLosses)}</strong></div>
                <div className="day-real-row"><span>Semanal (hoje)</span><strong className="loss-text">−{formatNumber(calculations.weeklyLossesToday)}</strong></div>
                <div className="day-real-row"><span>A cada N dias (hoje)</span><strong className="loss-text">−{formatNumber(calculations.intervalLossesToday)}</strong></div>
                <div className="day-real-row total"><span>Total gasto</span><strong className="loss-text">−{formatNumber(calculations.realDayLosses)}</strong></div>
              </div>
              <div className="card pad day-real-net">
                <div className="eyebrow">Líquido do dia</div>
                <div className={`metric-value ${calculations.realDayNet >= 0 ? 'positive' : 'negative'}`} data-testid="value-real-day-net">{formatSigned(calculations.realDayNet)}</div>
                <div className="metric-label">saldo inicial {formatNumber(active.balance)} → {formatNumber(active.balance + calculations.realDayNet)} no fim do dia</div>
              </div>
            </div>
          </section>

          <section className="section stats-grid reveal delay-3" aria-label="Indicadores de ritmo">
            <StatCard label="Saldo líquido / período" value={formatSigned(calculations.netPeriod)} detail={`a cada ${PERIOD_LABELS[active.period].toLowerCase()}`} tinted />
            <StatCard label="Resultado por dia" value={formatSigned(calculations.netPerDay)} detail="média linear do ritmo atual" />
            <StatCard label="Tempo até zerar" value={formatDuration(calculations.depletionMinutes)} detail={calculations.netPerMinute >= 0 ? 'crescendo, não há depletion' : 'a partir do saldo atual'} />
          </section>

          <section className="section card chart-card" aria-labelledby="chart-title">
            <div className="chart-head">
              <div><div className="chart-title" id="chart-title">Projeção de saldo</div><div className="chart-subtitle">Uma linha do tempo sem sustos — e um marco claro quando o saldo cruza o zero.</div></div>
              <div className="horizon-tabs" role="tablist" aria-label="Horizonte da projeção">
                {HORIZONS.map((item) => <button key={item.key} className={`horizon-tab ${horizonKey === item.key ? 'active' : ''}`} onClick={() => setHorizonKey(item.key)} data-testid={`button-horizon-${item.key}`} role="tab" aria-selected={horizonKey === item.key}>{item.label}</button>)}
              </div>
            </div>
            <div className="chart-wrap" data-testid="chart-balance-projection">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 8, left: -18, bottom: 2 }}>
                  <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 5" vertical={false} />
                  <XAxis dataKey="minutes" tickFormatter={formatChartTime} stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={45} tickFormatter={(value) => formatNumber(value, 0)} />
                  <ChartTooltip
                    cursor={{ stroke: 'hsl(var(--accent))', strokeDasharray: '3 3' }}
                    contentStyle={{ borderRadius: 10, border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))', fontSize: 12 }}
                    formatter={(value: number) => [`${formatNumber(value)} ${active.resourceName}`, 'Saldo']}
                    labelFormatter={(value) => `Em ${formatChartTime(Number(value))}`}
                  />
                  <ReferenceLine y={0} stroke="hsl(var(--destructive))" strokeDasharray="5 5" />
                  {chartDepletion !== undefined && <ReferenceLine x={chartDepletion} stroke="hsl(var(--destructive))" strokeDasharray="4 4" label={{ value: 'zero', position: 'insideTopRight', fill: 'hsl(var(--destructive))', fontSize: 11 }} />}
                  <Line type="monotone" dataKey="balance" stroke="hsl(var(--primary))" strokeWidth={3} dot={false} activeDot={{ r: 5, fill: 'hsl(var(--accent))', stroke: 'hsl(var(--card))', strokeWidth: 2 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="chart-legend"><span><span className="legend-mark balance" />saldo projetado</span><span><span className="legend-mark zero" />linha de segurança</span>{chartDepletion !== undefined && <span><Clock3 size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />zero em {formatDuration(chartDepletion)}</span>}</div>
          </section>

          <section className="section future-grid" aria-label="Projeções futuras">
            <div className="card pad">
              <div className="eyebrow">Horizonte longo</div>
              <div className="section-heading" style={{ margin: '4px 0 0' }}><div><h2>Se nada mudar</h2><p>Saldo estimado mantendo este mesmo ritmo.</p></div><TrendingUp size={20} color="hsl(var(--chart-3))" /></div>
              <div className="horizon-grid">
                {[1, 7, 30, 365].map((days) => {
                  const value = active.balance + calculations.netPerDay * days;
                  return <div className="future-item" key={days} data-testid={`future-balance-${days}d`}><div className="future-label">em {days} {days === 1 ? 'dia' : 'dias'}</div><div className={`future-value ${value >= 0 ? 'positive' : 'negative'}`}>{formatSigned(value)}</div></div>;
                })}
              </div>
            </div>
            <div className="card simulation-card">
              <div className="eyebrow">E se...</div>
              <h2 style={{ fontFamily: 'var(--app-font-display)', fontSize: 21, letterSpacing: '-.045em', margin: '4px 0 0' }}>eu mudar o ritmo?</h2>
              <p className="sim-copy">Compare outra rotina de batalhas e atividades sem mexer no cenário base.</p>
              <div className="sim-fields">
                <SimulationField label="batalhas / dia" value={active.simulation.battles} onChange={(value) => updateActive({ simulation: { ...active.simulation, battles: value } })} testId="input-simulation-battles" />
                <SimulationField label="atividades / dia" value={active.simulation.activities} onChange={(value) => updateActive({ simulation: { ...active.simulation, activities: value } })} testId="input-simulation-activities" />
                <SimulationField label="ajuste de ganhos %" value={active.simulation.gainAdjustment} min={-100} onChange={(value) => updateActive({ simulation: { ...active.simulation, gainAdjustment: value } })} testId="input-simulation-gain-adjustment" allowNegative />
                <SimulationField label="ajuste de consumo %" value={active.simulation.consumptionAdjustment} min={-100} onChange={(value) => updateActive({ simulation: { ...active.simulation, consumptionAdjustment: value } })} testId="input-simulation-consumption-adjustment" allowNegative />
              </div>
              <div className="sim-result"><div className="sim-result-label">saldo simulado em 30 dias</div><div className={`sim-result-value ${simulation.balanceIn30Days >= active.balance ? 'positive' : 'negative'}`} data-testid="value-simulation-30d">{formatSigned(simulation.balanceIn30Days)}</div><div className="sim-result-note">ritmo estimado: {formatSigned(simulation.net)} por dia</div></div>
            </div>
          </section>

          <section className="section card table-card" aria-labelledby="detail-title">
            <div className="table-intro"><h2 id="detail-title">Leitura detalhada</h2><p>Todos os valores já normalizados para o período selecionado: {PERIOD_LABELS[active.period].toLowerCase()}.</p></div>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Fonte</th><th>Tipo</th><th>Cadência</th><th>Ocorrências</th><th>Total / período</th><th>Média / min</th></tr></thead>
                <tbody>
                  {[
                    ...active.gains
                      .filter((source) => !isOnce(source) || isOnceToday(source))
                      .map((source) => ({ ...source, kind: 'gain' as SourceKind })),
                    ...active.consumptions
                      .filter((source) => !isOnce(source) || isOnceToday(source))
                      .map((source) => ({ ...source, kind: 'consume' as SourceKind })),
                  ].map((source) => (
                    <tr key={`detail-${source.id}`} data-testid={`row-detail-${source.id}`}>
                      <td><strong>{source.name}</strong></td>
                      <td><span className={`kind-badge ${source.kind}`}>{source.kind === 'gain' ? <ArrowUpRight size={11} /> : <ArrowDownLeft size={11} />}{source.kind === 'gain' ? 'ganho' : 'perda'} {isOnce(source) ? 'variável' : 'recorrente'}</span></td>
                      <td>{frequencyLabel(source)}</td>
                      <td className="mono">{formatNumber(source.occurrences, 0)}</td>
                      <td className={`mono ${source.kind === 'gain' ? 'gain-text' : 'loss-text'}`}>{source.kind === 'gain' ? '+' : '−'}{formatNumber(sourceTotal(source, calculations.periodMinutes))}</td>
                      <td className="mono">{formatNumber(sourceTotal(source, calculations.periodMinutes) / calculations.periodMinutes, 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {active.gains.filter((source) => !isOnce(source) || isOnceToday(source)).length
                + active.consumptions.filter((source) => !isOnce(source) || isOnceToday(source)).length === 0
                && <div className="empty-source">Adicione uma entrada ou saída acima para começar a leitura.</div>}
            </div>
          </section>
          <footer className="footer"><Sparkles size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} /> Resource Balance sincroniza os cenários com o Supabase e mantém uma cópia local neste dispositivo.</footer>
        </main>
      </div>

      {draft && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setDraft(null); }}>
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="source-modal-title">
            <div className="modal-head">
              <div><h2 id="source-modal-title" className="modal-title">{draft.id ? 'Editar fonte' : 'Adicionar fonte'}</h2><p className="modal-subtitle">{
                draft.kind === 'gain'
                  ? (draft.cadence === 'once' ? 'Ganho variável, uma vez.' : 'Ganho que se repete.')
                  : (draft.cadence === 'once' ? 'Perda variável, uma vez.' : 'Perda que se repete.')
              }</p></div>
              <button className="icon-button" onClick={() => setDraft(null)} aria-label="Fechar editor" data-testid="button-close-source-modal"><X size={17} /></button>
            </div>
            <div className="source-form">
              <div><label htmlFor="source-name">Nome da fonte</label><input id="source-name" maxLength={80} autoFocus value={draft.name} onChange={(event) => setDraft({ ...draft, name: cleanInput(event.target.value) })} placeholder={draft.kind === 'gain' ? 'Nome do ganho' : 'Nome da perda'} data-testid="input-source-name" /></div>
              <div className="source-form-grid">
                <div><label htmlFor="source-amount">Quantidade por ocorrência</label><input id="source-amount" type="number" min="0" max="1000000000000" step="1" value={draft.amount} onChange={(event) => setDraft({ ...draft, amount: sanitizeInt(event.target.value, 0, 1_000_000_000_000, 0) })} data-testid="input-source-amount" /></div>
                <div><label htmlFor="source-occurrences">Ocorrências</label><input id="source-occurrences" type="number" min="1" max="9999" step="1" value={draft.occurrences} onChange={(event) => setDraft({ ...draft, occurrences: sanitizeInt(event.target.value, 1, 9_999, 1) })} data-testid="input-source-occurrences" /></div>
              </div>
              {draft.cadence === 'once' ? (
                <p className="field-help">Entra só no resultado do dia em que for lançada. Amanhã este item some da lista.</p>
              ) : (
                <>
                  <div><label htmlFor="source-frequency">Frequência</label><select id="source-frequency" value={draft.frequency === 'once' ? 'day' : draft.frequency} onChange={(event) => setDraft({ ...draft, frequency: event.target.value as Frequency, intervalDays: draft.intervalDays ?? 15 })} data-testid="select-source-frequency">{RECURRING_FREQUENCIES.map((frequency) => <option key={frequency} value={frequency}>{FREQUENCY_LABELS[frequency]}</option>)}</select></div>
                  {draft.frequency === 'interval' && (
                    <div>
                      <label htmlFor="source-interval-days">A cada quantos dias?</label>
                      <input id="source-interval-days" type="number" min="2" max="3650" step="1" value={draft.intervalDays ?? 15} onChange={(event) => setDraft({ ...draft, intervalDays: sanitizeInt(event.target.value, 2, 3_650, 15) })} data-testid="input-source-interval-days" />
                      <p className="field-help">Entra no resultado real do dia em que foi cadastrado e de novo a cada {intervalDaysOf(draft)} dias.</p>
                    </div>
                  )}
                </>
              )}
              {(!draft.name.trim() || draft.amount < 0 || draft.occurrences < 1) && <p className="form-error">Informe um nome e valores iguais ou maiores que zero.</p>}
              <div className="source-form-actions"><button className="button" onClick={() => setDraft(null)} data-testid="button-cancel-source">Cancelar</button><button className="button primary" onClick={saveSource} disabled={!draft.name.trim() || draft.amount < 0 || draft.occurrences < 1} data-testid="button-save-source"><Save size={15} /> salvar fonte</button></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SourcePanel({
  kind,
  cadence,
  sources,
  total,
  onAdd,
  onEdit,
  onDelete,
}: {
  kind: SourceKind;
  cadence: 'recurring' | 'once';
  sources: Source[];
  total: number;
  onAdd: () => void;
  onEdit: (source: Source) => void;
  onDelete: (id: string) => void;
}) {
  const isGain = kind === 'gain';
  const isVariable = cadence === 'once';
  const title = isGain
    ? (isVariable ? 'Ganhos variáveis (1x)' : 'Ganhos recorrentes')
    : (isVariable ? 'Perdas variáveis (1x)' : 'Perdas recorrentes');
  const empty = isGain
    ? (isVariable ? 'Nenhum ganho variável hoje.' : 'Nenhum ganho recorrente.')
    : (isVariable ? 'Nenhuma perda variável hoje.' : 'Nenhuma perda recorrente.');
  return (
    <div className={`card source-panel ${isGain ? '' : 'consume'}`} data-testid={`panel-sources-${kind}-${cadence}`}>
      <div className="source-head">
        <div className="source-head-title">{isGain ? <TrendingUp /> : <TrendingDown />} {title}</div>
        <button className="button small soft" onClick={onAdd} data-testid={`button-add-source-${kind}-${cadence}`}><Plus size={14} /> adicionar</button>
      </div>
      <div className="source-list">
        {sources.length === 0 && <div className="empty-source">{empty}</div>}
        {sources.map((source) => (
          <div className="source-row" key={source.id} data-testid={`row-source-${source.id}`}>
            <div><div className="source-name">{source.name}</div><div className="source-meta">{isVariable ? 'Uma vez' : frequencyLabel(source)} · {formatNumber(source.occurrences, 0)} {source.occurrences === 1 ? 'vez' : 'vezes'}</div></div>
            <div className={`source-amount ${isGain ? 'gain-text' : 'loss-text'}`}>{isGain ? '+' : '−'}{formatNumber(sourceListedTotal(source))}</div>
            <div className="row-actions">
              <button className="icon-button" onClick={() => onEdit(source)} aria-label={`Editar ${source.name}`} data-testid={`button-edit-source-${source.id}`}><Edit3 size={14} /></button>
              <button className="icon-button" onClick={() => onDelete(source.id)} aria-label={`Remover ${source.name}`} data-testid={`button-delete-source-${source.id}`}><Trash2 size={14} /></button>
            </div>
          </div>
        ))}
      </div>
      <div className={`source-total ${isGain ? 'gain' : 'loss'}`} data-testid={`total-sources-${kind}-${cadence}`}>
        <span>Total</span>
        <strong>{isGain ? '+' : '−'}{formatNumber(total)}</strong>
      </div>
    </div>
  );
}

function StatCard({ label, value, detail, tinted = false }: { label: string; value: string; detail: string; tinted?: boolean }) {
  const positive = value.startsWith('+');
  const negative = value.startsWith('-') || value.startsWith('−');
  return <div className={`card stat-card ${tinted ? 'tinted' : ''}`} data-testid={`stat-${label.toLowerCase().replaceAll(' ', '-')}`}><div className="stat-label">{label}</div><div className={`stat-value ${positive ? 'positive' : ''} ${negative ? 'negative' : ''}`}>{value}</div><div className="stat-detail">{detail}</div></div>;
}

function SimulationField({ label, value, onChange, testId, min = 0, allowNegative = false }: { label: string; value: number; onChange: (value: number) => void; testId: string; min?: number; allowNegative?: boolean }) {
  return <div className="field"><label>{label}</label><input type="number" min={min} max={allowNegative ? 1000 : 10000} step="1" value={value} onChange={(event) => onChange(allowNegative ? sanitizeInt(event.target.value, -100, 1_000, 0) : sanitizeInt(event.target.value, 0, 10_000, 0))} data-testid={testId} /></div>;
}

function AuthGate() {
  const [user, setUser] = useState<AuthUser | null | undefined>(undefined);

  useEffect(() => {
    fetchCurrentUser()
      .then(setUser)
      .catch(() => setUser(null));
  }, []);

  if (user === undefined) {
    return (
      <div className="app-frame login-frame">
        <div className="login-card card pad">
          <div className="brand-name">Resource Balance</div>
          <p className="login-copy">Carregando sua sessão...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginScreen onLoggedIn={setUser} />;
  }

  return (
    <App
      user={user}
      onLogout={() => {
        void logout();
        setUser(null);
      }}
    />
  );
}

function Router() {
  return <Switch><Route path="/" component={AuthGate} /><Route component={NotFound} /></Switch>;
}

export default function RootApp() {
  return <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><Router /></WouterRouter>;
}