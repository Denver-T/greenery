"use client";

/**
 * Decorative dropdown chevron for native <select> elements that have
 * `appearance-none` applied. Pair with a `relative` wrapper div around
 * the select.
 *
 * Uses `currentColor` on the stroke + `text-muted` class so the chevron
 * inherits the muted token in both light and dark mode automatically.
 *
 *   <div className="relative">
 *     <select className="appearance-none ... pr-10">…</select>
 *     <SelectChevron />
 *   </div>
 *
 * `pointer-events-none` so a click on the chevron passes through to the
 * select and opens the dropdown.
 * `aria-hidden` because the chevron is decorative — the select itself
 * already announces "combobox" to screen readers.
 */
export default function SelectChevron() {
  return (
    <svg
      className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-muted"
      width="12"
      height="8"
      viewBox="0 0 12 8"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="1 1 6 6 11 1" />
    </svg>
  );
}
