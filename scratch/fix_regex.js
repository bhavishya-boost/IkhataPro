const fs = require('fs');
let content = fs.readFileSync('js/modules/storefront.js', 'utf8');
const lines = content.split('\n');

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('cleanSlug') && lines[i].includes('decodeURIComponent')) {
    // Replace with the correct line
    lines[i] = "    const cleanSlug = decodeURIComponent(raw).replace(/^#?\\\/?(shop\\\/)?/, '').split('/')[0].split('?')[0].trim().toLowerCase();";
    console.log('Fixed line', i + 1);
    console.log('New content:', lines[i]);
    break;
  }
}

fs.writeFileSync('js/modules/storefront.js', lines.join('\n'), 'utf8');
console.log('Done!');
