import { describe, expect, it } from 'vitest';
import { HOME_ROUTE, VOICE_DEBUG_ROUTE } from '../src/appRoutes';

describe('appRoutes', () => {
  it('exports the dedicated voice debug route', () => {
    expect(HOME_ROUTE).toBe('/');
    expect(VOICE_DEBUG_ROUTE).toBe('/voice-debug');
  });
});
