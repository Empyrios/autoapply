export const STORAGE_KEY = 'empyrios-jobpilot-v1';
export const STATUSES = Object.freeze(['saved','applied','interview','offer','rejected','withdrawn']);
export const MODES = Object.freeze(['onsite','hybrid','remote','unknown']);
export const CONTRACTS = Object.freeze(['permanent','fixed-term','contract','temporary','unknown']);
export const STATUS_LABELS = Object.freeze({saved:'Saved',applied:'Applied',interview:'Interviewing',offer:'Offer',rejected:'Rejected',withdrawn:'Withdrawn'});
export const today = () => {const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
export const id = () => typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function' ? crypto.randomUUID().replace(/-/g,'') : 'j'+Date.now().toString(36)+Math.random().toString(36).slice(2,12);
const clean=(x,max=200)=>typeof x==='string'?x.trim().slice(0,max):'';
const isId=x=>typeof x==='string'&&/^[a-zA-Z0-9_-]{1,90}$/.test(x);
const uniqueText=(value,maxItems=30,maxLen=80)=>Array.isArray(value)?[...new Set(value.map(x=>clean(x,maxLen)).filter(Boolean))].slice(0,maxItems):[];
export function validDate(value){if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;const d=new Date(`${value}T12:00:00Z`);return !Number.isNaN(d.getTime())&&d.toISOString().slice(0,10)===value}
export function validTime(value){return typeof value==='string'&&/^([01]\d|2[0-3]):[0-5]\d$/.test(value)}
export function safeUrl(value){if(!value)return '';try{const u=new URL(value);return ['https:','http:'].includes(u.protocol)&&!u.username&&!u.password&&u.hostname?u.toString():''}catch{return ''}}
export const initial=()=>({schema:1,profile:{targetSalary:32000,locations:[],skills:[],modes:['hybrid','remote'],contracts:['permanent']},jobs:[],tasks:[]});
const salary=n=>{const v=Number(n);return Number.isFinite(v)&&v>=0&&v<=1000000?Math.round(v):0};
export function validateState(data){
  if(!data||data.schema!==1||typeof data!=='object'||!data.profile||typeof data.profile!=='object'||!Array.isArray(data.jobs)||!Array.isArray(data.tasks))throw new Error('Unsupported or invalid backup format');
  const p=data.profile;
  const profile={targetSalary:salary(p.targetSalary),locations:uniqueText(p.locations,20,60),skills:uniqueText(p.skills,30,60),modes:uniqueText(p.modes,4,20).filter(x=>MODES.includes(x)&&x!=='unknown'),contracts:uniqueText(p.contracts,4,20).filter(x=>CONTRACTS.includes(x)&&x!=='unknown')};
  if(data.jobs.length>500||data.tasks.length>1500)throw new Error('Backup exceeds item limit');
  const seen=new Set();
  const jobs=data.jobs.map(x=>{
    if(!x||typeof x!=='object'||!isId(x.id)||seen.has(x.id))throw new Error('Invalid or duplicate job ID');seen.add(x.id);
    const role=clean(x.role,130),company=clean(x.company,120);
    if(!role||!company)throw new Error('Job title and employer are required');
    const url=clean(x.url,1000);if(url&&!safeUrl(url))throw new Error('Invalid job URL');
    const salaryMin=salary(x.salaryMin),salaryMax=salary(x.salaryMax);
    if(salaryMax&&salaryMin&&salaryMax<salaryMin)throw new Error('Maximum salary cannot be below minimum salary');
    return {id:x.id,role,company,location:clean(x.location,150),mode:MODES.includes(x.mode)?x.mode:'unknown',contract:CONTRACTS.includes(x.contract)?x.contract:'unknown',salaryMin,salaryMax,url:url?safeUrl(url):'',source:clean(x.source,100),description:clean(x.description,6000),notes:clean(x.notes,6000),status:STATUSES.includes(x.status)?x.status:'saved',created:validDate(x.created)?x.created:today(),deadline:validDate(x.deadline)?x.deadline:'',interviewDate:validDate(x.interviewDate)?x.interviewDate:'',interviewTime:validTime(x.interviewTime)?x.interviewTime:'',interviewNotes:clean(x.interviewNotes,1800)};
  });
  const taskSeen=new Set();const tasks=data.tasks.map(x=>{
    if(!x||typeof x!=='object'||!isId(x.id)||taskSeen.has(x.id)||!seen.has(x.jobId))throw new Error('Invalid, duplicate or orphaned task');taskSeen.add(x.id);
    const title=clean(x.title,160);if(!title)throw new Error('Task title required');
    return {id:x.id,jobId:x.jobId,title,due:validDate(x.due)?x.due:'',done:x.done===true};
  });
  return {schema:1,profile,jobs,tasks};
}
export function scoreJob(job,profile){
  const checks=[];let earned=0,known=0;
  function add(label,weight,available,ratio,detail){const outcome=available?Math.max(0,Math.min(1,ratio)):null;checks.push({label,weight,available,ratio:outcome,detail});if(available){known+=weight;earned+=outcome*weight}}
  const skills=profile.skills||[];
  const text=`${job.role} ${job.description}`.toLocaleLowerCase('en-GB');
  const matches=skills.filter(s=>text.includes(s.toLocaleLowerCase('en-GB')));
  add('Skill overlap',40,skills.length>0&&Boolean(text.trim()),skills.length?matches.length/skills.length:0,matches.length?matches.join(', '):'No listed skills found');
  const target=Number(profile.targetSalary)||0;const min=Number(job.salaryMin)||0,max=Number(job.salaryMax)||0;
  const value=min||max;
  add('Salary',25,target>0&&(min>0||max>0),min>=target?1:max&&max<target?0:!max&&min<target?0.5:Math.min(1,Math.max(0,(max-target)/(Math.max(1,max-min)))),min||max?`${min?'£'+min.toLocaleString('en-GB'):'Not given'}${max?' to £'+max.toLocaleString('en-GB'):''}`:'Not listed');
  const locations=profile.locations||[];
  const region=(job.location||'').toLocaleLowerCase('en-GB');
  const regionMatch=locations.some(l=>region.includes(l.toLocaleLowerCase('en-GB')));
  add('Location',15,locations.length>0&&Boolean(region),regionMatch?1:0,regionMatch?'Preferred location':'Location mismatch');
  const modes=profile.modes||[];
  add('Work arrangement',10,modes.length>0&&job.mode!=='unknown',modes.includes(job.mode)?1:0,job.mode==='unknown'?'Not stated':job.mode);
  const contracts=profile.contracts||[];
  add('Employment type',10,contracts.length>0&&job.contract!=='unknown',contracts.includes(job.contract)?1:0,job.contract==='unknown'?'Not stated':job.contract);
  return {score:known?Math.round(earned/known*100):null,coverage:known,checks,matches};
}
export function metrics(state,reference=today()){
  const counts=Object.fromEntries(STATUSES.map(s=>[s,state.jobs.filter(j=>j.status===s).length]));
  const upcoming=state.tasks.filter(t=>!t.done&&t.due&&t.due<=reference).length;
  const interviews=state.jobs.filter(j=>j.status==='interview').length;
  return {...counts,total:state.jobs.length,pendingTasks:state.tasks.filter(t=>!t.done).length,overdueTasks:upcoming,interviews};
}
export function rankedJobs(state,filter='all',query=''){
  const q=String(query).trim().toLocaleLowerCase('en-GB');
  return state.jobs.filter(j=>(filter==='all'||j.status===filter)&&(!q||[j.role,j.company,j.location,j.description,j.notes].join(' ').toLocaleLowerCase('en-GB').includes(q)))
    .map(j=>({...j,fit:scoreJob(j,state.profile)}))
    .sort((a,b)=>(b.fit.score??-1)-(a.fit.score??-1)||b.created.localeCompare(a.created));
}
export function exportCsv(state){
  const quote=x=>{let v=String(x??'');if(/^[=+@\-\t\r\n]/.test(v))v="'"+v;return '"'+v.replace(/"/g,'""')+'"'};
  const headers=['Role','Company','Location','Salary min GBP','Salary max GBP','Work mode','Contract','Status','Added','Deadline','URL','Notes'];
  const rows=state.jobs.map(j=>[j.role,j.company,j.location,j.salaryMin||'',j.salaryMax||'',j.mode,j.contract,j.status,j.created,j.deadline,j.url,j.notes]);
  return [headers,...rows].map(row=>row.map(quote).join(',')).join('\r\n')+'\r\n';
}
export function sampleState(){const s=initial();s.profile={targetSalary:32000,locations:['Cambridge','Kent','Essex','London'],skills:['project management','stakeholder management','learning management systems','data analysis'],modes:['hybrid','remote'],contracts:['permanent']};s.jobs=[
{id:'sample_a',role:'Project Coordinator',company:'Example Tech Ltd',location:'Cambridge',mode:'hybrid',contract:'permanent',salaryMin:35000,salaryMax:40000,url:'',source:'Example listing',description:'Project management and stakeholder management for digital systems.',notes:'Ask about learning and development opportunities.',status:'saved',created:'2026-10-31',deadline:'',interviewDate:'',interviewTime:'',interviewNotes:''},
{id:'sample_b',role:'Learning Operations Lead',company:'Demo Learning Group',location:'London',mode:'remote',contract:'permanent',salaryMin:38000,salaryMax:45000,url:'',source:'Example listing',description:'Learning management systems, data analysis and operational improvements.',notes:'Prepare STAR examples.',status:'interview',created:'2026-10-29',deadline:'',interviewDate:'2026-11-08',interviewTime:'14:00',interviewNotes:'Video call; prepare a process improvement story.'},
{id:'sample_c',role:'Junior Programme Officer',company:'Sample Organisation',location:'Oxford',mode:'onsite',contract:'fixed-term',salaryMin:26000,salaryMax:29000,url:'',source:'Example listing',description:'Programme support.',notes:'',status:'applied',created:'2026-10-27',deadline:'',interviewDate:'',interviewTime:'',interviewNotes:''}
];s.tasks=[{id:'sample_task',jobId:'sample_b',title:'Prepare STAR interview examples',due:'2026-11-07',done:false}];return validateState(s)}
