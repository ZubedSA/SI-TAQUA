import React from 'react';
import { Shield, Check, X, ShieldAlert, Lock, UserCog, Database, School, Wallet, UserCircle } from 'lucide-react';
import { usePermissions } from '../../hooks/usePermissions';
import PageHeader from '../../components/layout/PageHeader';
import { Card } from '../../components/ui/Card';

const RolesPage = () => {
    const { isAdmin } = usePermissions();

    if (!isAdmin()) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center p-8 bg-white rounded-xl shadow-lg border border-red-100 max-w-lg">
                    <ShieldAlert size={64} className="text-red-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">Akses Ditolak</h2>
                    <p className="text-gray-600">Anda tidak memiliki izin untuk mengakses halaman pengaturan role ini.</p>
                </div>
            </div>
        );
    }

    const roles = [
        { id: 'admin', name: 'Administrator', color: 'bg-blue-600', icon: <Shield size={20} className="text-blue-600" /> },
        { id: 'guru', name: 'Guru / Akademik', color: 'bg-emerald-600', icon: <School size={20} className="text-emerald-600" /> },
        { id: 'bendahara', name: 'Bendahara', color: 'bg-amber-600', icon: <Wallet size={20} className="text-amber-600" /> },
        { id: 'pengasuh', name: 'Pengasuh', color: 'bg-violet-600', icon: <UserCog size={20} className="text-violet-600" /> },
        { id: 'pengurus', name: 'Pengurus', color: 'bg-pink-600', icon: <UserCircle size={20} className="text-pink-600" /> },
        { id: 'ota', name: 'Orang Tua Asuh', color: 'bg-cyan-600', icon: <UserCircle size={20} className="text-cyan-600" /> },
        { id: 'wali', name: 'Wali Santri', color: 'bg-gray-600', icon: <UserCircle size={20} className="text-gray-600" /> }
    ];

    const modules = [
        {
            group: 'Sistem', items: [
                { id: 'Dashboard', label: 'Dashboard Utama', perms: ['admin', 'guru', 'bendahara', 'pengasuh', 'pengurus', 'ota', 'wali'] },
                { id: 'Users', label: 'Manajemen User', perms: ['admin'] },
                { id: 'Settings', label: 'Pengaturan Sistem', perms: ['admin'] },
                { id: 'AuditLog', label: 'Log Aktivitas', perms: ['admin'] },
            ]
        },
        {
            group: 'Kesiswaan', items: [
                { id: 'Santri', label: 'Data Santri', perms: ['admin', 'guru', 'bendahara'] },
                { id: 'Guru', label: 'Data Guru', perms: ['admin'] },
                { id: 'Wali', label: 'Data Wali Santri', perms: ['admin', 'bendahara'] },
            ]
        },
        {
            group: 'Akademik', items: [
                { id: 'Hafalan', label: 'Input & Rekap Hafalan', perms: ['admin', 'guru'] },
                { id: 'Nilai', label: 'Penilaian Akademik', perms: ['admin', 'guru'] },
                { id: 'Kelas', label: 'Manajemen Kelas', perms: ['admin'] },
                { id: 'Mapel', label: 'Mata Pelajaran', perms: ['admin'] },
            ]
        },
        {
            group: 'Keuangan', items: [
                { id: 'Keuangan', label: 'Arus Kas (Umum)', perms: ['admin', 'bendahara', 'pengasuh'] },
                { id: 'Tagihan', label: 'Tagihan & SPP', perms: ['admin', 'bendahara'] },
                { id: 'Anggaran', label: 'Rencana Anggaran', perms: ['admin', 'bendahara'] },
                { id: 'Persetujuan', label: 'Persetujuan Dana', perms: ['admin', 'pengasuh'] },
            ]
        }
    ];

    return (
        <div className="space-y-8 animate-fade-in">
            <PageHeader
                title="Roles & Access Control"
                description="Konfigurasi matriks hak akses dan otorisasi modul sistem"
                icon={Lock}
            />

            {/* Quick Stats / Role Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-6">
                {roles.map(role => (
                    <Card key={role.id} variant="premium" className="p-6 text-center group hover:translate-y-[-4px] transition-all duration-300">
                        <div className={`w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center transition-transform group-hover:scale-110 ${role.color.replace('bg-', 'bg-').replace('-600', '-50')} ${role.color.replace('bg-', 'text-')}`}>
                            {React.cloneElement(role.icon, { size: 28 })}
                        </div>
                        <h3 className="text-sm font-black text-gray-900 group-hover:text-indigo-600 transition-colors line-clamp-1">{role.name.split(' ')[0]}</h3>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1 opacity-50 group-hover:opacity-100 transition-opacity">{role.id}</p>
                    </Card>
                ))}
            </div>

            <Card variant="premium" className="overflow-hidden border-none shadow-2xl">
                <div className="p-8 border-b border-gray-50 bg-gray-50/30">
                    <h3 className="text-xl font-black text-gray-900">Matriks Izin Modul</h3>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Konfigurasi hak akses global per-peran pengguna</p>
                </div>

                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50/50">
                            <tr>
                                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-gray-400 sticky left-0 bg-gray-50/80 backdrop-blur-md z-10">Modul & Fitur Utama</th>
                                {roles.map(role => (
                                    <th key={role.id} className="px-4 py-6 text-center min-w-[120px]">
                                        <div className="flex flex-col items-center gap-2">
                                            <div className={`p-2 rounded-lg ${role.color.replace('bg-', 'bg-').replace('-600', '-50')} ${role.color.replace('bg-', 'text-')}`}>
                                                {React.cloneElement(role.icon, { size: 16 })}
                                            </div>
                                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-900">{role.name.split(' ')[0]}</span>
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {modules.map(group => (
                                <React.Fragment key={group.group}>
                                    <tr className="bg-slate-50/30">
                                        <td colSpan={roles.length + 1} className="px-8 py-3 text-[11px] font-black text-indigo-500 uppercase tracking-[0.2em] bg-indigo-50/30">
                                            {group.group}
                                        </td>
                                    </tr>
                                    {group.items.map(module => (
                                        <tr key={module.id} className="hover:bg-gray-50/80 transition-colors group">
                                            <td className="px-8 py-5 font-black text-sm text-gray-700 sticky left-0 bg-white group-hover:bg-gray-50 transition-colors z-10 border-r border-gray-50">
                                                {module.label}
                                            </td>
                                            {roles.map(role => (
                                                <td key={role.id} className="px-4 py-5 text-center">
                                                    {module.perms.includes(role.id) ? (
                                                        <div className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 shadow-sm shadow-emerald-100 group-hover:scale-110 transition-transform">
                                                            <Check size={16} strokeWidth={4} />
                                                        </div>
                                                    ) : (
                                                        <div className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-gray-50 text-gray-200">
                                                            <X size={16} strokeWidth={2} />
                                                        </div>
                                                    )}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </React.Fragment>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>

            <div className="bg-slate-900 rounded-[2.5rem] p-8 flex items-start gap-6 shadow-2xl border border-white/10 overflow-hidden relative group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/10 rounded-full -mr-32 -mt-32 blur-3xl group-hover:bg-indigo-600/20 transition-all"></div>
                <div className="p-4 bg-white/10 backdrop-blur-xl rounded-2xl">
                    <Shield className="text-indigo-400" size={32} />
                </div>
                <div className="relative z-10">
                    <h4 className="font-black text-white text-lg uppercase tracking-wider">Advanced RBAC & Data Isolation</h4>
                    <p className="text-slate-400 text-sm mt-2 leading-relaxed font-medium">
                        Sistem menggunakan arsitektur <strong className="text-white">Role-Based Access Control</strong> tingkat lanjut. 
                        Selain filter visual di atas, setiap transaksi data diamankan melalui <strong className="text-white">Supabase RLS (Row Level Security)</strong> 
                        yang menjamin isolasi data mutlak antar pengguna.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default RolesPage;
