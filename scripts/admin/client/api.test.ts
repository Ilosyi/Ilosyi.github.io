import assert from 'node:assert/strict';
import test from 'node:test';
import { fileToBase64 } from './api.ts';

test('fileToBase64 encodes file bytes for image upload payloads', async () => {
  const file = new File([new Uint8Array([0, 1, 2, 250, 255])], 'sample.bin');

  assert.equal(await fileToBase64(file), 'AAEC+v8=');
});
