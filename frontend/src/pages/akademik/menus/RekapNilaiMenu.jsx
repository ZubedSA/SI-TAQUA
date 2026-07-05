import { Link } from 'react-router-dom'
import { BarChart2, FileText, PieChart } from 'lucide-react'

const RekapNilaiMenu = () => {
    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-2">Rekap Nilai</h1>
            <p className="text-gray-600 mb-8">Lihat rekapitulasi dan grafik nilai santri</p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Link to="/rekap-nilai/syahri" className="bg-white p-6 rounded-xl shadow-sm border hover:shadow-md transition-all group">
                    <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4 text-purple-600 group-hover:scale-110 transition-transform">
                        <FileText size={24} />
                    </div>
                    <h3 className="font-bold text-gray-800 mb-2">Rekap Nilai Syahri</h3>
                    <p className="text-sm text-gray-500">Rekap nilai ujian bulanan per kelas</p>
                </Link>

                <Link to="/rekap-nilai/semester" className="bg-white p-6 rounded-xl shadow-sm border hover:shadow-md transition-all group">
                    <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4 text-purple-600 group-hover:scale-110 transition-transform">
                        <BarChart2 size={24} />
                    </div>
                    <h3 className="font-bold text-gray-800 mb-2">Rekap Nilai Semester</h3>
                    <p className="text-sm text-gray-500">Rekap komprehensif nilai akhir semester</p>
                </Link>

                <Link to="/rekap-nilai/grafik" className="bg-white p-6 rounded-xl shadow-sm border hover:shadow-md transition-all group">
                    <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4 text-purple-600 group-hover:scale-110 transition-transform">
                        <PieChart size={24} />
                    </div>
                    <h3 className="font-bold text-gray-800 mb-2">Grafik Perkembangan</h3>
                    <p className="text-sm text-gray-500">Visualisasi data perkembangan nilai santri</p>
                </Link>
            </div>
        </div>
    )
}

export default RekapNilaiMenu
