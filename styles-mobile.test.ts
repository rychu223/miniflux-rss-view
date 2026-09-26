import { test } from "node:test";
import * as assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

// Static regression guards for the mobile media block.
//
// (1) v1.1.3 anti-horizontal-scroll fix — REQUIRED declarations. CEO report:
// cards were wider than the phone viewport (required horizontal scrolling to
// read one card). The fix constrains the card grid, card internals, meta text,
// title button, full-width inputs and article content so nothing can grow past
// the viewport. These declarations MUST live inside the mobile media block so
// the desktop layout is untouched.
//
// (2) v1.1.4 upstream-style restore — ABSENT declarations. CEO report: the
// v1.1.2 "card-ification" visual overhaul (control panel bg/radius/padding,
// card radius/shadow/padding, 16px gap, summary line-clamp, filled unread pill,
// enlarged title) must stay OUT of the mobile media block so mobile keeps the
// upstream v1.0.4 list look, while the v1.1.3 width fix remains.
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

interface AbsentDeclaration {
  selector: string;
  property: string;
  value: string;
}

// v1.1.2 card-ification outliers that must NOT come back into the mobile block
// (v1.1.4 upstream-style restore). Each entry is the exact declaration to reject.
const ABSENT: AbsentDeclaration[] = [
  // Control panel: background + border + radius + 12px padding overlay.
  { selector: ".miniflux-toolbar, .miniflux-controls", property: "background", value: "var(--background-secondary)" },
  { selector: ".miniflux-toolbar, .miniflux-controls", property: "border-radius", value: "12px" },
  { selector: ".miniflux-toolbar, .miniflux-controls", property: "padding", value: "12px" },

  // Card list: 16px gap override (base gap var(--miniflux-gap) = 12px).
  { selector: ".miniflux-card-list", property: "gap", value: "16px" },

  // Card: 12px radius / 18px padding / drop shadow.
  { selector: ".miniflux-card", property: "border-radius", value: "12px" },
  { selector: ".miniflux-card", property: "box-shadow", value: "0 2px 6px rgba(0, 0, 0, 0.1)" },
  { selector: ".miniflux-card", property: "padding", value: "18px" },

  // Summary: 2-line clamp truncation.
  { selector: ".miniflux-summary", property: "-webkit-line-clamp", value: "2" },

  // Unread pill: filled interactive-accent background.
  { selector: ".miniflux-pill-unread", property: "background", value: "var(--interactive-accent)" },

  // Title: 1.15rem enlargement.
  { selector: ".miniflux-card-title", property: "font-size", value: "1.15rem" },
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

test("mobile (<600px) media block omits the v1.1.2 card-ification declarations", async () => {
  const css = await readFile("styles.css", "utf8");

  const start = css.indexOf("@media (max-width: 600px)");
  assert.ok(start !== -1, "mobile media block must exist in styles.css");
  const mobileBlock = css.slice(start);

  const present = ABSENT.filter((decl) => declarationPresent(mobileBlock, decl));
  assert.deepEqual(
    present,
    [],
    `Must NOT appear inside the mobile media block (upstream list style restored):\n${present
      .map(({ selector, property, value }) => `${selector} { ${property}: ${value}; }`)
      .join("\n")}`,
  );
});