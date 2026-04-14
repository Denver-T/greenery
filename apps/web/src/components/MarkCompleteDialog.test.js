import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import MarkCompleteDialog from "./MarkCompleteDialog";

const baseWorkReq = {
  id: 42,
  referenceNumber: "WR-2026-0042",
  status: "in_progress",
};

describe("MarkCompleteDialog", () => {
  it("renders the reference number and title", () => {
    render(
      <MarkCompleteDialog
        workReq={baseWorkReq}
        onConfirm={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByText("WR-2026-0042")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /mark complete/i }),
    ).toBeInTheDocument();
  });

  it("has dialog ARIA attributes", () => {
    render(
      <MarkCompleteDialog
        workReq={baseWorkReq}
        onConfirm={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAttribute(
      "aria-labelledby",
      "mark-complete-dialog-title",
    );
    expect(dialog).toHaveAttribute(
      "aria-describedby",
      "mark-complete-dialog-body",
    );
  });

  it("closes on Escape", () => {
    const onClose = vi.fn();
    render(
      <MarkCompleteDialog
        workReq={baseWorkReq}
        onConfirm={vi.fn()}
        onClose={onClose}
      />,
    );
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when Cancel is clicked", () => {
    const onClose = vi.fn();
    render(
      <MarkCompleteDialog
        workReq={baseWorkReq}
        onConfirm={vi.fn()}
        onClose={onClose}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("checkbox defaults unchecked and submits autoCloseScheduleEvents: false", async () => {
    const onConfirm = vi.fn().mockResolvedValue();
    render(
      <MarkCompleteDialog
        workReq={baseWorkReq}
        onConfirm={onConfirm}
        onClose={vi.fn()}
      />,
    );
    const checkbox = screen.getByRole("checkbox");
    expect(checkbox).not.toBeChecked();

    fireEvent.click(screen.getByRole("button", { name: /mark complete/i }));
    await waitFor(() => expect(onConfirm).toHaveBeenCalledTimes(1));
    expect(onConfirm).toHaveBeenCalledWith({ autoCloseScheduleEvents: false });
  });

  it("submits autoCloseScheduleEvents: true when checkbox is checked", async () => {
    const onConfirm = vi.fn().mockResolvedValue();
    render(
      <MarkCompleteDialog
        workReq={baseWorkReq}
        onConfirm={onConfirm}
        onClose={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: /mark complete/i }));
    await waitFor(() => expect(onConfirm).toHaveBeenCalledTimes(1));
    expect(onConfirm).toHaveBeenCalledWith({ autoCloseScheduleEvents: true });
  });

  it("shows an error message when onConfirm throws", async () => {
    const onConfirm = vi.fn().mockRejectedValue(new Error("PUT exploded"));
    render(
      <MarkCompleteDialog
        workReq={baseWorkReq}
        onConfirm={onConfirm}
        onClose={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /mark complete/i }));
    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("PUT exploded");
    });
  });

  it("renders placeholder when workReq has no reference number", () => {
    render(
      <MarkCompleteDialog
        workReq={{ id: 1 }}
        onConfirm={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    // Body renders the fallback inside a font-mono span — scope the match to
    // the description region via aria-describedby so the checkbox copy (which
    // also says "this request") doesn't cause a multi-match failure.
    const body = screen.getByText(/this will mark/i).closest("p");
    expect(body).toHaveTextContent("this request");
  });
});
