"use client";

import { Columns3 } from "lucide-react";
import { useEffect, useState } from "react";

export function AdminColumnVisibility({
  tableId,
  columns,
}: {
  tableId: string;
  columns: string[];
}) {
  const [visible, setVisible] = useState(() => columns.map(() => true));

  useEffect(() => {
    const table = document.getElementById(tableId);
    if (!table) return;
    visible.forEach((isVisible, index) => {
      table
        .querySelectorAll<HTMLElement>(`tr > *:nth-child(${index + 1})`)
        .forEach((cell) => {
          cell.hidden = !isVisible;
        });
    });
  }, [tableId, visible]);

  return (
    <details className="relative hidden md:block">
      <summary className="admin-interactive inline-flex min-h-9 cursor-pointer list-none items-center gap-2 rounded-full border border-black/10 bg-white px-3 text-xs font-black hover:bg-black/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink">
        <Columns3 className="size-3.5" aria-hidden="true" /> Columns
      </summary>
      <fieldset className="admin-menu absolute right-0 z-20 mt-2 w-56 rounded-lg border border-black/10 bg-white p-2 shadow-xl">
        <legend className="sr-only">Visible table columns</legend>
        {columns.map((column, index) => (
          <label
            key={column}
            className="flex min-h-9 items-center gap-2 rounded-md px-2 text-xs font-bold hover:bg-black/5"
          >
            <input
              type="checkbox"
              checked={visible[index]}
              disabled={index === 0}
              onChange={(event) =>
                setVisible((current) =>
                  current.map((value, itemIndex) =>
                    itemIndex === index ? event.target.checked : value,
                  ),
                )
              }
            />
            {column}
          </label>
        ))}
      </fieldset>
    </details>
  );
}
