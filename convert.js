const fs = require('fs');

const html = fs.readFileSync('/Users/rushikesh/.gemini/antigravity/brain/bbeae24e-8274-4502-acb3-888cf5fa32e1/.system_generated/steps/1377/content.md', 'utf8');

// Match everything from the FIRST <main ...> up to the LAST </main>
const firstMain = html.indexOf('<main');
const lastMainEnd = html.lastIndexOf('</main>');

if (firstMain === -1 || lastMainEnd === -1) {
  console.log("Could not find main element");
  process.exit(1);
}

// Extract the inner content of the outermost <main>
// First, find where the opening tag ends
const firstMainEnd = html.indexOf('>', firstMain) + 1;
const innerHtml = html.substring(firstMainEnd, lastMainEnd);

let jsx = `<main className="min-w-0 overflow-x-hidden pt-14 sm:pt-16 bg-white text-slate-950">\n` + innerHtml + `\n</main>`;

// Convert HTML to JSX
jsx = jsx.replace(/class=/g, 'className=')
         .replace(/stroke-width=/g, 'strokeWidth=')
         .replace(/stroke-linecap=/g, 'strokeLinecap=')
         .replace(/stroke-linejoin=/g, 'strokeLinejoin=')
         .replace(/charSet=/g, 'charSet=')
         .replace(/for=/g, 'htmlFor=')
         .replace(/style="([^"]*)"/g, (match, style) => {
             const props = style.split(';').filter(Boolean).map(s => {
                 let [key, val] = s.split(':');
                 if (!val) return '';
                 key = key.trim().replace(/-([a-z])/g, g => g[1].toUpperCase());
                 return `${key}: '${val.trim()}'`;
             });
             return `style={{${props.join(', ')}}}`;
         });

// Handle self-closing tags
const selfClosingTags = ['img', 'br', 'hr', 'input', 'circle', 'path', 'ellipse', 'rect', 'line', 'polyline', 'polygon'];
selfClosingTags.forEach(tag => {
    const regex = new RegExp(`<${tag}([^>]*?)(?<!/)>`, 'g');
    jsx = jsx.replace(regex, `<${tag}$1 />`);
});
jsx = jsx.replace(/<\/(circle|path|ellipse|rect|line|polyline|polygon)>/g, '');

// Remove HTML comments
jsx = jsx.replace(/<!--.*?-->/g, '');

// Fix braces in specific code blocks
jsx = jsx.replace(/<code>(.*?)<\/code>/g, (match, inner) => {
    return '<code>{\`' + inner + '\`}</code>';
});

const finalFile = `import { ArrowRight, Radio, Brain, FileText, TriangleAlert, FileSearch, Layers } from "lucide-react";

export default function Home() {
  return (
    ${jsx}
  );
}
`;

fs.writeFileSync('/Users/rushikesh/aisignal-product/src/app/page.tsx', finalFile);
console.log("Converted successfully!");
