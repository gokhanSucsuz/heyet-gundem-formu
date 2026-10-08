// Prints a non-reversible fingerprint of ENCRYPTION_KEY from .env (never prints the key itself)
const fs = require('fs');
const crypto = require('crypto');

const raw = fs.readFileSync('.env');
const hasBom = raw[0] === 0xef && raw[1] === 0xbb && raw[2] === 0xbf;
const utf8Valid = Buffer.from(raw.toString('utf8'), 'utf8').equals(raw);
console.log('BOM:', hasBom, '| valid UTF-8:', utf8Valid);

process.loadEnvFile('.env');
const key = (process.env.ENCRYPTION_KEY || '').replace(/^["']|["']$/g, '').trim();
const nonAscii = [...key].filter((c) => c.charCodeAt(0) > 127).length;
const specials = [...new Set([...key].filter((c) => /[$`"'\\%&^<>!]/.test(c)))].join(' ');

console.log('length:', key.length, '| non-ASCII chars:', nonAscii, '| special chars:', specials);
console.log('sha256 fp:', crypto.createHash('sha256').update(key, 'utf8').digest('hex').slice(0, 12));
console.log('SALT set:', !!process.env.ENCRYPTION_SALT);
console.log('\nENCRYPTION_KEY_B64=' + Buffer.from(key, 'utf8').toString('base64'));
