// src/features/mail/components/MailDetail.tsx
"use client";

import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "~/trpc/react";
import { IconButton } from "./IconButton";
import type { MailItem } from "../types/mail";

type MailDetailProps = {
  email: MailItem | null;
  onBack: () => void;
  onReply: () => void;
  onForward: () => void;
};

export function MailDetail({
  email,
  onBack,
  onReply,
  onForward
}: MailDetailProps) {
  const trpc = useTRPC();

  if (!email) {
    return (
      <section className="flex flex-1 items-center justify-center rounded-2xl bg-white shadow text-sm text-slate-500">
        Select a conversation to read
      </section>
    );
  }

  // Fetch full thread (conversation)
  const { data, isLoading, error } = useQuery(
    trpc.gmail.getThreadDetail.queryOptions(
      { threadId: email.id },
      { enabled: !!email.id }
    )
  );

  const conversation = data?.conversation ?? [];

  return (
    <section className="flex flex-1 flex-col overflow-hidden rounded-2xl bg-white shadow">
      {/* ================= HEADER ================= */}
      <header className="border-b border-[#e0e3e7] px-4 pb-3 pt-2">
        <div className="flex items-center justify-between pb-2">
          <div className="flex items-center gap-1">
            {/* Back */}
            <button
              type="button"
              onClick={onBack}
              className="flex h-8 w-8 items-center justify-center rounded-full text-slate-600 hover:bg-[#f1f3f4]"
            >
              <span className="material-symbols-outlined !text-[20px]">
                arrow_back
              </span>
            </button>

            {/* Actions */}
            <IconButton label="Archive">
              <span className="material-symbols-outlined !text-[20px]">
                archive
              </span>
            </IconButton>

            <IconButton label="Report spam">
              <span className="material-symbols-outlined !text-[20px]">
                report
              </span>
            </IconButton>

            <IconButton label="Delete">
              <span className="material-symbols-outlined !text-[20px]">
                delete
              </span>
            </IconButton>

            <IconButton label="Mark as unread">
              <span className="material-symbols-outlined !text-[20px]">
                mark_email_unread
              </span>
            </IconButton>

            <IconButton label="Move to">
              <span className="material-symbols-outlined !text-[20px]">
                drive_file_move
              </span>
            </IconButton>

            <IconButton label="More">
              <span className="material-symbols-outlined !text-[20px]">
                more_vert
              </span>
            </IconButton>
          </div>

          <div className="flex items-center gap-1">
            <IconButton label="Print">
              <span className="material-symbols-outlined !text-[20px]">
                print
              </span>
            </IconButton>

            <IconButton label="Open in new window">
              <span className="material-symbols-outlined !text-[20px]">
                open_in_new
              </span>
            </IconButton>
          </div>
        </div>

        {/* Subject */}
        <div className="flex items-center justify-between pb-1 pl-1 pr-1 pt-1">
          <h1 className="truncate text-[22px] font-normal text-slate-900">
            {email.subject}
          </h1>
          <span className="rounded-full bg-[#e8eaed] px-2 py-0.5 text-[11px] font-medium text-slate-700">
            Inbox
          </span>
        </div>
      </header>

      {/* ================= CONVERSATION BODY ================= */}
      <div className="flex-1 overflow-y-auto px-6 py-4 text-sm leading-relaxed text-slate-800">
        {isLoading && (
          <div className="text-xs text-slate-500">Loading conversation…</div>
        )}

        {error && !isLoading && (
          <div className="text-xs text-red-500">
            Failed to load thread.
          </div>
        )}

        {/* Render conversation messages */}
        {!isLoading && !error && conversation.length > 0 && (
          <div className="flex flex-col gap-10">
            {conversation.map((msg, i) => {
              const avatarInitial =
                msg.from?.trim().charAt(0).toUpperCase() ?? "U";

              return (
                <div key={msg.id} className="flex flex-col">
                  {/* Sender + Timestamp */}
                  <div className="flex items-start gap-3 mb-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-100 text-sm font-semibold text-sky-700">
                      {avatarInitial}
                    </div>

                    <div className="flex flex-col">
                      <span className="font-medium text-slate-900">
                        {msg.from}
                      </span>
                      <span className="text-xs text-slate-500">{msg.date}</span>
                    </div>
                  </div>

                  {/* Message Body */}
                  {msg.html ? (
                    <div
                      className="prose max-w-none text-slate-800"
                      dangerouslySetInnerHTML={{ __html: msg.html }}
                    />
                  ) : (
                    <pre className="whitespace-pre-wrap break-words text-sm">
                      {msg.text}
                    </pre>
                  )}

                  {/* Divider between messages */}
                  {i < conversation.length - 1 && (
                    <div className="mt-8 border-b border-slate-200" />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ================= FOOTER ================= */}
      <div className="border-t border-[#e0e3e7] px-6 py-3">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onReply}
            className="rounded-full border border-slate-300 px-4 py-1.5 text-xs font-medium text-slate-700 hover:bg-[#f1f3f4]"
          >
            Reply
          </button>

          <button
            type="button"
            onClick={onForward}
            className="rounded-full border border-slate-300 px-4 py-1.5 text-xs font-medium text-slate-700 hover:bg-[#f1f3f4]"
          >
            Forward
          </button>
        </div>
      </div>
    </section>
  );
}
