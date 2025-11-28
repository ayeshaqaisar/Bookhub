// Frontend logger utility for consistent logging

interface LogEntry {
  timestamp: string;
  level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';
  message: string;
  data?: Record<string, unknown>;
  error?: {
    message: string;
    stack?: string;
  };
}

class Logger {
  private isDevelopment = import.meta.env.DEV;

  private formatLog(entry: LogEntry): string {
    const { timestamp, level, message, data } = entry;
    const dataStr = data ? ` | ${JSON.stringify(data)}` : '';
    const errorStr = entry.error ? ` | Error: ${entry.error.message}` : '';
    
    return `[${level}] ${message}${dataStr}${errorStr}`;
  }

  logRequest(method: string, endpoint: string, data?: Record<string, unknown>): void {
    if (this.isDevelopment) {
      const entry: LogEntry = {
        timestamp: new Date().toISOString(),
        level: 'INFO',
        message: `→ ${method} ${endpoint}`,
        data,
      };
      console.log(this.formatLog(entry));
    }
  }

  logResponse(statusCode: number, endpoint: string, duration: number): void {
    if (this.isDevelopment) {
      const level = statusCode >= 400 ? 'WARN' : 'INFO';
      const entry: LogEntry = {
        timestamp: new Date().toISOString(),
        level: level as 'INFO' | 'WARN' | 'ERROR' | 'DEBUG',
        message: `← ${statusCode} ${endpoint} (${duration}ms)`,
      };
      console.log(this.formatLog(entry));
    }
  }

  logSuccess(message: string, data?: Record<string, unknown>): void {
    if (this.isDevelopment) {
      const entry: LogEntry = {
        timestamp: new Date().toISOString(),
        level: 'INFO',
        message: `✓ ${message}`,
        data,
      };
      console.log(this.formatLog(entry));
    }
  }

  logWarning(message: string, data?: Record<string, unknown>): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: 'WARN',
      message: `⚠ ${message}`,
      data,
    };
    console.warn(this.formatLog(entry));
  }

  logError(message: string, error: Error, data?: Record<string, unknown>): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: 'ERROR',
      message: `✗ ${message}`,
      data,
      error: {
        message: error.message,
        stack: error.stack,
      },
    };
    console.error(this.formatLog(entry));
  }

  logDebug(message: string, data?: Record<string, unknown>): void {
    if (this.isDevelopment) {
      const entry: LogEntry = {
        timestamp: new Date().toISOString(),
        level: 'DEBUG',
        message,
        data,
      };
      console.debug(this.formatLog(entry));
    }
  }
}

export const logger = new Logger();
