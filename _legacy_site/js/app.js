/**
 * Sistem Akademik PTQ Al-Usymuni Batuan
 * Main JavaScript Application
 */

document.addEventListener('DOMContentLoaded', function() {
    // Initialize all components
    initSidebar();
    initNavigation();
    initTrendChart();
    initAnimations();
});

/**
 * Sidebar Toggle Functionality
 */
function initSidebar() {
    const sidebar = document.getElementById('sidebar');
    const sidebarToggle = document.getElementById('sidebarToggle');
    
    if (sidebarToggle && sidebar) {
        sidebarToggle.addEventListener('click', function() {
            sidebar.classList.toggle('collapsed');
            
            // Save state to localStorage
            const isCollapsed = sidebar.classList.contains('collapsed');
            localStorage.setItem('sidebarCollapsed', isCollapsed);
        });
        
        // Restore state from localStorage
        const savedState = localStorage.getItem('sidebarCollapsed');
        if (savedState === 'true') {
            sidebar.classList.add('collapsed');
        }
    }
    
    // Mobile sidebar toggle
    const mobileToggle = document.querySelector('.mobile-menu-toggle');
    if (mobileToggle && sidebar) {
        mobileToggle.addEventListener('click', function() {
            sidebar.classList.toggle('active');
        });
    }
}

/**
 * Navigation Active State
 */
function initNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    
    navItems.forEach(item => {
        item.addEventListener('click', function(e) {
            // Remove active class from all items
            navItems.forEach(nav => nav.classList.remove('active'));
            
            // Add active class to clicked item
            this.classList.add('active');
            
            // Close mobile sidebar after navigation
            const sidebar = document.getElementById('sidebar');
            if (window.innerWidth <= 992 && sidebar) {
                sidebar.classList.remove('active');
            }
        });
    });
}

/**
 * Trend Chart (Line Chart using Chart.js)
 */
function initTrendChart() {
    const ctx = document.getElementById('trendChart');
    
    if (!ctx) return;
    
    // Sample data for trend chart
    const labels = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'];
    const data = {
        labels: labels,
        datasets: [{
            label: 'Rata-rata',
            data: [65, 68, 66, 70, 72, 75, 78, 80, 77, 82, 79, 85],
            borderColor: '#1a5c38',
            backgroundColor: 'rgba(26, 92, 56, 0.1)',
            borderWidth: 3,
            fill: true,
            tension: 0.4,
            pointBackgroundColor: '#1a5c38',
            pointBorderColor: '#ffffff',
            pointBorderWidth: 2,
            pointRadius: 5,
            pointHoverRadius: 7,
            pointHoverBackgroundColor: '#1a5c38',
            pointHoverBorderColor: '#ffffff',
            pointHoverBorderWidth: 3
        }]
    };
    
    const config = {
        type: 'line',
        data: data,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: '#1a5c38',
                    titleColor: '#ffffff',
                    bodyColor: '#ffffff',
                    borderColor: '#134429',
                    borderWidth: 1,
                    padding: 12,
                    cornerRadius: 8,
                    displayColors: false,
                    callbacks: {
                        label: function(context) {
                            return 'Rata-rata: ' + context.parsed.y;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: '#6b7280',
                        font: {
                            size: 12
                        }
                    }
                },
                y: {
                    min: 0,
                    max: 100,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)',
                        drawBorder: false
                    },
                    ticks: {
                        color: '#6b7280',
                        font: {
                            size: 12
                        },
                        stepSize: 25
                    }
                }
            }
        }
    };
    
    new Chart(ctx, config);
}

/**
 * Scroll Animations
 */
function initAnimations() {
    // Animate progress bars when they come into view
    const progressBars = document.querySelectorAll('.progress-fill');
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const bar = entry.target;
                const width = bar.style.width;
                bar.style.width = '0%';
                
                setTimeout(() => {
                    bar.style.width = width;
                }, 100);
                
                observer.unobserve(bar);
            }
        });
    }, {
        threshold: 0.5
    });
    
    progressBars.forEach(bar => observer.observe(bar));
    
    // Counter animation for stat values
    animateCounters();
}

/**
 * Animate Number Counters
 */
function animateCounters() {
    const counters = document.querySelectorAll('.stat-value');
    
    counters.forEach(counter => {
        const target = parseInt(counter.textContent);
        const duration = 1000; // Animation duration in ms
        const start = 0;
        const increment = target / (duration / 16); // 60fps
        
        let current = start;
        counter.textContent = '0';
        
        const updateCounter = () => {
            current += increment;
            
            if (current < target) {
                counter.textContent = Math.floor(current);
                requestAnimationFrame(updateCounter);
            } else {
                counter.textContent = target;
            }
        };
        
        // Start animation when element is in view
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    updateCounter();
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.5 });
        
        observer.observe(counter);
    });
}

/**
 * Search Functionality (Placeholder)
 */
const searchInput = document.querySelector('.search-input');
if (searchInput) {
    searchInput.addEventListener('input', function(e) {
        const query = e.target.value.toLowerCase();
        console.log('Searching for:', query);
        // Future: Implement search functionality
    });
    
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            const query = e.target.value.toLowerCase();
            console.log('Search submitted:', query);
            // Future: Navigate to search results
        }
    });
}

/**
 * Notification Handler (Placeholder)
 */
const notificationBtn = document.querySelector('.notification-btn');
if (notificationBtn) {
    notificationBtn.addEventListener('click', function() {
        console.log('Notifications clicked');
        // Future: Show notification dropdown
    });
}

/**
 * User Profile Dropdown (Placeholder)
 */
const userProfile = document.querySelector('.user-profile');
if (userProfile) {
    userProfile.addEventListener('click', function() {
        console.log('Profile clicked');
        // Future: Show profile dropdown menu
    });
}

/**
 * Utility: Format Numbers with Separator
 */
function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/**
 * Utility: Debounce Function
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Handle Window Resize
 */
window.addEventListener('resize', debounce(function() {
    // Responsive adjustments
    const sidebar = document.getElementById('sidebar');
    if (sidebar && window.innerWidth > 992) {
        sidebar.classList.remove('active');
    }
}, 250));
