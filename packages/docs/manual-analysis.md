# Adaptive hover and manual analysis

## Adaptive point targeting

Point hit testing now derives its CSS-pixel radius from the active viewport scale and estimated peak density. Dense overview states use a smaller radius to reduce accidental neighbor selection, while sparse and zoomed-in states use a larger radius. The current tooltip is retained inside a slightly larger hysteresis radius to prevent flicker between nearby points.

Hosts can tune the behavior through `EmbeddingViewConfig.hoverSelection`:

```ts
{
  hoverSelection: {
    minRadius: 6,
    maxRadius: 18,
    densityReference: 0.25,
    retentionMultiplier: 1.35,
  }
}
```

## Manual analysis panel

The **Manual analysis** sidebar supports:

- applying free-form tags to the current point selection or loaded search results;
- creating one manual cluster from the active source;
- generating deterministic coordinate-based clusters with k-means;
- selecting and renaming clusters;
- showing editable cluster names on the map at a representative member point (toggleable in the panel);
- tagging, merging, splitting, showing, and deleting clusters;
- showing point tags and cluster membership in the point tooltip;
- exporting the analysis as JSON or a flattened CSV file.

JSON exports retain cluster metadata and membership. CSV exports contain one row per annotated or clustered point with pipe-separated tag and cluster-name columns.
