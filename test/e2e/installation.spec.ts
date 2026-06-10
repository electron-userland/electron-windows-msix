import fs from 'fs';
import path from 'path';
import { describe, it, expect, beforeAll } from 'vitest';

import { packageMSIX } from '../../src/index';
import { installDevCert } from './utils/cert';
import { checkInstall, installMSIX, uninstallMSIX } from './utils/installer';
import { powershell } from '../../src/powershell';

describe('installation', () => {
  beforeAll(async () => {
    await installDevCert();
  });

  it('should package the app with an existing app manifest', async () => {
    await packageMSIX({
      appDir: path.join(__dirname, 'fixtures', 'app-x64'),
      outputDir: path.join(__dirname, '..', '..', 'out'),
      appManifest: path.join(__dirname, 'fixtures', 'AppxManifest_x64.xml'),
      windowsKitVersion: '10.0.26100.0',
      windowsSignOptions: {
        files: [path.join(__dirname, '..', '..', 'out', 'hellomsix_x64.msix')],
        certificateFile: path.join(__dirname, 'fixtures', 'MSIXDevCert.pfx'),
        certificatePassword: 'Password123',
      },
    });
    expect(fs.existsSync(path.join(__dirname, '..', '..', 'out', 'hellomsix_x64.msix'))).toBe(true);
  });

  it('should install the app', async () => {
    await installMSIX(path.join(__dirname, '..', '..', 'out', 'hellomsix_x64.msix'));
    const install = await checkInstall('Electron.MySuite.HelloMSIX');
    expect(install).toBeDefined();
    expect(install.name).toBe('Electron.MySuite.HelloMSIX');
    expect(install.version).toBe('1.2.3.4');
  });

  it('should run the app', async () => {
    const command = `explorer.exe shell:appsFolder\\Electron.MySuite.HelloMSIX_98sq593n0v5ec!HelloMSIX; Start-Sleep -Seconds 1`;
    await powershell(command);
    const result = await powershell(`(ps "hellomsix").length`);
    const numberOfProcesses = parseInt(result);
    expect(numberOfProcesses).toBeGreaterThan(0);
    await powershell(`ps "hellomsix" | kill`);
  });

  it('should uninstall the app', async () => {
    await uninstallMSIX('Electron.MySuite.HelloMSIX');
    const install = await checkInstall('Electron.MySuite.HelloMSIX');
    expect(install.name).toBe('');
  }, 10000);
});
