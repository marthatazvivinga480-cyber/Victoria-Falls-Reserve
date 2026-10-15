import { afterEach, describe, it, expect, vi } from 'vitest';
import { api, ApiError } from './api';
afterEach(() => vi.unstubAllGlobals());
describe('API response handling', () => {
  it('shows a useful error for an empty proxy failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 500 })));
    await expect(api('/hotels')).rejects.toThrow('The booking server is unavailable');
  });
  it('preserves structured API errors', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: { message: 'Origin not allowed' } }), {
          status: 403,
        }),
      ),
    );
    await expect(api('/hotels')).rejects.toMatchObject({
      status: 403,
      message: 'Origin not allowed',
    });
  });
  it('accepts empty 204 responses', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 204 })));
    await expect(api('/me/favorites/example', { method: 'DELETE' })).resolves.toBeUndefined();
  });
  it('rejects malformed successful JSON as a gateway error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('not-json', { status: 200 })));
    await expect(api('/hotels')).rejects.toBeInstanceOf(ApiError);
  });
});
