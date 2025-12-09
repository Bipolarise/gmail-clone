// src/features/mail/components/MailApp.tsx
"use client";

import { useMemo, useState, useEffect } from "react";
import Image from "next/image";
import type { Session } from "next-auth";

// React Query
import { useSuspenseQuery, useMutation } from "@tanstack/react-query";

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

  // tRPC client wrapper (queryOptions + mutationOptions)
  const trpc = useTRPC();

  // ------------------------------------------------------
  // ✅ SEND EMAIL MUTATION (CORRECT FOR YOUR TRPC SETUP)
  // ------------------------------------------------------
  const sendEmail = useMutation(
    trpc.gmail.sendEmail.mutationOptions({
      onSuccess: () => {
        console.log("Email sent successfully!");
      },
      onError: (err) => {
        console.error("Failed to send email:", err);
      },
    })
  );

  // ------------------------------------------------------
  // UI STATE
  // ------------------------------------------------------
  const [activeLabel, setActiveLabel] = useState<MailLabel>("INBOX");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [page, setPage] = useState(1);
  const [isComposeOpen, setIsComposeOpen] = useState(false);

  // ------------------------------------------------------
  // FETCH THREADS
  // ------------------------------------------------------
  const { data: threads = [] } = useSuspenseQuery(
    trpc.gmail.listThreads.queryOptions(undefined, {
      enabled: !!session.user,
      staleTime: 30_000,
    })
  );

  // ------------------------------------------------------
  // MAP THREADS → MAIL ITEMS
  // ------------------------------------------------------
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
        };
      }),
    [threads]
  );

  // ------------------------------------------------------
  // SEARCH + FILTER
  // ------------------------------------------------------
  const filteredEmails = useMemo(() => {
    return mailItems.filter((mail) => {
      const q = search.toLowerCase();

      if (activeLabel !== mail.label) return false;
      if (!q) return true;

      return (
        mail.subject.toLowerCase().includes(q) ||
        mail.from.toLowerCase().includes(q) ||
        mail.snippet.toLowerCase().includes(q)
      );
    });
  }, [search, activeLabel, mailItems]);

  // Reset pagination when search or label changes
  useEffect(() => {
    setPage(1);
    setSelectedId(null);
    setViewMode("list");
  }, [search, activeLabel]);

  // ------------------------------------------------------
  // PAGINATION
  // ------------------------------------------------------
  const totalEmails = filteredEmails.length;
  const totalPages = Math.max(1, Math.ceil(totalEmails / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);

  const pagedEmails = filteredEmails.slice(
    (currentPage - 1) * PAGE_SIZE,
    (currentPage - 1) * PAGE_SIZE + PAGE_SIZE
  );

  const selectedMail =
    filteredEmails.find((m) => m.id === selectedId) ?? null;

  const unreadInboxCount = useMemo(
    () =>
      mailItems.filter((m) => m.label === "INBOX" && m.unread).length,
    [mailItems]
  );

  // ------------------------------------------------------
  // RENDER
  // ------------------------------------------------------
  return (
    <div className="flex h-screen bg-[#f6f8fc] text-slate-900">
      <MailAppRail
        unreadInboxCount={unreadInboxCount}
        onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
      />

      <div className="flex flex-1 flex-col">
        {/* HEADER */}
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

          <div className="flex flex-1 justify-center">
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

          {/* PROFILE */}
          <div className="ml-4 flex items-center gap-3">
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
        </header>

        {/* BODY */}
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
                  setViewMode("detail");
                }}
                page={currentPage}
                pageSize={PAGE_SIZE}
                total={totalEmails}
                onPageChange={(p) => {
                  setPage(p);
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

      {/* COMPOSE MODAL */}
      <MailComposeModal
        open={isComposeOpen}
        onClose={() => setIsComposeOpen(false)}
        onSend={async (payload) => {
          await sendEmail.mutateAsync(payload);
          setIsComposeOpen(false);
        }}
      />
    </div>
  );
}
