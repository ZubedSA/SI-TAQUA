import './Spinner.css'

const Spinner = ({ size = 'md', label = '', className = '' }) => {
    return (
        <div className={`spinner-container ${className}`}>
            <div className={`spinner ${size}`}></div>
            {label && <span className="spinner-text">{label}</span>}
        </div>
    )
}

export default Spinner
