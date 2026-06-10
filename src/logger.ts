import chalk from 'chalk';
import createDebug from 'debug';

const debug = createDebug('electron-windows-msix');
export class log {
  private static log(level: 'info' | 'warn' | 'error' | 'debug', message: string, object?: any) {
    const logMessage = `${level}: ${message}`;
    let logObject = '';
    if (object)
      logObject = JSON.stringify(object, null, 2)
        .replace(/\\r\\n/g, '\n')
        .replace(/\\\\/g, '\\')
        .replace(/\\"/g, '"');

    if (debug.enabled) {
      debug('%s %s', logMessage, logObject);
      return;
    }

    if (level === 'debug' && !!globalThis.DEBUG) {
      console.log(chalk.grey(logMessage));
      if (object) {
        console.group();
        console.log(chalk.grey(logObject));
        console.groupEnd();
      }
    }
    if (level === 'warn' && (!!globalThis.DEBUG || !!globalThis.SHOW_WARNINGS)) {
      console.log(chalk.yellow(logMessage));
      if (object) {
        console.group();
        console.log(chalk.yellow(logObject));
        console.groupEnd();
      }
    }
    if (level === 'error') {
      console.log(chalk.red(logMessage));
      if (object) {
        console.group();
        console.log(chalk.red(logObject));
        console.groupEnd();
      }
    }
    if (level === 'info') {
      console.log(logMessage);
      if (object) {
        console.group();
        console.log(logObject);
        console.groupEnd();
      }
    }
  }

  static info = (message: string, object?: any) => this.log('info', message, object);
  static warn = (message: string, object?: any) => this.log('warn', message, object);
  static error = (message: string, throwError: boolean = false, object?: any) => {
    this.log('error', message, object);
    if (throwError) throw new Error(message);
  };
  static debug = (message: string, object?: any) => this.log('debug', message, object);
}
