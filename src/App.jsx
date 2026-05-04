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

function IconAi({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" width="22" height="22" aria-hidden>
      <path
        fill="currentColor"
        d="M9 2v2H7v2H5V4H3v16h2v-2h2v2h2v-2h6v2h2v-2h2v2h2V4h-2v2h-2V4h-2V2h-2v2H9V2zm0 4h6v2H9V6zm-2 4h10v8H7v-8zm2 2v4h2v-4H9zm4 0v4h2v-4h-2z"
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

/** Gaussian for marginal uplift: marginal (dU/d spend) peaks at mu (maximum efficiency dollar). */
const AI_MARGINAL_PEAK_MEAN_USD = 100000
const AI_MARGINAL_PEAK_SIGMA_USD = 72000

/** Normalize CDF plateau at per-category slider ceiling (portfolio cap aligns with sliders). */
const AI_UPFLIFT_SIGMOID_INV_CAP_USD = 500000

/**
 * Error function Abramowitz/Steg approximation 7.1.26; sufficient for Φ in uplift model.
 */
function erfApproxAbramowitz(x) {
  const sign = x < 0 ? -1 : 1
  const ax = Math.abs(x)
  const p = 0.3275911
  const a1 = 0.254829592
  const a2 = -0.284496736
  const a3 = 1.421413741
  const a4 = -1.453152027
  const a5 = 1.061405429
  const t = 1 / (1 + p * ax)
  const y =
    1 -
    ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) *
      t *
      Math.exp(-ax * ax)
  return sign * Math.min(Math.max(y, -1), 1)
}

/** Standard normal Φ(z): total benefit from Gaussian marginal is Φ((I-μ)/σ) - Φ(-μ/σ). */
function standardNormalPhi(z) {
  return 0.5 * (1 + erfApproxAbramowitz(z / Math.SQRT2))
}

/**
 * Total annual uplift factor S(I) ∈ [0,1]: normalized CDF of marginal-intensity Gaussian
 * from $0 to I (S-curve; marginal peaks at AI_MARGINAL_PEAK_MEAN_USD).
 */
function aiInvestmentCdfUpliftFactor(investmentDollars) {
  if (investmentDollars <= 0) return 0
  const mu = AI_MARGINAL_PEAK_MEAN_USD
  const sigma = AI_MARGINAL_PEAK_SIGMA_USD
  const cap = AI_UPFLIFT_SIGMOID_INV_CAP_USD
  const inv = Math.min(cap, Math.max(0, investmentDollars))
  const z0 = -mu / sigma
  const zi = (inv - mu) / sigma
  const zCap = (cap - mu) / sigma
  const num = standardNormalPhi(zi) - standardNormalPhi(z0)
  const den = standardNormalPhi(zCap) - standardNormalPhi(z0)
  if (den <= 1e-12) return 0
  return Math.min(1, Math.max(0, num / den))
}

/** Recurring Data Quality OpEx: exponential with inflection / steepening past 85% average (Availability + Reliability). */
const DQ_INFLECTION = 0.85
const DQ_PRE_A = 7800
const DQ_PRE_K = 1.45
const DQ_POST_K = 1.15

function computeDataQualityAnnualOpex(availabilityPct, reliabilityPct) {
  const u = Math.min(
    1,
    Math.max(0, ((availabilityPct + reliabilityPct) / 2) / 100),
  )
  if (u <= 0) return 0
  if (u <= DQ_INFLECTION) {
    return DQ_PRE_A * (Math.exp(DQ_PRE_K * (u / DQ_INFLECTION)) - 1)
  }
  const base85 = DQ_PRE_A * (Math.exp(DQ_PRE_K) - 1)
  const frac = (u - DQ_INFLECTION) / (1 - DQ_INFLECTION)
  return base85 * Math.exp(DQ_POST_K * frac)
}

/**
 * AI & Data Quality cashflow adjustments:
 * - AI initial spend: CapEx in Year 1 only
 * - AI maintenance: OpEx in Years 2–5 (8% of total AI investment per year)
 * - Data Quality: OpEx every year
 */
function buildAiAdjustedRows(
  rows,
  { aiCapexYear1 = 0, aiMaintenanceOpexAnnual = 0, dataQualityOpexAnnual = 0 },
) {
  const hasAdjustments =
    aiCapexYear1 || aiMaintenanceOpexAnnual || dataQualityOpexAnnual
  if (!hasAdjustments) return rows
  let running = 0
  return rows.map((r, i) => {
    let opex = r.opex + dataQualityOpexAnnual
    let capex = r.capex
    if (i === 0) capex += aiCapexYear1
    if (i > 0) opex += aiMaintenanceOpexAnnual
    const totalCost = opex + capex
    running += totalCost
    return { ...r, opex, capex, totalCost, cumulativeCost: running }
  })
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

/** Zone thresholds for AI total ($) vs avg Data Quality (%): illustrative bands (~$155k–$355k total across three initiatives) & DQ OpEx ramp past ~82–85%. */
const ZONE_AI_UNDER = 130000
const ZONE_AI_OVER = 400000
const ZONE_DQ_UNDER = 52
const ZONE_DQ_OVER = 82
const ZONE_B_AI_LO = 155000
const ZONE_B_AI_HI = 355000
const ZONE_B_DQ_LO = 54
const ZONE_B_DQ_HI = 82

function classifyAiDqPosture(aiTotalDollars, dqAvgPct) {
  if (
    aiTotalDollars >= ZONE_B_AI_LO &&
    aiTotalDollars <= ZONE_B_AI_HI &&
    dqAvgPct >= ZONE_B_DQ_LO &&
    dqAvgPct <= ZONE_B_DQ_HI
  ) {
    return {
      postureKey: 'balanced',
      postureLabelShort:
        'Balanced — illustrative efficient envelope (missed-risk & cost-pressure moderated)',
    }
  }
  if (
    dqAvgPct < ZONE_DQ_UNDER ||
    aiTotalDollars < ZONE_AI_UNDER
  ) {
    return {
      postureKey: 'under',
      postureLabelShort:
        'Lean / under-investment — missed opportunity dominates',
    }
  }
  if (
    dqAvgPct >= ZONE_DQ_OVER ||
    aiTotalDollars >= ZONE_AI_OVER
  ) {
    return {
      postureKey: 'over',
      postureLabelShort:
        'Heavy — diminishing returns / Data Quality OpEx pressure',
    }
  }
  return {
    postureKey: 'transition',
    postureLabelShort:
      'Transitional — outside corner bands',
  }
}

/** 2-D posture map with colored under / balanced / over regions. */
function AiDqInvestmentZoneChart({ aiTotalDollars, dqAvgPct }) {
  const w = 560
  const h = 356
  const padL = 66
  const padR = 28
  const padT = 44
  const padB = 58
  const innerW = w - padL - padR
  const innerH = h - padT - padB
  const aiMax = 500000

  function xAi(ai) {
    const u = Math.min(Math.max(ai / aiMax, 0), 1)
    return padL + u * innerW
  }
  function yDq(dq) {
    const u = Math.min(Math.max(dq / 100, 0), 1)
    return padT + innerH * (1 - u)
  }

  const x0 = padL
  const y0 = padT
  const x1 = padL + innerW
  const y1 = padT + innerH
  const clipId = 'p7AiDqPlotClip'

  const { postureKey, postureLabelShort } = classifyAiDqPosture(
    aiTotalDollars,
    dqAvgPct,
  )

  const dotX = xAi(aiTotalDollars)
  const dotY = yDq(dqAvgPct)

  return (
    <svg
      className="ai-dq-zone-chart"
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={`Investment posture versus AI budget and average data quality. ${postureLabelShort}`}
    >
      <title>{postureLabelShort.replace(/ — .*/, '')}</title>
      <defs>
        <clipPath id={clipId}>
          <rect x={x0} y={y0} width={innerW} height={innerH} />
        </clipPath>
      </defs>

      {/* Background grid */}
      {[0, 0.25, 0.5, 0.75, 1].map((t) => {
        const xv = padL + t * innerW
        const yk = padT + t * innerH
        return (
          <g key={`g-${t}`}>
            <line
              x1={xv}
              y1={padT}
              x2={xv}
              y2={padT + innerH}
              className="chart-grid-line"
            />
            <line
              x1={padL}
              y1={yk}
              x2={padL + innerW}
              y2={yk}
              className="chart-grid-line"
            />
          </g>
        )
      })}
      {/* Frame */}
      <rect
        x={x0}
        y={y0}
        width={innerW}
        height={innerH}
        fill="none"
        className="ai-dq-zone-chart-frame"
      />

      {/* Colored zones (clipped) */}
      <g clipPath={`url(#${clipId})`}>
        {/* Balanced core — drawn first */}
        <rect
          x={xAi(ZONE_B_AI_LO)}
          y={yDq(ZONE_B_DQ_HI)}
          width={Math.max(0, xAi(ZONE_B_AI_HI) - xAi(ZONE_B_AI_LO))}
          height={Math.max(0, yDq(ZONE_B_DQ_LO) - yDq(ZONE_B_DQ_HI))}
          className="ai-dq-zone ai-dq-zone-balanced"
          opacity={0.22}
        />
        {/* Under-investment */}
        <rect
          x={x0}
          y={padT}
          width={Math.max(0, xAi(ZONE_AI_UNDER) - x0)}
          height={innerH}
          className="ai-dq-zone ai-dq-zone-under"
          opacity={0.32}
        />
        <rect
          x={padL}
          y={yDq(ZONE_DQ_UNDER)}
          width={innerW}
          height={Math.max(0, y1 - yDq(ZONE_DQ_UNDER))}
          className="ai-dq-zone ai-dq-zone-under"
          opacity={0.28}
        />
        {/* Over-investment */}
        <rect
          x={xAi(ZONE_AI_OVER)}
          y={padT}
          width={Math.max(0, x1 - xAi(ZONE_AI_OVER))}
          height={innerH}
          className="ai-dq-zone ai-dq-zone-over"
          opacity={0.3}
        />
        <rect
          x={padL}
          y={padT}
          width={innerW}
          height={Math.max(0, yDq(ZONE_DQ_OVER) - padT)}
          className="ai-dq-zone ai-dq-zone-over"
          opacity={0.26}
        />
      </g>

      {/* Threshold guide lines */}
      <line
        x1={xAi(ZONE_AI_UNDER)}
        x2={xAi(ZONE_AI_UNDER)}
        y1={padT}
        y2={padT + innerH}
        className="ai-dq-zone-edge-line"
      />
      <line
        x1={xAi(ZONE_AI_OVER)}
        x2={xAi(ZONE_AI_OVER)}
        y1={padT}
        y2={padT + innerH}
        className="ai-dq-zone-edge-line"
      />
      <line
        x1={padL}
        x2={padL + innerW}
        y1={yDq(ZONE_DQ_UNDER)}
        y2={yDq(ZONE_DQ_UNDER)}
        className="ai-dq-zone-edge-line"
      />
      <line
        x1={padL}
        x2={padL + innerW}
        y1={yDq(ZONE_DQ_OVER)}
        y2={yDq(ZONE_DQ_OVER)}
        className="ai-dq-zone-edge-line"
      />

      {/* Axis labels */}
      {[0, 100000, 200000, 300000, 400000, 500000].map((v) => {
        const xv = xAi(v)
        return (
          <text
            key={`rtx-${v}`}
            x={xv}
            y={y1 + 42}
            textAnchor="middle"
            className="chart-axis-label chart-axis-year"
          >
            {v === 500000 ? '500k' : v === 0 ? '0' : `${Math.round(v / 1000)}k`}
          </text>
        )
      })}
      {[0, 25, 50, 75, 100].map((d) => {
        const yy = yDq(d)
        return (
          <text
            key={`rtl-${d}`}
            x={padL - 10}
            y={yy + 4}
            textAnchor="end"
            className="chart-axis-label"
          >
            {d}%
          </text>
        )
      })}
      <text
        x={padL + innerW / 2}
        y={22}
        textAnchor="middle"
        className="chart-title"
      >
        AI investment &amp; data quality posture
      </text>
      <text
        x={padL + innerW / 2}
        y={h - 14}
        textAnchor="middle"
        className="chart-axis-label"
      >
        Total AI investment (USD · cap $500k)
      </text>
      <text
        x={16}
        y={padT + innerH / 2}
        textAnchor="middle"
        transform={`rotate(-90 16 ${padT + innerH / 2})`}
        className="chart-axis-label"
      >
        Average data quality %
      </text>

      {/* Current scenario */}
      <line
        x1={dotX}
        y1={dotY}
        x2={dotX}
        y2={padT + innerH}
        className="ai-dq-current-crosshair ai-dq-current-crosshair-v"
      />
      <line
        x1={padL}
        y1={dotY}
        x2={padL + innerW}
        y2={dotY}
        className="ai-dq-current-crosshair ai-dq-current-crosshair-h"
      />
      <circle
        cx={dotX}
        cy={dotY}
        r={14}
        className="ai-dq-current-pulse"
      />
      <circle
        cx={dotX}
        cy={dotY}
        r={7}
        className={`ai-dq-current-dot posture-${postureKey}`}
      />

      {/* Corner zone labels */}
      <text x={x0 + 8} y={y1 - 10} className="ai-dq-corner-label ai-dq-under-label">
        Under-investment
      </text>
      <text
        x={x1 - 8}
        y={padT + 18}
        textAnchor="end"
        className="ai-dq-corner-label ai-dq-over-label"
      >
        Over-investment
      </text>
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
   PANEL 7 – Innovation & AI Integration
───────────────────────────────────────────── */
function Panel7Ai({
  totalCost5,
  totalBenefits5,
  baselineRoiPct,
  annualBenefits,
  aiFraudDetection,
  aiCxEnhancement,
  aiDataMining,
  setAiFraudDetection,
  setAiCxEnhancement,
  setAiDataMining,
  dataAvailabilityPct,
  setDataAvailabilityPct,
  dataReliabilityPct,
  setDataReliabilityPct,
  aiInvestmentTotal,
  aiBudgetCap,
  dataQualityAnnualOpex,
  dataQualityFiveYearOpex,
  aiMaintenanceOpexAnnual,
  aiMaintenanceFiveYearOpex,
  fdAnnualBenefit,
  dmAnnualBenefit,
  cxAnnualBenefit,
  aiAnnualUplift,
  aiAdjustedAnnualBenefit,
  aiTotalCost5,
  aiTotalReturn5,
  aiRoiPct,
  aiRoiCurve,
  aiBreakevenPoint,
  aiBreakevenExplanation,
}) {
  const capPct = Math.min(100, (aiInvestmentTotal / aiBudgetCap) * 100)
  const capRemaining = aiBudgetCap - aiInvestmentTotal
  const capWarning = capRemaining <= 25000
  const roiDeltaPct =
    baselineRoiPct === null || aiRoiPct === null
      ? null
      : aiRoiPct - baselineRoiPct

  const availabilityRealizationPct = Math.round(dataAvailabilityPct)
  const reliabilityRealizationPct = Math.round(dataReliabilityPct)

  const dqAvgRounded = Math.round((dataAvailabilityPct + dataReliabilityPct) / 2)
  const dqAvgPct = (dataAvailabilityPct + dataReliabilityPct) / 2

  const posture = classifyAiDqPosture(aiInvestmentTotal, dqAvgPct)

  const insightLines = []
  if (aiInvestmentTotal > 0) {
    insightLines.push(
      `Marginal uplift per initiative peaks at ${formatCurrency(AI_MARGINAL_PEAK_MEAN_USD)}—total annual uplift follows a Gaussian CDF (S-curve), so returns keep rising but taper after that inflection.`,
    )
  }
  if (aiFraudDetection > 0 || aiDataMining > 0) {
    insightLines.push(
      `At ${availabilityRealizationPct}% Availability, only ${availabilityRealizationPct}% of the Fraud Detection + Data Mining uplift is realized.`,
    )
  }
  if (aiCxEnhancement > 0) {
    insightLines.push(
      `At ${reliabilityRealizationPct}% Reliability, only ${reliabilityRealizationPct}% of the Customer Experience uplift is realized.`,
    )
  }
  if (aiInvestmentTotal === 0) {
    insightLines.push(
      'No AI initiatives funded yet. Move any of the three sliders above $0 to unlock AI-driven uplift.',
    )
  }
  insightLines.push(
    `Data Quality OpEx ramps exponentially around ${Math.round(DQ_INFLECTION * 100)}% average score (here ${dqAvgRounded}%). Costs above that reflect LLM-scale guardrails and review.`,
  )

  return (
    <main className="migration-panel" id="panel7-ai">
      <header className="panel-header panel-header-context">
        <p className="migration-eyebrow">Cloud migration simulator · Section 7</p>
        <p className="panel-title-context">Innovation &amp; AI Integration</p>
        <p className="panel-subtitle">
          Layer custom AI workloads (Fraud Detection, CX Enhancement, Data
          Mining) on top of the budget plan and explore how Data Quality —
          Availability and Reliability — gates the realized return.
        </p>
      </header>

      <section className="panel-card" aria-labelledby="p7-imported-heading">
        <h2 id="p7-imported-heading" className="card-heading">
          From Budget Planning
        </h2>
        <p className="card-lead">
          Read-only snapshot of the figures driving baseline ROI. Edit them in
          <strong> Budget Planning and Cost Estimation</strong> to update this
          panel.
        </p>
        <div className="summary-strip">
          <div className="summary-tile">
            <span className="summary-label">Baseline 5-yr cost</span>
            <span className="summary-value">{formatCurrency(totalCost5)}</span>
          </div>
          <div className="summary-tile summary-tile-positive">
            <span className="summary-label">Baseline 5-yr benefits</span>
            <span className="summary-value">{formatCurrency(totalBenefits5)}</span>
          </div>
          <div className="summary-tile">
            <span className="summary-label">Baseline annual benefit</span>
            <span className="summary-value">{formatCurrency(annualBenefits)}</span>
          </div>
          <div className="summary-tile summary-tile-roi">
            <span className="summary-label">Baseline ROI</span>
            <span className="summary-value">
              {baselineRoiPct === null
                ? '—'
                : `${baselineRoiPct >= 0 ? '+' : ''}${baselineRoiPct.toFixed(1)}%`}
            </span>
          </div>
        </div>
      </section>

      <section className="panel-card" aria-labelledby="p7-ai-controls-heading">
        <h2 id="p7-ai-controls-heading" className="card-heading">
          AI Investment ($0–500K total)
        </h2>
        <p className="card-lead">
          Custom AI on open-source models (e.g., Llama). Initial allocation is{' '}
          <strong>CapEx in Year 1</strong>. Thereafter{' '}
          <strong>8%</strong> of total AI investment recurs yearly as{' '}
          <strong>OpEx (Years 2–5)</strong>. Marginal uplift per initiative peaks at{' '}
          <strong>{formatCurrency(AI_MARGINAL_PEAK_MEAN_USD)}</strong>; total uplift
          per line follows an <strong>S-curve</strong> (normalized Gaussian CDF)
          so incremental efficiency falls after that point.
        </p>
        <div className="p7-slider-grid">
          <div className="p7-slider-row">
            <label className="p5-slider-label" htmlFor="p7-ai-fd">
              Fraud Detection: <strong>{formatCurrency(aiFraudDetection)}</strong>
            </label>
            <input
              id="p7-ai-fd"
              type="range"
              min="0"
              max={aiBudgetCap}
              step="5000"
              value={aiFraudDetection}
              onChange={(e) => setAiFraudDetection(e.target.value)}
              className="p5-range"
              aria-label="AI Fraud Detection investment in dollars"
            />
            <p className="p7-slider-impact">
              Graph-computing risk features and hidden fraud rings. Scaled by
              <strong> Availability</strong>.
            </p>
          </div>
          <div className="p7-slider-row">
            <label className="p5-slider-label" htmlFor="p7-ai-cx">
              CX Enhancement: <strong>{formatCurrency(aiCxEnhancement)}</strong>
            </label>
            <input
              id="p7-ai-cx"
              type="range"
              min="0"
              max={aiBudgetCap}
              step="5000"
              value={aiCxEnhancement}
              onChange={(e) => setAiCxEnhancement(e.target.value)}
              className="p5-range"
              aria-label="AI Customer Experience investment in dollars"
            />
            <p className="p7-slider-impact">
              Tens of thousands of specialized auto-insurance queries and
              personalized plans. Scaled by <strong>Reliability</strong>.
            </p>
          </div>
          <div className="p7-slider-row">
            <label className="p5-slider-label" htmlFor="p7-ai-dm">
              Data Mining: <strong>{formatCurrency(aiDataMining)}</strong>
            </label>
            <input
              id="p7-ai-dm"
              type="range"
              min="0"
              max={aiBudgetCap}
              step="5000"
              value={aiDataMining}
              onChange={(e) => setAiDataMining(e.target.value)}
              className="p5-range"
              aria-label="AI Data Mining investment in dollars"
            />
            <p className="p7-slider-impact">
              Surface high-risk clients and optimize pricing from historical
              transactions. Scaled by <strong>Availability</strong>.
            </p>
          </div>
        </div>
        <div
          className={`p7-cap-meter${capWarning ? ' p7-cap-meter-warning' : ''}`}
          role="status"
          aria-live="polite"
        >
          <div className="p7-cap-meter-row">
            <span className="p7-cap-meter-label">
              AI total: <strong>{formatCurrency(aiInvestmentTotal)}</strong> /{' '}
              {formatCurrency(aiBudgetCap)}
            </span>
            <span className="p7-cap-meter-remaining">
              {capRemaining > 0
                ? `${formatCurrency(capRemaining)} remaining`
                : 'Cap reached'}
            </span>
          </div>
          <div className="p7-cap-meter-bar" aria-hidden>
            <div
              className="p7-cap-meter-fill"
              style={{ width: `${capPct}%` }}
            />
          </div>
        </div>
      </section>

      <section className="panel-card" aria-labelledby="p7-dq-controls-heading">
        <h2 id="p7-dq-controls-heading" className="card-heading">
          Data Quality (0–100%)
        </h2>
        <p className="card-lead">
          Multipliers on AI-driven benefits. All Data Quality spending is{' '}
          <strong>recurring OpEx</strong> each year, with{' '}
          <strong>exponential growth</strong> and an inflection near{' '}
          <strong>85%</strong> average (Availability + Reliability)—reflecting
          modern LLM-era pipeline and compliance load.
        </p>
        <div className="p7-slider-grid">
          <div className="p7-slider-row">
            <label className="p5-slider-label" htmlFor="p7-dq-avail">
              Availability: <strong>{dataAvailabilityPct}%</strong>
            </label>
            <input
              id="p7-dq-avail"
              type="range"
              min="0"
              max="100"
              value={dataAvailabilityPct}
              onChange={(e) =>
                setDataAvailabilityPct(Number(e.target.value))
              }
              className="p5-range"
              aria-label="Data Availability percentage"
            />
            <p className="p7-slider-impact">
              Valid Data ÷ Total Required Data. Boosts <strong>Fraud Detection</strong> and
              <strong> Data Mining</strong> when those projects are funded.
            </p>
          </div>
          <div className="p7-slider-row">
            <label className="p5-slider-label" htmlFor="p7-dq-rel">
              Reliability: <strong>{dataReliabilityPct}%</strong>
            </label>
            <input
              id="p7-dq-rel"
              type="range"
              min="0"
              max="100"
              value={dataReliabilityPct}
              onChange={(e) =>
                setDataReliabilityPct(Number(e.target.value))
              }
              className="p5-range"
              aria-label="Data Reliability percentage"
            />
            <p className="p7-slider-impact">
              Compliant replies ÷ total replies (RAG + guardrails + HITL).
              Boosts <strong>Customer Experience</strong> when CX is funded.
            </p>
          </div>
        </div>
      </section>

      <section className="panel-card" aria-labelledby="p7-zone-heading">
        <h2 id="p7-zone-heading" className="card-heading">
          Investment posture map
        </h2>
        <p className="card-lead">
          Shaded regions use <strong>total AI spend</strong> (horizontal, $0–$500k){' '}
          and <strong>average Data Quality</strong> (vertical, mean of Availability &
          Reliability). Edges are illustrative—align with ~$155k–$355k illustrative
          total AI bands and the Data Quality OpEx ramp past ~82%.
        </p>
        <div className="chart-legend p7-zone-legend">
          <span className="legend-item">
            <span className="legend-swatch ai-dq-zone-legend-under" />{' '}
            Under-investment · missed opportunity
          </span>
          <span className="legend-item">
            <span className="legend-swatch ai-dq-zone-legend-balanced" /> Efficient
            envelope
          </span>
          <span className="legend-item">
            <span className="legend-swatch ai-dq-zone-legend-over" />{' '}
            Over-investment · diminishing returns
          </span>
          <span className="legend-item">
            <span className="legend-line legend-line-ai-dq-marker" /> Current scenario
          </span>
        </div>
        <AiDqInvestmentZoneChart
          aiTotalDollars={aiInvestmentTotal}
          dqAvgPct={dqAvgPct}
        />
        <div className="ai-dq-zone-foot" role="status">
          <span className={`p7-posture-pill p7-posture-${posture.postureKey}`}>
            {posture.postureLabelShort}
          </span>
          <span className="ai-dq-zone-coords">
            {formatCurrency(aiInvestmentTotal)} AI total · {dqAvgRounded}% avg
            data quality
          </span>
        </div>
      </section>

      <section className="panel-card" aria-labelledby="p7-summary-heading">
        <h2 id="p7-summary-heading" className="card-heading">
          Adjusted ROI summary
        </h2>
        <p className="card-lead">
          ROI = (Return − Cost) / Cost over the 5-year horizon, with AI CapEx,
          AI maintenance OpEx, and Data Quality OpEx folded in.
        </p>
        <div className="summary-strip">
          <div className="summary-tile">
            <span className="summary-label">AI CapEx (Year 1)</span>
            <span className="summary-value">{formatCurrency(aiInvestmentTotal)}</span>
          </div>
          <div className="summary-tile">
            <span className="summary-label">AI maintenance OpEx (Y2–5 @ 8%/yr)</span>
            <span className="summary-value">{formatCurrency(aiMaintenanceFiveYearOpex)}</span>
            <span className="p7-summary-sub">
              {formatCurrency(aiMaintenanceOpexAnnual)} per year × 4 years on total AI spend
            </span>
          </div>
          <div className="summary-tile">
            <span className="summary-label">Data Quality OpEx</span>
            <span className="summary-value">{formatCurrency(dataQualityAnnualOpex)}</span>
            <span className="p7-summary-sub">
              per year · {formatCurrency(dataQualityFiveYearOpex)} over five years
            </span>
          </div>
          <div className="summary-tile summary-tile-positive">
            <span className="summary-label">AI annual uplift</span>
            <span className="summary-value">{formatCurrency(aiAnnualUplift)}</span>
          </div>
          <div className="summary-tile summary-tile-accent">
            <span className="summary-label">Adjusted 5-yr cost</span>
            <span className="summary-value">{formatCurrency(aiTotalCost5)}</span>
          </div>
          <div className="summary-tile summary-tile-positive">
            <span className="summary-label">Adjusted 5-yr return</span>
            <span className="summary-value">{formatCurrency(aiTotalReturn5)}</span>
          </div>
          <div className="summary-tile summary-tile-roi">
            <span className="summary-label">Adjusted ROI</span>
            <span className="summary-value">
              {aiRoiPct === null
                ? '—'
                : `${aiRoiPct >= 0 ? '+' : ''}${aiRoiPct.toFixed(1)}%`}
            </span>
            {roiDeltaPct !== null ? (
              <span
                className={`p7-roi-delta${roiDeltaPct >= 0 ? ' p7-roi-delta-up' : ' p7-roi-delta-down'}`}
              >
                {roiDeltaPct >= 0 ? '▲' : '▼'} {Math.abs(roiDeltaPct).toFixed(1)} pts vs baseline
              </span>
            ) : null}
          </div>
        </div>
        <div className="p7-breakdown">
          <span className="p7-breakdown-item">
            FD annual: <strong>{formatCurrency(fdAnnualBenefit)}</strong>
          </span>
          <span className="p7-breakdown-item">
            CX annual: <strong>{formatCurrency(cxAnnualBenefit)}</strong>
          </span>
          <span className="p7-breakdown-item">
            Data Mining annual: <strong>{formatCurrency(dmAnnualBenefit)}</strong>
          </span>
          <span className="p7-breakdown-item">
            Adjusted annual benefit:{' '}
            <strong>{formatCurrency(aiAdjustedAnnualBenefit)}</strong>
          </span>
        </div>
      </section>

      <section className="panel-card" aria-labelledby="p7-curve-heading">
        <h2 id="p7-curve-heading" className="card-heading">
          AI-adjusted cumulative ROI curve
        </h2>
        <p className="card-lead">
          Cumulative cost (original budget + AI CapEx in Year 1 + 8% AI
          maintenance OpEx in Years 2–5 + Data Quality OpEx every year) versus
          cumulative benefit (baseline + CDF (S-curve) AI uplift × Data Quality)
          across the horizon.
        </p>
        <div className="chart-legend">
          <span className="legend-item">
            <span className="legend-line legend-line-benefit" /> Cumulative
            benefits
          </span>
          <span className="legend-item">
            <span className="legend-line legend-line-cost" /> Cumulative cost
          </span>
          {aiBreakevenPoint ? (
            <span className="legend-item">
              <span className="legend-line legend-line-breakeven" /> Break-even
            </span>
          ) : null}
        </div>
        <RoiBreakevenChart
          curvePoints={aiRoiCurve}
          breakeven={aiBreakevenPoint}
        />
        <div className="breakeven-callout" role="status">
          {aiBreakevenExplanation.headline ? (
            <p className="breakeven-callout-head">
              {aiBreakevenExplanation.headline}
            </p>
          ) : null}
          <p className="breakeven-callout-body">
            {aiBreakevenExplanation.body}
          </p>
        </div>
      </section>

      {insightLines.length > 0 ? (
        <div className="p5-insight-banner" role="status">
          <strong>Sensitivity:</strong>{' '}
          {insightLines.join(' ')}{' '}
          {aiInvestmentTotal > 0
            ? 'Higher Data Quality unlocks more of the potential AI benefit; OpEx accelerates past the 85% inflection.'
            : ''}
        </div>
      ) : null}
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

  const [aiFraudDetection, setAiFraudDetection] = useState(100000)
  const [aiCxEnhancement, setAiCxEnhancement] = useState(100000)
  const [aiDataMining, setAiDataMining] = useState(100000)
  const [dataAvailabilityPct, setDataAvailabilityPct] = useState(60)
  const [dataReliabilityPct, setDataReliabilityPct] = useState(60)

  const AI_BUDGET_CAP = 500000

  function handleAiFraudDetectionChange(raw) {
    const next = Number(raw)
    const headroom = AI_BUDGET_CAP - aiCxEnhancement - aiDataMining
    setAiFraudDetection(Math.max(0, Math.min(next, headroom)))
  }
  function handleAiCxEnhancementChange(raw) {
    const next = Number(raw)
    const headroom = AI_BUDGET_CAP - aiFraudDetection - aiDataMining
    setAiCxEnhancement(Math.max(0, Math.min(next, headroom)))
  }
  function handleAiDataMiningChange(raw) {
    const next = Number(raw)
    const headroom = AI_BUDGET_CAP - aiFraudDetection - aiCxEnhancement
    setAiDataMining(Math.max(0, Math.min(next, headroom)))
  }

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

  // ── AI ROI sensitivity ─────────────────────────────────────────
  const AI_ALPHA_FD = 1.5
  const AI_ALPHA_DM = 0.9
  const AI_ALPHA_CX = 1.2
  /** Asymptotic dollar scale each initiative approaches as CDF uplift → 1 (per category ceiling). */
  const AI_UPLIFT_NOMINAL_CAP_USD = AI_MARGINAL_PEAK_MEAN_USD
  const AI_MAINTENANCE_RATE = 0.08

  const aiInvestmentTotal =
    aiFraudDetection + aiCxEnhancement + aiDataMining

  const dataQualityAnnualOpex = useMemo(
    () => computeDataQualityAnnualOpex(dataAvailabilityPct, dataReliabilityPct),
    [dataAvailabilityPct, dataReliabilityPct],
  )

  const dataQualityFiveYearOpex = dataQualityAnnualOpex * 5
  const aiMaintenanceOpexAnnual = aiInvestmentTotal * AI_MAINTENANCE_RATE
  const aiMaintenanceFiveYearOpex = aiMaintenanceOpexAnnual * 4

  const availMult = dataAvailabilityPct / 100
  const relMult = dataReliabilityPct / 100

  const sFd = aiInvestmentCdfUpliftFactor(aiFraudDetection)
  const sDm = aiInvestmentCdfUpliftFactor(aiDataMining)
  const sCx = aiInvestmentCdfUpliftFactor(aiCxEnhancement)

  const fdAnnualBenefit =
    aiFraudDetection > 0 ? AI_ALPHA_FD * AI_UPLIFT_NOMINAL_CAP_USD * availMult * sFd : 0
  const dmAnnualBenefit =
    aiDataMining > 0 ? AI_ALPHA_DM * AI_UPLIFT_NOMINAL_CAP_USD * availMult * sDm : 0
  const cxAnnualBenefit =
    aiCxEnhancement > 0 ? AI_ALPHA_CX * AI_UPLIFT_NOMINAL_CAP_USD * relMult * sCx : 0

  const aiAnnualUplift = fdAnnualBenefit + dmAnnualBenefit + cxAnnualBenefit
  const aiAdjustedAnnualBenefit = annualBenefits + aiAnnualUplift

  const aiAdjustedRows = useMemo(
    () =>
      buildAiAdjustedRows(rows, {
        aiCapexYear1: aiInvestmentTotal,
        aiMaintenanceOpexAnnual,
        dataQualityOpexAnnual: dataQualityAnnualOpex,
      }),
    [
      rows,
      aiInvestmentTotal,
      aiMaintenanceOpexAnnual,
      dataQualityAnnualOpex,
    ],
  )

  const aiTotalCost5 =
    aiAdjustedRows.length > 0
      ? aiAdjustedRows[aiAdjustedRows.length - 1].cumulativeCost
      : 0
  const aiTotalReturn5 = aiAdjustedAnnualBenefit * 5
  const aiRoiPct =
    aiTotalCost5 === 0
      ? null
      : ((aiTotalReturn5 - aiTotalCost5) / aiTotalCost5) * 100

  const aiRoiCurve = useMemo(
    () => buildRoiCurve(aiAdjustedRows, aiAdjustedAnnualBenefit),
    [aiAdjustedRows, aiAdjustedAnnualBenefit],
  )

  const aiBreakevenPoint = useMemo(() => {
    if (aiAdjustedAnnualBenefit <= 0) return null
    return findRoiBreakeven(aiRoiCurve)
  }, [aiRoiCurve, aiAdjustedAnnualBenefit])

  const aiBreakevenExplanation = useMemo(() => {
    if (aiAdjustedAnnualBenefit <= 0) {
      return {
        headline: null,
        body: 'Fund at least one AI initiative or set positive baseline benefits to chart when cumulative value catches cumulative investment.',
      }
    }
    if (aiBreakevenPoint) {
      const baselineHeadline = breakevenPoint
        ? ` Baseline (no AI) breaks even at ${breakevenPoint.tStar.toFixed(2)} yrs.`
        : ''
      return {
        headline: `${aiBreakevenPoint.tStar.toFixed(2)} years from program start`,
        body: `With AI CapEx, AI maintenance OpEx, Data Quality OpEx, and bell-curve uplift folded in, the cumulative curves intersect at about ${formatCurrency(aiBreakevenPoint.amount)}.${baselineHeadline}`,
      }
    }
    const last = aiRoiCurve[aiRoiCurve.length - 1]
    const lastGap = last.cumulativeBenefit - last.cumulativeCost
    const alwaysAhead = aiRoiCurve.every(
      (p) => p.t === 0 || p.cumulativeBenefit - p.cumulativeCost >= -1,
    )
    if (alwaysAhead && lastGap >= -1) {
      return {
        headline: 'No separate recovery crossing',
        body: 'Benefits meet or exceed costs at every year-end on this AI-adjusted path—there is no underwater period to recover from.',
      }
    }
    return {
      headline: 'Not within five years',
      body: 'Cumulative costs (with AI CapEx, maintenance OpEx, and Data Quality OpEx) remain ahead through Year 5. Tune AI spend near maximum marginal efficiency (~$100k per initiative line) or improve Data Quality to pull break-even left.',
    }
  }, [aiAdjustedAnnualBenefit, aiBreakevenPoint, aiRoiCurve, breakevenPoint])

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
  const isAi = activeView === 'ai'
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
          : activeView === 'ai'
            ? 'Innovation & AI Integration'
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
              className={`sidebar-nav-item${isAi ? ' sidebar-nav-item-active' : ''}`}
              onClick={() => setActiveView('ai')}
            >
              <IconAi className="sidebar-nav-svg" />
              <span className="sidebar-nav-label">
                Innovation &amp; AI Integration
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
          className="ai-route"
          id="ai-route"
          hidden={!isAi}
          aria-hidden={!isAi}
          style={{ display: isAi ? 'block' : 'none' }}
        >
          <Panel7Ai
            totalCost5={totalCost5}
            totalBenefits5={totalBenefits5}
            baselineRoiPct={roiPct}
            annualBenefits={annualBenefits}
            aiFraudDetection={aiFraudDetection}
            aiCxEnhancement={aiCxEnhancement}
            aiDataMining={aiDataMining}
            setAiFraudDetection={handleAiFraudDetectionChange}
            setAiCxEnhancement={handleAiCxEnhancementChange}
            setAiDataMining={handleAiDataMiningChange}
            dataAvailabilityPct={dataAvailabilityPct}
            setDataAvailabilityPct={setDataAvailabilityPct}
            dataReliabilityPct={dataReliabilityPct}
            setDataReliabilityPct={setDataReliabilityPct}
            aiInvestmentTotal={aiInvestmentTotal}
            aiBudgetCap={AI_BUDGET_CAP}
            dataQualityAnnualOpex={dataQualityAnnualOpex}
            dataQualityFiveYearOpex={dataQualityFiveYearOpex}
            aiMaintenanceOpexAnnual={aiMaintenanceOpexAnnual}
            aiMaintenanceFiveYearOpex={aiMaintenanceFiveYearOpex}
            fdAnnualBenefit={fdAnnualBenefit}
            dmAnnualBenefit={dmAnnualBenefit}
            cxAnnualBenefit={cxAnnualBenefit}
            aiAnnualUplift={aiAnnualUplift}
            aiAdjustedAnnualBenefit={aiAdjustedAnnualBenefit}
            aiTotalCost5={aiTotalCost5}
            aiTotalReturn5={aiTotalReturn5}
            aiRoiPct={aiRoiPct}
            aiRoiCurve={aiRoiCurve}
            aiBreakevenPoint={aiBreakevenPoint}
            aiBreakevenExplanation={aiBreakevenExplanation}
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
