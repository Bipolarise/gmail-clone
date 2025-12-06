"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { useTRPC } from "~/trpc/react";

export default function GmailDebugPage() {
  const trpc = useTRPC();

  const { data } = useSuspenseQuery(
    trpc.gmail.listThreads.queryOptions()
  );

  return (
    <div className="p-4">
      <h1 className="mb-2 text-lg font-semibold">Gmail threads (debug)</h1>
      <pre className="whitespace-pre-wrap rounded bg-slate-900 p-3 text-xs text-slate-100">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}
