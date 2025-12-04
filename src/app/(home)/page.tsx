import { Suspense } from "react";

import { LoadingSpinner } from "~/features/shared/components/LoadingSpinner";
import { HomePageContent } from "./_components/HomePageContent";

export default function Home() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <HomePageContent />
    </Suspense>
  );
}
