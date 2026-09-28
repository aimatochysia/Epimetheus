import assert from "node:assert/strict";
import test from "node:test";
import { COLORS, TAG_INK } from "../src/model/colors.js";
import {
  addBlock,
  moveBlock,
  parseBoard,
  resolveDrop,
  seedBoard,
  toggleDone,
} from "../src/model/board.js";

function channel(hex) {
  const value = parseInt(hex.slice(1), 16);
  return [value >> 16 & 255, value >> 8 & 255, value & 255].map((part) => {
    const c = part / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
}

function contrast(a, b) {
  const lum = (hex) => {
    const [r, g, b] = channel(hex);
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const left = lum(a);
  const right = lum(b);
  const [hi, lo] = left > right ? [left, right] : [right, left];
  return (hi + 0.05) / (lo + 0.05);
}

test("tag colors clear 4.5:1 against the ink", () => {
  for (const color of COLORS) {
    assert.ok(contrast(color.hex, TAG_INK) >= 4.5, color.id);
  }
  assert.ok(contrast("#2c2824", "#dcd9d1") >= 7);
  assert.ok(contrast("#e7e2d8", "#14161b") >= 7);
});

test("a ticked leaf stays in its column", () => {
  const board = seedBoard();
  const { board: next, movedId } = toggleDone(board, "b-wait");
  assert.equal(movedId, null);
  assert.equal(next.blocks["b-wait"].done, true);
  assert.ok(next.columns[1].blockIds.includes("b-cut"));
});

test("a finished parent flies to the next column with its children", () => {
  let board = seedBoard();
  board = toggleDone(board, "b-wait").board;
  const result = toggleDone(board, "b-cut");
  assert.equal(result.movedId, "b-cut");
  assert.deepEqual(result.board.columns[1].blockIds, []);
  assert.deepEqual(result.board.columns[2].blockIds, ["b-cut"]);
  assert.equal(result.board.blocks["b-cut"].parentId, null);
  assert.deepEqual(result.board.blocks["b-cut"].childIds, ["b-tick", "b-wait"]);
});

test("ticking the last child moves a parent that was already done", () => {
  let board = seedBoard();
  board = toggleDone(board, "b-cut").board;
  assert.equal(board.columns[1].blockIds.includes("b-cut"), true);
  const result = toggleDone(board, "b-wait");
  assert.equal(result.movedId, "b-cut");
  assert.ok(result.board.columns[2].blockIds.includes("b-cut"));
});

test("the last column does not receive an automatic move", () => {
  const board = seedBoard();
  board.blocks["b-name"].done = true;
  board.blocks["b-pieces"].done = true;
  const parked = moveBlock(board, "b-name", { parentId: null, columnId: "col-rest", beforeId: null });
  const result = toggleDone(toggleDone(parked, "b-name").board, "b-name");
  assert.equal(result.movedId, null);
  assert.ok(result.board.columns[2].blockIds.includes("b-name"));
});

test("a block cannot be nested inside its own child", () => {
  const board = seedBoard();
  const next = moveBlock(board, "b-cut", { parentId: "b-wait", columnId: null, beforeId: null });
  assert.equal(next, board);
});

test("reorder keeps the dropped card in front of its target", () => {
  const board = seedBoard();
  const extra = addBlock(board, { columnId: "col-shape", title: "Second" });
  const moved = moveBlock(extra.board, extra.id, {
    parentId: null,
    columnId: "col-shape",
    beforeId: "b-cut",
  });
  assert.deepEqual(moved.columns[1].blockIds, [extra.id, "b-cut"]);
});

test("resolveDrop nests into a block and refuses a cycle", () => {
  const board = seedBoard();
  assert.deepEqual(resolveDrop(board, "b-name", "nest:b-cut"), {
    parentId: "b-cut",
    columnId: null,
    beforeId: null,
  });
  assert.equal(resolveDrop(board, "b-cut", "nest:b-wait"), null);
  assert.deepEqual(resolveDrop(board, "b-name", "column:col-rest"), {
    parentId: null,
    columnId: "col-rest",
    beforeId: null,
  });
});

test("parseBoard accepts the seed and rejects a broken file", () => {
  assert.ok(parseBoard(seedBoard()));
  assert.ok(parseBoard({ version: 1, columns: [], blocks: {} }));
  assert.equal(parseBoard({ version: 2, columns: [], blocks: {} }), null);
  const broken = seedBoard();
  broken.blocks["b-cut"].childIds.push("b-cut");
  assert.equal(parseBoard(broken), null);
  const missing = seedBoard();
  missing.blocks["b-name"].childIds = [];
  assert.equal(parseBoard(missing), null);
});
