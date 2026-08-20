import { z } from "zod";
import type { AppState } from "./defaults";

const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,79}$/;
const MAX_NAME = 80;
const MAX_RESOURCE = 40;
const MAX_AMOUNT = 1_000_000_000_000;
const MAX_SOURCES = 150;
const MAX_SCENARIOS = 20;

export function cleanInput(value: string, max = MAX_NAME): string {
  return String(value ?? "")
    .replace(/\0/g, "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/<[^>]*>/g, "")
    .replace(/[<>]/g, "")
    .replace(/javascript:/gi, "")
    .replace(/vbscript:/gi, "")
    .slice(0, max);
}

export function sanitizeText(value: string, max = MAX_NAME): string {
  return cleanInput(value, max).replace(/\s+/g, " ").trim();
}

const safeId = z
  .string()
  .trim()
  .regex(ID_PATTERN, "Identificador inválido.");

const safeName = z
  .string()
  .transform((value) => sanitizeText(value, MAX_NAME))
  .pipe(z.string().min(1, "Informe um nome.").max(MAX_NAME));

const safeResource = z
  .string()
  .transform((value) => sanitizeText(value, MAX_RESOURCE))
  .pipe(z.string().max(MAX_RESOURCE));

const safeInt = (min: number, max: number) =>
  z.coerce.number().finite().int().min(min).max(max);

const frequencySchema = z.enum(["once", "minute", "hour", "day", "week", "interval"]);
const periodSchema = z.enum(["minute", "hour", "day", "week"]);

const sourceSchema = z.object({
  id: safeId,
  name: safeName,
  amount: safeInt(0, MAX_AMOUNT),
  frequency: frequencySchema,
  occurrences: safeInt(1, 9_999),
  addedAt: z
    .string()
    .max(40)
    .refine((value) => !Number.isNaN(Date.parse(value)), "Data inválida.")
    .optional(),
  intervalDays: safeInt(2, 3_650).optional(),
});

const characterStatsSchema = z
  .object({
    current: z.record(z.string(), z.string().max(40)).default({}),
    goal: z.record(z.string(), z.string().max(40)).default({}),
  })
  .default({ current: { moveSpeed: "6" }, goal: { moveSpeed: "6" } });

const scenarioSchema = z.object({
  id: safeId,
  name: safeName,
  resourceName: safeResource,
  balance: safeInt(0, MAX_AMOUNT),
  period: periodSchema,
  gains: z.array(sourceSchema).max(MAX_SOURCES),
  consumptions: z.array(sourceSchema).max(MAX_SOURCES),
  simulation: z.object({
    battles: safeInt(0, 10_000),
    activities: safeInt(0, 10_000),
    gainAdjustment: safeInt(-100, 1_000),
    consumptionAdjustment: safeInt(-100, 1_000),
  }),
  characterStats: characterStatsSchema,
});

export const appStateSchema = z.object({
  scenarios: z.array(scenarioSchema).min(1).max(MAX_SCENARIOS),
  activeId: safeId,
});

const passwordSchema = z
  .string()
  .min(6, "A senha precisa ter pelo menos 6 caracteres.")
  .max(128, "A senha é longa demais.")
  .refine((value) => !/[\u0000-\u001F]/.test(value), "Senha inválida.");

const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, "O nome de usuário precisa ter pelo menos 3 caracteres.")
  .max(32, "O nome de usuário é longo demais.")
  .regex(/^[a-z0-9._-]+$/, "Use letras, números, ponto, hífen ou underline.")
  .refine((value) => !value.includes("\0"), "Nome de usuário inválido.");

const loginIdentitySchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, "O nome de usuário precisa ter pelo menos 3 caracteres.")
  .max(254, "O nome de usuário é longo demais.")
  .refine((value) => !value.includes("\0"), "Nome de usuário inválido.");

function withUsernameAlias<T extends z.ZodType>(schema: T) {
  return z.preprocess((value) => {
    if (!value || typeof value !== "object") return value;
    const body = value as Record<string, unknown>;
    if (typeof body.username !== "string" && typeof body.email === "string") {
      return { ...body, username: body.email };
    }
    return body;
  }, schema);
}

export const credentialsSchema = withUsernameAlias(z.object({
  username: usernameSchema,
  password: passwordSchema,
}));

export const loginCredentialsSchema = withUsernameAlias(z.object({
  username: loginIdentitySchema,
  password: passwordSchema,
}));

export const ACCOUNT_DELETE_PHRASES = ["deletar minha conta", "delete my account"] as const;

export function normalizeDeletePhrase(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function isAccountDeletePhrase(value: string): boolean {
  return (ACCOUNT_DELETE_PHRASES as readonly string[]).includes(normalizeDeletePhrase(value));
}

export const deleteAccountSchema = z.object({
  confirmation: z
    .string()
    .trim()
    .min(1, "Digite a frase de confirmação.")
    .refine(isAccountDeletePhrase, "A frase de confirmação não confere."),
});

export function parseAppState(input: unknown): {
  success: true;
  data: AppState;
} | {
  success: false;
  error: z.ZodError;
} {
  const parsed = appStateSchema.safeParse(input);
  if (!parsed.success) return parsed;
  const data = parsed.data;
  if (!data.scenarios.some((scenario) => scenario.id === data.activeId)) {
    return {
      success: false,
      error: new z.ZodError([
        {
          code: "custom",
          path: ["activeId"],
          message: "O cenário ativo não existe na lista.",
        },
      ]),
    };
  }
  return { success: true, data: data as AppState };
}
