"use client";

import { useState } from "react";
import type { MailItem } from "../types/mail";

type MailListProps = {
  emails: MailItem[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
};

export function MailList({ emails, selectedId, onSelect }: MailListProps) {
  const [checkedIds, setCheckedIds] = useState<Set<string>>(() => new Set());
  const [starredIds, setStarredIds] = useState<Set<string>>(() => new Set());

  const toggleChecked = (id: string) => {
    setCheckedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleStarred = (id: string) => {
    setStarredIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  return (
    <section className="flex flex-1 flex-col overflow-hidden rounded-2xl bg-white pt-2 shadow-[0_1px_3px_rgba(60,64,67,0.2)]">
      {/* Toolbar row above tabs */}
      <div className="flex h-8 items-center justify-between px-4 text-[11px] text-slate-600">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            className="flex h-7 w-7 items-center justify-center rounded-md bg-transparent hover:bg-[#f1f3f4]"
            aria-label="Select"
          >
            <span className="material-symbols-outlined !text-[20px] leading-none text-slate-600">
              check_box_outline_blank
            </span>
          </button>
          <button
            type="button"
            className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-[#f1f3f4]"
            aria-label="Refresh"
          >
            <span className="material-symbols-outlined !text-[20px] leading-none text-slate-600">
              refresh
            </span>
          </button>
          <button
            type="button"
            className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-[#f1f3f4]"
            aria-label="More"
          >
            <span className="material-symbols-outlined !text-[20px] leading-none text-slate-600">
              more_vert
            </span>
          </button>
        </div>

        <div className="flex items-center gap-1 text-[12px]">
          <span>
            1–{emails.length} of {emails.length}
          </span>
          <button
            type="button"
            className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-[#f1f3f4]"
            aria-label="Previous page"
          >
            <span className="material-symbols-outlined !text-[20px] leading-none text-slate-500">
              chevron_left
            </span>
          </button>
          <button
            type="button"
            className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-[#f1f3f4]"
            aria-label="Next page"
          >
            <span className="material-symbols-outlined !text-[20px] leading-none text-slate-500">
              chevron_right
            </span>
          </button>
        </div>
      </div>

      {/* Tabs row */}
      <div className="flex h-14 items-end border-b border-[#e0e3e7] px-4 text-sm font-medium text-slate-600">
        <button className="flex min-w-[200px] items-center gap-2 border-b-2 border-[#1a73e8] px-6 pb-3 text-[#1a73e8]">
          <span className="material-symbols-outlined text-[18px] leading-none">
            inbox
          </span>
          <span>Primary</span>
        </button>
        <button className="ml-1 flex min-w-[200px] items-center gap-2 border-b-2 border-transparent px-6 pb-3 text-slate-500 hover:text-slate-700">
          <span className="material-symbols-outlined text-[18px] leading-none">
            local_offer
          </span>
          <span>Promotions</span>
        </button>
        <button className="ml-1 flex min-w-[200px] items-center gap-2 border-b-2 border-transparent px-6 pb-3 text-slate-500 hover:text-slate-700">
          <span className="material-symbols-outlined text-[18px] leading-none">
            group
          </span>
          <span>Social</span>
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto text-sm">
        {emails.map(mail => {
          const isSelected = mail.id === selectedId;
          const isUnread = mail.unread;
          const isChecked = checkedIds.has(mail.id);
          const isStarred = starredIds.has(mail.id);

          return (
            <div
              key={mail.id}
              onClick={() => onSelect(mail.id)}
              className={`flex w-full cursor-pointer items-center gap-3 border-b border-[#e0e3e7] px-4 py-2 hover:bg-[#f2f6fc] ${
                isSelected ? "bg-[#e8f0fe]" : ""
              }`}
            >
              {/* checkbox + star */}
              <div className="flex w-16 shrink-0 items-center gap-1.5">
                <button
                  type="button"
                  onClick={e => {
                    e.stopPropagation();
                    toggleChecked(mail.id);
                  }}
                  className="flex h-6 w-6 items-center justify-center rounded hover:bg-[#f1f3f4]"
                >
                  <span className="material-symbols-outlined !text-[20px] leading-none text-slate-600">
                    {isChecked ? "check_box" : "check_box_outline_blank"}
                  </span>
                </button>

                {/* ⭐ star toggle */}
                <button
                  type="button"
                  onClick={e => {
                    e.stopPropagation();
                    toggleStarred(mail.id);
                  }}
                  className="flex h-6 w-6 items-center justify-center rounded-full hover:bg-[#f1f3f4]"
                >
                  <span
                    className={`material-symbols-outlined !text-[20px] leading-none ${
                      isStarred ? "text-[#fbbc04]" : "text-slate-400"
                    }`}
                    style={{
                      fontVariationSettings: isStarred
                        ? "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 20"
                        : "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 20",
                    }}
                  >
                    star
                  </span>
                </button>
              </div>

              {/* Sender */}
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
            </div>
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
