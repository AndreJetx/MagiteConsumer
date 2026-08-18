import { RESOURCE_SCHEMA } from "./schema";

export const RLS_TABLES = [
  "scenarios",
  "sources",
  "app_settings",
  "app_users",
  "app_sessions",
  "user_settings",
] as const;

const POLICY = "deny_client_access";

export function rlsStatements(schemaName = RESOURCE_SCHEMA): string[] {
  const tableSql = RLS_TABLES.flatMap((table) => [
    `alter table ${schemaName}.${table} enable row level security`,
    `drop policy if exists ${POLICY} on ${schemaName}.${table}`,
    `create policy ${POLICY} on ${schemaName}.${table} for all using (false) with check (false)`,
  ]);

  return [
    ...tableSql,
    `do $$
    begin
      if exists (select 1 from pg_roles where rolname = 'anon') then
        revoke all on all tables in schema ${schemaName} from anon;
        revoke usage on schema ${schemaName} from anon;
      end if;
      if exists (select 1 from pg_roles where rolname = 'authenticated') then
        revoke all on all tables in schema ${schemaName} from authenticated;
        revoke usage on schema ${schemaName} from authenticated;
      end if;
    end $$`,
  ];
}
