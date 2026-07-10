import { access, cp, mkdir, rename, rm } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const openNext = path.join(root, ".open-next");
const dist = path.join(root, "dist");
const server = path.join(dist, "server");
const client = path.join(dist, "client");

await access(path.join(openNext, "worker.js"));
await rm(dist, { recursive: true, force: true });
await mkdir(server, { recursive: true });
await cp(openNext, server, { recursive: true });
await rename(path.join(server, "worker.js"), path.join(server, "index.js"));
await rename(path.join(server, "assets"), client);

console.log("Staged OpenNext output for Sites.");
