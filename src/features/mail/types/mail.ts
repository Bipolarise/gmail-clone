// src/features/mail/types/mail.ts

export type MailLabel = "INBOX" | "STARRED" | "SENT" | "DRAFTS" | "TRASH";

export type MailItem = {
  id: string;
  label: MailLabel;

  // sender info
  from: string;
  fromEmail: string;

  subject: string;
  snippet: string;
  body: string;

  // timestamps
  receivedAt: Date;
  receivedAtTime: string;
  receivedAtFull: string;

  unread: boolean;

  // Gmail-starred or not
  isStarred: boolean;
};

export const MOCK_MAIL_ITEMS: MailItem[] = [
  {
    id: "1",
    label: "INBOX",
    isStarred: true,
    from: "Lyra Hiring",
    fromEmail: "careers@lyra.com",
    subject: "Gmail task – next steps & expectations",
    snippet:
      "Hi Jonathan, thanks again for taking the time to complete the task...",
    body: `Hey Jonathan,

Thanks again for taking the time to work on the Gmail task.
We're excited to see what you build!

Best,
Lyra Hiring Team`,
    receivedAt: new Date("2025-12-04T10:24:00"),
    receivedAtTime: "10:24 AM",
    receivedAtFull: "Dec 4, 2025, 10:24 AM",
    unread: false,
  },
  {
    id: "2",
    label: "INBOX",
    isStarred: false,
    from: "Google",
    fromEmail: "no-reply@google.com",
    subject: "Security alert – new sign-in from Chrome on macOS",
    snippet:
      "We noticed a new sign-in to your Google Account on a Mac device...",
    body: `Hi Jonathan,

We noticed a new sign-in to your Google Account from Chrome on macOS.

If this was you, you can ignore this email.

Thanks,
Google Account Security`,
    receivedAt: new Date("2025-12-04T09:03:00"),
    receivedAtTime: "9:03 AM",
    receivedAtFull: "Dec 4, 2025, 9:03 AM",
    unread: true,
  },
  {
    id: "3",
    label: "DRAFTS",
    isStarred: false,
    from: "Jonathan Liu",
    fromEmail: "jonathanliu023@gmail.com",
    subject: "(Draft) Reply to Lyra",
    snippet: "Hi Lyra team, thanks again for the opportunity...",
    body: `Hi Lyra team,

Thanks again for the opportunity. Here's some more detail on my approach...

Best,
Jonathan`,
    receivedAt: new Date("2025-12-03T21:15:00"),
    receivedAtTime: "9:15 PM",
    receivedAtFull: "Dec 3, 2025, 9:15 PM",
    unread: false,
  },
];
