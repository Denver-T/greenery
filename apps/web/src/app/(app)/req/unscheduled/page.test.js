import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/api/api", () => ({
  fetchApi: vi.fn(),
}));

import { fetchApi } from "@/lib/api/api";
import UnscheduledRequestsPage from "./page";

const managerUser = {
  id: 1,
  email: "manager@example.com",
  permissionLevel: "Manager",
};

const technicianUser = {
  id: 2,
  email: "tech@example.com",
  permissionLevel: "Technician",
};

function mockAuth(user) {
  fetchApi.mockImplementation((endpoint) => {
    if (endpoint === "/auth/me") return Promise.resolve(user);
    return Promise.resolve({ data: [], totalCount: 0 });
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("UnscheduledRequestsPage", () => {
  it("renders the locked state for a Technician", async () => {
    mockAuth(technicianUser);

    render(<UnscheduledRequestsPage />);

    await waitFor(() => {
      expect(
        screen.getByText(/don.t have access to this view/i),
      ).toBeInTheDocument();
    });
    // Inbox-specific calls should never fire for a tech
    const calls = fetchApi.mock.calls.map((c) => c[0]);
    expect(calls).not.toContain(expect.stringContaining("/reqs/unscheduled"));
  });

  it("loads and renders rows for a Manager", async () => {
    fetchApi.mockImplementation((endpoint) => {
      if (endpoint === "/auth/me") return Promise.resolve(managerUser);
      if (typeof endpoint === "string" && endpoint.startsWith("/reqs/unscheduled")) {
        return Promise.resolve({
          data: [
            {
              id: 1,
              referenceNumber: "WR-2026-0001",
              account: "Inter Pipeline",
              actionRequired: "Replace fern",
              techName: "Magnus",
              created_at: "2026-04-12T10:00:00Z",
            },
            {
              id: 2,
              referenceNumber: "WR-2026-0002",
              account: "Green Corp",
              actionRequired: "Soil top up",
              techName: null,
              created_at: "2026-04-11T08:00:00Z",
            },
          ],
          totalCount: 2,
          page: 1,
          pageSize: 25,
        });
      }
      return Promise.resolve(null);
    });

    render(<UnscheduledRequestsPage />);

    await waitFor(() => {
      expect(screen.getByText("WR-2026-0001")).toBeInTheDocument();
    });
    expect(screen.getByText("Inter Pipeline")).toBeInTheDocument();
    expect(screen.getByText("WR-2026-0002")).toBeInTheDocument();
    expect(screen.getByText("Green Corp")).toBeInTheDocument();
    // Unassigned row shows the italic placeholder
    expect(screen.getAllByText(/unassigned/i).length).toBeGreaterThan(0);
    // Schedule buttons render per row
    const scheduleButtons = screen.getAllByRole("button", {
      name: /schedule →/i,
    });
    expect(scheduleButtons).toHaveLength(2);
  });

  it("renders the unfiltered empty state when no rows and no filters", async () => {
    fetchApi.mockImplementation((endpoint) => {
      if (endpoint === "/auth/me") return Promise.resolve(managerUser);
      return Promise.resolve({ data: [], totalCount: 0 });
    });

    render(<UnscheduledRequestsPage />);

    await waitFor(() => {
      expect(
        screen.getByText(/nothing waiting to be scheduled/i),
      ).toBeInTheDocument();
    });
    expect(
      screen.getByText(/every recent work request has a calendar event/i),
    ).toBeInTheDocument();
  });

  it("forwards filter params to the API when toggles are flipped", async () => {
    fetchApi.mockImplementation((endpoint) => {
      if (endpoint === "/auth/me") return Promise.resolve(managerUser);
      return Promise.resolve({ data: [], totalCount: 0 });
    });

    render(<UnscheduledRequestsPage />);

    await waitFor(() => {
      expect(
        screen.getByText(/nothing waiting to be scheduled/i),
      ).toBeInTheDocument();
    });

    fireEvent.click(screen.getByLabelText(/assigned only/i));
    fireEvent.click(screen.getByLabelText(/show older/i));

    await waitFor(() => {
      const lastCall = fetchApi.mock.calls
        .map((c) => c[0])
        .find((url) =>
          url.includes("assignedToPresent=true") &&
          url.includes("includeOlder=true"),
        );
      expect(lastCall).toBeDefined();
    });
  });

  it("clicking a row's Schedule button opens the dialog for that row", async () => {
    fetchApi.mockImplementation((endpoint) => {
      if (endpoint === "/auth/me") return Promise.resolve(managerUser);
      if (typeof endpoint === "string" && endpoint.startsWith("/reqs/unscheduled")) {
        return Promise.resolve({
          data: [
            {
              id: 42,
              referenceNumber: "WR-2026-0042",
              account: "Inter Pipeline",
              actionRequired: "Replace fern",
              techName: "Magnus",
              created_at: "2026-04-12T10:00:00Z",
            },
          ],
          totalCount: 1,
        });
      }
      if (endpoint === "/employees") return Promise.resolve([]);
      return Promise.resolve(null);
    });

    render(<UnscheduledRequestsPage />);

    await waitFor(() =>
      expect(screen.getByText("WR-2026-0042")).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByRole("button", { name: /schedule →/i }));

    // Dialog mounts — confirmed by the dialog-specific heading
    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: /schedule this request/i }),
      ).toBeInTheDocument(),
    );
    // The dialog's reference strip shows the row's reference
    expect(
      screen.getByText(/WR-2026-0042 · Replace fern/i),
    ).toBeInTheDocument();
  });

  it("disables every row's Schedule button while a dialog is open", async () => {
    fetchApi.mockImplementation((endpoint) => {
      if (endpoint === "/auth/me") return Promise.resolve(managerUser);
      if (typeof endpoint === "string" && endpoint.startsWith("/reqs/unscheduled")) {
        return Promise.resolve({
          data: [
            {
              id: 1,
              referenceNumber: "WR-2026-0001",
              account: "A",
              actionRequired: "a1",
              created_at: "2026-04-12",
            },
            {
              id: 2,
              referenceNumber: "WR-2026-0002",
              account: "B",
              actionRequired: "b2",
              created_at: "2026-04-12",
            },
          ],
          totalCount: 2,
        });
      }
      if (endpoint === "/employees") return Promise.resolve([]);
      return Promise.resolve(null);
    });

    render(<UnscheduledRequestsPage />);

    await waitFor(() =>
      expect(screen.getByText("WR-2026-0001")).toBeInTheDocument(),
    );

    const scheduleButtons = screen
      .getAllByRole("button", { name: /schedule →/i })
      // Exclude the dialog's submit button once the dialog is open
      .filter((btn) => btn.getAttribute("type") !== "submit");
    expect(scheduleButtons).toHaveLength(2);

    // Click row 1's Schedule button
    fireEvent.click(scheduleButtons[0]);

    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: /schedule this request/i }),
      ).toBeInTheDocument(),
    );

    // Every row-level Schedule button (not the dialog's submit) is disabled
    const rowButtonsWhileOpen = screen
      .getAllByRole("button", { name: /schedule →/i })
      .filter((btn) => btn.getAttribute("type") !== "submit");
    rowButtonsWhileOpen.forEach((btn) => {
      expect(btn).toBeDisabled();
    });
  });

  it("clicking Next fires a fetch with the next page number", async () => {
    fetchApi.mockImplementation((endpoint) => {
      if (endpoint === "/auth/me") return Promise.resolve(managerUser);
      if (typeof endpoint === "string" && endpoint.startsWith("/reqs/unscheduled")) {
        const rows30 = Array.from({ length: 25 }, (_, i) => ({
          id: i + 1,
          referenceNumber: `WR-2026-${String(i + 1).padStart(4, "0")}`,
          account: "Acme",
          actionRequired: "Do the thing",
          created_at: "2026-04-12",
        }));
        return Promise.resolve({ data: rows30, totalCount: 30 });
      }
      return Promise.resolve(null);
    });

    render(<UnscheduledRequestsPage />);

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /next →/i })).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByRole("button", { name: /next →/i }));

    await waitFor(() => {
      const hit = fetchApi.mock.calls
        .map((c) => c[0])
        .find(
          (url) => typeof url === "string" && url.includes("page=2"),
        );
      expect(hit).toBeDefined();
    });
  });

  it("pagination is shown only when totalCount > pageSize", async () => {
    // 30 rows → 2 pages, Next/Previous visible
    fetchApi.mockImplementation((endpoint) => {
      if (endpoint === "/auth/me") return Promise.resolve(managerUser);
      if (typeof endpoint === "string" && endpoint.startsWith("/reqs/unscheduled")) {
        const rowsN = Array.from({ length: 25 }, (_, i) => ({
          id: i + 1,
          referenceNumber: `WR-2026-00${String(i + 1).padStart(2, "0")}`,
          account: `Account ${i + 1}`,
          actionRequired: "Do the thing",
          created_at: "2026-04-12",
        }));
        return Promise.resolve({ data: rowsN, totalCount: 30 });
      }
      return Promise.resolve(null);
    });

    render(<UnscheduledRequestsPage />);

    await waitFor(() =>
      expect(screen.getByRole("navigation", { name: /pagination/i })).toBeInTheDocument(),
    );
    expect(screen.getByRole("button", { name: /next →/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /← previous/i })).toBeInTheDocument();
  });

  it("debounces the account search and forwards it to the API", async () => {
    fetchApi.mockImplementation((endpoint) => {
      if (endpoint === "/auth/me") return Promise.resolve(managerUser);
      return Promise.resolve({ data: [], totalCount: 0 });
    });

    render(<UnscheduledRequestsPage />);

    // Wait for auth + initial load
    await waitFor(() =>
      expect(screen.getByLabelText(/search by account/i)).toBeInTheDocument(),
    );

    fireEvent.change(screen.getByLabelText(/search by account/i), {
      target: { value: "Inter" },
    });

    // Real-timer wait — 300ms debounce + a buffer for the effect to refire
    await waitFor(
      () => {
        const matched = fetchApi.mock.calls
          .map((c) => c[0])
          .find(
            (url) =>
              typeof url === "string" && url.includes("account=Inter"),
          );
        expect(matched).toBeDefined();
      },
      { timeout: 1000 },
    );
  });
});
