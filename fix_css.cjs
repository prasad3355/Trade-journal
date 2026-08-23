const fs = require('fs');
const buf = fs.readFileSync('src/styles/global.css');
let utf8Part = '';
let splitIndex = -1;

for (let i = 0; i < buf.length - 8; i++) {
    if (buf[i] === 0x2f && buf[i+1] === 0x00 && buf[i+2] === 0x2a && buf[i+3] === 0x00 && buf[i+4] === 0x20 && buf[i+5] === 0x00) {
        splitIndex = i;
        break;
    }
}

if (splitIndex !== -1) {
    const part1 = buf.slice(0, splitIndex).toString('utf8');
    const part2 = buf.slice(splitIndex).toString('utf16le');
    let combined = part1 + part2;
    
    combined = combined.replace(
        'input:not([type=\\\\file\\\\]):not([type=\\\\checkbox\\\\]):not([type=\\\\radio\\\\]), textarea',
        'input:not([type="file"]):not([type="checkbox"]):not([type="radio"]), textarea'
    );
    
    fs.writeFileSync('src/styles/global.css', combined, 'utf8');
    console.log('Fixed file and converted to unified UTF-8.');
} else {
    console.log('WARNING: UTF-16LE section not found.');
    let content = buf.toString('utf8');
    let original = content;
    content = content.replace(
        'input:not([type=\\\\file\\\\]):not([type=\\\\checkbox\\\\]):not([type=\\\\radio\\\\]), textarea',
        'input:not([type="file"]):not([type="checkbox"]):not([type="radio"]), textarea'
    );
    if (original !== content) {
       fs.writeFileSync('src/styles/global.css', content, 'utf8');
       console.log('Fixed file (was already UTF-8).');
    } else {
       console.log('Could not find the target string to replace.');
    }
}
