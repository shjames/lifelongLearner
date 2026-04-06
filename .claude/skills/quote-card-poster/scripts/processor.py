#!/usr/bin/env python3
import json
import os
import re
import sys

THEME_MAP = {
    '极简': 'minimal',
    '文艺': 'literary',
    '复古': 'retro',
    '暗黑': 'dark',
    '国风': 'oriental',
    '杂志': 'magazine',
    '随机': 'random',
}
SIZE_MAP = {
    '竖版': 'portrait',
    '方版': 'square',
    '横版': 'landscape',
}

def parse_text(text: str):
    data = {}
    patterns = {
        'author': r'作者[：: ]+(.+)',
        'quote': r'金句[：: ]+(.+)',
        'source': r'出自[：: ]+(.+)',
        'theme': r'主题[：: ]+(.+)',
        'size': r'尺寸[：: ]+(.+)',
    }
    for key, pattern in patterns.items():
        m = re.search(pattern, text)
        if m:
            data[key] = m.group(1).strip()
    if 'theme' in data:
        data['theme'] = THEME_MAP.get(data['theme'], data['theme'])
    else:
        data['theme'] = 'random'
    if 'size' in data:
        data['size'] = SIZE_MAP.get(data['size'], data['size'])
    else:
        data['size'] = 'portrait'
    return data

if __name__ == '__main__':
    if len(sys.argv) < 3:
        print('Usage: processor.py <input.txt> <output.json>')
        sys.exit(1)
    src, dst = sys.argv[1], sys.argv[2]
    text = open(src, 'r', encoding='utf-8').read()
    data = parse_text(text)
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    with open(dst, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(dst)
