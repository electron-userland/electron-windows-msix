import fs from 'fs-extra';
import { createRequire } from 'module';
import path from 'path';

import { run } from './bin';
import { log } from './logger';
import { PackagingOptions, ProgramOptions } from './types';

const WINAPP_NPM_PACKAGE = '@microsoft/winappcli';

const resolveWinAppPackageJson = () => {
  // Resolve relative to this package first and fall back to the consuming project.
  const resolutionBases = [__filename, path.join(process.cwd(), 'package.json')];
  for (const base of resolutionBases) {
    try {
      return createRequire(base).resolve(`${WINAPP_NPM_PACKAGE}/package.json`);
    } catch {
      // Try the next resolution base.
    }
  }
  return undefined;
};

/**
 * Locates the winapp CLI (https://github.com/microsoft/winappCli) and returns the command to
 * invoke it as an argv prefix. Resolution order:
 * 1. The explicit `winAppPath` packaging option.
 * 2. The `@microsoft/winappcli` npm package, run through the current Node executable.
 * 3. `winapp` on the PATH (e.g. installed via `winget install Microsoft.WinAppCli`).
 */
export const locateWinApp = async (options: PackagingOptions): Promise<Array<string>> => {
  const { winAppPath } = options;

  if (winAppPath) {
    if (await fs.pathExists(winAppPath)) {
      log.debug('Using winapp CLI from the provided winAppPath.', { winAppPath });
      return [winAppPath];
    }
    log.error('The winAppPath was provided but does not exist.', true, { winAppPath });
  }

  const packageJsonPath = resolveWinAppPackageJson();
  if (packageJsonPath) {
    const packageJson = await fs.readJson(packageJsonPath);
    const binEntry =
      typeof packageJson.bin === 'string' ? packageJson.bin : packageJson.bin?.winapp;
    if (binEntry) {
      const binPath = path.join(path.dirname(packageJsonPath), binEntry);
      if (await fs.pathExists(binPath)) {
        log.debug(`Using winapp CLI from the ${WINAPP_NPM_PACKAGE} npm package.`, { binPath });
        return [process.execPath, binPath];
      }
    }
  } else {
    log.debug(`${WINAPP_NPM_PACKAGE} npm package not found. Will try winapp on the PATH next.`);
  }

  try {
    await run('winapp', ['--version']);
    log.debug('Using winapp CLI from the PATH.');
    return ['winapp'];
  } catch {
    log.error(
      `Unable to locate the winapp CLI. Install it with 'npm install --save-dev ${WINAPP_NPM_PACKAGE}' or 'winget install Microsoft.WinAppCli', or provide its location via <winAppPath>.`,
      true,
    );
  }
};

/**
 * Creates a self-signed dev certificate via `winapp cert generate`, producing the same
 * pfx/cer pair as the PowerShell-based dev cert creation of the sdk backend.
 */
export const generateDevCert = async (program: ProgramOptions) => {
  const { winApp, publisher, cert_pfx, cert_pass } = program;
  const args = [
    ...winApp.slice(1),
    'cert',
    'generate',
    '--publisher',
    publisher,
    '--output',
    cert_pfx,
    '--password',
    cert_pass,
    '--export-cer',
    '--if-exists',
    'Overwrite',
  ];
  log.debug('Creating dev cert with the winapp CLI.');
  await run(winApp[0], args);
};
