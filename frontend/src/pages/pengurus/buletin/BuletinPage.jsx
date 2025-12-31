import { useState, useEffect } from 'react'
import { Newspaper, Plus, Upload, Archive, Calendar, FileText, Download, Eye } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../context/AuthContext'

const BuletinPage = () => {
    const { userProfile } = useAuth()
    const [buletin, setBuletin] = useState([])
    const [loading, setLoading] = useState(true)
    const [showArchived, setShowArchived] = useState(false)
    const [showModal, setShowModal] = useState(false)
    const [formData, setFormData] = useState({
        judul: '',
        deskripsi: '',
        file_url: '',
        file_type: 'PDF',
        bulan: new Date().getMonth() + 1,
        tahun: new Date().getFullYear()
    })
    const [saving, setSaving] = useState(false)

    const bulanNama = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']

    useEffect(() => {
        fetchBuletin()
    }, [showArchived])

    const fetchBuletin = async () => {
        setLoading(true)
        try {
            const { data, error } = await supabase
                .from('buletin_pondok')
                .select('*')
                .eq('is_archived', showArchived)
                .order('tahun', { ascending: false })
                .order('bulan', { ascending: false })

            if (error) throw error
            setBuletin(data || [])
        } catch (error) {
            console.log('Error:', error.message)
            setBuletin([])
        } finally {
            setLoading(false)
        }
    }

    const handleSave = async (e) => {
        e.preventDefault()
        if (!formData.judul) {
            alert('Judul wajib diisi')
            return
        }

        setSaving(true)
        try {
            const payload = { ...formData, created_by: userProfile?.id }
            await supabase.from('buletin_pondok').insert([payload])
            setShowModal(false)
            setFormData({
                judul: '',
                deskripsi: '',
                file_url: '',
                file_type: 'PDF',
                bulan: new Date().getMonth() + 1,
                tahun: new Date().getFullYear()
            })
            fetchBuletin()
        } catch (error) {
            alert('Gagal menyimpan: ' + error.message)
        } finally {
            setSaving(false)
        }
    }

    const handleArchive = async (id, archive = true) => {
        if (!confirm(archive ? 'Arsipkan buletin ini?' : 'Kembalikan dari arsip?')) return
        try {
            await supabase.from('buletin_pondok').update({ is_archived: archive }).eq('id', id)
            fetchBuletin()
        } catch (error) {
            alert('Gagal: ' + error.message)
        }
    }

    return (
        <div style={{ padding: '1.5rem', maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.5rem', margin: 0 }}>
                        <Newspaper size={28} /> Buletin Pondok
                    </h1>
                    <p style={{ color: 'var(--text-muted)', margin: '0.25rem 0 0 0' }}>
                        Kelola buletin bulanan pondok
                    </p>
                </div>
                <button onClick={() => setShowModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.25rem', background: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
                    <Plus size={20} /> Upload Buletin
                </button>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
                <button onClick={() => setShowArchived(false)} style={{ padding: '0.5rem 1rem', background: !showArchived ? 'var(--color-primary)' : 'var(--card-bg)', color: !showArchived ? 'white' : 'var(--text-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', cursor: 'pointer' }}>Aktif</button>
                <button onClick={() => setShowArchived(true)} style={{ padding: '0.5rem 1rem', background: showArchived ? 'var(--color-primary)' : 'var(--card-bg)', color: showArchived ? 'white' : 'var(--text-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem' }}><Archive size={16} /> Arsip</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                {loading ? (
                    <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>Memuat...</div>
                ) : buletin.length === 0 ? (
                    <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
                        <Newspaper size={48} style={{ opacity: 0.5 }} />
                        <h3>Belum ada buletin</h3>
                        <p>{showArchived ? 'Tidak ada buletin di arsip' : 'Upload buletin pertama Anda'}</p>
                    </div>
                ) : (
                    buletin.map((item) => (
                        <div key={item.id} style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '12px', overflow: 'hidden' }}>
                            <div style={{ padding: '1.25rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '0.5rem' }}>
                                    <Calendar size={14} />
                                    {bulanNama[item.bulan - 1]} {item.tahun}
                                </div>
                                <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem' }}>{item.judul}</h3>
                                {item.deskripsi && <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{item.deskripsi}</p>}
                            </div>
                            <div style={{ display: 'flex', borderTop: '1px solid var(--border-color)' }}>
                                {item.file_url && (
                                    <a href={item.file_url} target="_blank" rel="noopener noreferrer" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem', padding: '0.75rem', color: 'var(--color-primary)', textDecoration: 'none', fontSize: '0.875rem' }}>
                                        <Eye size={16} /> Lihat
                                    </a>
                                )}
                                <button onClick={() => handleArchive(item.id, !item.is_archived)} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem', padding: '0.75rem', background: 'transparent', border: 'none', borderLeft: '1px solid var(--border-color)', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.875rem' }}>
                                    <Archive size={16} /> {item.is_archived ? 'Restore' : 'Arsip'}
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {showModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }} onClick={() => setShowModal(false)}>
                    <div style={{ background: 'var(--card-bg)', borderRadius: '12px', padding: '1.5rem', width: '100%', maxWidth: '500px' }} onClick={e => e.stopPropagation()}>
                        <h2 style={{ margin: '0 0 1.5rem 0' }}>Upload Buletin</h2>
                        <form onSubmit={handleSave}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Bulan</label>
                                    <select value={formData.bulan} onChange={e => setFormData({ ...formData, bulan: parseInt(e.target.value) })} style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                                        {bulanNama.map((b, i) => <option key={i} value={i + 1}>{b}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Tahun</label>
                                    <input type="number" value={formData.tahun} onChange={e => setFormData({ ...formData, tahun: parseInt(e.target.value) })} style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border-color)', borderRadius: '8px' }} />
                                </div>
                            </div>
                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Judul *</label>
                                <input type="text" value={formData.judul} onChange={e => setFormData({ ...formData, judul: e.target.value })} style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border-color)', borderRadius: '8px' }} required />
                            </div>
                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Deskripsi</label>
                                <textarea rows="2" value={formData.deskripsi} onChange={e => setFormData({ ...formData, deskripsi: e.target.value })} style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border-color)', borderRadius: '8px' }} />
                            </div>
                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>URL File (PDF/Gambar)</label>
                                <input type="url" value={formData.file_url} onChange={e => setFormData({ ...formData, file_url: e.target.value })} placeholder="https://..." style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border-color)', borderRadius: '8px' }} />
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                                <button type="button" onClick={() => setShowModal(false)} style={{ padding: '0.75rem 1.5rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', cursor: 'pointer' }}>Batal</button>
                                <button type="submit" disabled={saving} style={{ padding: '0.75rem 1.5rem', background: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>{saving ? 'Menyimpan...' : 'Upload'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}

export default BuletinPage
