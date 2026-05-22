# Home Featured Sections Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the homepage featured images and featured singers follow the same visual language as the hot shows section, with the images section mirrored and the singers section rendered as poster-only cards.

**Architecture:** Keep the homepage as a Server Component in `src/app/(site)/page.tsx`, but collapse the three recommendation areas into one family of shared render helpers. Reuse the existing show promo and poster styles where possible, then add only the minimum new SCSS needed for the mirrored image layout and singer poster grid.

**Tech Stack:** Next.js App Router server page, React 19, Tailwind utility classes, SCSS modules, Node test runner with source assertions

---

### Task 1: Lock the homepage structure with failing tests

**Files:**
- Modify: `tests/public-shows-page.test.mts`
- Modify: `tests/public-music-page.test.mts`
- Verify: `src/app/(site)/page.tsx`

- [ ] **Step 1: Write the failing homepage image section test**

```ts
test("home image section mirrors the hot-show layout", () => {
  const source = readFileSync("src/app/(site)/page.tsx", "utf8");

  assert.match(source, /featuredImages\\.slice\\(0, 5\\)/);
  assert.match(source, /推荐图片/);
  assert.match(source, /styles\\.heroSurface/);
  assert.match(source, /图片主推荐卡/);
});
```

- [ ] **Step 2: Run the targeted test to verify it fails**

Run: `npx --yes tsx@3.14.0 --require ./tests/setup-web-api.cjs --test tests/public-shows-page.test.mts`
Expected: FAIL because the homepage still slices `featuredImages` to `4` and does not contain the mirrored image hero structure marker.

- [ ] **Step 3: Write the failing singer poster-grid test**

```ts
test("home singer section uses poster cards instead of the old boxed singer card shell", () => {
  const source = readFileSync("src/app/(site)/page.tsx", "utf8");

  assert.match(source, /推荐歌手/);
  assert.match(source, /歌手海报卡/);
  assert.doesNotMatch(source, /styles\\.musicSingerCard/);
});
```

- [ ] **Step 4: Run the targeted test to verify it fails**

Run: `npx --yes tsx@3.14.0 --require ./tests/setup-web-api.cjs --test tests/public-music-page.test.mts`
Expected: FAIL because the homepage still renders `styles.musicSingerCard` and does not contain the new singer poster marker.

### Task 2: Refactor the homepage sections to share the hot-show structure

**Files:**
- Modify: `src/app/(site)/page.tsx`
- Verify: `src/components/site/site-visuals.module.scss`

- [ ] **Step 1: Introduce shared poster and promo helpers**

```tsx
function FeaturedPosterCard({
  href,
  title,
  eyebrow,
  description,
  imageStyle,
  className,
}: {
  href: string
  title: string
  eyebrow: string
  description: string
  imageStyle: React.CSSProperties
  className?: string
}) {
  return (
    <Link
      href={href}
      className={cn(
        styles.heroPoster,
        "group relative block h-[280px] rounded-[18px] bg-[#f6edd1] bg-cover bg-center bg-no-repeat sm:h-[320px] xl:h-full",
        className,
      )}
      style={imageStyle}
    >
      <div className="absolute inset-0 flex items-end p-3 opacity-0 transition duration-300 group-hover:opacity-100">
        <div className="w-full rounded-[14px] border border-white/25 bg-black/42 p-3 text-white backdrop-blur-sm">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/75">{eyebrow}</p>
          <h3 className="mt-1 text-base font-black leading-tight">{title}</h3>
          <p className="mt-2 line-clamp-2 text-xs leading-5 text-white/88">{description}</p>
        </div>
      </div>
    </Link>
  )
}
```

- [ ] **Step 2: Mirror the featured images section around a right-side promo card**

```tsx
const imageHeroItems = featuredImages.slice(0, 5)
const imageOverlay = imageHeroItems[0]
const desktopImageCards = imageHeroItems.slice(1)

<section className={cn(styles.heroSurface, styles.imageHeroSurface, "mt-6 overflow-hidden rounded-[30px] p-3 md:p-4")}>
  <div className="grid gap-3 xl:min-h-[360px] xl:grid-cols-[minmax(0,1fr)_512px]">
    <div className="hidden gap-3 xl:grid xl:min-h-[360px] xl:grid-cols-4">
      {desktopImageCards.map((item, index) => (
        <FeaturedPosterCard key={item.id} />
      ))}
    </div>
    <div className="relative xl:min-h-[360px]">
      <article className={cn(styles.promoCard, styles.imagePromoCard, "图片主推荐卡 ...")}>{/* text + CTA */}</article>
      {imageOverlay ? <div className="hidden xl:absolute xl:inset-y-4 xl:left-4 xl:block xl:w-[176px]">{/* overlay poster */}</div> : null}
    </div>
  </div>
</section>
```

- [ ] **Step 3: Rebuild the featured singers section as poster-only cards**

```tsx
<section className={cn(styles.heroSurface, styles.singerHeroSurface, "mt-6 overflow-hidden rounded-[30px] p-3 md:p-4")}>
  <div className="mb-3 flex items-center justify-between gap-3 px-1">
    <div>
      <h2 className="text-lg font-black text-slate-950">推荐歌手</h2>
      <p className="mt-1 text-xs text-slate-500">点击歌手，直接进入她或他的歌单详情页</p>
    </div>
    <Link href="/music" className={cn(styles.musicMoreButton, "...")}>进入音乐 →</Link>
  </div>
  <div className="grid gap-3 sm:grid-cols-2 xl:min-h-[320px] xl:grid-cols-4">
    {featuredSingers.map((item, index) => (
      <FeaturedPosterCard
        key={item.id}
        href={`/music/singers/${item.id}`}
        eyebrow={`推荐歌手 · ${index + 1}`}
        title={item.name}
        description="点进歌手详情看歌单"
        imageStyle={singerCoverStyle(item, index)}
      />
    ))}
  </div>
</section>
```

- [ ] **Step 4: Run the two targeted test files to verify the structure now passes**

Run: `npx --yes tsx@3.14.0 --require ./tests/setup-web-api.cjs --test tests/public-shows-page.test.mts tests/public-music-page.test.mts`
Expected: PASS for the new homepage structure assertions and the existing route assertions.

### Task 3: Consolidate the homepage styles around the show-card language

**Files:**
- Modify: `src/components/site/site-visuals.module.scss`
- Verify: `src/app/(site)/page.tsx`

- [ ] **Step 1: Add the mirrored promo-card variants for the image section**

```scss
.imageHeroSurface {
  background: linear-gradient(180deg, #fff8dc 0%, #fffdf7 100%);
}

.imagePromoCard {
  padding-left: 212px;
}
```

- [ ] **Step 2: Add singer surface variants and retire the old boxed singer card shell from homepage usage**

```scss
.singerHeroSurface {
  border: 2px solid #d8e2ff;
  background: linear-gradient(180deg, #f8fbff 0%, #fdfdff 100%);
}
```

- [ ] **Step 3: Keep responsive overrides aligned with the mirrored layout**

```scss
@media (max-width: 1279px) {
  .imagePromoCard {
    padding-left: 1.5rem;
  }
}
```

- [ ] **Step 4: Run typecheck after the page and style refactor**

Run: `npm run typecheck`
Expected: PASS with no TypeScript errors.

### Task 4: Full verification for the homepage refactor

**Files:**
- Verify: `tests/public-shows-page.test.mts`
- Verify: `tests/public-music-page.test.mts`
- Verify: `src/app/(site)/page.tsx`
- Verify: `src/components/site/site-visuals.module.scss`

- [ ] **Step 1: Run the full project test suite**

Run: `npm test`
Expected: PASS with all listed tests green.

- [ ] **Step 2: UTF-8 re-read the changed source files**

Run:

```powershell
Get-Content -LiteralPath 'E:\学习\cicd-study\src\app\(site)\page.tsx' -Encoding UTF8
Get-Content -LiteralPath 'E:\学习\cicd-study\src\components\site\site-visuals.module.scss' -Encoding UTF8
Get-Content -LiteralPath 'E:\学习\cicd-study\tests\public-shows-page.test.mts' -Encoding UTF8
Get-Content -LiteralPath 'E:\学习\cicd-study\tests\public-music-page.test.mts' -Encoding UTF8
```

Expected: readable Chinese text with no mojibake.

- [ ] **Step 3: Summarize results without running lint**

```text
Verified with npm test and npm run typecheck.
Skipped lint because the user did not ask for it and AGENTS.md does not require it for completion.
```
