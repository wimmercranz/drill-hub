"use client";

import { useContext } from "react";
import { useFormStatus } from "react-dom";
import { PendingContext } from "./ActionForm";

export default function SubmitButton({
  children,
  className = "btn-primary",
  pendingText,
  confirm,
}: {
  children: React.ReactNode;
  className?: string;
  pendingText?: string;
  /** Ask the user to confirm before submitting (e.g. for deletes). */
  confirm?: string;
}) {
  const { pending: formPending } = useFormStatus();
  const contextPending = useContext(PendingContext);
  const pending = formPending || contextPending;
  return (
    <button type="submit" className={className} disabled={pending}
      onClick={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
    >
      {pending ? pendingText ?? "Saving…" : children}
    </button>
  );
}
