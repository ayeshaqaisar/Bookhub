import "dotenv/config";
import { createServer } from "./index.ts";
import { getConfig } from "./lib/config.ts";
// import { logger } from "./lib/logger.ts";

async function start() {
  const app = createServer();
  const config = getConfig();

  const port = config.port || 3000;

  app.listen(port, () => {
    // logger.logSuccess(`🚀 Server running on port ${port}`, {
    //   nodeEnv: config.nodeEnv,
    // });
    console.log(`🚀 Server running on port ${port} in ${config.nodeEnv} mode`);
  });
}

start();
