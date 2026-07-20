const net = require("net");

const target = process.env.TCP_TARGET || "127.0.0.1";
const port = Number(process.env.TCP_PORT || 4000);
const connections = Number(process.env.CONNECTIONS || 60);
const concurrency = Number(process.env.CONCURRENCY || 20);
const timeoutMs = Number(process.env.TIMEOUT_MS || 700);

function assertLocalTarget(host) {
  const allowed = new Set(["localhost", "127.0.0.1", "::1"]);

  if (!allowed.has(host)) {
    throw new Error(
      `Refusing to run TCP burst against non-local target: ${host}. This simulator is local-lab only.`
    );
  }
}

function connectOnce(index) {
  return new Promise((resolve) => {
    const startedAt = Date.now();
    const socket = new net.Socket();

    let finished = false;

    function finish(status, errorMessage = "") {
      if (finished) {
        return;
      }

      finished = true;
      socket.destroy();

      resolve({
        index,
        status,
        durationMs: Date.now() - startedAt,
        errorMessage
      });
    }

    socket.setTimeout(timeoutMs);

    socket.once("connect", () => {
      setTimeout(() => finish("connected"), 20);
    });

    socket.once("timeout", () => {
      finish("timeout");
    });

    socket.once("error", (error) => {
      finish("error", error.code || error.message);
    });

    socket.connect(port, target);
  });
}

async function main() {
  assertLocalTarget(target);

  console.log("\n=== Local TCP Connection Burst ===");
  console.log(`Target: ${target}:${port}`);
  console.log(`Connections: ${connections}`);
  console.log(`Concurrency: ${concurrency}`);
  console.log(`TimeoutMs: ${timeoutMs}\n`);

  let next = 1;
  const results = [];

  async function worker() {
    while (next <= connections) {
      const current = next++;
      const result = await connectOnce(current);
      results.push(result);

      console.log(
        `${String(current).padStart(2, "0")} status=${result.status} durationMs=${result.durationMs}` +
          (result.errorMessage ? ` error=${result.errorMessage}` : "")
      );
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));

  results.sort((a, b) => a.index - b.index);

  const summary = {
    total: results.length,
    connected: results.filter((r) => r.status === "connected").length,
    timeout: results.filter((r) => r.status === "timeout").length,
    error: results.filter((r) => r.status === "error").length
  };

  console.log("\nSummary:");
  console.table(summary);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
