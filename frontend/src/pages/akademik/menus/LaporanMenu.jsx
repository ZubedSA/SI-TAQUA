import { Link } from 'react-router-dom'
import { FileText, BookOpen, Calendar, Printer, GraduationCap } from 'lucide-react'

const LaporanMenu = () => {
    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-2">Laporan Akademik</h1>
            <p className="text-gray-600 mb-8">Cetak laporan hafalan, nilai, dan raport santri</p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

                {/* Laporan Hafalan */}
                <div className="col-span-full">
                    <h2 className="text-lg font-semibold mb-4 text-amber-600 flex items-center gap-2">
                        <BookOpen size={20} /> Laporan Hafalan
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <Link to="/laporan/hafalan-harian" className="bg-white p-6 rounded-xl shadow-sm border hover:shadow-md transition-all group">
                            <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center mb-4 text-amber-600 group-hover:scale-110 transition-transform">
                                <Calendar size={24} />
                            </div>
                            <h3 className="font-bold text-gray-800 mb-2">Hafalan Harian</h3>
                            <p className="text-sm text-gray-500">Laporan setoran hafalan harian</p>
                        </Link>

                        <Link to="/laporan/rekap-mingguan" className="bg-white p-6 rounded-xl shadow-sm border hover:shadow-md transition-all group">
                            <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center mb-4 text-amber-600 group-hover:scale-110 transition-transform">
                                <FileText size={24} />
                            </div>
                            <h3 className="font-bold text-gray-800 mb-2">Rekap Mingguan</h3>
                            <p className="text-sm text-gray-500">Rekapitulasi hafalan mingguan</p>
                        </Link>
                    </div>
                </div>

                {/* Laporan Nilai */}
                <div className="col-span-full mt-4">
                    <h2 className="text-lg font-semibold mb-4 text-indigo-600 flex items-center gap-2">
                        <Printer size={20} /> Laporan Nilai & Raport
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <Link to="/laporan/ujian-syahri" className="bg-white p-6 rounded-xl shadow-sm border hover:shadow-md transition-all group">
                            <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-4 text-indigo-600 group-hover:scale-110 transition-transform">
                                <FileText size={24} />
                            </div>
                            <h3 className="font-bold text-gray-800 mb-2">Leger Nilai Syahri</h3>
                            <p className="text-sm text-gray-500">Laporan nilai ujian syahri per kelas</p>
                        </Link>

                        <Link to="/laporan/ujian-semester" className="bg-white p-6 rounded-xl shadow-sm border hover:shadow-md transition-all group">
                            <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-4 text-indigo-600 group-hover:scale-110 transition-transform">
                                <FileText size={24} />
                            </div>
                            <h3 className="font-bold text-gray-800 mb-2">Leger Nilai Semester</h3>
                            <p className="text-sm text-gray-500">Laporan lengkap nilai akhir semester</p>
                        </Link>

                        <Link to="/laporan/akademik-santri" className="bg-white p-6 rounded-xl shadow-sm border hover:shadow-md transition-all group">
                            <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-4 text-indigo-600 group-hover:scale-110 transition-transform">
                                <GraduationCap size={24} />
                            </div>
                            <h3 className="font-bold text-gray-800 mb-2">Raport Santri</h3>
                            <p className="text-sm text-gray-500">Cetak raport semester santri</p>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default LaporanMenu
