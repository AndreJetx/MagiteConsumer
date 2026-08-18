import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { eq } from "drizzle-orm";
import { db } from "./client";
import { appSessions, appUsers } from "./schema";

const scryptAsync = promisify(scrypt);
const SESSION_DAYS = 30;

export interface AuthUser {
  id: string;
  email: string;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
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

export async function registerUser(email: string, password: string): Promise<AuthUser> {
  const normalized = normalizeEmail(email);
  const [existing] = await db
    .select({ id: appUsers.id })
    .from(appUsers)
    .where(eq(appUsers.email, normalized))
    .limit(1);
  if (existing) {
    throw Object.assign(new Error("EMAIL_TAKEN"), { code: "EMAIL_TAKEN" });
  }

  const user: AuthUser = {
    id: makeId("user"),
    email: normalized,
  };
  await db.insert(appUsers).values({
    id: user.id,
    email: user.email,
    passwordHash: await hashPassword(password),
  });
  return user;
}

export async function loginUser(email: string, password: string): Promise<AuthUser | null> {
  const normalized = normalizeEmail(email);
  const [row] = await db.select().from(appUsers).where(eq(appUsers.email, normalized)).limit(1);
  if (!row) return null;
  const ok = await verifyPassword(password, row.passwordHash);
  if (!ok) return null;
  return { id: row.id, email: row.email };
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
      email: appUsers.email,
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
  return { id: row.id, email: row.email };
}

export async function deleteSession(token: string): Promise<void> {
  if (!token) return;
  await db.delete(appSessions).where(eq(appSessions.token, token));
}
