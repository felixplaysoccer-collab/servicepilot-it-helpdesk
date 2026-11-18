import test from 'node:test';
import assert from 'node:assert/strict';
import {hashPassword,verifyPassword,newToken,hashToken,sessionCookie,expireCookie} from '../lib/security.js';

test('passwords use salted scrypt hashes and verify correctly',async()=>{
  const password='VeryLongTestPassword!2026';
  const first=await hashPassword(password),second=await hashPassword(password);
  assert.notEqual(first,second);
  assert.equal(await verifyPassword(password,first),true);
  assert.equal(await verifyPassword('IncorrectPassword',first),false);
  assert.equal(await verifyPassword(password,'invalid'),false);
  await assert.rejects(()=>hashPassword('short'));
});
test('sessions use unpredictable tokens; only hashes are stored',()=>{
  const a=newToken(),b=newToken();assert.equal(a.length,64);assert.notEqual(a,b);
  assert.equal(hashToken(a).length,64);assert.notEqual(hashToken(a),a);
  assert.match(sessionCookie(a),/HttpOnly; SameSite=Lax/);
  assert.match(sessionCookie(a,true),/; Secure/);
  assert.match(expireCookie(),/Max-Age=0/);
});
