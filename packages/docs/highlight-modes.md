# 검색 하이라이트 사용법

[프로젝트 소개](../../README.md) · [개선 기능 전체 설명](./ux-improvements.md)

검색 결과가 전체 분포의 어디에 있는지, 주변 데이터와 어떤 관계인지 확인하는 기능입니다. Search에서 Full Text와 검색할 문자열 컬럼을 선택한 뒤 검색어를 입력하세요. 와인 데모에서는 description 컬럼을 사용할 수 있습니다.

## 세 모드의 차이

| 모드 | 화면 표시 | 사용할 때 |
| --- | --- | --- |
| Focus | 결과는 주황색, 전체 배경은 14% 불투명도 | 결과가 모인 위치를 볼 때 |
| Context | 결과와 지정 반경 안의 주변 점을 함께 강조 | 결과 주변의 분포를 볼 때 |
| Compare | A만 파랑, B만 주황, 공통 결과 보라 | 두 검색 결과의 차이와 겹침을 볼 때 |

검색 강조색은 국가 같은 메타데이터 범례의 색과 별개입니다.

## 두 검색 비교하기

1. 첫 검색을 실행하고 **Pin as comparison**으로 A를 고정합니다.
2. 다른 검색을 실행해 현재 결과 B를 만듭니다.
3. Compare에서 A만 있는 영역, B만 있는 영역, 공통 영역을 확인합니다.
4. **Clear comparison**으로 고정을 해제합니다.

A는 고정 당시 필터를 유지하고 B는 현재 필터를 따릅니다. 고정 버튼을 다시 누르면 A를 교체합니다. 이 상태는 현재 세션에만 남습니다.

## 결과 수를 읽을 때

지도는 내장 전문 검색의 전체 일치 ID를 강조하지만 상세 카드는 최대 500개만 불러옵니다. 따라서 지도에 6,624개가 강조되어도 카드가 500개인 것은 정상입니다. 외부 검색기와 벡터 top-K 검색은 제한된 결과만 반환할 수 있습니다.

Context의 이웃은 투영된 **2차원 좌표 거리**로 판단합니다. 원래 임베딩의 의미 유사도를 직접 계산하는 기능은 아닙니다. 반경은 기본적으로 전체 좌표 범위 대각선의 1%이며 확대 배율과 무관합니다.

## 개발자 참고: 상세 동작 명세

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
