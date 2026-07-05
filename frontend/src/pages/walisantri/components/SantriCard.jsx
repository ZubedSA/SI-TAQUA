import { User, GraduationCap, BookOpen, CheckCircle, AlertCircle, Clock } from 'lucide-react'

/**
 * SantriCard - Card untuk menampilkan info santri
 * Digunakan di dashboard dan halaman lain untuk menampilkan info santri
 * Refactored to use Tailwind CSS (Phase 2)
 */
const SantriCard = ({ santri, selected = false, onClick, showDetails = false }) => {
    if (!santri) return null

    const getStatusConfig = (status) => {
        const statusMap = {
            'Aktif': { color: 'bg-green-100 text-green-700', icon: CheckCircle, label: 'Aktif' },
            'Tidak Aktif': { color: 'bg-red-100 text-red-700', icon: AlertCircle, label: 'Tidak Aktif' },
            'Lulus': { color: 'bg-blue-100 text-blue-700', icon: GraduationCap, label: 'Lulus' },
            'Pindah': { color: 'bg-orange-100 text-orange-700', icon: AlertCircle, label: 'Pindah' },
        }
        return statusMap[status] || statusMap['Aktif']
    }

    const config = getStatusConfig(santri.status)
    const StatusIcon = config.icon

    return (
        <div
            className={`
                relative flex flex-col p-4 rounded-xl border transition-all duration-200
                ${onClick ? 'cursor-pointer hover:shadow-md' : ''}
                ${selected
                    ? 'bg-primary-50 border-primary-500 ring-1 ring-primary-500'
                    : 'bg-white border-gray-200 hover:border-gray-300'
                }
            `}
            onClick={onClick}
        >
            <div className="flex items-center gap-4">
                {/* Avatar */}
                <div className="shrink-0">
                    <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden border border-gray-200">
                        {santri.foto_url ? (
                            <img src={santri.foto_url} alt={santri.nama} className="w-full h-full object-cover" />
                        ) : (
                            <User size={20} className="text-gray-400" />
                        )}
                    </div>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                    <h3 className={`text-sm font-semibold truncate ${selected ? 'text-primary-900' : 'text-gray-900'}`}>
                        {santri.nama}
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">NIS: <span className="font-mono">{santri.nis}</span></p>

                    <span className={`inline-flex items-center gap-1 mt-2 px-2 py-0.5 rounded-full text-[10px] font-medium w-fit ${config.color}`}>
                        <StatusIcon size={10} />
                        {config.label}
                    </span>
                </div>
            </div>

            {showDetails && (
                <div className="mt-4 pt-3 border-t border-gray-100 space-y-2">
                    <div className="flex items-center gap-2 text-xs text-gray-600">
                        <GraduationCap size={14} className="text-gray-400" />
                        <span>Kelas: <span className="font-medium text-gray-900">{santri.kelas?.nama || '-'}</span></span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-600">
                        <BookOpen size={14} className="text-gray-400" />
                        <span>Halaqoh: <span className="font-medium text-gray-900">{santri.halaqoh?.nama || '-'}</span></span>
                    </div>
                    {santri.hafalan_terakhir && (
                        <div className="flex items-center gap-2 text-xs text-gray-600">
                            <Clock size={14} className="text-gray-400" />
                            <span>Hafalan: <span className="font-medium text-gray-900">{santri.hafalan_terakhir}</span></span>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

export default SantriCard
