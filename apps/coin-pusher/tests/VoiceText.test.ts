import { describe, expect, it } from 'vitest';
import { normalizeVoiceText } from '../src/voice/voiceApi';

describe('normalizeVoiceText', () => {
  it('trims whitespace and limits text to five characters', () => {
    expect(normalizeVoiceText('  来币来币来  ')).toBe('来币来币来');
  });

  it('keeps short text unchanged', () => {
    expect(normalizeVoiceText('好运')).toBe('好运');
  });
});
