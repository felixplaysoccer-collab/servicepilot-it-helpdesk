import test from 'node:test';
import assert from 'node:assert/strict';
import {id,optionalId,checkTicket,checkAsset} from '../lib/validation.js';

test('accepts positive numeric record identifiers only',()=>{
  assert.equal(id(4),true);assert.equal(id('004'),true);
  for(const item of [0,-1,'1.1','x',null,''])assert.equal(id(item),false);
  assert.equal(optionalId(''),null);assert.equal(optionalId('12'),12);
  assert.ok(Number.isNaN(optionalId('invalid')));
});
test('validates ticket request and optional asset',()=>{
  const t={title:'Cannot connect to Wi-Fi',requester:'Jordan Lee',description:'Laptop fails to connect.',category:'Network',priority:'High',asset_id:'7'};
  const r=checkTicket(t);assert.equal(r.error,undefined);assert.equal(r.value.asset_id,7);
  assert.ok(checkTicket({...t,priority:'Urgent'}).error);
  assert.ok(checkTicket({...t,requester_email:'not-an-email'}).error);
  assert.ok(checkTicket({...t,title:''}).error);
});
test('asset records require normalized unique-style tags',()=>{
  const a={asset_tag:'lap-103',device_name:'ThinkPad',asset_type:'Laptop',status:'Active',location:'South office'};
  assert.equal(checkAsset(a).value.asset_tag,'LAP-103');
  assert.ok(checkAsset({...a,asset_tag:'bad tag'}).error);
  assert.ok(checkAsset({...a,asset_type:'Spaceship'}).error);
});
