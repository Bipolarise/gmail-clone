// src/features/mail/components/MailApp.tsx
"use client";

import { useMemo, useState, useEffect } from "react";
import Image from "next/image";
import type { Session } from "next-auth";
import {
  useSuspenseQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";

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

type ComposeInitial = {
  to: string;
  subject: string;
  body: string;
  threadId?: string;
};

// convert Gmail labelIds -> app label
function resolveLabel(labelIds: string[]): MailLabel {
  if (labelIds.includes("TRASH")) return "TRASH";
  if (labelIds.includes("SENT")) return "SENT";
  if (labelIds.includes("DRAFT")) return "DRAFTS";
  if (labelIds.includes("INBOX")) return "INBOX";
  return "INBOX";
}

export function MailApp({ session }: MailAppProps) {
  const primaryIdentity =
    session.user?.email ?? session.user?.name ?? "You";
  const avatarInitial = primaryIdentity.charAt(0).toUpperCase();

  const trpc = useTRPC();
  const queryClient = useQueryClient();

  // ---------------- MUTATIONS ----------------
  const sendEmail = useMutation(
    trpc.gmail.sendEmail.mutationOptions({
      onSuccess: () => {
        // eslint-disable-next-line no-console
        console.log("Email sent successfully!");
      },
      onError: (err) => {
        // eslint-disable-next-line no-console
        console.error("Failed to send email:", err);
      },
    }),
  );

  const toggleStarMutation = useMutation(
    trpc.gmail.toggleStar.mutationOptions({
      onError: (err) => {
        // eslint-disable-next-line no-console
        console.error("Failed to toggle star:", err);
      },
    }),
  );

  // ---------------- UI STATE ----------------
  const [activeLabel, setActiveLabel] = useState<MailLabel>("INBOX");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [page, setPage] = useState(1);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [composeInitial, setComposeInitial] =
    useState<ComposeInitial | null>(null);

  const [mailItems, setMailItems] = useState<MailItem[]>([]);

  // ---------------- FETCH THREADS ----------------
  const threadsQuery = useSuspenseQuery(
    trpc.gmail.listThreads.queryOptions(undefined, {
      enabled: !!session.user,
      staleTime: 30_000,
    }),
  );

  const {
    data: threads = [],
    refetch,
    isFetching,
    isRefetching,
  } = threadsQuery;

  const isRefreshing = isFetching || isRefetching;

  // ---------------- MAP THREADS → MAIL ITEMS ----------------
  useEffect(() => {
    const mapped: MailItem[] = threads.map((t: any) => {
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

      const labelIds: string[] = t.labelIds ?? [];
      const label = resolveLabel(labelIds);
      const isStarred = labelIds.includes("STARRED");

      return {
        id: t.id,
        label,
        isStarred,
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
    });

    setMailItems(mapped);
  }, [threads]);

  // ---------------- REPLY / FORWARD HELPERS ----------------
  const openReplyCompose = (mail: MailItem) => {
    const to = mail.fromEmail || mail.from;
    const subject = mail.subject.startsWith("Re:")
      ? mail.subject
      : `Re: ${mail.subject}`;

    const headerLine = `On ${mail.receivedAtFull}, ${
      mail.fromEmail || mail.from
    } wrote:\n> `;

    setComposeInitial({
      to,
      subject,
      body: `\n\n${headerLine}`,
      threadId: mail.id, // reply stays in same thread
    });
    setIsComposeOpen(true);
  };

  // Helper to fetch the *last message* in a thread (HTML / text / from / date)
  const fetchLastMessageContent = async (threadId: string) => {
    try {
      const opts = trpc.gmail.getThreadDetail.queryOptions({ threadId });
      const res = await queryClient.fetchQuery(opts);

      const conversation = res?.conversation ?? [];
      const last = conversation[conversation.length - 1];

      if (!last) {
        return {
          html: "",
          text: "",
          from: "",
          date: "",
        };
      }

      return {
        html: last.html ?? "",
        text: last.text ?? "",
        from: last.from ?? "",
        date: last.date ?? "",
      };
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Failed to fetch last message for forward:", err);
      return { html: "", text: "", from: "", date: "" };
    }
  };

  const openForwardCompose = async (mail: MailItem) => {
    const subject = mail.subject.startsWith("Fwd:")
      ? mail.subject
      : `Fwd: ${mail.subject}`;

    // 1. Fetch last message content for this thread
    const last = await fetchLastMessageContent(mail.id);

    // 2. Build Gmail-style forwarded header
    const header = [
      "---------- Forwarded message ----------",
      `From: ${last.from || mail.from}${
        mail.fromEmail ? ` <${mail.fromEmail}>` : ""
      }`,
      `Date: ${last.date || mail.receivedAtFull}`,
      `Subject: ${mail.subject}`,
      "",
    ].join("\n");

    // 3. Append message body (HTML or text)
    let body = `\n\n${header}`;
    if (last.html) {
      body += last.html;
    } else if (last.text) {
      body += last.text;
    } else {
      body += mail.snippet || "(no content)";
    }

    setComposeInitial({
      to: "",
      subject,
      body,
      // Forward should usually start a *new* conversation, so omit threadId
      threadId: undefined,
    });
    setIsComposeOpen(true);
  };

  // ---------------- TOGGLE STAR HANDLER ----------------
  const handleToggleStar = async (id: string, nextStarred: boolean) => {
    setMailItems((prev) =>
      prev.map((m) =>
        m.id === id ? { ...m, isStarred: nextStarred } : m,
      ),
    );

    try {
      await toggleStarMutation.mutateAsync({
        threadId: id,
        starred: nextStarred,
      });
    } catch {
      // revert on error
      setMailItems((prev) =>
        prev.map((m) =>
          m.id === id ? { ...m, isStarred: !nextStarred } : m,
        ),
      );
    }
  };

  // ---------------- SEARCH + FILTER ----------------
  const filteredEmails = useMemo(() => {
    return mailItems.filter((mail) => {
      const q = search.toLowerCase();

      if (activeLabel === "STARRED") {
        if (!mail.isStarred) return false;
        if (mail.label === "TRASH") return false;
      } else if (activeLabel === "SENT") {
        if (mail.label !== "SENT") return false;
      } else if (activeLabel === "DRAFTS") {
        if (mail.label !== "DRAFTS") return false;
      } else if (activeLabel === "TRASH") {
        if (mail.label !== "TRASH") return false;
      } else {
        if (mail.label !== "INBOX") return false;
      }

      if (!q) return true;

      return (
        mail.subject.toLowerCase().includes(q) ||
        mail.from.toLowerCase().includes(q) ||
        mail.snippet.toLowerCase().includes(q)
      );
    });
  }, [search, activeLabel, mailItems]);

  useEffect(() => {
    setPage(1);
    setSelectedId(null);
    setViewMode("list");
  }, [search, activeLabel]);

  // ---------------- PAGINATION ----------------
  const totalEmails = filteredEmails.length;
  const totalPages = Math.max(1, Math.ceil(totalEmails / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);

  const pagedEmails = filteredEmails.slice(
    (currentPage - 1) * PAGE_SIZE,
    (currentPage - 1) * PAGE_SIZE + PAGE_SIZE,
  );

  const selectedMail =
    filteredEmails.find((m) => m.id === selectedId) ?? null;

  const unreadInboxCount = useMemo(
    () =>
      mailItems.filter((m) => m.label === "INBOX" && m.unread).length,
    [mailItems],
  );

  // ---------------- RENDER ----------------
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
              onCompose={() => {
                setComposeInitial(null);
                setIsComposeOpen(true);
              }}
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
                onToggleStar={handleToggleStar}
                onRefresh={() => refetch()}
                isRefreshing={isRefreshing}
              />
            )}

            {viewMode === "detail" && (
              <MailDetail
                email={selectedMail}
                onBack={() => setViewMode("list")}
                onReply={() =>
                  selectedMail && openReplyCompose(selectedMail)
                }
                onForward={() =>
                  selectedMail && openForwardCompose(selectedMail)
                }
              />
            )}
          </div>
        </div>
      </div>

      {/* COMPOSE MODAL */}
      <MailComposeModal
        open={isComposeOpen}
        onClose={() => {
          setIsComposeOpen(false);
          setComposeInitial(null);
        }}
        initialTo={composeInitial?.to}
        initialSubject={composeInitial?.subject}
        initialBody={composeInitial?.body}
        onSend={async (payload) => {
          await sendEmail.mutateAsync({
            ...payload,
            threadId: composeInitial?.threadId,
          });
          setIsComposeOpen(false);
          setComposeInitial(null);
          await refetch(); // so reply/forward shows up in the list
        }}
      />
    </div>
  );
}
