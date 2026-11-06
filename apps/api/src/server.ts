import app from "./app.js";
import { env } from "./config/env.js";
import { connectPrisma, disconnectPrisma } from "./config/prisma.js";

type ApiServer = ReturnType<typeof app.listen>;

let server: ApiServer | undefined;
let isShuttingDown = false;

async function startServer(): Promise<void> {
  try {
    // Connect to PostgreSQL before accepting requests.
    await connectPrisma();

    server = app.listen(env.PORT, () => {
      console.log(`CodeMap API running at http://localhost:${env.PORT}`);
    });

    server.on("error", async (error) => {
      console.error("API server error:", error);
      process.exitCode = 1;

      await shutdown("SERVER_ERROR");
    });
  } catch (error) {
    console.error("Failed to start CodeMap API:", error);

    await disconnectPrisma();
    process.exitCode = 1;
  }
}

async function shutdown(signal: string): Promise<void> {
  if (isShuttingDown) return;

  isShuttingDown = true;

  console.log(`${signal} received. Shutting down CodeMap...`);

  try {
    if (server) {
      await new Promise<void>((resolve, reject) => {
        server!.close((error) => {
          if (error) {
            reject(error);
          } else {
            resolve();
          }
        });
      });

      console.log("API server closed.");
    }

    await disconnectPrisma();

    console.log("CodeMap shutdown completed.");
  } catch (error) {
    console.error("Error during shutdown:", error);
    process.exitCode = 1;
  }
}

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});

process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});

void startServer();
