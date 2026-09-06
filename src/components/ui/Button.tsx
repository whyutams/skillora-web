import * as React from "react";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "danger" | "ghost" | "sage";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className = "",
      variant = "primary",
      size = "md",
      isLoading = false,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    // Anti-AI style: tegas rounded-lg, crisp subtle border, controlled micro-interactions
    const baseStyles =
      "inline-flex items-center justify-center font-medium rounded-lg transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400 dark:focus-visible:ring-stone-600 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]";

    const sizeStyles = {
      sm: "text-xs px-3 py-1.5 gap-1.5",
      md: "text-sm px-4 py-2 gap-2",
      lg: "text-base px-5 py-2.5 gap-2.5",
    }[size];

    const variantStyles = {
      // Primary: Deep Pine (#0F3E2E) with clean text and subtle border
      primary:
        "bg-[#0F3E2E] hover:bg-[#16533e] text-white border border-[#1d5849]/50 shadow-sm",
      // Secondary: Stone neutral with subtle border
      secondary:
        "bg-stone-100 hover:bg-stone-200 dark:bg-stone-800/80 dark:hover:bg-stone-700/80 text-stone-900 dark:text-stone-100 border border-stone-200/80 dark:border-stone-700/80",
      // Outline: clean minimal border
      outline:
        "border border-stone-300 dark:border-stone-700 hover:bg-stone-100/60 dark:hover:bg-stone-800/60 text-stone-800 dark:text-stone-200",
      // Danger: muted crimson
      danger:
        "bg-rose-600 hover:bg-rose-700 text-white border border-rose-700/50 shadow-sm",
      // Ghost: transparent with hover fill
      ghost:
        "hover:bg-stone-100 dark:hover:bg-stone-800/70 text-stone-700 dark:text-stone-300",
      // Sage: Muted Sage / Mint Halus accent button
      sage:
        "bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-800 dark:text-emerald-300 border border-emerald-600/30 dark:border-emerald-500/30",
    }[variant];

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={`${baseStyles} ${sizeStyles} ${variantStyles} ${className}`}
        {...props}
      >
        {isLoading && (
          <svg
            className="animate-spin -ml-1 mr-2 h-4 w-4 text-current"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v8H4z"
            />
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
