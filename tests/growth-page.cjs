'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const page = fs.readFileSync(path.join(root, 'play', 'index.html'), 'utf8');
const builder = fs.readFileSync(path.join(root, 'build_web.py'), 'utf8');

function has(pattern, message) {
  assert.match(page, pattern, message);
}
has(/<title>Saturday Dynasty Football/i, 'Missing game title.');
has(/name="description"/, 'Missing human-readable description.');
has(/rel="canonical"/, 'Missing canonical URL.');
has(/property="og:title"/, 'Missing Facebook/Discord preview.');
has(/name="twitter:card"/, 'Missing social preview.');
has(/data-play-link/g, 'Missing play links.');
has(/href="https:\/\/play\.google\.com\/store\/apps\/details\?id=com\.coreytoolis\.saturdaydynastyfootball"/, 'Missing Android CTA.');
assert.match(builder, /shutil\.copytree\(ROOT\/'play',OUT\/'play'\)/, 'The builder must copy the /play landing into dist.');
assert.ok((page.match(/data-play-link/g) || []).length >= 3, 'Need header and primary/secondary game launch CTAs.');

// The source-tagged CTA must forward only validated UTM campaign keys.
const scripts = [...page.matchAll(/<script>([\s\S]*?)<\/script>/g)];
assert.equal(scripts.length, 1, 'One standalone inline attribution script expected.');
const links = [{href:'/'},{href:'/'},{href:'/'}],android=[{href:'https://play.google.com/store/apps/details?id=com.coreytoolis.saturdaydynastyfootball'}];
const ctx = {
  location: {search:'?utm_source=discord&utm_medium=community&utm_campaign=oct_rebuild&email=private%40example.com&utm_term=a%2Fb'},
  document: {querySelectorAll(selector) {return selector==='[data-play-link]'?links:android;}},
  URLSearchParams, URL,
};
vm.runInNewContext(scripts[0][1], ctx);
for (const link of links) {
  const target = new URL(link.href, 'https://saturdaydynasty.ctoolis.workers.dev/');
  assert.equal(target.pathname, '/');
  assert.equal(target.searchParams.get('utm_source'), 'discord');
  assert.equal(target.searchParams.get('utm_medium'), 'community');
  assert.equal(target.searchParams.get('utm_campaign'), 'oct_rebuild');
  assert.equal(target.searchParams.has('utm_term'), false, 'Invalid campaign value must be discarded.');
  assert.equal(target.searchParams.has('email'), false, 'Arbitrary private query values must be discarded.');
}

if (fs.existsSync(path.join(root, 'dist', 'play', 'index.html'))) {
  const dist = fs.readFileSync(path.join(root, 'dist', 'play', 'index.html'), 'utf8');
  assert.equal(dist, page, 'Generated landing should match its source file.');
}
console.log('Browser growth landing: markup, build integration, CTAs and UTM allowlist OK');

const play=new URL(android[0].href);assert.equal(play.searchParams.get('id'),'com.coreytoolis.saturdaydynastyfootball');const referrer=new URLSearchParams(play.searchParams.get('referrer'));assert.equal(referrer.get('utm_source'),'discord');assert.equal(referrer.has('email'),false);
