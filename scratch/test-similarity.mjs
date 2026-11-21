import { pipeline } from "@huggingface/transformers";

const pipe = await pipeline("feature-extraction", "Xenova/multilingual-e5-small", { dtype: "q8" });

function dot(a, b) {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}

const docOut = await pipe(["passage: User prefers vegetarian meals with tofu and spinach."], {
  pooling: "mean",
  normalize: true,
});
const docVec = Array.from(docOut.data);

const queries = [
  "quantum computing and cryogenic cooling",
  "financial quarterly earnings revenue EBITDA balance sheet amortization",
  "error 404: kernel page fault interrupt vector 0x0000003b at 0xfffff800",
  "12345 67890 !@#$%^&*()",
  "xyz123 random noise 987",
  "0000000000000000000000000000000000000000000000000000000000000000",
  "A quick brown fox jumps over the lazy dog",
  "C++ template metaprogramming compiler error",
  "assembly language opcode 0x90 nop instructions",
];

for (const q of queries) {
  const qOut = await pipe([`query: ${q}`], { pooling: "mean", normalize: true });
  const sim = dot(docVec, Array.from(qOut.data));
  console.log(`${sim.toFixed(4)} : ${q}`);
}
