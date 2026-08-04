"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // In production this would report to an error-tracking service.
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <Card className="flex max-w-sm flex-col items-center gap-3 text-center">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-negative/10 text-negative">
          <AlertTriangle size={20} />
        </div>
        <h2 className="font-display text-[19px] text-text-primary italic">Something went wrong</h2>
        <p className="text-[13px] text-text-secondary">
          {error.message || "An unexpected error occurred while loading this page."}
        </p>
        <Button variant="primary" size="sm" onClick={reset}>
          Try again
        </Button>
      </Card>
    </div>
  );
}
