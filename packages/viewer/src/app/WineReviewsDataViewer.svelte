<!-- Copyright (c) 2026 Apple Inc. Licensed under MIT License. -->
<script lang="ts">
  import type { EmbeddingViewConfig } from "@embedding-atlas/component";
  import type { Coordinator, DuckDBWASMConnector } from "@uwdata/mosaic-core";

  import Viewer from "./Viewer.svelte";

  import type { EmbeddingAtlasProps } from "../api.js";
  import { initializeDatabase } from "../utils/database.js";
  import { downloadBuffer } from "../utils/download.js";
  import { exportMosaicSelection, type ExportFormat } from "../utils/mosaic_exporter.js";
  import type { DataSource } from "./data_source.js";

  const WINE_REVIEWS_URL =
    "https://huggingface.co/datasets/spawn99/wine-reviews/resolve/e6b10f4db3091a6fed8c5b294c0cc885e7f6e99d/data/train-00000-of-00001.parquet";
  // The projection cache is published with the interactive examples, rather
  // than at the documentation site's root.
  const WINE_REVIEWS_PROJECTION_URL = "https://apple.github.io/embedding-atlas/examples/cache/20687671.parquet";

  class WineReviewsDataSource implements DataSource {
    private embeddingViewConfig: EmbeddingViewConfig | null;

    downloadSelection: ((predicate: string | null, format: ExportFormat) => Promise<void>) | undefined;

    constructor(embeddingViewConfig: EmbeddingViewConfig | null) {
      this.embeddingViewConfig = embeddingViewConfig;
    }

    async initializeCoordinator(
      coordinator: Coordinator,
      table: string,
      onStatus: (message: string) => void,
    ): Promise<Partial<EmbeddingAtlasProps>> {
      onStatus("Initializing local database...");
      await initializeDatabase(coordinator, "wasm");

      // The generic viewer uses a locally bundled extension repository for
      // deployed builds. The component demo has no such bundle, so Parquet
      // autoload must use DuckDB's signed official WASM extensions instead.
      await coordinator.exec("SET custom_extension_repository = 'https://extensions.duckdb.org'");
      onStatus("Loading Parquet support...");
      await coordinator.exec("INSTALL parquet; LOAD parquet;");

      const connector = coordinator.databaseConnector() as DuckDBWASMConnector;
      const db = await connector.getDuckDB();

      onStatus("Downloading Wine Reviews data and embedding map...");
      const [datasetResponse, projectionResponse] = await Promise.all([
        fetch(WINE_REVIEWS_URL),
        fetch(WINE_REVIEWS_PROJECTION_URL),
      ]);
      if (!datasetResponse.ok || !projectionResponse.ok) {
        throw new Error("Wine Reviews 데이터를 다운로드하지 못했습니다. 네트워크 연결을 확인한 뒤 다시 시도해 주세요.");
      }

      const [dataset, projection] = await Promise.all([datasetResponse.arrayBuffer(), projectionResponse.arrayBuffer()]);
      await db.registerFileBuffer("wine-reviews.parquet", new Uint8Array(dataset));
      await db.registerFileBuffer("wine-reviews-projection.parquet", new Uint8Array(projection));

      onStatus("Preparing Wine Reviews embedding map...");
      await coordinator.exec(`
        CREATE OR REPLACE TABLE ${table} AS
        SELECT
          dataset.id,
          dataset.title,
          dataset.country,
          dataset.province,
          dataset.description,
          dataset.points,
          dataset.price,
          dataset.variety,
          dataset.designation,
          projection.x AS projection_x,
          projection.y AS projection_y,
          projection.neighbors
        FROM (
          SELECT
            row_number() OVER (ORDER BY md5(description)) AS id,
            title, country, province, description, points, price, variety, designation
          FROM 'wine-reviews.parquet'
          GROUP BY title, country, province, description, points, price, variety, designation
        ) AS dataset
        LEFT JOIN 'wine-reviews-projection.parquet' AS projection ON dataset.id = projection.id
      `);
      await db.dropFile("wine-reviews.parquet");
      await db.dropFile("wine-reviews-projection.parquet");

      this.downloadSelection = async (predicate, format) => {
        const [bytes, name] = await exportMosaicSelection(coordinator, table, predicate, format);
        downloadBuffer(bytes, name);
      };

      return {
        data: {
          table,
          id: "id",
          projection: { x: "projection_x", y: "projection_y" },
          text: "description",
        },
        embeddingViewConfig: this.embeddingViewConfig,
      };
    }
  }

  interface Props {
    embeddingViewConfig?: EmbeddingViewConfig | null;
  }

  let { embeddingViewConfig = null }: Props = $props();
  let dataSource = $derived(new WineReviewsDataSource(embeddingViewConfig));
</script>

<Viewer {dataSource} />
