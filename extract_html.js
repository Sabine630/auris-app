const fs = require('fs');
const htmlPath = 'd:\\sabine\\小手機\\auris-p36-bugfix.html';
const outPath = 'd:\\sabine\\小手機\\auris-vue\\src\\original.html';

const content = fs.readFileSync(htmlPath, 'utf8');
const match = content.match(/<body[^>]*>([\s\S]*?)<\/body>/);

if (match) {
    fs.writeFileSync(outPath, match[1].trim(), 'utf8');
    console.log('HTML body extracted successfully.');
} else {
    console.log('No body tag found.');
}
