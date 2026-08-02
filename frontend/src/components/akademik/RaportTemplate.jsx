import React from 'react';
import RaportTahfizhTemplate from './RaportTahfizhTemplate';
import RaportMadrasahTemplate from './RaportMadrasahTemplate';

const RaportTemplate = ({
    santri,
    semester,
    nilaiTahfizh,
    nilaiMadrasah,
    perilaku,
    taujihad,
    ketidakhadiran,
    musyrifName,
    waliKelasName,
    catatanWali,
    type = 'all' // 'all', 'tahfizh', 'madrasah'
}) => {
    // ========== EMBEDDED GLOBAL & PRINT STYLES ==========
    const printStyles = `
        /* SCREEN & PRINT RAPORT STYLES (OVERRIDE GLOBAL SIOHIOMA THEME) */
        .raport-sheet {
            box-sizing: border-box !important;
            font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
            background-color: #ffffff !important;
        }

        .raport-sheet table {
            border-collapse: collapse !important;
            border-spacing: 0 !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            border: 1px solid #000 !important;
            background-color: #ffffff !important;
            margin-bottom: 0 !important;
            width: 100% !important;
        }

        .raport-sheet th,
        .raport-sheet table th,
        .raport-sheet table thead th {
            background-color: #388a73 !important;
            color: #ffffff !important;
            font-weight: 700 !important;
            text-transform: uppercase !important;
            letter-spacing: 0.02em !important;
            padding: 6px 10px !important;
            font-size: 11px !important;
            border: 1px solid #000 !important;
            text-align: center !important;
            border-radius: 0 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
        }

        .raport-sheet td,
        .raport-sheet table td,
        .raport-sheet table tbody td {
            padding: 5px 8px !important;
            border: 1px solid #000 !important;
            color: #111827 !important;
            font-size: 10px !important;
            background-color: #ffffff !important;
            border-radius: 0 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
        }

        @media print {
            @page {
                size: A4;
                margin: 8mm 10mm;
            }
            
            html, body {
                width: 210mm;
                height: auto !important;
                overflow: visible !important;
                background-color: white !important;
            }

            body * {
                visibility: hidden;
            }
            
            .raport-wrapper,
            .raport-wrapper * {
                visibility: visible !important;
            }
            
            .raport-wrapper {
                position: absolute;
                left: 0;
                top: 0;
                width: 100%;
                height: auto !important;
                overflow: visible !important;
                padding: 0 !important;
                margin: 0 !important;
            }

            .raport-sheet {
                page-break-inside: avoid !important;
                break-inside: avoid !important;
                margin: 0 auto !important;
                padding: 0 !important;
                width: 100% !important;
                max-width: 100% !important;
            }

            .page-break-divider {
                page-break-after: always !important;
                break-after: page !important;
                height: 0 !important;
                display: block !important;
            }
        }
    `;

    return (
        <div className="raport-wrapper bg-slate-100 min-h-screen py-4 print:py-0 print:bg-white">
            <style>{printStyles}</style>

            {/* LEMBAR 1: RAPORT TAHFIZH */}
            {(type === 'all' || type === 'tahfizh') && (
                <RaportTahfizhTemplate
                    santri={santri}
                    semester={semester}
                    nilaiTahfizh={nilaiTahfizh}
                    perilaku={perilaku}
                    taujihad={taujihad}
                    ketidakhadiran={ketidakhadiran}
                    musyrifName={musyrifName}
                />
            )}

            {/* PAGE BREAK DIVIDER (WHEN PRINTING ALL) */}
            {type === 'all' && (
                <div className="page-break-divider my-8 print:my-0 border-t-2 border-dashed border-gray-300 print:border-none" />
            )}

            {/* LEMBAR 2: RAPORT MADRASAH */}
            {(type === 'all' || type === 'madrasah') && (
                <RaportMadrasahTemplate
                    santri={santri}
                    semester={semester}
                    nilaiMadrasah={nilaiMadrasah}
                    perilaku={perilaku}
                    ketidakhadiran={ketidakhadiran}
                    catatanWali={catatanWali || taujihad?.catatan}
                    waliKelasName={waliKelasName || santri?.wali_kelas_nama}
                    musyrifName={musyrifName || santri?.musyrif_nama}
                />
            )}
        </div>
    );
};

export default RaportTemplate;
