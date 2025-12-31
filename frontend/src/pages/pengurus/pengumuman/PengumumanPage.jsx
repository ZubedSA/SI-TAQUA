import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
    Bell,
    Plus,
    Search,
    Edit,
    Archive,
    Eye,
    Calendar,
    Tag,
    ChevronLeft,
    ChevronRight
} from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../context/AuthContext'
import './PengumumanPage.css'

const PengumumanPage = () => {
    const { activeRole, userProfile } = useAuth()
    const navigate = useNavigate()

    const [pengumuman, setPengumuman] = useState([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [showArchived, setShowArchived] = useState(false)
    const [showModal, setShowModal] = useState(false)
    const [editData, setEditData] = useState(null)
    const [formData, setFormData] = useState({
        judul: '',
        isi: '',
        kategori: 'UMUM',
        prioritas: 0,
        mulai_tampil: new Date().toISOString().split('T')[0],
        selesai_tampil: ''
    })
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        fetchPengumuman()
    }, [showArchived])

    const fetchPengumuman = async () => {
        setLoading(true)
        try {
            let query = supabase
                .from('pengumuman_internal')
                .select(`
                    *,
                    creator:created_by (nama)
                `)
                .eq('is_archived', showArchived)
                .order('prioritas', { ascending: false })
                .order('created_at', { ascending: false })

            const { data, error } = await query

            if (error) throw error
            setPengumuman(data || [])
        } catch (error) {
            console.error('Error fetching pengumuman:', error.message)
            setPengumuman([])
        } finally {
            setLoading(false)
        }
    }

    const handleOpenModal = (item = null) => {
        if (item) {
            setEditData(item)
            setFormData({
                judul: item.judul,
                isi: item.isi,
                kategori: item.kategori,
                prioritas: item.prioritas,
                mulai_tampil: item.mulai_tampil,
                selesai_tampil: item.selesai_tampil || ''
            })
        } else {
            setEditData(null)
            setFormData({
                judul: '',
                isi: '',
                kategori: 'UMUM',
                prioritas: 0,
                mulai_tampil: new Date().toISOString().split('T')[0],
                selesai_tampil: ''
            })
        }
        setShowModal(true)
    }

    const handleSave = async (e) => {
        e.preventDefault()
        if (!formData.judul || !formData.isi) {
            alert('Judul dan isi wajib diisi')
            return
        }

        setSaving(true)
        try {
            const payload = {
                ...formData,
                selesai_tampil: formData.selesai_tampil || null,
                created_by: userProfile?.id
            }

            if (editData) {
                const { error } = await supabase
                    .from('pengumuman_internal')
                    .update(payload)
                    .eq('id', editData.id)
                if (error) throw error
            } else {
                const { error } = await supabase
                    .from('pengumuman_internal')
                    .insert([payload])
                if (error) throw error
            }

            setShowModal(false)
            fetchPengumuman()
        } catch (error) {
            console.error('Error saving:', error.message)
            alert('Gagal menyimpan: ' + error.message)
        } finally {
            setSaving(false)
        }
    }

    const handleArchive = async (id, archive = true) => {
        if (!confirm(archive ? 'Arsipkan pengumuman ini?' : 'Kembalikan pengumuman dari arsip?')) return

        try {
            const { error } = await supabase
                .from('pengumuman_internal')
                .update({ is_archived: archive })
                .eq('id', id)

            if (error) throw error
            fetchPengumuman()
        } catch (error) {
            console.error('Error archiving:', error.message)
            alert('Gagal: ' + error.message)
        }
    }

    const getKategoriBadge = (kategori) => {
        const badges = {
            'UMUM': 'badge-default',
            'PENTING': 'badge-warning',
            'MENDESAK': 'badge-danger',
            'INFO': 'badge-info'
        }
        return badges[kategori] || 'badge-default'
    }

    const formatDate = (date) => {
        if (!date) return '-'
        return new Date(date).toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        })
    }

    const filteredData = pengumuman.filter(item => {
        if (!searchTerm) return true
        const search = searchTerm.toLowerCase()
        return (
            item.judul?.toLowerCase().includes(search) ||
            item.isi?.toLowerCase().includes(search)
        )
    })

    return (
        <div className="pengumuman-page">
            {/* Header */}
            <div className="page-header">
                <div className="header-left">
                    <h1><Bell size={28} /> Pengumuman Internal</h1>
                    <p>Kelola pengumuman untuk pengurus dan staff pondok</p>
                </div>
                <button className="btn-primary" onClick={() => handleOpenModal()}>
                    <Plus size={20} />
                    Buat Pengumuman
                </button>
            </div>

            {/* Filters */}
            <div className="filters-bar">
                <div className="search-box">
                    <Search size={18} />
                    <input
                        type="text"
                        placeholder="Cari pengumuman..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="filter-tabs">
                    <button
                        className={`tab-btn ${!showArchived ? 'active' : ''}`}
                        onClick={() => setShowArchived(false)}
                    >
                        Aktif
                    </button>
                    <button
                        className={`tab-btn ${showArchived ? 'active' : ''}`}
                        onClick={() => setShowArchived(true)}
                    >
                        <Archive size={16} />
                        Arsip
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="pengumuman-grid">
                {loading ? (
                    <div className="loading-state">
                        <div className="spinner"></div>
                        <p>Memuat data...</p>
                    </div>
                ) : filteredData.length === 0 ? (
                    <div className="empty-state">
                        <Bell size={48} />
                        <h3>Belum ada pengumuman</h3>
                        <p>{showArchived ? 'Tidak ada pengumuman di arsip' : 'Buat pengumuman pertama Anda'}</p>
                    </div>
                ) : (
                    filteredData.map((item) => (
                        <div key={item.id} className={`pengumuman-card ${item.kategori.toLowerCase()}`}>
                            <div className="card-header">
                                <span className={`kategori-badge ${getKategoriBadge(item.kategori)}`}>
                                    <Tag size={12} />
                                    {item.kategori}
                                </span>
                                <div className="card-actions">
                                    <button className="icon-btn" onClick={() => handleOpenModal(item)} title="Edit">
                                        <Edit size={16} />
                                    </button>
                                    <button
                                        className="icon-btn"
                                        onClick={() => handleArchive(item.id, !item.is_archived)}
                                        title={item.is_archived ? 'Kembalikan' : 'Arsipkan'}
                                    >
                                        <Archive size={16} />
                                    </button>
                                </div>
                            </div>
                            <h3 className="card-title">{item.judul}</h3>
                            <p className="card-content">{item.isi}</p>
                            <div className="card-footer">
                                <span className="date-info">
                                    <Calendar size={14} />
                                    {formatDate(item.mulai_tampil)}
                                    {item.selesai_tampil && ` - ${formatDate(item.selesai_tampil)}`}
                                </span>
                                <span className="creator">oleh {item.creator?.nama || 'Unknown'}</span>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <h2>{editData ? 'Edit Pengumuman' : 'Buat Pengumuman Baru'}</h2>
                        <form onSubmit={handleSave}>
                            <div className="form-group">
                                <label>Judul *</label>
                                <input
                                    type="text"
                                    value={formData.judul}
                                    onChange={(e) => setFormData({ ...formData, judul: e.target.value })}
                                    placeholder="Judul pengumuman..."
                                    required
                                />
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>Kategori</label>
                                    <select
                                        value={formData.kategori}
                                        onChange={(e) => setFormData({ ...formData, kategori: e.target.value })}
                                    >
                                        <option value="UMUM">Umum</option>
                                        <option value="INFO">Info</option>
                                        <option value="PENTING">Penting</option>
                                        <option value="MENDESAK">Mendesak</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Prioritas</label>
                                    <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        value={formData.prioritas}
                                        onChange={(e) => setFormData({ ...formData, prioritas: parseInt(e.target.value) || 0 })}
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Isi Pengumuman *</label>
                                <textarea
                                    rows="4"
                                    value={formData.isi}
                                    onChange={(e) => setFormData({ ...formData, isi: e.target.value })}
                                    placeholder="Isi pengumuman..."
                                    required
                                />
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>Mulai Tampil</label>
                                    <input
                                        type="date"
                                        value={formData.mulai_tampil}
                                        onChange={(e) => setFormData({ ...formData, mulai_tampil: e.target.value })}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Selesai Tampil</label>
                                    <input
                                        type="date"
                                        value={formData.selesai_tampil}
                                        onChange={(e) => setFormData({ ...formData, selesai_tampil: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="modal-actions">
                                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>
                                    Batal
                                </button>
                                <button type="submit" className="btn-primary" disabled={saving}>
                                    {saving ? 'Menyimpan...' : 'Simpan'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}

export default PengumumanPage
