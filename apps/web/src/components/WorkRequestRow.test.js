import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import WorkRequestRow from "./WorkRequestRow";

const baseReq = {
  id: 42,
  referenceNumber: "WR-2026-0042",
  account: "Green Corp",
  actionRequired: "Replace fern",
  status: "assigned",
  dueDate: "2026-04-20",
  monday_item_id: "987654",
  monday_synced_at: "2026-04-12T12:00:00Z",
};

describe("WorkRequestRow", () => {
  it("renders reference number, account, and action", () => {
    render(<WorkRequestRow workReq={baseReq} />);
    expect(screen.getByText("WR-2026-0042")).toBeInTheDocument();
    expect(screen.getByText("Green Corp")).toBeInTheDocument();
    expect(screen.getByText("Replace fern")).toBeInTheDocument();
  });

  it("links to /req/:id", () => {
    render(<WorkRequestRow workReq={baseReq} />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/req/42");
  });

  it("renders the sync status badge", () => {
    render(<WorkRequestRow workReq={baseReq} />);
    expect(screen.getByText("Synced")).toBeInTheDocument();
  });

  it("renders status pill with the correct label", () => {
    render(<WorkRequestRow workReq={baseReq} />);
    expect(screen.getByText("Assigned")).toBeInTheDocument();
  });

  it("falls back to placeholders when fields are missing", () => {
    render(
      <WorkRequestRow
        workReq={{
          id: 1,
          referenceNumber: null,
          account: null,
          actionRequired: null,
          status: null,
          dueDate: null,
          monday_item_id: null,
          monday_synced_at: null,
        }}
      />,
    );
    expect(screen.getByText("—")).toBeInTheDocument();
    expect(screen.getByText("Unknown account")).toBeInTheDocument();
    expect(screen.getByText("No action captured")).toBeInTheDocument();
    expect(screen.getByText("No due date")).toBeInTheDocument();
    expect(screen.getByText("Unassigned")).toBeInTheDocument();
  });

  it("handles in_progress status correctly", () => {
    render(
      <WorkRequestRow workReq={{ ...baseReq, status: "in_progress" }} />,
    );
    expect(screen.getByText("In Progress")).toBeInTheDocument();
  });
});
