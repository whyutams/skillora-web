"use client";

import * as React from "react";
import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";
import { ShieldCheck } from "lucide-react";

interface TurnstileWidgetProps {
  onSuccess: (token: string) => void;
  onError?: (error: unknown) => void;
  onExpire?: () => void;
  className?: string;
}

export function TurnstileWidget({
  onSuccess,
  onError,
  onExpire,
  className = "",
}: TurnstileWidgetProps) {
  const [mounted, setMounted] = React.useState(false);
  const turnstileRef = React.useRef<TurnstileInstance>(null);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const siteKey =
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "1x00000000000000000000AA";

  if (!mounted) {
    return (
      <div className="h-[65px] flex items-center justify-center rounded-lg border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/40 text-stone-400 text-xs gap-2">
        <ShieldCheck className="w-4 h-4 text-emerald-600" />
        Memuat verifikasi keamanan...
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center justify-center my-2 ${className}`}>
      <Turnstile
        ref={turnstileRef}
        siteKey={siteKey}
        onSuccess={onSuccess}
        onError={onError}
        onExpire={onExpire}
        options={{
          theme: "auto",
          size: "normal",
        }}
      />
    </div>
  );
}
