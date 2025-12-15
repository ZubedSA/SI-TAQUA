# Sistem Akademik PTQ Al-Usymuni Batuan

Sistem informasi akademik untuk Pondok Pesantren Tahfizh Qur'an Al-Usymuni Batuan.

## Tech Stack

- **Frontend**: React 18 + Vite
- **Backend**: Node.js + Express
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth

## Struktur Folder

```
akademik/
├── frontend/          # React application
├── backend/           # Node.js Express API
└── database/          # SQL schema
```

## Getting Started

### Prerequisites

- Node.js 18+ installed
- Supabase account (optional for demo mode)

### 1. Setup Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend akan berjalan di `http://localhost:5173`

### 2. Setup Backend

```bash
cd backend
npm install

# Copy environment file
cp .env.example .env
# Edit .env dengan kredensial Supabase Anda

npm run dev
```

Backend akan berjalan di `http://localhost:3001`

### 3. Setup Database (Opsional)

1. Buat project baru di [Supabase](https://supabase.com)
2. Jalankan SQL dari `database/schema.sql` di SQL Editor Supabase
3. Copy URL dan API Key ke file `.env`

## Demo Mode

Aplikasi dapat berjalan tanpa Supabase dalam mode demo dengan data sample.

## Fitur

- ✅ Dashboard dengan statistik
- ✅ Manajemen Data Santri (CRUD)
- ✅ Manajemen Data Guru (CRUD)
- ✅ Tracking Hafalan
- ✅ Presensi Harian
- ⏳ Manajemen Kelas (Coming soon)
- ⏳ Input Nilai (Coming soon)
- ⏳ Laporan PDF (Coming soon)

## Environment Variables

### Frontend (.env)
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Backend (.env)
```
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
PORT=3001
FRONTEND_URL=http://localhost:5173
```

## License

MIT © PTQ Al-Usymuni Batuan
