"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { createBoard, deleteBoard, moveBoard, renameBoard, saveBoardLayout } from "@/app/actions/boards";
import { toggleSave } from "@/app/actions/drills";

export type BoardCard = {
  saveId: string;
  drillId: string;
  slug: string;
  title: string;
  thumbnail: string | null;
  durationMin: number;
  level: string;
};
export type BoardColumn = { id: string | null; title: string; cards: BoardCard[] };

const UNSORTED = "unsorted";
const colKey = (id: string | null) => id ?? UNSORTED;

export default function DrillBoard({ columns: initial }: { columns: BoardColumn[] }) {
  const [columns, setColumns] = useState(initial);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  useEffect(() => setColumns(initial), [initial]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const findColumn = (id: string) =>
    columns.find((c) => colKey(c.id) === id) ?? columns.find((c) => c.cards.some((card) => card.saveId === id));
  const activeCard = activeId ? columns.flatMap((c) => c.cards).find((c) => c.saveId === activeId) : null;

  function onDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }

  // Move the card into another column while dragging, so the drop position is visible.
  function onDragOver(e: DragOverEvent) {
    const { active, over } = e;
    if (!over) return;
    const from = findColumn(String(active.id));
    const to = findColumn(String(over.id));
    if (!from || !to || from === to) return;
    setColumns((cols) => {
      const card = from.cards.find((c) => c.saveId === active.id)!;
      const overIndex = to.cards.findIndex((c) => c.saveId === over.id);
      const index = overIndex >= 0 ? overIndex : to.cards.length;
      return cols.map((c) => {
        if (c === from) return { ...c, cards: c.cards.filter((x) => x.saveId !== active.id) };
        if (c === to) return { ...c, cards: [...c.cards.slice(0, index), card, ...c.cards.slice(index)] };
        return c;
      });
    });
  }

  function onDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const { active, over } = e;
    if (!over) return;
    const col = findColumn(String(active.id));
    if (!col) return;
    let next = columns;
    const oldIndex = col.cards.findIndex((c) => c.saveId === active.id);
    const newIndex = col.cards.findIndex((c) => c.saveId === over.id);
    if (newIndex >= 0 && oldIndex !== newIndex) {
      next = columns.map((c) => (c === col ? { ...c, cards: arrayMove(c.cards, oldIndex, newIndex) } : c));
      setColumns(next);
    }
    startTransition(() =>
      saveBoardLayout(next.map((c) => ({ boardId: c.id, saveIds: c.cards.map((card) => card.saveId) }))),
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      onDragCancel={() => {
        setActiveId(null);
        setColumns(initial);
      }}
    >
      <div className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-4 sm:-mx-6 sm:px-6">
        {columns.map((col, i) => (
          <Column key={colKey(col.id)} column={col} first={i === 1} last={i === columns.length - 1} />
        ))}
        <NewBoard />
      </div>
      <DragOverlay>{activeCard && <Card card={activeCard} overlay />}</DragOverlay>
    </DndContext>
  );
}

function Column({ column, first, last }: { column: BoardColumn; first: boolean; last: boolean }) {
  const { setNodeRef, isOver } = useDroppable({ id: colKey(column.id) });
  const [editing, setEditing] = useState(false);
  const minutes = column.cards.reduce((sum, c) => sum + c.durationMin, 0);

  return (
    <section
      ref={setNodeRef}
      className={`flex w-72 shrink-0 flex-col rounded-xl border p-3 transition ${isOver ? "border-brand-500 bg-brand-50" : "border-slate-200 bg-slate-100/70"}`}
    >
      <header className="mb-3 flex items-center gap-1">
        {editing && column.id ? (
          <form
            className="flex-1"
            action={(fd) => {
              renameBoard(column.id!, String(fd.get("title")));
              setEditing(false);
            }}
          >
            <input name="title" defaultValue={column.title} autoFocus onBlur={(e) => e.currentTarget.form?.requestSubmit()} className="input py-1" />
          </form>
        ) : (
          <h2 className="flex-1 truncate font-bold" onDoubleClick={() => column.id && setEditing(true)}>
            {column.title} <span className="text-sm font-normal text-ink-500">{column.cards.length}</span>
          </h2>
        )}
        {column.id && !editing && (
          <details className="relative">
            <summary className="btn-ghost btn-sm cursor-pointer list-none" aria-label="Board options">⋯</summary>
            <div className="absolute right-0 z-10 mt-1 w-40 rounded-lg border border-slate-200 bg-white p-1 text-sm shadow-lg">
              <button className="w-full rounded px-2 py-1.5 text-left hover:bg-slate-100" onClick={() => setEditing(true)}>Rename</button>
              {!first && <button className="w-full rounded px-2 py-1.5 text-left hover:bg-slate-100" onClick={() => moveBoard(column.id!, -1)}>← Move left</button>}
              {!last && <button className="w-full rounded px-2 py-1.5 text-left hover:bg-slate-100" onClick={() => moveBoard(column.id!, 1)}>Move right →</button>}
              <button
                className="w-full rounded px-2 py-1.5 text-left text-red-600 hover:bg-red-50"
                onClick={() => confirm(`Delete board “${column.title}”? Its drills move to Unsorted.`) && deleteBoard(column.id!)}
              >
                Delete board
              </button>
            </div>
          </details>
        )}
      </header>
      {minutes > 0 && <p className="-mt-2 mb-2 text-xs text-ink-500">⏱ {minutes} min in total</p>}
      <SortableContext items={column.cards.map((c) => c.saveId)} strategy={verticalListSortingStrategy}>
        <div className="flex min-h-24 flex-1 flex-col gap-2">
          {column.cards.map((card) => <SortableCard key={card.saveId} card={card} />)}
          {column.cards.length === 0 && (
            <p className="rounded-lg border-2 border-dashed border-slate-300 p-4 text-center text-xs text-ink-500">Drag drills here</p>
          )}
        </div>
      </SortableContext>
    </section>
  );
}

function SortableCard({ card }: { card: BoardCard }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: card.saveId });
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} {...attributes} {...listeners} className={isDragging ? "opacity-40" : ""}>
      <Card card={card} />
    </div>
  );
}

function Card({ card, overlay }: { card: BoardCard; overlay?: boolean }) {
  return (
    <div className={`group flex cursor-grab touch-manipulation items-center gap-3 rounded-lg border border-slate-200 bg-white p-2 shadow-sm active:cursor-grabbing ${overlay ? "rotate-2 shadow-xl" : ""}`}>
      <div className="h-12 w-16 shrink-0 overflow-hidden rounded bg-gradient-to-br from-brand-100 to-brand-200">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {card.thumbnail ? <img src={card.thumbnail} alt="" className="h-full w-full object-cover" draggable={false} /> : <div className="grid h-full place-items-center">🏀</div>}
      </div>
      <div className="min-w-0 flex-1">
        <Link href={`/drills/${card.slug}`} className="line-clamp-2 text-sm font-semibold leading-tight hover:text-brand-700" draggable={false}>
          {card.title}
        </Link>
        <p className="mt-0.5 text-xs text-ink-500">{card.durationMin} min</p>
      </div>
      {!overlay && (
        <button
          type="button"
          title="Remove from My Drills"
          className="px-1 text-slate-300 hover:text-red-600"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => toggleSave(card.drillId, card.slug)}
        >
          ✕
        </button>
      )}
    </div>
  );
}

function NewBoard() {
  return (
    <form action={createBoard} className="w-72 shrink-0 self-start rounded-xl border-2 border-dashed border-slate-300 p-3">
      <input name="title" placeholder="+ New board, e.g. “Warm-ups”" className="input" maxLength={60} required />
      <button className="btn-secondary btn-sm mt-2">Add board</button>
    </form>
  );
}
