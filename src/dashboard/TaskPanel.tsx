import { useState } from 'react'
import { TASKS } from './data'

/**
 * What is waiting on the owner, beside the office.
 *
 * Every item shows its trail — when the enquiry landed, what the agent
 * drafted, and that it is holding. That is the whole trust argument of the
 * product in one card: nothing goes out in your name until you say so.
 */
export default function TaskPanel({ onOpenRunSheet }: { onOpenRunSheet?: () => void }) {
  const [done, setDone] = useState<Record<string, boolean>>({})
  const open = TASKS.filter((t) => !done[t.id])

  return (
    <aside className="tasks">
      <header className="tasks__lead">
        <h2 className="tasks__head">
          {open.length === 0
            ? 'Nothing needs you.'
            : `${open.length} thing${open.length === 1 ? '' : 's'} need${open.length === 1 ? 's' : ''} you.`}
        </h2>
        {open.length > 0 && (
          <p className="tasks__sub">
            Drafted overnight and held. Nothing goes out in your name until you
            say so.
          </p>
        )}
      </header>

      {open.map((t) => (
        <article key={t.id} className="task" data-dept={t.deptId}>
          <header className="task__top">
            <span className="task__avatar">{t.who.slice(0, 1)}</span>
            <span className="task__id_">
              <span className="task__who">{t.who}</span>
              {/* What the agent does, then where they sit. The department
                  label alone never said what produced the thing waiting. */}
              <span className="task__role">{t.role}</span>
            </span>
            <span className="task__id">{t.id}</span>
          </header>

          {/* The system the work ran through, in the revenue panel's eyebrow
              shape. A connector with no integration behind it says so. */}
          <p className="task__via">
            <span className="task__viaName">{t.connector.name}</span>
            {!t.connector.wired && <span className="task__viaStub">not connected</span>}
          </p>

          <p className="task__ask">{t.ask}</p>

          <ol className="task__trail">
            {t.trail.map((s, i) => (
              <li key={i}>
                <span className="task__time">{s.time}</span>
                {s.note}
              </li>
            ))}
          </ol>

          <div className="task__actions">
            <button className="task__cta" onClick={() => setDone((d) => ({ ...d, [t.id]: true }))}>
              {t.cta}
            </button>
            {/* Approving here is one thing; going and looking is another.
                The second button is only live where there is somewhere real
                to go, and says so plainly where there is not. */}
            <button
              type="button"
              className="task__open"
              disabled={!t.connector.open}
              title={
                t.connector.open
                  ? undefined
                  : `${t.connector.name} is not connected, so there is nothing to open yet`
              }
              onClick={t.connector.open === 'runsheet' ? onOpenRunSheet : undefined}
            >
              {t.connector.openLabel}
              {!t.connector.open && <span className="task__openWhy">not connected</span>}
            </button>
          </div>
        </article>
      ))}

      {open.length === 0 && (
        <p className="tasks__clear">
          Everything drafted today has your sign-off. The team keeps working.
        </p>
      )}
    </aside>
  )
}
