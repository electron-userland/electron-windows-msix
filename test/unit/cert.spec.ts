import fs from 'fs-extra';
import path from 'path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ensureDevCert } from '../../src/cert';
import { powershell } from '../../src/powershell';

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

const programOptions = {
  outputDir: 'C:\\out',
  publisher: 'Electron',
  createDevCert: true,
  cert_pass: 'my_password',
  cert_pfx: 'C:\\out\\dev_cert.pfx',
  cert_cer: 'C:\\out\\dev_cert.cer',
};

const scriptPath = path.join(programOptions.outputDir, 'create_dev_cert.ps1');

const getWrittenScript = () => vi.mocked(fs.writeFileSync).mock.calls[0][1] as string;

describe('cert', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(powershell).mockResolvedValue('DEV_CERT_REUSED=False');
  });

  it('should not call powershell if createDevCert is false', async () => {
    const programOptions = {
      createDevCert: false,
    };
    const devCert = await ensureDevCert(programOptions as any);
    expect(devCert).toBeUndefined();
    expect(powershell).not.toHaveBeenCalled();
    expect(fs.writeFileSync).not.toHaveBeenCalled();
  });

  it('should fill the script with the correct values', async () => {
    await ensureDevCert(programOptions as any);
    expect(powershell).toHaveBeenCalledWith(scriptPath);
    const script = getWrittenScript();

    expect(script).toMatch(/\$subjectName = 'CN=Electron'/);
    expect(script).toMatch(/\$pfxPasswordPlain = 'my_password'/);
    expect(script).toMatch(/\$pfxOutputPath = 'C:\\out\\dev_cert.pfx'/);
    expect(script).toMatch(/\$cerOutputPath = 'C:\\out\\dev_cert.cer'/);
  });

  it('should create a certificate with the MSIX signing profile', async () => {
    await ensureDevCert(programOptions as any);
    const script = getWrittenScript();

    expect(script).toContain('-Type Custom');
    expect(script).toContain("'2.5.29.37={text}1.3.6.1.5.5.7.3.3'");
    expect(script).toContain("'2.5.29.19={text}'");
    expect(script).toContain('-KeyUsage DigitalSignature');
    expect(script).not.toContain('-DnsName');
  });

  it('should use the full publisher distinguished name as the subject', async () => {
    await ensureDevCert({
      ...programOptions,
      publisher: 'CN=Contoso, O=Contoso Corp, C=US',
    } as any);
    const script = getWrittenScript();
    expect(script).toMatch(/\$subjectName = 'CN=Contoso, O=Contoso Corp, C=US'/);
  });

  it('should add the CN prefix to the subject when the publisher has none', async () => {
    const devCert = await ensureDevCert({ ...programOptions, publisher: 'Contoso' } as any);
    expect(getWrittenScript()).toMatch(/\$subjectName = 'CN=Contoso'/);
    expect(devCert.subject).toBe('CN=Contoso');
  });

  it('should escape single quotes in injected values', async () => {
    await ensureDevCert({
      ...programOptions,
      publisher: "CN=O'Brien",
      cert_pass: "pass'word",
    } as any);
    const script = getWrittenScript();
    expect(script).toMatch(/\$subjectName = 'CN=O''Brien'/);
    expect(script).toMatch(/\$pfxPasswordPlain = 'pass''word'/);
  });

  it('should escape typographic quotes in injected values', async () => {
    await ensureDevCert({
      ...programOptions,
      publisher: 'CN=O’Brien',
      cert_pass: 'pass‘word‛',
    } as any);
    const script = getWrittenScript();
    expect(script).toContain("$subjectName = 'CN=O’’Brien'");
    expect(script).toContain("$pfxPasswordPlain = 'pass‘‘word‛‛'");
  });

  it('should call powershell to create a dev cert', async () => {
    await ensureDevCert(programOptions as any);
    expect(powershell).toHaveBeenCalledWith(scriptPath);
    expect(fs.writeFileSync).toHaveBeenCalledWith(scriptPath, expect.any(String));
    expect(fs.unlinkSync).toHaveBeenCalledWith(scriptPath);
  });

  it('should write the script with a BOM so powershell.exe reads it as UTF-8', async () => {
    await ensureDevCert(programOptions as any);
    expect(getWrittenScript().startsWith('﻿')).toBe(true);
  });

  it('should remove the script even when powershell fails', async () => {
    vi.mocked(powershell).mockRejectedValue(new Error('boom'));
    await expect(ensureDevCert(programOptions as any)).rejects.toThrow('boom');
    expect(fs.unlinkSync).toHaveBeenCalledWith(scriptPath);
  });

  it('should return the details of the created dev cert', async () => {
    const devCert = await ensureDevCert(programOptions as any);
    expect(devCert).toStrictEqual({
      pfxFile: 'C:\\out\\dev_cert.pfx',
      cerFile: 'C:\\out\\dev_cert.cer',
      password: 'my_password',
      subject: 'CN=Electron',
      reused: false,
    });
  });

  it('should report when an existing dev cert was reused', async () => {
    vi.mocked(powershell).mockResolvedValue('some output\nDEV_CERT_REUSED=True\n');
    const devCert = await ensureDevCert(programOptions as any);
    expect(devCert.reused).toBe(true);
  });

  it('should treat missing powershell output as not reused', async () => {
    vi.mocked(powershell).mockResolvedValue(undefined as any);
    const devCert = await ensureDevCert(programOptions as any);
    expect(devCert.reused).toBe(false);
  });
});
