import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import DataTable, { ColumnDef } from "./DataTable";

interface Row {
  id: number;
  name: string;
  count: number;
}

describe("DataTable sorting", () => {
  const rows: Row[] = [
    { id: 1, name: "Charlie", count: 5 },
    { id: 2, name: "Alice", count: 10 },
    { id: 3, name: "Bob", count: 7 },
  ];

  const columns: ColumnDef[] = [
    { key: "name", label: "Name", width: 100 },
    { key: "count", label: "Count", width: 80, sortAccessor: (r: Row) => r.count },
  ];

  const renderTable = () =>
    render(
      <DataTable<Row>
        columns={columns}
        data={rows}
        rowKey={(r) => r.id}
        rowRenderer={(r) => (
          <tr key={r.id}>
            <td>{r.name}</td>
            <td>{r.count}</td>
          </tr>
        )}
      />,
    );

  it("sorts ascending then descending and indicates with arrow", () => {
    renderTable();

    // initial: unsorted, so first row should be Charlie
    expect(screen.getAllByRole("row")[1]).toHaveTextContent("Charlie");

    // click Name header to sort asc (Alice first)
    fireEvent.click(screen.getByText("Name"));
    expect(screen.getAllByRole("row")[1]).toHaveTextContent("Alice");
    expect(screen.getByText("Name").parentElement).toHaveTextContent("▲");

    // click again to sort desc (Charlie first)
    fireEvent.click(screen.getByText("Name"));
    expect(screen.getAllByRole("row")[1]).toHaveTextContent("Charlie");
    expect(screen.getByText("Name").parentElement).toHaveTextContent("▼");
  });

  it("switches active sort column", () => {
    renderTable();

    // sort by Count
    fireEvent.click(screen.getByText("Count"));
    // The first row should now be 5 (Charlie) ascending by default
    expect(screen.getAllByRole("row")[1]).toHaveTextContent("Charlie");

    // Only Count header should show arrow
    const nameHeader = screen.getByText("Name").parentElement;
    const countHeader = screen.getByText("Count").parentElement;
    expect(nameHeader).not.toHaveTextContent("▲");
    expect(countHeader).toHaveTextContent("▲");
  });
});
