import { useState } from 'react'
import {
  AVG_TICKET,
  CHANNELS,
  COSTS,
  COST_TOTAL,
  COVERS,
  DAY_TOTAL,
  HOURS,
  HOUR_DOLLARS,
  HOUR_SHARE,
  MIX,
  NEWS,
  OUTLOOK,
  PAYMENTS,
  TRAFFIC,
  CONTACTS,
  LOG,
  type Slice,
} from './data'

const money = (n: number) => '$' + n.toLocaleString()

function Stats({ items }: { items: { n: string; l: string }[] }) {
  return (
    <div className="pg__stats">
      {items.map((s) => (
        <div key={s.l} className="pg__stat">
          <div className="pg__statN">{s.n}</div>
          <div className="pg__statL">{s.l}</div>
        </div>
      ))}
    </div>
  )
}

function Breakdown({ rows, total }: { rows: Slice[]; total: number }) {
  return (
    <ul className="pg__rows">
      {rows.map((r) => (
        <li key={r.name}>
          <i style={{ background: r.color }} />
          <span className="pg__rowName">{r.name}</span>
          <span className="pg__rowAmt">{money(Math.round((total * r.pct) / 100))}</span>
          <span className="pg__rowPct">{r.pct}%</span>
        </li>
      ))}
    </ul>
  )
}

/* ------------------------------------------------------------------ *
 * Revenue — the shape of the day, and what it cost to make
 * ------------------------------------------------------------------ */

export function RevenuePanel() {
  const [dim, setDim] = useState<'category' | 'channel' | 'payment'>('category')
  const rows = dim === 'category' ? MIX : dim === 'channel' ? CHANNELS : PAYMENTS
  const peak = Math.max(...HOUR_SHARE)
  const evenPct = Math.min(100, (COST_TOTAL / DAY_TOTAL) * 100)
  const profit = DAY_TOTAL - COST_TOTAL

  return (
    <div className="pg">
      <Stats
        items={[
          { n: money(DAY_TOTAL), l: 'Total today' },
          { n: '+6.2%', l: 'vs yesterday' },
          { n: '$' + AVG_TICKET.toFixed(2), l: 'Avg ticket' },
          { n: String(COVERS), l: 'Covers' },
        ]}
      />

      <div className="pg__tabs">
        {(['category', 'channel', 'payment'] as const).map((k) => (
          <button key={k} className={`pg__tab${dim === k ? ' is-on' : ''}`} onClick={() => setDim(k)}>
            {k[0]!.toUpperCase() + k.slice(1)}
          </button>
        ))}
      </div>

      <div className="pg__split">
        <div className="pg__chart">
          <div className="pg__bars">
            {HOUR_SHARE.map((h, i) => (
              <div key={HOURS[i]} className="pg__barCol" title={`${HOURS[i]} · ${money(HOUR_DOLLARS[i]!)}`}>
                <div className="pg__barStack" style={{ height: `${(h / peak) * 100}%` }}>
                  {rows.map((r) => (
                    <i key={r.name} style={{ height: `${r.pct}%`, background: r.color }} />
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="pg__hrs">
            {HOURS.map((h) => (
              <span key={h}>{h}</span>
            ))}
          </div>
        </div>

        <div className="pg__log">
          {HOURS.map((h, i) => (
            <div key={h} className="pg__logRow">
              <span className="pg__logHr">{h}</span>
              <span className="pg__logTrack">
                <span className="pg__logFill" style={{ width: `${(HOUR_SHARE[i]! / peak) * 100}%` }}>
                  {rows.map((r) => (
                    <i key={r.name} style={{ width: `${r.pct}%`, background: r.color }} />
                  ))}
                </span>
              </span>
              <span className="pg__logAmt">{money(HOUR_DOLLARS[i]!)}</span>
            </div>
          ))}
        </div>
      </div>

      <h3 className="pg__head">By {dim}</h3>
      <Breakdown rows={rows} total={DAY_TOTAL} />

      <h3 className="pg__head">Today's costs</h3>
      <div className="pg__stack">
        {COSTS.map((c) => (
          <span
            key={c.name}
            style={{ width: `${(c.amt / COST_TOTAL) * 100}%`, background: c.color }}
            title={`${c.name} · ${money(c.amt)}`}
          />
        ))}
      </div>
      <ul className="pg__rows">
        {COSTS.map((c) => (
          <li key={c.name}>
            <i style={{ background: c.color }} />
            <span className="pg__rowName">{c.name}</span>
            <span className="pg__rowAmt">{money(c.amt)}</span>
            <span className="pg__rowPct">{Math.round((c.amt / COST_TOTAL) * 100)}%</span>
          </li>
        ))}
      </ul>

      {/* One bar the whole width of the day's takings, with the point where
          costs are covered marked on it. Everything past that line is what
          the day was actually worth. */}
      <h3 className="pg__head">Revenue against costs — today's break-even</h3>
      <div className="pg__even">
        <div className="pg__evenCost" style={{ width: `${evenPct}%` }} />
        <div className="pg__evenMark" style={{ left: `${evenPct}%` }}>
          <span>Break-even · {money(COST_TOTAL)}</span>
        </div>
      </div>
      <div className="pg__evenKey">
        <span><i style={{ background: '#D7DACC' }} />Cost of the day · {money(COST_TOTAL)}</span>
        <span><i style={{ background: '#4FAE90' }} />Kept · {money(profit)}</span>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ *
 * Weather, foot traffic, news
 * ------------------------------------------------------------------ */

export function WeatherPanel() {
  return (
    <div className="pg">
      <Stats
        items={[
          { n: `${OUTLOOK[0]!.temp}°`, l: 'Now' },
          { n: `${OUTLOOK[0]!.low}°`, l: 'Overnight low' },
          { n: OUTLOOK[0]!.label, l: 'Conditions' },
        ]}
      />
      <p className="pg__lede">{OUTLOOK[0]!.note}</p>
      <h3 className="pg__head">The week ahead</h3>
      <ul className="pg__week">
        {OUTLOOK.map((d, i) => (
          <li key={d.day} className={i === 0 ? 'is-now' : ''}>
            <span className="pg__weekDay">{d.day}</span>
            <span className="pg__weekTemp">{d.temp}°</span>
            <span className="pg__weekLow">{d.low}°</span>
            <span className="pg__weekLabel">{d.label}</span>
            <span className="pg__weekNote">{d.note}</span>
          </li>
        ))}
      </ul>
      <p className="pg__note">
        Weather is here because it moves covers. Sunday's rain is the one to plan
        a roster around.
      </p>
    </div>
  )
}

export function TrafficPanel() {
  const peak = Math.max(...TRAFFIC.map((t) => t.idx))
  return (
    <div className="pg">
      <Stats
        items={[
          { n: '+18%', l: 'vs usual Tuesday' },
          { n: 'Busy', l: 'Right now' },
          { n: 'Sat', l: 'Busiest day' },
        ]}
      />
      <p className="pg__lede">
        Counted from foot traffic on the street near you, indexed against a usual
        week. 100 is ordinary.
      </p>
      <h3 className="pg__head">This week</h3>
      <div className="pg__traffic">
        {TRAFFIC.map((t) => (
          <div key={t.day} className="pg__trafficCol">
            <span className="pg__trafficN">{t.idx}</span>
            <span className="pg__trafficBar" style={{ height: `${(t.idx / peak) * 100}%` }} />
            <span className="pg__trafficDay">{t.day}</span>
          </div>
        ))}
      </div>
      <p className="pg__note">
        Saturday runs about half again on an ordinary day. Monday is the one worth
        trimming.
      </p>
    </div>
  )
}

export function NewsPanel() {
  return (
    <div className="pg">
      <p className="pg__lede">
        Things happening outside the venue that land on you anyway — rates, awards,
        and the street itself.
      </p>
      <ul className="pg__news">
        {NEWS.map((n) => (
          <li key={n.head}>
            <span className="pg__newsTag">{n.tag}</span>
            <h4 className="pg__newsHead">{n.head}</h4>
            <p className="pg__newsBody">{n.body}</p>
            <p className="pg__newsHits">
              <span className="pg__spark">✦</span>
              {n.hits}
            </p>
          </li>
        ))}
      </ul>
    </div>
  )
}

/* ------------------------------------------------------------------ *
 * History and contacts
 * ------------------------------------------------------------------ */

export function HistoryPanel() {
  return (
    <div className="pg">
      <p className="pg__lede">
        Everything the team did, and everything it is still holding. Nothing on
        this list went out in your name without your say-so.
      </p>
      <ul className="pg__log2">
        {LOG.map((l, i) => (
          <li key={i}>
            <span className="pg__log2Time">{l.time}</span>
            <span className="pg__log2Body">
              <span className="pg__log2Dept">{l.dept}</span>
              <span className="pg__log2Note">{l.note}</span>
              <span className={`pg__log2State${l.done ? '' : ' is-waiting'}`}>
                {l.done ? '✓ Done' : '● Waiting on you'}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function ContactPanel() {
  return (
    <div className="pg">
      <p className="pg__lede">
        What the brain is plugged into. It reads from these; it writes nothing
        back without you approving it first.
      </p>
      <ul className="pg__rows">
        {CONTACTS.map((c) => (
          <li key={c.name}>
            <i style={{ background: '#4FAE90' }} />
            <span className="pg__rowName">
              <b>{c.name}</b> · {c.kind}
            </span>
            <span className="pg__rowPctWide">{c.detail}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
