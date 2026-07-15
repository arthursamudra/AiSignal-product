const fs = require('fs');
const html = fs.readFileSync('landing.html', 'utf8');

const getSection = (id) => {
  const match = html.match(new RegExp(`<section id="${id}"[\\s\\S]*?</section>`));
  return match ? match[0] : null;
};

console.log("=== ASK TELEMETRY ===");
console.log(getSection('ask-telemetry'));

console.log("\n=== POSTMORTEM ===");
console.log(getSection('postmortem'));

console.log("\n=== CONSOLE ===");
console.log(getSection('console'));
