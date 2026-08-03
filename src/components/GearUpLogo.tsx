import { cn } from "@/lib/utils";

/** The "U" of GearUp, drawn as a stroke that curves back up into an arrowhead. */
export function ArrowU({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={cn("size-[1em]", className)}
    >
      <path d="M5 5v7a7 7 0 0 0 14 0V4" />
      <path d="M15.2 8.2 19 4l3.8 4.2" />
    </svg>
  );
}

export function GearUpLogo({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "font-display inline-flex items-baseline gap-[0.02em] text-base font-bold tracking-tight",
        className,
      )}
    >
      <span>Gear</span>
      <ArrowU className="translate-y-[0.09em] text-brand" />
      <span>p</span>
      <span className="sr-only">GearUp</span>
    </span>
  );
}
