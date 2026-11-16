# Embedding Atlas UX

Apple의 [Embedding Atlas](https://github.com/apple/embedding-atlas)를 바탕으로, 많은 데이터 점을 탐색할 때 **현재 위치를 파악하고, 검색 결과를 해석하고, 분석 결과를 직접 정리하기 쉽게** 개선한 프로젝트입니다.

원본 프로젝트 전체 코드에 UX 개선을 반영한 별도 저장소입니다. Apple의 공식 배포판이 아니며, npm이나 pip에서 `embedding-atlas`를 설치하는 것만으로 이 저장소의 개선 기능이 적용되지는 않습니다.

## 무엇을 개선했나요?

임베딩 지도는 데이터의 관계를 점의 위치로 보여줍니다. 이 프로젝트는 “처음에는 어디를 봐야 할까?”, “확대하다가 어디에 있는지 잊으면?”, “검색 결과를 왜 믿어야 할까?”라는 탐색 과정의 문제를 다룹니다.

| 탐색 중 겪는 문제 | 추가·개선한 기능 |
| --- | --- |
| 처음 접하면 지도를 어떻게 탐색할지 막막함 | 단계별 카메라 이동과 설명을 제공하는 가이드 투어 |
| 확대·이동 중 전체 분포에서의 위치를 잃음 | 전체 분포와 현재 화면 범위를 보여주는 미니맵 |
| 검색 결과와 주변 데이터의 관계를 보기 어려움 | Focus·Context·Compare 하이라이트 |
| 검색 결과가 나온 이유를 알기 어려움 | 일치 구간, 검색 방식, 점수와 근거 표시 |
| 밀집된 점에서 툴팁이 쉽게 바뀜 | 확대 수준·밀도에 맞춘 호버 선택 반경과 유지 처리 |
| 발견한 군집에 이름과 의미를 남기기 어려움 | 태그, 군집 편집, 지도 이름표, JSON·CSV 내보내기 |

검색·표·차트가 연결된 전체 대시보드는 원본 Viewer를 재사용합니다. 이 저장소에서는 그 화면에 위 기능들을 연결하고 Wine Reviews 데모를 추가했습니다.

## 문서 읽는 순서

1. [개선 기능 전체 설명](packages/docs/ux-improvements.md): 기능의 목적과 구현 위치
2. [검색 하이라이트 사용법](packages/docs/highlight-modes.md): 세 모드의 차이와 비교 예시
3. [검색 결과 읽는 법](packages/docs/search-evidence.md): 일치 유형, 점수, 신뢰도와 한계
4. [호버·수동 분석 사용법](packages/docs/manual-analysis.md): 군집 편집과 결과 내보내기

원본 기능 소개·논문 인용은 [원본 README](README.upstream.md), 전체 빌드 절차는 [개발 문서](packages/docs/develop.md)를 참고하세요.

## 로컬에서 개선 화면 열기

Node.js와 npm, WebGPU를 사용할 수 있는 브라우저가 필요합니다. Wine Reviews 데모는 데이터와 사전 계산된 지도 좌표, DuckDB 확장 파일을 외부에서 받아오므로 인터넷 연결도 필요합니다.

저장소 루트에서 실행합니다.

```sh
git clone https://github.com/dndnjsgh/embedding-atlas-ux.git
cd embedding-atlas-ux
npm install
npm run build -w @embedding-atlas/utils
npm run dev -w @embedding-atlas/component
```

터미널에 표시된 로컬 주소를 열고 상단 **Component → EmbeddingAtlas dashboard**를 선택하세요. 처음 선택된 `EmbeddingView`는 합성 데이터를 사용하는 별도 개발 데모입니다.

| 메뉴 | 확인할 내용 |
| --- | --- |
| EmbeddingAtlas dashboard | Wine Reviews를 사용하는 전체 대시보드와 개선 기능 |
| EmbeddingView | 배열 데이터를 직접 전달하는 캔버스 컴포넌트 데모 |
| EmbeddingViewMosaic | Mosaic 질의·선택 시스템과 연결된 컴포넌트 데모 |

Mosaic는 이미지 타일을 뜻하지 않습니다. 데이터 질의와 여러 뷰의 선택 상태를 연결하는 기반입니다.

### 실행이 막힐 때

- 지도에 WebGPU 오류가 나오면 브라우저의 WebGPU·그래픽 가속 지원을 확인하세요.
- Wine Reviews 다운로드 오류가 나오면 Hugging Face, Apple 데모 데이터, DuckDB 확장 서버에 접근 가능한지 확인하세요.
- `density_clustering_wasm.js` 누락 오류는 WASM 빌드 산출물이 없는 경우입니다. [개발 문서](packages/docs/develop.md)의 Rust·wasm-bindgen·uv 준비 및 빌드 절차를 따르세요. 전체 빌드 스크립트는 Bash를 사용합니다.
- 데모의 자동 라벨 생성을 꺼 두어도 프로덕션 번들러가 WASM 파일을 요구할 수 있습니다.

## 검증 상태

개선 코드 커밋 당시 viewer 회귀 테스트 **178개가 통과**했습니다. 이 수치는 기능 정확도나 대규모 환경의 성능 보장을 뜻하지 않습니다.

```sh
npm run test -w @embedding-atlas/viewer
npm run check -w @embedding-atlas/viewer
```

최근 커밋 작업에서는 타입 검사의 최종 결과를 확인하지 못했습니다. 새 환경에서의 설치부터 실행까지의 검증, 전체 프로덕션 빌드와 브라우저 시각 검증은 별도로 필요합니다.

## 원본과 라이선스

원본: [apple/embedding-atlas](https://github.com/apple/embedding-atlas). 원본의 MIT 라이선스와 Apple 저작권 표시를 유지합니다. 자세한 조건은 [LICENSE](LICENSE)를 확인하세요.
