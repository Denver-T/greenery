"use client";

export default function WorkspaceHeader({
  eyebrow,
  title,
  description,
  stats = [],
  actions = null,
}) {
  return (
    <section className="rounded-card border border-border-soft bg-surface p-6 shadow-soft">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          {eyebrow ? (
            <div className="w-fit rounded-full bg-surface-muted px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-foreground">
              {eyebrow}
            </div>
          ) : null}
          <h2 className="mt-4 text-2xl font-black tracking-tight text-foreground">{title}</h2>
          {description ? (
            <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600 dark:text-[#bcc2cb]">{description}</p>
          ) : null}
        </div>

        {actions || stats.length > 0 ? (
          <div className="min-w-[220px] rounded-2xl border border-border-soft bg-surface-warm px-4 py-4">
            {actions ? (
              actions
            ) : (
              <div className="space-y-1 text-sm text-gray-600 dark:text-[#bcc2cb]">
                {stats.map((item) => (
                  <div key={item.label}>
                    <span className="font-semibold text-foreground">{item.value}</span> {item.label}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : null}
      </div>
    </section>
  );
}
