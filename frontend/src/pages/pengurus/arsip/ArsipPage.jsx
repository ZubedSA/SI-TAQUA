import { useState, useEffect } from 'react'
import { Archive, Bell, Newspaper, FileText, Calendar, Search, RotateCcw } from 'lucide-react'
import { supabase } from '../../../lib/supabase'

const ArsipPage = () => {
    const [activeTab, setActiveTab] = useState('pengumuman')
    const [data, setData] = useState([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')

    useEffect(() => {
        fetchData()
    }, [activeTab])

    const fetchData = async () => {
        setLoading(true)
        try {
            let result = []

            if (activeTab === 'pengumuman') {
                const { data } = await supabase
                    .from('pengumuman_internal')
                    .select('*')
                    .eq('is_archived', true)
                    .order('created_at', { ascending: false })
                result = data || []
            } else if (activeTab === 'buletin') {
                const { data } = await supabase
                    .from('buletin_pondok')
                    .select('*')
                    .eq('is_archived', true)
                    .order('created_at', { ascending: false })
                result = data || []
            } else if (activeTab === 'informasi') {
                const { data } = await supabase
                    .from('informasi_pondok')
                    .select('*')
                    .eq('is_active', false)
                    .order('created_at', { ascending: false })
                result = data || []
            }

            setData(result)
        } catch (error) {
            console.log('Error:', error.message)
            setData([])
        } finally {
            setLoading(false)
        }
    }

    const handleRestore = async (id) => {
        if (!confirm('Kembalikan item ini dari arsip?')) return
        try {
            if (activeTab === 'pengumuman') {
                await supabase.from('pengumuman_internal').update({ is_archived: false }).eq('id', id)
            } else if (activeTab === 'buletin') {
                await supabase.from('buletin_pondok').update({ is_archived: false }).eq('id', id)
            } else if (activeTab === 'informasi') {
                await supabase.from('informasi_pondok').update({ is_active: true }).eq('id', id)
            }
            fetchData()
        } catch (error) {
            alert('Gagal restore: ' + error.message)
        }
    }

    const formatDate = (date) => {
        return new Date(date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
    }

    const filteredData = data.filter(item => {
        if (!searchTerm) return true
        const search = searchTerm.toLowerCase()
        return item.judul?.toLowerCase().includes(search) || item.isi?.toLowerCase().includes(search)
    })

    const tabs = [
        { id: 'pengumuman', label: 'Pengumuman', icon: Bell },
        { id: 'buletin', label: 'Buletin', icon: Newspaper },
        { id: 'informasi', label: 'Informasi', icon: FileText }
    ]

    return (
        <div style={{ padding: '1.5rem', maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ marginBottom: '1.5rem' }}>
                <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.5rem', margin: 0 }}>
                    <Archive size={28} /> Arsip
                </h1>
                <p style={{ color: 'var(--text-muted)', margin: '0.25rem 0 0 0' }}>
                    Lihat dan kembalikan data yang telah diarsipkan
                </p>
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.35rem',
                                padding: '0.5rem 1rem',
                                background: activeTab === tab.id ? 'var(--color-primary)' : 'var(--card-bg)',
                                color: activeTab === tab.id ? 'white' : 'var(--text-secondary)',
                                border: '1px solid var(--border-color)',
                                borderRadius: '8px',
                                cursor: 'pointer'
                            }}
                        >
                            <tab.icon size={16} /> {tab.label}
                        </button>
                    ))}
                </div>
                <div style={{ flex: 1, minWidth: '200px', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                    <Search size={18} style={{ color: 'var(--text-muted)' }} />
                    <input
                        type="text"
                        placeholder="Cari di arsip..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', color: 'var(--text-primary)' }}
                    />
                </div>
            </div>

            <div style={{ display: 'grid', gap: '1rem' }}>
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>Memuat...</div>
                ) : filteredData.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
                        <Archive size={48} style={{ opacity: 0.5 }} />
                        <h3 style={{ margin: '0.75rem 0 0.5rem 0' }}>Arsip kosong</h3>
                        <p style={{ margin: 0 }}>Tidak ada {activeTab} yang diarsipkan</p>
                    </div>
                ) : (
                    filteredData.map((item) => (
                        <div key={item.id} style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.judul}</h3>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                                    <Calendar size={14} />
                                    <span>{formatDate(item.created_at)}</span>
                                    {item.kategori && <span style={{ padding: '0.1rem 0.5rem', background: 'var(--bg-secondary)', borderRadius: '4px' }}>{item.kategori}</span>}
                                </div>
                            </div>
                            <button
                                onClick={() => handleRestore(item.id)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.35rem',
                                    padding: '0.5rem 1rem',
                                    background: 'rgba(52, 168, 83, 0.1)',
                                    color: '#34a853',
                                    border: 'none',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    fontSize: '0.875rem',
                                    fontWeight: 500
                                }}
                            >
                                <RotateCcw size={16} /> Restore
                            </button>
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}

export default ArsipPage
