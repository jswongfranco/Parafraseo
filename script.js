// Configuración de PDF.js
if (typeof pdfjsLib !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

// Elementos del DOM
const fileInput = document.getElementById('file-input');
const dropZone = document.getElementById('drop-zone');
const fileLoadedDiv = document.getElementById('file-loaded');
const fileNameSpan = document.getElementById('file-name');
const fileMetaSpan = document.getElementById('file-meta');
const clearFileBtn = document.getElementById('clear-file-btn');
const textInput = document.getElementById('text-input');
const tabFile = document.getElementById('tab-file');
const tabText = document.getElementById('tab-text');
const fileModeDiv = document.getElementById('file-mode');
const runBtn = document.getElementById('run-btn');
const progressSection = document.getElementById('progress-section');
const outputSection = document.getElementById('output-section');
const outputTextarea = document.getElementById('output-textarea');
const statOrig = document.getElementById('stat-orig');
const statNew = document.getElementById('stat-new');
const statChunks = document.getElementById('stat-chunks');
const errMsg = document.getElementById('err-msg');
const progressFill = document.getElementById('progress-fill');
const progressLabel = document.getElementById('progress-label');
const chunkStatusDiv = document.getElementById('chunk-status');
const logLine = document.getElementById('log-line');
const copyBtn = document.getElementById('copy-btn');
const downloadDocxBtn = document.getElementById('download-docx-btn');
const downloadTxtBtn = document.getElementById('download-txt-btn');
const resetBtn = document.getElementById('reset-btn');
const intensitySlider = document.getElementById('intensity');
const intensityVal = document.getElementById('intensity-val');
const modelSelect = document.getElementById('model-select');
const toneSelect = document.getElementById('tone');

// Variables globales
let extractedText = '';
let currentMode = 'file';
let originalFilename = '';
let originalFileExt = '';

// Inicializar eventos
function init() {
  tabFile.addEventListener('click', () => switchMode('file'));
  tabText.addEventListener('click', () => switchMode('text'));
  fileInput.addEventListener('change', (e) => handleFile(e.target.files[0]));
  clearFileBtn.addEventListener('click', clearFile);
  runBtn.addEventListener('click', startParaphrase);
  copyBtn.addEventListener('click', copyOutput);
  downloadDocxBtn.addEventListener('click', downloadAsDocx);
  downloadTxtBtn.addEventListener('click', downloadAsTxt);
  resetBtn.addEventListener('click', resetAll);
  intensitySlider.addEventListener('input', (e) => updateIntensity(e.target.value));
  
  // Drag & drop
  dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('drag-over'); });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
  });
  
  updateIntensity(intensitySlider.value);
}

function switchMode(mode) {
  currentMode = mode;
  tabFile.classList.toggle('active', mode === 'file');
  tabText.classList.toggle('active', mode === 'text');
  fileModeDiv.style.display = mode === 'file' ? 'block' : 'none';
  textInput.classList.toggle('visible', mode === 'text');
  if (mode === 'text') extractedText = '';
}

async function handleFile(file) {
  if (!file) return;
  const ext = file.name.split('.').pop().toLowerCase();
  if (!['pdf','docx','doc','txt'].includes(ext)) {
    showErr('Formato no soportado. Usa PDF, DOCX o TXT.');
    return;
  }
  originalFilename = file.name;
  originalFileExt = ext;
  fileLoadedDiv.style.display = 'flex';
  fileNameSpan.innerText = file.name;
  fileMetaSpan.innerText = 'Leyendo...';
  try {
    if (ext === 'txt') extractedText = await file.text();
    else if (ext === 'pdf') extractedText = await extractPDF(file);
    else extractedText = await extractDOCX(file);
    const wc = extractedText.split(/\s+/).length;
    fileMetaSpan.innerHTML = `${(file.size/1024).toFixed(1)} KB · ${wc} palabras`;
    showErr('', false);
  } catch(e) {
    showErr('Error al leer el archivo: ' + e.message);
    extractedText = '';
    fileLoadedDiv.style.display = 'none';
  }
}

async function extractPDF(file) {
  const ab = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: ab }).promise;
  let text = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    text += content.items.map(x => x.str).join(' ') + '\n';
  }
  return text;
}

async function extractDOCX(file) {
  const ab = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer: ab });
  return result.value;
}

function clearFile() {
  extractedText = '';
  fileLoadedDiv.style.display = 'none';
  fileInput.value = '';
}

function updateIntensity(val) {
  const labels = ['Conservador', 'Media', 'Agresivo'];
  intensityVal.innerText = labels[val-1];
}

function getPreserve() {
  const chips = document.querySelectorAll('#preserve-chips .toggle-chip.active');
  return Array.from(chips).map(c => c.dataset.key);
}

function showErr(msg, isError = true) {
  errMsg.innerText = msg;
  errMsg.classList.toggle('visible', !!msg);
  if (!isError && msg) setTimeout(() => errMsg.classList.remove('visible'), 2000);
}

function splitIntoChunks(text, maxWords = 700) {
  const lines = text.split(/\r?\n/);
  const chunks = [];
  let current = [];
  let wordCount = 0;
  for (let line of lines) {
    const words = line.trim().split(/\s+/).length;
    if (wordCount + words > maxWords && current.length > 0) {
      chunks.push(current.join('\n'));
      current = [line];
      wordCount = words;
    } else {
      current.push(line);
      wordCount += words;
    }
  }
  if (current.length) chunks.push(current.join('\n'));
  return chunks;
}

function buildPrompt(chunk, tone, intensity, preserve) {
  const tones = { natural: 'natural', academico: 'académico', formal: 'formal', conversacional: 'conversacional' };
  const intensityText = { 1: 'cambios mínimos', 2: 'cambios medios', 3: 'reescritura profunda' };
  let preserveRules = '';
  if (preserve.includes('titles')) preserveRules += '- NO modifiques los títulos, encabezados ni líneas que empiecen con #, ## o estén en mayúsculas cortas. Déjalos exactamente igual.\n';
  if (preserve.includes('numbers')) preserveRules += '- Preserva todos los números, fechas y datos exactos.\n';
  if (preserve.includes('technical')) preserveRules += '- Mantén los términos técnicos sin sinónimos.\n';
  
  return `Eres un parafraseador profesional. Reescribe SOLO el contenido de los párrafos normales, conservando los títulos exactamente igual.

Reglas:
- Tono: ${tones[tone] || 'natural'}.
- Intensidad: ${intensityText[intensity]}.
${preserveRules}
- No añadas comentarios, ni prefijos. Devuelve SOLO el texto reescrito.
- Respeta la estructura original: los títulos deben verse idénticos.

TEXTO A PARAFRASEAR:
${chunk}`;
}

async function startParaphrase() {
  showErr('');
  let source = '';
  if (currentMode === 'file') {
    if (!extractedText) { showErr('Sube un archivo primero.'); return; }
    source = extractedText;
  } else {
    source = textInput.value.trim();
    if (!source) { showErr('Pega un texto.'); return; }
  }
  
  const tone = toneSelect.value;
  const intensity = intensitySlider.value;
  const model = modelSelect.value;
  const preserve = getPreserve();
  
  const chunks = splitIntoChunks(source, 700);
  const total = chunks.length;
  
  runBtn.disabled = true;
  progressSection.classList.add('visible');
  outputSection.classList.remove('visible');
  chunkStatusDiv.innerHTML = chunks.map((_, i) => `<div class="chunk-dot" id="dot-${i}"></div>`).join('');
  
  const results = [];
  for (let i = 0; i < chunks.length; i++) {
    const dot = document.getElementById(`dot-${i}`);
    dot.classList.add('active');
    logLine.innerText = `Segmento ${i+1}/${total}`;
    progressFill.style.width = `${(i/total)*100}%`;
    progressLabel.innerText = `Segmento ${i+1} de ${total}`;
    
    try {
      const prompt = buildPrompt(chunks[i], tone, intensity, preserve);
      // Llamada al backend de Vercel (proxy)
      const response = await fetch('/api/paraphrase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, model })
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error en el servidor');
      }
      const data = await response.json();
      results.push(data.paraphrased);
      dot.classList.remove('active');
      dot.classList.add('done');
    } catch (err) {
      dot.classList.remove('active');
      dot.classList.add('error');
      results.push(`[Error: ${err.message}]`);
    }
    await new Promise(r => setTimeout(r, 100));
  }
  
  progressFill.style.width = '100%';
  const finalText = results.join('\n\n');
  outputTextarea.value = finalText;
  statOrig.innerText = source.split(/\s+/).length;
  statNew.innerText = finalText.split(/\s+/).length;
  statChunks.innerText = total;
  outputSection.classList.add('visible');
  runBtn.disabled = false;
}

async function copyOutput() {
  await navigator.clipboard.writeText(outputTextarea.value);
  showErr('✅ Copiado al portapapeles', false);
}

async function downloadAsDocx() {
  const text = outputTextarea.value;
  if (!text) return;
  const { Document, Packer, Paragraph, TextRun } = docx;
  const paragraphs = text.split(/\n/).map(line => {
    const isTitle = line.trim().length < 50 && (line.includes('#') || (line === line.toUpperCase() && line.length < 30));
    return new Paragraph({ children: [new TextRun({ text: line, bold: isTitle, size: isTitle ? 28 : 24 })] });
  });
  const doc = new Document({ sections: [{ children: paragraphs }] });
  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'parafraseado.docx';
  a.click();
  URL.revokeObjectURL(url);
}

function downloadAsTxt() {
  const blob = new Blob([outputTextarea.value], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'parafraseado.txt';
  a.click();
  URL.revokeObjectURL(url);
}

function resetAll() {
  clearFile();
  textInput.value = '';
  outputSection.classList.remove('visible');
  progressSection.classList.remove('visible');
  extractedText = '';
  showErr('');
}

init();