import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../context/AuthContext';
import { ArrowLeft, Printer, FileText, Download, BookOpen, Layers } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import RaportTemplate from '../../../components/akademik/RaportTemplate';
import { calculateSidogiriGrade } from '../../../components/akademik/RaportMadrasahTemplate';
import { calculateAutoPresensi, getResolvedAttendance } from '../../../utils/attendanceHelper';
import { fetchUnifiedSantriNonAkademik } from '../../../utils/raportNonAkademikHelper';

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
    const [activeTab, setActiveTab] = useState('all'); // 'all', 'tahfizh', 'madrasah'
    const [ketidakhadiran, setKetidakhadiran] = useState({
        sakit: '-',
        izin: '-',
        alpha: '-',
        pulang: '-'
    });

    const [scale, setScale] = useState(1);
    const [marginLeft, setMarginLeft] = useState(0);

    useEffect(() => {
        const calculateScale = () => {
            const viewportWidth = window.innerWidth;
            const raportWidth = 794;
            const margin = 16;

            if (viewportWidth >= 1024) {
                setScale(1);
                setMarginLeft(0);
            } else if (viewportWidth >= 768) {
                setScale(0.95);
                setMarginLeft(0);
            } else {
                const availableWidth = viewportWidth - margin;
                const newScale = Math.min(0.95, availableWidth / raportWidth);
                setScale(newScale);
                const scaledWidth = raportWidth * newScale;
                const leftMargin = (viewportWidth - scaledWidth) / 2;
                setMarginLeft(leftMargin);
            }
        };

        calculateScale();
        window.addEventListener('resize', calculateScale);
        return () => window.removeEventListener('resize', calculateScale);
    }, []);

    useEffect(() => {
        if (santriId && semesterId) {
            fetchData();
        }
    }, [santriId, semesterId]);

    const fetchData = async () => {
        try {
            setLoading(true);

            // 1. Fetch Santri Data
            const { data: santriData, error: santriError } = await supabase
                .from('santri')
                .select(`
                    *,
                    kelas:kelas_id(id, nama, wali_kelas_id, wali_kelas:guru!wali_kelas_id(nama)),
                    halaqoh:halaqoh_id(id, nama, musyrif_id, musyrif:guru!musyrif_id(nama))
                `)
                .eq('id', santriId)
                .single();

            if (santriError) throw santriError;

            const filterAdminName = (nameStr) => {
                if (!nameStr) return null;
                const parts = nameStr.split(',').map(s => s.trim()).filter(s => s && !s.toUpperCase().includes('ADMIN'));
                return parts.length > 0 ? parts.join(', ') : null;
            };

            let musyrifName = filterAdminName(santriData.halaqoh?.musyrif?.nama);
            if (!musyrifName && santriData.halaqoh?.musyrif_id) {
                const { data: guruData } = await supabase
                    .from('guru')
                    .select('nama')
                    .eq('id', santriData.halaqoh.musyrif_id)
                    .maybeSingle();
                if (guruData) musyrifName = filterAdminName(guruData.nama);
            }
            if (!musyrifName && santriData.halaqoh_id) {
                const { data: mhData } = await supabase
                    .from('musyrif_halaqoh')
                    .select('user_id')
                    .eq('halaqoh_id', santriData.halaqoh_id);
                if (mhData && mhData.length > 0) {
                    const userIds = mhData.map(m => m.user_id);
                    const { data: profileData } = await supabase
                        .from('user_profiles')
                        .select('nama')
                        .in('user_id', userIds);
                    if (profileData && profileData.length > 0) {
                        const names = profileData.map(p => p.nama).filter(n => n && !n.toUpperCase().includes('ADMIN'));
                        if (names.length > 0) musyrifName = names.join(', ');
                    }
                }
            }

            let waliKelasName = filterAdminName(santriData.kelas?.wali_kelas?.nama);
            if (!waliKelasName && santriData.kelas?.wali_kelas_id) {
                const { data: guruData } = await supabase
                    .from('guru')
                    .select('nama')
                    .eq('id', santriData.kelas.wali_kelas_id)
                    .maybeSingle();
                if (guruData) waliKelasName = filterAdminName(guruData.nama);
            }

            santriData.musyrif_nama = musyrifName || ".....................";
            santriData.wali_kelas_nama = waliKelasName || ".....................";
            setSantri(santriData);

            // 2. Fetch Semester
            const { data: semesterData } = await supabase
                .from('semester')
                .select('*')
                .eq('id', semesterId)
                .single();
            setSemester(semesterData);

            // 3. Fetch Madrosiyah / Madrasiyah Mapels
            const { data: allMapels } = await supabase
                .from('mapel')
                .select('*')
                .order('nama', { ascending: true });
            const expectedMapels = allMapels || [];

            // 4. Fetch All Grades for Santri & Semester
            const { data: nilaiData } = await supabase
                .from('nilai')
                .select(`
                    *,
                    mapel:mapel_id(nama, kode)
                `)
                .eq('santri_id', santriId)
                .eq('semester_id', semesterId);

            const typePriority = { 'semester': 4, 'uas': 3, 'uts': 2, 'harian': 1 };

            const getBestGrade = (grades) => {
                if (!grades || grades.length === 0) return null;
                return grades.reduce((prev, current) => {
                    const prevVal = prev.nilai_akhir ?? prev.nilai ?? 0;
                    const currVal = current.nilai_akhir ?? current.nilai ?? 0;
                    const prevP = typePriority[prev.jenis_ujian] || 0;
                    const currP = typePriority[current.jenis_ujian] || 0;
                    if (currP > prevP) return current;
                    if (currP === prevP) {
                        return currVal > prevVal ? current : prev;
                    }
                    return prev;
                });
            };

            // Merge any mapel from nilaiData that might not be in expectedMapels
            let mapelsToProcess = [...expectedMapels];
            nilaiData?.forEach(n => {
                if (n.mapel_id && !mapelsToProcess.some(m => m.id === n.mapel_id)) {
                    const mapelName = n.mapel?.nama || 'Mata Pelajaran';
                    const isTahfizh = mapelName.toLowerCase().includes('tahfizh') || mapelName.toLowerCase().includes('quran');
                    if (!isTahfizh && n.kategori !== 'Tahfizhiyah') {
                        mapelsToProcess.push({ id: n.mapel_id, nama: mapelName });
                    }
                }
            });

            // Process Madrasah grades with Sidogiri Pedoman (Scale 3 - 10)
            let madrasahList = mapelsToProcess.map(mapel => {
                const mapelGrades = nilaiData?.filter(n => n.mapel_id === mapel.id || n.mapel?.nama === mapel.nama) || [];
                if (mapelGrades.length === 0) return null;

                if (mapel.nama.toLowerCase().includes('tahfizh') || mapel.nama.toLowerCase().includes('quran')) {
                    return null;
                }

                const harianRecord = mapelGrades.find(g => g.jenis_ujian === 'harian');
                const examGrades = mapelGrades.filter(g => g.jenis_ujian !== 'harian');
                const bestExamRecord = getBestGrade(examGrades);

                const nilaiHarian = harianRecord ? (harianRecord.nilai_akhir ?? harianRecord.nilai) : null;
                const nilaiUjian = bestExamRecord ? (bestExamRecord.nilai_akhir ?? bestExamRecord.nilai) : null;

                if (nilaiHarian === null && nilaiUjian === null) return null;

                const calc = calculateSidogiriGrade(nilaiUjian, nilaiHarian);

                return {
                    mapel: mapel,
                    nilai_harian: nilaiHarian !== null ? nilaiHarian : '-',
                    nilai_ujian: nilaiUjian !== null ? nilaiUjian : '-',
                    nilai_raport: calc.finalGrade,
                    isRed: calc.isRed
                };
            }).filter(Boolean);

            setNilaiMadrasah(madrasahList);

            // Process Tahfizh
            const tahfizhRecords = nilaiData?.filter(n => {
                const isCatTahfizh = n.kategori === 'Tahfizhiyah';
                const isNameTahfizh = n.mapel?.nama?.toLowerCase().includes('tahfizh') || n.mapel?.nama?.toLowerCase().includes('quran');
                return isCatTahfizh || isNameTahfizh;
            }) || [];

            const bestTahfizhRecord = getBestGrade(tahfizhRecords);

            let tahfizhRows = [];
            if (bestTahfizhRecord) {
                const components = [
                    { key: 'nilai_hafalan', label: 'Hafalan (Ziyadah)' },
                    { key: 'nilai_tajwid', label: 'Tajwid' },
                    { key: 'nilai_kelancaran', label: 'Fashohah / Kelancaran' }
                ];

                components.forEach(comp => {
                    if (bestTahfizhRecord[comp.key] != null) {
                        tahfizhRows.push({
                            mapel: { nama: comp.label },
                            nilai_akhir: bestTahfizhRecord[comp.key]
                        });
                    }
                });

                if (tahfizhRows.length === 0 && bestTahfizhRecord.mapel?.nama) {
                    tahfizhRows.push(bestTahfizhRecord);
                }
            }
            setNilaiTahfizh(tahfizhRows);

            // 5. Fetch Unified Non-Academic Data (Perilaku, Taujihad, Presensi, Tahfizh)
            const nonAkademikData = await fetchUnifiedSantriNonAkademik(supabase, santriId, semesterId);
            setPerilaku(nonAkademikData.perilaku);
            setTaujihad(nonAkademikData.taujihad);
            setKetidakhadiran(nonAkademikData.ketidakhadiran);

        } catch (error) {
            console.error("Error fetching raport data:", error);
        } finally {
            setLoading(false);
        }
    };

    const handlePrint = () => {
        try {
            window.print();
        } catch (error) {
            console.error('Print error:', error);
            alert('Terjadi error saat mencetak: ' + error.message);
        }
    };

    const handleBack = () => {
        navigate(-1);
    };

    const raportTemplateRef = React.useRef(null);
    const [isDownloading, setIsDownloading] = React.useState(false);

    const handleDownloadPDF = async () => {
        if (!raportTemplateRef.current) return;
        setIsDownloading(true);

        try {
            const element = raportTemplateRef.current;

            // Temporarily reset CSS scale transform for 100% full-size A4 capture
            const originalTransform = element.style.transform;
            const originalMarginLeft = element.style.marginLeft;
            element.style.transform = 'none';
            element.style.marginLeft = '0px';

            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();

            const sheets = element.querySelectorAll('.raport-sheet');

            if (sheets && sheets.length > 0) {
                for (let i = 0; i < sheets.length; i++) {
                    if (i > 0) pdf.addPage();

                    const canvas = await html2canvas(sheets[i], {
                        scale: 2,
                        useCORS: true,
                        logging: false,
                        backgroundColor: '#ffffff'
                    });

                    const imgData = canvas.toDataURL('image/png');
                    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
                }
            } else {
                const canvas = await html2canvas(element, {
                    scale: 2,
                    useCORS: true,
                    logging: false,
                    backgroundColor: '#ffffff'
                });

                const imgData = canvas.toDataURL('image/png');
                pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            }

            // Restore preview scaling
            element.style.transform = originalTransform;
            element.style.marginLeft = originalMarginLeft;

            const pageSuffix = activeTab === 'tahfizh' ? 'Tahfizh' : activeTab === 'madrasah' ? 'Madrasah' : 'Lengkap';
            const santriNamaClean = (santri?.nama || 'Santri').replace(/[^a-zA-Z0-9_\-]/g, '_');
            pdf.save(`Raport_${pageSuffix}_${santriNamaClean}.pdf`);

        } catch (error) {
            console.error("PDF Download Error:", error);
            alert('Terjadi error saat download PDF: ' + error.message);
        } finally {
            setIsDownloading(false);
        }
    };

    if (loading) {
        return <div className="flex items-center justify-center min-h-screen font-semibold text-gray-600">Memuat Raport...</div>;
    }

    if (!santri || !semester) {
        return <div className="p-8 text-center text-red-600 font-medium">Data raport tidak ditemukan. Pastikan URL benar.</div>;
    }

    return (
        <div className="bg-gray-100 min-h-screen p-0 md:p-8 print:p-0 print:bg-white">
            {/* Action & Tab Bar */}
            <div className="px-3 md:px-0 py-3 md:py-0 max-w-[210mm] mx-auto mb-4 md:mb-6 flex flex-col sm:flex-row gap-3 justify-between items-center print:hidden bg-white md:bg-transparent shadow-sm md:shadow-none p-3 md:p-0 rounded-xl">
                <button
                    onClick={handleBack}
                    className="flex items-center gap-1.5 px-3 py-2 bg-white text-gray-700 rounded-lg shadow-sm hover:bg-gray-50 text-sm font-semibold border border-gray-200"
                >
                    <ArrowLeft size={18} />
                    <span>Kembali</span>
                </button>

                {/* TAB SWITCHER */}
                <div className="flex bg-gray-200/80 p-1 rounded-xl gap-1 text-xs md:text-sm font-bold w-full sm:w-auto justify-center">
                    <button
                        onClick={() => setActiveTab('all')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                            activeTab === 'all'
                                ? 'bg-white text-emerald-700 shadow-sm'
                                : 'text-gray-600 hover:text-gray-900'
                        }`}
                    >
                        <Layers size={16} />
                        <span>Cetak Semua (2 Lembar)</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('tahfizh')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                            activeTab === 'tahfizh'
                                ? 'bg-white text-emerald-700 shadow-sm'
                                : 'text-gray-600 hover:text-gray-900'
                        }`}
                    >
                        <BookOpen size={16} />
                        <span>Lembar 1: Tahfizh</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('madrasah')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                            activeTab === 'madrasah'
                                ? 'bg-white text-emerald-700 shadow-sm'
                                : 'text-gray-600 hover:text-gray-900'
                        }`}
                    >
                        <FileText size={16} />
                        <span>Lembar 2: Madrasah (Skala 3-10)</span>
                    </button>
                </div>

                <div className="flex gap-2 w-full sm:w-auto justify-end">
                    <button
                        onClick={handleDownloadPDF}
                        disabled={isDownloading}
                        className="flex items-center gap-1.5 px-3.5 py-2 bg-white text-gray-700 border border-gray-200 rounded-lg shadow-xs hover:bg-gray-50 hover:text-gray-900 disabled:opacity-50 text-xs md:text-sm font-semibold transition-all"
                    >
                        <Download size={16} className="text-gray-500" />
                        <span>{isDownloading ? 'Downloading...' : 'Download PDF'}</span>
                    </button>
                    <button
                        onClick={handlePrint}
                        className="flex items-center gap-1.5 px-4 py-2 bg-[#0A2619] text-[#BCF32F] rounded-lg shadow-sm hover:bg-[#143d2a] hover:shadow-md text-xs md:text-sm font-bold transition-all"
                    >
                        <Printer size={16} />
                        <span>Cetak Raport</span>
                    </button>
                </div>
            </div>

            {/* A4 Paper Container */}
            <div className="w-full md:flex md:justify-center pb-12">
                <div
                    ref={raportTemplateRef}
                    className="w-[210mm] origin-top-left md:origin-top print:!scale-100 print:!transform-none"
                    style={{
                        transform: `scale(${scale})`,
                        marginLeft: marginLeft > 0 ? `${marginLeft}px` : undefined
                    }}
                >
                    <RaportTemplate
                        santri={santri}
                        semester={semester}
                        nilaiTahfizh={nilaiTahfizh}
                        nilaiMadrasah={nilaiMadrasah}
                        perilaku={perilaku}
                        taujihad={taujihad}
                        ketidakhadiran={ketidakhadiran}
                        catatanWali={perilaku?.catatan_wali || taujihad?.catatan_wali}
                        musyrifName={santri?.musyrif_nama}
                        waliKelasName={santri?.wali_kelas_nama}
                        type={activeTab}
                    />
                </div>
            </div>
        </div>
    );
};

export default CetakRaport;
