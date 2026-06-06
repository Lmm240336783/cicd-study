import { describe, expect, it } from 'vitest';

describe('React shell', () => {
  it('uses the React entry file expected by Vite', async () => {
    const html = await import('node:fs/promises').then((fs) => fs.readFile('index.html', 'utf-8'));

    expect(html).toContain('/src/main.tsx');
  });
});
