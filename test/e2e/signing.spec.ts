import * as fs from 'fs';
import path from 'path';
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';

import { packageMSIX, type Artifacts } from '../../src/index';
import { getCertStatus, getCertSubject, installDevCert } from './utils/cert';

describe('signing', () => {
  beforeAll(async () => {
    await installDevCert();
  });

  beforeEach(() => {
    delete process.env.WINDOWS_CERTIFICATE_FILE;
    delete process.env.WINDOWS_CERTIFICATE_PASSWORD;
  });

  describe('signing with an existing cert', () => {
    it('should package the app', async () => {
      await packageMSIX({
        appDir: path.join(__dirname, 'fixtures', 'app-x64'),
        outputDir: path.join(__dirname, '..', '..', 'out'),
        appManifest: path.join(__dirname, 'fixtures', 'AppxManifest_x64.xml'),
        windowsSignOptions: {
          certificateFile: path.join(__dirname, 'fixtures', 'MSIXDevCert.pfx'),
          certificatePassword: 'Password123',
        },
      });
      expect(fs.existsSync(path.join(__dirname, '..', '..', 'out', 'hellomsix_x64.msix'))).toBe(
        true,
      );
    });

    it('should sign the msix', async () => {
      const certStatus = await getCertStatus(
        path.join(__dirname, '..', '..', 'out', 'hellomsix_x64.msix'),
      );
      expect(certStatus).toBe('Valid');
    });

    it('should the cert should have the correct subject', async () => {
      const certSubject = await getCertSubject(
        path.join(__dirname, '..', '..', 'out', 'hellomsix_x64.msix'),
      );
      expect(certSubject).toBe('CN=Electron MSIX');
    });

    it('should not sign the app if sign is set to false', async () => {
      await packageMSIX({
        appDir: path.join(__dirname, 'fixtures', 'app-x64'),
        outputDir: path.join(__dirname, '..', '..', 'out'),
        appManifest: path.join(__dirname, 'fixtures', 'AppxManifest_x64.xml'),
        windowsSignOptions: {
          certificateFile: path.join(__dirname, 'fixtures', 'MSIXDevCert.pfx'),
          certificatePassword: 'Password123',
        },
        sign: false,
      });
      expect(fs.existsSync(path.join(__dirname, '..', '..', 'out', 'hellomsix_x64.msix'))).toBe(
        true,
      );
      const certStatus = await getCertStatus(
        path.join(__dirname, '..', '..', 'out', 'hellomsix_x64.msix'),
      );
      expect(certStatus).toBe('NotSigned');
    });

    it('should sign the app with custom sign params', async () => {
      await packageMSIX({
        appDir: path.join(__dirname, 'fixtures', 'app-x64'),
        outputDir: path.join(__dirname, '..', '..', 'out'),
        appManifest: path.join(__dirname, 'fixtures', 'AppxManifest_x64.xml'),
        windowsSignOptions: {
          certificateFile: path.join(__dirname, 'fixtures', 'MSIXDevCert.pfx'),
          certificatePassword: 'Password123',
          signWithParams: ['/v'],
        },
      });
      expect(fs.existsSync(path.join(__dirname, '..', '..', 'out', 'hellomsix_x64.msix'))).toBe(
        true,
      );
      const certStatus = await getCertStatus(
        path.join(__dirname, '..', '..', 'out', 'hellomsix_x64.msix'),
      );
      expect(certStatus).toBe('Valid');
    });

    it('should sign the app when cert and password are provided via environment variables', async () => {
      process.env.WINDOWS_CERTIFICATE_FILE = path.join(__dirname, 'fixtures', 'MSIXDevCert.pfx');
      process.env.WINDOWS_CERTIFICATE_PASSWORD = 'Password123';
      await packageMSIX({
        appDir: path.join(__dirname, 'fixtures', 'app-x64'),
        outputDir: path.join(__dirname, '..', '..', 'out'),
        appManifest: path.join(__dirname, 'fixtures', 'AppxManifest_x64.xml'),
      });
      expect(fs.existsSync(path.join(__dirname, '..', '..', 'out', 'hellomsix_x64.msix'))).toBe(
        true,
      );
      const certStatus = await getCertStatus(
        path.join(__dirname, '..', '..', 'out', 'hellomsix_x64.msix'),
      );
      expect(certStatus).toBe('Valid');
    });

    it('should sign the app when the password is provided via environment variables', async () => {
      process.env.WINDOWS_CERTIFICATE_PASSWORD = 'Password123';
      await packageMSIX({
        appDir: path.join(__dirname, 'fixtures', 'app-x64'),
        outputDir: path.join(__dirname, '..', '..', 'out'),
        appManifest: path.join(__dirname, 'fixtures', 'AppxManifest_x64.xml'),
        windowsSignOptions: {
          certificateFile: path.join(__dirname, 'fixtures', 'MSIXDevCert.pfx'),
          certificatePassword: 'Password123',
        },
      });
      expect(fs.existsSync(path.join(__dirname, '..', '..', 'out', 'hellomsix_x64.msix'))).toBe(
        true,
      );
      const certStatus = await getCertStatus(
        path.join(__dirname, '..', '..', 'out', 'hellomsix_x64.msix'),
      );
      expect(certStatus).toBe('Valid');
    });

    it('should sign the app when the cert is provided via environment variables', async () => {
      process.env.WINDOWS_CERTIFICATE_FILE = path.join(__dirname, 'fixtures', 'MSIXDevCert.pfx');
      await packageMSIX({
        appDir: path.join(__dirname, 'fixtures', 'app-x64'),
        outputDir: path.join(__dirname, '..', '..', 'out'),
        appManifest: path.join(__dirname, 'fixtures', 'AppxManifest_x64.xml'),
        windowsSignOptions: {
          certificatePassword: 'Password123',
        },
      });
      expect(fs.existsSync(path.join(__dirname, '..', '..', 'out', 'hellomsix_x64.msix'))).toBe(
        true,
      );
      const certStatus = await getCertStatus(
        path.join(__dirname, '..', '..', 'out', 'hellomsix_x64.msix'),
      );
      expect(certStatus).toBe('Valid');
    });

    it('should sign the app when windowsSignOptions is set without certificateFile and both cert and password are from env vars', async () => {
      process.env.WINDOWS_CERTIFICATE_FILE = path.join(__dirname, 'fixtures', 'MSIXDevCert.pfx');
      process.env.WINDOWS_CERTIFICATE_PASSWORD = 'Password123';
      await packageMSIX({
        appDir: path.join(__dirname, 'fixtures', 'app-x64'),
        outputDir: path.join(__dirname, '..', '..', 'out'),
        appManifest: path.join(__dirname, 'fixtures', 'AppxManifest_x64.xml'),
        windowsSignOptions: {} as any,
      });
      expect(fs.existsSync(path.join(__dirname, '..', '..', 'out', 'hellomsix_x64.msix'))).toBe(
        true,
      );
      const certStatus = await getCertStatus(
        path.join(__dirname, '..', '..', 'out', 'hellomsix_x64.msix'),
      );
      expect(certStatus).toBe('Valid');
    });
  });

  describe('signing with a generated dev cert', () => {
    let result: Artifacts;

    it('should package the app', async () => {
      result = await packageMSIX({
        appDir: path.join(__dirname, 'fixtures', 'app-x64'),
        outputDir: path.join(__dirname, '..', '..', 'out'),
        manifestVariables: {
          publisher: 'CN=Dev Publisher',
          packageIdentity: 'com.example.app',
          packageVersion: '1.42.0.0',
          appExecutable: 'hellomsix.exe',
          targetArch: 'x64',
        },
        windowsKitVersion: '10.0.26100.0',
      });
      expect(fs.existsSync(path.join(__dirname, '..', '..', 'out', 'hellomsix_x64.msix'))).toBe(
        true,
      );
    });

    it('should return the generated dev cert artifacts', () => {
      expect(result.msixPackage).toBe(
        path.join(__dirname, '..', '..', 'out', 'hellomsix_x64.msix'),
      );
      expect(result.devCert).toBeDefined();
      expect(fs.existsSync(result.devCert.pfxFile)).toBe(true);
      expect(fs.existsSync(result.devCert.cerFile)).toBe(true);
      expect(result.devCert.password.length).toBeGreaterThan(0);
      expect(result.devCert.subject).toBe('CN=Dev Publisher');
      expect(typeof result.devCert.reused).toBe('boolean');
    });

    it('should sign the msix', async () => {
      const certStatus = await getCertStatus(
        path.join(__dirname, '..', '..', 'out', 'hellomsix_x64.msix'),
      );
      expect(certStatus).not.toBe('NotSigned');
    });

    it('should have the correct subject', async () => {
      const certSubject = await getCertSubject(
        path.join(__dirname, '..', '..', 'out', 'hellomsix_x64.msix'),
      );
      expect(certSubject).toBe('CN=Dev Publisher');
    });

    it('should reuse the dev cert when rebuilding for the same publisher', async () => {
      const rebuild = await packageMSIX({
        appDir: path.join(__dirname, 'fixtures', 'app-x64'),
        outputDir: path.join(__dirname, '..', '..', 'out'),
        manifestVariables: {
          publisher: 'CN=Dev Publisher',
          packageIdentity: 'com.example.app',
          packageVersion: '1.42.0.0',
          appExecutable: 'hellomsix.exe',
          targetArch: 'x64',
        },
        windowsKitVersion: '10.0.26100.0',
      });
      expect(rebuild.devCert.reused).toBe(true);
      const certSubject = await getCertSubject(
        path.join(__dirname, '..', '..', 'out', 'hellomsix_x64.msix'),
      );
      expect(certSubject).toBe('CN=Dev Publisher');
    });

    it('should use the generated dev cert with the provided password via environment variables', async () => {
      process.env.WINDOWS_CERTIFICATE_PASSWORD = 'Password123';
      const envResult = await packageMSIX({
        appDir: path.join(__dirname, 'fixtures', 'app-x64'),
        outputDir: path.join(__dirname, '..', '..', 'out'),
        appManifest: path.join(__dirname, 'fixtures', 'AppxManifest_x64.xml'),
        logLevel: 'debug',
      });
      expect(fs.existsSync(path.join(__dirname, '..', '..', 'out', 'hellomsix_x64.msix'))).toBe(
        true,
      );
      expect(envResult.devCert.password).toBe('Password123');
      const certStatus = await getCertStatus(
        path.join(__dirname, '..', '..', 'out', 'hellomsix_x64.msix'),
      );
      expect(certStatus).not.toBe('NotSigned');
    });
  });

  describe('explicit createDevCert option', () => {
    it('should not create a dev cert when createDevCert is false', async () => {
      const result = await packageMSIX({
        appDir: path.join(__dirname, 'fixtures', 'app-x64'),
        outputDir: path.join(__dirname, '..', '..', 'out'),
        appManifest: path.join(__dirname, 'fixtures', 'AppxManifest_x64.xml'),
        createDevCert: false,
        windowsSignOptions: {
          certificateFile: path.join(__dirname, 'fixtures', 'MSIXDevCert.pfx'),
          certificatePassword: 'Password123',
        },
      });
      expect(result.devCert).toBeUndefined();
      expect(fs.existsSync(path.join(__dirname, '..', '..', 'out', 'dev_cert.pfx'))).toBe(false);
      const certStatus = await getCertStatus(
        path.join(__dirname, '..', '..', 'out', 'hellomsix_x64.msix'),
      );
      expect(certStatus).toBe('Valid');
    });

    it('should create a dev cert when createDevCert is true even when windowsSignOptions is provided', async () => {
      const msix = path.join(__dirname, '..', '..', 'out', 'hellomsix_x64.msix');
      const result = await packageMSIX({
        appDir: path.join(__dirname, 'fixtures', 'app-x64'),
        outputDir: path.join(__dirname, '..', '..', 'out'),
        manifestVariables: {
          publisher: 'CN=Dev Publisher',
          packageIdentity: 'com.example.app',
          packageVersion: '1.42.0.0',
          appExecutable: 'hellomsix.exe',
          targetArch: 'x64',
        },
        windowsKitVersion: '10.0.26100.0',
        createDevCert: true,
        windowsSignOptions: {
          files: [msix],
        },
      });
      expect(result.devCert).toBeDefined();
      expect(fs.existsSync(result.devCert.pfxFile)).toBe(true);
      expect(fs.existsSync(result.devCert.cerFile)).toBe(true);
      expect(result.devCert.subject).toBe('CN=Dev Publisher');
      const certStatus = await getCertStatus(msix);
      expect(certStatus).not.toBe('NotSigned');
      const certSubject = await getCertSubject(msix);
      expect(certSubject).toBe('CN=Dev Publisher');
    });
  });
});
