"""
Home — choose a dashboard (Streamlit multipage entry).
Run: streamlit run streamlit_app.py
Pages appear in the sidebar: /AI_Inv, /revenue
"""

from __future__ import annotations

import streamlit as st

st.set_page_config(
    page_title="176 Final — Dashboards",
    layout="wide",
    initial_sidebar_state="expanded",
)

st.title("176 Final Project")
st.markdown(
    "Use the **sidebar** to open a page, or follow the links below."
)

st.subheader("Pages")
p1, p2 = st.columns(2)
with p1:
    st.page_link("pages/AI_Inv.py", label="AI investments & US new business apps", icon="📈")
    st.caption("Route: `streamlit_app/AI_Inv` (URL path may show as **AI_Inv**).")
with p2:
    st.page_link("pages/revenue.py", label="Revenue growth simulator (5-year)", icon="💹")
    st.caption("Route: `streamlit_app/revenue` (URL path may show as **revenue**).")

st.divider()
st.markdown(
    """
**How multipage routing works (Streamlit):**
1. This file is the **entrypoint** (`streamlit run streamlit_app.py`).
2. Any `*.py` file in the `pages/` folder becomes a **separate page** in the sidebar.
3. The URL path is derived from the filename (e.g. `AI_Inv.py` → **/AI_Inv**, `revenue.py` → **/revenue**).
"""
)
