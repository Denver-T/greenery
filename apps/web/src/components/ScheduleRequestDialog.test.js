import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import ScheduleRequestDialog from "./ScheduleRequestDialog";

// Mock fetchApi at the module boundary
vi.mock("@/lib/api/api", () => ({
  fetchApi: vi.fn(),
}));

import { fetchApi } from "@/lib/api/api";

const baseWorkReq = {
  id: 42,
  referenceNumber: "WR-2026-0042",
  actionRequired: "Replace fern",
};

const employees = [
  { id: 7, name: "Magnus" },
  { id: 11, name: "Denver" },
];

beforeEach(() => {
  vi.clearAllMocks();
});

describe("ScheduleRequestDialog", () => {
  it("renders the title and reference strip", () => {
    render(
      <ScheduleRequestDialog
        workReq={baseWorkReq}
        employees={employees}
        onClose={vi.fn()}
        onScheduled={vi.fn()}
      />,
    );
    expect(
      screen.getByRole("heading", { name: /schedule this request/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/WR-2026-0042 · Replace fern/i)).toBeInTheDocument();
  });

  it("has the correct ARIA dialog attributes", () => {
    render(
      <ScheduleRequestDialog
        workReq={baseWorkReq}
        employees={employees}
        onClose={vi.fn()}
        onScheduled={vi.fn()}
      />,
    );
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAttribute("aria-labelledby", "schedule-dialog-title");
  });

  it("populates the tech picker from the employees prop with an Unassigned option", () => {
    render(
      <ScheduleRequestDialog
        workReq={baseWorkReq}
        employees={employees}
        onClose={vi.fn()}
        onScheduled={vi.fn()}
      />,
    );
    const select = screen.getByLabelText(/assign to/i);
    expect(select).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /unassigned/i })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Magnus" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Denver" })).toBeInTheDocument();
  });

  it("disables the Schedule button until both times are set", () => {
    render(
      <ScheduleRequestDialog
        workReq={baseWorkReq}
        employees={employees}
        onClose={vi.fn()}
        onScheduled={vi.fn()}
      />,
    );
    const submit = screen.getByRole("button", { name: /schedule →|scheduling/i });
    expect(submit).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/start time/i), {
      target: { value: "2026-04-15T09:00" },
    });
    expect(submit).toBeDisabled(); // end still missing

    fireEvent.change(screen.getByLabelText(/end time/i), {
      target: { value: "2026-04-15T11:00" },
    });
    expect(submit).not.toBeDisabled();
  });

  it("shows an inline error and disables submit when end is before start", () => {
    render(
      <ScheduleRequestDialog
        workReq={baseWorkReq}
        employees={employees}
        onClose={vi.fn()}
        onScheduled={vi.fn()}
      />,
    );
    fireEvent.change(screen.getByLabelText(/start time/i), {
      target: { value: "2026-04-15T11:00" },
    });
    fireEvent.change(screen.getByLabelText(/end time/i), {
      target: { value: "2026-04-15T09:00" },
    });

    expect(screen.getByText(/end must be after start/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /schedule →|scheduling/i }),
    ).toBeDisabled();
  });

  it("submits with the correct payload and calls onScheduled on success", async () => {
    const onScheduled = vi.fn();
    fetchApi.mockResolvedValueOnce({
      id: 101,
      title: "WR-2026-0042 — Replace fern",
    });

    render(
      <ScheduleRequestDialog
        workReq={baseWorkReq}
        employees={employees}
        onClose={vi.fn()}
        onScheduled={onScheduled}
      />,
    );

    fireEvent.change(screen.getByLabelText(/start time/i), {
      target: { value: "2026-04-15T09:00" },
    });
    fireEvent.change(screen.getByLabelText(/end time/i), {
      target: { value: "2026-04-15T11:00" },
    });
    fireEvent.change(screen.getByLabelText(/assign to/i), {
      target: { value: "7" },
    });
    fireEvent.change(screen.getByLabelText(/details/i), {
      target: { value: "Bring spade" },
    });

    fireEvent.click(
      screen.getByRole("button", { name: /schedule →|scheduling/i }),
    );

    await waitFor(() => {
      expect(fetchApi).toHaveBeenCalledWith(
        "/reqs/42/schedule-events",
        expect.objectContaining({
          method: "POST",
          body: {
            start_time: "2026-04-15T09:00",
            end_time: "2026-04-15T11:00",
            employee_id: 7,
            details: "Bring spade",
          },
        }),
      );
    });

    await waitFor(() =>
      expect(onScheduled).toHaveBeenCalledWith(
        expect.objectContaining({ id: 101 }),
      ),
    );
  });

  it("sends employee_id as null when Unassigned is selected", async () => {
    fetchApi.mockResolvedValueOnce({ id: 102 });

    render(
      <ScheduleRequestDialog
        workReq={baseWorkReq}
        employees={employees}
        onClose={vi.fn()}
        onScheduled={vi.fn()}
      />,
    );
    fireEvent.change(screen.getByLabelText(/start time/i), {
      target: { value: "2026-04-15T09:00" },
    });
    fireEvent.change(screen.getByLabelText(/end time/i), {
      target: { value: "2026-04-15T11:00" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: /schedule →|scheduling/i }),
    );

    await waitFor(() => {
      expect(fetchApi).toHaveBeenCalledWith(
        "/reqs/42/schedule-events",
        expect.objectContaining({
          body: expect.objectContaining({ employee_id: null }),
        }),
      );
    });
  });

  it("shows the error alert when the API call fails", async () => {
    fetchApi.mockRejectedValueOnce(new Error("Network is down"));

    render(
      <ScheduleRequestDialog
        workReq={baseWorkReq}
        employees={employees}
        onClose={vi.fn()}
        onScheduled={vi.fn()}
      />,
    );
    fireEvent.change(screen.getByLabelText(/start time/i), {
      target: { value: "2026-04-15T09:00" },
    });
    fireEvent.change(screen.getByLabelText(/end time/i), {
      target: { value: "2026-04-15T11:00" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: /schedule →|scheduling/i }),
    );

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Network is down");
    });
  });

  it("calls onClose when Cancel is clicked", () => {
    const onClose = vi.fn();
    render(
      <ScheduleRequestDialog
        workReq={baseWorkReq}
        employees={employees}
        onClose={onClose}
        onScheduled={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("closes on Escape key press", () => {
    const onClose = vi.fn();
    render(
      <ScheduleRequestDialog
        workReq={baseWorkReq}
        employees={employees}
        onClose={onClose}
        onScheduled={vi.fn()}
      />,
    );
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("closes when the backdrop is clicked", () => {
    const onClose = vi.fn();
    const { container } = render(
      <ScheduleRequestDialog
        workReq={baseWorkReq}
        employees={employees}
        onClose={onClose}
        onScheduled={vi.fn()}
      />,
    );
    // The backdrop is the outermost div with the click handler — first child
    // of the rendered output.
    const backdrop = container.firstChild;
    fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("does NOT close when the dialog panel itself is clicked", () => {
    const onClose = vi.fn();
    render(
      <ScheduleRequestDialog
        workReq={baseWorkReq}
        employees={employees}
        onClose={onClose}
        onScheduled={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("dialog"));
    expect(onClose).not.toHaveBeenCalled();
  });

  it("focuses the Start time input on mount", async () => {
    render(
      <ScheduleRequestDialog
        workReq={baseWorkReq}
        employees={employees}
        onClose={vi.fn()}
        onScheduled={vi.fn()}
      />,
    );
    // Focus is set inside a setTimeout(0) — wait one microtask tick.
    await waitFor(() => {
      expect(document.activeElement).toBe(screen.getByLabelText(/start time/i));
    });
  });
});
