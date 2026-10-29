import { utilityIcons } from "@/lib/icons";
import type { DiscoveryPreviewModel } from "@/lib/preview";

export function DiscoveryPreviewCard({ preview }: { preview: DiscoveryPreviewModel }) {
  return (
    <div className="relative">
      <img
        src={utilityIcons.taste}
        alt=""
        className="sparkle pointer-events-none -left-2 top-8 h-4 w-4 object-contain"
      />
      <img
        src={utilityIcons.taste}
        alt=""
        className="sparkle pointer-events-none -right-1 bottom-20 h-3.5 w-3.5 object-contain"
        style={{ animationDelay: "0.7s" }}
      />
      <img
        src={utilityIcons.taste}
        alt=""
        className="sparkle pointer-events-none left-8 -bottom-2 h-3 w-3 object-contain"
        style={{ animationDelay: "1.3s" }}
      />
      <div className="relative rounded-[32px] border border-line bg-card p-6 shadow-[0_24px_60px_rgba(32,32,32,0.06)] sm:p-8">
        <img
          src={utilityIcons.gift}
          alt=""
          className="floaty pointer-events-none absolute -right-2 -top-4 h-9 w-9 object-contain"
        />
        <div className="flex items-center gap-2">
          <img src={utilityIcons.profile} alt="" className="h-8 w-8 object-contain" />
          <p className="text-sm text-muted">Discovering for</p>
        </div>
        <h2 className="mt-2 font-display text-5xl">{preview.name}</h2>
        {preview.interests.length ? (
          <>
            <p className="mt-6 text-sm text-muted">Interests</p>
            <ul className="mt-2 flex flex-wrap gap-2">
              {preview.interests.map((interest) => (
                <li
                  key={interest.label}
                  className="inline-flex items-center gap-1.5 rounded-full border border-line bg-ivory px-2.5 py-1 text-sm"
                >
                  <img src={interest.icon} alt="" className="h-[18px] w-[18px] object-contain" />
                  {interest.label}
                </li>
              ))}
            </ul>
          </>
        ) : null}
        <p className="mt-6 text-sm text-muted">Potential discoveries</p>
        <ul className="mt-3 space-y-3">
          {preview.discoveries.map((item) => (
            <li
              key={item.label}
              className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm ${item.tone || "tone-music"}`}
            >
              <img src={item.icon} alt="" className="h-5 w-5 shrink-0 object-contain" />
              <span>{item.label}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
