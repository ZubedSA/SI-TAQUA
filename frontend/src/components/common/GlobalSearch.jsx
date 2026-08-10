import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, X, Users, GraduationCap, Home, Circle, BookOpen, Command } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import './GlobalSearch.css'

const SEARCH_CATEGORIES = [
    { key: 'santri', label: 'Santri', icon: Users, path: '/santri' },
    { key: 'guru', label: 'Guru', icon: GraduationCap, path: '/guru' },
    { key: 'kelas', label: 'Kelas', icon: Home, path: '/kelas' },
    { key: 'halaqoh', label: 'Halaqoh', icon: Circle, path: '/halaqoh' },
    { key: 'mapel', label: 'Mapel', icon: BookOpen, path: '/mapel' },
]

const GlobalSearch = ({ isOpen, onClose }) => {
    const [query, setQuery] = useState('')
    const [results, setResults] = useState([])
    const [loading, setLoading] = useState(false)
    const [selectedIndex, setSelectedIndex] = useState(0)
    const inputRef = useRef(null)
    const navigate = useNavigate()

    // Focus input when modal opens
    useEffect(() => {
        if (isOpen) {
            setQuery('')
            setResults([])
            setSelectedIndex(0)
            const timer = setTimeout(() => {
                try {
                    inputRef.current?.focus()
                } catch (err) {
                    console.log('Focus error:', err)
                }
            }, 60)
            return () => clearTimeout(timer)
        }
    }, [isOpen])

    // Debounced search
    const searchData = useCallback(async (searchQuery) => {
        if (!searchQuery.trim()) {
            setResults([])
            return
        }

        setLoading(true)
        const searchResults = []

        try {
            const [santriRes, guruRes, kelasRes, halaqohRes, mapelRes] = await Promise.allSettled([
                // Search Santri (Nama & NIS)
                supabase
                    .from('santri')
                    .select('id, nama, nis')
                    .or(`nama.ilike.%${searchQuery}%,nis.ilike.%${searchQuery}%`)
                    .limit(5),
                // Search Guru (Nama & NIP)
                supabase
                    .from('guru')
                    .select('id, nama, nip')
                    .or(`nama.ilike.%${searchQuery}%,nip.ilike.%${searchQuery}%`)
                    .limit(5),
                // Search Kelas
                supabase
                    .from('kelas')
                    .select('id, nama')
                    .ilike('nama', `%${searchQuery}%`)
                    .limit(5),
                // Search Halaqoh
                supabase
                    .from('halaqoh')
                    .select('id, nama')
                    .ilike('nama', `%${searchQuery}%`)
                    .limit(5),
                // Search Mapel
                supabase
                    .from('mapel')
                    .select('id, nama')
                    .ilike('nama', `%${searchQuery}%`)
                    .limit(5)
            ])

            // Process Santri
            if (santriRes.status === 'fulfilled' && santriRes.value.data) {
                santriRes.value.data.forEach(item => {
                    searchResults.push({
                        type: 'santri',
                        id: item.id,
                        title: item.nama,
                        subtitle: `NIS: ${item.nis || '-'}`,
                        path: `/santri?highlight=${item.id}`
                    })
                })
            }

            // Process Guru
            if (guruRes.status === 'fulfilled' && guruRes.value.data) {
                guruRes.value.data.forEach(item => {
                    searchResults.push({
                        type: 'guru',
                        id: item.id,
                        title: item.nama,
                        subtitle: `NIP: ${item.nip || '-'}`,
                        path: `/guru?highlight=${item.id}`
                    })
                })
            }

            // Process Kelas
            if (kelasRes.status === 'fulfilled' && kelasRes.value.data) {
                kelasRes.value.data.forEach(item => {
                    searchResults.push({
                        type: 'kelas',
                        id: item.id,
                        title: item.nama || item.nama_kelas,
                        subtitle: 'Kelas',
                        path: `/kelas?highlight=${item.id}`
                    })
                })
            }

            // Process Halaqoh
            if (halaqohRes.status === 'fulfilled' && halaqohRes.value.data) {
                halaqohRes.value.data.forEach(item => {
                    searchResults.push({
                        type: 'halaqoh',
                        id: item.id,
                        title: item.nama || item.nama_halaqoh,
                        subtitle: 'Halaqoh',
                        path: `/halaqoh?highlight=${item.id}`
                    })
                })
            }

            // Process Mapel
            if (mapelRes.status === 'fulfilled' && mapelRes.value.data) {
                mapelRes.value.data.forEach(item => {
                    searchResults.push({
                        type: 'mapel',
                        id: item.id,
                        title: item.nama || item.nama_mapel,
                        subtitle: 'Mata Pelajaran',
                        path: `/mapel?highlight=${item.id}`
                    })
                })
            }

        } catch (error) {
            console.error('Search error:', error)
        } finally {
            setLoading(false)
            setResults(searchResults)
            setSelectedIndex(0)
        }
    }, [])

    // Debounce effect
    useEffect(() => {
        const timer = setTimeout(() => {
            searchData(query)
        }, 300)
        return () => clearTimeout(timer)
    }, [query, searchData])

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (!isOpen) return

            switch (e.key) {
                case 'ArrowDown':
                    e.preventDefault()
                    setSelectedIndex(prev => Math.min(prev + 1, results.length - 1))
                    break
                case 'ArrowUp':
                    e.preventDefault()
                    setSelectedIndex(prev => Math.max(prev - 1, 0))
                    break
                case 'Enter':
                    e.preventDefault()
                    if (results[selectedIndex]) {
                        handleSelectResult(results[selectedIndex])
                    }
                    break
                case 'Escape':
                    e.preventDefault()
                    onClose()
                    break
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [isOpen, results, selectedIndex, onClose])

    const handleSelectResult = (result) => {
        navigate(result.path)
        onClose()
    }

    const getIcon = (type) => {
        const category = SEARCH_CATEGORIES.find(c => c.key === type)
        if (category) {
            const IconComponent = category.icon
            return <IconComponent size={18} />
        }
        return <Search size={18} />
    }

    if (!isOpen) return null

    return (
        <div className="modal-overlay global-search-overlay" onClick={onClose}>
            <div className="modal-box global-search-modal" onClick={e => e.stopPropagation()}>
                <div className="global-search-header">
                    <Search size={20} className="search-icon" />
                    <input
                        ref={inputRef}
                        type="text"
                        className="global-search-input"
                        placeholder="Cari santri, guru, kelas, halaqoh, mapel..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                    />
                    <button className="global-search-close" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <div className="global-search-body">
                    {loading && (
                        <div className="global-search-loading">
                            <div className="search-spinner"></div>
                            <span>Mencari...</span>
                        </div>
                    )}

                    {!loading && query && results.length === 0 && (
                        <div className="global-search-empty">
                            <Search size={40} />
                            <p>Tidak ada hasil untuk "{query}"</p>
                        </div>
                    )}

                    {!loading && results.length > 0 && (
                        <ul className="global-search-results">
                            {results.map((result, index) => (
                                <li
                                    key={`${result.type}-${result.id}`}
                                    className={`search-result-item ${index === selectedIndex ? 'selected' : ''}`}
                                    onClick={() => handleSelectResult(result)}
                                    onMouseDown={(e) => {
                                        e.preventDefault()
                                        handleSelectResult(result)
                                    }}
                                    onMouseEnter={() => setSelectedIndex(index)}
                                >
                                    <span className={`result-icon result-icon-${result.type}`}>
                                        {getIcon(result.type)}
                                    </span>
                                    <div className="result-info">
                                        <span className="result-title">{result.title}</span>
                                        <span className="result-subtitle">{result.subtitle}</span>
                                    </div>
                                    <span className="result-type">{result.type}</span>
                                </li>
                            ))}
                        </ul>
                    )}

                    {!loading && !query && (
                        <div className="global-search-hint">
                            <p>Ketik untuk mencari di:</p>
                            <div className="search-categories">
                                {SEARCH_CATEGORIES.map(cat => (
                                    <span 
                                        key={cat.key} 
                                        className="category-tag cursor-pointer hover:bg-gray-100 transition-colors"
                                        onClick={() => {
                                            navigate(cat.path)
                                            onClose()
                                        }}
                                        onMouseDown={(e) => {
                                            e.preventDefault()
                                            navigate(cat.path)
                                            onClose()
                                        }}
                                    >
                                        <cat.icon size={14} />
                                        {cat.label}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="global-search-footer">
                    <span className="shortcut"><kbd>↑</kbd><kbd>↓</kbd> navigasi</span>
                    <span className="shortcut"><kbd>Enter</kbd> pilih</span>
                    <span className="shortcut"><kbd>Esc</kbd> tutup</span>
                </div>
            </div>
        </div>
    )
}

export default GlobalSearch
