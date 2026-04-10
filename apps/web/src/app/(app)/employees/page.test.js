import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";

const fetchApiMock = vi.fn();

vi.mock("@/lib/api/api", () => ({
  fetchApi: (...args) => fetchApiMock(...args),
}));

vi.mock("@/components/AppShell", () => ({
  default: ({ children }) => <div data-testid="app-shell">{children}</div>,
}));

import EmployeesPage from "./page";

const SAMPLE_EMPLOYEE = {
  id: 1,
  name: "Alice Park",
  email: "alice@example.com",
  phone: "555-555-5555",
  status: "Active",
  role: "Technician",
  permissionLevel: "Technician",
};

function setupFetchMock() {
  fetchApiMock.mockImplementation((path) => {
    if (path === "/auth/me") {
      return Promise.resolve({
        permissionLevel: "SuperAdmin",
        role: "Administrator",
      });
    }
    if (path === "/employees") {
      return Promise.resolve([SAMPLE_EMPLOYEE]);
    }
    if (typeof path === "string" && path.startsWith("/employees/")) {
      return Promise.resolve({});
    }
    return Promise.resolve(null);
  });
}

async function openDeleteConfirmModal(user) {
  render(<EmployeesPage />);
  await waitFor(() => expect(screen.getByText("Alice Park")).toBeInTheDocument());

  // Open the employee detail modal by clicking the employee card.
  await user.click(screen.getByText("Alice Park"));

  // Click the Delete button inside the detail modal.
  const deleteButtons = await screen.findAllByRole("button", { name: /delete/i });
  await user.click(deleteButtons[0]);
}

describe("EmployeesPage delete-confirm modal", () => {
  beforeEach(() => {
    fetchApiMock.mockReset();
    setupFetchMock();
  });

  it("renders the confirm modal with proper ARIA when delete is requested", async () => {
    const user = userEvent.setup();
    await openDeleteConfirmModal(user);

    const confirmModal = await screen.findByTestId("employee-delete-modal");
    const dialog = confirmModal.querySelector('[role="dialog"]');

    expect(dialog).not.toBeNull();
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAttribute("aria-labelledby", "employee-delete-title");
    expect(screen.getByText("Delete this employee?")).toBeInTheDocument();
    expect(screen.getAllByText("Alice Park").length).toBeGreaterThan(0);
  });

  it("clears the confirm modal when Escape is pressed", async () => {
    const user = userEvent.setup();
    await openDeleteConfirmModal(user);

    expect(await screen.findByTestId("employee-delete-modal")).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });

    await waitFor(() => {
      expect(screen.queryByTestId("employee-delete-modal")).not.toBeInTheDocument();
    });
  });
});
