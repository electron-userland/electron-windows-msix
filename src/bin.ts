import { sign as windowsSign, SignOptions } from '@electron/windows-sign';
import { spawn } from 'child_process';

import { log } from './logger';
import { ProgramOptions } from './types';

export const run = async (executable: string, args: Array<string>) => {
  return new Promise<string>((resolve, reject) => {
    const proc = spawn(executable, args, {});
    log.debug(`Calling ${executable} with args`, args);

    const cleanOutData = (data: any) => {
      return data.toString().replace(/\r/g, '').replace(/\\\\/g, '\\').split('\n');
    };

    let stdout = '';
    proc.stdout.on('data', (data) => {
      stdout += data;
    });

    let stderr = '';
    proc.stderr.on('data', (data) => {
      stderr += data;
    });

    proc.on('exit', (code: number) => {
      if (code === 0) {
        log.debug(`stdout of ${executable}`, cleanOutData(stdout));
        return resolve(stdout);
      } else {
        if (stderr !== '') {
          log.error(`stderr of ${executable}`, false, cleanOutData(stderr));
        }

        if (stdout !== '') {
          log.error(`stdout of ${executable}`, false, cleanOutData(stdout));
        }
        return reject(
          new Error(
            `Failed running ${executable} Exit Code: ${code} See previous errors for details`,
          ),
        );
      }
    });

    proc.stdin.end();
  });
};

/**
 * Runs a Windows SDK build tool either directly from the Windows Kit (default) or through
 * `winapp tool <tool-name> <args>` when the winapp backend is used. The winapp CLI resolves and
 * downloads the SDK build tools on demand, so no locally installed Windows Kit is required.
 * The tool arguments are identical for both backends.
 */
const runTool = async (
  program: ProgramOptions,
  tool: 'makeappx' | 'makepri',
  executable: string,
  args: Array<string>,
) => {
  const { winApp } = program;
  if (winApp && winApp.length > 0) {
    return run(winApp[0], [...winApp.slice(1), 'tool', tool, ...args]);
  }
  return run(executable, args);
};

export const getCertPublisher = async (cert: string, cert_pass: string) => {
  const args = [];
  args.push('-p', cert_pass);
  args.push('-dump', cert);
  const certDump = await run('certutil', args);
  const subjectRegex = /Subject:\s*(.*)/;
  const match = certDump.match(subjectRegex);
  const publisher = match ? match[1].trim() : null;
  if (!publisher) {
    log.error('Unable to find publisher in Cert');
  }
  return publisher;
};

export const priConfig = async (program: ProgramOptions) => {
  const { makePri, priConfig, createPri } = program;
  if (createPri) {
    const args = ['createconfig', '/cf', priConfig, '/dq', 'en-US'];
    log.debug('Creating pri config.');
    await runTool(program, 'makepri', makePri, args);
  } else {
    log.debug('Skipping making pri config.');
  }
};

export const pri = async (program: ProgramOptions) => {
  const { makePri, priConfig, layoutDir, priFile, appManifestLayout, createPri } = program;
  if (createPri) {
    log.debug('Making pri.');
    const args = [
      'new',
      '/pr',
      layoutDir,
      '/cf',
      priConfig,
      '/mn',
      appManifestLayout,
      '/of',
      priFile,
      '/v',
    ];
    await runTool(program, 'makepri', makePri, args);
  } else {
    log.debug('Skipping making pri.');
  }
};

export const make = async (program: ProgramOptions) => {
  const { makeMsix, layoutDir, msix, isSparsePackage, compress, makeAppxParams } = program;
  const args = ['pack', '/d', layoutDir, '/p', msix, '/o'];

  if (isSparsePackage) {
    args.push('/nv');
  }
  if (!compress) {
    args.push('/nc');
  }
  args.push(...(makeAppxParams ?? []));
  await runTool(program, 'makeappx', makeMsix, args);
};

export const sign = async (program: ProgramOptions) => {
  if (program.sign) {
    const signOptions = program.windowsSignOptions;
    log.debug('Signing with options', signOptions);
    await windowsSign(signOptions as SignOptions);
  } else {
    log.debug('Skipping signing.');
  }
};
