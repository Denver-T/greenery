import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

import LinkedScheduleList from "./LinkedScheduleList";

const events = [
  {
    id: 1,
    start_time: "2026-04-15T09:00:00",
    end_time: "2026-04-15T11:00:00",
    employee_name: "Magnus",
    details: "Bring the replacement soil and spade.",
  },
  {
    id: 2,
    start_time: "2026-04-17T14:00:00",
    end_time: "2026-04-17T16:00:00",
    employee_name: null,
    details: null,
  },
];

describe("LinkedScheduleList", () => {
  it("renders the empty state when no events are provided", () => {
    render(<LinkedScheduleList events={[]} />);
    expect(screen.getByText(/not yet scheduled/i)).toBeInTheDocument();
    expect(
      screen.getByText(/use .schedule this request./i),
    ).toBeInTheDocument();
  });

  it("renders the empty state when events is null/undefined", () => {
    render(<LinkedScheduleList />);
    expect(screen.getByText(/not yet scheduled/i)).toBeInTheDocument();
  });

  it("renders one row per event with tech name and details", () => {
    render(<LinkedScheduleList events={events} />);
    expect(screen.getByText("Magnus")).toBeInTheDocument();
    expect(screen.getByText("Unassigned")).toBeInTheDocument();
    expect(
      screen.getByText(/bring the replacement soil/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/no details/i)).toBeInTheDocument();
  });

  it("does NOT render Unschedule buttons when onUnschedule is null", () => {
    render(<LinkedScheduleList events={events} onUnschedule={null} />);
    expect(
      screen.queryByRole("button", { name: /unschedule/i }),
    ).not.toBeInTheDocument();
  });

  it("renders an Unschedule button per row when onUnschedule is provided", () => {
    const onUnschedule = vi.fn();
    render(
      <LinkedScheduleList events={events} onUnschedule={onUnschedule} />,
    );
    const buttons = screen.getAllByRole("button", { name: /unschedule/i });
    expect(buttons).toHaveLength(2);
  });

  it("calls onUnschedule with the event id when clicked", () => {
    const onUnschedule = vi.fn();
    render(
      <LinkedScheduleList events={events} onUnschedule={onUnschedule} />,
    );
    const buttons = screen.getAllByRole("button", { name: /unschedule/i });
    fireEvent.click(buttons[0]);
    expect(onUnschedule).toHaveBeenCalledWith(1);
  });

  it("disables the Unschedule button for the row currently being unscheduled", () => {
    render(
      <LinkedScheduleList
        events={events}
        onUnschedule={vi.fn()}
        unscheduling={1}
      />,
    );
    const buttons = screen.getAllByRole("button", { name: /unschedul/i });
    // First button is the one being unscheduled
    expect(buttons[0]).toBeDisabled();
    expect(buttons[0]).toHaveTextContent(/unscheduling/i);
    expect(buttons[1]).not.toBeDisabled();
  });

  it("hides Unschedule buttons when the parent work_req is completed", () => {
    render(
      <LinkedScheduleList
        events={events}
        workReqStatus="completed"
        onUnschedule={vi.fn()}
      />,
    );
    expect(
      screen.queryByRole("button", { name: /unschedule/i }),
    ).not.toBeInTheDocument();
  });

  it("shows a Completed pill when the parent work_req is completed", () => {
    render(
      <LinkedScheduleList events={events} workReqStatus="completed" />,
    );
    const pills = screen.getAllByText(/completed/i);
    // One pill per row
    expect(pills).toHaveLength(events.length);
  });

  it("uses an aria-label that includes the time range and tech name", () => {
    render(
      <LinkedScheduleList events={events} onUnschedule={vi.fn()} />,
    );
    const buttons = screen.getAllByRole("button", { name: /unschedule event/i });
    expect(buttons[0]).toHaveAttribute(
      "aria-label",
      expect.stringContaining("Magnus"),
    );
    expect(buttons[1]).toHaveAttribute(
      "aria-label",
      expect.stringContaining("unassigned"),
    );
  });
});
