import fs from 'fs-extra';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ensureDevCert } from '../../src/cert';
import { powershell } from '../../src/powershell';
import { generateDevCert } from '../../src/winapp';

vi.mock('fs-extra', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, any>;
  return {
    default: {
      readFileSync: actual.readFileSync,
      writeFileSync: vi.fn(),
      unlinkSync: vi.fn(),
    },
  };
});

vi.mock('../../src/powershell', () => ({
  powershell: vi.fn(),
}));

vi.mock('../../src/winapp', () => ({
  generateDevCert: vi.fn(),
}));

const programOptions = {
  outputDir: 'C:\\out',
  publisher: 'Electron',
  createDevCert: true,
  cert_pass: 'my_password',
  cert_pfx: 'C:\\out\\dev_cert.pfx',
  cert_cer: 'C:\\out\\dev_cert.cer',
};

describe('cert', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should not call powershell if createDevCert is false', async () => {
    const programOptions = {
      createDevCert: false,
    };
    await ensureDevCert(programOptions as any);
    expect(powershell).not.toHaveBeenCalled();
    expect(fs.writeFileSync).not.toHaveBeenCalled();
  });

  it('should create the dev cert with the winapp CLI when the winapp backend is used', async () => {
    await ensureDevCert({ ...programOptions, winApp: ['C:\\winapp.exe'] } as any);
    expect(generateDevCert).toHaveBeenCalledWith(
      expect.objectContaining({ winApp: ['C:\\winapp.exe'] }),
    );
    expect(powershell).not.toHaveBeenCalled();
    expect(fs.writeFileSync).not.toHaveBeenCalled();
  });

  it('should not use the winapp CLI if createDevCert is false', async () => {
    await ensureDevCert({ createDevCert: false, winApp: ['C:\\winapp.exe'] } as any);
    expect(generateDevCert).not.toHaveBeenCalled();
  });

  it('should fill the script with the correct values', async () => {
    await ensureDevCert(programOptions as any);
    expect(powershell).toHaveBeenCalledWith('C:\\out\\create_dev_cert.ps1');
    const script = vi.mocked(fs.writeFileSync).mock.calls[0][1];

    expect(script).toMatch(/\$subjectName = 'CN=Electron'/);
    expect(script).toMatch(/\$pfxPasswordPlain = 'my_password'/);
    expect(script).toMatch(/\$pfxOutputPath = 'C:\\out\\dev_cert.pfx'/);
    expect(script).toMatch(/\$cerOutputPath = 'C:\\out\\dev_cert.cer'/);
  });

  it('should call powershell to create a dev cert', async () => {
    await ensureDevCert(programOptions as any);
    expect(powershell).toHaveBeenCalledWith('C:\\out\\create_dev_cert.ps1');
    expect(fs.writeFileSync).toHaveBeenCalledWith(
      'C:\\out\\create_dev_cert.ps1',
      expect.any(String),
    );
    expect(fs.unlinkSync).toHaveBeenCalledWith('C:\\out\\create_dev_cert.ps1');
  });
});
