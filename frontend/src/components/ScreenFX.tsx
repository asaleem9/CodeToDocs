// Global atmosphere: a static grain tile + vignette over the terminal chrome.
// Pure decoration — pointer-events-none, no animation, costs nothing.
const NOISE = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E")`

function ScreenFX() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-40">
      <div
        className="absolute inset-0 opacity-[0.04] mix-blend-overlay"
        style={{ backgroundImage: NOISE }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 120% 90% at 50% 40%, transparent 60%, rgb(0 0 0 / 0.28) 100%)',
        }}
      />
    </div>
  )
}

export default ScreenFX
