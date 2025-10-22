// app.js — JSONPractice interactive logic
// No external libs, all client-side.

const $ = sel => document.querySelector(sel);
const input = $('#json-input');
const btnSample = $('#btn-sample');
const btnValidate = $('#btn-validate');
const btnPrettify = $('#btn-prettify');
const btnMinify = $('#btn-minify');
const btnCopy = $('#btn-copy');
const btnDownload = $('#btn-download');
const resultMessage = $('#result-message');
const resultPre = $('#result-pre');

// Sample JSON (useful starting point)
const SAMPLE_JSON = `{
  "project": "JSONPractice",
  "version": "1.0.0",
  "authors": [
    { "name": "Alice", "email": "alice@example.com" },
    { "name": "Bob", "email": "bob@example.com" }
  ],
  "settings": {
    "indent": 2,
    "features": {
      "validate": true,
      "prettify": true,
      "minify": true
    }
  },
  "items": [
    { "id": 1, "tags": ["demo","sample"] },
    { "id": 2, "tags": [] }
  ]
}`;

// Utility: compute line & column from index
function indexToLineColumn(text, index) {
  const lines = text.slice(0, index).split('\n');
  const line = lines.length;
  const col = lines[lines.length - 1].length + 1;
  return { line, col };
}

// Try to extract position from error message, fallback to best-effort
function extractPositionFromError(err, jsonText) {
  const msg = (err && err.message) ? err.message : '';
  // Many engines provide "position X" or "at position X"
  let posMatch = msg.match(/position\s+(\d+)/i) || msg.match(/at\s+(\d+)/);
  if (posMatch) {
    const index = Number(posMatch[1]);
    if (!isNaN(index)) return indexToLineColumn(jsonText, index);
  }
  // Some browsers include "Unexpected token ... in JSON at position N"
  posMatch = msg.match(/at position\s+(\d+)/i);
  if (posMatch) {
    const index = Number(posMatch[1]);
    return indexToLineColumn(jsonText, index);
  }
  // Try to find unexpected token character from message (very fuzzy)
  const unicode = msg.match(/at line (\d+) column (\d+)/i);
  if (unicode) {
    return { line: Number(unicode[1]), col: Number(unicode[2]) };
  }
  // fallback: if message contains index like "in JSON at position 12"
  const fallback = msg.match(/(\d{1,6})/);
  if (fallback) {
    return indexToLineColumn(jsonText, Number(fallback[1]));
  }
  return null; // unknown
}

function setResultMessage(text, type = 'neutral') {
  resultMessage.textContent = text;
  resultMessage.className = `message ${type === 'neutral' ? '' : type}`;
}

// Validate JSON and return parsed object or throw
function validateJSON(text) {
  if (!text || !text.trim()) throw new Error('Input is empty.');
  // Try parsing
  try {
    return JSON.parse(text);
  } catch (err) {
    // Attempt to compute line/col
    const pos = extractPositionFromError(err, text);
    const friendly = pos
      ? `${err.message} (line ${pos.line}, column ${pos.col})`
      : err.message;
    const e = new Error(friendly);
    e._orig = err;
    throw e;
  }
}

function prettifyJSON(text, spaces = 2) {
  const parsed = validateJSON(text);
  // stable stringify (native)
  return JSON.stringify(parsed, null, spaces);
}

function minifyJSON(text) {
  const parsed = validateJSON(text);
  return JSON.stringify(parsed);
}

function showOutput(text) {
  resultPre.textContent = text;
  resultPre.scrollTop = 0;
}

function onValidate() {
  const text = input.value;
  try {
    validateJSON(text);
    setResultMessage('Valid JSON ✓', 'success');
    showOutput(prettifyJSON(text));
  } catch (err) {
    setResultMessage(err.message || 'Invalid JSON', 'error');
    // Show helpful viewport: show the raw input with a caret line indicator if we can
    const pos = extractPositionFromError(err._orig || err, text) || null;
    if (pos) {
      // Create context snippet with line numbers
      const lines = text.split('\n');
      const start = Math.max(0, pos.line - 3);
      const end = Math.min(lines.length, pos.line + 2);
      const snippet = lines.slice(start, end).map((l, i) => {
        const n = start + i + 1;
        const mark = (n === pos.line) ? '▶ ' : '  ';
        return `${String(n).padStart(3)} ${mark}${l}`;
      }).join('\n');
      showOutput(snippet + `\n\nError: ${err.message}`);
    } else {
      showOutput(`Error: ${err.message}`);
    }
  }
}

function onPrettify() {
  try {
    const pretty = prettifyJSON(input.value, 2);
    setResultMessage('Prettified JSON', 'success');
    showOutput(pretty);
    input.value = pretty;
  } catch (err) {
    setResultMessage(err.message, 'error');
    showOutput(`Error: ${err.message}`);
  }
}

function onMinify() {
  try {
    const min = minifyJSON(input.value);
    setResultMessage('Minified JSON', 'success');
    showOutput(min);
    input.value = min;
  } catch (err) {
    setResultMessage(err.message, 'error');
    showOutput(`Error: ${err.message}`);
  }
}

function onCopy() {
  const out = resultPre.textContent || input.value;
  if (!out) {
    setResultMessage('Nothing to copy', 'error');
    return;
  }
  navigator.clipboard?.writeText(out)
    .then(() => setResultMessage('Copied to clipboard', 'success'))
    .catch(() => {
      // fallback
      try {
        const ta = document.createElement('textarea');
        ta.value = out;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        ta.remove();
        setResultMessage('Copied to clipboard', 'success');
      } catch {
        setResultMessage('Copy failed', 'error');
      }
    });
}

function onDownload() {
  const text = resultPre.textContent || input.value;
  if (!text) {
    setResultMessage('Nothing to download', 'error');
    return;
  }
  const blob = new Blob([text], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'data.json';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  setResultMessage('Download started', 'success');
}

function onSample() {
  input.value = SAMPLE_JSON;
  setResultMessage('Sample loaded — validate when ready', 'neutral');
  showOutput('');
}

// event wiring
btnSample.addEventListener('click', onSample);
btnValidate.addEventListener('click', onValidate);
btnPrettify.addEventListener('click', onPrettify);
btnMinify.addEventListener('click', onMinify);
btnCopy.addEventListener('click', onCopy);
btnDownload.addEventListener('click', onDownload);

// keyboard shortcuts
input.addEventListener('keydown', (ev) => {
  if ((ev.ctrlKey || ev.metaKey) && ev.key === 'Enter') {
    ev.preventDefault();
    onValidate();
  }
});

// nice: remember last content using sessionStorage
const STORAGE_KEY = 'jsonpractice.last';
window.addEventListener('load', () => {
  const last = sessionStorage.getItem(STORAGE_KEY);
  if (last) input.value = last;
});
window.addEventListener('beforeunload', () => {
  sessionStorage.setItem(STORAGE_KEY, input.value || '');
});

// set initial focus
input.focus();
setResultMessage('Ready — paste JSON on the left.');
