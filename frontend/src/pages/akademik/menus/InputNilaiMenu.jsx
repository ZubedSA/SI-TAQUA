import { Link } from 'react-router-dom'
import { BookOpen, Calendar, GraduationCap, FileText, ClipboardList } from 'lucide-react'

const InputNilaiMenu = () => {
    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-2">Input Nilai</h1>
            <p className="text-gray-600 mb-8">Pilih jenis penilaian yang akan diinput</p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Tahfizhiyah Group */}
                <div className="col-span-full">
                    <h2 className="text-lg font-semibold mb-4 text-emerald-600 flex items-center gap-2">
                        <BookOpen size={20} /> Tahfizhiyah
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <Link to="/akademik/nilai/tahfizh/syahri" className="bg-white p-6 rounded-xl shadow-sm border hover:shadow-md transition-all group">
                            <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center mb-4 text-emerald-600 group-hover:scale-110 transition-transform">
                                <Calendar size={24} />
                            </div>
                            <h3 className="font-bold text-gray-800 mb-2">Ujian Syahri</h3>
                            <p className="text-sm text-gray-500">Input nilai ujian bulanan tahfizh</p>
                        </Link>

                        <Link to="/akademik/nilai/tahfizh/semester" className="bg-white p-6 rounded-xl shadow-sm border hover:shadow-md transition-all group">
                            <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center mb-4 text-emerald-600 group-hover:scale-110 transition-transform">
                                <GraduationCap size={24} />
                            </div>
                            <h3 className="font-bold text-gray-800 mb-2">Ujian Semester</h3>
                            <p className="text-sm text-gray-500">Input nilai ujian semester tahfizh</p>
                        </Link>
                    </div>
                </div>

                {/* Madrosiyah Group */}
                <div className="col-span-full mt-4">
                    <h2 className="text-lg font-semibold mb-4 text-blue-600 flex items-center gap-2">
                        <GraduationCap size={20} /> Madrosiyah
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <Link to="/akademik/nilai/madros/harian" className="bg-white p-6 rounded-xl shadow-sm border hover:shadow-md transition-all group">
                            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4 text-blue-600 group-hover:scale-110 transition-transform">
                                <ClipboardList size={24} />
                            </div>
                            <h3 className="font-bold text-gray-800 mb-2">Ujian Harian</h3>
                            <p className="text-sm text-gray-500">Input nilai harian/formatif</p>
                        </Link>

                        <Link to="/akademik/nilai/madros/uts" className="bg-white p-6 rounded-xl shadow-sm border hover:shadow-md transition-all group">
                            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4 text-blue-600 group-hover:scale-110 transition-transform">
                                <FileText size={24} />
                            </div>
                            <h3 className="font-bold text-gray-800 mb-2">Ujian Tengah Semester (UTS)</h3>
                            <p className="text-sm text-gray-500">Input nilai tengah semester</p>
                        </Link>

                        <Link to="/akademik/nilai/madros/uas" className="bg-white p-6 rounded-xl shadow-sm border hover:shadow-md transition-all group">
                            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4 text-blue-600 group-hover:scale-110 transition-transform">
                                <GraduationCap size={24} />
                            </div>
                            <h3 className="font-bold text-gray-800 mb-2">Ujian Akhir Semester (UAS)</h3>
                            <p className="text-sm text-gray-500">Input nilai akhir semester</p>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default InputNilaiMenu
