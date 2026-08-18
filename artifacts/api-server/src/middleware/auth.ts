import type { Request, Response, NextFunction } from "express";
import { getUserBySession, type AuthUser } from "@workspace/db";

export const SESSION_COOKIE = "rb_session";

export type AuthedRequest = Request & { user: AuthUser };

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const bearer = header?.startsWith("Bearer ") ? header.slice(7).trim() : undefined;
  const token = bearer || (req.cookies?.[SESSION_COOKIE] as string | undefined);
  const user = token ? await getUserBySession(token) : null;
  if (!user) {
    res.status(401).json({ error: "Faça login para continuar." });
    return;
  }
  (req as AuthedRequest).user = user;
  (req as AuthedRequest & { sessionToken?: string }).sessionToken = token;
  next();
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    maxAge: 30 * 24 * 60 * 60 * 1000,
    path: "/",
  };
}
