import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { eq } from "drizzle-orm";
import { db } from "./client";
import { appSessions, appUsers, scenarios } from "./schema";

const scryptAsync = promisify(scrypt);
const SESSION_DAYS = 30;

export interface AuthUser {
  id: string;
  username: string;
}

export function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}

function makeId(prefix: string): string {
  return `${prefix}-${Date.now()}-${randomBytes(4).toString("hex")}`;
}

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derived = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${salt}:${derived.toString("hex")}`;
}

async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const derived = (await scryptAsync(password, salt, 64)) as Buffer;
  const actual = Buffer.from(hash, "hex");
  if (derived.length !== actual.length) return false;
  return timingSafeEqual(derived, actual);
}

function isUniqueViolation(error: unknown): boolean {
  return Boolean(error && typeof error === "object" && "code" in error && error.code === "23505");
}

export async function registerUser(username: string, password: string): Promise<AuthUser> {
  const normalized = normalizeUsername(username);
  const [existing] = await db
    .select({ id: appUsers.id })
    .from(appUsers)
    .where(eq(appUsers.username, normalized))
    .limit(1);
  if (existing) {
    throw Object.assign(new Error("USERNAME_TAKEN"), { code: "USERNAME_TAKEN" });
  }

  const user: AuthUser = {
    id: makeId("user"),
    username: normalized,
  };
  try {
    await db.insert(appUsers).values({
      id: user.id,
      username: user.username,
      passwordHash: await hashPassword(password),
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw Object.assign(new Error("USERNAME_TAKEN"), { code: "USERNAME_TAKEN" });
    }
    throw error;
  }
  return user;
}

export async function loginUser(username: string, password: string): Promise<AuthUser | null> {
  const normalized = normalizeUsername(username);
  const [row] = await db.select().from(appUsers).where(eq(appUsers.username, normalized)).limit(1);
  if (!row) return null;
  const ok = await verifyPassword(password, row.passwordHash);
  if (!ok) return null;
  return { id: row.id, username: row.username };
}

export async function createSession(userId: string): Promise<string> {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await db.insert(appSessions).values({ token, userId, expiresAt });
  return token;
}

export async function getUserBySession(token: string): Promise<AuthUser | null> {
  if (!token) return null;
  const [row] = await db
    .select({
      id: appUsers.id,
      username: appUsers.username,
      expiresAt: appSessions.expiresAt,
    })
    .from(appSessions)
    .innerJoin(appUsers, eq(appSessions.userId, appUsers.id))
    .where(eq(appSessions.token, token))
    .limit(1);
  if (!row) return null;
  if (row.expiresAt.getTime() <= Date.now()) {
    await db.delete(appSessions).where(eq(appSessions.token, token));
    return null;
  }
  return { id: row.id, username: row.username };
}

export async function deleteSession(token: string): Promise<void> {
  if (!token) return;
  await db.delete(appSessions).where(eq(appSessions.token, token));
}

export async function deleteUserAccount(userId: string): Promise<void> {
  if (!userId) return;
  await db.transaction(async (tx) => {
    await tx.delete(scenarios).where(eq(scenarios.userId, userId));
    await tx.delete(appUsers).where(eq(appUsers.id, userId));
  });
}
