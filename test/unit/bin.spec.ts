import { sign as windowsSign } from '@electron/windows-sign';
import { spawn } from 'child_process';
import { EventEmitter } from 'events';
import fs from 'fs-extra';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getCertPublisher, make, pri, priConfig, sign } from '../../src/bin';
import { log } from '../../src/logger';
import { powershell } from '../../src/powershell';

vi.mock('child_process', () => ({
  spawn: vi.fn(() => {
    const emitter = new EventEmitter() as any;
    // Simulate stdout, stderr, exit, and close events
    setImmediate(() => {
      emitter.emit('data', Buffer.from('mocked spawn output')); // General data event (if used)
      emitter.stdout.emit('data', Buffer.from('mocked stdout'));
      emitter.stderr.emit('data', Buffer.from('mocked stderr'));
      emitter.emit('exit', 0, null); // Exit with code 0, no signal
      emitter.emit('close', 0); // Close with code 0
    });
    // Attach stdout and stderr as EventEmitters
    emitter.stdout = new EventEmitter();
    emitter.stderr = new EventEmitter();
    emitter.stdin = {
      end: vi.fn(),
    };
    return emitter;
  }),
}));

vi.mock('@electron/windows-sign', () => ({
  sign: vi.fn(),
}));

vi.mock('../../src/powershell', () => ({
  powershell: vi.fn(),
}));

vi.mock('../../src/logger');

describe('bin', () => {
  beforeEach(() => {
    vi.mocked(windowsSign).mockClear();
    vi.mocked(spawn).mockClear();
    vi.mocked(powershell).mockReset();
    vi.spyOn(fs, 'readFileSync').mockReturnValue(
      '$pfxPath = "{{PfxPath}}"; $pfxPasswordPlain = "{{Password}}"',
    );
    vi.spyOn(fs, 'writeFileSync').mockImplementation(() => undefined as any);
    vi.spyOn(fs, 'removeSync').mockImplementation(() => undefined as any);
  });

  it('should return the publisher from the cert', async () => {
    // PowerShell's X509Certificate2.Subject returns a culture-invariant string.
    vi.mocked(powershell).mockResolvedValueOnce('CN=Electron\r\n');
    const result = await getCertPublisher('C:\\cert.pfx', 'password');
    expect(powershell).toHaveBeenCalledWith(expect.stringMatching(/\.ps1$/));
    expect(result).toBe('CN=Electron');
  });

  it('should pass the cert path and password into the templated script', async () => {
    vi.mocked(powershell).mockResolvedValueOnce('CN=Electron');
    let writtenScript = '';
    vi.mocked(fs.writeFileSync).mockImplementationOnce((_path, data) => {
      writtenScript = data as string;
    });
    await getCertPublisher('C:\\cert.pfx', 'password');
    expect(writtenScript).toContain('C:\\cert.pfx');
    expect(writtenScript).toContain('password');
    expect(writtenScript).not.toContain('{{PfxPath}}');
    expect(writtenScript).not.toContain('{{Password}}');
  });

  it('should log an error if reading the cert fails', async () => {
    vi.mocked(powershell).mockRejectedValueOnce(new Error('oops'));
    const result = await getCertPublisher('C:\\cert.pfx', 'password');
    expect(result).toBeNull();
    expect(log.error).toHaveBeenCalledWith(
      'Unable to read publisher from Cert',
      false,
      expect.anything(),
    );
    // The temp script file is always cleaned up.
    expect(fs.removeSync).toHaveBeenCalled();
  });

  it('should log an error if no publisher is found in the cert', async () => {
    vi.mocked(powershell).mockResolvedValueOnce('');
    await getCertPublisher('C:\\cert.pfx', 'password');
    expect(log.error).toHaveBeenCalledWith('Unable to find publisher in Cert');
  });

  it('should call priConfig with the correct arguments', async () => {
    await priConfig({
      makePri: 'C:\\makepri.exe',
      priConfig: 'C:\\priConfig.xml',
      createPri: true,
    } as any);
    expect(spawn).toHaveBeenCalledWith(
      'C:\\makepri.exe',
      ['createconfig', '/cf', 'C:\\priConfig.xml', '/dq', 'en-US'],
      {},
    );
  });

  it('should call priConfig with the correct arguments', async () => {
    await priConfig({
      makePri: 'C:\\makepri.exe',
      priConfig: 'C:\\priConfig.xml',
      createPri: false,
    } as any);
    expect(spawn).not.toHaveBeenCalled();
  });

  it('should call pri with the correct arguments', async () => {
    await pri({
      makePri: 'C:\\makepri.exe',
      priConfig: 'C:\\priConfig.xml',
      layoutDir: 'C:\\layoutDir',
      priFile: 'C:\\priFile.xml',
      appManifestLayout: 'C:\\appManifestLayout.xml',
      createPri: true,
    } as any);
    expect(spawn).toHaveBeenCalledWith(
      'C:\\makepri.exe',
      [
        'new',
        '/pr',
        'C:\\layoutDir',
        '/cf',
        'C:\\priConfig.xml',
        '/mn',
        'C:\\appManifestLayout.xml',
        '/of',
        'C:\\priFile.xml',
        '/v',
      ],
      {},
    );
  });

  it('should skip pri if createPri is false', async () => {
    await pri({
      createPri: false,
    } as any);
    expect(spawn).not.toHaveBeenCalled();
  });

  it('should call make with the correct arguments', async () => {
    await make({
      makeMsix: 'C:\\makeappx.exe',
      layoutDir: 'C:\\layoutDir',
      msix: 'C:\\msix',
      isSparsePackage: false,
      compress: true,
    } as any);
    expect(spawn).toHaveBeenCalledWith(
      'C:\\makeappx.exe',
      ['pack', '/d', 'C:\\layoutDir', '/p', 'C:\\msix', '/o'],
      {},
    );
  });

  it('should call make with the correct arguments for a sparse package', async () => {
    await make({
      makeMsix: 'C:\\makeappx.exe',
      layoutDir: 'C:\\layoutDir',
      msix: 'C:\\msix',
      isSparsePackage: true,
      compress: true,
    } as any);
    expect(spawn).toHaveBeenCalledWith(
      'C:\\makeappx.exe',
      ['pack', '/d', 'C:\\layoutDir', '/p', 'C:\\msix', '/o', '/nv'],
      {},
    );
  });

  it('should call make with the correct arguments for an uncompressed package', async () => {
    await make({
      makeMsix: 'C:\\makeappx.exe',
      layoutDir: 'C:\\layoutDir',
      msix: 'C:\\msix',
      isSparsePackage: false,
      compress: false,
    } as any);
    expect(spawn).toHaveBeenCalledWith(
      'C:\\makeappx.exe',
      ['pack', '/d', 'C:\\layoutDir', '/p', 'C:\\msix', '/o', '/nc'],
      {},
    );
  });

  it('should call sign with the correct arguments', async () => {
    await sign({
      sign: true,
      signTool: 'C:\\SignTool.exe',
      signParams: ['-fd', 'sha256', '-f', 'C:\\cert.pfx'],
      msix: 'C:\\myapp.msix',
      windowsSignOptions: {
        certificateFile: 'C:\\cert.pfx',
        certificatePassword: 'password',
        hashes: ['sha256'],
        files: ['C:\\myapp.msix'],
      },
    } as any);

    expect(windowsSign).toHaveBeenCalledWith({
      certificateFile: 'C:\\cert.pfx',
      certificatePassword: 'password',
      hashes: ['sha256'],
      files: ['C:\\myapp.msix'],
    });
  });

  it('should not call sign if sign is false', async () => {
    await sign({
      sign: false,
      signTool: 'C:\\SignTool.exe',
      signParams: ['-fd', 'sha256', '-f', 'C:\\cert.pfx'],
      msix: 'C:\\myapp.msix',
      windowsSignOptions: {
        certificateFile: 'C:\\cert.pfx',
        certificatePassword: 'password',
        hashes: ['sha256'],
        files: ['C:\\myapp.msix'],
      },
    } as any);

    expect(windowsSign).not.toHaveBeenCalled();
  });
});
