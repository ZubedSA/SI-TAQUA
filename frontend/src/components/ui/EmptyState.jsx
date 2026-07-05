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
                    className="inline-flex items-center justify-center px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                    onClick={onAction}
                >
                    {actionLabel}
                </button>
            )}
        </div>
    )
}

export default EmptyState
