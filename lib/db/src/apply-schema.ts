import { pool } from "./client";
import { rlsStatements } from "./rls";
import { RESOURCE_SCHEMA } from "./schema";

const schema = RESOURCE_SCHEMA;

const statements = [
  `create schema if not exists ${schema}`,
  `do $$ begin
    if exists (
      select 1 from pg_type t
      join pg_namespace n on n.oid = t.typnamespace
      where t.typname = 'resource_period' and n.nspname = 'public'
    ) then
      alter type public.resource_period set schema ${schema};
    end if;
  end $$`,
  `do $$ begin
    if exists (
      select 1 from pg_type t
      join pg_namespace n on n.oid = t.typnamespace
      where t.typname = 'resource_frequency' and n.nspname = 'public'
    ) then
      alter type public.resource_frequency set schema ${schema};
    end if;
  end $$`,
  `do $$ begin
    if exists (
      select 1 from pg_type t
      join pg_namespace n on n.oid = t.typnamespace
      where t.typname = 'resource_source_kind' and n.nspname = 'public'
    ) then
      alter type public.resource_source_kind set schema ${schema};
    end if;
  end $$`,
  ...["scenarios", "sources", "app_settings", "app_users", "app_sessions", "user_settings"].map(
    (table) => `
      do $$ begin
        if exists (
          select 1 from information_schema.tables
          where table_schema = 'public' and table_name = '${table}'
        ) then
          alter table public.${table} set schema ${schema};
        end if;
      end $$`,
  ),
  `do $$ begin
    create type ${schema}.resource_period as enum ('minute', 'hour', 'day', 'week');
  exception when duplicate_object then null;
  end $$`,
  `do $$ begin
    create type ${schema}.resource_frequency as enum ('once', 'minute', 'hour', 'day', 'week', 'interval');
  exception when duplicate_object then null;
  end $$`,
  `do $$ begin
    create type ${schema}.resource_source_kind as enum ('gain', 'consume');
  exception when duplicate_object then null;
  end $$`,
  `create table if not exists ${schema}.scenarios (
    id text primary key,
    user_id text,
    name text not null,
    resource_name text not null,
    balance double precision not null default 0,
    period ${schema}.resource_period not null default 'day',
    sim_battles integer not null default 0,
    sim_activities integer not null default 0,
    sim_gain_adjustment double precision not null default 0,
    sim_consumption_adjustment double precision not null default 0,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
  )`,
  `create table if not exists ${schema}.sources (
    id text primary key,
    scenario_id text not null references ${schema}.scenarios(id) on delete cascade,
    kind ${schema}.resource_source_kind not null,
    name text not null,
    amount double precision not null,
    frequency ${schema}.resource_frequency not null,
    occurrences integer not null default 1,
    sort_order integer not null default 0,
    added_at timestamptz not null default now(),
    interval_days integer
  )`,
  `alter table ${schema}.sources add column if not exists added_at timestamptz not null default now()`,
  `alter type ${schema}.resource_frequency add value if not exists 'interval'`,
  `alter table ${schema}.sources add column if not exists interval_days integer`,
  `create table if not exists ${schema}.app_settings (
    id integer primary key default 1,
    active_scenario_id text references ${schema}.scenarios(id) on delete set null,
    updated_at timestamptz not null default now()
  )`,
  `create index if not exists sources_scenario_id_idx on ${schema}.sources (scenario_id)`,
  `create table if not exists ${schema}.app_users (
    id text primary key,
    email text not null unique,
    password_hash text not null,
    created_at timestamptz not null default now()
  )`,
  `create table if not exists ${schema}.app_sessions (
    token text primary key,
    user_id text not null references ${schema}.app_users(id) on delete cascade,
    expires_at timestamptz not null,
    created_at timestamptz not null default now()
  )`,
  `create table if not exists ${schema}.user_settings (
    user_id text primary key references ${schema}.app_users(id) on delete cascade,
    active_scenario_id text,
    updated_at timestamptz not null default now()
  )`,
  `alter table ${schema}.scenarios add column if not exists user_id text`,
  `create index if not exists scenarios_user_id_idx on ${schema}.scenarios (user_id)`,
  `create index if not exists app_sessions_user_id_idx on ${schema}.app_sessions (user_id)`,
  ...rlsStatements(schema),
];

async function apply() {
  for (const statement of statements) {
    await pool.query(statement);
  }

  const tables = await pool.query(
    `
    select table_schema, table_name
    from information_schema.tables
    where table_schema = $1
      and table_name in ('scenarios', 'sources', 'app_settings', 'app_users', 'app_sessions', 'user_settings')
    order by table_name
  `,
    [schema],
  );
  const leftover = await pool.query(`
    select table_name
    from information_schema.tables
    where table_schema = 'public'
      and table_name in ('scenarios', 'sources', 'app_settings', 'app_users', 'app_sessions', 'user_settings')
    order by table_name
  `);
  const rls = await pool.query(
    `
    select c.relname as table_name, c.relrowsecurity as rls_enabled
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = $1
      and c.relname = any($2::text[])
    order by c.relname
  `,
    [schema, ["scenarios", "sources", "app_settings", "app_users", "app_sessions", "user_settings"]],
  );
  console.log(
    `Schema ${schema}:`,
    tables.rows.map((row) => row.table_name).join(", ") || "(vazio)",
  );
  console.log(
    "RLS:",
    rls.rows
      .map((row) => `${row.table_name}=${row.rls_enabled ? "on" : "off"}`)
      .join(", ") || "(nenhuma tabela)",
  );
  if (leftover.rows.length > 0) {
    console.warn(
      "Ainda em public:",
      leftover.rows.map((row) => row.table_name).join(", "),
    );
  }
  await pool.end();
}

apply().catch(async (error) => {
  console.error(error);
  await pool.end().catch(() => undefined);
  process.exit(1);
});
