// Upload the JSONL and create an OpenAI Batch job. Saves the batch id.
import { readFile, writeFile } from 'node:fs/promises';

const KEY = process.env.OPENAI_API_KEY;
const OPENAI = 'https://api.openai.com/v1';
const BATCH_DIR = new URL('../data/batch/', import.meta.url);

const jsonlPath = new URL('requests.jsonl', BATCH_DIR);
const jsonl = await readFile(jsonlPath);
if (!jsonl.length) throw new Error('requests.jsonl is empty — run build-batch first.');

// 1) upload file (multipart)
const form = new FormData();
form.append('purpose', 'batch');
form.append('file', new Blob([jsonl], { type: 'application/jsonl' }), 'requests.jsonl');

const upRes = await fetch(`${OPENAI}/files`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${KEY}` },
  body: form,
});
if (!upRes.ok) throw new Error(`file upload failed: ${upRes.status} ${await upRes.text()}`);
const file = await upRes.json();
console.log(`Uploaded file ${file.id} (${file.bytes} bytes)`);

// 2) create batch
const bRes = await fetch(`${OPENAI}/batches`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    input_file_id: file.id,
    endpoint: '/v1/responses',
    completion_window: '24h',
    metadata: { project: 'pyzine', purpose: 'article-generation' },
  }),
});
if (!bRes.ok) throw new Error(`batch create failed: ${bRes.status} ${await bRes.text()}`);
const batch = await bRes.json();

await writeFile(
  new URL('state.json', BATCH_DIR),
  JSON.stringify({ batchId: batch.id, inputFileId: file.id, status: batch.status }, null, 2)
);
console.log(`Batch created: ${batch.id}  status=${batch.status}`);
console.log('Poll/ingest with:  node scripts/ingest-batch.mjs');
