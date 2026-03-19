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
        <div style={{fontSize:22,fontWeight:800,color:C.pri,marginBottom:8}}>히트펌프 용량 산정 시스템 v1.1 (2026.03.19)</div>
        <div style={{fontSize:13,color:C.sub,marginBottom:32,lineHeight:1.6}}>팀원 전용 서비스입니다.<br/>Slack 계정으로 로그인해주세요.</div>
        <button onClick={signInWithSlack} style={{...BTN,background:"#4A154B",color:"#fff",padding:"15px 24px",fontSize:15,width:"100%",display:"flex",alignItems:"center",justifyContent:"center",gap:12,borderRadius:12}}>
          <svg width="22" height="22" viewBox="0 0 54 54" fill="none"><path fill="#E01E5A" d="M19.7 30.5a5.3 5.3 0 1 1 0-10.6 5.3 5.3 0 0 1 0 10.6zm0-15.3a5.3 5.3 0 0 1-5.3-5.3V4.7a5.3 5.3 0 0 1 10.6 0v5.2a5.3 5.3 0 0 1-5.3 5.3z"/><path fill="#36C5F0" d="M30.5 19.7a5.3 5.3 0 1 1 10.6 0 5.3 5.3 0 0 1-10.6 0zm15.3 0a5.3 5.3 0 0 1 5.3-5.3h5.2a5.3 5.3 0 0 1 0 10.6h-5.2a5.3 5.3 0 0 1-5.3-5.3z"/><path fill="#2EB67D" d="M34.3 23.5a5.3 5.3 0 1 1 0 10.6 5.3 5.3 0 0 1 0-10.6zm0 15.3a5.3 5.3 0 0 1 5.3 5.3v5.2a5.3 5.3 0 0 1-10.6 0v-5.2a5.3 5.3 0 0 1 5.3-5.3z"/><path fill="#ECB22E" d="M23.5 34.3a5.3 5.3 0 1 1-10.6 0 5.3 5.3 0 0 1 10.6 0zm-15.3 0a5.3 5.3 0 0 1-5.3 5.3H2.7a5.3 5.3 0 0 1 0-10.6h5.2a5.3 5.3 0 0 1 5.3 5.3z"/></svg>
          Slack으로 로그인
        </button>
      </div>
    </div>}

    <div style={HDR}>
      <div style={{display:"flex",alignItems:"center",gap:12}}><img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAB9AAAAMgCAYAAAB75flzAAABCGlDQ1BJQ0MgUHJvZmlsZQAAeJxjYGA8wQAELAYMDLl5JUVB7k4KEZFRCuwPGBiBEAwSk4sLGHADoKpv1yBqL+viUYcLcKakFicD6Q9ArFIEtBxopAiQLZIOYWuA2EkQtg2IXV5SUAJkB4DYRSFBzkB2CpCtkY7ETkJiJxcUgdT3ANk2uTmlyQh3M/Ck5oUGA2kOIJZhKGYIYnBncAL5H6IkfxEDg8VXBgbmCQixpJkMDNtbGRgkbiHEVBYwMPC3MDBsO48QQ4RJQWJRIliIBYiZ0tIYGD4tZ2DgjWRgEL7AwMAVDQsIHG5TALvNnSEfCNMZchhSgSKeDHkMyQx6QJYRgwGDIYMZAKbWPz9HbOBQAAEAAElEQVR4nOz96Xsk13Xve/7W3hGZmKtQA2pksVicWaRIiZI10RrOkc9p+7Z9r9zX7qf/gP6z+vV9Ht6ndbrlbvnelu8jH+vYsmxZlo5EihooiaJIiqTEqcgCkBF7r36xIxIJFFAjgEQVvh8+yUAlMjMiM5EZEXvttZYEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA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AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMD/vz04IAAAAAAQ8v91QwIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADAUtf+M2sU2sptAAAAAElFTkSuQmCC" alt="모닥불에너지" style={{height:30,objectFit:"contain"}}/><div><div style={{fontSize:14,fontWeight:700}}>히트펌프 용량 산정 시스템 v1.1 (2026.03.19)</div><div style={{fontSize:10,opacity:.7}}>v1.0 (2026.03.18)</div></div></div>
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
