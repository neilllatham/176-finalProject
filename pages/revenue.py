"""
Five-year revenue growth simulation (Porter-style drivers + dynamics).
Route: /revenue
"""

from __future__ import annotations

import numpy as np
import pandas as pd
import plotly.graph_objects as go
import streamlit as st

# --- Sensitivities: growth-rate change (percentage points) per +0.1 in factor level ---
SENS: dict[str, float] = {
    "competition": -1.0,
    "new_entrant": -1.0,
    "buyer": -1.0,
    "supplier": 1.0,
    "substitute": -10.0,
    "pmf": 0.5,
    "diff": 0.5,
}

FACTOR_KEYS = list(SENS.keys())
FACTOR_LABELS = {
    "competition": "Competition",
    "new_entrant": "New entrants",
    "supplier": "Supplier bargaining power",
    "buyer": "Buyer bargaining power",
    "substitute": "Substitutes",
    "pmf": "Product–market fit",
    "diff": "Differentiator",
}


def clip01(x: float) -> float:
    return float(max(0.0, min(1.0, x)))


def growth_from_state(
    state: dict[str, float],
    init_growth: float,
    weights: dict[str, float],
) -> float:
    """Predicted revenue growth rate (%) from factor levels and weights."""
    total = init_growth
    for k in FACTOR_KEYS:
        v = state[k]
        total += weights[k] * SENS[k] * (v / 0.1)
    return total


def evolve_state(
    state: dict[str, float],
    d_ne: float,
    d_sub: float,
    d_pmf: float,
    d_diff: float,
    d_adaptive: float = 0.0,
    d_deep: float = 0.0,
    d_process: float = 0.0,
) -> dict[str, float]:
    """
    One-year transition. Competition rises at least 0.05/yr; cross-effects from
    new entrant, supplier, buyer, and differentiator changes (per prompt).

    Leadership / learning (annual Δ, scaled same as other drivers on [0,1]):
    - Adaptive learning +0.1 → differentiator +0.1.
    - Deep learning +0.1 → differentiator +0.2, substitutes −0.1.
    - Process management +0.1 → buyer bargaining power +0.1.
    """
    C = state["competition"]
    NE = state["new_entrant"]
    Bu = state["buyer"]
    Su = state["supplier"]
    Sub = state["substitute"]
    PMF = state["pmf"]
    D = state["diff"]

    # Combine differentiator drivers: direct Δ, adaptive (1:1 to diff), deep (2:1 to diff)
    d_diff_total = d_diff + d_adaptive + 2.0 * d_deep
    d_sub_total = d_sub - d_deep

    d_su_from_diff = 0.05 * (d_diff_total / 0.1) if d_diff_total > 0 else 0.0
    d_bu_from_diff = 0.05 * (-d_diff_total / 0.1) if d_diff_total < 0 else 0.0

    d_su_total = d_su_from_diff
    # Process: +0.1 → buyer +0.1 (same units as state increment)
    d_bu_total = d_bu_from_diff + d_process

    d_c = 0.05
    d_c += 0.05 * (d_ne / 0.1)
    d_c -= 0.05 * (d_su_total / 0.1)
    d_c += 0.05 * (d_bu_total / 0.1)
    if d_diff_total > 0:
        d_c -= 0.05 * (d_diff_total / 0.1)

    return {
        "competition": clip01(C + d_c),
        "new_entrant": clip01(NE + d_ne),
        "buyer": clip01(Bu + d_bu_total),
        "supplier": clip01(Su + d_su_total),
        "substitute": clip01(Sub + d_sub_total),
        "pmf": clip01(PMF + d_pmf),
        "diff": clip01(D + d_diff_total),
    }


def project_end_of_year_revenues(
    initial_revenue: float, growth_rates: list[float]
) -> list[float]:
    """Apply each year’s growth rate to the running revenue (end-of-year balances)."""
    out: list[float] = []
    r = initial_revenue
    for g in growth_rates:
        r = r * (1.0 + g / 100.0)
        out.append(r)
    return out


def scenario_revenue_paths(
    baseline_revenues: list[float], variance_pct: float
) -> tuple[list[float], list[float], list[float]]:
    """
    Baseline = 100%. Best = (100 + variance)%. Worst = (100 - variance)% of baseline revenue each year.
    """
    k_best = 1.0 + variance_pct / 100.0
    k_worst = 1.0 - variance_pct / 100.0
    best = [r * k_best for r in baseline_revenues]
    worst = [r * k_worst for r in baseline_revenues]
    return list(baseline_revenues), best, worst


def annual_cash_flows(revenues: list[float], margin: float) -> list[float]:
    """Simple model: operating cash flow = revenue × margin (0–1)."""
    return [r * margin for r in revenues]


def cumulative_cash_flows(annual_cf: list[float]) -> list[float]:
    out: list[float] = []
    s = 0.0
    for x in annual_cf:
        s += x
        out.append(s)
    return out


def parse_initial_revenue(raw: str) -> tuple[float, bool]:
    """
    Returns (value, ok). Empty or whitespace → 1_000_000. Commas stripped.
    """
    s = raw.strip().replace(",", "")
    if s == "":
        return 1_000_000.0, True
    try:
        v = float(s)
        if v < 0:
            return 1_000_000.0, False
        return v, True
    except ValueError:
        return 1_000_000.0, False


def simulate(
    init_growth: float,
    weights: dict[str, float],
    annual_d_ne: float,
    annual_d_sub: float,
    annual_d_pmf: float,
    annual_d_diff: float,
    annual_d_adaptive: float = 0.0,
    annual_d_deep: float = 0.0,
    annual_d_process: float = 0.0,
) -> tuple[list[float], list[dict[str, float]]]:
    """
    Returns growth_rates[0..4] for years 1..5 and state_at_year_start[0..4]
    (state before computing that year's growth).
    """
    state = {
        "competition": 0.1,
        "new_entrant": 0.0,
        "buyer": 0.1,
        "supplier": 0.1,
        "substitute": 0.0,
        "pmf": 0.7,
        "diff": 0.5,
    }
    growth_rates: list[float] = []
    states_start: list[dict[str, float]] = []

    for year in range(1, 6):
        states_start.append(dict(state))
        growth_rates.append(growth_from_state(state, init_growth, weights))
        if year < 5:
            state = evolve_state(
                state,
                d_ne=annual_d_ne,
                d_sub=annual_d_sub,
                d_pmf=annual_d_pmf,
                d_diff=annual_d_diff,
                d_adaptive=annual_d_adaptive,
                d_deep=annual_d_deep,
                d_process=annual_d_process,
            )
    return growth_rates, states_start


st.title("Revenue growth simulator (5 years)")
st.caption(
    "Predictor: revenue growth rate (%). Drivers: competition, new entrants, supplier & buyer power, "
    "substitutes, product–market fit, differentiator — with weights and annual dynamics."
)

with st.expander("Step-by-step: how to use this page", expanded=False):
    st.markdown(
        """
1. **Set the baseline** “initial growth rate” (default 20%). The prompt’s “99% to 99%” is treated as a typo; the slider uses **−99% to 99%**.
2. **Adjust weights** (0–1) for each factor. The model applies the prompt’s marginal rules **per 0.1 of factor level**, scaled by that weight:
   - competition, buyers, new entrants: **−1** pp per +0.1 (each)  
   - supplier: **+1** pp per +0.1  
   - substitutes: **−10** pp per +0.1  
   - product–market fit & differentiator: **+0.5** pp per +0.1 (each)
3. **Optional dynamics:** annual changes in new entrants, substitutes, PMF, and differentiator drive the **cross-effects** in the prompt (competition, supplier, buyer). Defaults: new entrants +0.05/yr, substitutes +0.02/yr, PMF 0, differentiator 0.
4. **Leadership & process (annual Δ):** adaptive learning (→ differentiation), deep learning (→ differentiation & substitutes), process management (→ buyer power) — see captions under those sliders.
5. **Enter initial revenue ($)** or leave the field blank to use **$1,000,000**.
6. **Read the line charts:** growth rate vs year, **revenue ($) vs year**, and the **radar** of factor levels at a chosen year.
7. **Sensitivity analysis:** set **variance %** from baseline (default ±20% → best **120%**, worst **80%** of baseline revenue); review revenue and **cash flow** tables (annual + cumulative).
8. **Developed with Cursor:** implement formulas in code, then validate that sliders move growth and the radar as expected.
"""
    )

st.subheader("Controls")
rev_in = st.text_input(
    "Initial revenue ($)",
    value="",
    placeholder="1,000,000",
    help="Optional. Leave blank to use $1,000,000. Commas are ignored.",
    key="initial_revenue_input",
)
initial_revenue, rev_ok = parse_initial_revenue(rev_in)
if not rev_ok:
    st.warning("Could not parse revenue (negative or invalid); using **$1,000,000**.")

c_init, c_w = st.columns([1, 2])
with c_init:
    init_growth = st.slider(
        "Initial growth rate (%)",
        min_value=-99.0,
        max_value=99.0,
        value=20.0,
        step=0.5,
        help="Prompt listed 99%–99% (typo); using a symmetric range with default 20%.",
    )
with c_w:
    st.markdown("**Factor weights** (0.0–1.0) — each scales that factor’s contribution.")
    wrow1 = st.columns(4)
    wrow2 = st.columns(3)
    weights: dict[str, float] = {}
    for i, key in enumerate(FACTOR_KEYS):
        col = wrow1[i] if i < 4 else wrow2[i - 4]
        with col:
            weights[key] = st.slider(
                FACTOR_LABELS[key],
                0.0,
                1.0,
                1.0,
                0.05,
                key=f"w_{key}",
            )

st.subheader("Annual changes (dynamics)")
st.caption(
    "How much new entrants, substitutes, PMF, and differentiator move each year before clip [0,1]. "
    "These deltas feed the cross-rules (competition ↔ suppliers/buyers/differentiator)."
)
d1, d2, d3, d4 = st.columns(4)
with d1:
    annual_d_ne = st.slider("Δ New entrants / year", -0.2, 0.2, 0.05, 0.01)
with d2:
    annual_d_sub = st.slider("Δ Substitutes / year", -0.2, 0.2, 0.02, 0.01)
with d3:
    annual_d_pmf = st.slider("Δ Product–market fit / year", -0.2, 0.2, 0.0, 0.01)
with d4:
    annual_d_diff = st.slider("Δ Differentiator / year", -0.2, 0.2, 0.0, 0.01)

st.subheader("Leadership learning & process management (annual Δ)")
st.caption(
    "Independent controls applied **each year** (same clip [0, 1] as other state variables). "
    "Cross-effects are additive with the dynamics above."
)
lp1, lp2, lp3 = st.columns(3)
with lp1:
    annual_d_adaptive = st.slider(
        "Δ Adaptive learning / year",
        -0.2,
        0.2,
        0.0,
        0.01,
        help="Rule: adaptive learning +0.1 → differentiator +0.1 (same-year increment to Δ differentiator).",
        key="d_adaptive",
    )
with lp2:
    annual_d_deep = st.slider(
        "Δ Deep learning / year",
        -0.2,
        0.2,
        0.0,
        0.01,
        help="Rules: deep learning +0.1 → differentiator +0.2; substitutes −0.1.",
        key="d_deep",
    )
with lp3:
    annual_d_process = st.slider(
        "Δ Process management / year",
        -0.2,
        0.2,
        0.0,
        0.01,
        help="Rule: process +0.1 → buyer bargaining power +0.1.",
        key="d_process",
    )

growth_rates, states_start = simulate(
    init_growth,
    weights,
    annual_d_ne,
    annual_d_sub,
    annual_d_pmf,
    annual_d_diff,
    annual_d_adaptive,
    annual_d_deep,
    annual_d_process,
)
years_idx = [1, 2, 3, 4, 5]
revenues_eoy = project_end_of_year_revenues(initial_revenue, growth_rates)

table_rows = []
for y, g, rev, s in zip(years_idx, growth_rates, revenues_eoy, states_start):
    row = {
        "Year": y,
        "Revenue growth (%)": round(g, 2),
        "Revenue (end of year) ($)": round(rev, 2),
    }
    row.update({f"{FACTOR_LABELS[k]}": round(s[k], 3) for k in FACTOR_KEYS})
    table_rows.append(row)
st.dataframe(pd.DataFrame(table_rows), use_container_width=True, hide_index=True)

st.subheader("Sensitivity analysis — revenue & cash flow")
st.caption(
    "Scenarios scale **end-of-year baseline revenue** by fixed factors: **baseline 100%**, "
    "**best (100% + variance)**, **worst (100% − variance)**. "
    "Sensitivity **Δ vs baseline** is the percentage gap from the baseline projection."
)
s_col1, s_col2, s_col3 = st.columns([1, 1, 1])
with s_col1:
    variance_pct = st.slider(
        "Variance from baseline (%)",
        min_value=0.0,
        max_value=90.0,
        value=20.0,
        step=1.0,
        help="Best case uses baseline × (1 + variance/100); worst uses baseline × (1 − variance/100). Default ±20% → 120% / 80%.",
        key="sensitivity_variance",
    )
with s_col2:
    pct_best = 100.0 + variance_pct
    pct_worst = 100.0 - variance_pct
    st.metric("Best scenario", f"{pct_best:.0f}% of baseline revenue")
with s_col3:
    st.metric("Worst scenario", f"{pct_worst:.0f}% of baseline revenue")

st.caption(
    "**Baseline** is the unscaled simulation (**100%**). **Best** and **worst** multiply that path by "
    f"**{pct_best:.0f}%** and **{pct_worst:.0f}%** of baseline revenue each year."
)

cf_margin_pct = st.slider(
    "Operating cash flow as % of revenue (same for all scenarios)",
    min_value=0.0,
    max_value=100.0,
    value=25.0,
    step=0.5,
    key="cf_margin_pct",
)
cf_margin = cf_margin_pct / 100.0

rev_b, rev_best, rev_worst = scenario_revenue_paths(revenues_eoy, variance_pct)

pct_vs_base_best = [((rb - r0) / r0 * 100.0) if r0 else 0.0 for r0, rb in zip(rev_b, rev_best)]
pct_vs_base_worst = [((rw - r0) / r0 * 100.0) if r0 else 0.0 for r0, rw in zip(rev_b, rev_worst)]

df_rev_sens = pd.DataFrame(
    {
        "Year": years_idx,
        "Baseline revenue ($)": rev_b,
        f"Best revenue ($) ({pct_best:.0f}%)": rev_best,
        f"Worst revenue ($) ({pct_worst:.0f}%)": rev_worst,
        "Δ vs baseline — Best (%)": pct_vs_base_best,
        "Δ vs baseline — Worst (%)": pct_vs_base_worst,
    }
)
st.markdown("**Revenue projection (sensitivity)**")
st.dataframe(
    df_rev_sens.style.format(
        {
            "Baseline revenue ($)": "${:,.0f}",
            f"Best revenue ($) ({pct_best:.0f}%)": "${:,.0f}",
            f"Worst revenue ($) ({pct_worst:.0f}%)": "${:,.0f}",
            "Δ vs baseline — Best (%)": "{:+.1f}",
            "Δ vs baseline — Worst (%)": "{:+.1f}",
        }
    ),
    use_container_width=True,
    hide_index=True,
)

cf_b = annual_cash_flows(rev_b, cf_margin)
cf_best = annual_cash_flows(rev_best, cf_margin)
cf_worst = annual_cash_flows(rev_worst, cf_margin)
cum_b = cumulative_cash_flows(cf_b)
cum_best = cumulative_cash_flows(cf_best)
cum_worst = cumulative_cash_flows(cf_worst)
pct_cf_best = [((cb - c0) / c0 * 100.0) if c0 else 0.0 for c0, cb in zip(cf_b, cf_best)]
pct_cf_worst = [((cw - c0) / c0 * 100.0) if c0 else 0.0 for c0, cw in zip(cf_b, cf_worst)]

df_cf = pd.DataFrame(
    {
        "Year": years_idx,
        "Baseline annual OCF ($)": cf_b,
        f"Best annual OCF ($) ({pct_best:.0f}%)": cf_best,
        f"Worst annual OCF ($) ({pct_worst:.0f}%)": cf_worst,
        "Δ vs baseline — Best (%)": pct_cf_best,
        "Δ vs baseline — Worst (%)": pct_cf_worst,
    }
)
st.markdown("**Cash flow — annual (operating cash flow)**")
st.caption(f"OCF = revenue × {cf_margin_pct:.1f}%; scenarios inherit revenue sensitivity.")
st.dataframe(
    df_cf.style.format(
        {
            "Baseline annual OCF ($)": "${:,.0f}",
            f"Best annual OCF ($) ({pct_best:.0f}%)": "${:,.0f}",
            f"Worst annual OCF ($) ({pct_worst:.0f}%)": "${:,.0f}",
            "Δ vs baseline — Best (%)": "{:+.1f}",
            "Δ vs baseline — Worst (%)": "{:+.1f}",
        }
    ),
    use_container_width=True,
    hide_index=True,
)

df_cum = pd.DataFrame(
    {
        "Year": years_idx,
        "Baseline cumulative OCF ($)": cum_b,
        f"Best cumulative OCF ($) ({pct_best:.0f}%)": cum_best,
        f"Worst cumulative OCF ($) ({pct_worst:.0f}%)": cum_worst,
    }
)
st.markdown("**Cash flow — cumulative**")
st.dataframe(
    df_cum.style.format(
        {
            "Baseline cumulative OCF ($)": "${:,.0f}",
            f"Best cumulative OCF ($) ({pct_best:.0f}%)": "${:,.0f}",
            f"Worst cumulative OCF ($) ({pct_worst:.0f}%)": "${:,.0f}",
        }
    ),
    use_container_width=True,
    hide_index=True,
)

fig_sens_rev = go.Figure()
fig_sens_rev.add_trace(
    go.Scatter(
        x=years_idx,
        y=rev_b,
        mode="lines+markers",
        name="Baseline (100%)",
        line=dict(color="#636efa"),
    )
)
fig_sens_rev.add_trace(
    go.Scatter(
        x=years_idx,
        y=rev_best,
        mode="lines+markers",
        name=f"Best ({pct_best:.0f}%)",
        line=dict(color="#2ecc71"),
    )
)
fig_sens_rev.add_trace(
    go.Scatter(
        x=years_idx,
        y=rev_worst,
        mode="lines+markers",
        name=f"Worst ({pct_worst:.0f}%)",
        line=dict(color="#e74c3c"),
    )
)
fig_sens_rev.update_layout(
    title="Revenue by scenario (end of year)",
    xaxis_title="Year",
    yaxis_title="Revenue ($)",
    yaxis_tickformat="$,.0f",
    height=400,
    legend=dict(orientation="h", y=1.1),
)
st.plotly_chart(fig_sens_rev, use_container_width=True)

fig_sens_cf = go.Figure()
fig_sens_cf.add_trace(
    go.Scatter(x=years_idx, y=cf_b, mode="lines+markers", name="Baseline OCF", line=dict(color="#636efa"))
)
fig_sens_cf.add_trace(
    go.Scatter(
        x=years_idx,
        y=cf_best,
        mode="lines+markers",
        name=f"Best OCF ({pct_best:.0f}%)",
        line=dict(color="#2ecc71"),
    )
)
fig_sens_cf.add_trace(
    go.Scatter(
        x=years_idx,
        y=cf_worst,
        mode="lines+markers",
        name=f"Worst OCF ({pct_worst:.0f}%)",
        line=dict(color="#e74c3c"),
    )
)
fig_sens_cf.update_layout(
    title="Annual operating cash flow by scenario",
    xaxis_title="Year",
    yaxis_title="Cash flow ($)",
    yaxis_tickformat="$,.0f",
    height=400,
    legend=dict(orientation="h", y=1.1),
)
st.plotly_chart(fig_sens_cf, use_container_width=True)

# Linear trend in (growth, year) space: growth ≈ a * year + b
coef = np.polyfit(years_idx, growth_rates, 1)
trend_x = float(coef[0]) * np.array(years_idx, dtype=float) + float(coef[1])

st.subheader("Linear chart — X: growth rate (%) · Y: year (1–5)")
st.caption("Prompt orientation: horizontal axis = growth rate; vertical axis = year index.")
fig_line = go.Figure()
fig_line.add_trace(
    go.Scatter(
        x=growth_rates,
        y=years_idx,
        mode="lines+markers",
        name="Simulated growth",
        line=dict(color="#636efa"),
        marker=dict(size=10),
    )
)
fig_line.add_trace(
    go.Scatter(
        x=trend_x,
        y=years_idx,
        mode="lines",
        name="Linear fit (growth ~ a·year + b)",
        line=dict(color="#ef553b", dash="dash"),
    )
)
fig_line.update_layout(
    xaxis_title="Growth rate (%)",
    yaxis_title="Year (1 to 5)",
    yaxis=dict(tickmode="linear", tick0=1, dtick=1),
    height=480,
    legend=dict(orientation="h", y=1.1),
)
st.plotly_chart(fig_line, use_container_width=True)

# Revenue path: X = revenue ($), Y = year; linear fit revenue ≈ a·year + b → plot (a·t+b, t)
coef_rev = np.polyfit(years_idx, revenues_eoy, 1)
t_line = np.linspace(1.0, 5.0, 50)
rev_trend = float(coef_rev[0]) * t_line + float(coef_rev[1])

st.subheader("Linear chart — X: revenue ($) · Y: year (1–5)")
st.caption(
    "End-of-year revenue after applying each year’s growth rate. "
    "Dashed line: linear fit (revenue ≈ a·year + b) shown in (revenue, year) space."
)
fig_rev = go.Figure()
fig_rev.add_trace(
    go.Scatter(
        x=revenues_eoy,
        y=years_idx,
        mode="lines+markers",
        name="Simulated revenue path",
        line=dict(color="#ab63fa"),
        marker=dict(size=10),
    )
)
fig_rev.add_trace(
    go.Scatter(
        x=rev_trend,
        y=t_line,
        mode="lines",
        name="Linear fit (revenue ~ a·year + b)",
        line=dict(color="#ffa15a", dash="dash"),
    )
)
fig_rev.update_layout(
    xaxis_title="Revenue ($)",
    yaxis_title="Year (1 to 5)",
    yaxis=dict(tickmode="linear", tick0=1, dtick=1),
    height=480,
    legend=dict(orientation="h", y=1.1),
)
fig_rev.update_xaxes(tickformat="$,.0f")
st.plotly_chart(fig_rev, use_container_width=True)

st.subheader("Radar chart — factor levels (0–1)")
st.caption("Radar (spider) chart: each axis is a driver; radius is the level in [0, 1].")
radar_year = st.radio(
    "Show factor levels for which year (start of year, before transition)?",
    years_idx,
    horizontal=True,
    key="radar_year",
)
idx = years_idx.index(radar_year)
state_show = states_start[idx]
theta = [FACTOR_LABELS[k] for k in FACTOR_KEYS]
rvals = [state_show[k] for k in FACTOR_KEYS]
# close the polygon
theta_closed = theta + [theta[0]]
r_closed = rvals + [rvals[0]]

fig_radar = go.Figure(
    data=go.Scatterpolar(
        r=r_closed,
        theta=theta_closed,
        fill="toself",
        name=f"Year {radar_year}",
        line_color="#00cc96",
    )
)
fig_radar.update_layout(
    polar=dict(radialaxis=dict(visible=True, range=[0, 1])),
    showlegend=True,
    height=520,
)
st.plotly_chart(fig_radar, use_container_width=True)

with st.expander("Model assumptions (summary)"):
    st.markdown(
        """
- **Initial factor levels:** competition 0.1; new entrants 0; buyer & supplier 0.1; substitutes 0; PMF 0.7; differentiator 0.5 (not specified in prompt).
- **Growth equation:** `growth = initial_growth + Σ weight_i × sensitivity_i × (level_i / 0.1)`.
- **Each year:** competition increases by at least **0.05**; cross-effects use **this year’s** Δ in new entrants, supplier, buyer, and differentiator as stated in the prompt.
- **Leadership & process (annual Δ):** adaptive +0.1 → diff +0.1; deep +0.1 → diff +0.2 and substitutes −0.1; process +0.1 → buyer power +0.1. Combined **Δ differentiator** feeds the same supplier/buyer/competition rules as the “Δ Differentiator” slider.
- **Revenue path:** `revenue_end_year = revenue_start × (1 + growth%/100)` applied year by year. Initial revenue defaults to **$1,000,000** if the field is left blank.
- **Revenue vs year chart:** horizontal axis = dollar revenue (end of year), vertical axis = year index; dashed line is OLS `revenue ≈ a·year + b` drawn in that plane.
- **Sensitivity:** best / worst cases scale each year’s **baseline revenue** by `(100 ± variance)%`. **Δ vs baseline** is the resulting % difference. Cash flows use **OCF = revenue × margin** (same margin in all scenarios).
"""
    )
