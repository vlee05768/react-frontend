import { afterEach, describe, expect, it, vi } from 'vitest';

import { logger } from './logger';

describe('logger', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('logs only the operation code for warnings and errors', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    logger.warn('form.config.missing');
    logger.error('api.request.failed');

    expect(warn).toHaveBeenCalledWith('form.config.missing');
    expect(error).toHaveBeenCalledWith('api.request.failed');
    expect(warn.mock.calls[0]).toHaveLength(1);
    expect(error.mock.calls[0]).toHaveLength(1);
  });

  it('emits debug output only through the development logger seam', () => {
    const debug = vi.spyOn(console, 'debug').mockImplementation(() => undefined);

    logger.debug('keyboard.global-search.open');

    expect(debug).toHaveBeenCalledWith('keyboard.global-search.open');
  });
});
