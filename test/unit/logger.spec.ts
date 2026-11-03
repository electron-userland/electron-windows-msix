import { expect, describe, it, vi, beforeEach, afterEach } from 'vitest';

import { log } from '../../src/logger';
import { setLogLevel } from '../../src/utils';

describe('logger', () => {
  let consoleLog: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLog.mockRestore();
    setLogLevel({} as any);
  });

  describe('with the default logLevel', () => {
    beforeEach(() => {
      setLogLevel({} as any);
    });

    it('should not print regular warnings', () => {
      log.warn('regular warning');
      expect(consoleLog).not.toHaveBeenCalled();
    });

    it('should print warnAlways warnings', () => {
      log.warnAlways('important warning');
      expect(consoleLog).toHaveBeenCalledTimes(1);
      expect(consoleLog.mock.calls[0][0]).toContain('warn: important warning');
    });
  });

  describe("with logLevel 'warn'", () => {
    beforeEach(() => {
      setLogLevel({ logLevel: 'warn' } as any);
    });

    it('should print regular warnings', () => {
      log.warn('regular warning');
      expect(consoleLog).toHaveBeenCalledTimes(1);
      expect(consoleLog.mock.calls[0][0]).toContain('warn: regular warning');
    });

    it('should print warnAlways warnings', () => {
      log.warnAlways('important warning');
      expect(consoleLog).toHaveBeenCalledTimes(1);
      expect(consoleLog.mock.calls[0][0]).toContain('warn: important warning');
    });
  });
});
