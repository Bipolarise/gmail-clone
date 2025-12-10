// src/features/mail/components/MailSidebar.tsx
"use client";

import type { MailLabel } from "../types/mail";

type MailSidebarProps = {
  activeLabel: MailLabel;
  unreadInboxCount: number;
  onLabelChange: (label: MailLabel) => void;
  onCompose?: () => void;
};

const LABELS: { id: MailLabel; name: string; icon: string }[] = [
  { id: "INBOX", name: "Inbox", icon: "inbox" },
  { id: "STARRED", name: "Starred", icon: "star" },
  { id: "SENT", name: "Sent", icon: "send" },
  { id: "DRAFTS", name: "Drafts", icon: "drafts" },
  { id: "TRASH", name: "Trash", icon: "delete" }, // 🗑️ new
];

export function MailSidebar({
  activeLabel,
  unreadInboxCount,
  onLabelChange,
  onCompose,
}: MailSidebarProps) {
  return (
    <aside className="flex w-56 flex-col bg-[#f6f8fc]">
      {/* Compose button */}
      <div className="px-3 pt-3 pb-2">
        <button
          type="button"
          onClick={() => onCompose?.()}
          className="inline-flex items-center gap-2 rounded-2xl bg-[#c2e7ff] px-5 py-3 text-[13px] font-medium text-slate-900 shadow-sm hover:bg-[#b3ddff]"
        >
          <span className="material-symbols-outlined text-[18px] text-slate-900">
            edit
          </span>
          Compose
        </button>
      </div>

      {/* Labels */}
      <nav className="mt-1 flex flex-1 flex-col gap-0.5 px-2 text-[13px] text-slate-700">
        {LABELS.map((item) => {
          const isActive = item.id === activeLabel;
          const count =
            item.id === "INBOX" && unreadInboxCount > 0
              ? unreadInboxCount
              : undefined;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onLabelChange(item.id)}
              className={`flex items-center rounded-full px-3 py-1 text-left hover:bg-[#e8eaed] ${
                isActive ? "bg-[#d3e3fd] font-medium text-[#0b57d0]" : ""
              }`}
            >
              <span
                className={`material-symbols-outlined mr-2 text-[14px] ${
                  isActive ? "text-[#0b57d0]" : "text-slate-600"
                }`}
              >
                {item.icon}
              </span>

              <span>{item.name}</span>

              {typeof count === "number" && (
                <span className="ml-auto text-[10px] text-slate-500">
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
