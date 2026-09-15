import { spawn } from '@malept/cross-spawn-promise';

import { log } from './logger';

const isNotFoundError = (err: unknown): boolean => {
  const error = err as { code?: string; originalError?: { code?: string } };
  return error?.code === 'ENOENT' || error?.originalError?.code === 'ENOENT';
};

export async function powershell(scriptOrCommand: string) {
  log.debug('Running powershell command', { commandAndArgs: scriptOrCommand });
  const isScript = scriptOrCommand.endsWith('.ps1');
  const args = ['-NoProfile', '-ExecutionPolicy', 'Bypass'];
  if (isScript) {
    args.push('-File', scriptOrCommand);
  } else {
    args.push('-Command', scriptOrCommand);
  }
  let result: Awaited<ReturnType<typeof spawn>>;
  try {
    result = await spawn('pwsh.exe', args);
  } catch (err) {
    if (!isNotFoundError(err)) throw err;
    // PowerShell 7 is not part of stock Windows, so fall back to the built-in Windows PowerShell.
    log.debug('pwsh.exe not found, falling back to powershell.exe');
    result = await spawn('powershell.exe', args);
  }
  log.debug('Powershell command result', { result });
  return result ? result.toString() : '';
}
