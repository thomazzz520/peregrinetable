import { useState } from 'react'
import {
  CAMPAIGNS,
  DEAL_PLATFORMS,
  MENU,
  breakEvenUplift,
  campaignMargin,
  marginPct,
  menuDay,
  promoPrice,
  unitMargin,
  type Campaign,
  type MenuItem,
} from './menu'
import { DAY_TOTAL } from './data'

const money = (n: number) =>
  '$' + n.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const money0 = (n: number) => '$' + Math.round(n).toLocaleString()
const signed = (n: number) => (n >= 0 ? '+' : '−') + money(Math.abs(n))

/* ------------------------------------------------------------------ *
 * Menu
 * ------------------------------------------------------------------ */

/**
 * The menu, editable.
 *
 * Price and cost are the two fields worth touching, because they are the
 * two the rest of this page computes from: change a price here and the
 * campaign figures below and the break-even line above all move with it.
 *
 * Editing is IN THIS SESSION ONLY. There is no menu in `src/data`, no
 * adapter method and no server route, so nothing typed here survives a
 * reload. That is the honest shape of a minimal menu rather than a
 * half-built persistent one, and the panel says so rather than letting an
 * owner think they have saved something.
 */
export function MenuTable({
  menu,
  onChange,
}: {
  menu: MenuItem[]
  onChange: (next: MenuItem[]) => void
}) {
  const day = menuDay(menu)
  const drift = day.revenue - DAY_TOTAL

  const set = (id: string, field: 'price' | 'cost', raw: string) => {
    const v = Math.max(0, Number(raw) || 0)
    onChange(menu.map((m) => (m.id === id ? { ...m, [field]: v } : m)))
  }

  return (
    <>
      <div className="pg__rangeRow">
        <h3 className="pg__head pg__head--inline">The menu</h3>
        <span className="pg__menuTotals">
          {money0(day.revenue)} a day · {money0(day.margin)} gross margin
        </span>
      </div>

      <table className="pg__menu">
        <thead>
          <tr>
            <th scope="col">Item</th>
            <th scope="col" className="pg__menuNum">Price</th>
            <th scope="col" className="pg__menuNum">Cost</th>
            <th scope="col" className="pg__menuNum">Margin</th>
            <th scope="col" className="pg__menuNum">A day</th>
          </tr>
        </thead>
        <tbody>
          {menu.map((m) => {
            const loses = m.cost >= m.price
            return (
              <tr key={m.id} className={loses ? 'is-loss' : undefined}>
                <th scope="row">
                  <span className="pg__menuName">{m.name}</span>
                  <span className="pg__menuCat">{m.category} · {m.unitsPerDay}/day</span>
                </th>
                <td className="pg__menuNum">
                  <label>
                    <span className="pg__srOnly">{m.name} price</span>
                    <input
                      type="number" min={0} step={0.1} value={m.price}
                      onChange={(e) => set(m.id, 'price', e.target.value)}
                    />
                  </label>
                </td>
                <td className="pg__menuNum">
                  <label>
                    <span className="pg__srOnly">{m.name} cost</span>
                    <input
                      type="number" min={0} step={0.05} value={m.cost}
                      onChange={(e) => set(m.id, 'cost', e.target.value)}
                    />
                  </label>
                </td>
                <td className="pg__menuNum">
                  {money(unitMargin(m))}
                  <span className="pg__menuPct">{loses ? 'loses money' : `${Math.round(marginPct(m))}%`}</span>
                </td>
                <td className="pg__menuNum">{money0(m.price * m.unitsPerDay)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>

      <p className="pg__note">
        {Math.abs(drift) < 0.5 ? (
          <>
            This menu adds up to {money0(day.revenue)}, which is the same day the
            chart above shows. Editing a price is in this session only: no menu is
            stored anywhere yet, so a reload brings back the original prices.
          </>
        ) : (
          <>
            Edited. This menu now adds up to {money0(day.revenue)}, which is{' '}
            {signed(drift)} against the {money0(DAY_TOTAL)} the chart above still
            shows, because that chart is a fixed example day and does not follow
            your edits. Nothing is stored: a reload brings back the original prices.
          </>
        )}
      </p>
    </>
  )
}

/* ------------------------------------------------------------------ *
 * Campaigns
 * ------------------------------------------------------------------ */

function Figure({ label, value, tone }: { label: string; value: string; tone?: 'up' | 'down' }) {
  return (
    <div className="pg__campFig">
      <span className={`pg__campFigN${tone ? ` is-${tone}` : ''}`}>{value}</span>
      <span className="pg__campFigL">{label}</span>
    </div>
  )
}

/** One campaign, with the arithmetic shown rather than asserted. */
function CampaignCard({
  campaign, menu, onEdit, onRemove,
}: {
  campaign: Campaign
  menu: MenuItem[]
  onEdit: () => void
  onRemove: () => void
}) {
  const r = campaignMargin(campaign, menu)
  const be = breakEvenUplift(campaign, menu)
  const ahead = r.marginChange >= 0
  const d = campaign.discount

  return (
    <article className="pg__camp" data-ahead={ahead}>
      <header className="pg__campTop">
        <span className="pg__campName">{campaign.name}</span>
        <span className="pg__campWhat">
          {d.kind === 'percent' ? `${d.pct}% off` : `set to ${money(d.price)}`} ·{' '}
          {campaign.itemIds.length ? `${r.scope.length} items` : 'whole menu'}
        </span>
        <span className="pg__campActions">
          <button type="button" className="pg__campBtn" onClick={onEdit}>Edit</button>
          <button type="button" className="pg__campBtn" onClick={onRemove}>Remove</button>
        </span>
      </header>

      <p className="pg__campNote">{campaign.note}</p>

      <div className="pg__campFigs">
        <Figure label="Net margin" value={money0(r.netMargin)} />
        <Figure
          label="Against doing nothing"
          value={signed(r.marginChange)}
          tone={ahead ? 'up' : 'down'}
        />
        <Figure label="Revenue" value={money0(r.promoRevenue)} />
        <Figure label="Units" value={String(r.promoUnits)} />
      </div>

      {/* The working, so the figure above is checkable rather than trusted. */}
      <dl className="pg__campWorking">
        <div><dt>Revenue at promo pricing</dt><dd>{money(r.promoRevenue)}</dd></div>
        <div><dt>Less cost of goods</dt><dd>&minus;{money(r.promoCogs)}</dd></div>
        <div className="is-stub">
          <dt>Less platform commission</dt>
          <dd>&minus;{money(r.commission)} <span className="pg__campStub">no platform connected</span></dd>
        </div>
        <div className="is-total"><dt>Net margin</dt><dd>{money(r.netMargin)}</dd></div>
        <div><dt>Those items left alone</dt><dd>{money(r.baseMargin)}</dd></div>
      </dl>

      <p className="pg__campBreak">
        {be === null ? (
          <>Every unit loses money at this price, so no amount of extra volume makes it pay.</>
        ) : (
          <>
            Breaks even at <b>{be}%</b> more units. You have assumed{' '}
            <b>{campaign.upliftPct}%</b>, which is {ahead ? 'above' : 'below'} that.
          </>
        )}
      </p>
    </article>
  )
}

const BLANK: Campaign = {
  id: '', name: '', itemIds: [], discount: { kind: 'percent', pct: 10 },
  upliftPct: 20, commissionPct: 0, note: '',
}

/** Create or edit. The figures update as you type, because they are
 *  computed rather than saved. */
function CampaignEditor({
  initial, menu, onSave, onCancel,
}: {
  initial: Campaign
  menu: MenuItem[]
  onSave: (c: Campaign) => void
  onCancel: () => void
}) {
  const [c, setC] = useState<Campaign>(initial)
  const r = campaignMargin(c, menu)
  const be = breakEvenUplift(c, menu)
  const ahead = r.marginChange >= 0

  const toggle = (id: string) =>
    setC({ ...c, itemIds: c.itemIds.includes(id) ? c.itemIds.filter((x) => x !== id) : [...c.itemIds, id] })

  return (
    <form
      className="pg__campEdit"
      onSubmit={(e) => {
        e.preventDefault()
        onSave({ ...c, id: c.id || `c-${Date.now()}`, name: c.name.trim() || 'Untitled campaign' })
      }}
    >
      <div className="pg__campRow">
        <label className="pg__field pg__field--wide">
          <span>Name</span>
          <input value={c.name} onChange={(e) => setC({ ...c, name: e.target.value })} placeholder="Happy hour" />
        </label>
        <label className="pg__field">
          <span>Extra units you expect</span>
          <input
            type="number" min={0} step={5} value={c.upliftPct}
            onChange={(e) => setC({ ...c, upliftPct: Math.max(0, Number(e.target.value) || 0) })}
          />
        </label>
      </div>

      <div className="pg__campRow">
        <div className="pg__field">
          <span>Discount</span>
          <div className="rev__filters">
            <button
              type="button"
              className={`rev__pill${c.discount.kind === 'percent' ? ' is-on' : ''}`}
              aria-pressed={c.discount.kind === 'percent'}
              onClick={() => setC({ ...c, discount: { kind: 'percent', pct: 20 } })}
            >
              Percent off
            </button>
            <button
              type="button"
              className={`rev__pill${c.discount.kind === 'price' ? ' is-on' : ''}`}
              aria-pressed={c.discount.kind === 'price'}
              onClick={() => setC({ ...c, discount: { kind: 'price', price: 4.5 } })}
            >
              Set a price
            </button>
          </div>
        </div>
        <label className="pg__field">
          <span>{c.discount.kind === 'percent' ? 'Per cent off' : 'Price each'}</span>
          <input
            type="number" min={0} step={c.discount.kind === 'percent' ? 5 : 0.5}
            value={c.discount.kind === 'percent' ? c.discount.pct : c.discount.price}
            onChange={(e) => {
              const v = Math.max(0, Number(e.target.value) || 0)
              setC({ ...c, discount: c.discount.kind === 'percent' ? { kind: 'percent', pct: v } : { kind: 'price', price: v } })
            }}
          />
        </label>
        <label className="pg__field">
          <span>Platform commission</span>
          <input type="number" value={0} disabled title="No deal platform is connected, so there is no rate to charge" />
        </label>
      </div>

      <fieldset className="pg__campScope">
        <legend>
          Runs on {c.itemIds.length ? `${c.itemIds.length} item${c.itemIds.length === 1 ? '' : 's'}` : 'the whole menu'}
        </legend>
        {menu.map((m) => (
          <label key={m.id} className={`pg__chip${c.itemIds.includes(m.id) ? ' is-on' : ''}`}>
            <input type="checkbox" checked={c.itemIds.includes(m.id)} onChange={() => toggle(m.id)} />
            {m.name}
            <span className="pg__chipPrice">
              {c.itemIds.includes(m.id) ? money(promoPrice(m, c.discount)) : money(m.price)}
            </span>
          </label>
        ))}
      </fieldset>

      <label className="pg__field pg__field--wide">
        <span>Note</span>
        <input value={c.note} onChange={(e) => setC({ ...c, note: e.target.value })} placeholder="Why you are running it" />
      </label>

      {/* Live, because it is computed from the fields above rather than
          saved and read back. */}
      <div className="pg__campPreview" data-ahead={ahead}>
        <Figure label="Net margin" value={money0(r.netMargin)} />
        <Figure label="Against doing nothing" value={signed(r.marginChange)} tone={ahead ? 'up' : 'down'} />
        <Figure label="Breaks even at" value={be === null ? 'never' : `${be}%`} />
      </div>

      <div className="pg__campEditActions">
        <button type="submit" className="task__cta">Save campaign</button>
        <button type="button" className="task__open" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  )
}

export function Campaigns({ menu }: { menu: MenuItem[] }) {
  const [list, setList] = useState<Campaign[]>(CAMPAIGNS)
  const [editing, setEditing] = useState<Campaign | null>(null)

  return (
    <>
      <div className="pg__rangeRow">
        <h3 className="pg__head pg__head--inline">Campaigns</h3>
        {!editing && (
          <button type="button" className="rev__pill" onClick={() => setEditing(BLANK)}>
            New campaign
          </button>
        )}
      </div>

      <p className="pg__lede pg__campLede">
        What a promotion is worth, computed from the menu above. Revenue at promo
        pricing, less the cost of the goods you actually sell, less any platform
        commission. The extra units are your assumption, not a forecast: nothing
        here predicts demand.
      </p>

      {editing ? (
        <CampaignEditor
          initial={editing}
          menu={menu}
          onCancel={() => setEditing(null)}
          onSave={(c) => {
            setList((l) => (l.some((x) => x.id === c.id) ? l.map((x) => (x.id === c.id ? c : x)) : [...l, c]))
            setEditing(null)
          }}
        />
      ) : (
        <div className="pg__camps">
          {list.map((c) => (
            <CampaignCard
              key={c.id}
              campaign={c}
              menu={menu}
              onEdit={() => setEditing(c)}
              onRemove={() => setList((l) => l.filter((x) => x.id !== c.id))}
            />
          ))}
          {list.length === 0 && (
            <p className="pg__note">No campaigns. The button above starts one.</p>
          )}
        </div>
      )}
    </>
  )
}

/* ------------------------------------------------------------------ *
 * Deal platforms
 * ------------------------------------------------------------------ */

/** Named, and honest about the fact that none of them is connected. */
export function DealHooks() {
  return (
    <>
      <h3 className="pg__head">Push a deal out</h3>
      <ul className="pg__deals">
        {DEAL_PLATFORMS.map((p) => (
          <li key={p.id}>
            <span className="pg__dealName">{p.name}</span>
            <span className="pg__dealWhat">{p.what}</span>
            <button
              type="button"
              className="task__open"
              disabled={!p.connected}
              title={`${p.name} is not connected, so there is nowhere to push a campaign yet`}
            >
              Send to {p.name}
              <span className="task__openWhy">not connected</span>
            </button>
          </li>
        ))}
      </ul>
      <p className="pg__note">
        None of these is connected. Each one needs an approved app, an API client
        and somewhere to sync from, which is its own piece of work per platform.
        Until then the commission line in every campaign above stays at zero,
        because there is no rate to read and inventing one would put a made-up
        number in the middle of a real calculation.
      </p>
    </>
  )
}

export { MENU as INITIAL_MENU }
