"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { fetchApi } from "@/lib/api/api";
import WorkRequestForm from "@/components/WorkRequestForm";

export default function ReqPage() {
  const router = useRouter();
  const [currentEmployeeName, setCurrentEmployeeName] = useState("");
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const me = await fetchApi("/auth/me", { cache: "no-store" });
        if (active) {
          setCurrentEmployeeName(me?.name || "");
        }
      } catch (err) {
        if (active) {
          setLoadError(
            err?.message || "Failed to load the signed-in employee.",
          );
        }
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  async function handleCreate(formData) {
    await fetchApi("/reqs", {
      method: "POST",
      body: formData,
    });
    router.push("/tasks?created=1");
  }

  function handleCancel() {
    router.back();
  }

  return (
    <>
      <section className="mb-6 rounded-card border border-border-soft bg-surface p-6 shadow-soft">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="w-fit rounded-full bg-surface-muted px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-foreground">
              Request Intake
            </div>
            <h2 className="mt-4 text-2xl font-black tracking-tight text-foreground">
              Create Work Request
            </h2>
            <p className="theme-copy mt-2 max-w-2xl text-sm leading-6">
              Capture the core request details first, then add plant and staging
              information if needed.
            </p>
          </div>

          <div className="min-w-[220px] rounded-2xl border border-border-soft bg-surface-warm px-4 py-4">
            <div className="text-xs font-bold uppercase tracking-[0.18em] text-muted">
              Reference Number
            </div>
            <div className="mt-2 text-base font-semibold text-foreground">
              Assigned on save
            </div>
            <div className="mt-1 text-sm text-muted">
              Format: WR-{new Date().getFullYear()}-NNNN
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-card border border-border-soft bg-surface p-6 shadow-soft">
        {loadError ? (
          <p
            role="alert"
            className="mb-4 rounded-xl border border-danger-border bg-danger-soft px-4 py-3 text-sm font-medium text-danger"
          >
            {loadError}
          </p>
        ) : null}
        <WorkRequestForm
          mode="create"
          currentEmployeeName={currentEmployeeName}
          onSubmit={handleCreate}
          onCancel={handleCancel}
          submitLabel="Submit REQ"
        />
      </section>
    </>
  );
}
