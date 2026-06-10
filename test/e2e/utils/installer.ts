import { powershell } from '../../../src/powershell';

export const installMSIX = async (appx: string) =>
  await powershell(`Add-AppxPackage -Path "${appx}"`);

export const uninstallMSIX = async (packageName: string) => {
  await powershell(`Get-AppxPackage -Name "${packageName}" | Remove-AppxPackage`);
};

export const checkInstall = async (name: string) => {
  let install = await powershell(
    `$p = Get-AppxPackage -Name "${name}" -ErrorAction SilentlyContinue; $p.Name + "|" + $p.Version`,
  );

  install = install.replace(/(\r\n|\n|\r)/gm, '');
  const fields = install.split('|');
  return {
    name: fields[0],
    version: fields[1],
  };
};

export async function readAppxManifestFromMsix(msixPath: string): Promise<string> {
  const p = msixPath.replace(/'/g, "''");
  return (
    await powershell(
      `Add-Type -AssemblyName System.IO.Compression.FileSystem; $z = [System.IO.Compression.ZipFile]::OpenRead('${p}'); try { $e = $z.GetEntry('AppxManifest.xml'); $r = New-Object System.IO.StreamReader($e.Open()); $r.ReadToEnd() } finally { $z.Dispose() }`,
    )
  ).trim();
}
