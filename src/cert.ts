import fs from 'fs-extra';
import path from 'path';

import { log } from './logger';
import { powershell } from './powershell';
import { DevCertInfo, ProgramOptions } from './types';
import { ensurePublisherPrefix } from './utils';

// Values are spliced into single-quoted PowerShell literals, where only embedded single quotes need doubling.
const escapePsLiteral = (value: string) => value.replace(/'/g, "''");

export const ensureDevCert = async (
  programOptions: ProgramOptions,
): Promise<DevCertInfo | undefined> => {
  if (!programOptions.createDevCert) {
    return undefined;
  }
  const template = fs.readFileSync(
    path.join(__dirname, '../static/templates/create_dev_cert.ps1.in'),
    'utf-8',
  );
  // The certificate subject must match the package publisher exactly, including any
  // DN attributes beyond CN, or the signed MSIX is rejected at install time.
  const subject = ensurePublisherPrefix(programOptions.publisher);
  const script = template
    .replace(/{{SubjectName}}/g, () => escapePsLiteral(subject))
    .replace(/{{Password}}/g, () => escapePsLiteral(programOptions.cert_pass))
    .replace(/{{PfxOutputPath}}/g, () => escapePsLiteral(programOptions.cert_pfx))
    .replace(/{{CerOutputPath}}/g, () => escapePsLiteral(programOptions.cert_cer));

  const scriptPath = path.join(programOptions.outputDir, 'create_dev_cert.ps1');
  fs.writeFileSync(scriptPath, script);
  const output = await powershell(scriptPath);
  fs.unlinkSync(scriptPath);

  const devCert: DevCertInfo = {
    pfxFile: programOptions.cert_pfx,
    cerFile: programOptions.cert_cer,
    password: programOptions.cert_pass,
    subject,
    reused: /DEV_CERT_REUSED=True/i.test(output || ''),
  };
  log.warn(
    'Signing with a generated dev certificate. To install the MSIX locally, trust the certificate once, e.g. `certutil -addstore TrustedPeople <cerFile>` from an elevated prompt. Do not distribute this certificate.',
    { cerFile: devCert.cerFile },
  );
  return devCert;
};
