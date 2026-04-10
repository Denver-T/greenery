import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

const fetchApiMock = vi.fn();

vi.mock("@/lib/api/api", () => ({
  fetchApi: (...args) => fetchApiMock(...args),
}));

vi.mock("firebase/auth", () => ({
  onAuthStateChanged: vi.fn(() => () => {}),
}));

vi.mock("@/app/lib/firebaseClient", () => ({
  auth: {},
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
}));

import MobileNavDrawer from "./MobileNavDrawer";

describe("MobileNavDrawer", () => {
  beforeEach(() => {
    fetchApiMock.mockReset();
    fetchApiMock.mockResolvedValue({ permissionLevel: "Technician" });
    document.body.style.overflow = "";
  });

  it("renders drawer with role=dialog and aria-modal when open", () => {
    render(<MobileNavDrawer isOpen={true} onClose={vi.fn()} />);

    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAttribute("aria-label", "Primary navigation");
    expect(dialog).toHaveAttribute("id", "mobile-nav-drawer");
  });

  it("is hidden from accessibility tree and pointer events when closed", () => {
    render(<MobileNavDrawer isOpen={false} onClose={vi.fn()} />);

    // Dialog is hidden from the accessibility tree via aria-hidden on the root —
    // role queries respect aria-hidden by default.
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    // The root container is mounted (so the slide-in animation has somewhere
    // to live), but is marked aria-hidden and pointer-events-none when closed.
    const root = screen.getByTestId("mobile-nav-drawer-root");
    expect(root).toBeInTheDocument();
    expect(root).toHaveAttribute("aria-hidden", "true");
    expect(root.className).toContain("pointer-events-none");
  });

  it("calls onClose when Escape key is pressed", () => {
    const onClose = vi.fn();
    render(<MobileNavDrawer isOpen={true} onClose={onClose} />);

    fireEvent.keyDown(document, { key: "Escape" });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when backdrop is clicked", () => {
    const onClose = vi.fn();
    render(<MobileNavDrawer isOpen={true} onClose={onClose} />);

    const backdrop = screen.getByTestId("mobile-nav-backdrop");
    fireEvent.click(backdrop);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("locks body scroll while open and restores previous overflow on close", () => {
    document.body.style.overflow = "scroll";

    const { rerender } = render(
      <MobileNavDrawer isOpen={true} onClose={vi.fn()} />,
    );

    expect(document.body.style.overflow).toBe("hidden");

    rerender(<MobileNavDrawer isOpen={false} onClose={vi.fn()} />);

    expect(document.body.style.overflow).toBe("scroll");
  });
});
