const fs = require('fs');
let code = fs.readFileSync('style.css', 'utf8');

// Fix double semicolons
code = code.replace(/;;/g, ';');

// Fix button hovers
code = code.replace(/    transform: translateY\(-2px\);\n    box-shadow: 6px 6px 0px var\(--glass-border\); transform: translate\(-2px, -2px\);/g, 
    '    transform: translate(-2px, -4px);\n    box-shadow: 6px 6px 0px var(--glass-border);');

code = code.replace(/    transform: translateY\(-3px\);\n    box-shadow: 6px 6px 0px var\(--glass-border\); transform: translate\(-2px, -2px\); border-color: var\(--glass-border\);/g, 
    '    transform: translate(-2px, -5px);\n    box-shadow: 6px 6px 0px var(--glass-border); border-color: var(--glass-border);');

// Fix tier-card hover
code = code.replace(/    transform: translateY\(-8px\);\n    box-shadow: 8px 8px 0px var\(--glass-border\); transform: translate\(-2px, -2px\);/g,
    '    transform: translate(-2px, -8px);\n    box-shadow: 8px 8px 0px var(--accent-purple);');

fs.writeFileSync('style.css', code);
