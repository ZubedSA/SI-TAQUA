import React from 'react';

const ResponsiveTable = ({
    columns,
    data,
    keyField = 'id',
    emptyState,
    loading = false,
    loadingComponent,
    mobileCardHeader,
    mobileCardActions,
    mobileCardContent,
    mobileCardPrimaryAction,
    footer
}) => {
    if (loading) {
        return loadingComponent || <div className="p-8 text-center text-gray-500">Memuat data...</div>;
    }

    if (!data || data.length === 0) {
        return emptyState || <div className="p-8 text-center text-gray-500">Belum ada data.</div>;
    }

    return (
        <div className="w-full">
            {/* Desktop Table View (Hidden on mobile) */}
            <div className="hidden md:block overflow-x-auto bg-white rounded-xl shadow-sm border border-gray-100">
                <table className="w-full text-sm text-left">
                    <thead className="bg-[#0A2619] text-[#BCF32F] font-medium border-b border-[#0A2619]">
                        <tr>
                            {columns.map((col, index) => (
                                <th key={index} className={`px-6 py-4 whitespace-nowrap ${col.className || ''}`}>
                                    {col.header}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {data.map((row, rowIndex) => (
                            <tr key={row[keyField] || rowIndex} className="hover:bg-gray-50 transition-colors">
                                {columns.map((col, colIndex) => (
                                    <td key={colIndex} className={`px-6 py-4 ${col.cellClassName || ''}`}>
                                        {col.render ? col.render(row, rowIndex) : row[col.accessor]}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                    {footer && (
                        <tfoot className="bg-gray-50 font-medium border-t border-gray-200">
                            {footer}
                        </tfoot>
                    )}
                </table>
            </div>

            {/* Mobile Card View (Hidden on desktop) */}
            <div className="md:hidden flex flex-col gap-3 w-full">
                {data.map((row, rowIndex) => (
                    <div key={row[keyField] || rowIndex} className="w-full bg-white rounded-2xl shadow-sm border border-gray-200/80 relative overflow-hidden">
                        {/* Mobile Card Header */}
                        <div className="bg-gray-50/80 px-4 py-3 border-b border-gray-200/70 flex justify-between items-center">
                            <div className="font-bold text-[#0A2619] text-sm flex-1 truncate pr-2">
                                {mobileCardHeader ? mobileCardHeader(row, rowIndex) : `#${rowIndex + 1}`}
                            </div>
                            {mobileCardActions && (
                                <div className="flex items-center gap-2 flex-shrink-0 min-h-[36px]">
                                    {mobileCardActions(row, rowIndex)}
                                </div>
                            )}
                        </div>
                        
                        {/* Mobile Card Body */}
                        <div className="px-4 py-1 flex flex-col divide-y divide-gray-100">
                            {mobileCardContent ? (
                                mobileCardContent(row, rowIndex)
                            ) : (
                                columns.map((col, colIndex) => {
                                    if (col.hideOnMobile) return null;
                                    
                                    return (
                                        <div key={colIndex} className="flex flex-row justify-between items-start gap-3 py-2.5">
                                            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider w-1/3 flex-shrink-0 pt-0.5">
                                                {col.header}
                                            </div>
                                            <div className="text-xs sm:text-sm font-medium text-gray-900 w-2/3 text-right break-words">
                                                {col.render ? col.render(row, rowIndex) : row[col.accessor]}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                        
                        {/* Mobile Card Footer (Primary Action) */}
                        {mobileCardPrimaryAction && (
                            <div className="p-4 pt-3 border-t border-gray-100 bg-gray-50/40">
                                {mobileCardPrimaryAction(row, rowIndex)}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ResponsiveTable;
