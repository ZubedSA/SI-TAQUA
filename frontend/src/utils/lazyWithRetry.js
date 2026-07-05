import { lazy } from 'react';

/**
 * lazyWithRetry - Enterprise-grade wrapper untuk React.lazy
 * 
 * Mengatasi masalah "Halaman Putih Polos" (White Screen of Death) dan ChunkLoadError
 * yang sering terjadi pada aplikasi Vite + PWA saat versi bundle berubah atau cache PWA tidak sinkron.
 *
 * Logika Kerja:
 * 1. Mencoba melakukan dynamic import komponen.
 * 2. Jika gagal karena masalah jaringan / chunk tidak ditemukan (hash berubah),
 *    fungsi akan membersihkan cache Service Worker & Browser Cache.
 * 3. Melakukan reload halaman secara otomatis (1 kali per sesi) agar browser
 *    mengunduh index.html dan chunk terbaru dari server.
 */
export const lazyWithRetry = (componentImport) =>
  lazy(async () => {
    try {
      return await componentImport();
    } catch (error) {
      console.error('[lazyWithRetry] Gagal mengunduh chunk modul:', error);

      // Deteksi jenis error kegagalan impor modul / chunk
      const isChunkLoadError =
        error.name === 'ChunkLoadError' ||
        error.message?.includes('Failed to fetch') ||
        error.message?.includes('importing module') ||
        error.message?.includes('Dynamically imported module') ||
        error.message?.includes('error loading dynamically imported module');

      // Cek apakah sudah pernah mencoba reload pada sesi ini untuk mencegah infinite reload loop
      const hasReloaded = sessionStorage.getItem('sitaqua_chunk_reloaded');

      if (isChunkLoadError && !hasReloaded) {
        console.warn('[lazyWithRetry] Terdeteksi ketidakcocokan versi bundle/cache. Membersihkan cache & memuat ulang...');
        sessionStorage.setItem('sitaqua_chunk_reloaded', 'true');

        // Bersihkan cache storage (Service Worker / Workbox cache)
        if ('caches' in window) {
          try {
            const cacheNames = await caches.keys();
            await Promise.all(cacheNames.map((name) => caches.delete(name)));
            console.log('[lazyWithRetry] Cache Service Worker berhasil dibersihkan.');
          } catch (e) {
            console.warn('[lazyWithRetry] Gagal membersihkan cache:', e);
          }
        }

        // Hard reload untuk mendapatkan assets terbaru
        window.location.reload(true);

        // Return fallback null sementara browser memuat ulang halaman
        return { default: () => null };
      }

      // Jika bukan error chunk atau sudah pernah reload sebelumnya, lempar error agar ditangkap ErrorBoundary
      throw error;
    }
  });

export default lazyWithRetry;
