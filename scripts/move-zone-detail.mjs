import fs from "node:fs";

const path = "src/components/dashboard/ZonesWorkspace.tsx";
const lines = fs.readFileSync(path, "utf8").split(/\n/);
const start = lines.findIndex((line) => line.includes("{composing && detailsOpen ? ("));
const end = lines.findIndex((line, index) => index > start && line.trim() === ") : null}" && lines[index - 1]?.includes("</div>") && lines[index - 2]?.includes("</section>"));
if (start < 0 || end < 0) {
  console.error("markers", start, end);
  process.exit(1);
}
const block = lines.slice(start, end + 1);
const inner = block
  .filter((line, index) => {
    if (line.includes("zone-detail-modal") && line.includes("<div")) return false;
    if (index === block.length - 2 && line.trim() === "</div>") return false;
    if (line.includes('role="dialog"')) return false;
    if (line.includes("aria-modal")) return false;
    if (line.includes("stopPropagation")) return false;
    return true;
  })
  .map((line) =>
    line.replace(
      'className="dash-card zone-detail-modal__card"',
      'className="dash-card zone-detail-card"',
    ),
  );
const without = [...lines.slice(0, start), ...lines.slice(end + 1)];
const sheetAt = without.findIndex((line) => line.includes('className="zones-studio__sheet"'));
if (sheetAt < 0) {
  console.error("sheet missing");
  process.exit(1);
}
const next = [...without.slice(0, sheetAt + 1), ...inner, ...without.slice(sheetAt + 1)];
fs.writeFileSync(path, next.join("\n"));
console.log(`moved lines ${start + 1}-${end + 1} (${inner.length} kept)`);
