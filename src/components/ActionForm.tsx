"use client";

import { createContext, startTransition, useActionState } from "react";
import type { FormState } from "@/app/actions/auth";

/** Lets SubmitButton show a pending state for forms submitted via onSubmit. */
export const PendingContext = createContext(false);

/**
 * Runs a server action and returns [state, pending, onSubmit].
 * Submitting through onSubmit (instead of the form `action` prop) stops React
 * from clearing the inputs, so users don't lose what they typed on an error.
 */
export function useFormAction(action: (state: FormState, formData: FormData) => Promise<FormState>) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(() => formAction(formData));
  };
  return [state, pending, onSubmit] as const;
}

export function FormError({ state }: { state: FormState }) {
  if (!state?.error) return null;
  return (
    <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
      {state.error}
    </p>
  );
}

/** A form that shows the error message returned by a server action. */
export default function ActionForm({
  action,
  children,
  className,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  children: React.ReactNode;
  className?: string;
}) {
  const [state, pending, onSubmit] = useFormAction(action);
  return (
    <form onSubmit={onSubmit} className={className}>
      <FormError state={state} />
      <PendingContext.Provider value={pending}>{children}</PendingContext.Provider>
    </form>
  );
}
