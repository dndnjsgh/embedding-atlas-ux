# 개선 기능 전체 설명

[프로젝트 소개로 돌아가기](../../README.md)

이 문서는 이 저장소에서 추가한 기능을 설명합니다. 원본 Atlas가 제공하던 지도·검색·표·차트에 탐색 안내와 분석 보조 기능을 연결했습니다.

## 1. 가이드 투어: 처음 보는 지도를 탐색하는 순서 안내

전체 분포를 본 뒤 한 지역을 확대하고 다른 지역으로 이동하는 기본 3단계 안내입니다. 안내 카드에는 제목, 설명, 진행 상태와 Next·Skip 버튼이 있습니다. 카메라 이동이 끝나면 사용자가 Next를 누를 때까지 기다립니다.

지도에서 직접 확대하거나 드래그하면 투어가 종료됩니다. 미니맵 조작도 자유 탐색으로 이어집니다. 설정의 `guidedTour.steps`로 이동 좌표와 설명을 지정할 수 있습니다.

현재 투어는 지도 탐색을 안내합니다. 검색 버튼이나 수동 분석 패널을 차례로 가리키는 전체 UI 튜토리얼, 사용자별 완료 기록은 포함하지 않습니다.

구현: [GuidedTour.svelte](../component/src/lib/embedding_view/GuidedTour.svelte), [cameraController.ts](../component/src/lib/embedding_view/cameraController.ts).

## 2. 미니맵: 확대해도 전체에서의 위치 확인

지도 오른쪽 아래에 전체 분포의 대표 점과 현재 화면 범위를 나타내는 사각형을 표시합니다. 메인 지도를 확대하면 사각형이 작아지고, 이동하면 사각형도 움직입니다. 미니맵을 클릭하거나 드래그하면 메인 지도의 중심이 이동합니다.

와인 데모는 최대 3,500개 대표 점으로 전체 분포를 미리 보여줍니다. 미니맵은 모든 점을 정밀하게 분석하는 차트가 아니라 위치를 찾는 보조 지도입니다.

구현: [Minimap.svelte](../component/src/lib/embedding_view/Minimap.svelte), [카메라 동기화 테스트](../viewer/test/camera_minimap_sync.test.ts).

## 3. 하이라이트: 검색 결과와 배경의 관계 확인

Focus는 결과를 선명하게, 전체 배경을 흐리게 표시합니다. Context는 결과 근처의 점까지 표시합니다. Compare는 두 검색 집합을 색으로 구분합니다. 예를 들어 와인 설명에서 첫 검색을 A로 고정한 뒤 다른 검색을 B로 실행하면, 두 표현을 함께 포함하는 리뷰의 분포를 볼 수 있습니다.

Context의 “근처”는 화면에 투영된 2차원 좌표의 거리입니다. 원본 임베딩의 의미 유사도를 직접 계산한 결과는 아닙니다.

[모드별 사용법과 색상 설명](./highlight-modes.md)

## 4. 검색 근거: 왜 이 결과가 나왔는지 확인

검색 카드에서 제목과 일치한 문장 일부를 읽고, 제목·요약을 클릭해 지도 위치로 이동할 수 있습니다. Details & feedback에서는 검색 방식, 일치 구간, 제공된 점수와 관련성 평가를 확인합니다.

“정확 일치”는 검색어 문자열이 들어 있다는 뜻입니다. 검색 결과가 사용자의 의도에 정확히 부합한다는 보장은 아닙니다. 유사도와 신뢰도도 구분하며, 검증된 보정 기준이 없으면 신뢰도를 만들어 표시하지 않습니다.

[검색 결과와 점수 해석](./search-evidence.md)

## 5. 호버: 밀집된 점의 정보를 안정적으로 읽기

마우스 주변에서 점을 찾는 반경을 확대 수준과 밀도에 맞춰 조정합니다. 이미 툴팁이 열린 점에는 조금 더 넓은 유지 범위를 적용해, 작은 마우스 움직임마다 옆 점으로 바뀌는 현상을 줄입니다.

구현: [adaptive_hover.ts](../component/src/lib/embedding_view/adaptive_hover.ts), [호버 테스트](../viewer/test/adaptive_hover.test.ts).

## 6. 수동 분석: 발견한 집단을 이름과 태그로 정리

선택한 점이나 검색 결과를 대상으로 태그를 붙이고 군집을 만들 수 있습니다. 군집 이름 변경, 병합·분리·삭제와 좌표 기반 자동 군집 생성도 지원합니다.

체크한 군집은 지정 색상으로 강조됩니다. 군집 이름표는 점이 없는 공간을 찾아 표시하고 군집과 연결선으로 이어집니다. 공간이 부족하면 점을 가리지 않도록 이름표를 숨깁니다. 분석 결과는 JSON 또는 CSV로 내보냅니다.

이는 분석용 주석과 그룹 편집입니다. 원본 데이터나 임베딩 모델을 수정·재학습하는 기능은 아닙니다.

[수동 분석 따라 하기](./manual-analysis.md)

## 코드 구조

| 위치 | 역할 |
| --- | --- |
| `packages/component/src/lib/embedding_view` | 캔버스, 투어, 미니맵, 카메라, 호버 |
| `packages/viewer/src/charts/embedding` | 하이라이트·군집 이름표와 지도 연결 |
| `packages/viewer/src/search` | 검색 범위와 근거 계산 |
| `packages/viewer/src/stores` | 검색 강조 상태와 수동 분석 상태 |
| `packages/viewer/src/views` | 검색 결과·수동 분석 패널 |
| `packages/component/src/demo/EmbeddingAtlasDemo.svelte` | 전체 대시보드와 투어·미니맵 설정 연결 |
| `packages/viewer/src/app/WineReviewsDataViewer.svelte` | 와인 데이터 및 사전 계산 좌표 로딩 |
| `packages/viewer/test` | 기능별 회귀 테스트 |

실행 방법과 검증 상태는 [README](../../README.md)에 정리했습니다.
