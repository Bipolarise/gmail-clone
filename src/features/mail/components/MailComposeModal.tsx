// src/features/mail/components/MailComposeModal.tsx
"use client";

import { useState } from "react";
import type { FormEvent } from "react";

type MailComposeModalProps = {
  open: boolean;
  onClose: () => void;

  // optional for now – you can wire this to a tRPC mutation later
  onSend?: (payload: {
    to: string;
    cc?: string;
    bcc?: string;
    subject: string;
    body: string;
  }) => Promise<void> | void;

  initialTo?: string;
  initialSubject?: string;
  initialBody?: string;
};

export function MailComposeModal({
  open,
  onClose,
  onSend,
  initialTo = "",
  initialSubject = "",
  initialBody = "",
}: MailComposeModalProps) {
  const [to, setTo] = useState(initialTo);
  const [cc, setCc] = useState("");
  const [bcc, setBcc] = useState("");
  const [subject, setSubject] = useState(initialSubject);
  const [body, setBody] = useState(initialBody);

  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const [isSending, setIsSending] = useState(false);

  if (!open) return null;

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!to.trim() && !cc.trim() && !bcc.trim()) return;

    try {
      setIsSending(true);
      if (onSend) {
        await onSend({ to, cc, bcc, subject, body });
      }
      setIsSending(false);
      onClose();
    } catch (err) {
      console.error("Failed to send email", err);
      setIsSending(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="fixed bottom-0 right-6 z-40 mb-4 w-full max-w-xl rounded-t-xl border border-[#dadce0] bg-white shadow-[0_4px_8px_rgba(60,64,67,0.3)]"
    >
      {/* ===== Header ===== */}
      <header className="flex items-center justify-between rounded-t-xl bg-[#f2f6fc] px-4 py-2">
        <span className="text-sm font-medium text-slate-800">
          New message
        </span>

        <div className="flex items-center gap-1 text-slate-500">
          <button
            type="button"
            className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-[#e8eaed]"
            aria-label="Minimize"
          >
            <span className="material-symbols-outlined !text-[18px]">
              remove
            </span>
          </button>
          <button
            type="button"
            className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-[#e8eaed]"
            aria-label="Pop out"
          >
            <span className="material-symbols-outlined !text-[18px]">
              open_in_full
            </span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-[#e8eaed]"
            aria-label="Close"
          >
            <span className="material-symbols-outlined !text-[18px]">
              close
            </span>
          </button>
        </div>
      </header>

      {/* ===== Fields ===== */}
      <div className="border-t border-[#dadce0] px-4 pb-2 pt-2 text-sm">
        {/* To / Cc / Bcc */}
        <div className="flex items-baseline gap-2">
          <span className="w-10 text-xs text-slate-500">To</span>
          <input
            className="flex-1 border-0 p-0 text-sm outline-none focus:ring-0"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="Recipients"
          />
          <button
            type="button"
            onClick={() => setShowCc((v) => !v)}
            className="mr-1 text-xs font-medium text-slate-600 hover:text-slate-900"
          >
            Cc
          </button>
          <button
            type="button"
            onClick={() => setShowBcc((v) => !v)}
            className="text-xs font-medium text-slate-600 hover:text-slate-900"
          >
            Bcc
          </button>
        </div>

        {showCc && (
          <div className="mt-1 flex items-baseline gap-2">
            <span className="w-10 text-xs text-slate-500">Cc</span>
            <input
              className="flex-1 border-0 p-0 text-sm outline-none focus:ring-0"
              value={cc}
              onChange={(e) => setCc(e.target.value)}
            />
          </div>
        )}

        {showBcc && (
          <div className="mt-1 flex items-baseline gap-2">
            <span className="w-10 text-xs text-slate-500">Bcc</span>
            <input
              className="flex-1 border-0 p-0 text-sm outline-none focus:ring-0"
              value={bcc}
              onChange={(e) => setBcc(e.target.value)}
            />
          </div>
        )}

        {/* Subject */}
        <div className="mt-1 flex items-baseline gap-2">
          <span className="w-10 text-xs text-slate-500">Subject</span>
          <input
            className="flex-1 border-0 p-0 text-sm outline-none focus:ring-0"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
        </div>
      </div>

      {/* ===== Body ===== */}
      <div className="h-56 border-t border-[#dadce0] px-4 pt-2">
        <textarea
          className="h-full w-full resize-none border-0 p-0 text-sm outline-none focus:ring-0"
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
      </div>

      {/* ===== Footer / Toolbar ===== */}
      <footer className="flex items-center justify-between border-t border-[#dadce0] px-3 py-2">
        <div className="flex items-center gap-2">
          <button
            type="submit"
            disabled={isSending}
            className="flex items-center gap-1 rounded-full bg-[#0b57d0] px-4 py-1.5 text-xs font-medium text-white hover:bg-[#0842a0] disabled:cursor-not-allowed disabled:opacity-70"
          >
            <span>Send</span>
            <span className="material-symbols-outlined !text-[18px]">
              arrow_drop_down
            </span>
          </button>

          <ToolbarIcon label="Formatting options">
            <span className="material-symbols-outlined !text-[18px]">
              text_format
            </span>
          </ToolbarIcon>
          <ToolbarIcon label="Attach files">
            <span className="material-symbols-outlined !text-[18px]">
              attach_file
            </span>
          </ToolbarIcon>
          <ToolbarIcon label="Insert link">
            <span className="material-symbols-outlined !text-[18px]">
              link
            </span>
          </ToolbarIcon>
          <ToolbarIcon label="Insert emoji">
            <span className="material-symbols-outlined !text-[18px]">
              sentiment_satisfied
            </span>
          </ToolbarIcon>
          <ToolbarIcon label="Insert file from Drive">
            <span className="material-symbols-outlined !text-[18px]">
              drive_folder_upload
            </span>
          </ToolbarIcon>
        </div>

        <div className="flex items-center gap-1 text-slate-500">
          <ToolbarIcon label="More options">
            <span className="material-symbols-outlined !text-[18px]">
              more_vert
            </span>
          </ToolbarIcon>
          <ToolbarIcon label="Discard draft">
            <span className="material-symbols-outlined !text-[18px]">
              delete
            </span>
          </ToolbarIcon>
        </div>
      </footer>
    </form>
  );
}

type ToolbarIconProps = {
  children: React.ReactNode;
  label: string;
};

function ToolbarIcon({ children, label }: ToolbarIconProps) {
  return (
    <button
      type="button"
      className="flex h-8 w-8 items-center justify-center rounded-full text-slate-600 hover:bg-[#e8eaed]"
      aria-label={label}
      title={label}
    >
      {children}
    </button>
  );
}
