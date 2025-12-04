"use client";

import type { MailItem } from "../types/mail";

type MailDetailProps = {
  email: MailItem | null;
  onBack: () => void;
};

export function MailDetail({ email, onBack }: MailDetailProps) {
  if (!email) {
    return (
      <section className="flex flex-1 items-center justify-center rounded-2xl bg-white shadow-[0_1px_3px_rgba(60,64,67,0.2)] text-sm text-slate-500">
        Select a conversation to read
      </section>
    );
  }

  return (
    <section className="flex flex-1 flex-col rounded-2xl bg-white shadow-[0_1px_3px_rgba(60,64,67,0.2)] overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between border-b border-[#e0e3e7] px-6 py-3">
        <div className="flex items-center gap-3">
          {/* Back button */}
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
      <div className="flex-1 overflow-y-auto whitespace-pre-line px-6 py-4 text-sm leading-relaxed text-slate-800">
        {email.body}
      </div>

      {/* Footer actions */}
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
