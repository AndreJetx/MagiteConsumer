import type { AppState, Frequency, Period, Scenario, Source } from './types';
import { sanitizeCharacterStats } from './character-stats';

const MAX_NAME = 80;
const MAX_RESOURCE = 40;
const MAX_AMOUNT = 1_000_000_000_000;
const FREQUENCIES = new Set<Frequency>(['once', 'minute', 'hour', 'day', 'week', 'interval']);
const PERIODS = new Set<Period>(['minute', 'hour', 'day', 'week']);

export function cleanInput(value: string, max = MAX_NAME): string {
  return String(value ?? '')
    .replace(/\0/g, '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/<[^>]*>/g, '')
    .replace(/[<>]/g, '')
    .replace(/javascript:/gi, '')
    .replace(/vbscript:/gi, '')
    .slice(0, max);
}

export function sanitizeText(value: string, max = MAX_NAME): string {
  return cleanInput(value, max).replace(/\s+/g, ' ').trim();
}

export function sanitizeInt(value: unknown, min: number, max: number, fallback = min): number {
  const parsed = Math.round(Number(value));
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function safeId(value: unknown, fallback: string): string {
  const text = String(value ?? '');
  return /^[A-Za-z0-9][A-Za-z0-9._:-]{0,79}$/.test(text) ? text : fallback;
}

function sanitizeSource(raw: Partial<Source>, fallbackId: string): Source | null {
  const name = sanitizeText(String(raw.name ?? ''), MAX_NAME);
  if (!name) return null;
  const frequency = FREQUENCIES.has(raw.frequency as Frequency) ? (raw.frequency as Frequency) : 'day';
  return {
    id: safeId(raw.id, fallbackId),
    name,
    amount: sanitizeInt(raw.amount, 0, MAX_AMOUNT, 0),
    frequency,
    occurrences: sanitizeInt(raw.occurrences, 1, 9_999, 1),
    addedAt: typeof raw.addedAt === 'string' && !Number.isNaN(Date.parse(raw.addedAt)) ? raw.addedAt : undefined,
    intervalDays: frequency === 'interval' ? sanitizeInt(raw.intervalDays, 2, 3_650, 15) : undefined,
  };
}

export function sanitizeImportedState(raw: unknown): AppState | null {
  if (!raw || typeof raw !== 'object') return null;
  const data = raw as Partial<AppState>;
  if (!Array.isArray(data.scenarios) || data.scenarios.length === 0) return null;

  const scenarios: Scenario[] = data.scenarios.slice(0, 20).flatMap((scenario, index) => {
    if (!scenario || typeof scenario !== 'object') return [];
    const id = safeId(scenario.id, `scenario-import-${index}`);
    const name = sanitizeText(String(scenario.name ?? ''), MAX_NAME) || `Cenário ${index + 1}`;
    const period = PERIODS.has(scenario.period as Period) ? (scenario.period as Period) : 'day';
    const sim = scenario.simulation ?? { battles: 0, activities: 0, gainAdjustment: 0, consumptionAdjustment: 0 };
    return [{
      id,
      name,
      resourceName: sanitizeText(String(scenario.resourceName ?? ''), MAX_RESOURCE),
      balance: sanitizeInt(scenario.balance, 0, MAX_AMOUNT, 0),
      period,
      gains: (scenario.gains ?? []).slice(0, 150).flatMap((source, sourceIndex) => {
        const next = sanitizeSource(source, `${id}-gain-${sourceIndex}`);
        return next ? [next] : [];
      }),
      consumptions: (scenario.consumptions ?? []).slice(0, 150).flatMap((source, sourceIndex) => {
        const next = sanitizeSource(source, `${id}-consume-${sourceIndex}`);
        return next ? [next] : [];
      }),
      simulation: {
        battles: sanitizeInt(sim.battles, 0, 10_000, 0),
        activities: sanitizeInt(sim.activities, 0, 10_000, 0),
        gainAdjustment: sanitizeInt(sim.gainAdjustment, -100, 1_000, 0),
        consumptionAdjustment: sanitizeInt(sim.consumptionAdjustment, -100, 1_000, 0),
      },
      characterStats: sanitizeCharacterStats((scenario as Scenario).characterStats),
    }];
  });

  if (scenarios.length === 0) return null;
  const activeId = scenarios.some((scenario) => scenario.id === data.activeId)
    ? String(data.activeId)
    : scenarios[0].id;
  return { scenarios, activeId };
}
