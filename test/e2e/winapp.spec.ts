import * as fs from 'fs';
import path from 'path';
import { describe, it, expect } from 'vitest';

import { packageMSIX } from '../../src/index';
import { getCertSubject, getCertStatus } from './utils/cert';

const outputDir = path.join(__dirname, '..', '..', 'out');
const msixPath = path.join(outputDir, 'hellomsix_x64.msix');

// The first winapp invocation downloads the Windows SDK build tools from NuGet.
const WINAPP_TEST_TIMEOUT = 300000;

// These tests are run by the dedicated e2e job that removes the preinstalled Windows Kit,
// proving that the winapp backend packages without a locally installed Windows SDK.
describe.runIf(process.env.MSIX_TEST_BACKEND === 'winapp')(
  'packaging with the winapp backend',
  () => {
    it(
      'should package the app with an existing app manifest',
      async () => {
        await packageMSIX({
          backend: 'winapp',
          appDir: path.join(__dirname, 'fixtures', 'app-x64'),
          outputDir,
          appManifest: path.join(__dirname, 'fixtures', 'AppxManifest_x64.xml'),
          sign: false,
        });
        expect(fs.existsSync(msixPath)).toBe(true);
      },
      WINAPP_TEST_TIMEOUT,
    );

    it(
      'should package the app with manifest variables and sign with a dev cert created by winapp',
      async () => {
        await packageMSIX({
          backend: 'winapp',
          appDir: path.join(__dirname, 'fixtures', 'app-x64'),
          outputDir,
          manifestVariables: {
            appDisplayName: 'Hello MSIX',
            publisher: 'CN=Dev Publisher',
            publisherDisplayName: 'Dev Publisher',
            packageDisplayName: 'Hello MSIX',
            packageDescription: 'Just a test app',
            packageBackgroundColor: '#000000',
            packageIdentity: 'com.example.app',
            packageVersion: '1.42.0.0',
            appExecutable: 'hellomsix.exe',
            targetArch: 'x64',
            packageMinOSVersion: '10.0.19041.0',
            packageMaxOSVersionTested: '10.0.19041.0',
          },
        });
        expect(fs.existsSync(msixPath)).toBe(true);
        expect(fs.existsSync(path.join(outputDir, 'dev_cert.pfx'))).toBe(true);
        expect(fs.existsSync(path.join(outputDir, 'dev_cert.cer'))).toBe(true);
        const certStatus = await getCertStatus(msixPath);
        expect(certStatus).not.toBe('NotSigned');
        const certSubject = await getCertSubject(msixPath);
        expect(certSubject).toBe('CN=Dev Publisher');
      },
      WINAPP_TEST_TIMEOUT,
    );

    it(
      'should package the sparse app',
      async () => {
        await packageMSIX({
          backend: 'winapp',
          outputDir,
          appManifest: path.join(__dirname, 'fixtures', 'AppxManifest_Sparse.xml'),
          sign: false,
        });
        expect(fs.existsSync(msixPath)).toBe(true);
      },
      WINAPP_TEST_TIMEOUT,
    );

    it(
      'should package the app without creating a pri',
      async () => {
        await packageMSIX({
          backend: 'winapp',
          appDir: path.join(__dirname, 'fixtures', 'app-x64'),
          outputDir,
          appManifest: path.join(__dirname, 'fixtures', 'AppxManifest_x64.xml'),
          createPri: false,
          sign: false,
        });
        expect(fs.existsSync(msixPath)).toBe(true);
      },
      WINAPP_TEST_TIMEOUT,
    );

    it(
      'should package the app without compression',
      async () => {
        await packageMSIX({
          backend: 'winapp',
          appDir: path.join(__dirname, 'fixtures', 'app-x64'),
          outputDir,
          appManifest: path.join(__dirname, 'fixtures', 'AppxManifest_x64.xml'),
          compress: false,
          sign: false,
        });
        expect(fs.existsSync(msixPath)).toBe(true);
      },
      WINAPP_TEST_TIMEOUT,
    );
  },
);
