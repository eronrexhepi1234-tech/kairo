// Kairo Pro: deep research with sources, source finder, professional documents (PDF + Word), writing coach,
// document translator (Word/PowerPoint keep their layout), presentation trainer, project code assistant (read-only),
// live dashboard, project manager, exam simulator, language teacher, learning paths, brand kit, agent mode, memory center.
const { app, ipcMain, shell, dialog } = require('electron');
const fs = require('fs');
const path = require('path');

let store = null, getWin = null;
const LANG = { de: 'German', en: 'English', sq: 'Albanian', fr: 'French', es: 'Spanish', it: 'Italian', tr: 'Turkish' };
const P = () => require('./providers');
const lang = () => LANG[store.get().language] || 'German';
const safe = s => String(s || 'Kairo').replace(/[<>:"/\\|?*\x00-\x1f]/g, '').trim().slice(0, 70) || 'Kairo';
const outDir = (...p) => { const d = path.join(app.getPath('documents'), 'Kairo', 'Pro', ...p); fs.mkdirSync(d, { recursive: true }); return d; };
const dataFile = n => { const d = path.join(app.getPath('userData'), 'pro'); fs.mkdirSync(d, { recursive: true }); return path.join(d, n + '.json'); };
const readData = (n, def) => { try { return JSON.parse(fs.readFileSync(dataFile(n), 'utf8')); } catch { return def; } };
const writeData = (n, v) => fs.writeFileSync(dataFile(n), JSON.stringify(v, null, 1));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const progress = (job, data) => { try { getWin()?.webContents.send('pro:progress', { job, ...data }); } catch {} };
const uniqueFile = (dir, name, ext) => { let f = path.join(dir, safe(name) + ext), i = 2; while (fs.existsSync(f)) f = path.join(dir, `${safe(name)} (${i++})${ext}`); return f; };

async function ask(system, text, opts = {}) {
  return P().complete(store.get(), { system, messages: [{ role: 'user', text, images: opts.images }], webSearch: opts.web, onSource: opts.onSource });
}
async function json(system, text, opts = {}) {
  for (let i = 0; i < 3; i++) {
    const out = await ask(system + (i ? '\nIMPORTANT: answer with valid JSON only. Escape quotes inside strings.' : ''), text, opts);
    let j = null; try { j = P().parseJson(out); } catch {}
    if (j) return j;
  }
  throw new Error('Keine gültige Antwort bekommen – bitte nochmal versuchen');
}
// Gemini answers with Google search; the sources it used come back as redirect links -> resolve to the real address
async function realUrl(u) {
  if (!/vertexaisearch|grounding-api-redirect/.test(u)) return u;
  try { const r = await fetch(u, { method: 'HEAD', redirect: 'manual', signal: AbortSignal.timeout(6000) }); return r.headers.get('location') || u; } catch { return u; }
}
async function webAnswer(system, text) {
  const sources = [];
  const s = store.get();
  const web = s.provider === 'gemini';
  let limited = false;
  const out = await P().complete(s, { system, messages: [{ role: 'user', text }], webSearch: web, onSource: x => sources.push(x), onRetry: () => { limited = true; } });
  const real = await Promise.all(sources.map(async x => ({ title: x.title || '', url: await realUrl(x.link) })));
  return { text: out, sources: real.filter(x => /^https?:/.test(x.url)), limited };
}
// free backup sources when Google search is not available (other AI, or the daily search limit is reached)
async function wikiSources(query, l = 'de', n = 3) {
  try {
    const s = await getJson(`https://${l}.wikipedia.org/w/api.php?action=query&list=search&format=json&utf8=1&srlimit=${n}&srsearch=${encodeURIComponent(query)}`);
    const titles = (s.query?.search || []).map(x => x.title);
    if (!titles.length) return [];
    const e = await getJson(`https://${l}.wikipedia.org/w/api.php?action=query&prop=extracts&exintro=1&explaintext=1&format=json&utf8=1&titles=${encodeURIComponent(titles.join('|'))}`);
    return Object.values(e.query?.pages || {}).map(p => ({ title: `${p.title} – Wikipedia`, url: `https://${l}.wikipedia.org/wiki/${encodeURIComponent(p.title.replace(/ /g, '_'))}`, text: String(p.extract || '').slice(0, 1500), kind: 'Lexikon' }));
  } catch { return []; }
}
async function scholarSources(query, n = 5) {
  try {
    const j = await getJson(`https://api.openalex.org/works?per-page=${n}&sort=relevance_score:desc&filter=has_abstract:true&search=${encodeURIComponent(query)}`);
    return (j.results || []).map(w => ({ title: `${w.title} (${w.publication_year || 'o. J.'})`, url: w.doi || w.primary_location?.landing_page_url || w.id, text: `${(w.authorships || []).slice(0, 3).map(a => a.author?.display_name).join(', ')} · ${w.primary_location?.source?.display_name || ''}`, kind: 'Uni/Studie' })).filter(x => x.url);
  } catch { return []; }
}
async function englishKeywords(topic) { try { return (await ask('Translate the topic into 2-5 English search keywords for an academic database. Answer with the keywords only.', topic)).trim().split('\n')[0].slice(0, 100); } catch { return topic; } }

// ---------- shared document format: blocks ----------
// { type: 'h1'|'h2'|'h3'|'p'|'bullets'|'numbers'|'quote'|'table'|'kv', text, items, rows }
function blocksToMarkdown(title, blocks) {
  const out = [`# ${title}`];
  for (const b of blocks || []) {
    if (b.type === 'h1') out.push(`## ${b.text}`); else if (b.type === 'h2') out.push(`## ${b.text}`); else if (b.type === 'h3') out.push(`### ${b.text}`);
    else if (b.type === 'bullets') out.push((b.items || []).map(i => `- ${i}`).join('\n'));
    else if (b.type === 'numbers') out.push((b.items || []).map((i, n) => `${n + 1}. ${i}`).join('\n'));
    else if (b.type === 'quote') out.push(`> ${b.text}`);
    else if (b.type === 'kv') out.push((b.items || []).map(i => `**${i[0]}:** ${i[1]}`).join('  \n'));
    else if (b.type === 'table' && b.rows?.length) out.push([`| ${b.rows[0].join(' | ')} |`, `|${b.rows[0].map(() => '---').join('|')}|`, ...b.rows.slice(1).map(r => `| ${r.join(' | ')} |`)].join('\n'));
    else if (b.text) out.push(b.text);
  }
  return out.join('\n\n');
}
const xesc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
// inline **bold** -> Word runs
function runs(text, extra = '') {
  return String(text ?? '').split(/(\*\*[^*]+\*\*)/).filter(Boolean).map(part => {
    const bold = /^\*\*.*\*\*$/.test(part), t = bold ? part.slice(2, -2) : part.replace(/\[(\d+)\]/g, '[$1]');
    return `<w:r><w:rPr>${bold ? '<w:b/>' : ''}${extra}</w:rPr><w:t xml:space="preserve">${xesc(t)}</w:t></w:r>`;
  }).join('');
}
async function blocksToDocx(file, title, blocks, accent = 'FF7A45') {
  const JSZip = require('jszip');
  const zip = new JSZip();
  const para = (text, style, extra = '') => `<w:p><w:pPr>${style ? `<w:pStyle w:val="${style}"/>` : ''}${extra}</w:pPr>${runs(text)}</w:p>`;
  const body = [para(title, 'Title')];
  for (const b of blocks || []) {
    if (b.type === 'h1' || b.type === 'h2') body.push(para(b.text, 'Heading1'));
    else if (b.type === 'h3') body.push(para(b.text, 'Heading2'));
    else if (b.type === 'bullets' || b.type === 'numbers') (b.items || []).forEach((it, n) => body.push(`<w:p><w:pPr><w:ind w:left="567" w:hanging="283"/><w:spacing w:after="80"/></w:pPr><w:r><w:rPr><w:color w:val="${accent}"/><w:b/></w:rPr><w:t xml:space="preserve">${b.type === 'numbers' ? n + 1 + '.' : '•'}  </w:t></w:r>${runs(it)}</w:p>`));
    else if (b.type === 'quote') body.push(para(b.text, 'Quote'));
    else if (b.type === 'kv') (b.items || []).forEach(i => body.push(`<w:p><w:pPr><w:spacing w:after="60"/></w:pPr><w:r><w:rPr><w:b/></w:rPr><w:t xml:space="preserve">${xesc(i[0])}: </w:t></w:r>${runs(i[1])}</w:p>`));
    else if (b.type === 'table' && b.rows?.length) {
      const cols = b.rows[0].length, w = Math.floor(9000 / cols);
      body.push(`<w:tbl><w:tblPr><w:tblW w:w="9000" w:type="dxa"/><w:tblBorders>${['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map(s => `<w:${s} w:val="single" w:sz="4" w:color="D9D4CA"/>`).join('')}</w:tblBorders></w:tblPr><w:tblGrid>${'<w:gridCol w:w="' + w + '"/>'.repeat(cols)}</w:tblGrid>` +
        b.rows.map((r, ri) => `<w:tr>${r.map(c => `<w:tc><w:tcPr><w:tcW w:w="${w}" w:type="dxa"/>${ri === 0 ? `<w:shd w:val="clear" w:color="auto" w:fill="${accent}"/>` : ''}</w:tcPr><w:p>${runs(c, ri === 0 ? '<w:b/><w:color w:val="FFFFFF"/>' : '')}</w:p></w:tc>`).join('')}</w:tr>`).join('') + '</w:tbl>', '<w:p/>');
    } else if (b.text) body.push(para(b.text));
  }
  zip.file('[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>');
  zip.file('_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');
  zip.file('word/_rels/document.xml.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>');
  const font = '<w:rFonts w:ascii="Segoe UI" w:hAnsi="Segoe UI" w:cs="Segoe UI"/>';
  zip.file('word/styles.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:docDefaults><w:rPrDefault><w:rPr>${font}<w:sz w:val="22"/><w:color w:val="2B2B2B"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="140" w:line="300" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>
<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style>
<w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:pPr><w:spacing w:after="300"/><w:pBdr><w:bottom w:val="single" w:sz="18" w:space="8" w:color="${accent}"/></w:pBdr></w:pPr><w:rPr><w:b/><w:sz w:val="48"/><w:color w:val="16171A"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:pPr><w:keepNext/><w:spacing w:before="320" w:after="120"/><w:outlineLvl w:val="0"/></w:pPr><w:rPr><w:b/><w:sz w:val="30"/><w:color w:val="${accent}"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:pPr><w:keepNext/><w:spacing w:before="220" w:after="80"/><w:outlineLvl w:val="1"/></w:pPr><w:rPr><w:b/><w:sz w:val="25"/><w:color w:val="16171A"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Quote"><w:name w:val="Quote"/><w:pPr><w:ind w:left="567"/><w:pBdr><w:left w:val="single" w:sz="18" w:space="10" w:color="${accent}"/></w:pBdr></w:pPr><w:rPr><w:i/><w:color w:val="555555"/></w:rPr></w:style>
</w:styles>`);
  zip.file('word/document.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body.join('')}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1300" w:right="1300" w:bottom="1300" w:left="1300" w:header="700" w:footer="700" w:gutter="0"/></w:sectPr></w:body></w:document>`);
  fs.writeFileSync(file, await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' }));
  return file;
}
async function exportDoc({ title, blocks, format, folder, accent }) {
  const dir = outDir(folder || 'Dokumente');
  const acc = (accent || store.get().accent || '#ff7a45');
  if (format === 'docx') return { path: await blocksToDocx(uniqueFile(dir, title, '.docx'), title, blocks, acc.replace('#', '').toUpperCase()) };
  const { makePdf } = require('./pdf');
  return { path: await makePdf(uniqueFile(dir, title, '.pdf'), blocksToMarkdown(title, blocks), { title, accent: acc }) };
}

// ---------- 1 deep research ----------
async function research({ question, depth }, job) {
  const n = depth === 'deep' ? 7 : 4;
  progress(job, { step: 'plan', text: 'Plane die Recherche…' });
  const plan = await json(`You are a senior research analyst. Break the research question into ${n} precise sub-questions that together answer it completely (facts, numbers, history, current state, different views, outlook). Language: ${lang()}.
Return ONLY JSON: {"title":"short report title","questions":["..."]}`, question);
  const qs = (plan.questions || []).slice(0, n);
  progress(job, { step: 'questions', questions: qs });
  const notes = [], all = [];
  const one = async (q, i) => {
    progress(job, { step: 'search', i, text: q });
    try {
      const r = await webAnswer(`You are a meticulous researcher. Search the web and answer precisely with concrete facts, numbers, dates and names. Mention disagreements. Max 220 words. Language: ${lang()}.`, `Main question: ${question}\nSub-question: ${q}`);
      if (!r.sources.length) {
        // no Google results: use Wikipedia as a real, citable source for this sub-question
        const w = await wikiSources(q.replace(/[?¿]/g, '').split(/\s+/).filter(x => x.length > 3).slice(0, 6).join(' '), store.get().language === 'en' ? 'en' : 'de', 2);
        r.sources = w.map(x => ({ title: x.title, url: x.url }));
        if (w.length) r.text += '\n\nFrom Wikipedia:\n' + w.map(x => `${x.title}: ${x.text}`).join('\n');
      }
      notes[i] = { q, text: r.text, sources: r.sources };
      r.sources.forEach(s => { if (!all.some(a => a.url === s.url)) all.push(s); });
      progress(job, { step: 'found', i, sources: r.sources.length });
    } catch (e) { notes[i] = { q, text: '', sources: [] }; progress(job, { step: 'found', i, sources: 0, error: e.message }); }
  };
  // two at a time: more at once makes Google's search limit kick in
  for (let i = 0; i < qs.length; i += 2) await Promise.all(qs.slice(i, i + 2).map((q, k) => one(q, i + k)));
  progress(job, { step: 'write', text: 'Schreibe den Bericht…' });
  const srcList = all.slice(0, 30).map((s, i) => `[${i + 1}] ${s.title} – ${s.url}`).join('\n');
  const rep = await json(`You are a senior analyst writing a professional research report (like McKinsey / The Economist). Language: ${lang()}.
Use ONLY the research notes. Cite sources inline with [number] from the source list. Be precise, neutral and well structured.
Return ONLY JSON: {"title":"","summary":"executive summary, 3-4 sentences","keyPoints":["5 key findings, each one sentence with a number if possible"],
"sections":[{"heading":"","text":"2-4 paragraphs, markdown allowed (**bold**), citations like [2]"}],
"chart":{"title":"","unit":"","items":[{"label":"","value":0}]} or null (only if the notes contain comparable numbers, 3-8 items),
"table":{"title":"","rows":[["header1","header2"],["a","b"]]} or null,
"conclusion":"","openQuestions":["1-3 things that are still unclear"]}
4-6 sections.`, `Research question: ${question}\n\nResearch notes:\n${notes.map((x, i) => `## ${i + 1}. ${x.q}\n${x.text}`).join('\n\n')}\n\nSources:\n${srcList || '(no web sources available)'}`);
  rep.sources = all.slice(0, 30);
  rep.question = question; rep.id = uid(); rep.date = new Date().toISOString();
  const hist = readData('research', []); hist.unshift({ id: rep.id, title: rep.title, question, date: rep.date }); writeData('research', hist.slice(0, 40));
  writeData('research-' + rep.id, rep);
  return rep;
}
function reportBlocks(r) {
  const b = [{ type: 'quote', text: r.summary }, { type: 'h2', text: 'Wichtigste Erkenntnisse' }, { type: 'bullets', items: r.keyPoints || [] }];
  for (const s of r.sections || []) { b.push({ type: 'h2', text: s.heading }); String(s.text || '').split(/\n\n+/).forEach(p => b.push({ type: 'p', text: p })); }
  if (r.table?.rows?.length) { b.push({ type: 'h3', text: r.table.title || 'Übersicht' }, { type: 'table', rows: r.table.rows }); }
  if (r.chart?.items?.length) { b.push({ type: 'h3', text: r.chart.title || 'Zahlen' }, { type: 'table', rows: [['', r.chart.unit || 'Wert'], ...r.chart.items.map(i => [i.label, String(i.value)])] }); }
  b.push({ type: 'h2', text: 'Fazit' }, { type: 'p', text: r.conclusion || '' });
  if (r.openQuestions?.length) b.push({ type: 'h3', text: 'Offene Fragen' }, { type: 'bullets', items: r.openQuestions });
  if (r.sources?.length) b.push({ type: 'h2', text: 'Quellen' }, { type: 'numbers', items: r.sources.map(s => `${s.title} – ${s.url}`) });
  return b;
}

// ---------- 8 sources ----------
async function findSources({ topic, style }, job) {
  progress(job, { step: 'search', text: 'Suche seriöse Quellen…' });
  const a = await webAnswer(`You are a librarian. Find the best, most reputable sources (encyclopedias, universities, official institutions, quality newspapers, scientific articles) about the topic. Describe briefly what each one offers. Language: ${lang()}.`, `Topic for a school presentation / essay: ${topic}`);
  const b = await webAnswer(`Find more reputable sources (statistics, official data, studies, museums, documentaries) about the topic. Language: ${lang()}.`, `Topic: ${topic}`);
  const all = []; const add = s => { if (s.url && !all.some(x => x.url === s.url)) all.push(s); };
  [...a.sources, ...b.sources].forEach(add);
  // always add real encyclopedia + scientific sources (Wikipedia and OpenAlex, both free)
  progress(job, { step: 'search', text: 'Suche in Wikipedia und wissenschaftlichen Datenbanken…' });
  const en = await englishKeywords(topic);
  const [w1, w2, sc] = await Promise.all([wikiSources(topic, store.get().language === 'en' ? 'en' : 'de', 3), wikiSources(en, 'en', 2), scholarSources(en, 6)]);
  [...w1, ...w2, ...sc].forEach(add);
  if (!all.length) throw new Error('Keine Quellen gefunden – prüfe die Internetverbindung');
  const extra = [...w1, ...w2, ...sc].map(x => `${x.title}: ${x.text.slice(0, 300)}`).join('\n');
  progress(job, { step: 'cite', text: `${all.length} Quellen gefunden – erstelle Zitate…` });
  const today = new Date().toLocaleDateString('de-CH');
  const j = await json(`You are a librarian. For each source (only these, never invent others) write a citation in ${style === 'mla' ? 'MLA' : 'APA 7'} style. Use the domain to name the publisher. If the year is unknown write "o. J.". Access date: ${today}. Rate trust 1-5 (5 = official/scientific). Language of notes: ${lang()}.
Return ONLY JSON: {"sources":[{"n":1,"title":"","publisher":"","type":"Lexikon|Behörde|Uni/Studie|Zeitung|Museum|Statistik|Video|Sonstiges","trust":5,"why":"what it is useful for, 1 sentence","citation":""}]}`, `Topic: ${topic}\nSources:\n${all.map((s, i) => `${i + 1}. ${s.title} – ${s.url}`).join('\n')}\n\nNotes:\n${a.text}\n${b.text}\n${extra}`);
  const out = (j.sources || []).map(s => ({ ...s, url: all[(s.n || 1) - 1]?.url })).filter(s => s.url).sort((x, y) => (y.trust || 0) - (x.trust || 0));
  return { topic, sources: out };
}

// ---------- 9 professional documents ----------
const DOC_KINDS = {
  bewerbung: 'a job / apprenticeship application letter (Bewerbungsschreiben) in the Swiss/German format: sender, recipient, date, subject, salutation, 3-4 strong paragraphs, closing, enclosures',
  lebenslauf: 'a modern CV (Lebenslauf): personal data as kv, profile summary, education, experience / internships, skills (as table or bullets), languages, hobbies, references',
  bericht: 'a professional report: summary, introduction, main parts with headings, results (table if useful), conclusion',
  anleitung: 'a clear step-by-step guide: goal, what you need, numbered steps, tips, common mistakes',
  brief: 'a formal letter: sender, recipient, date, subject, body, closing',
  protokoll: 'meeting minutes: date, participants, agenda, decisions, to-dos as table (task, who, until)',
  referat: 'a school essay / Referat handout: introduction, main parts, conclusion, sources',
  angebot: 'a professional offer / quote: intro, services as table with prices, terms, closing'
};
async function document({ kind, details }) {
  const j = await json(`You are a professional writer and document designer. Write ${DOC_KINDS[kind] || kind}. Language: ${lang()}. Use the user's details; where details are missing, write clear placeholders in [brackets] instead of inventing personal data.
Return ONLY JSON: {"title":"document title","blocks":[{"type":"h2|h3|p|bullets|numbers|kv|table|quote","text":"for h2/h3/p/quote","items":["for bullets/numbers"] or [["label","value"]] for kv,"rows":[["h1","h2"],["a","b"]] for table}],"tips":["2-3 tips to make it even better"]}
Make it excellent, specific and convincing. **bold** is allowed in text.`, `Details from the user:\n${details}`);
  j.kind = kind;
  return j;
}

// ---------- 10 writing coach ----------
async function coach({ text, goal }) {
  return json(`You are an expert writing coach and editor. Improve the user's text for this goal: ${goal || 'clear, correct and engaging'}. Keep the author's voice and language (answer in the text's language). Explain changes in ${lang()}.
Return ONLY JSON: {"improved":"the full improved text","scores":{"grammatik":0-100,"stil":0-100,"aufbau":0-100,"klarheit":0-100},"scoresAfter":{"grammatik":0-100,"stil":0-100,"aufbau":0-100,"klarheit":0-100},
"changes":[{"before":"exact short phrase from the original","after":"replacement","type":"Grammatik|Rechtschreibung|Stil|Wortwahl|Aufbau|Klarheit","why":"short explanation"}],"strengths":["2 things that are already good"],"tips":["3 tips for next time"]}
List the 6-15 most important changes.`, text);
}

// ---------- 12 document translator ----------
async function translateList(list, target) {
  const j = await json(`You are a professional translator. Translate every string to ${target}. Keep numbers, names, formatting characters and meaning. Return the same number of strings in the same order.
Return ONLY JSON: {"t":["..."]}`, JSON.stringify({ strings: list }));
  const t = j.t || j.strings || [];
  if (t.length !== list.length) throw new Error('count');
  return t;
}
async function translateMany(list, target, job) {
  const out = [], size = 30;
  for (let i = 0; i < list.length; i += size) {
    progress(job, { step: 'translate', done: i, total: list.length });
    const part = list.slice(i, i + size);
    let t; try { t = await translateList(part, target); } catch { t = []; for (const s of part) { try { t.push((await translateList([s], target))[0]); } catch { t.push(s); } } }
    out.push(...t);
  }
  progress(job, { step: 'translate', done: list.length, total: list.length });
  return out;
}
const unx = s => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
async function translateFile({ file, target }, job) {
  const ext = path.extname(file).toLowerCase(), base = path.basename(file, ext);
  const dir = outDir('Übersetzt'), tag = target.slice(0, 2).toUpperCase();
  if (ext === '.docx' || ext === '.pptx') {
    const JSZip = require('jszip');
    const zip = await JSZip.loadAsync(fs.readFileSync(file));
    const names = Object.keys(zip.files).filter(n => ext === '.docx' ? /^word\/(document|header\d*|footer\d*|footnotes)\.xml$/.test(n) : /^ppt\/(slides\/slide\d+|notesSlides\/notesSlide\d+)\.xml$/.test(n));
    const P_RX = ext === '.docx' ? /<w:p[ >][\s\S]*?<\/w:p>/g : /<a:p>[\s\S]*?<\/a:p>/g, T_RX = ext === '.docx' ? /(<w:t(?: [^>]*)?>)([\s\S]*?)(<\/w:t>)/g : /(<a:t>)([\s\S]*?)(<\/a:t>)/g;
    const xml = {}, paras = [];
    for (const n of names) { xml[n] = await zip.file(n).async('string'); for (const m of xml[n].match(P_RX) || []) { const txt = [...m.matchAll(T_RX)].map(x => unx(x[2])).join(''); if (txt.trim() && /\p{L}/u.test(txt)) paras.push(txt); } }
    progress(job, { step: 'found', total: paras.length });
    const uniq = [...new Set(paras)];
    const tr = await translateMany(uniq, target, job), map = new Map(uniq.map((s, i) => [s, tr[i]]));
    for (const n of names) {
      xml[n] = xml[n].replace(P_RX, p => {
        const txt = [...p.matchAll(T_RX)].map(x => unx(x[2])).join('');
        if (!map.has(txt)) return p;
        let first = true;
        // the whole paragraph text goes into its first text run, so the formatting of that run is kept
        return p.replace(T_RX, (_m, a, _b, c) => { const v = first ? xesc(map.get(txt)).replace(/&quot;/g, '"') : ''; first = false; return (ext === '.docx' ? '<w:t xml:space="preserve">' : a) + v + c; });
      });
      zip.file(n, xml[n]);
    }
    const out = uniqueFile(dir, `${base} (${tag})`, ext);
    fs.writeFileSync(out, await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' }));
    return { path: out, paragraphs: paras.length };
  }
  let text = '';
  if (ext === '.pdf') text = (await require('./pdf').readPdf(file)).text.replace(/--- Seite \d+ ---/g, '\n');
  else if (['.txt', '.md'].includes(ext)) text = fs.readFileSync(file, 'utf8');
  else throw new Error('Geht mit Word (.docx), PowerPoint (.pptx), PDF, .txt und .md');
  const parts = text.split(/\n{2,}/).map(s => s.replace(/\s*\n\s*/g, ' ').trim()).filter(Boolean);
  progress(job, { step: 'found', total: parts.length });
  const tr = await translateMany(parts, target, job);
  if (ext === '.pdf') {
    const { makePdf } = require('./pdf');
    const out = uniqueFile(dir, `${base} (${tag})`, '.pdf');
    await makePdf(out, `# ${base}\n\n` + tr.join('\n\n'), { title: base });
    return { path: out, paragraphs: parts.length, note: 'PDFs werden als neues, sauberes PDF gesetzt (Bilder fallen weg).' };
  }
  const out = uniqueFile(dir, `${base} (${tag})`, ext); fs.writeFileSync(out, tr.join('\n\n'));
  return { path: out, paragraphs: parts.length };
}

// ---------- 13 presentation + trainer ----------
async function presentation({ topic, slides }) {
  const r = await require('./create').presentation(store.get(), topic, { slides: Math.max(5, Math.min(15, +slides || 10)) });
  return r;
}
async function talkFeedback({ slide, transcript, seconds }) {
  const words = String(transcript || '').trim().split(/\s+/).filter(Boolean).length, wpm = seconds ? Math.round(words / seconds * 60) : 0;
  const j = await json(`You are a top presentation coach. Rate how the student presented this slide. Be encouraging but honest. Language: ${lang()}.
Return ONLY JSON: {"score":0-100,"covered":["points from the slide they explained"],"missed":["important points they forgot"],"fillers":["filler words they used, e.g. ähm, also, halt"],"good":"one thing that was good","tip":"one concrete tip for this slide","better":"an example of how they could say it better (2-3 sentences)"}`,
    `Slide: ${slide.title}\nBullets: ${(slide.bullets || []).join(' | ')}\nSpeaker notes: ${slide.notes || ''}\nDuration: ${seconds}s, about ${wpm} words per minute (ideal 120-150).\nWhat the student said: ${transcript || '(nothing)'}`);
  j.wpm = wpm; j.words = words;
  return j;
}

// ---------- 15 code assistant (read-only) ----------
const SKIP_DIR = /^(node_modules|\.git|dist|build|out|\.next|\.nuxt|coverage|vendor|__pycache__|\.venv|venv|target|bin|obj|\.idea|\.vs|Library|Temp)$/i;
const CODE_EXT = /\.(js|mjs|cjs|ts|tsx|jsx|py|java|cs|cpp|c|h|hpp|go|rs|rb|php|html|css|scss|vue|svelte|json|md|yml|yaml|toml|sh|ps1|lua|luau|kt|swift|dart|sql|gradle|xml|ini|cfg|txt)$/i;
let codeProject = null;
function scanProject(root) {
  const files = [];
  const walk = (d, depth) => {
    if (files.length > 600 || depth > 8) return;
    let list = []; try { list = fs.readdirSync(d, { withFileTypes: true }); } catch { return; }
    for (const e of list) {
      if (e.name.startsWith('.') && e.name !== '.env.example') continue;
      const p = path.join(d, e.name);
      if (e.isDirectory()) { if (!SKIP_DIR.test(e.name)) walk(p, depth + 1); }
      else if (CODE_EXT.test(e.name) && !/\.min\.|lock|package-lock|yarn\.lock/i.test(e.name)) { let size = 0; try { size = fs.statSync(p).size; } catch {} if (size < 300000) files.push({ rel: path.relative(root, p).replace(/\\/g, '/'), size }); }
    }
  };
  walk(root, 0);
  return files;
}
const readRel = (root, rel, max = 14000) => { try { const t = fs.readFileSync(path.join(root, rel), 'utf8'); return t.length > max ? t.slice(0, max) + '\n…(gekürzt)' : t; } catch { return ''; } };
function pickContext(root, files, query, budget = 90000) {
  const words = String(query || '').toLowerCase().split(/[^a-z0-9äöü_]+/).filter(w => w.length > 2);
  const score = f => { const n = f.rel.toLowerCase(); let s = 0; words.forEach(w => { if (n.includes(w)) s += 5; }); if (/readme|package\.json|main|index|app\./i.test(n)) s += 3; if (/test|spec|example/i.test(n)) s -= 1; return s - f.size / 40000; };
  const out = []; let used = 0;
  for (const f of [...files].sort((a, b) => score(b) - score(a))) { if (used > budget) break; const t = readRel(root, f.rel); if (!t) continue; out.push(`=== ${f.rel} ===\n${t}`); used += t.length; }
  return out.join('\n\n');
}
async function codeOpen() {
  const r = await dialog.showOpenDialog(getWin(), { title: 'Projekt-Ordner wählen', properties: ['openDirectory'] });
  if (r.canceled || !r.filePaths[0]) return { canceled: true };
  const root = r.filePaths[0], files = scanProject(root);
  if (!files.length) throw new Error('Keine Code-Dateien in diesem Ordner gefunden');
  codeProject = { root, files };
  return { root, name: path.basename(root), files };
}
async function codeAnalyze() {
  if (!codeProject) throw new Error('Zuerst einen Ordner öffnen');
  const { root, files } = codeProject;
  const tree = files.map(f => f.rel).slice(0, 400).join('\n');
  const j = await json(`You are a principal software engineer doing a code review of a whole project for a motivated young developer. Explain clearly. Language: ${lang()}.
Return ONLY JSON: {"name":"","what":"what this project is and does, 2-3 sentences","stack":["languages/frameworks"],"structure":[{"path":"folder or file","role":"what it is for"}],"score":{"code":0-100,"structure":0-100,"security":0-100,"docs":0-100},
"issues":[{"file":"path","line":0,"severity":"hoch|mittel|tief","problem":"","fix":"how to fix, with a short code example if helpful"}],"improvements":["concrete improvements"],"nextSteps":["3 next steps"]}
Find REAL problems in the code you see (bugs, security, missing error handling, performance, duplicated code). 4-10 issues, most important first. 5-10 structure items.`, `Project: ${path.basename(root)}\nFiles:\n${tree}\n\nContents:\n${pickContext(root, files, '', 110000)}`);
  return j;
}
async function codeAsk({ question, history }) {
  if (!codeProject) throw new Error('Zuerst einen Ordner öffnen');
  const { root, files } = codeProject;
  const ctx = pickContext(root, files, question + ' ' + (history || []).map(h => h.text).join(' '), 80000);
  const hist = (history || []).slice(-6).map(h => `${h.role === 'user' ? 'User' : 'Kairo'}: ${h.text}`).join('\n');
  return { answer: await ask(`You are a senior developer helping with this project. Answer the question using the project files. Refer to files as \`path\` and show code in markdown code blocks. You cannot change files; show the user exactly what to change. Language: ${lang()}.`, `Files in the project:\n${files.map(f => f.rel).slice(0, 300).join('\n')}\n\nRelevant file contents:\n${ctx}\n\nConversation so far:\n${hist}\n\nQuestion: ${question}`) };
}
function codeFile(rel) { if (!codeProject) throw new Error('Kein Projekt offen'); if (!codeProject.files.some(f => f.rel === rel)) throw new Error('Datei nicht im Projekt'); return { text: readRel(codeProject.root, rel, 200000) }; }

// ---------- 23 dashboard ----------
const getJson = async (u, ms = 9000) => { const r = await fetch(u, { signal: AbortSignal.timeout(ms), headers: { 'user-agent': 'Kairo/1.0' } }); if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); };
async function widgetData(w) {
  if (w.type === 'weather') {
    const g = await getJson(`https://geocoding-api.open-meteo.com/v1/search?count=1&language=de&name=${encodeURIComponent(w.city || 'Zürich')}`);
    const p = g.results?.[0]; if (!p) throw new Error('Ort nicht gefunden');
    const d = await getJson(`https://api.open-meteo.com/v1/forecast?latitude=${p.latitude}&longitude=${p.longitude}&current=temperature_2m,weather_code,wind_speed_10m,relative_humidity_2m&hourly=temperature_2m&daily=temperature_2m_max,temperature_2m_min,weather_code&forecast_days=6&timezone=auto`);
    return { place: p.name, now: d.current, hourly: d.hourly.temperature_2m.slice(0, 24), daily: d.daily };
  }
  if (w.type === 'crypto') {
    const id = (w.coin || 'bitcoin').toLowerCase(), cur = (w.currency || 'chf').toLowerCase();
    const [p, h] = await Promise.all([getJson(`https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(id)}&vs_currencies=${cur}&include_24hr_change=true`), getJson(`https://api.coingecko.com/api/v3/coins/${encodeURIComponent(id)}/market_chart?vs_currency=${cur}&days=7`).catch(() => null)]);
    if (!p[id]) throw new Error('Coin nicht gefunden');
    return { price: p[id][cur], change: p[id][cur + '_24h_change'], series: (h?.prices || []).filter((_, i) => i % 4 === 0).map(x => x[1]), currency: cur.toUpperCase() };
  }
  if (w.type === 'fx') {
    const from = (w.from || 'EUR').toUpperCase(), to = (w.to || 'CHF').toUpperCase();
    const start = new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10);
    const h = await getJson(`https://api.frankfurter.app/${start}..?from=${from}&to=${to}`);
    const series = Object.values(h.rates || {}).map(r => r[to]);
    return { rate: series[series.length - 1], series, from, to };
  }
  if (w.type === 'projects') return { projects: readData('projects', []).map(p => ({ name: p.name, done: p.milestones.flatMap(m => m.tasks).filter(t => t.done).length, total: p.milestones.flatMap(m => m.tasks).length })) };
  if (w.type === 'learn') return { paths: readData('paths', []).map(p => ({ title: p.title, done: (p.done || []).length, total: p.days.length })) };
  if (w.type === 'wiki') { const d = new Date(); const j = await getJson(`https://de.wikipedia.org/api/rest_v1/feed/onthisday/events/${d.getMonth() + 1}/${d.getDate()}`); return { items: (j.events || []).slice(0, 4).map(e => ({ year: e.year, text: e.text })) }; }
  return {};
}
async function dashFromText(text) {
  return json(`Turn the user's wish into dashboard widgets. Widget types: weather {city}, crypto {coin: coingecko id like bitcoin, ethereum, solana; currency: chf|eur|usd}, fx {from, to: ISO currency}, countdown {title, date YYYY-MM-DD}, clock {city, tz: IANA timezone}, projects {}, learn {}, wiki {} (on this day in history), note {text}.
Return ONLY JSON: {"widgets":[{"type":"","title":"short title", ...fields}]}`, text);
}

// ---------- 26 projects ----------
async function projectNew({ goal, deadline }) {
  const today = new Date().toISOString().slice(0, 10);
  const j = await json(`You are an expert project manager and coach for a motivated teenager. Turn the goal into a realistic project plan. Today is ${today}${deadline ? ', deadline ' + deadline : ''}. Language: ${lang()}.
Return ONLY JSON: {"name":"short project name","why":"one motivating sentence","milestones":[{"title":"","due":"YYYY-MM-DD","tasks":[{"title":"concrete task, starts with a verb","min":30}]}],"risks":["2 risks"],"firstStep":"what to do today in 15 minutes"}
4-6 milestones, 3-5 tasks each.`, goal);
  const p = { id: uid(), goal, deadline: deadline || '', created: today, ...j, milestones: (j.milestones || []).map(m => ({ ...m, tasks: (m.tasks || []).map(t => ({ ...t, id: uid(), done: false })) })) };
  const all = readData('projects', []); all.unshift(p); writeData('projects', all);
  return { project: p };
}
function projectSave(p) { const all = readData('projects', []); const i = all.findIndex(x => x.id === p.id); if (i >= 0) all[i] = p; else all.unshift(p); writeData('projects', all); return { ok: true }; }
function projectDelete(id) { writeData('projects', readData('projects', []).filter(p => p.id !== id)); return {}; }
async function projectCoach(id) {
  const p = readData('projects', []).find(x => x.id === id); if (!p) throw new Error('Projekt nicht gefunden');
  return { text: await ask(`You are a supportive but honest project coach. Look at the progress and give: 1) a short status (on track or not), 2) the 3 next concrete tasks, 3) one motivation sentence. Max 120 words. Language: ${lang()}. Today: ${new Date().toISOString().slice(0, 10)}.`, JSON.stringify(p)) };
}

// ---------- 32 exam simulator ----------
async function examMake({ subject, topic, level, count, minutes }) {
  const n = Math.max(4, Math.min(20, +count || 8));
  const j = await json(`You are an experienced teacher creating a fair, realistic exam. Subject: ${subject}. Level: ${level || 'Sekundarstufe'}. Language: ${lang()}.
Mix question types: "mc" (4 options, exactly one correct), "short" (short written answer), "calc" (calculation/transfer task, only if it fits the subject). Rising difficulty. Points: mc 1, short 2, calc 3. Write math in plain text (e.g. 3/5, x^2, 2·3, √9), never LaTeX.
Return ONLY JSON: {"title":"","questions":[{"type":"mc|short|calc","q":"","options":["",""],"correct":0,"answer":"model answer / solution","points":1,"topic":"sub-topic"}]}
Exactly ${n} questions.`, `Topic: ${topic}`);
  j.minutes = +minutes || Math.max(10, n * 2); j.subject = subject; j.topic = topic; j.id = uid();
  return { exam: j };
}
async function examGrade({ exam, answers }) {
  const free = exam.questions.map((q, i) => ({ i, q })).filter(x => x.q.type !== 'mc');
  let graded = {};
  if (free.length) {
    const j = await json(`You are a fair teacher grading answers. Give points from 0 to max (half points allowed) and short feedback. Accept equivalent answers (e.g. 0.5 = 1/2). Write math in plain text (e.g. 3/5, x^2, 2·3, √9), never LaTeX. Language: ${lang()}.
Return ONLY JSON: {"results":[{"i":0,"points":0,"feedback":""}]}`, free.map(({ i, q }) => `#${i} (max ${q.points}) Question: ${q.q}\nModel answer: ${q.answer}\nStudent answer: ${answers[i] || '(leer)'}`).join('\n\n'));
    (j.results || []).forEach(r => { graded[r.i] = r; });
  }
  const res = exam.questions.map((q, i) => {
    if (q.type === 'mc') { const ok = +answers[i] === +q.correct; return { points: ok ? q.points : 0, max: q.points, ok, feedback: ok ? 'Richtig' : `Richtig wäre: ${q.options?.[q.correct] ?? ''}` }; }
    const g = graded[i] || { points: 0, feedback: '' }; const pts = Math.max(0, Math.min(q.points, +g.points || 0));
    return { points: pts, max: q.points, ok: pts >= q.points * 0.75, feedback: g.feedback };
  });
  const got = res.reduce((a, r) => a + r.points, 0), max = res.reduce((a, r) => a + r.max, 0);
  const grade = Math.round((1 + 5 * got / Math.max(1, max)) * 4) / 4; // Swiss 1-6 scale, quarter steps
  const weak = {}; exam.questions.forEach((q, i) => { if (!res[i].ok) weak[q.topic || 'Allgemein'] = (weak[q.topic || 'Allgemein'] || 0) + 1; });
  const plan = await ask(`You are a learning coach. Based on the weak topics, write a short practice plan (3-5 bullet points, concrete, with what to practise and how long). Language: ${lang()}. Markdown bullets only.`, `Subject ${exam.subject}, topic ${exam.topic}. Weak topics: ${JSON.stringify(weak)}. Score ${got}/${max}.`).catch(() => '');
  const hist = readData('exams', []); hist.unshift({ id: exam.id, title: exam.title, subject: exam.subject, date: new Date().toISOString(), got, max, grade }); writeData('exams', hist.slice(0, 60));
  return { results: res, got, max, grade, weak, plan };
}

// ---------- 33 language teacher ----------
async function langTalk({ language, level, scenario, history, text }) {
  const hist = (history || []).slice(-12).map(h => `${h.role === 'user' ? 'Student' : 'Teacher'}: ${h.text}`).join('\n');
  return json(`You are a friendly, native ${language} teacher having a spoken conversation with a student at level ${level || 'A2'}. Scenario: ${scenario || 'free conversation about everyday life'}.
Reply ONLY in ${language}, short (1-3 sentences, matching the level), natural, and always end with a question to keep the talk going. If the student made mistakes, note them (explanations in ${lang()}).
Return ONLY JSON: {"reply":"","correction":{"wrong":"the student's sentence or empty","right":"corrected sentence or empty","why":"short explanation in ${lang()} or empty"},"words":[{"word":"useful word from your reply","meaning":"in ${lang()}"}],"level":"A1-C2 estimate","praise":"short praise in ${lang()} if they did well, else empty"}`,
    `${hist}\nStudent: ${text || '(starts the conversation – greet them and ask the first question)'}`);
}

// ---------- 34 learning paths ----------
async function pathNew({ goal, days, minutes }) {
  const n = Math.max(7, Math.min(60, +days || 30));
  const j = await json(`You are a world-class teacher designing a ${n}-day learning path. Daily time: ${minutes || 30} minutes. Language: ${lang()}.
Build up step by step, with a review day every 7 days and a final project at the end.
Return ONLY JSON: {"title":"","why":"one motivating sentence","weeks":["week 1 theme","..."],"days":[{"day":1,"title":"short","goal":"what you can do after today","tasks":["2-3 concrete tasks"],"check":"a mini test question"}]}
Exactly ${n} days.`, goal);
  const p = { id: uid(), goal, minutes: +minutes || 30, created: new Date().toISOString().slice(0, 10), done: [], lessons: {}, ...j };
  const all = readData('paths', []); all.unshift(p); writeData('paths', all);
  return { path: p };
}
async function pathLesson({ id, day }) {
  const all = readData('paths', []), p = all.find(x => x.id === id); if (!p) throw new Error('Lernpfad nicht gefunden');
  if (p.lessons?.[day]) return { lesson: p.lessons[day] };
  const d = p.days.find(x => x.day === day) || p.days[day - 1];
  const j = await json(`You are an excellent teacher. Write today's lesson (${p.minutes} minutes) for the learning path "${p.title}". Clear explanations, an example, then exercises. Language: ${lang()}.
Write math in plain text (e.g. 3/5, x^2, 2·3, √9), never LaTeX.
Return ONLY JSON: {"intro":"","sections":[{"heading":"","text":"markdown allowed, code blocks allowed"}],"example":"","exercises":[{"q":"","answer":""}],"summary":"3 bullet points as one string with line breaks"}`, `Day ${d.day}: ${d.title}\nGoal: ${d.goal}\nTasks: ${(d.tasks || []).join('; ')}`);
  p.lessons = p.lessons || {}; p.lessons[day] = j; writeData('paths', all);
  return { lesson: j };
}
function pathSave(p) { const all = readData('paths', []); const i = all.findIndex(x => x.id === p.id); if (i >= 0) all[i] = { ...all[i], done: p.done }; writeData('paths', all); return {}; }
function pathDelete(id) { writeData('paths', readData('paths', []).filter(p => p.id !== id)); return {}; }

// ---------- 36 brand kit ----------
async function brandKit({ idea }) {
  const j = await json(`You are the creative director of a top branding agency. Create a complete brand identity. Language: ${lang()}.
Fonts: choose heading and body from: "Space Grotesk", "Inter", "JetBrains Mono", "Georgia", "Segoe UI", "Arial Black", "Trebuchet MS", "Palatino Linotype".
Return ONLY JSON: {"name":"","tagline":"","story":"brand story, 3 sentences","values":["3 values"],"tone":["3 adjectives for the brand voice"],"audience":"",
"colors":[{"name":"","hex":"#","use":"primary|secondary|accent|dark|light"}],"fonts":{"heading":"","body":""},"slogans":["3 slogans"],"bio":"social media bio max 150 chars","posts":["3 short social media post texts, max 220 characters, no emojis"],"logoBrief":"brief for a logo designer: name, symbol idea, style, the exact brand colors"}
Exactly 5 colors (primary, secondary, accent, dark, light) that look great together.`, idea);
  const logos = await require('./studio').logos(j.logoBrief || `${j.name}, colors ${j.colors?.map(c => c.hex).join(', ')}`);
  j.logos = logos.logos || [];
  return { kit: j };
}

// ---------- 46 agent mode ----------
const AGENT_TOOLS = {
  research: 'deep web research with sources and a report (input: the question)',
  sources: 'find reputable sources and citations (input: topic)',
  document: 'write a professional document as PDF/Word (input: kind | details; kinds: bewerbung, lebenslauf, bericht, anleitung, brief, protokoll, referat, angebot)',
  presentation: 'create a PowerPoint presentation (input: topic | number of slides)',
  website: 'build a website (input: what the website is about)',
  app: 'build a small web app or tool (input: idea)',
  explain: 'animated "how does it work" explainer (input: thing)',
  project: 'project plan with milestones and tasks (input: goal)',
  learnpath: 'learning path with daily lessons (input: goal | days)',
  exam: 'practice exam (input: subject | topic)',
  brand: 'brand kit with logo, colors, fonts (input: idea)'
};
async function agentPlan({ task }) {
  return json(`You are Kairo's agent planner. Break the user's big task into 2-6 steps using ONLY these tools:
${Object.entries(AGENT_TOOLS).map(([k, v]) => `- ${k}: ${v}`).join('\n')}
Order the steps so later ones can use earlier results (e.g. research before document or presentation). Language for titles: ${lang()}.
Return ONLY JSON: {"title":"short title of the whole job","steps":[{"tool":"","input":"","title":"what this step does, short","why":"one sentence"}],"summary":"what the user gets at the end"}`, task);
}
async function agentContext({ notes }) {
  // compress earlier results so later steps can use them
  return { text: await ask(`Summarise these results into compact notes (facts, numbers, key points) that another writer can use. Max 400 words. Language: ${lang()}.`, notes) };
}

// ---------- 48 memory center ----------
function memAll() { return require('./memory').list(); }
function memUpdate({ id, text, cat }) {
  const mem = require('./memory'), l = mem.list(), m = l.find(x => x.id === id); if (!m) throw new Error('nicht gefunden');
  if (text != null) m.text = String(text).trim().slice(0, 300); if (cat != null) m.cat = cat;
  fs.writeFileSync(path.join(app.getPath('userData'), 'memory.json'), JSON.stringify(l, null, 2));
  return { item: m };
}
function memClear() { const mem = require('./memory'); const l = mem.list(); l.splice(0, l.length); fs.writeFileSync(path.join(app.getPath('userData'), 'memory.json'), '[]'); return {}; }
async function memSort() {
  const l = memAll(); if (!l.length) return { items: [] };
  const j = await json(`Sort each memory into one category: Person, Familie & Freunde, Schule & Lernen, Hobbys & Gaming, Vorlieben, Ziele & Pläne, Technik, Sonstiges.
Return ONLY JSON: {"cats":{"<id>":"category"}}`, l.map(m => `${m.id}: ${m.text}`).join('\n'));
  l.forEach(m => { if (j.cats?.[m.id]) m.cat = j.cats[m.id]; });
  fs.writeFileSync(path.join(app.getPath('userData'), 'memory.json'), JSON.stringify(l, null, 2));
  return { items: l };
}

function register(ctx) {
  ({ store, getWin } = ctx);
  const wrap = fn => async (_e, ...a) => { try { const r = await fn(...a); return { ok: true, ...(r || {}) }; } catch (e) { return { ok: false, error: { message: e.message } }; } };
  const h = (n, fn) => ipcMain.handle('pro:' + n, wrap(fn));
  h('research', (o, job) => research(o, job).then(report => ({ report })));
  h('researchList', () => ({ items: readData('research', []) }));
  h('researchGet', id => ({ report: readData('research-' + id, null) }));
  h('reportExport', (r, format) => exportDoc({ title: r.title, blocks: reportBlocks(r), format, folder: 'Recherchen' }));
  h('sources', (o, job) => findSources(o, job));
  h('document', o => document(o).then(doc => ({ doc })));
  h('export', o => exportDoc(o));
  h('coach', o => coach(o).then(result => ({ result })));
  h('pickFile', async filters => { const r = await dialog.showOpenDialog(getWin(), { properties: ['openFile'], filters }); return { file: r.canceled ? null : r.filePaths[0] }; });
  h('translate', (o, job) => translateFile(o, job));
  h('presentation', o => presentation(o));
  h('talkFeedback', o => talkFeedback(o).then(feedback => ({ feedback })));
  h('codeOpen', () => codeOpen());
  h('codeAnalyze', () => codeAnalyze().then(review => ({ review })));
  h('codeAsk', o => codeAsk(o));
  h('codeFile', rel => codeFile(rel));
  h('dashGet', () => ({ widgets: readData('dashboard', null) }));
  h('dashSave', w => { writeData('dashboard', w); return {}; });
  h('dashData', w => widgetData(w).then(data => ({ data })));
  h('dashFromText', t => dashFromText(t));
  h('projects', () => ({ items: readData('projects', []) }));
  h('projectNew', o => projectNew(o));
  h('projectSave', p => projectSave(p));
  h('projectDelete', id => projectDelete(id));
  h('projectCoach', id => projectCoach(id));
  h('examMake', o => examMake(o));
  h('examGrade', o => examGrade(o));
  h('examHistory', () => ({ items: readData('exams', []) }));
  h('langTalk', o => langTalk(o).then(turn => ({ turn })));
  h('paths', () => ({ items: readData('paths', []) }));
  h('pathNew', o => pathNew(o));
  h('pathLesson', o => pathLesson(o));
  h('pathSave', p => pathSave(p));
  h('pathDelete', id => pathDelete(id));
  h('brandKit', o => brandKit(o));
  h('saveImages', ({ folder, files }) => { const dir = outDir(...folder.map(safe)); const paths = files.map(f => { const p = path.join(dir, safe(f.name)); fs.writeFileSync(p, Buffer.from(f.data, 'base64')); return p; }); return { dir, paths }; });
  h('agentPlan', o => agentPlan(o).then(plan => ({ plan })));
  h('agentContext', o => agentContext(o));
  h('memList', () => ({ items: memAll() }));
  h('memUpdate', o => memUpdate(o));
  h('memSort', () => memSort());
  h('memClear', () => memClear());
  h('reveal', p => { shell.showItemInFolder(p); return {}; });
  h('openPath', p => { if (path.resolve(p).startsWith(path.join(app.getPath('documents'), 'Kairo'))) shell.openPath(p); return {}; });
}

module.exports = { register, research, findSources, document, coach, translateFile, blocksToDocx, exportDoc, reportBlocks };
