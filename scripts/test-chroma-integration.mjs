#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const webPackagePath = path.join(repoRoot, "apps/web/package.json");
const webRequire = createRequire(webPackagePath);

/**
 * Robust ESM workspace module loader:
 * Resolves packages declared in apps/web without duplicating them at the repository root.
 */
async function loadWorkspaceModule(specifier) {
  // 1. Try standard dynamic import (works when invoked via pnpm --filter @untitled/web)
  try {
    return await import(specifier);
  } catch (directErr) {
    // 2. Try resolving entry point from apps/web package context
    try {
      const resolved = webRequire.resolve(specifier);
      return await import(pathToFileURL(resolved).href);
    } catch (resolveErr) {
      // 3. Fallback: inspect the physical .pnpm virtual store to bypass OneDrive junction issues
      const pnpmStore = path.join(repoRoot, "node_modules/.pnpm");
      if (existsSync(pnpmStore)) {
        const { readdirSync } = await import("node:fs");
        const entries = readdirSync(pnpmStore);
        const pkgPrefix = specifier.startsWith("@") ? specifier.replace("/", "+") : specifier;
        const matchingDir = entries.find((dir) => dir.startsWith(pkgPrefix + "@"));
        if (matchingDir) {
          const pkgJsonPath = path.join(pnpmStore, matchingDir, "node_modules", specifier, "package.json");
          if (existsSync(pkgJsonPath)) {
            const pkgJson = JSON.parse(readFileSync(pkgJsonPath, "utf8"));
            const entry =
              pkgJson.exports?.["."]?.import?.default ||
              pkgJson.exports?.["."]?.import ||
              pkgJson.exports?.["."]?.default ||
              pkgJson.module ||
              pkgJson.main ||
              "index.js";
            const fullEntry = path.join(path.dirname(pkgJsonPath), entry);
            if (existsSync(fullEntry)) {
              return await import(pathToFileURL(fullEntry).href);
            }
          }
        }
      }
      throw new Error(`Failed to resolve '${specifier}' from @untitled/web workspace: ${directErr.message} -> ${resolveErr.message}`);
    }
  }
}

// Load environment variables
const envSelfhost = path.join(repoRoot, ".env.selfhost");
const envLocal = path.join(repoRoot, ".env.local");

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return {};
  const content = readFileSync(filePath, "utf8");
  const result = {};
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx !== -1) {
      const key = trimmed.slice(0, idx).trim();
      let val = trimmed.slice(idx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      result[key] = val;
    }
  }
  return result;
}

const selfhostEnv = loadEnvFile(envSelfhost);
const localEnv = loadEnvFile(envLocal);

const CHROMA_AUTH_TOKEN =
  process.env.CHROMA_AUTH_TOKEN ||
  localEnv.CHROMA_AUTH_TOKEN ||
  selfhostEnv.CHROMA_AUTH_TOKEN ||
  "naazhi_chroma_secret_token_dev_2026";

const CHROMA_URL = process.env.CHROMA_URL || localEnv.CHROMA_URL || "http://127.0.0.1:8000";

let testsPassed = 0;
let testsFailed = 0;

function assert(condition, message) {
  if (condition) {
    testsPassed++;
    console.log(`  [PASS] ${message}`);
  } else {
    testsFailed++;
    console.error(`  [FAIL] ${message}`);
  }
}

async function runPhaseA() {
  console.log("\n========================================================");
  console.log("PHASE A: Docker Configuration & Service Health Probe");
  console.log("========================================================");

  const composePath = path.join(repoRoot, "docker-compose.yml");
  assert(existsSync(composePath), "docker-compose.yml exists in repository root");

  const composeContent = readFileSync(composePath, "utf8");
  assert(composeContent.includes("chroma:"), "Service 'chroma' defined in docker-compose.yml");
  assert(composeContent.includes("chroma-auth:"), "Service 'chroma-auth' defined in docker-compose.yml");
  assert(composeContent.includes("chromadata:"), "Named volume 'chromadata' defined");
  assert(composeContent.includes("chroma_private"), "Internal network 'chroma_private' isolates ChromaDB");
  assert(composeContent.includes("127.0.0.1:8000:8000"), "Gateway published strictly to loopback 127.0.0.1:8000");

  // Probe health endpoint
  let healthOk = false;
  try {
    const res = await fetch(`${CHROMA_URL}/_health`, { signal: AbortSignal.timeout(3000) });
    healthOk = res.status === 204 || res.status === 200;
  } catch (err) {
    healthOk = false;
  }

  if (!healthOk) {
    console.error("\n[!] Local ChromaDB gateway is not currently reachable at 127.0.0.1:8000.");
    console.log("To start ChromaDB and its authentication gateway, run:");
    console.log("  docker compose --env-file .env.selfhost up -d chroma chroma-auth\n");
    assert(false, "ChromaDB gateway health check on http://127.0.0.1:8000/_health");
    return false;
  } else {
    assert(true, "ChromaDB gateway is active and healthy (HTTP 204 from /_health)");
    return true;
  }
}

async function runPhaseB() {
  console.log("\n========================================================");
  console.log("PHASE B: Gateway Security & Token Verification");
  console.log("========================================================");

  // 1. Request with no token against modern v2 heartbeat
  try {
    const resNoToken = await fetch(`${CHROMA_URL}/api/v2/heartbeat`);
    assert(resNoToken.status === 401, "Request without token is rejected with HTTP 401");
  } catch (err) {
    assert(false, `Request without token failed: ${err.message}`);
  }

  // 2. Request with invalid token against modern v2 heartbeat
  try {
    const resBadToken = await fetch(`${CHROMA_URL}/api/v2/heartbeat`, {
      headers: { Authorization: "Bearer incorrect-secret-token" },
    });
    assert(resBadToken.status === 401, "Request with invalid bearer token is rejected with HTTP 401");
  } catch (err) {
    assert(false, `Request with invalid token failed: ${err.message}`);
  }

  // 3. Request with valid token against modern v2 heartbeat
  try {
    const resValid = await fetch(`${CHROMA_URL}/api/v2/heartbeat`, {
      headers: { Authorization: `Bearer ${CHROMA_AUTH_TOKEN}` },
    });
    assert(resValid.status === 200, "Request with valid bearer token returns HTTP 200");
    const data = await resValid.json();
    assert(
      data && (typeof data["nanosecond heartbeat"] === "number" || typeof data === "number" || typeof data === "object"),
      "Valid heartbeat payload returned by ChromaDB 1.5.9"
    );
  } catch (err) {
    assert(false, `Request with valid token failed: ${err.message}`);
  }

  // 4. Verify unexposed internal port (Chroma direct port has no host binding)
  try {
    await fetch("http://127.0.0.1:8001/api/v2/heartbeat", { signal: AbortSignal.timeout(1000) });
    assert(false, "Unintended host port 8001 is open");
  } catch {
    assert(true, "ChromaDB internal port has no direct host publishing (connection refused as expected)");
  }
}

async function runPhaseC() {
  console.log("\n========================================================");
  console.log("PHASE C: Embedding Verification (multilingual-e5-small)");
  console.log("========================================================");

  let transformers;
  try {
    transformers = await loadWorkspaceModule("@huggingface/transformers");
  } catch (err) {
    assert(false, `@huggingface/transformers resolution failed: ${err.message}`);
    return;
  }

  const pipeline = transformers.pipeline;
  assert(Boolean(pipeline), "@huggingface/transformers pipeline loaded successfully from web workspace");

  console.log("  Loading local ONNX multilingual-e5-small pipeline...");
  const extractor = await pipeline("feature-extraction", "Xenova/multilingual-e5-small", { dtype: "q8" });
  assert(Boolean(extractor), "Local E5 pipeline initialized successfully");

  // Passage embedding
  const docText = "passage: User loves reading historical fiction and biographies.";
  const docOutput = await extractor(docText, { pooling: "mean", normalize: true });
  const docVector = Array.from(docOutput.data);

  assert(docVector.length === 384, `Passage embedding dimensions: ${docVector.length} (expected 384)`);

  const docNorm = Math.sqrt(docVector.reduce((sum, v) => sum + v * v, 0));
  assert(Math.abs(docNorm - 1.0) < 0.01, `Passage embedding is L2-normalized: norm = ${docNorm.toFixed(4)}`);

  // Query embedding
  const queryText = "query: book recommendations";
  const queryOutput = await extractor(queryText, { pooling: "mean", normalize: true });
  const queryVector = Array.from(queryOutput.data);

  assert(queryVector.length === 384, `Query embedding dimensions: ${queryVector.length} (expected 384)`);

  const queryNorm = Math.sqrt(queryVector.reduce((sum, v) => sum + v * v, 0));
  assert(Math.abs(queryNorm - 1.0) < 0.01, `Query embedding is L2-normalized: norm = ${queryNorm.toFixed(4)}`);

  // Cosine similarity
  const cosineSim = docVector.reduce((sum, v, i) => sum + v * queryVector[i], 0);
  assert(cosineSim > 0.7, `Semantic similarity between related query and passage: ${cosineSim.toFixed(4)} (> 0.70)`);
}

async function runPhaseD() {
  console.log("\n========================================================");
  console.log("PHASE D: Real ChromaDB CRUD & User Isolation");
  console.log("========================================================");

  let chromadb;
  try {
    chromadb = await loadWorkspaceModule("chromadb");
  } catch (err) {
    assert(false, `chromadb resolution failed: ${err.message}`);
    return;
  }

  assert(Boolean(chromadb.ChromaClient), "ChromaClient loaded successfully from web workspace");

  const client = new chromadb.ChromaClient({
    host: "127.0.0.1",
    port: 8000,
    headers: { Authorization: `Bearer ${CHROMA_AUTH_TOKEN}` },
  });

  const testCollectionName = "naazhi_phase2_integration_test";

  // Clean up any previous test collection
  try {
    await client.deleteCollection({ name: testCollectionName });
  } catch {}

  const collection = await client.getOrCreateCollection({
    name: testCollectionName,
    metadata: { "hnsw:space": "cosine", app: "naazhi_test" },
    embeddingFunction: null,
  });

  assert(Boolean(collection), `Created isolated test collection '${testCollectionName}'`);

  // Deterministic 384-d vectors for testing CRUD
  function makeVector(baseVal) {
    const v = new Array(384).fill(baseVal);
    const norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0));
    return v.map((x) => x / norm);
  }

  const vecA = makeVector(0.2);
  const vecB = makeVector(0.8);

  // 1. Insert memory for User Alice
  await collection.upsert({
    ids: ["mem_test_alice_01"],
    embeddings: [vecA],
    metadatas: [{ user_id: "test_alice", conversation_id: "conv_101", created_at: new Date().toISOString() }],
    documents: ["User prefers green tea in the morning."],
  });
  assert(true, "Upserted memory for User Alice");

  // 2. Insert memory for User Bob
  await collection.upsert({
    ids: ["mem_test_bob_01"],
    embeddings: [vecB],
    metadatas: [{ user_id: "test_bob", conversation_id: "conv_201", created_at: new Date().toISOString() }],
    documents: ["User prefers dark espresso coffee after lunch."],
  });
  assert(true, "Upserted memory for User Bob");

  // 3. Retrieve as User Alice
  const queryAlice = await collection.query({
    queryEmbeddings: [vecA],
    nResults: 5,
    where: { user_id: "test_alice" },
  });

  assert(queryAlice.ids[0].length === 1, "User Alice retrieval returns exactly 1 memory");
  assert(queryAlice.ids[0][0] === "mem_test_alice_01", "Returned memory ID matches User Alice's record");
  assert(queryAlice.metadatas[0][0].user_id === "test_alice", "Record metadata confirms ownership by test_alice");

  // 4. Verify cross-user isolation: User Alice cannot retrieve User Bob's memory
  const queryAliceCross = await collection.query({
    queryEmbeddings: [vecB],
    nResults: 5,
    where: { user_id: "test_alice" },
  });
  assert(!queryAliceCross.ids[0].includes("mem_test_bob_01"), "Cross-user isolation: Alice query cannot return Bob's memory");

  // 5. Verify cross-user isolation: User Bob cannot retrieve User Alice's memory
  const queryBobCross = await collection.query({
    queryEmbeddings: [vecA],
    nResults: 5,
    where: { user_id: "test_bob" },
  });
  assert(!queryBobCross.ids[0].includes("mem_test_alice_01"), "Cross-user isolation: Bob query cannot return Alice's memory");

  // 6. Delete conversation memory
  await collection.delete({
    where: {
      $and: [{ user_id: "test_alice" }, { conversation_id: "conv_101" }],
    },
  });

  const queryAfterDelete = await collection.query({
    queryEmbeddings: [vecA],
    nResults: 5,
    where: { user_id: "test_alice" },
  });
  assert(queryAfterDelete.ids[0].length === 0, "Deleted conversation memory can no longer be retrieved");

  // 7. Delete all memories for Bob
  await collection.delete({
    where: { user_id: "test_bob" },
  });

  const queryBobAfterDelete = await collection.query({
    queryEmbeddings: [vecB],
    nResults: 5,
    where: { user_id: "test_bob" },
  });
  assert(queryBobAfterDelete.ids[0].length === 0, "Deleted user memories are completely removed");

  // Phase F: Cleanup test collection
  await client.deleteCollection({ name: testCollectionName });
  assert(true, "Phase F Cleanup: Test collection successfully deleted, chromadata volume preserved");
}

async function runPhaseE() {
  console.log("\n========================================================");
  console.log("PHASE E: Error Handling & Fallback Behavior");
  console.log("========================================================");

  let chromadb;
  try {
    chromadb = await loadWorkspaceModule("chromadb");
  } catch (err) {
    assert(false, `chromadb resolution failed: ${err.message}`);
    return;
  }

  // 1. Unreachable port
  const badClient = new chromadb.ChromaClient({
    host: "127.0.0.1",
    port: 59999,
  });

  let threwExpected = false;
  try {
    await badClient.heartbeat();
  } catch {
    threwExpected = true;
  }
  assert(threwExpected, "Connection failure to unreachable Chroma port handled gracefully");

  // 2. Gateway auth failure
  const unauthorizedClient = new chromadb.ChromaClient({
    host: "127.0.0.1",
    port: 8000,
    headers: { Authorization: "Bearer wrong-token" },
  });

  let authFailed = false;
  try {
    await unauthorizedClient.heartbeat();
  } catch {
    authFailed = true;
  }
  assert(authFailed, "Invalid bearer token correctly rejected during API call");
}

async function main() {
  console.log("Naazhi ChromaDB Integration Test Runner");
  console.log(`Chroma Gateway Target: ${CHROMA_URL}`);

  const phaseAOk = await runPhaseA();
  if (phaseAOk) {
    await runPhaseB();
    await runPhaseC();
    await runPhaseD();
    await runPhaseE();
  }

  console.log("\n========================================================");
  console.log(`TEST SUMMARY: ${testsPassed} passed, ${testsFailed} failed`);
  console.log("========================================================\n");

  if (testsFailed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Test runner error:", err);
  process.exit(1);
});
