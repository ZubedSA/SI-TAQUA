import { supabase } from './supabase'

/**
 * Mencatat aktivitas ke audit_log
 * @param {string} action - CREATE, UPDATE, DELETE, INPUT
 * @param {string} tableName - Nama tabel yang diubah
 * @param {string} recordName - Nama/identifier record
 * @param {string} description - Deskripsi aktivitas
 * @param {object} options - { recordId, oldData, newData }
 */
export const logActivity = async (action, tableName, recordName, description, options = {}) => {
    try {
        console.log('📝 Logging activity:', action, tableName, recordName)

        // Get current user email
        let userEmail = 'System'
        try {
            const { data: { user } } = await supabase.auth.getUser()
            userEmail = user?.email || 'System'
        } catch (authError) {
            console.warn('Could not get user:', authError.message)
        }

        const logData = {
            user_email: userEmail,
            action: action,
            table_name: tableName,
            record_name: recordName,
            description: description,
            record_id: options.recordId || null,
            old_data: options.oldData || null,
            new_data: options.newData || null,
            ip_address: null
        }

        console.log('📝 Log data:', logData)

        const { data, error } = await supabase.from('audit_log').insert([logData]).select()

        if (error) {
            console.error('❌ Audit log insert error:', error.message, error.details, error.hint)
            // Jika tabel tidak ada, berikan instruksi
            if (error.message.includes('does not exist') || error.code === '42P01') {
                console.error('⚠️ Tabel audit_log belum ada! Jalankan SQL di Supabase Dashboard.')
            }
            return false
        }

        console.log('✅ Audit log saved:', data)
        return true
    } catch (err) {
        console.error('❌ Failed to log activity:', err.message)
        return false
    }
}

// Shortcut functions
export const logCreate = async (tableName, recordName, description) =>
    await logActivity('CREATE', tableName, recordName, description)

export const logUpdate = async (tableName, recordName, description, oldData = null, newData = null) =>
    await logActivity('UPDATE', tableName, recordName, description, { oldData, newData })

export const logDelete = async (tableName, recordName, description) =>
    await logActivity('DELETE', tableName, recordName, description)

export const logInput = async (tableName, recordName, description) =>
    await logActivity('INPUT', tableName, recordName, description)

// Test function - panggil ini dari console browser: testAuditLog()
window.testAuditLog = async () => {
    console.log('🧪 Testing audit log...')
    const result = await logCreate('test', 'Test Record', 'Testing audit log functionality')
    if (result) {
        console.log('✅ Audit log test PASSED!')
    } else {
        console.log('❌ Audit log test FAILED! Check errors above.')
    }
    return result
}

