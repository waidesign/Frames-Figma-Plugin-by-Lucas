// Copyright (c) 2026 Lucas. See LICENSE.
// Builds the plugin:
//   src/code.ts      -> code.js  (Figma main thread, sandboxed JS)
//   src/ui/main.tsx  -> ui.html  (single file, JS + CSS inlined)
import * as esbuild from "esbuild";
import { writeFile } from "node:fs/promises";

const watch = process.argv.includes("--watch");

/** @type {import("esbuild").BuildOptions} */
const codeOptions = {
  entryPoints: ["src/code.ts"],
  bundle: true,
  outfile: "code.js",
  format: "iife",
  // The Figma plugin sandbox does not support every modern syntax feature; ES2017 is safe.
  target: "es2017",
  logLevel: "info",
};

/** Writes ui.html with the bundled JS and CSS inlined. */
const inlineHtmlPlugin = {
  name: "inline-html",
  setup(build) {
    build.onEnd(async (result) => {
      if (result.errors.length || !result.outputFiles) return;
      const js = result.outputFiles.find((f) => f.path.endsWith(".js"))?.text ?? "";
      const css = result.outputFiles.find((f) => f.path.endsWith(".css"))?.text ?? "";
      const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Fold Ruler &amp; Grids</title>
<style>${css.replace(/<\/style/gi, "<\\/style")}</style>
</head>
<body>
<div id="app"></div>
<script>${js.replace(/<\/script/gi, "<\\/script")}</script>
</body>
</html>
`;
      await writeFile("ui.html", html);
      console.log("  ui.html written");
    });
  },
};

/** @type {import("esbuild").BuildOptions} */
const uiOptions = {
  entryPoints: ["src/ui/main.tsx"],
  bundle: true,
  write: false,
  outdir: "build-ui",
  format: "iife",
  target: "es2020",
  jsx: "automatic",
  jsxImportSource: "preact",
  minify: !watch,
  logLevel: "info",
  plugins: [inlineHtmlPlugin],
};

if (watch) {
  const contexts = await Promise.all([esbuild.context(codeOptions), esbuild.context(uiOptions)]);
  await Promise.all(contexts.map((ctx) => ctx.watch()));
  console.log("Watching for changes…");
} else {
  await Promise.all([esbuild.build(codeOptions), esbuild.build(uiOptions)]);
}
