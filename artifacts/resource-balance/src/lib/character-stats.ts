export type StatGroup = 'final' | 'talent' | 'secondary' | 'primary';
export type StatMode = 'number' | 'percent';

export interface StatDef {
  key: string;
  group: StatGroup;
  mode: StatMode;
  /** When set, the field is locked to this display value. */
  fixed?: string;
}

export interface CharacterStats {
  current: Record<string, string>;
  goal: Record<string, string>;
}

export const STAT_DEFS: StatDef[] = [
  { key: 'hpFinal', group: 'final', mode: 'number' },
  { key: 'atkFinal', group: 'final', mode: 'number' },
  { key: 'defFinal', group: 'final', mode: 'number' },
  { key: 'manaFinal', group: 'final', mode: 'number' },
  { key: 'guardPoints', group: 'final', mode: 'number' },

  { key: 'talent', group: 'talent', mode: 'number' },

  { key: 'moveSpeed', group: 'secondary', mode: 'percent', fixed: '6' },
  { key: 'crit', group: 'secondary', mode: 'percent' },
  { key: 'critRes', group: 'secondary', mode: 'percent' },
  { key: 'critDmg', group: 'secondary', mode: 'percent' },
  { key: 'critDmgParry', group: 'secondary', mode: 'percent' },
  { key: 'focus', group: 'secondary', mode: 'percent' },
  { key: 'focusRes', group: 'secondary', mode: 'percent' },
  { key: 'focusDmg', group: 'secondary', mode: 'percent' },
  { key: 'focusDmgParry', group: 'secondary', mode: 'percent' },
  { key: 'break', group: 'secondary', mode: 'percent' },
  { key: 'breakRes', group: 'secondary', mode: 'percent' },
  { key: 'breakDmg', group: 'secondary', mode: 'percent' },
  { key: 'breakDmgParry', group: 'secondary', mode: 'percent' },
  { key: 'globalDmgBonus', group: 'secondary', mode: 'percent' },
  { key: 'globalDmgReduction', group: 'secondary', mode: 'percent' },
  { key: 'penetration', group: 'secondary', mode: 'number' },
  { key: 'parry', group: 'secondary', mode: 'number' },
  { key: 'dodge', group: 'secondary', mode: 'percent' },
  { key: 'ignoreDodge', group: 'secondary', mode: 'percent' },
  { key: 'block', group: 'secondary', mode: 'percent' },
  { key: 'ignoreBlock', group: 'secondary', mode: 'percent' },
  { key: 'cdReduction', group: 'secondary', mode: 'percent' },
  { key: 'speed', group: 'secondary', mode: 'percent' },
  { key: 'regen', group: 'secondary', mode: 'percent' },
  { key: 'healBonus', group: 'secondary', mode: 'percent' },
  { key: 'monsterDmgBonus', group: 'secondary', mode: 'percent' },
  { key: 'monsterDmgReduction', group: 'secondary', mode: 'percent' },
  { key: 'spiritDmgBonus', group: 'secondary', mode: 'percent' },
  { key: 'spiritDmgReduction', group: 'secondary', mode: 'percent' },
  { key: 'basicAtkBonus', group: 'secondary', mode: 'percent' },
  { key: 'basicAtkReduction', group: 'secondary', mode: 'percent' },
  { key: 'mainSkillBonus', group: 'secondary', mode: 'percent' },
  { key: 'mainSkillReduction', group: 'secondary', mode: 'percent' },
  { key: 'activeSkillBonus', group: 'secondary', mode: 'percent' },
  { key: 'activeSkillReduction', group: 'secondary', mode: 'percent' },
  { key: 'passiveSkillBonus', group: 'secondary', mode: 'percent' },
  { key: 'passiveSkillReduction', group: 'secondary', mode: 'percent' },
  { key: 'globalSkillBonus', group: 'secondary', mode: 'percent' },
  { key: 'globalSkillReduction', group: 'secondary', mode: 'percent' },
  { key: 'activeSkillFixedDmg', group: 'secondary', mode: 'number' },
  { key: 'passiveSkillFixedDmg', group: 'secondary', mode: 'number' },
  { key: 'dmgVsSorcerer', group: 'secondary', mode: 'percent' },
  { key: 'dmgVsWarrior', group: 'secondary', mode: 'percent' },
  { key: 'dmgVsSwordsman', group: 'secondary', mode: 'percent' },
  { key: 'dmgReductionFromSorcerer', group: 'secondary', mode: 'percent' },
  { key: 'dmgReductionFromWarrior', group: 'secondary', mode: 'percent' },
  { key: 'dmgReductionFromSwordsman', group: 'secondary', mode: 'percent' },
  { key: 'manaPercent', group: 'secondary', mode: 'percent' },
  { key: 'hpPracticePercent', group: 'secondary', mode: 'percent' },
  { key: 'atkPracticePercent', group: 'secondary', mode: 'percent' },
  { key: 'defPracticePercent', group: 'secondary', mode: 'percent' },
  { key: 'hpGlobalPercent', group: 'secondary', mode: 'percent' },
  { key: 'hpSeasonPercent', group: 'secondary', mode: 'percent' },
  { key: 'atkGlobalPercent', group: 'secondary', mode: 'percent' },
  { key: 'atkSeasonPercent', group: 'secondary', mode: 'percent' },
  { key: 'defGlobalPercent', group: 'secondary', mode: 'percent' },
  { key: 'defSeasonPercent', group: 'secondary', mode: 'percent' },
  { key: 'hpTalentPercent', group: 'secondary', mode: 'percent' },
  { key: 'atkTalentPercent', group: 'secondary', mode: 'percent' },
  { key: 'defTalentPercent', group: 'secondary', mode: 'percent' },

  { key: 'hp', group: 'primary', mode: 'number' },
  { key: 'atk', group: 'primary', mode: 'number' },
  { key: 'def', group: 'primary', mode: 'number' },
  { key: 'mana', group: 'primary', mode: 'number' },
];

export const STAT_GROUPS: StatGroup[] = ['final', 'talent', 'secondary', 'primary'];

const STAT_KEYS = new Set(STAT_DEFS.map((stat) => stat.key));

const SUFFIX_MULTIPLIERS: Record<string, number> = {
  k: 1e3,
  m: 1e6,
  b: 1e9,
  t: 1e12,
  aa: 1e15,
  ab: 1e18,
  ac: 1e21,
  ad: 1e24,
};

/** Parse values like 1500, 1.5k, 2m, 1.2aa into a finite number (or null). */
export function parseStatNumber(raw: string): number | null {
  const text = String(raw ?? '').trim().toLowerCase().replace(/\s+/g, '').replace(',', '.');
  if (!text) return null;
  const match = text.match(/^(-?\d+(?:\.\d+)?)([a-z]{0,2})$/);
  if (!match) return null;
  const base = Number(match[1]);
  if (!Number.isFinite(base)) return null;
  const suffix = match[2];
  if (!suffix) return base;
  const mult = SUFFIX_MULTIPLIERS[suffix];
  if (!mult) return null;
  return base * mult;
}

export function emptyCharacterStats(): CharacterStats {
  const current: Record<string, string> = {};
  const goal: Record<string, string> = {};
  for (const def of STAT_DEFS) {
    if (def.fixed !== undefined) {
      current[def.key] = def.fixed;
      goal[def.key] = def.fixed;
    }
  }
  return { current, goal };
}

export function sanitizeCharacterStats(raw: unknown): CharacterStats {
  const base = emptyCharacterStats();
  if (!raw || typeof raw !== 'object') return base;
  const data = raw as Partial<CharacterStats>;
  const cleanMap = (map: unknown): Record<string, string> => {
    if (!map || typeof map !== 'object') return {};
    const next: Record<string, string> = {};
    for (const [key, value] of Object.entries(map as Record<string, unknown>)) {
      if (!STAT_KEYS.has(key)) continue;
      const text = String(value ?? '').replace(/\0/g, '').slice(0, 40).trim();
      if (text) next[key] = text;
    }
    return next;
  };
  const current = { ...base.current, ...cleanMap(data.current) };
  const goal = { ...base.goal, ...cleanMap(data.goal) };
  for (const def of STAT_DEFS) {
    if (def.fixed !== undefined) {
      current[def.key] = def.fixed;
      goal[def.key] = def.fixed;
    }
  }
  return { current, goal };
}

export function progressRatio(currentRaw: string, goalRaw: string): number | null {
  const current = parseStatNumber(currentRaw);
  const goal = parseStatNumber(goalRaw);
  if (current === null || goal === null || goal === 0) return null;
  return Math.max(0, Math.min(1, current / goal));
}
