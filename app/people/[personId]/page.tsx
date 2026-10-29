import { Suspense } from "react";
import { PersonScreen } from "@/components/person-screen";

export default function PersonPage() {
  return (
    <Suspense fallback={<p className="px-5 text-sm text-muted">Opening profile...</p>}>
      <PersonScreen />
    </Suspense>
  );
}
