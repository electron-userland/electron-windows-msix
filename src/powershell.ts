import { spawn } from '@malept/cross-spawn-promise';

import { log } from './logger';

export async function powershell(scriptOrCommand: string, env?: Record<string, string>) {
  log.debug('Running powershell command', { commandAndArgs: scriptOrCommand });
  const isScript = scriptOrCommand.endsWith('.ps1');
  const args = ['-NoProfile', '-ExecutionPolicy', 'Bypass'];
  if (isScript) {
    args.push(scriptOrCommand);
  } else {
    args.push('-Command', scriptOrCommand);
  }
  // Merge any extra env vars on top of the inherited process environment. This lets
  // callers pass secrets (e.g. a cert password) to the script via `$env:VARNAME`
  // without writing them to disk or exposing them on the command line.
  const result = env
    ? await spawn('pwsh.exe', args, { env: { ...process.env, ...env } })
    : await spawn('pwsh.exe', args);
  log.debug('Powershell command result', { result });
  return result ? result.toString() : '';
}
