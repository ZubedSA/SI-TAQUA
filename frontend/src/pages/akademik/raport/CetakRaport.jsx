import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../context/AuthContext';
import { ArrowLeft, Printer, FileText, Download } from 'lucide-react';
import html2canvas from 'html2canvas';

const CetakRaport = () => {
    const { santriId, semesterId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();

    const [loading, setLoading] = useState(true);
    const [santri, setSantri] = useState(null);
    const [semester, setSemester] = useState(null);
    const [nilaiMadrasah, setNilaiMadrasah] = useState([]);
    const [nilaiTahfizh, setNilaiTahfizh] = useState([]);
    const [taujihad, setTaujihad] = useState(null);
    const [perilaku, setPerilaku] = useState(null);
    // Calculated absence data
    const [ketidakhadiran, setKetidakhadiran] = useState({
        sakit: '-',
        izin: '-',
        alpha: '-',
        pulang: '-'
    });

    useEffect(() => {
        if (santriId && semesterId) {
            fetchData();
        }
    }, [santriId, semesterId]);

    // Helper to calculate predicate
    const getPredikat = (nilai) => {
        if (!nilai && nilai !== 0) return '-';
        if (nilai >= 90) return 'A';
        if (nilai >= 80) return 'B';
        if (nilai >= 70) return 'C';
        if (nilai >= 60) return 'D';
        return 'E';
    };

    const fetchData = async () => {
        try {
            setLoading(true);

            // 1. Fetch Santri Data
            const { data: santriData, error: santriError } = await supabase
                .from('santri')
                .select(`
                    *,
                    kelas:kelas_id(nama),
                    halaqoh:halaqoh_id(nama, musyrif_id)
                `)
                .eq('id', santriId)
                .single();

            if (santriError) throw santriError;
            setSantri(santriData);

            // Fetch Musyrif
            let musyrifName = "Imam 'Ashim Al-Kufi";
            if (santriData.halaqoh?.musyrif_id) {
                const { data: guruData } = await supabase
                    .from('guru')
                    .select('nama')
                    .eq('id', santriData.halaqoh.musyrif_id)
                    .single();
                if (guruData) musyrifName = guruData.nama;
            }
            santriData.musyrif_nama = musyrifName;

            // 2. Fetch Semester
            const { data: semesterData } = await supabase
                .from('semester')
                .select('*')
                .eq('id', semesterId)
                .single();
            setSemester(semesterData);

            // 3. Fetch All Mapels (Master List)
            const { data: allMapels } = await supabase
                .from('mapel')
                .select('*')
                .order('nama', { ascending: true });
            const expectedMapels = allMapels || [];

            // 4. Fetch All Grades
            const { data: nilaiData } = await supabase
                .from('nilai')
                .select(`
                    *,
                    mapel:mapel_id(nama, kode)
                `)
                .eq('santri_id', santriId)
                .eq('semester_id', semesterId);

            // --- PROCESSING LOGIC (Synced with Laporan Page) ---
            const typePriority = { 'semester': 4, 'uas': 3, 'uts': 2, 'harian': 1 };

            const getBestGrade = (grades) => {
                if (!grades || grades.length === 0) return null;
                return grades.reduce((prev, current) => {
                    const prevP = typePriority[prev.jenis_ujian] || 0;
                    const currP = typePriority[current.jenis_ujian] || 0;
                    if (currP > prevP) return current;
                    if (currP === prevP) {
                        return (current.nilai_akhir || 0) > (prev.nilai_akhir || 0) ? current : prev;
                    }
                    return prev;
                });
            };

            // A. Process Madrasah
            let madrasahList = expectedMapels.map(mapel => {
                // Find all grades for this mapel
                const mapelGrades = nilaiData?.filter(n => n.mapel_id === mapel.id) || [];
                const bestGrade = getBestGrade(mapelGrades);

                // Exclude if no grade found (User Request: Only show mapels with input)
                if (!bestGrade) return null;

                // Exclude Tahfizh
                if (mapel.nama.toLowerCase().includes('tahfizh') || mapel.nama.toLowerCase().includes('quran')) {
                    return null;
                }

                return {
                    mapel: mapel,
                    nilai_akhir: bestGrade.nilai_akhir,
                    predikat: getPredikat(bestGrade.nilai_akhir)
                };
            }).filter(Boolean);
            setNilaiMadrasah(madrasahList);

            // B. Process Tahfizh (Decomposition)
            const tahfizhRecords = nilaiData?.filter(n => {
                const isCatTahfizh = n.kategori === 'Tahfizhiyah';
                const isNameTahfizh = n.mapel?.nama?.toLowerCase().includes('tahfizh') || n.mapel?.nama?.toLowerCase().includes('quran');
                return isCatTahfizh || isNameTahfizh;
            }) || [];

            const bestTahfizhRecord = getBestGrade(tahfizhRecords);

            let tahfizhRows = [];
            if (bestTahfizhRecord) {
                const components = [
                    { key: 'nilai_hafalan', label: 'Hafalan' },
                    { key: 'nilai_tajwid', label: 'Tajwid' },
                    { key: 'nilai_kelancaran', label: 'Fashohah / Kelancaran' },
                    { key: 'nilai_murajaah', label: "Muraja'ah" }
                ];

                components.forEach(comp => {
                    if (bestTahfizhRecord[comp.key] != null) {
                        tahfizhRows.push({
                            mapel: { nama: comp.label }, // Render expects mapel.nama
                            nilai_akhir: bestTahfizhRecord[comp.key]
                        });
                    }
                });

                if (tahfizhRows.length === 0 && bestTahfizhRecord.mapel?.nama) {
                    tahfizhRows.push(bestTahfizhRecord);
                }
            }
            setNilaiTahfizh(tahfizhRows);

            // 5. Fetch Taujihad & Perilaku & Presensi
            const { data: taujihadData } = await supabase.from('taujihad').select('*').eq('santri_id', santriId).eq('semester_id', semesterId).single();
            setTaujihad(taujihadData);

            const { data: perilakuData } = await supabase.from('perilaku_semester').select('*').eq('santri_id', santriId).eq('semester_id', semesterId).single();
            setPerilaku(perilakuData);

            // Presensi (Prioritize Manual Input from Perilaku/Raport Data, Fallback to '0')
            // Note: We used to count from presensi table, but now we use the manual input for flexibility
            setKetidakhadiran({
                sakit: perilakuData?.sakit ?? '-',
                izin: perilakuData?.izin ?? '-',
                alpha: perilakuData?.alpha ?? '-',
                pulang: perilakuData?.pulang ?? '-'
            });

        } catch (error) {
            console.error("Error fetching raport data:", error);
        } finally {
            setLoading(false);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    const handleBack = () => {
        navigate(-1);
    };

    if (loading) {
        return <div className="flex items-center justify-center min-h-screen">Loading Raport...</div>;
    }

    if (!santri || !semester) {
        return <div className="p-8 text-center">Data tidak ditemukan. Pastikan URL benar.</div>;
    }



    // Styling constants to match the image
    const TABLE_HEADER_COLOR = 'bg-[#009B7C]'; // Green color from image header
    const HEADER_TEXT_COLOR = 'text-white';

    return (
        <div className="bg-gray-100 min-h-screen p-4 md:p-8 print:p-0 print:bg-white">
            {/* Action Bar - Hidden on Print */}
            <div className="max-w-[210mm] mx-auto mb-6 flex justify-between items-center print:hidden">
                <button
                    onClick={handleBack}
                    className="flex items-center gap-2 px-4 py-2 bg-white text-gray-700 rounded-lg shadow-sm hover:bg-gray-50"
                >
                    <ArrowLeft size={18} />
                    Kembali
                </button>
                <div className="flex gap-2">
                    <button
                        onClick={handlePrint}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg shadow-sm hover:bg-emerald-700"
                    >
                        <Printer size={18} />
                        Cetak PDF
                    </button>
                </div>
            </div>

            {/* A4 Paper Container */}
            <div className="bg-white max-w-[210mm] min-h-[297mm] mx-auto p-[10mm] shadow-lg print:shadow-none print:w-full print:max-w-none print:h-auto print:mx-0 print:p-0 box-border leading-tight text-sm font-sans relative">

                {/* 1. Header Yayasan */}
                {/* 1. Header Yayasan */}
                {/* 1. Header Yayasan */}
                <div className="bg-[#009B7C] text-white py-6 px-4 mb-6 text-center relative print-color-adjust-exact border-b-4 border-[#007A61]">
                    {/* Logo - Absolute Left, No Background, White Version */}
                    <div className="absolute left-6 top-1/2 -translate-y-1/2 flex items-center justify-center">
                        <img src="/logo-white.png" alt="Logo" className="w-24 h-24 object-contain drop-shadow-sm" />
                    </div>

                    {/* Text Container - Centered relative to parent, ignore logo width */}
                    <div className="w-full px-12">
                        <h2 className="text-sm font-bold uppercase tracking-widest opacity-95 mb-1 text-white">Yayasan Abdullah Dewi Hasanah</h2>
                        <h1 className="text-base font-bold uppercase tracking-wide mb-2 text-white leading-tight font-sans">Pondok Pesantren Tahfizh Qur'an Al-Usymuni Batuan</h1>
                        <div className="flex justify-center items-center gap-2 text-xs font-normal opacity-90 text-white">
                            <span>Jl. Raya Lenteng Ds. Batuan Barat RT 002 RW 004, Kec. Batuan, Kab. Sumenep</span>
                        </div>
                    </div>
                </div>

                {/* 2. Biodata Section */}
                <div className="grid grid-cols-2 gap-x-12 mb-8 px-2 text-[13px]">
                    {/* Left Column */}
                    <div className="space-y-2">
                        <div className="grid grid-cols-[100px_10px_1fr]">
                            <span className="font-semibold text-gray-700">Nama</span>
                            <span>:</span>
                            <span className="font-bold uppercase text-gray-900">{santri.nama}</span>
                        </div>
                        <div className="grid grid-cols-[100px_10px_1fr]">
                            <span className="font-semibold text-gray-700">Jenjang / Kelas</span>
                            <span>:</span>
                            <span className="text-gray-900">{santri.kelas?.nama || '-'}</span>
                        </div>
                        <div className="grid grid-cols-[100px_10px_1fr]">
                            <span className="font-semibold text-gray-700">NIS</span>
                            <span>:</span>
                            <span className="text-gray-900">{santri.nis}</span>
                        </div>
                    </div>

                    {/* Right Column */}
                    <div className="space-y-2">
                        <div className="grid grid-cols-[100px_10px_1fr]">
                            <span className="font-semibold text-gray-700">Halaqoh</span>
                            <span>:</span>
                            <span className="text-gray-900">{santri.halaqoh?.nama || '-'}</span>
                        </div>
                        <div className="grid grid-cols-[100px_10px_1fr]">
                            <span className="font-semibold text-gray-700">Semester</span>
                            <span>:</span>
                            <span className="text-gray-900">{semester.nama}</span>
                        </div>
                        <div className="grid grid-cols-[100px_10px_1fr]">
                            <span className="font-semibold text-gray-700">Tahun Ajaran</span>
                            <span>:</span>
                            <span className="text-gray-900">{semester.tahun_ajaran}</span>
                        </div>
                    </div>
                </div>

                {/* 3. Content Grid: Grades vs Side Panels */}
                <div className="grid grid-cols-[1.2fr_1fr] gap-6 mb-6">

                    {/* LEFT COLUMN: GRADES */}
                    <div className="space-y-6">
                        {/* A. Nilai Tahfizh Table */}
                        <div>
                            <table className="w-full border-collapse text-xs">
                                <thead>
                                    {/* Title Row */}
                                    <tr>
                                        <th colSpan="4" className="bg-[#009B7C] text-white p-2 text-center font-bold tracking-wider text-[13px] border border-[#009B7C] uppercase">
                                            NILAI TAHFIZH
                                        </th>
                                    </tr>
                                    {/* Column Headers */}
                                    <tr className="bg-[#009B7C] text-white">
                                        <th className="p-2 border border-white/30 w-10 text-center font-medium">No</th>
                                        <th className="p-2 border border-white/30 text-left font-medium">Mata Pelajaran</th>
                                        <th className="p-2 border border-white/30 w-16 text-center font-medium">Nilai</th>
                                        <th className="p-2 border border-white/30 w-16 text-center font-medium">Predikat</th>
                                    </tr>
                                </thead>
                                <tbody className="text-gray-900 bg-white">
                                    {nilaiTahfizh.length > 0 ? nilaiTahfizh.map((item, idx) => (
                                        <tr key={idx}>
                                            <td className="p-2 border border-gray-300 text-center">{idx + 1}</td>
                                            <td className="p-2 border border-gray-300 font-medium">{item.mapel?.nama}</td>
                                            <td className="p-2 border border-gray-300 text-center font-bold">{item.nilai_akhir || '-'}</td>
                                            <td className="p-2 border border-gray-300 text-center">{getPredikat(item.nilai_akhir)}</td>
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
                                    {/* Title Row */}
                                    <tr>
                                        <th colSpan="4" className="bg-[#009B7C] text-white p-2 text-center font-bold tracking-wider text-[13px] border border-[#009B7C] uppercase">
                                            NILAI MADRASAH
                                        </th>
                                    </tr>
                                    {/* Column Headers */}
                                    <tr className="bg-[#009B7C] text-white">
                                        <th className="p-2 border border-white/30 w-10 text-center font-medium">No</th>
                                        <th className="p-2 border border-white/30 text-left font-medium">Mata Pelajaran</th>
                                        <th className="p-2 border border-white/30 w-16 text-center font-medium">Nilai</th>
                                        <th className="p-2 border border-white/30 w-16 text-center font-medium">Predikat</th>
                                    </tr>
                                </thead>
                                <tbody className="text-gray-900 bg-white">
                                    {nilaiMadrasah.length > 0 ? nilaiMadrasah.map((item, idx) => (
                                        <tr key={idx}>
                                            <td className="p-2 border border-gray-300 text-center">{idx + 1}</td>
                                            <td className="p-2 border border-gray-300 font-medium">{item.mapel?.nama}</td>
                                            <td className="p-2 border border-gray-300 text-center font-bold">{item.nilai_akhir || '-'}</td>
                                            <td className="p-2 border border-gray-300 text-center">{getPredikat(item.nilai_akhir)}</td>
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
                                    <span>Alpa: <span className="font-bold">{ketidakhadiran.alpha}</span></span>
                                    <span className="text-gray-300">|</span>
                                    <span>Sakit: <span className="font-bold">{ketidakhadiran.sakit}</span></span>
                                    <span className="text-gray-300">|</span>
                                    <span>Izin: <span className="font-bold">{ketidakhadiran.izin}</span></span>
                                    <span className="text-gray-300">|</span>
                                    <span>Pulang: <span className="font-bold">{ketidakhadiran.pulang}</span></span>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>

                {/* 4. Taujihat Musyrif */}
                <div className="mb-8">
                    <h3 className="font-bold text-gray-900 text-[13px] mb-1">Taujihat Musyrif</h3>
                    <div className="h-[100px] border border-gray-400 bg-white p-3 text-[13px] text-gray-800 italic leading-relaxed">
                        {taujihad?.catatan || taujihad?.isi || 'Alhamdulillah, santri menunjukkan perkembangan yang baik. Terus semangat!'}
                    </div>
                </div>

                {/* 5. Signatures Footer */}
                <div className="mt-4 text-[12px] font-medium text-gray-900">

                    {/* Top Section: Wali & Musyrif */}
                    {/* Top Section: Wali & Musyrif */}
                    <div className="flex justify-between items-start px-12 mb-12">
                        {/* Left: Wali Murid */}
                        <div className="text-center">
                            <p className="mb-1 invisible">Placeholder Date</p>
                            <p className="mb-20">Wali Murid</p>
                            <div className="border-b border-black w-56 mx-auto mb-2"></div>
                            <p className="font-bold uppercase">({santri.nama_wali?.toUpperCase() || '....................................'})</p>
                        </div>

                        {/* Right: Musyrif */}
                        <div className="text-center">
                            <p className="mb-1">Batuan, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                            <p className="mb-20">Musyrif</p>
                            <div className="border-b border-black w-56 mx-auto mb-2"></div>
                            <p className="font-bold uppercase">{santri.musyrif_nama || "UST. AINUR WAFI"}</p>
                        </div>
                    </div>

                    {/* Bottom Section: Mengetahui */}
                    <div className="flex justify-center">
                        <div className="text-center w-1/3">
                            <p className="mb-1">Mengetahui,</p>
                            <p className="mb-20">Pengasuh PTQA Batuan</p>
                            <div className="border-b border-black w-full mx-auto"></div>
                            <p className="font-bold mt-1 uppercase">KH. Miftahul Arifin, LC.</p>
                        </div>
                    </div>

                </div>

            </div>

            {/* Print CSS Fixes */}
            <style>{`
                @media print {
                    @page {
                        size: A4;
                        margin: 0;
                    }
                    body {
                        background: white;
                        -webkit-print-color-adjust: exact;
                    }
                    /* Ensure background colors are printed */
                    * {
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                }
            `}</style>
        </div>
    );
};

export default CetakRaport;
