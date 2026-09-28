import { useEffect, useRef, useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { motion } from "framer-motion";
import { COLORS, colorById } from "../model/colors.js";
import { useBoard } from "../context/BoardContext.jsx";
import { sound } from "../audio/sound.js";

const ease = [0.22, 1, 0.36, 1];

export function BlockView({ id, reduce }) {
  const api = useBoard();
  const block = api.board.blocks[id];
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, isDragging } = useSortable({ id });
  const nest = useDroppable({ id: `nest:${id}` });
  const [palette, setPalette] = useState(false);
  const paletteRef = useRef(null);
  const fresh = api.isFresh(id);

  const note = useRef(api.note);
  note.current = api.note;
  useEffect(() => {
    note.current(id);
  }, [id]);

  useEffect(() => {
    if (!palette) return undefined;
    function onPointer(event) {
      if (!paletteRef.current?.contains(event.target)) setPalette(false);
    }
    window.addEventListener("pointerdown", onPointer);
    return () => window.removeEventListener("pointerdown", onPointer);
  }, [palette]);

  if (!block) return null;
  const swatch = colorById(block.color);
  const pulsing = api.moved?.id === id;

  return (
    <motion.article
      ref={setNodeRef}
      layout
      className={pulsing ? "block did-move" : "block"}
      data-block={id}
      initial={fresh ? { opacity: 0, y: 10 } : false}
      animate={{ opacity: isDragging ? 0 : 1, y: 0 }}
      transition={reduce ? { duration: 0.001 } : { duration: 0.4, ease }}
    >
      <div className="block-top">
        <button
          type="button"
          className="grip"
          aria-label={`Drag ${block.title || "block"}`}
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
        >
          <span />
          <span />
          <span />
        </button>
        <button
          type="button"
          className="tick"
          role="checkbox"
          aria-checked={block.done}
          aria-label={block.done ? "Mark as open" : "Mark as finished"}
          onPointerEnter={() => sound.hover()}
          onPointerDown={() => sound.press()}
          onClick={() => api.toggleDone(id)}
        />
        <div className="title-wrap">
          <input
            className="title"
            value={block.title}
            aria-label="Title"
            placeholder="Untitled"
            onChange={(event) => api.patchBlock(id, { title: event.target.value })}
          />
          <span className={block.done ? "strike on" : "strike"} />
        </div>
        <div className="palette-anchor" ref={paletteRef}>
          <button
            type="button"
            className="swatch"
            style={{ background: swatch.hex }}
            aria-label={`Color ${swatch.label}`}
            aria-expanded={palette}
            onPointerEnter={() => sound.hover()}
            onClick={() => setPalette((open) => !open)}
          />
          {palette && (
            <div className="palette" role="listbox" aria-label="Block color">
              {COLORS.map((color) => (
                <button
                  key={color.id}
                  type="button"
                  role="option"
                  aria-selected={color.id === block.color}
                  className="swatch"
                  style={{ background: color.hex }}
                  aria-label={color.label}
                  onClick={() => {
                    api.patchBlock(id, { color: color.id });
                    setPalette(false);
                    sound.release();
                  }}
                />
              ))}
            </div>
          )}
        </div>
        {block.childIds.length > 0 && (
          <button
            type="button"
            className={block.collapsed ? "chevron" : "chevron open"}
            aria-expanded={!block.collapsed}
            aria-label={block.collapsed ? "Show blocks inside" : "Hide blocks inside"}
            onClick={() => api.toggleCollapse(id)}
          />
        )}
        <button
          type="button"
          className="quiet"
          onPointerEnter={() => sound.hover()}
          onClick={() => api.deleteBlock(id)}
        >
          Remove
        </button>
      </div>
      <textarea
        className={block.done ? "note is-done" : "note"}
        rows={2}
        value={block.description}
        aria-label="Short description"
        placeholder="A short note"
        onChange={(event) => api.patchBlock(id, { description: event.target.value })}
      />
      {!block.collapsed && block.childIds.length > 0 && (
        <SortableContext items={block.childIds} strategy={verticalListSortingStrategy}>
          <div className="children">
            {block.childIds.map((childId) => (
              <BlockView key={childId} id={childId} reduce={reduce} />
            ))}
          </div>
        </SortableContext>
      )}
      <div ref={nest.setNodeRef} className={nest.isOver ? "nest over" : "nest"} />
      <button
        type="button"
        className="text-button"
        onPointerEnter={() => sound.hover()}
        onClick={() => api.addBlock({ parentId: id, color: block.color })}
      >
        Add inside
      </button>
    </motion.article>
  );
}

export function BlockPreview({ id }) {
  const api = useBoard();
  const block = api.board.blocks[id];
  if (!block) return null;
  const swatch = colorById(block.color);
  return (
    <article className="block preview">
      <div className="block-top">
        <span className="swatch" style={{ background: swatch.hex }} />
        <strong>{block.title || "Untitled"}</strong>
      </div>
      {block.childIds.length > 0 && <p className="hint">{block.childIds.length} inside</p>}
    </article>
  );
}
