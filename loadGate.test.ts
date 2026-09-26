import { test } from "node:test";
import * as assert from "node:assert/strict";
import { LoadGate } from "./loadGate";

test("reset while a load is in flight supersedes the stale load (oldest-sort race)", () => {
  const gate = new LoadGate();

  // View opens: an initial load (newest, desc) starts and is still in flight.
  const descToken = gate.begin(true);
  assert.notEqual(descToken, null);

  // User clicks "Oldest" while the desc request is still in flight: the reset
  // must supersede, not be dropped.
  const ascToken = gate.begin(true);
  assert.notEqual(ascToken, null);
  assert.notEqual(ascToken, descToken);

  // The stale desc response arriving later must be discarded (never rendered).
  assert.equal(gate.isLatest(descToken!), false);
  assert.equal(gate.isLatest(ascToken!), true);

  // The stale request finishing must NOT release the gate (asc still in flight),
  // so a load-more attempt while it runs is still dropped.
  gate.finish(descToken!);
  assert.equal(gate.begin(false), null);

  // The asc (latest) request completes: render, then release the gate.
  assert.equal(gate.isLatest(ascToken!), true);
  gate.finish(ascToken!);
  assert.notEqual(gate.begin(false), null);
});

test("load-more while busy is dropped", () => {
  const gate = new LoadGate();
  gate.begin(true);
  assert.equal(gate.begin(false), null);
});

test("finish releases the gate only for the latest token", () => {
  const gate = new LoadGate();
  const t1 = gate.begin(true)!;
  const t2 = gate.begin(true)!;
  gate.finish(t1);
  // t2 still in flight: a load-more attempt must still be dropped.
  assert.equal(gate.begin(false), null);
  assert.equal(gate.isLatest(t2), true);
  gate.finish(t2);
  // Gate released: the next load-more proceeds.
  assert.notEqual(gate.begin(false), null);
});

test("isLatest stays true until the next begin supersedes it", () => {
  const gate = new LoadGate();
  const t1 = gate.begin(true)!;
  assert.equal(gate.isLatest(t1), true);
  gate.finish(t1);
  assert.equal(gate.isLatest(t1), true);
  const t2 = gate.begin(true)!;
  assert.equal(gate.isLatest(t1), false);
  assert.equal(gate.isLatest(t2), true);
});