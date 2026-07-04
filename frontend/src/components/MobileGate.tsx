import Logo from './Logo'
import Panel from './ui/Panel'

function MobileGate() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-ink-950 p-6">
      <Panel title="SYSTEM" scanlines className="w-full max-w-sm" contentClassName="items-center gap-5 p-8 text-center">
        <p className="font-display text-sm tracking-wide text-amber">
          ERROR 412 — VIEWPORT TOO SMALL
          <span aria-hidden className="animate-caret-blink ml-1.5">
            ▮
          </span>
        </p>
        <p className="font-sans text-sm text-ink-300">
          CodeToDocs is a desktop workbench — the code editor, split-view panels, and batch
          processing tools need a bigger screen.
        </p>
        <Logo size="small" showText={true} />
      </Panel>
    </div>
  )
}

export default MobileGate
