import path from 'node:path';
import tls from 'node:tls';

import { sign as windowsSign } from '@electron/windows-sign';
import { spawn } from 'child_process';
import { EventEmitter } from 'events';
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getCertPublisher, make, pri, priConfig, exportedRunForVitest, sign } from "../../src/bin";
import { log } from '../../src/logger';

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
    }
    return emitter;
  }),
}));

vi.mock('@electron/windows-sign', () => ({
    sign: vi.fn(),
}));

vi.mock('../../src/logger');

describe('bin', () => {
  beforeEach(() => {
    vi.mocked(windowsSign).mockClear();
    vi.mocked(spawn).mockClear();
    vi.mocked(log.error).mockClear();
  });

  it('should return stdout when process succeeds', async () => {
    const stdoutData = 'hello electron-windows-msix';
    vi.mocked(spawn).mockImplementationOnce((_, __) => {
      const emitter = new EventEmitter() as any;
      setImmediate(() => {
        emitter.stdout.emit('data', Buffer.from(stdoutData));
        emitter.emit('exit', 0, null);
      });

      emitter.stdout = new EventEmitter();
      emitter.stderr = new EventEmitter();
      emitter.stdin = { end: vi.fn() };
      return emitter;
    });
    const executable = 'some_executable';
    const args = ['arg1', 'arg2', 'arg3', 'arg4'];
    const result = await exportedRunForVitest(executable, args);
    expect(spawn).toHaveBeenCalledWith(executable, args, {});
    expect(result).toBe(stdoutData);
  });

  it('should print stdout and stderr then reject when process fails', async () => {
    const stdoutData = 'error stdout';
    const stderrData = 'error stderr';
    vi.mocked(spawn).mockImplementationOnce(() => {
      const emitter = new EventEmitter() as any;
      setImmediate(() => {
        emitter.stdout.emit('data', Buffer.from(stdoutData));
        emitter.stderr.emit('data', Buffer.from(stderrData));
        emitter.emit('exit', 1, null);
      });

      emitter.stdout = new EventEmitter();
      emitter.stderr = new EventEmitter();
      emitter.stdin = { end: vi.fn() };
      return emitter;
    });
    const executable = 'some_executable';
    const args = ['arg1', 'arg2', 'arg3', 'arg4'];
    await expect(exportedRunForVitest(executable, args)).rejects.toThrow(`Failed running ${executable} Exit Code: 1 See previous errors for details`);
    expect(log.error).toHaveBeenCalledWith(`stderr of ${executable}`, false, [stderrData]);
    expect(log.error).toHaveBeenCalledWith(`stdout of ${executable}`, false, [stdoutData]);
  });

  it('should directly reject when process fails and stdout and stderr are empty', async () => {
    vi.mocked(spawn).mockImplementationOnce(() => {
      const emitter = new EventEmitter() as any;
      setImmediate(() => {
        emitter.emit('exit', 1, null);
      });

      emitter.stdout = new EventEmitter();
      emitter.stderr = new EventEmitter();
      emitter.stdin = { end: vi.fn() };
      return emitter;
    });
    const executable = 'some_executable';
    const args = ['arg1', 'arg2', 'arg3', 'arg4'];
    await expect(exportedRunForVitest(executable, args)).rejects.toThrow();
    expect(log.error).not.toHaveBeenCalled();
  });

  it('should return the publisher from the cert', async () => {
    const certPath = path.join(__dirname, '..', 'e2e', 'fixtures', 'MSIXDevCert.pfx');
    const result = await getCertPublisher(certPath, 'Password123');
    expect(result).toBe('CN=Electron MSIX');
  });

  it('should log an error if password is incorrect', async () => {
    const certPath = path.join(__dirname, '..', 'e2e', 'fixtures', 'MSIXDevCert.pfx');
    const result = await getCertPublisher(certPath, 'Very wrong password');
    expect(result).toBeNull();
    expect(log.error).toHaveBeenCalledWith('Unable to parse certificate', false, expect.anything());
  });

  it('should log an error if the file is not a valid PFX', async () => {
    const obviouslyNotAPfx = path.join(__dirname, 'fixtures', 'AppxManifest_invalid.xml');
    const result = await getCertPublisher(obviouslyNotAPfx, 'Password123');
    expect(result).toBeNull();
    expect(log.error).toHaveBeenCalledWith('Unable to parse certificate', false, expect.anything());
  });

  it('should log an error if socket.getX509Certificate returns undefined', async () => {
    vi.spyOn(tls.TLSSocket.prototype, 'getX509Certificate').mockImplementationOnce(() => undefined);
    const certPath = path.join(__dirname, '..', 'e2e', 'fixtures', 'MSIXDevCert.pfx');
    const result = await getCertPublisher(certPath, 'Password123');
    expect(result).toBeNull();
    expect(log.error).toHaveBeenCalledWith('Unable to parse certificate', false, new Error('No certificate found'));
  });

  it('should call priConfig with the correct arguments', async () => {
   await priConfig({
      makePri: 'C:\\makepri.exe',
      priConfig: 'C:\\priConfig.xml',
      createPri: true,
    } as any);
    expect(spawn).toHaveBeenCalledWith('C:\\makepri.exe', ['createconfig', '/cf', 'C:\\priConfig.xml', '/dq', 'en-US'], {});
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
    expect(spawn).toHaveBeenCalledWith('C:\\makepri.exe', ['new', '/pr', 'C:\\layoutDir', '/cf', 'C:\\priConfig.xml', '/mn', 'C:\\appManifestLayout.xml', '/of', 'C:\\priFile.xml', '/v'], {});
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
    expect(spawn).toHaveBeenCalledWith('C:\\makeappx.exe', ['pack', '/d', 'C:\\layoutDir', '/p', 'C:\\msix', '/o'], {});
  });

  it('should call make with the correct arguments for a sparse package', async () => {
    await make({
      makeMsix: 'C:\\makeappx.exe',
      layoutDir: 'C:\\layoutDir',
      msix: 'C:\\msix',
      isSparsePackage: true,
      compress: true,
    } as any);
    expect(spawn).toHaveBeenCalledWith('C:\\makeappx.exe', ['pack', '/d', 'C:\\layoutDir', '/p', 'C:\\msix', '/o', '/nv'], {});
  });

  it('should call make with the correct arguments for an uncompressed package', async () => {
    await make({
      makeMsix: 'C:\\makeappx.exe',
      layoutDir: 'C:\\layoutDir',
      msix: 'C:\\msix',
      isSparsePackage: false,
      compress: false,
    } as any);
    expect(spawn).toHaveBeenCalledWith('C:\\makeappx.exe', ['pack', '/d', 'C:\\layoutDir', '/p', 'C:\\msix', '/o', '/nc'], {});
  });

  it('should call sign with the correct arguments', async () => {
    sign({
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
    sign({
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
