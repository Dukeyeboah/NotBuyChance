"use client";

import { useEffect, useState } from "react";
import { DiscoveryPreviewCard } from "@/components/discovery-preview-card";
import { demoPreview, featuredPreview, type DiscoveryPreviewModel } from "@/lib/preview";
import { loadPeople } from "@/lib/storage";

export function HomePreview() {
  const [preview, setPreview] = useState<DiscoveryPreviewModel>(demoPreview);

  useEffect(() => {
    setPreview(featuredPreview(loadPeople()));
  }, []);

  return (
    <aside className="relative mx-auto w-full max-w-xl pt-4" aria-label={`A preview card for ${preview.name}`}>
      <DiscoveryPreviewCard preview={preview} />
      <p className="mt-3 text-center text-xs text-muted">{preview.caption}</p>
    </aside>
  );
}
