import crypto from 'crypto';
import fs from 'fs-extra';
import path from 'path';

import { log } from "./logger";
import { manifest } from './manifestation';
import { getCertPublisher } from './bin';
import { ManifestVariables, PackagingOptions, ProgramOptions, WindowsSignOptions } from "./types";
import { isValidVersion, WindowsOSVersion } from './win-version';


const DEFAULT_WIN_KIT_VERSION = '10.0.26100.0';
const MIN_ARM_WIN_KIT_VERSION = '10.0.22621.0';
const WIN_KIT_BIN_PATH = 'C:\\Program Files (x86)\\Windows Kits\\10\\bin';
const MAKE_PRI_EXE = 'makepri.exe';
const MAKE_APPX_EXE = 'makeappx.exe';
const SIGN_TOOL = 'SignTool.exe';
const MAKE_CERT_EXE = 'makecert.exe';

export const getBinaries = async (windowsKitPath: string) => {
  const binaries = {
    makeAppx: path.join(windowsKitPath, MAKE_APPX_EXE),
    makePri: path.join(windowsKitPath, MAKE_PRI_EXE),
    signTool: path.join(windowsKitPath, SIGN_TOOL),
    makeCert: path.join(windowsKitPath, MAKE_CERT_EXE),
  };

  if(!(await fs.exists(binaries.makeAppx))) log.error(`MakeAppx binary ${MAKE_APPX_EXE} not found in:`, true, { windowsKitPath });
  if(!(await fs.exists(binaries.makePri))) log.error(`MakePri binary ${MAKE_PRI_EXE} not found in:`, true, { windowsKitPath });
  if(!(await fs.exists(binaries.signTool))) log.error(`SignTool binary ${SIGN_TOOL} not found in:`, true, { windowsKitPath });
  if(!(await fs.exists(binaries.makeCert))) log.error(`MakeCert binary ${MAKE_CERT_EXE} not found in:`, true, { windowsKitPath });
  return binaries;
}

export const removeFileExtension = (executablePath: string) => {
  if(!executablePath) return undefined;
  const executable = path.basename(executablePath);
  return executable.replace(/\.[^\/.]+$/, "");
}

export const removePublisherPrefix = (publisher: string) => {
  return publisher.replace(/^CN=/, "");
}

export const ensurePublisherPrefix = (publisher: string) => {
  return !publisher || publisher.startsWith('CN=') ? publisher : `CN=${publisher}`;
}

export const ensureFolders = async (options: PackagingOptions) => {
  const outputDir = options.outputDir;
  const layoutDir = path.join(options.outputDir, 'msix_layout');

  if(await fs.exists(outputDir)) {
    log.debug('Output dir already exists. Making sure its empty.', { outputDir });
    await fs.emptyDir(outputDir, );
  } else {
    log.debug('Output dir does not exists. Creating it.');
    await fs.ensureDir(outputDir);
  }

  log.debug('Creating layout dir', { layoutDir });
  await fs.ensureDir(layoutDir);

  return { outputDir, layoutDir };
}

export const verifyOptions = async (options: PackagingOptions, manifestVars?: ManifestVariables) => {
  const { manifestIsSparsePackage, manifestPublisher } = manifestVars || {};
  const publisher = manifestPublisher || ensurePublisherPrefix(options.manifestVariables?.publisher);
  const windowsSignOptions = options.windowsSignOptions;
  const sign = options.sign !== undefined ? options.sign : true;

  let hasManifestParams = false;
  log.debug('You are calling with following packaging options', options)
  if(!options.appManifest && options.manifestVariables) {
    if(!options.manifestVariables.packageVersion) log.error('Neither package version <packageVersion> nor app manifest <appManifest> provided.', true);
    if(!isValidVersion(options.manifestVariables.packageVersion)) log.error('Package version <packageVersion> is not a semantic version.', true, { packageVersion: options.manifestVariables.packageVersion });
    if(!options.manifestVariables.publisher) log.error('Neither publisher <publisher> nor app manifest <appManifest> provided.', true);
    if(!options.manifestVariables.publisherDisplayName) log.warn('Neither publisher display name <publisherDisplayName> nor app manifest <appManifest> provided. Using publisher as display name.');
    if(!options.manifestVariables.packageDisplayName) log.warn('Neither package display name <packageDisplayName> nor app manifest <appManifest> provided. Using app executable as display name.');
    if(!options.manifestVariables.appExecutable) log.error('Neither app executable <appExecutable> nor app manifest <appManifest> provided.', true);
    if(!options.manifestVariables.targetArch) log.error('Neither target architecture <targetArch> nor app manifest <appManifest> provided.', true);
    if(!options.manifestVariables.packageMinOSVersion) log.warn('Neither package min OS version <packageMinOSVersion> nor app manifest <appManifest> provided. Using default OS version 10.0.14393.0.');
    if(!options.manifestVariables.packageMaxOSVersionTested) log.warn('Neither package max OS version tested <packageMaxOSVersionTested> nor app manifest <appManifest> provided. Using default OS version 10.0.14393.0.');
    if(!options.manifestVariables.packageIdentity) log.error('Neither package identity <packageIdentity> nor app manifest <appManifest> provided.', true);
    if(!options.manifestVariables.appDisplayName) log.warn('Neither app display name <appDisplayName> nor app manifest <appManifest> provided. Using app executable as display name.');
    if(!options.manifestVariables.packageDescription) log.warn('Neither package description <packageDescription> nor app manifest <appManifest> provided. Using app executable as description.');
    if(!options.manifestVariables.packageBackgroundColor) log.warn('Neither package background color <packageBackgroundColor> nor app manifest <appManifest> provided. Using default background color transparent.');
    hasManifestParams = true;
  }
  if(!hasManifestParams && !options.appManifest) log.error('Neither app manifest <appManifest> nor manifest variables <manifestVariables> provided.', true);
  if(options.appManifest && !(await fs.exists(options.appManifest))) log.error('Path to application manifest <appManifest> does not exist.', true, { appManifest: options.appManifest });
  if(!options.appDir && !manifestIsSparsePackage) log.error('Path to application <appDir> not provided.', true);
  if(!(await fs.exists(options.appDir)) && !manifestIsSparsePackage) log.error('Path to application <appDir> does not exist.', true, { appDir: options.appDir });
  if(!options.packageAssets) log.warn('Path to packages assets <packageAssets> not provided, using default assets.');
  if(options.packageAssets && !(await fs.exists(options.packageAssets))) log.error('Path to packages assets provided but <packageAssets> does not exist.', true, { packageAssets: options.packageAssets });
  if(sign) {
    if(!windowsSignOptions || (!windowsSignOptions['appDirectory'] && (!windowsSignOptions['files'] || windowsSignOptions['files'].length === 0))) {
      log.warn('Neither path to application <appDir> nor files <files> provided in windows sign options. Will add MSIX package to files.');
    }

    if((!windowsSignOptions?.certificateFile && !process.env.WINDOWS_CERTIFICATE_FILE) && (windowsSignOptions?.certificatePassword || process.env.WINDOWS_CERTIFICATE_PASSWORD)) log.warn('Path to cert <certificateFile> or environment variable WINDOWS_CERTIFICATE_FILE not provided. A dev cert will be created with the provided password and the package will be signed with it!');
    if(!windowsSignOptions?.certificateFile && (!windowsSignOptions?.certificatePassword && !process.env.WINDOWS_CERTIFICATE_PASSWORD)) log.warn('Path to cert <certificateFile> and cert password <certificatePassword> or environment variable WINDOWS_CERTIFICATE_PASSWORD not provided. A dev cert will be created with a random password and the package will be signed with it!');
    if(windowsSignOptions?.certificateFile && !(await fs.exists(windowsSignOptions?.certificateFile))) log.error('Path to cert <certificateFile> does not exist.', true, { certificateFile: windowsSignOptions?.certificateFile });
    if(windowsSignOptions?.certificateFile && !windowsSignOptions?.certificatePassword && !process.env.WINDOWS_CERTIFICATE_PASSWORD) log.warn('Cert password <certificatePassword> not provided.');
    if(windowsSignOptions?.certificateFile && windowsSignOptions?.certificatePassword) {
      const certPublisher = await getCertPublisher(windowsSignOptions?.certificateFile, windowsSignOptions?.certificatePassword);
      if(publisher != certPublisher) log.error('The publisher in the manifest must match the publisher of the cert', false, {manifest_publisher: publisher, cert_publisher: certPublisher});
    }
  }
}

export const setLogLevel = (options: PackagingOptions) => {
  const { logLevel } = options;
  globalThis.SHOW_WARNINGS = logLevel === 'warn';
  globalThis.DEBUG = logLevel === 'debug';
}

export const locateMSIXTooling = async (options: PackagingOptions, manifestVars?: ManifestVariables) => {
  const { appManifest, windowsKitVersion, windowsKitPath } = options;
  let arch =  process.env.PROCESSOR_ARCHITECTURE === 'ARM64' ? 'arm64' : 'x64';

  if(windowsKitPath) {
    log.debug('WindowsKitPath was provided and takes priority over WindowsKitVersion. Checking if it exists....', {windowsKitPath});
    if(await fs.pathExists(windowsKitPath)) {
      const binaries = await getBinaries(windowsKitPath);
      log.debug('WindowsKitPath exists. Getting binary paths.', binaries);
      return binaries;
    } else {
      log.error('The WindowsKitPath was provided but does not exist.', true, windowsKitPath);
    }
  } else {
    log.debug('No WindowsKitPath provided. Will try WindowsKitVersion next.');
  }

  if(windowsKitVersion) {
    // Older versions than WinKit 10.0.22621.0 for ARM are missing the makeAppx.exe and we will fall back to x64 in that case.
    if(WindowsOSVersion.IsOlder(windowsKitVersion, MIN_ARM_WIN_KIT_VERSION) && arch === 'arm64') {
      arch = 'x64';
    }
    log.debug('WindowsKitVersion was provided and takes priority over AppxManifest. Checking if it exists....', {windowsKitVersion});
    const windowsKitPathExec = path.join(WIN_KIT_BIN_PATH, windowsKitVersion, arch);

    if(await fs.pathExists(windowsKitPathExec)) {
      const binaries = await getBinaries(windowsKitPathExec);
      log.debug(`WindowsKit version ${windowsKitVersion} exists. Getting binary paths.`, binaries);
      return binaries;
    }else {
      log.error('WindowsKitVersion was provided but does not exist.', true, windowsKitPathExec);
    }
  } else {
    log.debug('No WindowsKitVersion provided. Will try AppxManifest.xml min OS version next.');
  }

  if(appManifest || options.manifestVariables?.packageMinOSVersion) {
    let { manifestOsMinVersion } = manifestVars || {};
    manifestOsMinVersion = manifestOsMinVersion || options.manifestVariables?.packageMinOSVersion;
    log.debug('WindowsKitVersion was derived from OSMinVersion of the AppxManifest. Checking if it exists....', {manifestOsMinVersion});
    if (manifestOsMinVersion) {
      // Older versions than WinKit 10.0.22621.0 for ARM are missing the makeAppx.exe and we will fall back to x64 in that case.
      if(WindowsOSVersion.IsOlder(manifestOsMinVersion, MIN_ARM_WIN_KIT_VERSION) && arch === 'arm64') {
        arch = 'x64';
      }
      log.debug('WindowsKitVersion was derived from OSMinVersion of the AppxManifest. Checking if it exists....', {windowsKitVersion});
      const windowsKitPathExec = path.join(WIN_KIT_BIN_PATH, manifestOsMinVersion, arch);

      if(await fs.pathExists(windowsKitPathExec)) {
        const binaries = await getBinaries(windowsKitPathExec);
        log.debug(`WindowsKit version ${windowsKitVersion} from AppxManifest exists. Getting binary paths.`, binaries);
        return binaries;
      } else {
        log.error('WindowsKitVersion read from AppManifest but WindowsKit does not exist.', true, windowsKitPathExec);
      }
    } else {
      log.error("Couldn't find Windows Kit version in AppManifest.");
    }
  }

  log.debug('No information on WindowsKitVersion was provided, using default binaries. Checking if it exists....', {windowsKitVersion});
  const windowsKitPathExec = path.join(WIN_KIT_BIN_PATH, DEFAULT_WIN_KIT_VERSION, arch);
  if(await fs.pathExists(windowsKitPathExec)) {
    const binaries = await getBinaries(windowsKitPathExec);
    log.debug(`Getting binary paths from default WindowsKit path.`, binaries);
    return binaries;
  } else {
    log.error('No information on WindowsKitVersion was provided and default WindowsKit path does not exist.', true, windowsKitPathExec);
  }
  log.error('Unable to locate MSIX Tooling. Giving up!', true);
}

/**
 * Generates a secure random password.
 * @returns {string} - Generated password.
 */
function generatePassword() {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const symbols = '!@#%^&*()-_=+[]{}<>?,.';
  const fullCharset = charset + symbols;
  const length = 16;
  let password = '';
  const bytes = crypto.randomBytes(length);

  for (let i = 0; i < length; i++) {
    password += fullCharset[bytes[i] % fullCharset.length];
  }

  return password;
}

export const makeProgramOptions = async (options: PackagingOptions, manifestVars?: ManifestVariables) =>{
  const { makeAppx, makePri, signTool, makeCert} = await locateMSIXTooling(options, manifestVars);
  const { outputDir, layoutDir } = await ensureFolders(options);
  const { manifestAppName, manifestPackageArch, manifestIsSparsePackage, manifestPublisher } = manifestVars || {};
  const appName = manifestAppName || removeFileExtension(options.manifestVariables?.appExecutable) || 'app';
  const packageArch = manifestPackageArch || options.manifestVariables?.targetArch;
  const isSparsePackage = manifestIsSparsePackage || false;
  const msixPackageName = options.packageName || (packageArch ? `${appName}_${packageArch}.msix` : `${appName}.msix`);
  const msix = path.join(outputDir, msixPackageName);
  const appManifestLayout = path.join(layoutDir, `AppxManifest.xml`);
  const assetsLayout = path.join(layoutDir, `assets`);
  const appLayout = path.join(layoutDir, `app`);
  const priConfig = path.join(layoutDir, 'priconfig.xml');
  const priFile =  path.join(layoutDir, 'resources.pri');
  const createPri = options.createPri !== undefined ? options.createPri : true;
  const publisher = options.manifestVariables?.publisher || manifestPublisher || '';
  const sign = options.sign !== undefined ? options.sign : true;
  let windowsSignOptions: WindowsSignOptions
  let cert_pfx = windowsSignOptions?.certificateFile || '';
  let cert_cer = '';
  let cert_pass = '';

  const createDevCert = sign && !options.windowsSignOptions?.certificateFile && !process.env.WINDOWS_CERTIFICATE_FILE;
  if(sign) {
    windowsSignOptions = options.windowsSignOptions || {files: [msix], certificateFile: '', certificatePassword: '', hashes: ["sha256"] as any };
    cert_pass = windowsSignOptions?.certificatePassword || process.env.WINDOWS_CERTIFICATE_PASSWORD || generatePassword();
    if (!windowsSignOptions.hashes || windowsSignOptions.hashes.length === 0) {
      windowsSignOptions.hashes = ['sha256'] as any;
    }
    if(createDevCert) {
      cert_pfx = path.join(outputDir, 'dev_cert.pfx');
      cert_cer = path.join(outputDir, 'dev_cert.cer');
      windowsSignOptions[`certificateFile`] = cert_pfx;
      windowsSignOptions[`certificatePassword`] = cert_pass;
    }
    if(options.logLevel === 'debug') {
      windowsSignOptions[`debug`] = true;
    }

    const hasAppDirectorySet = 'appDirectory' in windowsSignOptions && windowsSignOptions.appDirectory;
    const hasFilesSet = 'files' in windowsSignOptions && windowsSignOptions.files && windowsSignOptions.files.length > 0;
    if(!hasAppDirectorySet && !hasFilesSet) {
      windowsSignOptions[`files`] = [msix];
    }
  }

  const appManifestIn = await manifest(options);

  const program: ProgramOptions = {
    makeMsix: makeAppx,
    makePri,
    makeCert,
    signTool,
    outputDir,
    layoutDir,
    msix,
    appDir: options.appDir,
    appLayout,
    appManifestIn,
    appManifestLayout,
    assetsIn: options.packageAssets || path.join(__dirname, '..', 'static', 'assets'),
    assetsLayout,
    cert_pfx,
    cert_cer,
    cert_pass: cert_pass || '',
    priConfig,
    priFile,
    createPri,
    isSparsePackage,
    sign,
    windowsSignOptions,
    createDevCert,
    publisher,
  }

  log.debug('Program options', program);
  return program;
}

export const createLayout = async (program: ProgramOptions) => {
  await fs.writeFile(program.appManifestLayout, program.appManifestIn);
  await fs.copy(program.assetsIn, program.assetsLayout);
  if(!program.isSparsePackage) {
    await fs.copy(program.appDir, program.appLayout);
  }
}
