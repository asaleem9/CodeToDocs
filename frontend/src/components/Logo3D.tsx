import { useEffect, useRef } from 'react'
import './Logo3D.css'

interface Logo3DProps {
  size?: 'small' | 'medium' | 'large'
  autoRotate?: boolean
}

function Logo3D({ size = 'large', autoRotate = true }: Logo3DProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const rotationRef = useRef({ x: 0, y: 0 })
  const animationRef = useRef<number>()

  useEffect(() => {
    if (!autoRotate || !containerRef.current) return

    const animate = () => {
      rotationRef.current.y += 0.5
      if (containerRef.current) {
        containerRef.current.style.transform = `
          perspective(1000px)
          rotateX(${rotationRef.current.x}deg)
          rotateY(${rotationRef.current.y}deg)
        `
      }
      animationRef.current = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [autoRotate])

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (autoRotate || !containerRef.current) return

    const rect = containerRef.current.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2

    const rotateX = (e.clientY - centerY) / 10
    const rotateY = (e.clientX - centerX) / 10

    rotationRef.current = { x: -rotateX, y: rotateY }
    containerRef.current.style.transform = `
      perspective(1000px)
      rotateX(${-rotateX}deg)
      rotateY(${rotateY}deg)
    `
  }

  const handleMouseLeave = () => {
    if (autoRotate || !containerRef.current) return

    rotationRef.current = { x: 0, y: 0 }
    containerRef.current.style.transform = `
      perspective(1000px)
      rotateX(0deg)
      rotateY(0deg)
    `
  }

  return (
    <div
      className={`logo-3d-wrapper logo-3d-${size}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <div ref={containerRef} className="logo-3d-container">
        <div className="logo-3d-cube">
          {/* Front face */}
          <div className="logo-face logo-face-front">
            <svg viewBox="0 0 100 100" className="logo-svg">
              <polygon points="50,10 90,30 90,70 50,90 10,70 10,30" fill="url(#gradient1)" />
              <text x="50" y="60" textAnchor="middle" fill="white" fontSize="32" fontWeight="bold">
                C
              </text>
              <defs>
                <linearGradient id="gradient1" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#818cf8" />
                  <stop offset="100%" stopColor="#c084fc" />
                </linearGradient>
              </defs>
            </svg>
          </div>

          {/* Back face */}
          <div className="logo-face logo-face-back">
            <svg viewBox="0 0 100 100" className="logo-svg">
              <polygon points="50,10 90,30 90,70 50,90 10,70 10,30" fill="url(#gradient2)" />
              <text x="50" y="60" textAnchor="middle" fill="white" fontSize="32" fontWeight="bold">
                D
              </text>
              <defs>
                <linearGradient id="gradient2" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#10b981" />
                  <stop offset="100%" stopColor="#3b82f6" />
                </linearGradient>
              </defs>
            </svg>
          </div>

          {/* Top face */}
          <div className="logo-face logo-face-top">
            <svg viewBox="0 0 100 100" className="logo-svg">
              <polygon points="50,10 90,30 50,50 10,30" fill="url(#gradient3)" />
              <defs>
                <linearGradient id="gradient3" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#c084fc" />
                  <stop offset="100%" stopColor="#818cf8" />
                </linearGradient>
              </defs>
            </svg>
          </div>

          {/* Bottom face */}
          <div className="logo-face logo-face-bottom">
            <svg viewBox="0 0 100 100" className="logo-svg">
              <polygon points="10,70 50,90 90,70 50,50" fill="url(#gradient4)" />
              <defs>
                <linearGradient id="gradient4" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#3b82f6" />
                  <stop offset="100%" stopColor="#10b981" />
                </linearGradient>
              </defs>
            </svg>
          </div>

          {/* Left face */}
          <div className="logo-face logo-face-left">
            <svg viewBox="0 0 100 100" className="logo-svg">
              <polygon points="10,30 50,10 50,50 10,70" fill="url(#gradient5)" />
              <defs>
                <linearGradient id="gradient5" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#818cf8" />
                  <stop offset="100%" stopColor="#10b981" />
                </linearGradient>
              </defs>
            </svg>
          </div>

          {/* Right face */}
          <div className="logo-face logo-face-right">
            <svg viewBox="0 0 100 100" className="logo-svg">
              <polygon points="90,30 90,70 50,50 50,10" fill="url(#gradient6)" />
              <defs>
                <linearGradient id="gradient6" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#c084fc" />
                  <stop offset="100%" stopColor="#3b82f6" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        </div>

        {/* Glow effect */}
        <div className="logo-3d-glow"></div>
      </div>
    </div>
  )
}

export default Logo3D
