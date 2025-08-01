import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import EditableQuoteRow from "./EditableQuoteRow";
import { Quote } from "../types/Quote";

// Mock next/navigation
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
  useSearchParams: () => ({
    get: () => null,
  }),
}));

describe("EditableQuoteRow (modal)", () => {
  const mockQuote: Quote = {
    id: "1",
    author: "Test Author",
    authorLink: "http://example.com",
    contributedBy: "Tester",
    quoteText: "This is a test quote.",
    subjects: ["test", "unit"],
    videoLink: "http://video.com",
  };

  const defaultWidths = {
    quote: 200,
    author: 100,
    authorLink: 100,
    contributedBy: 100,
    subjects: 80,
    videoLink: 80,
  };

  const renderComponent = (showContributedBy = false, onSave = jest.fn()) => {
    return render(
      <table>
        <tbody>
          <EditableQuoteRow
            quote={mockQuote}
            onSave={onSave}
            onDelete={jest.fn()}
            columnWidths={defaultWidths}
            showContributedBy={showContributedBy}
          />
        </tbody>
      </table>,
    );
  };

  it("renders quote data in normal mode", () => {
    renderComponent();
    expect(screen.getByText("Test Author")).toBeInTheDocument();
    expect(screen.getByText("This is a test quote.")).toBeInTheDocument();
  });

  it("opens modal on edit and allows editing", async () => {
    renderComponent();

    fireEvent.click(screen.getByText("Edit"));

    // Modal should appear with textarea pre-filled
    const textarea = await screen.findByDisplayValue("This is a test quote.");
    expect(textarea).toBeInTheDocument();

    // Modify author field
    const authorInput = screen.getByDisplayValue("Test Author");
    fireEvent.change(authorInput, { target: { value: "New Author" } });

    fireEvent.click(screen.getByRole("button", { name: /save/i }));
  });

  it("calls onSave with updated data and keeps modal open until resolved", async () => {
    let resolveFn: () => void;
    const onSave = jest.fn(
      () =>
        new Promise<void>((res) => {
          resolveFn = res;
        }),
    );

    renderComponent(true, onSave);

    fireEvent.click(screen.getByText("Edit"));

    const authorInput = await screen.findByDisplayValue("Test Author");
    fireEvent.change(authorInput, { target: { value: "Updated" } });

    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    expect(onSave).toHaveBeenCalled();

    // Expect modal still visible before promise resolves
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    // Resolve save
    resolveFn!();

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });
});
