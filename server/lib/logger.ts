// Centralized logging utility for request/response tracking and error logging
// Supports configurable log levels via LOG_LEVEL environment variable

interface LogContext {
  requestId?: string;
  userId?: string;
  endpoint?: string;
  method?: string;
  [key: string]: unknown; // Allow additional context fields of any type
}

interface LogEntry {
  timestamp: string;
  level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
  message: string;
  context?: LogContext;
  data?: Record<string, unknown>;
  error?: {
    message: string;
    stack?: string;
  };
}

/**
 * Log level hierarchy
 * Only logs at or above the configured level are displayed
 * ERROR > WARN > INFO > DEBUG
 */
enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

class Logger {
  private logLevel: LogLevel;
  private isDevelopment: boolean;

  constructor() {
    // Read log level from config (will fail fast if validation fails)
    try {
      const { getConfig } = require('./config');
      const config = getConfig();
      const levelStr = config.logLevel || 'INFO';

      this.logLevel = LogLevel[levelStr as keyof typeof LogLevel] ?? LogLevel.INFO;
      this.isDevelopment = config.nodeEnv !== 'production';
    } catch {
      // Fallback if config not ready yet
      this.logLevel = process.env.NODE_ENV !== 'production' ? LogLevel.DEBUG : LogLevel.INFO;
      this.isDevelopment = process.env.NODE_ENV !== 'production';
    }
  }

  /**
   * Check if a log level should be displayed
   */
  private shouldLog(level: LogLevel): boolean {
    return level >= this.logLevel;
  }

  private formatLog(entry: LogEntry): string {
    const { timestamp, level, message, context, data, error } = entry;
    const contextStr = context ? ` [${Object.entries(context).map(([k, v]) => `${k}=${v}`).join(', ')}]` : '';
    const dataStr = data ? ` | ${JSON.stringify(data)}` : '';
    const errorStr = error ? ` | Error: ${error.message}` : '';

    return `${timestamp} [${level}]${contextStr} ${message}${dataStr}${errorStr}`;
  }

  logRequest(method: string, endpoint: string, context?: LogContext): void {
    if (!this.shouldLog(LogLevel.DEBUG)) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: 'DEBUG',
      message: `Incoming ${method} request`,
      context: { ...context, method, endpoint },
    };
    console.log(this.formatLog(entry));
  }

  logResponse(statusCode: number, endpoint: string, duration: number, context?: LogContext): void {
    if (!this.shouldLog(LogLevel.INFO)) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: statusCode >= 400 ? 'WARN' : 'INFO',
      message: `Response [${statusCode}] in ${duration}ms`,
      context: { ...context, endpoint },
    };
    console.log(this.formatLog(entry));
  }

  logSuccess(message: string, data?: Record<string, unknown>, context?: LogContext): void {
    if (!this.shouldLog(LogLevel.INFO)) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: 'INFO',
      message,
      context,
      data,
    };
    console.log(this.formatLog(entry));
  }

  logWarning(message: string, data?: Record<string, unknown>, context?: LogContext): void {
    if (!this.shouldLog(LogLevel.WARN)) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: 'WARN',
      message,
      context,
      data,
    };
    console.warn(this.formatLog(entry));
  }

  logError(message: string, error: Error, context?: LogContext, data?: Record<string, unknown>): void {
    if (!this.shouldLog(LogLevel.ERROR)) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: 'ERROR',
      message,
      context,
      data,
      error: {
        message: error.message,
        stack: this.isDevelopment ? error.stack : undefined, // Only include stack in dev
      },
    };
    console.error(this.formatLog(entry));
  }

  logDebug(message: string, data?: Record<string, unknown>, context?: LogContext): void {
    if (!this.shouldLog(LogLevel.DEBUG)) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: 'DEBUG',
      message,
      context,
      data,
    };
    console.debug(this.formatLog(entry));
  }
}

export const logger = new Logger();
