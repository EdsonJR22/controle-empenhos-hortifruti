import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

async function readBuiltText(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const chunks = [];
  for (const entry of entries) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) chunks.push(await readBuiltText(target));
    if (entry.isFile() && /\.(?:js|html|json)$/.test(entry.name)) {
      chunks.push(await fs.readFile(target, "utf8"));
    }
  }
  return chunks.join("\n");
}

test("build contains the commitment-control experience", async () => {
  const distPath = fileURLToPath(new URL("../dist/", import.meta.url));
  const builtText = await readBuiltText(distPath);
  assert.match(builtText, /Controle de Empenhos Hortifruti/i);
  assert.match(builtText, /Empenhos de hortifruti/i);
  assert.match(builtText, /Acessar sistema/i);
  assert.doesNotMatch(builtText, /Starter Project/i);
});
