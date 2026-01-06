import {
    LayoutDashboard,
    GraduationCap,
    Wallet,
    Users,
    UserCheck,
    HeartHandshake,
    ShieldCheck
} from 'lucide-react'

/**
 * SOURCE OF TRUTH FOR ROLE CONFIGURATION
 * Defines dashboards, labels, and capabilities for each role.
 */
export const ROLE_CONFIG = {
    admin: {
        id: 'admin',
        label: 'Administrator',
        dashboard: '/admin-dashboard', // Or whatever the admin dashboard route is
        icon: ShieldCheck,
        description: 'Akses penuh ke seluruh sistem',
        color: 'bg-red-500'
    },
    guru: {
        id: 'guru',
        label: 'Guru & Akademik',
        dashboard: '/akademik-dashboard',
        icon: GraduationCap,
        description: 'Manajemen nilai dan akademik santri',
        color: 'bg-blue-500'
    },
    bendahara: {
        id: 'bendahara',
        label: 'Bendahara',
        dashboard: '/bendahara-dashboard',
        icon: Wallet,
        description: 'Manajemen keuangan dan pembayaran',
        color: 'bg-emerald-500'
    },
    musyrif: {
        id: 'musyrif',
        label: 'Musyrif Halaqoh',
        dashboard: '/musyrif-dashboard', // Need to confirm this route
        icon: Users,
        description: 'Monitoring halaqoh dan hafalan',
        color: 'bg-violet-500'
    },
    wali: {
        id: 'wali',
        label: 'Wali Santri',
        dashboard: '/wali-santri',
        icon: UserCheck,
        description: 'Pantau perkembangan santri',
        color: 'bg-orange-500'
    },
    ota: {
        id: 'ota',
        label: 'Orang Tua Asuh',
        dashboard: '/ota-dashboard', // Need to confirm this route
        icon: HeartHandshake,
        description: 'Donasi dan laporan perkembangan',
        color: 'bg-pink-500'
    },
    pengurus: {
        id: 'pengurus',
        label: 'Pengurus',
        dashboard: '/pengurus-dashboard',
        icon: Users,
        description: 'Manajemen kepengurusan harian',
        color: 'bg-indigo-500'
    }
}

export const getRoleConfig = (roleId) => ROLE_CONFIG[roleId] || null

export const DEFAULT_REDIRECT = '/'
