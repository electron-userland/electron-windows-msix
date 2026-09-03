import * as path from 'path';
import { expect, describe, it, vi } from 'vitest';

import { makeProgramOptions } from '../../src/utils';
import { ManifestGenerationVariables, PackagingOptions } from '../../src/types';
import {
  getManifestVariables,
  manifest,
  normalizeToastActivatorClsid,
} from '../../src/manifestation';

vi.mock('fs-extra', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, any>;
  return {
    default: {
      exists: vi.fn().mockReturnValue(true),
      emptyDir: vi.fn(),
      ensureDir: vi.fn(),
      pathExists: vi.fn().mockReturnValue(true),
      readFileSync: actual.readFileSync,
      readFile: actual.readFile,
      writeFile: vi.fn(),
      copy: vi.fn(),
    },
  };
});

const minimalManifestVariables: ManifestGenerationVariables = {
  appExecutable: 'HelloMSIX.exe',
  targetArch: 'x64',
  packageIdentity: 'com.electron.myapp',
  packageVersion: '1.42.0.0',
  publisher: 'Jan Hannemann',
};

const minimalPackagingOptions: PackagingOptions = {
  appDir: 'C:\\app',
  outputDir: 'C:\\out',
  packageAssets: 'C:\\assets',
  manifestVariables: minimalManifestVariables,
};

describe('manifestation', () => {
  describe('getManifestVariables', () => {
    it('should read manifest variables from AppxManifest.xml correctly', async () => {
      const packagingOptions: PackagingOptions = {
        ...minimalPackagingOptions,
        appManifest: path.join(__dirname, 'fixtures', 'AppxManifest_x64.xml'),
      };
      const manifestVars = await getManifestVariables(packagingOptions);
      expect(manifestVars).toBeDefined();
      expect(manifestVars.manifestAppName).toBe('hellomsix');
      expect(manifestVars.manifestPackageArch).toBe('x64');
      expect(manifestVars.manifestIsSparsePackage).toBe(false);
      expect(manifestVars.manifestPublisher).toBe('CN=Electron');
      expect(manifestVars.manifestOsMinVersion).toBe('10.0.17763.0');
    });

    it('should detect sparse package correctly', async () => {
      const packagingOptions: PackagingOptions = {
        ...minimalPackagingOptions,
        appManifest: path.join(__dirname, 'fixtures', 'AppxManifest_Sparse.xml'),
      };
      const manifestVars = await getManifestVariables(packagingOptions);
      expect(manifestVars.manifestIsSparsePackage).toBe(true);
    });

    it('should return null if no manifest is provided', async () => {
      const packagingOptions: PackagingOptions = {
        ...minimalPackagingOptions,
      };
      const manifestVars = await getManifestVariables(packagingOptions);
      expect(manifestVars).toBeNull();
    });

    it('should return null if no manifest is provided', async () => {
      const packagingOptions: PackagingOptions = {
        ...minimalPackagingOptions,
        appManifest: path.join(__dirname, 'fixtures', 'AppxManifest_invalid.xml'),
      };
      const manifestVars = await getManifestVariables(packagingOptions);
      expect(manifestVars).toBeDefined();
      expect(manifestVars.manifestAppName).toBeUndefined();
      expect(manifestVars.manifestPackageArch).toBeUndefined();
      expect(manifestVars.manifestIsSparsePackage).toBe(false);
      expect(manifestVars.manifestPublisher).toBeUndefined();
      expect(manifestVars.manifestOsMinVersion).toBeUndefined();
    });
  });

  describe('manifest', () => {
    it('should return the manifest from the appManifest file if provided', async () => {
      const packagingOptions: PackagingOptions = {
        ...minimalPackagingOptions,
        appManifest: path.join(__dirname, 'fixtures', 'AppxManifest_x64.xml'),
      };
      const appManifestIn = await manifest(packagingOptions);
      expect(appManifestIn).toMatch(/<Identity Name="Electron.MySuite.HelloMSIX"/);
      expect(appManifestIn).toMatch(/ProcessorArchitecture="x64"/);
      expect(appManifestIn).toMatch(/Version="1.0.0.0"/);
      expect(appManifestIn).toMatch(/Publisher="CN=Electron"\/>/);
      expect(appManifestIn).toMatch(/<DisplayName>HelloMSIX App<\/DisplayName>/);
      expect(appManifestIn).toMatch(/<PublisherDisplayName>Electron<\/PublisherDisplayName>/);
      expect(appManifestIn).toMatch(/<Logo>assets\\icon.png<\/Logo>/);
    });

    it('should generate a valid manifest with minimal arguments', async () => {
      const { appManifestIn } = await makeProgramOptions(minimalPackagingOptions, null as any);
      expect(appManifestIn).toMatch(/<Identity Name="com.electron.myapp"/);
      expect(appManifestIn).toMatch(/ProcessorArchitecture="x64"/);
      expect(appManifestIn).toMatch(/Version="1.42.0.0"/);
      expect(appManifestIn).toMatch(
        /Publisher="CN=&quot;Jan Hannemann&quot;"\/>/
      );
      expect(appManifestIn).toMatch(/<DisplayName>HelloMSIX<\/DisplayName>/);
      expect(appManifestIn).toMatch(/<PublisherDisplayName>Jan Hannemann<\/PublisherDisplayName>/);
      expect(appManifestIn).toMatch(/<Logo>assets\\icon.png<\/Logo>/);
      expect(appManifestIn).toMatch(
        /<TargetDeviceFamily Name="Windows\.Desktop" MinVersion="[\d.]+" MaxVersionTested="[\d.]+" \/>/,
      );
      expect(appManifestIn).toMatch(
        /<Application Id="App"  Executable="app\\HelloMSIX.exe" EntryPoint="Windows.FullTrustApplication">/,
      );
      expect(appManifestIn).toMatch(/DisplayName="HelloMSIX"/);
      expect(appManifestIn).toMatch(/Description="HelloMSIX"/);
      expect(appManifestIn).toMatch(/Square44x44Logo="assets\\Square44x44Logo.png"/);
      expect(appManifestIn).toMatch(/Square150x150Logo="assets\\Square150x150Logo.png"/);
      expect(appManifestIn).toMatch(/BackgroundColor="transparent"/);
    });

    it('should take optional manifest variables into account', async () => {
      const packagingOptions: PackagingOptions = {
        ...minimalPackagingOptions,
        manifestVariables: {
          ...minimalManifestVariables,
          appDisplayName: 'Custom Display Name',
          publisherDisplayName: 'Custom Publisher Display Name',
          packageDisplayName: 'Custom Package Display Name',
          packageDescription: 'Custom Package Description',
          packageBackgroundColor: 'Custom Background Color',
          packageMinOSVersion: '10.0.17763.0',
          packageMaxOSVersionTested: '10.0.17763.0',
        },
      };
      const appManifestIn = await manifest(packagingOptions);
      expect(appManifestIn).toMatch(/<DisplayName>Custom Package Display Name<\/DisplayName>/);
      expect(appManifestIn).toMatch(
        /<PublisherDisplayName>Custom Publisher Display Name<\/PublisherDisplayName>/,
      );
      expect(appManifestIn).toMatch(
        /<TargetDeviceFamily Name="Windows.Desktop" MinVersion="10.0.17763.0" MaxVersionTested="10.0.17763.0" \/>/,
      );
      expect(appManifestIn).toMatch(/DisplayName="Custom Display Name"/);
      expect(appManifestIn).toMatch(/Description="Custom Package Description"/);
      expect(appManifestIn).toMatch(/BackgroundColor="Custom Background Color"/);
    });

    it('should use packageMinOSVersion also as packageMaxOSVersionTested if not provided', async () => {
      const packagingOptions: PackagingOptions = {
        ...minimalPackagingOptions,
        manifestVariables: {
          ...minimalManifestVariables,
          appDisplayName: 'Custom Display Name',
          packageMinOSVersion: '10.0.17763.0',
        },
      };
      const appManifestIn = await manifest(packagingOptions);
      expect(appManifestIn).toMatch(
        /<TargetDeviceFamily Name="Windows.Desktop" MinVersion="10.0.17763.0" MaxVersionTested="10.0.17763.0" \/>/,
      );
    });

    it('should use packageDisplayName as display name if appDisplayName and packageDescription is not provided', async () => {
      const packagingOptions: PackagingOptions = {
        ...minimalPackagingOptions,
        manifestVariables: {
          ...minimalManifestVariables,
          packageDisplayName: 'Custom Package Display Name',
        },
      };
      const appManifestIn = await manifest(packagingOptions);
      expect(appManifestIn).toMatch(/<DisplayName>Custom Package Display Name<\/DisplayName>/);
      expect(appManifestIn).toMatch(/DisplayName="Custom Package Display Name"/);
      expect(appManifestIn).toMatch(/Description="Custom Package Display Name"/);
    });

    it('should use appDisplayName as description if packageDescription is not provided', async () => {
      const packagingOptions: PackagingOptions = {
        ...minimalPackagingOptions,
        manifestVariables: {
          ...minimalManifestVariables,
          appDisplayName: 'Custom App Display Name',
        },
      };
      const appManifestIn = await manifest(packagingOptions);
      expect(appManifestIn).toMatch(/Description="Custom App Display Name"/);
    });

    it('should return null if no manifest variables are provided', async () => {
      const packagingOptions: PackagingOptions = {
        ...minimalPackagingOptions,
        manifestVariables: undefined,
      };
      const appManifestIn = await manifest(packagingOptions);
      expect(appManifestIn).toBeNull();
    });

    it('should add COM server and toast activation extensions when comToastActivation is set', async () => {
      const guid = 'A1B2C3D4-E5F6-7890-ABCD-EF1234567890';
      const packagingOptions: PackagingOptions = {
        ...minimalPackagingOptions,
        manifestVariables: {
          ...minimalManifestVariables,
          comToastActivation: {
            toastActivatorClsid: guid,
            arguments: '-ToastActivated',
          },
        },
      };
      const appManifestIn = await manifest(packagingOptions);
      expect(appManifestIn).toContain(
        'xmlns:com="http://schemas.microsoft.com/appx/manifest/com/windows10"',
      );
      expect(appManifestIn).toMatch(/IgnorableNamespaces="[^"]*\bcom\b/);
      expect(appManifestIn).toMatch(
        /<com:Extension Category="windows\.comServer">[\s\S]*<com:ExeServer Executable="app\\HelloMSIX\.exe" Arguments="-ToastActivated">/,
      );
      expect(appManifestIn).toContain('<com:Class Id="a1b2c3d4-e5f6-7890-abcd-ef1234567890"/>');
      expect(appManifestIn).toContain(
        '<desktop:ToastNotificationActivation ToastActivatorCLSID="a1b2c3d4-e5f6-7890-abcd-ef1234567890" />',
      );
    });

    it('should use default arguments when omitted', async () => {
      const packagingOptions: PackagingOptions = {
        ...minimalPackagingOptions,
        manifestVariables: {
          ...minimalManifestVariables,
          comToastActivation: {
            toastActivatorClsid: 'BBBBBBBB-BBBB-BBBB-BBBB-BBBBBBBBBBBB',
          },
        },
      };
      const appManifestIn = await manifest(packagingOptions);
      expect(appManifestIn).toMatch(
        /<com:ExeServer Executable="app\\HelloMSIX\.exe" Arguments="-ToastActivated">/,
      );
      expect(appManifestIn).toContain('<com:Class Id="bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"/>');
    });

    it('should escape XML in comToastActivation executable basename', async () => {
      const packagingOptions: PackagingOptions = {
        ...minimalPackagingOptions,
        manifestVariables: {
          ...minimalManifestVariables,
          comToastActivation: {
            toastActivatorClsid: '11111111-2222-3333-4444-555555555555',
            executable: `my&app"test'exe.exe`,
          },
        },
      };
      const appManifestIn = await manifest(packagingOptions);
      expect(appManifestIn).toContain('Executable="app\\my&amp;app&quot;test&apos;exe.exe"');
    });

    it('should escape XML in comToastActivation arguments', async () => {
      const packagingOptions: PackagingOptions = {
        ...minimalPackagingOptions,
        manifestVariables: {
          ...minimalManifestVariables,
          comToastActivation: {
            toastActivatorClsid: '11111111-2222-3333-4444-555555555555',
            arguments: '-x &amp;',
          },
        },
      };
      const appManifestIn = await manifest(packagingOptions);
      expect(appManifestIn).toContain('Arguments="-x &amp;amp;"');
    });

    it('should escape apostrophes in comToastActivation arguments', async () => {
      const packagingOptions: PackagingOptions = {
        ...minimalPackagingOptions,
        manifestVariables: {
          ...minimalManifestVariables,
          comToastActivation: {
            toastActivatorClsid: '11111111-2222-3333-4444-555555555555',
            arguments: "-x O'Brien",
          },
        },
      };
      const appManifestIn = await manifest(packagingOptions);
      expect(appManifestIn).toContain('Arguments="-x O&apos;Brien"');
    });
  });

  describe('normalizeToastActivatorClsid', () => {
    it('normalizes GUID with or without braces to lowercase braced form', () => {
      expect(normalizeToastActivatorClsid('{ABCDEF01-2345-6789-ABCD-EF0123456789}')).toBe(
        '{abcdef01-2345-6789-abcd-ef0123456789}',
      );
      expect(normalizeToastActivatorClsid('ABCDEF01-2345-6789-ABCD-EF0123456789')).toBe(
        '{abcdef01-2345-6789-abcd-ef0123456789}',
      );
    });
  });
});
