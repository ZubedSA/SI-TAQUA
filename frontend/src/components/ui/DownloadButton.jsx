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
                className={`btn btn-secondary ${className}`}
                onClick={() => handleDownload(opt.format, opt.handler)}
                disabled={disabled || downloading}
            >
                <Download size={18} />
                {downloading ? 'Downloading...' : opt.label}
            </button>
        )
    }

    return (
        <div className="download-button-wrapper" ref={dropdownRef} style={{ position: 'relative', display: 'inline-block' }}>
            <button
                className={`btn btn-secondary ${className}`}
                onClick={() => setIsOpen(!isOpen)}
                disabled={disabled || downloading}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
                <Download size={18} />
                {downloading ? 'Downloading...' : 'Download'}
                <ChevronDown size={14} style={{ marginLeft: '2px' }} />
            </button>

            {isOpen && (
                <div
                    className="download-dropdown"
                    style={{
                        position: 'absolute',
                        top: '100%',
                        right: 0,
                        marginTop: '4px',
                        background: 'var(--card-bg, #ffffff)',
                        border: '1px solid var(--border-color, #e5e7eb)',
                        borderRadius: '8px',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                        minWidth: '160px',
                        zIndex: 1000,
                        overflow: 'hidden'
                    }}
                >
                    {downloadOptions.map((opt) => (
                        <button
                            key={opt.format}
                            onClick={() => handleDownload(opt.format, opt.handler)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                width: '100%',
                                padding: '10px 14px',
                                border: 'none',
                                background: 'transparent',
                                cursor: 'pointer',
                                fontSize: '14px',
                                color: 'var(--text-primary, #374151)',
                                textAlign: 'left',
                                transition: 'background 0.15s'
                            }}
                            onMouseEnter={(e) => e.target.style.background = 'var(--hover-bg, #f3f4f6)'}
                            onMouseLeave={(e) => e.target.style.background = 'transparent'}
                        >
                            {opt.icon}
                            {opt.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    )
}

export default DownloadButton
