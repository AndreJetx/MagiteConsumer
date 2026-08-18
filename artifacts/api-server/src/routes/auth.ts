import { Router, type IRouter } from "express";
import {
  createSession,
  credentialsSchema,
  deleteSession,
  loginUser,
  registerUser,
} from "@workspace/db";
import { logger } from "../lib/logger";
import { requireAuth, sessionCookieOptions, SESSION_COOKIE, type AuthedRequest } from "../middleware/auth";

const router: IRouter = Router();

router.post("/auth/register", async (req, res) => {
  const parsed = credentialsSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Dados inválidos." });
    return;
  }

  try {
    const user = await registerUser(parsed.data.email, parsed.data.password);
    const token = await createSession(user.id);
    res.cookie(SESSION_COOKIE, token, sessionCookieOptions());
    res.status(201).json({ ...user, token });
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "EMAIL_TAKEN") {
      res.status(409).json({ error: "Este e-mail já tem uma conta." });
      return;
    }
    logger.error({ err: error }, "Failed to register user");
    res.status(500).json({ error: "Não foi possível criar a conta." });
  }
});

router.post("/auth/login", async (req, res) => {
  const parsed = credentialsSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Dados inválidos." });
    return;
  }

  try {
    const user = await loginUser(parsed.data.email, parsed.data.password);
    if (!user) {
      res.status(401).json({ error: "E-mail ou senha incorretos." });
      return;
    }
    const token = await createSession(user.id);
    res.cookie(SESSION_COOKIE, token, sessionCookieOptions());
    res.json({ ...user, token });
  } catch (error) {
    logger.error({ err: error }, "Failed to login");
    res.status(500).json({ error: "Não foi possível entrar." });
  }
});

router.post("/auth/logout", async (req, res) => {
  const header = req.headers.authorization;
  const bearer = header?.startsWith("Bearer ") ? header.slice(7).trim() : undefined;
  const token = bearer || (req.cookies?.[SESSION_COOKIE] as string | undefined);
  if (token) await deleteSession(token);
  res.clearCookie(SESSION_COOKIE, sessionCookieOptions());
  res.json({ ok: true });
});

router.get("/auth/me", requireAuth, (req, res) => {
  res.json((req as AuthedRequest).user);
});

export default router;
