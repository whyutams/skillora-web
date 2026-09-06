import * as React from "react";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?:
    | "pending"
    | "approved"
    | "rejected"
    | "price"
    | "neutral"
    | "role-admin"
    | "role-superadmin"
    | "role-student";
}

export function Badge({
  className = "",
  variant = "neutral",
  children,
  ...props
}: BadgeProps) {
  const baseStyles =
    "inline-flex items-center text-xs font-semibold px-2.5 py-0.5 rounded-md border tracking-wide transition-colors";

  const variantStyles = {
    pending:
      "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30",
    approved:
      "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
    rejected:
      "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30",
    price:
      "bg-[#0F3E2E]/10 dark:bg-emerald-950/40 text-[#0F3E2E] dark:text-emerald-300 border-[#0F3E2E]/20 dark:border-emerald-500/30 font-medium",
    neutral:
      "bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-700",
    "role-student":
      "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30",
    "role-admin":
      "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30",
    "role-superadmin":
      "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/40 font-bold",
  }[variant];

  return (
    <span className={`${baseStyles} ${variantStyles} ${className}`} {...props}>
      {children}
    </span>
  );
}
