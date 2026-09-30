// After an edit: format the file with the project's Prettier, so formatting never fails the commit check.
import { readFileSync, writeFileSync } from "node:fs";
import { relative } from "node:path";

const input = JSON.parse(readFileSync(0, "utf8"));
const file = input.tool_input?.file_path;
const root = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
if (!file || relative(root, file).startsWith("..")) process.exit(0);

const prettier = await import(
  new URL("../../node_modules/prettier/index.mjs", import.meta.url).href
);
const info = await prettier.getFileInfo(file, {
  ignorePath: [`${root}/.gitignore`, `${root}/.prettierignore`],
  resolveConfig: true,
});
if (info.ignored || !info.inferredParser) process.exit(0);
const source = readFileSync(file, "utf8");
const options = { ...(await prettier.resolveConfig(file)), filepath: file };
const formatted = await prettier.format(source, options);
if (formatted !== source) writeFileSync(file, formatted);
