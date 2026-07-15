import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { VirtualsAiWorkspace } from "@/components/referrals/virtuals-ai-workspace";

describe("Virtuals AI workspace", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "URL",
      Object.assign(URL, {
        createObjectURL: vi.fn(() => "blob:preview"),
        revokeObjectURL: vi.fn(),
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("keeps analysis disabled until a valid screenshot is selected", () => {
    render(<VirtualsAiWorkspace demoMode />);

    expect(
      screen.getByRole("heading", {
        name: "What would you like to analyze?",
      }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Analyze screenshot")).toBeDisabled();
    expect(screen.getByText(/processed once and discarded/i)).toBeVisible();
  });

  it("accepts a supported screenshot and enables analysis", () => {
    render(<VirtualsAiWorkspace demoMode={false} />);
    const file = new File(["image"], "fixtures.png", { type: "image/png" });

    fireEvent.change(screen.getByLabelText("Upload virtual-match screenshot"), {
      target: { files: [file] },
    });

    expect(screen.getAllByText("fixtures.png").length).toBeGreaterThan(0);
    expect(
      screen.getByAltText("Selected virtual-match screenshot preview"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: "What would you like to analyze?",
      }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Analyze screenshot")).toBeEnabled();
  });
});
