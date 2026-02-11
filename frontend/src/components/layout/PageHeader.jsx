import React from 'react'

const PageHeader = ({ title, description, actions, className = '' }) => {
    return (
        <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 ${className}`}>
            <div>
                <h1 className="text-2xl font-bold text-gray-900 tracking-tight mt-1">{title}</h1>
                {description && (
                    <p className="text-sm text-gray-500 mt-1">{description}</p>
                )}
            </div>
            {actions && (
                <div className="flex items-center gap-3 flex-wrap">
                    {actions}
                </div>
            )}
        </div>
    )
}

export default PageHeader
