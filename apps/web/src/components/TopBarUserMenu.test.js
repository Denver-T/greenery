import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";

const fetchApiMock = vi.fn();
const signOutMock = vi.fn();
const replaceMock = vi.fn();

vi.mock("@/lib/api/api", () => ({
  fetchApi: (...args) => fetchApiMock(...args),
}));

vi.mock("firebase/auth", () => ({
  onAuthStateChanged: vi.fn((_, cb) => {
    cb({
      displayName: "Alice Park",
      email: "alice@example.com",
      photoURL: "",
    });
    return () => {};
  }),
  signOut: (...args) => signOutMock(...args),
}));

vi.mock("@/app/lib/firebaseClient", () => ({
  auth: {},
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock, push: vi.fn() }),
}));

import TopBarUserMenu from "./TopBarUserMenu";

describe("TopBarUserMenu", () => {
  beforeEach(() => {
    fetchApiMock.mockReset();
    fetchApiMock.mockResolvedValue({
      name: "Alice Park",
      permissionLevel: "Administrator",
    });
    signOutMock.mockReset();
    signOutMock.mockResolvedValue(undefined);
    replaceMock.mockReset();
  });

  it("renders trigger with aria-haspopup and aria-expanded=false initially", () => {
    render(<TopBarUserMenu />);

    const trigger = screen.getByRole("button", { name: "User menu" });
    expect(trigger).toHaveAttribute("aria-haspopup", "menu");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("opens the menu with role=menu when trigger is clicked", async () => {
    const user = userEvent.setup();
    render(<TopBarUserMenu />);

    await user.click(screen.getByRole("button", { name: "User menu" }));

    expect(screen.getByRole("menu")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "User menu" }),
    ).toHaveAttribute("aria-expanded", "true");
  });

  it("renders menu items with role=menuitem", async () => {
    const user = userEvent.setup();
    render(<TopBarUserMenu />);

    await user.click(screen.getByRole("button", { name: "User menu" }));

    const items = screen.getAllByRole("menuitem");
    expect(items.length).toBeGreaterThanOrEqual(2);
    expect(screen.getByRole("menuitem", { name: "View profile" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /sign out/i })).toBeInTheDocument();
  });

  it("Escape key closes the menu", async () => {
    const user = userEvent.setup();
    render(<TopBarUserMenu />);

    await user.click(screen.getByRole("button", { name: "User menu" }));
    expect(screen.getByRole("menu")).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });

    await waitFor(() => {
      expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    });
  });

  it("outside click closes the menu", async () => {
    const user = userEvent.setup();
    render(<TopBarUserMenu />);

    await user.click(screen.getByRole("button", { name: "User menu" }));
    expect(screen.getByRole("menu")).toBeInTheDocument();

    fireEvent.mouseDown(document.body);

    await waitFor(() => {
      expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    });
  });

  it("sign-out success calls signOut and routes to /", async () => {
    const user = userEvent.setup();
    render(<TopBarUserMenu />);

    await user.click(screen.getByRole("button", { name: "User menu" }));
    await user.click(screen.getByRole("menuitem", { name: /sign out/i }));

    await waitFor(() => {
      expect(signOutMock).toHaveBeenCalledTimes(1);
    });
    expect(replaceMock).toHaveBeenCalledWith("/");
  });

  it("sign-out failure surfaces inline error and re-enables the button", async () => {
    signOutMock.mockRejectedValueOnce(new Error("Network down"));

    const user = userEvent.setup();
    render(<TopBarUserMenu />);

    await user.click(screen.getByRole("button", { name: "User menu" }));
    await user.click(screen.getByRole("menuitem", { name: /sign out/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Network down");
    });

    const signOutButton = screen.getByRole("menuitem", { name: /sign out/i });
    expect(signOutButton).not.toBeDisabled();
    expect(replaceMock).not.toHaveBeenCalled();
  });
});
