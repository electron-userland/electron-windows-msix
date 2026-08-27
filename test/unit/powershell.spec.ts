import { spawn } from '@malept/cross-spawn-promise';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { powershell } from '../../src/powershell';

vi.mock(import('@malept/cross-spawn-promise'), async () => {
  return {
    spawn: vi.fn(),
  };
});

describe('powershell', () => {
  beforeEach(() => {
    vi.mocked(spawn).mockReset();
  });

  it('should run a script file', async () => {
    await powershell('C:\\out\\create_dev_cert.ps1');
    expect(spawn).toHaveBeenCalledWith('pwsh.exe', [
      '-NoProfile',
      '-ExecutionPolicy',
      'Bypass',
      '-File',
      'C:\\out\\create_dev_cert.ps1',
    ]);
  });

  it('should run a command', async () => {
    await powershell('Get-Process');
    expect(spawn).toHaveBeenCalledWith('pwsh.exe', [
      '-NoProfile',
      '-ExecutionPolicy',
      'Bypass',
      '-Command',
      'Get-Process',
    ]);
  });

  it('should return the command output', async () => {
    vi.mocked(spawn).mockResolvedValue({ toString: () => 'Hello' } as any);
    const result = await powershell('Get-Process');
    expect(result).toBe('Hello');
    expect(spawn).toHaveBeenCalledWith('pwsh.exe', [
      '-NoProfile',
      '-ExecutionPolicy',
      'Bypass',
      '-Command',
      'Get-Process',
    ]);
  });

  it('should fall back to powershell.exe when pwsh.exe is not installed', async () => {
    vi.mocked(spawn)
      .mockRejectedValueOnce({ originalError: { code: 'ENOENT' } })
      .mockResolvedValueOnce({ toString: () => 'Hello' } as any);
    const result = await powershell('Get-Process');
    expect(result).toBe('Hello');
    expect(spawn).toHaveBeenNthCalledWith(1, 'pwsh.exe', [
      '-NoProfile',
      '-ExecutionPolicy',
      'Bypass',
      '-Command',
      'Get-Process',
    ]);
    expect(spawn).toHaveBeenNthCalledWith(2, 'powershell.exe', [
      '-NoProfile',
      '-ExecutionPolicy',
      'Bypass',
      '-Command',
      'Get-Process',
    ]);
  });

  it('should not fall back on errors other than a missing executable', async () => {
    // Shaped like cross-spawn-promise's ExitCodeError: a numeric exit code, no originalError.
    const exitError = Object.assign(new Error('Command failed with a non-zero return code (1)'), {
      code: 1,
      stdout: new Uint8Array(),
      stderr: new Uint8Array(),
    });
    vi.mocked(spawn).mockRejectedValueOnce(exitError);
    await expect(powershell('Get-Process')).rejects.toThrow(
      'Command failed with a non-zero return code (1)',
    );
    expect(spawn).toHaveBeenCalledTimes(1);
  });
});
