import { ColumnDef, flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table';

interface DataTableProps<T> {
  columns: ColumnDef<T, any>[];
  data: T[];
}

export const DataTable = <T,>({ columns, data }: DataTableProps<T>) => {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel()
  });

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/95">
      <table className="min-w-full border-separate border-spacing-0 text-sm">
        <thead className="bg-slate-950/90">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th key={header.id} className="border-b border-slate-800 px-5 py-4 text-left font-semibold text-slate-300">
                  {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id} className="border-b border-slate-800 last:border-none hover:bg-slate-950/80">
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id} className="px-5 py-4 text-slate-200">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
