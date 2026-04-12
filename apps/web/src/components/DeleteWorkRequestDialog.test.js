import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import DeleteWorkRequestDialog from "./DeleteWorkRequestDialog";

const baseWorkReq = {
  id: 42,
  referenceNumber: "WR-2026-0042",
  account: "Green Corp",
};

describe("DeleteWorkRequestDialog", () => {
  it("renders the reference number in the description", () => {
    render(
      <DeleteWorkRequestDialog
        workReq={baseWorkReq}
        onConfirm={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByText("WR-2026-0042")).toBeInTheDocument();
    expect(screen.getByText(/Delete work request/i)).toBeInTheDocument();
  });

  it("calls onClose when Cancel is clicked", () => {
    const onClose = vi.fn();
    render(
      <DeleteWorkRequestDialog
        workReq={baseWorkReq}
        onConfirm={vi.fn()}
        onClose={onClose}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onConfirm when Delete is clicked", async () => {
    const onConfirm = vi.fn().mockResolvedValue();
    render(
      <DeleteWorkRequestDialog
        workReq={baseWorkReq}
        onConfirm={onConfirm}
        onClose={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /^delete$/i }));
    await waitFor(() => expect(onConfirm).toHaveBeenCalledTimes(1));
  });

  it("shows an error message when onConfirm throws", async () => {
    const onConfirm = vi.fn().mockRejectedValue(new Error("DB exploded"));
    render(
      <DeleteWorkRequestDialog
        workReq={baseWorkReq}
        onConfirm={onConfirm}
        onClose={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /^delete$/i }));
    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("DB exploded");
    });
  });

  it("has the correct ARIA dialog attributes", () => {
    render(
      <DeleteWorkRequestDialog
        workReq={baseWorkReq}
        onConfirm={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAttribute("aria-labelledby", "delete-dialog-title");
    expect(dialog).toHaveAttribute("aria-describedby", "delete-dialog-body");
  });

  it("closes on Escape key press", () => {
    const onClose = vi.fn();
    render(
      <DeleteWorkRequestDialog
        workReq={baseWorkReq}
        onConfirm={vi.fn()}
        onClose={onClose}
      />,
    );
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("renders placeholder when workReq has no reference number", () => {
    render(
      <DeleteWorkRequestDialog
        workReq={{ id: 1 }}
        onConfirm={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByText(/this request/i)).toBeInTheDocument();
  });
});
