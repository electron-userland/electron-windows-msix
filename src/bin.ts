import { sign as windowsSign, SignOptions } from '@electron/windows-sign';
import { spawn } from 'child_process';
import crypto from 'crypto';
import fs from 'fs-extra';
import os from 'os';
import path from 'path';

import { log } from './logger';
import { powershell } from './powershell';
import { ProgramOptions } from './types';

const run = async (executable: string, args: Array<string>) => {
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

export const getCertPublisher = async (cert: string, cert_pass: string) => {
  // Read the subject via .NET's X509Certificate2 instead of parsing `certutil -dump`.
  // certutil localizes its labels (e.g. "Subject:") so the previous regex never matched
  // on non-English Windows locales. X509Certificate2.Subject is culture-invariant.
  //
  // The PFX path (not secret) is templated into the script file, but the PFX password
  // is passed via the CERT_PFX_PASSWORD environment variable on the spawned PowerShell
  // process. The secret is therefore never written to disk (it could survive crashes,
  // backups, or AV scans) and never appears on the command line (visible in process
  // listings). The script reads it with `$env:CERT_PFX_PASSWORD`.
  const template = fs.readFileSync(
    path.join(__dirname, '../static/templates/get_cert_subject.ps1.in'),
    'utf-8',
  );
  const script = template.replace(/{{PfxPath}}/g, cert);

  const scriptPath = path.join(os.tmpdir(), `get_cert_subject_${crypto.randomUUID()}.ps1`);
  let publisher: string | null = null;
  try {
    fs.writeFileSync(scriptPath, script);
    const subject = (await powershell(scriptPath, { CERT_PFX_PASSWORD: cert_pass || '' })).trim();
    publisher = subject || null;
  } catch (error) {
    log.error('Unable to read publisher from Cert', false, { error });
  } finally {
    fs.removeSync(scriptPath);
  }

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
    await run(makePri, args);
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
    await run(makePri, args);
  } else {
    log.debug('Skipping making pri.');
  }
};

export const make = async (program: ProgramOptions) => {
  const { makeMsix, layoutDir, msix, isSparsePackage, compress } = program;
  const args = ['pack', '/d', layoutDir, '/p', msix, '/o'];

  if (isSparsePackage) {
    args.push('/nv');
  }
  if (!compress) {
    args.push('/nc');
  }
  await run(makeMsix, args);
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
