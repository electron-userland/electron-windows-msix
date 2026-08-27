import fs from 'fs-extra';
import path from 'path';

import { log } from './logger';
import { powershell } from './powershell';
import { DevCertInfo, ProgramOptions } from './types';
import { ensurePublisherPrefix } from './utils';

// Values are spliced into single-quoted PowerShell literals. PowerShell also accepts the
// typographic quotes U+2018-U+201B as single-quote delimiters, so all of them must be doubled.
const escapePsLiteral = (value: string) => value.replace(/['‘-‛]/g, (quote) => quote + quote);

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
  // The BOM keeps powershell.exe from reading the script as ANSI, which would corrupt
  // non-ASCII subjects and passwords. The script embeds the PFX password, so it must be
  // removed even when PowerShell fails.
  fs.writeFileSync(scriptPath, '﻿' + script);
  let output: string;
  try {
    output = await powershell(scriptPath);
  } finally {
    fs.unlinkSync(scriptPath);
  }

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
