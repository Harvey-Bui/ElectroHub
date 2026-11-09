/* eslint-disable no-console */
type Level = 'debug' | 'info' | 'warn' | 'error';

const silent = process.env.NODE_ENV === 'test';

function log(level: Level, ...args: unknown[]): void {
  if (silent) return;
  const line = [`${new Date().toISOString()} ${level.toUpperCase()}`, ...args];
  if (level === 'error') console.error(...line);
  else if (level === 'warn') console.warn(...line);
  else console.log(...line);
}

export const logger = {
  debug: (...args: unknown[]) => log('debug', ...args),
  info: (...args: unknown[]) => log('info', ...args),
  warn: (...args: unknown[]) => log('warn', ...args),
  error: (...args: unknown[]) => log('error', ...args),
};
