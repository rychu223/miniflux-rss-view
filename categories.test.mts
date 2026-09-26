import { test } from "node:test";
import * as assert from "node:assert/strict";
import {
  ALL_CATEGORY_OPTION_LABEL,
  filterDropdownCategories,
  MINIFLUX_ALL_CATEGORY_TITLE,
} from "./categories.ts";

// Regression guards for the category dropdown dedupe (v1.1.5).
//
// CEO report: the dropdown showed "All categories" (first option, value "" =
// no filter) AND the real category "All" (Miniflux's built-in category),
// which looked like a duplicate. Requirement: keep ONE "All" option (the
// first one, no filter), and hide the real built-in "All" category.
//
// NOTE: imported like ./categories.ts (explicit extension) because Node's
// `--test` type stripping does not resolve extensionless TS specifiers — see
// the note in styles-mobile.test.ts about loadGate.test.ts.

test("leading option label is exactly 'All'", () => {
  assert.equal(ALL_CATEGORY_OPTION_LABEL, "All");
});

test("built-in 'All' category title is exactly 'All'", () => {
  assert.equal(MINIFLUX_ALL_CATEGORY_TITLE, "All");
});

test("filter keeps every category when none is titled 'All'", () => {
  const categories = [
    { id: 1, title: "Learning" },
    { id: 10, title: "Money" },
    { id: 11, title: "Tech" },
  ];
  assert.deepEqual(filterDropdownCategories(categories), categories);
});

test("filter drops the built-in 'All' category and keeps the rest in order", () => {
  const categories = [
    { id: 2, title: "All" },
    { id: 10, title: "Money" },
    { id: 11, title: "Tech" },
  ];
  assert.deepEqual(filterDropdownCategories(categories), [
    { id: 10, title: "Money" },
    { id: 11, title: "Tech" },
  ]);
});

test("filter drops 'All' wherever it appears, not just first", () => {
  const categories = [
    { id: 10, title: "Money" },
    { id: 2, title: "All" },
    { id: 11, title: "Tech" },
  ];
  assert.deepEqual(filterDropdownCategories(categories), [
    { id: 10, title: "Money" },
    { id: 11, title: "Tech" },
  ]);
});

test("filter trims surrounding whitespace before matching 'All'", () => {
  const categories = [
    { id: 2, title: " All " },
    { id: 10, title: "Money" },
  ];
  assert.deepEqual(filterDropdownCategories(categories), [{ id: 10, title: "Money" }]);
});

test("filter is case-sensitive: a user category 'all' is preserved", () => {
  const categories = [
    { id: 2, title: "All" },
    { id: 99, title: "all" },
  ];
  assert.deepEqual(filterDropdownCategories(categories), [{ id: 99, title: "all" }]);
});

test("filter handles an empty category list", () => {
  assert.deepEqual(filterDropdownCategories([]), []);
});