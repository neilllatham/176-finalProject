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

function IconHelp({ className = '' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" width="18" height="18" aria-hidden>
      <path
        fill="currentColor"
        d="M11 17h2v2h-2v-2zm1-13a4 4 0 013.9 5.1l-1 .3A3 3 0 009 13H7a5 5 0 019.3-3.2 2 2 0 001.9-4.3A6 6 0 008 17h2a4 4 0 014-7z"
      />
    </svg>
  )
}

function parseMoney(s) {
  if (s === '' || s === null || s === undefined) return 0
  const n = Number(String(s).replace(/,/g, '').trim())
  return Number.isFinite(n) ? n : 0
}

function parsePercent(s) {
  if (s === '' || s === null || s === undefined) return 0
  const n = Number(String(s).trim())
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

/** Cumulative ROI curve knots; t = fractional years elapsed (0 start, 1–5 year-ends). */
function buildRoiCurve(rows, annualBenefits) {
  const points = [{ t: 0, cumulativeCost: 0, cumulativeBenefit: 0 }]
  for (const r of rows) {
    points.push({
      t: r.year,
      cumulativeCost: r.cumulativeCost,
      cumulativeBenefit: annualBenefits * r.year,
    })
  }
  return points
}

/**
 * First recovery break-even along piecewise-linear curve (start at t=0, then year-end knots).
 * Chooses the earliest crossing where cumulative benefits recover from underwater (gap < 0) to parity.
 */
function findRoiBreakeven(curvePoints) {
  const eps = 1e-6
  let earliest = null
  for (let i = 0; i < curvePoints.length - 1; i++) {
    const p0 = curvePoints[i]
    const p1 = curvePoints[i + 1]
    const g0 = p0.cumulativeBenefit - p0.cumulativeCost
    const g1 = p1.cumulativeBenefit - p1.cumulativeCost
    const denom = g1 - g0
    if (Math.abs(denom) < 1e-12 || g1 <= g0 + eps) continue
    const u = -g0 / denom
    if (u <= eps || u > 1 + eps) continue
    if (!(g0 < -eps && g1 >= -eps)) continue
    const tStar = p0.t + Math.min(1, Math.max(0, u)) * (p1.t - p0.t)
    const amt =
      p0.cumulativeBenefit +
      Math.min(1, Math.max(0, u)) *
        (p1.cumulativeBenefit - p0.cumulativeBenefit)
    if (!earliest || tStar < earliest.tStar - eps) earliest = { tStar, amount: amt }
  }
  return earliest
}

function RoiBreakevenChart({ curvePoints, breakeven }) {
  const w = 640
  const h = 320
  const padL = 56
  const padR = 28
  const padT = 28
  const padB = 54
  const innerW = w - padL - padR
  const innerH = h - padT - padB
  const axisTMin = 0
  const axisTMax = 5

  const maxValue = curvePoints.reduce(
    (m, p) =>
      Math.max(m, p.cumulativeCost, p.cumulativeBenefit, breakeven?.amount ?? 0),
    1,
  )
  const maxY = maxValue <= 0 ? 1 : maxValue * 1.08

  function xAt(tVal) {
    const u = (tVal - axisTMin) / (axisTMax - axisTMin)
    return padL + u * innerW
  }
  function yAt(vVal) {
    return padT + innerH * (1 - Math.min(Math.max(vVal / maxY, 0), 1))
  }

  const pathCost =
    curvePoints.map((p) => `${xAt(p.t)},${yAt(p.cumulativeCost)}`).join(' ')
  const pathBen =
    curvePoints.map((p) => `${xAt(p.t)},${yAt(p.cumulativeBenefit)}`).join(' ')

  const crossX = breakeven ? xAt(breakeven.tStar) : null
  const crossY = breakeven ? yAt(breakeven.amount) : null

  return (
    <svg
      className="roi-breakeven-chart"
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label="ROI break-even: cumulative cost versus cumulative benefit over time"
    >
      <title>Cumulative migration cost versus cumulative benefits</title>
      {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
        const vk = frac * maxY
        const y = padT + innerH * (1 - frac)
        return (
          <g key={frac}>
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
              {vk >= 1_000_000
                ? `${(vk / 1_000_000).toFixed(1)}M`
                : vk >= 1000
                  ? `${Math.round(vk / 1000)}k`
                  : Math.round(vk)}
            </text>
          </g>
        )
      })}
      {[0, 1, 2, 3, 4, 5].map((tick) => {
        const xv = xAt(tick)
        return (
          <g key={`tx-${tick}`}>
            <line
              x1={xv}
              y1={padT + innerH}
              x2={xv}
              y2={padT + innerH + 6}
              className="chart-axis-tick-line"
            />
            <text
              x={xv}
              y={h - padB + 34}
              textAnchor="middle"
              className="chart-axis-label chart-axis-year"
            >
              {tick === 0 ? 'Start' : `Year ${tick}`}
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
        Cumulative dollars (USD)
      </text>
      <polyline
        className="roi-line roi-line-benefit"
        points={pathBen}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <polyline
        className="roi-line roi-line-cost"
        points={pathCost}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {breakeven && crossX != null && crossY != null ? (
        <g aria-hidden="true">
          <line
            x1={crossX}
            y1={crossY}
            x2={crossX}
            y2={padT + innerH}
            className="breakeven-marker-line"
          />
          <circle
            cx={crossX}
            cy={crossY}
            r={5}
            className="breakeven-marker-dot"
          />
        </g>
      ) : null}
    </svg>
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
              Year {row.year}
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
        <h2 id="roi-panel-placeholder-heading" className="card-heading">
          Panel 2 (placeholder)
        </h2>
        <p className="card-lead">
          This workspace will host ROI and value analysis—scenario comparison,
          sensitivity views, and executive-ready summaries tied to the figures
          from Budget Planning and Cost Estimation.
        </p>
      </section>
    </main>
  )
}

function App() {
  const [activeView, setActiveView] = useState('home')

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
  const [annualOpexChangePct, setAnnualOpexChangePct] = useState('')
  const [annualCapexChangePct, setAnnualCapexChangePct] = useState('')
  const [annualDowntimeSavings, setAnnualDowntimeSavings] = useState('300000')
  const [annualProductivitySavings, setAnnualProductivitySavings] =
    useState('200000')
  const [annualDataCenterAvoided, setAnnualDataCenterAvoided] =
    useState('250000')

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

  const annualBenefits =
    parseMoney(annualDowntimeSavings) +
    parseMoney(annualProductivitySavings) +
    parseMoney(annualDataCenterAvoided)
  const totalBenefits5 = annualBenefits * 5

  const roiPct =
    totalCost5 === 0
      ? null
      : ((totalBenefits5 - totalCost5) / totalCost5) * 100

  const chartMaxSeries = rows.reduce((m, r) => {
    return Math.max(m, r.opex, r.capex, r.totalCost)
  }, 0)

  const roiCurve = useMemo(
    () => buildRoiCurve(rows, annualBenefits),
    [rows, annualBenefits],
  )

  const breakevenPoint = useMemo(() => {
    if (annualBenefits <= 0) return null
    return findRoiBreakeven(roiCurve)
  }, [roiCurve, annualBenefits])

  const breakevenExplanation = useMemo(() => {
    if (annualBenefits <= 0) {
      return {
        headline: null,
        body: 'Enter positive annual benefits to chart when cumulative value catches cumulative investment.',
      }
    }
    if (breakevenPoint) {
      return {
        headline: `${breakevenPoint.tStar.toFixed(2)} years from program start`,
        body: `The two cumulative curves intersect at about ${formatCurrency(breakevenPoint.amount)}. Interpolation is linear between year-end balances (start at $0 / $0, then each fiscal year-end).`,
      }
    }
    const last = roiCurve[roiCurve.length - 1]
    const lastGap = last.cumulativeBenefit - last.cumulativeCost
    const alwaysAhead = roiCurve.every(
      (p) => p.t === 0 || p.cumulativeBenefit - p.cumulativeCost >= -1,
    )
    if (alwaysAhead && lastGap >= -1) {
      return {
        headline: 'No separate recovery crossing',
        body: 'Benefits meet or exceed costs at every year-end on this path—there is no underwater period to recover from.',
      }
    }
    return {
      headline: 'Not within five years',
      body: 'Cumulative costs remain ahead through Year 5 on this model. Raise annual benefits or lower spend to pull break-even left.',
    }
  }, [annualBenefits, breakevenPoint, roiCurve])

  function handleOpexChange(index, raw) {
    setOpexByYear((prev) => {
      const next = [...prev]
      next[index] = raw
      return next
    })
  }

  function handleCapexChange(index, raw) {
    setCapexByYear((prev) => {
      const next = [...prev]
      next[index] = raw
      return next
    })
  }

  function applyAnnualPercentages() {
    const rO = parsePercent(annualOpexChangePct) / 100
    const rC = parsePercent(annualCapexChangePct) / 100
    const baseO = parseMoney(opexByYear[0])
    const baseC = parseMoney(capexByYear[0])
    setOpexByYear(
      YEARS.map((_, i) =>
        String(Math.round(i === 0 ? baseO : baseO * (1 + rO) ** i))
      )
    )
    setCapexByYear(
      YEARS.map((_, i) =>
        String(Math.round(i === 0 ? baseC : baseC * (1 + rC) ** i))
      )
    )
  }

  const isHome = activeView === 'home'
  const isBudget = activeView === 'budget'
  const isRoi = activeView === 'roi'
  const topHeaderTitle =
    activeView === 'home'
      ? 'Technology Benefit Simulator'
      : activeView === 'budget'
        ? 'Budget Planning and Cost Estimation'
        : 'ROI and Value Analysis'

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
            <button
              type="button"
              className={`sidebar-nav-item${isBudget ? ' sidebar-nav-item-active' : ''}`}
              onClick={() => setActiveView('budget')}
            >
              <IconBudget className="sidebar-nav-svg" />
              <span className="sidebar-nav-label">
                Budget Planning and Cost Estimation
              </span>
            </button>
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
          </nav>
        </div>

        <div className="sidebar-footer">
          <p className="sidebar-footer-caption">Support</p>
          <button type="button" className="sidebar-footer-link sidebar-footer-link-soft">
            <IconHelp />
            Help Center
          </button>
          <button type="button" className="sidebar-footer-link sidebar-footer-link-soft">
            Feedback
          </button>
          <div className="sidebar-profile">
            <div className="sidebar-profile-avatar" aria-hidden>
              CL
            </div>
            <div className="sidebar-profile-meta">
              <span className="sidebar-profile-name">Claims Lead</span>
              <span className="sidebar-profile-email">
                casualty.claims@yourorg.com
              </span>
            </div>
          </div>
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
          Budget &amp; Cashflow
        </p>
        <p className="panel-subtitle">
          Casualty medical claims processing: estimate OpEx, CapEx, and Cash
          Flow for migration from legacy data centers to AWS.
        </p>
      </header>

      <section className="panel-card" aria-labelledby="inputs-heading">
        <h2 id="inputs-heading" className="card-heading">
          Yearly OpEx &amp; CapEx
        </h2>
        <p className="card-lead">
          Enter planned operating and capital spend for each fiscal year (USD).
        </p>
        <div className="year-inputs-table-wrap">
          <table className="year-inputs-table">
            <thead>
              <tr>
                <th scope="col">Year</th>
                <th scope="col">OpEx ($)</th>
                <th scope="col">CapEx ($)</th>
              </tr>
            </thead>
            <tbody>
              {YEARS.map((y, i) => (
                <tr key={y}>
                  <th scope="row">{y}</th>
                  <td>
                    <input
                      type="text"
                      inputMode="decimal"
                      className="field field-money"
                      value={opexByYear[i]}
                      onChange={(e) => handleOpexChange(i, e.target.value)}
                      aria-label={`Year ${y} OpEx in dollars`}
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      inputMode="decimal"
                      className="field field-money"
                      value={capexByYear[i]}
                      onChange={(e) => handleCapexChange(i, e.target.value)}
                      aria-label={`Year ${y} CapEx in dollars`}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel-card" aria-labelledby="pct-heading">
        <h2 id="pct-heading" className="card-heading">
          Optional annual change (%)
        </h2>
        <p className="card-lead">
          Compound percentage growth applied from Year 1 through Year 5.
          Replaces Years 2–5 when you apply; edit Year 1 first if needed.
        </p>
        <div className="pct-row">
          <label className="field-label">
            <span>Annual OpEx change (%)</span>
            <input
              type="text"
              inputMode="decimal"
              className="field field-pct"
              value={annualOpexChangePct}
              onChange={(e) => setAnnualOpexChangePct(e.target.value)}
              placeholder="e.g. 5"
            />
          </label>
          <label className="field-label">
            <span>Annual CapEx change (%)</span>
            <input
              type="text"
              inputMode="decimal"
              className="field field-pct"
              value={annualCapexChangePct}
              onChange={(e) => setAnnualCapexChangePct(e.target.value)}
              placeholder="e.g. -10"
            />
          </label>
          <button
            type="button"
            className="btn-primary"
            onClick={applyAnnualPercentages}
          >
            Apply to Years 2–5
          </button>
        </div>
      </section>

      <section className="panel-card" aria-labelledby="roi-inputs-heading">
        <h2 id="roi-inputs-heading" className="card-heading">
          ROI assumptions (annual benefit)
        </h2>
        <p className="card-lead">
          Expected recurring benefit after migration — scaled linearly across
          five years.
        </p>
        <div className="assumptions-grid">
          <label className="field-label">
            <span>Annual downtime savings ($)</span>
            <input
              type="text"
              inputMode="decimal"
              className="field field-money"
              value={annualDowntimeSavings}
              onChange={(e) => setAnnualDowntimeSavings(e.target.value)}
            />
          </label>
          <label className="field-label">
            <span>Annual productivity savings ($)</span>
            <input
              type="text"
              inputMode="decimal"
              className="field field-money"
              value={annualProductivitySavings}
              onChange={(e) => setAnnualProductivitySavings(e.target.value)}
            />
          </label>
          <label className="field-label">
            <span>Annual data center cost avoided ($)</span>
            <input
              type="text"
              inputMode="decimal"
              className="field field-money"
              value={annualDataCenterAvoided}
              onChange={(e) => setAnnualDataCenterAvoided(e.target.value)}
            />
          </label>
        </div>
      </section>

      <section className="summary-strip" aria-label="Five-year summary">
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
        <div className="summary-tile summary-tile-positive">
          <span className="summary-label">Total 5-yr benefits</span>
          <span className="summary-value">{formatCurrency(totalBenefits5)}</span>
        </div>
        <div className="summary-tile summary-tile-roi">
          <span className="summary-label">ROI</span>
          <span className="summary-value">
            {roiPct === null ? '—' : `${roiPct >= 0 ? '+' : ''}${roiPct.toFixed(1)}%`}
          </span>
        </div>
      </section>

      <section className="panel-card" aria-labelledby="cashflow-heading">
        <h2 id="cashflow-heading" className="card-heading">
          Cash flow
        </h2>
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
      </section>

      <section className="panel-card" aria-labelledby="chart-heading">
        <h2 id="chart-heading" className="card-heading">
          Cost by year
        </h2>
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
      </section>

      <section className="panel-card" aria-labelledby="breakeven-heading">
        <h2 id="breakeven-heading" className="card-heading">
          ROI break-even
        </h2>
        <p className="card-lead">
          Cumulative migration spend versus cumulative benefits (equal annual
          savings each year). Break-even is the first time benefits catch costs
          after deployment drags the net position underwater—assuming straight
          lines between year-end balances.
        </p>
        <div className="chart-legend">
          <span className="legend-item">
            <span className="legend-line legend-line-benefit" /> Cumulative
            benefits
          </span>
          <span className="legend-item">
            <span className="legend-line legend-line-cost" /> Cumulative cost
          </span>
          {breakevenPoint ? (
            <span className="legend-item">
              <span className="legend-line legend-line-breakeven" /> Break-even
            </span>
          ) : null}
        </div>
        <RoiBreakevenChart
          curvePoints={roiCurve}
          breakeven={breakevenPoint}
        />
        <div className="breakeven-callout" role="status">
          {breakevenExplanation.headline ? (
            <p className="breakeven-callout-head">
              {breakevenExplanation.headline}
            </p>
          ) : null}
          <p className="breakeven-callout-body">{breakevenExplanation.body}</p>
        </div>
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
        </div>
      </div>
    </div>
  )
}

export default App
