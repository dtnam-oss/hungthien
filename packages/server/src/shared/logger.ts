/**
 * Simple structured logger. Uses console.* under the hood.
 * Can be replaced with winston/pino later without changing call sites.
 */

export interface Logger {
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
  debug(message: string, meta?: Record<string, unknown>): void;
}

export function createLogger(module: string): Logger {
  const fmt = (level: string, message: string, meta?: Record<string, unknown>) => {
    const ts = new Date().toISOString();
    const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
    return `${ts} [${level}] [${module}] ${message}${metaStr}`;
  };

  return {
    info: (msg, meta) => console.log(fmt('INFO', msg, meta)),
    warn: (msg, meta) => console.warn(fmt('WARN', msg, meta)),
    error: (msg, meta) => console.error(fmt('ERROR', msg, meta)),
    debug: (msg, meta) => console.debug(fmt('DEBUG', msg, meta)),
  };
}
