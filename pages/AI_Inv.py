"""
AI investments & US new business applications — YoY growth, gap analysis, forecasts.
Route: /AI_Inv (Streamlit multipage).
"""

from __future__ import annotations

import numpy as np
import pandas as pd
import plotly.graph_objects as go
import streamlit as st

YEARS = list(range(2015, 2024))  # 2015–2023
DEFAULT_AI = [24, 33, 53, 79, 95, 146, 276, 189, 252]
DEFAULT_US = [2.8, 2.9, 3.2, 3.5, 3.5, 4.3, 5.4, 5.0, 5.4]


def yoy_growth(values: list[float]) -> list[float | None]:
    """Year-over-year growth rates (%). First year has no prior year → None."""
    out: list[float | None] = [None]
    for i in range(1, len(values)):
        prev, cur = values[i - 1], values[i]
        if prev is None or prev == 0:
            out.append(None)
        else:
            out.append((cur - prev) / prev * 100.0)
    return out


def linear_forecast_growth(
    years_hist: list[int], growth_hist: list[float], forecast_years: list[int]
) -> list[float | None]:
    """Fit y = a*x + b on (year, growth%) and predict for forecast_years."""
    pairs = [(y, g) for y, g in zip(years_hist, growth_hist) if g is not None and not np.isnan(g)]
    if len(pairs) < 2:
        return [None] * len(forecast_years)
    xs = np.array([p[0] for p in pairs], dtype=float)
    ys = np.array([p[1] for p in pairs], dtype=float)
    a, b = np.polyfit(xs, ys, 1)
    return [float(a * fy + b) for fy in forecast_years]


st.title("AI investments & US new business applications")
st.caption(
    "Edit levels (2015–2023) with sliders, then view YoY growth rates (%), "
    "gap analysis, and linear projections for 2024–2025."
)

st.subheader("Adjust series (2015–2023)")
c1, c2 = st.columns(2)
with c1:
    st.markdown("**AI investments ($ Billions)**")
    new_ai: list[float] = []
    for i, y in enumerate(YEARS):
        new_ai.append(
            float(
                st.slider(
                    f"{y}",
                    min_value=0.0,
                    max_value=500.0,
                    value=float(DEFAULT_AI[i]),
                    step=1.0,
                    key=f"ai_{y}",
                )
            )
        )
with c2:
    st.markdown("**US new business applications (Millions)**")
    new_us: list[float] = []
    for i, y in enumerate(YEARS):
        new_us.append(
            float(
                st.slider(
                    f"{y}",
                    min_value=0.0,
                    max_value=20.0,
                    value=float(DEFAULT_US[i]),
                    step=0.1,
                    key=f"us_{y}",
                )
            )
        )

g_ai = yoy_growth(new_ai)
g_us = yoy_growth(new_us)

hist_years_for_fit = [y for y, g in zip(YEARS, g_ai) if g is not None]
g_ai_clean = [g for g in g_ai if g is not None]
g_us_for_fit = [g for y, g in zip(YEARS, g_us) if g is not None]

forecast_years = [2024, 2025]
pred_ai = linear_forecast_growth(hist_years_for_fit, g_ai_clean, forecast_years)
pred_us = linear_forecast_growth(hist_years_for_fit, g_us_for_fit, forecast_years)

levels_df = pd.DataFrame(
    {"Year": YEARS, "AI ($B)": new_ai, "US new business apps (M)": new_us}
)
growth_df = pd.DataFrame(
    {
        "Year": YEARS,
        "AI growth (%)": [None if x is None else round(x, 2) for x in g_ai],
        "US growth (%)": [None if x is None else round(x, 2) for x in g_us],
    }
)
growth_df["Gap (AI − US) (pp)"] = [
    None if a is None or b is None else round(a - b, 2) for a, b in zip(g_ai, g_us)
]

gap24 = (
    None
    if pred_ai[0] is None or pred_us[0] is None
    else pred_ai[0] - pred_us[0]
)
gap25 = (
    None
    if pred_ai[1] is None or pred_us[1] is None
    else pred_ai[1] - pred_us[1]
)

m1, m2, m3, m4, m5, m6 = st.columns(6)
with m1:
    st.metric("AI growth 2024 (%)", f"{pred_ai[0]:.2f}" if pred_ai[0] is not None else "—")
with m2:
    st.metric("US growth 2024 (%)", f"{pred_us[0]:.2f}" if pred_us[0] is not None else "—")
with m3:
    st.metric("Gap 2024 (pp)", f"{gap24:.2f}" if gap24 is not None else "—")
with m4:
    st.metric("AI growth 2025 (%)", f"{pred_ai[1]:.2f}" if pred_ai[1] is not None else "—")
with m5:
    st.metric("US growth 2025 (%)", f"{pred_us[1]:.2f}" if pred_us[1] is not None else "—")
with m6:
    st.metric("Gap 2025 (pp)", f"{gap25:.2f}" if gap25 is not None else "—")

t1, t2 = st.tabs(["Levels", "Growth rates & gap"])
with t1:
    st.dataframe(levels_df, use_container_width=True, hide_index=True)
with t2:
    st.dataframe(growth_df, use_container_width=True, hide_index=True)

st.subheader("Linear trend — X: years · Y: growth rates (%)")
fig = go.Figure()
hx = [y for y, g in zip(YEARS, g_ai) if g is not None]
hover_xy = "Years=%{x}<br>Growth rate=%{y:.2f}%<extra></extra>"
fig.add_trace(
    go.Scatter(
        x=hx,
        y=[g for g in g_ai if g is not None],
        mode="lines+markers",
        name="AI investments — YoY (%)",
        line=dict(color="#1f77b4"),
        hovertemplate=hover_xy,
    )
)
fig.add_trace(
    go.Scatter(
        x=hx,
        y=[g for g in g_us if g is not None],
        mode="lines+markers",
        name="US new business apps — YoY (%)",
        line=dict(color="#ff7f0e"),
        hovertemplate=hover_xy,
    )
)
if len(hx) >= 2 and pred_ai[0] is not None:
    xs_line = np.array(hx + forecast_years, dtype=float)
    pairs_ai = list(zip(hx, [g for g in g_ai if g is not None]))
    xa, ya = np.array([p[0] for p in pairs_ai]), np.array([p[1] for p in pairs_ai])
    a_ai, b_ai = np.polyfit(xa, ya, 1)
    fig.add_trace(
        go.Scatter(
            x=xs_line,
            y=a_ai * xs_line + b_ai,
            mode="lines",
            name="AI — linear fit & extension",
            line=dict(color="#1f77b4", dash="dash"),
            hovertemplate=hover_xy,
        )
    )
    pairs_us = list(zip(hx, [g for g in g_us if g is not None]))
    xu, yu = np.array([p[0] for p in pairs_us]), np.array([p[1] for p in pairs_us])
    a_us, b_us = np.polyfit(xu, yu, 1)
    fig.add_trace(
        go.Scatter(
            x=xs_line,
            y=a_us * xs_line + b_us,
            mode="lines",
            name="US — linear fit & extension",
            line=dict(color="#ff7f0e", dash="dash"),
            hovertemplate=hover_xy,
        )
    )
if pred_ai[0] is not None:
    fig.add_trace(
        go.Scatter(
            x=forecast_years,
            y=pred_ai,
            mode="markers",
            name="AI — forecast",
            marker=dict(symbol="star", size=12, color="#1f77b4"),
            hovertemplate=hover_xy,
        )
    )
if pred_us[0] is not None:
    fig.add_trace(
        go.Scatter(
            x=forecast_years,
            y=pred_us,
            mode="markers",
            name="US — forecast",
            marker=dict(symbol="star", size=12, color="#ff7f0e"),
            hovertemplate=hover_xy,
        )
    )

fig.update_layout(
    xaxis_title="Years",
    yaxis_title="Growth rates (%)",
    hovermode="x unified",
    legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="right", x=1),
    height=520,
)
st.plotly_chart(fig, use_container_width=True)

st.subheader("Gap analysis — X: years · Y: gap (percentage points)")
gap_hist = [None if a is None or b is None else a - b for a, b in zip(g_ai, g_us)]
fig2 = go.Figure()
fig2.add_trace(
    go.Bar(
        x=hx,
        y=[g for g in gap_hist if g is not None],
        name="AI growth − US growth (historical)",
        marker_color="#2ca02c",
    )
)
if gap24 is not None:
    fig2.add_trace(
        go.Bar(
            x=[2024],
            y=[gap24],
            name="Gap 2024 (forecast)",
            marker_color="#9467bd",
        )
    )
if gap25 is not None:
    fig2.add_trace(
        go.Bar(
            x=[2025],
            y=[gap25],
            name="Gap 2025 (forecast)",
            marker_color="#8c564b",
        )
    )
fig2.update_layout(
    xaxis_title="Years",
    yaxis_title="Gap (percentage points)",
    height=400,
)
st.plotly_chart(fig2, use_container_width=True)

st.markdown(
    "**Notes:** YoY growth is computed from your adjusted levels. "
    "Forecasts apply a **linear regression** of growth rate (%) on calendar year using 2016–2023, "
    "then read off 2024 and 2025. This is a simple trend extrapolation, not an economic model."
)
