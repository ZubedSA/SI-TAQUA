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
    // Helper
    const getPredikat = (nilai) => {
        if (!nilai && nilai !== 0) return '-';
        if (nilai >= 90) return 'A';
        if (nilai >= 80) return 'B';
        if (nilai >= 70) return 'C';
        if (nilai >= 60) return 'D';
        return 'E';
    };

    // Styling constants
    const TABLE_HEADER_COLOR = 'bg-[#009B7C]';
    const HEADER_TEXT_COLOR = 'text-white';

    return (
        <div className="bg-white p-[5mm] shadow-none w-full max-w-[210mm] mx-auto box-border leading-tight text-xs font-sans relative print:p-0 print:w-full">

            {/* 1. Header Yayasan */}
            <div className="bg-[#009B7C] text-white py-3 px-4 mb-2 text-center relative print-color-adjust-exact border-b-4 border-[#007A61]">
                {/* Logo */}
                <div className="absolute left-6 top-1/2 -translate-y-1/2 flex items-center justify-center">
                    <img src="/logo-white.png" alt="Logo" className="w-24 h-24 object-contain drop-shadow-sm" />
                </div>

                {/* Text Container */}
                <div className="w-full px-12">
                    <h2 className="text-sm font-bold uppercase tracking-widest opacity-95 mb-1 text-white">Yayasan Abdullah Dewi Hasanah</h2>
                    <h1 className="text-base font-bold uppercase tracking-wide mb-2 text-white leading-tight font-sans">Pondok Pesantren Tahfizh Qur'an Al-Usymuni Batuan</h1>
                    <div className="flex justify-center items-center gap-2 text-xs font-normal opacity-90 text-white">
                        <span>Jl. Raya Lenteng Ds. Batuan Barat RT 002 RW 004, Kec. Batuan, Kab. Sumenep</span>
                    </div>
                </div>
            </div>

            {/* 2. Biodata Section */}
            {/* Note: User requested removal of "DATA SANTRI" header */}
            <div className="grid grid-cols-2 gap-x-12 mb-4 px-2 text-[11px]">
                {/* Left Column */}
                <div className="space-y-2">
                    <div className="grid grid-cols-[110px_10px_1fr]">
                        <span className="font-semibold text-gray-700">Nama</span>
                        <span>:</span>
                        <span className="font-bold uppercase text-gray-900">{santri?.nama}</span>
                    </div>
                    <div className="grid grid-cols-[110px_10px_1fr]">
                        <span className="font-semibold text-gray-700">Jenjang / Kelas</span>
                        <span>:</span>
                        <span className="text-gray-900">{santri?.kelas?.nama || '-'}</span>
                    </div>
                    <div className="grid grid-cols-[110px_10px_1fr]">
                        <span className="font-semibold text-gray-700">NIS</span>
                        <span>:</span>
                        <span className="text-gray-900">{santri?.nis}</span>
                    </div>
                </div>

                {/* Right Column */}
                <div className="space-y-2">
                    <div className="grid grid-cols-[110px_10px_1fr]">
                        <span className="font-semibold text-gray-700">Halaqoh</span>
                        <span>:</span>
                        <span className="text-gray-900">{santri?.halaqoh?.nama || '-'}</span>
                    </div>
                    <div className="grid grid-cols-[110px_10px_1fr]">
                        <span className="font-semibold text-gray-700">Semester</span>
                        <span>:</span>
                        <span className="text-gray-900">{semester?.nama}</span>
                    </div>
                    <div className="grid grid-cols-[110px_10px_1fr]">
                        <span className="font-semibold text-gray-700">Tahun Ajaran</span>
                        <span>:</span>
                        <span className="text-gray-900">{semester?.tahun_ajaran}</span>
                    </div>
                </div>
            </div>

            {/* 3. Content Grid: Grades vs Side Panels */}
            <div className="grid grid-cols-[1.2fr_1fr] gap-4 mb-4">

                {/* LEFT COLUMN: GRADES */}
                <div className="space-y-6">
                    {/* A. Nilai Tahfizh Table */}
                    <div>
                        <table className="w-full border-collapse text-[10px]">
                            <thead>
                                <tr>
                                    <th colSpan="4" className="bg-[#009B7C] text-white p-1 text-center font-bold tracking-wider text-[11px] border border-[#009B7C] uppercase print-color-adjust-exact">
                                        NILAI TAHFIZH
                                    </th>
                                </tr>
                                <tr className="bg-[#009B7C] text-white print-color-adjust-exact">
                                    <th className="p-1 border border-white/30 w-10 text-center font-medium">No</th>
                                    <th className="p-1 border border-white/30 text-left font-medium">Mata Pelajaran</th>
                                    <th className="p-1 border border-white/30 w-16 text-center font-medium">Nilai</th>
                                    <th className="p-1 border border-white/30 w-16 text-center font-medium">Predikat</th>
                                </tr>
                            </thead>
                            <tbody className="text-gray-900 bg-white">
                                {nilaiTahfizh && nilaiTahfizh.length > 0 ? nilaiTahfizh.map((item, idx) => (
                                    <tr key={idx}>
                                        <td className="p-1 border border-gray-300 text-center">{idx + 1}</td>
                                        <td className="p-1 border border-gray-300 font-medium">
                                            {item.mapel?.nama || item.komponen || '-'}
                                        </td>
                                        <td className="p-1 border border-gray-300 text-center font-bold">
                                            {item.nilai_akhir ?? item.nilai ?? '-'}
                                        </td>
                                        <td className="p-1 border border-gray-300 text-center">
                                            {item.predikat || getPredikat(item.nilai_akhir ?? item.nilai)}
                                        </td>
                                    </tr>
                                )) : (
                                    [1, 2, 3].map((i) => (
                                        <tr key={i}>
                                            <td className="p-2 border border-gray-300 text-center">{i}</td>
                                            <td className="p-2 border border-gray-300 text-gray-400 italic">...</td>
                                            <td className="p-2 border border-gray-300"></td>
                                            <td className="p-2 border border-gray-300"></td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* B. Nilai Madrasah Table */}
                    <div>
                        <table className="w-full border-collapse text-xs">
                            <thead>
                                <tr>
                                    <th colSpan="4" className="bg-[#009B7C] text-white p-1 text-center font-bold tracking-wider text-[11px] border border-[#009B7C] uppercase print-color-adjust-exact">
                                        NILAI MADRASAH
                                    </th>
                                </tr>
                                <tr className="bg-[#009B7C] text-white print-color-adjust-exact">
                                    <th className="p-1 border border-white/30 w-10 text-center font-medium">No</th>
                                    <th className="p-1 border border-white/30 text-left font-medium">Mata Pelajaran</th>
                                    <th className="p-1 border border-white/30 w-16 text-center font-medium">Nilai</th>
                                    <th className="p-1 border border-white/30 w-16 text-center font-medium">Predikat</th>
                                </tr>
                            </thead>
                            <tbody className="text-gray-900 bg-white">
                                {nilaiMadrasah && nilaiMadrasah.length > 0 ? nilaiMadrasah.map((item, idx) => (
                                    <tr key={idx}>
                                        <td className="p-1 border border-gray-300 text-center">{idx + 1}</td>
                                        <td className="p-1 border border-gray-300 font-medium">{item.mapel?.nama || item.nama}</td>
                                        <td className="p-1 border border-gray-300 text-center font-bold">{item.nilai_akhir ?? item.rata_rata ?? '-'}</td>
                                        <td className="p-1 border border-gray-300 text-center">{item.predikat}</td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan="4" className="p-4 border border-gray-300 text-center text-gray-400 italic">Belum ada nilai madrasah</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* RIGHT COLUMN: SIDEBAR BOXES */}
                <div className="space-y-6">

                    {/* 1. Pencapaian Tahfizh */}
                    <div className="border border-[#009B7C] overflow-hidden">
                        <div className="bg-[#009B7C] text-white p-2 text-center font-bold text-sm tracking-wide uppercase print-color-adjust-exact">
                            Pencapaian Tahfizh
                        </div>
                        <div className="p-4 bg-white">
                            <div className="space-y-3 text-[13px]">
                                <div className="flex justify-between border-b border-gray-100 pb-2">
                                    <span className="text-gray-700">Jumlah Hafalan:</span>
                                    <span className="font-bold text-gray-900">{perilaku?.jumlah_hafalan || '0 Juz'}</span>
                                </div>
                                <div className="flex justify-between border-b border-gray-100 pb-2">
                                    <span className="text-gray-700">Predikat:</span>
                                    <span className="font-bold text-gray-900">{perilaku?.predikat_hafalan || 'Baik'}</span>
                                </div>
                                <div className="flex justify-between pt-1">
                                    <span className="text-gray-700">Total Hafalan:</span>
                                    <span className="font-bold text-gray-900">{perilaku?.total_hafalan || '-'}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 2. Perilaku Murid */}
                    <div className="border border-[#009B7C] overflow-hidden">
                        <div className="bg-[#009B7C] text-white p-2 text-center font-bold text-sm tracking-wide uppercase print-color-adjust-exact">
                            Perilaku Murid
                        </div>
                        <div className="p-4 bg-white">
                            <ul className="space-y-2 text-[13px]">
                                <li className="grid grid-cols-[110px_1fr] items-center">
                                    <span className="text-gray-700">A. Ketekunan:</span>
                                    <span className="font-semibold text-gray-900">{perilaku?.ketekunan || 'Baik'}</span>
                                </li>
                                <li className="grid grid-cols-[110px_1fr] items-center">
                                    <span className="text-gray-700">B. Kedisiplinan:</span>
                                    <span className="font-semibold text-gray-900">{perilaku?.kedisiplinan || 'Baik'}</span>
                                </li>
                                <li className="grid grid-cols-[110px_1fr] items-center">
                                    <span className="text-gray-700">C. Kebersihan:</span>
                                    <span className="font-semibold text-gray-900">{perilaku?.kebersihan || 'Sangat Baik'}</span>
                                </li>
                                <li className="grid grid-cols-[110px_1fr] items-center">
                                    <span className="text-gray-700">D. Kerapian:</span>
                                    <span className="font-semibold text-gray-900">{perilaku?.kerapian || 'Sangat Baik'}</span>
                                </li>
                            </ul>
                        </div>
                    </div>

                    {/* 3. Ketidakhadiran */}
                    <div className="border border-[#009B7C] overflow-hidden">
                        <div className="bg-[#009B7C] text-white p-2 text-center font-bold text-sm tracking-wide uppercase print-color-adjust-exact">
                            Ketidakhadiran
                        </div>
                        <div className="p-6 bg-white text-center">
                            <div className="inline-flex gap-3 text-[13px] font-medium text-gray-800">
                                <span>Alpa: <span className="font-bold">{ketidakhadiran?.alpha || '0'}</span></span>
                                <span className="text-gray-300">|</span>
                                <span>Sakit: <span className="font-bold">{ketidakhadiran?.sakit || '0'}</span></span>
                                <span className="text-gray-300">|</span>
                                <span>Izin: <span className="font-bold">{ketidakhadiran?.izin || '0'}</span></span>
                                <span className="text-gray-300">|</span>
                                <span>Pulang: <span className="font-bold">{ketidakhadiran?.pulang || '0'}</span></span>
                            </div>
                        </div>
                    </div>

                </div>
            </div>

            {/* 4. Taujihat Musyrif */}
            <div className="mb-4 break-inside-avoid">
                <h3 className="font-bold text-gray-900 text-[11px] mb-1">Taujihat Musyrif</h3>
                <div className="h-[50px] border border-gray-400 bg-white p-2 text-[11px] text-gray-800 italic leading-relaxed">
                    {taujihad?.catatan || taujihad?.isi || 'Alhamdulillah, santri menunjukkan perkembangan yang baik. Terus semangat!'}
                </div>
            </div>

            {/* 5. Signatures Footer */}
            <div className="mt-4 text-[12px] font-medium text-gray-900 break-inside-avoid">

                {/* Top Section: Wali & Musyrif */}
                <div className="flex justify-between items-start px-12 mb-12">
                    {/* Left: Wali Murid */}
                    <div className="text-center">
                        <p className="mb-1 invisible">Placeholder Date</p>
                        <p className="mb-12">Wali Murid</p>
                        <div className="border-b border-black w-56 mx-auto mb-2"></div>
                        <p className="font-bold uppercase">({santri?.nama_wali?.toUpperCase() || '....................................'})</p>
                    </div>

                    {/* Right: Musyrif */}
                    <div className="text-center">
                        <p className="mb-1">Batuan, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                        <p className="mb-12">Musyrif</p>
                        <div className="border-b border-black w-56 mx-auto mb-2"></div>
                        <p className="font-bold uppercase">{musyrifName?.toUpperCase() || "UST. AINUR WAFI"}</p>
                    </div>
                </div>

                {/* Bottom Section: Mengetahui */}
                <div className="flex justify-center">
                    <div className="text-center w-1/3">
                        <p className="mb-1">Mengetahui,</p>
                        <p className="mb-12">Pengasuh PTQA Batuan</p>
                        <div className="border-b border-black w-full mx-auto"></div>
                        <p className="font-bold mt-1 uppercase">KH. Miftahul Arifin, LC.</p>
                    </div>
                </div>

            </div>

            {/* Global Print Styles embedded in component to ensure it applies when rendered */}
            <style>{`
                @media print {
                    @page {
                        size: A4;
                        margin: 0;
                    }
                    body {
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                }
            `}</style>
        </div>
    );
};

export default RaportTemplate;
