const fs = require("fs");
const parser = require("@babel/parser");
const code = fs.readFileSync("src/app/pages/TopicDetailsPage.tsx", "utf8");
try {
  parser.parse(code, { sourceType: "module", plugins: ["typescript", "jsx"] });
  console.log("Parsed OK");
} catch (e) {
  console.error(e.message);
  if (e.loc) console.error("loc", e.loc);
  if (e.codeFrame) console.error("\n", e.codeFrame);
  process.exit(1);
}
