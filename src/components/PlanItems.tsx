"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { DndContext, KeyboardSensor, PointerSensor, TouchSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { removePlanItem, reorderPlanItems, updatePlanItem } from "@/app/actions/plans";
import SubmitButton from "./SubmitButton";

export type PlanItem = {
  id: string;
  durationMin: number;
  note: string;
  drill: { slug: string; title: string; summary: string; meta: string };
};

/** The drills of a practice. Coaches can drag to reorder and edit minutes/notes. */
export default function PlanItems({ planId, items: initial, editable, startTime }: { planId: string; items: PlanItem[]; editable: boolean; startTime: string | null }) {
  const [items, setItems] = useState(initial);
  const [, startTransition] = useTransition();
  useEffect(() => setItems(initial), [initial]);
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function onDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return;
    const next = arrayMove(items, items.findIndex((i) => i.id === active.id), items.findIndex((i) => i.id === over.id));
    setItems(next);
    startTransition(() => reorderPlanItems(planId, next.map((i) => i.id)));
  }

  if (items.length === 0) return <div className="card p-8 text-center text-ink-500">No drills in this practice yet.</div>;

  let clock = 0;
  const rows = items.map((item, i) => {
    const start = clock;
    clock += item.durationMin;
    return <Row key={item.id} item={item} index={i} start={start} end={clock} editable={editable} startTime={startTime} />;
  });

  if (!editable) return <ol className="space-y-3">{rows}</ol>;
  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
        <ol className="space-y-3">{rows}</ol>
      </SortableContext>
    </DndContext>
  );
}

function clockLabel(startTime: string | null, offset: number) {
  if (!startTime) return `${offset}′`;
  const [h, m] = startTime.split(":").map(Number);
  const total = h * 60 + m + offset;
  return `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

function Row({ item, index, start, end, editable, startTime }: { item: PlanItem; index: number; start: number; end: number; editable: boolean; startTime: string | null }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id, disabled: !editable });
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`card flex gap-3 p-4 ${isDragging ? "z-10 shadow-xl" : ""}`}
    >
      {editable && (
        <button type="button" {...attributes} {...listeners} className="no-print -my-1 cursor-grab touch-none self-stretch px-1 text-xl text-slate-400 hover:text-ink-700 active:cursor-grabbing" aria-label="Drag to reorder">
          ⠿
        </button>
      )}
      <div className="w-16 shrink-0 text-center">
        <div className="text-xs text-ink-500">{clockLabel(startTime, start)}–{clockLabel(startTime, end)}</div>
        <div className="mt-1 text-2xl font-extrabold text-brand-600">{index + 1}</div>
      </div>
      <div className="min-w-0 flex-1">
        <Link href={`/drills/${item.drill.slug}`} className="font-bold hover:text-brand-700">{item.drill.title}</Link>
        <p className="text-sm text-ink-500">{item.drill.summary}</p>
        <p className="mt-1 text-xs text-ink-500">{item.drill.meta}</p>
        {editable ? (
          <form action={updatePlanItem.bind(null, item.id)} className="no-print mt-3 flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-1 text-sm">
              <input name="durationMin" type="number" min={1} max={180} defaultValue={item.durationMin} className="input w-20 py-1" /> min
            </label>
            <input name="note" defaultValue={item.note} placeholder="Note (focus, groups…)" className="input min-w-40 flex-1 py-1" />
            <SubmitButton className="btn-secondary btn-sm" pendingText="…">Save</SubmitButton>
          </form>
        ) : null}
        <p className={`mt-2 text-sm ${editable ? "hidden print:block" : ""}`}>
          <strong>{item.durationMin} min</strong>
          {item.note && ` · ${item.note}`}
        </p>
      </div>
      {editable && (
        <form action={removePlanItem.bind(null, item.id)} className="no-print">
          <SubmitButton className="btn-ghost btn-sm text-red-600" pendingText="…">✕</SubmitButton>
        </form>
      )}
    </li>
  );
}
