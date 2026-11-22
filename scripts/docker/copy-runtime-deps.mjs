// Copies packages that Next.js output tracing misses into the standalone build (Dockerfile, builder stage).
// Transformers.js (local AI-memory embeddings) loads ONNX Runtime and sharp with requires the tracer can't follow, so the image had
// @huggingface/transformers but not its native dependencies. This copies the whole pnpm dependency closure of each root package.
// Usage: node scripts/docker/copy-runtime-deps.mjs <standalone dir> <package>…  (run from the repository root)
import { cpSync, existsSync, readdirSync, realpathSync, rmSync } from "node:fs";
import path from "node:path";

const [outDir, ...roots] = process.argv.slice(2);
if (!outDir || !roots.length) throw new Error("usage: copy-runtime-deps.mjs <standalone dir> <package>…");
const repo = process.cwd();
const store = path.join(repo, "node_modules/.pnpm");

/** `<store>/<name@version>/node_modules/<name>` → `<store>/<name@version>` */
const storeEntry = (pkgDir) => path.join(store, path.relative(store, pkgDir).split(path.sep)[0]);

const seen = new Set();
const queue = roots.map((name) => realpathSync(path.join(repo, "apps/web/node_modules", name)));
while (queue.length) {
  const pkgDir = queue.pop();
  const entry = storeEntry(pkgDir);
  if (seen.has(entry)) continue;
  seen.add(entry);
  // A package's dependencies are its siblings in `<entry>/node_modules` (symlinks into other store entries).
  const siblings = path.join(entry, "node_modules");
  for (const name of readdirSync(siblings)) {
    const names = name.startsWith("@") ? readdirSync(path.join(siblings, name)).map((n) => `${name}/${n}`) : [name];
    for (const n of names) {
      const target = path.join(siblings, n);
      if (existsSync(target)) queue.push(realpathSync(target));
    }
  }
}

for (const entry of seen) {
  // Replace whatever partial copy tracing made of this package, so the copy is complete and symlinks don't clash with folders.
  const target = path.join(outDir, path.relative(repo, entry));
  rmSync(target, { recursive: true, force: true });
  cpSync(entry, target, { recursive: true, verbatimSymlinks: true });
}
console.log(`copied ${seen.size} package(s) for ${roots.join(", ")}`);
