import { createContext, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  addBlock,
  addColumn,
  columnOf,
  createId,
  deleteBlock,
  deleteColumn,
  moveBlock,
  parseBoard,
  patchBlock,
  renameColumn,
  resolveDrop,
  seedBoard,
  toggleCollapse,
  toggleDone,
} from "../model/board.js";
import { loadBoard, saveBoard } from "../storage/vault.js";
import { sound } from "../audio/sound.js";

const BoardContext = createContext(null);

export function BoardProvider({ children }) {
  const [board, setBoard] = useState(seedBoard);
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState("");
  const [hold, setHold] = useState(false);
  const [moved, setMoved] = useState(null);
  const [focusId, setFocusId] = useState(null);
  const known = useRef(null);

  useEffect(() => {
    let cancel = false;
    loadBoard()
      .then((stored) => {
        if (cancel) return;
        const parsed = stored ? parseBoard(stored) : null;
        if (parsed) setBoard(parsed);
        else if (stored) setMessage("Saved board could not be read. Starting from the sample.");
        setReady(true);
      })
      .catch(() => {
        if (cancel) return;
        setMessage("Saved board could not be read. Starting from the sample.");
        setReady(true);
      });
    return () => {
      cancel = true;
    };
  }, []);

  useLayoutEffect(() => {
    if (ready && !known.current) known.current = new Set(Object.keys(board.blocks));
  }, [ready, board]);

  useEffect(() => {
    if (!ready) return undefined;
    const timer = setTimeout(() => {
      saveBoard(board).catch(() => setMessage("Could not save on this browser."));
    }, 80);
    return () => clearTimeout(timer);
  }, [board, ready]);

  const api = useMemo(() => ({
    board,
    ready,
    message,
    hold,
    moved,
    focusId,
    setHold,
    setFocusId,
    clearMessage() { setMessage(""); },
    isFresh(id) {
      if (!known.current) return false;
      return !known.current.has(id);
    },
    note(id) {
      known.current?.add(id);
    },
    addColumn() {
      const id = createId();
      setBoard((current) => addColumn(current, "Untitled", id));
      setFocusId(id);
      sound.sweep();
    },
    renameColumn(id, title) {
      setBoard((current) => renameColumn(current, id, title));
    },
    deleteColumn(id) {
      setBoard((current) => deleteColumn(current, id));
      setMessage("Column removed.");
      sound.low();
    },
    addBlock(spec) {
      const id = createId();
      setBoard((current) => addBlock(current, { ...spec, id }).board);
      sound.sweep();
      return id;
    },
    patchBlock(id, patch) {
      setBoard((current) => patchBlock(current, id, patch));
    },
    deleteBlock(id) {
      setBoard((current) => deleteBlock(current, id));
      sound.low();
    },
    toggleCollapse(id) {
      setBoard((current) => toggleCollapse(current, id));
      sound.press();
    },
    toggleDone(id) {
      sound.chime();
      setBoard((current) => {
        const result = toggleDone(current, id);
        if (result.movedId) {
          const column = columnOf(result.board, result.movedId);
          const title = column?.title || "the next column";
          queueMicrotask(() => {
            setMoved({ id: result.movedId, title, nonce: createId() });
            setMessage(`Moved to ${title}.`);
            sound.sweep();
          });
        }
        return result.board;
      });
    },
    dropBlock(activeId, overId) {
      setBoard((current) => {
        const dest = resolveDrop(current, activeId, overId);
        if (!dest) return current;
        return moveBlock(current, activeId, dest);
      });
    },
    exportBoard() {
      const blob = new Blob([JSON.stringify(board, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "pallas-athena-board.json";
      link.click();
      URL.revokeObjectURL(url);
      setMessage("Board exported.");
      sound.release();
    },
    importBoard(data) {
      const parsed = parseBoard(data);
      if (!parsed) {
        setMessage("That file is not a board.");
        sound.low();
        return;
      }
      known.current = new Set(Object.keys(parsed.blocks));
      setBoard(parsed);
      setMessage("Board imported.");
      sound.sweep();
    },
  }), [board, ready, message, hold, moved, focusId]);

  return <BoardContext.Provider value={api}>{children}</BoardContext.Provider>;
}

export function useBoard() {
  const value = useContext(BoardContext);
  if (!value) throw new Error("useBoard requires BoardProvider");
  return value;
}
