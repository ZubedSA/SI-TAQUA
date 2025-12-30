import { User, GraduationCap, BookOpen, CheckCircle, AlertCircle, Clock } from 'lucide-react'

/**
 * SantriCard - Card untuk menampilkan info santri
 * Digunakan di dashboard dan halaman lain untuk menampilkan info santri
 */
const SantriCard = ({ santri, selected = false, onClick, showDetails = false }) => {
    if (!santri) return null

    const getStatusBadge = (status) => {
        const statusMap = {
            'Aktif': { class: 'status-aktif', icon: CheckCircle, label: 'Aktif' },
            'Tidak Aktif': { class: 'status-tidak-aktif', icon: AlertCircle, label: 'Tidak Aktif' },
            'Lulus': { class: 'status-lulus', icon: GraduationCap, label: 'Lulus' },
            'Pindah': { class: 'status-pindah', icon: AlertCircle, label: 'Pindah' },
        }
        const config = statusMap[status] || statusMap['Aktif']
        const StatusIcon = config.icon

        return (
            <span className={`santri-status-badge ${config.class}`}>
                <StatusIcon size={12} />
                {config.label}
            </span>
        )
    }

    return (
        <div
            className={`santri-card ${selected ? 'selected' : ''} ${onClick ? 'clickable' : ''}`}
            onClick={onClick}
        >
            <div className="santri-card-header">
                <div className="santri-avatar">
                    {santri.foto_url ? (
                        <img src={santri.foto_url} alt={santri.nama} />
                    ) : (
                        <div className="santri-avatar-placeholder">
                            <User size={32} />
                        </div>
                    )}
                </div>
                <div className="santri-info">
                    <h3 className="santri-nama">{santri.nama}</h3>
                    <p className="santri-nis">NIS: {santri.nis}</p>
                    {getStatusBadge(santri.status)}
                </div>
            </div>

            {showDetails && (
                <div className="santri-card-details">
                    <div className="santri-detail-row">
                        <GraduationCap size={16} />
                        <span>Kelas: {santri.kelas?.nama || '-'}</span>
                    </div>
                    <div className="santri-detail-row">
                        <BookOpen size={16} />
                        <span>Halaqoh: {santri.halaqoh?.nama || '-'}</span>
                    </div>
                    {santri.hafalan_terakhir && (
                        <div className="santri-detail-row">
                            <Clock size={16} />
                            <span>Hafalan Terakhir: {santri.hafalan_terakhir}</span>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

export default SantriCard
