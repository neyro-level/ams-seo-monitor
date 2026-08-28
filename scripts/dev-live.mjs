import { spawn } from "node:child_process";
import path from "node:path";

const projectRoot = process.cwd();
const nextBin = path.join(projectRoot, "node_modules", "next", "dist", "bin", "next");
const reportServer = path.join(projectRoot, "scripts", "serve-local-reports.mjs");
const children = [];
let stopping = false;

function startProcess(args, env) {
  const child = spawn(process.execPath, args, {
    cwd: projectRoot,
    env,
    stdio: "inherit",
    windowsHide: false,
  });
  children.push(child);
  return child;
}

const reportProcess = startProcess([reportServer], process.env);
const nextProcess = startProcess(
  [nextBin, "dev", "--hostname", "127.0.0.1", "--port", "3000"],
  {
    ...process.env,
    NEXT_PUBLIC_REPORT_DATA_BASE_URL: "http://127.0.0.1:3001",
  },
);

function stopChildren(exitCode = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) {
    if (!child.killed) {
      child.kill("SIGTERM");
    }
  }
  process.exitCode = exitCode;
}

for (const child of [reportProcess, nextProcess]) {
  child.on("exit", (code, signal) => {
    if (stopping) return;
    if (signal || code !== 0) {
      stopChildren(code ?? 1);
    }
  });
}

process.on("SIGINT", () => stopChildren(0));
process.on("SIGTERM", () => stopChildren(0));
process.on("exit", () => {
  for (const child of children) {
    if (!child.killed) child.kill("SIGTERM");
  }
});
