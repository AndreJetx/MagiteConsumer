import fs from "node:fs";
import path from "node:path";
import { config } from "dotenv";

if (!process.env.VERCEL) {
  const candidates = [
    path.resolve(process.cwd(), ".env"),
    path.resolve(process.cwd(), "../../.env"),
    path.resolve(process.cwd(), "../.env"),
  ];

  for (const file of candidates) {
    if (fs.existsSync(file)) {
      config({ path: file });
      break;
    }
  }
}
