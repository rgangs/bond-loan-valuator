import { createServer } from "vite";
import { spawn } from "node:child_process";
import process from "node:process";

const { default: electronBinary } = await import("electron");

const viteServer = await createServer();
await viteServer.listen();

const addressInfo = viteServer.httpServer?.address();

const resolveHost = () => {
  if (typeof viteServer.config.server.host === "string") {
    return viteServer.config.server.host;
  }
  if (viteServer.config.server.host === true) {
    return "0.0.0.0";
  }
  return "localhost";
};

const resolvePort = () => {
  if (typeof addressInfo === "object" && addressInfo && "port" in addressInfo) {
    return addressInfo.port;
  }
  return viteServer.config.server.port ?? 5173;
};

const protocol = viteServer.config.server.https ? "https" : "http";
const host = resolveHost();
const port = resolvePort();
const devServerUrl = `${protocol}://${host}:${port}`;

console.log(`[dev] Vite dev server running at ${devServerUrl}`);

const electronProcess = spawn(electronBinary, ["."], {
  env: {
    ...process.env,
    NODE_ENV: "development",
    VITE_DEV_SERVER_URL: devServerUrl
  },
  stdio: "inherit"
});

const terminate = async () => {
  electronProcess.kill();
  await viteServer.close();
  process.exit();
};

process.on("SIGINT", terminate);
process.on("SIGTERM", terminate);

electronProcess.on("close", async (code) => {
  console.log(`[dev] Electron exited with code ${code ?? "unknown"}`);
  await terminate();
});
