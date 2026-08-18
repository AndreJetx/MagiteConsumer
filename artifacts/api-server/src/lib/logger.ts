import pino from "pino";

const isProduction = process.env.NODE_ENV === "production";
const isServerless = Boolean(process.env.VERCEL);

export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  redact: [
    "req.headers.authorization",
    "req.headers.cookie",
    "res.headers['set-cookie']",
  ],
  ...(isServerless
    ? { browser: { asObject: true } }
    : isProduction
      ? {}
      : {
          transport: {
            target: "pino-pretty",
            options: { colorize: true },
          },
        }),
});
