import { isColorId } from "./colors.js";

export const BOARD_VERSION = 1;

export function createId() {
  return crypto.randomUUID();
}

function block(partial) {
  return {
    id: partial.id,
    title: partial.title,
    description: partial.description || "",
    done: Boolean(partial.done),
    color: isColorId(partial.color) ? partial.color : "moss",
    collapsed: Boolean(partial.collapsed),
    parentId: partial.parentId || null,
    childIds: partial.childIds ? [...partial.childIds] : [],
  };
}

export function seedBoard() {
  return {
    version: BOARD_VERSION,
    columns: [
      { id: "col-gather", title: "Gather", blockIds: ["b-name"] },
      { id: "col-shape", title: "Shape", blockIds: ["b-cut"] },
      { id: "col-rest", title: "Rest", blockIds: [] },
    ],
    blocks: {
      "b-name": block({
        id: "b-name",
        title: "Name the work",
        description: "One line for what this board is holding.",
        color: "moss",
        childIds: ["b-pieces"],
      }),
      "b-pieces": block({
        id: "b-pieces",
        title: "Invite the pieces",
        description: "The notes that belong underneath.",
        color: "sage",
        parentId: "b-name",
      }),
      "b-cut": block({
        id: "b-cut",
        title: "Cut the first card",
        description: "A block can hold other blocks.",
        color: "clay",
        childIds: ["b-tick", "b-wait"],
      }),
      "b-tick": block({
        id: "b-tick",
        title: "Mark what is finished",
        description: "A tick draws a line through the words.",
        color: "pine",
        parentId: "b-cut",
        done: true,
      }),
      "b-wait": block({
        id: "b-wait",
        title: "Leave the rest open",
        description: "The parent moves on only when every child is ticked.",
        color: "gold",
        parentId: "b-cut",
      }),
    },
  };
}

export function isDescendant(board, ancestorId, id) {
  let current = id;
  const seen = new Set();
  while (current) {
    if (current === ancestorId) return true;
    if (seen.has(current)) return false;
    seen.add(current);
    current = board.blocks[current]?.parentId || null;
  }
  return false;
}

function rootId(board, id) {
  let current = id;
  const seen = new Set();
  while (board.blocks[current]?.parentId && !seen.has(current)) {
    seen.add(current);
    current = board.blocks[current].parentId;
  }
  return current;
}

export function columnOf(board, id) {
  const root = rootId(board, id);
  return board.columns.find((column) => column.blockIds.includes(root)) || null;
}

function detach(board, id) {
  const block = board.blocks[id];
  if (!block) return;
  if (block.parentId && board.blocks[block.parentId]) {
    const parent = board.blocks[block.parentId];
    parent.childIds = parent.childIds.filter((childId) => childId !== id);
  }
  for (const column of board.columns) {
    column.blockIds = column.blockIds.filter((blockId) => blockId !== id);
  }
  block.parentId = null;
}

function insert(list, id, beforeId) {
  const next = list.filter((item) => item !== id);
  if (!beforeId) {
    next.push(id);
    return next;
  }
  const index = next.indexOf(beforeId);
  if (index < 0) next.push(id);
  else next.splice(index, 0, id);
  return next;
}

export function moveBlock(board, id, dest) {
  if (!board.blocks[id] || !dest) return board;
  if (dest.beforeId === id) return board;
  if (dest.parentId && (dest.parentId === id || isDescendant(board, id, dest.parentId))) {
    return board;
  }
  const next = structuredClone(board);
  detach(next, id);
  const block = next.blocks[id];
  if (dest.parentId) {
    const parent = next.blocks[dest.parentId];
    if (!parent) return board;
    parent.childIds = insert(parent.childIds, id, dest.beforeId);
    parent.collapsed = false;
    block.parentId = dest.parentId;
  } else {
    const column = next.columns.find((item) => item.id === dest.columnId);
    if (!column) return board;
    column.blockIds = insert(column.blockIds, id, dest.beforeId);
    block.parentId = null;
  }
  return next;
}

function subtreeDone(board, id) {
  const block = board.blocks[id];
  if (!block?.done) return false;
  return block.childIds.every((childId) => subtreeDone(board, childId));
}

function parentIsComplete(board, id) {
  const block = board.blocks[id];
  if (!block?.done || block.childIds.length === 0) return false;
  return block.childIds.every((childId) => subtreeDone(board, childId));
}

function relocateToNextColumn(board, id) {
  const from = columnOf(board, id);
  if (!from) return false;
  const index = board.columns.findIndex((column) => column.id === from.id);
  const dest = board.columns[index + 1];
  if (!dest) return false;
  detach(board, id);
  board.blocks[id].parentId = null;
  dest.blockIds.push(id);
  return true;
}

export function toggleDone(board, id) {
  if (!board.blocks[id]) return { board, movedId: null };
  const next = structuredClone(board);
  next.blocks[id].done = !next.blocks[id].done;
  if (!next.blocks[id].done) return { board: next, movedId: null };
  let cursor = id;
  const seen = new Set();
  while (cursor && !seen.has(cursor)) {
    seen.add(cursor);
    if (parentIsComplete(next, cursor)) {
      const moved = relocateToNextColumn(next, cursor);
      if (moved) return { board: next, movedId: cursor };
    }
    cursor = next.blocks[cursor]?.parentId || null;
  }
  return { board: next, movedId: null };
}

export function addColumn(board, title = "Untitled", id = createId()) {
  const next = structuredClone(board);
  next.columns.push({ id, title: title.trim() || "Untitled", blockIds: [] });
  return next;
}

export function renameColumn(board, id, title) {
  const next = structuredClone(board);
  const column = next.columns.find((item) => item.id === id);
  if (!column) return board;
  column.title = title;
  return next;
}

function collectTree(board, id, into) {
  into.push(id);
  const block = board.blocks[id];
  if (!block) return;
  for (const childId of block.childIds) collectTree(board, childId, into);
}

export function deleteColumn(board, id) {
  const column = board.columns.find((item) => item.id === id);
  if (!column) return board;
  const next = structuredClone(board);
  const doomed = [];
  for (const blockId of column.blockIds) collectTree(next, blockId, doomed);
  for (const blockId of doomed) delete next.blocks[blockId];
  next.columns = next.columns.filter((item) => item.id !== id);
  return next;
}

export function addBlock(board, { columnId, parentId, title = "", description = "", color = "moss", id = createId() }) {
  const next = structuredClone(board);
  const created = block({ id, title, description, color, parentId: parentId || null });
  next.blocks[id] = created;
  if (parentId && next.blocks[parentId]) {
    next.blocks[parentId].childIds.push(id);
    next.blocks[parentId].collapsed = false;
    created.parentId = parentId;
  } else {
    const column = next.columns.find((item) => item.id === columnId);
    if (!column) return board;
    column.blockIds.push(id);
    created.parentId = null;
  }
  return { board: next, id };
}

export function patchBlock(board, id, patch) {
  if (!board.blocks[id]) return board;
  const next = structuredClone(board);
  const current = next.blocks[id];
  if (typeof patch.title === "string") current.title = patch.title;
  if (typeof patch.description === "string") current.description = patch.description;
  if (isColorId(patch.color)) current.color = patch.color;
  return next;
}

export function deleteBlock(board, id) {
  if (!board.blocks[id]) return board;
  const next = structuredClone(board);
  const doomed = [];
  collectTree(next, id, doomed);
  detach(next, id);
  for (const blockId of doomed) delete next.blocks[blockId];
  return next;
}

export function toggleCollapse(board, id) {
  if (!board.blocks[id]) return board;
  const next = structuredClone(board);
  next.blocks[id].collapsed = !next.blocks[id].collapsed;
  return next;
}

function asString(value, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

export function parseBoard(data) {
  if (!data || typeof data !== "object" || data.version !== BOARD_VERSION) return null;
  if (!Array.isArray(data.columns) || !data.blocks || typeof data.blocks !== "object") return null;

  const blocks = {};
  for (const [id, raw] of Object.entries(data.blocks)) {
    if (!raw || typeof raw !== "object") return null;
    if (raw.id !== id) return null;
    const childIds = Array.isArray(raw.childIds) ? raw.childIds.filter((childId) => typeof childId === "string") : [];
    blocks[id] = block({
      id,
      title: asString(raw.title, "Untitled"),
      description: asString(raw.description),
      done: Boolean(raw.done),
      color: raw.color,
      collapsed: Boolean(raw.collapsed),
      parentId: typeof raw.parentId === "string" ? raw.parentId : null,
      childIds,
    });
  }

  const columns = [];
  const seenTop = new Set();
  for (const raw of data.columns) {
    if (!raw || typeof raw.id !== "string" || seenTop.has(raw.id)) return null;
    seenTop.add(raw.id);
    const blockIds = Array.isArray(raw.blockIds) ? raw.blockIds.filter((id) => typeof id === "string") : null;
    if (!blockIds) return null;
    columns.push({ id: raw.id, title: asString(raw.title, "Untitled"), blockIds });
  }

  const listed = new Set();
  for (const column of columns) {
    for (const id of column.blockIds) {
      if (!blocks[id] || blocks[id].parentId) return null;
      if (listed.has(id)) return null;
      listed.add(id);
    }
  }

  for (const block of Object.values(blocks)) {
    if (block.parentId) {
      const parent = blocks[block.parentId];
      if (!parent || !parent.childIds.includes(block.id)) return null;
    } else if (!listed.has(block.id)) {
      return null;
    }
    for (const childId of block.childIds) {
      const child = blocks[childId];
      if (!child || child.parentId !== block.id) return null;
    }
  }

  const visiting = new Set();
  const visited = new Set();
  function walk(id) {
    if (visited.has(id)) return true;
    if (visiting.has(id)) return false;
    visiting.add(id);
    for (const childId of blocks[id].childIds) {
      if (!walk(childId)) return false;
    }
    visiting.delete(id);
    visited.add(id);
    return true;
  }
  for (const id of Object.keys(blocks)) {
    if (!walk(id)) return null;
  }

  const reachable = new Set();
  function mark(id) {
    if (reachable.has(id)) return;
    reachable.add(id);
    for (const childId of blocks[id].childIds) mark(childId);
  }
  for (const column of columns) {
    for (const id of column.blockIds) mark(id);
  }
  if (reachable.size !== Object.keys(blocks).length) return null;

  return { version: BOARD_VERSION, columns, blocks };
}

export function resolveDrop(board, activeId, overId) {
  if (!overId || activeId === overId) return null;
  const over = String(overId);
  if (over.startsWith("nest:")) {
    const parentId = over.slice(5);
    if (!board.blocks[parentId] || parentId === activeId || isDescendant(board, activeId, parentId)) return null;
    return { parentId, columnId: null, beforeId: null };
  }
  if (over.startsWith("column:")) {
    const columnId = over.slice(7);
    if (!board.columns.some((column) => column.id === columnId)) return null;
    return { parentId: null, columnId, beforeId: null };
  }
  const target = board.blocks[over];
  if (!target || isDescendant(board, activeId, target.id)) return null;
  if (target.parentId) return { parentId: target.parentId, columnId: null, beforeId: target.id };
  const column = board.columns.find((item) => item.blockIds.includes(target.id));
  if (!column) return null;
  return { parentId: null, columnId: column.id, beforeId: target.id };
}
