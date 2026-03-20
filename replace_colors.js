const fs = require('fs');
let code = fs.readFileSync('style.css', 'utf8');

// We want to preserve :root definitions, so we'll replace only outside :root, or just fix it afterwards
code = code.replace(/border: (\d+)px solid #111/g, 'border: $1px solid var(--glass-border)');
code = code.replace(/box-shadow: (\d+)px (\d+)px 0px #111/g, 'box-shadow: $1px $2px 0px var(--glass-border)');
code = code.replace(/color: #111;/g, 'color: var(--text-primary);');
code = code.replace(/color: #111111;/g, 'color: var(--text-primary);');
code = code.replace(/border-color: #111;/g, 'border-color: var(--glass-border);');
code = code.replace(/border: 2px solid #111;/g, 'border: 2px solid var(--glass-border);');

// Restore the root variables if they were touched (they shouldn't be touched by the above regexes except maybe the exact color hexes, but the above didn't randomly match #111111 if not preceded by `color: `).
code = code.replace(/--glass-border: var\(--text-primary\);/, '--glass-border: #111111;');
code = code.replace(/--text-primary: var\(--text-primary\);/, '--text-primary: #111111;');

fs.writeFileSync('style.css', code);
