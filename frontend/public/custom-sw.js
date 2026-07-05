// =====================================================
// SI-TAQUA Custom Service Worker
// Handles Push Notifications
// =====================================================

// Listen for push events
self.addEventListener('push', function (event) {
    if (!event.data) return

    let data
    try {
        data = event.data.json()
    } catch (e) {
        data = {
            title: 'SI-TAQUA',
            body: event.data.text(),
            icon: '/logo-pwa.png',
            url: '/'
        }
    }

    const options = {
        body: data.body || 'Anda memiliki notifikasi baru',
        icon: data.icon || '/logo-pwa.png',
        badge: '/favicon.png',
        vibrate: [200, 100, 200],
        tag: data.tag || 'sitaqua-notification',
        renotify: true,
        data: {
            url: data.url || '/',
            type: data.type || 'general'
        },
        actions: data.actions || []
    }

    event.waitUntil(
        self.registration.showNotification(data.title || 'SI-TAQUA', options)
    )
})

// Handle notification click
self.addEventListener('notificationclick', function (event) {
    event.notification.close()

    const url = event.notification.data?.url || '/'

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
            // If a window is already open, focus it and navigate
            for (const client of clientList) {
                if (client.url.includes(self.location.origin) && 'focus' in client) {
                    client.focus()
                    client.navigate(url)
                    return
                }
            }
            // Otherwise open a new window
            if (clients.openWindow) {
                return clients.openWindow(url)
            }
        })
    )
})

// Handle notification close
self.addEventListener('notificationclose', function (event) {
    // Optional: log analytics
    console.log('[SW] Notification closed:', event.notification.tag)
})
