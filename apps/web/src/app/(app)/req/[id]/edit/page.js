"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { fetchApi } from "@/lib/api/api";
import Button from "@/components/Button";
import WorkRequestForm from "@/components/WorkRequestForm";

export default function WorkRequestEditPage({ params }) {
  const { id } = use(params);
  const router = useRouter();

  const [initialValues, setInitialValues] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetchApi(`/reqs/${id}`);
      setInitialValues(response);
    } catch (err) {
      setError(err.message || "Failed to load this work request.");
      setInitialValues(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSave(formData, cleaned) {
    // The work_reqs API expects a JSON body for PUT (not multipart).
    // cleaned is the sanitized shape from WorkRequestForm; use it directly.
    const body = {
      ...cleaned,
      requestDate: formData.get("requestDate") || null,
      dueDate: formData.get("dueDate") || null,
      plantSize: formData.get("plantSize") || null,
      plantHeight: formData.get("plantHeight") || null,
      lighting: formData.get("lighting") || null,
      numberOfPlants: formData.get("numberOfPlants")
        ? Number(formData.get("numberOfPlants"))
        : null,
    };

    await fetchApi(`/reqs/${id}`, {
      method: "PUT",
      body,
    });
    router.push(`/req/${id}`);
  }

  function handleCancel() {
    router.push(`/req/${id}`);
  }

  return (
    <>
      <section className="mb-6 rounded-card border border-border-soft bg-surface p-6 shadow-soft">
        <div>
          <Link
            href={`/req/${id}`}
            className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.14em] text-muted hover:text-foreground"
          >
            ← Back to detail view
          </Link>
          <h2 className="mt-3 text-2xl font-black tracking-tight text-foreground">
            Edit Work Request
          </h2>
          <p className="theme-copy mt-2 max-w-2xl text-sm leading-6">
            Change any field below and save. Monday sync fires automatically
            on save — changes appear on the board within a couple seconds.
          </p>
        </div>
      </section>

      <section className="rounded-card border border-border-soft bg-surface p-6 shadow-soft">
        {loading ? (
          <EditLoadingState />
        ) : error ? (
          <EditErrorState message={error} onRetry={load} />
        ) : !initialValues ? (
          <EditNotFound />
        ) : (
          <WorkRequestForm
            mode="edit"
            initialValues={initialValues}
            onSubmit={handleSave}
            onCancel={handleCancel}
            submitLabel="Save Changes"
          />
        )}
      </section>
    </>
  );
}

function EditLoadingState() {
  return (
    <div role="status" aria-live="polite" className="animate-pulse space-y-4">
      <span className="sr-only">Loading work request…</span>
      <div className="h-4 w-1/3 rounded bg-border-soft/60" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i}>
            <div className="h-2 w-16 rounded bg-border-soft/60" />
            <div className="mt-2 h-10 rounded bg-border-soft/30" />
          </div>
        ))}
      </div>
    </div>
  );
}

function EditErrorState({ message, onRetry }) {
  return (
    <div
      role="alert"
      className="rounded-xl border border-danger-border bg-danger-soft p-6"
    >
      <div className="text-base font-black text-danger">
        Failed to load work request
      </div>
      <p className="mt-2 text-sm leading-6 text-danger">{message}</p>
      <div className="mt-4 flex items-center gap-3">
        <Button variant="secondary" size="md" onClick={onRetry}>
          Retry
        </Button>
        <Button href="/req/list" variant="ghost" size="md">
          Back to directory
        </Button>
      </div>
    </div>
  );
}

function EditNotFound() {
  return (
    <div className="rounded-xl border border-dashed border-border-soft bg-surface-warm p-10 text-center">
      <div className="theme-title text-lg font-black">Request not found</div>
      <p className="theme-copy mt-2 text-sm leading-6">
        This work request may have been deleted.
      </p>
      <div className="mt-4 flex justify-center">
        <Button href="/req/list" variant="primary" size="md">
          Back to directory
        </Button>
      </div>
    </div>
  );
}
