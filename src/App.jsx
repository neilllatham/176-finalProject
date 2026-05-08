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

function IconPanels({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" width="22" height="22" aria-hidden>
      <path
        fill="currentColor"
        d="M3 3h8v8H3V3zm0 10h8v8H3v-8zm10-10h8v8h-8V3zm0 10h8v8h-8v-8z"
      />
    </svg>
  )
}

function IconRoiSensitivity({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" width="22" height="22" aria-hidden>
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 20h18M5 20V8m4 12V11m4 9V5m4 15v-7m4 7v-3"
      />
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeDasharray="2 2"
        d="M14 4v16"
      />
    </svg>
  )
}

function IconAdoption({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" width="22" height="22" aria-hidden>
      <path
        fill="currentColor"
        d="M3 3h2v16h16v2H3V3zm17 4l1.4 1.4-6 6-3-3-5 5L6 15l6-6 3 3 5-5z"
      />
    </svg>
  )
}

function IconDiffusion({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" width="22" height="22" aria-hidden>
      <path
        fill="currentColor"
        d="M12 4a8 8 0 100 16 8 8 0 000-16zm0 2a6 6 0 110 12 6 6 0 010-12zm0 2a4 4 0 100 8 4 4 0 000-8zm0 2a2 2 0 110 4 2 2 0 010-4z"
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

/**
 * Panel 7 ROI Sensitivity Explorer helpers.
 * AI uplift uses a Gaussian CDF (S-curve) per category when that category has investment
 * greater than $0; Availability multiplies Fraud & Data Mining, Reliability multiplies CX.
 * No investment in a line → no uplift for that line regardless of DQ sliders.
 * Data quality OpEx is $0 at 0% per axis; above 0%, each axis bills at
 * DATA_QUALITY_OPEX_SCALAR × (20k·e^(3.5·dq/100)) — presently 10% of that curve (~$23k/axis near 85%).
 */
/** Scalar on the reference exponential curve ($0 when slider is 0%); 10× former 1% tier. */
const DATA_QUALITY_OPEX_SCALAR = 0.1
const AI_BUDGET_CAP = 500000
const AI_MAX_UPLIFTS = { fraud: 350000, cx: 280000, dataMining: 220000 }
const AI_MAINTENANCE_RATE = 0.08
const HORIZON_YEARS = 5

/**
 * Shade band for cumulative ROI chart: YoY ΔROI = roi(t)-roi(t-1), roi(0)=0.
 * Negative cumulative ROI → under-investment; else optimal if ΔROI accelerates vs prior year.
 */
function classifyP7RoiYearZone(points, year) {
  const i = year - 1
  const pt = points[i]
  // #region agent log
  fetch('http://127.0.0.1:7428/ingest/4dc69b6e-6484-486d-bf3f-6ac3ac44fd9d',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'28975b'},body:JSON.stringify({sessionId:'28975b',location:'App.jsx:classifyP7RoiYearZone',message:'enter',data:{year,i,ptsLen:points.length,roiY1:points[0]?.roi,roiThis:pt?.roi,idxIMinus2:i-2,negIndexSample:points[i-2]?.roi},timestamp:Date.now(),hypothesisId:'H1'})}).catch(()=>{});
  // #endregion
  if (!pt) return 'under'
  if (pt.roi < 0) return 'under'
  if (year === 1) return 'optimal'
  const deltaCurr = pt.roi - points[i - 1].roi
  // #region agent log
  fetch('http://127.0.0.1:7428/ingest/4dc69b6e-6484-486d-bf3f-6ac3ac44fd9d',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'28975b'},body:JSON.stringify({sessionId:'28975b',location:'App.jsx:classifyP7RoiYearZone',message:'before deltaPrev',data:{year,i,willUsePointsAtIMinus2:i>=2,iMinus2:i-2},timestamp:Date.now(),hypothesisId:'H1'})}).catch(()=>{});
  // #endregion
  // YoY vs prior YoY gain; year 2 compares to Δ from implicit roi(0)=0 (not points[-1]).
  const deltaPrev =
    i >= 2 ? points[i - 1].roi - points[i - 2].roi : points[0].roi - 0
  // #region agent log
  fetch('http://127.0.0.1:7428/ingest/4dc69b6e-6484-486d-bf3f-6ac3ac44fd9d',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'28975b'},body:JSON.stringify({sessionId:'28975b',location:'App.jsx:classifyP7RoiYearZone',message:'deltaPrev ok',data:{year,i,deltaCurr,deltaPrev,runId:'post-fix'},timestamp:Date.now(),hypothesisId:'H1'})}).catch(()=>{});
  // #endregion
  return deltaCurr > deltaPrev ? 'optimal' : 'diminishing'
}

/** erf approximation from the Panel 7 spec (Abramowitz polynomial form, valid for z >= 0). */
function erfApprox(z) {
  const sign = z < 0 ? -1 : 1
  const az = Math.abs(z)
  const denom =
    1 +
    0.278393 * az +
    0.230389 * az * az +
    0.000972 * az * az * az +
    0.078108 * az * az * az * az
  return sign * (1 - 1 / Math.pow(denom, 4))
}

function aiGaussianCdf(x, mu = 100000, sigma = 80000) {
  return 0.5 * (1 + erfApprox((x - mu) / (sigma * Math.SQRT2)))
}

/** Annual OpEx for a single Data Quality axis (Availability OR Reliability). */
function dataQualityAnnualOpex(dqPct) {
  const u = Math.min(100, Math.max(0, dqPct))
  if (u <= 0) return 0
  return DATA_QUALITY_OPEX_SCALAR * (20000 * Math.exp((3.5 * u) / 100))
}

/**
 * 5-year cumulative ROI curve (year 1..5).
 * Year 0 holds the AI CapEx; each subsequent year adds baseline OpEx+CapEx,
 * AI maintenance OpEx (8% of total AI CapEx), and Data Quality OpEx for both axes.
 * Cumulative return adds each year: Budget Planning annual benefit (downtime +
 * productivity + data center avoided) plus AI uplift (FD + CX + DM).
 * Cumulative ROI at year t: (cumulativeBenefit - cumulativeCost) / cumulativeBenefit × 100.
 */
function buildAiCumulativeRoiCurve({
  fraudInvestment,
  cxInvestment,
  dataMiningInvestment,
  dataAvailability,
  dataReliability,
  baselineRows,
  baselineAnnualBenefit = 0,
}) {
  const migrationAnnual = Math.max(0, baselineAnnualBenefit)
  const baselineTotalCapex = baselineRows.reduce(
    (s, row) => s + (row?.capex ?? 0),
    0,
  )
  const baselineTotalOpex = baselineRows.reduce(
    (s, row) => s + (row?.opex ?? 0),
    0,
  )

  const rawTotal = fraudInvestment + cxInvestment + dataMiningInvestment
  const overCap = rawTotal > AI_BUDGET_CAP
  const scale = overCap && rawTotal > 0 ? AI_BUDGET_CAP / rawTotal : 1
  const fI = fraudInvestment * scale
  const cI = cxInvestment * scale
  const dI = dataMiningInvestment * scale
  const aiCapex = fI + cI + dI
  const availMult = Math.min(1, Math.max(0, dataAvailability / 100))
  const relMult = Math.min(1, Math.max(0, dataReliability / 100))

  // Availability / Reliability are multipliers only: no funded AI line → no uplift for that line.
  const fraudBenefit =
    fI <= 0
      ? 0
      : AI_MAX_UPLIFTS.fraud * aiGaussianCdf(fI) * availMult
  const cxBenefit =
    cI <= 0 ? 0 : AI_MAX_UPLIFTS.cx * aiGaussianCdf(cI) * relMult
  const dmBenefit =
    dI <= 0
      ? 0
      : AI_MAX_UPLIFTS.dataMining * aiGaussianCdf(dI) * availMult
  const annualAiBenefit = fraudBenefit + cxBenefit + dmBenefit

  const dqOpexAnnual =
    dataQualityAnnualOpex(dataAvailability) +
    dataQualityAnnualOpex(dataReliability)
  const aiMaintenanceAnnual = aiCapex * AI_MAINTENANCE_RATE

  let cumulativeCost = aiCapex
  let cumulativeBenefit = 0
  const points = []

  for (let t = 1; t <= HORIZON_YEARS; t++) {
    const baseline = baselineRows[t - 1] ?? { opex: 0, capex: 0 }
    const annualCost =
      baseline.opex + baseline.capex + aiMaintenanceAnnual + dqOpexAnnual
    cumulativeCost += annualCost
    cumulativeBenefit += annualAiBenefit + migrationAnnual
    const roi =
      cumulativeBenefit > 1e-9
        ? ((cumulativeBenefit - cumulativeCost) / cumulativeBenefit) * 100
        : 0
    points.push({ year: t, cumulativeBenefit, cumulativeCost, roi })
  }

  const aiMaintenanceFiveYr = aiMaintenanceAnnual * HORIZON_YEARS
  const dqSpendFiveYr = dqOpexAnnual * HORIZON_YEARS
  /** 5 yr AI maintenance (8%) + 5 yr Data Quality OpEx (both sliders); shown as Total AI OpEx. */
  const totalAiOpex5 = aiMaintenanceFiveYr + dqSpendFiveYr
  const totalAiCostY5 = aiCapex + totalAiOpex5
  const totalCostY5 =
    points.length > 0 ? points[points.length - 1].cumulativeCost : aiCapex

  return {
    points,
    totals: {
      aiCapex,
      baselineTotalCapex,
      baselineTotalOpex,
      aiMaintenanceFiveYr,
      dqSpendFiveYr,
      totalAiOpex5,
      totalAiCostY5,
      totalCostY5,
      annualAiBenefit,
      fraudBenefit,
      cxBenefit,
      dmBenefit,
      dqOpexAnnual,
      aiMaintenanceAnnual,
      rawTotal,
      overCap,
      scale,
    },
  }
}

/**
 * 12-month adoption + resistance curves:
 *   rate(t)       = maxAdoption * (1 - e^(-k * t))
 *   resistance(t) = baseResistance * e^(-decayRate * t)
 *   maxAdoption    = 0.4 + (training/40)*0.35 + (leadership/100)*0.25, capped at 1.0
 *   k              = 0.15 + (training/40)*0.2 + (leadership/100)*0.15
 *   baseResistance = 1 - (training/40)*0.5 - (leadership/100)*0.5, floored at 0
 *   decayRate      = 0.1 + (training/40)*0.15 + (leadership/100)*0.1
 */
function buildAdoptionCurve(trainingHours, leadershipEngagement) {
  const tFrac = Math.min(Math.max(trainingHours / 40, 0), 1)
  const lFrac = Math.min(Math.max(leadershipEngagement / 100, 0), 1)
  const maxAdoption = Math.min(1, 0.4 + tFrac * 0.35 + lFrac * 0.25)
  const k = 0.15 + tFrac * 0.2 + lFrac * 0.15
  const baseResistance = Math.max(0, 1 - tFrac * 0.5 - lFrac * 0.5)
  const decayRate = 0.1 + tFrac * 0.15 + lFrac * 0.1
  const points = []
  for (let t = 1; t <= 12; t++) {
    points.push({
      month: t,
      rate: maxAdoption * (1 - Math.exp(-k * t)),
      resistance: baseResistance * Math.exp(-decayRate * t),
    })
  }
  return { points, maxAdoption, k, baseResistance, decayRate }
}

/**
 * 24-month Bass Diffusion cumulative-adoption curve.
 *   p = (marketingSpend / 200) * marketMult.p
 *   q = (networkEffect * 0.5) * marketMult.q
 *   F(t) = (1 - e^(-(p+q)t)) / (1 + (q/p) * e^(-(p+q)t))
 *   newAdopters(t) = F(t) - F(t-1)
 * Guards the p ≈ 0 degenerate case (no innovators ⇒ no diffusion).
 */
const BASS_MARKET_MULTIPLIERS = {
  B2C: { p: 1.0, q: 1.0 },
  B2B: { p: 0.5, q: 0.4 },
}

function buildBassDiffusionCurve(marketingSpend, networkEffect, marketType) {
  const mult =
    BASS_MARKET_MULTIPLIERS[marketType] ?? BASS_MARKET_MULTIPLIERS.B2C
  const p = (Math.max(0, marketingSpend) / 200) * mult.p
  const q = (Math.max(0, Math.min(1, networkEffect)) * 0.5) * mult.q
  const sum = p + q
  const points = []
  let prevCumulative = 0
  for (let t = 1; t <= 24; t++) {
    let f
    if (sum <= 1e-9 || p <= 1e-9) {
      f = 0
    } else {
      const e = Math.exp(-sum * t)
      f = (1 - e) / (1 + (q / p) * e)
    }
    const cumulative = Math.min(1, Math.max(0, f))
    const newAdopters = Math.max(0, cumulative - prevCumulative)
    points.push({ month: t, cumulative, newAdopters })
    prevCumulative = cumulative
  }
  return { points, p, q, marketType: marketType ?? 'B2C' }
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

/* ─────────────────────────────────────────────
   PANEL 4 – Governance & SLA
───────────────────────────────────────────── */
function Panel4Governance({ slaUptime }) {
  const slaRows = [
    { metric: 'Target uptime SLA', value: '99.9%', note: `≤ 8.76 hrs downtime/yr · Simulator: ${slaUptime.toFixed(3)}% achieved` },
    { metric: 'Incident response (P1)', value: '< 15 min', note: 'Paging + war-room within 15 min' },
    { metric: 'Incident response (P2)', value: '< 1 hr', note: 'Business-hours acknowledgement' },
    { metric: 'Planned maintenance window', value: 'Sun 02:00–04:00 UTC', note: 'Monthly, 4-week notice required' },
    { metric: 'Change-freeze periods', value: 'Last 5 business days of quarter', note: 'No prod deploys without CAB approval' },
  ]

  const committeeItems = [
    { cadence: 'Monthly', body: 'Cloud Steering Committee', agenda: 'Budget actuals vs forecast, roadmap review, SLA scorecard' },
    { cadence: 'Weekly', body: 'Engineering Leadership Sync', agenda: 'Pipeline health, incident retrospectives, upcoming deployments' },
    { cadence: 'Quarterly', body: 'Executive Business Review', agenda: 'Strategic alignment, vendor performance, risk posture' },
  ]

  return (
    <main className="migration-panel" id="panel4-governance">
      <header className="panel-header panel-header-context">
        <p className="migration-eyebrow">Cloud management · Section 4</p>
        <p className="panel-title-context">Governance &amp; SLA Terms</p>
        <p className="panel-subtitle">
          Decision structures, committee cadences, and uptime commitments
          governing the cloud deployment programme.
        </p>
      </header>

      {/* Decision structure */}
      <section className="panel-card" aria-labelledby="p4-committee-heading">
        <h2 id="p4-committee-heading" className="card-heading">Decision Structure</h2>
        <p className="card-lead">
          Three governance bodies provide oversight at different cadences.
          The Cloud Steering Committee meets monthly and holds final authority
          over budget deviations and architecture decisions.
        </p>
        <div className="p4-committee-grid">
          {committeeItems.map((c) => (
            <div key={c.body} className="p4-committee-card">
              <span className="p4-cadence-badge">{c.cadence}</span>
              <p className="p4-committee-name">{c.body}</p>
              <p className="p4-committee-agenda">{c.agenda}</p>
            </div>
          ))}
        </div>
      </section>

      {/* SLA table */}
      <section className="panel-card" aria-labelledby="p4-sla-heading">
        <h2 id="p4-sla-heading" className="card-heading">SLA Terms</h2>
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">Metric</th>
                <th scope="col">Commitment</th>
                <th scope="col">Notes</th>
              </tr>
            </thead>
            <tbody>
              {slaRows.map((r) => (
                <tr key={r.metric}>
                  <td>{r.metric}</td>
                  <td className="num-strong">{r.value}</td>
                  <td className="p4-sla-note">{r.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  )
}

/* ─────────────────────────────────────────────
   PANEL 5 – CI/CD Pipeline Efficiency Simulator
───────────────────────────────────────────── */
function Panel5CiCd({ automationPct, setAutomationPct, teamSize, setTeamSize }) {
  // Model: baseline deploy frequency = 2/week per 5 devs
  // automation > 70% unlocks a step-change multiplier
  const baseFreq = (teamSize / 5) * 2
  const autoFactor = automationPct >= 70
    ? 1.5 + ((automationPct - 70) / 30) * 0.4
    : 0.6 + (automationPct / 70) * 0.4
  const deployFreq = Math.round(baseFreq * autoFactor * 10) / 10

  // Failure rate: baseline 25%, drops with automation
  const baseFailure = 25
  const failureReduction = automationPct >= 70
    ? 0.4 + ((automationPct - 70) / 30) * 0.2
    : (automationPct / 70) * 0.4
  const failureRate = Math.round(Math.max(3, baseFailure * (1 - failureReduction)) * 10) / 10

  let healthStatus
  let healthClass
  if (automationPct >= 70) {
    healthStatus = 'Healthy'
    healthClass = 'p5-health-green'
  } else if (automationPct >= 40) {
    healthStatus = 'Improving'
    healthClass = 'p5-health-amber'
  } else {
    healthStatus = 'At Risk'
    healthClass = 'p5-health-red'
  }

  return (
    <main className="migration-panel" id="panel5-cicd">
      <header className="panel-header panel-header-context">
        <p className="migration-eyebrow">Cloud management · Section 5</p>
        <p className="panel-title-context">CI/CD Pipeline Efficiency Simulator</p>
        <p className="panel-subtitle">
          Adjust automation coverage and team size to see how deployment
          frequency and failure rate change. Automation above 70 % unlocks
          a step-change improvement.
        </p>
      </header>

      <section className="panel-card" aria-labelledby="p5-controls-heading">
        <h2 id="p5-controls-heading" className="card-heading">Controls</h2>
        <div className="p5-sliders">
          <div className="p5-slider-row">
            <label className="p5-slider-label" htmlFor="p5-automation">
              Automation coverage: <strong>{automationPct}%</strong>
            </label>
            <input
              id="p5-automation"
              type="range"
              min="0"
              max="100"
              value={automationPct}
              onChange={(e) => setAutomationPct(Number(e.target.value))}
              className="p5-range"
              aria-label="Automation percentage"
            />
            <div className="p5-range-labels">
              <span>0%</span><span>50%</span><span>100%</span>
            </div>
          </div>
          <div className="p5-slider-row">
            <label className="p5-slider-label" htmlFor="p5-teamsize">
              Team size: <strong>{teamSize} engineers</strong>
            </label>
            <input
              id="p5-teamsize"
              type="range"
              min="2"
              max="50"
              value={teamSize}
              onChange={(e) => setTeamSize(Number(e.target.value))}
              className="p5-range"
              aria-label="Team size"
            />
            <div className="p5-range-labels">
              <span>2</span><span>26</span><span>50</span>
            </div>
          </div>
        </div>
      </section>

      <section className="panel-card" aria-labelledby="p5-results-heading">
        <h2 id="p5-results-heading" className="card-heading">Simulation Results</h2>
        <div className="p5-results-grid">
          <div className={`p5-result-tile ${healthClass}`}>
            <span className="p5-result-label">Deployment Health</span>
            <span className="p5-result-value p5-health-value">{healthStatus}</span>
            <span className="p5-result-sub">
              {automationPct >= 70
                ? `${automationPct}% automation → step-change unlocked`
                : `Raise automation above 70% to unlock step-change gains`}
            </span>
          </div>
          <div className="p5-result-tile p5-neutral">
            <span className="p5-result-label">Deploy Frequency</span>
            <span className="p5-result-value">{deployFreq}<span className="p5-result-unit">/wk</span></span>
            <span className="p5-result-sub">Across {teamSize}-person team</span>
          </div>
          <div className="p5-result-tile p5-neutral">
            <span className="p5-result-label">Failure Rate</span>
            <span className="p5-result-value">{failureRate}<span className="p5-result-unit">%</span></span>
            <span className="p5-result-sub">Change failure rate vs {baseFailure}% baseline</span>
          </div>
        </div>
      </section>

      {automationPct >= 70 && (
        <div className="p5-insight-banner" role="status">
          <strong>Key insight:</strong> With {automationPct}% automation, deploy frequency is roughly{' '}
          {Math.round(((deployFreq / (baseFreq * 0.6)) - 1) * 100)}% higher and failure rate is{' '}
          {Math.round((1 - failureRate / baseFailure) * 100)}% lower compared to a
          fully manual baseline.
        </div>
      )}
    </main>
  )
}

/* ─────────────────────────────────────────────
   PANEL 6 – Uptime vs Cost Simulator
───────────────────────────────────────────── */
function Panel6Uptime({ redundancy, setRedundancy, multiRegion, setMultiRegion }) {
  // Non-linear uptime model (each level of redundancy gives diminishing gains)
  const uptimeBase = [95.0, 99.0, 99.5, 99.95, 99.99, 99.999]
  const uptimeSingle = uptimeBase[redundancy - 1]
  const uptimeMulti  = Math.min(99.999, uptimeSingle + [0, 0.5, 0.3, 0.04, 0.009, 0.0009][redundancy - 1])
  const uptime = multiRegion ? uptimeMulti : uptimeSingle

  // Monthly cost model (non-linear — redundancy compounds)
  const baseCost = 5000
  const regionMult = multiRegion ? 1.85 : 1
  const monthlyCost = Math.round(baseCost * Math.pow(redundancy, 1.7) * regionMult)

  // Hours of downtime per year from uptime %
  const downtimeHrs = Math.round(((100 - uptime) / 100) * 8760 * 10) / 10

  const isOptimal = redundancy === 4
  const levels = [1, 2, 3, 4, 5]

  // Build curve data for all levels at current region setting
  const curvePoints = levels.map((lvl) => {
    const ut = multiRegion
      ? Math.min(99.999, uptimeBase[lvl - 1] + [0, 0.5, 0.3, 0.04, 0.009, 0.0009][lvl - 1])
      : uptimeBase[lvl - 1]
    const cost = Math.round(baseCost * Math.pow(lvl, 1.7) * regionMult)
    return { lvl, ut, cost }
  })

  // Simple SVG scatter/line chart
  const svgW = 560
  const svgH = 280
  const padL = 64
  const padR = 24
  const padT = 28
  const padB = 52
  const innerW = svgW - padL - padR
  const innerH = svgH - padT - padB
  const minCost = curvePoints[0].cost * 0.8
  const maxCost = curvePoints[4].cost * 1.1
  const minUt = 94
  const maxUt = 100

  function xAt(cost) {
    return padL + ((cost - minCost) / (maxCost - minCost)) * innerW
  }
  function yAt(ut) {
    return padT + innerH * (1 - (ut - minUt) / (maxUt - minUt))
  }

  const polyPoints = curvePoints
    .map((p) => `${xAt(p.cost)},${yAt(p.ut)}`)
    .join(' ')

  return (
    <main className="migration-panel" id="panel6-uptime">
      <header className="panel-header panel-header-context">
        <p className="migration-eyebrow">Cloud management · Section 6</p>
        <p className="panel-title-context">Uptime vs Cost Simulator</p>
        <p className="panel-subtitle">
          Adjust redundancy level and region mode to see real-time uptime
          and monthly cost trade-offs. Non-linear cost curve — optimal
          trade-off is typically at redundancy level 4.
        </p>
      </header>

      <section className="panel-card" aria-labelledby="p6-controls-heading">
        <h2 id="p6-controls-heading" className="card-heading">Controls</h2>
        <div className="p6-controls">
          <div className="p6-slider-row">
            <label className="p5-slider-label" htmlFor="p6-redundancy">
              Redundancy level: <strong>{redundancy}</strong>
              {isOptimal && <span className="p6-optimal-badge"> ★ Optimal</span>}
            </label>
            <input
              id="p6-redundancy"
              type="range"
              min="1"
              max="5"
              value={redundancy}
              onChange={(e) => setRedundancy(Number(e.target.value))}
              className="p5-range"
              aria-label="Redundancy level"
            />
            <div className="p5-range-labels">
              <span>1</span><span>2</span><span>3</span><span>4</span><span>5</span>
            </div>
          </div>
          <div className="p6-toggle-row">
            <span className="p5-slider-label">Region mode:</span>
            <button
              type="button"
              role="switch"
              aria-checked={multiRegion}
              className={`p6-toggle${multiRegion ? ' p6-toggle-on' : ''}`}
              onClick={() => setMultiRegion((v) => !v)}
            >
              <span className="p6-toggle-knob" />
            </button>
            <span className="p6-toggle-label">
              {multiRegion ? 'Multi-Region' : 'Single Region'}
            </span>
          </div>
        </div>
      </section>

      <section className="panel-card" aria-labelledby="p6-results-heading">
        <h2 id="p6-results-heading" className="card-heading">Trade-off Results</h2>
        <div className="p5-results-grid">
          <div className={`p5-result-tile ${isOptimal ? 'p5-health-green' : 'p5-neutral'}`}>
            <span className="p5-result-label">Monthly Cost</span>
            <span className="p5-result-value">
              ${monthlyCost.toLocaleString()}
            </span>
            <span className="p5-result-sub">
              {multiRegion ? 'Multi-Region' : 'Single Region'} · Level {redundancy}
            </span>
          </div>
          <div className={`p5-result-tile ${isOptimal ? 'p5-health-green' : 'p5-neutral'}`}>
            <span className="p5-result-label">Uptime</span>
            <span className="p5-result-value">{uptime.toFixed(3)}<span className="p5-result-unit">%</span></span>
            <span className="p5-result-sub">{downtimeHrs} hrs downtime/yr</span>
          </div>
          <div className={`p5-result-tile ${isOptimal ? 'p5-health-green' : 'p5-neutral'}`}>
            <span className="p5-result-label">Recommendation</span>
            <span className="p5-result-value p5-health-value" style={{ fontSize: '1rem' }}>
              {isOptimal ? 'Optimal' : redundancy < 4 ? 'Under-invested' : 'Diminishing returns'}
            </span>
            <span className="p5-result-sub">
              {isOptimal
                ? 'Level 4 delivers 99.95% uptime at the best cost/uptime ratio'
                : redundancy < 4
                ? 'Increase redundancy to improve reliability'
                : 'Marginal uptime gains cost significantly more'}
            </span>
          </div>
        </div>
      </section>

      {/* Uptime vs Cost curve */}
      <section className="panel-card" aria-labelledby="p6-chart-heading">
        <h2 id="p6-chart-heading" className="card-heading">Cost vs Uptime Curve</h2>
        <p className="card-lead">
          Non-linear cost curve across all five redundancy levels
          ({multiRegion ? 'Multi-Region' : 'Single Region'} mode).
          The selected level is highlighted.
        </p>
        <svg
          className="p6-chart"
          viewBox={`0 0 ${svgW} ${svgH}`}
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label="Cost vs uptime trade-off chart"
        >
          <title>Monthly cost vs uptime percentage across redundancy levels</title>
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((f) => {
            const ut = minUt + f * (maxUt - minUt)
            const y = yAt(ut)
            return (
              <g key={f}>
                <line x1={padL} y1={y} x2={padL + innerW} y2={y} className="chart-grid-line" />
                <text x={padL - 6} y={y + 4} textAnchor="end" className="chart-axis-label">
                  {ut.toFixed(1)}%
                </text>
              </g>
            )
          })}
          {/* Axis labels */}
          <text x={padL + innerW / 2} y={svgH - 6} textAnchor="middle" className="chart-axis-label">
            Monthly cost ($)
          </text>
          <text x={14} y={padT + innerH / 2} textAnchor="middle" className="chart-axis-label" transform={`rotate(-90 14 ${padT + innerH / 2})`}>
            Uptime %
          </text>
          {/* Curve */}
          <polyline
            points={polyPoints}
            fill="none"
            stroke="var(--dash-accent)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Dots */}
          {curvePoints.map((p) => {
            const isSelected = p.lvl === redundancy
            return (
              <g key={p.lvl}>
                <circle
                  cx={xAt(p.cost)}
                  cy={yAt(p.ut)}
                  r={isSelected ? 8 : 5}
                  fill={isSelected ? 'var(--dash-accent)' : 'white'}
                  stroke="var(--dash-accent)"
                  strokeWidth="2"
                />
                <text
                  x={xAt(p.cost)}
                  y={yAt(p.ut) - 13}
                  textAnchor="middle"
                  className="chart-axis-label"
                  fontWeight={isSelected ? '700' : '400'}
                >
                  L{p.lvl}
                </text>
              </g>
            )
          })}
          {/* Optimal callout */}
          {(() => {
            const opt = curvePoints[3]
            return (
              <text
                x={xAt(opt.cost) + 12}
                y={yAt(opt.ut)}
                className="chart-axis-label"
                fill="var(--dash-accent)"
                fontWeight="700"
              >
                ★ Optimal
              </text>
            )
          })()}
        </svg>
      </section>

      {isOptimal && (
        <div className="p5-insight-banner" role="status">
          <strong>Level 4 selected:</strong> 99.95% uptime at ~${monthlyCost.toLocaleString()}/month
          {multiRegion ? ' (Multi-Region)' : ' (Single Region)'}. This is the recommended
          balance between reliability and cost — Level 5 adds &lt;0.05% more uptime at
          significantly higher spend.
        </div>
      )}
    </main>
  )
}

/* ─────────────────────────────────────────────
   PANEL 7 – ROI Sensitivity Explorer
───────────────────────────────────────────── */
function P7sCumulativeRoiChart({ points }) {
  const w = 640
  const h = 320
  const padL = 64
  const padR = 28
  const padT = 28
  const padB = 54
  const innerW = w - padL - padR
  const innerH = h - padT - padB

  const roiValues = points.map((p) => p.roi)
  const rawMin = Math.min(0, ...roiValues)
  const rawMax = Math.max(0, ...roiValues)
  const span = Math.max(rawMax - rawMin, 1)
  const NICE = [10, 25, 50, 100, 200, 500, 1000]
  const step = NICE.find((s) => span / s <= 6) ?? 1000
  const yMin = Math.floor(rawMin / step) * step
  const yMax = Math.ceil(rawMax / step) * step
  const yRange = Math.max(yMax - yMin, 1)

  const yTicks = []
  for (let v = yMin; v <= yMax + 1e-9; v += step) yTicks.push(v)

  function xAt(year) {
    return padL + ((year - 1) / (HORIZON_YEARS - 1)) * innerW
  }
  function yAt(roi) {
    return padT + innerH * (1 - (roi - yMin) / yRange)
  }

  const polyline = points.map((p) => `${xAt(p.year)},${yAt(p.roi)}`).join(' ')
  const breakevenY = yAt(0)
  const horizonX = xAt(HORIZON_YEARS)

  const zoneBands = []
  const zoneClasses = {
    under: 'p7s-zone-under',
    optimal: 'p7s-zone-optimal',
    diminishing: 'p7s-zone-diminishing',
  }
  const zoneLabels = {
    under: 'Under-Investment',
    optimal: 'Optimal',
    diminishing: 'Diminishing',
  }
  for (let y = 1; y <= HORIZON_YEARS; y++) {
    const xl =
      y === 1 ? padL : (xAt(y - 1) + xAt(y)) / 2
    const xr =
      y === HORIZON_YEARS
        ? padL + innerW
        : (xAt(y) + xAt(y + 1)) / 2
    const zone = classifyP7RoiYearZone(points, y)
    zoneBands.push({ y, xl, xr, zone })
  }

  return (
    <svg
      className="p7s-chart"
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label="ROI break-even: cumulative ROI vs. 0% reference, Budget Planning savings and AI uplift vs. cumulative cost"
    >
      <title>
        ROI break-even: cumulative return vs. cumulative cost (0% = break-even)
      </title>

      <g className="p7s-zone-layer" aria-hidden="true">
        {zoneBands.map(({ y, xl, xr, zone }) => (
          <g key={`z-${y}`}>
            <rect
              x={xl}
              y={padT}
              width={xr - xl}
              height={innerH}
              className={zoneClasses[zone]}
            />
            <text
              x={xl + (xr - xl) / 2}
              y={padT + 16}
              textAnchor="middle"
              className="p7s-zone-label"
            >
              {zoneLabels[zone]}
            </text>
            <title>
              Year {y}:{' '}
              {zone === 'under'
                ? 'Under-Investment (Negative ROI)'
                : zone === 'optimal'
                  ? 'Optimal Return Zone'
                  : 'Diminishing Returns'}
            </title>
          </g>
        ))}
      </g>

      {yTicks.map((v) => {
        const y = yAt(v)
        return (
          <g key={`yg-${v}`}>
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
              {`${v}%`}
            </text>
          </g>
        )
      })}

      {points.map((p) => {
        const xv = xAt(p.year)
        return (
          <g key={`xt-${p.year}`}>
            <line
              x1={xv}
              y1={padT + innerH}
              x2={xv}
              y2={padT + innerH + 6}
              className="chart-axis-tick-line"
            />
            <text
              x={xv}
              y={padT + innerH + 22}
              textAnchor="middle"
              className="chart-axis-label chart-axis-year"
            >
              {p.year}
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
        ROI vs. break-even (%)
      </text>
      <text
        x={padL + innerW / 2}
        y={h - 8}
        textAnchor="middle"
        className="chart-axis-label"
      >
        Year
      </text>

      <line
        x1={padL}
        y1={breakevenY}
        x2={padL + innerW}
        y2={breakevenY}
        className="p7s-breakeven-line"
      />
      <text
        x={padL + innerW - 6}
        y={breakevenY - 6}
        textAnchor="end"
        className="chart-axis-label p7s-breakeven-label"
      >
        Break-even (0%)
      </text>

      <line
        x1={horizonX}
        y1={padT}
        x2={horizonX}
        y2={padT + innerH}
        className="p7s-horizon-line"
      />
      <text
        x={horizonX - 6}
        y={padT + 12}
        textAnchor="end"
        className="chart-axis-label p7s-horizon-label"
      >
        Year 5 horizon
      </text>

      <polyline
        className="p7s-roi-line"
        points={polyline}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {points.map((p) => (
        <circle
          key={`pt-${p.year}`}
          cx={xAt(p.year)}
          cy={yAt(p.roi)}
          r={4}
          className="p7s-roi-dot"
        />
      ))}
    </svg>
  )
}

function Panel7RoiSensitivity({
  rows,
  /** Sum of downtime + productivity + data center avoided (Budget Planning annual benefit). */
  baselineAnnualBenefit,
  fraudInvestment,
  setFraudInvestment,
  cxInvestment,
  setCxInvestment,
  dataMiningInvestment,
  setDataMiningInvestment,
  dataAvailability,
  setDataAvailability,
  dataReliability,
  setDataReliability,
}) {
  const { points, totals } = useMemo(
    () =>
      buildAiCumulativeRoiCurve({
        fraudInvestment,
        cxInvestment,
        dataMiningInvestment,
        dataAvailability,
        dataReliability,
        baselineRows: rows,
        baselineAnnualBenefit,
      }),
    [
      fraudInvestment,
      cxInvestment,
      dataMiningInvestment,
      dataAvailability,
      dataReliability,
      rows,
      baselineAnnualBenefit,
    ],
  )

  const breakEvenYear = useMemo(() => {
    const hit = points.find((p) => p.roi > 0)
    return hit ? hit.year : null
  }, [points])
  const fiveYearRoi = points[points.length - 1]?.roi ?? 0
  const fiveYearPositive = fiveYearRoi >= 0

  const combinedAnnualBenefit =
    baselineAnnualBenefit + totals.annualAiBenefit

  const p7SummaryInsight = useMemo(() => {
    if (breakEvenYear == null) {
      return '⚠️ AI investment does not break even within 5 years. Consider increasing investment or improving data quality.'
    }
    if (breakEvenYear <= 2) {
      return '✅ Strong ROI trajectory. Investment breaks even early with high long-term returns.'
    }
    if (breakEvenYear <= 4) {
      return '📊 Moderate ROI. Investment recovers in mid-term. Monitor data quality to accelerate returns.'
    }
    return '⚠️ ROI barely breaks even by year 5. Reassess investment allocation across the three AI categories.'
  }, [breakEvenYear])

  return (
    <main className="migration-panel" id="panel7-roi-sensitivity">
      <header className="panel-header panel-header-context">
        <p className="migration-eyebrow">Cloud migration simulator · Section 7</p>
        <p className="panel-title-context">Panel 7: ROI Sensitivity Explorer</p>
        <p className="panel-subtitle">
          Simulate how AI investment across Fraud Detection, CX Enhancement,
          and Data Mining — combined with Data Quality improvements — affects
          5-year cumulative ROI on the cloud migration project.
        </p>
      </header>

      <section className="panel-card" aria-labelledby="p7s-ai-heading">
        <h2 id="p7s-ai-heading" className="card-heading">
          AI Investment (CapEx, Year 0)
        </h2>
        <p className="card-lead">
          Allocate up to $500,000 across the three custom AI initiatives.
          Marginal benefit per category peaks at $100,000 (Gaussian S-curve).
          A recurring 8% annual maintenance fee is applied as OpEx in years 1–5.
        </p>
        <div className="p5-sliders">
          <div className="p5-slider-row">
            <label className="p5-slider-label" htmlFor="p7s-ai-fraud">
              Fraud Detection: <strong>{formatCurrency(fraudInvestment)}</strong>
            </label>
            <input
              id="p7s-ai-fraud"
              type="range"
              min="0"
              max="500000"
              step="5000"
              value={fraudInvestment}
              onChange={(e) => setFraudInvestment(Number(e.target.value))}
              className="p5-range"
              aria-label="Fraud Detection investment in dollars"
            />
            <div className="p5-range-labels">
              <span>$0</span><span>$250K</span><span>$500K</span>
            </div>
          </div>
          <div className="p5-slider-row">
            <label className="p5-slider-label" htmlFor="p7s-ai-cx">
              CX Enhancement: <strong>{formatCurrency(cxInvestment)}</strong>
            </label>
            <input
              id="p7s-ai-cx"
              type="range"
              min="0"
              max="500000"
              step="5000"
              value={cxInvestment}
              onChange={(e) => setCxInvestment(Number(e.target.value))}
              className="p5-range"
              aria-label="CX Enhancement investment in dollars"
            />
            <div className="p5-range-labels">
              <span>$0</span><span>$250K</span><span>$500K</span>
            </div>
          </div>
          <div className="p5-slider-row">
            <label className="p5-slider-label" htmlFor="p7s-ai-dm">
              Data Mining:{' '}
              <strong>{formatCurrency(dataMiningInvestment)}</strong>
            </label>
            <input
              id="p7s-ai-dm"
              type="range"
              min="0"
              max="500000"
              step="5000"
              value={dataMiningInvestment}
              onChange={(e) => setDataMiningInvestment(Number(e.target.value))}
              className="p5-range"
              aria-label="Data Mining investment in dollars"
            />
            <div className="p5-range-labels">
              <span>$0</span><span>$250K</span><span>$500K</span>
            </div>
          </div>
        </div>
        <div
          className={`p7s-cap-meter${totals.overCap ? ' p7s-cap-meter-warning' : ''}`}
          role="status"
          aria-live="polite"
        >
          <span className="p7s-cap-meter-label">
            Total AI Investment:{' '}
            <strong>{formatCurrency(totals.rawTotal)}</strong> /{' '}
            {formatCurrency(AI_BUDGET_CAP)}
          </span>
          {totals.overCap ? (
            <p className="p7s-cap-meter-warning-text">
              Total AI investment cannot exceed $500,000. Please reduce one or
              more sliders.
            </p>
          ) : null}
        </div>
      </section>

      <section className="panel-card" aria-labelledby="p7s-dq-heading">
        <h2 id="p7s-dq-heading" className="card-heading">
          Data Quality (recurring OpEx)
        </h2>
        <p className="card-lead">
          Data Availability multiplies Fraud Detection and Data Mining uplift
          only when that category has AI investment above $0; Data Reliability
          multiplies CX uplift only when CX has investment above $0. Without that base
          investment, raising Availability or Reliability does not add annual AI
          benefit (OpEx for DQ may still apply). At 0% an axis adds no Data
          Quality OpEx; above 0%, cost rises exponentially toward the 85%
          inflection.
        </p>
        <div className="p5-sliders">
          <div className="p5-slider-row">
            <label className="p5-slider-label" htmlFor="p7s-dq-availability">
              Data Availability: <strong>{dataAvailability}%</strong>
            </label>
            <input
              id="p7s-dq-availability"
              type="range"
              min="0"
              max="100"
              step="1"
              value={dataAvailability}
              onChange={(e) => setDataAvailability(Number(e.target.value))}
              className="p5-range"
              aria-label="Data Availability percentage"
            />
            <div className="p5-range-labels">
              <span>0%</span><span>50%</span><span>100%</span>
            </div>
          </div>
          <div className="p5-slider-row">
            <label className="p5-slider-label" htmlFor="p7s-dq-reliability">
              Data Reliability: <strong>{dataReliability}%</strong>
            </label>
            <input
              id="p7s-dq-reliability"
              type="range"
              min="0"
              max="100"
              step="1"
              value={dataReliability}
              onChange={(e) => setDataReliability(Number(e.target.value))}
              className="p5-range"
              aria-label="Data Reliability percentage"
            />
            <div className="p5-range-labels">
              <span>0%</span><span>50%</span><span>100%</span>
            </div>
          </div>
        </div>
      </section>

      <section className="panel-card" aria-labelledby="p7s-chart-heading">
        <h2 id="p7s-chart-heading" className="card-heading">
          ROI break-even
        </h2>
        <p className="card-lead">
          Cumulative return each year adds Budget Planning annual benefits
          (downtime, productivity, and data center savings) plus the AI uplift
          (Fraud, CX, Data Mining). ROI is{' '}
          <strong>
            (cumulative return − cumulative cost) ÷ cumulative return
          </strong>
          ; the dashed line marks 0% (break-even). Values above 0% mean
          cumulative return exceeds cumulative cost at that year-end. Shaded
          bands classify each year&apos;s trajectory (negative ROI, accelerating
          vs. diminishing positive gains).
        </p>
        <div className="chart-legend">
          <span className="legend-item">
            <span className="legend-line legend-line-roi-curve" /> Cumulative
            ROI
          </span>
          <span className="legend-item">
            <span className="legend-line legend-line-roi-breakeven" /> Break-even (0%)
          </span>
        </div>
        <div className="chart-legend p7s-zone-legend" aria-label="ROI background zones">
          <span className="legend-item">
            <span className="legend-swatch legend-swatch-p7-zone-under" />
            Under-Investment (Negative ROI)
          </span>
          <span className="legend-item">
            <span className="legend-swatch legend-swatch-p7-zone-optimal" />
            Optimal Return Zone
          </span>
          <span className="legend-item">
            <span className="legend-swatch legend-swatch-p7-zone-diminishing" />
            Diminishing Returns
          </span>
        </div>
        <P7sCumulativeRoiChart points={points} />
      </section>

      <p className="p7s-summary-insight" role="status">
        {p7SummaryInsight}
      </p>

      <section className="panel-card p7s-stat-card" aria-labelledby="p7s-stats-heading">
        <h2 id="p7s-stats-heading" className="card-heading">
          Sensitivity summary
        </h2>
        <div className="p7s-stat-grid">
          <div className="p7s-stat-box">
            <span className="p7s-stat-label">Total AI CapEx</span>
            <span className="p7s-stat-value">
              {formatCurrency(totals.aiCapex)}
            </span>
            <span className="p7s-stat-sub">Year 0 one-time</span>
          </div>
          <div className="p7s-stat-box">
            <span className="p7s-stat-label">Total AI OpEx</span>
            <span className="p7s-stat-value">
              {formatCurrency(totals.totalAiOpex5)}
            </span>
            <span className="p7s-stat-sub">
              8% maintenance × 5 years (cumulative) + Cumulative 5 yrs
              (Availability + Reliability sliders)
            </span>
          </div>
          <div className="p7s-stat-box">
            <span className="p7s-stat-label">Total AI Cost</span>
            <span className="p7s-stat-value">
              {formatCurrency(totals.totalAiCostY5)}
            </span>
            <span className="p7s-stat-sub">
              AI CapEx (yr 0) + Total AI OpEx row (maint + DQ, 5 yrs)
            </span>
          </div>
          <div className="p7s-stat-box">
            <span className="p7s-stat-label">Annual AI Benefit</span>
            <span className="p7s-stat-value">
              {`${formatCurrency(totals.annualAiBenefit)}/yr`}
            </span>
            <span className="p7s-stat-sub">
              Funded FD / CX / DM only · DQ scales those uplifts
            </span>
          </div>
          <div className="p7s-stat-box">
            <span className="p7s-stat-label">Total Capex</span>
            <span className="p7s-stat-value">
              {formatCurrency(totals.baselineTotalCapex)}
            </span>
            <span className="p7s-stat-sub">
              5-year baseline (Budget Planning table)
            </span>
          </div>
          <div className="p7s-stat-box">
            <span className="p7s-stat-label">Total OpEx</span>
            <span className="p7s-stat-value">
              {formatCurrency(totals.baselineTotalOpex)}
            </span>
            <span className="p7s-stat-sub">
              5-year baseline (Budget Planning table)
            </span>
          </div>
          <div className="p7s-stat-box">
            <span className="p7s-stat-label">Total Cost</span>
            <span className="p7s-stat-value">
              {formatCurrency(totals.totalCostY5)}
            </span>
            <span className="p7s-stat-sub">
              Baseline{' '}
              {formatCurrency(
                totals.baselineTotalCapex + totals.baselineTotalOpex,
              )}{' '}
              + program{' '}
              {formatCurrency(totals.aiCapex + totals.totalAiOpex5)} — year 0 AI
              CapEx + 5-yr Total AI OpEx (maint + DQ)
            </span>
          </div>
          <div className="p7s-stat-box">
            <span className="p7s-stat-label">Annual Benefit</span>
            <span className="p7s-stat-value">
              {`${formatCurrency(combinedAnnualBenefit)}/yr`}
            </span>
            <span className="p7s-stat-sub">
              Budget Planning savings + Annual AI Benefit
            </span>
          </div>
          <div className="p7s-stat-box">
            <span className="p7s-stat-label">5-Year ROI</span>
            <span
              className={`p7s-stat-value ${fiveYearPositive ? 'p7s-stat-positive' : 'p7s-stat-negative'}`}
            >
              {`${fiveYearRoi >= 0 ? '+' : ''}${fiveYearRoi.toFixed(1)}%`}
            </span>
            <span className="p7s-stat-sub">
              At year 5: (cumulative return − cumulative cost) ÷ cumulative
              return
            </span>
          </div>
          <div className="p7s-stat-box">
            <span className="p7s-stat-label">Break-Even Year</span>
            <span className="p7s-stat-value">
              {breakEvenYear ?? 'Not reached in 5 years'}
            </span>
            <span className="p7s-stat-sub">
              First year cumulative return exceeds cumulative cost
            </span>
          </div>
          <div className="p7s-stat-placeholder" aria-hidden="true" />
          <div className="p7s-stat-placeholder" aria-hidden="true" />
        </div>
      </section>
    </main>
  )
}

/* ─────────────────────────────────────────────
   PANEL 8 – Adoption Curve
───────────────────────────────────────────── */
function AdoptionLineChart({ points }) {
  const w = 640
  const h = 320
  const padL = 56
  const padR = 28
  const padT = 28
  const padB = 54
  const innerW = w - padL - padR
  const innerH = h - padT - padB

  function xAt(month) {
    return padL + ((month - 1) / 11) * innerW
  }
  function yAt(rate) {
    const clamped = Math.min(1, Math.max(0, rate))
    return padT + innerH * (1 - clamped)
  }

  const polyline = points.map((p) => `${xAt(p.month)},${yAt(p.rate)}`).join(' ')
  const resistancePolyline = points
    .map((p) => `${xAt(p.month)},${yAt(p.resistance)}`)
    .join(' ')

  return (
    <svg
      className="adoption-chart"
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label="Monthly adoption rate and resistance index over the 12-month rollout"
    >
      <title>Monthly adoption rate and resistance index over 12-month rollout</title>
      {/* Horizontal gridlines + Y axis labels */}
      {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
        const y = padT + innerH * (1 - frac)
        return (
          <g key={`hg-${frac}`}>
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
              {Math.round(frac * 100)}%
            </text>
          </g>
        )
      })}
      {/* X axis ticks 1..12 */}
      {points.map((p) => {
        const xv = xAt(p.month)
        return (
          <g key={`xt-${p.month}`}>
            <line
              x1={xv}
              y1={padT + innerH}
              x2={xv}
              y2={padT + innerH + 6}
              className="chart-axis-tick-line"
            />
            <text
              x={xv}
              y={h - padB + 30}
              textAnchor="middle"
              className="chart-axis-label chart-axis-year"
            >
              {p.month}
            </text>
          </g>
        )
      })}
      {/* Axis titles */}
      <text
        x={padL + innerW / 2}
        y={18}
        textAnchor="middle"
        className="chart-title"
      >
        Rate (%)
      </text>
      <text
        x={padL + innerW / 2}
        y={h - 8}
        textAnchor="middle"
        className="chart-axis-label"
      >
        Month
      </text>
      {/* Resistance index polyline (drawn first so adoption stays visually on top) */}
      <polyline
        className="resistance-line"
        points={resistancePolyline}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {points.map((p) => (
        <circle
          key={`rdot-${p.month}`}
          cx={xAt(p.month)}
          cy={yAt(p.resistance)}
          r={3.25}
          className="resistance-dot"
        />
      ))}
      {/* Adoption rate polyline */}
      <polyline
        className="adoption-line"
        points={polyline}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {points.map((p) => (
        <circle
          key={`dot-${p.month}`}
          cx={xAt(p.month)}
          cy={yAt(p.rate)}
          r={4}
          className="adoption-dot"
        />
      ))}
    </svg>
  )
}

function Panel8Adoption({
  trainingHours,
  setTrainingHours,
  leadershipEngagement,
  setLeadershipEngagement,
}) {
  const { points, maxAdoption, k } = buildAdoptionCurve(
    trainingHours,
    leadershipEngagement,
  )
  const lastPoint = points[points.length - 1] ?? { rate: 0, resistance: 0 }
  const month12Rate = lastPoint.rate
  const month12Resistance = lastPoint.resistance

  let insightTone = 'low'
  let insightText =
    'Low adoption risk detected. Significant investment in training and leadership is recommended.'
  if (month12Rate > 0.8) {
    insightTone = 'strong'
    insightText =
      'Strong adoption projected. Leadership and training levels are sufficient.'
  } else if (month12Rate >= 0.5) {
    insightTone = 'moderate'
    insightText =
      'Moderate adoption expected. Consider increasing training hours or leadership involvement.'
  }

  return (
    <main className="migration-panel" id="panel8-adoption">
      <header className="panel-header panel-header-context">
        <p className="migration-eyebrow">Cloud migration simulator · Section 8</p>
        <p className="panel-title-context">Panel 8: Adoption Curve</p>
        <p className="panel-subtitle">
          Simulate how training investment and leadership engagement drive
          employee adoption of the new cloud-based claims system over a
          12-month rollout period.
        </p>
      </header>

      <section className="panel-card" aria-labelledby="p8-controls-heading">
        <h2 id="p8-controls-heading" className="card-heading">Controls</h2>
        <p className="card-lead">
          Move the sliders to model how investment in workforce enablement and
          executive sponsorship reshape the adoption S-curve.
        </p>
        <div className="p5-sliders">
          <div className="p5-slider-row">
            <label className="p5-slider-label" htmlFor="p8-training">
              Training Hours per Employee (h):{' '}
              <strong>{trainingHours} h</strong>
            </label>
            <input
              id="p8-training"
              type="range"
              min="0"
              max="40"
              step="1"
              value={trainingHours}
              onChange={(e) => setTrainingHours(Number(e.target.value))}
              className="p5-range"
              aria-label="Training hours per employee"
            />
            <div className="p5-range-labels">
              <span>0 h</span><span>20 h</span><span>40 h</span>
            </div>
          </div>
          <div className="p5-slider-row">
            <label className="p5-slider-label" htmlFor="p8-leadership">
              Leadership Engagement (%):{' '}
              <strong>{leadershipEngagement}%</strong>
            </label>
            <input
              id="p8-leadership"
              type="range"
              min="0"
              max="100"
              step="1"
              value={leadershipEngagement}
              onChange={(e) =>
                setLeadershipEngagement(Number(e.target.value))
              }
              className="p5-range"
              aria-label="Leadership engagement percentage"
            />
            <div className="p5-range-labels">
              <span>0%</span><span>50%</span><span>100%</span>
            </div>
          </div>
        </div>
      </section>

      <section className="summary-strip" aria-label="Adoption simulation summary">
        <div className="summary-tile">
          <span className="summary-label">Adoption ceiling</span>
          <span className="summary-value">
            {(maxAdoption * 100).toFixed(1)}%
          </span>
        </div>
        <div className="summary-tile">
          <span className="summary-label">Growth rate (k)</span>
          <span className="summary-value">{k.toFixed(3)}</span>
        </div>
        <div className="summary-tile summary-tile-positive">
          <span className="summary-label">Month-12 adoption</span>
          <span className="summary-value">
            {(month12Rate * 100).toFixed(1)}%
          </span>
        </div>
        <div className="summary-tile">
          <span className="summary-label">Month-12 resistance</span>
          <span className="summary-value">
            {(month12Resistance * 100).toFixed(1)}%
          </span>
        </div>
      </section>

      <section className="panel-card" aria-labelledby="p8-chart-heading">
        <h2 id="p8-chart-heading" className="card-heading">Adoption rate by month</h2>
        <p className="card-lead">
          Logistic-style saturation curve over the 12-month rollout. More
          training and leadership engagement raise the adoption ceiling and
          accelerate the decay of resistance.
        </p>
        <div className="chart-legend">
          <span className="legend-item">
            <span className="legend-line legend-line-adoption" /> Adoption Rate
          </span>
          <span className="legend-item">
            <span className="legend-line legend-line-resistance" /> Resistance Index
          </span>
        </div>
        <AdoptionLineChart points={points} />
        <div
          className={`p8-insight p8-insight-${insightTone}`}
          role="status"
          aria-live="polite"
        >
          {insightText}
        </div>
      </section>
    </main>
  )
}

/* ─────────────────────────────────────────────
   PANEL 9 – Bass Diffusion Simulator
───────────────────────────────────────────── */
function DiffusionLineChart({ points }) {
  const w = 640
  const h = 320
  const padL = 56
  const padR = 64
  const padT = 28
  const padB = 54
  const innerW = w - padL - padR
  const innerH = h - padT - padB

  function xAt(month) {
    return padL + ((month - 1) / 23) * innerW
  }
  function yAt(value) {
    const clamped = Math.min(1, Math.max(0, value))
    return padT + innerH * (1 - clamped)
  }

  // Auto-scale right axis for new-adopters velocity. Values are 0–1 (fraction of market).
  // Convert to percent for snap selection, then back to fraction for projection.
  const peakNewPct =
    points.reduce((m, p) => (p.newAdopters > m ? p.newAdopters : m), 0) * 100
  const NICE_STEPS = [5, 10, 15, 20, 25, 30, 40, 50, 60, 75, 100]
  const rightMaxPct =
    NICE_STEPS.find((s) => s >= Math.max(peakNewPct, 1e-9)) ??
    NICE_STEPS[NICE_STEPS.length - 1]
  const rightMaxFrac = rightMaxPct / 100

  function yVelocity(value) {
    const clamped = Math.min(rightMaxFrac, Math.max(0, value))
    return padT + innerH * (1 - clamped / rightMaxFrac)
  }

  const polyline = points
    .map((p) => `${xAt(p.month)},${yAt(p.cumulative)}`)
    .join(' ')
  const velocityPolyline = points
    .map((p) => `${xAt(p.month)},${yVelocity(p.newAdopters)}`)
    .join(' ')

  const rightAxisX = padL + innerW
  const rightLabelX = rightAxisX + 8

  return (
    <svg
      className="diffusion-chart"
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label="Cumulative customer adoption and per-month new adopters over the 24-month diffusion horizon"
    >
      <title>Cumulative customer adoption and per-month new adopters over the 24-month diffusion horizon</title>
      {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
        const y = padT + innerH * (1 - frac)
        return (
          <g key={`hg-${frac}`}>
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
              {Math.round(frac * 100)}%
            </text>
          </g>
        )
      })}
      {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
        const y = padT + innerH * (1 - frac)
        const value = frac * rightMaxPct
        const label =
          rightMaxPct >= 10
            ? `${Math.round(value)}%`
            : `${value.toFixed(value % 1 === 0 ? 0 : 1)}%`
        return (
          <text
            key={`rg-${frac}`}
            x={rightLabelX}
            y={y + 4}
            textAnchor="start"
            className="chart-axis-label"
          >
            {label}
          </text>
        )
      })}
      {points.map((p) => {
        const xv = xAt(p.month)
        const labelable = p.month === 1 || p.month % 2 === 0
        return (
          <g key={`xt-${p.month}`}>
            <line
              x1={xv}
              y1={padT + innerH}
              x2={xv}
              y2={padT + innerH + (labelable ? 6 : 3)}
              className="chart-axis-tick-line"
            />
            {labelable ? (
              <text
                x={xv}
                y={h - padB + 30}
                textAnchor="middle"
                className="chart-axis-label chart-axis-year"
              >
                {p.month}
              </text>
            ) : null}
          </g>
        )
      })}
      <text
        x={padL + innerW / 2}
        y={18}
        textAnchor="middle"
        className="chart-title"
      >
        Cumulative Adoption (%) &amp; New Adopters (%)
      </text>
      <text
        x={padL + innerW / 2}
        y={h - 8}
        textAnchor="middle"
        className="chart-axis-label"
      >
        Month
      </text>
      <text
        x={rightAxisX + 48}
        y={padT + innerH / 2}
        textAnchor="middle"
        className="chart-axis-label"
        transform={`rotate(-90 ${rightAxisX + 48} ${padT + innerH / 2})`}
      >
        New Adopters (% of market)
      </text>
      <polyline
        className="diffusion-velocity-line"
        points={velocityPolyline}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <polyline
        className="diffusion-line"
        points={polyline}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {points.map((p) => (
        <circle
          key={`vdot-${p.month}`}
          cx={xAt(p.month)}
          cy={yVelocity(p.newAdopters)}
          r={3}
          className="diffusion-velocity-dot"
        />
      ))}
      {points.map((p) => (
        <circle
          key={`ddot-${p.month}`}
          cx={xAt(p.month)}
          cy={yAt(p.cumulative)}
          r={3.75}
          className="diffusion-dot"
        />
      ))}
    </svg>
  )
}

const MARKET_TYPE_NOTES = {
  B2C: 'Consumer market: faster adoption driven by social influence and broad marketing reach.',
  B2B: 'Enterprise market: slower adoption due to procurement cycles, stakeholder approval, and integration complexity.',
}

function Panel9Diffusion({
  marketingSpend,
  setMarketingSpend,
  networkEffect,
  setNetworkEffect,
  marketType,
  setMarketType,
}) {
  const { points, p: pCoeff, q: qCoeff } = buildBassDiffusionCurve(
    marketingSpend,
    networkEffect,
    marketType,
  )
  const month12 = points[11]?.cumulative ?? 0
  const month24 = points[points.length - 1]?.cumulative ?? 0

  let peakIndex = 0
  for (let i = 1; i < points.length; i++) {
    if (points[i].newAdopters > points[peakIndex].newAdopters) peakIndex = i
  }
  const peakMonth =
    points[peakIndex] && points[peakIndex].newAdopters > 0
      ? points[peakIndex].month
      : null

  const marketContextNote =
    MARKET_TYPE_NOTES[marketType] ?? MARKET_TYPE_NOTES.B2C

  return (
    <main className="migration-panel" id="panel9-diffusion">
      <header className="panel-header panel-header-context">
        <p className="migration-eyebrow">Cloud migration simulator · Section 9</p>
        <p className="panel-title-context">Panel 9: Diffusion Simulator</p>
        <p className="panel-subtitle">
          Simulate how marketing investment and word-of-mouth network effects
          drive customer adoption of the new platform over a 24-month period,
          modeled on the Bass Diffusion framework.
        </p>
      </header>

      <section className="panel-card" aria-labelledby="p9-market-heading">
        <h2 id="p9-market-heading" className="card-heading">Market Type</h2>
        <p className="card-lead">
          Choose the market segment to scale the innovation (p) and imitation
          (q) coefficients before they reach the Bass curve.
        </p>
        <div className="p9-market-type">
          <label htmlFor="p9-market-type-select" className="p9-market-label">
            Market Type
          </label>
          <select
            id="p9-market-type-select"
            className="p9-market-select"
            value={marketType}
            onChange={(e) => setMarketType(e.target.value)}
          >
            <option value="B2C">B2C — Consumer (1.0× p, 1.0× q)</option>
            <option value="B2B">B2B — Enterprise (0.5× p, 0.4× q)</option>
          </select>
        </div>
        <p className="p9-market-note">{marketContextNote}</p>
      </section>

      <section className="panel-card" aria-labelledby="p9-controls-heading">
        <h2 id="p9-controls-heading" className="card-heading">Controls</h2>
        <p className="card-lead">
          Move the sliders to reshape the diffusion S-curve. Marketing spend
          drives external (innovation) pressure; network effect drives internal
          (imitation) word-of-mouth. Both are then scaled by the selected
          market type.
        </p>
        <div className="p5-sliders">
          <div className="p5-slider-row">
            <label className="p5-slider-label" htmlFor="p9-marketing">
              Marketing Spend (% of budget):{' '}
              <strong>{marketingSpend}%</strong>
            </label>
            <input
              id="p9-marketing"
              type="range"
              min="0"
              max="20"
              step="0.5"
              value={marketingSpend}
              onChange={(e) => setMarketingSpend(Number(e.target.value))}
              className="p5-range"
              aria-label="Marketing spend as percentage of budget"
            />
            <div className="p5-range-labels">
              <span>0%</span><span>10%</span><span>20%</span>
            </div>
            <p className="p7-slider-impact">
              Innovation coefficient <strong>p = marketingSpend / 200</strong>.
            </p>
          </div>
          <div className="p5-slider-row">
            <label className="p5-slider-label" htmlFor="p9-network">
              Network Effect Strength (0 = none, 1 = maximum):{' '}
              <strong>{networkEffect.toFixed(2)}</strong>
            </label>
            <input
              id="p9-network"
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={networkEffect}
              onChange={(e) => setNetworkEffect(Number(e.target.value))}
              className="p5-range"
              aria-label="Network effect strength"
            />
            <div className="p5-range-labels">
              <span>0.00</span><span>0.50</span><span>1.00</span>
            </div>
            <p className="p7-slider-impact">
              Imitation coefficient <strong>q = networkEffect × 0.5</strong>.
            </p>
          </div>
        </div>
      </section>

      <section className="summary-strip" aria-label="Bass diffusion summary">
        <div className="summary-tile">
          <span className="summary-label">Innovation coeff. p</span>
          <span className="summary-value">{pCoeff.toFixed(4)}</span>
        </div>
        <div className="summary-tile">
          <span className="summary-label">Imitation coeff. q</span>
          <span className="summary-value">{qCoeff.toFixed(4)}</span>
        </div>
        <div className="summary-tile summary-tile-positive">
          <span className="summary-label">Month-12 cumulative adoption</span>
          <span className="summary-value">{(month12 * 100).toFixed(1)}%</span>
        </div>
        <div className="summary-tile summary-tile-positive">
          <span className="summary-label">Month-24 cumulative adoption</span>
          <span className="summary-value">{(month24 * 100).toFixed(1)}%</span>
        </div>
      </section>

      <section className="panel-card" aria-labelledby="p9-chart-heading">
        <h2 id="p9-chart-heading" className="card-heading">Cumulative adoption by month</h2>
        <p className="card-lead">
          Classic Bass S-curve: slow start while innovators trickle in,
          acceleration as imitators are pulled along by word-of-mouth, then a
          plateau as the addressable market saturates.
        </p>
        <div className="chart-legend">
          <span className="legend-item">
            <span className="legend-line legend-line-diffusion" /> Cumulative Adoption (%)
          </span>
          <span className="legend-item">
            <span className="legend-line legend-line-velocity" /> New Adopters per Month (%)
          </span>
        </div>
        <DiffusionLineChart points={points} />
      </section>

      <section className="panel-card p9-stat-card" aria-labelledby="p9-stats-heading">
        <h2 id="p9-stats-heading" className="card-heading">Diffusion summary</h2>
        <p className="card-lead">
          Live readouts derived from the current curve, market type, and slider
          settings.
        </p>
        <div className="p9-stat-grid">
          <div className="p9-stat-box">
            <span className="p9-stat-label">Peak Adoption Month</span>
            <span className="p9-stat-value">{peakMonth ?? '—'}</span>
            <span className="p9-stat-sub">
              {peakMonth != null
                ? 'Inflection of the S-curve (max new adopters / month)'
                : 'No measurable adoption velocity at this setting'}
            </span>
          </div>
          <div className="p9-stat-box">
            <span className="p9-stat-label">Projected 12-Month Adoption</span>
            <span className="p9-stat-value">{(month12 * 100).toFixed(1)}%</span>
            <span className="p9-stat-sub">F(12) cumulative</span>
          </div>
          <div className="p9-stat-box">
            <span className="p9-stat-label">Projected 24-Month Adoption</span>
            <span className="p9-stat-value">{(month24 * 100).toFixed(1)}%</span>
            <span className="p9-stat-sub">F(24) cumulative</span>
          </div>
        </div>
      </section>
    </main>
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
  // Panel 5 & 6 state lifted to App for cross-panel data flow
  const [automationPct, setAutomationPct] = useState(50)
  const [teamSize, setTeamSize] = useState(10)
  const [redundancy, setRedundancy] = useState(3)
  const [multiRegion, setMultiRegion] = useState(false)
  const [trainingHours, setTrainingHours] = useState(20)
  const [leadershipEngagement, setLeadershipEngagement] = useState(50)
  const [marketingSpend, setMarketingSpend] = useState(5)
  const [networkEffect, setNetworkEffect] = useState(0.3)
  const [marketType, setMarketType] = useState('B2C')

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

  const [aiFraudInvestment, setAiFraudInvestment] = useState(80000)
  const [aiCxInvestment, setAiCxInvestment] = useState(80000)
  const [aiDataMiningInvestment, setAiDataMiningInvestment] = useState(80000)
  const [dataAvailability, setDataAvailability] = useState(70)
  const [dataReliability, setDataReliability] = useState(70)

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

  // ── Cross-panel derived values ─────────────────────────────────
  const _uptimeBase = [95.0, 99.0, 99.5, 99.95, 99.99, 99.999]
  const _uptimeDelta = [0, 0.5, 0.3, 0.04, 0.009, 0.0009]
  const _p6UptimeSingle = _uptimeBase[redundancy - 1]
  const _p6UptimeMulti = Math.min(99.999, _p6UptimeSingle + _uptimeDelta[redundancy - 1])
  const p6Uptime = multiRegion ? _p6UptimeMulti : _p6UptimeSingle
  const p6RegionMult = multiRegion ? 1.85 : 1
  const p6MonthlyCost = Math.round(5000 * Math.pow(redundancy, 1.7) * p6RegionMult)
  const p6DowntimeHrs = Math.round(((100 - p6Uptime) / 100) * 8760 * 10) / 10

  const _p5BaseFailure = 25
  const _p5FailureReduction = automationPct >= 70
    ? 0.4 + ((automationPct - 70) / 30) * 0.2
    : (automationPct / 70) * 0.4
  const p5FailureRate = Math.round(Math.max(3, _p5BaseFailure * (1 - _p5FailureReduction)) * 10) / 10
  const _p5BaseFreq = (teamSize / 5) * 2
  const _p5AutoFactor = automationPct >= 70
    ? 1.5 + ((automationPct - 70) / 30) * 0.4
    : 0.6 + (automationPct / 70) * 0.4
  const p5DeployFreq = Math.round(_p5BaseFreq * _p5AutoFactor * 10) / 10

  const suggestedOpexPerYear = p6MonthlyCost * 12
  const _p6BaselineDowntimeHrs = ((100 - 95.0) / 100) * 8760
  const suggestedDowntimeSavings = Math.round(Math.max(0, (_p6BaselineDowntimeHrs - p6DowntimeHrs) * 20000) / 1000) * 1000
  const _p5AvoidsPerYear = Math.round(((_p5BaseFailure - p5FailureRate) / 100) * p5DeployFreq * 52)
  const suggestedProductivitySavings = Math.round(_p5AvoidsPerYear * 2500 / 1000) * 1000

  const isHome = activeView === 'home'
  const isBudget = activeView === 'budget'
  const isRoi = activeView === 'roi'
  const isSensitivity = activeView === 'sensitivity'
  const isPanels = activeView === 'panels'
  const isAdoption = activeView === 'adoption'
  const isDiffusion = activeView === 'diffusion'
  const topHeaderTitle =
    activeView === 'home'
      ? 'Technology Benefit Simulator'
      : activeView === 'budget'
        ? 'Budget Planning and Cost Estimation'
        : activeView === 'panels'
          ? 'Governance, CI/CD & Uptime Simulators'
          : activeView === 'sensitivity'
            ? 'Panel 7: ROI Sensitivity Explorer'
            : activeView === 'adoption'
              ? 'Panel 8: Adoption Curve'
              : activeView === 'diffusion'
                ? 'Panel 9: Diffusion Simulator'
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
            <button
              type="button"
              className={`sidebar-nav-item${isPanels ? ' sidebar-nav-item-active' : ''}`}
              onClick={() => setActiveView('panels')}
            >
              <IconPanels className="sidebar-nav-svg" />
              <span className="sidebar-nav-label">
                Governance, CI/CD &amp; Uptime
              </span>
            </button>
            <button
              type="button"
              className={`sidebar-nav-item${isSensitivity ? ' sidebar-nav-item-active' : ''}`}
              onClick={() => setActiveView('sensitivity')}
            >
              <IconRoiSensitivity className="sidebar-nav-svg" />
              <span className="sidebar-nav-label">
                Panel 7: ROI Sensitivity Explorer
              </span>
            </button>
            <button
              type="button"
              className={`sidebar-nav-item${isAdoption ? ' sidebar-nav-item-active' : ''}`}
              onClick={() => setActiveView('adoption')}
            >
              <IconAdoption className="sidebar-nav-svg" />
              <span className="sidebar-nav-label">
                Panel 8: Adoption Curve
              </span>
            </button>
            <button
              type="button"
              className={`sidebar-nav-item${isDiffusion ? ' sidebar-nav-item-active' : ''}`}
              onClick={() => setActiveView('diffusion')}
            >
              <IconDiffusion className="sidebar-nav-svg" />
              <span className="sidebar-nav-label">
                Panel 9: Diffusion Simulator
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

      <section className="panel-card sim-suggestions-card" aria-labelledby="sim-suggestions-heading">
        <h2 id="sim-suggestions-heading" className="card-heading">Simulator suggestions</h2>
        <p className="card-lead">
          Live values derived from your <strong>CI/CD</strong> and <strong>Uptime</strong> simulator
          settings. Click <strong>Apply</strong> to copy a value into the ROI assumptions below.
        </p>
        <div className="sim-suggestions-grid">
          <div className="sim-suggestion-row">
            <div className="sim-suggestion-meta">
              <span className="sim-suggestion-label">Annual cloud OpEx</span>
              <span className="sim-suggestion-source">
                P6 · Redundancy {redundancy} · {multiRegion ? 'Multi-Region' : 'Single Region'}
              </span>
            </div>
            <span className="sim-suggestion-value">{formatCurrency(suggestedOpexPerYear)}</span>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setOpexByYear(YEARS.map(() => String(suggestedOpexPerYear)))}
            >
              Apply to all years
            </button>
          </div>
          <div className="sim-suggestion-row">
            <div className="sim-suggestion-meta">
              <span className="sim-suggestion-label">Annual downtime savings</span>
              <span className="sim-suggestion-source">
                P6 · {p6Uptime.toFixed(3)}% uptime vs 95% baseline · $20,000/hr incident cost
              </span>
            </div>
            <span className="sim-suggestion-value">{formatCurrency(suggestedDowntimeSavings)}</span>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setAnnualDowntimeSavings(String(suggestedDowntimeSavings))}
            >
              Apply
            </button>
          </div>
          <div className="sim-suggestion-row">
            <div className="sim-suggestion-meta">
              <span className="sim-suggestion-label">Annual productivity savings</span>
              <span className="sim-suggestion-source">
                P5 · {automationPct}% automation · failure rate {p5FailureRate}% vs 25% baseline
              </span>
            </div>
            <span className="sim-suggestion-value">{formatCurrency(suggestedProductivitySavings)}</span>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setAnnualProductivitySavings(String(suggestedProductivitySavings))}
            >
              Apply
            </button>
          </div>
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

        <div
          className="sensitivity-route"
          id="sensitivity-route"
          hidden={!isSensitivity}
          aria-hidden={!isSensitivity}
          style={{ display: isSensitivity ? 'block' : 'none' }}
        >
          <Panel7RoiSensitivity
            rows={rows}
            baselineAnnualBenefit={annualBenefits}
            fraudInvestment={aiFraudInvestment}
            setFraudInvestment={setAiFraudInvestment}
            cxInvestment={aiCxInvestment}
            setCxInvestment={setAiCxInvestment}
            dataMiningInvestment={aiDataMiningInvestment}
            setDataMiningInvestment={setAiDataMiningInvestment}
            dataAvailability={dataAvailability}
            setDataAvailability={setDataAvailability}
            dataReliability={dataReliability}
            setDataReliability={setDataReliability}
          />
        </div>

        <div
          className="adoption-route"
          id="adoption-route"
          hidden={!isAdoption}
          aria-hidden={!isAdoption}
          style={{ display: isAdoption ? 'block' : 'none' }}
        >
          <Panel8Adoption
            trainingHours={trainingHours}
            setTrainingHours={setTrainingHours}
            leadershipEngagement={leadershipEngagement}
            setLeadershipEngagement={setLeadershipEngagement}
          />
        </div>

        <div
          className="diffusion-route"
          id="diffusion-route"
          hidden={!isDiffusion}
          aria-hidden={!isDiffusion}
          style={{ display: isDiffusion ? 'block' : 'none' }}
        >
          <Panel9Diffusion
            marketingSpend={marketingSpend}
            setMarketingSpend={setMarketingSpend}
            networkEffect={networkEffect}
            setNetworkEffect={setNetworkEffect}
            marketType={marketType}
            setMarketType={setMarketType}
          />
        </div>

        <div
          className="panels-route"
          id="panels-route"
          hidden={!isPanels}
          aria-hidden={!isPanels}
          style={{ display: isPanels ? 'block' : 'none' }}
        >
          <Panel4Governance slaUptime={p6Uptime} />
          <Panel5CiCd automationPct={automationPct} setAutomationPct={setAutomationPct} teamSize={teamSize} setTeamSize={setTeamSize} />
          <Panel6Uptime redundancy={redundancy} setRedundancy={setRedundancy} multiRegion={multiRegion} setMultiRegion={setMultiRegion} />
        </div>
        </div>
      </div>
    </div>
  )
}

export default App
