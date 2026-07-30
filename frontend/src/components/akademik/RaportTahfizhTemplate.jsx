import React from 'react';

const RaportTahfizhTemplate = ({
    santri,
    semester,
    nilaiTahfizh = [],
    perilaku = {},
    taujihad = {},
    ketidakhadiran = {},
    musyrifName = ''
}) => {
    // Helper function for predicate
    const getPredikat = (nilai) => {
        if (nilai === null || nilai === undefined || nilai === '' || isNaN(nilai) || nilai === '-') return '-';
        const n = Number(nilai);
        if (n >= 90) return 'A';
        if (n >= 80) return 'B';
        if (n >= 70) return 'C';
        if (n >= 60) return 'D';
        return 'E';
    };

    const filteredTahfizh = (nilaiTahfizh || []).map(item => {
        const val = item.nilai_akhir ?? item.nilai;
        const roundedVal = (val !== null && val !== undefined && val !== '' && val !== '-' && !isNaN(val)) ? Math.round(Number(val)) : '-';
        return {
            ...item,
            roundedVal
        };
    }).filter(item => item.roundedVal !== '-');

    const PRIMARY_COLOR = '#388a73';  // Matching reference green color
    const PRIMARY_DARK = '#2b6e5c';   // Darker green border

    const headerStyle = {
        backgroundColor: PRIMARY_COLOR,
        color: 'white',
        WebkitPrintColorAdjust: 'exact',
        printColorAdjust: 'exact',
        border: '1px solid #000',
        padding: '6px 10px',
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
        padding: '5px 8px',
        fontWeight: '600',
        fontSize: '10px'
    };

    const cellStyle = {
        border: '1px solid #000',
        padding: '5px 8px',
        backgroundColor: 'white',
        color: '#1f2937',
        fontSize: '10px'
    };

    const tableStyle = {
        width: '100%',
        borderCollapse: 'collapse',
        borderSpacing: '0',
        border: '1px solid #000'
    };

    return (
        <div className="raport-sheet bg-white p-6 w-full max-w-[210mm] mx-auto font-sans text-xs" style={{ printColorAdjust: 'exact' }}>
            {/* ========== KOP YAYASAN (REVAMPED FROM SCRATCH) ========== */}
            <div
                className="kop-header text-white py-2.5 px-4 mb-3 rounded-sm flex items-center justify-between"
                style={{
                    backgroundColor: PRIMARY_COLOR,
                    borderBottom: `3px solid ${PRIMARY_DARK}`,
                    WebkitPrintColorAdjust: 'exact',
                    printColorAdjust: 'exact',
                    width: '100%',
                    boxSizing: 'border-box'
                }}
            >
                {/* Logo Left (Enlarged to 75px) */}
                <div style={{ width: '80px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <img src="/logo-white.png" alt="Logo" style={{ width: '75px', height: '75px', objectFit: 'contain' }} />
                </div>

                {/* Center Titles */}
                <div style={{ flex: 1, textAlign: 'center', paddingLeft: '5px', paddingRight: '5px' }}>
                    <div style={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1.2px', marginBottom: '2px', color: 'white' }}>
                        Yayasan Abdullah Dewi Hasanah
                    </div>
                    <div style={{ fontSize: '11.5px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '3px', color: 'white', whiteSpace: 'nowrap' }}>
                        Pondok Pesantren Tahfizh Qur'an Al-Usymuni Batuan
                    </div>
                    <div style={{ fontSize: '8.5px', fontWeight: '400', opacity: 0.95, color: 'white' }}>
                        Jl. Raya Lenteng Ds. Batuan Barat RT 002 RW 004, Kec. Batuan, Kab. Sumenep
                    </div>
                </div>

                {/* Right Spacer for 100% symmetry */}
                <div style={{ width: '80px', flexShrink: 0 }} />
            </div>

            {/* ========== BIODATA SANTRI ========== */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginBottom: '14px', padding: '0 4px', fontSize: '10px' }}>
                <div>
                    <div style={{ display: 'grid', gridTemplateColumns: '100px 10px 1fr', marginBottom: '4px' }}>
                        <span style={{ fontWeight: '600', color: '#374151' }}>Nama</span>
                        <span>:</span>
                        <span style={{ fontWeight: 'bold', color: '#111827', textTransform: 'uppercase' }}>{santri?.nama || '-'}</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '100px 10px 1fr', marginBottom: '4px' }}>
                        <span style={{ fontWeight: '600', color: '#374151' }}>Jenjang / Kelas</span>
                        <span>:</span>
                        <span style={{ color: '#111827' }}>{santri?.kelas?.nama || '-'}</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '100px 10px 1fr' }}>
                        <span style={{ fontWeight: '600', color: '#374151' }}>NIS</span>
                        <span>:</span>
                        <span style={{ color: '#111827' }}>{santri?.nis || '-'}</span>
                    </div>
                </div>
                <div>
                    <div style={{ display: 'grid', gridTemplateColumns: '100px 10px 1fr', marginBottom: '4px' }}>
                        <span style={{ fontWeight: '600', color: '#374151' }}>Halaqoh</span>
                        <span>:</span>
                        <span style={{ color: '#111827', fontWeight: '500' }}>
                            {santri?.halaqoh?.nama || '-'}
                        </span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '100px 10px 1fr', marginBottom: '4px' }}>
                        <span style={{ fontWeight: '600', color: '#374151' }}>Semester</span>
                        <span>:</span>
                        <span style={{ color: '#111827' }}>{semester?.nama || 'Ganjil'}</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '100px 10px 1fr' }}>
                        <span style={{ fontWeight: '600', color: '#374151' }}>Tahun Ajaran</span>
                        <span>:</span>
                        <span style={{ color: '#111827' }}>{semester?.tahun_ajaran || '2024/2025'}</span>
                    </div>
                </div>
            </div>

            {/* ========== CONTENT GRID ========== */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '14px', marginBottom: '12px' }}>
                {/* LEFT: NILAI TAHFIZH */}
                <div>
                    <table style={tableStyle}>
                        <thead>
                            <tr>
                                <th colSpan="4" style={headerStyle}>NILAI TAHFIZH</th>
                            </tr>
                            <tr>
                                <th style={{ ...subHeaderStyle, width: '35px', textAlign: 'center' }}>No</th>
                                <th style={{ ...subHeaderStyle, textAlign: 'left' }}>Mata Pelajaran</th>
                                <th style={{ ...subHeaderStyle, width: '55px', textAlign: 'center' }}>Nilai</th>
                                <th style={{ ...subHeaderStyle, width: '55px', textAlign: 'center' }}>Predikat</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredTahfizh && filteredTahfizh.length > 0 ? (
                                filteredTahfizh.map((item, idx) => (
                                    <tr key={idx}>
                                        <td style={{ ...cellStyle, textAlign: 'center' }}>{idx + 1}</td>
                                        <td style={{ ...cellStyle, fontWeight: '500' }}>{item.mapel?.nama || item.komponen || '-'}</td>
                                        <td style={{ ...cellStyle, textAlign: 'center', fontWeight: 'bold' }}>{item.roundedVal}</td>
                                        <td style={{ ...cellStyle, textAlign: 'center', fontWeight: 'bold' }}>{item.predikat || getPredikat(item.roundedVal)}</td>
                                    </tr>
                                ))
                            ) : (
                                [
                                    { label: 'Hafalan' },
                                    { label: 'Tajwid' },
                                    { label: 'Fashohah / Kelancaran' }
                                ].map((comp, idx) => (
                                    <tr key={idx}>
                                        <td style={{ ...cellStyle, textAlign: 'center' }}>{idx + 1}</td>
                                        <td style={{ ...cellStyle, fontWeight: '500' }}>{comp.label}</td>
                                        <td style={{ ...cellStyle, textAlign: 'center', color: '#9ca3af' }}>-</td>
                                        <td style={{ ...cellStyle, textAlign: 'center', color: '#9ca3af' }}>-</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* RIGHT: PENCAPAIAN, PERILAKU & KETIDAKHADIRAN */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {/* TABLE PENCAPAIAN TAHFIZH */}
                    <table style={tableStyle}>
                        <thead>
                            <tr>
                                <th colSpan="2" style={headerStyle}>PENCAPAIAN TAHFIZH</th>
                            </tr>
                            <tr>
                                <th style={{ ...subHeaderStyle, textAlign: 'left' }}>Uraian</th>
                                <th style={{ ...subHeaderStyle, width: '95px', textAlign: 'center' }}>Keterangan</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td style={{ ...cellStyle, fontWeight: '500' }}>Jumlah Hafalan</td>
                                <td style={{ ...cellStyle, fontWeight: 'bold', textAlign: 'center' }}>{perilaku?.jumlah_hafalan || '3'}</td>
                            </tr>
                            <tr>
                                <td style={{ ...cellStyle, fontWeight: '500' }}>Predikat</td>
                                <td style={{ ...cellStyle, fontWeight: 'bold', textAlign: 'center' }}>{perilaku?.predikat_hafalan || 'Baik'}</td>
                            </tr>
                            <tr>
                                <td style={{ ...cellStyle, fontWeight: '500' }}>Total Hafalan</td>
                                <td style={{ ...cellStyle, fontWeight: 'bold', textAlign: 'center' }}>{perilaku?.total_hafalan || '5'}</td>
                            </tr>
                        </tbody>
                    </table>

                    {/* TABLE PERILAKU MURID */}
                    <table style={tableStyle}>
                        <thead>
                            <tr>
                                <th colSpan="2" style={headerStyle}>PERILAKU MURID</th>
                            </tr>
                            <tr>
                                <th style={{ ...subHeaderStyle, textAlign: 'left' }}>Aspek</th>
                                <th style={{ ...subHeaderStyle, width: '85px', textAlign: 'center' }}>Nilai</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td style={{ ...cellStyle, fontWeight: '500' }}>A. Ketekunan</td>
                                <td style={{ ...cellStyle, fontWeight: 'bold', textAlign: 'center' }}>{perilaku?.ketekunan || 'Baik'}</td>
                            </tr>
                            <tr>
                                <td style={{ ...cellStyle, fontWeight: '500' }}>B. Kedisiplinan</td>
                                <td style={{ ...cellStyle, fontWeight: 'bold', textAlign: 'center' }}>{perilaku?.kedisiplinan || 'Cukup'}</td>
                            </tr>
                            <tr>
                                <td style={{ ...cellStyle, fontWeight: '500' }}>C. Kebersihan</td>
                                <td style={{ ...cellStyle, fontWeight: 'bold', textAlign: 'center' }}>{perilaku?.kebersihan || 'Cukup'}</td>
                            </tr>
                            <tr>
                                <td style={{ ...cellStyle, fontWeight: '500' }}>D. Kerapian</td>
                                <td style={{ ...cellStyle, fontWeight: 'bold', textAlign: 'center' }}>{perilaku?.kerapian || 'Baik'}</td>
                            </tr>
                        </tbody>
                    </table>

                    {/* TABLE KETIDAKHADIRAN (Matching image layout: 4 cells with "Alpa 0", "Sakit 1", etc.) */}
                    <table style={tableStyle}>
                        <thead>
                            <tr>
                                <th colSpan="4" style={headerStyle}>KETIDAKHADIRAN</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td style={{ ...cellStyle, textAlign: 'center', width: '25%' }}>
                                    Alpa <span style={{ fontWeight: 'bold' }}>{ketidakhadiran?.alpha ?? '0'}</span>
                                </td>
                                <td style={{ ...cellStyle, textAlign: 'center', width: '25%' }}>
                                    Sakit <span style={{ fontWeight: 'bold' }}>{ketidakhadiran?.sakit ?? '0'}</span>
                                </td>
                                <td style={{ ...cellStyle, textAlign: 'center', width: '25%' }}>
                                    Izin <span style={{ fontWeight: 'bold' }}>{ketidakhadiran?.izin ?? '0'}</span>
                                </td>
                                <td style={{ ...cellStyle, textAlign: 'center', width: '25%' }}>
                                    Pulang <span style={{ fontWeight: 'bold' }}>{ketidakhadiran?.pulang ?? '0'}</span>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ========== TAUJIHAT MUSYRIF ========== */}
            <div style={{ marginBottom: '14px' }}>
                <p style={{ fontSize: '10px', fontWeight: 'bold', marginBottom: '4px', color: '#1f2937' }}>
                    Taujihat Musyrif
                </p>
                <div style={{
                    border: '1px solid #000',
                    padding: '8px 10px',
                    minHeight: '42px',
                    backgroundColor: 'white',
                    fontSize: '10px',
                    fontStyle: 'italic',
                    color: '#374151'
                }}>
                    {taujihad?.catatan || 'baiklah'}
                </div>
            </div>

            {/* ========== SIGNATURES ========== */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginTop: '20px', marginBottom: '10px', alignItems: 'flex-end' }}>
                <div style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: '10px', marginBottom: '45px', color: '#111827' }}>Wali Murid</p>
                    <p style={{ fontSize: '10px', fontWeight: 'bold', color: '#111827', textTransform: 'uppercase' }}>
                        ({santri?.nama_wali || '.....................'})
                    </p>
                </div>
                <div style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: '10px', marginBottom: '4px', color: '#111827' }}>
                        Batuan, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                    <p style={{ fontSize: '10px', marginBottom: '45px', color: '#111827' }}>Musyrif</p>
                    <p style={{ fontSize: '10px', fontWeight: 'bold', color: '#111827', textTransform: 'uppercase' }}>
                        {musyrifName || santri?.musyrif_nama || 'UST. SUBAIDI'}
                    </p>
                </div>
            </div>

            {/* ========== MENGETAHUI PENGASUH ========== */}
            <div style={{ textAlign: 'center', marginTop: '6px' }}>
                <p style={{ fontSize: '10px', marginBottom: '2px', color: '#111827' }}>Mengetahui,</p>
                <p style={{ fontSize: '10px', marginBottom: '40px', color: '#111827' }}>Pengasuh PTQA Batuan</p>
                <p style={{ fontSize: '10px', fontWeight: 'bold', color: '#111827', textTransform: 'uppercase' }}>
                    KH. MIFTAHUL ARIFIN, LC.
                </p>
            </div>
        </div>
    );
};

export default RaportTahfizhTemplate;
