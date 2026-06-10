import { expect, describe, it } from 'vitest';
import { ensureWindowsVersion, WindowsOSVersion } from '../../src/win-version';

describe('win-version', () => {
  describe('WindowsOSVersion', () => {
    it('should parse version string correctly', () => {
      const version = new WindowsOSVersion('10.0.17763.0');
      expect(version.major).toBe(10);
      expect(version.minor).toBe(0);
      expect(version.patch).toBe(17763);
      expect(version.build).toBe(0);
    });

    it('should throw an error if the version string is invalid', () => {
      expect(() => new WindowsOSVersion('10.0.17763')).toThrow();
    });

    it('should throw an error if the version string is invalid', () => {
      expect(() => new WindowsOSVersion('10.0.17763.0.1')).toThrow();
    });

    it('should detect equal versions correctly', () => {
      const version1 = new WindowsOSVersion('10.0.17763.0');
      const version2 = new WindowsOSVersion('10.0.17763.0');
      expect(version1.equals(version2)).toBe(0);
    });

    it('should detect older versions correctly', () => {
      const version1 = new WindowsOSVersion('10.0.17763.0');
      const version2 = new WindowsOSVersion('10.0.17763.1');
      expect(version1.equals(version2)).toBe(-1);
    });

    it('should detect newer versions correctly', () => {
      const version1 = new WindowsOSVersion('10.0.17763.1');
      const version2 = new WindowsOSVersion('10.0.17763.0');
      expect(version1.equals(version2)).toBe(1);
    });

    it('should detect equal versions correctly', () => {
      expect(WindowsOSVersion.IsSame('10.0.17763.0', '10.0.17763.0')).toBe(true);
    });

    it('should detect different major versions correctly', () => {
      expect(WindowsOSVersion.IsSame('10.0.17763.0', '11.0.17763.0')).toBe(false);
      expect(WindowsOSVersion.IsSame('11.0.17763.0', '10.0.17763.0')).toBe(false);
    });

    it('should detect different minor versions correctly', () => {
      expect(WindowsOSVersion.IsSame('10.0.17763.0', '10.1.17763.0')).toBe(false);
      expect(WindowsOSVersion.IsSame('10.1.17763.0', '10.0.17763.0')).toBe(false);
    });

    it('should detect different patch versions correctly', () => {
      expect(WindowsOSVersion.IsSame('10.0.17763.0', '10.0.17764.0')).toBe(false);
      expect(WindowsOSVersion.IsSame('10.0.17764.0', '10.0.17763.0')).toBe(false);
    });

    it('should detect different build versions correctly', () => {
      expect(WindowsOSVersion.IsSame('10.0.17763.0', '10.0.17763.1')).toBe(false);
      expect(WindowsOSVersion.IsSame('10.0.17763.1', '10.0.17763.0')).toBe(false);
    });

    it('should detect older versions correctly', () => {
      expect(WindowsOSVersion.IsOlder('10.0.17763.0', '10.0.17763.1')).toBe(true);
    });

    it('should detect none older versions correctly', () => {
      expect(WindowsOSVersion.IsOlder('10.0.17763.1', '10.0.17763.0')).toBe(false);
      expect(WindowsOSVersion.IsOlder('10.0.17763.0', '10.0.17763.0')).toBe(false);
    });

    it('should detect newer versions correctly', () => {
      expect(WindowsOSVersion.IsNewer('10.0.17763.1', '10.0.17763.0')).toBe(true);
    });

    it('should detect none newer versions correctly', () => {
      expect(WindowsOSVersion.IsNewer('10.0.17763.0', '10.0.17763.1')).toBe(false);
      expect(WindowsOSVersion.IsNewer('10.0.17763.0', '10.0.17763.0')).toBe(false);
    });

    it('should serialize version correctly', () => {
      const version = new WindowsOSVersion('10.0.17763.0');
      expect(version.toString()).toBe('10.0.17763.0');
    });
  });

  describe('ensureWindowsVersion', () => {
    it('should throw an error if the version string is invalid', () => {
      expect(() => ensureWindowsVersion('not a version')).toThrow();
    });

    it('should not change a valid version string', () => {
      expect(ensureWindowsVersion('1.2.3.0')).toBe('1.2.3.0');
    });

    it('should add a patch version of 0 if the version string is a 3-part version', () => {
      expect(ensureWindowsVersion('1.2.3')).toBe('1.2.3.0');
    });

    it('should normalize prerelease versions correctly', () => {
      expect(ensureWindowsVersion('1.2.3-alpha')).toBe('1.2.3.0');
      expect(ensureWindowsVersion('1.2.3-alpha+build.4')).toBe('1.2.3.0');
      expect(ensureWindowsVersion('1.2.3-0.3.7')).toBe('1.2.3.0');
      expect(ensureWindowsVersion('1.2.3-x.7.z.92')).toBe('1.2.3.0');
      expect(ensureWindowsVersion('1.2.3-x-y-z.--')).toBe('1.2.3.0');
    });

    it('should normalize versions with build metadata correctly', () => {
      expect(ensureWindowsVersion('1.2.3-alpha+001')).toBe('1.2.3.0');
      expect(ensureWindowsVersion('1.2.3+20130313144700')).toBe('1.2.3.0');
      expect(ensureWindowsVersion('1.2.3-beta+exp.sha.5114f8')).toBe('1.2.3.0');
      expect(ensureWindowsVersion('1.2.3+21AF26D3----117B344092BD')).toBe('1.2.3.0');
    });
  });
});
