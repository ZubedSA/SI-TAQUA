import { useEffect, useRef } from 'react'

/**
 * Custom hook for scroll-triggered animations
 * Uses Intersection Observer API to detect when elements enter viewport
 * 
 * Usage:
 * 1. Import: import { useScrollAnimation } from '../hooks/useScrollAnimation'
 * 2. Call in component: useScrollAnimation()
 * 3. Add class "animate-on-scroll" to elements you want to animate
 * 
 * Variants (add as additional class):
 * - "fade-left" - slide in from left
 * - "fade-right" - slide in from right
 * - "scale" - scale up effect
 * 
 * Example:
 * <div className="animate-on-scroll">Animates when scrolled into view</div>
 * <div className="animate-on-scroll fade-left delay-200">From left with delay</div>
 */
export const useScrollAnimation = (options = {}) => {
    const observerRef = useRef(null)

    useEffect(() => {
        // Default options
        const defaultOptions = {
            root: null, // viewport
            rootMargin: '0px',
            threshold: 0.1, // trigger when 10% visible
            ...options
        }

        // Create observer
        observerRef.current = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-visible')
                    // Optional: unobserve after animation (for performance)
                    // observerRef.current.unobserve(entry.target)
                }
            })
        }, defaultOptions)

        // Observe all elements with animate-on-scroll class
        const elements = document.querySelectorAll('.animate-on-scroll')
        elements.forEach(el => observerRef.current.observe(el))

        // Cleanup
        return () => {
            if (observerRef.current) {
                observerRef.current.disconnect()
            }
        }
    }, [])

    return observerRef
}

/**
 * Hook to trigger animation on mount (useful for page transitions)
 * Just call this in your page component to trigger page-enter animation
 */
export const usePageAnimation = () => {
    useEffect(() => {
        // Small delay to ensure DOM is ready
        const timer = setTimeout(() => {
            const pageContent = document.querySelector('.page-content')
            if (pageContent) {
                pageContent.classList.add('page-enter')
            }
        }, 10)

        return () => clearTimeout(timer)
    }, [])
}

export default useScrollAnimation
