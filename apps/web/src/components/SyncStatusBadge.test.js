import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import SyncStatusBadge from "./SyncStatusBadge";

describe("SyncStatusBadge", () => {
  it("renders Synced when monday_item_id and monday_synced_at are both set", () => {
    render(
      <SyncStatusBadge
        mondayItemId="123456"
        mondaySyncedAt="2026-04-12T12:00:00Z"
      />,
    );
    expect(screen.getByText("Synced")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveAttribute(
      "aria-label",
      "Synced to Monday",
    );
  });

  it("renders 'Not synced' when monday_item_id is null", () => {
    render(<SyncStatusBadge mondayItemId={null} mondaySyncedAt={null} />);
    expect(screen.getByText("Not synced")).toBeInTheDocument();
  });

  it("renders Queued when queueAttempts is between 1 and 3", () => {
    render(
      <SyncStatusBadge
        mondayItemId="123"
        mondaySyncedAt={null}
        queueAttempts={2}
      />,
    );
    expect(screen.getByText("Queued")).toBeInTheDocument();
  });

  it("renders Failed when queueAttempts exceeds 3", () => {
    render(
      <SyncStatusBadge
        mondayItemId="123"
        mondaySyncedAt={null}
        queueAttempts={5}
      />,
    );
    expect(screen.getByText("Failed")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveAttribute(
      "aria-label",
      "Sync failed — retries exhausted",
    );
  });

  it("prioritizes queueAttempts > 3 over a populated monday_item_id", () => {
    render(
      <SyncStatusBadge
        mondayItemId="123"
        mondaySyncedAt="2026-04-12T12:00:00Z"
        queueAttempts={10}
      />,
    );
    expect(screen.getByText("Failed")).toBeInTheDocument();
    expect(screen.queryByText("Synced")).not.toBeInTheDocument();
  });

  it("accepts a 'sm' size prop", () => {
    render(
      <SyncStatusBadge
        mondayItemId="123"
        mondaySyncedAt="2026-04-12T12:00:00Z"
        size="sm"
      />,
    );
    const badge = screen.getByRole("status");
    expect(badge.className).toContain("text-[10px]");
  });
});
