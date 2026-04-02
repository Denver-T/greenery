"use client";

import { useEffect, useMemo, useState } from "react";

import AppShell from "@/components/AppShell";
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
      <div className="mt-1 text-3xl font-black tracking-tight text-foreground">{value}</div>
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

  async function loadInventorySurface() {
    setLoading(true);
    setError("");

    try {
      const [plantsData, reqsData] = await Promise.all([
        fetchApi("/plants", { cache: "no-store" }),
        fetchApi("/reqs", { cache: "no-store" }),
      ]);

      setPlants(Array.isArray(plantsData) ? plantsData : plantsData?.data || []);
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
      if (!plantName || req.status === "completed" || req.status === "cancelled") {
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
      costPerUnit: plant?.cost_per_unit != null ? String(plant.cost_per_unit) : "",
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

    if (cleaned.imageUrl && !/^https?:\/\/.+/i.test(cleaned.imageUrl) && !cleaned.imageUrl.startsWith("/uploads/")) {
      errors.imageUrl = "Image URL must start with http:// or https://";
    }

    if (rawCost) {
      const parsedCost = Number.parseFloat(rawCost);
      if (!Number.isFinite(parsedCost) || parsedCost < 0 || parsedCost > 100000) {
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

  async function deletePlant(plant) {
    if (!plant?.id) {
      return;
    }

    if (!confirm(`Delete ${plant.name} from inventory? This removes the full grouped item.`)) {
      return;
    }

    setBusy(true);
    setError("");
    try {
      await fetchApi(`/plants/${plant.id}`, {
        method: "DELETE",
      });
      setSelectedPlant(null);
      setEditingPlant(null);
      await loadInventorySurface();
    } catch (err) {
      setError(err?.message || "Failed to delete plant.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell title="Inventory">
      <section className="space-y-6 p-6">
        <WorkspaceHeader
          eyebrow="Inventory Workspace"
          title="Inventory Storefront"
          description="Browse inventory like a visual catalog, open plant cards, and manage stock with a cleaner flow."
          stats={[
            { label: "plant types", value: plants.length },
            { label: "units on hand", value: plants.reduce((sum, plant) => sum + Number(plant.quantity || 0), 0) },
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
                Open any plant card to see key info, edit it, or remove it from inventory.
              </span>
            </>
          }
          right={
            <button
              onClick={loadInventorySurface}
              className="rounded-xl bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800"
            >
              Refresh
            </button>
          }
        />

        {error ? (
          <div className="rounded-card border border-red-200 bg-red-50 p-4 text-red-700 shadow-soft">
            {error}
          </div>
        ) : null}

        <section className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <Kpi label="Inventory value" value={formatCurrency(totalInventoryValue)} tone="accent" />
          <Kpi label="Low stock groups" value={String(lowStockCount)} tone={lowStockCount > 0 ? "danger" : "default"} />
          <Kpi label="Request pressure leaders" value={String(topRequestedPlants.length)} />
        </section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.45fr_0.8fr]">
          <div className="theme-panel rounded-card border p-5 shadow-soft">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-black text-foreground">Tracked plants</h2>
                <p className="mt-1 text-sm text-gray-600">Current live rows from the plants table.</p>
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
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {plants.map((plant) => (
                  <button
                    key={plant.id}
                    type="button"
                    onClick={() => setSelectedPlant(plant)}
                    className="group overflow-hidden rounded-[26px] border border-[#ded4bf] bg-white text-left shadow-soft transition duration-200 hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(31,52,39,0.18)] dark:border-border-soft dark:bg-surface"
                  >
                    <div className="relative h-44 overflow-hidden bg-[#ebe4cf] dark:bg-surface-muted">
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
                        <div className="text-lg font-black tracking-tight text-[#1f3427] dark:text-foreground">{plant.name}</div>
                        <div className="mt-1 text-sm text-gray-600 dark:text-muted">{formatCurrency(plant.cost_per_unit)}</div>
                      </div>
                      <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.14em] text-gray-500 dark:text-muted">
                        <span>View details</span>
                        <span>{plant.created_at ? String(plant.created_at).slice(0, 10) : "recent"}</span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-6">
            <section className="rounded-card border border-border-soft bg-surface p-5 shadow-soft">
              <h3 className="text-lg font-bold text-foreground">Plant load by location</h3>

              {loading ? (
                <p className="theme-copy mt-4 text-sm">Loading low stock...</p>
              ) : plants.filter((plant) => Number(plant.quantity || 0) <= 2).length === 0 ? (
                <p className="theme-copy mt-4 text-sm">No low-stock plant groups right now.</p>
              ) : (
                <div className="mt-4 space-y-3">
                  {locationLoad.map((item) => (
                    <div
                      key={item.label}
                      className="flex items-center justify-between rounded-xl border border-border-soft bg-surface px-4 py-3"
                    >
                      <div className="font-medium text-foreground">{item.label}</div>
                      <div className="text-sm font-semibold text-gray-600">
                        {item.value} plant{item.value === 1 ? "" : "s"}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-card border border-border-soft bg-surface p-5 shadow-soft">
              <h3 className="text-lg font-bold text-foreground">Plant-heavy requests</h3>
              {loading ? (
                <p className="mt-4 text-sm text-gray-600">Loading requests…</p>
              ) : plantReqs.length === 0 ? (
                <p className="mt-4 text-sm text-gray-600">No open plant-heavy requests are in the queue.</p>
              ) : (
                <div className="mt-4 space-y-3">
                  {plantReqs.slice(0, 5).map((req) => (
                    <div
                      key={req.id}
                      className="rounded-xl border border-border-soft bg-surface px-4 py-3"
                    >
                      <div className="font-semibold text-foreground">
                        {req.actionRequired || req.referenceNumber || "Plant request"}
                      </div>
                      <div className="mt-1 text-sm text-gray-600">
                        {[req.account, req.location].filter(Boolean).join(" • ") || "No account or location"}
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
          onDelete={() => deletePlant(selectedPlant)}
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
          onDelete={() => deletePlant(editingPlant)}
        />
      ) : null}
    </AppShell>
  );
}
