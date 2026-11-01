// Fills a LOCAL copy of the site with sample data, to explore every admin screen (the same data as the admin tour).
//   npm run sample-data                              first time: creates the admin ada@example.com / adminpass123
//   npm run sample-data -- you@example.com yourpass   if you already created an admin
// It only runs against http://localhost, so it can never change the live site. Run it on an empty local database.
import { readFileSync, existsSync } from 'node:fs';

const env = existsSync('.env') ? Object.fromEntries(readFileSync('.env', 'utf8').split(/\r?\n/).map((l) => l.match(/^([A-Z_]+)=(.*)$/)).filter(Boolean).map((m) => [m[1], m[2]])) : {};
const PORT = env.PORT || process.env.PORT || '3000';
const BASE = `http://localhost:${PORT}`;
const B = `${BASE}/api`;
const SETUP_TOKEN = env.ADMIN_SETUP_TOKEN || process.env.ADMIN_SETUP_TOKEN || '';
const [EMAIL = 'admin@example.com', PASSWORD = 'adminpass123'] = process.argv.slice(2);
if (!/^http:\/\/localhost:/.test(BASE)) { console.error('Only for a local copy.'); process.exit(1); }
try { await fetch(`${B}/health`); } catch { console.error(`The site isn't running at ${BASE}. Start it first with: npm run local`); process.exit(1); }
const LOGO_PNG = 'iVBORw0KGgoAAAANSUhEUgAAAUAAAAB4CAIAAAAMrLyJAAABe0lEQVR4nO3TQQ3AIADAwDE72ME0rvDAhzS5U9BPx1z7A5r+1wHAPQNDmIEhzMAQZmAIMzCEGRjCDAxhBoYwA0OYgSHMwBBmYAgzMIQZGMIMDGEGhjADQ5iBIczAEGZgCDMwhBkYwgwMYQaGMANDmIEhzMAQZmAIMzCEGRjCDAxhBoYwA0OYgSHMwBBmYAgzMIQZGMIMDGEGhjADQ5iBIczAEGZgCDMwhBkYwgwMYQaGMANDmIEhzMAQZmAIMzCEGRjCDAxhBoYwA0OYgSHMwBBmYAgzMIQZGMIMDGEGhjADQ5iBIczAEGZgCDMwhBkYwgwMYQaGMANDmIEhzMAQZmAIMzCEGRjCDAxhBoYwA0OYgSHMwBBmYAgzMIQZGMIMDGEGhjADQ5iBIczAEGZgCDMwhBkYwgwMYQaGMANDmIEhzMAQZmAIMzCEGRjCDAxhBoYwA0OYgSHMwBBmYAgzMIQZGMIMDGEGhjADQ5iBIczAEGZgCDMwhBkYwg4/lAI47pLlswAAAABJRU5ErkJggg==';
async function call(m,p,b,c,ct='application/json',raw){const r=await fetch(B+p,{method:m,headers:{'Content-Type':ct,...(c?{Cookie:c}:{}),...(raw?{'X-File-Name':raw}:{})},body:b===undefined?undefined:(raw?b:JSON.stringify(b))});const sc=r.headers.getSetCookie().map(x=>x.split(';')[0]).filter(x=>!x.endsWith('='));let j=null;try{j=await r.json();}catch{}return {s:r.status,j,c:sc[0]};}
let A = (await call('POST', '/admin/setup', { token: SETUP_TOKEN, name: 'Ada Admin', email: EMAIL, password: PASSWORD })).c;
if (!A) A = (await call('POST', '/admin/login', { email: EMAIL, password: PASSWORD })).c;
if (!A) { console.error('Could not sign in. If an admin already exists, run: npm run sample-data -- <admin email> <admin password>'); process.exit(1); }
for (const [n,e,r] of [['Eddie Editor','editor','editor'],['Sam Sales','sales','sales'],['Rita Recruiter','recruiter','recruiter'],['Vik Viewer','viewer','viewer'],['Paul Partners','partners','partners']]) await call('POST','/admin/users',{name:n,email:e+'@example.com',password:'teampass123',role:r},A);
const lead=(k,b)=>call('POST','/leads/'+k,b);
for (const [fn,ln,co,pr] of [['Priya','Nair','Kestrel Supplies','Match supplier invoices to POs in SAP'],['Omar','Haddad','Gulf Freight','Update carrier tracking every hour'],['Anita','Rao','Sunrise Insurance','Process claims arriving by email'],['Daniel','Mehta','Northwind Retail','Order to cash for 3 marketplaces']]) await lead('demo',{fn,ln,em:fn.toLowerCase()+'@example.com',co,ph:'+91 98450 00000',jt:'Finance Manager',pr});
for (const [pn,pc] of [['Rahul Shah','Bluewave Consulting'],['Sara Al-Kuwari','Doha Digital']]) await lead('partner',{pn,pc,pe:pn==='Sara Al-Kuwari'?'partner@example.com':pn.split(' ')[0].toLowerCase()+'@example.com',pk:'India',pt:'Implementation partner',pm:'We implement finance automation for mid-size companies.'});
for (const [cn,crole] of [['Meera Iyer','Full-stack Developer'],['Arjun Das','AI Engineer'],['Fatima Noor','Solution Consultant']]) await lead('career',{cn,ce:cn.split(' ')[0].toLowerCase()+'@example.com',crole,cmsg:'I would love to join.'});
for (const nl of ['ravi@example.com','lina@example.com','tom@example.com']) await lead('newsletter',{nl});
const leads=(await call('GET','/admin/leads',undefined,A)).j.items;
const demo=leads.filter(l=>l.kind==='demo'), part=leads.filter(l=>l.kind==='partner');
await call('POST',`/admin/records/${demo[0].id}/stage`,{stage:'contacted',note:'Called Priya; demo booked for Thursday.'},A);
await call('POST',`/admin/records/${demo[0].id}/assign`,{owner:'Sam Sales',follow:'2026-11-05'},A);
await call('POST',`/admin/records/${demo[1].id}/note`,{note:'Asked for a quote for 3 Runners.'},A);
await ((await call('POST',`/admin/records/${part.find(l=>l.payload.pn==='Sara Al-Kuwari').id}/stage`,{stage:'approved',partnerType:'Implementation partner'},A)).s);
for (const [f,l,e,plan] of [['Kavya','Menon','customer@example.com','starter'],['John','Mathew','trial@example.com','community']]) {
  const c=(await call('POST','/auth/register',{firstName:f,lastName:l,email:e,company:f==='Kavya'?'Acme Ltd':'Globex',country:'IN',plan,password:'customer123',acceptTerms:true})).c;
  if (f==='Kavya') await call('POST','/auth/plan-request',{plan:'enterprise',note:'We need SSO and more Runners.'},c);
}
await call('POST','/requests/community',{name:'Nikhil Joshi',email:'nikhil@example.com',company:'Zeta',message:'Building agents for our AP team.'});
const logo=(await call('POST','/admin/media/upload',Buffer.from(LOGO_PNG, 'base64'),A,'image/png','acme-logo.png')).j;
await call('PATCH',`/admin/media/${logo.id}`,{alt:'Acme logo'},A);
await call('POST','/admin/media/upload',Buffer.from(LOGO_PNG, 'base64'),A,'image/png','runner-dashboard.png');
const pdf=(await call('POST','/admin/media/upload',Buffer.from('%PDF-1.4\n%sample\n'),A,'application/pdf','ap-automation-playbook.pdf')).j;
async function item(type,title,data,meta={}){const c=(await call('POST','/admin/library',{type,title},A)).j;const g=(await call('GET',`/admin/library/${c.id}`,undefined,A)).j;return (await call('PUT',`/admin/library/${c.id}`,{data:{...g.data,...data},meta:{status:'published',access:'public',...meta},version:g.version},A)).j;}
await item('troubleshoot','Runner shows Access is denied',{symptom:'Runner shows Access is denied',error:'Error 0x80070005: Access is denied.',product:'runner',versions:'4.2 to 4.5',cause:'The installer ran without administrator rights.',resolution:'1. Close the Runner.\n2. Run **OneRunnerSetup.exe** as administrator.\n3. Start the Runner again.',code:'KB-1042'});
await item('release','4.6',{version:'4.6',date:'2026-10-15',whatsNew:'- Schedules can run every minute.\n- New Excel actions.',fixed:'- Runner reconnects after network drops.'});
await item('post','Five lessons from automating invoices',{title:'Five lessons from automating invoices',kind:'Blog post',summary:'What we learned taking AP automation live.',author:'Priya Rao',date:'2026-10-20',body:'## Start with the exceptions\nMost time goes into the 10% that don’t match.',url:''});
await item('post','The AP automation playbook',{title:'The AP automation playbook',kind:'E-book',summary:'A 20-page guide.',file:pdf.path,gated:true,url:''});
await item('event','Agent Builder Live',{title:'Agent Builder Live',kind:'Webinar',date:'2026-12-03',time:'3:00 pm',tz:'Asia/Qatar',place:'Online',summary:'Build an agent with us, live.',details:'### Agenda\n1. Intro\n2. Live build\n3. Questions',url:'',cta:''});
await item('article','Draft: connect to SAP',{category:'how-to',product:'runner',summary:'Connect a Runner to SAP.',body:'Coming soon.',points:[],chapter:'',meta:'',featured:false},{status:'draft',owner:'Docs team',reviewBy:'2026-10-01'});
await call('POST','/leads/download',{dn:'Raj Kumar',de:'raj@example.com',dc:'Acme',dfile:'the-ap-automation-playbook'});
await call('POST','/items/article/runner-setup/feedback',{helpful:false,note:'Missing the proxy step.'});
await call('POST','/items/article/runner-setup/feedback',{helpful:true});
const r=await fetch(B+'/admin/catalog/import',{method:'POST',headers:{'Content-Type':'application/json',Cookie:A},body:readFileSync('docs/sample-action-catalog.json')}); 
const st=JSON.parse(readFileSync('src/cms/defaults.generated.json','utf8'))['customers.stories'].map((s,i)=>i===0?{...s,logo:logo.path}:s);
await call('PUT','/admin/content/customers.stories',{value:st},A);
await call('PUT','/admin/settings',{contentApproval:true},A);
const E=(await call('POST','/admin/login',{email:'editor@example.com',password:'teampass123'})).c;
const faq=JSON.parse(readFileSync('src/cms/defaults.generated.json','utf8'))['pricing.faq'];
const cur=(await call('GET','/admin/content/pricing.faq',undefined,E)).j;
await ((await call('PUT','/admin/content/pricing.faq',{value:[{...faq[0],a:'Yes. Every paid plan starts with a 14-day free trial.'},...faq.slice(1),{q:'Do you offer nonprofit discounts?',a:'Yes, ask our sales team.'}],baseUpdatedAt:cur.updatedAt},E)).j?.pending);
await call('PUT','/admin/content/site.redirects',{value:[{from:'/old-pricing',to:'/pricing',permanent:true}]},A);
// Local database only: make the sample partner and customer logins usable straight away. Locally no emails are
// sent, so the partner's invitation link and the customer's verification link can't be opened.
try {
  const { pbkdf2Sync, randomBytes } = await import('node:crypto');
  const mysql = (await import('mysql2/promise')).default;
  const b64u = (b) => Buffer.from(b).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const hash = (pw) => { const salt = randomBytes(16); return `pbkdf2_sha256$100000$${b64u(salt)}$${b64u(pbkdf2Sync(pw, salt, 100000, 32, 'sha256'))}`; };
  const db = await mysql.createConnection({ host: env.DB_HOST || process.env.DB_HOST || '127.0.0.1', port: Number(env.DB_PORT || process.env.DB_PORT || 3306), user: env.DB_USER || process.env.DB_USER, password: env.DB_PASSWORD || process.env.DB_PASSWORD, database: env.DB_NAME || process.env.DB_NAME });
  await db.query('UPDATE partner_users SET password_hash = ? WHERE email = ?', [hash('partnerpass1'), 'partner@example.com']);
  await db.query("UPDATE partner_orgs SET status = 'active' WHERE id = (SELECT org_id FROM partner_users WHERE email = ?)", ['partner@example.com']);
  const [rows] = await db.query('SELECT id FROM customers WHERE email = ?', ['customer@example.com']);
  if (rows[0]) await db.query('INSERT IGNORE INTO customer_verified (customer_id, email, verified_at) VALUES (?, ?, ?)', [rows[0].id, 'customer@example.com', new Date().toISOString()]);
  await db.end();
} catch (err) { console.log(`(Couldn't finish the partner and customer logins: ${err.code || err.message}. The team logins work.)`); }

console.log(`
Sample data added. Logins for ${BASE}  (also in SAMPLE-LOGINS.md)

  Admin area (${BASE}/admin)
    Admin             ${EMAIL.padEnd(26)} ${PASSWORD}
    Editor            editor@example.com         teampass123
    Sales             sales@example.com          teampass123
    Partner manager   partners@example.com       teampass123
    Recruiter         recruiter@example.com      teampass123
    Viewer            viewer@example.com         teampass123

  Website accounts
    Customer          customer@example.com       customer123   (${BASE}/signin)
    Trial customer    trial@example.com          customer123   (not verified yet)
    Partner portal    partner@example.com        partnerpass1  (${BASE}/partner/login)
`);
