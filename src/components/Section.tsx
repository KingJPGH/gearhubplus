import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/** Collapsible titled section used across the app to keep pages tidy. */
export function Section({
  title,
  icon,
  count,
  defaultOpen = false,
  strip = "head-strip",
  children,
}: {
  title: string;
  icon?: ReactNode;
  count?: ReactNode;
  defaultOpen?: boolean;
  strip?: "head-strip" | "head-strip-2";
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={cn(
          "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left transition-colors hover:brightness-105",
          strip,
        )}
      >
        {icon}
        <span className="label-tech">{title}</span>
        {count !== undefined && count !== null ? (
          <span className="label-tech ml-auto">{count}</span>
        ) : (
          <span className="ml-auto" />
        )}
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
        />
      </button>
      {open ? <div className="mt-2">{children}</div> : null}
    </div>
  );
}
