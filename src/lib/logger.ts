/**
 * Logger utility for StreamSmart
 * Provides environment-aware logging
 */

const isDevelopment = process.env.NODE_ENV === 'development';

export const logger = {
  /**
   * Development-only logging
   * Only outputs in development environment
   */
  dev: (...args: unknown[]): void => {
    if (isDevelopment) {
      console.log(...args);
    }
  },

  /**
   * Error logging (always enabled)
   * Use for errors that should be logged in production
   */
  error: (...args: unknown[]): void => {
    console.error(...args);
  },

  /**
   * Warning logging (always enabled)
   * Use for warnings that should be logged in production
   */
  warn: (...args: unknown[]): void => {
    console.warn(...args);
  },

  /**
   * Info logging (development only)
   * Use for informational messages
   */
  info: (...args: unknown[]): void => {
    if (isDevelopment) {
      console.info(...args);
    }
  },
};
