import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseProxy} from '../server/transport';
test('server proxy accepts Windows formats and rejects unsupported protocols',()=>{
 assert.equal(parseProxy('127.0.0.1:8890'),'http://127.0.0.1:8890/');
 assert.equal(parseProxy('http=localhost:8080;https=localhost:8890'),'http://localhost:8890/');
 assert.equal(parseProxy('https://localhost:8890'),'https://localhost:8890/');
 assert.equal(parseProxy('file:///tmp/proxy'),undefined);
 assert.equal(parseProxy(''),undefined);
});
