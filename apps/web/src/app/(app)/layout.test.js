import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: vi.fn(),
}));

vi.mock("@/components/AppShell", () => ({
  default: ({ title, children }) => (
    <div data-testid="mock-shell" data-title={title}>
      {children}
    </div>
  ),
}));

import { usePathname } from "next/navigation";

import AppGroupLayout from "./layout";

describe("AppGroupLayout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("resolves the top bar title from the current pathname", () => {
    usePathname.mockReturnValue("/dashboard");

    render(
      <AppGroupLayout>
        <p>child</p>
      </AppGroupLayout>,
    );

    const shell = screen.getByTestId("mock-shell");
    expect(shell).toHaveAttribute("data-title", "Dashboard Analytics");
    expect(screen.getByText("child")).toBeInTheDocument();
  });

  it("falls back to 'Greenery' for an unknown pathname", () => {
    usePathname.mockReturnValue("/nope");

    render(
      <AppGroupLayout>
        <p>child</p>
      </AppGroupLayout>,
    );

    expect(screen.getByTestId("mock-shell")).toHaveAttribute(
      "data-title",
      "Greenery",
    );
  });
});
