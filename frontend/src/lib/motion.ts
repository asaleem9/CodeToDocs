import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { TextPlugin } from 'gsap/TextPlugin'
import { ScrambleTextPlugin } from 'gsap/ScrambleTextPlugin'

gsap.registerPlugin(useGSAP, ScrollTrigger, TextPlugin, ScrambleTextPlugin)

export { gsap, useGSAP, ScrollTrigger }

export const SCRAMBLE_CHARS = '█▓▒░<>/{}$#'

/** True when the user asked for reduced motion — helpers snap to final state. */
export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** Type text onto an element with a terminal cadence. */
export function typeOn(
  target: gsap.DOMTarget,
  text: string,
  vars: gsap.TweenVars = {}
): gsap.core.Tween {
  if (prefersReducedMotion()) {
    return gsap.set(target, { text }) as unknown as gsap.core.Tween
  }
  return gsap.to(target, {
    text,
    duration: Math.min(2, Math.max(0.5, text.length * 0.03)),
    ease: 'none',
    ...vars,
  })
}

/** Scramble-decode a heading into place. */
export function decode(
  target: gsap.DOMTarget,
  text: string,
  vars: gsap.TweenVars = {}
): gsap.core.Tween {
  if (prefersReducedMotion()) {
    return gsap.set(target, { text }) as unknown as gsap.core.Tween
  }
  return gsap.to(target, {
    duration: 1.1,
    scrambleText: { text, chars: SCRAMBLE_CHARS, speed: 0.4 },
    ease: 'none',
    ...vars,
  })
}

/** Count a numeric readout up from zero. Optionally starts when scrolled into view. */
export function countUp(
  target: Element,
  value: number,
  { suffix = '', duration = 1.2, scrollTrigger = true } = {}
): void {
  if (prefersReducedMotion()) {
    target.textContent = `${value}${suffix}`
    return
  }
  const proxy = { n: 0 }
  gsap.to(proxy, {
    n: value,
    duration,
    ease: 'power2.out',
    snap: { n: 1 },
    onUpdate: () => {
      target.textContent = `${proxy.n}${suffix}`
    },
    ...(scrollTrigger
      ? { scrollTrigger: { trigger: target, start: 'top 85%', once: true } }
      : {}),
  })
}

/** Staggered scroll-in reveal for a set of elements. */
export function revealBatch(targets: gsap.DOMTarget, vars: gsap.TweenVars = {}): void {
  if (prefersReducedMotion()) {
    gsap.set(targets, { opacity: 1, y: 0 })
    return
  }
  gsap.set(targets, { opacity: 0, y: 28 })
  ScrollTrigger.batch(targets as gsap.DOMTarget & Element[], {
    start: 'top 88%',
    once: true,
    onEnter: (batch) =>
      gsap.to(batch, {
        opacity: 1,
        y: 0,
        duration: 0.7,
        ease: 'power3.out',
        stagger: 0.08,
        ...vars,
      }),
  })
}

/**
 * Page-load "boot sequence": elements marked [data-boot] inside `scope`
 * stagger in like a terminal drawing its chrome. This is the route
 * transition — enter-only, 400–600ms total.
 */
export function bootSequence(scope: Element): gsap.core.Timeline {
  const items = scope.querySelectorAll('[data-boot]')
  const tl = gsap.timeline()
  if (prefersReducedMotion() || items.length === 0) {
    gsap.set(items, { opacity: 1, y: 0 })
    return tl
  }
  tl.fromTo(
    items,
    { opacity: 0, y: 8 },
    // clearProps: leftover inline transforms create stacking contexts that
    // trap popovers (Menu) beneath later siblings
    { opacity: 1, y: 0, duration: 0.35, ease: 'power2.out', stagger: 0.05, clearProps: 'transform' }
  )
  return tl
}
