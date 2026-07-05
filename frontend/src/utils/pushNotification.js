/**
 * Push Notification Utility for SI-TAQUA PWA
 * Handles browser push notification subscription and management
 */
import { supabase } from '../lib/supabase'

// VAPID Public Key from environment
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY

/**
 * Check if push notifications are supported
 */
export function isPushSupported() {
    return (
        'serviceWorker' in navigator &&
        'PushManager' in window &&
        'Notification' in window
    )
}

/**
 * Get current notification permission status
 * @returns {'granted' | 'denied' | 'default'}
 */
export function getPermissionStatus() {
    if (!('Notification' in window)) return 'denied'
    return Notification.permission
}

/**
 * Request notification permission from the user
 * @returns {Promise<boolean>} true if granted
 */
export async function requestNotificationPermission() {
    if (!isPushSupported()) {
        console.warn('[Push] Push notifications not supported')
        return false
    }

    const permission = await Notification.requestPermission()
    return permission === 'granted'
}

/**
 * Convert VAPID key from base64url to Uint8Array
 */
function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
    const rawData = window.atob(base64)
    const outputArray = new Uint8Array(rawData.length)
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i)
    }
    return outputArray
}

/**
 * Subscribe user to push notifications
 * Saves subscription to Supabase
 * @param {string} userId - The authenticated user ID
 * @returns {Promise<boolean>} true if subscription successful
 */
export async function subscribeToPush(userId) {
    try {
        if (!isPushSupported()) {
            console.warn('[Push] Push not supported on this browser')
            return false
        }

        if (!VAPID_PUBLIC_KEY) {
            console.warn('[Push] VAPID public key not configured')
            return false
        }

        // Check/request permission
        const hasPermission = await requestNotificationPermission()
        if (!hasPermission) {
            console.log('[Push] Notification permission denied')
            return false
        }

        // Get service worker registration
        const registration = await navigator.serviceWorker.ready

        // Check existing subscription
        let subscription = await registration.pushManager.getSubscription()

        if (!subscription) {
            // Create new subscription
            subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
            })
        }

        // Extract keys from subscription
        const subscriptionJson = subscription.toJSON()
        const { endpoint } = subscriptionJson
        const p256dh = subscriptionJson.keys?.p256dh
        const auth = subscriptionJson.keys?.auth

        if (!endpoint || !p256dh || !auth) {
            console.error('[Push] Invalid subscription data')
            return false
        }

        // Save to Supabase via RPC
        const { error } = await supabase.rpc('save_push_subscription', {
            p_endpoint: endpoint,
            p_p256dh: p256dh,
            p_auth: auth
        })

        if (error) {
            console.error('[Push] Failed to save subscription:', error.message)
            return false
        }

        console.log('[Push] ✅ Successfully subscribed to push notifications')
        return true

    } catch (err) {
        console.error('[Push] Subscription error:', err)
        return false
    }
}

/**
 * Unsubscribe from push notifications
 * @param {string} userId - The authenticated user ID
 */
export async function unsubscribeFromPush(userId) {
    try {
        const registration = await navigator.serviceWorker.ready
        const subscription = await registration.pushManager.getSubscription()

        if (subscription) {
            const endpoint = subscription.endpoint

            // Unsubscribe from push manager
            await subscription.unsubscribe()

            // Remove from Supabase
            await supabase
                .from('push_subscriptions')
                .delete()
                .eq('user_id', userId)
                .eq('endpoint', endpoint)

            console.log('[Push] ✅ Successfully unsubscribed')
        }

        return true
    } catch (err) {
        console.error('[Push] Unsubscribe error:', err)
        return false
    }
}

/**
 * Check if user is currently subscribed
 * @returns {Promise<boolean>}
 */
export async function isSubscribed() {
    try {
        if (!isPushSupported()) return false

        const registration = await navigator.serviceWorker.ready
        const subscription = await registration.pushManager.getSubscription()
        return !!subscription
    } catch {
        return false
    }
}

/**
 * Send push notification via Supabase Edge Function
 * Called from frontend after saving attendance
 * @param {Object} payload - Notification payload
 * @param {string} payload.type - 'santri_alpha' or 'guru_reminder'
 * @param {string} payload.title - Notification title
 * @param {string} payload.body - Notification body
 * @param {string[]} payload.target_user_ids - Target user IDs
 * @param {string} [payload.url] - URL to open on click
 */
export async function sendPushNotification(payload) {
    try {
        const { data, error } = await supabase.functions.invoke('send-push-notification', {
            body: payload
        })

        if (error) {
            console.error('[Push] Failed to send notification:', error.message)
            return false
        }

        console.log('[Push] Notification sent:', data)
        return true
    } catch (err) {
        console.error('[Push] Send error:', err)
        return false
    }
}
