# 호버 안정화와 수동 분석

[프로젝트 소개](../../README.md) · [개선 기능 전체 설명](./ux-improvements.md)

호버는 개별 점의 정보를 읽는 과정이고, 수동 분석은 여러 점을 의미 있는 그룹으로 정리하는 과정입니다.

## 호버는 어떻게 달라졌나요?

밀집된 전체 지도에서는 점을 찾는 반경을 줄이고, 성긴 영역이나 확대된 상태에서는 반경을 늘립니다. 이미 툴팁이 열린 점에는 조금 더 넓은 유지 범위를 적용해 작은 마우스 움직임으로 옆 점의 툴팁으로 바뀌는 현상을 줄입니다.

## 수동 분석 따라 하기

1. 점을 선택하거나 검색을 실행합니다.
2. **Manual analysis** 패널에서 **Selected points** 또는 **Search results**를 대상으로 선택합니다. 표시된 개수를 확인하세요.
3. 태그를 입력하고 Apply로 적용하거나 대상 점을 하나의 군집으로 만듭니다.
4. 군집 이름을 바꾸고 체크박스를 선택해 지도에서 분포를 확인합니다.
5. 군집을 병합·분리하고 **Export analysis**로 결과를 저장합니다.

Search results는 검색 강조 상태의 ID 집합을 사용하므로 상세 카드의 로딩 개수와 항상 같지는 않습니다.

## 각 작업의 의미

| 작업 | 동작 |
| --- | --- |
| 수동 생성 | 현재 대상 점을 하나의 군집으로 묶음 |
| 자동 생성 | 대상 점의 2차원 좌표를 k-means로 나눔 |
| 이름 변경·태그 | 사용자가 해석한 의미를 기록 |
| Merge selected | 선택한 여러 군집을 합침 |
| Split selected | 군집 하나를 좌표 기준으로 두 그룹으로 나눔 |
| 삭제 | 분석용 군집을 제거하며 원본 데이터 행은 삭제하지 않음 |

자동 생성에는 최소 두 점이 필요합니다. 분리에는 군집 하나만 선택해야 합니다. 원본 Atlas의 밀도 기반 자동 라벨 생성과는 별도 기능입니다.

## 지도 이름표와 내보내기

체크한 군집은 해당 색상으로 강조되고 나머지 점은 흐리게 남습니다. 체크 상태는 병합·분리 작업 대상에도 사용됩니다. 모두 해제하면 수동 군집 강조가 해제됩니다.

**Show cluster names on map**으로 이름표를 켜고 끕니다. 이름표는 점이 없는 공간에 배치하고 대표 위치와 점선으로 연결하며, 공간이 부족하면 숨깁니다.

JSON은 군집 정보·소속 점·태그를 구조적으로 저장합니다. CSV는 주석 또는 군집이 있는 점을 행으로 저장하고 여러 태그와 군집 이름은 `|`로 구분합니다. 분석 상태를 보관하려면 내보내기를 사용하세요. 원본 데이터 변경이나 모델 재학습 기능은 아닙니다.

## 개발자 참고: 설정과 데이터 형식

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

- applying free-form tags to the current point selection or search-highlight IDs;
- creating one manual cluster from the active source;
- generating deterministic coordinate-based clusters with k-means;
- selecting and renaming clusters;
- placing editable cluster names in available space, connected to a representative member point (toggleable in the panel; hidden when no placement fits);
- tagging, merging, splitting, showing, and deleting clusters;
- showing point tags and cluster membership in the point tooltip;
- exporting the analysis as JSON or a flattened CSV file.

JSON exports retain cluster metadata and membership. CSV exports contain one row per annotated or clustered point with pipe-separated tag and cluster-name columns.
