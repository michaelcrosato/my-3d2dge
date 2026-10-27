import { countTokens } from 'gpt-tokenizer';
import { readFileSync, readdirSync } from 'node:fs';
const A = process.argv[2], B = process.argv[3];
for (const f of readdirSync(A).filter(f => f.endsWith('.html') && f.startsWith('my-'))) { const a = countTokens(readFileSync(A + '/' + f, 'utf8')), b = countTokens(readFileSync(B + '/' + f, 'utf8')); console.log(f.padEnd(34), a, '->', b, (b - a > 0 ? '+' : '') + (b - a)); }
