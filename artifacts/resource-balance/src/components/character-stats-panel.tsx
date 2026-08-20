import {
  STAT_DEFS,
  STAT_GROUPS,
  parseStatNumber,
  progressRatio,
  type CharacterStats,
  type StatDef,
  type StatGroup,
} from '@/lib/character-stats';
import { useLocale } from '@/hooks/use-locale';

function StatRow({
  def,
  current,
  goal,
  onChange,
}: {
  def: StatDef;
  current: string;
  goal: string;
  onChange: (side: 'current' | 'goal', value: string) => void;
}) {
  const { t } = useLocale();
  const locked = def.fixed !== undefined;
  const ratio = progressRatio(current, goal);
  const currentParsed = parseStatNumber(current);
  const goalParsed = parseStatNumber(goal);
  const invalid =
    (current.trim() !== '' && currentParsed === null)
    || (goal.trim() !== '' && goalParsed === null);

  return (
    <div className={`stat-row ${locked ? 'locked' : ''}`} data-testid={`stat-row-${def.key}`}>
      <div className="stat-row-label">
        <span>{t(`charStats.fields.${def.key}`)}</span>
        {def.mode === 'percent' && <span className="stat-unit">%</span>}
        {locked && <span className="stat-fixed">{t('charStats.fixed')}</span>}
      </div>
      <div className="stat-row-inputs">
        <label className="sr-only" htmlFor={`stat-current-${def.key}`}>{t('charStats.current')}</label>
        <input
          id={`stat-current-${def.key}`}
          value={current}
          disabled={locked}
          placeholder={def.mode === 'percent' ? '0' : '0 / 1.5k'}
          onChange={(event) => onChange('current', event.target.value)}
          data-testid={`input-stat-current-${def.key}`}
        />
        <label className="sr-only" htmlFor={`stat-goal-${def.key}`}>{t('charStats.goal')}</label>
        <input
          id={`stat-goal-${def.key}`}
          value={goal}
          disabled={locked}
          placeholder={def.mode === 'percent' ? '0' : '0 / 2m'}
          onChange={(event) => onChange('goal', event.target.value)}
          data-testid={`input-stat-goal-${def.key}`}
        />
      </div>
      <div className="stat-progress" aria-hidden="true">
        <span style={{ width: `${(ratio ?? 0) * 100}%` }} />
      </div>
      {invalid && <div className="stat-row-error">{t('charStats.invalidNumber')}</div>}
      {ratio !== null && (
        <div className="stat-row-meta">{Math.round(ratio * 100)}% {t('charStats.ofGoal')}</div>
      )}
    </div>
  );
}

function StatGroupBlock({
  group,
  stats,
  onChange,
}: {
  group: StatGroup;
  stats: CharacterStats;
  onChange: (key: string, side: 'current' | 'goal', value: string) => void;
}) {
  const { t } = useLocale();
  const defs = STAT_DEFS.filter((def) => def.group === group);
  if (defs.length === 0) return null;

  return (
    <section className="card pad char-stats-group" data-testid={`char-stats-group-${group}`}>
      <div className="section-heading" style={{ marginBottom: 12 }}>
        <div>
          <div className="eyebrow">{t(`charStats.groups.${group}.eyebrow`)}</div>
          <h2>{t(`charStats.groups.${group}.title`)}</h2>
          <p>{t(`charStats.groups.${group}.copy`)}</p>
        </div>
      </div>
      <div className="char-stats-head">
        <span />
        <span>{t('charStats.current')}</span>
        <span>{t('charStats.goal')}</span>
      </div>
      <div className="char-stats-list">
        {defs.map((def) => (
          <StatRow
            key={def.key}
            def={def}
            current={stats.current[def.key] ?? def.fixed ?? ''}
            goal={stats.goal[def.key] ?? def.fixed ?? ''}
            onChange={(side, value) => onChange(def.key, side, value)}
          />
        ))}
      </div>
    </section>
  );
}

export function CharacterStatsPanel({
  stats,
  onChange,
}: {
  stats: CharacterStats;
  onChange: (next: CharacterStats) => void;
}) {
  const { t } = useLocale();

  const update = (key: string, side: 'current' | 'goal', value: string) => {
    const def = STAT_DEFS.find((item) => item.key === key);
    if (def?.fixed !== undefined) return;
    const cleaned = value.replace(/[^\d.,a-zA-Z+-]/g, '').slice(0, 40);
    onChange({
      ...stats,
      [side]: {
        ...stats[side],
        [key]: cleaned,
      },
    });
  };

  return (
    <div className="char-stats-panel reveal" data-testid="panel-character-stats">
      <section className="hero reveal" data-testid="section-char-stats-intro">
        <div className="hero-top">
          <div>
            <div className="eyebrow hero-label">{t('charStats.eyebrow')}</div>
            <h1>{t('charStats.title')}</h1>
            <p className="hero-copy">{t('charStats.copy')}</p>
          </div>
        </div>
        <div className="hero-bottom">
          <span className="pill">{t('charStats.hintNumber')}</span>
          <span className="pill">{t('charStats.hintPercent')}</span>
        </div>
      </section>
      {STAT_GROUPS.map((group) => (
        <StatGroupBlock key={group} group={group} stats={stats} onChange={update} />
      ))}
    </div>
  );
}
