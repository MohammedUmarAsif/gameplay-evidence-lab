import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
const root = resolve("dist"),
  prefix = "/test-repository/";
const types = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
};
createServer(async (req, res) => {
  try {
    const path = decodeURIComponent(
      new URL(req.url, "http://localhost").pathname,
    );
    if (!path.startsWith(prefix)) {
      res.writeHead(404).end();
      return;
    }
    const target = resolve(root, path.slice(prefix.length) || "index.html");
    if (target !== root && !target.startsWith(root + sep)) {
      res.writeHead(403).end();
      return;
    }
    res.writeHead(200, {
      "Content-Type": types[extname(target)] ?? "application/octet-stream",
    });
    res.end(await readFile(target));
  } catch {
    res.writeHead(404).end();
  }
}).listen(4174, "127.0.0.1", () =>
  console.log("Subpath preview: http://127.0.0.1:4174/test-repository/"),
);
