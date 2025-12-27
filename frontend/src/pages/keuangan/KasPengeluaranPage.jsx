import { useState, useEffect } from 'react'
import { Plus, Search, Edit2, Trash2, ArrowDownCircle, Download, RefreshCw } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { usePermissions } from '../../hooks/usePermissions'
import { generateLaporanPDF } from '../../utils/pdfGenerator'
import MobileActionMenu from '../../components/ui/MobileActionMenu'
import './Keuangan.css'

const KasPengeluaranPage = () => {
    const { user } = useAuth()
    const { canCreate, canUpdate, canDelete } = usePermissions()
    const [data, setData] = useState([])
    const [kategoriList, setKategoriList] = useState([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [editItem, setEditItem] = useState(null)
    const [filters, setFilters] = useState({
        search: '',
        bulan: '',
        tahun: new Date().getFullYear(),
        dateFrom: '',
        dateTo: ''
    })
    const [form, setForm] = useState({
        tanggal: new Date().toISOString().split('T')[0],
        keperluan: '',
        kategori: '',
        jumlah: '',
        keterangan: ''
    })

    useEffect(() => {
        fetchData()
        fetchKategori()
    }, [filters.bulan, filters.tahun, filters.dateFrom, filters.dateTo])

    const fetchKategori = async () => {
        const { data } = await supabase
            .from('kategori_pembayaran')
            .select('*')
            .eq('is_active', true)
            .eq('tipe', 'pengeluaran')
            .order('nama')
        setKategoriList(data || [])
    }

    const fetchData = async () => {
        setLoading(true)
        try {
            let query = supabase
                .from('kas_pengeluaran')
                .select('*')
                .order('tanggal', { ascending: false })

            // Date range filter takes priority
            if (filters.dateFrom && filters.dateTo) {
                query = query.gte('tanggal', filters.dateFrom)
                    .lte('tanggal', filters.dateTo)
            } else if (filters.dateFrom) {
                query = query.gte('tanggal', filters.dateFrom)
            } else if (filters.dateTo) {
                query = query.lte('tanggal', filters.dateTo)
            } else {
                // Fallback to bulan/tahun filter
                if (filters.tahun) {
                    query = query.gte('tanggal', `${filters.tahun}-01-01`)
                        .lte('tanggal', `${filters.tahun}-12-31`)
                }
                if (filters.bulan) {
                    const month = String(filters.bulan).padStart(2, '0')
                    query = query.gte('tanggal', `${filters.tahun}-${month}-01`)
                        .lte('tanggal', `${filters.tahun}-${month}-31`)
                }
            }

            const { data: result, error } = await query
            if (error) throw error
            setData(result || [])
        } catch (err) {
            console.error('Error:', err.message)
        } finally {
            setLoading(false)
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        try {
            const payload = {
                ...form,
                jumlah: parseFloat(form.jumlah),
                created_by: user?.id
            }

            if (editItem) {
                const { error } = await supabase.from('kas_pengeluaran').update(payload).eq('id', editItem.id)
                if (error) throw error
            } else {
                const { error } = await supabase.from('kas_pengeluaran').insert([payload])
                if (error) throw error
            }

            setShowModal(false)
            resetForm()
            fetchData()
        } catch (err) {
            alert('Error: ' + err.message)
        }
    }

    const handleDelete = async (id) => {
        if (!confirm('Yakin hapus data ini?')) return
        try {
            const { error } = await supabase.from('kas_pengeluaran').delete().eq('id', id)
            if (error) throw error
            fetchData()
        } catch (err) {
            alert('Error: ' + err.message)
        }
    }

    const resetForm = () => {
        setForm({
            tanggal: new Date().toISOString().split('T')[0],
            keperluan: '',
            kategori: '',
            jumlah: '',
            keterangan: ''
        })
        setEditItem(null)
    }

    const openEdit = (item) => {
        setEditItem(item)
        setForm({
            tanggal: item.tanggal,
            keperluan: item.keperluan,
            kategori: item.kategori || '',
            jumlah: item.jumlah.toString(),
            keterangan: item.keterangan || ''
        })
        setShowModal(true)
    }

    const handleDownloadPDF = () => {
        generateLaporanPDF({
            title: 'Laporan Pengeluaran Kas',
            subtitle: filters.bulan ? `Bulan ${filters.bulan}/${filters.tahun}` : `Tahun ${filters.tahun}`,
            columns: ['Tanggal', 'Keperluan', 'Kategori', 'Jumlah', 'Keterangan'],
            data: data.map(d => [
                new Date(d.tanggal).toLocaleDateString('id-ID'),
                d.keperluan,
                d.kategori || '-',
                `Rp ${Number(d.jumlah).toLocaleString('id-ID')}`,
                d.keterangan || '-'
            ]),
            filename: 'laporan_pengeluaran_kas',
            showTotal: true,
            totalLabel: 'Total Pengeluaran',
            totalValue: data.reduce((sum, d) => sum + Number(d.jumlah), 0)
        })
    }

    const totalPengeluaran = data.reduce((sum, d) => sum + Number(d.jumlah), 0)
    const filteredData = data.filter(d =>
        d.keperluan.toLowerCase().includes(filters.search.toLowerCase()) ||
        (d.keterangan && d.keterangan.toLowerCase().includes(filters.search.toLowerCase()))
    )

    return (
        <div className="keuangan-page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">
                        <ArrowDownCircle className="title-icon red" /> Pengeluaran Kas
                    </h1>
                    <p className="page-subtitle">Kelola data pengeluaran kas pesantren</p>
                </div>
                <div className="header-actions">
                    <button className="btn btn-secondary" onClick={handleDownloadPDF}>
                        <Download size={18} /> Download PDF
                    </button>
                    {canCreate('kas') && (
                        <button className="btn btn-primary" onClick={() => { resetForm(); setShowModal(true) }}>
                            <Plus size={18} /> Tambah Pengeluaran
                        </button>
                    )}
                </div>
            </div>

            <div className="summary-card red">
                <div className="summary-content">
                    <span className="summary-label">Total Pengeluaran</span>
                    <span className="summary-value">Rp {totalPengeluaran.toLocaleString('id-ID')}</span>
                </div>
                <ArrowDownCircle size={40} className="summary-icon" />
            </div>

            <div className="filters-bar">
                <div className="search-box">
                    <Search size={18} />
                    <input
                        type="text"
                        placeholder="Cari keperluan..."
                        value={filters.search}
                        onChange={e => setFilters({ ...filters, search: e.target.value })}
                    />
                </div>
                <div className="date-range-filter">
                    <input
                        type="date"
                        value={filters.dateFrom}
                        onChange={e => setFilters({ ...filters, dateFrom: e.target.value, bulan: '', tahun: new Date().getFullYear() })}
                        title="Dari Tanggal"
                    />
                    <span>-</span>
                    <input
                        type="date"
                        value={filters.dateTo}
                        onChange={e => setFilters({ ...filters, dateTo: e.target.value, bulan: '', tahun: new Date().getFullYear() })}
                        title="Sampai Tanggal"
                    />
                </div>
                <select
                    value={filters.bulan}
                    onChange={e => setFilters({ ...filters, bulan: e.target.value, dateFrom: '', dateTo: '' })}
                    disabled={filters.dateFrom || filters.dateTo}
                >
                    <option value="">Semua Bulan</option>
                    {[...Array(12)].map((_, i) => (
                        <option key={i} value={i + 1}>{new Date(2000, i).toLocaleString('id-ID', { month: 'long' })}</option>
                    ))}
                </select>
                <select
                    value={filters.tahun}
                    onChange={e => setFilters({ ...filters, tahun: e.target.value, dateFrom: '', dateTo: '' })}
                    disabled={filters.dateFrom || filters.dateTo}
                >
                    {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                </select>
                <button className="btn btn-icon" onClick={fetchData}><RefreshCw size={18} /></button>
            </div>

            <div className="data-card">
                {loading ? (
                    <div className="loading-state">Memuat data...</div>
                ) : filteredData.length === 0 ? (
                    <div className="empty-state">Belum ada data pengeluaran</div>
                ) : (
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>No</th>
                                <th>Tanggal</th>
                                <th>Keperluan</th>
                                <th>Kategori</th>
                                <th>Jumlah</th>
                                <th>Keterangan</th>
                                <th>Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredData.map((item, i) => (
                                <tr key={item.id}>
                                    <td>{i + 1}</td>
                                    <td>{new Date(item.tanggal).toLocaleDateString('id-ID')}</td>
                                    <td>{item.keperluan}</td>
                                    <td><span className="badge red">{item.kategori || '-'}</span></td>
                                    <td className="amount red">Rp {Number(item.jumlah).toLocaleString('id-ID')}</td>
                                    <td>{item.keterangan || '-'}</td>
                                    <td>
                                        {(canUpdate('kas') || canDelete('kas')) && (
                                            <MobileActionMenu
                                                actions={[
                                                    canUpdate('kas') && {
                                                        label: 'Edit',
                                                        icon: <Edit2 size={14} />,
                                                        onClick: () => openEdit(item)
                                                    },
                                                    canDelete('kas') && {
                                                        label: 'Hapus',
                                                        icon: <Trash2 size={14} />,
                                                        onClick: () => handleDelete(item.id),
                                                        danger: true
                                                    }
                                                ].filter(Boolean)}
                                            >
                                                {canUpdate('kas') && (
                                                    <button className="btn-icon-sm" onClick={() => openEdit(item)}><Edit2 size={16} /></button>
                                                )}
                                                {canDelete('kas') && (
                                                    <button className="btn-icon-sm danger" onClick={() => handleDelete(item.id)}><Trash2 size={16} /></button>
                                                )}
                                            </MobileActionMenu>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {showModal && (
                <div className="modal-overlay active">
                    <div className="modal">
                        <div className="modal-header">
                            <h3>{editItem ? 'Edit Pengeluaran' : 'Tambah Pengeluaran'}</h3>
                            <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label>Tanggal *</label>
                                    <input type="date" value={form.tanggal} onChange={e => setForm({ ...form, tanggal: e.target.value })} required />
                                </div>
                                <div className="form-group">
                                    <label>Keperluan *</label>
                                    <input type="text" value={form.keperluan} onChange={e => setForm({ ...form, keperluan: e.target.value })} placeholder="Contoh: Beli ATK" required />
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Kategori</label>
                                        <select value={form.kategori} onChange={e => setForm({ ...form, kategori: e.target.value })}>
                                            <option value="">Pilih Kategori</option>
                                            {kategoriList.map(k => <option key={k.id} value={k.nama}>{k.nama}</option>)}
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label>Jumlah (Rp) *</label>
                                        <input type="number" value={form.jumlah} onChange={e => setForm({ ...form, jumlah: e.target.value })} min="0" required />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label>Keterangan</label>
                                    <textarea value={form.keterangan} onChange={e => setForm({ ...form, keterangan: e.target.value })} rows={3} />
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Batal</button>
                                <button type="submit" className="btn btn-primary">{editItem ? 'Simpan' : 'Tambah'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}

export default KasPengeluaranPage
