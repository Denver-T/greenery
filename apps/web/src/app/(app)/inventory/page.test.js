import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";

const fetchApiMock = vi.fn();

vi.mock("@/lib/api/api", () => ({
  fetchApi: (...args) => fetchApiMock(...args),
}));

vi.mock("@/lib/inputSafety", () => ({
  sanitizeObjectStrings: (obj) => obj,
}));

vi.mock("@/components/AppShell", () => ({
  default: ({ children }) => <div data-testid="app-shell">{children}</div>,
}));

vi.mock("@/components/WorkspaceHeader", () => ({
  default: () => <div data-testid="workspace-header" />,
}));

vi.mock("@/components/WorkspaceToolbar", () => ({
  default: () => <div data-testid="workspace-toolbar" />,
}));

import InventoryPage from "./page";

const SAMPLE_PLANT = {
  id: 42,
  name: "Aglaonema",
  quantity: 6,
  cost_per_unit: 24.5,
  image_url: null,
};

function setupFetchMock() {
  fetchApiMock.mockImplementation((path) => {
    if (path === "/auth/me") {
      return Promise.resolve({
        permissionLevel: "SuperAdmin",
        role: "Administrator",
      });
    }
    if (typeof path === "string" && path.startsWith("/plants")) {
      if (path.includes("/plants/")) {
        return Promise.resolve({});
      }
      return Promise.resolve([SAMPLE_PLANT]);
    }
    if (typeof path === "string" && path.startsWith("/reqs")) {
      return Promise.resolve([]);
    }
    return Promise.resolve(null);
  });
}

async function openDeletePlantModal(user) {
  render(<InventoryPage />);
  await waitFor(() => expect(screen.getByText("Aglaonema")).toBeInTheDocument());

  // Open the plant detail modal by clicking the plant card.
  await user.click(screen.getByText("Aglaonema"));

  // Click the Delete button inside the detail modal.
  const deleteButtons = await screen.findAllByRole("button", { name: /delete/i });
  await user.click(deleteButtons[0]);
}

describe("InventoryPage delete-confirm modal", () => {
  beforeEach(() => {
    fetchApiMock.mockReset();
    setupFetchMock();
  });

  it("renders the confirm modal with proper ARIA when delete is requested", async () => {
    const user = userEvent.setup();
    await openDeletePlantModal(user);

    const confirmModal = await screen.findByTestId("plant-delete-modal");
    const dialog = confirmModal.querySelector('[role="dialog"]');

    expect(dialog).not.toBeNull();
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAttribute("aria-labelledby", "plant-delete-title");
    expect(screen.getByText("Delete this plant from inventory?")).toBeInTheDocument();
    expect(screen.getAllByText("Aglaonema").length).toBeGreaterThan(0);
  });

  it("clears the confirm modal when Escape is pressed", async () => {
    const user = userEvent.setup();
    await openDeletePlantModal(user);

    expect(await screen.findByTestId("plant-delete-modal")).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });

    await waitFor(() => {
      expect(screen.queryByTestId("plant-delete-modal")).not.toBeInTheDocument();
    });
  });
});
