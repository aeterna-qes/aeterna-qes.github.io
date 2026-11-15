// Builds the password-protected tester copy at ../test/ (served as aeterna-qes.github.io/test/).
//   PowerShell:  $env:TEST_PASSWORD = 'your-password'; node tools/build-test.mjs
//   Git Bash:    TEST_PASSWORD='your-password' node tools/build-test.mjs
// Copies the site, turns off push notifications (so testers can't subscribe to the real app), adds a
// "TEST" badge and noindex, then encrypts test/index.html with StatiCrypt. The password comes from the
// environment so it never lands in the (public) repo. Other files in test/ are not encrypted.
// Nothing to test? Add TEST_IDLE=1 to publish only a short "nothing to test right now" page behind the password.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'test');
const SKIP = new Set(['test', 'tools', 'node_modules', '.git', '.claude', '.agents', 'package.json', 'package-lock.json', 'CLAUDE.md', 'README.md', 'skills-lock.json', '.nojekyll', 'TODO.txt', 'FUJIFILM-SIMPLE-ACE6.jpg', 'School_badge_details.png']);
const pw = process.env.TEST_PASSWORD;
if (!pw) { console.error('Set TEST_PASSWORD first (see the top of this file).'); process.exit(1); }

const idle = process.env.TEST_IDLE === '1';
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT);
const NOINDEX = '<meta name="robots" content="noindex,nofollow">';
const idx = path.join(OUT, 'index.html');
if (idle) fs.writeFileSync(idx, `<!DOCTYPE html>
<html lang="zh-HK">
<head>
<meta charset="utf-8">
${NOINDEX}
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Aeterna · 測試版 Test</title>
<style>
body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px 16px;box-sizing:border-box;background:linear-gradient(160deg,#f6f0ff,#e6d8fb);color:#2e2352;font-family:'Noto Serif TC',Georgia,serif;text-align:center}
main{max-width:440px;display:flex;flex-direction:column;align-items:center;gap:14px}
.star{color:#e8930f;font-size:22px}
h1{margin:0;font-weight:400;font-size:clamp(26px,6vw,34px);letter-spacing:.05em}
p{margin:0;font-size:15px;line-height:1.9;color:#5f5088}
a{margin-top:6px;padding:12px 24px;border-radius:999px;background:linear-gradient(150deg,#fbc75a,#eb9a12);color:#2e2352;text-decoration:none;font-size:14.5px;letter-spacing:.05em}
</style>
</head>
<body>
<main>
<span class="star" aria-hidden="true">✦</span>
<h1>暫時沒有新內容測試<br>Nothing to test right now</h1>
<p>多謝你一直幫忙測試！有新功能時我們會再通知你。<br>Thanks for testing! We'll let you know when there's something new to try.</p>
<a href="https://aeterna-qes.github.io/">前往正式網站 · Go to the live site</a>
</main>
</body>
</html>
`);
else for (const f of fs.readdirSync(ROOT)) if (!SKIP.has(f)) fs.cpSync(path.join(ROOT, f), path.join(OUT, f), { recursive: true });

let html = fs.readFileSync(idx, 'utf8');
if (!idle) {
const id = html.match(/pushAppId&quot;:\{&quot;editor&quot;:&quot;text&quot;,&quot;default&quot;:&quot;([^&]*)&quot;/);
if (!id) throw new Error('pushAppId not found in index.html');
// Remove every copy of the live OneSignal app id (the Tweaks default and the code fallback).
if (id[1]) html = html.split(id[1]).join('');
html = html
  .replace('<meta charset="utf-8">', '<meta charset="utf-8">\n' + NOINDEX)
  .replace('<body>', '<body>\n<div aria-hidden="true" style="position:fixed;left:12px;bottom:12px;z-index:2147483646;padding:5px 11px;border-radius:999px;background:#2e2352;color:#fbc75a;font:600 11px/1.3 Inter,sans-serif;letter-spacing:.1em;pointer-events:none;box-shadow:0 6px 16px rgba(46,35,82,.3)">TEST 測試版</div>');
fs.writeFileSync(idx, html);
}

// With shell:true (needed for npx on Windows) arguments are joined with spaces, so quote each one.
const q = (a) => process.platform === 'win32' ? '"' + a.replace(/"/g, '\\"') + '"' : a;
execFileSync('npx', ['--yes', 'staticrypt@3.5.4', 'index.html', '-d', '.', '-p', pw, '--short', '-c', 'false', '--remember', '14',
  '--template-title', 'Aeterna · 測試版 Test',
  '--template-instructions', '請輸入測試密碼 · Enter the tester password',
  '--template-placeholder', '密碼 Password', '--template-button', '進入 Enter',
  '--template-remember', '記住我 Remember me', '--template-error', '密碼錯誤 Wrong password',
  '--template-color-primary', '#e8930f', '--template-color-secondary', '#efe6fd'].map(q), { cwd: OUT, stdio: 'inherit', shell: process.platform === 'win32' });

// The password page itself should not be indexed either.
let enc = fs.readFileSync(idx, 'utf8');
if (!enc.includes(NOINDEX)) fs.writeFileSync(idx, enc.replace(/<head>/i, '<head>\n' + NOINDEX));
console.log('Built test/ — commit and push it, then open https://aeterna-qes.github.io/test/');
