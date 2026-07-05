import React from 'react'
import ConfirmationModal from './ConfirmationModal'

const DeleteConfirmationModal = ({
    isOpen,
    onClose,
    onConfirm,
    itemName,
    title = 'Konfirmasi Hapus',
    message,
    isDeleting = false
}) => {
    const defaultMessage = (
        <span>Apakah Anda yakin ingin menghapus <strong>{itemName}</strong>?</span>
    )

    return (
        <ConfirmationModal
            isOpen={isOpen}
            onClose={onClose}
            onConfirm={onConfirm}
            title={title}
            message={message || defaultMessage}
            description="Tindakan ini tidak dapat dibatalkan. Data akan dipindahkan ke sampah."
            confirmLabel={isDeleting ? 'Menghapus...' : 'Hapus'}
            cancelLabel="Batal"
            variant="danger"
            isLoading={isDeleting}
        />
    )
}

export default DeleteConfirmationModal
