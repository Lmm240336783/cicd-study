import assert from "node:assert/strict";
import test from "node:test";
import { findRouteByPath } from "../src/lib/admin/navigation.tsx";

test("matches the most specific admin route for nested paths", () => {
  assert.equal(findRouteByPath("/admin")?.key, "admin-dashboard");
  assert.equal(findRouteByPath("/admin/images")?.key, "admin-images");
  assert.equal(findRouteByPath("/admin/images/edit")?.key, "admin-images");
  assert.equal(findRouteByPath("/admin/shows")?.key, "admin-shows");
});
