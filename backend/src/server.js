// backend/src/server.js
import http from "http";
import app from "./app.js";
import env from "./config/env.js";
import logger from "./utils/logger.js";

const PORT = env.PORT || 4000;

const server = http.createServer(app);

server.listen(PORT, () => {
  logger.success(`CareConnect backend running on port ${PORT}`);
});
