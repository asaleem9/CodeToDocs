import { ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { CSSTransition, TransitionGroup } from 'react-transition-group'
import './PageTransition.css'

interface PageTransitionProps {
  children: ReactNode
}

function PageTransition({ children }: PageTransitionProps) {
  const location = useLocation()

  return (
    <TransitionGroup component={null}>
      <CSSTransition
        key={location.pathname}
        timeout={300}
        classNames="page"
        unmountOnExit
      >
        <div className="page-wrapper">{children}</div>
      </CSSTransition>
    </TransitionGroup>
  )
}

export default PageTransition
