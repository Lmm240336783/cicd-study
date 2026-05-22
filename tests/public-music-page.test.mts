import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

test("site header exposes the music route", () => {
  const source = readFileSync("src/components/site/SiteHeader.tsx", "utf8");

  assert.match(source, /href: "\/music"/);
  assert.match(source, /musicNavActive/);
});

test("home page renders featured singers in the hot-show layout", () => {
  const source = readFileSync("src/app/(site)/page.tsx", "utf8");

  assert.match(source, /listFeaturedSingers/);
  assert.match(source, /listFeaturedSingers\(5\)/);
  assert.match(source, /\/music\/singers\/\$\{item\.id\}/);
  assert.match(source, /推荐歌手/);
  assert.match(source, /const singerHeroItems = featuredSingers\.slice\(0, 5\);/);
  assert.match(source, /const singerOverlayHero = singerHeroItems\[0\];/);
  assert.match(source, /const desktopSingerCards = singerHeroItems\.slice\(1\);/);
  assert.match(source, /xl:pr-\[212px\]/);
  assert.match(source, /overlayPositionClassName = isMirrorLayout \? "xl:left-4" : "xl:right-4";/);
});

test("music list page links songs and singers", () => {
  const source = readFileSync("src/app/(site)/music/page.tsx", "utf8");

  assert.match(source, /listPublicMusic/);
  assert.match(source, /listFeaturedSingers/);
  assert.match(source, /\/music\/\$\{item\.id\}/);
  assert.match(source, /\/music\/singers\/\$\{item\.id\}/);
  assert.match(source, /music-grid/);
});

test("music detail page resolves singer relations", () => {
  const detailPath = "src/app/(site)/music/[id]/page.tsx";
  const singerPath = "src/app/(site)/music/singers/[id]/page.tsx";

  assert.equal(existsSync(detailPath), true);
  assert.equal(existsSync(singerPath), true);

  const detailSource = readFileSync(detailPath, "utf8");
  const singerSource = readFileSync(singerPath, "utf8");

  assert.match(detailSource, /getPublicSingerById/);
  assert.match(detailSource, /listPublicMusicBySingerId/);
  assert.match(detailSource, /去看歌手详情/);
  assert.match(singerSource, /歌曲列表/);
  assert.match(singerSource, /listPublicMusicBySingerId/);
});
