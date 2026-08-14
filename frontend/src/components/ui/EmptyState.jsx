import { FolderOpen } from 'lucide-react'

const EmptyState = ({ icon: Icon = FolderOpen, title = 'Tidak ada data', message = 'Data belum tersedia atau tidak ditemukan.', actionLabel, onAction }) => {
    return (
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                <Icon className="text-gray-400" size={32} strokeWidth={1.5} />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">{title}</h3>
            <p className="text-sm text-gray-500 max-w-sm mb-6">{message}</p>
            {actionLabel && onAction && (
                <button
                    className="btn btn-primary"
                    onClick={onAction}
                >
                    {actionLabel}
                </button>
            )}
        </div>
    )
}

export default EmptyState
