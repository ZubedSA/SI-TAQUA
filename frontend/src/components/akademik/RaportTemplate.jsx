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
    catatanWali,
    type = 'all' // 'all', 'tahfizh', 'madrasah'
}) => {
    // ========== EMBEDDED GLOBAL PRINT STYLES ==========
    const printStyles = `
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
            
            .raport-sheet table {
                border-collapse: collapse !important;
            }
            
            .raport-sheet table th,
            .raport-sheet table td {
                border: 1pt solid #000 !important;
            }
            
            .raport-sheet table thead th {
                background-color: #009B7C !important;
                color: white !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
            }

            .raport-sheet table tbody td {
                background-color: white !important;
                color: #000000 !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
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
                    musyrifName={musyrifName}
                />
            )}
        </div>
    );
};

export default RaportTemplate;
