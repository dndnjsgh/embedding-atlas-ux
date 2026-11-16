# Search highlight modes

Open **Search**, select **Full Text** and a text column, then enter a query.
The built-in full-text index returns every matching ID. The map uses that full
set, while the detail list loads at most 500 records. The panel displays both
counts. Custom backends and vector top-K searches may return a bounded result
set; the panel explicitly labels this case instead of claiming a complete set.

- **Focus:** every matching point is orange. The full dataset remains behind it
  at 14% opacity, with no distance cutoff. Active filters restrict the current
  matching set, not the background. Clearing the search restores normal filtering.
- **Context:** uses every matching point as a seed. A non-matching point is yellow
  if its projected 2-D Euclidean distance to any seed is within the selected
  radius. There are no seed or neighbor-count caps. A spatial grid accelerates
  the exact radius test. The radius defaults to 1% of the full dataset bounding-box
  diagonal and can be adjusted from 0.05% to 10%. It does not change with zoom.
  The map shows the radius in coordinate units and the surrounding-point count.
  This is projected spatial proximity, not original embedding-vector similarity.
- **Compare:** click **Pin as comparison** to snapshot the current result as A.
  The button stays dark blue, gains a thicker border and a check mark, and exposes
  `aria-pressed=true`. The panel shows A's query, count and filter. New searches
  update B without modifying A. A-only points are blue, B-only orange, and the
  intersection purple. The legend uses the same colors as the renderer.
  Clicking the pin button again replaces A; **Clear comparison** removes A.
  A remains available when B has zero matches. Pin state is session-local.

Highlight points use a Canvas overlay rather than one SVG element per result.
All valid matching coordinates are retained; only offscreen drawing is culled.
The map's category legend is separate from the search highlight legend.
