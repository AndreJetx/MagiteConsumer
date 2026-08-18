import { eq, isNotNull, isNull } from "drizzle-orm";
import { db } from "./client";
import { createEmptyScenario, type AppState, type Scenario, type Source } from "./defaults";
import { appSettings, scenarios, sources, userSettings } from "./schema";

function toSource(row: typeof sources.$inferSelect): Source {
  return {
    id: row.id,
    name: row.name,
    amount: row.amount,
    frequency: row.frequency,
    occurrences: row.occurrences,
    addedAt: row.addedAt.toISOString(),
    intervalDays: row.intervalDays ?? undefined,
  };
}

function toScenario(
  row: typeof scenarios.$inferSelect,
  sourceRows: Array<typeof sources.$inferSelect>,
): Scenario {
  const ordered = [...sourceRows].sort((a, b) => a.sortOrder - b.sortOrder);
  return {
    id: row.id,
    name: row.name,
    resourceName: row.resourceName,
    balance: row.balance,
    period: row.period,
    gains: ordered.filter((item) => item.kind === "gain").map(toSource),
    consumptions: ordered
      .filter((item) => item.kind === "consume")
      .map(toSource),
    simulation: {
      battles: row.simBattles,
      activities: row.simActivities,
      gainAdjustment: row.simGainAdjustment,
      consumptionAdjustment: row.simConsumptionAdjustment,
    },
  };
}

async function claimUnownedScenarios(userId: string, email: string): Promise<void> {
  const ownerEmail = process.env.OWNER_EMAIL?.trim().toLowerCase();
  if (ownerEmail && email !== ownerEmail) return;

  const unowned = await db
    .select({ id: scenarios.id })
    .from(scenarios)
    .where(isNull(scenarios.userId))
    .limit(1);
  if (unowned.length === 0) return;

  if (!ownerEmail) {
    const [owned] = await db
      .select({ id: scenarios.id })
      .from(scenarios)
      .where(isNotNull(scenarios.userId))
      .limit(1);
    if (owned) return;
  }

  const [legacy] = await db.select().from(appSettings).limit(1);
  await db.update(scenarios).set({ userId }).where(isNull(scenarios.userId));
  if (legacy?.activeScenarioId) {
    await db
      .insert(userSettings)
      .values({ userId, activeScenarioId: legacy.activeScenarioId })
      .onConflictDoNothing();
  }
}

export async function getAppState(userId: string, email: string): Promise<AppState> {
  await claimUnownedScenarios(userId, email);

  const rows = await db.query.scenarios.findMany({
    where: eq(scenarios.userId, userId),
    with: { sources: true },
  });

  if (rows.length === 0) {
    const empty = createEmptyScenario(`cenario-${userId.slice(-8)}`);
    return { scenarios: [empty], activeId: empty.id };
  }

  const mapped = rows.map((row) => toScenario(row, row.sources));
  const [settings] = await db
    .select()
    .from(userSettings)
    .where(eq(userSettings.userId, userId))
    .limit(1);
  const activeId = mapped.some((scenario) => scenario.id === settings?.activeScenarioId)
    ? settings.activeScenarioId!
    : mapped[0].id;

  return { scenarios: mapped, activeId };
}

const saveChains = new Map<string, Promise<void>>();

export async function saveAppState(userId: string, state: AppState): Promise<void> {
  const previous = saveChains.get(userId) ?? Promise.resolve();
  const run = previous.then(() => writeAppState(userId, state));
  saveChains.set(
    userId,
    run.then(
      () => undefined,
      () => undefined,
    ),
  );
  return run;
}

async function writeAppState(userId: string, state: AppState): Promise<void> {
  const sourceValues = state.scenarios.flatMap((scenario) => [
    ...scenario.gains.map((source, index) => ({
      id: source.id,
      scenarioId: scenario.id,
      kind: "gain" as const,
      name: source.name,
      amount: source.amount,
      frequency: source.frequency,
      occurrences: source.occurrences,
      sortOrder: index,
      addedAt: source.addedAt ? new Date(source.addedAt) : new Date(),
      intervalDays: source.frequency === "interval" ? source.intervalDays ?? 15 : null,
    })),
    ...scenario.consumptions.map((source, index) => ({
      id: source.id,
      scenarioId: scenario.id,
      kind: "consume" as const,
      name: source.name,
      amount: source.amount,
      frequency: source.frequency,
      occurrences: source.occurrences,
      sortOrder: index,
      addedAt: source.addedAt ? new Date(source.addedAt) : new Date(),
      intervalDays: source.frequency === "interval" ? source.intervalDays ?? 15 : null,
    })),
  ]);

  await db.transaction(async (tx) => {
    await tx.delete(scenarios).where(eq(scenarios.userId, userId));

    await tx.insert(scenarios).values(
      state.scenarios.map((scenario) => ({
        id: scenario.id,
        userId,
        name: scenario.name,
        resourceName: scenario.resourceName,
        balance: scenario.balance,
        period: scenario.period,
        simBattles: scenario.simulation.battles,
        simActivities: scenario.simulation.activities,
        simGainAdjustment: scenario.simulation.gainAdjustment,
        simConsumptionAdjustment: scenario.simulation.consumptionAdjustment,
      })),
    );

    if (sourceValues.length > 0) {
      await tx.insert(sources).values(sourceValues);
    }

    await tx
      .insert(userSettings)
      .values({
        userId,
        activeScenarioId: state.activeId,
      })
      .onConflictDoUpdate({
        target: userSettings.userId,
        set: {
          activeScenarioId: state.activeId,
          updatedAt: new Date(),
        },
      });
  });
}
