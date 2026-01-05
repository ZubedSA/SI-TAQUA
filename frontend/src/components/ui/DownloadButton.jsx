import { useState, useRef, useEffect } from 'react'
import { Download, FileText, FileSpreadsheet, File, ChevronDown } from 'lucide-react'

/**
 * DownloadButton - Komponen tombol download dengan dropdown
 * Mendukung format: PDF, Excel, CSV
 * 
 * @param {Function} onDownloadPDF - Handler untuk download PDF
 * @param {Function} onDownloadExcel - Handler untuk download Excel
 * @param {Function} onDownloadCSV - Handler untuk download CSV
 * @param {boolean} disabled - Disable tombol
 * @param {string} className - Additional CSS class
 */
const DownloadButton = ({
    onDownloadPDF,
    onDownloadExcel,
    onDownloadCSV,
    disabled = false,
    className = ''
}) => {
    const [isOpen, setIsOpen] = useState(false)
    const [downloading, setDownloading] = useState(false)
    const dropdownRef = useRef(null)

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const handleDownload = async (format, handler) => {
        if (!handler || downloading) return

        setDownloading(true)
        setIsOpen(false)

        try {
            await handler()
        } catch (error) {
            console.error(`Download ${format} error:`, error)
        } finally {
            setDownloading(false)
        }
    }

    const downloadOptions = [
        {
            format: 'PDF',
            icon: <FileText size={16} />,
            handler: onDownloadPDF,
            label: 'Download PDF'
        },
        {
            format: 'Excel',
            icon: <FileSpreadsheet size={16} />,
            handler: onDownloadExcel,
            label: 'Download Excel'
        },
        {
            format: 'CSV',
            icon: <File size={16} />,
            handler: onDownloadCSV,
            label: 'Download CSV'
        }
    ].filter(opt => opt.handler) // Only show options with handlers

    // If only one option, render single button
    if (downloadOptions.length === 1) {
        const opt = downloadOptions[0]
        return (
            <button
                className={`inline-flex items-center justify-center gap-2 px-4 py-2 bg-white text-gray-700 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all ${className}`}
                onClick={() => handleDownload(opt.format, opt.handler)}
                disabled={disabled || downloading}
            >
                <Download size={18} />
                {downloading ? 'Downloading...' : opt.label}
            </button>
        )
    }

    return (
        <div className="relative inline-block" ref={dropdownRef}>
            <button
                className={`inline-flex items-center justify-center gap-2 px-4 py-2 bg-white text-gray-700 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all ${className}`}
                onClick={() => setIsOpen(!isOpen)}
                disabled={disabled || downloading}
            >
                <Download size={18} />
                {downloading ? 'Downloading...' : 'Download'}
                <ChevronDown size={14} className="ml-1" />
            </button>

            {isOpen && (
                <div className="absolute right-0 top-full mt-1 min-w-[180px] bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden animate-in fade-in zoom-in-95">
                    {downloadOptions.map((opt) => (
                        <button
                            key={opt.format}
                            onClick={() => handleDownload(opt.format, opt.handler)}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900 text-left transition-colors"
                        >
                            <span className="text-gray-400">{opt.icon}</span>
                            <span className="font-medium">{opt.label}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    )
}

export default DownloadButton
