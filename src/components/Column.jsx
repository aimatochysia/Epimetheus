import { useEffect, useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useBoard } from "../context/BoardContext.jsx";
import { sound } from "../audio/sound.js";
import { BlockView } from "./Block.jsx";

export function ColumnView({ column, reduce }) {
  const api = useBoard();
  const drop = useDroppable({ id: `column:${column.id}` });
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (api.focusId === column.id) {
      const field = document.getElementById(`column-title-${column.id}`);
      field?.focus();
      field?.select();
    }
  }, [api.focusId, column.id]);

  return (
    <section
      ref={drop.setNodeRef}
      className={drop.isOver ? "column over" : "column"}
      data-ripple
    >
      <header className="column-head">
        <input
          id={`column-title-${column.id}`}
          className="column-title"
          value={column.title}
          aria-label="Column name"
          onChange={(event) => api.renameColumn(column.id, event.target.value)}
          onBlur={() => api.setFocusId(null)}
        />
        <button
          type="button"
          className={armed ? "quiet danger" : "quiet"}
          onPointerEnter={() => sound.hover()}
          onClick={() => {
            if (!armed && column.blockIds.length > 0) {
              setArmed(true);
              return;
            }
            api.deleteColumn(column.id);
          }}
          onBlur={() => setArmed(false)}
        >
          {armed ? "Remove column" : "Remove"}
        </button>
      </header>
      <SortableContext items={column.blockIds} strategy={verticalListSortingStrategy}>
        <div className="stack">
          {column.blockIds.length === 0 && <p className="empty">Nothing resting here.</p>}
          {column.blockIds.map((id) => (
            <BlockView key={id} id={id} reduce={reduce} />
          ))}
        </div>
      </SortableContext>
      <button
        type="button"
        className="text-button"
        onPointerEnter={() => sound.hover()}
        onClick={() => api.addBlock({ columnId: column.id })}
      >
        Add a block
      </button>
    </section>
  );
}
