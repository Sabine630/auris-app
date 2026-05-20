const fs = require('fs');
const htmlPath = 'd:\\sabine\\小手機\\auris-p36-bugfix.html';
const jsPath = 'd:\\sabine\\小手機\\auris-vue\\src\\original.js';

const content = fs.readFileSync(htmlPath, 'utf8');
const scriptMatches = [...content.matchAll(/<script>([\s\S]*?)<\/script>/g)];

let combinedJs = '';
scriptMatches.forEach((match, index) => {
    combinedJs += `// --- Script Block ${index + 1} ---\n`;
    combinedJs += match[1].trim() + '\n\n';
});

fs.writeFileSync(jsPath, combinedJs, 'utf8');
console.log(`Extracted ${scriptMatches.length} script blocks.`);
