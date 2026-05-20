import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

test("home show cards link to public show detail pages", () => {
  const source = readFileSync("src/app/(site)/page.tsx", "utf8");

  assert.match(source, /href=\{`\/shows\/\$\{item\.id\}`\}/);
  assert.match(source, /className=\{cn\(styles\.heroPoster, "group relative block h-\[280px\]/);
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
