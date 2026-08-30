import {
  login,
  loadAllowedModels,
  createThread,
  sendMessage,
  awaitAssistant,
  listAllMessages,
  previewContext,
  getReceipt,
} from './client.mjs';

const runId = `SMOKE-${Date.now().toString(36)}`;

const user = await login();
console.log(`login ok — ${user.email} (${user.id})`);

const models = await loadAllowedModels();
console.log(`free models: ${models.length}`);
for (const m of models) console.log(`  ${m.provider}/${m.modelKey} ctx=${m.contextWindowTokens ?? 'null'}`);

const model = models.find((m) => m.modelKey === 'gpt-oss:20b') ?? models[0];
console.log(`\nusing ${model.provider}/${model.modelKey}`);

const thread = await createThread({
  title: `QA-LAB-${runId}-smoke`,
  provider: model.provider,
  model: model.modelKey,
});
console.log(`thread ${thread.id} created`);

const turns = [
  'The project codename is ORCHID-731. Just acknowledge in one short sentence.',
  'The backend must use TypeScript. Acknowledge in one short sentence.',
  'What is the project codename I gave you? Answer with the codename only.',
];

let count = 0;
for (const [i, content] of turns.entries()) {
  const t0 = Date.now();
  const sent = await sendMessage(thread.id, content, model.provider, model.modelKey);
  if (!sent.ok) {
    console.log(`turn ${i + 1} SEND FAILED ${sent.status} ${JSON.stringify(sent.body)}`);
    break;
  }
  count += 1;
  const reply = await awaitAssistant(thread.id, count, { timeoutMs: 180_000 });
  if (!reply.ok) {
    console.log(`turn ${i + 1} NO REPLY (${reply.reason}) after ${Date.now() - t0}ms`);
    break;
  }
  count = reply.total;
  const text = String(reply.message.content ?? '').replace(/\s+/g, ' ').slice(0, 160);
  console.log(`turn ${i + 1} ok ${Date.now() - t0}ms total=${count} :: ${text}`);
  if (i === turns.length - 1) {
    console.log(`  recall ORCHID-731 -> ${/ORCHID-?731/i.test(reply.message.content ?? '') ? 'PASS' : 'FAIL'}`);
    const receipt = await getReceipt(reply.message.id);
    console.log(`  receipt: ${receipt === null ? 'NONE' : JSON.stringify(Object.keys(receipt))}`);
  }
}

const preview = await previewContext(thread.id, 'What is the project codename?');
console.log(`\npreview-context: ${JSON.stringify(preview).slice(0, 400)}`);

const all = await listAllMessages(thread.id);
console.log(`\nfinal message count: ${all.length}`);
console.log(`thread kept for inspection: ${thread.id}`);
