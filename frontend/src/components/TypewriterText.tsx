import { useState, useEffect } from 'react'
import './TypewriterText.css'

interface TypewriterTextProps {
  text: string
  speed?: number
  onComplete?: () => void
  className?: string
}

function TypewriterText({ text, speed = 10, onComplete, className = '' }: TypewriterTextProps) {
  const [displayedText, setDisplayedText] = useState('')
  const [currentIndex, setCurrentIndex] = useState(0)

  useEffect(() => {
    if (currentIndex < text.length) {
      const timeout = setTimeout(() => {
        setDisplayedText((prev) => prev + text[currentIndex])
        setCurrentIndex((prev) => prev + 1)
      }, speed)

      return () => clearTimeout(timeout)
    } else if (currentIndex === text.length && onComplete) {
      onComplete()
    }
  }, [currentIndex, text, speed, onComplete])

  // Reset when text changes
  useEffect(() => {
    setDisplayedText('')
    setCurrentIndex(0)
  }, [text])

  return (
    <div className={`typewriter-text ${className}`}>
      {displayedText}
      {currentIndex < text.length && <span className="typewriter-cursor">|</span>}
    </div>
  )
}

export default TypewriterText
