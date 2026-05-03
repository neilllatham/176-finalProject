import { useMemo, useState } from 'react'
import './App.css'

const YEARS = [1, 2, 3, 4, 5]

/** Minimal inline icons for sidebar (Acme-style nav). */
function IconHome({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" width="22" height="22" aria-hidden>
      <path
        fill="currentColor"
        d="M10 19v-5h4v5h5v-7h3L12 3 2 12h3v7h5z"
      />
    </svg>
  )
}

function IconBudget({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" width="22" height="22" aria-hidden>
      <path
        fill="currentColor"
        d="M14 17H4v2h10v-2zm6-10H8v4h12V7zm-6 6H4v2h12v-2zm0-12h-8v6h12V7h-4V1zm-10 14H4v-2h2v2z"
      />
    </svg>
  )
}

function IconRoiValue({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" width="22" height="22" aria-hidden>
      <path
        fill="currentColor"
        d="M4 18h2V9H4v9zm4 0h2V5H8v13zm4 0h2v-7h-2v7zm4 0h2V9h-2v9z"
      />
    </svg>
  )
}

function IconGovernance({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" width="22" height="22" aria-hidden>
      <path
        fill="currentColor"
        d="M19 3h-4.18C14.4 1.84 13.3 1 12 1s-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm2 14H7v-2h7v2zm0-4H7v-2h7v2zm3.75-3.96l-1.41 1.41-3.54-3.54 1.41-1.41 2.13 2.12 4.24-4.24 1.41 1.41-5.24 5.25z"
      />
    </svg>
  )
}

function parseMoney(s) {
  if (s === '' || s === null || s === undefined) return 0
  const cleaned = String(s).replace(/[$,\s]/g, '').trim()
  if (cleaned === '') return 0
  const n = Number(cleaned)
  return Number.isFinite(n) ? n : 0
}

function formatCurrency(n) {
  if (!Number.isFinite(n)) return '—'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(Math.round(n))
}

/** Digits only for storing in controlled money fields. */
function normalizeMoneyDigits(raw) {
  return String(raw ?? '').replace(/\D/g, '')
}

/** Show $1,234 when idle; plain digits while the field is focused. */
function moneyFieldDisplay(stored, focusKey, fieldKey) {
  if (focusKey === fieldKey) return normalizeMoneyDigits(stored)
  if (stored === '' || stored === undefined || stored === null) return ''
  return formatCurrency(parseMoney(stored))
}

function CollapsibleNavHeader({
  titleId,
  title,
  titleClassName,
  defaultOpen = true,
  children,
}) {
  const [open, setOpen] = useState(defaultOpen)
  const panelId = `${titleId}-collapsible`
  return (
    <>
      <div className="nav-collapsible-header">
        <h2 id={titleId} className={titleClassName}>
          {title}
        </h2>
        <button
          type="button"
          className="nav-expand-btn"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls={panelId}
        >
          <span className="sr-only">
            {open ? 'Collapse section' : 'Expand section'}
          </span>
          <span className="nav-expand-btn-icon" aria-hidden>
            {open ? '−' : '+'}
          </span>
        </button>
      </div>
      <div id={panelId} hidden={!open} className="nav-collapsible-body">
        {children}
      </div>
    </>
  )
}

function GrowthChart({ rows, maxSeries }) {
  const w = 640
  const h = 300
  const padL = 56
  const padR = 24
  const padT = 28
  const padB = 52
  const innerW = w - padL - padR
  const innerH = h - padT - padB
  const maxY = Math.max(1, maxSeries)
  const groupW = innerW / rows.length
  const barW = groupW * 0.2
  const gap = groupW * 0.06
  const x0 =
    (_i) => padL + _i * groupW + groupW / 2 - (3 * barW + 2 * gap) / 2

  return (
    <svg
      className="cost-chart"
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label="Cost by year: OpEx, CapEx, and total"
    >
      <title>Annual cost breakdown by year</title>
      <defs>
        <linearGradient id="gradientOpex" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#14b8a6" />
          <stop offset="100%" stopColor="#0f766e" />
        </linearGradient>
        <linearGradient id="gradientCapex" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fb923c" />
          <stop offset="100%" stopColor="#c2410c" />
        </linearGradient>
        <linearGradient id="gradientTotal" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#1e40af" />
        </linearGradient>
      </defs>
      {[0, 0.25, 0.5, 0.75, 1].map((t) => {
        const y = padT + innerH * (1 - t)
        const tick = Math.round(maxY * t)
        return (
          <g key={t}>
            <line
              x1={padL}
              y1={y}
              x2={padL + innerW}
              y2={y}
              className="chart-grid-line"
            />
            <text
              x={padL - 8}
              y={y + 4}
              textAnchor="end"
              className="chart-axis-label"
            >
              {tick >= 1_000_000
                ? `${(tick / 1_000_000).toFixed(1)}M`
                : tick >= 1000
                  ? `${Math.round(tick / 1000)}k`
                  : tick}
            </text>
          </g>
        )
      })}
      {rows.map((row, i) => {
        const cx = x0(i)
        const bx = [cx - barW - gap, cx, cx + barW + gap]
        const vals = [
          { v: row.opex, fill: 'url(#gradientOpex)' },
          { v: row.capex, fill: 'url(#gradientCapex)' },
          { v: row.totalCost, fill: 'url(#gradientTotal)' },
        ]
        return (
          <g key={row.year}>
            {vals.map((item, bi) => {
              const hh = innerH * (item.v / maxY)
              return (
                <rect
                  key={bi}
                  x={bx[bi]}
                  y={padT + innerH - hh}
                  width={barW}
                  height={Math.max(0, hh)}
                  rx={2}
                  className="chart-bar"
                  fill={item.fill}
                />
              )
            })}
            <text
              x={cx}
              y={h - padB + 42}
              textAnchor="middle"
              className="chart-axis-label chart-axis-year"
            >
              Yr {row.year}
            </text>
          </g>
        )
      })}
      <text
        x={padL + innerW / 2}
        y={18}
        textAnchor="middle"
        className="chart-title"
      >
        Dollars (USD)
      </text>
    </svg>
  )
}

function LandingHome({ visible }) {
  return (
    <div
      className="landing-root"
      hidden={!visible}
      aria-hidden={!visible}
      style={{ display: visible ? 'block' : 'none' }}
    >
      <div className="landing-hero-card">
        <div className="landing-hero-intro">
          <p className="landing-welcome">Welcome</p>
          <h2 className="landing-title-dash">Technology Benefit Simulator</h2>
          <p className="landing-tagline">
            Model migration spend, recurring benefits, and break-even timing.
          </p>
        </div>
        <p className="landing-hint-soft">
          Open <strong>Budget Planning and Cost Estimation</strong> from the
          sidebar when you&apos;re ready to work the numbers.
        </p>
      </div>
    </div>
  )
}

function AppTopHeader({ showBack, title, onBackToHome }) {
  return (
    <header className="app-top-header">
      <div className="app-top-header-leading">
        {showBack ? (
          <button
            type="button"
            className="app-header-back-link"
            onClick={onBackToHome}
            aria-label="Back to overview"
          >
            ← Overview
          </button>
        ) : null}
        <h1 className="app-top-header-title">{title}</h1>
      </div>
    </header>
  )
}

function RoiValuePanel() {
  return (
    <main className="migration-panel">
      <header className="panel-header panel-header-context">
        <p className="migration-eyebrow">Cloud migration simulator</p>
        <p className="panel-title-context">ROI &amp; value drivers</p>
        <p className="panel-subtitle">
          Extend the budget model with deeper return-on-investment and business
          value narratives for leadership review.
        </p>
      </header>
      <section className="panel-card" aria-labelledby="roi-panel-placeholder-heading">
        <CollapsibleNavHeader
          titleId="roi-panel-placeholder-heading"
          titleClassName="card-heading"
          title="Panel 2 (placeholder)"
        >
          <p className="card-lead">
            This workspace will host ROI and value analysis—scenario comparison,
            sensitivity views, and executive-ready summaries tied to the figures
            from Budget Planning and Cost Estimation.
          </p>
        </CollapsibleNavHeader>
      </section>
    </main>
  )
}

function GovernanceCompliancePanel() {
  return (
    <main className="migration-panel">
      <header className="panel-header panel-header-context">
        <p className="migration-eyebrow">Cloud migration simulator</p>
        <p className="panel-title-context">Controls &amp; assurance</p>
        <p className="panel-subtitle">
          Track policies, audit readiness, and regulatory alignment for the
          casualty claims migration program.
        </p>
      </header>
      <section
        className="panel-card"
        aria-labelledby="governance-panel-placeholder-heading"
      >
        <CollapsibleNavHeader
          titleId="governance-panel-placeholder-heading"
          titleClassName="card-heading"
          title="Panel 3 (placeholder)"
        >
          <p className="card-lead">
            This workspace will host governance and compliance views—control
            matrices, evidence trails, and sign-off status linked to your
            migration milestones.
          </p>
        </CollapsibleNavHeader>
      </section>
    </main>
  )
}

function App() {
  const [activeView, setActiveView] = useState('home')
  const [moneyFocusKey, setMoneyFocusKey] = useState(null)
  const [budgetSidebarExpanded, setBudgetSidebarExpanded] = useState(true)

  const [opexByYear, setOpexByYear] = useState([
    '250000',
    '275000',
    '300000',
    '325000',
    '350000',
  ])
  const [capexByYear, setCapexByYear] = useState([
    '600000',
    '250000',
    '150000',
    '75000',
    '50000',
  ])
  const rows = useMemo(() => {
    const numericOpex = opexByYear.map(parseMoney)
    const numericCapex = capexByYear.map(parseMoney)
    return YEARS.reduce(
      (acc, y, idx) => {
        const opex = numericOpex[idx]
        const capex = numericCapex[idx]
        const totalCost = opex + capex
        const cumulativeCost = acc.cumulative + totalCost
        return {
          cumulative: cumulativeCost,
          rows: [
            ...acc.rows,
            {
              year: y,
              opex,
              capex,
              totalCost,
              cumulativeCost,
            },
          ],
        }
      },
      { cumulative: 0, rows: [] },
    ).rows
  }, [opexByYear, capexByYear])

  const totalOpex5 = rows.reduce((acc, r) => acc + r.opex, 0)
  const totalCapex5 = rows.reduce((acc, r) => acc + r.capex, 0)
  const totalCost5 = totalOpex5 + totalCapex5

  const chartMaxSeries = rows.reduce((m, r) => {
    return Math.max(m, r.opex, r.capex, r.totalCost)
  }, 0)

  function handleOpexChange(index, raw) {
    setOpexByYear((prev) => {
      const next = [...prev]
      next[index] = normalizeMoneyDigits(raw)
      return next
    })
  }

  function handleCapexChange(index, raw) {
    setCapexByYear((prev) => {
      const next = [...prev]
      next[index] = normalizeMoneyDigits(raw)
      return next
    })
  }

  const isHome = activeView === 'home'
  const isBudget = activeView === 'budget'
  const isRoi = activeView === 'roi'
  const isGovernance = activeView === 'governance'
  const topHeaderTitle =
    activeView === 'home'
      ? 'Technology Benefit Simulator'
      : activeView === 'budget'
        ? 'Budget Planning and Cost Estimation'
        : activeView === 'roi'
          ? 'ROI and Value Analysis'
          : 'Governance & Compliance'

  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="Primary navigation">
        <div className="sidebar-stack">
          <div className="sidebar-brand-row">
            <button
              type="button"
              className="sidebar-brand-hit"
              onClick={() => setActiveView('home')}
              aria-label="Benefit Simulator home"
            >
              <span className="sidebar-logo-mark" aria-hidden />
              <span className="sidebar-brand-text">Benefit Simulator</span>
            </button>
          </div>

          <nav className="sidebar-nav" aria-label="Panels">
            <p className="sidebar-nav-caption">Workspace</p>
            <button
              type="button"
              className={`sidebar-nav-item${isHome ? ' sidebar-nav-item-active' : ''}`}
              onClick={() => setActiveView('home')}
            >
              <IconHome className="sidebar-nav-svg" />
              <span className="sidebar-nav-label">Overview</span>
            </button>
            <div
              className={`sidebar-nav-budget-row${isBudget ? ' sidebar-nav-budget-row-active' : ''}`}
            >
              <button
                type="button"
                className="sidebar-nav-item sidebar-nav-item-main"
                onClick={() => setActiveView('budget')}
              >
                <IconBudget className="sidebar-nav-svg" />
                <span className="sidebar-nav-label">
                  Budget Planning and Cost Estimation
                </span>
              </button>
              {isBudget ? (
                <button
                  type="button"
                  className="nav-expand-btn nav-expand-btn-budget-row"
                  onClick={() =>
                    setBudgetSidebarExpanded((expanded) => !expanded)
                  }
                  aria-expanded={budgetSidebarExpanded}
                  aria-controls="sidebar-budget-panel"
                >
                  <span className="sr-only">
                    {budgetSidebarExpanded
                      ? 'Collapse budget inputs'
                      : 'Expand budget inputs'}
                  </span>
                  <span className="nav-expand-btn-icon" aria-hidden>
                    {budgetSidebarExpanded ? '−' : '+'}
                  </span>
                </button>
              ) : null}
            </div>
            {isBudget && budgetSidebarExpanded ? (
              <div
                id="sidebar-budget-panel"
                className="sidebar-budget-inputs"
                role="region"
                aria-labelledby="sidebar-opex-capex-heading"
              >
                <h2
                  id="sidebar-opex-capex-heading"
                  className="sidebar-budget-inputs-title"
                >
                  Yearly OpEx &amp; CapEx
                </h2>
                <p className="sidebar-budget-inputs-lead">
                  Planned spend by year (USD).
                </p>
                <div className="sidebar-year-table-wrap">
                  <table className="sidebar-year-grid-table">
                    <thead>
                      <tr>
                        <th
                          scope="col"
                          className="sidebar-year-th-corner"
                          aria-label="Fiscal year"
                        />
                        <th scope="col" className="sidebar-year-th-money">
                          OpEx ($)
                        </th>
                        <th scope="col" className="sidebar-year-th-money">
                          CapEx ($)
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {YEARS.map((y, i) => (
                        <tr key={y}>
                          <th scope="row" className="sidebar-year-th-year">
                            Yr {y}
                          </th>
                          <td className="sidebar-year-td-input">
                            <input
                              type="text"
                              inputMode="numeric"
                              className="field field-money field-money-sidebar"
                              value={moneyFieldDisplay(
                                opexByYear[i],
                                moneyFocusKey,
                                `opex-${i}`,
                              )}
                              onChange={(e) =>
                                handleOpexChange(i, e.target.value)
                              }
                              onFocus={() => setMoneyFocusKey(`opex-${i}`)}
                              onBlur={() => setMoneyFocusKey(null)}
                              aria-label={`Yr ${y} OpEx in dollars`}
                            />
                          </td>
                          <td className="sidebar-year-td-input">
                            <input
                              type="text"
                              inputMode="numeric"
                              className="field field-money field-money-sidebar"
                              value={moneyFieldDisplay(
                                capexByYear[i],
                                moneyFocusKey,
                                `capex-${i}`,
                              )}
                              onChange={(e) =>
                                handleCapexChange(i, e.target.value)
                              }
                              onFocus={() => setMoneyFocusKey(`capex-${i}`)}
                              onBlur={() => setMoneyFocusKey(null)}
                              aria-label={`Yr ${y} CapEx in dollars`}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}
            <button
              type="button"
              className={`sidebar-nav-item${isRoi ? ' sidebar-nav-item-active' : ''}`}
              onClick={() => setActiveView('roi')}
            >
              <IconRoiValue className="sidebar-nav-svg" />
              <span className="sidebar-nav-label">
                ROI and Value Analysis
              </span>
            </button>
            <button
              type="button"
              className={`sidebar-nav-item${isGovernance ? ' sidebar-nav-item-active' : ''}`}
              onClick={() => setActiveView('governance')}
            >
              <IconGovernance className="sidebar-nav-svg" />
              <span className="sidebar-nav-label">
                Governance &amp; Compliance
              </span>
            </button>
          </nav>
        </div>
      </aside>

      <div className="app-stage">
        <AppTopHeader
          showBack={!isHome}
          title={topHeaderTitle}
          onBackToHome={() => setActiveView('home')}
        />
        <div className="app-scroll">
          <LandingHome visible={isHome} />

        <div
          className="budget-route"
          id="budget-route"
          hidden={!isBudget}
          aria-hidden={!isBudget}
          style={{ display: isBudget ? 'block' : 'none' }}
        >
    <main className="migration-panel">
      <header className="panel-header panel-header-context">
        <p className="migration-eyebrow">Cloud migration simulator</p>
        <p className="panel-title-context">
          Opex and Capex Costs
        </p>
        <p className="panel-subtitle">
          Update sidebar inputs to refresh cost totals and charts.
        </p>
      </header>

      <section
        className="budget-nav-card"
        aria-labelledby="budget-totals-heading"
      >
        <CollapsibleNavHeader
          titleId="budget-totals-heading"
          titleClassName="budget-nav-collapsible-title"
          title="Five-year cost totals"
        >
          <div
            className="summary-strip summary-strip-top-cost summary-strip-embedded"
            aria-label="Five-year OpEx, CapEx, and total cost"
          >
            <div className="summary-tile">
              <span className="summary-label">Total 5-yr OpEx</span>
              <span className="summary-value">{formatCurrency(totalOpex5)}</span>
            </div>
            <div className="summary-tile">
              <span className="summary-label">Total 5-yr CapEx</span>
              <span className="summary-value">{formatCurrency(totalCapex5)}</span>
            </div>
            <div className="summary-tile summary-tile-accent">
              <span className="summary-label">Total 5-yr cost</span>
              <span className="summary-value">{formatCurrency(totalCost5)}</span>
            </div>
          </div>
        </CollapsibleNavHeader>
      </section>

      <section className="panel-card" aria-labelledby="chart-heading">
        <CollapsibleNavHeader
          titleId="chart-heading"
          titleClassName="card-heading"
          title="Cost by year"
        >
          <p className="card-lead">
            Grouped comparison: operating expense, capital expense, and total
            annual cost.
          </p>
          <div className="chart-legend">
            <span className="legend-item">
              <span className="legend-swatch legend-swatch-opex" /> OpEx
            </span>
            <span className="legend-item">
              <span className="legend-swatch legend-swatch-capex" /> CapEx
            </span>
            <span className="legend-item">
              <span className="legend-swatch legend-swatch-total" /> Total cost
            </span>
          </div>
          <GrowthChart rows={rows} maxSeries={chartMaxSeries} />
        </CollapsibleNavHeader>
      </section>

      <section className="panel-card" aria-labelledby="cashflow-heading">
        <CollapsibleNavHeader
          titleId="cashflow-heading"
          titleClassName="card-heading"
          title="Cash flow"
        >
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">Year</th>
                  <th scope="col">OpEx</th>
                  <th scope="col">CapEx</th>
                  <th scope="col">Total cost</th>
                  <th scope="col">Cumulative cost</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.year}>
                    <td>{r.year}</td>
                    <td className="num">{formatCurrency(r.opex)}</td>
                    <td className="num">{formatCurrency(r.capex)}</td>
                    <td className="num num-strong">{formatCurrency(r.totalCost)}</td>
                    <td className="num">{formatCurrency(r.cumulativeCost)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CollapsibleNavHeader>
      </section>
    </main>
        </div>

        <div
          className="roi-route"
          id="roi-route"
          hidden={!isRoi}
          aria-hidden={!isRoi}
          style={{ display: isRoi ? 'block' : 'none' }}
        >
          <RoiValuePanel />
        </div>

        <div
          className="governance-route"
          id="governance-route"
          hidden={!isGovernance}
          aria-hidden={!isGovernance}
          style={{ display: isGovernance ? 'block' : 'none' }}
        >
          <GovernanceCompliancePanel />
        </div>
        </div>
      </div>
    </div>
  )
}

export default App
