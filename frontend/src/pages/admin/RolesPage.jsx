import React from 'react';
import { Shield, Check, X, ShieldAlert, Lock, UserCog, Database, School, Wallet, UserCircle } from 'lucide-react';
import { usePermissions } from '../../hooks/usePermissions';
import './AdminPages.css';

const RolesPage = () => {
    const { isAdmin } = usePermissions();

    if (!isAdmin()) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center p-8 bg-white rounded-xl shadow-lg border border-red-100">
                    <ShieldAlert size={64} className="text-red-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">Akses Ditolak</h2>
                    <p className="text-gray-600">Anda tidak memiliki izin untuk mengakses halaman pengaturan role ini.</p>
                </div>
            </div>
        );
    }

    const roles = [
        { id: 'admin', name: 'Administrator', color: '#1d4ed8', icon: <Shield size={20} /> },
        { id: 'guru', name: 'Guru / Akademik', color: '#059669', icon: <School size={20} /> },
        { id: 'bendahara', name: 'Bendahara', color: '#d97706', icon: <Wallet size={20} /> },
        { id: 'pengasuh', name: 'Pengasuh', color: '#7c3aed', icon: <UserCog size={20} /> },
        { id: 'pengurus', name: 'Pengurus', color: '#db2777', icon: <UserCircle size={20} /> },
        { id: 'ota', name: 'Orang Tua Asuh', color: '#0891b2', icon: <UserCircle size={20} /> },
        { id: 'wali', name: 'Wali Santri', color: '#4b5563', icon: <UserCircle size={20} /> }
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
        <div className="admin-page">
            <div className="admin-header">
                <div>
                    <h1>
                        <Lock className="text-blue-600" /> Roles & Manajemen Akses
                    </h1>
                    <p>Konfigurasi hak akses modul berdasarkan peran pengguna.</p>
                </div>
            </div>

            <div className="role-grid">
                {roles.map(role => (
                    <div key={role.id} className="role-card" style={{ borderTopColor: role.color }}>
                        <div className="role-card-header">
                            {role.icon}
                            <h3>{role.name}</h3>
                        </div>
                        <span className="role-id">{role.id}</span>
                    </div>
                ))}
            </div>

            <div className="table-container">
                <div className="table-wrapper">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Modul / Fitur</th>
                                {roles.map(role => (
                                    <th key={role.id} className="text-center">
                                        {role.name}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {modules.map(group => (
                                <React.Fragment key={group.group}>
                                    <tr className="group-header">
                                        <td colSpan={roles.length + 1}>
                                            {group.group}
                                        </td>
                                    </tr>
                                    {group.items.map(module => (
                                        <tr key={module.id}>
                                            <td>
                                                <span className="font-medium">{module.label}</span>
                                            </td>
                                            {roles.map(role => (
                                                <td key={role.id} className="text-center">
                                                    {module.perms.includes(role.id) ? (
                                                        <div className="perm-check">
                                                            <Check size={14} strokeWidth={3} />
                                                        </div>
                                                    ) : (
                                                        <div className="perm-x">
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
            </div>

            <div className="admin-footer-info">
                <Shield className="icon" size={24} />
                <div>
                    <h4>Informasi RBAC</h4>
                    <p>
                        Sistem menggunakan **Role-Based Access Control**. Matriks di atas adalah konfigurasi hak akses modul utama.
                        Untuk tingkat keamanan lebih lanjut, sistem juga menerapkan **RLS (Row Level Security)** di tingkat database yang memastikan pengguna hanya dapat melihat data yang relevan bagi mereka.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default RolesPage;
