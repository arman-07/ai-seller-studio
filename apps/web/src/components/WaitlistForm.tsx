"use client";

import { useState, type FormEvent } from "react";
import { MARKETPLACES, MARKETPLACE_RULES } from "@studio/shared";
import { getSupabase } from "@/lib/supabase";

type State = "idle" | "sending" | "done" | "error";

export function WaitlistForm() {
  const [state, setState] = useState<State>("idle");
  const [message, setMessage] = useState("");

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const supabase = getSupabase();
    if (!supabase) {
      setState("error");
      setMessage("Waitlist isn't connected yet.");
      return;
    }
    setState("sending");
    const { error } = await supabase.from("waitlist").insert({
      email: String(form.get("email")).trim().toLowerCase(),
      marketplace: String(form.get("marketplace")),
    });
    // 23505 = already on the list; treat as success.
    if (error && error.code !== "23505") {
      setState("error");
      setMessage("Something went wrong. Please try again.");
      return;
    }
    setState("done");
  }

  if (state === "done") {
    return <p className="text-lg font-medium">You&apos;re on the list. We&apos;ll email you when the beta opens.</p>;
  }

  return (
    <form onSubmit={onSubmit} className="flex w-full max-w-xl flex-col gap-3 sm:flex-row">
      <input
        name="email"
        type="email"
        required
        placeholder="you@shop.com"
        className="flex-1 rounded-lg border border-neutral-300 px-4 py-3 dark:border-neutral-700 dark:bg-neutral-900"
      />
      <select
        name="marketplace"
        className="rounded-lg border border-neutral-300 px-3 py-3 dark:border-neutral-700 dark:bg-neutral-900"
        defaultValue="etsy"
      >
        {MARKETPLACES.map((m) => (
          <option key={m} value={m}>
            {MARKETPLACE_RULES[m].label}
          </option>
        ))}
      </select>
      <button
        disabled={state === "sending"}
        className="rounded-lg bg-neutral-900 px-5 py-3 font-medium text-white disabled:opacity-60 dark:bg-white dark:text-neutral-900"
      >
        {state === "sending" ? "Joining…" : "Join the beta"}
      </button>
      {state === "error" && <p className="text-sm text-red-600">{message}</p>}
    </form>
  );
}
