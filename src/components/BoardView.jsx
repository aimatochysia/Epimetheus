import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  pointerWithin,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { LayoutGroup } from "framer-motion";
import { useBoard } from "../context/BoardContext.jsx";
import { sound } from "../audio/sound.js";
import { ColumnView } from "./Column.jsx";
import { BlockPreview } from "./Block.jsx";

function collisionDetection(args) {
  const hits = pointerWithin(args);
  if (hits.length === 0) return closestCenter(args);
  const rank = (id) => {
    const value = String(id);
    if (value.startsWith("nest:")) return 0;
    if (value.startsWith("column:")) return 2;
    return 1;
  };
  return [...hits].sort((a, b) => rank(a.id) - rank(b.id));
}

export function BoardView({ boardRef, reduce }) {
  const api = useBoard();
  const [activeId, setActiveId] = useState(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  return (
    <LayoutGroup>
      <DndContext
        sensors={sensors}
        collisionDetection={collisionDetection}
        onDragStart={({ active }) => {
          setActiveId(active.id);
          api.setHold(true);
          sound.airStart();
        }}
        onDragCancel={() => {
          setActiveId(null);
          api.setHold(false);
          sound.airStop();
        }}
        onDragEnd={({ active, over }) => {
          setActiveId(null);
          api.setHold(false);
          sound.airStop();
          if (over) {
            api.dropBlock(String(active.id), String(over.id));
            sound.tock();
          }
        }}
      >
        <div className="board" ref={boardRef}>
          {api.board.columns.map((column) => (
            <ColumnView key={column.id} column={column} reduce={reduce} />
          ))}
          <button
            type="button"
            className="add-column"
            onPointerEnter={() => sound.hover()}
            onClick={() => api.addColumn()}
          >
            Add a column
          </button>
        </div>
        <DragOverlay dropAnimation={null}>
          {activeId ? <BlockPreview id={String(activeId)} /> : null}
        </DragOverlay>
      </DndContext>
    </LayoutGroup>
  );
}
