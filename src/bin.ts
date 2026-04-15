import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import tls from 'node:tls';

import { sign as windowsSign, SignOptions } from "@electron/windows-sign";
import { spawn } from 'child_process';

import { log } from "./logger";
import { ProgramOptions } from "./types";

const run = async (executable: string, args: Array<string>)  => {
  return new Promise<string>((resolve, reject) => {
    const proc = spawn(executable, args, {});
    log.debug(`Calling ${executable} with args`, args);

    const cleanOutData = (data: any) => {
      return data
      .toString()
      .replace(/\r/g, '')
      .replace(/\\\\/g, '\\')
      .split('\n')
    }

    let stdout = "";
    proc.stdout.on('data', (data) => {
      stdout += data;
    });

    let stderr = "";
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
            `Failed running ${executable} Exit Code: ${code} See previous errors for details`
          )
        );

      }
    });

    proc.stdin.end();
  })
}

export const exportedRunForVitest = run;

/**
 * Because node already has the ability to parse PFX but just chooses to not export a function for that,
 * we will fake a tls connection here to extract pfx certificate information.
 */
async function parsePfx(pfxPath: string, passphrase: string): Promise<crypto.X509Certificate> {
    const pfx = await fs.promises.readFile(pfxPath);
    return new Promise((resolve, reject) => {
        // Windows pipe which is not persistent and will be deleted when process exits. See https://nodejs.org/api/net.html#identifying-paths-for-ipc-connections
        const pipePath = path.win32.join('\\\\?', 'pipe', 'electron-windows-msix', crypto.randomUUID());

        const server = tls.createServer(
            {
                rejectUnauthorized: false,
                pfx,
                passphrase,
            },
            (socket) => {
                const cert = socket.getX509Certificate();
                if (cert) {
                    resolve(cert);
                } else {
                    reject(new Error('No certificate found'));
                }
                socket.end();
                server.close();
            },
        );

        server.listen(pipePath);

        const client = tls.connect(
            {
                path: pipePath,
                rejectUnauthorized: false,
            },
            () => {
                client.end();
            },
        );
    });
}

export const getCertPublisher = async (cert: string, cert_pass: string) => {
  try {
    const { subject } = await parsePfx(cert, cert_pass);
    return subject;
  } catch (e: unknown) {
    log.error('Unable to parse certificate', false, e);
    return null;
  }
}

export const priConfig = async (program: ProgramOptions) => {
  const { makePri, priConfig, createPri } = program;
  if(createPri) {
    const args = ['createconfig', '/cf', priConfig, '/dq', 'en-US'];
    log.debug('Creating pri config.')
    await run(makePri, args);
  } else {
    log.debug('Skipping making pri config.');
  }
}

export const pri = async (program: ProgramOptions) => {
  const { makePri, priConfig, layoutDir, priFile, appManifestLayout, createPri } = program;
  if(createPri) {
    log.debug('Making pri.')
    const args = ['new', '/pr', layoutDir, '/cf', priConfig, '/mn', appManifestLayout, '/of', priFile, '/v'];
    await run(makePri, args);
  } else {
    log.debug('Skipping making pri.');
  }
}

export const make = async (program: ProgramOptions) => {
  const { makeMsix, layoutDir, msix, isSparsePackage, compress } = program;
  const args = [
    'pack',
    '/d',
    layoutDir,
    '/p',
    msix,
    '/o',
  ];

  if(isSparsePackage) {
    args.push('/nv');
  }
  if(!compress) {
    args.push('/nc');
  }
  await run(makeMsix, args);
}

export const sign = async (program: ProgramOptions) => {
  if(program.sign) {
    const signOptions = program.windowsSignOptions;
    log.debug('Signing with options', signOptions);
    await windowsSign(signOptions as SignOptions);
  } else {
    log.debug('Skipping signing.');
  }
}
