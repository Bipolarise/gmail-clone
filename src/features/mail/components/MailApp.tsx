// src/features/mail/components/MailApp.tsx
"use client";

import { useMemo, useState, useEffect } from "react";
import Image from "next/image";
import type { Session } from "next-auth";
import { useSuspenseQuery } from "@tanstack/react-query";

import { MailSidebar } from "./MailSidebar";
import { MailList } from "./MailList";
import { MailDetail } from "./MailDetail";
import { MailAppRail } from "./MailAppRail";
import { MailComposeModal } from "./MailComposeModal";
import { type MailItem, type MailLabel } from "../types/mail";
import { useTRPC } from "~/trpc/react";

type MailAppProps = {
  session: Session;
};

type ViewMode = "list" | "detail";

const PAGE_SIZE = 50;

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
  const [page, setPage] = useState(1);
  const [isComposeOpen, setIsComposeOpen] = useState(false);

  // ---------------------------
  // 1) Fetch Gmail threads
  // ---------------------------
  const { data: threads = [] } = useSuspenseQuery(
    trpc.gmail.listThreads.queryOptions(undefined, {
      enabled: !!session.user,
      staleTime: 30_000,
    }),
  );

  // ---------------------------
  // 2) Convert threads → MailItem[]
  // ---------------------------
  const mailItems: MailItem[] = useMemo(
    () =>
      threads.map((t) => {
        const received = t.receivedAt ? new Date(t.receivedAt) : new Date();
        const receivedAtTime = received.toLocaleTimeString("en-AU", {
          hour: "2-digit",
          minute: "2-digit",
        });
        const receivedAtFull = received.toLocaleString("en-AU");

        const fromEmailMatch =
          typeof t.from === "string" ? t.from.match(/<([^>]+)>/) : null;

        const fromName =
          typeof t.from === "string"
            ? (t.from.split("<")[0] ?? "").trim() || "Unknown sender"
            : "Unknown sender";

        return {
          id: t.id,
          label: "INBOX",
          from: fromName,
          fromEmail: fromEmailMatch?.[1] ?? "",
          subject: t.subject || "(no subject)",
          snippet: t.snippet || "",
          body: t.snippet || "",
          receivedAt: received,
          receivedAtTime,
          receivedAtFull,
          unread: false,
        } satisfies MailItem;
      }),
    [threads],
  );

  // ---------------------------
  // 3) Search/filtering
  // ---------------------------
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

  // Reset pagination when searching/changing labels
  useEffect(() => {
    setPage(1);
    setSelectedId(null);
    setViewMode("list");
  }, [activeLabel, search]);

  // ---------------------------
  // 4) Pagination
  // ---------------------------
  const totalEmails = filteredEmails.length;
  const totalPages = Math.max(1, Math.ceil(totalEmails / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);

  const pageStartIndex = (currentPage - 1) * PAGE_SIZE;
  const pageEndIndex = pageStartIndex + PAGE_SIZE;

  const pagedEmails = filteredEmails.slice(pageStartIndex, pageEndIndex);

  const selectedMail =
    filteredEmails.find((m) => m.id === selectedId) ?? null;

  const unreadInboxCount = useMemo(
    () => mailItems.filter((m) => m.label === "INBOX" && m.unread).length,
    [mailItems],
  );

  // ---------------------------
  // 5) Render UI
  // ---------------------------
  return (
    <div className="flex h-screen bg-[#f6f8fc] text-slate-900">
      <MailAppRail
        unreadInboxCount={unreadInboxCount}
        onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
      />

      <div className="flex flex-1 flex-col">
        {/* Header */}
        <header className="flex h-14 items-center bg-[#f6f8fc] px-4">
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

          {/* Right header icons */}
          <div className="ml-4 flex items-center gap-3">
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

            <button className="rounded-full p-1.5 hover:bg-[#e8eaed]">
              <span className="material-symbols-outlined text-[20px] text-slate-600">help</span>
            </button>

            <button className="rounded-full p-1.5 hover:bg-[#e8eaed]">
              <span className="material-symbols-outlined text-[20px] text-slate-600">settings</span>
            </button>

            <button className="rounded-full p-1.5 hover:bg-[#e8eaed]">
              <span className="material-symbols-outlined text-[20px] text-slate-600">magic_button</span>
            </button>

            <button className="rounded-full p-1.5 hover:bg-[#e8eaed]">
              <span className="material-symbols-outlined text-[20px] text-slate-600">apps</span>
            </button>

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

        {/* Layout below header */}
        <div className="flex flex-1 overflow-hidden">
          {isSidebarOpen && (
            <MailSidebar
              activeLabel={activeLabel}
              unreadInboxCount={unreadInboxCount}
              onLabelChange={(label) => setActiveLabel(label)}
              onCompose={() => setIsComposeOpen(true)}
            />
          )}

          <div className="flex flex-1 overflow-hidden px-4 pt-3 pb-4">
            {viewMode === "list" && (
              <MailList
                emails={pagedEmails}
                selectedId={selectedId}
                onSelect={(id) => {
                  setSelectedId(id);
                  if (id) setViewMode("detail");
                }}
                page={currentPage}
                pageSize={PAGE_SIZE}
                total={totalEmails}
                onPageChange={(nextPage) => {
                  setPage(nextPage);
                  setSelectedId(null);
                  setViewMode("list");
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

      {/* Compose modal */}
      <MailComposeModal
        open={isComposeOpen}
        onClose={() => setIsComposeOpen(false)}
        onSend={async (payload) => {
          // 🔥 Correct way to call your mutation
          await trpc.gmail.sendEmail(payload);

          // Optional: refetch thread list later if needed
        }}
      />
    </div>
  );
}
