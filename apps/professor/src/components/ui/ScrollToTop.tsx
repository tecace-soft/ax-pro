import { useState, useEffect } from 'react'
import { IconChevronUp } from '../../ui/icons'

export default function ScrollToTop() {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const checkScrollTop = () => {
      // Check multiple scroll positions
      const scrollTop = window.pageYOffset || 
                       document.documentElement.scrollTop || 
                       document.body.scrollTop || 
                       0
      
      const mainContent = document.querySelector('.admin-dashboard-content')
      const mainContentScroll = mainContent?.scrollTop || 0
      
      // Show button if any scroll is more than 200px
      if (scrollTop > 200 || mainContentScroll > 200) {
        setIsVisible(true)
      } else {
        setIsVisible(false)
      }
    }

    // Check on mount
    checkScrollTop()

    // Listen to window scroll
    window.addEventListener('scroll', checkScrollTop)
    
    // Listen to scroll on main content if it exists
    const mainContent = document.querySelector('.admin-dashboard-content')
    if (mainContent) {
      mainContent.addEventListener('scroll', checkScrollTop)
    }

    return () => {
      window.removeEventListener('scroll', checkScrollTop)
      if (mainContent) {
        mainContent.removeEventListener('scroll', checkScrollTop)
      }
    }
  }, [])

  const scrollToTop = () => {
    // Find the actual scrollable element
    const mainContent = document.querySelector('.admin-dashboard-content')
    
    if (mainContent && mainContent.scrollTop > 0) {
      // Scroll the main content if it's scrolled
      mainContent.scrollTo({
        top: 0,
        behavior: 'smooth'
      })
    } else {
      // Otherwise scroll the window
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      })
      document.documentElement.scrollTop = 0
      document.body.scrollTop = 0
    }
  }

  if (!isVisible) {
    return null
  }

  return (
    <button
      onClick={scrollToTop}
      style={{
        position: 'fixed',
        bottom: '32px',
        right: '32px',
        width: '48px',
        height: '48px',
        borderRadius: '50%',
        backgroundColor: 'var(--admin-primary, #3b82f6)',
        color: '#ffffff',
        border: 'none',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
        transition: 'all 0.3s ease',
        zIndex: 99999,
        opacity: 0.9
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.opacity = '1'
        e.currentTarget.style.transform = 'translateY(-4px)'
        e.currentTarget.style.boxShadow = '0 8px 20px rgba(59, 130, 246, 0.4)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.opacity = '0.9'
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.3)'
      }}
      aria-label="Scroll to top"
      title="Scroll to top"
    >
      <IconChevronUp size={24} />
    </button>
  )
}

