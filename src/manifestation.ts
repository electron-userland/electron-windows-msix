import * as path from 'path';
import fs from 'fs-extra';

import { ComToastActivationOptions, ManifestVariables, PackagingOptions } from './types';
import { removeFileExtension, removePublisherPrefix } from './utils';
import { ensureWindowsVersion } from './win-version';

const DEFAULT_OS_VERSION = '10.0.19041.0';
const DEFAULT_BACKGROUND_COLOR = 'transparent';

const TEMPLATES_DIR = path.join(__dirname, '../static/templates');
const COM_MANIFEST_NS = 'http://schemas.microsoft.com/appx/manifest/com/windows10';

function escapeXmlAttr(value: string | null | undefined): string {
  // String() matches the coercion String.prototype.replace applies to
  // non-function replacement values, so partial manifest variables behave
  // the same as before escaping was introduced.
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/'/g, '&apos;');
}

/**
 * Normalize toast activator CLSID: trim, strip optional braces, lowercase hex.
 * @param braced - If `true` (default), `{guid}`; if `false`, `guid` for Appx manifest attributes (no braces).
 */
export function normalizeToastActivatorClsid(raw: string, braced = true): string {
  const inner = raw.trim().replace(/^\{/, '').replace(/\}$/, '').toLowerCase();
  return braced ? `{${inner}}` : inner;
}

let comToastExtensionsTemplateCache: string | null = null;

function getComToastExtensionsTemplate(): string {
  if (comToastExtensionsTemplateCache === null) {
    comToastExtensionsTemplateCache = fs
      .readFileSync(path.join(TEMPLATES_DIR, 'ComToastActivation.xml.in'), 'utf-8')
      .trimEnd();
  }
  return comToastExtensionsTemplateCache;
}

export function buildComToastActivationXml(
  opts: ComToastActivationOptions,
  appExecutableFileName: string,
): { comXmlns: string; ignorableCom: string; applicationExtensions: string } {
  const clsid = normalizeToastActivatorClsid(opts.toastActivatorClsid, false);
  const exeName = path.basename(opts.executable?.trim() || appExecutableFileName);
  const exePath = `app\\${escapeXmlAttr(exeName)}`;
  const args = escapeXmlAttr(opts.arguments ?? '-ToastActivated');

  const extensions = getComToastExtensionsTemplate();
  const applicationExtensions = extensions
    .replace(/\{\{ExeServerExecutable\}\}/g, exePath)
    .replace(/\{\{ExeServerArguments\}\}/g, args)
    .replace(/\{\{ToastActivatorClsid\}\}/g, clsid);

  return {
    comXmlns: `xmlns:com="${COM_MANIFEST_NS}"`,
    ignorableCom: ' com',
    applicationExtensions,
  };
}

const getTemplate = () => {
  const content = fs.readFileSync(path.join(TEMPLATES_DIR, 'AppxManifest.xml.in'), 'utf-8');
  return content;
};

export const getManifestVariables = async (
  options: PackagingOptions,
): Promise<ManifestVariables> => {
  if (!options.appManifest) {
    return null;
  }

  const manifestXml = (await fs.readFile(options.appManifest)).toString();
  const minWinVersionRegEx = /MinVersion="(.*?)"/s;
  const appNameRegEx = /Executable="(.*?)"/s;
  const archRegEx = /ProcessorArchitecture="(.*?)"/s;
  const sparseRegex = /<uap10:AllowExternalContent>\s*true\s*<\/uap10:AllowExternalContent>/s;
  const publisherRegex = /Publisher="(.*?)"/s;
  let manifestOsMinVersion: string;
  let manifestAppName: string;
  let manifestPackageArch: string;
  let manifestIsSparsePackage = false;
  let manifestPublisher: string;

  let match = manifestXml.match(minWinVersionRegEx);
  if (match) {
    manifestOsMinVersion = match[1];
  }

  match = manifestXml.match(appNameRegEx);
  if (match) {
    manifestAppName = removeFileExtension(match[1]);
  }

  match = manifestXml.match(archRegEx);
  if (match) {
    manifestPackageArch = match[1];
  }

  match = manifestXml.match(sparseRegex);
  if (match) {
    manifestIsSparsePackage = true;
  }

  match = manifestXml.match(publisherRegex);
  if (match) {
    manifestPublisher = match[1];
  }

  const manifestVariables: ManifestVariables = {
    manifestOsMinVersion,
    manifestAppName,
    manifestPackageArch,
    manifestIsSparsePackage,
    manifestPublisher,
  };

  return manifestVariables;
};

/**
 * Generates the AppxManifest.xml file from the options provided.
 * @param options - The options for the MSIX package.
 * @returns The AppxManifest.xml content.
 */
export const manifest = async (options: PackagingOptions) => {
  if (options.appManifest) {
    const manifest = await fs.readFile(options.appManifest, 'utf-8');
    return manifest;
  }
  if (!options.manifestVariables) {
    return null;
  }

  const template = getTemplate();
  const {
    appDisplayName,
    packageIdentity,
    packageMinOSVersion,
    packageMaxOSVersionTested,
    packageVersion,
    packageDisplayName,
    publisher,
    publisherDisplayName,
    appExecutable,
    targetArch,
    packageDescription,
    packageBackgroundColor,
    comToastActivation,
  } = options.manifestVariables;
  const appName = removeFileExtension(appExecutable);
  const publisherName = removePublisherPrefix(publisher);
  const version = ensureWindowsVersion(packageVersion);
  let comXmlns = '';
  let ignorableNamespacesCom = '';
  let applicationExtensions = '';
  if (comToastActivation?.toastActivatorClsid) {
    const built = buildComToastActivationXml(comToastActivation, appExecutable);
    comXmlns = built.comXmlns;
    ignorableNamespacesCom = built.ignorableCom;
    applicationExtensions = built.applicationExtensions;
  }
  const manifest = template
    .replace(/{{IdentityName}}/g, () => escapeXmlAttr(packageIdentity))
    .replace(/{{AppDisplayName}}/g, () =>
      escapeXmlAttr(appDisplayName || packageDisplayName || appName),
    )
    .replace(/{{MinOSVersion}}/g, packageMinOSVersion || DEFAULT_OS_VERSION)
    .replace(
      /{{MaxOSVersionTested}}/g,
      packageMaxOSVersionTested || packageMinOSVersion || DEFAULT_OS_VERSION,
    )
    .replace(/{{Version}}/g, version)
    .replace(/{{DisplayName}}/g, () =>
      escapeXmlAttr(packageDisplayName || appDisplayName || appName),
    )
    .replace(/{{PublisherName}}/g, () => escapeXmlAttr(publisherName))
    .replace(/{{PublisherDisplayName}}/g, () =>
      escapeXmlAttr(publisherDisplayName || publisherName),
    )
    .replace(/{{PackageDescription}}/g, () =>
      escapeXmlAttr(packageDescription || packageDisplayName || appDisplayName || appName),
    )
    .replace(/{{PackageBackgroundColor}}/g, packageBackgroundColor || DEFAULT_BACKGROUND_COLOR)
    .replace(/{{AppExecutable}}/g, () => escapeXmlAttr(appExecutable))
    .replace(/{{ProcessorArchitecture}}/g, targetArch)
    .replace(/{{ComXmlns}}/g, comXmlns)
    .replace(/{{IgnorableNamespacesCom}}/g, ignorableNamespacesCom)
    .replace(/{{ApplicationExtensions}}/g, applicationExtensions);

  return manifest;
};
