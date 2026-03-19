import { useState, useMemo, useEffect } from "react";
import { supabase } from "./supabase";


// ═══════════════════════ 상수 ═══════════════════════

const CLIMATE = [
{ id:"north",  label:"북부/한랭지역", desc:"강원 내륙·철원 (-15℃)", heatW:300, srcT:5  },
{ id:"central",label:"중부",        desc:"서울·경기·충청 (-10℃)", heatW:230, srcT:10 },
{ id:"south",  label:"남부/제주",   desc:"부산·광주·제주 (-5℃)",  heatW:200, srcT:15 },
];

const WSRC = [
{ id:"tap",    label:"상수도", getT: c => c.srcT },
{ id:"ground", label:"지하수", getT: () => 16    },
];

const BIZ = [
{ id:"bath",    label:"목욕/사우나",  defEquip:["tang","shower"],   addEquip:["bathtub","pool"],      defCirc:"sauna",   opH:12, defSimCoef:0.8, defUtil:70 },
{ id:"hotel",   label:"숙박업소",     defEquip:["bathtub","shower"], addEquip:["tang","pool"],         defCirc:"hotel",   opH:16, defSimCoef:0.7, defUtil:60 },
{ id:"pool",    label:"수영장",       defEquip:["pool","shower"],    addEquip:["tang","bathtub"],      defCirc:"pension", opH:14, defSimCoef:0.8, defUtil:80 },
{ id:"hospital",label:"병원/요양원",  defEquip:["hospital","shower"],addEquip:["tang","bathtub"],      defCirc:"hospital",opH:20, defSimCoef:0.9, defUtil:90 },
];

const EQUIP_DEFS = {
tang:     { label:"탕",                       subtypes:["replace","no_replace"] },
bathtub:  { label:"욕조",                     subtypes:null },
shower:   { label:"샤워",                     subtypes:null },
pool:     { label:"수영장/온수풀",             subtypes:["replace","no_replace"] },
hospital: { label:"병원/요양 목욕",           subtypes:null },
};

const TANK_TYPES = [
{ id:"1", label:"① 난방 직접 순환형", tankDT:15, hpTemp:55, available:true,  note:"난방 전용 현장" },
{ id:"2", label:"② 내부 코일형",     tankDT:15, hpTemp:60, available:true,  note:"급탕 전용 또는 난방+급탕 겸용" },
{ id:"3", label:"③ 외부 열교환기형", tankDT:15, hpTemp:60, available:true,  note:"급탕 전용 또는 난방+급탕" },
{ id:"4", label:"④ 급탕 직접저장형", tankDT:15, hpTemp:60, available:true,  note:"축열조 물 = 급탕수, 순환 없음" },
{ id:"0", label:"⑤ 축열조 없음",     tankDT:0,  hpTemp:60, available:true,  note:"축열조 없는 현장" },
];

const CIRC_TYPES = [
{ id:"none",     label:"순환배관 없음",      coef:1.0 },
{ id:"small",    label:"일반 주택·소형상가", coef:1.1 },
{ id:"pension",  label:"펜션·풀빌라",        coef:1.2 },
{ id:"hotel",    label:"호텔·리조트",        coef:1.3 },
{ id:"hospital", label:"병원·요양시설",      coef:1.35 },
{ id:"sauna",    label:"사우나·목욕탕",      coef:1.4 },
];

const HP_MAKERS = [
{ id:"lg",      label:"LG전자",    available:true  },
{ id:"otec",    label:"오텍캐리어",available:true  },
{ id:"samsung", label:"삼성전자",  available:false, note:"데이터 미확보" },
];
const HP_MODELS = [
{ id:"lg16",   maker:"lg",   label:"16kW",   kw:16,   cop:3.72, maxPower:6.93  },
{ id:"lg25",   maker:"lg",   label:"25kW",   kw:25,   cop:2.53, maxPower:13.1  },
{ id:"lg35",   maker:"lg",   label:"35kW",   kw:35,   cop:2.40, maxPower:21    },
{ id:"ot16",   maker:"otec", label:"16.5kW", kw:16.5, cop:2.97, maxPower:9     },
{ id:"ot25",   maker:"otec", label:"25kW",   kw:25,   cop:2.40, maxPower:14.5  },
{ id:"ot35",   maker:"otec", label:"35kW",   kw:35,   cop:2.40, maxPower:21    },
];

const COP_WEIGHTS = [
{ v:"1.0", label:"공격적 (×1.0)" },
{ v:"0.9", label:"표준 (×0.9)"   },
{ v:"0.8", label:"보수적 (×0.8)" },
{ v:"0.7", label:"최보수 (×0.7)" },
];

const MEMBERS = ["군산","그린","자비스","데미안","동하","엠마"];
const STATUS_LIST = [
{ id:"active",     label:"대응 중",  color:"#2E7A4A", bg:"#E8F2EC", border:"#A0C8AC" },
{ id:"site",       label:"현장실사", color:"#D97706", bg:"#FFFBEB", border:"#FDE68A" },
{ id:"proposed",   label:"제안완료", color:"#1A7A7A", bg:"#F0FAFA", border:"#A0D4D4" },
{ id:"contracted", label:"계약완료", color:"#006600", bg:"#E8F8EE", border:"#A0C8AC" },
{ id:"hold",       label:"대응보류", color:"#6B7280", bg:"#F3F4F6", border:"#D1D5DB" },
{ id:"go",         label:"Go",      color:"#006600", bg:"#E8F8EE", border:"#A0C8AC" },
{ id:"drop",       label:"Drop",    color:"#DC2626", bg:"#FEF2F2", border:"#FECACA" },
];

const SIDO_GU_RAW = {
"서울":["종로구","중구","용산구","성동구","광진구","동대문구","중랑구","성북구","강북구","도봉구","노원구","은평구","서대문구","마포구","양천구","강서구","구로구","금천구","영등포구","동작구","관악구","서초구","강남구","송파구","강동구"],
"경기":["수원시","성남시","고양시","용인시","부천시","안산시","안양시","남양주시","화성시","평택시","의정부시","시흥시","파주시","광명시","김포시","군포시","광주시","이천시","양주시","오산시","구리시","안성시","포천시","의왕시","하남시","여주시","양평군","동두천시","과천시","가평군","연천군"],
"강원":["춘천시","원주시","강릉시","동해시","태백시","속초시","삼척시","홍천군","횡성군","영월군","평창군","정선군","철원군","화천군","양구군","인제군","고성군","양양군"],
"충북":["청주시","충주시","제천시","보은군","옥천군","영동군","증평군","진천군","괴산군","음성군","단양군"],
"충남":["천안시","공주시","보령시","아산시","서산시","논산시","계룡시","당진시","금산군","부여군","서천군","청양군","홍성군","예산군","태안군"],
"전북":["전주시","군산시","익산시","정읍시","남원시","김제시","완주군","진안군","무주군","장수군","임실군","순창군","고창군","부안군"],
"전남":["목포시","여수시","순천시","나주시","광양시","담양군","곡성군","구례군","고흥군","보성군","화순군","장흥군","강진군","해남군","영암군","무안군","함평군","영광군","장성군","완도군","진도군","신안군"],
"경북":["포항시","경주시","김천시","안동시","구미시","영주시","영천시","상주시","문경시","경산시","군위군","의성군","청송군","영양군","영덕군","청도군","고령군","성주군","칠곡군","예천군","봉화군","울진군","울릉군"],
"경남":["창원시","진주시","통영시","사천시","김해시","밀양시","거제시","양산시","의령군","함안군","창녕군","고성군","남해군","하동군","산청군","함양군","거창군","합천군"],
"인천":["중구","동구","미추홀구","연수구","남동구","부평구","계양구","서구","강화군","옹진군"],
"대구":["중구","동구","서구","남구","북구","수성구","달서구","달성군"],
"광주":["동구","서구","남구","북구","광산구"],
"대전":["동구","중구","서구","유성구","대덕구"],
"울산":["중구","남구","동구","북구","울주군"],
"부산":["중구","서구","동구","영도구","부산진구","동래구","남구","북구","해운대구","사하구","금정구","강서구","연제구","수영구","사상구","기장군"],
"세종":["세종시"],"제주":["제주시","서귀포시"],
};
const SIDO_GU = Object.fromEntries(Object.entries(SIDO_GU_RAW).map(([s,gs])=>[s,[...gs].sort((a,b)=>a.localeCompare(b,"ko"))]));

// ═══════════════════════ 유틸 ═══════════════════════
const fmt=(n,d=1)=>{if(n==null||isNaN(n))return"—";const f=Number(n).toFixed(d);const[i,dc]=f.split(".");return i.replace(/\B(?=(\d{3})+(?!\d))/g,",")+( dc!==undefined?`.${dc}`:"");};
const fmt0=n=>fmt(n,0);
function evalExpr(s){if(!s||typeof s!=="string")return NaN;s=s.replace(/,/g,"").trim();if(!s)return NaN;if(!/^[\d\s+\-*/().]+$/.test(s))return NaN;try{const r=new Function(`"use strict";return(${s});`)();return typeof r==="number"&&isFinite(r)?r:NaN;}catch{return NaN;}}
function NI({v,s,ph,st,sfx,disabled}){
const[raw,setRaw]=useState(v||"");const[foc,setFoc]=useState(false);
useEffect(()=>{if(!foc)setRaw(v||"");},[v,foc]);
return(<span style={{display:"inline-flex",alignItems:"center",gap:3}}>
<input type="text" inputMode="decimal" disabled={disabled} value={foc?raw:(v||"")}
onChange={e=>{const val=e.target.value;setRaw(val);const ev=evalExpr(val);if(!isNaN(ev))s(String(ev));else s(val);}}
onFocus={()=>{setFoc(true);setRaw(v||"");}}
onBlur={()=>{setFoc(false);const ev=evalExpr(raw);if(!isNaN(ev)){setRaw(String(ev));s(String(ev));}}}
placeholder={ph} style={st}/>
{sfx&&<span style={{fontSize:12,color:"#718096",flexShrink:0}}>{sfx}</span>}
</span>);
}

const mkEquip=(type,subtype)=>({
id:Date.now()+"_"+Math.random().toString(36).slice(2,5),
type, subtype:subtype||null,
targetTemp:"42", count:"1",
volume:"5", freq:"1", tempDrop:"2",
volL:"200", freqDay:"1",
people:"", perPerson:"0.04", showerRooms:"", showerPpRoom:"2",
poolVol:"", cycleDays:"30", poolArea:"", poolLocation:"indoor",
beds:"", litPerPerson:"80", weeksFreq:"3",
});

function calcEquipHeat(eq, srcT, hpt){
const dT=t=>Math.max(0,(parseFloat(t)||42)-srcT);
switch(eq.type){
case "tang":
if(eq.subtype==="replace")
return (parseFloat(eq.volume)||0)*(parseFloat(eq.freq)||1)*(parseFloat(eq.count)||1)*1.163*dT(eq.targetTemp);
else
return (parseFloat(eq.volume)||0)*(parseFloat(eq.tempDrop)||2)*1.163;
case "bathtub":
return ((parseFloat(eq.volL)||300)/1000)*(parseFloat(eq.freqDay)||1)*(parseFloat(eq.count)||1)*1.163*dT(eq.targetTemp);
case "shower":
return (parseFloat(eq.people)||0)*(parseFloat(eq.perPerson)||0.05)*1.163*dT(eq.targetTemp);
case "pool": {
const area=parseFloat(eq.poolArea)||0;
const radCoef=eq.poolLocation==="outdoor"?10.0:6.0;
const dailyRad=area*radCoef;
if(eq.subtype==="replace"){
  const replaceHeat=(parseFloat(eq.poolVol)||0)/(parseFloat(eq.cycleDays)||30)*1.163*dT(eq.targetTemp);
  return replaceHeat+dailyRad;
} else {
  return dailyRad;
}
}
case "hospital":
return (parseFloat(eq.beds)||0)*((parseFloat(eq.weeksFreq)||3)/7)*(parseFloat(eq.litPerPerson)||80)/1000*1.163*dT(eq.targetTemp);
default: return 0;
}
}

function getEquipPeak(eq, opH){
switch(eq.type){
case "tang":
if(eq.subtype==="replace"){
const v=parseFloat(eq.volume)||0;
const cnt=parseFloat(eq.count)||1;
return { ratio:1.0, peakH: v*cnt<10?2:4 };
} else return { ratio:1.0, peakH:opH };
case "bathtub": return { ratio:0.5, peakH:2 };
case "shower":  return { ratio:0.5, peakH:2 };
case "pool":
if(eq.subtype==="replace"){
const v=parseFloat(eq.poolVol)||0;
return { ratio:1.0, peakH: v<10?2:4 };
} else return { ratio:1.0, peakH:opH };
case "hospital": return { ratio:0.3, peakH:3 };
default: return { ratio:0.5, peakH:2 };
}
}

// ═══════════════════════ 메인 ═══════════════════════
export default function App(){
const[dark,setDark]=useState(false);
const[tab,setTab]=useState("status");
const[loading,setLoading]=useState(true);
const[user,setUser]=useState(null);
const[authLoading,setAuthLoading]=useState(true);
const[history,setHistory]=useState([]);
const[histSearch,setHistSearch]=useState("");
const[histEditor,setHistEditor]=useState("");
const[histDateFrom,setHistDateFrom]=useState("");
const[histDateTo,setHistDateTo]=useState("");
const[histPage,setHistPage]=useState(1);
const HIST_PER_PAGE=30;
const[members,setMembers]=useState([]);
const[projects,setProjects]=useState([]);
const[activePid,setActivePid]=useState(null);

const EMPTY_FORM={name:"",status:"active",sido:"",sigungu:"",manager:"",distributor:"",installer:"",memo:""};
const[spForm,setSpForm]=useState(EMPTY_FORM);
const[spEditId,setSpEditId]=useState(null);
const[spFilter,setSpFilter]=useState("all");
const[spSearch,setSpSearch]=useState("");
const[spFMgr,setSpFMgr]=useState("");
const[spFSido,setSpFSido]=useState("");
const[spFDist,setSpFDist]=useState("");
const[spFInst,setSpFInst]=useState("");

const[calcMode,setCalcMode]=useState("both");
const[bizId,setBizId]=useState("");
const[climId,setClimId]=useState("central");
const[wsrcId,setWsrcId]=useState("tap");
const[customSrcT,setCustomSrcT]=useState("");
const[opHRaw,setOpHRaw]=useState("12");
const[utilRate,setUtilRate]=useState("100");
const[equipList,setEquipList]=useState([]);
const[heatArea,setHeatArea]=useState("");
const[heatRoomCalc,setHeatRoomCalc]=useState([]);
const addHeatRoom=()=>setHeatRoomCalc(p=>[...p,{id:Date.now(),name:"",count:"",area:""}]);
const removeHeatRoom=id=>setHeatRoomCalc(p=>p.filter(r=>r.id!==id));
const updateHeatRoom=(id,f,v)=>setHeatRoomCalc(p=>p.map(r=>r.id===id?{...r,[f]:v}:r));
const applyHeatRooms=()=>{const total=heatRoomCalc.reduce((s,r)=>(parseFloat(r.count)||0)*(parseFloat(r.area)||0)+s,0);if(total>0)setHeatArea(String(Math.round(total)));};
const[heatRooms,setHeatRooms]=useState([]);
const[customHeatW,setCustomHeatW]=useState("");
const[simCoef,setSimCoef]=useState("1.0");
const[hpTempRaw,setHpTempRaw]=useState("55");
const[tankTypeId,setTankTypeId]=useState("3");
const[circTypeId,setCircTypeId]=useState("none");
const[makerId,setMakerId]=useState("lg");
// HP manual config (mixed models)
const[hpManual,setHpManual]=useState([]);
const addHpRow=()=>setHpManual(p=>[...p,{id:Date.now(),modelId:"",units:"1"}]);
const removeHpRow=id=>setHpManual(p=>p.filter(r=>r.id!==id));
const updateHpRow=(id,f,v)=>setHpManual(p=>p.map(r=>r.id===id?{...r,[f]:v}:r));
const[contractPower,setContractPower]=useState("");
const[maxDemand,setMaxDemand]=useState("");
const[existBoilerPower,setExistBoilerPower]=useState("");
const[copWeight,setCopWeight]=useState("0.9");
const[customTankDT,setCustomTankDT]=useState("");
const[existTank,setExistTank]=useState("");
const[newTankRaw,setNewTankRaw]=useState("");
const[tankSpace,setTankSpace]=useState("yes");
const[elecType,setElecType]=useState("general");
const[nightLoad,setNightLoad]=useState("hotwater");
const[nightContract,setNightContract]=useState("");
const[nightOpH,setNightOpH]=useState("8");
const[nightMakerId,setNightMakerId]=useState("lg");
const[nightModelId,setNightModelId]=useState("lg16");
const[fuelId,setFuelId]=useState("lpg");
const[fuelUnit,setFuelUnit]=useState("kg");
const[fuelMon,setFuelMon]=useState("");
const[fuelPrc,setFuelPrc]=useState("");
const[dayRate,setDayRate]=useState("120");
const[nightRate,setNightRate]=useState("56");
const[instCost,setInstCost]=useState("");
const[openDet,setOpenDet]=useState({});
const myName=user?.user_metadata?.full_name||user?.user_metadata?.name||(user?.email?.split("@")[0])||"";
const isAdmin=myName==="김대환";

// ─── 검증 탭 상태 ───
const[vBoilers,setVBoilers]=useState([]);
const mkBoiler=()=>({
  id:Date.now()+"_"+Math.random().toString(36).slice(2,5),
  name:"보일러 1",
  fuelType:"lng",        // lng, lpg, kerosene, electric
  purpose:"hotwater",    // hotwater, heating, hotwater_heating, pool
  capacity:"",           // kW 명판용량
  efficiency:"",         // % (빈값이면 기본값 적용)
  startYear:"2024",
  startMonth:"1",
  monthlyData:Array.from({length:12},(_,i)=>({month:i+1,usage:"",cost:""})),
});
const BOILER_FUELS=[
  {id:"lng",     label:"LNG(도시가스)", unit:"MJ",  heat:0.2778, defEff:95},
  {id:"lpg",     label:"LPG",          unit:"kg",  heat:12.8837, defEff:92},
  {id:"kerosene",label:"등유",          unit:"L",   heat:9.3838, defEff:85},
  {id:"electric",label:"전기보일러",    unit:"kWh", heat:1.0,   defEff:100},
];
const BOILER_PURPOSES=[
  {id:"hotwater",         label:"급탕 전용"},
  {id:"heating",          label:"난방 전용"},
  {id:"hotwater_heating", label:"급탕+난방"},
  {id:"pool",             label:"수영장/온수풀 전용"},
];

const addBoiler=()=>setVBoilers(p=>[...p,{...mkBoiler(),name:`보일러 ${p.length+1}`}]);
const removeBoiler=id=>setVBoilers(p=>p.filter(b=>b.id!==id));
const updateBoiler=(id,field,val)=>setVBoilers(p=>p.map(b=>b.id===id?{...b,[field]:val}:b));
const updateBoilerMonth=(boilerId,monthIdx,field,val)=>setVBoilers(p=>p.map(b=>{
  if(b.id!==boilerId)return b;
  const md=[...b.monthlyData];
  md[monthIdx]={...md[monthIdx],[field]:val};
  return{...b,monthlyData:md};
}));
const initMonths=(boilerId)=>{
  setVBoilers(p=>p.map(b=>{
    if(b.id!==boilerId)return b;
    const y=parseInt(b.startYear)||2024;
    const m=parseInt(b.startMonth)||1;
    const md=Array.from({length:12},(_,i)=>{
      const mo=((m-1+i)%12)+1;
      const yr=y+Math.floor((m-1+i)/12);
      return{year:yr,month:mo,usage:"",cost:"",contractKw:"",usageDays:""};
    }).reverse();
    return{...b,monthlyData:md};
  }));
};

// Storage
const fetchProjects=async()=>{
try{const{data,error}=await supabase.from("projects").select("*").order("updated_at",{ascending:false});if(!error&&data)setProjects(data.map(r=>({...r.data,id:r.id})));}catch{}
};
const fetchHistory=async()=>{
try{const{data,error}=await supabase.from("history").select("*").order("created_at",{ascending:false}).limit(300);if(!error&&data)setHistory(data);}catch{}
};
const fetchMembers=async()=>{
try{const{data,error}=await supabase.from("users").select("*").order("name");
if(!error&&data){
  const names=data.map(d=>d.name);
  const extra=[];
  if(!names.includes("이창섭"))extra.push({id:"manual_lcs",name:"이창섭",email:"",avatar_url:null});
  setMembers([...data,...extra]);
}
}catch{}
};
const upsertUser=async(u)=>{
if(!u)return;
const pid=u.user_metadata?.provider_id||u.id;
const name=u.user_metadata?.full_name||u.user_metadata?.name||(u.email?.split("@")[0])||"";
try{await supabase.from("users").upsert({id:pid,name,email:u.email,avatar_url:u.user_metadata?.avatar_url||null,last_seen:new Date().toISOString()});}catch{}
};
// Auth 초기화
useEffect(()=>{
const{data:{subscription}}=supabase.auth.onAuthStateChange(async(_,session)=>{setUser(session?.user??null);setAuthLoading(false);if(session?.user)upsertUser(session.user);});
supabase.auth.getSession().then(({data:{session}})=>{setUser(session?.user??null);setAuthLoading(false);if(session?.user)upsertUser(session.user);});
return()=>subscription.unsubscribe();
},[]);
// 로그인 후 데이터 로드
useEffect(()=>{if(!user){setLoading(false);return;}(async()=>{await fetchProjects();await fetchHistory();await fetchMembers();setLoading(false);})();const iv=setInterval(()=>{fetchProjects();fetchHistory();},30000);return()=>clearInterval(iv);},[user]);
const signInWithSlack=async()=>{await supabase.auth.signInWithOAuth({provider:'slack_oidc',options:{redirectTo:window.location.href,queryParams:{team:"T096A6RTGTG"}}});};
const signOut=async()=>{await supabase.auth.signOut();setProjects([]);setHistory([]);setMembers([]);};
const logHistory=async(projectId,projectName,action)=>{try{await supabase.from("history").insert({project_id:String(projectId),project_name:projectName,editor:myName,editor_avatar:user?.user_metadata?.avatar_url||null,action});}catch{}};
const saveOne=async(project)=>{
const editor=myName||"(미지정)";
const p={...project,lastEditor:editor};
try{await supabase.from("projects").upsert({id:p.id,data:p,updated_at:new Date().toISOString()});}catch{}
return p;
};

const clim=CLIMATE.find(c=>c.id===climId)||CLIMATE[1];
const wsrc=WSRC.find(w=>w.id===wsrcId)||WSRC[0];
const biz=BIZ.find(b=>b.id===bizId);
const tankType=TANK_TYPES.find(t=>t.id===tankTypeId)||TANK_TYPES[2];
const circType=CIRC_TYPES.find(c=>c.id===circTypeId)||CIRC_TYPES[0];
// auto: largest model of selected maker
const availMdls=HP_MODELS.filter(m=>m.maker===makerId).sort((a,b)=>b.kw-a.kw);
const hpModelLargest=availMdls[0]||null;
const nightModel=HP_MODELS.find(m=>m.id===nightModelId);

const nightAvailableModels=HP_MODELS.filter(m=>m.maker===nightMakerId);
const activeProj=projects.find(p=>p.id===activePid);

// ═══════════════════════ 통합 계산 ═══════════════════════
const R=useMemo(()=>{
const srcT=parseFloat(customSrcT)||wsrc.getT(clim);
const hpTemp=parseFloat(hpTempRaw)||tankType.hpTemp;
const dT=hpTemp-srcT;
const hpt=1.163*dT;
const hptTank=1.163*(parseFloat(customTankDT)||tankType.tankDT);
const opH=parseFloat(opHRaw)||12;
const heatW=parseFloat(customHeatW)||clim.heatW;
const sc=parseFloat(simCoef)||1.0;
const circCoef=circType.coef;
const copRaw=hpModelLargest?.cop||2.5;
const copWt=parseFloat(copWeight)||0.9;
const effCOP=copRaw*copWt;
const utilR=(parseFloat(utilRate)||100)/100;

let totalDailyHeat=0;
const equipDetails=[];
if(calcMode!=="heating"){
  equipList.forEach(eq=>{
    let dailyHeat=calcEquipHeat(eq,srcT,hpt);
    // 이용률 적용: 욕조, 샤워에만 (탕 교체·수영장·병원은 운영자 직접 결정 항목)
    if(eq.type==="bathtub"||eq.type==="shower") dailyHeat*=utilR;
    const{ratio,peakH:pH}=getEquipPeak(eq,opH);
    const peakLoad=pH>0?dailyHeat*ratio/pH:0;
    totalDailyHeat+=dailyHeat;
    equipDetails.push({...eq,dailyHeat,ratio,peakH:pH,peakLoad});
  });
}
const dailyHeatWithLoss=totalDailyHeat*circCoef;
const hwBaseLoad=opH>0?dailyHeatWithLoss/opH:0;
const hwPeakLoad=equipDetails.reduce((sum,eq)=>sum+eq.peakLoad*circCoef,0);
const totalRawPeak=equipDetails.reduce((s,eq)=>s+eq.peakLoad,0);
const repPeakH=totalRawPeak>0
  ?equipDetails.reduce((s,eq)=>s+eq.peakLoad*eq.peakH,0)/totalRawPeak
  :2;
const monthlyHwHeat=dailyHeatWithLoss*30;

let htLoad=0, monthlyHtHeat=0;
if(calcMode!=="hotwater"){
  const area=parseFloat(heatArea)||0;
  if(area>0){
    htLoad=area*heatW/1000;
    monthlyHtHeat=htLoad*opH*30;
  }
}
// 동시사용계수: 난방+급탕일 때만 전체 피크에 적용
const rawPeak=hwPeakLoad+htLoad;
const totalPeak=calcMode==="both"&&sc<1?rawPeak*sc:rawPeak;
const basicLoad=hwBaseLoad+htLoad*(calcMode==="both"?sc:1.0);
const totalMonthly=monthlyHwHeat+monthlyHtHeat;

const existT=parseFloat(existTank)||0;
const newT=parseFloat(newTankRaw)||0;
const enteredTank=existT+newT;

// 축열조: 최적값 먼저 계산 → 사용자 미입력시 자동 적용
const rechT0=Math.max(0,opH-repPeakH);
let tankOptCalc=0;
if(hptTank>0&&rechT0>0&&totalPeak>basicLoad){
  tankOptCalc=(totalPeak-basicLoad)/(hptTank*(1/repPeakH+1/rechT0));
}
const effTank=tankSpace==="no"?0:(enteredTank>0?enteredTank:(tankOptCalc>0?tankOptCalc:0));
const tankAutoApplied=tankSpace!=="no"&&enteredTank===0&&tankOptCalc>0;

let hpR=null;
if(totalPeak>0&&elecType==="general"){
  const condA=(hwBaseLoad*1.25)+(htLoad*(calcMode==="both"?sc:1.0));
  if(tankSpace==="no"){
    hpR={needed:totalPeak*1.1,condA,condB:null,condC:null,mode:"notank"};
  } else {
    const tankDR=hptTank>0?effTank*hptTank/repPeakH:0;
    const condB=Math.max(condA,totalPeak-tankDR);
    const tankUsed=Math.max(0,totalPeak-condB)*repPeakH;
    const rechT=Math.max(0,opH-repPeakH);
    const condC=rechT>0?Math.max(condB,basicLoad+tankUsed/rechT):condB*1.1;
    hpR={needed:Math.max(condA,condB,condC),condA,condB,condC,tankDR,tankUsed,rechT,mode:"general",effTank,tankAutoApplied};
  }
}

// ── HP 자동 추천 + 수동 구성 (일반전기) ──
let hpRec=null;
if(hpR&&hpR.needed>0){
  const models=HP_MODELS.filter(m=>m.maker===makerId).sort((a,b)=>b.kw-a.kw);
  if(models.length>0){
    // 자동 추천
    let bestM=null,bestU=999,bestW=Infinity;
    for(const m of models){const u=Math.ceil(hpR.needed/m.kw);const w=m.kw*u-hpR.needed;if(u<bestU||(u===bestU&&w<bestW)){bestM=m;bestU=u;bestW=w;}}
    const recModel=bestM||models[0];
    const recUnits=bestM?bestU:Math.ceil(hpR.needed/models[0].kw);

    // 수동 구성 확인
    const hasManual=hpManual.length>0&&hpManual.some(r=>r.modelId&&parseInt(r.units)>0);
    let rows,totalKw,totalMaxPower,totalUnits,wCop,isManual;

    if(hasManual){
      rows=hpManual.map(r=>{const m=HP_MODELS.find(x=>x.id===r.modelId);const u=parseInt(r.units)||0;return m&&u>0?{model:m,units:u,kw:m.kw*u,mp:m.maxPower*u}:null;}).filter(Boolean);
      totalKw=rows.reduce((s,r)=>s+r.kw,0);
      totalMaxPower=rows.reduce((s,r)=>s+r.mp,0);
      totalUnits=rows.reduce((s,r)=>s+r.units,0);
      wCop=totalKw>0?rows.reduce((s,r)=>s+r.model.cop*r.kw,0)/totalKw:recModel.cop;
      isManual=true;
    } else {
      rows=[{model:recModel,units:recUnits,kw:recModel.kw*recUnits,mp:recModel.maxPower*recUnits}];
      totalKw=recModel.kw*recUnits;
      totalMaxPower=recModel.maxPower*recUnits;
      totalUnits=recUnits;
      wCop=recModel.cop;
      isManual=false;
    }

    const cp=parseFloat(contractPower)||0;
    const md=parseFloat(maxDemand)||0;
    const ebp=parseFloat(existBoilerPower)||0;
    const spare=cp>0?(md>0?cp-md:0)+ebp:0;
    const augment=cp>0?Math.max(0,totalMaxPower-spare):totalMaxPower;
    const overTen=totalUnits>=10;

    hpRec={rows,totalKw,totalMaxPower,totalUnits,wCop,isManual,recModel,recUnits,
      contractPower:cp,maxDemand:md,existBoilerPower:ebp,spare,augment,noContract:cp===0,overTen};
  }
}

let tankMin=0, tankOpt=tankOptCalc>0?tankOptCalc:null, hpOpt=null;
if(hpR&&tankSpace==="yes"&&hptTank>0){
  tankMin=Math.max(0,(totalPeak-hpR.condA)*repPeakH/hptTank);
  if(rechT0>0&&totalPeak>basicLoad){
    hpOpt=basicLoad+(totalPeak-basicLoad)*repPeakH/opH;
  }
}

// ── COP 2-pass 보정: 추천/수동 모델의 가중평균 COP로 재산정 ──
let effCOP2=effCOP;
let copRaw2=copRaw;
if(hpRec&&hpRec.wCop){
  copRaw2=hpRec.wCop;
  effCOP2=copRaw2*copWt;
}

let nightR=null;
if(elecType==="night"){
  const nm=nightModel;
  if(nm){
    const nOpH=parseFloat(nightOpH)||8;
    const nContract=parseFloat(nightContract)||0;
    const maxUnits=nContract>0?Math.floor(nContract/nm.maxPower):1;
    const nightUnits=Math.max(1,maxUnits);
    const nightKwTotal=nm.kw*nightUnits;
    const dailyHwForNight=nightLoad==="heating"?0:dailyHeatWithLoss;
    const dailyHtForNight=nightLoad==="hotwater"?0:htLoad*opH;
    const dailyTotal=dailyHwForNight+dailyHtForNight;
    const nightDT=nightLoad==="hotwater"?25:nightLoad==="heating"?20:30;
    const nightHptTank=1.163*nightDT;
    const nightProduction=nightKwTotal*nOpH;
    const sufficient=nightProduction>=dailyTotal;
    const shortage=Math.max(0,dailyTotal-nightProduction);
    const nightTank=(sufficient?dailyTotal:nightProduction)/(nightHptTank>0?nightHptTank:1)*1.1;
    nightR={nm,nightUnits,nightKwTotal,nOpH,nContract,dailyTotal,nightProduction,sufficient,shortage,nightTank,nightDT,nightHptTank};
  }
}

const monthlyElec=totalMonthly>0?totalMonthly/effCOP2:0;
const elecCost=monthlyElec*(parseFloat(dayRate)||120);
const FUELS_HEAT={lpg:12.8837,lng:0.2778,kerosene:9.3838,electric:1.0};
const fuelHeat=FUELS_HEAT[fuelId]||10;
const curCost=(parseFloat(fuelMon)||0)*(parseFloat(fuelPrc)||0);
const savings=curCost-elecCost;
const payback=(parseFloat(instCost)>0&&savings>0)?(parseFloat(instCost)*10000)/(savings*12):null;

const _mx=hpR?.condA&&hpR?.condB&&hpR?.condC?Math.max(hpR.condA,hpR.condB,hpR.condC):0;
const _spread=_mx>0?((Math.max(hpR?.condA||0,hpR?.condB||0,hpR?.condC||0)-Math.min(hpR?.condA||0,hpR?.condB||0,hpR?.condC||0))/_mx*100):0;
const isBalanced=hpR?.mode==="general"&&_spread<5;
const isCDom=!isBalanced&&hpR?.mode==="general"&&hpR.condC!=null&&hpR.condC>=hpR.condB&&hpR.condC>=hpR.condA;
const isBDom=!isBalanced&&!isCDom&&hpR?.mode==="general"&&hpR.condB>hpR.condA;

// ── 급탕·수영장/온수풀 분리 열량 (검증용) ──
let dailyHwOnly=0, dailyPoolOnly=0;
if(calcMode!=="heating"){
  equipDetails.forEach(eq=>{
    if(eq.type==="pool") dailyPoolOnly+=eq.dailyHeat;
    else dailyHwOnly+=eq.dailyHeat;
  });
  dailyHwOnly*=circCoef;
  dailyPoolOnly*=circCoef;
}

return{srcT,hpTemp,dT:hpTemp-srcT,hpt,hptTank,opH,heatW,sc,circCoef,copRaw,copRaw2,copWt,effCOP,effCOP2,utilR,repPeakH,rawPeak,tankAutoApplied,tankOptCalc,
       hwBaseLoad,hwPeakLoad,dailyHeatWithLoss,monthlyHwHeat,equipDetails,
       htLoad,monthlyHtHeat,totalPeak,basicLoad,totalMonthly,
       existT,newT,enteredTank,tankMin,tankOpt,hpOpt,effTank,
       hpR,hpRec,isCDom,isBDom,isBalanced,nightR,tankAutoApplied,tankOptCalc,rawPeak,
       monthlyElec,elecCost,curCost,savings,payback,
       dailyHwOnly,dailyPoolOnly};
},[customSrcT,wsrc,clim,hpTempRaw,tankTypeId,customTankDT,circTypeId,opHRaw,bizId,customHeatW,simCoef,
calcMode,equipList,heatArea,utilRate,existTank,newTankRaw,tankSpace,
elecType,nightLoad,nightContract,nightOpH,nightModelId,nightMakerId,
makerId,copWeight,contractPower,maxDemand,existBoilerPower,hpManual,fuelId,fuelMon,fuelPrc,dayRate,nightRate,instCost]);

// ═══════════════════════ 검증 계산 ═══════════════════════
const vResults=useMemo(()=>{
  return vBoilers.map(b=>{
    const fuel=BOILER_FUELS.find(f=>f.id===b.fuelType);
    if(!fuel)return{boilerId:b.id,error:"연료 미선택"};
    const eff=(parseFloat(b.efficiency)||fuel.defEff)/100;
    const monthlyHeats=b.monthlyData.map(md=>{
      const usage=parseFloat(md.usage)||0;
      return usage*fuel.heat*eff;
    });
    // 월 라벨
    const monthLabels=b.monthlyData.map(md=>{
      if(md.year&&md.month) return `${md.year}.${String(md.month).padStart(2,"0")}`;
      return `${String(md.month).padStart(2,"0")}월`;
    });
    // 여름철 (6,7,8,9월) 평균 — 급탕+난방 분리용
    const summerMonths=b.monthlyData.map((md,i)=>({...md,heat:monthlyHeats[i]}))
      .filter(md=>{const m=parseInt(md.month);return m>=6&&m<=9;});
    const summerAvg=summerMonths.length>0?summerMonths.reduce((s,m)=>s+m.heat,0)/summerMonths.length:0;
    // 봄가을 (4,5,10,11월) — 참고용
    const springFallMonths=b.monthlyData.map((md,i)=>({...md,heat:monthlyHeats[i]}))
      .filter(md=>{const m=parseInt(md.month);return [4,5,10,11].includes(m);});
    const springFallAvg=springFallMonths.length>0?springFallMonths.reduce((s,m)=>s+m.heat,0)/springFallMonths.length:0;
    // 겨울 (12,1,2월) — 난방분 역산용
    const winterMonths=b.monthlyData.map((md,i)=>({...md,heat:monthlyHeats[i]}))
      .filter(md=>{const m=parseInt(md.month);return [12,1,2].includes(m);});
    const winterAvg=winterMonths.length>0?winterMonths.reduce((s,m)=>s+m.heat,0)/winterMonths.length:0;
    // 연평균
    const validMonths=monthlyHeats.filter(h=>h>0);
    const annualAvg=validMonths.length>0?validMonths.reduce((s,h)=>s+h,0)/validMonths.length:0;
    // 일일 열량 역산
    let dailyHeatFromFuel=0;
    let method="";
    let compTarget=""; // 비교 대상
    let calcDailyHeat=0; // 계산기 값
    let htDailyFromFuel=null; // 난방분 역산 (급탕+난방 겸용 시)
    let htCalcDaily=null; // 난방분 계산기 값
    let htDiff=null; // 난방분 차이율
    let htMethod=null; // 난방분 역산 방법

    if(b.purpose==="hotwater"){
      // 급탕 전용: 풀 포함 전체 급탕 열량과 비교
      dailyHeatFromFuel=annualAvg/30;
      method="연평균 ÷ 30일";
      compTarget="급탕(전체)";
      calcDailyHeat=R.dailyHwOnly+R.dailyPoolOnly;
    } else if(b.purpose==="pool"){
      // 수영장/온수풀 전용: 연평균 직접 사용
      dailyHeatFromFuel=annualAvg/30;
      method="연평균 ÷ 30일";
      compTarget="수영장/온수풀";
      calcDailyHeat=R.dailyPoolOnly;
    } else if(b.purpose==="hotwater_heating"){
      // 급탕+난방: 여름철 → 급탕분 (풀 포함)
      if(summerMonths.length>0){
        dailyHeatFromFuel=summerAvg/30;
        method="여름철(6~9월) 평균 ÷ 30일";
      } else {
        dailyHeatFromFuel=annualAvg/30;
        method="(여름 데이터 없음) 연평균 ÷ 30일";
      }
      compTarget="급탕(전체)";
      calcDailyHeat=R.dailyHwOnly+R.dailyPoolOnly;
      // 난방분 추가 비교: 겨울 평균 - 여름 평균
      if(winterMonths.length>0&&summerMonths.length>0&&R.monthlyHtHeat>0){
        htDailyFromFuel=(winterAvg-summerAvg)/30;
        htCalcDaily=R.monthlyHtHeat/30;
        htDiff=htCalcDaily>0?((htDailyFromFuel-htCalcDaily)/htCalcDaily*100):null;
        htMethod="(겨울 평균 - 여름 평균) ÷ 30일";
      }
    } else if(b.purpose==="heating"){
      // 난방 전용: 겨울(12~2월) 평균 vs 계산기 난방 월열량
      if(winterMonths.length>0){
        dailyHeatFromFuel=winterAvg/30;
        method="겨울(12~2월) 평균 ÷ 30일";
      } else {
        dailyHeatFromFuel=annualAvg/30;
        method="(겨울 데이터 없음) 연평균 ÷ 30일";
      }
      compTarget="난방";
      calcDailyHeat=R.monthlyHtHeat>0?R.monthlyHtHeat/30:0;
    }

    const diff=calcDailyHeat>0?((dailyHeatFromFuel-calcDailyHeat)/calcDailyHeat*100):null;

    return{
      boilerId:b.id,
      fuel,eff,
      monthlyHeats,monthLabels,
      summerAvg,springFallAvg,annualAvg,
      dailyHeatFromFuel,method,
      compTarget,calcDailyHeat,diff,
      winterAvg,htDailyFromFuel,htCalcDaily,htDiff,htMethod,
    };
  });
},[vBoilers,R]);

// CRUD
const saveSpProj=async()=>{if(!spForm.name.trim()){alert("프로젝트명 입력");return;}const isNew=!spEditId;const existing=spEditId?projects.find(x=>x.id===spEditId):null;const p={id:spEditId||Date.now().toString(),...spForm,name:spForm.name.trim(),updatedAt:new Date().toISOString(),calcData:existing?.calcData||null};const saved=await saveOne(p);setProjects(prev=>spEditId?prev.map(x=>x.id===spEditId?{...x,...saved}:x):[saved,...prev]);await logHistory(p.id,p.name,isNew?"프로젝트 등록":"프로젝트 정보 수정");await fetchHistory();setSpEditId(null);setSpForm(EMPTY_FORM);};
const deleteProj=async id=>{if(!window.confirm("삭제?"))return;const dp=projects.find(x=>x.id===id);try{await supabase.from("projects").delete().eq("id",id);}catch{}setProjects(p=>p.filter(x=>x.id!==id));if(activePid===id)setActivePid(null);if(dp){await logHistory(id,dp.name,"프로젝트 삭제");await fetchHistory();}};

const CALC_FIELDS={calcMode,bizId,climId,wsrcId,customSrcT,opHRaw,utilRate,equipList,heatArea,heatRoomCalc,customHeatW,simCoef,hpTempRaw,tankTypeId,customTankDT,circTypeId,makerId,copWeight,contractPower,maxDemand,existBoilerPower,hpManual,existTank,newTankRaw,tankSpace,elecType,nightLoad,nightContract,nightOpH,nightMakerId,nightModelId,fuelId,fuelUnit,fuelMon,fuelPrc,dayRate,nightRate,instCost,vBoilers};

const openCalc=p=>{setActivePid(p.id);if(p.calcData){const d=p.calcData;
if(d.calcMode)setCalcMode(d.calcMode);if(d.bizId)setBizId(d.bizId);
if(d.climId)setClimId(d.climId);else if(p.sido&&SIDO_CLIMATE[p.sido])setClimId(SIDO_CLIMATE[p.sido]);else if(p.sido&&SIDO_CLIMATE[p.sido])setClimId(SIDO_CLIMATE[p.sido]);if(d.wsrcId)setWsrcId(d.wsrcId);if(d.customSrcT!==undefined)setCustomSrcT(d.customSrcT);
if(d.opHRaw)setOpHRaw(d.opHRaw);if(d.utilRate)setUtilRate(d.utilRate);if(d.equipList)setEquipList(d.equipList);
if(d.heatArea)setHeatArea(d.heatArea);if(d.heatRoomCalc)setHeatRoomCalc(d.heatRoomCalc);if(d.heatRooms)setHeatRooms(d.heatRooms);if(d.customHeatW)setCustomHeatW(d.customHeatW);if(d.simCoef)setSimCoef(d.simCoef);
if(d.hpTempRaw)setHpTempRaw(d.hpTempRaw);if(d.tankTypeId)setTankTypeId(d.tankTypeId);if(d.customTankDT!==undefined)setCustomTankDT(d.customTankDT||"");if(d.circTypeId)setCircTypeId(d.circTypeId);
if(d.makerId)setMakerId(d.makerId);if(d.copWeight)setCopWeight(d.copWeight);if(d.contractPower)setContractPower(d.contractPower);if(d.maxDemand)setMaxDemand(d.maxDemand);if(d.existBoilerPower!==undefined)setExistBoilerPower(d.existBoilerPower||"");if(d.hpManual)setHpManual(d.hpManual);else setHpManual([]);
if(d.existTank)setExistTank(d.existTank);if(d.newTankRaw)setNewTankRaw(d.newTankRaw);if(d.tankSpace)setTankSpace(d.tankSpace);
if(d.elecType)setElecType(d.elecType);if(d.nightLoad)setNightLoad(d.nightLoad);if(d.nightContract)setNightContract(d.nightContract);
if(d.nightOpH)setNightOpH(d.nightOpH);if(d.nightMakerId)setNightMakerId(d.nightMakerId);if(d.nightModelId)setNightModelId(d.nightModelId);
if(d.fuelId)setFuelId(d.fuelId);if(d.fuelUnit)setFuelUnit(d.fuelUnit);if(d.fuelMon)setFuelMon(d.fuelMon);if(d.fuelPrc)setFuelPrc(d.fuelPrc);
if(d.dayRate)setDayRate(d.dayRate);if(d.nightRate)setNightRate(d.nightRate);if(d.instCost)setInstCost(d.instCost);
if(d.vBoilers)setVBoilers(d.vBoilers);else setVBoilers([]);
}else{setVBoilers([]);}
setTab("calc");};
const saveCalc=async()=>{if(!activePid){alert("프로젝트 선택 필요");return;}const ap=projects.find(p=>p.id===activePid);const updated={...ap,calcData:CALC_FIELDS,updatedAt:new Date().toISOString()};const saved=await saveOne(updated);setProjects(prev=>prev.map(p=>p.id===activePid?saved:p));await logHistory(activePid,ap?.name||"",ap?.calcData?"용량산정 수정":"용량산정 저장");await fetchHistory();alert("저장 완료!");};

const roomCount=useMemo(()=>{
const b=equipList.find(e=>e.type==="bathtub");
return b&&parseFloat(b.count)?Math.round(parseFloat(b.count)):0;
},[equipList]);

const[heatRoomCount,setHeatRoomCount]=useState("");
const[heatRoomSqm,setHeatRoomSqm]=useState("");
const heatAutoArea=(parseFloat(heatRoomCount)||0)*(parseFloat(heatRoomSqm)||0);
const addEquip=(type,subtype)=>setEquipList(p=>[...p,mkEquip(type,subtype)]);
const removeEquip=id=>setEquipList(p=>p.filter(e=>e.id!==id));
const updateEquip=(id,field,val)=>setEquipList(p=>p.map(e=>e.id===id?{...e,[field]:val}:e));

const onBizChange=id=>{
setBizId(id);
const b=BIZ.find(x=>x.id===id);
if(!b)return;
setOpHRaw(String(b.opH));
if(b.defCirc)setCircTypeId(b.defCirc);
if(b.defSimCoef)setSimCoef(String(b.defSimCoef));
if(b.defUtil)setUtilRate(String(b.defUtil));
const defaultEquips=b.defEquip.map(type=>{
if(type==="tang") return mkEquip("tang","replace");
if(type==="pool") return mkEquip("pool","replace");
return mkEquip(type,null);
});
setEquipList(defaultEquips);
};

// 샘플 프로젝트 로드
const loadSample=async()=>{
  const sampleId="sample_"+Date.now();
  const sampleProj={
    id:sampleId,name:"[샘플] 중부 펜션 10실",status:"site",sido:"경기",sigungu:"가평군",
    manager:"",distributor:"",installer:"",memo:"샘플 데이터 — 삭제 가능",
    updatedAt:new Date().toISOString(),
    calcData:{
      calcMode:"both",bizId:"hotel",climId:"central",wsrcId:"tap",customSrcT:"",
      opHRaw:"16",utilRate:"60",
      equipList:[
        {id:"s1",type:"bathtub",subtype:null,targetTemp:"42",count:"10",volume:"5",freq:"1",tempDrop:"2",volL:"200",freqDay:"1",people:"",perPerson:"0.04",showerRooms:"",showerPpRoom:"2",poolVol:"",cycleDays:"30",poolArea:"",poolLocation:"indoor",beds:"",litPerPerson:"80",weeksFreq:"3"},
        {id:"s2",type:"shower",subtype:null,targetTemp:"42",count:"1",volume:"5",freq:"1",tempDrop:"2",volL:"200",freqDay:"1",people:"20",perPerson:"0.04",showerRooms:"10",showerPpRoom:"2",poolVol:"",cycleDays:"30",poolArea:"",poolLocation:"indoor",beds:"",litPerPerson:"80",weeksFreq:"3"},
      ],
      heatArea:"60",heatRooms:[],customHeatW:"",simCoef:"0.7",
      hpTempRaw:"60",tankTypeId:"3",circTypeId:"pension",
      makerId:"lg",copWeight:"0.9",contractPower:"50",maxDemand:"30",existBoilerPower:"",
      hpManual:[],
      existTank:"",newTankRaw:"",tankSpace:"yes",
      elecType:"general",nightLoad:"hotwater",nightContract:"",nightOpH:"8",
      nightMakerId:"lg",nightModelId:"lg16",
      fuelId:"lng",fuelUnit:"kg",fuelMon:"800",fuelPrc:"1100",
      dayRate:"120",nightRate:"56",instCost:"3000",
      vBoilers:[{
        id:"sb1",name:"기존 가스보일러",fuelType:"lng",purpose:"hotwater_heating",
        capacity:"50",efficiency:"",startYear:"2024",startMonth:"1",
        monthlyData:[
          {year:2024,month:1,usage:"1200",cost:"1320000"},
          {year:2024,month:2,usage:"1100",cost:"1210000"},
          {year:2024,month:3,usage:"850",cost:"935000"},
          {year:2024,month:4,usage:"500",cost:"550000"},
          {year:2024,month:5,usage:"350",cost:"385000"},
          {year:2024,month:6,usage:"280",cost:"308000"},
          {year:2024,month:7,usage:"250",cost:"275000"},
          {year:2024,month:8,usage:"260",cost:"286000"},
          {year:2024,month:9,usage:"300",cost:"330000"},
          {year:2024,month:10,usage:"550",cost:"605000"},
          {year:2024,month:11,usage:"900",cost:"990000"},
          {year:2024,month:12,usage:"1150",cost:"1265000"},
        ],
      }],
    }
  };
  const saved=await saveOne(sampleProj);
  setProjects(prev=>[saved,...prev]);
  await logHistory(sampleId,sampleProj.name,"샘플 프로젝트 로드");
  await fetchHistory();
  openCalc(sampleProj);
};

// 스타일
const C=dark?{bg:"#0A1510",card:"#132A1E",bd:"#1D4030",txt:"#E8F0E8",sub:"#8FA88F",pri:"#5CB88A",acc:"#4DA87A",res:"#34D399",warn:"#FBBF24",err:"#F87171",inp:"#0A1510",inpB:"#2A4A3A",hi:"#1A3A2A"}
:{bg:"#F2F7F4",card:"#FFFFFF",bd:"#C8D8CC",txt:"#1A1A1A",sub:"#5A6B5E",pri:"#0F4A30",acc:"#2E7A4A",res:"#006600",warn:"#D4920A",err:"#C00000",inp:"#F8FBF8",inpB:"#B0C8B4",hi:"#E8F2EC"};
const W={fontFamily:"'Pretendard','맑은 고딕',sans-serif",background:C.bg,minHeight:"100vh",paddingBottom:60};
const HDR={background:dark?"#0D1F15":"#0F4A30",color:"#fff",padding:"10px 18px",display:"flex",justifyContent:"space-between",alignItems:"center",position:"sticky",top:0,zIndex:100,boxShadow:"0 2px 8px rgba(0,0,0,.3)"};
const TABS={display:"flex",background:C.card,borderBottom:`1px solid ${C.bd}`,padding:"0 14px",gap:2,overflowX:"auto"};
const tb=a=>({padding:"11px 16px",fontSize:13.5,fontWeight:a?700:500,color:a?C.acc:C.sub,background:"none",border:"none",borderBottom:a?`2.5px solid ${C.acc}`:`2.5px solid transparent`,cursor:"pointer",fontFamily:"inherit",whiteSpace:"nowrap"});
const CONT={maxWidth:760,margin:"0 auto",padding:"14px 12px",width:"100%",boxSizing:"border-box"};
const SEC={background:C.card,borderRadius:10,padding:"16px 18px",marginBottom:12,border:`1px solid ${C.bd}`};
const SECH={fontSize:14.5,fontWeight:700,color:C.pri,marginBottom:14,display:"flex",alignItems:"center",gap:6};
const ROW={display:"flex",alignItems:"center",gap:8,marginBottom:10,flexWrap:"wrap"};
const LBL={fontSize:13,color:C.sub,minWidth:108,flexShrink:0};
const IST={background:C.inp,border:`1px solid ${C.inpB}`,borderRadius:6,padding:"7px 10px",fontSize:13,color:C.txt,outline:"none",fontFamily:"inherit"};
const INP={...IST,width:88};
const SEL={...IST,cursor:"pointer",width:160};
const BTN={border:"none",borderRadius:6,cursor:"pointer",fontFamily:"inherit",fontWeight:600,fontSize:13,transition:"all .15s"};
const RBOX={background:dark?"#1A3A2A":"#E8F2EC",border:`1px solid ${dark?"#2E7A4A":"#A0C8AC"}`,borderRadius:8,padding:"12px 14px"};
const tog=k=>setOpenDet(p=>({...p,[k]:!p[k]}));
const statBadge=sid=>{const s=STATUS_LIST.find(x=>x.id===sid);return s?{color:s.color,background:s.bg,border:`1px solid ${s.border}`,padding:"2px 9px",borderRadius:12,fontSize:12,fontWeight:600,whiteSpace:"nowrap"}:{};};

const filteredProjs=projects.filter(p=>{if(spFilter!=="all"&&p.status!==spFilter)return false;if(spFMgr&&!(p.manager||"").toLowerCase().includes(spFMgr.toLowerCase()))return false;if(spFSido&&p.sido!==spFSido)return false;if(spSearch&&!(p.name||"").toLowerCase().includes(spSearch.toLowerCase()))return false;if(spFDist&&!(p.distributor||"").includes(spFDist))return false;if(spFInst&&!(p.installer||"").includes(spFInst))return false;return true;});
const{srcT,hpTemp,hpt,hptTank,opH,heatW,sc,circCoef,copRaw,copRaw2,copWt,effCOP,effCOP2,utilR,repPeakH,hwBaseLoad,hwPeakLoad,dailyHeatWithLoss,monthlyHwHeat,equipDetails,htLoad,monthlyHtHeat,totalPeak,basicLoad,totalMonthly,existT,newT,enteredTank,tankMin,tankOpt,hpOpt,effTank,hpR,hpRec,isCDom,isBDom,isBalanced,nightR,tankAutoApplied,tankOptCalc,rawPeak,monthlyElec,elecCost,curCost,savings,payback,dailyHwOnly,dailyPoolOnly}=R;

const renderEquip=(eq)=>{
const detail=equipDetails.find(d=>d.id===eq.id);
const dailyHeat=detail?.dailyHeat||0;
const bg=dark?"#1E293B":"#F8FAFF";
const border=`1px solid ${C.bd}`;
const labelMap={tang:"탕",bathtub:"욕조",shower:"샤워",pool:"수영장/온수풀",hospital:"병원/요양 목욕"};
return(
<div key={eq.id} style={{background:bg,border,borderRadius:8,padding:"10px 12px",marginBottom:8}}>
<div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
<span style={{fontSize:13,fontWeight:700,color:C.pri}}>{labelMap[eq.type]}{eq.subtype==="replace"?" (교체있음)":eq.subtype==="no_replace"?" (교체없음)":""}</span>
<div style={{display:"flex",alignItems:"center",gap:8}}>
{dailyHeat>0&&<span style={{fontSize:12,color:C.acc,fontWeight:600}}>{fmt(dailyHeat,1)} kWh/일</span>}
<button onClick={()=>tog("eq_"+eq.id)} style={{...BTN,padding:"3px 8px",fontSize:11,background:dark?"#132A1E":"#E8F2EC",color:C.acc,border:`1px solid ${C.acc}`}}>{openDet["eq_"+eq.id]?"▼ 수식":"▶ 수식"}</button>
<button onClick={()=>removeEquip(eq.id)} style={{...BTN,padding:"3px 8px",fontSize:11,background:"#FFF5F5",color:C.err,border:"1px solid #FCA5A5"}}>삭제</button>
</div>
</div>
<div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
{eq.type==="tang"&&eq.subtype==="replace"&&<>
<NI v={eq.volume} s={v=>updateEquip(eq.id,"volume",v)} ph="5" st={{...INP,width:68}} sfx="톤/탕"/>
<NI v={eq.freq} s={v=>updateEquip(eq.id,"freq",v)} ph="1" st={{...INP,width:55}} sfx="회/일"/>
<NI v={eq.count} s={v=>updateEquip(eq.id,"count",v)} ph="1" st={{...INP,width:50}} sfx="개"/>
<NI v={eq.targetTemp} s={v=>updateEquip(eq.id,"targetTemp",v)} ph="42" st={{...INP,width:55}} sfx="℃"/>
</>}
{eq.type==="tang"&&eq.subtype==="no_replace"&&<>
<NI v={eq.volume} s={v=>updateEquip(eq.id,"volume",v)} ph="5" st={{...INP,width:68}} sfx="톤"/>
<NI v={eq.tempDrop} s={v=>updateEquip(eq.id,"tempDrop",v)} ph="2" st={{...INP,width:60}} sfx="℃/일 수온강하"/>
</>}
{eq.type==="bathtub"&&<>
<NI v={eq.volL} s={v=>updateEquip(eq.id,"volL",v)} ph="200" st={{...INP,width:68}} sfx="L/개"/>
<NI v={eq.freqDay} s={v=>updateEquip(eq.id,"freqDay",v)} ph="1" st={{...INP,width:55}} sfx="회/일"/>
<NI v={eq.count} s={v=>updateEquip(eq.id,"count",v)} ph="1" st={{...INP,width:50}} sfx="개"/>
<NI v={eq.targetTemp} s={v=>updateEquip(eq.id,"targetTemp",v)} ph="42" st={{...INP,width:55}} sfx="℃"/>
</>}
{eq.type==="shower"&&<>
<div style={{display:"flex",flexDirection:"column",gap:4}}>
<div style={{display:"flex",alignItems:"center",gap:5,flexWrap:"wrap"}}>
<span style={{fontSize:12,color:C.sub,minWidth:90}}>이용인원 계산</span>
<NI v={eq.showerRooms||""} s={v=>updateEquip(eq.id,"showerRooms",v)} ph="객실수" st={{...INP,width:65}} sfx="실"/>
<span style={{fontSize:13,color:C.sub}}>×</span>
<NI v={eq.showerPpRoom||""} s={v=>updateEquip(eq.id,"showerPpRoom",v)} ph="2" st={{...INP,width:50}} sfx="인/실"/>
{(parseFloat(eq.showerRooms)>0)&&<><span style={{fontSize:13,fontWeight:700,color:C.acc}}>= {Math.round((parseFloat(eq.showerRooms)||0)*(parseFloat(eq.showerPpRoom)||2))}인</span>
<button onClick={()=>updateEquip(eq.id,"people",String(Math.round((parseFloat(eq.showerRooms)||0)*(parseFloat(eq.showerPpRoom)||2))))} style={{...BTN,padding:"3px 8px",fontSize:11,background:C.acc,color:"#fff"}}>적용</button></>}
</div>
<div style={{display:"flex",alignItems:"center",gap:5,flexWrap:"wrap"}}>
<span style={{fontSize:12,color:C.sub,minWidth:90}}>하루 평균 이용인원</span>
<NI v={eq.people} s={v=>updateEquip(eq.id,"people",v)} ph="30" st={{...INP,width:68}} sfx="인"/>
</div>
<div style={{display:"flex",alignItems:"center",gap:5,flexWrap:"wrap"}}>
<span style={{fontSize:12,color:C.sub,minWidth:90}}>1인당 온수량</span>
<NI v={eq.perPerson} s={v=>updateEquip(eq.id,"perPerson",v)} ph="0.04" st={{...INP,width:68}} sfx="톤/인"/>
<span style={{fontSize:11,color:C.sub}}>(기본 0.04톤 = 40L)</span>
</div>
<div style={{display:"flex",alignItems:"center",gap:5}}>
<span style={{fontSize:12,color:C.sub,minWidth:90}}>온수 목표온도</span>
<NI v={eq.targetTemp} s={v=>updateEquip(eq.id,"targetTemp",v)} ph="42" st={{...INP,width:55}} sfx="℃"/>
</div>
</div>
</>}
{eq.type==="pool"&&eq.subtype==="replace"&&<>
<NI v={eq.poolVol} s={v=>updateEquip(eq.id,"poolVol",v)} ph="50" st={{...INP,width:68}} sfx="톤"/>
<NI v={eq.cycleDays} s={v=>updateEquip(eq.id,"cycleDays",v)} ph="30" st={{...INP,width:60}} sfx="일/주기"/>
<NI v={eq.targetTemp} s={v=>updateEquip(eq.id,"targetTemp",v)} ph="30" st={{...INP,width:55}} sfx="℃"/>
<NI v={eq.poolArea} s={v=>updateEquip(eq.id,"poolArea",v)} ph="수면적" st={{...INP,width:75}} sfx="m²"/>
<select value={eq.poolLocation||"indoor"} onChange={e=>updateEquip(eq.id,"poolLocation",e.target.value)} style={{...INP,width:75,cursor:"pointer"}}><option value="indoor">실내</option><option value="outdoor">실외</option></select>
</>}
{eq.type==="pool"&&eq.subtype==="no_replace"&&<>
<NI v={eq.poolArea} s={v=>updateEquip(eq.id,"poolArea",v)} ph="수면적" st={{...INP,width:75}} sfx="m²"/>
<select value={eq.poolLocation||"indoor"} onChange={e=>updateEquip(eq.id,"poolLocation",e.target.value)} style={{...INP,width:75,cursor:"pointer"}}><option value="indoor">실내</option><option value="outdoor">실외</option></select>
<span style={{fontSize:11,color:C.sub}}>{eq.poolLocation==="outdoor"?"10.0":"6.0"} kWh/m²·일</span>
</>}
{eq.type==="hospital"&&<>
<NI v={eq.beds} s={v=>updateEquip(eq.id,"beds",v)} ph="50" st={{...INP,width:68}} sfx="병상"/>
<NI v={eq.weeksFreq} s={v=>updateEquip(eq.id,"weeksFreq",v)} ph="3" st={{...INP,width:50}} sfx="회/주"/>
<NI v={eq.litPerPerson} s={v=>updateEquip(eq.id,"litPerPerson",v)} ph="80" st={{...INP,width:60}} sfx="L/인"/>
<NI v={eq.targetTemp} s={v=>updateEquip(eq.id,"targetTemp",v)} ph="42" st={{...INP,width:55}} sfx="℃"/>
</>}
</div>
{openDet["eq_"+eq.id]&&dailyHeat>0&&(<div style={{marginTop:6,padding:"6px 10px",background:dark?"#0F172A":"#F8FAFC",border:`1px dashed ${C.bd}`,borderRadius:5,fontSize:11,color:C.sub,fontFamily:"'Consolas','맑은 고딕',monospace",lineHeight:1.8}}>
{eq.type==="tang"&&eq.subtype==="replace"&&<>톤수({eq.volume}) × 교체횟수({eq.freq}) × 탕수({eq.count}) × 1.163 × ({eq.targetTemp}℃ - {srcT}℃) = <b style={{color:C.acc}}>{fmt(dailyHeat,1)} kWh/일</b></>}
{eq.type==="tang"&&eq.subtype==="no_replace"&&<>톤수({eq.volume}) × 수온강하({eq.tempDrop}℃) × 1.163 = <b style={{color:C.acc}}>{fmt(dailyHeat,1)} kWh/일</b></>}
{eq.type==="bathtub"&&<>({eq.volL}L ÷ 1000) × 사용횟수({eq.freqDay}) × 개수({eq.count}) × 1.163 × ({eq.targetTemp}℃ - {srcT}℃) = <b style={{color:C.acc}}>{fmt(dailyHeat,1)} kWh/일</b></>}
{eq.type==="shower"&&<>이용인원({eq.people||0}) × 1인({eq.perPerson}톤) × 1.163 × ({eq.targetTemp}℃ - {srcT}℃) = <b style={{color:C.acc}}>{fmt(dailyHeat,1)} kWh/일</b></>}
{eq.type==="pool"&&<>{eq.subtype==="replace"?`교체: ${eq.poolVol||0}톤÷${eq.cycleDays||30}일×1.163×(${eq.targetTemp}℃-${srcT}℃) + `:""}방열: {eq.poolArea||0}m²×{eq.poolLocation==="outdoor"?"10.0":"6.0"} = <b style={{color:C.acc}}>{fmt(dailyHeat,1)} kWh/일</b>{!eq.poolArea&&<span style={{color:C.err,fontWeight:700,marginLeft:6}}>⚠️ 수면적 미입력 — 방열열량 미반영</span>}</>}
{eq.type==="hospital"&&<>{eq.beds||0}병상 × ({eq.weeksFreq||3}회÷7) × ({eq.litPerPerson||80}L÷1000) × 1.163 × ({eq.targetTemp}℃ - {srcT}℃) = <b style={{color:C.acc}}>{fmt(dailyHeat,1)} kWh/일</b></>}
</div>)}
</div>
);
};

const renderAddEquipButtons=()=>{
const allTypes=[
{label:"탕 (교체있음)",  type:"tang",     sub:"replace"},
{label:"탕 (교체없음)",  type:"tang",     sub:"no_replace"},
{label:"욕조",           type:"bathtub",  sub:null},
{label:"샤워",           type:"shower",   sub:null},
{label:"수영장/온수풀 (교체있음)", type:"pool", sub:"replace"},
{label:"수영장/온수풀 (교체없음)", type:"pool", sub:"no_replace"},
{label:"병원/요양 목욕", type:"hospital", sub:null},
];
return(
<div style={{display:"flex",gap:5,flexWrap:"wrap",marginTop:8}}>
{allTypes.map(t=>(
<button key={t.label} onClick={()=>addEquip(t.type,t.sub)}
style={{...BTN,padding:"5px 10px",fontSize:12,background:C.hi,color:C.acc,border:`1px solid ${C.acc}`}}>
+ {t.label}
</button>
))}
</div>
);
};

return(
  <div style={W}>
    {authLoading&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.6)",zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center"}}><div style={{color:"#fff",fontSize:16,fontWeight:600}}>로딩 중...</div></div>}
    {!authLoading&&!user&&<div style={{position:"fixed",inset:0,background:"rgba(15,23,42,.92)",zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <div style={{background:C.card,borderRadius:18,padding:"40px 32px",maxWidth:380,width:"100%",boxShadow:"0 12px 48px rgba(0,0,0,.5)",textAlign:"center"}}>
        <div style={{fontSize:22,fontWeight:800,color:C.pri,marginBottom:8}}>히트펌프 용량 산정 시스템</div>
        <div style={{fontSize:13,color:C.sub,marginBottom:32,lineHeight:1.6}}>팀원 전용 서비스입니다.<br/>Slack 계정으로 로그인해주세요.</div>
        <button onClick={signInWithSlack} style={{...BTN,background:"#4A154B",color:"#fff",padding:"15px 24px",fontSize:15,width:"100%",display:"flex",alignItems:"center",justifyContent:"center",gap:12,borderRadius:12}}>
          <svg width="22" height="22" viewBox="0 0 54 54" fill="none"><path fill="#E01E5A" d="M19.7 30.5a5.3 5.3 0 1 1 0-10.6 5.3 5.3 0 0 1 0 10.6zm0-15.3a5.3 5.3 0 0 1-5.3-5.3V4.7a5.3 5.3 0 0 1 10.6 0v5.2a5.3 5.3 0 0 1-5.3 5.3z"/><path fill="#36C5F0" d="M30.5 19.7a5.3 5.3 0 1 1 10.6 0 5.3 5.3 0 0 1-10.6 0zm15.3 0a5.3 5.3 0 0 1 5.3-5.3h5.2a5.3 5.3 0 0 1 0 10.6h-5.2a5.3 5.3 0 0 1-5.3-5.3z"/><path fill="#2EB67D" d="M34.3 23.5a5.3 5.3 0 1 1 0 10.6 5.3 5.3 0 0 1 0-10.6zm0 15.3a5.3 5.3 0 0 1 5.3 5.3v5.2a5.3 5.3 0 0 1-10.6 0v-5.2a5.3 5.3 0 0 1 5.3-5.3z"/><path fill="#ECB22E" d="M23.5 34.3a5.3 5.3 0 1 1-10.6 0 5.3 5.3 0 0 1 10.6 0zm-15.3 0a5.3 5.3 0 0 1-5.3 5.3H2.7a5.3 5.3 0 0 1 0-10.6h5.2a5.3 5.3 0 0 1 5.3 5.3z"/></svg>
          Slack으로 로그인
        </button>
      </div>
    </div>}

    <div style={HDR}>
      <div style={{display:"flex",alignItems:"center",gap:12}}><img src="data:image/png;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/4gHYSUNDX1BST0ZJTEUAAQEAAAHIAAAAAAQwAABtbnRyUkdCIFhZWiAH4AABAAEAAAAAAABhY3NwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAA9tYAAQAAAADTLQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlkZXNjAAAA8AAAACRyWFlaAAABFAAAABRnWFlaAAABKAAAABRiWFlaAAABPAAAABR3dHB0AAABUAAAABRyVFJDAAABZAAAAChnVFJDAAABZAAAAChiVFJDAAABZAAAAChjcHJ0AAABjAAAADxtbHVjAAAAAAAAAAEAAAAMZW5VUwAAAAgAAAAcAHMAUgBHAEJYWVogAAAAAAAAb6IAADj1AAADkFhZWiAAAAAAAABimQAAt4UAABjaWFlaIAAAAAAAACSgAAAPhAAAts9YWVogAAAAAAAA9tYAAQAAAADTLXBhcmEAAAAAAAQAAAACZmYAAPKnAAANWQAAE9AAAApbAAAAAAAAAABtbHVjAAAAAAAAAAEAAAAMZW5VUwAAACAAAAAcAEcAbwBvAGcAbABlACAASQBuAGMALgAgADIAMAAxADb/2wBDAAUDBAQEAwUEBAQFBQUGBwwIBwcHBw8LCwkMEQ8SEhEPERETFhwXExQaFRERGCEYGh0dHx8fExciJCIeJBweHx7/2wBDAQUFBQcGBw4ICA4eFBEUHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh7/wAARCAMgB9ADASIAAhEBAxEB/8QAHAABAAICAwEAAAAAAAAAAAAAAAYHBAUBAgMI/8QAThABAAEDAQIFDwkFCAICAwEBAAECAwQFBhE1c5Ox0QcSFRYXITE2QVFUVXKSwRMUIjRSYXGRsiMzgaHSMkJTYnSDouEkYyUmQ4LwREX/xAAaAQEAAwEBAQAAAAAAAAAAAAAAAgMEAQUG/8QANBEBAAIABAQDBwMFAQEBAQAAAAECAwQRMRITMlEUFVIFITNBYXGRgaHwIkJTweEjNLFD/9oADAMBAAIRAxEAPwD4yAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA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AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAH//Z" alt="모닥불에너지" style={{height:30,objectFit:"contain",filter:"brightness(10)"}}/><div><div style={{fontSize:14,fontWeight:700}}>히트펌프 용량 산정 시스템</div><div style={{fontSize:10,opacity:.7}}>v1.0 (2026.03.18)</div></div></div>
      <div style={{display:"flex",alignItems:"center",gap:8}}>
        {user?.user_metadata?.avatar_url&&<img src={user.user_metadata.avatar_url} style={{width:26,height:26,borderRadius:"50%",objectFit:"cover",border:"2px solid rgba(255,255,255,.4)"}} alt=""/>}
        <span style={{fontSize:12,color:"rgba(255,255,255,.9)",padding:"4px 8px",borderRadius:4,background:"rgba(255,255,255,.12)"}}>{myName||"(미지정)"}</span>
        <button onClick={signOut} style={{...BTN,background:"rgba(255,255,255,.18)",color:"#fff",padding:"5px 10px",fontSize:12}}>로그아웃</button>
        <button onClick={()=>setDark(!dark)} style={{...BTN,background:"rgba(255,255,255,.18)",color:"#fff",padding:"5px 12px"}}>{dark?"☀":"🌙"}</button>
      </div>
    </div>
    <div style={TABS}>
      {[["status","📊 현황"],["calc","📐 용량산정"],["verify","🔍 검증"],["econ","💰 경제성"],["history","📜 기록"]].map(([id,lbl])=>(
        <button key={id} style={tb(tab===id)} onClick={()=>setTab(id)}>{lbl}</button>
      ))}
    </div>
    <div style={CONT}>
{/* 공통 저장 바 */}
{tab!=="status"&&activePid&&(<div style={{background:C.card,border:`1px solid ${C.bd}`,borderRadius:8,padding:"8px 14px",marginBottom:10,display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:52,zIndex:50,boxShadow:"0 1px 4px rgba(0,0,0,.1)"}}>
  <span style={{fontSize:12.5,color:C.res,fontWeight:600}}>📂 {activeProj?.name}</span>
  <button onClick={saveCalc} style={{...BTN,background:C.acc,color:"#fff",padding:"6px 14px",fontSize:12.5}}>💾 저장</button>
</div>)}

{/* ══ TAB 1: 프로젝트 현황 ══ */}
{tab==="status"&&(<>
  <div style={SEC}>
    <div style={SECH}>{spEditId?"✏️ 수정":"➕ 새 프로젝트"}</div>
    <div style={ROW}><span style={LBL}>프로젝트명 *</span><input value={spForm.name} onChange={e=>setSpForm({...spForm,name:e.target.value})} placeholder="예) 파주 백학 리조트" style={{...IST,width:210}}/><span style={LBL}>담당자</span><select value={spForm.manager} onChange={e=>setSpForm({...spForm,manager:e.target.value})} style={{...SEL,width:110}}><option value="">선택</option>{members.map(m=><option key={m.id} value={m.name}>{m.name}</option>)}</select></div>
    <div style={ROW}><span style={LBL}>진행상황</span><div style={{display:"flex",gap:5,flexWrap:"wrap"}}>{STATUS_LIST.map(s=>(<button key={s.id} onClick={()=>setSpForm({...spForm,status:s.id})} style={{...BTN,padding:"5px 11px",fontSize:12,background:spForm.status===s.id?s.color:"transparent",color:spForm.status===s.id?"#fff":s.color,border:`1.5px solid ${s.color}`}}>{s.label}</button>))}</div></div>
    <div style={ROW}><span style={LBL}>시도</span><select value={spForm.sido} onChange={e=>setSpForm({...spForm,sido:e.target.value,sigungu:""})} style={{...SEL,width:120}}><option value="">선택</option>{Object.keys(SIDO_GU).map(s=><option key={s} value={s}>{s}</option>)}</select><span style={{fontSize:13,color:C.sub}}>시군구</span>{spForm.sido?(<select value={spForm.sigungu} onChange={e=>setSpForm({...spForm,sigungu:e.target.value})} style={{...SEL,width:130}}><option value="">선택</option>{(SIDO_GU[spForm.sido]||[]).map(s=><option key={s} value={s}>{s}</option>)}</select>):(<input value={spForm.sigungu} onChange={e=>setSpForm({...spForm,sigungu:e.target.value})} placeholder="직접입력" style={{...IST,width:120}}/>)}</div>
    <div style={ROW}><span style={LBL}>유통사</span><input value={spForm.distributor} onChange={e=>setSpForm({...spForm,distributor:e.target.value})} placeholder="(주)OO유통" style={{...IST,width:140}}/><span style={LBL}>설치업체</span><input value={spForm.installer} onChange={e=>setSpForm({...spForm,installer:e.target.value})} placeholder="OO설비" style={{...IST,width:140}}/></div>
    <div style={ROW}><span style={LBL}>메모</span><input value={spForm.memo} onChange={e=>setSpForm({...spForm,memo:e.target.value})} placeholder="규모·특이사항" style={{...IST,width:300}}/></div>
    <div style={{display:"flex",gap:8,marginTop:6}}>
      <button onClick={saveSpProj} style={{...BTN,background:C.acc,color:"#fff",padding:"9px 20px"}}>{spEditId?"✅ 수정완료":"➕ 추가"}</button>
      {spEditId&&<button onClick={()=>{setSpEditId(null);setSpForm(EMPTY_FORM);}} style={{...BTN,background:"#9CA3AF",color:"#fff",padding:"9px 14px"}}>취소</button>}
      <button onClick={loadSample} style={{...BTN,background:dark?"#1A3A2A":"#E8F2EC",color:C.acc,padding:"9px 14px",border:`1px solid ${C.acc}`}}>📦 샘플 프로젝트 로드</button>
    </div>
  </div>
  <div style={SEC}>
    <div style={{...SECH,justifyContent:"space-between"}}><span>📋 목록 ({projects.length}건)</span></div>
    <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:10}}>{STATUS_LIST.map(s=>{const cnt=projects.filter(p=>p.status===s.id).length;return(<div key={s.id} style={{padding:"3px 10px",borderRadius:16,background:s.bg,border:`1px solid ${s.border}`,fontSize:12}}><span style={{color:s.color,fontWeight:700}}>{s.label} {cnt}</span></div>);})}</div>
    <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:10,alignItems:"center"}}>
      <div style={{position:"relative",flex:"1 1 120px"}}><span style={{position:"absolute",left:8,top:"50%",transform:"translateY(-50%)",fontSize:13,color:C.sub,pointerEvents:"none"}}>🔍</span><input value={spSearch} onChange={e=>setSpSearch(e.target.value)} placeholder="프로젝트명 검색" style={{...IST,width:"100%",paddingLeft:28,boxSizing:"border-box"}}/></div>
      <select value={spFMgr} onChange={e=>setSpFMgr(e.target.value)} style={{...SEL,width:100}}><option value="">담당자</option>{members.map(m=><option key={m.id} value={m.name}>{m.name}</option>)}</select>
      <select value={spFSido} onChange={e=>setSpFSido(e.target.value)} style={{...SEL,width:100}}><option value="">지역</option>{Object.keys(SIDO_GU).map(s=><option key={s} value={s}>{s}</option>)}</select>
      <select value={spFDist} onChange={e=>setSpFDist(e.target.value)} style={{...SEL,width:100}}><option value="">유통사</option>{[...new Set(projects.map(p=>p.distributor).filter(Boolean))].sort().map(d=><option key={d} value={d}>{d}</option>)}</select>
      <select value={spFInst} onChange={e=>setSpFInst(e.target.value)} style={{...SEL,width:100}}><option value="">설치업체</option>{[...new Set(projects.map(p=>p.installer).filter(Boolean))].sort().map(d=><option key={d} value={d}>{d}</option>)}</select>
      <div style={{display:"flex",gap:3,flexWrap:"wrap"}}>{[["all","전체"],...STATUS_LIST.map(s=>[s.id,s.label])].map(([id,lbl])=>(<button key={id} onClick={()=>setSpFilter(id)} style={{...BTN,padding:"4px 8px",fontSize:11,fontWeight:spFilter===id?700:400,background:spFilter===id?C.acc:"transparent",color:spFilter===id?"#fff":C.sub,border:`1px solid ${spFilter===id?C.acc:C.bd}`}}>{lbl}</button>))}</div>
    </div>
    {loading?(<div style={{textAlign:"center",padding:"32px 0",color:C.sub}}>불러오는 중...</div>):filteredProjs.length===0?(<div style={{textAlign:"center",padding:"24px 0",color:C.sub}}>📋 {spSearch||spFMgr||spFSido||spFDist||spFInst||spFilter!=="all"?"검색 결과 없음":"프로젝트가 없습니다."}</div>):filteredProjs.map(p=>(
      <div key={p.id} style={{display:"flex",alignItems:"flex-start",gap:6,padding:"11px 13px",borderRadius:8,border:`1px solid ${C.bd}`,marginBottom:7,background:dark?"#1E293B":"#FAFBFF"}}>
        <div style={{flex:1}}>
          <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
            <span style={{fontSize:14,fontWeight:700,color:C.pri}}>{p.name}</span>
            <span style={statBadge(p.status)}>{STATUS_LIST.find(s=>s.id===p.status)?.label}</span>
            {activePid===p.id&&<span style={{fontSize:11,color:C.res,fontWeight:700}}>● 작업중</span>}
          </div>
          <div style={{fontSize:12,color:C.sub,marginTop:2}}>
            {p.manager&&<span>{p.manager} · </span>}
            {(p.sido||p.sigungu)&&<span>{[p.sido,p.sigungu].filter(Boolean).join(" ")} · </span>}
            {p.memo&&<span>{p.memo}</span>}
          </div>
          <div style={{fontSize:11,color:C.sub,marginTop:2,display:"flex",gap:8,flexWrap:"wrap"}}>
            {p.updatedAt&&<span>{new Date(p.updatedAt).toLocaleString("ko-KR")}</span>}
            {p.lastEditor&&<span style={{color:dark?"#60A5FA":C.acc,fontWeight:600}}>✏️ {p.lastEditor}</span>}
            {p.calcData?<span style={{color:C.res,fontWeight:600}}>✅ 산정완료</span>:<span style={{color:C.warn}}>⏳ 미산정</span>}
          </div>
        </div>
        <button onClick={()=>openCalc(p)} style={{...BTN,padding:"5px 11px",fontSize:12,background:C.acc,color:"#fff",flexShrink:0}}>📐 용량산정</button>
        <button onClick={()=>{setSpEditId(p.id);setSpForm({name:p.name,status:p.status,sido:p.sido||"",sigungu:p.sigungu||"",manager:p.manager||"",distributor:p.distributor||"",installer:p.installer||"",memo:p.memo||""});window.scrollTo(0,0);}} style={{...BTN,padding:"5px 9px",fontSize:12,background:C.hi,color:C.acc,border:`1px solid ${C.acc}`,flexShrink:0}}>수정</button>
        <button onClick={()=>deleteProj(p.id)} style={{...BTN,padding:"5px 9px",fontSize:12,background:"#FFF5F5",color:C.err,border:"1px solid #FCA5A5",flexShrink:0}}>삭제</button>
      </div>
    ))}
  </div>
</>)}

{/* ══ TAB 2: 용량 산정 ══ */}
{tab==="calc"&&(<>
  <div style={SEC}>
    <div style={SECH}>🗂️ 프로젝트 연결</div>
    {projects.length>0?(<div style={ROW}>
      <span style={LBL}>프로젝트</span>
      <select value={activePid||""} onChange={e=>{const p=projects.find(x=>x.id===e.target.value);if(p)openCalc(p);else setActivePid(null);}} style={{...SEL,width:260}}><option value="">-- 선택 --</option>{projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select>
      {activeProj&&<span style={{fontSize:12,color:C.res,fontWeight:600}}>✅ {activeProj.name}</span>}
    </div>):(<div style={{fontSize:13,color:C.sub}}>현황 탭에서 먼저 프로젝트를 추가하세요.</div>)}
    <button onClick={saveCalc} style={{...BTN,background:activePid?C.acc:"#9CA3AF",color:"#fff",padding:"7px 16px",marginTop:8}} disabled={!activePid}>💾 저장</button>
  </div>

  <div style={SEC}>
    <div style={SECH}>STEP 1. 분석 범위</div>
    <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
      {[["heating","🔥 난방 전용"],["hotwater","🚿 급탕 전용"],["both","🔥🚿 난방+급탕"]].map(([id,lbl])=>(
        <button key={id} onClick={()=>setCalcMode(id)} style={{...BTN,padding:"8px 16px",fontSize:13,background:calcMode===id?C.pri:"transparent",color:calcMode===id?"#fff":C.sub,border:`1.5px solid ${calcMode===id?C.pri:C.bd}`}}>{lbl}</button>
      ))}
    </div>
  </div>

  <div style={SEC}>
    <div style={SECH}>STEP 2. 현장 조건</div>
    <div style={ROW}><span style={LBL}>업종</span><select value={bizId} onChange={e=>onBizChange(e.target.value)} style={{...SEL,width:200}}><option value="">선택</option>{BIZ.map(b=><option key={b.id} value={b.id}>{b.label}</option>)}</select>{bizId&&<span style={{fontSize:12,color:C.sub}}>기본 설비 자동 추가됨</span>}</div>
    {/* 이용률 */}
    <div style={ROW}>
      <span style={LBL}>평균 이용률</span>
      <NI v={utilRate} s={setUtilRate} ph="100" st={{...INP,width:60}} sfx="%"/>
      {BIZ.find(b=>b.id===bizId)?.defUtil&&<span style={{fontSize:11,color:C.sub}}>업종기본 {BIZ.find(b=>b.id===bizId).defUtil}% — 욕조·샤워에 적용 (탕교체·수영장은 미적용)</span>}
    </div>

    <div style={ROW}><span style={LBL}>기후대</span><select value={climId} onChange={e=>{setClimId(e.target.value);setCustomSrcT("");}} style={{...SEL,width:160}}>{CLIMATE.map(c=><option key={c.id} value={c.id}>{c.label}</option>)}</select><span style={{fontSize:12,color:C.sub}}>{CLIMATE.find(c=>c.id===climId)?.desc}</span></div>
    <div style={ROW}><span style={LBL}>열원</span><select value={wsrcId} onChange={e=>{setWsrcId(e.target.value);setCustomSrcT("");}} style={{...SEL,width:120}}>{WSRC.map(w=><option key={w.id} value={w.id}>{w.label}</option>)}</select><span style={{fontSize:12,color:C.sub}}>입수온도:</span><NI v={customSrcT||String(WSRC.find(w=>w.id===wsrcId)?.getT(CLIMATE.find(c=>c.id===climId))||10)} s={setCustomSrcT} ph="10" st={{...INP,width:58}} sfx="℃"/></div>
    <div style={ROW}><span style={LBL}>일 운영시간</span><NI v={opHRaw} s={setOpHRaw} ph="12" st={{...INP,width:68}} sfx="h/일"/></div>

    {calcMode!=="hotwater"&&(<div style={{background:dark?"#1A3A2A":"#E8F2EC",border:`1px solid ${dark?C.acc:"#A0C8AC"}`,borderRadius:7,padding:"9px 12px",marginBottom:10}}>
      <div style={{fontSize:12,color:C.sub,marginBottom:5}}>기후대별 기준부하 (경험치)</div>
      <div style={{display:"flex",gap:14,flexWrap:"wrap",marginBottom:6}}>{CLIMATE.map(c=><span key={c.id} style={{fontSize:12.5,fontWeight:climId===c.id?700:400,color:climId===c.id?C.acc:C.sub}}>{c.label}: <b>{c.heatW}W/평</b></span>)}</div>
      <div style={{display:"flex",alignItems:"center",gap:7}}><span style={{fontSize:12,color:C.sub}}>적용:</span><NI v={customHeatW||String(CLIMATE.find(c=>c.id===climId)?.heatW||230)} s={setCustomHeatW} ph="230" st={{...INP,width:68}} sfx="W/평"/>{customHeatW&&<button onClick={()=>setCustomHeatW("")} style={{...BTN,fontSize:11,padding:"2px 6px",background:"#F3F4F6",color:C.sub,border:`1px solid ${C.bd}`}}>기본값</button>}</div>
    </div>)}

    <div style={ROW}><span style={LBL}>HP 출수온도</span><NI v={hpTempRaw} s={setHpTempRaw} ph="55" st={{...INP,width:68}} sfx="℃"/><span style={{fontSize:12,color:C.sub}}>기본값은 축열조 유형 선택 시 자동 세팅</span></div>

    <div style={{marginBottom:10}}>
      <div style={{fontSize:13,color:C.sub,marginBottom:6}}>축열조 설계 유형</div>
      <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
        {TANK_TYPES.map(t=>(<button key={t.id} onClick={()=>{setTankTypeId(t.id);setHpTempRaw(String(t.hpTemp));}} style={{...BTN,padding:"6px 12px",fontSize:12.5,background:tankTypeId===t.id?C.acc:"transparent",color:tankTypeId===t.id?"#fff":C.sub,border:`1.5px solid ${tankTypeId===t.id?C.acc:C.bd}`}}>{t.label}</button>))}
      </div>
      {(()=>{const desc={
        "1":"축열조 물이 난방 배관으로 직접 순환. 난방 전용 현장에 적합. 열교환기 없음.",
        "2":"축열조 내부 코일로 급탕수를 가열. 축열조 물과 급탕수가 분리됨. 별도 열교환기 없음.",
        "3":"외부 판형 열교환기를 통해 급탕수를 가열. 축열조 물과 급탕수가 분리됨.",
        "4":"축열조 물이 곧 급탕수. 코일·열교환기 없이 직접 공급. 소규모 급탕 전용.",
        "0":"축열조 없이 히트펌프가 부하를 직접 감당. 피크 대응 불가, 소규모 현장만 적용.",
      }[tankTypeId];return desc?(<div style={{marginTop:7,padding:"6px 10px",background:dark?"#132A1E":"#E8F2EC",border:`1px solid ${dark?"#2E5A40":"#A0C8AC"}`,borderRadius:6,fontSize:12,color:dark?"#5CB88A":"#0F4A30"}}>{desc}</div>):null;})()}
      <div style={{display:"flex",alignItems:"center",gap:7,marginTop:7,flexWrap:"wrap"}}>
        <span style={{fontSize:12,color:C.sub}}>축열조 ΔT</span>
        <NI v={customTankDT||(String(TANK_TYPES.find(t=>t.id===tankTypeId)?.tankDT||15))} s={setCustomTankDT} ph="15" st={{...INP,width:58}} sfx="℃"/>
        {customTankDT&&<button onClick={()=>setCustomTankDT("")} style={{...BTN,fontSize:11,padding:"2px 6px",background:"#F3F4F6",color:C.sub,border:`1px solid ${C.bd}`}}>기본값</button>}
        <span style={{fontSize:11.5,color:C.sub}}>→ 단위열량 {fmt(1.163*(parseFloat(customTankDT)||TANK_TYPES.find(t=>t.id===tankTypeId)?.tankDT||15),2)} kWh/톤</span>
      </div>
    </div>

    {calcMode!=="heating"&&(<div style={{background:dark?"#1B2A1B":"#F0FDF4",border:`1px solid ${dark?"#006600":"#BBF7D0"}`,borderRadius:7,padding:"9px 12px",marginBottom:10}}>
      <div style={{fontSize:12.5,fontWeight:700,color:dark?"#86EFAC":"#006600",marginBottom:6}}>🔄 급탕 순환배관 손실계수</div>
      <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
        {CIRC_TYPES.map(ct=>(<button key={ct.id} onClick={()=>setCircTypeId(ct.id)} style={{...BTN,padding:"4px 9px",fontSize:12,background:circTypeId===ct.id?(dark?"#006600":"#2E7A4A"):"transparent",color:circTypeId===ct.id?"#fff":(dark?"#86EFAC":"#006600"),border:`1.5px solid ${dark?"#006600":"#2E7A4A"}`}}>{ct.label} ×{ct.coef}</button>))}
      </div>
      {circCoef>1&&<div style={{marginTop:5,fontSize:12,color:dark?"#86EFAC":"#006600"}}>→ 급탕 열량 전체에 ×{circCoef} 적용</div>}
    </div>)}

    <div style={{background:dark?"#1E2A3A":"#EFF6FF",border:`1px solid ${dark?C.acc:"#A0C8AC"}`,borderRadius:7,padding:"9px 12px",marginBottom:10}}>
      <div style={{fontSize:12.5,fontWeight:700,color:C.acc,marginBottom:8}}>🔧 히트펌프 설정</div>
      <div style={ROW}>
        <span style={{fontSize:12,color:C.sub,minWidth:60}}>제조사</span>
        <div style={{display:"flex",gap:5}}>
          {HP_MAKERS.map(m=>(<button key={m.id} onClick={()=>{if(!m.available)return;setMakerId(m.id);}} style={{...BTN,padding:"5px 11px",fontSize:12.5,background:makerId===m.id?C.acc:"transparent",color:m.available?(makerId===m.id?"#fff":C.sub):"#CBD5E0",border:`1.5px solid ${makerId===m.id?C.acc:C.bd}`,cursor:m.available?"pointer":"not-allowed"}}>{m.label}{!m.available&&<span style={{fontSize:10,display:"block",opacity:.7}}>{m.note}</span>}</button>))}
        </div>
      </div>
      {hpModelLargest&&<div style={{fontSize:12,color:C.sub,marginBottom:6}}>사용 모델: {hpModelLargest.label} (COP {hpModelLargest.cop} / 최대소비 {hpModelLargest.maxPower}kW) — 필요 용량에 따라 대수 자동 산출</div>}
      <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",marginBottom:8}}>
        <span style={{fontSize:12,color:C.sub}}>COP 가중치:</span>
        <select value={copWeight} onChange={e=>setCopWeight(e.target.value)} style={{...SEL,width:160}}>{COP_WEIGHTS.map(w=>(<option key={w.v} value={w.v}>{w.label}</option>))}</select>
        <span style={{fontSize:13,color:C.acc,fontWeight:700}}>→ 기준 COP: {fmt(copRaw*(parseFloat(copWeight)||0.9),2)} (추천 모델에 따라 보정됨)</span>
      </div>
      <div style={{borderTop:`1px dashed ${C.bd}`,paddingTop:8,marginTop:4}}>
        <div style={{fontSize:12.5,fontWeight:600,color:C.acc,marginBottom:6}}>⚡ 전력 계약 현황</div>
        <div style={{display:"flex",gap:10,flexWrap:"wrap",alignItems:"center"}}>
          <span style={{fontSize:12,color:C.sub}}>계약전력</span>
          <NI v={contractPower} s={setContractPower} ph="0" st={{...INP,width:80}} sfx="kW"/>
          <span style={{fontSize:12,color:C.sub}}>최대수요전력</span>
          <NI v={maxDemand} s={setMaxDemand} ph="미입력시 여유=0" st={{...INP,width:110}} sfx="kW"/>
        </div>
        {parseFloat(contractPower)>0&&parseFloat(maxDemand)>0&&<div style={{fontSize:12,color:C.res,marginTop:4}}>기본 여유분: {fmt(parseFloat(contractPower)-parseFloat(maxDemand),1)} kW</div>}
        <div style={{display:"flex",gap:10,flexWrap:"wrap",alignItems:"center",marginTop:6}}>
          <span style={{fontSize:12,color:C.sub}}>기존 전기보일러</span>
          <NI v={existBoilerPower} s={setExistBoilerPower} ph="없으면 비움" st={{...INP,width:80}} sfx="kW"/>
          {parseFloat(existBoilerPower)>0&&<span style={{fontSize:11,color:C.sub}}>HP 전환 시 이 부하가 빠지므로 여유분에 가산</span>}
        </div>
      </div>
    </div>

    {calcMode==="both"&&parseFloat(simCoef)<1&&(<div style={{background:dark?"#2D1B4E":"#F0FAFA",border:`1px solid ${dark?"#1A7A7A":"#A0D4D4"}`,borderRadius:7,padding:"9px 12px",marginBottom:10}}>
      <div style={{fontSize:12.5,fontWeight:700,color:dark?"#7ABFBF":"#1A7A7A",marginBottom:4}}>⚡ 동시사용계수 ×{simCoef} 자동 적용</div>
      <div style={{fontSize:12,color:dark?"#7ABFBF":"#1A7A7A"}}>전체피크 ({fmt(rawPeak,1)}kW) × {simCoef} = <b>{fmt(totalPeak,1)}kW</b></div>
    </div>)}

    <div style={ROW}><span style={LBL}>전기 계약</span>{[["general","일반전기"],["night","심야전기"]].map(([id,lbl])=>(<button key={id} onClick={()=>setElecType(id)} style={{...BTN,padding:"7px 14px",fontSize:13,background:elecType===id?C.acc:"transparent",color:elecType===id?"#fff":C.sub,border:`1.5px solid ${elecType===id?C.acc:C.bd}`}}>{lbl}</button>))}</div>

    {elecType==="night"&&(<div style={{background:dark?"#2D1B4E":"#F0FAFA",border:`1px solid ${dark?"#1A7A7A":"#A0D4D4"}`,borderRadius:7,padding:"10px 14px",marginBottom:10}}>
      <div style={{fontSize:12.5,fontWeight:700,color:dark?"#7ABFBF":"#1A7A7A",marginBottom:8}}>⚡ 심야전기 설정</div>
      <div style={ROW}><span style={{fontSize:12,color:C.sub,minWidth:80}}>심야 부하</span>{[["hotwater","급탕 전용"],["heating","난방 전용"],["both","난방+급탕"]].map(([id,lbl])=>(<button key={id} onClick={()=>setNightLoad(id)} style={{...BTN,padding:"5px 10px",fontSize:12,background:nightLoad===id?(dark?"#1A7A7A":"#1A7A7A"):"transparent",color:nightLoad===id?"#fff":(dark?"#7ABFBF":"#1A7A7A"),border:`1.5px solid ${dark?"#1A7A7A":"#A0D4D4"}`}}>{lbl}</button>))}</div>
      <div style={ROW}><span style={{fontSize:12,color:C.sub,minWidth:80}}>계약전력</span><NI v={nightContract} s={setNightContract} ph="20" st={{...INP,width:80}} sfx="kW"/><span style={{fontSize:12,color:C.sub}}>심야 운영시간</span><NI v={nightOpH} s={setNightOpH} ph="8" st={{...INP,width:58}} sfx="h (기본 8h)"/></div>
      <div style={{fontSize:12.5,fontWeight:600,color:dark?"#7ABFBF":"#1A7A7A",marginBottom:6}}>심야 HP 제조사·모델</div>
      <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:6}}>
        {HP_MAKERS.filter(m=>m.available).map(m=>(<button key={m.id} onClick={()=>{setNightMakerId(m.id);const first=HP_MODELS.find(x=>x.maker===m.id);if(first)setNightModelId(first.id);}} style={{...BTN,padding:"4px 10px",fontSize:12,background:nightMakerId===m.id?(dark?"#1A7A7A":"#1A7A7A"):"transparent",color:nightMakerId===m.id?"#fff":(dark?"#7ABFBF":"#1A7A7A"),border:`1px solid ${dark?"#1A7A7A":"#A0D4D4"}`}}>{m.label}</button>))}
      </div>
      <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
        {nightAvailableModels.map(m=>{const contract=parseFloat(nightContract)||0;const ok=contract===0||m.maxPower<=contract;return(<button key={m.id} onClick={()=>{if(!ok)return;setNightModelId(m.id);}} style={{...BTN,padding:"4px 10px",fontSize:12,background:nightModelId===m.id?(dark?"#1A7A7A":"#1A7A7A"):"transparent",color:nightModelId===m.id?"#fff":ok?(dark?"#7ABFBF":"#1A7A7A"):"#CBD5E0",border:`1px solid ${dark?"#1A7A7A":"#A0D4D4"}`,cursor:ok?"pointer":"not-allowed"}}>{m.label}<span style={{fontSize:10,display:"block"}}>{m.kw}kW / {m.maxPower}kW 소비{!ok&&" ❌"}</span></button>);})}
      </div>
    </div>)}

    {elecType==="general"&&(<div style={ROW}><span style={LBL}>축열조 공간</span><button onClick={()=>setTankSpace("yes")} style={{...BTN,padding:"7px 14px",fontSize:13,background:tankSpace==="yes"?C.res:"transparent",color:tankSpace==="yes"?"#fff":C.sub,border:`1.5px solid ${tankSpace==="yes"?C.res:C.bd}`}}>✅ 있음</button><button onClick={()=>setTankSpace("no")} style={{...BTN,padding:"7px 14px",fontSize:13,background:tankSpace==="no"?C.err:"transparent",color:tankSpace==="no"?"#fff":C.sub,border:`1.5px solid ${tankSpace==="no"?C.err:C.bd}`}}>❌ 없음</button>{tankSpace==="no"&&<span style={{fontSize:12,color:C.err}}>→ HP가 총 피크부하 전체 담당</span>}</div>)}
  </div>

  <div style={SEC}>
    <div style={SECH}>STEP 3. 부하 입력</div>
    {calcMode!=="hotwater"&&(<div style={{marginBottom:calcMode==="both"?18:0}}>
      <div style={{fontSize:14,fontWeight:700,color:C.pri,marginBottom:9}}>🔥 난방 부하</div>
      <div style={ROW}><span style={LBL}>난방 면적</span><NI v={heatArea} s={setHeatArea} ph="100" st={{...INP,width:88}} sfx="평"/><span style={{fontSize:12,color:C.sub}}>{fmt((parseFloat(heatArea)||0)*3.3,0)} m²</span></div>
      <div style={{display:"flex",alignItems:"center",gap:7,flexWrap:"wrap",marginBottom:8,padding:"7px 10px",background:dark?"#1E293B":"#F8FAFF",border:`1px dashed ${C.bd}`,borderRadius:7}}>
        <span style={{fontSize:12,color:C.sub}}>보조 계산:</span>
        <NI v={heatRoomCount} s={setHeatRoomCount} ph="50" st={{...INP,width:68}} sfx="실"/>
        <span style={{fontSize:13,color:C.sub}}>×</span>
        <NI v={heatRoomSqm} s={setHeatRoomSqm} ph="5" st={{...INP,width:68}} sfx="평/실"/>
        {heatAutoArea>0&&<><span style={{fontSize:13,fontWeight:700,color:C.acc}}>= {fmt(heatAutoArea,1)}평</span><button onClick={()=>setHeatArea(String(heatAutoArea))} style={{...BTN,padding:"4px 10px",fontSize:12,background:C.acc,color:"#fff"}}>난방면적 적용</button></>}
      </div>
      {htLoad>0&&<div style={{...RBOX,marginTop:4}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,textAlign:"center"}}>
          <div><div style={{fontSize:11,color:C.sub}}>기준부하</div><div style={{fontSize:18,fontWeight:800,color:C.acc}}>{heatW}</div><div style={{fontSize:11}}>W/평</div></div>
          <div><div style={{fontSize:11,color:C.sub}}>난방부하</div><div style={{fontSize:18,fontWeight:800,color:C.warn}}>{fmt(htLoad,1)}</div><div style={{fontSize:11}}>kW</div></div>
          <div><div style={{fontSize:11,color:C.sub}}>난방부하</div><div style={{fontSize:18,fontWeight:800,color:C.warn}}>{fmt(htLoad,1)}</div><div style={{fontSize:11}}>kW</div></div>
        </div>
      </div>}
    </div>)}

    {calcMode!=="heating"&&(<div style={{borderTop:calcMode==="both"?`1px dashed ${C.bd}`:"none",paddingTop:calcMode==="both"?14:0}}>
      <div style={{fontSize:14,fontWeight:700,color:C.pri,marginBottom:9}}>🚿 급탕 부하</div>
      {equipList.length===0&&<div style={{fontSize:13,color:C.sub,marginBottom:8}}>업종을 선택하면 기본 설비가 자동 추가됩니다. 아래에서 직접 추가도 가능합니다.</div>}
      {equipList.map(eq=>renderEquip(eq))}
      {renderAddEquipButtons()}
      {(hwBaseLoad>0||hwPeakLoad>0)&&(<div style={{...RBOX,marginTop:12}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,textAlign:"center"}}>
          <div><div style={{fontSize:11,color:C.sub}}>일일 급탕열량</div><div style={{fontSize:18,fontWeight:800,color:C.acc}}>{fmt(dailyHeatWithLoss,1)}</div><div style={{fontSize:11}}>kWh/일</div></div>
          <div><div style={{fontSize:11,color:C.sub}}>급탕 기본부하</div><div style={{fontSize:18,fontWeight:800,color:C.acc}}>{fmt(hwBaseLoad,1)}</div><div style={{fontSize:11}}>kW</div></div>
          <div><div style={{fontSize:11,color:C.sub}}>급탕 피크부하</div><div style={{fontSize:18,fontWeight:800,color:C.warn}}>{fmt(hwPeakLoad,1)}</div><div style={{fontSize:11}}>kW</div></div>
        </div>
        {circCoef>1&&<div style={{marginTop:7,padding:"4px 9px",background:dark?"#0A2A1A":"#E8F8EE",borderRadius:5,fontSize:12,color:dark?"#6EE7B7":"#065F46",textAlign:"center"}}>🔄 순환손실계수 ×{circCoef} 적용 완료</div>}
        <div style={{marginTop:7,textAlign:"center"}}><button onClick={()=>tog("hw_detail")} style={{...BTN,padding:"3px 10px",fontSize:11,background:"transparent",color:C.acc,border:`1px solid ${C.acc}`}}>{openDet.hw_detail?"▼ 산출 근거":"▶ 산출 근거"}</button></div>
        {openDet.hw_detail&&(<div style={{marginTop:6,padding:"8px 10px",background:dark?"#0F172A":"#F8FAFC",border:`1px dashed ${C.bd}`,borderRadius:5,fontSize:11.5,color:C.sub,lineHeight:1.8}}>
          <div>일일 급탕열량 = Σ설비열량 × 순환계수({circCoef}) = <b>{fmt(dailyHeatWithLoss,1)} kWh/일</b></div>
          <div>급탕 기본부하 = {fmt(dailyHeatWithLoss,1)} ÷ {opH}h = <b>{fmt(hwBaseLoad,1)} kW</b></div>
          <div>급탕 피크부하 = Σ(설비피크×순환계수) = <b>{fmt(hwPeakLoad,1)} kW</b></div>
          <div>피크시간 = 가중평균 = <b>{fmt(repPeakH,1)}h</b></div>
        </div>)}
      </div>)}
    </div>)}
  </div>

  {(htLoad>0||hwBaseLoad>0)&&(<div style={SEC}>
    <div style={SECH}>STEP 4. 산정 결과</div>
    {calcMode==="both"&&totalPeak>0&&(<div style={{...RBOX,marginBottom:10}}>
      <div style={{fontSize:12.5,fontWeight:700,color:C.pri,marginBottom:7}}>총 피크부하</div>
      <div style={{display:"grid",gridTemplateColumns:parseFloat(simCoef)<1?"repeat(4,1fr)":"repeat(3,1fr)",gap:8,textAlign:"center"}}>
        <div><div style={{fontSize:11,color:C.sub}}>급탕 피크</div><div style={{fontSize:17,fontWeight:700,color:C.warn}}>{fmt(hwPeakLoad,1)} kW</div></div>
        <div><div style={{fontSize:11,color:C.sub}}>난방부하</div><div style={{fontSize:17,fontWeight:700,color:C.warn}}>{fmt(htLoad,1)} kW</div></div>
        {parseFloat(simCoef)<1&&<div><div style={{fontSize:11,color:C.sub}}>동시사용 ×{simCoef}</div><div style={{fontSize:17,fontWeight:700,color:dark?"#7ABFBF":"#1A7A7A"}}>{fmt(rawPeak,1)}→</div></div>}
        <div><div style={{fontSize:11,color:C.sub}}>총 피크부하</div><div style={{fontSize:21,fontWeight:800,color:C.err}}>{fmt(totalPeak,1)} kW</div></div>
      </div>
    </div>)}

    {elecType==="general"&&hpR&&(<>
      <div style={{...RBOX,marginBottom:8}}>
        <div style={{fontSize:12.5,fontWeight:700,color:C.pri,marginBottom:8}}>🔧 히트펌프 (일반전기)</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,textAlign:"center",marginBottom:8}}>
          <div><div style={{fontSize:11,color:C.sub}}>적용 COP</div><div style={{fontSize:20,fontWeight:800,color:C.acc}}>{fmt(effCOP2,2)}</div><div style={{fontSize:10,color:C.sub}}>{copRaw2}×{parseFloat(copWeight)}{copRaw2!==copRaw&&<span style={{color:C.res}}> (추천모델)</span>}</div></div>
          <div><div style={{fontSize:11,color:C.sub}}>필요 HP 용량</div><div style={{fontSize:20,fontWeight:800,color:C.warn}}>{fmt(hpR.needed,1)}<span style={{fontSize:11}}> kW</span></div></div>
          {hpRec&&hpRec.rows&&<div><div style={{fontSize:11,color:C.sub}}>{hpRec.isManual?"수동 구성":"추천 구성"}</div><div style={{fontSize:14,fontWeight:800,color:hpRec.isManual?C.warn:C.res}}>{hpRec.rows.map((r,i)=><span key={i}>{i>0?" + ":""}{r.model.label}×{r.units}</span>)}</div><div style={{fontSize:11,color:C.sub}}>= {fmt(hpRec.totalKw,1)}kW ({hpRec.totalUnits}대)</div></div>}
        </div>
        {/* 계약전력 증설 */}
        {hpRec&&(<div style={{padding:"8px 10px",background:dark?"#1B2A1B":"#F0FDF4",border:`1px solid ${dark?"#006600":"#BBF7D0"}`,borderRadius:7,marginBottom:8}}>
          <div style={{display:"grid",gridTemplateColumns:hpRec.noContract?"1fr":"repeat(3,1fr)",gap:6,textAlign:"center",fontSize:12}}>
            {hpRec.noContract?(<div><span style={{color:C.sub}}>HP 총 최대소비전력: </span><b style={{color:C.warn}}>{fmt(hpRec.totalMaxPower,1)} kW</b><span style={{color:C.sub}}> (계약전력 미입력 → 이만큼 증설 필요)</span></div>)
            :(<>
              <div><div style={{color:C.sub}}>HP 최대소비전력</div><div style={{fontWeight:700,color:C.warn}}>{fmt(hpRec.totalMaxPower,1)} kW</div></div>
              <div><div style={{color:C.sub}}>여유분{hpRec.existBoilerPower>0?" (보일러감안)":""}</div><div style={{fontWeight:700,color:hpRec.spare>0?C.res:C.sub}}>{fmt(hpRec.spare,1)} kW</div>{hpRec.existBoilerPower>0&&<div style={{fontSize:10,color:C.sub}}>기본여유{fmt(parseFloat(contractPower)-parseFloat(maxDemand),1)}+보일러{fmt(hpRec.existBoilerPower,0)}</div>}</div>
              <div><div style={{color:C.sub}}>{hpRec.augment>0?"증설 필요":"증설 불필요"}</div><div style={{fontWeight:800,color:hpRec.augment>0?C.err:C.res}}>{hpRec.augment>0?`+${fmt(hpRec.augment,1)} kW`:"✅ 여유 충분"}</div></div>
            </>)}
          </div>
        </div>)}
        {/* HP 수동 조정 (혼합 구성) */}
        {hpRec&&(<div style={{padding:"8px 10px",background:hpRec.isManual?(dark?"#2A1F0A":"#FFF8E8"):(dark?"#1E293B":"#F8FAFC"),border:`1px solid ${hpRec.isManual?C.warn:C.bd}`,borderRadius:7,marginBottom:8}}>
          <div style={{fontSize:12,fontWeight:600,color:hpRec.isManual?C.warn:C.sub,marginBottom:6}}>{hpRec.isManual?"⚠️ 수동 구성 적용 중 — 자동 추천: "+hpRec.recModel?.label+"×"+hpRec.recUnits+"대":"모델·대수 수동 조정 (미입력시 자동 추천)"}</div>
          {hpManual.map(r=>(<div key={r.id} style={{display:"flex",gap:6,alignItems:"center",marginBottom:4,flexWrap:"wrap"}}>
            <select value={r.modelId} onChange={e=>updateHpRow(r.id,"modelId",e.target.value)} style={{...INP,width:145,cursor:"pointer"}}>
              <option value="">모델 선택</option>
              {HP_MODELS.filter(m=>m.maker===makerId).map(m=><option key={m.id} value={m.id}>{m.label} (COP {m.cop})</option>)}
            </select>
            <NI v={r.units} s={v=>updateHpRow(r.id,"units",v)} ph="1" st={{...INP,width:50}} sfx="대"/>
            <button onClick={()=>removeHpRow(r.id)} style={{...BTN,padding:"3px 7px",fontSize:11,background:"#FFF5F5",color:C.err,border:"1px solid #FCA5A5"}}>✕</button>
          </div>))}
          <div style={{display:"flex",gap:6,marginTop:4}}>
            <button onClick={addHpRow} style={{...BTN,padding:"4px 10px",fontSize:12,background:C.hi,color:C.acc,border:`1px solid ${C.acc}`}}>+ 모델 추가</button>
            {hpManual.length>0&&<button onClick={()=>setHpManual([])} style={{...BTN,padding:"4px 10px",fontSize:12,background:"#F3F4F6",color:C.sub,border:`1px solid ${C.bd}`}}>초기화</button>}
          </div>
          {hpRec.isManual&&hpRec.totalKw<hpR.needed*0.95&&<div style={{marginTop:6,padding:"5px 8px",background:dark?"#2A0A0A":"#FFF0F0",border:`1px solid ${C.err}`,borderRadius:5,fontSize:12,color:C.err}}>⚠️ HP 용량 부족 — 수동 구성 {fmt(hpRec.totalKw,1)}kW {"<"} 필요 {fmt(hpR.needed,1)}kW. {fmt(hpR.needed-hpRec.totalKw,1)}kW 추가가 필요합니다.</div>}
          {hpRec.overTen&&<div style={{marginTop:6,padding:"5px 8px",background:dark?"#2A0A0A":"#FFF0F0",border:`1px solid ${C.err}`,borderRadius:5,fontSize:12,color:C.err}}>⚠️ {hpRec.totalUnits}대 — 대규모 현장입니다. 별도 설계 검토를 권장합니다.</div>}
          {hpR.needed>0&&hpR.needed<5&&<div style={{marginTop:6,padding:"5px 8px",background:dark?"#2A1F0A":"#FFF8E8",border:`1px solid ${C.warn}`,borderRadius:5,fontSize:12,color:C.warn}}>💡 필요 용량 {fmt(hpR.needed,1)}kW — HP 도입보다 가정용 전기온수기가 더 경제적일 수 있습니다.</div>}
          {!hpRec.isManual&&hpRec.totalUnits===1&&hpR.needed>=5&&hpRec.totalKw>hpR.needed*1.5&&<div style={{marginTop:6,padding:"5px 8px",background:dark?"#1A3A2A":"#E8F2EC",border:`1px solid ${C.acc}`,borderRadius:5,fontSize:12,color:C.acc}}>ℹ️ 최소 모델이 필요 용량({fmt(hpR.needed,1)}kW)의 {fmt(hpRec.totalKw/hpR.needed*100,0)}% — 소형 현장에서는 여유 용량으로 안정 운전에 유리합니다.</div>}
        </div>)}
        {hpR.mode==="general"&&(<div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:5,marginBottom:8,textAlign:"center"}}>
          {[["조건A\n(기본부하)",hpR.condA],["조건B\n(피크보완)",hpR.condB],["조건C\n(재충전)",hpR.condC]].map(([lbl,val])=>{const isMx=val===Math.max(hpR.condA,hpR.condB,hpR.condC||0);return(<div key={lbl} style={{background:isMx?(dark?"#1E3A5F":"#DBEAFE"):"transparent",border:`1px solid ${isMx?C.acc:C.bd}`,borderRadius:6,padding:"5px 3px"}}><div style={{fontSize:10,color:C.sub,whiteSpace:"pre-wrap"}}>{lbl}</div><div style={{fontSize:14,fontWeight:isMx?800:500,color:isMx?C.acc:C.sub}}>{fmt(val,1)} kW</div>{isMx&&<div style={{fontSize:10,color:C.acc}}>▲ 지배</div>}</div>);})}
        </div>)}
        <div style={{marginTop:4,textAlign:"center"}}><button onClick={()=>tog("hp_detail")} style={{...BTN,padding:"3px 10px",fontSize:11,background:"transparent",color:C.acc,border:`1px solid ${C.acc}`}}>{openDet.hp_detail?"▼ 산출 근거":"▶ 산출 근거"}</button></div>
        {openDet.hp_detail&&(<div style={{marginTop:6,padding:"8px 10px",background:dark?"#0F172A":"#F8FAFC",border:`1px dashed ${C.bd}`,borderRadius:5,fontSize:11.5,color:C.sub,lineHeight:1.8}}>
          <div>A = 급탕기본부하({fmt(hwBaseLoad,1)})×1.25 + 난방부하적용({fmt(htLoad*(sc<1&&calcMode==="both"?sc:1),1)}) = <b>{fmt(hpR?.condA,1)} kW</b></div>
          {hpR?.mode==="general"&&<><div>축열조 담당부하 = {fmt(effTank,1)}톤 × {fmt(hptTank,2)}kWh/톤 ÷ {fmt(repPeakH,1)}h = <b>{fmt(hpR.tankDR||0,1)} kW</b></div>
          <div>B = max(A, 총피크({fmt(totalPeak,1)}) - 축열조 담당부하({fmt(hpR.tankDR||0,1)})) = <b>{fmt(hpR?.condB,1)} kW</b></div>
          <div>C = max(B, 기본부하({fmt(basicLoad,1)}) + 사용열량÷재충전시간) = <b>{fmt(hpR?.condC,1)} kW</b></div></>}
          <div>필요 HP = max(A,B,C) = <b>{fmt(hpR?.needed,1)} kW</b></div>
        </div>)}
        {isCDom&&<div style={{padding:"6px 9px",background:dark?"#1C1F2E":"#F0F4FF",border:`1px solid ${dark?"#4338CA":"#C7D2FE"}`,borderRadius:6,fontSize:12,color:dark?"#5CB88A":"#0F4A30",lineHeight:1.6}}>🔒 조건C(재충전) 지배 — 축열조를 더 키워도 HP 용량이 줄지 않습니다. 피크 부하 자체가 크므로, 탕 교체 시간 분산이나 피크 시간대 사용량 조정을 검토하면 HP 용량을 줄일 수 있습니다.</div>}
        {isBDom&&<div style={{padding:"6px 9px",background:dark?"#1E3A1E":"#F0FDF4",border:`1px solid ${dark?"#006600":"#BBF7D0"}`,borderRadius:6,fontSize:12,color:dark?"#86EFAC":"#006600"}}>📈 조건B(피크보완) 지배 — 축열조를 키울수록 HP 용량을 추가로 줄일 수 있습니다.</div>}
        {isBalanced&&<div style={{padding:"6px 9px",background:dark?"#0A2A1A":"#E8F8EE",border:`1px solid ${dark?"#065F46":"#A7F3D0"}`,borderRadius:6,fontSize:12,color:dark?"#6EE7B7":"#065F46"}}>⚖️ 균형 — 세 조건이 수렴했습니다. 축열조와 HP 용량이 최적 균형 상태입니다.</div>}
      </div>

      {tankSpace==="yes"&&(<div style={RBOX}>
        <div style={{fontSize:12.5,fontWeight:700,color:C.pri,marginBottom:9}}>🪣 축열조</div>
        <div style={{fontSize:12,color:C.sub,marginBottom:8}}>ΔT {parseFloat(customTankDT)||tankType.tankDT}℃ → 단위열량 {fmt(hptTank,3)} kWh/톤  |  피크시간 {fmt(repPeakH,1)}h</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,textAlign:"center",marginBottom:10}}>
          <div style={{background:dark?"#0A2A1A":"#E8F8EE",border:`1px solid ${dark?"#065F46":"#A7F3D0"}`,borderRadius:7,padding:"9px 5px"}}><div style={{fontSize:11,color:C.sub}}>최소 축열조</div><div style={{fontSize:20,fontWeight:800,color:C.res}}>{fmt(tankMin,1)}<span style={{fontSize:11}}> 톤</span></div><div style={{fontSize:10,color:C.sub}}>HP 절감 시작점</div></div>
          <div style={{background:dark?"#1A3A2A":"#E8F2EC",border:`1px solid ${dark?C.acc:"#A0C8AC"}`,borderRadius:7,padding:"9px 5px"}}><div style={{fontSize:11,color:C.sub}}>최적 축열조</div><div style={{fontSize:20,fontWeight:800,color:C.acc}}>{tankOpt!=null?fmt(tankOpt,1):"—"}<span style={{fontSize:11}}> 톤</span></div><div style={{fontSize:10,color:C.sub}}>HP 최소화 지점</div></div>
          <div style={{background:dark?"#0A2A1A":"#E8F8EE",border:`1px solid ${dark?"#065F46":"#A7F3D0"}`,borderRadius:7,padding:"9px 5px"}}><div style={{fontSize:11,color:C.sub}}>최적 HP 용량</div><div style={{fontSize:20,fontWeight:800,color:C.res}}>{hpOpt!=null?fmt(hpOpt,1):"—"}<span style={{fontSize:11}}> kW</span></div><div style={{fontSize:10,color:C.sub}}>최적 축열조 기준</div></div>
        </div>
        <div style={ROW}><span style={LBL}>기존 축열조</span><NI v={existTank} s={setExistTank} ph="0" st={{...INP,width:75}} sfx="톤"/><span style={LBL}>계획 축열조</span><NI v={newTankRaw} s={setNewTankRaw} ph="(자동)" st={{...INP,width:75}} sfx="톤"/></div>
        {enteredTank>0&&<div style={{fontSize:12,color:C.acc,marginTop:4}}>입력 축열조 {fmt(enteredTank,1)}톤 기준으로 HP 용량 계산됨</div>}
        {tankAutoApplied&&<div style={{fontSize:12,color:C.res,marginTop:4}}>✅ 최적 축열조 {fmt(tankOptCalc,1)}톤 자동 적용됨 (직접 입력하면 해당 값 우선)</div>}
        {!tankAutoApplied&&enteredTank>0&&tankMin>0&&enteredTank<tankMin&&<div style={{fontSize:12,color:C.err,marginTop:4,padding:"5px 8px",background:dark?"#2A0A0A":"#FFF0F0",border:`1px solid ${C.err}`,borderRadius:5}}>⚠️ 입력 축열조 {fmt(enteredTank,1)}톤이 최소 {fmt(tankMin,1)}톤보다 부족합니다. 축열조 증설을 검토하세요.</div>}
        {!tankAutoApplied&&enteredTank>0&&tankOpt!=null&&enteredTank>tankOpt*3&&enteredTank>tankOpt+10&&(()=>{
          const chgHeat=enteredTank*1.163*(hpTemp-srcT);
          const hpOut=hpRec?hpRec.totalKw:0;
          const surplus=Math.max(1,hpOut-basicLoad);
          const chgH=chgHeat/surplus;
          return(<div style={{fontSize:12,color:C.warn,marginTop:4,padding:"5px 8px",background:dark?"#2A1F0A":"#FFF8E8",border:`1px solid ${C.warn}`,borderRadius:5}}>⚠️ 입력 축열조 {fmt(enteredTank,1)}톤은 최적({fmt(tankOpt,1)}톤)의 {fmt(enteredTank/tankOpt,1)}배입니다. 초기 충전 약 <b>{chgH<48?fmt(chgH,1)+"시간":fmt(chgH/24,1)+"일"}</b> 소요 (기본부하 차감 기준). 축열조 비용 대비 HP 절감 효과가 동일하므로 비경제적입니다.</div>);
        })()}
      </div>)}
      {tankSpace==="no"&&<div style={{padding:"9px 12px",background:"#FEF2F2",border:"1px solid #FCA5A5",borderRadius:8,fontSize:12.5,color:C.err}}>❌ 축열조 불가 → HP 단독 총 피크부하 전체 담당 (+10% 여유)</div>}
    </>)}

    {elecType==="night"&&nightR&&(<div style={{...RBOX,border:`1px solid ${dark?"#1A7A7A":"#A0D4D4"}`,background:dark?"#1C1530":"#FAF5FF"}}>
      <div style={{fontSize:12.5,fontWeight:700,color:dark?"#7ABFBF":"#1A7A7A",marginBottom:9}}>⚡ 히트펌프 (심야전기)</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
        <div style={{textAlign:"center",background:dark?"#2D1B4E":"#F0FAFA",border:`1px solid ${dark?"#1A7A7A":"#A0D4D4"}`,borderRadius:7,padding:"9px 5px"}}><div style={{fontSize:11,color:C.sub}}>심야 HP 구성</div><div style={{fontSize:20,fontWeight:800,color:dark?"#7ABFBF":"#1A7A7A"}}>{nightR.nightUnits}대</div><div style={{fontSize:11,color:C.sub}}>{nightR.nm.label} × {nightR.nightUnits} = {fmt(nightR.nightKwTotal,1)}kW</div><div style={{fontSize:10,color:C.sub}}>소비 {fmt(nightR.nm.maxPower*nightR.nightUnits,1)}kW / 계약 {nightR.nContract||"미입력"}kW</div></div>
        <div style={{textAlign:"center",background:dark?"#2D1B4E":"#F0FAFA",border:`1px solid ${dark?"#1A7A7A":"#A0D4D4"}`,borderRadius:7,padding:"9px 5px"}}><div style={{fontSize:11,color:C.sub}}>심야 생산가능 ({nightR.nOpH}h)</div><div style={{fontSize:20,fontWeight:800,color:dark?"#7ABFBF":"#1A7A7A"}}>{fmt(nightR.nightProduction,1)}<span style={{fontSize:11}}> kWh</span></div></div>
      </div>
      <div style={{padding:"7px 10px",background:nightR.sufficient?(dark?"#0A2A1A":"#E8F8EE"):(dark?"#2A0A0A":"#FFF0F0"),border:`1px solid ${nightR.sufficient?C.res:C.err}`,borderRadius:6,fontSize:12.5,marginBottom:8}}>
        일일 총 열량: <b>{fmt(nightR.dailyTotal,1)} kWh</b> &nbsp;|&nbsp;
        {nightR.sufficient?<span style={{color:C.res,fontWeight:700}}>✅ 심야만으로 전부 충당 가능</span>:<span style={{color:C.err,fontWeight:700}}>⚠️ 부족 {fmt(nightR.shortage,1)} kWh — 보조설비 필요</span>}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
        <div style={{textAlign:"center"}}><div style={{fontSize:11,color:C.sub}}>축열조 용량</div><div style={{fontSize:22,fontWeight:800,color:dark?"#7ABFBF":"#1A7A7A"}}>{fmt(nightR.nightTank,1)}<span style={{fontSize:12}}> 톤</span></div><div style={{fontSize:10,color:C.sub}}>ΔT {nightR.nightDT}℃ 기준</div></div>
        {!nightR.sufficient&&<div style={{textAlign:"center",background:dark?"#2A0A0A":"#FFF0F0",border:`1px solid ${C.err}`,borderRadius:7,padding:"9px 5px"}}><div style={{fontSize:11,color:C.sub}}>보조설비 필요 열량</div><div style={{fontSize:22,fontWeight:800,color:C.err}}>{fmt(nightR.shortage,1)}<span style={{fontSize:11}}> kWh/일</span></div></div>}
      </div>
    </div>)}
  </div>)}
</>)}

{/* ══ TAB 3: 검증 ══ */}
{tab==="verify"&&(<>
  <div style={SEC}>
    <div style={SECH}>🔍 기존 보일러 데이터 검증</div>
    <div style={{fontSize:12.5,color:C.sub,marginBottom:14,lineHeight:1.6}}>
      기존 보일러의 연료 사용 데이터를 입력하면, 계산기 산출값과 비교하여 용량 산정의 합리성을 확인합니다.
      급탕+난방 겸용 보일러는 <b>여름철(6~9월) 데이터</b>로 급탕분을 분리합니다.
      <b>전기보일러</b>의 경우, 기저부하(조명·냉방 등)를 제외한 순수 보일러 사용분만 입력해야 합니다.
    </div>
    {dailyHeatWithLoss===0&&dailyPoolOnly===0&&(
      <div style={{padding:"14px 16px",background:dark?"#2A1F0A":"#FFF8E8",border:`1px solid ${dark?"#92400E":"#FDE68A"}`,borderRadius:8,marginBottom:14}}>
        <div style={{fontSize:13,color:C.warn,fontWeight:700}}>⚠️ 용량 산정 탭에서 부하를 먼저 입력하세요</div>
        <div style={{fontSize:12,color:C.sub,marginTop:4}}>비교할 계산기 값이 없으면 검증이 불가능합니다.</div>
        <button onClick={()=>setTab("calc")} style={{...BTN,marginTop:8,background:C.acc,color:"#fff",padding:"7px 14px"}}>📐 용량산정으로</button>
      </div>
    )}
    <button onClick={addBoiler} style={{...BTN,background:C.acc,color:"#fff",padding:"9px 18px",marginBottom:14}}>+ 보일러 추가</button>

    {vBoilers.map((b,bi)=>{
      const fuel=BOILER_FUELS.find(f=>f.id===b.fuelType);
      const vr=vResults.find(r=>r.boilerId===b.id);
      const hasMonthData=b.monthlyData.some(md=>parseFloat(md.usage)>0);
      return(
        <div key={b.id} style={{background:dark?"#1E293B":"#FAFBFF",border:`1px solid ${C.bd}`,borderRadius:10,padding:"14px 16px",marginBottom:14}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
            <input value={b.name} onChange={e=>updateBoiler(b.id,"name",e.target.value)} style={{...IST,fontSize:14,fontWeight:700,color:C.pri,width:200,background:"transparent",border:"none",borderBottom:`1px dashed ${C.bd}`,borderRadius:0,padding:"2px 4px"}} placeholder="보일러명"/>
            <button onClick={()=>removeBoiler(b.id)} style={{...BTN,padding:"4px 10px",fontSize:12,background:"#FFF5F5",color:C.err,border:"1px solid #FCA5A5"}}>삭제</button>
          </div>

          {/* 기본 정보 */}
          <div style={ROW}>
            <span style={{...LBL,minWidth:70}}>연료</span>
            <select value={b.fuelType} onChange={e=>updateBoiler(b.id,"fuelType",e.target.value)} style={{...SEL,width:150}}>
              {BOILER_FUELS.map(f=><option key={f.id} value={f.id}>{f.label}</option>)}
            </select>
          </div>
          <div style={ROW}>
            <span style={{...LBL,minWidth:70}}>용도</span>
            <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
              {BOILER_PURPOSES.map(p=>(<button key={p.id} onClick={()=>updateBoiler(b.id,"purpose",p.id)} style={{...BTN,padding:"5px 10px",fontSize:12,background:b.purpose===p.id?C.acc:"transparent",color:b.purpose===p.id?"#fff":C.sub,border:`1.5px solid ${b.purpose===p.id?C.acc:C.bd}`}}>{p.label}</button>))}
            </div>
          </div>
          <div style={ROW}>
            <span style={{...LBL,minWidth:70}}>명판 용량</span>
            <NI v={b.capacity} s={v=>updateBoiler(b.id,"capacity",v)} ph="100" st={{...INP,width:80}} sfx="kW"/>
            <span style={{...LBL,minWidth:50}}>효율</span>
            <NI v={b.efficiency} s={v=>updateBoiler(b.id,"efficiency",v)} ph={String(fuel?.defEff||85)} st={{...INP,width:60}} sfx="%"/>
            {!b.efficiency&&<span style={{fontSize:11,color:C.sub}}>기본 {fuel?.defEff}%</span>}
          </div>

          {/* 월별 데이터 입력 */}
          <div style={{marginTop:12,padding:"10px 12px",background:dark?"#0F172A":"#F8FAFC",border:`1px solid ${C.bd}`,borderRadius:8}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10,flexWrap:"wrap"}}>
              <span style={{fontSize:13,fontWeight:700,color:C.pri}}>📅 월별 연료 사용량</span>
              <span style={{fontSize:12,color:C.sub}}>시작:</span>
              <select value={b.startYear} onChange={e=>{updateBoiler(b.id,"startYear",e.target.value);}} style={{...SEL,width:90}}>
                {[2020,2021,2022,2023,2024,2025,2026].map(y=><option key={y} value={String(y)}>{y}년</option>)}
              </select>
              <select value={b.startMonth} onChange={e=>{updateBoiler(b.id,"startMonth",e.target.value);}} style={{...SEL,width:75}}>
                {Array.from({length:12},(_,i)=><option key={i+1} value={String(i+1)}>{i+1}월</option>)}
              </select>
              <button onClick={()=>initMonths(b.id)} style={{...BTN,padding:"5px 10px",fontSize:12,background:C.hi,color:C.acc,border:`1px solid ${C.acc}`}}>12개월 생성</button>
              
            </div>
            
              <div style={{overflowX:"auto"}} onPaste={e=>{
                e.preventDefault();
                const txt=(e.clipboardData||window.clipboardData).getData("text");
                const rows=txt.trim().split("\n").map(r=>r.split("\t").map(c=>c.replace(/,/g,"").trim()));
                if(rows.length<2)return;
                setVBoilers(p=>p.map(bl=>{
                  if(bl.id!==b.id)return bl;
                  const md=rows.filter(r=>r.length>=2&&r[0]).map(r=>{
                    const ym=r[0].match(/(\d{4})\D*(\d{1,2})/);
                    return{year:ym?parseInt(ym[1]):0,month:ym?parseInt(ym[2]):0,
                      contractKw:r[1]||"",usage:r[2]||"",usageDays:r[3]||"",cost:r[4]||""};
                  }).filter(r=>r.year>0);
                  return md.length>0?{...bl,monthlyData:md}:bl;
                }));
              }}>
              <div style={{fontSize:11,color:C.sub,marginBottom:4,padding:"4px 8px",background:dark?"#1E293B":"#F8FAFC",borderRadius:4}}>💡 파워플래너 표를 선택 후 Ctrl+V로 붙여넣기 가능 (연월·계약전력·사용전력량·사용일수·전기요금)</div>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                <thead>
                  <tr style={{background:dark?"#1E293B":"#EFF6FF"}}>
                    <th style={{padding:"6px 8px",textAlign:"left",color:C.sub,fontWeight:600,borderBottom:`1px solid ${C.bd}`}}>연월</th>
                    <th style={{padding:"6px 8px",textAlign:"right",color:C.sub,fontWeight:600,borderBottom:`1px solid ${C.bd}`}}>계약kW</th>
                    <th style={{padding:"6px 8px",textAlign:"right",color:C.sub,fontWeight:600,borderBottom:`1px solid ${C.bd}`}}>사용량 ({fuel?.unit})</th>
                    <th style={{padding:"6px 8px",textAlign:"right",color:C.sub,fontWeight:600,borderBottom:`1px solid ${C.bd}`}}>일수</th>
                    <th style={{padding:"6px 8px",textAlign:"right",color:C.sub,fontWeight:600,borderBottom:`1px solid ${C.bd}`}}>비용 (원)</th>
                    <th style={{padding:"6px 8px",textAlign:"right",color:C.sub,fontWeight:600,borderBottom:`1px solid ${C.bd}`}}>역산 열량</th>
                  </tr>
                </thead>
                <tbody>
                  {b.monthlyData.map((md,mi)=>{
                    const heat=vr?.monthlyHeats?.[mi]||0;
                    const mo=md.year?`${md.year}.${String(md.month).padStart(2,"0")}`:`${mi+1}월`;
                    const isSummer=md.month&&[6,7,8,9].includes(parseInt(md.month));
                    return(
                      <tr key={mi} style={{background:isSummer?(dark?"#1B2A1B":"#F0FFF4"):"transparent"}}>
                        <td style={{padding:"4px 8px",borderBottom:`1px solid ${C.bd}`,color:C.txt,fontWeight:isSummer?700:400}}>
                          {mo}{isSummer&&<span style={{fontSize:10,color:C.res,marginLeft:4}}>여름</span>}
                        </td>
                        <td style={{padding:"4px 4px",borderBottom:`1px solid ${C.bd}`,textAlign:"right"}}>
                          <span style={{fontSize:11,color:C.sub}}>{md.contractKw||"—"}</span>
                        </td>
                        <td style={{padding:"4px 4px",borderBottom:`1px solid ${C.bd}`,textAlign:"right"}}>
                          <NI v={md.usage} s={v=>updateBoilerMonth(b.id,mi,"usage",v)} ph="0" st={{...INP,width:75,textAlign:"right",fontSize:12}}/>
                        </td>
                        <td style={{padding:"4px 4px",borderBottom:`1px solid ${C.bd}`,textAlign:"right"}}>
                          <span style={{fontSize:11,color:C.sub}}>{md.usageDays||"—"}</span>
                        </td>
                        <td style={{padding:"4px 4px",borderBottom:`1px solid ${C.bd}`,textAlign:"right"}}>
                          <NI v={md.cost} s={v=>updateBoilerMonth(b.id,mi,"cost",v)} ph="0" st={{...INP,width:85,textAlign:"right",fontSize:12}}/>
                        </td>
                        <td style={{padding:"4px 8px",borderBottom:`1px solid ${C.bd}`,textAlign:"right",color:heat>0?C.acc:C.sub,fontWeight:heat>0?600:400}}>
                          {heat>0?`${fmt(heat,0)} kWh`:"—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* 검증 결과 */}
          {vr&&hasMonthData&&(<div style={{marginTop:12}}>
            <div style={{fontSize:13,fontWeight:700,color:C.pri,marginBottom:8}}>📊 검증 결과</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:8,marginBottom:10}}>
              <div style={{background:dark?"#132A1E":"#E8F2EC",border:`1px solid ${dark?"#2E5A40":"#A0C8AC"}`,borderRadius:7,padding:"10px",textAlign:"center"}}>
                <div style={{fontSize:11,color:C.sub}}>연료 역산 일일 열부하</div>
                <div style={{fontSize:11,color:C.sub,marginBottom:4}}>({vr.method})</div>
                <div style={{fontSize:22,fontWeight:800,color:dark?"#5CB88A":"#0F4A30"}}>{fmt(vr.dailyHeatFromFuel,1)}</div>
                <div style={{fontSize:11}}>kWh/일</div>
              </div>
              <div style={{background:dark?"#1A3A2A":"#E8F2EC",border:`1px solid ${dark?C.acc:"#A0C8AC"}`,borderRadius:7,padding:"10px",textAlign:"center"}}>
                <div style={{fontSize:11,color:C.sub}}>계산기 산출 ({vr.compTarget})</div>
                <div style={{fontSize:11,color:C.sub,marginBottom:4}}>&nbsp;</div>
                <div style={{fontSize:22,fontWeight:800,color:C.acc}}>{vr.calcDailyHeat>0?fmt(vr.calcDailyHeat,1):"—"}</div>
                <div style={{fontSize:11}}>kWh/일</div>
              </div>
            </div>

            {/* 차이율 */}
            {vr.diff!==null&&(<div style={{
              padding:"10px 14px",textAlign:"center",borderRadius:8,
              background:Math.abs(vr.diff)<=30?(dark?"#0A2A1A":"#E8F8EE"):Math.abs(vr.diff)<=50?(dark?"#2A1F0A":"#FFF8E8"):(dark?"#2A0A0A":"#FFF0F0"),
              border:`1px solid ${Math.abs(vr.diff)<=30?C.res:Math.abs(vr.diff)<=50?C.warn:C.err}`,
            }}>
              <div style={{fontSize:12,color:C.sub,marginBottom:4}}>차이율</div>
              <div style={{fontSize:28,fontWeight:800,color:Math.abs(vr.diff)<=30?C.res:Math.abs(vr.diff)<=50?C.warn:C.err}}>
                {vr.diff>=0?"+":""}{fmt(vr.diff,1)}%
              </div>
              <div style={{fontSize:12,marginTop:4,color:C.sub}}>
                {Math.abs(vr.diff)<=30?"같은 규모 — 계산기 입력값이 현장 데이터와 부합합니다"
                :Math.abs(vr.diff)<=50?"편차 있음 — 입력값 재확인을 권장합니다"
                :"큰 편차 — 현장 조건 또는 입력값을 재검토하세요"}
              </div>
            </div>)}

            {vr.calcDailyHeat===0&&b.purpose!=="heating"&&(
              <div style={{padding:"8px 12px",background:dark?"#2A1F0A":"#FFF8E8",border:`1px solid ${C.warn}`,borderRadius:7,fontSize:12,color:C.warn}}>
                계산기에 {vr.compTarget} 부하가 입력되지 않아 비교할 수 없습니다. 용량 산정 탭에서 해당 설비를 추가하세요.
              </div>
            )}
            {b.purpose==="heating"&&R.monthlyHtHeat===0&&(
              <div style={{padding:"8px 12px",background:dark?"#132A1E":"#E8F2EC",border:`1px solid ${dark?"#2E5A40":"#A0C8AC"}`,borderRadius:7,fontSize:12,color:dark?"#5CB88A":"#0F4A30"}}>
                난방 전용 보일러 — 용량 산정 탭에서 난방 면적을 입력하면 비교가 가능합니다.
              </div>
            )}
            {/* 급탕+난방 난방분 추가 비교 */}
            {vr.htDiff!==null&&(
              <div style={{marginTop:8,padding:"10px 14px",borderRadius:8,background:Math.abs(vr.htDiff)<=30?(dark?"#0A2A1A":"#E8F8EE"):Math.abs(vr.htDiff)<=50?(dark?"#2A1F0A":"#FFF8E8"):(dark?"#2A0A0A":"#FFF0F0"),border:`1px solid ${Math.abs(vr.htDiff)<=30?C.res:Math.abs(vr.htDiff)<=50?C.warn:C.err}`}}>
                <div style={{fontSize:12,color:C.sub,marginBottom:4}}>난방분 추가 비교 ({vr.htMethod})</div>
                <div style={{display:"flex",justifyContent:"space-around",textAlign:"center"}}>
                  <div><div style={{fontSize:11,color:C.sub}}>역산 난방분</div><div style={{fontSize:16,fontWeight:700}}>{fmt(vr.htDailyFromFuel,1)} kWh/일</div></div>
                  <div><div style={{fontSize:11,color:C.sub}}>계산기 난방</div><div style={{fontSize:16,fontWeight:700}}>{fmt(vr.htCalcDaily,1)} kWh/일</div></div>
                  <div><div style={{fontSize:11,color:C.sub}}>차이</div><div style={{fontSize:16,fontWeight:700,color:Math.abs(vr.htDiff)<=30?C.res:Math.abs(vr.htDiff)<=50?C.warn:C.err}}>{vr.htDiff>=0?"+":""}{fmt(vr.htDiff,1)}%</div></div>
                </div>
                <div style={{fontSize:11,color:C.sub,marginTop:4}}>※ 여름 급탕량이 계절에 따라 다를 수 있어 참고용으로 활용</div>
              </div>
            )}

            {/* 상세 통계 */}
            <div style={{marginTop:10,padding:"8px 10px",background:dark?"#0F172A":"#F8FAFC",border:`1px solid ${C.bd}`,borderRadius:6}}>
              <div style={{fontSize:12,fontWeight:600,color:C.sub,marginBottom:6}}>상세 통계</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:6,fontSize:12}}>
                <div><span style={{color:C.sub}}>연평균 월열량:</span> <b style={{color:C.txt}}>{fmt(vr.annualAvg,0)} kWh</b></div>
                <div><span style={{color:C.sub}}>여름 평균:</span> <b style={{color:C.res}}>{vr.summerAvg>0?`${fmt(vr.summerAvg,0)} kWh`:"데이터 없음"}</b></div>
                <div><span style={{color:C.sub}}>봄가을 평균:</span> <b style={{color:C.txt}}>{vr.springFallAvg>0?`${fmt(vr.springFallAvg,0)} kWh`:"데이터 없음"}</b></div>
                <div><span style={{color:C.sub}}>겨울 평균:</span> <b style={{color:C.txt}}>{vr.winterAvg>0?`${fmt(vr.winterAvg,0)} kWh`:"데이터 없음"}</b></div>
              </div>
              <div style={{marginTop:6,fontSize:12,color:C.sub}}>
                적용 효율: {((vr.eff)*100).toFixed(0)}% · 발열량: {fuel?.heat} kWh/{fuel?.unit}
              </div>
            </div>
          </div>)}
        </div>
      );
    })}
  </div>
</>)}

{/* ══ TAB 4: 경제성 ══ */}
{tab==="econ"&&(<>
  {totalMonthly===0?(
    <div style={{...SEC,textAlign:"center",padding:32,color:C.sub}}>
      <div style={{fontSize:28,marginBottom:8}}>💡</div>
      <div>용량 산정 탭에서 부하를 먼저 입력하세요.</div>
      <button onClick={()=>setTab("calc")} style={{...BTN,marginTop:12,background:C.acc,color:"#fff",padding:"8px 18px"}}>📐 용량산정으로</button>
    </div>
  ):(<>
    <div style={SEC}>
      <div style={SECH}>💰 경제성 분석</div>
      <div style={{background:dark?"#1A3A2A":"#E8F2EC",border:`1px solid ${dark?C.acc:"#A0C8AC"}`,borderRadius:7,padding:"9px 12px",marginBottom:14,fontSize:12.5}}>
        월 총 열부하 <b>{fmt0(totalMonthly)}kWh/월</b> · 적용 COP <b>{fmt(effCOP2,2)}</b> · 월 전력소비 <b>{fmt0(monthlyElec)}kWh/월</b>
      </div>
      <div style={{fontSize:13.5,fontWeight:700,color:C.pri,marginBottom:10}}>기존 연료</div>
      {vBoilers.length>0&&(()=>{
        const hwBoiler=vBoilers.find(b=>b.purpose==="hotwater"||b.purpose==="hotwater_heating");
        if(!hwBoiler)return null;
        const vr=vResults.find(r=>r.boilerId===hwBoiler.id);
        const validMonths=hwBoiler.monthlyData.filter(md=>parseFloat(md.usage)>0);
        const avgUsage=validMonths.length>0?(validMonths.reduce((s,md)=>s+parseFloat(md.usage),0)/validMonths.length):0;
        const avgCost=validMonths.length>0?(validMonths.reduce((s,md)=>s+(parseFloat(md.cost)||0),0)/validMonths.length):0;
        const avgPrice=avgUsage>0&&avgCost>0?(avgCost/avgUsage):0;
        if(avgUsage===0)return null;
        return(<div style={{padding:"8px 12px",background:dark?"#1B2A1B":"#F0FDF4",border:`1px solid ${dark?"#006600":"#BBF7D0"}`,borderRadius:7,marginBottom:10}}>
          <div style={{fontSize:12,fontWeight:600,color:dark?"#86EFAC":"#006600",marginBottom:6}}>📋 검증 탭 데이터 감지 — {hwBoiler.name}</div>
          <div style={{fontSize:12,color:C.sub,marginBottom:6}}>월평균: {fmt(avgUsage,1)} {BOILER_FUELS.find(f=>f.id===hwBoiler.fuelType)?.unit}/월{avgPrice>0?` · 추정단가: ${fmt(avgPrice,0)}원`:""}</div>
          <button onClick={()=>{setFuelId(hwBoiler.fuelType);setFuelMon(String(Math.round(avgUsage)));if(avgPrice>0)setFuelPrc(String(Math.round(avgPrice)));}} style={{...BTN,padding:"5px 12px",fontSize:12,background:dark?"#006600":"#2E7A4A",color:"#fff"}}>경제성 탭에 적용</button>
        </div>);
      })()}
      <div style={ROW}><span style={LBL}>연료 종류</span><select value={fuelId} onChange={e=>setFuelId(e.target.value)} style={{...SEL,width:140}}>{[["lpg","LPG"],["lng","LNG(도시가스)"],["kerosene","등유"],["electric","전기보일러"]].map(([id,lbl])=><option key={id} value={id}>{lbl}</option>)}</select></div>
      <div style={ROW}><span style={LBL}>월 사용량</span><NI v={fuelMon} s={setFuelMon} ph="0" st={{...INP,width:98}} sfx={fuelId==="electric"?"kWh/월":"단위/월"}/></div>
      <div style={ROW}><span style={LBL}>연료 단가</span><NI v={fuelPrc} s={setFuelPrc} ph="1200" st={{...INP,width:98}} sfx="원/단위"/></div>
      <div style={{fontSize:13.5,fontWeight:700,color:C.pri,marginBottom:10,marginTop:14}}>HP 전기 요금</div>
      <div style={ROW}><span style={LBL}>주간 단가</span><NI v={dayRate} s={setDayRate} ph="120" st={{...INP,width:88}} sfx="원/kWh"/></div>
      <div style={ROW}><span style={LBL}>HP 설치비</span><NI v={instCost} s={setInstCost} ph="0" st={{...INP,width:98}} sfx="만원"/></div>
    </div>
    <div style={SEC}>
      <div style={SECH}>📊 결과</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9,marginBottom:9}}>
        <div style={{...RBOX,textAlign:"center"}}><div style={{fontSize:11,color:C.sub}}>HP 월 운영비</div><div style={{fontSize:28,fontWeight:800,color:C.acc}}>{fmt0(elecCost)}</div><div style={{fontSize:11}}>원/월</div></div>
        {curCost>0&&<div style={{background:dark?"#2A1F0A":"#FFF8E8",border:`1px solid ${dark?"#92400E":"#FDE68A"}`,borderRadius:8,padding:"12px 14px",textAlign:"center"}}><div style={{fontSize:11,color:C.sub}}>현재 연료비</div><div style={{fontSize:28,fontWeight:800,color:C.warn}}>{fmt0(curCost)}</div><div style={{fontSize:11}}>원/월</div></div>}
      </div>
      {curCost>0&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9}}>
        <div style={{background:savings>0?(dark?"#0A2A1A":"#E8F8EE"):(dark?"#2A0A0A":"#FFF0F0"),border:`1px solid ${savings>0?C.res:C.err}`,borderRadius:8,padding:"12px 14px",textAlign:"center"}}><div style={{fontSize:11,color:C.sub}}>월 절감</div><div style={{fontSize:28,fontWeight:800,color:savings>0?C.res:C.err}}>{savings>=0?"+":""}{fmt0(savings)}</div><div style={{fontSize:11}}>원/월</div></div>
        {payback&&<div style={{...RBOX,textAlign:"center"}}><div style={{fontSize:11,color:C.sub}}>투자회수</div><div style={{fontSize:34,fontWeight:800,color:C.res}}>{payback.toFixed(1)}</div><div style={{fontSize:11}}>년</div></div>}
      </div>}
    </div>
  </>)}
</>)}

{/* ══ TAB 5: 작성 기록 ══ */}
{tab==="history"&&(<>
  <div style={SEC}>
    <div style={{...SECH,justifyContent:"space-between"}}>
      <span>📜 작성 기록</span>
      <div style={{display:"flex",gap:6}}>
        <button onClick={()=>{
          const filtered=history.filter(h=>{
            if(histSearch&&!(h.project_name||"").includes(histSearch)&&!(h.editor||"").includes(histSearch))return false;
            if(histEditor&&h.editor!==histEditor)return false;
            if(histDateFrom&&h.created_at&&new Date(h.created_at)<new Date(histDateFrom))return false;
            if(histDateTo&&h.created_at&&new Date(h.created_at)>new Date(histDateTo+"T23:59:59"))return false;
            return true;
          });
          if(filtered.length===0){alert("다운로드할 기록이 없습니다.");return;}
          let csv="\uFEFF날짜,시간,프로젝트명,작성자,활동\n";
          filtered.forEach(h=>{
            const dt=h.created_at?new Date(h.created_at):null;
            const d=dt?dt.toLocaleDateString("ko-KR"):"";
            const t=dt?dt.toLocaleTimeString("ko-KR"):"";
            csv+=`"${d}","${t}","${(h.project_name||"").replace(/"/g,'""')}","${(h.editor||"").replace(/"/g,'""')}","${(h.action||"").replace(/"/g,'""')}"\n`;
          });
          const blob=new Blob([csv],{type:"text/csv;charset=utf-8;"});
          const url=URL.createObjectURL(blob);
          const a=document.createElement("a");a.href=url;a.download=`작성기록_${new Date().toISOString().slice(0,10)}.csv`;a.click();URL.revokeObjectURL(url);
        }} style={{...BTN,padding:"5px 12px",fontSize:12,background:C.hi,color:C.acc,border:`1px solid ${C.acc}`}}>📥 엑셀 다운로드</button>
        <button onClick={fetchHistory} style={{...BTN,padding:"5px 12px",fontSize:12,background:C.hi,color:C.acc,border:`1px solid ${C.acc}`}}>새로고침</button>
      </div>
    </div>

    {/* 필터 영역 */}
    <div style={{display:"flex",gap:8,marginBottom:10,flexWrap:"wrap",alignItems:"center"}}>
      <input value={histSearch} onChange={e=>{setHistSearch(e.target.value);setHistPage(1);}} placeholder="프로젝트명 검색" style={{...IST,flex:1,minWidth:140,boxSizing:"border-box"}}/>
      <select value={histEditor} onChange={e=>{setHistEditor(e.target.value);setHistPage(1);}} style={{...IST,width:130}}>
        <option value="">전체 담당자</option>
        {[...new Set(history.map(h=>h.editor).filter(Boolean))].sort().map(e=><option key={e} value={e}>{e}</option>)}
      </select>
      <div style={{display:"flex",alignItems:"center",gap:4}}>
        <input type="date" value={histDateFrom} onChange={e=>{setHistDateFrom(e.target.value);setHistPage(1);}} style={{...IST,width:130,fontSize:12}}/>
        <span style={{color:C.sub,fontSize:12}}>~</span>
        <input type="date" value={histDateTo} onChange={e=>{setHistDateTo(e.target.value);setHistPage(1);}} style={{...IST,width:130,fontSize:12}}/>
      </div>
      {(histSearch||histEditor||histDateFrom||histDateTo)&&<button onClick={()=>{setHistSearch("");setHistEditor("");setHistDateFrom("");setHistDateTo("");setHistPage(1);}} style={{...BTN,padding:"4px 10px",fontSize:12,background:"#F3F4F6",color:C.sub,border:`1px solid ${C.bd}`}}>초기화</button>}
    </div>

    {(()=>{
      const filtered=history.filter(h=>{
        if(histSearch&&!(h.project_name||"").includes(histSearch)&&!(h.editor||"").includes(histSearch))return false;
        if(histEditor&&h.editor!==histEditor)return false;
        if(histDateFrom&&h.created_at&&new Date(h.created_at)<new Date(histDateFrom))return false;
        if(histDateTo&&h.created_at&&new Date(h.created_at)>new Date(histDateTo+"T23:59:59"))return false;
        return true;
      });
      const totalPages=Math.max(1,Math.ceil(filtered.length/HIST_PER_PAGE));
      const page=Math.min(histPage,totalPages);
      const paged=filtered.slice((page-1)*HIST_PER_PAGE,page*HIST_PER_PAGE);

      if(filtered.length===0)return<div style={{textAlign:"center",padding:"28px 0",color:C.sub}}>기록이 없습니다.</div>;
      return(<>
        <div style={{fontSize:12,color:C.sub,marginBottom:8}}>총 {filtered.length}건 (페이지 {page}/{totalPages})</div>
        {paged.map(h=>(
          <div key={h.id} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 13px",borderRadius:8,border:`1px solid ${C.bd}`,marginBottom:6,background:dark?"#132A1E":"#FAFBFF"}}>
            {h.editor_avatar
              ?<img src={h.editor_avatar} style={{width:30,height:30,borderRadius:"50%",objectFit:"cover",flexShrink:0}} alt=""/>
              :<div style={{width:30,height:30,borderRadius:"50%",background:C.acc,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:13,fontWeight:700,flexShrink:0}}>{(h.editor||"?")[0]}</div>}
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:13.5,fontWeight:700,color:C.pri,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{h.project_name||"(프로젝트 없음)"}</div>
              <div style={{fontSize:12,color:C.sub,marginTop:2}}><span style={{fontWeight:600,color:C.txt}}>{h.editor||"(미지정)"}</span> · {h.action}</div>
            </div>
            <div style={{fontSize:11,color:C.sub,flexShrink:0,textAlign:"right",lineHeight:1.4}}>
              {h.created_at?new Date(h.created_at).toLocaleString("ko-KR"):""}
              {isAdmin&&<button onClick={async()=>{if(!window.confirm("이 기록을 삭제하시겠습니까?"))return;try{await supabase.from("history").delete().eq("id",h.id);setHistory(prev=>prev.filter(x=>x.id!==h.id));}catch(e){alert("삭제 실패");}}} style={{...BTN,padding:"2px 6px",fontSize:10,background:"#FFF0F0",color:C.err,border:`1px solid ${C.err}`,marginTop:3,display:"block"}}>삭제</button>}
            </div>
          </div>
        ))}
        {/* 페이지네이션 */}
        {totalPages>1&&(<div style={{display:"flex",justifyContent:"center",alignItems:"center",gap:4,marginTop:12,flexWrap:"wrap"}}>
          <button onClick={()=>setHistPage(1)} disabled={page===1} style={{...BTN,padding:"5px 10px",fontSize:12,background:page===1?"transparent":C.hi,color:page===1?C.sub:C.acc,border:`1px solid ${page===1?C.bd:C.acc}`,opacity:page===1?.5:1}}>«</button>
          <button onClick={()=>setHistPage(Math.max(1,page-1))} disabled={page===1} style={{...BTN,padding:"5px 10px",fontSize:12,background:page===1?"transparent":C.hi,color:page===1?C.sub:C.acc,border:`1px solid ${page===1?C.bd:C.acc}`,opacity:page===1?.5:1}}>‹</button>
          {Array.from({length:Math.min(5,totalPages)},(_,i)=>{
            let p;
            if(totalPages<=5)p=i+1;
            else if(page<=3)p=i+1;
            else if(page>=totalPages-2)p=totalPages-4+i;
            else p=page-2+i;
            return<button key={p} onClick={()=>setHistPage(p)} style={{...BTN,padding:"5px 12px",fontSize:12,fontWeight:p===page?700:400,background:p===page?C.acc:"transparent",color:p===page?"#fff":C.sub,border:`1px solid ${p===page?C.acc:C.bd}`}}>{p}</button>;
          })}
          <button onClick={()=>setHistPage(Math.min(totalPages,page+1))} disabled={page===totalPages} style={{...BTN,padding:"5px 10px",fontSize:12,background:page===totalPages?"transparent":C.hi,color:page===totalPages?C.sub:C.acc,border:`1px solid ${page===totalPages?C.bd:C.acc}`,opacity:page===totalPages?.5:1}}>›</button>
          <button onClick={()=>setHistPage(totalPages)} disabled={page===totalPages} style={{...BTN,padding:"5px 10px",fontSize:12,background:page===totalPages?"transparent":C.hi,color:page===totalPages?C.sub:C.acc,border:`1px solid ${page===totalPages?C.bd:C.acc}`,opacity:page===totalPages?.5:1}}>»</button>
        </div>)}
      </>);
    })()}
  </div>
</>)}

    </div>
  </div>
);
}
