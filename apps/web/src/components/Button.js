"use client";

import Link from "next/link";
import { forwardRef } from "react";
import clsx from "clsx";

/**
 * Shared Button component. Token-aware, works in light and dark mode.
 *
 * Variants:
 * - primary   — solid brand. Main CTA of a surface.
 * - secondary — outlined brand. Alternative action next to primary.
 * - ghost     — no border, subtle hover. For tertiary actions or nav-like links.
 * - danger    — solid red. Destructive actions (delete, discard).
 *
 * Pass `href` to render as a Next.js Link, otherwise renders as <button>.
 * Both support `disabled`, `loading`, `fullWidth`, and a leading/trailing icon slot.
 */

const BASE =
  "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 " +
  "focus-visible:ring-brand-700 focus-visible:ring-offset-background " +
  "disabled:cursor-not-allowed disabled:opacity-60";

const SIZES = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2 text-sm",
  lg: "px-5 py-3 text-base",
};

const VARIANTS = {
  primary:
    "bg-brand-700 text-white hover:brightness-110 active:brightness-95",
  // text-foreground (not text-brand-700) because brand-700 in dark mode is
  // #3d5a30 which fails 4.5:1 on dark backgrounds. Foreground stays readable
  // in both themes via the :root/.dark cascade.
  secondary:
    "border border-brand-700 text-foreground bg-transparent hover:bg-brand-700/10 active:bg-brand-700/15",
  ghost:
    "text-foreground bg-transparent hover:bg-surface-muted active:bg-surface-muted/70",
  danger:
    "bg-danger text-white hover:brightness-110 active:brightness-95",
};

const Button = forwardRef(function Button(
  {
    variant = "primary",
    size = "md",
    href,
    type = "button",
    disabled = false,
    loading = false,
    fullWidth = false,
    leadingIcon = null,
    trailingIcon = null,
    className = "",
    children,
    ...rest
  },
  ref,
) {
  const classes = clsx(
    BASE,
    SIZES[size],
    VARIANTS[variant],
    fullWidth && "w-full",
    className,
  );

  const content = (
    <>
      {loading ? (
        <span
          aria-hidden="true"
          className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
      ) : leadingIcon ? (
        <span aria-hidden="true">{leadingIcon}</span>
      ) : null}
      <span>{children}</span>
      {!loading && trailingIcon ? (
        <span aria-hidden="true">{trailingIcon}</span>
      ) : null}
    </>
  );

  if (href && !disabled) {
    return (
      <Link ref={ref} href={href} className={classes} {...rest}>
        {content}
      </Link>
    );
  }

  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={classes}
      {...rest}
    >
      {content}
    </button>
  );
});

export default Button;
