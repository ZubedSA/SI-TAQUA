import { useState } from 'react'
import { X, MessageCircle, Check, Send } from 'lucide-react'
import './WhatsAppBroadcastModal.css'

const WhatsAppBroadcastModal = ({ isOpen, onClose, items, onSend }) => {
    const [sentItems, setSentItems] = useState({})

    if (!isOpen) return null

    const handleSend = (item) => {
        onSend(item)
        setSentItems(prev => ({ ...prev, [item.id]: true }))
    }

    const totalItems = items.length
    const sentCount = Object.keys(sentItems).length
    const progress = totalItems === 0 ? 0 : Math.round((sentCount / totalItems) * 100)

    return (
        <div className="broadcast-modal-overlay">
            <div className="broadcast-modal">
                <div className="broadcast-header">
                    <div>
                        <h3>Broadcast WhatsApp</h3>
                        <p>Kirim konfirmasi ke {totalItems} penerima</p>
                    </div>
                    <button className="btn-close" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <div className="broadcast-progress">
                    <div className="progress-text">
                        <span>Progres: {sentCount} / {totalItems}</span>
                        <span>{progress}%</span>
                    </div>
                    <div className="progress-bar">
                        <div className="progress-fill" style={{ width: `${progress}%` }}></div>
                    </div>
                </div>

                <div className="broadcast-list">
                    <table>
                        <thead>
                            <tr>
                                <th>No</th>
                                <th>Nama Santri</th>
                                <th>Wali Santri</th>
                                <th>Status</th>
                                <th>Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map((item, index) => (
                                <tr key={item.id} className={sentItems[item.id] ? 'row-sent' : ''}>
                                    <td>{index + 1}</td>
                                    <td>
                                        <div className="santri-info">
                                            <strong>{item.santri_nama}</strong>
                                            <small>{item.surah || item.surah_mulai}</small>
                                        </div>
                                    </td>
                                    <td>{item.nama_wali || '-'}</td>
                                    <td>
                                        {sentItems[item.id] ? (
                                            <span className="badge badge-success">
                                                <Check size={12} /> Terkirim
                                            </span>
                                        ) : (
                                            <span className="badge badge-pending">Menunggu</span>
                                        )}
                                    </td>
                                    <td>
                                        <button
                                            className={`btn-action ${sentItems[item.id] ? 'btn-disabled' : 'btn-send'}`}
                                            onClick={() => handleSend(item)}
                                            disabled={sentItems[item.id]}
                                        >
                                            {sentItems[item.id] ? 'Selesai' : (
                                                <>
                                                    <Send size={14} /> Kirim
                                                </>
                                            )}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="broadcast-footer">
                    <p className="hint-text">* Browser mungkin memblokir popup jika mengirim terlalu cepat. Klik kirim satu per satu.</p>
                    <button className="btn btn-primary" onClick={onClose}>Selesai</button>
                </div>
            </div>
        </div>
    )
}

export default WhatsAppBroadcastModal
