import { test } from "node:test";
import * as assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

// Static regression guard for the <600px mobile horizontal-overflow fix (v1.1.3).
//
// CEO report: cards were wider than the phone viewport (required horizontal
// scrolling to read one card). The fix constrains the card grid, card internals,
// meta text, title button, full-width inputs and article content so nothing can
// grow past the viewport. These declarations MUST live inside the mobile media
// block so the desktop layout is untouched.
//
// NOTE: only node builtins are imported on purpose — extensionless imports break
// under `node --test` type stripping (see loadGate.test.ts), so this file keeps
// specifiers explicit and is runnable with plain `node --test styles-mobile.test.ts`.

interface RequiredDeclaration {
  selector: string;
  property: string;
  value: string;
}

const REQUIRED: RequiredDeclaration[] = [
  // Grid root cause: a grid track defaults to min-width:auto, so any unbreakable
  // card content widens the whole list. minmax(0,1fr) lets tracks shrink to the viewport.
  { selector: ".miniflux-card-list", property: "grid-template-columns", value: "minmax(0, 1fr)" },

  // Card itself: fit the viewport, never exceed it, and let long tokens wrap.
  { selector: ".miniflux-card", property: "max-width", value: "100%" },
  { selector: ".miniflux-card", property: "min-width", value: "0" },
  { selector: ".miniflux-card", property: "box-sizing", value: "border-box" },
  { selector: ".miniflux-card", property: "overflow-wrap", value: "anywhere" },

  // Header/main are flex children too; give them the same constraints.
  { selector: ".miniflux-card-header", property: "max-width", value: "100%" },
  { selector: ".miniflux-card-main", property: "max-width", value: "100%" },

  // Meta row: wrap and break inside every token; flex items must be allowed to shrink.
  { selector: ".miniflux-card-meta", property: "word-break", value: "break-word" },
  { selector: ".miniflux-card-meta", property: "overflow-wrap", value: "anywhere" },
  { selector: ".miniflux-card-meta > span, .miniflux-card-meta .miniflux-pill", property: "overflow-wrap", value: "anywhere" },
  { selector: ".miniflux-card-meta > span, .miniflux-card-meta .miniflux-pill", property: "white-space", value: "normal" },

  // Title button: must wrap, never stay on one line / push the card wider.
  { selector: ".miniflux-card-title", property: "white-space", value: "normal" },
  { selector: ".miniflux-card-title", property: "word-break", value: "break-word" },

  // Root view: no horizontal overflow; safety net after the root causes are fixed.
  { selector: ".miniflux-view", property: "overflow-x", value: "hidden" },

  // Full-width mobile controls: border-box so width:100% + padding does not overflow.
  { selector: ".miniflux-search-input, .miniflux-load-more-button", property: "box-sizing", value: "border-box" },

  // Article view + rendered markdown: view/container constrained, code blocks wrap.
  { selector: ".miniflux-article-view", property: "box-sizing", value: "border-box" },
  { selector: ".miniflux-article-content", property: "overflow-wrap", value: "anywhere" },
  { selector: ".miniflux-article-content pre", property: "white-space", value: "pre-wrap" },
];

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Selector lists ("header,\n.main") wrap across lines, so tokenize the selector on
// whitespace and rejoin with \s+ (commas stay literal). A selector may also appear
// as the first entry of a multi-selector group, so allow an optional ", …" tail
// before the open brace. Property/value may appear anywhere inside the rule.
function declarationPresent(block: string, { selector, property, value }: RequiredDeclaration): boolean {
  const escapedSelector = selector
    .split(/\s+/)
    .map((token) => escapeRegExp(token))
    .join("\\s+");
  const pattern = new RegExp(
    `${escapedSelector}(?:\\s*,\\s*[^{}]*)?\\s*\\{[^}]*${escapeRegExp(property)}\\s*:\\s*${escapeRegExp(value)}(?:\\s*;|\\s*})`,
  );
  return pattern.test(block);
}

test("mobile (<600px) media block contains the anti-overflow declarations", async () => {
  const css = await readFile("styles.css", "utf8");

  const start = css.indexOf("@media (max-width: 600px)");
  assert.ok(start !== -1, "mobile media block must exist in styles.css");
  const mobileBlock = css.slice(start);

  const missing = REQUIRED.filter((decl) => !declarationPresent(mobileBlock, decl));
  assert.deepEqual(
    missing,
    [],
    `Missing inside the mobile media block:\n${missing
      .map(({ selector, property, value }) => `${selector} { ${property}: ${value}; }`)
      .join("\n")}`,
  );
});