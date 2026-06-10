export class WindowsOSVersion {
  public major: number;
  public minor: number;
  public patch: number;
  public build: number;

  constructor(version: string) {
    const array = version.split('.');
    if (array.length != 4) {
      throw new Error(`Invalid Windows version string. {${version}}`);
    }
    this.major = Number.parseInt(array[0], 10);
    this.minor = Number.parseInt(array[1], 10);
    this.patch = Number.parseInt(array[2], 10);
    this.build = Number.parseInt(array[3], 10);
  }

  public toString = (): string => `${this.major}.${this.minor}.${this.patch}.${this.build}`;

  public equals(other: WindowsOSVersion) {
    if (this.major < other.major) return -1;
    if (this.major > other.major) return 1;

    if (this.minor < other.minor) return -1;
    if (this.minor > other.minor) return 1;

    if (this.patch < other.patch) return -1;
    if (this.patch > other.patch) return 1;

    if (this.build < other.build) return -1;
    if (this.build > other.build) return 1;

    return 0;
  }

  public static IsOlder(v1: string, v2: string) {
    const wv1 = new WindowsOSVersion(v1);
    const wv2 = new WindowsOSVersion(v2);
    return wv1.equals(wv2) === -1;
  }

  public static IsNewer(v1: string, v2: string) {
    const wv1 = new WindowsOSVersion(v1);
    const wv2 = new WindowsOSVersion(v2);
    return wv1.equals(wv2) === 1;
  }

  public static IsSame(v1: string, v2: string) {
    const wv1 = new WindowsOSVersion(v1);
    const wv2 = new WindowsOSVersion(v2);
    return wv1.equals(wv2) === 0;
  }
}

/**
 * Checks if a version string is a semantic version.
 * @param version - The version string to check.
 * @returns True if the version string is a semantic version, false otherwise.
 */
export const isValidVersion = (version: string) => {
  const semVerRegex =
    /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;
  const windowsVerRegex = /^\d+\.\d+\.\d+\.\d+$/;
  return semVerRegex.test(version) || windowsVerRegex.test(version);
};

/**
 * Ensures a semantic version string is converted to a Windows version string if it contains a prerelease version.
 * @param semanticVersion - The semantic version string to normalize.
 * @returns The normalized version string.
 */
export const ensureWindowsVersion = (semanticVersion: string): string => {
  if (semanticVersion.match(/^\d+\.\d+\.\d+\.\d+$/)) {
    return semanticVersion;
  }

  if (semanticVersion.match(/^\d+\.\d+\.\d+$/)) {
    return `${semanticVersion}.0`;
  }

  if (!isValidVersion(semanticVersion)) {
    throw new Error(`Invalid semantic version string. {${semanticVersion}}`);
  }

  return semanticVersion.replace(/[-+].*/, '.0');
};
