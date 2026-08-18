import { pool } from "./client";
import { rlsStatements } from "./rls";

async function seed() {
  for (const statement of rlsStatements()) {
    await pool.query(statement);
  }
  console.log("RLS ativo. Seed não apaga cenários. Crie a conta pela tela de login.");
  await pool.end();
}

seed().catch(async (error) => {
  console.error(error);
  await pool.end().catch(() => undefined);
  process.exit(1);
});
