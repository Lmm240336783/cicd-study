import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

test("home show cards link to public show detail pages", () => {
  const source = readFileSync("src/app/(site)/page.tsx", "utf8");

  assert.match(source, /buildShowPosterCard/);
  assert.match(source, /\/shows\/\$\{item\.id\}/);
  assert.match(source, /className=\{cn\(styles\.heroPoster, "group relative block h-\[280px\]/);
});

test("home image section mirrors the hot-show layout exactly", () => {
  const source = readFileSync("src/app/(site)/page.tsx", "utf8");

  assert.match(source, /featuredImages\.slice\(0, 5\)/);
  assert.match(source, /const imageHeroItems = featuredImages\.slice\(0, 5\);/);
  assert.match(source, /const imageOverlayHero = imageHeroItems\[0\];/);
  assert.match(source, /const desktopImageCards = imageHeroItems\.slice\(1\);/);
  assert.match(source, /layout="mirror"/);
  assert.match(source, /xl:grid-cols-\[minmax\(0,1fr\)_512px\]/);
  assert.match(source, /xl:pl-\[212px\]/);
  assert.match(source, /xl:left-4/);
  assert.match(source, /overlayPositionClassName = isMirrorLayout \? "xl:left-4" : "xl:right-4";/);
  assert.match(source, /xl:grid-cols-\[512px_minmax\(0,1fr\)\]/);
  assert.match(source, /xl:pr-\[212px\]/);
});

test("public shows list cards link to public show detail pages", () => {
  const source = readFileSync("src/app/(site)/shows/page.tsx", "utf8");

  assert.match(source, /href=\{`\/shows\/\$\{item\.id\}`\}/);
});

test("public show detail page uses carousel images and two tabs", () => {
  const detailPagePath = "src/app/(site)/shows/[id]/page.tsx";
  const detailHeroPath = "src/components/site/ShowDetailHero.tsx";

  assert.equal(existsSync(detailPagePath), true);
  assert.equal(existsSync(detailHeroPath), true);

  const source = readFileSync(detailHeroPath, "utf8");

  assert.match(source, /carouselImages/);
  assert.match(source, /概览/);
  assert.match(source, /演员/);
});
