const fs = require("fs");
const parser = require("@babel/parser");
const { codeFrameColumns } = require("@babel/code-frame");
const code = fs.readFileSync("src/app/pages/TopicDetailsPage.tsx", "utf8");
try {
  parser.parse(code, { sourceType: "module", plugins: ["typescript", "jsx"] });
  console.log("Parsed OK");
} catch (e) {
  console.error(e.message);
  if (e.loc) {
    console.error("loc", e.loc);
    const frame = codeFrameColumns(
      code,
      { start: { line: e.loc.line, column: e.loc.column } },
      { highlightCode: true },
    );
    console.error(frame);
  }
  process.exit(1);
}
