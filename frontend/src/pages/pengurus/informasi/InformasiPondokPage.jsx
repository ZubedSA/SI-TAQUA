import { useState, useEffect } from 'react'
import { FileText, Plus, Edit, Archive, Search, CheckCircle } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../context/AuthContext'
import { useInformasiPondok } from '../../../hooks/usePengurus'

const InformasiPondokPage = () => {
    const { userProfile } = useAuth()

    const [informasi, setInformasi] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchData()
    }, [])

    const fetchData = async () => {
        setLoading(true)
        try {
            const { data, error } = await supabase
                .from('informasi_pondok')
                .select('*')
                .eq('is_active', true)
                .order('created_at', { ascending: false })

            if (error) throw error
            setInformasi(data || [])
        } catch (error) {
            console.error('Error loading informasi:', error)
        } finally {
            setLoading(false)
        }
    }

    const [showModal, setShowModal] = useState(false)

    const handleOpenModal = (item = null) => {
        if (item) {
            setEditData(item)
            setFormData({
                judul: item.judul,
                isi: item.isi,
                kategori: item.kategori,
                urutan: item.urutan
            })
        } else {
            setEditData(null)
            setFormData({ judul: '', isi: '', kategori: 'INFO', urutan: 0 })
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
            const payload = { ...formData, created_by: userProfile?.id }

            if (editData) {
                await supabase.from('informasi_pondok').update(payload).eq('id', editData.id)
            } else {
                await supabase.from('informasi_pondok').insert([payload])
            }

            setShowModal(false)
            setShowModal(false)
            // Ideally invalidate query, using reload for quick consistency until mutation hooks
            window.location.reload()
        } catch (error) {
            alert('Gagal menyimpan: ' + error.message)
        } finally {
            setSaving(false)
        }
    }

    const handleDeactivate = async (id) => {
        if (!confirm('Nonaktifkan informasi ini?')) return
        try {
            await supabase.from('informasi_pondok').update({ is_active: false }).eq('id', id)
            await supabase.from('informasi_pondok').update({ is_active: false }).eq('id', id)
            window.location.reload()
        } catch (error) {
            alert('Gagal: ' + error.message)
        }
    }

    const kategoriOptions = ['INFO', 'PERATURAN', 'JADWAL', 'KONTAK', 'FASILITAS']

    return (
        <div style={{ padding: '1.5rem', maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.5rem', margin: 0 }}>
                        <FileText size={28} /> Informasi Pondok
                    </h1>
                    <p style={{ color: 'var(--text-muted)', margin: '0.25rem 0 0 0' }}>
                        Kelola informasi umum tentang pondok
                    </p>
                </div>
                <button onClick={() => handleOpenModal()} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.25rem', background: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
                    <Plus size={20} /> Tambah Info
                </button>
            </div>

            <div style={{ display: 'grid', gap: '1rem' }}>
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>Memuat...</div>
                ) : informasi.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
                        <FileText size={48} style={{ opacity: 0.5 }} />
                        <h3>Belum ada informasi</h3>
                        <p>Tambahkan informasi pertama Anda</p>
                    </div>
                ) : (
                    informasi.map((item) => (
                        <div key={item.id} style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1.25rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                                <div>
                                    <span style={{ display: 'inline-block', padding: '0.2rem 0.6rem', background: 'var(--bg-secondary)', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 600, marginBottom: '0.5rem' }}>{item.kategori}</span>
                                    <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{item.judul}</h3>
                                </div>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <button onClick={() => handleOpenModal(item)} style={{ padding: '0.4rem', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }} title="Edit">
                                        <Edit size={16} />
                                    </button>
                                    <button onClick={() => handleDeactivate(item.id)} style={{ padding: '0.4rem', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }} title="Nonaktifkan">
                                        <Archive size={16} />
                                    </button>
                                </div>
                            </div>
                            <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{item.isi}</p>
                        </div>
                    ))
                )}
            </div>

            {showModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }} onClick={() => setShowModal(false)}>
                    <div style={{ background: 'var(--card-bg)', borderRadius: '12px', padding: '1.5rem', width: '100%', maxWidth: '500px' }} onClick={e => e.stopPropagation()}>
                        <h2 style={{ margin: '0 0 1.5rem 0' }}>{editData ? 'Edit Informasi' : 'Tambah Informasi'}</h2>
                        <form onSubmit={handleSave}>
                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Judul *</label>
                                <input type="text" value={formData.judul} onChange={e => setFormData({ ...formData, judul: e.target.value })} style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border-color)', borderRadius: '8px', fontSize: '0.9rem' }} required />
                            </div>
                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Kategori</label>
                                <select value={formData.kategori} onChange={e => setFormData({ ...formData, kategori: e.target.value })} style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                                    {kategoriOptions.map(k => <option key={k} value={k}>{k}</option>)}
                                </select>
                            </div>
                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Isi *</label>
                                <textarea rows="5" value={formData.isi} onChange={e => setFormData({ ...formData, isi: e.target.value })} style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border-color)', borderRadius: '8px', fontSize: '0.9rem' }} required />
                            </div>
                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Urutan</label>
                                <input type="number" value={formData.urutan} onChange={e => setFormData({ ...formData, urutan: parseInt(e.target.value) || 0 })} style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border-color)', borderRadius: '8px' }} />
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                                <button type="button" onClick={() => setShowModal(false)} style={{ padding: '0.75rem 1.5rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', cursor: 'pointer' }}>Batal</button>
                                <button type="submit" disabled={saving} style={{ padding: '0.75rem 1.5rem', background: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>{saving ? 'Menyimpan...' : 'Simpan'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}

export default InformasiPondokPage
