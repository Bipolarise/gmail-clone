"use client";

import type { MailItem } from "../types/mail";

type MailDetailProps = {
  email: MailItem | null;
};

export function MailDetail({ email }: MailDetailProps) {
  if (!email) {
    return (
      <section className="hidden flex-1 items-center justify-center bg-white text-sm text-slate-500 lg:flex">
        Select a conversation to read
      </section>
    );
  }

  return (
    <section className="hidden flex-1 flex-col bg-white lg:flex">
      {/* Header */}
      <div className="border-b border-slate-200 px-6 py-3">
        <div className="mb-1 text-sm font-semibold text-slate-900">
          {email.subject}
        </div>
        <div className="flex items-center justify-between text-xs text-slate-500">
          <div>
            <span className="font-medium text-slate-700">{email.from}</span>
            {email.fromEmail && <span> &lt;{email.fromEmail}&gt;</span>}
          </div>
          <span>{email.receivedAtFull}</span>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-6 py-4 text-sm leading-relaxed text-slate-800 whitespace-pre-line">
        {email.body}
      </div>

      {/* Footer actions (just placeholders for now) */}
      <div className="border-t border-slate-200 px-6 py-3">
        <div className="flex gap-2">
          <button
            type="button"
            className="rounded-full border border-slate-300 px-4 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
          >
            Reply
          </button>
          <button
            type="button"
            className="rounded-full border border-slate-300 px-4 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
          >
            Forward
          </button>
        </div>
      </div>
    </section>
  );
}
