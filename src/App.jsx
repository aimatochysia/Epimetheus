import { useEffect, useMemo, useRef, useState } from "react";
import confetti from "canvas-confetti";
import { motion } from "framer-motion";
import { BoardProvider, useBoard } from "./context/BoardContext.jsx";
import { unlock } from "./audio/sound.js";
import { Header } from "./components/Header.jsx";
import { BoardView } from "./components/BoardView.jsx";
import { Sand } from "./components/Sand.jsx";

function useReduce() {
  const [reduce, setReduce] = useState(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReduce(media.matches);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);
  return reduce;
}

function signatureOf(board) {
  const columns = board.columns.map((column) => `${column.id}:${column.blockIds.join(",")}`).join("|");
  const blocks = Object.values(board.blocks)
    .map((block) => `${block.id}${block.collapsed ? "c" : "o"}${block.childIds.join(".")}`)
    .join(";");
  return `${columns}#${blocks}`;
}

function Shell({ theme, onTheme, reduce }) {
  const api = useBoard();
  const boardRef = useRef(null);
  const signature = useMemo(() => signatureOf(api.board), [api.board]);
  const seenMove = useRef(null);

  useEffect(() => {
    if (!api.moved || seenMove.current === api.moved.nonce || reduce) return;
    seenMove.current = api.moved.nonce;
    const node = document.querySelector(`[data-block="${api.moved.id}"]`);
    if (!node) return;
    const rect = node.getBoundingClientRect();
    confetti({
      particleCount: 36,
      spread: 48,
      startVelocity: 16,
      scalar: 0.7,
      ticks: 110,
      gravity: 0.9,
      origin: {
        x: (rect.left + rect.width / 2) / window.innerWidth,
        y: (rect.top + rect.height / 2) / window.innerHeight,
      },
      colors: ["#f4f1ea", "#c6a56a", "#8ea184", "#d4a3ad", "#dcd9d1", "#6e5044"],
    });
  }, [api.moved, reduce]);

  return (
    <>
      <Header theme={theme} onTheme={onTheme} />
      <motion.div className="scroller" layoutScroll>
        <div className="garden">
          <Sand boardRef={boardRef} theme={theme} signature={signature} hold={api.hold} reduce={reduce} />
          <BoardView boardRef={boardRef} reduce={reduce} />
        </div>
      </motion.div>
    </>
  );
}

export function App() {
  const [theme, setTheme] = useState(() => (document.documentElement.dataset.theme === "dark" ? "dark" : "light"));
  const reduce = useReduce();

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.classList.toggle("reduce", reduce);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", theme === "dark" ? "#14161b" : "#dcd9d1");
  }, [theme, reduce]);

  useEffect(() => {
    const unlockFromGesture = () => unlock();
    window.addEventListener("pointerdown", unlockFromGesture);
    window.addEventListener("keydown", unlockFromGesture);
    return () => {
      window.removeEventListener("pointerdown", unlockFromGesture);
      window.removeEventListener("keydown", unlockFromGesture);
    };
  }, []);

  function onTheme(next) {
    localStorage.setItem("epimetheus-theme", next);
    setTheme(next);
  }

  return (
    <BoardProvider>
      <Shell theme={theme} onTheme={onTheme} reduce={reduce} />
    </BoardProvider>
  );
}
