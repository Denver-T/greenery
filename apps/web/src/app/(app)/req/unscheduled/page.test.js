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
    // Inbox-specific calls should never fire for a tech.
    // NOTE: `toContain(expect.stringContaining(...))` is a no-op (toContain
    // uses Object.is, which can never match an asymmetric matcher). Use an
    // explicit .some() check so the assertion actually fires.
    const calls = fetchApi.mock.calls.map((c) => c[0]);
    const hitInbox = calls.some(
      (c) => typeof c === "string" && c.includes("/reqs/unscheduled"),
    );
    expect(hitInbox).toBe(false);
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
    // Row-level schedule buttons carry per-row aria-labels so screen-readers
    // can tell them apart.
    expect(
      screen.getByRole("button", { name: /schedule wr-2026-0001/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /schedule wr-2026-0002/i }),
    ).toBeInTheDocument();
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

    fireEvent.click(
      screen.getByRole("button", { name: /schedule wr-2026-0042/i }),
    );

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

  it("rapid clicks on two rows only opens the dialog for the first click", async () => {
    // Regression: React state reads are stale within a single tick, so two
    // back-to-back click handlers would both see `scheduleTarget === null`
    // and the second would overwrite the target. A synchronous ref gate in
    // openScheduleFor must catch the second click.
    fetchApi.mockImplementation((endpoint) => {
      if (endpoint === "/auth/me") return Promise.resolve(managerUser);
      if (typeof endpoint === "string" && endpoint.startsWith("/reqs/unscheduled")) {
        return Promise.resolve({
          data: [
            {
              id: 1,
              referenceNumber: "WR-2026-0001",
              account: "A",
              actionRequired: "First row action",
              created_at: "2026-04-12",
            },
            {
              id: 2,
              referenceNumber: "WR-2026-0002",
              account: "B",
              actionRequired: "Second row action",
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

    // Fire both clicks synchronously — no awaits between them — to simulate
    // a rapid-fire double click before React has a chance to commit.
    fireEvent.click(
      screen.getByRole("button", { name: /schedule wr-2026-0001/i }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: /schedule wr-2026-0002/i }),
    );

    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: /schedule this request/i }),
      ).toBeInTheDocument(),
    );

    // The dialog shows the FIRST row's reference — the second click was
    // swallowed by the sync guard.
    expect(
      screen.getByText(/WR-2026-0001 · First row action/i),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/WR-2026-0002 · Second row action/i),
    ).not.toBeInTheDocument();
  });

  it("drops out-of-order fetch responses so stale rows never overwrite fresh ones", async () => {
    // Regression: two in-flight loadPage calls could resolve out of order —
    // the older one landing last would overwrite the newer state. A
    // monotonic request-id guard must discard stale responses.
    let resolveFirst;
    let resolveSecond;
    const firstPromise = new Promise((res) => {
      resolveFirst = res;
    });
    const secondPromise = new Promise((res) => {
      resolveSecond = res;
    });
    let pendingCall = 0;

    fetchApi.mockImplementation((endpoint) => {
      if (endpoint === "/auth/me") return Promise.resolve(managerUser);
      if (typeof endpoint === "string" && endpoint.startsWith("/reqs/unscheduled")) {
        pendingCall += 1;
        if (pendingCall === 1) return firstPromise;
        if (pendingCall === 2) return secondPromise;
      }
      return Promise.resolve({ data: [], totalCount: 0 });
    });

    render(<UnscheduledRequestsPage />);

    // Wait until the first fetch has been issued (filter bar renders once
    // auth resolves + initial load has kicked off).
    await waitFor(() =>
      expect(screen.getByLabelText(/search by account/i)).toBeInTheDocument(),
    );
    await waitFor(() => expect(pendingCall).toBe(1));

    // Flip a filter to trigger a second in-flight fetch while the first
    // is still pending.
    fireEvent.click(screen.getByLabelText(/assigned only/i));
    await waitFor(() => expect(pendingCall).toBe(2));

    // Resolve the SECOND fetch first — "fresh" data — then the FIRST fetch
    // last with "stale" data. The stale payload must be discarded.
    resolveSecond({
      data: [
        {
          id: 99,
          referenceNumber: "WR-2026-0099",
          account: "Fresh Account",
          actionRequired: "Fresh work",
          created_at: "2026-04-12",
        },
      ],
      totalCount: 1,
    });
    resolveFirst({
      data: [
        {
          id: 1,
          referenceNumber: "WR-2026-0001",
          account: "Stale Account",
          actionRequired: "Stale work",
          created_at: "2026-04-12",
        },
      ],
      totalCount: 1,
    });

    await waitFor(() =>
      expect(screen.getByText("WR-2026-0099")).toBeInTheDocument(),
    );
    // Stale response must not have overwritten the fresh rows.
    expect(screen.queryByText("WR-2026-0001")).not.toBeInTheDocument();
    expect(screen.queryByText("Stale Account")).not.toBeInTheDocument();
  });

  it("steps back a page when scheduling the last row on a non-first page", async () => {
    // Regression: optimistic row removal decrements totalCount without
    // rebasing `page`. Scheduling the last row on page 2 used to leave the
    // user on an empty "Page 2 of 1" state.
    const page1Rows = Array.from({ length: 25 }, (_, i) => ({
      id: i + 1,
      referenceNumber: `WR-2026-${String(i + 1).padStart(4, "0")}`,
      account: `Account ${i + 1}`,
      actionRequired: "Fill",
      created_at: "2026-04-12",
    }));
    const page2Rows = [
      {
        id: 26,
        referenceNumber: "WR-2026-0026",
        account: "Lonely Row",
        actionRequired: "Last one",
        created_at: "2026-04-12",
      },
    ];

    let unscheduledCalls = 0;
    fetchApi.mockImplementation((endpoint) => {
      if (endpoint === "/auth/me") return Promise.resolve(managerUser);
      if (typeof endpoint === "string" && endpoint.startsWith("/reqs/unscheduled")) {
        unscheduledCalls += 1;
        const match = endpoint.match(/page=(\d+)/);
        const requestedPage = match ? Number(match[1]) : 1;
        // Call 1: initial load, page 1, 26 total → Next button visible.
        // Call 2: user clicks Next → page 2, still 26 total.
        // Call 3+: post-schedule refetch after optimistic removal → totalCount 25.
        if (unscheduledCalls >= 3) {
          return Promise.resolve({ data: page1Rows, totalCount: 25 });
        }
        if (requestedPage === 2) {
          return Promise.resolve({ data: page2Rows, totalCount: 26 });
        }
        return Promise.resolve({ data: page1Rows, totalCount: 26 });
      }
      if (endpoint === "/employees") return Promise.resolve([]);
      if (
        typeof endpoint === "string" &&
        endpoint.includes("/reqs/") &&
        endpoint.includes("/schedule-events")
      ) {
        return Promise.resolve({ data: { id: 777 } });
      }
      return Promise.resolve(null);
    });

    render(<UnscheduledRequestsPage />);

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /next →/i })).toBeInTheDocument(),
    );

    // Go to page 2 (one lonely row).
    fireEvent.click(screen.getByRole("button", { name: /next →/i }));

    await waitFor(() =>
      expect(screen.getByText("WR-2026-0026")).toBeInTheDocument(),
    );

    // Clear stale mock history so we can assert the post-schedule refetch
    // hit page 1, not page 2.
    const callCountBefore = fetchApi.mock.calls.length;

    // Open the schedule dialog for the lonely row.
    fireEvent.click(
      screen.getByRole("button", { name: /schedule wr-2026-0026/i }),
    );

    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: /schedule this request/i }),
      ).toBeInTheDocument(),
    );

    // Fill the minimum required fields and submit.
    const startInput = screen.getByLabelText(/start time/i);
    const endInput = screen.getByLabelText(/end time/i);
    fireEvent.change(startInput, { target: { value: "2026-04-20T09:00" } });
    fireEvent.change(endInput, { target: { value: "2026-04-20T10:00" } });

    fireEvent.click(
      screen.getByRole("button", { name: /^schedule →$/i }),
    );

    // After the optimistic removal the page must rebase to 1 and refetch.
    await waitFor(() => {
      const refetchedPage1 = fetchApi.mock.calls
        .slice(callCountBefore)
        .map((c) => c[0])
        .some(
          (url) =>
            typeof url === "string" &&
            url.includes("/reqs/unscheduled") &&
            url.includes("page=1"),
        );
      expect(refetchedPage1).toBe(true);
    });

    // Page 1 rows render; page 2's lonely row is gone.
    await waitFor(() =>
      expect(screen.getByText("WR-2026-0001")).toBeInTheDocument(),
    );
    expect(screen.queryByText("WR-2026-0026")).not.toBeInTheDocument();
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
