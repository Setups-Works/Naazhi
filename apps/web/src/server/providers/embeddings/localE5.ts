import "server-only";
import type { FeatureExtractionPipeline } from "@huggingface/transformers";

export const E5_MODEL_ID = "Xenova/multilingual-e5-small";
export const E5_MODEL_VERSION = "intfloat/multilingual-e5-small";
export const E5_VECTOR_DIMENSIONS = 384;
const MAX_BATCH_SIZE = 16;

let pipelinePromise: Promise<FeatureExtractionPipeline> | undefined;

function getPipeline(): Promise<FeatureExtractionPipeline> {
  if (!pipelinePromise) {
    // Loaded on first use, not at import: ONNX Runtime is a native library, and if it can't load on a host, only memory may stop
    // working. A top-level import would fail every module that reaches this file (the chat route) and the production build.
    pipelinePromise = import("@huggingface/transformers")
      .then(({ pipeline }) => pipeline("feature-extraction", E5_MODEL_ID, { dtype: "q8" }))
      .catch((error: unknown) => {
      pipelinePromise = undefined;
      throw error;
    });
  }
  return pipelinePromise;
}

function unitVector(values: ArrayLike<number>): number[] {
  if (values.length !== E5_VECTOR_DIMENSIONS) throw new Error("The local E5 model returned an unexpected vector size.");
  let norm = 0;
  const vector = Array.from(values, (value) => {
    if (!Number.isFinite(value)) throw new Error("The local E5 model returned a non-finite vector value.");
    norm += value * value;
    return value;
  });
  norm = Math.sqrt(norm);
  if (!Number.isFinite(norm) || norm === 0) throw new Error("The local E5 model returned an invalid vector.");
  return vector.map((value) => value / norm);
}

/** Local CPU embeddings. No text leaves this Node process for embedding. */
export class LocalE5Embeddings {
  constructor(_params?: { maxConcurrency?: number }) {}

  async embedQuery(text: string): Promise<number[]> {
    const [vector] = await this.embedBatch([`query: ${text}`]);
    if (!vector) throw new Error("The local E5 model did not return a query vector.");
    return vector;
  }

  async embedDocuments(texts: string[]): Promise<number[][]> {
    const vectors: number[][] = [];
    for (let start = 0; start < texts.length; start += MAX_BATCH_SIZE) {
      const batch = texts.slice(start, start + MAX_BATCH_SIZE).map((text) => `passage: ${text}`);
      vectors.push(...(await this.embedBatch(batch)));
    }
    return vectors;
  }

  private async embedBatch(texts: string[]): Promise<number[][]> {
    if (!texts.length) return [];
    const model = await getPipeline();
    const output = await model(texts, { pooling: "mean", normalize: true });
    const [batchCount, dimensions] = output.dims;
    if (batchCount !== texts.length || dimensions !== E5_VECTOR_DIMENSIONS || output.data.length !== batchCount * dimensions) {
      throw new Error("The local E5 model returned an unexpected output shape.");
    }
    return texts.map((_, index) => {
      const start = index * E5_VECTOR_DIMENSIONS;
      const values = Array.from({ length: E5_VECTOR_DIMENSIONS }, (_, offset) => Number(output.data[start + offset]));
      return unitVector(values);
    });
  }
}
