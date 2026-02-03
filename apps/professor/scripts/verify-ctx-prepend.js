/**
 * Local verification: prependGroupIdToRequestBody logic
 * Mirrors server/index.ts inline script - which body shapes get PREPEND_APPLIED.
 * Run: node scripts/verify-ctx-prepend.js
 */
const CTX_TAG_PREFIX = '[CTX:groupid=';
function prependGroupIdToRequestBody(bodyObj, groupId) {
  if (!bodyObj || typeof bodyObj !== 'object' || !groupId) return { body: bodyObj, modified: false };
  const tag = CTX_TAG_PREFIX + groupId + ']\n';
  if (typeof bodyObj.content === 'string') {
    bodyObj.content = tag + bodyObj.content;
    return { body: bodyObj, modified: true };
  }
  if (bodyObj.message && typeof bodyObj.message.content === 'string') {
    bodyObj.message.content = tag + bodyObj.message.content;
    return { body: bodyObj, modified: true };
  }
  if (Array.isArray(bodyObj.messages) && bodyObj.messages.length > 0) {
    for (let i = bodyObj.messages.length - 1; i >= 0; i--) {
      if (bodyObj.messages[i].role === 'user' && typeof bodyObj.messages[i].content === 'string') {
        bodyObj.messages[i].content = tag + bodyObj.messages[i].content;
        return { body: bodyObj, modified: true };
      }
    }
  }
  if (bodyObj.input) {
    if (typeof bodyObj.input.content === 'string') {
      bodyObj.input.content = tag + bodyObj.input.content;
      return { body: bodyObj, modified: true };
    }
    if (Array.isArray(bodyObj.input.parts)) {
      for (let j = 0; j < bodyObj.input.parts.length; j++) {
        if (bodyObj.input.parts[j].type === 'text' && typeof bodyObj.input.parts[j].text === 'string') {
          bodyObj.input.parts[j].text = tag + bodyObj.input.parts[j].text;
          return { body: bodyObj, modified: true };
        }
      }
    }
  }
  return { body: bodyObj, modified: false };
}

const GROUP_ID = 'TEST123';
const USER_MSG = 'Hello world';

const cases = [
  { name: 'A: content (single)', body: { content: USER_MSG } },
  { name: 'B: message.content', body: { message: { content: USER_MSG } } },
  { name: 'C: messages[].content (user)', body: { messages: [{ role: 'user', content: USER_MSG }] } },
  { name: 'D: input.content', body: { input: { content: USER_MSG } } },
  { name: 'E: input.parts[].text', body: { input: { parts: [{ type: 'text', text: USER_MSG }] } } },
  { name: 'F: no match (empty)', body: {} },
  { name: 'G: no match (other)', body: { foo: 'bar' } },
];

console.log('--- CTX prepend unit verification (groupId=' + GROUP_ID + ') ---\n');
let applied = 0;
for (const c of cases) {
  const copy = JSON.parse(JSON.stringify(c.body));
  const result = prependGroupIdToRequestBody(copy, GROUP_ID);
  const expectedTag = '[CTX:groupid=TEST123]\n';
  const ok = result.modified && (JSON.stringify(copy).indexOf(expectedTag) !== -1);
  if (result.modified) applied++;
  console.log(c.name + ': modified=' + result.modified + (result.modified ? ' ✓ PREPEND_APPLIED' : ''));
  if (result.modified) {
    const snippet = JSON.stringify(copy).slice(0, 120) + '...';
    console.log('  body snippet: ' + snippet);
  }
}
console.log('\nTotal PREPEND_APPLIED count: ' + applied + ' (expected 5 for A–E)');
console.log(applied === 5 ? 'PASS: all supported shapes modified once.\n' : 'FAIL: expected 5.\n');
