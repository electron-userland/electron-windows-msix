import { spawn } from '@malept/cross-spawn-promise';
import { describe, expect, it, vi } from 'vitest';

import { powershell } from '../../src/powershell';

vi.mock(import('@malept/cross-spawn-promise'), async () => {
  return {
    spawn: vi.fn(),
  };
});

describe('powershell', () => {
  it('should call powershell', async () => {
    await powershell('C:\\out\\create_dev_cert.ps1');
    expect(spawn).toHaveBeenCalledWith('pwsh.exe', [
      '-NoProfile',
      '-ExecutionPolicy',
      'Bypass',
      'C:\\out\\create_dev_cert.ps1',
    ]);
  });

  it('should call powershell', async () => {
    await powershell('Get-Process');
    expect(spawn).toHaveBeenCalledWith('pwsh.exe', [
      '-NoProfile',
      '-ExecutionPolicy',
      'Bypass',
      '-Command',
      'Get-Process',
    ]);
  });

  it('should call powershell', async () => {
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
});
