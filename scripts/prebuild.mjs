// Runs before `next build` and `next dev`.
import "./copy-worker.mjs";
await import("./fetch-natura.mjs");
