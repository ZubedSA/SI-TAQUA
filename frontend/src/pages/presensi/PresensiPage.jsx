import { useState, useEffect } from 'react'
import { Calendar, Check, X, Clock, ChevronLeft, ChevronRight, RefreshCw, Save } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import './Presensi.css'

const PresensiPage = () => {
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
    const [santriList, setSantriList] = useState([])
    const [presensi, setPresensi] = useState({})
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [success, setSuccess] = useState('')
    const [error, setError] = useState('')

    useEffect(() => {
        fetchSantri()
    }, [])

    useEffect(() => {
        if (santriList.length > 0) {
            fetchPresensi()
        }
    }, [selectedDate, santriList])

    const fetchSantri = async () => {
        try {
            const { data, error } = await supabase
                .from('santri')
                .select('id, nis, nama, kelas:kelas_id(nama)')
                .eq('status', 'Aktif')
                .order('nama')

            if (error) throw error

            setSantriList(data.map(s => ({
                ...s,
                kelas: s.kelas?.nama || '-'
            })))
        } catch (err) {
            console.error('Error:', err.message)
            setError(err.message)
        }
    }

    const fetchPresensi = async () => {
        setLoading(true)
        try {
            const { data, error } = await supabase
                .from('presensi')
                .select('santri_id, status')
                .eq('tanggal', selectedDate)

            if (error) throw error

            const presensiMap = {}
            // Initialize with hadir for all santri
            santriList.forEach(s => {
                presensiMap[s.id] = 'hadir'
            })
            // Override with actual data
            data?.forEach(p => {
                presensiMap[p.santri_id] = p.status
            })
            setPresensi(presensiMap)
        } catch (err) {
            console.error('Error:', err.message)
        } finally {
            setLoading(false)
        }
    }

    const handleStatusChange = (santriId, status) => {
        setPresensi(prev => ({
            ...prev,
            [santriId]: status
        }))
    }

    const handleSave = async () => {
        setSaving(true)
        setError('')
        setSuccess('')
        try {
            // Delete existing presensi for the date
            await supabase.from('presensi').delete().eq('tanggal', selectedDate)

            // Insert new presensi
            const presensiData = Object.entries(presensi).map(([santriId, status]) => ({
                santri_id: santriId,
                tanggal: selectedDate,
                status
            }))

            const { error } = await supabase.from('presensi').insert(presensiData)
            if (error) throw error

            setSuccess('Presensi berhasil disimpan!')
            setTimeout(() => setSuccess(''), 3000)
        } catch (err) {
            console.error('Error:', err.message)
            setError('Gagal menyimpan: ' + err.message)
        } finally {
            setSaving(false)
        }
    }

    const getStatusIcon = (status) => {
        switch (status) {
            case 'hadir': return <Check size={16} />
            case 'izin': return <Clock size={16} />
            case 'sakit': return <Clock size={16} />
            case 'alpha': return <X size={16} />
            default: return null
        }
    }

    const summary = {
        hadir: Object.values(presensi).filter(s => s === 'hadir').length,
        izin: Object.values(presensi).filter(s => s === 'izin').length,
        sakit: Object.values(presensi).filter(s => s === 'sakit').length,
        alpha: Object.values(presensi).filter(s => s === 'alpha').length
    }

    return (
        <div className="presensi-page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Presensi Harian</h1>
                    <p className="page-subtitle">Catat kehadiran santri setiap hari</p>
                </div>
            </div>

            {error && <div className="alert alert-error mb-3">{error}</div>}
            {success && <div className="alert alert-success mb-3">{success}</div>}

            {/* Date Selector */}
            <div className="date-selector">
                <button className="btn btn-secondary btn-sm" onClick={() => {
                    const d = new Date(selectedDate)
                    d.setDate(d.getDate() - 1)
                    setSelectedDate(d.toISOString().split('T')[0])
                }}>
                    <ChevronLeft size={18} />
                </button>
                <div className="date-input-wrapper">
                    <Calendar size={18} />
                    <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="date-input" />
                </div>
                <button className="btn btn-secondary btn-sm" onClick={() => {
                    const d = new Date(selectedDate)
                    d.setDate(d.getDate() + 1)
                    setSelectedDate(d.toISOString().split('T')[0])
                }}>
                    <ChevronRight size={18} />
                </button>
            </div>

            {/* Summary */}
            <div className="presensi-summary">
                <div className="summary-item hadir"><span className="summary-count">{summary.hadir}</span><span className="summary-label">Hadir</span></div>
                <div className="summary-item izin"><span className="summary-count">{summary.izin}</span><span className="summary-label">Izin</span></div>
                <div className="summary-item sakit"><span className="summary-count">{summary.sakit}</span><span className="summary-label">Sakit</span></div>
                <div className="summary-item alpha"><span className="summary-count">{summary.alpha}</span><span className="summary-label">Alpha</span></div>
            </div>

            {/* Presensi Table */}
            <div className="table-container">
                <div className="table-header">
                    <h3 className="table-title">Daftar Santri ({santriList.length})</h3>
                    <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                        {saving ? <><RefreshCw size={18} className="spin" /> Menyimpan...</> : <><Save size={18} /> Simpan Presensi</>}
                    </button>
                </div>

                <div className="table-wrapper">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>No</th>
                                <th>NIS</th>
                                <th>Nama</th>
                                <th>Kelas</th>
                                <th>Status Kehadiran</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="5" className="text-center"><RefreshCw size={20} className="spin" /> Loading...</td></tr>
                            ) : santriList.length === 0 ? (
                                <tr><td colSpan="5" className="text-center">Tidak ada data santri</td></tr>
                            ) : (
                                santriList.map((santri, index) => (
                                    <tr key={santri.id}>
                                        <td>{index + 1}</td>
                                        <td>{santri.nis}</td>
                                        <td className="name-cell">{santri.nama}</td>
                                        <td>{santri.kelas}</td>
                                        <td>
                                            <div className="status-buttons">
                                                {['hadir', 'izin', 'sakit', 'alpha'].map((status) => (
                                                    <button
                                                        key={status}
                                                        className={`status-btn ${status} ${presensi[santri.id] === status ? 'active' : ''}`}
                                                        onClick={() => handleStatusChange(santri.id, status)}
                                                    >
                                                        {getStatusIcon(status)}
                                                        <span>{status.charAt(0).toUpperCase() + status.slice(1)}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}

export default PresensiPage
