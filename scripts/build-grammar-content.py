"""Import the paired DOCX textbook/answer pack without changing its wording."""
import hashlib
import json
import re
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'doc/英语时态'
NS = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
FILES = {
    'lesson': '英语10大时态_教材讲解与课后练习_第五版.docx',
    'lesson_answers': '英语10大时态_教材配套答案解析_红蓝版.docx',
    'workbook': '英语10大时态_专项巩固练习册_红蓝版.docx',
    'workbook_answers': '英语10大时态_专项练习答案解析_红蓝版.docx',
}


def blocks(name):
    with zipfile.ZipFile(SOURCE / FILES[name]) as archive:
        root = ET.fromstring(archive.read('word/document.xml'))
    result = []
    for node in root.find('w:body', NS):
        if node.tag.endswith('}p'):
            result.append({'text': ''.join(t.text or '' for t in node.findall('.//w:t', NS)).strip()})
        elif node.tag.endswith('}tbl'):
            result.append({'table': [[''.join(t.text or '' for t in c.findall('.//w:t', NS))
                                     for c in row.findall('w:tc', NS)] for row in node.findall('w:tr', NS)]})
    return result


IDENTIFIER = r'(?:\d{2}-(?:B)?\d{2}|[MPCW]-\d{2})'


def answer_map(name):
    rows = [b['text'] for b in blocks(name) if 'text' in b]
    answers = {}
    active = None
    for row in rows:
        match = re.match(r'^(' + IDENTIFIER + r')\s+(.+)', row)
        if match:
            active, text = match.groups()
            parts = re.split(r'\s+·\s+', text, maxsplit=1)
            answers[active] = {'answer': parts[0].strip(), 'explanation': parts[1] if len(parts) > 1 else ''}
        elif active and row.startswith(('说明：', '解析：', '目标：', '核查：')):
            answers[active]['explanation'] += row.split('：', 1)[1]
        elif active and row.startswith('示范：'):
            answers[active]['answer'] = row.removeprefix('示范：')
    return answers


main = blocks('lesson')
lessons = []
for i, block in enumerate(main):
    match = re.match(r'LESSON (\d{2})', block.get('text', ''))
    if not match:
        continue
    number = match[1]
    title, english = re.split(r'\s{2,}', main[i + 1]['text'], maxsplit=1)
    item = {'id': 't' + number, 'title': title, 'english': english,
            'level': 'basic' if int(number) <= 6 else 'advanced',
            'summary': '', 'structure': '', 'forms': [], 'usages': [],
            'judgement': '', 'clues': '', 'pitfalls': []}
    section = ''
    for b in main[i + 2:]:
        text = b.get('text', '')
        if text.startswith('第' + number + '讲'):
            break
        if 'table' in b:
            table = b['table']
            cell = table[0][0]
            if cell.startswith('用法概述'):
                item['summary'] = re.sub(r'^用法概述\s*', '', cell)
            elif cell.startswith('结构'):
                item['structure'] = re.sub(r'^结构\s*', '', cell)
            elif cell.startswith('判断要点'):
                item['judgement'] = re.sub(r'^判断要点\s*', '', cell)
            elif cell == '句型':
                item['forms'] = [{'label': r[0], 'example': r[1]} for r in table[1:]]
        elif re.match(r'^0[1-5]\s', text):
            section = text[:2]
        elif section == '03' and '｜' in text:
            en, zh = text.split('｜', 1)
            label, example = re.split(r'\s{2,}', en.strip(), maxsplit=1)
            item['usages'].append({'label': label, 'example': example, 'translation': zh.strip()})
        elif section == '04' and text.startswith('常见时间'):
            item['clues'] = text.split('：', 1)[1]
        elif section == '05' and text:
            item['pitfalls'].append(text)
    assert all(item[k] for k in ('summary', 'structure', 'forms', 'usages', 'judgement')), item
    lessons.append(item)

questions = []


def add_question(bank, code, label, prompt, answer, context=''):
    kind = 'fill'
    options = []
    if any(t in label for t in ('改错', '订正', '翻译', '汉译英', '改写', '转换', '写作')):
        kind = 'reference'
    else:
        choice = re.search(r'\((?:A\s+)?([^()]+?)\s*/\s*(?:B\s+)?([^()]+?)\)', prompt)
        if choice and any(t in label for t in ('二选一', '辨析', '语境选择')):
            kind = 'choice'
            options = [choice[1].strip(), choice[2].strip()]
            prompt = prompt[:choice.start()] + '____' + prompt[choice.end():]
            prompt = re.sub(r'^\(\s*\)\s*', '', prompt)
            if answer['answer'] in ('A', 'B'):
                answer = {**answer, 'answer': options[0 if answer['answer'] == 'A' else 1]}
    count = len(re.findall(r'_{2,}', prompt)) if kind == 'fill' else 0
    if context:
        count = 1
    if kind == 'fill':
        assert count > 0, (bank, code, prompt)
        for variant in re.split(r'\s*/\s*', answer['answer']):
            assert len(re.split(r'[;；]', variant)) == count, (bank, code, count, variant)
    tense = 't' + code[:2] if code[:2].isdigit() else 'mixed'
    if code.startswith('W-'):
        tense = 't' + code[2:]
    q = {'id': bank + ':' + code, 'code': code, 'tenseId': tense, 'bank': bank,
         'label': label, 'kind': kind, 'prompt': prompt.strip(), 'context': context,
         'blankCount': count, 'options': options, **answer}
    assert q['answer'] and q['explanation'], q
    questions.append(q)


answers = answer_map('lesson_answers')
for i, b in enumerate(main):
    text = b.get('text', '')
    match = re.match(r'^(' + IDENTIFIER + r')\s+[〔\[]([^〕\]]+)[〕\]]\s*(.+)', text)
    if match:
        code, label, prompt = match.groups()
        add_question('lesson' if code[:2].isdigit() else 'mixed', code, label, prompt, answers[code])
    elif re.match(r'^W-\d{2}\s+', text):
        code = text[:4]
        prompt = '\n'.join(x['text'] for x in main[i:i + 4] if x.get('text') and not x['text'].startswith('_'))
        add_question('writing', code, '情境写作', prompt, answers[code])
    elif '(P-01)' in text or '(P-07)' in text:
        for code in re.findall(r'\((P-\d{2})\)', text):
            add_question('passage', code, '语篇填空', '填写 ' + code + ' 对应的动词形式。', answers[code], text)

workbook = blocks('workbook')
answers = answer_map('workbook_answers')
phase = ''
for i, b in enumerate(workbook):
    text = b.get('text', '')
    if re.match(r'^[一二三四五六七八]、', text):
        phase = text.split('、')[1].split('（')[0]
    match = re.match(r'^(\d{2}-\d{2}|C-\d{2})\s+(.+)', text)
    if match:
        code, prompt = match.groups()
        add_question('workbook' if code[:2].isdigit() else 'mixed', code,
                     '填空' if code.startswith('C-') else phase, prompt, answers[code])
    elif re.match(r'^\d{2}-17—20', text):
        context = workbook[i - 1]['text']
        prefix = text[:2]
        for n in range(17, 21):
            code = f'{prefix}-{n}'
            add_question('workbook', code, '语篇填空', f'填写短文第 ({n - 16}) 空。', answers[code], context)

assert len(lessons) == 10
assert len(questions) == 476, len(questions)
assert len({q['id'] for q in questions}) == len(questions)
for lesson in lessons:
    assert sum(q['tenseId'] == lesson['id'] and q['bank'] == 'lesson' for q in questions) == 16
    assert sum(q['tenseId'] == lesson['id'] and q['bank'] == 'workbook' for q in questions) == 25

output = {'sources': [{'file': filename, 'sha256': hashlib.sha256((SOURCE / filename).read_bytes()).hexdigest()}
                      for filename in FILES.values()], 'lessons': lessons, 'questions': questions}
path = ROOT / 'src/features/grammar/content.generated.json'
path.write_text(json.dumps(output, ensure_ascii=False, separators=(',', ':')) + '\n')
print(f'Imported {len(lessons)} lessons, {len(questions)} exercises -> {path.relative_to(ROOT)}')
