# MSIX packager for Electron Apps
![electron_msix](https://github.com/electron-userland/electron-windows-msix/assets/5191943/4321b39e-f4d8-4d2f-b6cb-78f7c27950ff)


Electron-Windows-MSIX is a module that lets you create an MSIX installer from a packaged Electron App.


### Prerequisites
 * Windows 10 or 11
 * An understanding of MSIX packaging and AppxManifest, read more at https://learn.microsoft.com/en-us/windows/msix/package/manual-packaging-root
 * Depending on the backend you choose (see [Backends](#backends)):
   * `sdk` (default): The Windows 10/11 SDK you want to target https://developer.microsoft.com/en-us/windows/downloads/windows-10-sdk and PowerShell 7 (for dev cert creation)
   * `winapp`: Microsoft's [winapp CLI](https://github.com/microsoft/winappCli) — no locally installed Windows SDK or PowerShell 7 required

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
  compress           - Indicates whether to compress package files. It is enabled by default.
  backend            - Optional tool backend: 'sdk' (default) uses a locally installed Windows Kit, 'winapp' uses Microsoft's winapp CLI. See the Backends section below.
  winAppPath         - Optional full path to the winapp CLI executable. Only used when backend is 'winapp'.
  makeAppxParams     - Optional array of extra command line arguments appended to the `makeappx pack` invocation. E.g. ['/kf', 'key.txt'].
  sign               - Optional parameter that indicates whether the MSIX should be signed. True by default.
  windowsSignOptions - Optional parameter for `@electron/windows-sign`, missing will be filled in. See https://github.com/electron/windows-sign for details
  logLevel           - Optional log level. By default the module will be silent. The 'warn' level will give heads up on irregularities.
                      The 'debug' level will give extensive output to identify problems with the module.
```

```
MANIFEST GENERATION VARIABLES

packageIdentity           - The identity of the MSIX package.
publisher                 - The publisher of the MSIX package. This will also  be used to create a dev certificate if one is
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

await packageMSIX({
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
```

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

## Backends

The module can drive the MSIX tooling through two backends. The packaging behavior (layout, manifest generation,
`makepri`/`makeappx` arguments, output naming) is identical for both — only how the SDK build tools are acquired
and invoked differs. Signing always goes through [`@electron/windows-sign`](https://github.com/electron/windows-sign)
regardless of the backend.

| | `sdk` (default) | `winapp` |
|---|---|---|
| SDK build tools | Locally installed Windows 10/11 SDK | Downloaded on demand from NuGet by the winapp CLI (cached in `~/.winapp`) |
| Dev cert creation | PowerShell 7 (`pwsh.exe`) | `winapp cert generate` |
| Extra requirements | Windows SDK + PowerShell 7 | The winapp CLI (see below) |

To use the `winapp` backend, install Microsoft's [winapp CLI](https://github.com/microsoft/winappCli) either as an
npm package (`npm install --save-dev @microsoft/winappcli`) or system-wide (`winget install Microsoft.WinAppCli`),
and pass `backend: 'winapp'`:

```ts
import { packageMSIX } from "electron-windows-msix";

await packageMSIX({
  backend: 'winapp',
  appDir: 'C:\\temp\\myapp',
  appManifest: 'C:\\temp\\AppxManifest.xml',
  outputDir: 'C:\\temp\\out',
});
```

Notes:
* The winapp CLI is resolved from `winAppPath` if provided, then from the `@microsoft/winappcli` npm package, then from the `PATH`.
* `@microsoft/winappcli` is deliberately an optional peer dependency rather than a regular one: the package is
  Windows-only (`os: win32`), so a regular dependency would break installs on macOS/Linux build machines, and it
  weighs ~80 MB that `sdk`-backend users don't need. Install it only if you use the `winapp` backend.
* The first packaging run downloads the Windows SDK build tools from NuGet, so it needs network access and takes a bit longer. On CI, cache `~/.winapp` to avoid repeated downloads.
* `windowsKitVersion` and `windowsKitPath` are ignored by the `winapp` backend.
* The winapp CLI is currently in public preview, so the `winapp` backend should be considered experimental.

## Local Development

* Running the local E2E tests requires:
  * [PowerShell 7](https://learn.microsoft.com/en-us/powershell/?view=powershell-7.5)
  * [Windows 11 SDK 10.0.26100.0](https://developer.microsoft.com/en-us/windows/downloads/windows-sdk/)

----
#### [MIT License (MIT)](LICENSE) | Copyright (c) Jan Hannemann.
----
