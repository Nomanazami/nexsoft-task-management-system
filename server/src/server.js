import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";

import { env } from "./config/env.js";
import { connectDb } from "./config/db.js";
import { notFoundHandler, errorHandler } from "./middleware/errors.js";

import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user.routes.js";
import teamRoutes from "./routes/team.routes.js";
import taskRoutes from "./routes/task.routes.js";
import activityRoutes from "./routes/activity.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";

const app = express();

app.set("trust proxy", 1);

const allowedOrigins = [
  "https://nexsoft-task-management-system.vercel.app",
  "https://nexsoft-task-management-system-git-main-nomanazamis-projects.vercel.app",
  "http://localhost:5173",
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
}));

app.use(morgan(env.NODE_ENV === "production" ? "combined" : "dev"));
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    service: "task-management-system-api",
    env: env.NODE_ENV,
    time: new Date().toISOString(),
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/teams", teamRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/activity", activityRoutes);
app.use("/api/dashboard", dashboardRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

const start = async () => {
  await connectDb();
  app.listen(env.PORT, () => {
    console.log(`API listening on port ${env.PORT}`);
  });
};

start();
