import { useState } from 'react'
import { TASKS } from './data'

/**
 * What is waiting on the owner, beside the office.
 *
 * Every item shows its trail — when the enquiry landed, what the agent
 * drafted, and that it is holding. That is the whole trust argument of the
 * product in one card: nothing goes out in your name until you say so.
 */
export default function TaskPanel() {
  const [done, setDone] = useState<Record<string, boolean>>({})
  const open = TASKS.filter((t) => !done[t.id])

  return (
    <aside className="tasks">
      <h2 className="tasks__head">
        {open.length === 0 ? 'Nothing needs you.' : `${open.length} things need you.`}
      </h2>

      {open.map((t) => (
        <article key={t.id} className="task">
          <header className="task__top">
            <span className="task__avatar">{t.who.slice(0, 1)}</span>
            <span>
              <span className="task__who">{t.who}</span>
              <span className="task__dept">{t.dept}</span>
            </span>
            <span className="task__id">{t.id}</span>
          </header>

          <p className="task__ask">{t.ask}</p>

          <ol className="task__trail">
            {t.trail.map((s, i) => (
              <li key={i}>
                <span className="task__time">{s.time}</span>
                {s.note}
              </li>
            ))}
          </ol>

          <button className="task__cta" onClick={() => setDone((d) => ({ ...d, [t.id]: true }))}>
            {t.cta}
          </button>
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
