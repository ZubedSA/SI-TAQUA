import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

/**
 * A safe wrapper around useQuery for Supabase.
 * prevents "ReferenceError" by guaranteeing data structure.
 * 
 * @param {string} key - Unique key for caching (e.g. 'santri')
 * @param {Function} fetcher - Async function that returns data
 * @param {Object} options - React Query options (staleTime, etc.)
 */
export const useSupabaseQuery = (key, fetcher, options = {}) => {
    const queryKey = Array.isArray(key) ? key : [key]

    const query = useQuery({
        queryKey,
        queryFn: async () => {
            try {
                const data = await fetcher()
                return data || []
            } catch (error) {
                console.error(`Query Error [${queryKey[0]}]:`, error)
                throw error
            }
        },
        ...options
    })

    // Return strict interface to prevent undefined access
    return {
        data: query.data || [],
        isLoading: query.isLoading,
        isError: query.isError,
        error: query.error,
        refetch: query.refetch,
        // Helper to check if we have data to show even if loading
        hasData: Array.isArray(query.data) && query.data.length > 0
    }
}
