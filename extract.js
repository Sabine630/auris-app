const fs = require('fs');
const htmlPath = 'd:\\sabine\\小手機\\auris-p36-bugfix.html';
const cssPath = 'd:\\sabine\\小手機\\auris-vue\\src\\assets\\main.css';

const content = fs.readFileSync(htmlPath, 'utf8');
const match = content.match(/<style>([\s\S]*?)<\/style>/);

if (match) {
    fs.writeFileSync(cssPath, match[1].trim(), 'utf8');
    console.log('CSS extracted successfully.');
} else {
    console.log('No style tag found.');
}
