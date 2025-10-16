import { useState, useEffect } from 'react'
import { IconChevronUp } from '../../ui/icons'

export default function ScrollToTop() {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const toggleVisibility = () => {
      if (window.scrollY > 200) {
        setIsVisible(true)
      } else {
        setIsVisible(false)
      }
    }

    // Check on mount
    toggleVisibility()

    window.addEventListener('scroll', toggleVisibility)

    return () => {
      window.removeEventListener('scroll', toggleVisibility)
    }
  }, [])

  const scrollToTop = () => {
    // Find the main scrollable container
    const mainContent = document.querySelector('.admin-dashboard-content') || 
                       document.querySelector('.dashboard-content') ||
                       document.querySelector('main') ||
                       document.documentElement
    
    if (mainContent) {
      mainContent.scrollTo({
        top: 0,
        behavior: 'smooth'
      })
    }
    
    // Also try window scroll
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    })
    
    // Fallback
    document.documentElement.scrollTop = 0
    document.body.scrollTop = 0
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

