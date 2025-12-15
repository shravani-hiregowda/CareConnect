import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Fix __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Log file path
const logFile = path.join(__dirname, "../../logs/app.log");

// Ensure logs folder exists
if (!fs.existsSync(path.dirname(logFile))) {
  fs.mkdirSync(path.dirname(logFile), { recursive: true });
}

// Internal helper
function writeToFile(message) {
  fs.appendFileSync(logFile, message + "\n");
}

const logger = {
  info(msg) {
    const message = `[INFO] ${new Date().toISOString()} — ${msg}`;
    console.log("\x1b[36m%s\x1b[0m", message);
    writeToFile(message);
  },

  success(msg) {
    const message = `[SUCCESS] ${new Date().toISOString()} — ${msg}`;
    console.log("\x1b[32m%s\x1b[0m", message);
    writeToFile(message);
  },

  warning(msg) {
    const message = `[WARNING] ${new Date().toISOString()} — ${msg}`;
    console.log("\x1b[33m%s\x1b[0m", message);
    writeToFile(message);
  },

  error(msg) {
    const message = `[ERROR] ${new Date().toISOString()} — ${msg}`;
    console.log("\x1b[31m%s\x1b[0m", message);
    writeToFile(message);
  }
};

export default logger;
