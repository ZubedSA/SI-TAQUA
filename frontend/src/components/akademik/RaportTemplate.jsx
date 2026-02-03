import React from 'react';

const RaportTemplate = ({
    santri,
    semester,
    nilaiTahfizh,
    nilaiMadrasah,
    perilaku,
    taujihad,
    ketidakhadiran,
    musyrifName
}) => {
    // Helper function
    const getPredikat = (nilai) => {
        if (!nilai && nilai !== 0) return '-';
        if (nilai >= 90) return 'A';
        if (nilai >= 80) return 'B';
        if (nilai >= 70) return 'C';
        if (nilai >= 60) return 'D';
        return 'E';
    };

    // ========== CONSISTENT STYLING CONSTANTS ==========
    const PRIMARY_COLOR = '#009B7C';  // Main green color
    const PRIMARY_DARK = '#007A61';   // Darker green for borders

    // Common styles for consistency
    const headerStyle = {
        backgroundColor: PRIMARY_COLOR,
        color: 'white',
        WebkitPrintColorAdjust: 'exact',
        printColorAdjust: 'exact',
        border: '1px solid #000',
        padding: '8px 12px',
        fontWeight: 'bold',
        textTransform: 'uppercase',
        fontSize: '11px',
        textAlign: 'center'
    };

    const subHeaderStyle = {
        backgroundColor: PRIMARY_COLOR,
        color: 'white',
        WebkitPrintColorAdjust: 'exact',
        printColorAdjust: 'exact',
        border: '1px solid #000',
        padding: '6px 8px',
        fontWeight: '500',
        fontSize: '11px'
    };

    const cellStyle = {
        border: '1px solid #000',
        padding: '6px 8px',
        backgroundColor: 'white',
        color: '#1f2937',
        fontSize: '11px'
    };

    const tableStyle = {
        width: '100%',
        borderCollapse: 'collapse',
        borderSpacing: '0',
        border: '1px solid #000'
    };

    // ========== EMBEDDED CSS FOR PRINT ==========
    const globalStyles = `
        /* Screen & Print - Force consistent header colors */
        .raport-container table thead th {
            background-color: ${PRIMARY_COLOR} !important;
            color: white !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
        }
        
        .raport-container table tbody td {
            background-color: white !important;
            color: #1f2937 !important;
        }

        @media print {
            .raport-container table,
            .raport-container table th,
            .raport-container table td {
                border: 1pt solid #000 !important;
            }
            
            .raport-container table {
                border-collapse: collapse !important;
            }
        }
    `;

    return (
        <>
            <style>{globalStyles}</style>
            <div className="raport-container bg-white p-6 w-full max-w-[210mm] mx-auto font-sans text-xs" style={{ printColorAdjust: 'exact' }}>

                {/* ========== HEADER YAYASAN ========== */}
                <div
                    className="text-white py-4 px-6 mb-4 text-center relative"
                    style={{
                        backgroundColor: PRIMARY_COLOR,
                        borderBottom: `4px solid ${PRIMARY_DARK}`,
                        WebkitPrintColorAdjust: 'exact',
                        printColorAdjust: 'exact'
                    }}
                >
                    {/* Logo */}
                    <div className="absolute left-4 top-1/2" style={{ transform: 'translateY(-50%)' }}>
                        <img src="/logo-white.png" alt="Logo" style={{ width: '70px', height: '70px', objectFit: 'contain' }} />
                    </div>

                    {/* Title Text */}
                    <div style={{ paddingLeft: '90px', paddingRight: '20px' }}>
                        <h2 style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '4px', color: 'white' }}>
                            Yayasan Abdullah Dewi Hasanah
                        </h2>
                        <h1 style={{ fontSize: '14px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '6px', color: 'white' }}>
                            Pondok Pesantren Tahfizh Qur'an Al-Usymuni Batuan
                        </h1>
                        <p style={{ fontSize: '10px', opacity: 0.9, color: 'white' }}>
                            Jl. Raya Lenteng Ds. Batuan Barat RT 002 RW 004, Kec. Batuan, Kab. Sumenep
                        </p>
                    </div>
                </div>

                {/* ========== BIODATA SANTRI ========== */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px', marginBottom: '16px', padding: '0 8px', fontSize: '11px' }}>
                    {/* Left Column */}
                    <div>
                        <div style={{ display: 'grid', gridTemplateColumns: '110px 10px 1fr', marginBottom: '6px' }}>
                            <span style={{ fontWeight: '600', color: '#374151' }}>Nama</span>
                            <span>:</span>
                            <span style={{ fontWeight: 'bold', color: '#111827', textTransform: 'uppercase' }}>{santri?.nama}</span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '110px 10px 1fr', marginBottom: '6px' }}>
                            <span style={{ fontWeight: '600', color: '#374151' }}>Jenjang / Kelas</span>
                            <span>:</span>
                            <span style={{ color: '#111827' }}>{santri?.kelas?.nama || '-'}</span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '110px 10px 1fr' }}>
                            <span style={{ fontWeight: '600', color: '#374151' }}>NIS</span>
                            <span>:</span>
                            <span style={{ color: '#111827' }}>{santri?.nis || '-'}</span>
                        </div>
                    </div>
                    {/* Right Column */}
                    <div>
                        <div style={{ display: 'grid', gridTemplateColumns: '110px 10px 1fr', marginBottom: '6px' }}>
                            <span style={{ fontWeight: '600', color: '#374151' }}>Halaqoh</span>
                            <span>:</span>
                            <span style={{ color: '#111827' }}>{santri?.halaqoh_nama || santri?.halaqoh?.nama || '-'}</span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '110px 10px 1fr', marginBottom: '6px' }}>
                            <span style={{ fontWeight: '600', color: '#374151' }}>Semester</span>
                            <span>:</span>
                            <span style={{ color: '#111827' }}>{semester?.nama || 'Ganjil'}</span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '110px 10px 1fr' }}>
                            <span style={{ fontWeight: '600', color: '#374151' }}>Tahun Ajaran</span>
                            <span>:</span>
                            <span style={{ color: '#111827' }}>{semester?.tahun_ajaran || '2024/2025'}</span>
                        </div>
                    </div>
                </div>

                {/* ========== MAIN CONTENT GRID ========== */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '16px' }}>

                    {/* ===== LEFT COLUMN: GRADES ===== */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                        {/* TABLE: NILAI TAHFIZH */}
                        <table style={tableStyle}>
                            <thead>
                                <tr>
                                    <th colSpan="4" style={headerStyle}>NILAI TAHFIZH</th>
                                </tr>
                                <tr>
                                    <th style={{ ...subHeaderStyle, width: '40px', textAlign: 'center' }}>No</th>
                                    <th style={{ ...subHeaderStyle, textAlign: 'left' }}>Mata Pelajaran</th>
                                    <th style={{ ...subHeaderStyle, width: '60px', textAlign: 'center' }}>Nilai</th>
                                    <th style={{ ...subHeaderStyle, width: '60px', textAlign: 'center' }}>Predikat</th>
                                </tr>
                            </thead>
                            <tbody>
                                {nilaiTahfizh && nilaiTahfizh.length > 0 ? nilaiTahfizh.map((item, idx) => (
                                    <tr key={idx}>
                                        <td style={{ ...cellStyle, textAlign: 'center' }}>{idx + 1}</td>
                                        <td style={{ ...cellStyle, fontWeight: '500' }}>{item.mapel?.nama || item.komponen || '-'}</td>
                                        <td style={{ ...cellStyle, textAlign: 'center', fontWeight: 'bold' }}>{item.nilai_akhir ?? item.nilai ?? '-'}</td>
                                        <td style={{ ...cellStyle, textAlign: 'center' }}>{item.predikat || getPredikat(item.nilai_akhir ?? item.nilai)}</td>
                                    </tr>
                                )) : (
                                    [1, 2, 3].map((i) => (
                                        <tr key={i}>
                                            <td style={{ ...cellStyle, textAlign: 'center' }}>{i}</td>
                                            <td style={{ ...cellStyle, color: '#9ca3af', fontStyle: 'italic' }}>...</td>
                                            <td style={cellStyle}></td>
                                            <td style={cellStyle}></td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>

                        {/* TABLE: NILAI MADRASAH */}
                        <table style={tableStyle}>
                            <thead>
                                <tr>
                                    <th colSpan="4" style={headerStyle}>NILAI MADRASAH</th>
                                </tr>
                                <tr>
                                    <th style={{ ...subHeaderStyle, width: '40px', textAlign: 'center' }}>No</th>
                                    <th style={{ ...subHeaderStyle, textAlign: 'left' }}>Mata Pelajaran</th>
                                    <th style={{ ...subHeaderStyle, width: '60px', textAlign: 'center' }}>Nilai</th>
                                    <th style={{ ...subHeaderStyle, width: '60px', textAlign: 'center' }}>Predikat</th>
                                </tr>
                            </thead>
                            <tbody>
                                {nilaiMadrasah && nilaiMadrasah.length > 0 ? nilaiMadrasah.map((item, idx) => (
                                    <tr key={idx}>
                                        <td style={{ ...cellStyle, textAlign: 'center' }}>{idx + 1}</td>
                                        <td style={{ ...cellStyle, fontWeight: '500' }}>{item.mapel?.nama || item.komponen || '-'}</td>
                                        <td style={{ ...cellStyle, textAlign: 'center', fontWeight: 'bold' }}>{item.nilai_akhir ?? item.nilai ?? '-'}</td>
                                        <td style={{ ...cellStyle, textAlign: 'center' }}>{item.predikat || getPredikat(item.nilai_akhir ?? item.nilai)}</td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan="4" style={{ ...cellStyle, textAlign: 'center', color: '#9ca3af', fontStyle: 'italic', padding: '16px' }}>
                                            Belum ada nilai madrasah
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* ===== RIGHT COLUMN: SIDEBAR BOXES ===== */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                        {/* TABLE: PENCAPAIAN TAHFIZH */}
                        <table style={tableStyle}>
                            <thead>
                                <tr>
                                    <th colSpan="2" style={headerStyle}>PENCAPAIAN TAHFIZH</th>
                                </tr>
                                <tr>
                                    <th style={{ ...subHeaderStyle, textAlign: 'left' }}>Uraian</th>
                                    <th style={{ ...subHeaderStyle, textAlign: 'left' }}>Keterangan</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td style={{ ...cellStyle, fontWeight: '500', width: '60%' }}>Jumlah Hafalan</td>
                                    <td style={{ ...cellStyle, fontWeight: 'bold' }}>{perilaku?.jumlah_hafalan || '0 Juz'}</td>
                                </tr>
                                <tr>
                                    <td style={{ ...cellStyle, fontWeight: '500' }}>Predikat</td>
                                    <td style={{ ...cellStyle, fontWeight: 'bold' }}>{perilaku?.predikat_hafalan || 'Baik'}</td>
                                </tr>
                                <tr>
                                    <td style={{ ...cellStyle, fontWeight: '500' }}>Total Hafalan</td>
                                    <td style={{ ...cellStyle, fontWeight: 'bold' }}>{perilaku?.total_hafalan || '-'}</td>
                                </tr>
                            </tbody>
                        </table>

                        {/* TABLE: PERILAKU MURID */}
                        <table style={tableStyle}>
                            <thead>
                                <tr>
                                    <th colSpan="2" style={headerStyle}>PERILAKU MURID</th>
                                </tr>
                                <tr>
                                    <th style={{ ...subHeaderStyle, textAlign: 'left' }}>Aspek</th>
                                    <th style={{ ...subHeaderStyle, textAlign: 'left' }}>Nilai</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td style={{ ...cellStyle, fontWeight: '500', width: '60%' }}>A. Ketekunan</td>
                                    <td style={{ ...cellStyle, fontWeight: 'bold' }}>{perilaku?.ketekunan || 'Baik'}</td>
                                </tr>
                                <tr>
                                    <td style={{ ...cellStyle, fontWeight: '500' }}>B. Kedisiplinan</td>
                                    <td style={{ ...cellStyle, fontWeight: 'bold' }}>{perilaku?.kedisiplinan || 'Baik'}</td>
                                </tr>
                                <tr>
                                    <td style={{ ...cellStyle, fontWeight: '500' }}>C. Kebersihan</td>
                                    <td style={{ ...cellStyle, fontWeight: 'bold' }}>{perilaku?.kebersihan || 'Sangat Baik'}</td>
                                </tr>
                                <tr>
                                    <td style={{ ...cellStyle, fontWeight: '500' }}>D. Kerapian</td>
                                    <td style={{ ...cellStyle, fontWeight: 'bold' }}>{perilaku?.kerapian || 'Sangat Baik'}</td>
                                </tr>
                            </tbody>
                        </table>

                        {/* TABLE: KETIDAKHADIRAN */}
                        <table style={tableStyle}>
                            <thead>
                                <tr>
                                    <th colSpan="4" style={headerStyle}>KETIDAKHADIRAN</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td style={{ ...cellStyle, textAlign: 'center' }}>
                                        <span style={{ fontWeight: '500' }}>Alpa </span>
                                        <span style={{ fontWeight: 'bold' }}>{ketidakhadiran?.alpha || '0'}</span>
                                    </td>
                                    <td style={{ ...cellStyle, textAlign: 'center' }}>
                                        <span style={{ fontWeight: '500' }}>Sakit </span>
                                        <span style={{ fontWeight: 'bold' }}>{ketidakhadiran?.sakit || '0'}</span>
                                    </td>
                                    <td style={{ ...cellStyle, textAlign: 'center' }}>
                                        <span style={{ fontWeight: '500' }}>Izin </span>
                                        <span style={{ fontWeight: 'bold' }}>{ketidakhadiran?.izin || '0'}</span>
                                    </td>
                                    <td style={{ ...cellStyle, textAlign: 'center' }}>
                                        <span style={{ fontWeight: '500' }}>Pulang </span>
                                        <span style={{ fontWeight: 'bold' }}>{ketidakhadiran?.pulang || '0'}</span>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* ========== TAUJIHAT MUSYRIF ========== */}
                <div style={{ marginBottom: '20px' }}>
                    <p style={{ fontSize: '11px', fontWeight: 'bold', marginBottom: '6px', color: '#1f2937' }}>Taujihat Musyrif</p>
                    <div style={{
                        border: '1px solid #000',
                        padding: '10px 12px',
                        minHeight: '50px',
                        backgroundColor: 'white',
                        fontSize: '11px',
                        fontStyle: 'italic',
                        color: '#374151'
                    }}>
                        {taujihad?.catatan || 'bagus masyaallah'}
                    </div>
                </div>

                {/* ========== SIGNATURES ========== */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px', marginTop: '30px', marginBottom: '20px', alignItems: 'flex-end' }}>
                    {/* Left: Wali Murid */}
                    <div style={{ textAlign: 'center' }}>
                        <p style={{ fontSize: '11px', marginBottom: '40px', color: '#111827' }}>Wali Murid</p>
                        <p style={{ fontSize: '11px', fontWeight: 'bold', color: '#111827', textTransform: 'uppercase' }}>
                            ({santri?.nama_wali || '.....................'})
                        </p>
                    </div>
                    {/* Right: Musyrif */}
                    <div style={{ textAlign: 'center' }}>
                        <p style={{ fontSize: '11px', marginBottom: '4px', color: '#111827' }}>Batuan, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                        <p style={{ fontSize: '11px', marginBottom: '40px', color: '#111827' }}>Musyrif</p>
                        <p style={{ fontSize: '11px', fontWeight: 'bold', color: '#111827', textTransform: 'uppercase' }}>
                            {musyrifName || 'UST. AINUR WAFI'}
                        </p>
                    </div>
                </div>

                {/* ========== MENGETAHUI ========== */}
                <div style={{ textAlign: 'center', marginTop: '10px' }}>
                    <p style={{ fontSize: '11px', marginBottom: '2px', color: '#111827' }}>Mengetahui,</p>
                    <p style={{ fontSize: '11px', marginBottom: '40px', color: '#111827' }}>Pengasuh PTQA Batuan</p>
                    <p style={{ fontSize: '11px', fontWeight: 'bold', color: '#111827', textTransform: 'uppercase' }}>
                        KH. MIFTAHUL ARIFIN, LC.
                    </p>
                </div>

                {/* ========== PRINT STYLES ========== */}
                <style>{`
                    @media print {
                        @page {
                            size: A4;
                            margin: 10mm;
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
                        
                        .raport-container,
                        .raport-container * {
                            visibility: visible !important;
                        }
                        
                        .raport-container {
                            position: absolute;
                            left: 0;
                            top: 0;
                            width: 100%;
                            height: auto !important;
                            overflow: visible !important;
                            padding: 0 !important;
                            margin: 0 !important;
                        }
                        
                        .raport-container table {
                            border-collapse: collapse !important;
                        }
                        
                        .raport-container table th,
                        .raport-container table td {
                            border: 1pt solid #000 !important;
                        }
                        
                        .raport-container table thead th {
                            background-color: #009B7C !important;
                            color: white !important;
                            -webkit-print-color-adjust: exact !important;
                            print-color-adjust: exact !important;
                        }

                        .raport-container table tbody td {
                            background-color: white !important;
                            color: #000000 !important;
                            -webkit-print-color-adjust: exact !important;
                            print-color-adjust: exact !important;
                        }
                    }
                `}</style>
            </div>
        </>
    );
};

export default RaportTemplate;
