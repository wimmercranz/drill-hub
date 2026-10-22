"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";

export async function createBoard(formData: FormData) {
  const user = await requireUser("/me");
  const title = String(formData.get("title") ?? "").trim().slice(0, 60);
  if (!title) return;
  const count = await db.board.count({ where: { userId: user.id } });
  await db.board.create({ data: { userId: user.id, title, order: count } });
  revalidatePath("/me");
}

export async function renameBoard(boardId: string, title: string) {
  const user = await requireUser("/me");
  title = title.trim().slice(0, 60);
  if (!title) return;
  await db.board.updateMany({ where: { id: boardId, userId: user.id }, data: { title } });
  revalidatePath("/me");
}

/** Deleting a board keeps its drills: they move back to "Unsorted". */
export async function deleteBoard(boardId: string) {
  const user = await requireUser("/me");
  await db.board.deleteMany({ where: { id: boardId, userId: user.id } });
  revalidatePath("/me");
}

export async function moveBoard(boardId: string, direction: -1 | 1) {
  const user = await requireUser("/me");
  const boards = await db.board.findMany({ where: { userId: user.id }, orderBy: { order: "asc" } });
  const i = boards.findIndex((b) => b.id === boardId);
  const j = i + direction;
  if (i < 0 || j < 0 || j >= boards.length) return;
  [boards[i], boards[j]] = [boards[j], boards[i]];
  await db.$transaction(boards.map((b, order) => db.board.update({ where: { id: b.id }, data: { order } })));
  revalidatePath("/me");
}

/** Save the board layout after a drag: each column's drills, in order. */
export async function saveBoardLayout(columns: { boardId: string | null; saveIds: string[] }[]) {
  const user = await requireUser("/me");
  const [saves, boards] = await Promise.all([
    db.personalSave.findMany({ where: { userId: user.id }, select: { id: true } }),
    db.board.findMany({ where: { userId: user.id }, select: { id: true } }),
  ]);
  const mySaves = new Set(saves.map((s) => s.id));
  const myBoards = new Set(boards.map((b) => b.id));
  const ops = columns.flatMap((col) =>
    col.boardId !== null && !myBoards.has(col.boardId)
      ? []
      : col.saveIds
          .filter((id) => mySaves.has(id))
          .map((id, position) => db.personalSave.update({ where: { id }, data: { boardId: col.boardId, position } })),
  );
  await db.$transaction(ops);
  revalidatePath("/me");
}
