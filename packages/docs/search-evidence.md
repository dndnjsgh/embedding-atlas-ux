# 검색 결과 읽는 법

[프로젝트 소개](../../README.md) · [개선 기능 전체 설명](./ux-improvements.md)

검색 결과가 나온 이유를 원문과 함께 확인하는 기능입니다. 기본 카드에서는 제목과 일치한 문장 일부를 읽고, 제목·요약 영역을 클릭하면 지도에서 해당 점으로 이동합니다. **Details & feedback**을 펼치면 상세 근거와 관련성 평가를 볼 수 있습니다.

## 일치 유형의 의미

| 유형 | 뜻 |
| --- | --- |
| 정확 일치 | 대소문자를 무시했을 때 검색어 전체 문자열이 원문에 있음 |
| 부분 일치 | 검색어를 구성하는 개별 단어가 원문에 있음 |
| 인덱스 일치 | 검색 인덱스가 반환했지만 직접 일치 구간은 확인하지 못함 |
| 의미 검색 | 벡터 검색 방식으로 반환한 결과 |

정확 일치는 문서 전체가 같거나 사용자 의도에 100% 부합한다는 뜻이 아닙니다. 의미 검색 결과에도 검색어 문자열이 존재할 수 있습니다.

## 점수와 신뢰도는 어떻게 다른가요?

원래 점수는 검색기가 반환한 값입니다. 그 값의 지표가 명확할 때만 유사도를 표시합니다. 코사인 유사도 0.8을 정답 확률 80%로 해석하면 안 됩니다.

신뢰도 등급은 실제 제공자·모델·데이터셋에서 검증한 보정 기준이 설정된 경우에만 표시합니다. 기본값은 제공 불가이며, 이 기능 자체가 검색 정확도 향상을 입증한 것은 아닙니다.

## 정렬과 피드백의 범위

정렬은 불러온 상세 결과에만 적용됩니다. 지도 전체 일치 점을 다시 검색하거나 바꾸지 않습니다. **Relevant / Not relevant** 평가는 현재 결과 화면의 메모리에만 남고 새 검색이나 화면 종료 시 초기화됩니다. 서버에 업로드하거나 모델을 학습하지 않습니다.

지도 개수와 카드 개수의 차이는 [하이라이트 문서](./highlight-modes.md)를 참고하세요.

## 개발자 참고: 점수 계약과 원문 처리

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
