import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import React, { useState } from "react";

import { Empty } from "@/components/empty";
import { fmt } from "@/lib/format";
export type Column = {
  key: string;
  name: string;
  render?: (row: any) => React.ReactNode;
  numeric?: boolean;
};
export function DataTable({
  rows,
  columns,
  search = true,
  emptyText,
  heading,
  icon,
  actions,
  beforeTable,
}: {
  rows: any[];
  columns: Column[];
  search?: boolean;
  emptyText?: string;
  heading?: React.ReactNode;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  beforeTable?: React.ReactNode;
}) {
  const [query, setQuery] = useState(""),
    [page, setPage] = useState(0),
    [sort, setSort] = useState<{ key: string; asc: boolean } | null>(null);
  const filtered = rows
    .filter(
      (row) =>
        !query ||
        Object.values(row)
          .join(" ")
          .toLowerCase()
          .includes(query.toLowerCase()),
    )
    .sort((a, b) =>
      !sort
        ? 0
        : (typeof a[sort.key] === "number"
            ? a[sort.key] - b[sort.key]
            : String(a[sort.key]).localeCompare(String(b[sort.key]))) *
          (sort.asc ? 1 : -1),
    );
  const currentPage = Math.min(
    page,
    Math.max(0, Math.ceil(filtered.length / 20) - 1),
  );
  const searchResults = search && rows.length > 0 && (
    <span className="muted small-text table-search-results">
      {fmt(filtered.length)} results
      {rows.length >= 1000 ? " · top 1,000 shown" : ""}
    </span>
  );
  const searchControl = search && rows.length > 0 && (
        <div className="table-toolbar">
          {searchResults}
          <label className="search">
            <Search size={15} />
            <Input
              aria-label="Search Table"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(0);
              }}
              placeholder="Find something…"
            />
          </label>
        </div>
      );
  return (
    <>
      {heading ? (
        <div className="panel-heading table-card-heading">
          <div className="table-card-title">
            {icon && <span className="table-card-icon">{icon}</span>}
            <div>{heading}</div>
          </div>
          {(actions || searchControl) && <div className="table-card-actions">{actions}{searchControl}</div>}
        </div>
      ) : searchControl}
      {beforeTable}
      {!filtered.length ? (
        <Empty text={query ? "No results match your search." : emptyText} />
      ) : (
        <>
          <div className="table-scroll">
            <Table>
              <TableHeader>
                <TableRow>
                  {columns.map((c) => (
                    <TableHead
                      key={c.key}
                      className={c.numeric ? "sortable-head numeric" : "sortable-head"}
                      aria-sort={
                        sort?.key === c.key
                          ? sort.asc
                            ? "ascending"
                            : "descending"
                          : "none"
                      }
                    >
                      <Button
                        variant="ghost"
                        className="table-sort"
                        onClick={() => {
                          setSort((current) => {
                            const initialAscending = !c.numeric;
                            if (current?.key !== c.key) {
                              return { key: c.key, asc: initialAscending };
                            }
                            return current.asc === initialAscending
                              ? { key: c.key, asc: !initialAscending }
                              : null;
                          });
                          setPage(0);
                        }}
                      >
                        {c.name}
                        {sort?.key === c.key && (
                          <span>{sort.asc ? " ↑" : " ↓"}</span>
                        )}
                      </Button>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered
                  .slice(currentPage * 20, currentPage * 20 + 20)
                  .map((row, i) => (
                    <TableRow
                      key={row.id || row.visitorId || `${currentPage}-${i}`}
                    >
                      {columns.map((c) => (
                        <TableCell
                          key={c.key}
                          className={c.numeric ? "numeric" : ""}
                        >
                          {c.render
                            ? c.render(row)
                            : c.numeric
                              ? fmt(row[c.key])
                              : row[c.key]}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </div>
          {filtered.length > 20 && (
            <div className="pagination">
              <span>
                Showing {currentPage * 20 + 1}–
                {Math.min(currentPage * 20 + 20, filtered.length)} of{" "}
                {fmt(filtered.length)}
              </span>
              <div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Previous Page"
                  disabled={!currentPage}
                  onClick={() => setPage(currentPage - 1)}
                >
                  <ChevronLeft size={17} />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Next Page"
                  disabled={(currentPage + 1) * 20 >= filtered.length}
                  onClick={() => setPage(currentPage + 1)}
                >
                  <ChevronRight size={17} />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}
