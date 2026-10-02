const {test} = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const {stripTypeScriptTypes} = require('node:module');
function setup(role='teacher', active=true, insertError=null) {
  let handler, created=0, deleted=0, saved;
  const admin = {
    auth:{getUser:async token=>token==='valid'?{data:{user:{id:'s'}}}:{data:{},error:{}},admin:{
      createUser:async()=>{created++;return {data:{user:{id:'new'}}};},
      deleteUser:async()=>{deleted++;return {error:null};}
    }},
    from:()=>({select:()=>({eq:()=>({single:async()=>({data:{role,active}})})}),
      insert:async value=>{saved=value;return {error:insertError};}})
  };
  const code = stripTypeScriptTypes(fs.readFileSync('supabase/functions/create-teacher/index.ts','utf8').replace(/^import .*;\r?\n/, ''));
  vm.runInNewContext(code,{createClient:()=>admin,Deno:{env:{get:()=> 'test'},serve:fn=>handler=fn},Response});
  return {run:(token='valid')=>handler(new Request('https://test/create-teacher',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({name:'Professor',email:'p@example.com',password:'Example-test-1234'})})),counts:()=>({created,deleted,saved})};
}
test('teacher and inactive secretary cannot create users',async()=>{
  for(const args of [['teacher',true],['secretary',false]]){
    const f=setup(...args);assert.equal((await f.run()).status,403);assert.equal(f.counts().created,0);
  }
});
test('invalid session cannot create users',async()=>{
  const f=setup('secretary');assert.equal((await f.run('invalid')).status,401);assert.equal(f.counts().created,0);
});
test('secretary creates teacher role only',async()=>{
  const f=setup('secretary');assert.equal((await f.run()).status,201);assert.equal(f.counts().saved.role,'teacher');
});
test('profile failure rolls back new account',async()=>{
  const f=setup('secretary',true,{});assert.equal((await f.run()).status,500);assert.equal(f.counts().deleted,1);
});
