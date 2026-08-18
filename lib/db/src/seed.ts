import { pool } from "./client";
import { enableRowLevelSecurity } from "./state";

async function seed() {
  await enableRowLevelSecurity();
  console.log("Seed não apaga cenários. Crie a conta pela tela de login.");
  await pool.end();
}

seed().catch(async (error) => {
  console.error(error);
  await pool.end().catch(() => undefined);
  process.exit(1);
});
