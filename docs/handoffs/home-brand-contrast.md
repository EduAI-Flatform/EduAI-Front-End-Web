# Certificate CTA with configurable branding

The certificate CTA used primary foreground text over a primary-to-secondary
gradient. Admin palettes can require different foregrounds for each endpoint.
Rendered black/white palette evidence found white glyphs over backgrounds around
1.88:1; no default-palette defect is inferred from endpoint calculations alone.

The CTA now uses the existing solid primary button and its paired foreground.
Only one class changes; GDS assets, configured colors, destination and other buttons
remain unchanged.

The browser regression failed against the gradient before the fix. Two registered
palette cases passed42 live width/locale checks at the seven required widths and
VI→EN→VI, with uniform opaque background, contrast at least4.5:1 and no document
overflow, errors or API writes. Observed ratios: default8.16:1, configured21:1.
Three existing HomePage tests and build passed. Screenshots/JSON are retained in
test-results/gds-ci; root visually inspected the configured CTA screenshot.
