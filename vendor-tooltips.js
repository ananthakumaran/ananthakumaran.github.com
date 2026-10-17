const fs = require("fs/promises");
const path = require("path");

async function main() {
  const output = path.join(__dirname, "public", "vendor", "tooltips");
  const tippy = path.dirname(require.resolve("tippy.js/package.json"));
  const popper = path.dirname(require.resolve("@popperjs/core/package.json"));
  await fs.mkdir(output, { recursive: true });
  const files = [
    [tippy, "dist/tippy.umd.min.js", "tippy.umd.min.js"],
    [tippy, "dist/tippy.css", "tippy.css"],
    [popper, "dist/umd/popper.min.js", "popper.min.js"],
  ];
  for (const [directory, source, destination] of files) {
    await fs.copyFile(path.join(directory, source), path.join(output, destination));
  }
  console.log("Copied Tippy.js, Popper and styles to public/vendor/tooltips");
}

main().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
