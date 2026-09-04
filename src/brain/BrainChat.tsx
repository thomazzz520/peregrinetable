import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import {
  DEPARTMENTS,
  attentionCount,
  greetingWord,
  needsAttention,
  type Agent,
  type Department,
} from './departments'
import './brain.css'

/** `[[41]]` in the copy means "set this figure in the mono face". Kept as a
 *  marker rather than raw HTML so nothing here needs dangerouslySetInnerHTML. */
function Line({ text }: { text: string }) {
  const parts = useMemo(() => text.split(/\[\[(.+?)\]\]/g), [text])
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <span key={i} className="brain-num">
            {part}
          </span>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        ),
      )}
    </>
  )
}

function Avatar({ agent, tint, active }: { agent: Agent; tint: string; active: boolean }) {
  return (
    <span className={`brain-avatar${active ? ' is-active' : ''}`} style={{ background: tint }}>
      {agent.name.slice(0, 1)}
      <i className={`brain-dot brain-dot--${agent.status}`} />
    </span>
  )
}

export default function BrainChat({
  ownerName = 'Jenny',
  onClose,
}: {
  ownerName?: string
  onClose: () => void
}) {
  /* The people list is state because approving an item flips an agent from
     "attention" to "ok", and the rail, the avatars and the header count all
     have to move together when it does. */
  const [depts, setDepts] = useState<Department[]>(() =>
    DEPARTMENTS.map((d) => ({ ...d, people: d.people.map((p) => ({ ...p })) })),
  )

  /* Opening lands on whichever department is asking for something, not on
     the first one alphabetically. */
  const [deptId, setDeptId] = useState(() => (depts.find(needsAttention) ?? depts[0]!).id)
  const dept = depts.find((d) => d.id === deptId)!
  const firstFlagged = dept.people.findIndex((p) => p.status === 'attention')
  const [personIdx, setPersonIdx] = useState(() => Math.max(0, firstFlagged))
  const [greeted, setGreeted] = useState(() => firstFlagged >= 0)
  const [resolved, setResolved] = useState<Record<string, boolean>>({})

  const person = dept.people[personIdx]!
  const msgs = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (msgs.current) msgs.current.scrollTop = msgs.current.scrollHeight
  }, [deptId, personIdx, resolved])

  function openDept(id: string) {
    const next = depts.find((d) => d.id === id)!
    const flagged = next.people.findIndex((p) => p.status === 'attention')
    setDeptId(id)
    setPersonIdx(Math.max(0, flagged))
    setGreeted(flagged >= 0)
  }

  /** Either button resolves the item — declining is still a decision. */
  function resolve() {
    setResolved((r) => ({ ...r, [`${dept.id}:${person.name}`]: true }))
    setDepts((ds) =>
      ds.map((d) =>
        d.id !== dept.id
          ? d
          : { ...d, people: d.people.map((p) => (p.name === person.name ? { ...p, status: 'ok' } : p)) },
      ),
    )
  }

  const outstanding = attentionCount(depts)
  const isResolved = resolved[`${dept.id}:${person.name}`] === true

  return (
    <div className="brain-chat" role="dialog" aria-label="Venue brain">
      <aside className="brain-rail">
        <div className="brain-rail__head">
          <span className="brain-rail__mark">Peregrine</span>
          {outstanding > 0 && (
            <span className="brain-attn">
              <i className="brain-dot brain-dot--attention" />
              {outstanding} need you
            </span>
          )}
        </div>
        {depts.map((d) => (
          <button
            key={d.id}
            className={`brain-deptbtn${d.id === deptId ? ' is-on' : ''}`}
            onClick={() => openDept(d.id)}
          >
            <i className="brain-deptbtn__tint" style={{ background: d.color }} />
            <span className="brain-deptbtn__name">{d.name}</span>
            {needsAttention(d) && <i className="brain-dot brain-dot--attention" />}
          </button>
        ))}
      </aside>

      <section className="brain-conv">
        <header className="brain-conv__head">
          <h2 className="brain-conv__title">{dept.name}</h2>
          <button className="brain-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>

        <div className="brain-people">
          {dept.people.map((p, i) => (
            <button
              key={p.name}
              className={`brain-person${i === personIdx ? ' is-on' : ''}`}
              onClick={() => {
                setPersonIdx(i)
                setGreeted(false)
              }}
            >
              <Avatar agent={p} tint={dept.color} active={i === personIdx} />
              <span className="brain-person__name">{p.name}</span>
              <span className="brain-person__job">{p.job}</span>
            </button>
          ))}
        </div>

        <div className="brain-msgs" ref={msgs}>
          {greeted && (
            <p className="brain-greeting">
              Good {greetingWord()}, <b>{ownerName}</b> — I have an item that needs your attention.
            </p>
          )}
          <article className="brain-msg">
            <div className="brain-msg__who">
              {person.name} · {person.job}
            </div>
            <p className="brain-msg__body">
              <Line text={person.line} />
            </p>
            {/* Every reply ends in something approvable — never information alone. */}
            <div className="brain-action">
              {isResolved ? (
                <p className="brain-done">{person.action.done}</p>
              ) : (
                <>
                  <div className="brain-action__label">{person.action.label}</div>
                  <div className="brain-action__btns">
                    <button className="brain-btn brain-btn--primary" onClick={resolve}>
                      {person.action.primary}
                    </button>
                    <button className="brain-btn brain-btn--ghost" onClick={resolve}>
                      {person.action.ghost}
                    </button>
                  </div>
                </>
              )}
            </div>
          </article>
        </div>

        <div className="brain-chips">
          {dept.people.map((p, i) =>
            i === personIdx ? null : (
              <button
                key={p.name}
                className="brain-chip"
                onClick={() => {
                  setPersonIdx(i)
                  setGreeted(false)
                }}
              >
                Ask {p.name}
              </button>
            ),
          )}
        </div>
      </section>
    </div>
  )
}
