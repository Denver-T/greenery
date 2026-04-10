import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("./ThemeToggle", () => ({
  default: () => null,
}));

vi.mock("./TopBarUserMenu", () => ({
  default: () => null,
}));

import TopBar from "./TopBar";

describe("TopBar hamburger toggle", () => {
  beforeEach(() => {
    // No-op — kept for symmetry with other test files.
  });

  it("reflects isDrawerOpen via aria-expanded and aria-label, click fires onToggleDrawer", async () => {
    const onToggleDrawer = vi.fn();
    const user = userEvent.setup();

    const { rerender } = render(
      <TopBar
        title="Dashboard"
        isDrawerOpen={false}
        onToggleDrawer={onToggleDrawer}
      />,
    );

    // Initial state: aria-label "Open", aria-expanded "false"
    let hamburger = screen.getByRole("button", { name: "Open navigation menu" });
    expect(hamburger).toHaveAttribute("aria-expanded", "false");
    expect(hamburger).toHaveAttribute("aria-controls", "mobile-nav-drawer");

    // Click fires the toggle handler
    await user.click(hamburger);
    expect(onToggleDrawer).toHaveBeenCalledTimes(1);

    // Re-render with drawer open: label flips to "Close", expanded flips to "true"
    rerender(
      <TopBar
        title="Dashboard"
        isDrawerOpen={true}
        onToggleDrawer={onToggleDrawer}
      />,
    );

    hamburger = screen.getByRole("button", { name: "Close navigation menu" });
    expect(hamburger).toHaveAttribute("aria-expanded", "true");

    // Click fires toggle again
    await user.click(hamburger);
    expect(onToggleDrawer).toHaveBeenCalledTimes(2);
  });
});
