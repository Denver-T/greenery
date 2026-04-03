import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import WorkspaceHeader from "./WorkspaceHeader";

describe("WorkspaceHeader", () => {
  it("renders the title and eyebrow", () => {
    render(
      <WorkspaceHeader eyebrow="Test Workspace" title="Dashboard" />,
    );

    expect(screen.getByText("Test Workspace")).toBeInTheDocument();
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
  });

  it("renders description when provided", () => {
    render(
      <WorkspaceHeader
        title="Inventory"
        description="Manage your plant stock."
      />,
    );

    expect(screen.getByText("Manage your plant stock.")).toBeInTheDocument();
  });

  it("renders stats when provided", () => {
    render(
      <WorkspaceHeader
        title="Overview"
        stats={[
          { label: "open requests", value: 12 },
          { label: "assigned", value: 5 },
        ]}
      />,
    );

    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("open requests")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("assigned")).toBeInTheDocument();
  });

  it("does not render stats box when stats is empty and no actions", () => {
    const { container } = render(
      <WorkspaceHeader title="Empty" stats={[]} />,
    );

    expect(container.querySelector(".bg-surface-warm")).not.toBeInTheDocument();
  });
});
