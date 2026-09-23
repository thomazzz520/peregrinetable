import { marginPct, menuDay, unitMargin, type MenuItem } from './menu'
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
