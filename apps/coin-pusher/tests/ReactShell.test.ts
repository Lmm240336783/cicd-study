import { describe, expect, it } from 'vitest';

describe('React shell', () => {
  it('uses the React entry file expected by Vite', async () => {
    const html = await import('node:fs/promises').then((fs) => fs.readFile('index.html', 'utf-8'));

    expect(html).toContain('/src/main.tsx');
  });

  it('registers dice, image, slot, and voice tools as standalone routes', async () => {
    const appSource = await import('node:fs/promises').then((fs) => fs.readFile('src/App.tsx', 'utf-8'));
    const diceRouteSource = await import('node:fs/promises').then((fs) => fs.readFile('src/dice/DiceRoutePage.tsx', 'utf-8'));
    const imageRouteSource = await import('node:fs/promises').then((fs) => fs.readFile('src/image/ImageRoutePage.tsx', 'utf-8'));
    const slotRouteSource = await import('node:fs/promises').then((fs) => fs.readFile('src/slot/SlotRoutePage.tsx', 'utf-8'));
    const voiceRouteSource = await import('node:fs/promises').then((fs) => fs.readFile('src/voice/VoiceDebugRoutePage.tsx', 'utf-8'));

    expect(appSource).toContain('onOpenDice={() => navigate(DICE_ROUTE)}');
    expect(appSource).toContain('onOpenImageGenerator={() => navigate(IMAGE_GENERATOR_ROUTE)}');
    expect(appSource).toContain('onOpenSlot={() => navigate(SLOT_ROUTE)}');
    expect(appSource).toContain('<Route path={DICE_ROUTE} element={<DiceRoutePage />} />');
    expect(appSource).toContain('<Route path={IMAGE_GENERATOR_ROUTE} element={<ImageRoutePage />} />');
    expect(appSource).toContain('<Route path={SLOT_ROUTE} element={<SlotRoutePage />} />');
    expect(appSource).toContain('<Route path={VOICE_DEBUG_ROUTE} element={<VoiceDebugRoutePage />} />');
    expect(diceRouteSource).toContain('<DiceGame onBack={() => navigate(HOME_ROUTE)} />');
    expect(imageRouteSource).toContain('<ImageGeneratorPanel />');
    expect(slotRouteSource).toContain('<SlotGame onBack={() => navigate(HOME_ROUTE)} />');
    expect(voiceRouteSource).toContain('<VoiceDebugPage onBack={() => navigate(HOME_ROUTE)} />');
  });
});
