"use client";

import { useEffect, useMemo, useState } from "react";

import WorkspaceHeader from "@/components/WorkspaceHeader";
import WorkspaceToolbar from "@/components/WorkspaceToolbar";
import { fetchApi } from "@/lib/api/api";
import { sanitizeObjectStrings } from "@/lib/inputSafety";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

const PLANT_LIMITS = {
  name: 100,
  imageUrl: 500,
};

const INVENTORY_FORM_DEFAULTS = {
  name: "",
  quantity: "1",
  costPerUnit: "",
  imageUrl: "",
  imageFile: null,
  imagePreview: "",
};

function formatCurrency(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) {
    return "Cost not set";
  }

  return amount.toLocaleString("en-CA", {
    style: "currency",
    currency: "CAD",
    minimumFractionDigits: 2,
  });
}

function getPlantImage(plant) {
  if (plant?.image_url) {
    if (/^https?:\/\//i.test(plant.image_url)) {
      return plant.image_url;
    }

    return `${API_BASE}${plant.image_url}`;
  }

  const name = encodeURIComponent(plant?.name || "plant");
  return `https://placehold.co/600x420/f3efe2/1f3427?text=${name}`;
}

function StatTile({ label, value }) {
  return (
    <div className="rounded-[22px] border border-[#e2dac8] bg-white px-4 py-4 dark:border-border-soft dark:bg-surface">
      <div className="text-xs font-bold uppercase tracking-[0.16em] text-gray-500">
        {label}
      </div>
      <div className="mt-2 text-lg font-black text-[#1f3427] dark:text-foreground">
        {value}
      </div>
    </div>
  );
}

function Kpi({ label, value, tone = "default" }) {
  const toneClasses =
    tone === "danger"
      ? "theme-panel-muted border-red-200"
      : tone === "accent"
        ? "theme-panel-muted border-emerald-200"
        : "theme-panel border-border-soft";

  return (
    <div className={`rounded-card border p-5 shadow-soft ${toneClasses}`}>
      <div className="text-sm font-medium text-muted">{label}</div>
      <div className="mt-1 text-2xl md:text-3xl font-black tracking-tight text-foreground">
        {value}
      </div>
    </div>
  );
}

export default function InventoryPage() {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [plants, setPlants] = useState([]);
  const [reqs, setReqs] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedPlant, setSelectedPlant] = useState(null);
  const [editingPlant, setEditingPlant] = useState(null);
  const [plantForm, setPlantForm] = useState(INVENTORY_FORM_DEFAULTS);
  const [formErrors, setFormErrors] = useState({});
  const [deletePlantCandidate, setDeletePlantCandidate] = useState(null);

  async function loadInventorySurface() {
    setLoading(true);
    setError("");

    try {
      const [plantsData, reqsData] = await Promise.all([
        fetchApi("/plants", { cache: "no-store" }),
        fetchApi("/reqs", { cache: "no-store" }),
      ]);

      setPlants(
        Array.isArray(plantsData) ? plantsData : plantsData?.data || [],
      );
      setReqs(Array.isArray(reqsData) ? reqsData : reqsData?.data || []);
    } catch (err) {
      setError(err?.message || "Failed to load inventory workspace.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadInventorySurface();
  }, []);

  const lowStockCount = useMemo(
    () => plants.filter((plant) => Number(plant.quantity || 0) <= 2).length,
    [plants],
  );

  const totalInventoryValue = useMemo(
    () =>
      plants.reduce((sum, plant) => {
        const quantity = Number(plant.quantity || 0);
        const cost = Number(plant.cost_per_unit || 0);
        return sum + quantity * cost;
      }, 0),
    [plants],
  );

  const topRequestedPlants = useMemo(() => {
    const counts = new Map();

    reqs.forEach((req) => {
      const plantName = String(req.plantWanted || "").trim();
      if (
        !plantName ||
        req.status === "completed" ||
        req.status === "cancelled"
      ) {
        return;
      }
      counts.set(plantName, (counts.get(plantName) || 0) + 1);
    });

    return Array.from(counts.entries())
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [reqs]);

  function resetForm() {
    setPlantForm(INVENTORY_FORM_DEFAULTS);
    setFormErrors({});
  }

  function updateFormField(key, value) {
    if (key === "imageFile") {
      setPlantForm((current) => ({
        ...current,
        imageFile: value,
        imagePreview: value ? URL.createObjectURL(value) : "",
      }));
      return;
    }

    setPlantForm((current) => ({ ...current, [key]: value }));
  }

  function openCreateModal() {
    resetForm();
    setShowCreateModal(true);
  }

  function openEditPlant(plant) {
    setFormErrors({});
    setEditingPlant(plant);
    setSelectedPlant(null);
    setPlantForm({
      name: plant?.name || "",
      quantity: String(plant?.quantity || 1),
      costPerUnit:
        plant?.cost_per_unit != null ? String(plant.cost_per_unit) : "",
      imageUrl: plant?.image_url || "",
      imageFile: null,
      imagePreview: "",
    });
  }

  function validatePlantForm() {
    const errors = {};
    const cleaned = sanitizeObjectStrings(
      {
        name: plantForm.name,
        imageUrl: plantForm.imageUrl,
      },
      {
        name: { maxLength: PLANT_LIMITS.name },
        imageUrl: { maxLength: PLANT_LIMITS.imageUrl },
      },
    );

    const quantity = Number.parseInt(String(plantForm.quantity || "1"), 10);
    const rawCost = String(plantForm.costPerUnit || "").trim();

    if (!cleaned.name) {
      errors.name = "Plant name is required.";
    }

    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 500) {
      errors.quantity = "Quantity must be between 1 and 500.";
    }

    if (
      cleaned.imageUrl &&
      !/^https?:\/\/.+/i.test(cleaned.imageUrl) &&
      !cleaned.imageUrl.startsWith("/uploads/")
    ) {
      errors.imageUrl = "Image URL must start with http:// or https://";
    }

    if (rawCost) {
      const parsedCost = Number.parseFloat(rawCost);
      if (
        !Number.isFinite(parsedCost) ||
        parsedCost < 0 ||
        parsedCost > 100000
      ) {
        errors.costPerUnit = "Cost must be between 0 and 100000.";
      }
    }

    return {
      errors,
      payload: {
        name: cleaned.name,
        quantity,
        costPerUnit: rawCost ? Number.parseFloat(rawCost).toFixed(2) : null,
        imageUrl: cleaned.imageUrl || null,
        imageFile: plantForm.imageFile || null,
      },
    };
  }

  function buildPlantRequestBody(payload) {
    if (!payload.imageFile) {
      return payload;
    }

    const formData = new FormData();
    formData.append("name", payload.name);
    formData.append("quantity", String(payload.quantity));
    if (payload.costPerUnit !== null && payload.costPerUnit !== undefined) {
      formData.append("costPerUnit", String(payload.costPerUnit));
    }
    if (payload.imageUrl) {
      formData.append("imageUrl", payload.imageUrl);
    }
    formData.append("imageFile", payload.imageFile);
    return formData;
  }

  async function createPlant() {
    const { errors, payload } = validatePlantForm();
    setFormErrors(errors);

    if (Object.keys(errors).length > 0) {
      return;
    }

    setBusy(true);
    setError("");
    try {
      await fetchApi("/plants", {
        method: "POST",
        body: buildPlantRequestBody(payload),
      });
      setShowCreateModal(false);
      resetForm();
      await loadInventorySurface();
    } catch (err) {
      setError(err?.message || "Failed to add plant.");
    } finally {
      setBusy(false);
    }
  }

  async function savePlantEdit() {
    if (!editingPlant?.id) {
      return;
    }

    const { errors, payload } = validatePlantForm();
    setFormErrors(errors);

    if (Object.keys(errors).length > 0) {
      return;
    }

    setBusy(true);
    setError("");
    try {
      const response = await fetchApi(`/plants/${editingPlant.id}`, {
        method: "PUT",
        body: buildPlantRequestBody(payload),
      });
      setEditingPlant(null);
      setSelectedPlant(response || null);
      await loadInventorySurface();
    } catch (err) {
      setError(err?.message || "Failed to update plant.");
    } finally {
      setBusy(false);
    }
  }

  function requestDeletePlant(plant) {
    if (!plant?.id) return;
    setDeletePlantCandidate(plant);
  }

  async function confirmDeletePlant() {
    if (!deletePlantCandidate?.id) return;

    setBusy(true);
    setError("");
    try {
      await fetchApi(`/plants/${deletePlantCandidate.id}`, {
        method: "DELETE",
      });
      setDeletePlantCandidate(null);
      setSelectedPlant(null);
      setEditingPlant(null);
      await loadInventorySurface();
    } catch (err) {
      setError(err?.message || "Failed to delete plant.");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (
      !selectedPlant &&
      !editingPlant &&
      !showCreateModal &&
      !deletePlantCandidate
    )
      return;
    function handleEsc(e) {
      if (e.key === "Escape") {
        if (deletePlantCandidate) setDeletePlantCandidate(null);
        else if (showCreateModal) setShowCreateModal(false);
        else if (editingPlant) setEditingPlant(null);
        else if (selectedPlant) setSelectedPlant(null);
      }
    }
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [selectedPlant, editingPlant, showCreateModal, deletePlantCandidate]);

  return (
    <>
      <section className="space-y-6 p-6">
        <WorkspaceHeader
          eyebrow="Inventory Workspace"
          title="Inventory Storefront"
          description="Browse inventory like a visual catalog, open plant cards, and manage stock with a cleaner flow."
          stats={[
            { label: "plant types", value: plants.length },
            {
              label: "units on hand",
              value: plants.reduce(
                (sum, plant) => sum + Number(plant.quantity || 0),
                0,
              ),
            },
            { label: "low stock types", value: lowStockCount },
          ]}
        />

        <WorkspaceToolbar
          left={
            <>
              <span className="rounded-full bg-white px-3 py-2 text-sm font-semibold text-foreground shadow-soft">
                Limited release
              </span>
              <span className="text-sm text-gray-600 dark:text-muted">
                Open any plant card to see key info, edit it, or remove it from
                inventory.
              </span>
            </>
          }
          right={
            <div className="flex items-center gap-3">
              <button
                onClick={openCreateModal}
                className="rounded-2xl bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-800"
              >
                Add Plant
              </button>
              <button
                onClick={loadInventorySurface}
                className="rounded-2xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-800"
              >
                Refresh
              </button>
            </div>
          }
        />

        {error ? (
          <div className="rounded-card border border-red-200 bg-red-50 p-4 text-red-700 shadow-soft">
            {error}
          </div>
        ) : null}

        <section className="grid grid-cols-2 gap-4 md:gap-6 lg:grid-cols-3 [&>*:last-child]:col-span-2 lg:[&>*:last-child]:col-span-1">
          <Kpi
            label="Inventory value"
            value={formatCurrency(totalInventoryValue)}
            tone="accent"
          />
          <Kpi
            label="Low stock groups"
            value={String(lowStockCount)}
            tone={lowStockCount > 0 ? "danger" : "default"}
          />
          <Kpi
            label="Request pressure leaders"
            value={String(topRequestedPlants.length)}
          />
        </section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.45fr_0.8fr]">
          <div className="theme-panel rounded-card border p-5 shadow-soft">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-black text-foreground">
                  Tracked plants
                </h2>
                <p className="mt-1 text-sm text-gray-600">
                  Current live rows from the plants table.
                </p>
              </div>
              <span className="rounded-full bg-surface-muted px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-foreground">
                Read only
              </span>
            </div>

            {loading ? (
              <p className="theme-copy text-sm">Loading inventory...</p>
            ) : plants.length === 0 ? (
              <p className="theme-copy text-sm">No plants are tracked yet.</p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {plants.map((plant) => (
                  <button
                    key={plant.id}
                    type="button"
                    onClick={() => setSelectedPlant(plant)}
                    className="group overflow-hidden rounded-[26px] border border-[#ded4bf] bg-white text-left shadow-soft transition duration-200 hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(31,52,39,0.18)] dark:border-border-soft dark:bg-surface"
                  >
                    <div className="relative h-36 md:h-44 overflow-hidden bg-[#ebe4cf] dark:bg-surface-muted">
                      <img
                        src={getPlantImage(plant)}
                        alt={plant.name}
                        className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                      />
                      <div className="absolute right-3 top-3 rounded-full bg-[#1f3427] px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-white">
                        {plant.quantity} in stock
                      </div>
                    </div>
                    <div className="space-y-3 p-4">
                      <div>
                        <div className="text-lg font-black tracking-tight text-[#1f3427] dark:text-foreground">
                          {plant.name}
                        </div>
                        <div className="mt-1 text-sm text-gray-600 dark:text-muted">
                          {formatCurrency(plant.cost_per_unit)}
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.14em] text-gray-500 dark:text-muted">
                        <span>View details</span>
                        <span>
                          {plant.created_at
                            ? String(plant.created_at).slice(0, 10)
                            : "recent"}
                        </span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-6">
            <section className="rounded-card border border-border-soft bg-surface p-5 shadow-soft">
              <h3 className="theme-title text-lg font-bold">Low stock watch</h3>
              {loading ? (
                <p className="theme-copy mt-4 text-sm">Loading low stock...</p>
              ) : plants.filter((plant) => Number(plant.quantity || 0) <= 2)
                  .length === 0 ? (
                <p className="theme-copy mt-4 text-sm">
                  No low-stock plant groups right now.
                </p>
              ) : (
                <div className="mt-4 space-y-3">
                  {plants
                    .filter((plant) => Number(plant.quantity || 0) <= 2)
                    .slice(0, 5)
                    .map((plant) => (
                      <button
                        key={plant.id}
                        type="button"
                        onClick={() => setSelectedPlant(plant)}
                        className="flex w-full items-center justify-between rounded-2xl border border-border-soft bg-surface px-4 py-3 text-left hover:bg-surface-muted"
                      >
                        <div>
                          <div className="font-semibold text-foreground">
                            {plant.name}
                          </div>
                          <div className="text-sm text-muted">
                            {formatCurrency(plant.cost_per_unit)}
                          </div>
                        </div>
                        <div className="text-sm font-bold text-red-600">
                          {plant.quantity} left
                        </div>
                      </button>
                    ))}
                </div>
              )}
            </section>

            <section className="rounded-card border border-border-soft bg-surface p-5 shadow-soft">
              <h3 className="theme-title text-lg font-bold">
                Most requested plants
              </h3>
              {topRequestedPlants.length === 0 ? (
                <p className="theme-copy mt-4 text-sm">
                  No plant demand is showing up yet.
                </p>
              ) : (
                <div className="mt-4 space-y-3">
                  {topRequestedPlants.map((item) => (
                    <div
                      key={item.label}
                      className="theme-panel rounded-2xl border px-4 py-3"
                    >
                      <div className="theme-title font-semibold">
                        {item.label}
                      </div>
                      <div className="theme-copy mt-1 text-sm">
                        Mentioned in {item.value} open req
                        {item.value === 1 ? "" : "s"}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </section>
      </section>

      {showCreateModal ? (
        <AddInventoryModal
          form={plantForm}
          formErrors={formErrors}
          busy={busy}
          onChange={updateFormField}
          onClose={() => {
            setShowCreateModal(false);
            resetForm();
          }}
          onSave={createPlant}
        />
      ) : null}

      {selectedPlant ? (
        <InventoryModal
          plant={selectedPlant}
          mode="view"
          form={plantForm}
          formErrors={formErrors}
          busy={busy}
          onChange={updateFormField}
          onClose={() => setSelectedPlant(null)}
          onSave={() => openEditPlant(selectedPlant)}
          onDelete={() => requestDeletePlant(selectedPlant)}
        />
      ) : null}

      {editingPlant ? (
        <InventoryModal
          plant={editingPlant}
          mode="edit"
          form={plantForm}
          formErrors={formErrors}
          busy={busy}
          onChange={updateFormField}
          onClose={() => {
            setEditingPlant(null);
            resetForm();
          }}
          onSave={savePlantEdit}
          onDelete={() => requestDeletePlant(editingPlant)}
        />
      ) : null}

      {deletePlantCandidate ? (
        <div
          data-testid="plant-delete-modal"
          className="fixed inset-0 z-[80] grid place-items-center bg-black/50 p-6"
          onClick={() => setDeletePlantCandidate(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="plant-delete-title"
            className="w-full max-w-lg rounded-2xl border border-border-soft bg-surface p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="rounded-full bg-red-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-red-700 w-fit">
              Confirm Deletion
            </div>
            <h3
              id="plant-delete-title"
              className="mt-4 text-2xl font-black tracking-tight text-foreground"
            >
              Delete this plant from inventory?
            </h3>
            <p className="theme-copy mt-3 text-sm leading-6">
              You are about to remove{" "}
              <span className="font-semibold text-foreground">
                {deletePlantCandidate.name || "this plant"}
              </span>
              . This removes the full grouped item including all units and
              cannot be undone.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setDeletePlantCandidate(null)}
                disabled={busy}
                className="theme-panel-muted theme-title rounded-2xl border px-4 py-2 text-sm font-bold disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeletePlant}
                disabled={busy}
                className="rounded-2xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-bold text-red-700 hover:bg-red-100 disabled:opacity-60"
              >
                {busy ? "Deleting..." : "Delete Plant"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function InventoryModal({
  plant,
  mode,
  form,
  formErrors,
  busy,
  onChange,
  onClose,
  onSave,
  onDelete,
}) {
  const isEdit = mode === "edit";
  const previewPlant = {
    ...(plant || {}),
    name: isEdit ? form.name : plant?.name,
    image_url: isEdit
      ? form.imagePreview || form.imageUrl || plant?.image_url
      : plant?.image_url,
  };

  return (
    <div
      className="fixed inset-0 z-70 grid place-items-center bg-black/45 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="inventory-modal-title"
        className="w-full max-w-4xl overflow-hidden rounded-4xl border border-border-soft bg-surface shadow-elevated-lg"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="grid max-h-[92vh] gap-0 overflow-y-auto md:grid-cols-[1.15fr_0.85fr]">
          <div className="relative min-h-70 bg-surface-muted">
            <img
              src={getPlantImage(previewPlant)}
              alt={
                isEdit ? form.name || "Plant preview" : plant?.name || "Plant"
              }
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-linear-to-t from-[#102218]/75 via-transparent to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
              <div className="w-fit rounded-full bg-white/20 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] backdrop-blur">
                Inventory Item
              </div>
              <h2
                id="inventory-modal-title"
                className="mt-3 text-3xl font-black tracking-tight"
              >
                {isEdit
                  ? form.name || "Plant name"
                  : plant?.name || "Unnamed plant"}
              </h2>
              <p className="mt-2 max-w-md text-sm text-white/85">
                {isEdit
                  ? "Update stock count, pricing, and display details for this grouped plant item."
                  : "Check stock, pricing, and open edit mode to manage this plant type."}
              </p>
            </div>
          </div>

          <div className="flex flex-col justify-between p-6">
            {isEdit ? (
              <div className="space-y-4">
                <div>
                  <div className="text-xs font-bold uppercase tracking-[0.18em] text-muted">
                    Edit Inventory Item
                  </div>
                  <div className="mt-2 text-sm text-muted">
                    Changes apply to this grouped plant type across the current
                    inventory batch.
                  </div>
                </div>

                <label className="grid gap-1.5">
                  <span className="text-sm font-semibold text-foreground">
                    Plant name
                  </span>
                  <input
                    value={form.name}
                    maxLength={PLANT_LIMITS.name}
                    onChange={(event) =>
                      onChange(
                        "name",
                        event.target.value.slice(0, PLANT_LIMITS.name),
                      )
                    }
                    className={`rounded-2xl border bg-white px-4 py-3 text-sm ${
                      formErrors.name ? "border-red-400" : "border-border-soft"
                    }`}
                    placeholder="Aglaonema Silver Bay"
                  />
                  {formErrors.name ? (
                    <span className="text-xs text-red-600">
                      {formErrors.name}
                    </span>
                  ) : null}
                </label>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="grid gap-1.5">
                    <span className="text-sm font-semibold text-foreground">
                      Cost per unit
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.costPerUnit}
                      onChange={(event) =>
                        onChange("costPerUnit", event.target.value)
                      }
                      className={`rounded-2xl border bg-white px-4 py-3 text-sm ${
                        formErrors.costPerUnit
                          ? "border-red-400"
                          : "border-border-soft"
                      }`}
                      placeholder="34.99"
                    />
                    {formErrors.costPerUnit ? (
                      <span className="text-xs text-red-600">
                        {formErrors.costPerUnit}
                      </span>
                    ) : null}
                  </label>

                  <label className="grid gap-1.5">
                    <span className="text-sm font-semibold text-foreground">
                      Units on hand
                    </span>
                    <input
                      type="number"
                      min="1"
                      max="500"
                      value={form.quantity}
                      onChange={(event) =>
                        onChange("quantity", event.target.value)
                      }
                      className={`rounded-2xl border bg-white px-4 py-3 text-sm ${
                        formErrors.quantity
                          ? "border-red-400"
                          : "border-border-soft"
                      }`}
                    />
                    {formErrors.quantity ? (
                      <span className="text-xs text-red-600">
                        {formErrors.quantity}
                      </span>
                    ) : (
                      <span className="text-xs text-muted">
                        Adjust the grouped stock count here.
                      </span>
                    )}
                  </label>
                </div>

                <label className="grid gap-1.5">
                  <span className="text-sm font-semibold text-foreground">
                    Image URL
                  </span>
                  <input
                    value={form.imageUrl}
                    maxLength={PLANT_LIMITS.imageUrl}
                    onChange={(event) =>
                      onChange(
                        "imageUrl",
                        event.target.value.slice(0, PLANT_LIMITS.imageUrl),
                      )
                    }
                    className={`rounded-2xl border bg-white px-4 py-3 text-sm ${
                      formErrors.imageUrl
                        ? "border-red-400"
                        : "border-border-soft"
                    }`}
                    placeholder="https://..."
                  />
                  {formErrors.imageUrl ? (
                    <span className="text-xs text-red-600">
                      {formErrors.imageUrl}
                    </span>
                  ) : (
                    <span className="text-xs text-muted">
                      Paste a URL or upload an image file below.
                    </span>
                  )}
                </label>

                <label className="grid gap-1.5">
                  <span className="text-sm font-semibold text-foreground">
                    Upload image
                  </span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/webp"
                    onChange={(event) =>
                      onChange("imageFile", event.target.files?.[0] || null)
                    }
                    className="rounded-2xl border border-border-soft bg-white px-4 py-3 text-sm"
                  />
                  <span className="text-xs text-muted">
                    JPEG, PNG, or WEBP up to 5MB.
                  </span>
                </label>
              </div>
            ) : (
              <div className="space-y-6">
                <div>
                  <div className="text-xs font-bold uppercase tracking-[0.18em] text-muted">
                    Inventory Snapshot
                  </div>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <StatTile
                      label="Units on hand"
                      value={String(plant?.quantity || 0)}
                    />
                    <StatTile
                      label="Cost per unit"
                      value={formatCurrency(plant?.cost_per_unit)}
                    />
                    <StatTile label="Plant id" value={`#${plant?.id ?? "-"}`} />
                    <StatTile
                      label="Last added"
                      value={
                        plant?.created_at
                          ? String(plant.created_at).slice(0, 10)
                          : "Unknown"
                      }
                    />
                  </div>
                </div>

                <div className="rounded-3xl border border-border-soft bg-surface-muted p-4">
                  <div className="text-sm font-semibold text-foreground">
                    Quick note
                  </div>
                  <p className="mt-2 text-sm leading-6 text-muted">
                    Use edit mode to update stock quantity, cost, or replace the
                    image with a direct upload.
                  </p>
                </div>
              </div>
            )}

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                onClick={onClose}
                className="w-full rounded-2xl border border-border-soft bg-white px-4 py-3 text-sm font-bold text-foreground hover:bg-surface-muted sm:flex-1"
              >
                Close
              </button>
              {isEdit ? (
                <button
                  onClick={onSave}
                  disabled={busy}
                  className="w-full rounded-2xl bg-brand-700 px-4 py-3 text-sm font-bold text-white hover:bg-brand-800 disabled:opacity-60 sm:flex-1"
                >
                  {busy ? "Saving..." : "Save Plant"}
                </button>
              ) : (
                <>
                  <button
                    onClick={onSave}
                    className="w-full rounded-2xl border border-border-soft bg-surface-muted px-4 py-3 text-sm font-bold text-foreground hover:bg-surface-warm sm:flex-1"
                  >
                    Edit
                  </button>
                  <button
                    onClick={onDelete}
                    disabled={busy}
                    className="w-full rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700 hover:bg-red-100 disabled:opacity-60 sm:flex-1"
                  >
                    Delete
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AddInventoryModal({
  form,
  formErrors,
  busy,
  onChange,
  onClose,
  onSave,
}) {
  const previewPlant = {
    name: form.name,
    image_url: form.imagePreview || form.imageUrl,
  };

  return (
    <div
      className="fixed inset-0 z-70 grid place-items-center bg-black/45 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-inventory-modal-title"
        className="w-full max-w-xl rounded-[30px] border border-border-soft bg-surface p-6 shadow-elevated-lg"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="theme-tag w-fit rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.16em]">
          Inventory
        </div>
        <h3
          id="add-inventory-modal-title"
          className="theme-title mt-4 text-3xl font-black tracking-tight"
        >
          Add New Plant Stock
        </h3>
        <p className="theme-copy mt-2 text-sm leading-6">
          Add a plant type, optional image, optional cost, and how many units
          are currently on hand.
        </p>

        <div className="mt-6 grid gap-4">
          <label className="grid gap-1.5">
            <span className="text-sm font-semibold text-foreground">
              Plant name
            </span>
            <input
              value={form.name}
              maxLength={PLANT_LIMITS.name}
              onChange={(event) =>
                onChange("name", event.target.value.slice(0, PLANT_LIMITS.name))
              }
              className={`rounded-2xl border bg-white px-4 py-3 text-sm ${
                formErrors.name ? "border-red-400" : "border-border-soft"
              }`}
              placeholder="Fiddle Leaf Fig"
            />
            {formErrors.name ? (
              <span className="text-xs text-red-600">{formErrors.name}</span>
            ) : null}
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-1.5">
              <span className="text-sm font-semibold text-foreground">
                Quantity
              </span>
              <input
                type="number"
                min="1"
                max="500"
                value={form.quantity}
                onChange={(event) => onChange("quantity", event.target.value)}
                className={`rounded-2xl border bg-white px-4 py-3 text-sm ${
                  formErrors.quantity ? "border-red-400" : "border-border-soft"
                }`}
                placeholder="6"
              />
              {formErrors.quantity ? (
                <span className="text-xs text-red-600">
                  {formErrors.quantity}
                </span>
              ) : null}
            </label>

            <label className="grid gap-1.5">
              <span className="text-sm font-semibold text-foreground">
                Cost per unit
              </span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.costPerUnit}
                onChange={(event) =>
                  onChange("costPerUnit", event.target.value)
                }
                className={`rounded-2xl border bg-white px-4 py-3 text-sm ${
                  formErrors.costPerUnit
                    ? "border-red-400"
                    : "border-border-soft"
                }`}
                placeholder="28.50"
              />
              {formErrors.costPerUnit ? (
                <span className="text-xs text-red-600">
                  {formErrors.costPerUnit}
                </span>
              ) : null}
            </label>
          </div>

          <label className="grid gap-1.5">
            <span className="text-sm font-semibold text-foreground">
              Image URL
            </span>
            <input
              value={form.imageUrl}
              maxLength={PLANT_LIMITS.imageUrl}
              onChange={(event) =>
                onChange(
                  "imageUrl",
                  event.target.value.slice(0, PLANT_LIMITS.imageUrl),
                )
              }
              className={`rounded-2xl border bg-white px-4 py-3 text-sm ${
                formErrors.imageUrl ? "border-red-400" : "border-border-soft"
              }`}
              placeholder="https://..."
            />
            {formErrors.imageUrl ? (
              <span className="text-xs text-red-600">
                {formErrors.imageUrl}
              </span>
            ) : null}
          </label>

          <label className="grid gap-1.5">
            <span className="text-sm font-semibold text-foreground">
              Upload image
            </span>
            <input
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp"
              onChange={(event) =>
                onChange("imageFile", event.target.files?.[0] || null)
              }
              className="rounded-2xl border border-border-soft bg-white px-4 py-3 text-sm"
            />
            <span className="text-xs text-muted">
              Use this if you do not have an image URL.
            </span>
          </label>

          <div className="overflow-hidden rounded-3xl border border-border-soft bg-surface-muted">
            <img
              src={getPlantImage(previewPlant)}
              alt={form.name || "Plant preview"}
              className="h-48 w-full object-cover"
            />
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button
            onClick={onClose}
            className="w-full rounded-2xl border border-border-soft bg-white px-4 py-3 text-sm font-bold text-foreground hover:bg-surface-muted sm:flex-1"
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            disabled={busy}
            className="w-full rounded-2xl bg-brand-700 px-4 py-3 text-sm font-bold text-white hover:bg-brand-800 disabled:opacity-60 sm:flex-1"
          >
            {busy ? "Saving..." : "Add to Inventory"}
          </button>
        </div>
      </div>
    </div>
  );
}
