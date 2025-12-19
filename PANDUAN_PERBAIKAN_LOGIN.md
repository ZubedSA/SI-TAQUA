# PANDUAN LENGKAP: Memperbaiki Login Username

## ⚠️ PENTING: Ikuti langkah ini SECARA BERURUTAN

### LANGKAH 1: Buka Supabase Dashboard
1. Buka browser, masuk ke https://supabase.com
2. Login ke project Anda
3. Klik project "akademik" Anda

### LANGKAH 2: Buka SQL Editor
1. Di sidebar kiri, cari dan klik menu **"SQL Editor"**
2. Klik tombol **"New query"** (tombol + di kanan atas)

### LANGKAH 3: Jalankan Script Perbaikan
1. Buka file `database/FIX_COMPLETE_USERNAME_SYSTEM.sql` yang saya buat
2. **COPY SEMUA ISI FILE** tersebut (Ctrl+A lalu Ctrl+C)
3. **PASTE** ke SQL Editor di Supabase (Ctrl+V)
4. Klik tombol **"Run"** (atau tekan Ctrl+Enter)
5. **TUNGGU** sampai muncul hasil "Success" di bawah

### LANGKAH 4: Cek Hasilnya
Setelah script berhasil dijalankan, Anda akan melihat:
- Daftar semua user dengan username mereka
- Semua username seharusnya sudah terisi (tidak ada yang NULL)

### LANGKAH 5: Coba Login
1. Buka aplikasi web Anda
2. Di halaman login, masukkan:
   - **Username**: lihat username dari hasil query di langkah 4
   - **Password**: password yang Anda gunakan saat membuat user tersebut
3. Klik Login

---

## ❓ Troubleshooting

### Jika script SQL error:
- Screenshot error yang muncul
- Kirim screenshot ke saya

### Jika masih "Username tidak ditemukan":
Jalankan query ini di SQL Editor untuk cek:
```sql
SELECT email, username FROM user_profiles;
```

Lalu beritahu saya hasilnya.

---

## 📝 Catatan Penting
- Script `FIX_COMPLETE_USERNAME_SYSTEM.sql` **WAJIB** dijalankan di Supabase
- Membuka file saja TIDAK CUKUP, harus di-**RUN** di SQL Editor Supabase
- Script ini aman dijalankan berkali-kali kalau mau
