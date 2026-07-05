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
                <div className="relative flex-1 md:max-w-xs">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        type="text"
                        value={globalFilter ?? ''}
                        onChange={e => setGlobalFilter(String(e.target.value))}
                        placeholder={globalSearchPlaceholder}
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all bg-white"
                    />
                </div>
            </div>

            {/* Table Container */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-200">
                            {table.getHeaderGroups().map(headerGroup => (
                                <tr key={headerGroup.id}>
                                    {headerGroup.headers.map(header => {
                                        // Skip rendering if header is part of a rowSpan/colSpan handled by another header
                                        // In standard grouping, the placeholder headers are used to represent empty cells
                                        // but here they are causing duplication if not handled.

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
                                        <p>Coba sesuaikan filter atau pencarian Anda.</p>
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

                {/* Pagination Bar */}
                {!isLoading && data.length > 0 && (
                    <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="text-sm text-gray-500 order-2 sm:order-1">
                            Menampilkan <span className="font-medium text-gray-900">{table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1}</span>
                            {' '}-{' '}
                            <span className="font-medium text-gray-900">
                                {Math.min((table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize, table.getFilteredRowModel().rows.length)}
                            </span>
                            {' '}dari{' '}
                            <span className="font-medium text-gray-900">{table.getFilteredRowModel().rows.length}</span> data
                            {globalFilter && <span className="ml-1">(terfilter dari {data.length})</span>}
                        </div>

                        <div className="flex items-center gap-2 order-1 sm:order-2">
                            <button
                                onClick={() => table.previousPage()}
                                disabled={!table.getCanPreviousPage()}
                                className="p-2 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
                            >
                                <ChevronLeft size={18} />
                            </button>

                            <div className="flex items-center gap-1">
                                {table.getPageOptions().map(pageIdx => {
                                    // Logic to show limited page numbers
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
                                                    min-w-[40px] h-10 flex items-center justify-center rounded-lg border text-sm font-medium transition-all shadow-sm
                                                    ${currPage === pageIdx
                                                        ? 'bg-primary-600 border-primary-600 text-white'
                                                        : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
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
                                        return <span key={pageIdx} className="px-2 text-gray-400">...</span>;
                                    }
                                    return null;
                                })}
                            </div>

                            <button
                                onClick={() => table.nextPage()}
                                disabled={!table.getCanNextPage()}
                                className="p-2 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
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
