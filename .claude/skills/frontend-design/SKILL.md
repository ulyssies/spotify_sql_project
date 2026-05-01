# Skill: Frontend Design — SpotYourVibe

## Role

Produce intentional, Spotify-branded UI inside Streamlit. Not generic. Not default Streamlit gray. Every visual decision should feel like it belongs in a music app.

## Activation

This skill activates whenever touching UI: `st.markdown` blocks, custom CSS, Plotly chart styling, layout, colors, typography, or component structure in `streamlit_app.py`.

## First Step — Always

Check the design system defined in `CLAUDE.md` under the Design System section before writing a single line of UI code.

Do not guess at colors or spacing. The palette is defined.

---

## Design System — SpotYourVibe

**Primary color:** `#1DB954` (Spotify green)  
**Background:** Dark overlays — `rgba(0,0,0,0.6)` on cards  
**Text:** White primary, `gray` for secondary/metadata  
**Button style:** `border-radius: 30px`, `background-color: #1DB954`, white bold text  
**Card style:** `border-radius: 1rem`, dark semi-transparent background, centered content  
**Chart color:** `rgb(30, 215, 96)` for all Plotly bars  
**Font:** System font — no custom font imports  

---

## Streamlit-Specific Patterns

### Custom HTML/CSS
Use `st.markdown(..., unsafe_allow_html=True)` for custom styling. This is intentional and approved.

```python
st.markdown("""
    <div style='background-color: rgba(0,0,0,0.6); padding: 2rem; border-radius: 1rem;'>
        ...
    </div>
""", unsafe_allow_html=True)
```

### Plotly Charts
All bar charts use Spotify green. No other bar colors unless there is a semantic reason.

```python
go.Bar(marker_color='rgb(30, 215, 96)')
```

Always set:
- `yaxis_title` and `xaxis_title`
- `height=500` for full-width charts
- `use_container_width=True` on `st.plotly_chart`

### Buttons
Login/action buttons use inline HTML via `st.markdown` — not `st.button` — when custom styling is needed.

```html
<button style='background-color: #1DB954; border: none; color: white;
               padding: 0.75rem 1.5rem; border-radius: 30px;
               font-weight: bold; font-size: 1rem;'>
  Label
</button>
```

### Layout
- Use `st.columns` for side-by-side content (e.g. album art + track info)
- Use `st.tabs` for grouped content sections
- Use `st.container` + `st.markdown("---")` as a card/divider pattern
- Avoid nested columns more than 2 levels deep

---

## Anti-Patterns to Avoid

- Default Streamlit gray (`st.info`, `st.success`) for anything visual — use custom HTML instead
- Plotly charts without axis labels
- Hard-coding pixel widths that break on different screen sizes — use `use_container_width=True`
- Mixing Spotify green with other accent colors (blue, purple, teal)
- `st.image` without a `width` — always set width explicitly
- Album art displayed without a fallback for missing images

---

## Process

1. Check `CLAUDE.md` design system section
2. Identify the component's purpose and hierarchy
3. Apply the SpotYourVibe palette and patterns above
4. Build the component
5. Check: does this look like a music app, or does it look like a default Streamlit dashboard?

---

## Do Not

- Use any color not in the design system without a clear reason
- Use `st.button` with custom CSS — use inline HTML buttons instead when styling matters
- Leave `background-color: #fff` or light backgrounds anywhere — this is a dark-themed app
- Skip `use_container_width=True` on Plotly charts
