"use client";

import { useMemo, useState } from "react";
import type { Session } from "next-auth";

import { MailSidebar } from "./MailSidebar";
import { MailList } from "./MailList";
import { MailDetail } from "./MailDetail";
import {
  MOCK_MAIL_ITEMS,
  type MailItem,
  type MailLabel,
} from "../types/mail";

type MailAppProps = {
  session: Session;
};

export function MailApp({ session }: MailAppProps) {
  const [activeLabel, setActiveLabel] = useState<MailLabel>("INBOX");
  const [selectedId, setSelectedId] = useState<string | null>(
    MOCK_MAIL_ITEMS[0]?.id ?? null,
  );
  const [search, setSearch] = useState("");

  const filteredEmails = useMemo(() => {
    return MOCK_MAIL_ITEMS.filter((mail) => {
      if (activeLabel === "INBOX" && mail.label !== "INBOX") return false;
      if (activeLabel !== "INBOX" && mail.label !== activeLabel) return false;

      const q = search.toLowerCase();
      if (!q) return true;

      return (
        mail.subject.toLowerCase().includes(q) ||
        mail.from.toLowerCase().includes(q) ||
        mail.snippet.toLowerCase().includes(q)
      );
    });
  }, [activeLabel, search]);

  const selectedMail: MailItem | null =
    filteredEmails.find((m) => m.id === selectedId) ?? filteredEmails[0] ?? null;

  const unreadInboxCount = useMemo(
    () =>
      MOCK_MAIL_ITEMS.filter(
        (m) => m.label === "INBOX" && m.unread,
      ).length,
    [],
  );

  return (
    <div className="flex h-screen flex-col bg-[#f6f8fc] text-slate-900">
      {/* Top app bar */}
      <header className="flex h-14 items-center gap-4 border-b border-slate-200 bg-white px-4">
        {/* Mini “logo” + app name */}
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1a73e8] text-sm font-semibold text-white">
            M
          </div>
          <span className="text-lg font-medium tracking-tight">Mail</span>
        </div>

        {/* Search bar (center like Gmail) */}
        <div className="mx-auto flex max-w-xl flex-1 items-center">
          <div className="flex w-full items-center rounded-full bg-[#eaf1fb] px-4 py-2 text-sm text-slate-700 shadow-inner">
            <span className="mr-2 text-slate-500">🔍</span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search mail"
              className="w-full bg-transparent text-sm outline-none placeholder:text-slate-500"
            />
          </div>
        </div>

        {/* Right side user / sign out */}
        <div className="flex items-center gap-3">
          <span className="hidden text-xs text-slate-600 sm:inline-block max-w-[180px] truncate">
            {session.user?.email ?? session.user?.name ?? "Signed in"}
          </span>
          <a
            href="/api/auth/signout"
            className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
          >
            Sign out
          </a>
        </div>
      </header>

      {/* Main 3-column layout */}
      <div className="flex flex-1 overflow-hidden">
        <MailSidebar
          activeLabel={activeLabel}
          unreadInboxCount={unreadInboxCount}
          onLabelChange={setActiveLabel}
        />

        <MailList
          emails={filteredEmails}
          selectedId={selectedId}
          onSelect={setSelectedId}
        />

        <MailDetail email={selectedMail} />
      </div>
    </div>
  );
}
