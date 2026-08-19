import { relations } from "drizzle-orm";
import {
  doublePrecision,
  integer,
  pgSchema,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const RESOURCE_SCHEMA = "resource_balance";
export const resourceBalance = pgSchema(RESOURCE_SCHEMA);

export const periodEnum = resourceBalance.enum("resource_period", [
  "minute",
  "hour",
  "day",
  "week",
]);
export const frequencyEnum = resourceBalance.enum("resource_frequency", [
  "once",
  "minute",
  "hour",
  "day",
  "week",
  "interval",
]);
export const sourceKindEnum = resourceBalance.enum("resource_source_kind", [
  "gain",
  "consume",
]);

export const scenarios = resourceBalance.table("scenarios", {
  id: text("id").primaryKey(),
  userId: text("user_id"),
  name: text("name").notNull(),
  resourceName: text("resource_name").notNull(),
  balance: doublePrecision("balance").notNull().default(0),
  period: periodEnum("period").notNull().default("day"),
  simBattles: integer("sim_battles").notNull().default(0),
  simActivities: integer("sim_activities").notNull().default(0),
  simGainAdjustment: doublePrecision("sim_gain_adjustment").notNull().default(0),
  simConsumptionAdjustment: doublePrecision("sim_consumption_adjustment")
    .notNull()
    .default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const sources = resourceBalance.table("sources", {
  id: text("id").primaryKey(),
  scenarioId: text("scenario_id")
    .notNull()
    .references(() => scenarios.id, { onDelete: "cascade" }),
  kind: sourceKindEnum("kind").notNull(),
  name: text("name").notNull(),
  amount: doublePrecision("amount").notNull(),
  frequency: frequencyEnum("frequency").notNull(),
  occurrences: integer("occurrences").notNull().default(1),
  sortOrder: integer("sort_order").notNull().default(0),
  addedAt: timestamp("added_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  intervalDays: integer("interval_days"),
});

export const appSettings = resourceBalance.table("app_settings", {
  id: integer("id").primaryKey().default(1),
  activeScenarioId: text("active_scenario_id").references(() => scenarios.id, {
    onDelete: "set null",
  }),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const appUsers = resourceBalance.table("app_users", {
  id: text("id").primaryKey(),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const appSessions = resourceBalance.table("app_sessions", {
  token: text("token").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => appUsers.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const userSettings = resourceBalance.table("user_settings", {
  userId: text("user_id")
    .primaryKey()
    .references(() => appUsers.id, { onDelete: "cascade" }),
  activeScenarioId: text("active_scenario_id"),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const scenariosRelations = relations(scenarios, ({ many }) => ({
  sources: many(sources),
}));

export const sourcesRelations = relations(sources, ({ one }) => ({
  scenario: one(scenarios, {
    fields: [sources.scenarioId],
    references: [scenarios.id],
  }),
}));
