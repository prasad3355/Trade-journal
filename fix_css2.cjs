const fs = require('fs');
const buf = fs.readFileSync('src/styles/global.css');
let original = buf.toString('utf16le');
let replaced = original.replace(
    'input:not([type=\\\\file\\\\]):not([type=\\\\checkbox\\\\]):not([type=\\\\radio\\\\]), textarea',
    'input:not([type="file"]):not([type="checkbox"]):not([type="radio"]), textarea'
);

if (original !== replaced) {
    fs.writeFileSync('src/styles/global.css', replaced, 'utf16le');
    console.log('Replaced in pure utf16le!');
} else {
    original = buf.toString('utf8');
    replaced = original.replace(
        'input:not([type=\\\\file\\\\]):not([type=\\\\checkbox\\\\]):not([type=\\\\radio\\\\]), textarea',
        'input:not([type="file"]):not([type="checkbox"]):not([type="radio"]), textarea'
    );
    if (original !== replaced) {
        fs.writeFileSync('src/styles/global.css', replaced, 'utf8');
        console.log('Replaced in pure utf8!');
    } else {
        
        let splitIndex = -1;
        for (let i = 0; i < buf.length - 2; i++) {
        if (buf[i] === 0x00 && buf[i+2] === 0x00 && buf[i+4] === 0x00) {
            splitIndex = i - 1; // Approx guess
            break;
        }
        }
        console.log('Split index is ' + splitIndex);
        if (splitIndex !== -1) {
            let part1 = buf.slice(0, splitIndex).toString('utf8');
            let part2 = buf.slice(splitIndex).toString('utf16le');
            let combined = part1 + part2;
            let combinedReplaced = combined.replace(
                'input:not([type=\\\\file\\\\]):not([type=\\\\checkbox\\\\]):not([type=\\\\radio\\\\]), textarea',
                'input:not([type="file"]):not([type="checkbox"]):not([type="radio"]), textarea'
            );
            
            if (combined !== combinedReplaced) {
                // The user says "Preserve the rest of global.css exactly as it is."
                // I will save part1 as UTF-8, and part2Replaced as UTF-16LE, and concat the buffers.
                let part2Replaced = part2.replace(
                    'input:not([type=\\\\file\\\\]):not([type=\\\\checkbox\\\\]):not([type=\\\\radio\\\\]), textarea',
                    'input:not([type="file"]):not([type="checkbox"]):not([type="radio"]), textarea'
                );
                
                let outBuf = Buffer.concat([buf.slice(0, splitIndex), Buffer.from(part2Replaced, 'utf16le')]);
                fs.writeFileSync('src/styles/global.css', outBuf);
                console.log('Replaced using split buffer logic!');
                
                // Also write a utf8 unified version just in case, but keep outBuf to preserve bytes explicitly.
            } else {
                console.log('Still could not find string. Printing part2 slice:', part2.substring(0, 100));
            }
        }    
    }
}
