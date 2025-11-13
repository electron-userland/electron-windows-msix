import * as path from 'path'
import { expect, describe, it, vi } from 'vitest'

import { makeProgramOptions } from '../../src/utils';
import { ManifestGenerationVariables, PackagingOptions } from '../../src/types';
import { getManifestVariables, manifest } from '../../src/manifestation';

vi.mock('fs-extra', async (importOriginal) => {
  const actual = await importOriginal() as Record < string,
    any > ;
  return { default:  {
    exists: vi.fn().mockReturnValue(true),
    emptyDir: vi.fn(),
    ensureDir: vi.fn(),
    pathExists: vi.fn().mockReturnValue(true),
    readFileSync: actual.readFileSync,
    readFile: actual.readFile,
    writeFile: vi.fn(),
    copy: vi.fn(),
  }};
});

const minimalManifestVariables: ManifestGenerationVariables = {
  appExecutable: 'HelloMSIX.exe',
  targetArch: 'x64',
  packageIdentity: 'com.electron.myapp',
  packageVersion: '1.42.0.0',
  publisher: 'Jan Hannemann',
}

const minimalPackagingOptions: PackagingOptions = {
  appDir: 'C:\\app',
  outputDir: 'C:\\out',
  packageAssets: 'C:\\assets',
  manifestVariables: minimalManifestVariables,
}

describe('manifestation', () => {
  describe('getManifestVariables', () => {

    it('should read manifest variables from AppxManifest.xml correctly', async () => {
      const packagingOptions: PackagingOptions = {
        ...minimalPackagingOptions,
        appManifest: path.join(__dirname, 'fixtures', 'AppxManifest_x64.xml'),
      }
      const manifestVars = await getManifestVariables(packagingOptions)
      expect(manifestVars).toBeDefined();
      expect(manifestVars.manifestAppName).toBe('hellomsix');
      expect(manifestVars.manifestPackageArch).toBe('x64');
      expect(manifestVars.manifestIsSparsePackage).toBe(false);
      expect(manifestVars.manifestPublisher).toBe('CN="Electron"');
      expect(manifestVars.manifestOsMinVersion).toBe('10.0.17763.0');
    });

    it('should detect sparse package correctly', async () => {
      const packagingOptions: PackagingOptions = {
        ...minimalPackagingOptions,
        appManifest: path.join(__dirname, 'fixtures', 'AppxManifest_Sparse.xml'),
      }
      const manifestVars = await getManifestVariables(packagingOptions)
      expect(manifestVars.manifestIsSparsePackage).toBe(true);

    });

    it('should return null if no manifest is provided', async () => {
      const packagingOptions: PackagingOptions = {
        ...minimalPackagingOptions,
      }
      const manifestVars = await getManifestVariables(packagingOptions)
      expect(manifestVars).toBeNull();
    });

    it('should return null if no manifest is provided', async () => {
      const packagingOptions: PackagingOptions = {
        ...minimalPackagingOptions,
        appManifest: path.join(__dirname, 'fixtures', 'AppxManifest_invalid.xml'),
      }
      const manifestVars = await getManifestVariables(packagingOptions)
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
      }
      const appManifestIn = await manifest(packagingOptions);
      expect(appManifestIn).toMatch(/<Identity Name="Electron.MySuite.HelloMSIX"/);
      expect(appManifestIn).toMatch(/ProcessorArchitecture="x64"/);
      expect(appManifestIn).toMatch(/Version="1.0.0.0"/);
      expect(appManifestIn).toMatch(/Publisher="CN=&quot;Electron&quot;"\/>/);
      expect(appManifestIn).toMatch(/<DisplayName>HelloMSIX App<\/DisplayName>/);
      expect(appManifestIn).toMatch(/<PublisherDisplayName>Electron<\/PublisherDisplayName>/);
      expect(appManifestIn).toMatch(/<Logo>assets\\icon.png<\/Logo>/);
    });


    it('should generate a valid manifest with minimal arguments', async () => {
      const {appManifestIn} = await makeProgramOptions(minimalPackagingOptions, null as any);
      expect(appManifestIn).toMatch(/<Identity Name="com.electron.myapp"/);
      expect(appManifestIn).toMatch(/ProcessorArchitecture="x64"/);
      expect(appManifestIn).toMatch(/Version="1.42.0.0"/);
      expect(appManifestIn).toMatch(/Publisher="CN=Jan Hannemann"\/>/);
      expect(appManifestIn).toMatch(/<DisplayName>HelloMSIX<\/DisplayName>/);
      expect(appManifestIn).toMatch(/<PublisherDisplayName>Jan Hannemann<\/PublisherDisplayName>/);
      expect(appManifestIn).toMatch(/<Logo>assets\\icon.png<\/Logo>/);
      expect(appManifestIn).toMatch(/<TargetDeviceFamily Name="Windows.Desktop" MinVersion="10.0.14393.0" MaxVersionTested="10.0.14393.0" \/>/);
      expect(appManifestIn).toMatch(/<Application Id="App"  Executable="app\\HelloMSIX.exe" EntryPoint="Windows.FullTrustApplication">/);
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
      }
      const appManifestIn = await manifest(packagingOptions);
      expect(appManifestIn).toMatch(/<DisplayName>Custom Package Display Name<\/DisplayName>/);
      expect(appManifestIn).toMatch(/<PublisherDisplayName>Custom Publisher Display Name<\/PublisherDisplayName>/);
      expect(appManifestIn).toMatch(/<TargetDeviceFamily Name="Windows.Desktop" MinVersion="10.0.17763.0" MaxVersionTested="10.0.17763.0" \/>/);
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
      }
      const appManifestIn = await manifest(packagingOptions);
      expect(appManifestIn).toMatch(/<TargetDeviceFamily Name="Windows.Desktop" MinVersion="10.0.17763.0" MaxVersionTested="10.0.17763.0" \/>/);
    });

    it('should use packageDisplayName as display name if appDisplayName and packageDescription is not provided', async () => {
      const packagingOptions: PackagingOptions = {
        ...minimalPackagingOptions,
        manifestVariables: {
          ...minimalManifestVariables,
          packageDisplayName: 'Custom Package Display Name',
        },
      }
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
      }
      const appManifestIn = await manifest(packagingOptions);
      expect(appManifestIn).toMatch(/Description="Custom App Display Name"/);
    });


    it('should return null if no manifest variables are provided', async () => {
      const packagingOptions: PackagingOptions = {
        ...minimalPackagingOptions,
        manifestVariables: undefined,
      }
      const appManifestIn = await manifest(packagingOptions);
      expect(appManifestIn).toBeNull();
    });
  });
});
