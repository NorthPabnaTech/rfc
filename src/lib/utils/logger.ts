import { IS_PROD } from '@config/site';

/**
 * Simple logger that only outputs to the console in development mode.
 */
export const logger = {
  log: <T extends unknown[]>(...args: T) => {
    if (!IS_PROD) {
      console.log(...args);
    }
  },
  info: <T extends unknown[]>(...args: T) => {
    if (!IS_PROD) {
      console.info(...args);
    }
  },
  warn: <T extends unknown[]>(...args: T) => {
    if (!IS_PROD) {
      console.warn(...args);
    }
  },
  error: <T extends unknown[]>(...args: T) => {
    if (!IS_PROD) {
      console.error(...args);
    }
  },
  debug: <T extends unknown[]>(...args: T) => {
    if (!IS_PROD) {
      console.debug(...args);
    }
  },
};

export default logger;
