import type { SignOptions } from "@electron/windows-sign";

/**
 * Modified SignOptions to make files and appDirectory optional. We can inject the MSIX package to the files array or the appDirectory if not provided.

 */
export type WindowsSignOptions = Omit<SignOptions, 'files' | 'appDirectory'> & {
  /**
   * Path to the application directory. We will scan this
   * directory for any `.dll`, `.exe`, `.msi`, or `.node` files and
   * codesign them with `signtool.exe`.
   */
  appDirectory?: string;
  /**
   * Array of paths to files to be codesigned with `signtool.exe`.
   */
  files?: Array<string>;
};

export interface ManifestGenerationVariables {
  /**
  * The identity of the MSIX package. This will be used to set the Identity attribute in the AppxManifest.xml.
  * If a manifest is provided then this will be ignored.
  */
  packageIdentity : string;
  /**
    * The publisher of the MSIX package. This will be used to create a default certificate if one is not provided.
    * As well as the publisher name in the AppxManifest.xml. If a manifest is provided then this will be ignored.
    */
  publisher : string;
  /**
    * The display name of the publisher of the MSIX package. This will be used to set the PublisherDisplayName attribute in the AppxManifest.xml.
    * If a manifest is provided then this will be ignored.
    */
  publisherDisplayName ? : string;
  /**
    * The version of the MSIX package. This will be used to set the Version attribute in the AppxManifest.xml.
    * If a manifest is provided then this will be ignored.
    */
  packageVersion : string;
  /**
    * The display name of the MSIX package. This will be used to set the DisplayName attribute in the AppxManifest.xml.
    * If a manifest is provided then this will be ignored.
    */
  packageDisplayName ? : string;
  /**
    * The description of the MSIX package. This will be used to set the Description attribute in the AppxManifest.xml.
    * If a manifest is provided then this will be ignored.
    */
  packageDescription ? : string;
  /**
    * The background color of the MSIX package. This will be used to set the BackgroundColor attribute in the VisualElements element in the AppxManifest.xml.
    * If a manifest is provided then this will be ignored.
    */
  packageBackgroundColor ? : string;
  /**
    * The executable of the MSIX package. This will be used to set the Executable attribute in the AppxManifest.xml.
    * If a manifest is provided then this will be ignored.
    */
  appExecutable : string;
  /**
    * The name of the MSIX package. This will be used to set the DisplayName attribute in the VisualElements element in the AppxManifest.xml.
    * If a manifest is provided then this will be ignored.
  */
  appDisplayName? : string;
  /**
    * The target architecture of the MSIX package. This will be used to set the ProcessorArchitecture attribute in the AppxManifest.xml.
    * If a manifest is provided then this will be ignored.
    */
  targetArch : 'x64' | 'arm64' | 'x86' | 'arm' | '*';
  /**
    * The minimum OS version the MSIX package requires. This will be used to set the MinVersion attribute in the TargetDeviceFamily element in the AppxManifest.xml.
    * If a manifest is provided then this will be ignored.
    */
  packageMinOSVersion ? : string;
  /**
    * The maximum OS version the MSIX package has been tested on. This will be used to set the MaxVersionTested attribute in the TargetDeviceFamily element in the AppxManifest.xml.
    * If a manifest is provided then this will be ignored.
    */
  packageMaxOSVersionTested ? : string;
  /**
   * When set, the generated manifest includes COM server registration and
   * `windows.toastNotificationActivation` so packaged desktop apps can handle
   * toast activations via the same CLSID.
   * Ignored when using a pre-built `appManifest` file.
   */
  comToastActivation ? : ComToastActivationOptions;
}

/** Options for COM server + toast notification activation in AppxManifest. */
export interface ComToastActivationOptions {
  /**
   * CLSID for the toast activator (same value as `ToastActivatorCLSID` and `com:Class Id`).
   * With or without braces in options; the manifest omits braces (MakeAppx requirement).
   */
  toastActivatorClsid: string;
  /** `Arguments` on `com:ExeServer`. Default `-ToastActivated`. */
  arguments ? : string;
  /**
   * Executable file name only (e.g. `MyApp.exe`). Defaults to `appExecutable` basename.
   * The manifest uses `app\\{executable}` to match the layout.
   */
  executable ? : string;
}

export interface PackagingOptions {
  /**
   * The manifest variables to generate the AppxManifest.xml for the package.
   * If a manifest is provided then this will be ignored.
   */
  manifestVariables ? : ManifestGenerationVariables;
  /**
   * The AppManifest.xml containing necessary declarations to build the MSIX
   */
  appManifest ? : string;
  /**
   * The folder containing the packaged Electron App. This parameter is required unless its building a Sparse MSIX.
   */
  appDir ? : string;
  /** Optional assets used in AppManifest.xml. E.g. icons and tile images. If not provided then the default assets will be used. */
  packageAssets ?: string;
  /** The output directory for the finished MSIX package. */
  outputDir: string;
  /** Optional name for the finished MSIX package file. If not provided a name will be derived from AppManifest.xml. */
  packageName ? : string;
  /** Optional version of the WindowsKit to use. If WindowsKitPath is provide then it will trump this.
   * If neither WindowsKitVersion nor WindowsKitPath is provided then the Windows Kit path will be derived from the
   * OS Version specified in AppManifest.xml.
   */
  windowsKitVersion ? : string;
  /**
   * An optional full path to the WindowsKit. This path will trump both WindowsKitVersion and AppxManifest.
   */
  windowsKitPath ? : string;
  /** Indicates whether to create Pri resource files. It will be enabled by default. */
  createPri ? : boolean;
  /** Indicates whether to compress package files. It will be enabled by default. */
  compress ? : boolean;
  /**
   * Indicates whether to sign the MSIX package. It will be enabled by default. If cert or signParams are not provided then the package will be signed with a dev cert.
   * If sign is false then the package will not be signed.
   */
  sign ? : boolean;
  /**
   * Optional options for @electron/windows-sign. If present it will supersede signParams parameter.
   */
  windowsSignOptions ? : WindowsSignOptions;
  /**
   * Controls the level of logging
   */
  logLevel ? : 'warn' | 'debug';
}

export interface ProgramOptions {
  makeMsix: string;
  makePri: string;
  signTool: string;
  makeCert: string;
  outputDir: string;
  layoutDir: string;
  msix: string;
  appDir: string;
  appLayout: string;
  appManifestIn: string;
  appManifestLayout: string;
  assetsIn: string;
  assetsLayout: string;
  cert_pfx: string;
  cert_cer: string;
  cert_pass: string;
  createPri: boolean;
  priConfig: string;
  priFile: string;
  isSparsePackage: boolean;
  compress: boolean;
  sign: boolean;
  windowsSignOptions: WindowsSignOptions;
  createDevCert: boolean;
  publisher: string;
}


/**
 * The variables read from the provided AppxManifest.xml.
 */
export type ManifestVariables = {
  manifestOsMinVersion?: string,
  manifestAppName: string,
  manifestPackageArch: string,
  manifestIsSparsePackage: boolean,
  manifestPublisher: string
}

export interface Artifacts {
  msixPackage: string;
  certificate: string;
}
