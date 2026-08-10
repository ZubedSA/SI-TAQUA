import React from 'react'
import './Skeleton.css'

export const Skeleton = ({ width, height, className = '', borderRadius }) => {
    const style = {
        width: width || '100%',
        height: height || '1rem',
        borderRadius: borderRadius || undefined
    }

    return (
        <div 
            className={`skeleton-shimmer ${className}`} 
            style={style}
            aria-hidden="true"
        />
    )
}

export const SkeletonCard = ({ className = '' }) => (
    <div className={`skeleton-card ${className}`}>
        <div className="flex justify-between items-center">
            <Skeleton width="48px" height="48px" borderRadius="1rem" />
            <Skeleton width="60px" height="20px" borderRadius="9999px" />
        </div>
        <div className="space-y-2 mt-2">
            <Skeleton width="40%" height="14px" />
            <Skeleton width="65%" height="28px" borderRadius="0.5rem" />
        </div>
    </div>
)

export const SkeletonTable = ({ rows = 5, cols = 4, className = '' }) => (
    <div className={`w-full bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm ${className}`}>
        <div className="bg-gray-900 p-4 flex gap-4">
            {Array.from({ length: cols }).map((_, i) => (
                <Skeleton key={i} width={`${100 / cols}%`} height="16px" className="opacity-40" />
            ))}
        </div>
        <div>
            {Array.from({ length: rows }).map((_, r) => (
                <div key={r} className="skeleton-table-row">
                    {Array.from({ length: cols }).map((_, c) => (
                        <div key={c} style={{ width: `${100 / cols}%` }}>
                            <Skeleton height="16px" width={c === 0 ? '75%' : '50%'} />
                        </div>
                    ))}
                </div>
            ))}
        </div>
    </div>
)

export const PageSkeleton = () => (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto animate-pulse">
        <div className="w-full h-32 bg-gray-100 rounded-3xl skeleton-shimmer" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
        </div>
        <SkeletonTable rows={4} cols={4} />
    </div>
)

export default Skeleton
