import express from "express";
import cors from "cors";
import helmet from "helmet";
import { env } from "./config/env.js";
import reposRouter from "./routes/repos.js";

const app = express();

app.use(helmet());

app.use(
  cors({
    origin: env.CORS_ORIGIN,
  }),
);

app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_req, res) => {
  res.status(200).json({
    success: true,
    service: "codemap-api",
    status: "healthy",
    timestamp: new Date().toISOString(),
  });
});

app.use("/api/repos", reposRouter);

app.get("/", (_req, res) => {
  res.json({
    name: "CodeMap API",
    message: "Interactive codebase visualization platform",
  });
});

export default app;
