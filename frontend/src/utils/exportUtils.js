/**
 * Export Utilities
 * Helper functions untuk export data ke Excel dan CSV
 */

/**
 * Export data ke format Excel (.xlsx)
 * Menggunakan format HTML table yang bisa dibuka Excel
 * 
 * @param {Array} data - Array of objects atau array of arrays
 * @param {Array} columns - Array of column headers
 * @param {string} filename - Nama file output (tanpa extension)
 */
export const exportToExcel = (data, columns, filename = 'export') => {
    if (!data || data.length === 0) {
        console.warn('No data to export')
        return
    }

    // Build HTML table
    let html = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office" 
              xmlns:x="urn:schemas-microsoft-com:office:excel">
        <head>
            <meta charset="UTF-8">
            <!--[if gte mso 9]>
            <xml>
                <x:ExcelWorkbook>
                    <x:ExcelWorksheets>
                        <x:ExcelWorksheet>
                            <x:Name>Sheet1</x:Name>
                            <x:WorksheetOptions>
                                <x:DisplayGridlines/>
                            </x:WorksheetOptions>
                        </x:ExcelWorksheet>
                    </x:ExcelWorksheets>
                </x:ExcelWorkbook>
            </xml>
            <![endif]-->
            <style>
                table { border-collapse: collapse; }
                th, td { border: 1px solid #000; padding: 8px; }
                th { background: #f0f0f0; font-weight: bold; }
            </style>
        </head>
        <body>
            <table>
                <thead>
                    <tr>${columns.map(col => `<th>${escapeHtml(col)}</th>`).join('')}</tr>
                </thead>
                <tbody>
    `

    // Add data rows
    data.forEach(row => {
        html += '<tr>'
        if (Array.isArray(row)) {
            row.forEach(cell => {
                html += `<td>${escapeHtml(String(cell ?? ''))}</td>`
            })
        } else {
            columns.forEach((col, idx) => {
                const keys = Object.keys(row)
                const value = row[keys[idx]] ?? ''
                html += `<td>${escapeHtml(String(value))}</td>`
            })
        }
        html += '</tr>'
    })

    html += '</tbody></table></body></html>'

    // Download
    const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8' })
    downloadBlob(blob, `${filename}.xls`)
}

/**
 * Export data ke format CSV
 * 
 * @param {Array} data - Array of objects atau array of arrays
 * @param {Array} columns - Array of column headers
 * @param {string} filename - Nama file output (tanpa extension)
 */
export const exportToCSV = (data, columns, filename = 'export') => {
    if (!data || data.length === 0) {
        console.warn('No data to export')
        return
    }

    // Build CSV content
    let csv = columns.map(col => escapeCsvField(col)).join(',') + '\n'

    data.forEach(row => {
        if (Array.isArray(row)) {
            csv += row.map(cell => escapeCsvField(String(cell ?? ''))).join(',') + '\n'
        } else {
            const values = columns.map((col, idx) => {
                const keys = Object.keys(row)
                return escapeCsvField(String(row[keys[idx]] ?? ''))
            })
            csv += values.join(',') + '\n'
        }
    })

    // Download with BOM for Excel compatibility
    const BOM = '\uFEFF'
    const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8' })
    downloadBlob(blob, `${filename}.csv`)
}

/**
 * Helper: Escape HTML special characters
 */
const escapeHtml = (text) => {
    const div = document.createElement('div')
    div.textContent = text
    return div.innerHTML
}

/**
 * Helper: Escape CSV field (handle commas, quotes, newlines)
 */
const escapeCsvField = (field) => {
    if (field.includes(',') || field.includes('"') || field.includes('\n')) {
        return `"${field.replace(/"/g, '""')}"`
    }
    return field
}

/**
 * Helper: Download blob as file
 */
const downloadBlob = (blob, filename) => {
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
}

export default {
    exportToExcel,
    exportToCSV
}
