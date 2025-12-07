// src/features/mail/components/MailDetail.tsx
"use client";

import { useQuery } from "@tanstack/react-query";
import type { MailItem } from "../types/mail";
import { useTRPC } from "~/trpc/react";

type MailDetailProps = {
  email: MailItem | null;
  onBack: () => void;
};

export function MailDetail({ email, onBack }: MailDetailProps) {
  const trpc = useTRPC();

  if (!email) {
    return (
      <section className="flex flex-1 items-center justify-center rounded-2xl bg-white shadow-[0_1px_3px_rgba(60,64,67,0.2)] text-sm text-slate-500">
        Select a conversation to read
      </section>
    );
  }

  const baseOpts = trpc.gmail.getThreadDetail.queryOptions({
    threadId: email.id,
  });

  const { data, isLoading, error } = useQuery({
    ...baseOpts,
    enabled: !!email.id,
  });

  if (error) {
    // This will print the real Gmail / tRPC error into your browser console
    // (and help us confirm what’s going on)
    // eslint-disable-next-line no-console
    console.error("getThreadDetail error", error);
  }

  const html = data?.html ?? "";
  const textFallback = data?.text ?? email.body ?? "";
  const hasHtml = !!html;

  return (
    <section className="flex flex-1 flex-col overflow-hidden rounded-2xl bg-white shadow-[0_1px_3px_rgba(60,64,67,0.2)]">
      {/* Header */}
      <div className="flex items-start justify-between border-b border-[#e0e3e7] px-6 py-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="mr-1 rounded-full p-1.5 text-slate-600 hover:bg-[#f1f3f4]"
          >
            <span className="text-lg">←</span>
          </button>

          <div>
            <div className="mb-1 text-sm font-semibold text-slate-900">
              {email.subject}
            </div>
            <div className="text-xs text-slate-500">
              <span className="font-medium text-slate-700">{email.from}</span>
              {email.fromEmail && <span> &lt;{email.fromEmail}&gt;</span>}
            </div>
          </div>
        </div>

        <span className="mt-1 text-xs text-slate-500">
          {email.receivedAtFull}
        </span>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-6 py-4 text-sm leading-relaxed text-slate-800">
        {isLoading && (
          <div className="text-xs text-slate-500">Loading message…</div>
        )}

        {error && !isLoading && (
          <div className="text-xs text-red-500">
            Failed to load email body:{" "}
            {(error as any).message ?? "Unknown error"}
          </div>
        )}

        {!isLoading && !error && (
          <>
            {hasHtml ? (
              <div dangerouslySetInnerHTML={{ __html: html }} />
            ) : (
              <pre className="whitespace-pre-wrap break-words text-sm">
                {textFallback}
              </pre>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-[#e0e3e7] px-6 py-3">
        <div className="flex gap-2">
          <button
            type="button"
            className="rounded-full border border-slate-300 px-4 py-1.5 text-xs font-medium text-slate-700 hover:bg-[#f1f3f4]"
          >
            Reply
          </button>
          <button
            type="button"
            className="rounded-full border border-slate-300 px-4 py-1.5 text-xs font-medium text-slate-700 hover:bg-[#f1f3f4]"
          >
            Forward
          </button>
        </div>
      </div>
    </section>
  );
}
