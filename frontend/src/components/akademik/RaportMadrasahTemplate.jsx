import React from 'react';

// Helper function compliant with MMU Sidogiri Pedoman (Skala 3 - 10)
export const calculateSidogiriGrade = (nilaiUjian, nilaiHarian) => {
    const u = nilaiUjian !== '' && nilaiUjian !== null && nilaiUjian !== undefined && !isNaN(nilaiUjian) ? Number(nilaiUjian) : null;
    const h = nilaiHarian !== '' && nilaiHarian !== null && nilaiHarian !== undefined && !isNaN(nilaiHarian) ? Number(nilaiHarian) : null;

    if (u === null && h === null) return { raw: '-', finalGrade: '-', isRed: false };

    let raw100 = 0;
    if (u !== null && h !== null) {
        raw100 = (u * 2 + h) / 3;
    } else if (u !== null) {
        raw100 = u;
    } else if (h !== null) {
        raw100 = h;
    }

    let scoreOn10 = raw100 > 10 ? raw100 / 10 : raw100;
    let rounded = Math.round(scoreOn10);
    let finalGrade = Math.max(3, Math.min(10, rounded));
    const isRed = finalGrade <= 5;

    return {
        raw: raw100.toFixed(2),
        finalGrade,
        isRed
    };
};

const RaportMadrasahTemplate = ({
    santri,
    semester,
    nilaiMadrasah = [],
    perilaku = {},
    taujihad = {},
    ketidakhadiran = {},
    catatanWali = '',
    waliKelasName = '',
    musyrifName = ''
}) => {
    const getPredikat = (nilai) => {
        if (nilai === null || nilai === undefined || nilai === '' || nilai === '-' || String(nilai).trim() === '-') return '-';
        const n = Number(nilai);
        if (isNaN(n) || n === 0) return '-';
        if (n >= 9 || n >= 90) return 'A';
        if (n >= 8 || n >= 80) return 'B';
        if (n >= 7 || n >= 70) return 'C';
        if (n >= 6 || n >= 60) return 'D';
        return 'E';
    };

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

    const processedList = nilaiMadrasah.map(item => {
        let calc;
        const valRaport = item.nilai_raport ?? item.nilai ?? item.nilai_akhir;
        if (valRaport !== undefined && valRaport !== null && valRaport !== '' && valRaport !== '-' && !isNaN(valRaport) && Number(valRaport) <= 10) {
            const fg = Number(valRaport);
            calc = { finalGrade: fg, isRed: fg <= 5 };
        } else if (valRaport !== undefined && valRaport !== null && valRaport !== '' && valRaport !== '-' && !isNaN(valRaport)) {
            const val = Number(valRaport);
            const fg = val > 10 ? Math.round(val / 10) : Math.round(val);
            calc = { finalGrade: Math.max(3, Math.min(10, fg)), isRed: fg <= 5 };
        } else {
            calc = calculateSidogiriGrade(item.nilai_ujian, item.nilai_harian);
        }

        const { finalGrade } = calc || {};
        const rawGrade = (valRaport !== null && valRaport !== undefined && valRaport !== '' && valRaport !== '-' && valRaport !== 'NaN' && !isNaN(valRaport))
            ? valRaport
            : (finalGrade && finalGrade !== 'NaN' && !isNaN(finalGrade) ? finalGrade : '-');
        const displayGrade = (rawGrade === null || rawGrade === undefined || rawGrade === '-' || rawGrade === 'NaN' || isNaN(rawGrade)) ? '-' : rawGrade;

        return {
            ...item,
            calc,
            displayGrade
        };
    }).filter(item => item.displayGrade !== '-');

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
                        <span style={{ color: '#111827', fontWeight: '500' }}>{santri?.halaqoh?.nama || '-'}</span>
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
                {/* LEFT: NILAI MADRASAH */}
                <div>
                    <table style={tableStyle}>
                        <thead>
                            <tr>
                                <th colSpan="4" style={headerStyle}>NILAI MADRASAH</th>
                            </tr>
                            <tr>
                                <th style={{ ...subHeaderStyle, width: '35px', textAlign: 'center' }}>No</th>
                                <th style={{ ...subHeaderStyle, textAlign: 'left' }}>Mata Pelajaran</th>
                                <th style={{ ...subHeaderStyle, width: '55px', textAlign: 'center' }}>Nilai</th>
                                <th style={{ ...subHeaderStyle, width: '55px', textAlign: 'center' }}>Predikat</th>
                            </tr>
                        </thead>
                        <tbody>
                            {processedList && processedList.length > 0 ? (
                                processedList.map((item, idx) => {
                                    const { isRed } = item.calc || {};
                                    const displayGrade = item.displayGrade;
                                    const predikatVal = getPredikat(displayGrade);

                                    return (
                                        <tr key={idx}>
                                            <td style={{ ...cellStyle, textAlign: 'center' }}>{idx + 1}</td>
                                            <td style={{ ...cellStyle, fontWeight: '500' }}>{item.mapel?.nama || item.mapel_nama || item.nama || '-'}</td>
                                            <td style={{ ...cellStyle, textAlign: 'center', fontWeight: 'bold', color: isRed ? '#dc2626' : '#000000' }}>
                                                {displayGrade}
                                            </td>
                                            <td style={{ ...cellStyle, textAlign: 'center', fontWeight: 'bold' }}>
                                                {predikatVal}
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan="4" style={{ ...cellStyle, textAlign: 'center', color: '#9ca3af', fontStyle: 'italic', padding: '16px' }}>
                                        Belum ada data nilai madrasah
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* RIGHT: PERILAKU & KETIDAKHADIRAN */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
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
                                <td style={{ ...cellStyle, fontWeight: 'bold', textAlign: 'center' }}>{perilaku?.ketekunan_kelas || perilaku?.ketekunan || 'Sangat Baik'}</td>
                            </tr>
                            <tr>
                                <td style={{ ...cellStyle, fontWeight: '500' }}>B. Kedisiplinan</td>
                                <td style={{ ...cellStyle, fontWeight: 'bold', textAlign: 'center' }}>{perilaku?.kedisiplinan_kelas || perilaku?.kedisiplinan || 'Sangat Baik'}</td>
                            </tr>
                            <tr>
                                <td style={{ ...cellStyle, fontWeight: '500' }}>C. Kebersihan</td>
                                <td style={{ ...cellStyle, fontWeight: 'bold', textAlign: 'center' }}>{perilaku?.kebersihan_kelas || perilaku?.kebersihan || 'Sangat Baik'}</td>
                            </tr>
                            <tr>
                                <td style={{ ...cellStyle, fontWeight: '500' }}>D. Kerapian</td>
                                <td style={{ ...cellStyle, fontWeight: 'bold', textAlign: 'center' }}>{perilaku?.kerapian_kelas || perilaku?.kerapian || 'Sangat Baik'}</td>
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
                                    Alpa <span style={{ fontWeight: 'bold' }}>{ketidakhadiran?.alpha_kelas ?? ketidakhadiran?.alpha ?? '0'}</span>
                                </td>
                                <td style={{ ...cellStyle, textAlign: 'center', width: '25%' }}>
                                    Sakit <span style={{ fontWeight: 'bold' }}>{ketidakhadiran?.sakit_kelas ?? ketidakhadiran?.sakit ?? '0'}</span>
                                </td>
                                <td style={{ ...cellStyle, textAlign: 'center', width: '25%' }}>
                                    Izin <span style={{ fontWeight: 'bold' }}>{ketidakhadiran?.izin_kelas ?? ketidakhadiran?.izin ?? '0'}</span>
                                </td>
                                <td style={{ ...cellStyle, textAlign: 'center', width: '25%' }}>
                                    Pulang <span style={{ fontWeight: 'bold' }}>{ketidakhadiran?.pulang_kelas ?? ketidakhadiran?.pulang ?? '0'}</span>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ========== CATATAN WALI KELAS ========== */}
            <div style={{ marginBottom: '14px' }}>
                <p style={{ fontSize: '10px', fontWeight: 'bold', marginBottom: '4px', color: '#1f2937' }}>
                    Catatan Wali Kelas
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
                    {catatanWali || perilaku?.catatan_wali || taujihad?.catatan_wali || taujihad?.catatan || perilaku?.catatan || '-'}
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
                    <p style={{ fontSize: '10px', marginBottom: '45px', color: '#111827' }}>Wali Kelas</p>
                    <p style={{ fontSize: '10px', fontWeight: 'bold', color: '#111827', textTransform: 'uppercase' }}>
                        {(() => {
                            const raw = waliKelasName || santri?.wali_kelas_nama || santri?.kelas?.wali_kelas?.nama || '';
                            const parts = raw.split(',').map(s => s.trim()).filter(s => s && !s.toUpperCase().includes('ADMIN'));
                            return parts.length > 0 ? parts.join(', ') : '.....................';
                        })()}
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

export default RaportMadrasahTemplate;
