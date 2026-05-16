const fs = require("fs");
const parser = require("@babel/parser");
const code = fs.readFileSync("src/app/pages/TopicDetailsPage.tsx", "utf8");
try {
  parser.parse(code, {
    sourceType: "module",
    plugins: ["typescript", "jsx", "decorators-legacy"],
  });
  console.log("Parsed OK");
} catch (e) {
  console.error(e.message);
  console.error(e.loc);
  process.exit(1);
}
