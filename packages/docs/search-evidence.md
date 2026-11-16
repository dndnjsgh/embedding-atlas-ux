# Search evidence and relevance ratings

Search cards and embedding point tooltips share the same enriched search result.
The card shows the retrieval method, literal matches from the selected search
column, original score, available cosine similarity, and the filter applied when
the search ran. “Original fields” opens the complete returned record; “Locate
point and view details” selects the point using the existing atlas interaction.

Exact means that the full query occurs as a case-insensitive substring; partial
means that individual query terms occur. Index matches without literal spans are
identified explicitly. Semantic results remain semantic even when query words
also appear in the text. Marked spans are escaped text, never injected HTML.
Offsets are zero-based UTF-16 start-inclusive/end-exclusive in the data model.
The UI displays one-based positions. Up to five evidence excerpts are shown.
Fields configured as hidden are not exposed by the evidence component.

## Score contract

Existing search providers continue working without changes. When the meaning of
the provider's `distance` value is known, declare it on the supplied `Searcher`:

```ts
const searcher = {
  scoreConfig: { metric: "cosine-distance" as const },
  vectorSearch: async (query, options) => existingVectorSearch(query, options),
};
```

Supported metrics are `cosine-distance` (similarity = 1 − distance),
`cosine-similarity` (the original value is already similarity), and
`euclidean` (display distance only). Cosine similarity retains its −1 to 1
range. Unknown metrics, missing/non-finite values and out-of-range cosine values
do not get invented similarity values.

Confidence defaults to unavailable. Optionally supply
`scoreConfig.calibration = { high, medium, label }` using thresholds validated
against relevance judgments for the actual provider/model/dataset. Both values
must be finite, −1 ≤ medium < high ≤ 1, with a nonempty provenance label.
The UI exposes that provenance and thresholds. Ratings are relevance bands, not
probabilities or measured search accuracy. Result percentiles alone are not
evidence that a result is relevant.

## Sorting and feedback

Original provider rank remains the default. Users can sort the loaded results
by exact text matches, similarity or calibrated confidence; missing scores sort
last. These options do not rerun retrieval or change which IDs are highlighted.
The result cap does not establish the total number of matches.

Relevant / Not relevant buttons record a reversible judgment for the current
result view. Feedback is held in memory and resets on a new search or when the
view closes; it is not uploaded and does not train or calibrate a model.

## Verification

Run from `packages/viewer`:

```sh
node ../../node_modules/vitest/vitest.mjs run test/search_evidence.test.ts
node ../../node_modules/svelte-check/bin/svelte-check
```

The development route `/#/test` uses an in-memory dataset. The root route may
expect a running backend. Search for `sample`, inspect the marked source span,
change sort order, toggle feedback, and locate a result to compare the same
evidence in the tooltip. Semantic confidence additionally requires a vector
search provider configured using the score contract above.
