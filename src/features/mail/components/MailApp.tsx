"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import type { Session } from "next-auth";

import { MailSidebar } from "./MailSidebar";
import { MailList } from "./MailList";
import { MailDetail } from "./MailDetail";
import { MailAppRail } from "./MailAppRail";
import {
  MOCK_MAIL_ITEMS,
  type MailItem,
  type MailLabel,
} from "../types/mail";

type MailAppProps = {
  session: Session;
};

type ViewMode = "list" | "detail";

export function MailApp({ session }: MailAppProps) {
  const [activeLabel, setActiveLabel] = useState<MailLabel>("INBOX");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

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
    filteredEmails.find((m) => m.id === selectedId) ?? null;

  const unreadInboxCount = useMemo(
    () =>
      MOCK_MAIL_ITEMS.filter(
        (m) => m.label === "INBOX" && m.unread,
      ).length,
    [],
  );

  const primaryIdentity =
    session.user?.email ?? session.user?.name ?? "You";
  const avatarInitial = primaryIdentity.charAt(0).toUpperCase();

  return (
    // OUTER ROW: rail on the far left, everything else to the right
    <div className="flex h-screen bg-[#f6f8fc] text-slate-900">
      {/* Left icon rail spanning full height */}
      <MailAppRail
        unreadInboxCount={unreadInboxCount}
        onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
      />

      {/* Right side: column with header + main content */}
      <div className="flex flex-1 flex-col">
        {/* Top app bar */}
        <header className="flex h-14 items-center bg-[#f6f8fc] px-4">
          {/* Gmail logo area – same width as sidebar so search lines up with card */}
          <div className="flex w-56 items-center">
            <Image
              src="/gmail.png"
              alt="Gmail"
              width={150}
              height={50}
              className="h-9 w-auto"
              priority
            />
          </div>

          {/* Search bar aligned above white mail card */}
          <div className="flex flex-1">
            <div className="flex w-full max-w-2xl items-center rounded-full bg-[#eaf1fb] px-4 py-2 text-sm text-slate-700 shadow-inner">
              <span className="material-symbols-outlined mr-2 text-[18px] text-slate-500">
                search
              </span>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search mail"
                className="w-full bg-transparent text-sm outline-none placeholder:text-slate-500"
              />
            </div>
          </div>

          {/* Right side: status pill + icons + avatar + sign out */}
          <div className="ml-4 flex items-center gap-3">
            {/* Active status pill */}
            <button
              type="button"
              className="flex items-center rounded-full bg-[#eaf1fb] px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-[#dde6fb]"
            >
              <span className="mr-2 inline-flex h-2.5 w-2.5 rounded-full bg-[#34a853]" />
              <span>Active</span>
              <span className="material-symbols-outlined ml-1 text-[18px] text-slate-500">
                expand_more
              </span>
            </button>

            {/* Icon buttons */}
            <button
              type="button"
              className="rounded-full p-1.5 hover:bg-[#e8eaed]"
              aria-label="Support"
            >
              <span className="material-symbols-outlined text-[20px] text-slate-600">
                help
              </span>
            </button>

            <button
              type="button"
              className="rounded-full p-1.5 hover:bg-[#e8eaed]"
              aria-label="Settings"
            >
              <span className="material-symbols-outlined text-[20px] text-slate-600">
                settings
              </span>
            </button>

            <button
              type="button"
              className="rounded-full p-1.5 hover:bg-[#e8eaed]"
              aria-label="Quick settings"
            >
              <span className="material-symbols-outlined text-[20px] text-slate-600">
                magic_button
              </span>
            </button>

            <button
              type="button"
              className="rounded-full p-1.5 hover:bg-[#e8eaed]"
              aria-label="Google apps"
            >
              <span className="material-symbols-outlined text-[20px] text-slate-600">
                apps
              </span>
            </button>

            {/* Avatar + sign out */}
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-xs font-semibold text-white">
                {avatarInitial}
              </div>
              <a
                href="/api/auth/signout"
                className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
              >
                Sign out
              </a>
            </div>
          </div>
        </header>

        {/* Main layout: sidebar + (list OR detail) */}
        <div className="flex flex-1 overflow-hidden">
          {isSidebarOpen && (
            <MailSidebar
              activeLabel={activeLabel}
              unreadInboxCount={unreadInboxCount}
              onLabelChange={(label) => {
                setActiveLabel(label);
                setViewMode("list");
                setSelectedId(null);
              }}
            />
          )}

          {/* Center content area – Gmail-style card sits inside here */}
          <div className="flex flex-1 overflow-hidden px-4 pt-3 pb-4">
            {viewMode === "list" && (
              <MailList
                emails={filteredEmails}
                selectedId={selectedId}
                onSelect={(id) => {
                  setSelectedId(id);
                  setViewMode("detail");
                }}
              />
            )}

            {viewMode === "detail" && (
              <MailDetail
                email={selectedMail}
                onBack={() => setViewMode("list")}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
