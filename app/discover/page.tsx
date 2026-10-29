import { Suspense } from "react";
import { DiscoverFlow } from "@/components/discover-flow";

export default function DiscoverPage() {
  return (
    <Suspense fallback={<p className="px-5 text-sm text-muted">Opening discovery...</p>}>
      <DiscoverFlow />
    </Suspense>
  );
}
