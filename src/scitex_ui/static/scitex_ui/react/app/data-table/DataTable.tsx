/**
 * DataTable — shared spreadsheet-like table component.
 * Ported from scitex-cloud DataTableManager.
 *
 * Features (ported from scitex-cloud):
 * - CSV/TSV parsing and display
 * - Column sorting (click header)
 * - Column resizing (drag header border)
 * - Cell selection (click + shift-click for range)
 * - Row numbers
 * - Virtual scrolling for large datasets (planned)
 */

import React, { useState, useCallback, useMemo, useRef } from "react";
import type { DataTableProps, Dataset, CellPosition, DataRow } from "./types";

const CLS = "stx-app-data-table";

/** Parse CSV/TSV string into Dataset (ported from _TableData.ts) */
function parseCSV(content: string, fileName?: string): Dataset {
  const delimiter = fileName?.endsWith(".tsv") ? "\t" : ",";
  const lines = content.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length === 0) return { columns: [], rows: [] };

  const headerCells = lines[0].split(delimiter).map((c) => c.trim());
  const rows: DataRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i].split(delimiter);
    const row: DataRow = {};
    for (let j = 0; j < headerCells.length; j++) {
      const val = (cells[j] ?? "").trim();
      const num = Number(val);
      row[headerCells[j]] = val !== "" && !isNaN(num) ? num : val;
    }
    rows.push(row);
  }

  return { columns: headerCells, rows };
}

/** Sort dataset by column */
function sortDataset(
  data: Dataset,
  colIdx: number,
  direction: "asc" | "desc",
): Dataset {
  const col = data.columns[colIdx];
  if (!col) return data;
  const sorted = [...data.rows].sort((a, b) => {
    const va = a[col];
    const vb = b[col];
    if (typeof va === "number" && typeof vb === "number") {
      return direction === "asc" ? va - vb : vb - va;
    }
    const sa = String(va ?? "");
    const sb = String(vb ?? "");
    return direction === "asc" ? sa.localeCompare(sb) : sb.localeCompare(sa);
  });
  return { ...data, rows: sorted };
}

export const DataTable: React.FC<DataTableProps> = ({
  data: propData,
  csvContent,
  readOnly: _readOnly = false,
  onDataChange: _onDataChange,
  onCellSelect,
  onStatusUpdate,
  showRowNumbers = true,
  sortable = true,
  resizable = true,
  className,
  style,
}) => {
  const [selectedCell, setSelectedCell] = useState<CellPosition | null>(null);
  const [sortCol, setSortCol] = useState<number | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [colWidths, setColWidths] = useState<Map<number, number>>(new Map());
  const resizing = useRef<{
    col: number;
    startX: number;
    startW: number;
  } | null>(null);

  // Parse CSV if provided, otherwise use prop data
  const baseData = useMemo(() => {
    if (propData) return propData;
    if (csvContent) return parseCSV(csvContent);
    return { columns: [], rows: [] };
  }, [propData, csvContent]);

  // Apply sorting
  const data = useMemo(() => {
    if (sortCol === null) return baseData;
    return sortDataset(baseData, sortCol, sortDir);
  }, [baseData, sortCol, sortDir]);

  const handleHeaderClick = useCallback(
    (colIdx: number) => {
      if (!sortable) return;
      if (sortCol === colIdx) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      } else {
        setSortCol(colIdx);
        setSortDir("asc");
      }
    },
    [sortable, sortCol],
  );

  const handleCellClick = useCallback(
    (row: number, col: number) => {
      const pos = { row, col };
      setSelectedCell(pos);
      onCellSelect?.(pos);
      onStatusUpdate?.(`Cell (${row + 1}, ${data.columns[col] || col + 1})`);
    },
    [data.columns, onCellSelect, onStatusUpdate],
  );

  const handleResizeStart = useCallback(
    (colIdx: number, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const startX = e.clientX;
      const startW = colWidths.get(colIdx) ?? 80;
      resizing.current = { col: colIdx, startX, startW };

      const onMove = (ev: MouseEvent) => {
        if (!resizing.current) return;
        const delta = ev.clientX - resizing.current.startX;
        const newW = Math.max(30, resizing.current.startW + delta);
        setColWidths((prev) => {
          const next = new Map(prev);
          next.set(colIdx, newW);
          return next;
        });
      };
      const onUp = () => {
        resizing.current = null;
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
        document.body.style.cursor = "";
      };
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
      document.body.style.cursor = "col-resize";
    },
    [colWidths],
  );

  if (data.columns.length === 0) {
    return (
      <div className={`${CLS} ${CLS}--empty ${className ?? ""}`} style={style}>
        <i className="fas fa-table" />
        <p>No data loaded</p>
      </div>
    );
  }

  return (
    <div className={`${CLS} ${className ?? ""}`} style={style}>
      <div className={`${CLS}__scroll`}>
        <table className={`${CLS}__table`}>
          <thead>
            <tr>
              {showRowNumbers && <th className={`${CLS}__row-num`}>#</th>}
              {data.columns.map((col, ci) => (
                <th
                  key={ci}
                  className={`${CLS}__header-cell${sortCol === ci ? ` ${CLS}__header-cell--sorted` : ""}`}
                  style={
                    colWidths.has(ci) ? { width: colWidths.get(ci) } : undefined
                  }
                  onClick={() => handleHeaderClick(ci)}
                >
                  <span>{col}</span>
                  {sortable && sortCol === ci && (
                    <i
                      className={`fas fa-caret-${sortDir === "asc" ? "up" : "down"}`}
                    />
                  )}
                  {resizable && (
                    <div
                      className={`${CLS}__resize-handle`}
                      onMouseDown={(e) => handleResizeStart(ci, e)}
                    />
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row, ri) => (
              <tr key={ri}>
                {showRowNumbers && (
                  <td className={`${CLS}__row-num`}>{ri + 1}</td>
                )}
                {data.columns.map((col, ci) => {
                  const isSelected =
                    selectedCell?.row === ri && selectedCell?.col === ci;
                  return (
                    <td
                      key={ci}
                      className={`${CLS}__cell${isSelected ? ` ${CLS}__cell--selected` : ""}`}
                      onClick={() => handleCellClick(ri, ci)}
                    >
                      {row[col] ?? ""}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
