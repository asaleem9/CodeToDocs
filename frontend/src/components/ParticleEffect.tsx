import { useEffect, useRef } from 'react'
import './ParticleEffect.css'

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  size: number
  color: string
}

interface ParticleEffectProps {
  trigger: boolean
  onComplete?: () => void
}

function ParticleEffect({ trigger, onComplete }: ParticleEffectProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const particlesRef = useRef<Particle[]>([])
  const animationRef = useRef<number>()

  useEffect(() => {
    if (!trigger || !canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas size
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    // Create particles
    const particleCount = 100
    const colors = ['#818cf8', '#c084fc', '#10b981', '#60a5fa', '#f59e0b']

    particlesRef.current = Array.from({ length: particleCount }, () => {
      const centerX = canvas.width / 2
      const centerY = canvas.height / 2
      const angle = Math.random() * Math.PI * 2
      const velocity = 2 + Math.random() * 4

      return {
        x: centerX,
        y: centerY,
        vx: Math.cos(angle) * velocity,
        vy: Math.sin(angle) * velocity,
        life: 1,
        size: 2 + Math.random() * 4,
        color: colors[Math.floor(Math.random() * colors.length)],
      }
    })

    // Animation loop
    let completed = false
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      particlesRef.current = particlesRef.current.filter((particle) => {
        // Update position
        particle.x += particle.vx
        particle.y += particle.vy
        particle.vy += 0.1 // Gravity
        particle.life -= 0.01

        // Draw particle
        if (particle.life > 0) {
          ctx.globalAlpha = particle.life
          ctx.fillStyle = particle.color
          ctx.beginPath()
          ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2)
          ctx.fill()
          return true
        }
        return false
      })

      if (particlesRef.current.length > 0) {
        animationRef.current = requestAnimationFrame(animate)
      } else if (!completed && onComplete) {
        completed = true
        onComplete()
      }
    }

    animate()

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [trigger, onComplete])

  if (!trigger) return null

  return (
    <canvas
      ref={canvasRef}
      className="particle-canvas"
    />
  )
}

export default ParticleEffect
