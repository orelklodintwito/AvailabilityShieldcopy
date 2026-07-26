import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import EventsPage from "../pages/EventsPage.jsx";

const data = { events: [
  { id: "1", timestamp: "2026-07-26T01:00:00Z", ip: "10.0.0.1", severity: "critical", decision: "drop", endpoint: "/api/export", reason: "queue full" },
  { id: "2", timestamp: "2026-07-26T01:01:00Z", ip: "10.0.0.2", severity: "normal", decision: "allow", endpoint: "/api/basic", reason: "ok" }
] };

describe("EventsPage", () => {
  it("renders events and filters by severity", () => {
    render(<EventsPage data={data} />);
    expect(screen.getByText("10.0.0.1")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Severity filter"), { target: { value: "critical" } });
    expect(screen.getByText("10.0.0.1")).toBeInTheDocument();
    expect(screen.queryByText("10.0.0.2")).not.toBeInTheDocument();
  });
});
