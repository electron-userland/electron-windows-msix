import { make, pri, priConfig, sign } from './bin';
import { ensureDevCert } from './cert';
import { getManifestVariables } from './manifestation';
import {
  type Artifacts,
  type ComToastActivationOptions,
  type ManifestGenerationVariables,
  type PackagingOptions,
  type WindowsSignOptions,
} from './types';
import {
  createLayout,
  ensureFolders,
  makeProgramOptions,
  setLogLevel,
  verifyOptions,
} from './utils';

export type {
  PackagingOptions,
  ManifestGenerationVariables,
  ComToastActivationOptions,
  Artifacts,
  WindowsSignOptions,
};

export const packageMSIX = async (options: PackagingOptions) => {
  setLogLevel(options);
  await ensureFolders(options);
  const manifestVars = await getManifestVariables(options);
  await verifyOptions(options, manifestVars);
  const program = await makeProgramOptions(options, manifestVars);
  await createLayout(program);
  await ensureDevCert(program);
  await priConfig(program);
  await pri(program);
  await make(program);
  await sign(program);

  return {
    msixPackage: program.msix,
  };
};
