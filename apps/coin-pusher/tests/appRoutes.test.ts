import { describe, expect, it } from 'vitest';
import { DICE_ROUTE, HOME_ROUTE, IMAGE_GENERATOR_ROUTE, SLOT_ROUTE, VOICE_DEBUG_ROUTE } from '../src/appRoutes';

describe('appRoutes', () => {
  it('exports dedicated routes for each standalone page', () => {
    expect(HOME_ROUTE).toBe('/');
    expect(DICE_ROUTE).toBe('/dice');
    expect(IMAGE_GENERATOR_ROUTE).toBe('/image');
    expect(SLOT_ROUTE).toBe('/slot');
    expect(VOICE_DEBUG_ROUTE).toBe('/voice-debug');
  });
});
