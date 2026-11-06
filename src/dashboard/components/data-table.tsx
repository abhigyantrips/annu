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
}: {
  rows: any[];
  columns: Column[];
  search?: boolean;
  emptyText?: string;
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
  return (
    <>
      {search && rows.length > 0 && (
        <div className="table-toolbar">
          <label className="search">
            <Search size={15} />
            <Input
              aria-label="Search Table"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(0);
              }}
              placeholder="Find Something…"
            />
          </label>
          <span className="muted small-text">
            {fmt(filtered.length)} results
            {rows.length >= 1000 ? " · top 1,000 shown" : ""}
          </span>
        </div>
      )}
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
                      className={c.numeric ? "numeric" : ""}
                      aria-sort={
                        sort?.key === c.key
                          ? sort.asc
                            ? "ascending"
                            : "descending"
                          : "none"
                      }
                    >
                      <Button
                        onClick={() => {
                          setSort({
                            key: c.key,
                            asc: sort?.key === c.key ? !sort.asc : !c.numeric,
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
