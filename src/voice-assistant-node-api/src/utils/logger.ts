/**
 * Simple Logger Utility
 *
 * Provides basic logging functionality with timestamps and severity levels.
 * Can be replaced with Winston, Pino, or other logging libraries in production.
 */

enum LogLevel {
  ERROR = 'ERROR',
  WARN = 'WARN',
  INFO = 'INFO',
  DEBUG = 'DEBUG',
}

// Current log level (can be set from environment or config)
const currentLogLevel = process.env.LOG_LEVEL || 'INFO';

/**
 * Format timestamp in ISO format
 */
function getTimestamp(): string {
  return new Date().toISOString();
}

/**
 * Format log message with timestamp, level, and context
 */
function formatMessage(level: LogLevel, message: string, data?: any): string {
  const timestamp = getTimestamp();
  const baseMsg = `[${timestamp}] [${level}] ${message}`;

  if (data) {
    try {
      return `${baseMsg} ${JSON.stringify(data)}`;
    } catch {
      return `${baseMsg} ${String(data)}`;
    }
  }

  return baseMsg;
}

/**
 * Logger object with methods for different severity levels
 */
export const logger = {
  /**
   * Log error messages
   * Use for failures, exceptions, and critical issues
   */
  error: (message: string, data?: any) => {
    console.error(formatMessage(LogLevel.ERROR, message, data));
  },

  /**
   * Log warning messages
   * Use for potentially problematic situations
   */
  warn: (message: string, data?: any) => {
    console.warn(formatMessage(LogLevel.WARN, message, data));
  },

  /**
   * Log info messages
   * Use for important operational information
   */
  info: (message: string, data?: any) => {
    console.log(formatMessage(LogLevel.INFO, message, data));
  },

  /**
   * Log debug messages
   * Use for detailed diagnostic information (only shown in debug mode)
   */
  debug: (message: string, data?: any) => {
    if (currentLogLevel === 'DEBUG') {
      console.log(formatMessage(LogLevel.DEBUG, message, data));
    }
  },
};
