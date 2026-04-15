import * as fs from 'fs';
import path from "path";
import { describe, it, expect, beforeAll } from "vitest";

import { packageMSIX } from "../../src/index";
import { installDevCert } from './utils/cert';
import { readAppxManifestFromMsix } from './utils/installer';

describe('packaging', () => {
  beforeAll(async () => {
    await installDevCert();
  });

  it('should package the app with an existing app manifest', async () => {
    await packageMSIX({
      appDir: path.join(__dirname, 'fixtures', 'app-x64'),
      outputDir: path.join(__dirname, '..', '..', 'out'),
      appManifest: path.join(__dirname, 'fixtures', 'AppxManifest_x64.xml'),
      windowsKitVersion: '10.0.26100.0',
    });
    expect(fs.existsSync(path.join(__dirname, '..', '..', 'out', 'hellomsix_x64.msix'))).toBe(true);
  });

  it('should package the app with manifest variables', async () => {
    await packageMSIX({
      appDir: path.join(__dirname, 'fixtures', 'app-x64'),
      outputDir: path.join(__dirname, '..', '..', 'out'),
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
      windowsKitVersion: '10.0.26100.0',
    });
    expect(fs.existsSync(path.join(__dirname, '..', '..', 'out', 'hellomsix_x64.msix'))).toBe(true);
  });

  it('should package with comToastActivation and embed COM + toast extensions in AppxManifest', async () => {
    const toastClsid = 'A0E0E0E0-E0E0-4AE0-A0E0-E0E0E0E0E0E0';
    await packageMSIX({
      appDir: path.join(__dirname, 'fixtures', 'app-x64'),
      outputDir: path.join(__dirname, '..', '..', 'out'),
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
        comToastActivation: {
          toastActivatorClsid: toastClsid,
        },
      },
      windowsKitVersion: '10.0.26100.0',
      sign: false,
    });
    const msixPath = path.join(__dirname, '..', '..', 'out', 'hellomsix_x64.msix');
    expect(fs.existsSync(msixPath)).toBe(true);
    const manifestXml = await readAppxManifestFromMsix(msixPath);
    expect(manifestXml).toContain('xmlns:com="http://schemas.microsoft.com/appx/manifest/com/windows10"');
    expect(manifestXml).toMatch(/IgnorableNamespaces="[^"]*\bcom\b/);
    expect(manifestXml).toContain('Category="windows.comServer"');
    expect(manifestXml).toContain('Category="windows.toastNotificationActivation"');
    expect(manifestXml).toContain(
      'ToastActivatorCLSID="a0e0e0e0-e0e0-4ae0-a0e0-e0e0e0e0e0e0"'
    );
    expect(manifestXml).toMatch(
      /<com:ExeServer[^>]*Executable="app\\hellomsix\.exe"[^>]*Arguments="-ToastActivated"/
    );
  });

  it('should package the app with prerelease version manifest variables', async () => {
    await packageMSIX({
      appDir: path.join(__dirname, 'fixtures', 'app-x64'),
      outputDir: path.join(__dirname, '..', '..', 'out'),
      manifestVariables: {
        appDisplayName: 'Hello MSIX',
        publisher: 'CN=Dev Publisher',
        publisherDisplayName: 'Dev Publisher',
        packageDisplayName: 'Hello MSIX',
        packageDescription: 'Just a test app',
        packageBackgroundColor: '#000000',
        packageIdentity: 'com.example.app',
        packageVersion: '1.42.0-alpha',
        appExecutable: 'hellomsix.exe',
        targetArch: 'x64',
        packageMinOSVersion: '10.0.19041.0',
        packageMaxOSVersionTested: '10.0.19041.0',
      },
      windowsKitVersion: '10.0.26100.0',
    });
    expect(fs.existsSync(path.join(__dirname, '..', '..', 'out', 'hellomsix_x64.msix'))).toBe(true);
  });

  it('should package the sparse app', async () => {
    await packageMSIX({
      outputDir: path.join(__dirname, '..', '..', 'out'),
      appManifest: path.join(__dirname, 'fixtures', 'AppxManifest_Sparse.xml'),
      windowsKitVersion: '10.0.26100.0',
    });
    expect(fs.existsSync(path.join(__dirname, '..', '..', 'out', 'hellomsix_x64.msix'))).toBe(true);
  });

  it('should package the app without creating a pri', async () => {
    await packageMSIX({
      appDir: path.join(__dirname, 'fixtures', 'app-x64'),
      outputDir: path.join(__dirname, '..', '..', 'out'),
      manifestVariables: {
        publisher: 'CN=Dev Publisher',
        packageIdentity: 'com.example.app',
        packageVersion: '1.42.0.0',
        appExecutable: 'hellomsix.exe',
        targetArch: 'x64',
      },
      createPri: false,
      windowsKitVersion: '10.0.26100.0',
    });
    expect(fs.existsSync(path.join(__dirname, '..', '..', 'out', 'hellomsix_x64.msix'))).toBe(true);
  });

  it('should package with an explicit windows kit path', async () => {
    await packageMSIX({
      appDir: path.join(__dirname, 'fixtures', 'app-x64'),
      outputDir: path.join(__dirname, '..', '..', 'out'),
      manifestVariables: {
        publisher: 'CN=Dev Publisher',
        packageIdentity: 'com.example.app',
        packageVersion: '1.42.0.0',
        appExecutable: 'hellomsix.exe',
        targetArch: 'x64',
      },
      windowsKitPath: path.join('C:\\Program Files (x86)\\Windows Kits\\10\\bin\\10.0.26100.0\\x64'),
    });
    expect(fs.existsSync(path.join(__dirname, '..', '..', 'out', 'hellomsix_x64.msix'))).toBe(true);
  });

  it('should fail packaging with a wrong explicit windows kit path', async () => {
    try {
      fs.rmSync(path.join(__dirname, '..', '..', 'out'), { recursive: true, force: true });
      await packageMSIX({
        appDir: path.join(__dirname, 'fixtures', 'app-x64'),
        outputDir: path.join(__dirname, '..', '..', 'out'),
        manifestVariables: {
          publisher: 'CN=Dev Publisher',
          packageIdentity: 'com.example.app',
          packageVersion: '1.42.0.0',
          appExecutable: 'hellomsix.exe',
          targetArch: 'x64',
        },
        windowsKitPath: path.join('C:\\noop'),
      });
    } catch (e) {
      expect(e).toBeDefined();
      expect(e.message).toBe('The WindowsKitPath was provided but does not exist.');
    }
    expect(fs.existsSync(path.join(__dirname, '..', '..', 'out', 'hellomsix_x64.msix'))).toBe(false);
  });

  it('should package with an explicit windows kit version', async () => {
    await packageMSIX({
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
    expect(fs.existsSync(path.join(__dirname, '..', '..', 'out', 'hellomsix_x64.msix'))).toBe(true);
  });

  it('should fail packaging with a wrong explicit windows kit version', async () => {
    try {
      fs.rmSync(path.join(__dirname, '..', '..', 'out'), { recursive: true, force: true });
      await packageMSIX({
        appDir: path.join(__dirname, 'fixtures', 'app-x64'),
        outputDir: path.join(__dirname, '..', '..', 'out'),
        manifestVariables: {
          publisher: 'CN=Dev Publisher',
          packageIdentity: 'com.example.app',
          packageVersion: '1.42.0.0',
          appExecutable: 'hellomsix.exe',
          targetArch: 'x64',
        },
        windowsKitVersion: '1.0.0.0',
      });
    } catch (e) {
      expect(e).toBeDefined();
      expect(e.message).toBe('WindowsKitVersion was provided but does not exist.');
    }
    expect(fs.existsSync(path.join(__dirname, '..', '..', 'out', 'hellomsix_x64.msix'))).toBe(false);
  });

  it('should package with windows kit version derived from manifest min version', async () => {
    await packageMSIX({
      appDir: path.join(__dirname, 'fixtures', 'app-x64'),
      outputDir: path.join(__dirname, '..', '..', 'out'),
      manifestVariables: {
        publisher: 'CN=Dev Publisher',
        packageIdentity: 'com.example.app',
        packageVersion: '1.42.0.0',
        appExecutable: 'hellomsix.exe',
        targetArch: 'x64',
        packageMinOSVersion: '10.0.26100.0',
      },
    });
    expect(fs.existsSync(path.join(__dirname, '..', '..', 'out', 'hellomsix_x64.msix'))).toBe(true);
  });

  it('should fail packaging with a wrong windows kit version derived from manifest min version', async () => {
    try {
      fs.rmSync(path.join(__dirname, '..', '..', 'out'), { recursive: true, force: true });
      await packageMSIX({
        appDir: path.join(__dirname, 'fixtures', 'app-x64'),
        outputDir: path.join(__dirname, '..', '..', 'out'),
        manifestVariables: {
          publisher: 'CN=Dev Publisher',
          packageIdentity: 'com.example.app',
          packageVersion: '1.42.0.0',
          appExecutable: 'hellomsix.exe',
          targetArch: 'x64',
          packageMinOSVersion: '1.0.0.0',
        },
      });
    } catch (e) {
      expect(e).toBeDefined();
      expect(e.message).toBe('WindowsKitVersion read from AppManifest but WindowsKit does not exist.');
    }
    expect(fs.existsSync(path.join(__dirname, '..', '..', 'out', 'hellomsix_x64.msix'))).toBe(false);
  });

  it('should package without a given windows kit version or path', async () => {
    await packageMSIX({
      appDir: path.join(__dirname, 'fixtures', 'app-x64'),
      outputDir: path.join(__dirname, '..', '..', 'out'),
      manifestVariables: {
        publisher: 'CN=Dev Publisher',
        packageIdentity: 'com.example.app',
        packageVersion: '1.42.0.0',
        appExecutable: 'hellomsix.exe',
        targetArch: 'x64',
      },
      sign: false,
    });
    expect(fs.existsSync(path.join(__dirname, '..', '..', 'out', 'hellomsix_x64.msix'))).toBe(true);
  });

  it('should package if out dir does not exist', async () => {
    fs.rmSync(path.join(__dirname, '..', '..', 'out'), { recursive: true, force: true });
     await packageMSIX({
      appDir: path.join(__dirname, 'fixtures', 'app-x64'),
      outputDir: path.join(__dirname, '..', '..', 'out'),
      appManifest: path.join(__dirname, 'fixtures', 'AppxManifest_x64.xml'),
      windowsKitVersion: '10.0.26100.0',
    });
    expect(fs.existsSync(path.join(__dirname, '..', '..', 'out', 'hellomsix_x64.msix'))).toBe(true);
  });

  it('should throw errors with invalid data', async () => {
    try {
      await packageMSIX({
        appDir: path.join(__dirname, 'fixtures', 'app-x64'),
        outputDir: path.join(__dirname, '..', '..', 'out'),
        manifestVariables: {
          publisher: 'CN=Dev Publisher',
          packageIdentity: 'com.example.app',
          packageVersion: 'NOT A VERSION',
          appExecutable: 'hellomsix.exe',
          targetArch: 'x64',
        },
      });
    } catch (e) {
      expect(e).toBeDefined();
      expect(e.message).toBeDefined();
    }
  });

  it('should throw errors with invalid manifest variables (minOSVersion > maxOSVersionTested)', async () => {
    try {
      await packageMSIX({
        appDir: path.join(__dirname, 'fixtures', 'app-x64'),
        outputDir: path.join(__dirname, '..', '..', 'out'),
        manifestVariables: {
          publisher: 'CN=Dev Publisher',
          packageIdentity: 'com.example.app',
          packageVersion: '1.42.0.0',
          appExecutable: 'hellomsix.exe',
          targetArch: 'x64',
          packageMinOSVersion: '10.0.26100.0',
          packageMaxOSVersionTested: '10.0.14000.0',
        },
      });
    } catch (e) {
      expect(e).toBeDefined();
      expect(e.message).toBeDefined();
    }
  });

  it('should package the app with an existing app manifest', async () => {
    try {
      await packageMSIX({
        appDir: path.join(__dirname, 'fixtures', 'app-x64'),
        outputDir: path.join(__dirname, '..', '..', 'out'),
      });
    } catch (e) {
      expect(e).toBeDefined();
      expect(e.message).toBe('Neither app manifest <appManifest> nor manifest variables <manifestVariables> provided.');
    }
    expect(fs.existsSync(path.join(__dirname, '..', '..', 'out', 'hellomsix_x64.msix'))).toBe(false);
  });

  it('should package without compression', async () => {
     await packageMSIX({
      appDir: path.join(__dirname, 'fixtures', 'app-x64'),
      outputDir: path.join(__dirname, '..', '..', 'out'),
      appManifest: path.join(__dirname, 'fixtures', 'AppxManifest_x64.xml'),
      windowsKitVersion: '10.0.26100.0',
      compress: false,
    });
    expect(fs.existsSync(path.join(__dirname, '..', '..', 'out', 'hellomsix_x64.msix'))).toBe(true);
  });

  it('should package the app with an user-provided priconfig.xml', async () => {
    await packageMSIX({
      appDir: path.join(__dirname, 'fixtures', 'app-x64'),
      outputDir: path.join(__dirname, '..', '..', 'out'),
      appManifest: path.join(__dirname, 'fixtures', 'AppxManifest_x64.xml'),
      packageAssets: path.join(__dirname, 'fixtures', 'assets'),
      createPri: true,
      priConfig: path.join(__dirname, 'fixtures', 'priconfig.xml'),
      windowsKitVersion: '10.0.26100.0',
    });
    expect(fs.existsSync(path.join(__dirname, '..', '..', 'out', 'hellomsix_x64.msix'))).toBe(true);
  });
});
