/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: {
                    50: '#F2FCE8',
                    100: '#E1F8C9',
                    200: '#BCF32F',
                    300: '#9BD814',
                    400: '#74A708',
                    500: '#0A2619',
                    600: '#0A2619',
                    700: '#0A2619',
                    800: '#061A10',
                    900: '#030D08',
                },
                emerald: {
                    50: '#F2FCE8',
                    100: '#E1F8C9',
                    200: '#BCF32F',
                    300: '#9BD814',
                    400: '#74A708',
                    500: '#0A2619',
                    600: '#0A2619',
                    700: '#0A2619',
                    800: '#061A10',
                    900: '#030D08',
                },
                green: {
                    50: '#F2FCE8',
                    100: '#E1F8C9',
                    200: '#BCF32F',
                    300: '#9BD814',
                    400: '#74A708',
                    500: '#0A2619',
                    600: '#0A2619',
                    700: '#0A2619',
                    800: '#061A10',
                    900: '#030D08',
                },
                teal: {
                    50: '#F2FCE8',
                    100: '#E1F8C9',
                    200: '#BCF32F',
                    300: '#9BD814',
                    400: '#74A708',
                    500: '#0A2619',
                    600: '#0A2619',
                    700: '#0A2619',
                    800: '#061A10',
                    900: '#030D08',
                },
                gray: {
                    50: 'var(--gray-50)',
                    100: 'var(--gray-100)',
                    200: 'var(--gray-200)',
                    300: 'var(--gray-300)',
                    400: 'var(--gray-400)',
                    500: 'var(--gray-500)',
                    600: 'var(--gray-600)',
                    700: 'var(--gray-700)',
                    800: 'var(--gray-800)',
                    900: 'var(--gray-900)',
                },
                danger: {
                    bg: 'var(--danger-bg)',
                    text: 'var(--danger-text)',
                },
                warning: {
                    bg: 'var(--warning-bg)',
                    text: 'var(--warning-text)',
                },
                success: {
                    bg: 'var(--success-bg)',
                    text: 'var(--success-text)',
                },
                info: {
                    bg: 'var(--info-bg)',
                    text: 'var(--info-text)',
                },
            },
            fontFamily: {
                sans: ['var(--font-sans)', 'sans-serif'],
                mono: ['var(--font-mono)', 'monospace'],
            },
            borderRadius: {
                DEFAULT: 'var(--border-radius)',
                sm: 'var(--border-radius-sm)',
            },
            boxShadow: {
                sm: 'var(--shadow-sm)',
                md: 'var(--shadow-md)',
                lg: 'var(--shadow-lg)',
                card: 'var(--shadow-card)',
            },
        },
    },
    corePlugins: {
        preflight: true, // Re-enable preflight for better consistency
    },
    plugins: [],
}
