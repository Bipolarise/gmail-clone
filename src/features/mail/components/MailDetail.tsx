// src/features/mail/components/MailDetail.tsx
"use client";

import { useQuery } from "@tanstack/react-query";
import type { MailItem } from "../types/mail";
import { useTRPC } from "~/trpc/react";
import { IconButton } from "./IconButton";

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
    // eslint-disable-next-line no-console
    console.error("getThreadDetail error", error);
  }

  const html = data?.html ?? "";
  const textFallback = data?.text ?? email.body ?? "";
  const hasHtml = !!html;

  const displayName = email.from ?? email.fromEmail ?? "Unknown";
  const avatarInitial = displayName.trim().charAt(0).toUpperCase();

  return (
    <section className="flex flex-1 flex-col overflow-hidden rounded-2xl bg-white shadow-[0_1px_3px_rgba(60,64,67,0.2)]">
      {/* ================= HEADER ================= */}
      <header className="border-b border-[#e0e3e7] px-4 pb-3 pt-2">
        {/* Top toolbar row: back + actions + print/open */}
        <div className="flex items-center justify-between pb-2">
          <div className="flex items-center gap-1">
            {/* Back */}
            <button
              type="button"
              onClick={onBack}
              className="flex h-8 w-8 items-center justify-center rounded-full text-slate-600 hover:bg-[#f1f3f4]"
            >
              <span className="sr-only">Back to inbox</span>
              <span className="material-symbols-outlined !text-[20px]">
                arrow_back
              </span>
            </button>

            {/* Archive */}
            <IconButton label="Archive">
              <span className="material-symbols-outlined !text-[20px]">
                archive
              </span>
            </IconButton>

            {/* Report spam */}
            <IconButton label="Report spam">
              <span className="material-symbols-outlined !text-[20px]">
                report
              </span>
            </IconButton>

            {/* Delete */}
            <IconButton label="Delete">
              <span className="material-symbols-outlined !text-[20px]">
                delete
              </span>
            </IconButton>

            {/* Mark as unread */}
            <IconButton label="Mark as unread">
              <span className="material-symbols-outlined !text-[20px]">
                mark_email_unread
              </span>
            </IconButton>

            {/* Move to */}
            <IconButton label="Move to">
              <span className="material-symbols-outlined !text-[20px]">
                drive_file_move
              </span>
            </IconButton>

            {/* More */}
            <IconButton label="More">
              <span className="material-symbols-outlined !text-[20px]">
                more_vert
              </span>
            </IconButton>
          </div>

          <div className="flex items-center gap-1">
            {/* Print */}
            <IconButton label="Print">
              <span className="material-symbols-outlined !text-[20px]">
                print
              </span>
            </IconButton>

            {/* Open in new window */}
            <IconButton label="Open in new window">
              <span className="material-symbols-outlined !text-[20px]">
                open_in_new
              </span>
            </IconButton>
          </div>
        </div>

        {/* Subject row */}
        <div className="flex items-center justify-between pb-1 pl-1 pr-1 pt-1">
          <div className="flex min-w-0 items-center gap-2">
            <h1 className="truncate text-[22px] font-normal text-slate-900">
              {email.subject}
            </h1>
            <span className="rounded-full bg-[#e8eaed] px-2 py-0.5 text-[11px] font-medium text-slate-700">
              Inbox
            </span>
          </div>
        </div>

        {/* Sender row (avatar, name, to-me, date + star/emoji/reply/more) */}
        <div className="mt-3 flex items-start justify-between pl-1 pr-1">
          {/* Left side: avatar + name/email + "to me" */}
          <div className="flex items-start gap-3">
            <div className="mt-[2px] flex h-10 w-10 items-center justify-center rounded-full bg-sky-100 text-sm font-semibold text-sky-700">
              {avatarInitial}
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-x-2 text-sm">
                <span className="font-medium text-slate-900">
                  {email.from ?? email.fromEmail}
                </span>
                {email.fromEmail && (
                  <span className="text-xs text-slate-500">
                    &lt;{email.fromEmail}&gt;
                  </span>
                )}
              </div>

              <div className="mt-0.5 text-xs text-slate-500">
                to{" "}
                <span className="font-medium text-slate-700">Jonathan</span>
              </div>
            </div>
          </div>

          {/* Right side: date + star + emoji + reply + more (all in one row) */}
          <div className="flex items-center gap-1 text-xs text-slate-500">
            <span className="mr-2 whitespace-nowrap">
              {email.receivedAtFull}
            </span>

            {/* Star */}
            <IconButton label="Star">
              <span className="material-symbols-outlined !text-[20px]">
                star_border
              </span>
            </IconButton>

            {/* Emoji / reaction */}
            <IconButton label="Add reaction">
              <span className="material-symbols-outlined !text-[20px]">
                sentiment_satisfied
              </span>
            </IconButton>

            {/* Reply */}
            <IconButton label="Reply" className="hidden md:flex">
              <span className="material-symbols-outlined !text-[20px]">
                reply
              </span>
            </IconButton>

            {/* More (kebab) */}
            <IconButton label="More" className="hidden md:flex">
              <span className="material-symbols-outlined !text-[20px]">
                more_vert
              </span>
            </IconButton>
          </div>
        </div>
      </header>

      {/* ================= BODY ================= */}
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
              <div
                className="prose max-w-none text-slate-800"
                // eslint-disable-next-line react/no-danger
                dangerouslySetInnerHTML={{ __html: html }}
              />
            ) : (
              <pre className="whitespace-pre-wrap break-words text-sm">
                {textFallback}
              </pre>
            )}
          </>
        )}
      </div>

      {/* ================= FOOTER ================= */}
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
