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
});

export const appStateSchema = z.object({
  scenarios: z.array(scenarioSchema).min(1).max(MAX_SCENARIOS),
  activeId: safeId,
});

export const credentialsSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .max(254)
    .email("Informe um e-mail válido.")
    .refine((value) => !value.includes("\0"), "E-mail inválido."),
  password: z
    .string()
    .min(6, "A senha precisa ter pelo menos 6 caracteres.")
    .max(128, "A senha é longa demais.")
    .refine((value) => !/[\u0000-\u001F]/.test(value), "Senha inválida."),
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
