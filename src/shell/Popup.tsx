import { useEffect, type ReactNode } from 'react'

/**
 * The click-in popup every department opens into.
 *
 * Deliberately the same shape for all of them, and deliberately different
 * from the brain: a department popup is for *looking* — it reports, it does
 * not edit — while clicking the brain drops you into a conversation where
 * you approve things. Making them feel alike would blur which is which.
 */
export default function Popup({
  eyebrow,
  title,
  onClose,
  children,
}: {
  eyebrow: string
  title: string
  onClose: () => void
  children: ReactNode
}) {
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [onClose])

  return (
    <div className="pop" role="dialog" aria-label={title}>
      <div className="pop__scrim" onClick={onClose} />
      <div className="pop__card">
        <header className="pop__head">
          <div>
            <div className="pop__eyebrow">{eyebrow}</div>
            <h2 className="pop__title">{title}</h2>
          </div>
          <button className="pop__close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>
        <div className="pop__body">{children}</div>
      </div>
    </div>
  )
}
