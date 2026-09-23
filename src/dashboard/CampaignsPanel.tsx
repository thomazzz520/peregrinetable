import { useState } from 'react'
import {
  DEAL_PLATFORMS,
  breakEvenUplift,
  campaignMargin,
  promoPrice,
  type Campaign,
  type MenuItem,
} from './menu'
import { CAMPAIGNS_ARE_LOCAL_ONLY, useCampaigns, type StoredCampaign } from './campaignStore'
import { COSTS } from './data'

const money = (n: number) =>
  '$' + n.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const money0 = (n: number) => '$' + Math.round(n).toLocaleString()
const signed = (n: number) => (n >= 0 ? '+' : '−') + money(Math.abs(n))
const when = (iso: string) =>
  new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })

function Figure({ label, value, tone }: { label: string; value: string; tone?: 'up' | 'down' }) {
  return (
    <div className="pg__campFig">
      <span className={`pg__campFigN${tone ? ` is-${tone}` : ''}`}>{value}</span>
      <span className="pg__campFigL">{label}</span>
    </div>
  )
}

function CampaignCard({
  campaign, menu, onEdit, onRemove,
}: {
  campaign: StoredCampaign
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
        {campaign.seeded && <span className="pg__campSeed">example</span>}
        <span className="pg__campWhen">{when(campaign.createdAt)}</span>
        <span className="pg__campActions">
          <button type="button" className="pg__campBtn" onClick={onEdit}>Edit</button>
          <button type="button" className="pg__campBtn" onClick={onRemove}>Remove</button>
        </span>
      </header>

      {campaign.note && <p className="pg__campNote">{campaign.note}</p>}

      <div className="pg__campFigs">
        <Figure label="Net margin" value={money0(r.netMargin)} />
        <Figure label="Against doing nothing" value={signed(r.marginChange)} tone={ahead ? 'up' : 'down'} />
        <Figure label="Revenue" value={money0(r.promoRevenue)} />
        <Figure label="Units" value={String(r.promoUnits)} />
      </div>

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

/** Named, and honest that none of them is connected. */
function DealHooks() {
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

/**
 * Campaigns, as their own section.
 *
 * They were a block inside the revenue panel, which is why the list could
 * not outlive it. A section of its own owns the list, and the list is
 * stored rather than held in a component that unmounts.
 */
export default function CampaignsPanel({ menu }: { menu: MenuItem[] }) {
  const { list, save, remove } = useCampaigns()
  const [editing, setEditing] = useState<Campaign | null>(null)

  const rent = COSTS.find((c) => c.name === 'Rent')?.amt ?? 0
  const totals = list.reduce(
    (a, c) => {
      const r = campaignMargin(c, menu)
      return { change: a.change + r.marginChange, ahead: a.ahead + (r.marginChange >= 0 ? 1 : 0) }
    },
    { change: 0, ahead: 0 },
  )

  return (
    <div className="pg pg--revenue">
      <Stats
        change={totals.change}
        count={list.length}
        ahead={totals.ahead}
        rent={rent}
      />

      <p className="pg__lede">
        What a promotion is worth, computed from the menu. Revenue at promo
        pricing, less the cost of the goods you actually sell, less any platform
        commission. The extra units are your assumption, not a forecast: nothing
        here predicts demand.
      </p>

      <div className="pg__rangeRow">
        <h3 className="pg__head pg__head--inline">
          {list.length} campaign{list.length === 1 ? '' : 's'}
        </h3>
        {!editing && (
          <button type="button" className="rev__pill" onClick={() => setEditing(BLANK)}>
            New campaign
          </button>
        )}
      </div>

      {editing ? (
        <CampaignEditor
          initial={editing}
          menu={menu}
          onCancel={() => setEditing(null)}
          onSave={(c) => { save(c); setEditing(null) }}
        />
      ) : (
        <div className="pg__camps">
          {list.map((c) => (
            <CampaignCard
              key={c.id}
              campaign={c}
              menu={menu}
              onEdit={() => setEditing(c)}
              onRemove={() => remove(c.id)}
            />
          ))}
          {list.length === 0 && (
            <p className="pg__note">
              No campaigns yet, not even the examples. The button above starts one.
            </p>
          )}
        </div>
      )}

      {CAMPAIGNS_ARE_LOCAL_ONLY && (
        <p className="pg__note">
          Campaigns are kept in this browser. They survive a reload and a closed
          tab, which the old list did not: it lived inside the revenue panel and
          was discarded every time that panel closed. They do not travel, though.
          Another browser or a cleared cache starts again from the two examples,
          because there is no account and no server behind this yet.
        </p>
      )}

      <DealHooks />
    </div>
  )
}

function Stats({ change, count, ahead, rent }: { change: number; count: number; ahead: number; rent: number }) {
  return (
    <div className="pg__stats">
      <div className="pg__stat">
        <div className={`pg__statN${change >= 0 ? ' is-accent' : ''}`}>{signed(change)}</div>
        <div className="pg__statL">All campaigns, a day</div>
      </div>
      <div className="pg__stat">
        <div className="pg__statN">{ahead} of {count}</div>
        <div className="pg__statL">Worth running</div>
      </div>
      <div className="pg__stat">
        <div className="pg__statN">{money0(rent)}</div>
        <div className="pg__statL">Rent a day</div>
      </div>
    </div>
  )
}
