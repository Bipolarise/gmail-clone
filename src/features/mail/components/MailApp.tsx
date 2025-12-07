// src/features/mail/components/MailApp.tsx
"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import type { Session } from "next-auth";
import { useSuspenseQuery } from "@tanstack/react-query";

import { MailSidebar } from "./MailSidebar";
import { MailList } from "./MailList";
import { MailDetail } from "./MailDetail";
import { MailAppRail } from "./MailAppRail";
import { type MailItem, type MailLabel } from "../types/mail";
import { useTRPC } from "~/trpc/react";

type MailAppProps = {
  session: Session;
};

type ViewMode = "list" | "detail";

export function MailApp({ session }: MailAppProps) {
  const primaryIdentity =
    session.user?.email ?? session.user?.name ?? "You";
  const avatarInitial = primaryIdentity.charAt(0).toUpperCase();

  const trpc = useTRPC();

  const [activeLabel, setActiveLabel] = useState<MailLabel>("INBOX");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // 1) Fetch Gmail threads
  const { data: threads = [] } = useSuspenseQuery(
    trpc.gmail.listThreads.queryOptions(undefined, {
      enabled: !!session.user, // only if logged in
      staleTime: 30_000,
    }),
  );

  // 2) Map raw threads -> MailItem[]
  const mailItems: MailItem[] = useMemo(
    () =>
      threads.map((t) => {
        const received = t.receivedAt ? new Date(t.receivedAt) : new Date();
        const receivedAtTime = received.toLocaleTimeString("en-AU", {
          hour: "2-digit",
          minute: "2-digit",
        });
        const receivedAtFull = received.toLocaleString("en-AU");

        // Try to split "Name <email@x.com>"
        const fromEmailMatch =
          typeof t.from === "string" ? t.from.match(/<([^>]+)>/) : null;

        const fromName =
          typeof t.from === "string"
            ? (t.from.split("<")[0] ?? "").trim() || "Unknown sender"
            : "Unknown sender";

        return {
          id: t.id,
          label: "INBOX", // everything in INBOX for now
          from: fromName,
          fromEmail: fromEmailMatch?.[1] ?? "",
          subject: t.subject || "(no subject)",
          snippet: t.snippet || "",
          body: t.snippet || "", // placeholder until you fetch full HTML
          receivedAt: received,
          receivedAtTime,
          receivedAtFull,
          unread: false, // can wire up Gmail's UNREAD flag later
        } satisfies MailItem;
      }),
    [threads],
  );

  // 3) Filtering & selection
  const filteredEmails = useMemo(() => {
    return mailItems.filter((mail) => {
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
  }, [activeLabel, search, mailItems]);

  const selectedMail: MailItem | null =
    filteredEmails.find((m) => m.id === selectedId) ?? null;

  const unreadInboxCount = useMemo(
    () =>
      mailItems.filter((m) => m.label === "INBOX" && m.unread).length,
    [mailItems],
  );

  // 4) UI
  return (
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
