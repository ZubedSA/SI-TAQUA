import React, { useState, useEffect, useMemo } from 'react';
import { 
    Shield, 
    Check, 
    X, 
    ShieldAlert, 
    Lock, 
    UserCog, 
    Database, 
    School, 
    Wallet, 
    UserCircle,
    Save,
    RotateCcw,
    Search,
    Filter,
    Users,
    Sparkles,
    AlertCircle,
    CheckCircle2,
    BookOpen,
    Circle,
    HeartHandshake,
    ShieldCheck
} from 'lucide-react';
import { usePermissions } from '../../hooks/usePermissions';
import PageHeader from '../../components/layout/PageHeader';
import { Card } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { supabase } from '../../lib/supabase';
import { 
    ROLES, 
    MODULE_GROUPS, 
    getRolePermissions, 
    saveRolePermissions, 
    resetRolePermissions 
} from '../../utils/permissionStorage';

const getRoleIcon = (roleId) => {
    switch (roleId) {
        case 'admin': return <Shield size={18} />;
        case 'admin_akademik': return <Database size={18} />;
        case 'guru': return <School size={18} />;
        case 'musyrif': return <BookOpen size={18} />;
        case 'bendahara': return <Wallet size={18} />;
        case 'pengasuh': return <UserCog size={18} />;
        case 'pengurus': return <ShieldCheck size={18} />;
        case 'ota': return <HeartHandshake size={18} />;
        case 'wali': return <UserCircle size={18} />;
        default: return <UserCircle size={18} />;
    }
};

const getRoleBadgeClasses = (color) => {
    const map = {
        blue: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
        indigo: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' },
        emerald: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
        green: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
        amber: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
        violet: { bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200' },
        pink: { bg: 'bg-pink-50', text: 'text-pink-700', border: 'border-pink-200' },
        cyan: { bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-200' },
        gray: { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200' },
    };
    return map[color] || map.blue;
};

const RolesPage = () => {
    const { isAdmin } = usePermissions();
    const [permissions, setPermissions] = useState(getRolePermissions());
    const [initialPermissions, setInitialPermissions] = useState(getRolePermissions());
    const [userCounts, setUserCounts] = useState({});
    const [loadingUsers, setLoadingUsers] = useState(false);
    const [saving, setSaving] = useState(false);
    const [notification, setNotification] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedRoleFilter, setSelectedRoleFilter] = useState('all');
    const [selectedGroupFilter, setSelectedGroupFilter] = useState('all');
    const [showResetConfirm, setShowResetConfirm] = useState(false);

    // Fetch user counts per role
    useEffect(() => {
        const fetchUserCounts = async () => {
            setLoadingUsers(true);
            try {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('id, role, roles');

                if (!error && data) {
                    const counts = {};
                    ROLES.forEach(r => { counts[r.id] = 0; });
                    
                    data.forEach(user => {
                        const roles = user.roles || (user.role ? [user.role] : []);
                        roles.forEach(r => {
                            if (counts[r] !== undefined) {
                                counts[r] = (counts[r] || 0) + 1;
                            }
                        });
                    });
                    setUserCounts(counts);
                }
            } catch (err) {
                console.warn('Failed to load user counts for roles:', err);
            } finally {
                setLoadingUsers(false);
            }
        };

        fetchUserCounts();
    }, []);

    // Check if there are unsaved changes
    const isDirty = useMemo(() => {
        return JSON.stringify(permissions) !== JSON.stringify(initialPermissions);
    }, [permissions, initialPermissions]);

    // Handle single permission toggle
    const handleTogglePermission = (moduleId, roleId, isLocked) => {
        if (isLocked) {
            setNotification({
                type: 'warning',
                message: `Modul ini terkunci dan wajib aktif untuk Super Admin untuk mencegah lockout sistem.`
            });
            setTimeout(() => setNotification(null), 3000);
            return;
        }

        setPermissions(prev => {
            const currentRoles = prev[moduleId] || [];
            const hasRole = currentRoles.includes(roleId);
            const updatedRoles = hasRole 
                ? currentRoles.filter(r => r !== roleId)
                : [...currentRoles, roleId];

            return {
                ...prev,
                [moduleId]: updatedRoles
            };
        });
    };

    // Save changes to storage
    const handleSave = () => {
        setSaving(true);
        const success = saveRolePermissions(permissions);
        setTimeout(() => {
            setSaving(false);
            if (success) {
                setInitialPermissions({ ...permissions });
                setNotification({
                    type: 'success',
                    message: 'Konfigurasi hak akses berhasil disimpan dan langsung diterapkan ke seluruh sistem!'
                });
            } else {
                setNotification({
                    type: 'error',
                    message: 'Gagal menyimpan konfigurasi hak akses.'
                });
            }
            setTimeout(() => setNotification(null), 4000);
        }, 300);
    };

    // Reset to factory defaults
    const handleReset = () => {
        const defaults = resetRolePermissions();
        setPermissions(defaults);
        setInitialPermissions(defaults);
        setShowResetConfirm(false);
        setNotification({
            type: 'success',
            message: 'Hak akses berhasil dikembalikan ke standar rekomendasi pabrikan!'
        });
        setTimeout(() => setNotification(null), 4000);
    };

    // Filter modules based on search and group
    const filteredGroups = useMemo(() => {
        return MODULE_GROUPS.map(group => {
            if (selectedGroupFilter !== 'all' && group.id !== selectedGroupFilter) {
                return null;
            }

            const matchedModules = group.modules.filter(mod => {
                if (!searchQuery.trim()) return true;
                const q = searchQuery.toLowerCase();
                return mod.label.toLowerCase().includes(q) || mod.id.toLowerCase().includes(q);
            });

            if (matchedModules.length === 0) return null;

            return {
                ...group,
                modules: matchedModules
            };
        }).filter(Boolean);
    }, [searchQuery, selectedGroupFilter]);

    // Visible roles in matrix
    const visibleRoles = useMemo(() => {
        if (selectedRoleFilter === 'all') return ROLES;
        return ROLES.filter(r => r.id === selectedRoleFilter);
    }, [selectedRoleFilter]);

    if (!isAdmin()) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center p-8 bg-white rounded-2xl shadow-xl border border-red-100 max-w-lg">
                    <ShieldAlert size={56} className="text-red-500 mx-auto mb-4 animate-bounce" />
                    <h2 className="text-2xl font-black text-gray-900 mb-2">Akses Ditolak</h2>
                    <p className="text-sm text-gray-600">Hanya Administrator yang memiliki wewenang untuk mengelola matriks peran dan izin sistem.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 sm:space-y-8 animate-fade-in pb-16">
            {/* Notification Banner */}
            {notification && (
                <div className={`p-4 rounded-xl text-sm font-medium flex items-center gap-3 transition-all shadow-md ${
                    notification.type === 'success' 
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                        : notification.type === 'warning'
                        ? 'bg-amber-50 text-amber-800 border border-amber-200'
                        : 'bg-red-50 text-red-800 border border-red-200'
                }`}>
                    {notification.type === 'success' ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                    ) : (
                        <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    )}
                    <span className="flex-1">{notification.message}</span>
                    <button 
                        onClick={() => setNotification(null)}
                        className="text-gray-400 hover:text-gray-600 p-1"
                    >
                        <X size={16} />
                    </button>
                </div>
            )}

            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight flex items-center gap-2.5">
                        <Lock className="text-[#0A2619] w-7 h-7" />
                        <span>Roles & Access Control</span>
                    </h1>
                    <p className="text-xs sm:text-sm text-gray-500 mt-1">
                        Kelola matriks hak akses modul dan otorisasi fitur untuk setiap peran pengguna di aplikasi
                    </p>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap items-center gap-2.5">
                    <button
                        onClick={() => setShowResetConfirm(true)}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-white text-gray-700 border border-gray-200 rounded-xl text-xs sm:text-sm font-medium hover:bg-gray-50 hover:text-gray-900 transition-all shadow-xs"
                    >
                        <RotateCcw size={16} className="text-gray-500" />
                        <span>Reset ke Standar</span>
                    </button>

                    <button
                        onClick={handleSave}
                        disabled={saving || !isDirty}
                        className={`inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all shadow-sm ${
                            isDirty 
                                ? 'bg-[#0A2619] text-[#BCF32F] hover:bg-[#143d2a] hover:shadow-md cursor-pointer' 
                                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        }`}
                    >
                        <Save size={16} />
                        <span>{saving ? 'Menyimpan...' : 'Simpan Perubahan'}</span>
                    </button>
                </div>
            </div>

            {/* Unsaved Changes Banner */}
            {isDirty && (
                <div className="bg-amber-500/10 border border-amber-300/60 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-amber-900">
                    <div className="flex items-center gap-2.5">
                        <Sparkles className="w-5 h-5 text-amber-600 shrink-0 animate-spin" style={{ animationDuration: '3s' }} />
                        <span className="text-xs sm:text-sm font-semibold">
                            Ada perubahan izin akses yang belum disimpan. Klik tombol <strong>Simpan Perubahan</strong> untuk menerapkannya secara langsung.
                        </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        <button
                            onClick={() => setPermissions(initialPermissions)}
                            className="px-3 py-1.5 text-xs font-semibold text-gray-600 hover:text-gray-900 bg-white border border-gray-200 rounded-lg shadow-2xs"
                        >
                            Batalkan
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="px-4 py-1.5 text-xs font-bold text-[#0A2619] bg-[#BCF32F] hover:bg-[#a6db24] rounded-lg shadow-xs transition-all"
                        >
                            Simpan Sekarang
                        </button>
                    </div>
                </div>
            )}

            {/* Roles Summary Cards */}
            <div>
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">Peran Pengguna ({ROLES.length})</h3>
                    {selectedRoleFilter !== 'all' && (
                        <button
                            onClick={() => setSelectedRoleFilter('all')}
                            className="text-xs font-bold text-emerald-700 hover:underline"
                        >
                            Tampilkan Semua Peran
                        </button>
                    )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-9 gap-2.5 sm:gap-3">
                    {ROLES.map(role => {
                        const isSelected = selectedRoleFilter === role.id;
                        const badgeStyle = getRoleBadgeClasses(role.color);
                        const count = userCounts[role.id] || 0;

                        return (
                            <div
                                key={role.id}
                                onClick={() => setSelectedRoleFilter(isSelected ? 'all' : role.id)}
                                className={`p-3 rounded-2xl border transition-all cursor-pointer select-none text-left flex flex-col justify-between ${
                                    isSelected 
                                        ? 'bg-[#0A2619] text-white border-[#0A2619] shadow-md scale-102' 
                                        : 'bg-white hover:bg-gray-50/80 border-gray-200/90 shadow-xs'
                                }`}
                                title={role.desc}
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <div className={`p-2 rounded-xl ${
                                        isSelected 
                                            ? 'bg-white/10 text-[#BCF32F]' 
                                            : `${badgeStyle.bg} ${badgeStyle.text}`
                                    }`}>
                                        {getRoleIcon(role.id)}
                                    </div>
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                        isSelected 
                                            ? 'bg-[#BCF32F] text-[#0A2619]' 
                                            : 'bg-gray-100 text-gray-700'
                                    }`}>
                                        {count} User
                                    </span>
                                </div>
                                <div>
                                    <h4 className={`text-xs font-bold truncate ${isSelected ? 'text-white' : 'text-gray-900'}`}>{role.label}</h4>
                                    <p className={`text-[9px] font-mono uppercase tracking-wider ${isSelected ? 'text-gray-300' : 'text-gray-400'}`}>{role.id}</p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Matrix Section */}
            <Card variant="premium" className="overflow-hidden border border-gray-200/90 shadow-sm">
                {/* Search & Filter Toolbar */}
                <div className="p-4 sm:p-5 border-b border-gray-100 bg-gray-50/60 flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input
                            type="text"
                            placeholder="Cari modul atau fitur..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-[#0A2619]/20 focus:border-[#0A2619] outline-none transition-all"
                        />
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider hidden sm:inline">Kategori:</span>
                        <div className="flex items-center gap-1 overflow-x-auto max-w-full pb-1 sm:pb-0">
                            <button
                                onClick={() => setSelectedGroupFilter('all')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                    selectedGroupFilter === 'all'
                                        ? 'bg-[#0A2619] text-[#BCF32F]'
                                        : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                                }`}
                            >
                                Semua
                            </button>
                            {MODULE_GROUPS.map(group => (
                                <button
                                    key={group.id}
                                    onClick={() => setSelectedGroupFilter(group.id)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                                        selectedGroupFilter === group.id
                                            ? 'bg-[#0A2619] text-[#BCF32F]'
                                            : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                                    }`}
                                >
                                    {group.label.split(' ')[0]}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Matrix Table */}
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-200">
                                <th className="px-5 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-20 min-w-[240px] shadow-[1px_0_0_0_#e5e7eb]">
                                    Modul / Fitur Aplikasi
                                </th>
                                {visibleRoles.map(role => {
                                    const badgeStyle = getRoleBadgeClasses(role.color);
                                    return (
                                        <th key={role.id} className="px-3 py-3.5 text-center min-w-[110px]">
                                            <div className="flex flex-col items-center gap-1">
                                                <div className={`p-1.5 rounded-lg ${badgeStyle.bg} ${badgeStyle.text}`}>
                                                    {getRoleIcon(role.id)}
                                                </div>
                                                <span className="text-[11px] font-black uppercase text-gray-800 tracking-tight">{role.label}</span>
                                                <span className="text-[9px] text-gray-400 font-mono">({role.id})</span>
                                            </div>
                                        </th>
                                    );
                                })}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredGroups.length === 0 ? (
                                <tr>
                                    <td colSpan={visibleRoles.length + 1} className="px-6 py-12 text-center text-gray-400 text-sm">
                                        Tidak ada modul yang sesuai dengan pencarian "{searchQuery}".
                                    </td>
                                </tr>
                            ) : (
                                filteredGroups.map(group => (
                                    <React.Fragment key={group.id}>
                                        {/* Group Header */}
                                        <tr className="bg-gray-100/70">
                                            <td 
                                                colSpan={visibleRoles.length + 1} 
                                                className="px-5 py-2.5 text-xs font-black text-[#0A2619] uppercase tracking-widest bg-gray-100/90 sticky left-0 z-10"
                                            >
                                                {group.label}
                                            </td>
                                        </tr>

                                        {/* Module Rows */}
                                        {group.modules.map((module, mIdx) => {
                                            const allowedRoles = permissions[module.id] || [];

                                            return (
                                                <tr key={module.id} className="hover:bg-gray-50/80 transition-colors">
                                                    <td className="px-5 py-3.5 text-xs sm:text-sm font-semibold text-gray-800 sticky left-0 bg-white hover:bg-gray-50/80 z-10 shadow-[1px_0_0_0_#f3f4f6]">
                                                        <div className="flex items-center justify-between pr-2">
                                                            <span>{module.label}</span>
                                                            <span className="text-[9px] font-mono text-gray-400 hidden sm:inline">#{module.id}</span>
                                                        </div>
                                                    </td>

                                                    {visibleRoles.map(role => {
                                                        const isAllowed = allowedRoles.includes(role.id);
                                                        const isLocked = role.id === 'admin' && module.lockedForAdmin;

                                                        return (
                                                            <td key={role.id} className="px-3 py-2 text-center">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleTogglePermission(module.id, role.id, isLocked)}
                                                                    disabled={isLocked}
                                                                    className={`inline-flex items-center justify-center gap-1 w-full max-w-[84px] py-1.5 px-2 rounded-xl text-xs font-bold transition-all duration-150 active:scale-95 touch-manipulation ${
                                                                        isLocked
                                                                            ? 'bg-blue-50 text-blue-700 border border-blue-200 cursor-not-allowed opacity-90'
                                                                            : isAllowed
                                                                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 hover:border-emerald-300 shadow-2xs'
                                                                            : 'bg-gray-50 text-gray-400 border border-gray-200 hover:bg-gray-100 text-gray-400'
                                                                    }`}
                                                                    title={isLocked ? 'Wajib untuk Super Admin' : isAllowed ? 'Klik untuk cabut izin' : 'Klik untuk beri izin'}
                                                                >
                                                                    {isLocked ? (
                                                                        <>
                                                                            <Lock size={12} className="text-blue-600" />
                                                                            <span className="text-[10px]">Kunci</span>
                                                                        </>
                                                                    ) : isAllowed ? (
                                                                        <>
                                                                            <Check size={14} strokeWidth={3} className="text-emerald-600" />
                                                                            <span className="text-[10px]">Aktif</span>
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            <X size={14} strokeWidth={2} />
                                                                            <span className="text-[10px]">Tutup</span>
                                                                        </>
                                                                    )}
                                                                </button>
                                                            </td>
                                                        );
                                                    })}
                                                </tr>
                                            );
                                        })}
                                    </React.Fragment>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* Info Security Footer */}
            <div className="bg-[#0A2619] text-white rounded-2xl p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center gap-5 shadow-lg border border-[#143d2a]">
                <div className="p-3.5 bg-[#BCF32F]/10 rounded-2xl text-[#BCF32F] shrink-0">
                    <ShieldCheck size={36} />
                </div>
                <div className="flex-1">
                    <h4 className="font-bold text-base sm:text-lg text-white">Sistem Otorisasi Multi-Role & Realtime Synchronization</h4>
                    <p className="text-xs sm:text-sm text-gray-300 mt-1 leading-relaxed">
                        Pengaturan izin di atas langsung disinkronkan ke seluruh modul aplikasi SI-TAQUA melalui custom hook 
                        <code className="text-[#BCF32F] bg-white/10 px-1.5 py-0.5 rounded mx-1 font-mono text-xs">usePermissions</code>.
                        Pengguna yang sedang aktif akan otomatis mendapatkan hak akses sesuai peran aktif yang mereka gunakan.
                    </p>
                </div>
            </div>

            {/* Confirmation Modal: Reset ke Default */}
            {showResetConfirm && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 animate-in fade-in zoom-in-95">
                        <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mb-4">
                            <RotateCcw size={24} />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 mb-2">Reset Hak Akses ke Standar?</h3>
                        <p className="text-xs sm:text-sm text-gray-500 mb-6">
                            Semua konfigurasi izin modul yang telah diubah akan dikembalikan ke pengaturan rekomendasi awal aplikasi. Anda yakin ingin melanjutkan?
                        </p>
                        <div className="flex items-center justify-end gap-3">
                            <button
                                onClick={() => setShowResetConfirm(false)}
                                className="px-4 py-2 text-xs sm:text-sm font-semibold text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-xl transition-all"
                            >
                                Batal
                            </button>
                            <button
                                onClick={handleReset}
                                className="px-4 py-2 text-xs sm:text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-all shadow-sm"
                            >
                                Ya, Reset Sekarang
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RolesPage;
