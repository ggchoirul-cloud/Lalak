/**
 * src/utils/logger.js
 * ============================================================
 * Logger sederhana dengan prefix dan timestamp konsisten.
 * Memudahkan tracing di console / log panel Pterodactyl.
 * ============================================================
 */

'use strict';

function timestamp() {
  return new Date().toISOString();
}

const logger = {
  info: (scope, ...args) => console.log(`[${timestamp()}] [${scope}]`, ...args),
  warn: (scope, ...args) => console.warn(`[${timestamp()}] [${scope}] ⚠️`, ...args),
  error: (scope, ...args) => console.error(`[${timestamp()}] [${scope}] ❌`, ...args),
  success: (scope, ...args) => console.log(`[${timestamp()}] [${scope}] ✅`, ...args),
};

module.exports = logger;
