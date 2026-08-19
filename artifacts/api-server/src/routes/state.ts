import { Router, type IRouter } from "express";
import { getAppState, parseAppState, saveAppState } from "@workspace/db";
import { logger } from "../lib/logger";
import { requireAuth, type AuthedRequest } from "../middleware/auth";

const router: IRouter = Router();

router.use(requireAuth);

router.get("/state", async (req, res) => {
  const { id, username } = (req as AuthedRequest).user;
  try {
    const state = await getAppState(id, username);
    res.json(state);
  } catch (error) {
    logger.error({ err: error }, "Failed to load app state");
    res.status(500).json({ error: "Falha ao carregar cenários do banco." });
  }
});

router.put("/state", async (req, res) => {
  const parsed = parseAppState(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Estado inválido.", details: parsed.error.flatten() });
    return;
  }

  try {
    const { id, username } = (req as AuthedRequest).user;
    await saveAppState(id, parsed.data);
    logger.info(
      {
        userId: id,
        username,
        scenarioCount: parsed.data.scenarios.length,
        sourceCount: parsed.data.scenarios.reduce(
          (total, scenario) => total + scenario.gains.length + scenario.consumptions.length,
          0,
        ),
        resourceName: parsed.data.scenarios[0]?.resourceName,
        balance: parsed.data.scenarios[0]?.balance,
      },
      "Saved app state",
    );
    res.json(parsed.data);
  } catch (error) {
    logger.error({ err: error }, "Failed to save app state");
    res.status(500).json({ error: "Falha ao salvar cenários no banco." });
  }
});

export default router;
