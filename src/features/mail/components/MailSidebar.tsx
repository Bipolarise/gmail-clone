"use client";

import type { MailLabel } from "../types/mail";

type MailSidebarProps = {
  activeLabel: MailLabel;
  unreadInboxCount: number;
  onLabelChange: (label: MailLabel) => void;
};

const LABELS: { id: MailLabel; name: string }[] = [
  { id: "INBOX", name: "Inbox" },
  { id: "STARRED", name: "Starred" },
  { id: "SENT", name: "Sent" },
  { id: "DRAFTS", name: "Drafts" },
];

export function MailSidebar({
  activeLabel,
  unreadInboxCount,
  onLabelChange,
}: MailSidebarProps) {
  return (
    <aside className="flex w-60 flex-col border-r border-slate-200 bg-[#f6f8fc]">
      {/* Compose button */}
      <div className="px-3 pt-3 pb-2">
        <button
          type="button"
          className="flex w-full items-center gap-3 rounded-2xl bg-[#c2e7ff] px-4 py-3 text-sm font-medium text-slate-900 shadow-sm hover:bg-[#b3ddff]"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-lg leading-none">
            ＋
          </span>
          Compose
        </button>
      </div>

      {/* Labels */}
      <nav className="mt-1 flex flex-1 flex-col gap-1 px-1 text-sm text-slate-700">
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
              className={`flex items-center justify-between rounded-r-full px-4 py-2 text-left hover:bg-slate-200 ${
                isActive ? "bg-slate-200 font-medium" : ""
              }`}
            >
              <span>{item.name}</span>
              {typeof count === "number" && (
                <span className="text-xs text-slate-500">{count}</span>
              )}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
