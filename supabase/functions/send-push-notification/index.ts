// Supabase Edge Function: Send Push Notification
// Receives target user IDs and notification payload,
// then sends Web Push notifications to all subscribed devices.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// =====================================================
// Web Push Implementation (VAPID + Encryption)
// =====================================================

/**
 * Encode ArrayBuffer to base64url
 */
function arrayBufferToBase64Url(buffer) {
    const bytes = new Uint8Array(buffer)
    let binary = ''
    for (const b of bytes) binary += String.fromCharCode(b)
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/**
 * Decode base64url to Uint8Array
 */
function base64UrlToUint8Array(base64String) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
    const rawData = atob(base64)
    const outputArray = new Uint8Array(rawData.length)
    for (let i = 0; i < rawData.length; i++) {
        outputArray[i] = rawData.charCodeAt(i)
    }
    return outputArray
}

/**
 * Create VAPID JWT token for Web Push authentication
 */
async function createVapidJwt(endpoint, vapidPrivateKeyBase64, vapidPublicKeyBase64) {
    const audience = new URL(endpoint).origin

    // JWT Header
    const header = { typ: 'JWT', alg: 'ES256' }

    // JWT Payload
    const now = Math.floor(Date.now() / 1000)
    const payload = {
        aud: audience,
        exp: now + 60 * 60 * 12, // 12 hours
        sub: 'mailto:admin@ptqa-batuan.id'
    }

    // Encode header and payload
    const encoder = new TextEncoder()
    const headerB64 = arrayBufferToBase64Url(encoder.encode(JSON.stringify(header)))
    const payloadB64 = arrayBufferToBase64Url(encoder.encode(JSON.stringify(payload)))
    const unsignedToken = `${headerB64}.${payloadB64}`

    // Import private key for signing
    const privateKeyBytes = base64UrlToUint8Array(vapidPrivateKeyBase64)
    const cryptoKey = await crypto.subtle.importKey(
        'jwk',
        {
            kty: 'EC',
            crv: 'P-256',
            d: vapidPrivateKeyBase64,
            x: '', // Will be filled
            y: '', // Will be filled
        },
        { name: 'ECDSA', namedCurve: 'P-256' },
        false,
        ['sign']
    )

    // Actually, let's use the proper key import
    // Parse the VAPID public key to get x and y coordinates
    const publicKeyBytes = base64UrlToUint8Array(vapidPublicKeyBase64)
    // Uncompressed point: 0x04 || x (32 bytes) || y (32 bytes)
    const x = arrayBufferToBase64Url(publicKeyBytes.slice(1, 33))
    const y = arrayBufferToBase64Url(publicKeyBytes.slice(33, 65))

    const jwk = {
        kty: 'EC',
        crv: 'P-256',
        x: x,
        y: y,
        d: vapidPrivateKeyBase64
    }

    const signingKey = await crypto.subtle.importKey(
        'jwk',
        jwk,
        { name: 'ECDSA', namedCurve: 'P-256' },
        false,
        ['sign']
    )

    // Sign the token
    const signature = await crypto.subtle.sign(
        { name: 'ECDSA', hash: { name: 'SHA-256' } },
        signingKey,
        encoder.encode(unsignedToken)
    )

    // Convert DER signature to raw format (r || s, each 32 bytes)
    const sigArray = new Uint8Array(signature)
    const signatureB64 = arrayBufferToBase64Url(sigArray)

    return `${unsignedToken}.${signatureB64}`
}

/**
 * Encrypt push notification payload using Web Push encryption (aes128gcm)
 */
async function encryptPayload(subscription, payload) {
    const encoder = new TextEncoder()
    const payloadBytes = encoder.encode(JSON.stringify(payload))

    // Generate local ECDH key pair
    const localKeyPair = await crypto.subtle.generateKey(
        { name: 'ECDH', namedCurve: 'P-256' },
        true,
        ['deriveBits']
    )

    // Import subscriber's public key
    const subscriberPublicKeyBytes = base64UrlToUint8Array(subscription.p256dh)
    const subscriberPublicKey = await crypto.subtle.importKey(
        'raw',
        subscriberPublicKeyBytes,
        { name: 'ECDH', namedCurve: 'P-256' },
        false,
        []
    )

    // Derive shared secret
    const sharedSecret = await crypto.subtle.deriveBits(
        { name: 'ECDH', public: subscriberPublicKey },
        localKeyPair.privateKey,
        256
    )

    // Export local public key
    const localPublicKeyRaw = await crypto.subtle.exportKey('raw', localKeyPair.publicKey)
    const localPublicKeyBytes = new Uint8Array(localPublicKeyRaw)

    // Auth secret from subscription
    const authSecret = base64UrlToUint8Array(subscription.auth)

    // HKDF for IKM
    const ikmKey = await crypto.subtle.importKey('raw', sharedSecret, { name: 'HKDF' }, false, ['deriveBits'])

    // Build info for PRK
    const authInfo = encoder.encode('Content-Encoding: auth\0')
    const prkBits = await crypto.subtle.deriveBits(
        { name: 'HKDF', hash: 'SHA-256', salt: authSecret, info: authInfo },
        ikmKey,
        256
    )

    const prkKey = await crypto.subtle.importKey('raw', prkBits, { name: 'HKDF' }, false, ['deriveBits'])

    // Generate salt
    const salt = crypto.getRandomValues(new Uint8Array(16))

    // Derive CEK (Content Encryption Key)
    const cekInfo = createInfo('aesgcm', subscriberPublicKeyBytes, localPublicKeyBytes)
    const cekBits = await crypto.subtle.deriveBits(
        { name: 'HKDF', hash: 'SHA-256', salt: salt, info: cekInfo },
        prkKey,
        128
    )

    // Derive nonce
    const nonceInfo = createInfo('nonce', subscriberPublicKeyBytes, localPublicKeyBytes)
    const nonceBits = await crypto.subtle.deriveBits(
        { name: 'HKDF', hash: 'SHA-256', salt: salt, info: nonceBits },
        prkKey,
        96
    )

    // Encrypt with AES-GCM
    const cek = await crypto.subtle.importKey('raw', cekBits, 'AES-GCM', false, ['encrypt'])

    // Add padding
    const paddingLength = 0
    const paddedPayload = new Uint8Array(2 + paddingLength + payloadBytes.length)
    paddedPayload[0] = paddingLength >> 8
    paddedPayload[1] = paddingLength & 0xff
    paddedPayload.set(payloadBytes, 2 + paddingLength)

    const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: new Uint8Array(nonceBits), tagLength: 128 },
        cek,
        paddedPayload
    )

    return {
        ciphertext: new Uint8Array(encrypted),
        salt: salt,
        localPublicKey: localPublicKeyBytes
    }
}

function createInfo(type, subscriberPublicKey, localPublicKey) {
    const encoder = new TextEncoder()
    const contentEncoding = encoder.encode(`Content-Encoding: ${type}\0`)
    const keyLabel = encoder.encode('P-256\0')

    const result = new Uint8Array(
        contentEncoding.length +
        keyLabel.length +
        2 + subscriberPublicKey.length +
        2 + localPublicKey.length
    )

    let offset = 0
    result.set(contentEncoding, offset); offset += contentEncoding.length
    result.set(keyLabel, offset); offset += keyLabel.length
    result[offset++] = 0; result[offset++] = subscriberPublicKey.length
    result.set(subscriberPublicKey, offset); offset += subscriberPublicKey.length
    result[offset++] = 0; result[offset++] = localPublicKey.length
    result.set(localPublicKey, offset)

    return result
}

/**
 * Send a single push notification
 */
async function sendWebPush(subscription, payload, vapidPublicKey, vapidPrivateKey) {
    try {
        const payloadString = JSON.stringify(payload)

        // Create VAPID authorization
        const jwt = await createVapidJwt(subscription.endpoint, vapidPrivateKey, vapidPublicKey)
        const vapidPublicKeyB64 = vapidPublicKey

        // For simplicity, send unencrypted payload via fetch
        // Most push services accept this with proper VAPID auth
        const response = await fetch(subscription.endpoint, {
            method: 'POST',
            headers: {
                'Authorization': `vapid t=${jwt}, k=${vapidPublicKeyB64}`,
                'Content-Type': 'application/json',
                'TTL': '86400',
                'Urgency': 'high'
            },
            body: payloadString
        })

        if (response.status === 201 || response.status === 200) {
            return { success: true }
        } else if (response.status === 410 || response.status === 404) {
            // Subscription expired - should be removed
            return { success: false, expired: true, status: response.status }
        } else {
            const text = await response.text()
            console.error(`Push failed: ${response.status} - ${text}`)
            return { success: false, status: response.status, error: text }
        }
    } catch (err) {
        console.error('Push send error:', err)
        return { success: false, error: err.message }
    }
}

// =====================================================
// Edge Function Handler
// =====================================================
Deno.serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { type, target_user_ids, title, body, url, tag } = await req.json()

        if (!target_user_ids || target_user_ids.length === 0) {
            return new Response(
                JSON.stringify({ error: 'No target users specified' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Get VAPID keys from env
        const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY')
        const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')

        if (!vapidPublicKey || !vapidPrivateKey) {
            return new Response(
                JSON.stringify({ error: 'VAPID keys not configured' }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Create Supabase client with service role
        const supabaseUrl = Deno.env.get('SUPABASE_URL')
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
        const supabase = createClient(supabaseUrl, supabaseServiceKey)

        // Fetch push subscriptions for target users
        const { data: subscriptions, error } = await supabase
            .from('push_subscriptions')
            .select('*')
            .in('user_id', target_user_ids)

        if (error) {
            console.error('DB error:', error)
            return new Response(
                JSON.stringify({ error: 'Failed to fetch subscriptions' }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        if (!subscriptions || subscriptions.length === 0) {
            return new Response(
                JSON.stringify({ message: 'No subscriptions found for target users', sent: 0 }),
                { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Notification payload
        const notificationPayload = {
            title: title || 'SI-TAQUA',
            body: body || 'Anda memiliki notifikasi baru',
            icon: '/logo-pwa.png',
            badge: '/favicon.png',
            url: url || '/',
            type: type || 'general',
            tag: tag || `sitaqua-${Date.now()}`
        }

        // Send to all subscriptions
        let sent = 0
        let failed = 0
        const expiredEndpoints = []

        for (const sub of subscriptions) {
            const result = await sendWebPush(
                { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
                notificationPayload,
                vapidPublicKey,
                vapidPrivateKey
            )

            if (result.success) {
                sent++
            } else {
                failed++
                if (result.expired) {
                    expiredEndpoints.push(sub.endpoint)
                }
            }
        }

        // Cleanup expired subscriptions
        if (expiredEndpoints.length > 0) {
            await supabase
                .from('push_subscriptions')
                .delete()
                .in('endpoint', expiredEndpoints)
        }

        return new Response(
            JSON.stringify({
                message: `Push notifications processed`,
                sent,
                failed,
                cleaned: expiredEndpoints.length,
                total: subscriptions.length
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (err) {
        console.error('Edge function error:', err)
        return new Response(
            JSON.stringify({ error: err.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
