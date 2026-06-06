import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

describe('Chinese-facing copy', () => {
  it('uses Chinese for the document title and core game UI labels', async () => {
    const html = await readFile('index.html', 'utf-8');
    const uiManager = await readFile('src/ui/UIManager.ts', 'utf-8');
    const gameApp = await readFile('src/GameApp.ts', 'utf-8');
    const copySource = `${html}\n${uiManager}\n${gameApp}`;

    expect(copySource).toContain('<title>霓虹推币机</title>');
    expect(copySource).toContain('霓虹推币机');
    expect(copySource).toContain('街机推币');
    expect(copySource).toContain('金币');
    expect(copySource).toContain('旋转');
    expect(copySource).toContain('狂热');
    expect(copySource).toContain('幸运补给 +25');
    expect(copySource).not.toMatch(/NEON COIN RUSH|ARCADE PUSHER|COINS|SPINS|FEVER RUSH|LUCKY SUPPLY/);
  });
});
