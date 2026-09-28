import { useEffect, useRef, useState } from "react";
import { useBoard } from "../context/BoardContext.jsx";
import { applyVolume, readVolume, sound, volumeLevels } from "../audio/sound.js";

export function Header({ theme, onTheme }) {
  const api = useBoard();
  const [volume, setVolume] = useState(readVolume);
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);
  const fileRef = useRef(null);

  useEffect(() => {
    applyVolume(volume);
  }, [volume]);

  useEffect(() => {
    if (!open) return undefined;
    function onPointer(event) {
      if (!menuRef.current?.contains(event.target)) setOpen(false);
    }
    window.addEventListener("pointerdown", onPointer);
    return () => window.removeEventListener("pointerdown", onPointer);
  }, [open]);

  return (
    <header className="nav">
      <div className="brand">
        <h1>Epimetheus</h1>
        <p>A quiet board for work that can wait.</p>
      </div>
      <div className="nav-tools">
        <button
          type="button"
          className="tool"
          aria-pressed={theme === "dark"}
          onPointerEnter={() => sound.hover()}
          onClick={() => {
            sound.press();
            onTheme(theme === "dark" ? "light" : "dark");
          }}
        >
          {theme === "dark" ? "Light" : "Dark"}
        </button>
        <div className="menu" ref={menuRef}>
          <button
            type="button"
            className="tool"
            aria-expanded={open}
            aria-haspopup="listbox"
            onPointerEnter={() => sound.hover()}
            onClick={() => setOpen((value) => !value)}
          >
            {volumeLevels().find((level) => level.id === volume)?.label || "Sound"}
          </button>
          {open && (
            <ul className="menu-list" role="listbox" aria-label="Volume">
              {volumeLevels().map((level) => (
                <li key={level.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={level.id === volume}
                    onClick={() => {
                      setVolume(level.id);
                      setOpen(false);
                      sound.release();
                    }}
                  >
                    {level.label}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <button type="button" className="tool" onPointerEnter={() => sound.hover()} onClick={() => api.exportBoard()}>
          Export
        </button>
        <button
          type="button"
          className="tool"
          onPointerEnter={() => sound.hover()}
          onClick={() => fileRef.current?.click()}
        >
          Import
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={async (event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (!file) return;
            try {
              api.importBoard(JSON.parse(await file.text()));
            } catch {
              api.importBoard(null);
            }
          }}
        />
      </div>
      <p className="live" role="status" aria-live="polite">{api.message}</p>
    </header>
  );
}
