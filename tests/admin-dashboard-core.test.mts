import assert from "node:assert/strict";
import test from "node:test";
import { buildDashboardStats } from "../src/components/admin/dashboard-core.ts";

test("builds admin dashboard stats from image and show rows", () => {
  const stats = buildDashboardStats(
    [
      { id: "image-1", isFeatured: true },
      { id: "image-2", isFeatured: false },
      { id: "image-3", isFeatured: true },
    ],
    [
      { id: "show-1", isFeatured: false },
      { id: "show-2", isFeatured: true },
    ],
  );

  assert.deepEqual(stats, {
    imagesCount: 3,
    showsCount: 2,
    featuredImagesCount: 2,
    featuredShowsCount: 1,
  });
});
