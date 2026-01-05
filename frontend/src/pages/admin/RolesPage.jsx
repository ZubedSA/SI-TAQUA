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
        <div className="space-y-6">
            <PageHeader
                title="Roles & Manajemen Akses"
                description="Konfigurasi hak akses modul berdasarkan peran pengguna."
                icon={Lock}
            />

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4">
                {roles.map(role => (
                    <Card key={role.id} className="border-t-4 border-t-transparent hover:-translate-y-1 transition-transform" style={{ borderTopColor: 'transparent' }}>
                        <div className={`h-1.5 w-full rounded-t-xl ${role.color} absolute top-0 left-0 right-0`}></div>
                        <div className="p-4 pt-6">
                            <div className="flex items-center gap-2 mb-1">
                                {role.icon}
                                <h3 className="text-sm font-bold text-gray-900">{role.name}</h3>
                            </div>
                            <span className="text-xs text-gray-500 capitalize px-2 py-0.5 bg-gray-100 rounded-md border border-gray-200 inline-block mt-2">
                                {role.id}
                            </span>
                        </div>
                    </Card>
                ))}
            </div>

            <Card className="overflow-hidden border-gray-200">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-600 font-medium border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-4 font-semibold text-gray-800 sticky left-0 bg-gray-50 z-10">Modul / Fitur</th>
                                {roles.map(role => (
                                    <th key={role.id} className="px-4 py-4 text-center min-w-[100px]">
                                        <div className="flex flex-col items-center gap-1">
                                            {role.icon}
                                            <span className="text-xs mt-1">{role.name.split(' ')[0]}</span>
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {modules.map(group => (
                                <React.Fragment key={group.group}>
                                    <tr className="bg-blue-50/50">
                                        <td colSpan={roles.length + 1} className="px-6 py-3 text-xs font-bold text-blue-700 uppercase tracking-wider">
                                            {group.group}
                                        </td>
                                    </tr>
                                    {group.items.map(module => (
                                        <tr key={module.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4 font-medium text-gray-700 sticky left-0 bg-white z-10 border-r border-gray-100 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.05)]">
                                                {module.label}
                                            </td>
                                            {roles.map(role => (
                                                <td key={role.id} className="px-4 py-4 text-center">
                                                    {module.perms.includes(role.id) ? (
                                                        <div className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-100 text-green-600">
                                                            <Check size={14} strokeWidth={3} />
                                                        </div>
                                                    ) : (
                                                        <div className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 text-gray-300">
                                                            <X size={14} />
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

            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-start gap-4">
                <Shield className="text-blue-600 shrink-0 mt-0.5" size={24} />
                <div>
                    <h4 className="font-bold text-blue-800 text-sm">Informasi RBAC</h4>
                    <p className="text-blue-700 text-sm mt-1 leading-relaxed">
                        Sistem menggunakan <strong>Role-Based Access Control</strong>. Matriks di atas adalah konfigurasi hak akses modul utama.
                        Untuk tingkat keamanan lebih lanjut, sistem juga menerapkan <strong>RLS (Row Level Security)</strong> di tingkat database yang memastikan pengguna hanya dapat melihat data yang relevan bagi mereka.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default RolesPage;
