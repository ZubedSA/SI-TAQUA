import { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, BookOpen, Search, RefreshCw, BookMarked, GraduationCap } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import './Mapel.css'

const MapelPage = () => {
    const [mapelList, setMapelList] = useState([])
    const [searchTerm, setSearchTerm] = useState('')
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [editData, setEditData] = useState(null)
    const [formData, setFormData] = useState({ kode: '', nama: '', deskripsi: '', kategori: 'Madrosiyah' })
    const [saving, setSaving] = useState(false)
    const [activeKategori, setActiveKategori] = useState('Semua')

    useEffect(() => {
        fetchMapel()
    }, [])

    const fetchMapel = async () => {
        setLoading(true)
        try {
            const { data, error } = await supabase.from('mapel').select('*').order('nama')
            if (error) throw error
            setMapelList(data || [])
        } catch (err) {
            console.error('Error:', err.message)
        } finally {
            setLoading(false)
        }
    }

    const filteredMapel = mapelList.filter(m => {
        const matchSearch = m.nama?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            m.kode?.toLowerCase().includes(searchTerm.toLowerCase())
        const matchKategori = activeKategori === 'Semua' || m.kategori === activeKategori
        return matchSearch && matchKategori
    })

    const handleSubmit = async (e) => {
        e.preventDefault()
        setSaving(true)
        try {
            if (editData) {
                const { error } = await supabase.from('mapel').update(formData).eq('id', editData.id)
                if (error) throw error
            } else {
                const { error } = await supabase.from('mapel').insert([formData])
                if (error) throw error
            }
            fetchMapel()
            setShowModal(false)
            setEditData(null)
            setFormData({ kode: '', nama: '', deskripsi: '', kategori: 'Madrosiyah' })
        } catch (err) {
            alert('Error: ' + err.message)
        } finally {
            setSaving(false)
        }
    }

    const handleEdit = (mapel) => {
        setEditData(mapel)
        setFormData({ ...mapel, kategori: mapel.kategori || 'Madrosiyah' })
        setShowModal(true)
    }

    const handleDelete = async (id) => {
        if (!confirm('Yakin ingin menghapus mata pelajaran ini?')) return
        try {
            const { error } = await supabase.from('mapel').delete().eq('id', id)
            if (error) throw error
            setMapelList(mapelList.filter(m => m.id !== id))
        } catch (err) {
            alert('Error: ' + err.message)
        }
    }

    const countByKategori = (kat) => mapelList.filter(m => m.kategori === kat).length

    return (
        <div className="mapel-page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Mata Pelajaran</h1>
                    <p className="page-subtitle">Kelola daftar mata pelajaran</p>
                </div>
                <button className="btn btn-primary" onClick={() => { setEditData(null); setFormData({ kode: '', nama: '', deskripsi: '', kategori: 'Madrosiyah' }); setShowModal(true) }}>
                    <Plus size={18} /> Tambah Mapel
                </button>
            </div>

            {/* Kategori Filter Buttons */}
            <div className="kategori-filter mb-3">
                <button
                    className={`btn ${activeKategori === 'Semua' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setActiveKategori('Semua')}
                >
                    Semua ({mapelList.length})
                </button>
                <button
                    className={`btn ${activeKategori === 'Tahfizhiyah' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setActiveKategori('Tahfizhiyah')}
                >
                    <BookMarked size={16} /> Tahfizhiyah ({countByKategori('Tahfizhiyah')})
                </button>
                <button
                    className={`btn ${activeKategori === 'Madrosiyah' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setActiveKategori('Madrosiyah')}
                >
                    <GraduationCap size={16} /> Madrosiyah ({countByKategori('Madrosiyah')})
                </button>
            </div>

            <div className="table-container">
                <div className="table-header">
                    <h3 className="table-title">Daftar Mapel ({filteredMapel.length})</h3>
                    <div className="table-search">
                        <Search size={18} className="search-icon" />
                        <input type="text" placeholder="Cari mapel..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="search-input" />
                    </div>
                </div>
                <table className="table">
                    <thead>
                        <tr>
                            <th>Kode</th>
                            <th>Nama Mapel</th>
                            <th>Kategori</th>
                            <th>Deskripsi</th>
                            <th>Aksi</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan="5" className="text-center"><RefreshCw size={20} className="spin" /> Loading...</td></tr>
                        ) : filteredMapel.length === 0 ? (
                            <tr><td colSpan="5" className="text-center">Tidak ada data</td></tr>
                        ) : (
                            filteredMapel.map(mapel => (
                                <tr key={mapel.id}>
                                    <td><span className="badge badge-info">{mapel.kode}</span></td>
                                    <td className="name-cell"><BookOpen size={16} className="text-muted" /> {mapel.nama}</td>
                                    <td>
                                        <span className={`badge ${mapel.kategori === 'Tahfizhiyah' ? 'badge-success' : 'badge-warning'}`}>
                                            {mapel.kategori || 'Madrosiyah'}
                                        </span>
                                    </td>
                                    <td className="text-muted">{mapel.deskripsi || '-'}</td>
                                    <td>
                                        <div className="action-buttons">
                                            <button className="btn-icon" onClick={() => handleEdit(mapel)}><Edit size={16} /></button>
                                            <button className="btn-icon btn-icon-danger" onClick={() => handleDelete(mapel.id)}><Trash2 size={16} /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {showModal && (
                <div className="modal-overlay active">
                    <div className="modal">
                        <div className="modal-header">
                            <h3 className="modal-title">{editData ? 'Edit Mapel' : 'Tambah Mapel'}</h3>
                            <button className="modal-close" onClick={() => { setShowModal(false); setEditData(null) }}>×</button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label className="form-label">Kode Mapel *</label>
                                    <input type="text" className="form-control" value={formData.kode} onChange={e => setFormData({ ...formData, kode: e.target.value.toUpperCase() })} maxLength={5} required />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Nama Mapel *</label>
                                    <input type="text" className="form-control" value={formData.nama} onChange={e => setFormData({ ...formData, nama: e.target.value })} required />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Kategori *</label>
                                    <select className="form-control" value={formData.kategori} onChange={e => setFormData({ ...formData, kategori: e.target.value })}>
                                        <option value="Tahfizhiyah">Tahfizhiyah (Hafalan/Quran)</option>
                                        <option value="Madrosiyah">Madrosiyah (Formal/Umum)</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Deskripsi</label>
                                    <textarea className="form-control" rows={3} value={formData.deskripsi || ''} onChange={e => setFormData({ ...formData, deskripsi: e.target.value })} />
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Batal</button>
                                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}

export default MapelPage
