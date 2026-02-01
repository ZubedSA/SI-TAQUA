import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../context/AuthContext';
import { ArrowLeft, Printer, FileText, Download } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import RaportTemplate from '../../../components/akademik/RaportTemplate';

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

            // 3. Fetch Madrosiyah Mapels (for Madrasah grades)
            const { data: allMapels } = await supabase
                .from('mapel')
                .select('*')
                .eq('kategori', 'Madrosiyah')
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
                    { key: 'nilai_kelancaran', label: 'Fashohah / Kelancaran' }
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
        console.log('handlePrint called'); // Debug log
        try {
            window.print();
            console.log('window.print() executed'); // Debug log
        } catch (error) {
            console.error('Print error:', error);
            alert('Terjadi error saat mencetak: ' + error.message);
        }
    };

    const handleBack = () => {
        navigate(-1);
    };

    // Ref for capturing the template
    const raportTemplateRef = React.useRef(null);
    const [isDownloading, setIsDownloading] = React.useState(false);

    const handleDownloadPDF = async () => {
        if (!raportTemplateRef.current) return;
        setIsDownloading(true);

        try {
            const element = raportTemplateRef.current;

            // Save original transform and temporarily reset to full scale
            const originalTransform = element.style.transform;
            element.style.transform = 'none';

            // Wait for reflow
            await new Promise(resolve => setTimeout(resolve, 300));

            // Capture at full scale for best quality
            const canvas = await html2canvas(element, {
                scale: 2,
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff'
            });

            // Restore original transform immediately after capture
            element.style.transform = originalTransform;

            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();

            // Calculate aspect ratio to fit A4
            const imgProps = pdf.getImageProperties(imgData);
            const imgHeight = (imgProps.height * pdfWidth) / imgProps.width;

            // Add image to PDF
            let heightLeft = imgHeight;
            let position = 0;

            pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
            heightLeft -= pdfHeight;

            // Handle multiple pages if needed
            while (heightLeft >= 0) {
                position = heightLeft - imgHeight;
                pdf.addPage();
                pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
                heightLeft -= pdfHeight;
            }

            // Save PDF with santri name
            pdf.save(`Raport_${santri.nama.replace(/\s/g, '_')}_${semester?.nama || 'Semester'}.pdf`);

        } catch (error) {
            console.error("PDF Download Error:", error);
            alert('Terjadi error saat download PDF: ' + error.message);
        } finally {
            setIsDownloading(false);
        }
    };

    if (loading) {
        return <div className="flex items-center justify-center min-h-screen">Loading Raport...</div>;
    }

    if (!santri || !semester) {
        return <div className="p-8 text-center">Data tidak ditemukan. Pastikan URL benar.</div>;
    }

    return (
        <div className="bg-gray-100 min-h-screen p-4 md:p-8 print:p-0 print:bg-white">
            {/* Action Bar - Hidden on Print */}
            <div className="max-w-[210mm] mx-auto mb-6 flex flex-wrap gap-2 justify-between items-center print:hidden">
                <button
                    onClick={handleBack}
                    className="flex items-center gap-2 px-4 py-2 bg-white text-gray-700 rounded-lg shadow-sm hover:bg-gray-50"
                >
                    <ArrowLeft size={18} />
                    Kembali
                </button>
                <div className="flex gap-2">
                    <button
                        onClick={handleDownloadPDF}
                        disabled={isDownloading}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg shadow-sm hover:bg-blue-700 disabled:opacity-50"
                    >
                        <Download size={18} />
                        {isDownloading ? 'Generating...' : 'Download PDF'}
                    </button>
                    <button
                        onClick={handlePrint}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg shadow-sm hover:bg-emerald-700"
                    >
                        <Printer size={18} />
                        Cetak Raport
                    </button>
                </div>
            </div>

            {/* A4 Paper Container - Desktop layout scaled to fit screen */}
            <div className="w-full flex justify-center overflow-hidden pb-12">
                <div
                    ref={raportTemplateRef}
                    className="w-[210mm] transform scale-[0.58] sm:scale-[0.75] md:scale-[0.92] lg:scale-100 origin-top print:!scale-100 print:!transform-none"
                >
                    <RaportTemplate
                        santri={santri}
                        semester={semester}
                        nilaiTahfizh={nilaiTahfizh}
                        nilaiMadrasah={nilaiMadrasah}
                        perilaku={perilaku}
                        taujihad={taujihad}
                        ketidakhadiran={ketidakhadiran}
                        musyrifName={santri?.musyrif_nama}
                    />
                </div>
            </div>
        </div>
    );
};

export default CetakRaport;
