import { FolderOpen } from 'lucide-react'
import './EmptyState.css'

const EmptyState = ({ icon: Icon = FolderOpen, title = 'Tidak ada data', message = 'Data belum tersedia atau tidak ditemukan.', actionLabel, onAction }) => {
    return (
        <div className="empty-state">
            <Icon className="empty-state-icon" strokeWidth={1.5} />
            <h3 className="empty-state-title">{title}</h3>
            <p className="empty-state-message">{message}</p>
            {actionLabel && onAction && (
                <button className="btn btn-primary empty-state-action" onClick={onAction}>
                    {actionLabel}
                </button>
            )}
        </div>
    )
}

export default EmptyState
