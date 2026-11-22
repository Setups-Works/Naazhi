import { describe, expect, it } from "vitest";
import { E5_VECTOR_DIMENSIONS, LocalE5Embeddings } from "../../src/server/providers/embeddings/localE5";

const enabled = process.env.RUN_LOCAL_E5_TESTS === "1";

describe.skipIf(!enabled)("local multilingual E5 retrieval benchmark", () => {
  it("embeds English and Tamil and ranks the expected user's memories first", async () => {
    const startedAt = performance.now();
    const cpuStarted = process.cpuUsage();
    const initialRss = process.memoryUsage().rss;
    const embeddings = new LocalE5Embeddings();
    const memories = [
      "I prefer black coffee in the morning, without sugar.",
      "எங்கள் குடும்ப நிகழ்ச்சி ஞாயிற்றுக்கிழமை மாலை ஆறு மணிக்கு நடைபெறும்.",
      "I take a walk in the park every evening.",
      "வெள்ளிக்கிழமை மதுரைக்கு பயணம் செய்ய திட்டமிட்டுள்ளேன்.",
    ];
    const queries = [
      { text: "Which drink do I usually choose in the morning?", expected: 0 },
      { text: "காலை நேரத்தில் நான் பொதுவாக எந்த பானத்தை விரும்புகிறேன்?", expected: 0 },
      { text: "எங்கள் குடும்ப நிகழ்ச்சி எந்த நாளில் எத்தனை மணிக்கு நடைபெறும்?", expected: 1 },
      { text: "When is our family event?", expected: 1 },
    ];

    const documentVectors = await embeddings.embedDocuments(memories);
    const results = [];
    for (const query of queries) {
      const queryVector = await embeddings.embedQuery(query.text);
      expect(queryVector).toHaveLength(E5_VECTOR_DIMENSIONS);
      expect(documentVectors.every((vector) => vector.length === E5_VECTOR_DIMENSIONS)).toBe(true);
      expect(Math.abs(Math.hypot(...queryVector) - 1)).toBeLessThan(1e-5);
      expect(documentVectors.every((vector) => Math.abs(Math.hypot(...vector) - 1) < 1e-5)).toBe(true);
      const ranked = documentVectors
        .map((vector, index) => ({ index, similarity: vector.reduce((score, value, i) => score + value * queryVector[i], 0) }))
        .sort((a, b) => b.similarity - a.similarity);
      results.push(ranked[0]?.index === query.expected);
    }

    expect(results.filter(Boolean)).toHaveLength(queries.length);
    const cpuUsed = process.cpuUsage(cpuStarted);
    console.info(
      JSON.stringify({
        benchmark: "local-e5-en-ta-top1",
        queries: queries.length,
        correct: results.filter(Boolean).length,
        elapsedMs: Math.round(performance.now() - startedAt),
        cpuMs: Math.round((cpuUsed.user + cpuUsed.system) / 1_000),
        rssBeforeMb: Math.round(initialRss / 1024 / 1024),
        rssAfterMb: Math.round(process.memoryUsage().rss / 1024 / 1024),
      }),
    );
  }, 180_000);
});
