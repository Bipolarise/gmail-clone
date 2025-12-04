"use client";

import type { MailItem } from "../types/mail";

type MailListProps = {
  emails: MailItem[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
};

export function MailList({ emails, selectedId, onSelect }: MailListProps) {
  return (
    <section className="flex min-w-[380px] flex-1 flex-col border-r border-slate-200 bg-white">
      {/* Tabs row (Primary / etc.) – static for now */}
      <div className="flex h-11 items-end border-b border-slate-200 px-4 text-xs font-medium text-slate-600">
        <button className="border-b-2 border-[#1a73e8] px-3 pb-2 text-[#1a73e8]">
          Primary
        </button>
        <button className="px-3 pb-2 text-slate-500">Promotions</button>
        <button className="px-3 pb-2 text-slate-500">Social</button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto text-sm">
        {emails.map((mail) => {
          const isSelected = mail.id === selectedId;
          const isUnread = mail.unread;

          return (
            <button
              key={mail.id}
              type="button"
              onClick={() => onSelect(mail.id)}
              className={`flex w-full items-center gap-3 border-b border-slate-100 px-4 py-2 hover:bg-[#f2f6fc] ${
                isSelected ? "bg-[#e8f0fe]" : ""
              }`}
            >
              {/* Sender + bold for unread */}
              <div className="w-48 shrink-0 truncate text-left">
                <span className={isUnread ? "font-semibold" : ""}>
                  {mail.from}
                </span>
              </div>

              {/* Subject + snippet */}
              <div className="flex flex-1 items-center gap-1 truncate text-left">
                <span className={isUnread ? "font-semibold" : ""}>
                  {mail.subject}
                </span>
                <span className="text-slate-500"> – {mail.snippet}</span>
              </div>

              {/* Time */}
              <div className="ml-2 w-16 shrink-0 text-right text-xs text-slate-500">
                {mail.receivedAtTime}
              </div>
            </button>
          );
        })}

        {emails.length === 0 && (
          <div className="flex h-full items-center justify-center text-sm text-slate-500">
            No messages
          </div>
        )}
      </div>
    </section>
  );
}
