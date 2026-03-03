import { ConsoleLogger, Injectable, LogLevel } from '@nestjs/common';

type LogMeta = Record<string, unknown>;

@Injectable()
export class AppLogger extends ConsoleLogger {
  constructor() {
    const isProd = process.env.NODE_ENV === 'production';
    const logLevels: LogLevel[] = isProd
      ? ['log', 'warn', 'error']
      : ['log', 'warn', 'error', 'debug', 'verbose'];
    super({
      logLevels,
      colors: true,
      timestamp: true,
    });
  }

  info(message: unknown, meta?: LogMeta) {
    super.log(meta ? { message, ...meta } : message, 'INFO');
  }

  http(message: unknown, meta?: LogMeta) {
    super.log(meta ? { message, ...meta } : message, 'HTTP');
  }
  security(message: string, meta?: LogMeta) {
    const formatted = meta ? `${message} – ${JSON.stringify(meta)}` : message;
    super.warn(formatted, 'SECURITY');
  }
}
