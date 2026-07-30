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

    const PRIMARY_COLOR = '#009B7C';  // Main green color
    const PRIMARY_DARK = '#007A61';   // Darker green border

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
            {/* ========== KOP YAYASAN ========== */}
            <div
                className="text-white py-3 px-5 mb-3 text-center relative rounded-sm"
                style={{
                    backgroundColor: PRIMARY_COLOR,
                    borderBottom: `3px solid ${PRIMARY_DARK}`,
                    WebkitPrintColorAdjust: 'exact',
                    printColorAdjust: 'exact'
                }}
            >
                <div className="absolute left-4 top-1/2" style={{ transform: 'translateY(-50%)' }}>
                    <img src="/logo-white.png" alt="Logo" style={{ width: '60px', height: '60px', objectFit: 'contain' }} />
                </div>

                <div style={{ paddingLeft: '80px', paddingRight: '15px' }}>
                    <h2 style={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '2px', color: 'white' }}>
                        Yayasan Abdullah Dewi Hasanah
                    </h2>
                    <h1 style={{ fontSize: '13px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px', color: 'white' }}>
                        Pondok Pesantren Tahfizh Qur'an Al-Usymuni Batuan
                    </h1>
                    <p style={{ fontSize: '9px', opacity: 0.9, color: 'white' }}>
                        Jl. Raya Lenteng Ds. Batuan Barat RT 002 RW 004, Kec. Batuan, Kab. Sumenep
                    </p>
                </div>
            </div>

            {/* ========== BIODATA SANTRI ========== */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginBottom: '12px', padding: '0 4px', fontSize: '10px' }}>
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
                            {nilaiTahfizh && nilaiTahfizh.length > 0 ? (
                                nilaiTahfizh.map((item, idx) => {
                                    const val = item.nilai_akhir ?? item.nilai;
                                    const roundedVal = val !== null && val !== undefined && val !== '' ? Math.round(Number(val)) : '-';
                                    return (
                                        <tr key={idx}>
                                            <td style={{ ...cellStyle, textAlign: 'center' }}>{idx + 1}</td>
                                            <td style={{ ...cellStyle, fontWeight: '500' }}>{item.mapel?.nama || item.komponen || '-'}</td>
                                            <td style={{ ...cellStyle, textAlign: 'center', fontWeight: 'bold' }}>{roundedVal}</td>
                                            <td style={{ ...cellStyle, textAlign: 'center', fontWeight: 'bold' }}>{item.predikat || getPredikat(roundedVal)}</td>
                                        </tr>
                                    );
                                })
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
                                <th style={{ ...subHeaderStyle, width: '100px', textAlign: 'center' }}>Keterangan</th>
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
                                <th style={{ ...subHeaderStyle, width: '80px', textAlign: 'center' }}>Nilai</th>
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

                    {/* TABLE KETIDAKHADIRAN */}
                    <table style={tableStyle}>
                        <thead>
                            <tr>
                                <th colSpan="4" style={headerStyle}>KETIDAKHADIRAN</th>
                            </tr>
                            <tr>
                                <th style={{ ...subHeaderStyle, width: '25%', textAlign: 'center' }}>Alpa</th>
                                <th style={{ ...subHeaderStyle, width: '25%', textAlign: 'center' }}>Sakit</th>
                                <th style={{ ...subHeaderStyle, width: '25%', textAlign: 'center' }}>Izin</th>
                                <th style={{ ...subHeaderStyle, width: '25%', textAlign: 'center' }}>Pulang</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td style={{ ...cellStyle, textAlign: 'center', fontWeight: 'bold' }}>{ketidakhadiran?.alpha ?? '0'}</td>
                                <td style={{ ...cellStyle, textAlign: 'center', fontWeight: 'bold' }}>{ketidakhadiran?.sakit ?? '0'}</td>
                                <td style={{ ...cellStyle, textAlign: 'center', fontWeight: 'bold' }}>{ketidakhadiran?.izin ?? '0'}</td>
                                <td style={{ ...cellStyle, textAlign: 'center', fontWeight: 'bold' }}>{ketidakhadiran?.pulang ?? '0'}</td>
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
                    minHeight: '40px',
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
                    <p style={{ fontSize: '10px', marginBottom: '40px', color: '#111827' }}>Wali Murid</p>
                    <p style={{ fontSize: '10px', fontWeight: 'bold', color: '#111827', textTransform: 'uppercase' }}>
                        ({santri?.nama_wali || santri?.nama || '.....................'})
                    </p>
                </div>
                <div style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: '10px', marginBottom: '4px', color: '#111827' }}>
                        Batuan, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                    <p style={{ fontSize: '10px', marginBottom: '40px', color: '#111827' }}>Musyrif</p>
                    <p style={{ fontSize: '10px', fontWeight: 'bold', color: '#111827', textTransform: 'uppercase' }}>
                        {musyrifName || santri?.musyrif_nama || 'UST. SUBAIDI'}
                    </p>
                </div>
            </div>

            {/* ========== MENGETAHUI PENGASUH ========== */}
            <div style={{ textAlign: 'center', marginTop: '6px' }}>
                <p style={{ fontSize: '10px', marginBottom: '2px', color: '#111827' }}>Mengetahui,</p>
                <p style={{ fontSize: '10px', marginBottom: '35px', color: '#111827' }}>Pengasuh PTQA Batuan</p>
                <p style={{ fontSize: '10px', fontWeight: 'bold', color: '#111827', textTransform: 'uppercase' }}>
                    KH. MIFTAHUL ARIFIN, LC.
                </p>
            </div>
        </div>
    );
};

export default RaportTahfizhTemplate;
