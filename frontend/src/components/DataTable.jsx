import React, { useState, useMemo } from 'react'
import {
    useReactTable,
    getCoreRowModel,
    getSortedRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    flexRender,
} from '@tanstack/react-table'
import {
    Search,
    ChevronLeft,
    ChevronRight,
    ArrowUpDown,
    ArrowUp,
    ArrowDown,
    Loader2,
    Users
} from 'lucide-react'

/**
 * Reusable Advanced Data Table Component
 * Features: Sorting, Global Filter, Pagination, Responsive, Modern UI
 */
const DataTable = ({
    columns,
    data = [],
    isLoading = false,
    emptyMessage = "Tidak ada data ditemukan",
    globalSearchPlaceholder = "Cari data...",
    pageSize = 10,
    className = ""
}) => {
    const [sorting, setSorting] = useState([])
    const [globalFilter, setGlobalFilter] = useState('')

    const table = useReactTable({
        data,
        columns,
        state: {
            sorting,
            globalFilter,
        },
        onSortingChange: setSorting,
        onGlobalFilterChange: setGlobalFilter,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        initialState: {
            pagination: {
                pageSize,
            },
        },
    })

    const rows = table.getRowModel().rows

    return (
        <div className={`space-y-4 ${className}`}>
            {/* Top Bar: Search */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="w-full md:max-w-xs">
                    <input
                        type="text"
                        value={globalFilter ?? ''}
                        onChange={e => setGlobalFilter(String(e.target.value))}
                        placeholder={globalSearchPlaceholder}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all bg-white"
                    />
                </div>
            </div>

            {/* Table Container */}
            <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden">
                {/* Desktop Table View (Hidden on mobile) */}
                <div className="hidden md:block overflow-x-auto custom-scrollbar">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-200">
                            {table.getHeaderGroups().map(headerGroup => (
                                <tr key={headerGroup.id}>
                                    {headerGroup.headers.map(header => {
                                        return (
                                            <th
                                                key={header.id}
                                                colSpan={header.colSpan}
                                                className={`px-6 py-4 font-semibold tracking-wider border-b border-gray-200 ${header.column.getCanSort() ? 'cursor-pointer select-none hover:bg-gray-100/50' : ''}`}
                                                style={{
                                                    width: header.getSize(),
                                                    textAlign: header.column.columnDef.meta?.textAlign || 'left',
                                                    backgroundColor: header.column.columnDef.meta?.backgroundColor || undefined
                                                }}
                                            >
                                                {!header.isPlaceholder && (
                                                    <div
                                                        className="flex items-center gap-2"
                                                        onClick={header.column.getToggleSortingHandler()}
                                                    >
                                                        {flexRender(
                                                            header.column.columnDef.header,
                                                            header.getContext()
                                                        )}
                                                        {header.column.getCanSort() && (
                                                            <div className="text-gray-400">
                                                                {{
                                                                    asc: <ArrowUp size={14} className="text-primary-500" />,
                                                                    desc: <ArrowDown size={14} className="text-primary-500" />,
                                                                }[header.column.getIsSorted()] ?? <ArrowUpDown size={14} className="opacity-40" />}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </th>
                                        )
                                    })}
                                </tr>
                            ))}
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={columns.flatMap(c => c.columns || c).length} className="px-6 py-12 text-center text-gray-500">
                                        <Loader2 className="w-8 h-8 mx-auto mb-2 animate-spin text-primary-500" />
                                        <p className="animate-pulse">Memuat data...</p>
                                    </td>
                                </tr>
                            ) : rows.length === 0 ? (
                                <tr>
                                    <td colSpan={columns.flatMap(c => c.columns || c).length} className="px-6 py-12 text-center text-gray-500">
                                        <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                                            <Users className="w-8 h-8 text-gray-400" />
                                        </div>
                                        <h3 className="text-lg font-medium text-gray-900">{emptyMessage}</h3>
                                        <p className="text-sm">Coba sesuaikan filter atau pencarian Anda.</p>
                                    </td>
                                </tr>
                            ) : (
                                rows.map(row => (
                                    <tr key={row.id} className="hover:bg-gray-50/80 transition-colors group">
                                        {row.getVisibleCells().map(cell => (
                                            <td
                                                key={cell.id}
                                                className="px-6 py-4 text-gray-600 transition-colors"
                                                style={{
                                                    textAlign: cell.column.columnDef.meta?.textAlign || 'left',
                                                    fontWeight: cell.column.columnDef.meta?.fontWeight || 'normal',
                                                    backgroundColor: cell.column.columnDef.meta?.backgroundColor || undefined
                                                }}
                                            >
                                                {flexRender(
                                                    cell.column.columnDef.cell,
                                                    cell.getContext()
                                                )}
                                            </td>
                                        ))}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Mobile Card List View (Visible < md) */}
                <div className="md:hidden divide-y divide-gray-100">
                    {isLoading ? (
                        <div className="p-8 text-center text-gray-500">
                            <Loader2 className="w-8 h-8 mx-auto mb-2 animate-spin text-primary-500" />
                            <p className="animate-pulse text-sm">Memuat data...</p>
                        </div>
                    ) : rows.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                            <div className="w-14 h-14 mx-auto mb-3 bg-gray-100 rounded-full flex items-center justify-center">
                                <Users className="w-6 h-6 text-gray-400" />
                            </div>
                            <h3 className="text-base font-semibold text-gray-900">{emptyMessage}</h3>
                            <p className="text-xs text-gray-500 mt-1">Coba sesuaikan pencarian Anda.</p>
                        </div>
                    ) : (
                        rows.map((row, idx) => {
                            const cells = row.getVisibleCells()
                            const firstCell = cells[0]
                            const remainingCells = cells.slice(1)
                            
                            return (
                                <div key={row.id || idx} className="p-4 bg-white hover:bg-gray-50/60 transition-colors space-y-3">
                                    <div className="flex items-center justify-between gap-3 border-b border-gray-100 pb-2.5">
                                        <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                                            #{table.getState().pagination.pageIndex * table.getState().pagination.pageSize + idx + 1}
                                        </div>
                                        <div className="font-semibold text-sm text-gray-900 text-right">
                                            {firstCell && flexRender(firstCell.column.columnDef.cell, firstCell.getContext())}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 gap-2 text-xs">
                                        {remainingCells.map(cell => {
                                            const headerText = typeof cell.column.columnDef.header === 'string' 
                                                ? cell.column.columnDef.header 
                                                : cell.column.id
                                            
                                            // Don't render empty action headers as label
                                            const isActionCol = cell.column.id.toLowerCase().includes('action') || cell.column.id === 'aksi'
                                            
                                            return (
                                                <div key={cell.id} className={`flex items-start justify-between gap-2 ${isActionCol ? 'pt-2 border-t border-gray-100 mt-1 justify-end' : ''}`}>
                                                    {!isActionCol && (
                                                        <span className="font-medium text-gray-400 shrink-0 capitalize">
                                                            {headerText}:
                                                        </span>
                                                    )}
                                                    <span className={`text-gray-800 text-right font-medium ${isActionCol ? 'w-full flex justify-end gap-2' : ''}`}>
                                                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                                    </span>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            )
                        })
                    )}
                </div>

                {/* Pagination Bar */}
                {!isLoading && data.length > 0 && (
                    <div className="px-4 py-3.5 sm:px-6 sm:py-4 bg-gray-50/80 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                        <div className="text-xs sm:text-sm text-gray-500 order-2 sm:order-1 text-center sm:text-left">
                            Menampilkan <span className="font-semibold text-gray-900">{table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1}</span>
                            {' '}-{' '}
                            <span className="font-semibold text-gray-900">
                                {Math.min((table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize, table.getFilteredRowModel().rows.length)}
                            </span>
                            {' '}dari{' '}
                            <span className="font-semibold text-gray-900">{table.getFilteredRowModel().rows.length}</span> data
                        </div>

                        <div className="flex items-center gap-1.5 order-1 sm:order-2">
                            <button
                                onClick={() => table.previousPage()}
                                disabled={!table.getCanPreviousPage()}
                                className="p-2.5 rounded-xl border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm active:scale-95 touch-manipulation min-w-[40px] min-h-[40px] flex items-center justify-center"
                                title="Sebelumnya"
                            >
                                <ChevronLeft size={18} />
                            </button>

                            <div className="flex items-center gap-1">
                                {table.getPageOptions().map(pageIdx => {
                                    const currPage = table.getState().pagination.pageIndex;
                                    const totalPage = table.getPageCount();

                                    if (
                                        pageIdx === 0 ||
                                        pageIdx === totalPage - 1 ||
                                        (pageIdx >= currPage - 1 && pageIdx <= currPage + 1)
                                    ) {
                                        return (
                                            <button
                                                key={pageIdx}
                                                onClick={() => table.setPageIndex(pageIdx)}
                                                className={`
                                                    min-w-[38px] h-9 sm:min-w-[40px] sm:h-10 flex items-center justify-center rounded-xl border text-xs sm:text-sm font-bold transition-all shadow-sm active:scale-95 touch-manipulation
                                                    ${currPage === pageIdx
                                                        ? 'bg-[#0A2619] border-[#0A2619] text-[#BCF32F]'
                                                        : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                                                    }
                                                `}
                                            >
                                                {pageIdx + 1}
                                            </button>
                                        );
                                    } else if (
                                        (pageIdx === 1 && currPage > 2) ||
                                        (pageIdx === totalPage - 2 && currPage < totalPage - 3)
                                    ) {
                                        return <span key={pageIdx} className="px-1 text-gray-400 text-xs">...</span>;
                                    }
                                    return null;
                                })}
                            </div>

                            <button
                                onClick={() => table.nextPage()}
                                disabled={!table.getCanNextPage()}
                                className="p-2.5 rounded-xl border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm active:scale-95 touch-manipulation min-w-[40px] min-h-[40px] flex items-center justify-center"
                                title="Selanjutnya"
                            >
                                <ChevronRight size={18} />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

export default React.memo(DataTable)
