import Link from "next/link";
import { Compass } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex max-w-sm flex-col items-center gap-3 rounded-2xl border border-border bg-surface-1 p-8 text-center">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-surface-2 text-text-secondary">
          <Compass size={20} />
        </div>
        <h1 className="font-display text-[20px] text-text-primary italic">Page not found</h1>
        <p className="text-[13px] text-text-secondary">
          This page doesn&apos;t exist, or the account you&apos;re looking for isn&apos;t one of yours.
        </p>
        <Link href="/dashboard" className="mt-1 rounded-lg bg-accent px-4 py-2 text-[13px] font-medium text-[#04150e]">
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
