import { spawn } from 'child_process';
import { EventEmitter } from 'events';
import fs from 'fs-extra';
import { createRequire } from 'module';
import path from 'path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { generateDevCert, locateWinApp } from '../../src/winapp';

vi.mock('child_process', () => ({
  spawn: vi.fn(),
}));

vi.mock('@electron/windows-sign', () => ({
  sign: vi.fn(),
}));

vi.mock('fs-extra', () => ({
  default: {
    pathExists: vi.fn(),
    readJson: vi.fn(),
  },
}));

vi.mock('../../src/logger', () => ({
  log: {
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    error: vi.fn((message: string, throwError: boolean = false) => {
      if (throwError) throw new Error(message);
    }),
  },
}));

const mockSpawn = (exitCode: number) => {
  vi.mocked(spawn).mockImplementationOnce(() => {
    const emitter = new EventEmitter() as any;
    setImmediate(() => {
      emitter.emit('exit', exitCode, null);
    });
    emitter.stdout = new EventEmitter();
    emitter.stderr = new EventEmitter();
    emitter.stdin = { end: vi.fn() };
    return emitter;
  });
};

const resolveWinAppPackageJson = () => {
  try {
    return createRequire(__filename).resolve('@microsoft/winappcli/package.json');
  } catch {
    return undefined;
  }
};

// The @microsoft/winappcli dev dependency is win32-only, so it is not installed on other platforms.
const winAppPackageJson = resolveWinAppPackageJson();

describe('winapp', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fs.pathExists).mockResolvedValue(false as any);
    vi.mocked(fs.readJson).mockResolvedValue({} as any);
  });

  describe('locateWinApp', () => {
    it('should use the provided winAppPath if it exists', async () => {
      vi.mocked(fs.pathExists).mockResolvedValueOnce(true as any);
      const winApp = await locateWinApp({ winAppPath: 'C:\\tools\\winapp.exe' } as any);
      expect(winApp).toStrictEqual(['C:\\tools\\winapp.exe']);
      expect(spawn).not.toHaveBeenCalled();
    });

    it('should throw if the provided winAppPath does not exist', async () => {
      await expect(locateWinApp({ winAppPath: 'C:\\tools\\winapp.exe' } as any)).rejects.toThrow(
        'The winAppPath was provided but does not exist.',
      );
    });

    describe.runIf(!!winAppPackageJson)('with the @microsoft/winappcli npm package', () => {
      it('should run the npm package bin through the current Node executable', async () => {
        vi.mocked(fs.readJson).mockResolvedValueOnce({ bin: { winapp: './dist/cli.js' } } as any);
        vi.mocked(fs.pathExists).mockResolvedValueOnce(true as any);
        const winApp = await locateWinApp({} as any);
        expect(winApp).toStrictEqual([
          process.execPath,
          path.join(path.dirname(winAppPackageJson), './dist/cli.js'),
        ]);
        expect(fs.readJson).toHaveBeenCalledWith(winAppPackageJson);
        expect(spawn).not.toHaveBeenCalled();
      });
    });

    it('should fall back to winapp on the PATH', async () => {
      mockSpawn(0);
      const winApp = await locateWinApp({} as any);
      expect(winApp).toStrictEqual(['winapp']);
      expect(spawn).toHaveBeenCalledWith('winapp', ['--version'], {});
    });

    it('should throw if the winapp CLI cannot be located', async () => {
      mockSpawn(1);
      await expect(locateWinApp({} as any)).rejects.toThrow('Unable to locate the winapp CLI.');
    });
  });

  describe('generateDevCert', () => {
    it('should create the dev cert with the winapp CLI', async () => {
      mockSpawn(0);
      await generateDevCert({
        winApp: ['C:\\winapp.exe'],
        publisher: 'CN=Electron',
        cert_pfx: 'C:\\out\\dev_cert.pfx',
        cert_pass: 'my_password',
      } as any);
      expect(spawn).toHaveBeenCalledWith(
        'C:\\winapp.exe',
        [
          'cert',
          'generate',
          '--publisher',
          'CN=Electron',
          '--output',
          'C:\\out\\dev_cert.pfx',
          '--password',
          'my_password',
          '--export-cer',
          '--if-exists',
          'Overwrite',
        ],
        {},
      );
    });

    it('should create the dev cert with a multi-part winapp command', async () => {
      mockSpawn(0);
      await generateDevCert({
        winApp: ['C:\\node.exe', 'C:\\cli.js'],
        publisher: 'Electron',
        cert_pfx: 'C:\\out\\dev_cert.pfx',
        cert_pass: 'my_password',
      } as any);
      expect(spawn).toHaveBeenCalledWith(
        'C:\\node.exe',
        [
          'C:\\cli.js',
          'cert',
          'generate',
          '--publisher',
          'Electron',
          '--output',
          'C:\\out\\dev_cert.pfx',
          '--password',
          'my_password',
          '--export-cer',
          '--if-exists',
          'Overwrite',
        ],
        {},
      );
    });
  });
});
