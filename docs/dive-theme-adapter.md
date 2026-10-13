# Retained dive explorer

The repository contains a compiled dive explorer without its original build sources. Its application theme constants (immediately before `let Zc=null`) read `window.PortfolioDiveTheme` from `one-breath-dive/theme.js`. Vendor code, chart data, and chart behavior stay intact. A future upstream rebuild must retain this small adapter or move these token bindings into the original application source. `polish.css` styles the DOM interface with the portfolio tokens.

The explorer uses AG Charts Enterprise and reports a missing license key. This is pre-existing; a valid license or a rebuild using supported community features is required before treating the explorer as a production release.
