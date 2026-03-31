"use client";

export default function WorkspaceToolbar({ left, right, className = "" }) {
  return (
    <div
      className={`mb-5 flex flex-col gap-3 rounded-2xl border border-border-soft bg-surface-warm p-3 md:flex-row md:items-center md:justify-between ${className}`.trim()}
    >
      <div className="flex flex-wrap items-center gap-2">{left}</div>
      <div className="flex flex-wrap items-center gap-2">{right}</div>
    </div>
  );
}
