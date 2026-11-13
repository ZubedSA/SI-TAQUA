import React, { useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { X, Send, CheckCircle2, AlertCircle, Clock, MessageSquare, ExternalLink, ShieldAlert, Sparkles, Check } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { sendWhatsAppViaFonnte, templatePengingatJadwalGuru, sendWhatsApp } from '../../utils/whatsapp'
import { useToast } from '../../context/ToastContext'

const BroadcastJadwalGuruModal = ({
    isOpen,
    onClose,
    filterDate,
    dailyStaffAttendance = [],
    kelasList = [],
    halaqohList = [],
    mapelList = []
}) => {
    const showToast = useToast()
    const [sending, setSending] = useState(false)
    const [progress, setProgress] = useState({ current: 0, total: 0 })
    const [sendStatusMap, setSendStatusMap] = useState({}) // { [guruId]: { status: 'success' | 'failed', error?: string } }
    const [previewTeacher, setPreviewTeacher] = useState(null)
    const [extraContacts, setExtraContacts] = useState({})

    // Sinkronisasi nomor WhatsApp langsung dari database saat modal dibuka
    useEffect(() => {
        if (!isOpen) return
        const loadContacts = async () => {
            try {
                const [gRes, pRes] = await Promise.all([
                    supabase.from('guru').select('id, nama, no_telp, user_id, email'),
                    supabase.from('user_profiles').select('user_id, guru_id, no_hp, email')
                ])
                const pList = pRes.data || []
                const map = {}
                ;(gRes.data || []).forEach(g => {
                    let phone = g.no_telp || ''
                    if (!phone) {
                        const prof = pList.find(p => p.guru_id === g.id || (g.user_id && p.user_id === g.user_id) || (g.email && p.email?.toLowerCase() === g.email.toLowerCase()))
                        if (prof?.no_hp) phone = prof.no_hp
                    }
                    if (phone) map[g.id] = phone
                })
                setExtraContacts(map)
            } catch (err) {
                console.error('Error fetching contacts in modal:', err)
            }
        }
        loadContacts()
    }, [isOpen])

    // Tanggal dan Nama Hari
    const dateObj = useMemo(() => new Date(filterDate || new Date()), [filterDate])
    const dayMap = ['Ahad', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']
    const dayName = dayMap[dateObj.getDay()]
    const fullDateStr = dateObj.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    })

    // Kelompokkan jadwal hari ini per guru
    const teachersList = useMemo(() => {
        if (!dailyStaffAttendance || dailyStaffAttendance.length === 0) return []

        const group = {}
        dailyStaffAttendance.forEach(item => {
            const gid = item.guru?.id || item.guru_id
            if (!gid) return

            const phone = item.guru?.no_telp || item.guru?.telepon || item.guru?.no_hp || extraContacts[gid] || ''

            if (!group[gid]) {
                group[gid] = {
                    guruId: gid,
                    namaGuru: item.guru?.nama || 'Ustadz',
                    noTelp: phone,
                    email: item.guru?.email || '',
                    jadwal: []
                }
            } else if (!group[gid].noTelp && phone) {
                group[gid].noTelp = phone
            }

            const targetName = item.tipe === 'MADROSAH'
                ? (kelasList.find(k => k.id === item.referensi_id)?.nama || 'Kelas')
                : (halaqohList.find(h => h.id === item.referensi_id)?.nama || 'Halaqoh')

            const mapelName = item.mapel?.nama || (mapelList.find(m => m.id === item.mapel_id)?.nama) || ''

            group[gid].jadwal.push({
                tipe: item.tipe,
                jam_ke: item.jam_ke,
                jam_mulai: item.jam_mulai,
                jam_selesai: item.jam_selesai,
                targetNama: targetName,
                mapelNama: mapelName
            })
        })

        // Sort jadwal per guru secara kronologis berdasarkan jam_mulai lalu jam_ke
        Object.values(group).forEach(g => {
            g.jadwal.sort((a, b) => {
                if (a.jam_mulai && b.jam_mulai) {
                    return a.jam_mulai.localeCompare(b.jam_mulai)
                }
                return Number(a.jam_ke || 0) - Number(b.jam_ke || 0)
            })
        })

        return Object.values(group).sort((a, b) => a.namaGuru.localeCompare(b.namaGuru))
    }, [dailyStaffAttendance, kelasList, halaqohList, mapelList, extraContacts])

    if (!isOpen) return null

    const handleSendAll = async () => {
        const eligible = teachersList.filter(t => t.noTelp && t.jadwal.length > 0)
        if (eligible.length === 0) {
            showToast.error('Tidak ada guru dengan nomor telepon terdaftar untuk dikirimi pesan.')
            return
        }

        setSending(true)
        setProgress({ current: 0, total: eligible.length })

        const newStatus = { ...sendStatusMap }
        let successCount = 0
        let failedCount = 0

        for (let i = 0; i < eligible.length; i++) {
            const t = eligible[i]
            setProgress({ current: i + 1, total: eligible.length })

            const msg = templatePengingatJadwalGuru({
                namaGuru: t.namaGuru,
                hari: dayName,
                tanggal: fullDateStr,
                jadwalList: t.jadwal
            })

            const res = await sendWhatsAppViaFonnte(t.noTelp, msg)
            if (res.success) {
                newStatus[t.guruId] = { status: 'success' }
                successCount++
            } else {
                newStatus[t.guruId] = { status: 'failed', error: res.error }
                failedCount++
            }
            setSendStatusMap({ ...newStatus })

            // Jeda 600ms antar pengiriman agar aman dari rate-limit
            if (i < eligible.length - 1) {
                await new Promise(r => setTimeout(r, 600))
            }
        }

        setSending(false)
        if (successCount > 0) {
            showToast.success(`Berhasil mengirim pengingat ke ${successCount} ustadz!`)
        }
        if (failedCount > 0) {
            showToast.error(`${failedCount} pengiriman gagal via gateway Fonnte.`)
        }
    }

    const handleSendSingle = async (teacher) => {
        if (!teacher.noTelp) {
            showToast.error(`Nomor telepon Ustadz ${teacher.namaGuru} belum diisi di data Guru.`)
            return
        }

        const msg = templatePengingatJadwalGuru({
            namaGuru: teacher.namaGuru,
            hari: dayName,
            tanggal: fullDateStr,
            jadwalList: teacher.jadwal
        })

        const res = await sendWhatsAppViaFonnte(teacher.noTelp, msg)
        if (res.success) {
            setSendStatusMap(prev => ({ ...prev, [teacher.guruId]: { status: 'success' } }))
            showToast.success(`Pengingat berhasil dikirim ke ${teacher.namaGuru}`)
        } else {
            setSendStatusMap(prev => ({ ...prev, [teacher.guruId]: { status: 'failed', error: res.error } }))
            showToast.error(`Gagal mengirim via Fonnte: ${res.error || 'Unknown error'}`)
        }
    }

    const handleManualWA = (teacher) => {
        const msg = templatePengingatJadwalGuru({
            namaGuru: teacher.namaGuru,
            hari: dayName,
            tanggal: fullDateStr,
            jadwalList: teacher.jadwal
        })
        sendWhatsApp(teacher.noTelp, msg)
    }

    const totalEligible = teachersList.filter(t => t.noTelp).length
    const progressPercent = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0

    return typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-6 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
            <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden border border-gray-100 animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="shrink-0 flex items-center justify-between px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-emerald-50/80 via-white to-teal-50/50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-600/20">
                            <MessageSquare size={20} />
                        </div>
                        <div>
                            <h3 className="text-base sm:text-lg font-black text-gray-900 leading-tight">
                                Broadcast WhatsApp Jadwal Guru
                            </h3>
                            <p className="text-xs text-gray-500 font-medium">
                                {dayName}, {fullDateStr} • {teachersList.length} Pengajar Terjadwal
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={sending}
                        className="w-9 h-9 flex items-center justify-center rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Automation Banner Notice */}
                <div className="shrink-0 bg-blue-50/70 border-b border-blue-100 px-6 py-3 flex items-start gap-2.5 text-xs text-blue-900">
                    <Sparkles size={16} className="text-blue-600 shrink-0 mt-0.5" />
                    <div className="leading-relaxed">
                        <b>Otomatisasi Cloud Aktif:</b> Pengingat jadwal ini juga dipicu secara otomatis oleh sistem serverless setiap hari pukul <b>06:00 WIB</b> ke WhatsApp seluruh ustadz yang memiliki jadwal mengajar hari itu.
                    </div>
                </div>

                {/* Progress Bar (saat sending) */}
                {sending && (
                    <div className="shrink-0 px-6 py-3 bg-emerald-50 border-b border-emerald-100">
                        <div className="flex items-center justify-between text-xs font-bold text-emerald-800 mb-1.5">
                            <span>Mengirim pesan WhatsApp via Fonnte...</span>
                            <span>{progress.current} / {progress.total} ({progressPercent}%)</span>
                        </div>
                        <div className="w-full h-2.5 bg-emerald-200/60 rounded-full overflow-hidden">
                            <div 
                                className="h-full bg-emerald-600 transition-all duration-300 rounded-full"
                                style={{ width: `${progressPercent}%` }}
                            />
                        </div>
                    </div>
                )}

                {/* Body List Guru */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
                    {teachersList.length === 0 ? (
                        <div className="text-center py-12 text-gray-400 text-sm">
                            Tidak ada guru yang memiliki jadwal mengajar pada tanggal ini.
                        </div>
                    ) : (
                        teachersList.map((t, idx) => {
                            const statusObj = sendStatusMap[t.guruId]
                            return (
                                <div
                                    key={t.guruId}
                                    className="p-4 rounded-2xl border border-gray-100 hover:border-emerald-200 bg-white shadow-sm transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                                >
                                    <div className="flex items-start gap-3 min-w-0">
                                        <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                                            {idx + 1}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="font-bold text-gray-900 text-sm truncate flex items-center gap-2">
                                                <span>{t.namaGuru}</span>
                                                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                                                    {t.jadwal.length} Sesi
                                                </span>
                                            </div>
                                            <div className="text-xs text-gray-500 font-mono flex items-center gap-2 mt-0.5">
                                                {t.noTelp ? (
                                                    <span className="text-emerald-700 font-bold">{t.noTelp}</span>
                                                ) : (
                                                    <span className="text-red-500 font-semibold italic flex items-center gap-1">
                                                        <ShieldAlert size={12} /> No HP belum diisi
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-[11px] text-gray-400 truncate mt-1">
                                                {t.jadwal.map(j => `Jam ${j.jam_ke} (${j.targetNama})`).join(' • ')}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Actions per Teacher */}
                                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                                        {statusObj?.status === 'success' && (
                                            <span className="inline-flex items-center gap-1 text-[11px] font-black text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                                                <CheckCircle2 size={13} /> Terkirim
                                            </span>
                                        )}
                                        {statusObj?.status === 'failed' && (
                                            <span className="inline-flex items-center gap-1 text-[11px] font-black text-red-700 bg-red-50 px-2.5 py-1 rounded-lg border border-red-200" title={statusObj.error}>
                                                <AlertCircle size={13} /> Gagal
                                            </span>
                                        )}

                                        <button
                                            type="button"
                                            onClick={() => setPreviewTeacher(t)}
                                            className="px-2.5 py-1.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 text-xs font-bold transition-colors cursor-pointer"
                                            title="Lihat teks pesan"
                                        >
                                            Preview
                                        </button>

                                        {t.noTelp && (
                                            <>
                                                <button
                                                    type="button"
                                                    disabled={sending}
                                                    onClick={() => handleSendSingle(t)}
                                                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                                                    title="Kirim via Fonnte otomatis"
                                                >
                                                    <Send size={12} /> Kirim
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleManualWA(t)}
                                                    className="p-1.5 rounded-xl border border-emerald-200 text-emerald-700 hover:bg-emerald-50 text-xs font-bold transition-colors cursor-pointer"
                                                    title="Buka WhatsApp Web Manual"
                                                >
                                                    <ExternalLink size={14} />
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            )
                        })
                    )}
                </div>

                {/* Footer Controls */}
                <div className="shrink-0 flex items-center justify-between gap-3 px-6 py-4 bg-gray-50/80 border-t border-gray-100">
                    <div className="text-xs text-gray-500 font-medium">
                        Tersedia <b>{totalEligible}</b> dari {teachersList.length} guru dengan nomor WhatsApp.
                    </div>
                    <div className="flex items-center gap-2.5">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={sending}
                            className="px-4 py-2 rounded-xl text-xs sm:text-sm font-bold text-gray-600 hover:bg-gray-200 transition-colors cursor-pointer"
                        >
                            Tutup
                        </button>
                        <button
                            type="button"
                            onClick={handleSendAll}
                            disabled={sending || totalEligible === 0}
                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-emerald-600/20 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                        >
                            <Send size={15} />
                            <span>{sending ? 'Sedang Mengirim...' : 'Kirim Semua Sekarang'}</span>
                        </button>
                    </div>
                </div>

                {/* Modal Pratinjau Pesan WA */}
                {previewTeacher && (
                    <div className="absolute inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
                        <div className="bg-white rounded-2xl w-full max-w-lg p-5 space-y-4 shadow-2xl border border-gray-100 animate-in zoom-in-95">
                            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                                <div>
                                    <h4 className="font-black text-sm text-gray-900">Pratinjau Pesan WhatsApp</h4>
                                    <p className="text-xs text-gray-500">{previewTeacher.namaGuru} ({previewTeacher.noTelp || 'No HP Belum Diisi'})</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setPreviewTeacher(null)}
                                    className="p-1 rounded-lg hover:bg-gray-100 text-gray-400"
                                >
                                    <X size={18} />
                                </button>
                            </div>
                            <div className="p-3.5 bg-emerald-50/60 border border-emerald-100 rounded-xl text-xs font-mono text-gray-800 whitespace-pre-wrap max-h-72 overflow-y-auto leading-relaxed">
                                {templatePengingatJadwalGuru({
                                    namaGuru: previewTeacher.namaGuru,
                                    hari: dayName,
                                    tanggal: fullDateStr,
                                    jadwalList: previewTeacher.jadwal
                                })}
                            </div>
                            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={() => setPreviewTeacher(null)}
                                    className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100"
                                >
                                    Tutup Pratinjau
                                </button>
                                {previewTeacher.noTelp && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            handleSendSingle(previewTeacher)
                                            setPreviewTeacher(null)
                                        }}
                                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
                                    >
                                        Kirim ke Ustadz Ini
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>,
        document.body
    )
}

export default BroadcastJadwalGuruModal

