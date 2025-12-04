import Link from "next/link";

import { MailApp } from "~/features/mail/components/MailApp";
import { auth } from "~/server/auth";

export async function HomePageContent() {
  const session = await auth();

  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center gap-4">
        <div className="text-center">
          <p className="text-xl text-gray-200">
            Sign in with Google to view your Gmail workspace
          </p>
          <p className="text-sm text-gray-400 mt-1">
            (Right now this UI uses mock emails while we build syncing.)
          </p>
        </div>

        <Link
          href="/api/auth/signin"
          className="rounded-full bg-gradient-to-r from-[hsl(280,100%,70%)] to-[hsl(240,100%,70%)] px-8 py-3 font-semibold text-white no-underline transition-all duration-200 hover:scale-105 hover:shadow-lg"
        >
          Sign in with Google
        </Link>
      </div>
    );
  }

  return <MailApp session={session} />;
}
