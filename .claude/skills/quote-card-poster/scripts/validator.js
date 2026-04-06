#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const p = process.argv[2];
if (!p) {
  console.error('Usage: validator.js <input.json>');
  process.exit(1);
}
const data = JSON.parse(fs.readFileSync(path.resolve(p), 'utf8'));
const errors = [];
if (!data.quote) errors.push('缺少 quote / 金句');
if (!data.author) errors.push('缺少 author / 作者');
if (!data.source) errors.push('缺少 source / 出自');
if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log('OK');
