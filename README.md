# MSIX packager for Electron Apps
![electron_msix](https://github.com/electron-userland/electron-windows-msix/assets/5191943/4321b39e-f4d8-4d2f-b6cb-78f7c27950ff)


Electron-Windows-MSIX is a module that lets you create an MSIX installer from a packaged Electron App.


### Prerequisites
 * Windows 10 or 11
 * The Windows 10 SDK you wan to target https://developer.microsoft.com/en-us/windows/downloads/windows-10-sdk
 * PowerShell, which is only used when the module generates a development certificate. PowerShell 7 (`pwsh.exe`) is used when it is installed, otherwise the
   built-in Windows PowerShell (`powershell.exe`) is used, so no separate PowerShell install is required.
 * An understanding of MSIX packaging and AppxManifest, read more at https://learn.microsoft.com/en-us/windows/msix/package/manual-packaging-root

### Installation

```
npm install electron-windows-msix --save-dev
```

## Usage
```
  PACKAGING OPTIONS

  appDir             - The folder containing the packaged Electron App
  appManifest        - The AppManifest.xml containing necessary declarations to build the MSIX
  manifestVariables  - Optional manifest variables to generate a manifest if manifest file is not provided
  packageAssets      - Required assets declared in AppManifest.xml. E.g. icons and tile images
  outputDir          - The output directory for the finished MSIX package.
  packageName        - Optional name for the finished MSIX package. If not provided a name will be derived from AppManifest.xml.
  windowsKitVersion  - Optional version of the WindowsKit to use. If WindowsKitPath is provide then it will trump this. If neither WindowsKitVersion nor
                      WindowsKitPath is provided then the Windows Kit path will be derived from the S Version specified in AppManifest.xml.
  windowsKitPath     - An optional full path to the WindowsKit. This path will trump both WindowsKitVersion and AppxManifest.
  createPri          - Indicates whether to create Pri resource files. It is enabled by default.
  makeAppxParams     - Optional array of extra command line arguments appended to the `makeappx pack` invocation. E.g. ['/kf', 'key.txt'].
  sign               - Optional parameter that indicates whether the MSIX should be signed. True by default.
  createDevCert      - Optional parameter that controls creation of a self-signed dev certificate. When not set, a dev cert is created only if signing is
                      enabled and neither windowsSignOptions nor the WINDOWS_CERTIFICATE_FILE environment variable is provided. Set true to force creation
                      even when windowsSignOptions is provided, or false to never create one (e.g. when signing externally, such as Azure Trusted Signing).
  windowsSignOptions - Optional parameter for `@electron/windows-sign`, missing will be filled in. See https://github.com/electron/windows-sign for details
  logLevel           - Optional log level. By default the module will be silent. The 'warn' level will give heads up on irregularities.
                      The 'debug' level will give extensive output to identify problems with the module.
```

```
MANIFEST GENERATION VARIABLES

packageIdentity           - The identity of the MSIX package.
publisher                 - The publisher of the MSIX package. This will also be used as the subject of the dev certificate if one is created.
publisherDisplayName      - The display name of the publisher of the MSIX package.
packageVersion            - The version of the MSIX package. Semantic version can be used. However, pre-release version will be converted to valid Windows versions .
packageDisplayName        - The display name of the MSIX package. This will be used to set the DisplayName attribute in the AppxManifest.xml.
packageDescription        - The description of the MSIX package. This will be used to set the Description attribute in the AppxManifest.xml.
packageBackgroundColor    - The background color of the MSIX package. This will be used to set the BackgroundColor attribute in the VisualElements element in theAppxManifest.xml.
appExecutable             - The executable of the MSIX package. This will be used to set the Executable attribute in the AppxManifest.xml.
appDisplayName            - The name of the MSIX package. This will be used to set the DisplayName attribute in the VisualElements element in the AppxManifest.xml.
targetArch                - The target architecture of the MSIX package. This will be used to set the ProcessorArchitecture attribute in the AppxManifest.xml. 'x64' |'arm64' | 'x86' | 'arm' | '*';
packageMinOSVersion       - The minimum OS version the MSIX package requires. This will be used to set the MinVersion attribute in the TargetDeviceFamily element in theAppxManifest.xml.
packageMaxOSVersionTested - The maximum OS version the MSIX package has been tested on. This will be used to set the MaxVersionTested attribute in the TargetDeviceFamily element in the AppxManifest.xml.
comToastActivation        - Optional. Adds COM server (`windows.comServer`) and toast activation (`windows.toastNotificationActivation`) extensions so the packaged app can handle toast activations. Object with `toastActivatorClsid` (GUID, same for COM class and ToastActivatorCLSID). Optional: `arguments` (default -ToastActivated), `executable` (exe file name, default from appExecutable). Ignored when using `appManifest`.
```

### Minimal example that creates a manifest and a dev cert
```ts
import { packageMSIX } from "electron-windows-msix";

const { msixPackage, devCert } = await packageMSIX({
  appDir: 'C:\\temp\\myapp',
  outputDir: 'C:\\temp\\out',
  manifestVariables: {
    publisher: 'CN=Dev Publisher',
    packageIdentity: 'com.example.app',
    packageVersion: '1.42.0.0',
    appExecutable: 'hellomsix.exe',
    targetArch: 'x64',
  },
});
// devCert.pfxFile, devCert.cerFile, devCert.password, devCert.subject, devCert.reused
```

### The dev certificate

When signing is enabled and no certificate is configured (no `windowsSignOptions` and no
`WINDOWS_CERTIFICATE_FILE` environment variable), a self-signed development certificate is
created for the package publisher and used to sign the MSIX. The certificate is kept in the
`CurrentUser\My` certificate store and reused on subsequent builds for the same publisher.
Both the private certificate (`dev_cert.pfx`) and the public certificate (`dev_cert.cer`)
are exported to `outputDir`, and their paths — along with the PFX password, which is randomly
generated unless a certificate password was provided — are returned from `packageMSIX` in the
`devCert` field.

Windows only installs MSIX packages whose signing certificate it trusts. To install a
dev-signed package locally, trust the certificate once from an elevated prompt:

```
certutil -addstore TrustedPeople C:\temp\out\dev_cert.cer
```

Because the certificate is reused across builds, this is a one-time step per publisher.
Do not distribute the dev certificate — it is for local development only.

Use the `createDevCert` option to override the default behavior: `false` never creates a
dev cert (required for external signing such as Azure Trusted Signing via `signWithParams`),
and `true` creates one even when `windowsSignOptions` is provided, as long as it contains no
`certificateFile`.

### Toast / COM activation (generated manifest only)

Register the same CLSID for a COM out-of-process server and for toast notification activation (see [Microsoft: Toast activations from desktop apps](https://learn.microsoft.com/en-us/windows/apps/develop/notifications/app-notifications/toast-desktop-apps)). You can pass the GUID with or without `{}`; the generated manifest writes it **without** braces, as MakeAppx expects.

```ts
import { packageMSIX } from "electron-windows-msix";

await packageMSIX({
  appDir: 'C:\\temp\\myapp',
  outputDir: 'C:\\temp\\out',
  manifestVariables: {
    publisher: 'CN=Dev Publisher',
    packageIdentity: 'com.example.app',
    packageVersion: '1.0.0.0',
    appExecutable: 'myapp.exe',
    targetArch: 'x64',
    comToastActivation: {
      toastActivatorClsid: '{12345678-1234-4123-a123-123456789abc}',
    },
  },
});
```

### Minimal example that derives all possible data from the Manifest
```ts
import { packageMSIX } from "electron-windows-msix";

await packageMSIX({
  appDir: 'C:\\temp\\myapp',
  appManifest: 'C:\\temp\\AppxManifest.xml',
  packageAssets: 'C:\\temp\\assets',
  outputDir: 'C:\\temp\\out',
  windowsSignOptions: {
    certificateFile: 'C:\\temp\\app_cert.pfx',
    certificatePassword: 'hellomsix',
  }
});
```

### Example that controls all options with via manifest varaibles
```js
import { packageMSIX } from "electron-windows-msix";

await packageMSIX({
  appDir: 'C:\\temp\\myapp',
  packageAssets: 'C:\\temp\\assets',
  outputDir: 'C:\\temp\\out',
  manifestVariables: {
    appDisplayName: 'Hello MSIX',
    publisher: 'CN=Dev Publisher',
    publisherDisplayName: 'Dev Publisher',
    packageDisplayName: 'Hello MSIX',
    packageDescription: 'Just a test app',
    packageBackgroundColor: '#000000',
    packageIdentity: 'com.example.app',
    packageVersion: '1.42.0.0',
    appExecutable: 'hellomsix.exe',
    targetArch: 'x64',
    packageMinOSVersion: '10.0.19041.0',
    packageMaxOSVersionTested: '10.0.19041.0',
  },
  windowsSignOptions: {
    certificateFile: 'C:\\temp\\app_cert.pfx',
    certificatePassword: 'hellomsix',
  },
  windowsKitPath: 'C:\\Program Files (x86)\\Windows Kits\\10\\bin\\19041\\x64',
  createPri: true,
  packageName: 'MyApp.msix',
  logLevel: 'warn',
  sign: true
});
```

### Example that controls all options with an existing manifest
```ts
import { packageMSIX } from "electron-windows-msix";

await packageMSIX({
  appDir: 'C:\\temp\\myapp',
  appManifest: 'C:\\temp\\AppxManifest.xml',
  packageAssets: 'C:\\temp\\assets',
  outputDir: 'C:\\temp\\out',
  windowsKitPath: 'C:\\Program Files (x86)\\Windows Kits\\10\\bin\\10.0.17763.0\\x64',
  createPri: true,
  packageName: 'MyApp.msix',
  logLevel: 'warn',
  sign: true,
  windowsSignOptions: {
    certificateFile: 'C:\\temp\\app_cert.pfx',
    certificatePassword: 'hellomsix',
  }
});
```

## Local Development

* Running the local E2E tests requires:
  * [PowerShell 7.5 or later](https://learn.microsoft.com/en-us/powershell/?view=powershell-7.5) — unlike the module itself, the E2E certificate helper uses
    .NET 9 APIs, so Windows PowerShell cannot run it
  * [Windows 11 SDK 10.0.26100.0](https://developer.microsoft.com/en-us/windows/downloads/windows-sdk/)

----
#### [MIT License (MIT)](LICENSE) | Copyright (c) Jan Hannemann.
----
