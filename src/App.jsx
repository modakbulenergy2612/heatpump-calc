import { useState, useMemo, useEffect } from "react";
import { supabase } from "./supabase";

// ═══════════════════════ 상수 ═══════════════════════

const CLIMATE = [
  { id:"north",  label:"북부/한랭지", desc:"강원 내륙·철원 (-15℃)", heatW:300, srcT:5  },
  { id:"central",label:"중부",        desc:"서울·경기·충청 (-10℃)", heatW:230, srcT:10 },
  { id:"south",  label:"남부/제주",   desc:"부산·광주·제주 (-5℃)",  heatW:200, srcT:15 },
];

const WSRC = [
  { id:"tap",    label:"상수도", getT: c => c.srcT },
  { id:"ground", label:"지하수", getT: () => 16    },
];

// 업종: 기본 설비 목록 포함
const BIZ = [
  { id:"bath",    label:"목욕/사우나",  defEquip:["tang","shower"],   addEquip:["bathtub","pool"],      defCirc:"sauna",   opH:12, defSimCoef:"0.8" },
  { id:"hotel",   label:"숙박업소",     defEquip:["bathtub","shower"], addEquip:["tang","pool"],         defCirc:"hotel",   opH:16, defSimCoef:"0.6" },
  { id:"pool",    label:"수영장",       defEquip:["pool","shower"],    addEquip:["tang","bathtub"],      defCirc:"pension", opH:14, defSimCoef:"0.7" },
  { id:"hospital",label:"병원/요양원",  defEquip:["hospital","shower"],addEquip:["tang","bathtub"],      defCirc:"hospital",opH:20, defSimCoef:"0.6" },
];

// 설비 유형 정의
const EQUIP_DEFS = {
  tang:     { label:"탕",                       subtypes:["replace","no_replace"] },
  bathtub:  { label:"욕조",                     subtypes:null },
  shower:   { label:"샤워",                     subtypes:null },
  pool:     { label:"수영장/온수풀",             subtypes:["replace","no_replace"] },
  hospital: { label:"병원/요양 목욕",           subtypes:null },
};

// 축열조 설계 유형 (①⑤ 선택불가)
const TANK_TYPES = [
  { id:"2", label:"② 난방 직접 순환형", tankDT:20, hpTemp:55, available:true,  note:"난방 전용 현장" },
  { id:"3", label:"③ 내부 코일형",     tankDT:20, hpTemp:60, available:true,  note:"난방+급탕 겸용" },
  { id:"4", label:"④ 외부 열교환기형", tankDT:20, hpTemp:60, available:true,  note:"급탕 전용 또는 난방+급탕" },
];

// 순환손실계수
const CIRC_TYPES = [
  { id:"none",     label:"순환배관 없음",      coef:1.0 },
  { id:"small",    label:"일반 주택·소형상가", coef:1.1 },
  { id:"pension",  label:"펜션·풀빌라",        coef:1.2 },
  { id:"hotel",    label:"호텔·리조트",        coef:1.3 },
  { id:"hospital", label:"병원·요양시설",      coef:1.35 },
  { id:"sauna",    label:"사우나·목욕탕",      coef:1.4 },
];

// HP 제조사·모델
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
  { id:"active",     label:"대응 중",  color:"#2563EB", bg:"#EFF6FF", border:"#BFDBFE" },
  { id:"site",       label:"현장실사", color:"#D97706", bg:"#FFFBEB", border:"#FDE68A" },
  { id:"proposed",   label:"제안완료", color:"#7C3AED", bg:"#F5F3FF", border:"#DDD6FE" },
  { id:"contracted", label:"계약완료", color:"#065F46", bg:"#ECFDF5", border:"#A7F3D0" },
  { id:"hold",       label:"대응보류", color:"#6B7280", bg:"#F3F4F6", border:"#D1D5DB" },
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

// 설비 초기값 생성
const mkEquip=(type,subtype)=>({
  id:Date.now()+"_"+Math.random().toString(36).slice(2,5),
  type, subtype:subtype||null,
  // 공통
  targetTemp:"42", count:"1",
  // 탕
  volume:"5", freq:"1", tempDrop:"2",
  // 욕조
  volL:"300", freqDay:"1",
  // 샤워
  people:"", useRate:"80",
  // 수영장/온수풀
  poolVol:"", cycleDays:"30",
  // 병원
  beds:"", litPerPerson:"80", weeksFreq:"3",
});

// 개별 설비 일일 급탕열량 계산
function calcEquipHeat(eq, srcT, hpt){
  const dT=t=>Math.max(0,(parseFloat(t)||42)-srcT);
  switch(eq.type){
    case "tang":
      if(eq.subtype==="replace")
        return (parseFloat(eq.volume)||0)*(parseFloat(eq.freq)||1)*(parseFloat(eq.count)||1)*1.163*dT(eq.targetTemp);
      else // no_replace
        return (parseFloat(eq.volume)||0)*(parseFloat(eq.tempDrop)||2)*1.163;
    case "bathtub":
      return ((parseFloat(eq.volL)||300)/1000)*(parseFloat(eq.freqDay)||1)*(parseFloat(eq.count)||1)*1.163*dT(eq.targetTemp);
    case "shower":
      return (parseFloat(eq.people)||0)*((parseFloat(eq.useRate)||80)/100)*0.05*1.163*dT(eq.targetTemp);
    case "pool":
      if(eq.subtype==="replace")
        return (parseFloat(eq.poolVol)||0)/(parseFloat(eq.cycleDays)||30)*1.163*dT(eq.targetTemp);
      else // no_replace
        return (parseFloat(eq.poolVol)||0)*(parseFloat(eq.tempDrop)||2)*1.163;
    case "hospital":
      return (parseFloat(eq.beds)||0)*((parseFloat(eq.weeksFreq)||3)/7)*(parseFloat(eq.litPerPerson)||80)/1000*1.163*dT(eq.targetTemp);
    default: return 0;
  }
}

// 설비별 피크비율·피크시간
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
  const[myName,setMyName]=useState(()=>localStorage.getItem("hp_myname")||"");
  const[showNameModal,setShowNameModal]=useState(false);
  const[projects,setProjects]=useState([]);
  const[activePid,setActivePid]=useState(null);

  // 현황 탭
  const EMPTY_FORM={name:"",status:"active",sido:"",sigungu:"",manager:"",distributor:"",installer:"",memo:""};
  const[spForm,setSpForm]=useState(EMPTY_FORM);
  const[spEditId,setSpEditId]=useState(null);
  const[spFilter,setSpFilter]=useState("all");
  const[spSearch,setSpSearch]=useState("");
  const[spFMgr,setSpFMgr]=useState("");
  const[spFSido,setSpFSido]=useState("");

  // ─── 용량 산정 상태 ───
  const[calcMode,setCalcMode]=useState("both"); // heating / hotwater / both
  const[bizId,setBizId]=useState("");
  const[climId,setClimId]=useState("central");
  const[wsrcId,setWsrcId]=useState("tap");
  const[customSrcT,setCustomSrcT]=useState("");
  const[opHRaw,setOpHRaw]=useState("12");
  // 설비 목록
  const[equipList,setEquipList]=useState([]);
  // 난방
  const[heatArea,setHeatArea]=useState("");
  const[customHeatW,setCustomHeatW]=useState("");
  const[simCoef,setSimCoef]=useState("1.0");
  // HP 설계
  const[hpTempRaw,setHpTempRaw]=useState("55");
  const[tankTypeId,setTankTypeId]=useState("4"); // ②③④
  const[circTypeId,setCircTypeId]=useState("none");
  // 제조사·모델
  const[makerId,setMakerId]=useState("lg");
  const[modelId,setModelId]=useState("lg16");
  const[copWeight,setCopWeight]=useState("0.9");
  // 축열조
  const[existTank,setExistTank]=useState("");
  const[newTankRaw,setNewTankRaw]=useState("");
  const[tankSpace,setTankSpace]=useState("yes");
  // 전기 계약
  const[elecType,setElecType]=useState("general"); // general / night
  const[nightLoad,setNightLoad]=useState("hotwater"); // hotwater / heating / both
  const[nightContract,setNightContract]=useState(""); // kW
  const[nightOpH,setNightOpH]=useState("8");
  const[nightMakerId,setNightMakerId]=useState("lg");
  const[nightModelId,setNightModelId]=useState("lg16");
  // 경제성
  const[fuelId,setFuelId]=useState("lpg");
  const[fuelUnit,setFuelUnit]=useState("kg");
  const[fuelMon,setFuelMon]=useState("");
  const[fuelPrc,setFuelPrc]=useState("");
  const[dayRate,setDayRate]=useState("120");
  const[nightRate,setNightRate]=useState("56");
  const[instCost,setInstCost]=useState("");
  const[openDet,setOpenDet]=useState({});

  // Supabase
  const fetchProjects=async()=>{
    try{const{data,error}=await supabase.from("projects").select("*").order("updated_at",{ascending:false});if(!error&&data)setProjects(data.map(r=>({...r.data,id:r.id})));}catch{}
  };
  useEffect(()=>{(async()=>{await fetchProjects();setLoading(false);if(!localStorage.getItem("hp_myname"))setShowNameModal(true);})();const iv=setInterval(fetchProjects,30000);return()=>clearInterval(iv);},[]);
  const persist=async arr=>{
    setProjects(arr);
    const editor=myName||"(미지정)";
    for(const p of arr){const{id,...rest}=p;try{await supabase.from("projects").upsert({id,data:{...p,lastEditor:editor},updated_at:new Date().toISOString()});}catch{}}
    try{const{data:rows}=await supabase.from("projects").select("id");if(rows){const activeIds=new Set(arr.map(p=>p.id));const toDelete=rows.filter(r=>!activeIds.has(r.id)).map(r=>r.id);for(const did of toDelete){await supabase.from("projects").delete().eq("id",did);}}}catch{}
  };

  // 파생값
  const clim=CLIMATE.find(c=>c.id===climId)||CLIMATE[1];
  const wsrc=WSRC.find(w=>w.id===wsrcId)||WSRC[0];
  const biz=BIZ.find(b=>b.id===bizId);
  const tankType=TANK_TYPES.find(t=>t.id===tankTypeId)||TANK_TYPES[2];
  const circType=CIRC_TYPES.find(c=>c.id===circTypeId)||CIRC_TYPES[0];
  const hpModel=HP_MODELS.find(m=>m.id===modelId);
  const nightModel=HP_MODELS.find(m=>m.id===nightModelId);
  const availableModels=HP_MODELS.filter(m=>m.maker===makerId);
  const nightAvailableModels=HP_MODELS.filter(m=>m.maker===nightMakerId);
  const activeProj=projects.find(p=>p.id===activePid);

  // ═══════════════════════ 통합 계산 ═══════════════════════
  const R=useMemo(()=>{
    const srcT=parseFloat(customSrcT)||wsrc.getT(clim);
    const hpTemp=parseFloat(hpTempRaw)||tankType.hpTemp;
    const dT=hpTemp-srcT;
    const hpt=1.163*dT; // 부하계산용
    const hptTank=1.163*tankType.tankDT; // 축열조용
    const opH=parseFloat(opHRaw)||12;
    const heatW=parseFloat(customHeatW)||clim.heatW;
    const sc=parseFloat(simCoef)||1.0;
    const circCoef=circType.coef;
    const copRaw=hpModel?.cop||2.5;
    const copWt=parseFloat(copWeight)||0.9;
    const effCOP=copRaw*copWt;

    // ── 급탕 부하 ──
    let totalDailyHeat=0;
    const equipDetails=[];
    if(calcMode!=="heating"){
      equipList.forEach(eq=>{
        const dailyHeat=calcEquipHeat(eq,srcT,hpt);
        const{ratio,peakH:pH}=getEquipPeak(eq,opH);
        const peakLoad=pH>0?dailyHeat*ratio/pH:0;
        totalDailyHeat+=dailyHeat;
        equipDetails.push({...eq,dailyHeat,ratio,peakH:pH,peakLoad});
      });
    }
    const dailyHeatWithLoss=totalDailyHeat*circCoef;
    const hwBaseLoad=opH>0?dailyHeatWithLoss/opH:0;
    const hwPeakLoad=equipDetails.reduce((sum,eq)=>sum+eq.peakLoad*circCoef,0);
    // 대표 피크시간 (가중평균)
    const totalRawPeak=equipDetails.reduce((s,eq)=>s+eq.peakLoad,0);
    const repPeakH=totalRawPeak>0
      ?equipDetails.reduce((s,eq)=>s+eq.peakLoad*eq.peakH,0)/totalRawPeak
      :2;
    const monthlyHwHeat=dailyHeatWithLoss*30;

    // ── 난방 부하 ──
    let htLoad=0, monthlyHtHeat=0;
    if(calcMode!=="hotwater"){
      const area=parseFloat(heatArea)||0;
      if(area>0){
        htLoad=area*heatW/1000;
        monthlyHtHeat=htLoad*opH*30;
      }
    }
    const htLoadEff=htLoad*(calcMode==="both"?sc:1.0);

    // ── 합산 ──
    const totalPeak=hwPeakLoad+htLoadEff;
    const basicLoad=hwBaseLoad+htLoadEff; // 기본 설비부하
    const totalMonthly=monthlyHwHeat+monthlyHtHeat;

    // ── HP 용량 (일반전기) ──
    const existT=parseFloat(existTank)||0;
    const newT=parseFloat(newTankRaw)||0;
    const enteredTank=existT+newT;
    let hpR=null;
    if(totalPeak>0&&elecType==="general"){
      const condA=(hwBaseLoad*1.25)+htLoadEff;
      if(tankSpace==="no"){
        hpR={needed:totalPeak*1.1,condA,condB:null,condC:null,mode:"notank"};
      } else {
        const tankDR=hptTank>0?enteredTank*hptTank/repPeakH:0;
        const condB=Math.max(condA,totalPeak-tankDR);
        const tankUsed=Math.max(0,totalPeak-condB)*repPeakH;
        const rechT=Math.max(0,opH-repPeakH);
        const condC=rechT>0?Math.max(condB,basicLoad+tankUsed/rechT):condB*1.1;
        hpR={needed:Math.max(condA,condB,condC),condA,condB,condC,tankDR,tankUsed,rechT,mode:"general"};
      }
    }

    // ── 최소·최적 축열조 ──
    let tankMin=0, tankOpt=null, hpOpt=null;
    if(hpR&&tankSpace==="yes"&&hptTank>0){
      tankMin=Math.max(0,(totalPeak-hpR.condA)*repPeakH/hptTank);
      const rechT=Math.max(0,opH-repPeakH);
      if(rechT>0&&totalPeak>basicLoad){
        tankOpt=(totalPeak-basicLoad)/(hptTank*(1/repPeakH+1/rechT));
        hpOpt=basicLoad+(totalPeak-basicLoad)*repPeakH/opH;
      }
    }
    const effTank=enteredTank>0?enteredTank:tankMin;

    // ── 심야전기 ──
    let nightR=null;
    if(elecType==="night"){
      const nm=nightModel;
      if(nm){
        const nOpH=parseFloat(nightOpH)||8;
        const nContract=parseFloat(nightContract)||0;
        // 일일 총 열량 (심야 부하 선택에 따라)
        const dailyHwForNight=nightLoad==="heating"?0:dailyHeatWithLoss;
        const dailyHtForNight=nightLoad==="hotwater"?0:htLoad*opH; // 난방 일일 열량
        const dailyTotal=dailyHwForNight+dailyHtForNight;
        // 축열조 ΔT (심야 부하별)
        const nightDT=nightLoad==="hotwater"?25:nightLoad==="heating"?20:30;
        const nightHptTank=1.163*nightDT;
        const nightProduction=nm.kw*nOpH;
        const sufficient=nightProduction>=dailyTotal;
        const shortage=Math.max(0,dailyTotal-nightProduction);
        const nightTank=(sufficient?dailyTotal:nightProduction)/(nightHptTank>0?nightHptTank:1)*1.1;
        nightR={nm,nOpH,nContract,dailyTotal,nightProduction,sufficient,shortage,nightTank,nightDT,nightHptTank};
      }
    }

    // ── 경제성 ──
    const monthlyElec=totalMonthly>0?totalMonthly/effCOP:0;
    const elecCost=monthlyElec*(parseFloat(dayRate)||120);
    const FUELS_HEAT={lpg:12.0,lng:10.55,kerosene:9.1,diesel:8.4,electric:1.0};
    const fuelHeat=FUELS_HEAT[fuelId]||10;
    const curCost=(parseFloat(fuelMon)||0)*(parseFloat(fuelPrc)||0);
    const savings=curCost-elecCost;
    const payback=(parseFloat(instCost)>0&&savings>0)?(parseFloat(instCost)*10000)/(savings*12):null;

    // ── 지배조건 ──
    const isCDom=hpR?.mode==="general"&&hpR.condC!=null&&hpR.condC>=hpR.condB&&hpR.condC>=hpR.condA;
    const isBDom=hpR?.mode==="general"&&!isCDom&&hpR.condB>hpR.condA;

    return{srcT,hpTemp,dT,hpt,hptTank,opH,heatW,sc,circCoef,copRaw,copWt,effCOP,repPeakH,
           hwBaseLoad,hwPeakLoad,dailyHeatWithLoss,monthlyHwHeat,equipDetails,
           htLoad,htLoadEff,monthlyHtHeat,totalPeak,basicLoad,totalMonthly,
           existT,newT,enteredTank,tankMin,tankOpt,hpOpt,effTank,
           hpR,isCDom,isBDom,nightR,
           monthlyElec,elecCost,curCost,savings,payback};
  },[customSrcT,wsrc,clim,hpTempRaw,tankTypeId,circTypeId,opHRaw,bizId,customHeatW,simCoef,
     calcMode,equipList,heatArea,existTank,newTankRaw,tankSpace,
     elecType,nightLoad,nightContract,nightOpH,nightModelId,nightMakerId,
     modelId,copWeight,fuelId,fuelMon,fuelPrc,dayRate,nightRate,instCost]);

  // CRUD
  const saveSpProj=async()=>{if(!spForm.name.trim()){alert("프로젝트명 입력");return;}const p={id:spEditId||Date.now().toString(),...spForm,name:spForm.name.trim(),updatedAt:new Date().toISOString(),calcData:null};const upd=spEditId?projects.map(x=>x.id===spEditId?{...x,...p,calcData:x.calcData}:x):[p,...projects];await persist(upd);setSpEditId(null);setSpForm(EMPTY_FORM);};
  const deleteProj=async id=>{if(!window.confirm("삭제?"))return;await persist(projects.filter(p=>p.id!==id));if(activePid===id)setActivePid(null);};

  const CALC_FIELDS={calcMode,bizId,climId,wsrcId,customSrcT,opHRaw,equipList,heatArea,customHeatW,simCoef,hpTempRaw,tankTypeId,circTypeId,makerId,modelId,copWeight,existTank,newTankRaw,tankSpace,elecType,nightLoad,nightContract,nightOpH,nightMakerId,nightModelId,fuelId,fuelUnit,fuelMon,fuelPrc,dayRate,nightRate,instCost};

  const openCalc=p=>{setActivePid(p.id);if(p.calcData){const d=p.calcData;
    if(d.calcMode)setCalcMode(d.calcMode);if(d.bizId)setBizId(d.bizId);
    if(d.climId)setClimId(d.climId);if(d.wsrcId)setWsrcId(d.wsrcId);if(d.customSrcT!==undefined)setCustomSrcT(d.customSrcT);
    if(d.opHRaw)setOpHRaw(d.opHRaw);if(d.equipList)setEquipList(d.equipList);
    if(d.heatArea)setHeatArea(d.heatArea);if(d.customHeatW)setCustomHeatW(d.customHeatW);if(d.simCoef)setSimCoef(d.simCoef);
    if(d.hpTempRaw)setHpTempRaw(d.hpTempRaw);if(d.tankTypeId)setTankTypeId(d.tankTypeId);if(d.circTypeId)setCircTypeId(d.circTypeId);
    if(d.makerId)setMakerId(d.makerId);if(d.modelId)setModelId(d.modelId);if(d.copWeight)setCopWeight(d.copWeight);
    if(d.existTank)setExistTank(d.existTank);if(d.newTankRaw)setNewTankRaw(d.newTankRaw);if(d.tankSpace)setTankSpace(d.tankSpace);
    if(d.elecType)setElecType(d.elecType);if(d.nightLoad)setNightLoad(d.nightLoad);if(d.nightContract)setNightContract(d.nightContract);
    if(d.nightOpH)setNightOpH(d.nightOpH);if(d.nightMakerId)setNightMakerId(d.nightMakerId);if(d.nightModelId)setNightModelId(d.nightModelId);
    if(d.fuelId)setFuelId(d.fuelId);if(d.fuelUnit)setFuelUnit(d.fuelUnit);if(d.fuelMon)setFuelMon(d.fuelMon);if(d.fuelPrc)setFuelPrc(d.fuelPrc);
    if(d.dayRate)setDayRate(d.dayRate);if(d.nightRate)setNightRate(d.nightRate);if(d.instCost)setInstCost(d.instCost);
  }setTab("calc");};
  const saveCalc=async()=>{if(!activePid){alert("프로젝트 선택 필요");return;}await persist(projects.map(p=>p.id===activePid?{...p,calcData:CALC_FIELDS,updatedAt:new Date().toISOString()}:p));alert("저장 완료!");};

  // 설비 추가
  const addEquip=(type,subtype)=>setEquipList(p=>[...p,mkEquip(type,subtype)]);
  const removeEquip=id=>setEquipList(p=>p.filter(e=>e.id!==id));
  const updateEquip=(id,field,val)=>setEquipList(p=>p.map(e=>e.id===id?{...e,[field]:val}:e));

  // 업종 변경 시 자동 세팅
  const onBizChange=id=>{
    setBizId(id);
    const b=BIZ.find(x=>x.id===id);
    if(!b)return;
    setOpHRaw(String(b.opH));
    if(b.defCirc)setCircTypeId(b.defCirc);
    if(b.defSimCoef)setSimCoef(b.defSimCoef);
    // 기본 설비 자동 추가
    const defaultEquips=b.defEquip.map(type=>{
      if(type==="tang") return mkEquip("tang","replace");
      if(type==="pool") return mkEquip("pool","replace");
      return mkEquip(type,null);
    });
    setEquipList(defaultEquips);
  };

  // 스타일
  const C=dark?{bg:"#0F172A",card:"#1E293B",bd:"#334155",txt:"#F1F5F9",sub:"#94A3B8",pri:"#60A5FA",acc:"#3B82F6",res:"#34D399",warn:"#FBBF24",err:"#F87171",inp:"#0F172A",inpB:"#475569",hi:"#1E3A5F"}
              :{bg:"#F0F4F8",card:"#FFFFFF",bd:"#E2E8F0",txt:"#1A202C",sub:"#718096",pri:"#1B3A5C",acc:"#2563EB",res:"#059669",warn:"#D97706",err:"#DC2626",inp:"#F7FAFC",inpB:"#CBD5E0",hi:"#EFF6FF"};
  const W={fontFamily:"'Pretendard','맑은 고딕',sans-serif",background:C.bg,minHeight:"100vh",paddingBottom:60};
  const HDR={background:C.pri,color:"#fff",padding:"12px 18px",display:"flex",justifyContent:"space-between",alignItems:"center",position:"sticky",top:0,zIndex:100,boxShadow:"0 2px 8px rgba(0,0,0,.25)"};
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
  const RBOX={background:dark?"#1E3A5F":"#EFF6FF",border:`1px solid ${dark?"#2563EB":"#BFDBFE"}`,borderRadius:8,padding:"12px 14px"};
  const tog=k=>setOpenDet(p=>({...p,[k]:!p[k]}));
  const statBadge=sid=>{const s=STATUS_LIST.find(x=>x.id===sid);return s?{color:s.color,background:s.bg,border:`1px solid ${s.border}`,padding:"2px 9px",borderRadius:12,fontSize:12,fontWeight:600,whiteSpace:"nowrap"}:{};};
  const saveName=n=>{setMyName(n);localStorage.setItem("hp_myname",n);setShowNameModal(false);};
  const filteredProjs=projects.filter(p=>{if(spFilter!=="all"&&p.status!==spFilter)return false;if(spFMgr&&!(p.manager||"").toLowerCase().includes(spFMgr.toLowerCase()))return false;if(spFSido&&p.sido!==spFSido)return false;if(spSearch&&!(p.name||"").toLowerCase().includes(spSearch.toLowerCase()))return false;return true;});
  const{srcT,hpTemp,hpt,hptTank,opH,heatW,sc,circCoef,copRaw,copWt,effCOP,repPeakH,hwBaseLoad,hwPeakLoad,dailyHeatWithLoss,monthlyHwHeat,equipDetails,htLoad,htLoadEff,monthlyHtHeat,totalPeak,basicLoad,totalMonthly,existT,newT,enteredTank,tankMin,tankOpt,hpOpt,effTank,hpR,isCDom,isBDom,nightR,monthlyElec,elecCost,curCost,savings,payback}=R;

  // 설비 입력 렌더
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
            <button onClick={()=>removeEquip(eq.id)} style={{...BTN,padding:"3px 8px",fontSize:11,background:"#FFF5F5",color:C.err,border:"1px solid #FCA5A5"}}>삭제</button>
          </div>
        </div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
          {/* 탕 교체있음 */}
          {eq.type==="tang"&&eq.subtype==="replace"&&<>
            <NI v={eq.volume} s={v=>updateEquip(eq.id,"volume",v)} ph="5" st={{...INP,width:68}} sfx="톤/탕"/>
            <NI v={eq.freq} s={v=>updateEquip(eq.id,"freq",v)} ph="1" st={{...INP,width:55}} sfx="회/일"/>
            <NI v={eq.count} s={v=>updateEquip(eq.id,"count",v)} ph="1" st={{...INP,width:50}} sfx="개"/>
            <NI v={eq.targetTemp} s={v=>updateEquip(eq.id,"targetTemp",v)} ph="42" st={{...INP,width:55}} sfx="℃"/>
          </>}
          {/* 탕 교체없음 */}
          {eq.type==="tang"&&eq.subtype==="no_replace"&&<>
            <NI v={eq.volume} s={v=>updateEquip(eq.id,"volume",v)} ph="5" st={{...INP,width:68}} sfx="톤"/>
            <NI v={eq.tempDrop} s={v=>updateEquip(eq.id,"tempDrop",v)} ph="2" st={{...INP,width:60}} sfx="℃/일 수온강하"/>
          </>}
          {/* 욕조 */}
          {eq.type==="bathtub"&&<>
            <NI v={eq.volL} s={v=>updateEquip(eq.id,"volL",v)} ph="300" st={{...INP,width:68}} sfx="L/개"/>
            <NI v={eq.freqDay} s={v=>updateEquip(eq.id,"freqDay",v)} ph="1" st={{...INP,width:55}} sfx="회/일"/>
            <NI v={eq.count} s={v=>updateEquip(eq.id,"count",v)} ph="1" st={{...INP,width:50}} sfx="개"/>
            <NI v={eq.targetTemp} s={v=>updateEquip(eq.id,"targetTemp",v)} ph="42" st={{...INP,width:55}} sfx="℃"/>
          </>}
          {/* 샤워 */}
          {eq.type==="shower"&&<>
            <NI v={eq.people} s={v=>updateEquip(eq.id,"people",v)} ph="30" st={{...INP,width:68}} sfx="인"/>
            <NI v={eq.useRate} s={v=>updateEquip(eq.id,"useRate",v)} ph="80" st={{...INP,width:55}} sfx="% 이용률"/>
            <NI v={eq.targetTemp} s={v=>updateEquip(eq.id,"targetTemp",v)} ph="42" st={{...INP,width:55}} sfx="℃"/>
          </>}
          {/* 수영장/온수풀 교체있음 */}
          {eq.type==="pool"&&eq.subtype==="replace"&&<>
            <NI v={eq.poolVol} s={v=>updateEquip(eq.id,"poolVol",v)} ph="50" st={{...INP,width:68}} sfx="톤"/>
            <NI v={eq.cycleDays} s={v=>updateEquip(eq.id,"cycleDays",v)} ph="30" st={{...INP,width:60}} sfx="일/교체주기"/>
            <NI v={eq.targetTemp} s={v=>updateEquip(eq.id,"targetTemp",v)} ph="30" st={{...INP,width:55}} sfx="℃"/>
          </>}
          {/* 수영장/온수풀 교체없음 */}
          {eq.type==="pool"&&eq.subtype==="no_replace"&&<>
            <NI v={eq.poolVol} s={v=>updateEquip(eq.id,"poolVol",v)} ph="50" st={{...INP,width:68}} sfx="톤"/>
            <NI v={eq.tempDrop} s={v=>updateEquip(eq.id,"tempDrop",v)} ph="2" st={{...INP,width:60}} sfx="℃/일 수온강하"/>
          </>}
          {/* 병원/요양 목욕 */}
          {eq.type==="hospital"&&<>
            <NI v={eq.beds} s={v=>updateEquip(eq.id,"beds",v)} ph="50" st={{...INP,width:68}} sfx="병상"/>
            <NI v={eq.weeksFreq} s={v=>updateEquip(eq.id,"weeksFreq",v)} ph="3" st={{...INP,width:50}} sfx="회/주"/>
            <NI v={eq.litPerPerson} s={v=>updateEquip(eq.id,"litPerPerson",v)} ph="80" st={{...INP,width:60}} sfx="L/인"/>
            <NI v={eq.targetTemp} s={v=>updateEquip(eq.id,"targetTemp",v)} ph="42" st={{...INP,width:55}} sfx="℃"/>
          </>}
        </div>
      </div>
    );
  };

  // 설비 추가 버튼 그룹
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
    {/* 이름 모달 */}
    {showNameModal&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <div style={{background:C.card,borderRadius:14,padding:"28px 24px",maxWidth:360,width:"100%",boxShadow:"0 8px 32px rgba(0,0,0,.3)"}}>
        <div style={{fontSize:16,fontWeight:700,color:C.pri,marginBottom:6}}>👋 본인을 선택해주세요</div>
        <div style={{fontSize:13,color:C.sub,marginBottom:16}}>팀원들이 누가 수정했는지 확인할 수 있습니다.</div>
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {MEMBERS.map(m=>(<button key={m} onClick={()=>saveName(m)} style={{...BTN,padding:"12px 16px",fontSize:15,background:myName===m?C.acc:"transparent",color:myName===m?"#fff":C.txt,border:`2px solid ${myName===m?C.acc:C.bd}`,borderRadius:8,textAlign:"left"}}>{m}</button>))}
        </div>
      </div>
    </div>}

    <div style={HDR}>
      <div><div style={{fontSize:15,fontWeight:700}}>🌡️ HP 용량 산정 시스템 v12</div><div style={{fontSize:11,opacity:.75}}>히트펌프·축열조 산정 & 프로젝트 관리</div></div>
      <div style={{display:"flex",alignItems:"center",gap:8}}>
        <span onClick={()=>setShowNameModal(true)} style={{fontSize:12,color:"rgba(255,255,255,.8)",cursor:"pointer",padding:"4px 8px",borderRadius:4,background:"rgba(255,255,255,.12)"}}>{myName||"이름 설정"}</span>
        <button onClick={()=>setDark(!dark)} style={{...BTN,background:"rgba(255,255,255,.18)",color:"#fff",padding:"5px 12px"}}>{dark?"☀️":"🌙"}</button>
      </div>
    </div>
    <div style={TABS}>
      {[["status","📊 프로젝트 현황"],["calc","📐 용량 산정"],["econ","💰 경제성"]].map(([id,lbl])=>(
        <button key={id} style={tb(tab===id)} onClick={()=>{if((tab==="calc"||tab==="econ")&&id==="status"&&activePid){if(!window.confirm("나가시겠습니까?\n저장하지 않은 변경사항은 사라집니다."))return;}setTab(id);}}>{lbl}</button>
      ))}
    </div>
    <div style={CONT}>

    {/* ══ TAB 1: 프로젝트 현황 ══ */}
    {tab==="status"&&(<>
      <div style={SEC}>
        <div style={SECH}>{spEditId?"✏️ 수정":"➕ 새 프로젝트"}</div>
        <div style={ROW}><span style={LBL}>프로젝트명 *</span><input value={spForm.name} onChange={e=>setSpForm({...spForm,name:e.target.value})} placeholder="예) 파주 백학 리조트" style={{...IST,width:210}}/><span style={LBL}>담당자</span><select value={spForm.manager} onChange={e=>setSpForm({...spForm,manager:e.target.value})} style={{...SEL,width:110}}><option value="">선택</option>{MEMBERS.map(m=><option key={m} value={m}>{m}</option>)}</select></div>
        <div style={ROW}><span style={LBL}>진행상황</span><div style={{display:"flex",gap:5,flexWrap:"wrap"}}>{STATUS_LIST.map(s=>(<button key={s.id} onClick={()=>setSpForm({...spForm,status:s.id})} style={{...BTN,padding:"5px 11px",fontSize:12,background:spForm.status===s.id?s.color:"transparent",color:spForm.status===s.id?"#fff":s.color,border:`1.5px solid ${s.color}`}}>{s.label}</button>))}</div></div>
        <div style={ROW}><span style={LBL}>시도</span><select value={spForm.sido} onChange={e=>setSpForm({...spForm,sido:e.target.value,sigungu:""})} style={{...SEL,width:120}}><option value="">선택</option>{Object.keys(SIDO_GU).map(s=><option key={s} value={s}>{s}</option>)}</select><span style={{fontSize:13,color:C.sub}}>시군구</span>{spForm.sido?(<select value={spForm.sigungu} onChange={e=>setSpForm({...spForm,sigungu:e.target.value})} style={{...SEL,width:130}}><option value="">선택</option>{(SIDO_GU[spForm.sido]||[]).map(s=><option key={s} value={s}>{s}</option>)}</select>):(<input value={spForm.sigungu} onChange={e=>setSpForm({...spForm,sigungu:e.target.value})} placeholder="직접입력" style={{...IST,width:120}}/>)}</div>
        <div style={ROW}><span style={LBL}>유통사</span><input value={spForm.distributor} onChange={e=>setSpForm({...spForm,distributor:e.target.value})} placeholder="(주)OO유통" style={{...IST,width:140}}/><span style={LBL}>설치업체</span><input value={spForm.installer} onChange={e=>setSpForm({...spForm,installer:e.target.value})} placeholder="OO설비" style={{...IST,width:140}}/></div>
        <div style={ROW}><span style={LBL}>메모</span><input value={spForm.memo} onChange={e=>setSpForm({...spForm,memo:e.target.value})} placeholder="규모·특이사항" style={{...IST,width:300}}/></div>
        <div style={{display:"flex",gap:8,marginTop:6}}>
          <button onClick={saveSpProj} style={{...BTN,background:C.acc,color:"#fff",padding:"9px 20px"}}>{spEditId?"✅ 수정완료":"➕ 추가"}</button>
          {spEditId&&<button onClick={()=>{setSpEditId(null);setSpForm(EMPTY_FORM);}} style={{...BTN,background:"#9CA3AF",color:"#fff",padding:"9px 14px"}}>취소</button>}
        </div>
      </div>
      <div style={SEC}>
        <div style={{...SECH,justifyContent:"space-between"}}><span>📋 목록 ({projects.length}건)</span></div>
        <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:10}}>{STATUS_LIST.map(s=>{const cnt=projects.filter(p=>p.status===s.id).length;return(<div key={s.id} style={{padding:"3px 10px",borderRadius:16,background:s.bg,border:`1px solid ${s.border}`,fontSize:12}}><span style={{color:s.color,fontWeight:700}}>{s.label} {cnt}</span></div>);})}</div>
        <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:10,alignItems:"center"}}>
          <div style={{position:"relative",flex:"1 1 120px"}}><span style={{position:"absolute",left:8,top:"50%",transform:"translateY(-50%)",fontSize:13,color:C.sub,pointerEvents:"none"}}>🔍</span><input value={spSearch} onChange={e=>setSpSearch(e.target.value)} placeholder="프로젝트명 검색" style={{...IST,width:"100%",paddingLeft:28,boxSizing:"border-box"}}/></div>
          <select value={spFMgr} onChange={e=>setSpFMgr(e.target.value)} style={{...SEL,width:100}}><option value="">👤 담당자</option>{MEMBERS.map(m=><option key={m} value={m}>{m}</option>)}</select>
          <select value={spFSido} onChange={e=>setSpFSido(e.target.value)} style={{...SEL,width:100}}><option value="">📍 지역</option>{Object.keys(SIDO_GU).map(s=><option key={s} value={s}>{s}</option>)}</select>
          <div style={{display:"flex",gap:3,flexWrap:"wrap"}}>{[["all","전체"],...STATUS_LIST.map(s=>[s.id,s.label])].map(([id,lbl])=>(<button key={id} onClick={()=>setSpFilter(id)} style={{...BTN,padding:"4px 8px",fontSize:11,fontWeight:spFilter===id?700:400,background:spFilter===id?C.acc:"transparent",color:spFilter===id?"#fff":C.sub,border:`1px solid ${spFilter===id?C.acc:C.bd}`}}>{lbl}</button>))}</div>
        </div>
        {loading?(<div style={{textAlign:"center",padding:"32px 0",color:C.sub}}>⏳ 불러오는 중...</div>):filteredProjs.length===0?(<div style={{textAlign:"center",padding:"24px 0",color:C.sub}}>📋 {spSearch||spFMgr||spFSido||spFilter!=="all"?"검색 결과 없음":"프로젝트가 없습니다."}</div>):filteredProjs.map(p=>(
          <div key={p.id} style={{display:"flex",alignItems:"flex-start",gap:6,padding:"11px 13px",borderRadius:8,border:`1px solid ${C.bd}`,marginBottom:7,background:dark?"#1E293B":"#FAFBFF"}}>
            <div style={{flex:1}}>
              <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
                <span style={{fontSize:14,fontWeight:700,color:C.pri}}>{p.name}</span>
                <span style={statBadge(p.status)}>{STATUS_LIST.find(s=>s.id===p.status)?.label}</span>
                {activePid===p.id&&<span style={{fontSize:11,color:C.res,fontWeight:700}}>● 작업중</span>}
              </div>
              <div style={{fontSize:12,color:C.sub,marginTop:2}}>
                {p.manager&&<span>👤 {p.manager} · </span>}
                {(p.sido||p.sigungu)&&<span>📍 {[p.sido,p.sigungu].filter(Boolean).join(" ")} · </span>}
                {p.memo&&<span>{p.memo}</span>}
              </div>
              <div style={{fontSize:11,color:C.sub,marginTop:2,display:"flex",gap:8,flexWrap:"wrap"}}>
                {p.updatedAt&&<span>{new Date(p.updatedAt).toLocaleString("ko-KR")}</span>}
                {p.lastEditor&&<span style={{color:dark?"#60A5FA":"#2563EB",fontWeight:600}}>✏️ {p.lastEditor}</span>}
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
      {/* 프로젝트 연결 */}
      <div style={SEC}>
        <div style={SECH}>🗂️ 프로젝트 연결</div>
        {projects.length>0?(<div style={ROW}>
          <span style={LBL}>프로젝트</span>
          <select value={activePid||""} onChange={e=>{const p=projects.find(x=>x.id===e.target.value);if(p)openCalc(p);else setActivePid(null);}} style={{...SEL,width:260}}><option value="">-- 선택 --</option>{projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select>
          {activeProj&&<span style={{fontSize:12,color:C.res,fontWeight:600}}>✅ {activeProj.name}</span>}
        </div>):(<div style={{fontSize:13,color:C.sub}}>현황 탭에서 먼저 프로젝트를 추가하세요.</div>)}
        <button onClick={saveCalc} style={{...BTN,background:activePid?C.acc:"#9CA3AF",color:"#fff",padding:"7px 16px",marginTop:8}} disabled={!activePid}>💾 저장</button>
      </div>

      {/* STEP 1. 분석 범위 */}
      <div style={SEC}>
        <div style={SECH}>STEP 1. 분석 범위</div>
        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
          {[["heating","🔥 난방 전용"],["hotwater","🚿 급탕 전용"],["both","🔥🚿 난방+급탕"]].map(([id,lbl])=>(
            <button key={id} onClick={()=>setCalcMode(id)} style={{...BTN,padding:"8px 16px",fontSize:13,background:calcMode===id?C.pri:"transparent",color:calcMode===id?"#fff":C.sub,border:`1.5px solid ${calcMode===id?C.pri:C.bd}`}}>{lbl}</button>
          ))}
        </div>
      </div>

      {/* STEP 2. 현장 조건 */}
      <div style={SEC}>
        <div style={SECH}>STEP 2. 현장 조건</div>

        {/* 업종 */}
        <div style={ROW}>
          <span style={LBL}>업종</span>
          <select value={bizId} onChange={e=>onBizChange(e.target.value)} style={{...SEL,width:200}}><option value="">선택</option>{BIZ.map(b=><option key={b.id} value={b.id}>{b.label}</option>)}</select>
          {bizId&&<span style={{fontSize:12,color:C.sub}}>기본 설비 자동 추가됨</span>}
        </div>

        {/* 기후대 */}
        <div style={ROW}>
          <span style={LBL}>기후대</span>
          <select value={climId} onChange={e=>{setClimId(e.target.value);setCustomSrcT("");}} style={{...SEL,width:160}}>{CLIMATE.map(c=><option key={c.id} value={c.id}>{c.label}</option>)}</select>
          <span style={{fontSize:12,color:C.sub}}>{CLIMATE.find(c=>c.id===climId)?.desc}</span>
        </div>

        {/* 열원 */}
        <div style={ROW}>
          <span style={LBL}>열원</span>
          <select value={wsrcId} onChange={e=>{setWsrcId(e.target.value);setCustomSrcT("");}} style={{...SEL,width:120}}>{WSRC.map(w=><option key={w.id} value={w.id}>{w.label}</option>)}</select>
          <span style={{fontSize:12,color:C.sub}}>입수온도:</span>
          <NI v={customSrcT||String(WSRC.find(w=>w.id===wsrcId)?.getT(CLIMATE.find(c=>c.id===climId))||10)} s={setCustomSrcT} ph="10" st={{...INP,width:58}} sfx="℃"/>
        </div>

        {/* 운영시간 */}
        <div style={ROW}><span style={LBL}>일 운영시간</span><NI v={opHRaw} s={setOpHRaw} ph="12" st={{...INP,width:68}} sfx="h/일"/></div>

        {/* 난방 기준부하 */}
        {calcMode!=="hotwater"&&(<div style={{background:dark?"#1E3A5F":"#EFF6FF",border:`1px solid ${dark?"#2563EB":"#BFDBFE"}`,borderRadius:7,padding:"9px 12px",marginBottom:10}}>
          <div style={{fontSize:12,color:C.sub,marginBottom:5}}>📌 기후대별 기준부하 (경험치)</div>
          <div style={{display:"flex",gap:14,flexWrap:"wrap",marginBottom:6}}>{CLIMATE.map(c=><span key={c.id} style={{fontSize:12.5,fontWeight:climId===c.id?700:400,color:climId===c.id?C.acc:C.sub}}>{c.label}: <b>{c.heatW}W/평</b></span>)}</div>
          <div style={{display:"flex",alignItems:"center",gap:7}}><span style={{fontSize:12,color:C.sub}}>적용:</span><NI v={customHeatW||String(CLIMATE.find(c=>c.id===climId)?.heatW||230)} s={setCustomHeatW} ph="230" st={{...INP,width:68}} sfx="W/평"/>{customHeatW&&<button onClick={()=>setCustomHeatW("")} style={{...BTN,fontSize:11,padding:"2px 6px",background:"#F3F4F6",color:C.sub,border:`1px solid ${C.bd}`}}>기본값</button>}</div>
        </div>)}

        {/* HP 출수온도 */}
        <div style={ROW}>
          <span style={LBL}>HP 출수온도</span>
          <NI v={hpTempRaw} s={setHpTempRaw} ph="55" st={{...INP,width:68}} sfx="℃"/>
          <span style={{fontSize:12,color:C.sub}}>기본값은 축열조 유형 선택 시 자동 세팅</span>
        </div>

        {/* 축열조 설계 유형 */}
        <div style={{marginBottom:10}}>
          <div style={{fontSize:13,color:C.sub,marginBottom:6}}>축열조 설계 유형</div>
          <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
            {TANK_TYPES.map(t=>(<button key={t.id} onClick={()=>{setTankTypeId(t.id);setHpTempRaw(String(t.hpTemp));}} style={{...BTN,padding:"6px 12px",fontSize:12.5,background:tankTypeId===t.id?C.acc:"transparent",color:tankTypeId===t.id?"#fff":C.sub,border:`1.5px solid ${tankTypeId===t.id?C.acc:C.bd}`}}>{t.label}</button>))}
          </div>
          <div style={{fontSize:11.5,color:C.sub,marginTop:5}}>선택 시 HP 출수온도 기본값 자동 적용. 축열조 ΔT = {TANK_TYPES.find(t=>t.id===tankTypeId)?.tankDT}℃ → 단위열량 {fmt(1.163*(TANK_TYPES.find(t=>t.id===tankTypeId)?.tankDT||20),2)} kWh/톤</div>
        </div>

        {/* 순환손실계수 */}
        {calcMode!=="heating"&&(<div style={{background:dark?"#1B2A1B":"#F0FDF4",border:`1px solid ${dark?"#166534":"#BBF7D0"}`,borderRadius:7,padding:"9px 12px",marginBottom:10}}>
          <div style={{fontSize:12.5,fontWeight:700,color:dark?"#86EFAC":"#166534",marginBottom:6}}>🔄 급탕 순환배관 손실계수</div>
          <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
            {CIRC_TYPES.map(ct=>(<button key={ct.id} onClick={()=>setCircTypeId(ct.id)} style={{...BTN,padding:"4px 9px",fontSize:12,background:circTypeId===ct.id?(dark?"#166534":"#16A34A"):"transparent",color:circTypeId===ct.id?"#fff":(dark?"#86EFAC":"#166534"),border:`1.5px solid ${dark?"#166534":"#16A34A"}`}}>{ct.label} ×{ct.coef}</button>))}
          </div>
          {circCoef>1&&<div style={{marginTop:5,fontSize:12,color:dark?"#86EFAC":"#166534"}}>→ 급탕 열량 전체에 ×{circCoef} 적용</div>}
        </div>)}

        {/* 제조사·모델·COP */}
        <div style={{background:dark?"#1E2A3A":"#EFF6FF",border:`1px solid ${dark?"#2563EB":"#BFDBFE"}`,borderRadius:7,padding:"9px 12px",marginBottom:10}}>
          <div style={{fontSize:12.5,fontWeight:700,color:C.acc,marginBottom:8}}>🔧 히트펌프 제조사·모델</div>
          <div style={ROW}>
            <span style={{fontSize:12,color:C.sub,minWidth:60}}>제조사</span>
            <div style={{display:"flex",gap:5}}>
              {HP_MAKERS.map(m=>(<button key={m.id} onClick={()=>{if(!m.available)return;setMakerId(m.id);const firstModel=HP_MODELS.find(x=>x.maker===m.id);if(firstModel)setModelId(firstModel.id);}} style={{...BTN,padding:"5px 11px",fontSize:12.5,background:makerId===m.id?C.acc:"transparent",color:m.available?(makerId===m.id?"#fff":C.sub):"#CBD5E0",border:`1.5px solid ${makerId===m.id?C.acc:C.bd}`,cursor:m.available?"pointer":"not-allowed"}}>{m.label}{!m.available&&<span style={{fontSize:10,display:"block",opacity:.7}}>{m.note}</span>}</button>))}
            </div>
          </div>
          <div style={ROW}>
            <span style={{fontSize:12,color:C.sub,minWidth:60}}>모델</span>
            <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
              {availableModels.map(m=>(<button key={m.id} onClick={()=>setModelId(m.id)} style={{...BTN,padding:"5px 11px",fontSize:12.5,background:modelId===m.id?C.acc:"transparent",color:modelId===m.id?"#fff":C.sub,border:`1.5px solid ${modelId===m.id?C.acc:C.bd}`}}>{m.label}<span style={{fontSize:10,display:"block",opacity:.75}}>COP {m.cop} / 최대 {m.maxPower}kW</span></button>))}
            </div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
            <span style={{fontSize:12,color:C.sub}}>COP 가중치:</span>
            <select value={copWeight} onChange={e=>setCopWeight(e.target.value)} style={{...SEL,width:160}}>{COP_WEIGHTS.map(w=>(<option key={w.v} value={w.v}>{w.label}</option>))}</select>
            <span style={{fontSize:13,color:C.acc,fontWeight:700}}>→ 적용 COP: {fmt(copRaw*(parseFloat(copWeight)||0.9),2)}</span>
          </div>
        </div>

        {/* 동시사용계수 (난방+급탕) */}
        {calcMode==="both"&&(<div style={{background:dark?"#2D1B4E":"#F5F3FF",border:`1px solid ${dark?"#7C3AED":"#DDD6FE"}`,borderRadius:7,padding:"9px 12px",marginBottom:10}}>
          <div style={{fontSize:12.5,fontWeight:700,color:dark?"#C4B5FD":"#7C3AED",marginBottom:6}}>⚡ 동시사용계수 (선택 적용)</div>
          <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>
            <NI v={simCoef} s={setSimCoef} ph="1.0" st={{...INP,width:60}}/>
            {biz?.defSimCoef&&<button onClick={()=>setSimCoef(biz.defSimCoef)} style={{...BTN,padding:"4px 9px",fontSize:12,background:C.acc,color:"#fff"}}>업종기본 {biz.defSimCoef}</button>}
            <button onClick={()=>setSimCoef("1.0")} style={{...BTN,padding:"4px 9px",fontSize:12,background:"transparent",color:C.sub,border:`1px solid ${C.bd}`}}>1.0 (미적용)</button>
          </div>
          {parseFloat(simCoef)<1&&<div style={{marginTop:5,fontSize:12,color:dark?"#C4B5FD":"#7C3AED"}}>→ 난방부하 {fmt(htLoad,1)}kW × {simCoef} = {fmt(htLoadEff,1)}kW 적용</div>}
        </div>)}

        {/* 전기 계약 */}
        <div style={ROW}>
          <span style={LBL}>전기 계약</span>
          {[["general","일반전기"],["night","심야전기"]].map(([id,lbl])=>(<button key={id} onClick={()=>setElecType(id)} style={{...BTN,padding:"7px 14px",fontSize:13,background:elecType===id?C.acc:"transparent",color:elecType===id?"#fff":C.sub,border:`1.5px solid ${elecType===id?C.acc:C.bd}`}}>{lbl}</button>))}
        </div>

        {/* 심야전기 설정 */}
        {elecType==="night"&&(<div style={{background:dark?"#2D1B4E":"#F5F3FF",border:`1px solid ${dark?"#7C3AED":"#DDD6FE"}`,borderRadius:7,padding:"10px 14px",marginBottom:10}}>
          <div style={{fontSize:12.5,fontWeight:700,color:dark?"#C4B5FD":"#7C3AED",marginBottom:8}}>⚡ 심야전기 설정</div>
          <div style={ROW}>
            <span style={{fontSize:12,color:C.sub,minWidth:80}}>심야 부하</span>
            {[["hotwater","급탕 전용"],["heating","난방 전용"],["both","난방+급탕"]].map(([id,lbl])=>(<button key={id} onClick={()=>setNightLoad(id)} style={{...BTN,padding:"5px 10px",fontSize:12,background:nightLoad===id?(dark?"#7C3AED":"#7C3AED"):"transparent",color:nightLoad===id?"#fff":(dark?"#C4B5FD":"#7C3AED"),border:`1.5px solid ${dark?"#7C3AED":"#DDD6FE"}`}}>{lbl}</button>))}
          </div>
          <div style={ROW}>
            <span style={{fontSize:12,color:C.sub,minWidth:80}}>계약전력</span>
            <NI v={nightContract} s={setNightContract} ph="20" st={{...INP,width:80}} sfx="kW"/>
            <span style={{fontSize:12,color:C.sub}}>심야 운영시간</span>
            <NI v={nightOpH} s={setNightOpH} ph="8" st={{...INP,width:58}} sfx="h (기본 8h)"/>
          </div>
          <div style={{fontSize:12.5,fontWeight:600,color:dark?"#C4B5FD":"#7C3AED",marginBottom:6}}>심야 HP 제조사·모델 (최대소비전력 ≤ 계약전력)</div>
          <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:6}}>
            {HP_MAKERS.filter(m=>m.available).map(m=>(<button key={m.id} onClick={()=>{setNightMakerId(m.id);const first=HP_MODELS.find(x=>x.maker===m.id);if(first)setNightModelId(first.id);}} style={{...BTN,padding:"4px 10px",fontSize:12,background:nightMakerId===m.id?(dark?"#7C3AED":"#7C3AED"):"transparent",color:nightMakerId===m.id?"#fff":(dark?"#C4B5FD":"#7C3AED"),border:`1px solid ${dark?"#7C3AED":"#DDD6FE"}`}}>{m.label}</button>))}
          </div>
          <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
            {nightAvailableModels.map(m=>{
              const contract=parseFloat(nightContract)||0;
              const ok=contract===0||m.maxPower<=contract;
              return(<button key={m.id} onClick={()=>{if(!ok)return;setNightModelId(m.id);}} style={{...BTN,padding:"4px 10px",fontSize:12,background:nightModelId===m.id?(dark?"#7C3AED":"#7C3AED"):"transparent",color:nightModelId===m.id?"#fff":ok?(dark?"#C4B5FD":"#7C3AED"):"#CBD5E0",border:`1px solid ${dark?"#7C3AED":"#DDD6FE"}`,cursor:ok?"pointer":"not-allowed"}}>
                {m.label}<span style={{fontSize:10,display:"block"}}>{m.kw}kW 열출력 / {m.maxPower}kW 소비{!ok&&" ❌"}</span>
              </button>);
            })}
          </div>
        </div>)}

        {/* 축열조 공간 */}
        {elecType==="general"&&(<div style={ROW}>
          <span style={LBL}>축열조 공간</span>
          <button onClick={()=>setTankSpace("yes")} style={{...BTN,padding:"7px 14px",fontSize:13,background:tankSpace==="yes"?C.res:"transparent",color:tankSpace==="yes"?"#fff":C.sub,border:`1.5px solid ${tankSpace==="yes"?C.res:C.bd}`}}>✅ 있음</button>
          <button onClick={()=>setTankSpace("no")} style={{...BTN,padding:"7px 14px",fontSize:13,background:tankSpace==="no"?C.err:"transparent",color:tankSpace==="no"?"#fff":C.sub,border:`1.5px solid ${tankSpace==="no"?C.err:C.bd}`}}>❌ 없음</button>
          {tankSpace==="no"&&<span style={{fontSize:12,color:C.err}}>→ HP가 총 피크부하 전체 담당</span>}
        </div>)}
      </div>

      {/* STEP 3. 부하 입력 */}
      <div style={SEC}>
        <div style={SECH}>STEP 3. 부하 입력</div>

        {/* 난방 */}
        {calcMode!=="hotwater"&&(<div style={{marginBottom:calcMode==="both"?18:0}}>
          <div style={{fontSize:14,fontWeight:700,color:C.pri,marginBottom:9}}>🔥 난방 부하</div>
          <div style={ROW}><span style={LBL}>난방 면적</span><NI v={heatArea} s={setHeatArea} ph="100" st={{...INP,width:88}} sfx="평"/><span style={{fontSize:12,color:C.sub}}>{fmt((parseFloat(heatArea)||0)*3.3,0)} m²</span></div>
          {htLoad>0&&<div style={{...RBOX,marginTop:4}}>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,textAlign:"center"}}>
              <div><div style={{fontSize:11,color:C.sub}}>기준부하</div><div style={{fontSize:18,fontWeight:800,color:C.acc}}>{heatW}</div><div style={{fontSize:11}}>W/평</div></div>
              <div><div style={{fontSize:11,color:C.sub}}>난방부하</div><div style={{fontSize:18,fontWeight:800,color:C.warn}}>{fmt(htLoad,1)}</div><div style={{fontSize:11}}>kW</div></div>
              <div><div style={{fontSize:11,color:C.sub}}>적용 난방부하{calcMode==="both"&&parseFloat(simCoef)<1?` (×${simCoef})`:""}</div><div style={{fontSize:18,fontWeight:800,color:C.warn}}>{fmt(htLoadEff,1)}</div><div style={{fontSize:11}}>kW</div></div>
            </div>
          </div>}
        </div>)}

        {/* 급탕 */}
        {calcMode!=="heating"&&(<div style={{borderTop:calcMode==="both"?`1px dashed ${C.bd}`:"none",paddingTop:calcMode==="both"?14:0}}>
          <div style={{fontSize:14,fontWeight:700,color:C.pri,marginBottom:9}}>🚿 급탕 부하</div>
          {equipList.length===0&&<div style={{fontSize:13,color:C.sub,marginBottom:8}}>업종을 선택하면 기본 설비가 자동 추가됩니다. 아래에서 직접 추가도 가능합니다.</div>}
          {equipList.map(eq=>renderEquip(eq))}
          {renderAddEquipButtons()}

          {/* 급탕 소계 */}
          {(hwBaseLoad>0||hwPeakLoad>0)&&(<div style={{...RBOX,marginTop:12}}>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,textAlign:"center"}}>
              <div><div style={{fontSize:11,color:C.sub}}>일일 급탕열량</div><div style={{fontSize:18,fontWeight:800,color:C.acc}}>{fmt(dailyHeatWithLoss,1)}</div><div style={{fontSize:11}}>kWh/일</div></div>
              <div><div style={{fontSize:11,color:C.sub}}>급탕 기본부하</div><div style={{fontSize:18,fontWeight:800,color:C.acc}}>{fmt(hwBaseLoad,1)}</div><div style={{fontSize:11}}>kW</div></div>
              <div><div style={{fontSize:11,color:C.sub}}>급탕 피크부하</div><div style={{fontSize:18,fontWeight:800,color:C.warn}}>{fmt(hwPeakLoad,1)}</div><div style={{fontSize:11}}>kW</div></div>
            </div>
            {circCoef>1&&<div style={{marginTop:7,padding:"4px 9px",background:dark?"#064E3B":"#ECFDF5",borderRadius:5,fontSize:12,color:dark?"#6EE7B7":"#065F46",textAlign:"center"}}>🔄 순환손실계수 ×{circCoef} 적용 완료</div>}
          </div>)}
        </div>)}
      </div>

      {/* STEP 4. 산정 결과 */}
      {(htLoad>0||hwBaseLoad>0)&&(<div style={SEC}>
        <div style={SECH}>STEP 4. 산정 결과</div>

        {/* 총 피크부하 */}
        {calcMode==="both"&&totalPeak>0&&(<div style={{...RBOX,marginBottom:10}}>
          <div style={{fontSize:12.5,fontWeight:700,color:C.pri,marginBottom:7}}>총 피크부하</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,textAlign:"center"}}>
            <div><div style={{fontSize:11,color:C.sub}}>급탕 피크부하</div><div style={{fontSize:17,fontWeight:700,color:C.warn}}>{fmt(hwPeakLoad,1)} kW</div></div>
            <div><div style={{fontSize:11,color:C.sub}}>적용 난방부하</div><div style={{fontSize:17,fontWeight:700,color:C.warn}}>{fmt(htLoadEff,1)} kW</div></div>
            <div><div style={{fontSize:11,color:C.sub}}>총 피크부하</div><div style={{fontSize:21,fontWeight:800,color:C.err}}>{fmt(totalPeak,1)} kW</div></div>
          </div>
        </div>)}

        {/* 일반전기 HP 결과 */}
        {elecType==="general"&&hpR&&(<>
          <div style={{...RBOX,marginBottom:8}}>
            <div style={{fontSize:12.5,fontWeight:700,color:C.pri,marginBottom:8}}>🔧 히트펌프 (일반전기)</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,textAlign:"center",marginBottom:8}}>
              <div><div style={{fontSize:11,color:C.sub}}>적용 COP</div><div style={{fontSize:20,fontWeight:800,color:C.acc}}>{fmt(effCOP,2)}</div><div style={{fontSize:10,color:C.sub}}>{copRaw}×{parseFloat(copWeight)}</div></div>
              <div><div style={{fontSize:11,color:C.sub}}>필요 HP 용량</div><div style={{fontSize:20,fontWeight:800,color:C.warn}}>{fmt(hpR.needed,1)}<span style={{fontSize:11}}> kW</span></div></div>
              <div><div style={{fontSize:11,color:C.sub}}>선택 모델</div><div style={{fontSize:14,fontWeight:700,color:C.res}}>{hpModel?.label}</div><div style={{fontSize:11,color:C.sub}}>{hpModel?.kw}kW / COP {hpModel?.cop}</div></div>
            </div>
            {hpR.mode==="general"&&(<div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:5,marginBottom:8,textAlign:"center"}}>
              {[["조건A\n(기본부하)",hpR.condA],["조건B\n(피크보완)",hpR.condB],["조건C\n(재충전)",hpR.condC]].map(([lbl,val])=>{
                const isMx=val===Math.max(hpR.condA,hpR.condB,hpR.condC||0);
                return(<div key={lbl} style={{background:isMx?(dark?"#1E3A5F":"#DBEAFE"):"transparent",border:`1px solid ${isMx?C.acc:C.bd}`,borderRadius:6,padding:"5px 3px"}}>
                  <div style={{fontSize:10,color:C.sub,whiteSpace:"pre-wrap"}}>{lbl}</div>
                  <div style={{fontSize:14,fontWeight:isMx?800:500,color:isMx?C.acc:C.sub}}>{fmt(val,1)} kW</div>
                  {isMx&&<div style={{fontSize:10,color:C.acc}}>▲ 지배</div>}
                </div>);
              })}
            </div>)}
            {isCDom&&<div style={{padding:"6px 9px",background:dark?"#1C1F2E":"#F0F4FF",border:`1px solid ${dark?"#4338CA":"#C7D2FE"}`,borderRadius:6,fontSize:12,color:dark?"#A5B4FC":"#4338CA"}}>🔒 조건C(재충전) 지배 — 축열조를 더 키워도 HP 용량이 줄지 않습니다.</div>}
            {isBDom&&<div style={{padding:"6px 9px",background:dark?"#1E3A1E":"#F0FDF4",border:`1px solid ${dark?"#166534":"#BBF7D0"}`,borderRadius:6,fontSize:12,color:dark?"#86EFAC":"#166534"}}>📈 조건B(피크보완) 지배 — 축열조를 키울수록 HP 용량을 추가로 줄일 수 있습니다.</div>}
          </div>

          {/* 축열조 결과 */}
          {tankSpace==="yes"&&(<div style={RBOX}>
            <div style={{fontSize:12.5,fontWeight:700,color:C.pri,marginBottom:9}}>🪣 축열조</div>
            <div style={{fontSize:12,color:C.sub,marginBottom:8}}>ΔT {tankType.tankDT}℃ → 단위열량 {fmt(hptTank,3)} kWh/톤  |  대표 피크시간 {fmt(repPeakH,1)}h</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,textAlign:"center",marginBottom:10}}>
              <div style={{background:dark?"#064E3B":"#ECFDF5",border:`1px solid ${dark?"#065F46":"#A7F3D0"}`,borderRadius:7,padding:"9px 5px"}}>
                <div style={{fontSize:11,color:C.sub}}>최소 축열조</div>
                <div style={{fontSize:20,fontWeight:800,color:C.res}}>{fmt(tankMin,1)}<span style={{fontSize:11}}> 톤</span></div>
                <div style={{fontSize:10,color:C.sub}}>HP 절감 시작점</div>
              </div>
              <div style={{background:dark?"#1E3A5F":"#EFF6FF",border:`1px solid ${dark?"#2563EB":"#BFDBFE"}`,borderRadius:7,padding:"9px 5px"}}>
                <div style={{fontSize:11,color:C.sub}}>최적 축열조</div>
                <div style={{fontSize:20,fontWeight:800,color:C.acc}}>{tankOpt!=null?fmt(tankOpt,1):"—"}<span style={{fontSize:11}}> 톤</span></div>
                <div style={{fontSize:10,color:C.sub}}>HP 최소화 지점</div>
              </div>
              <div style={{background:dark?"#064E3B":"#ECFDF5",border:`1px solid ${dark?"#065F46":"#A7F3D0"}`,borderRadius:7,padding:"9px 5px"}}>
                <div style={{fontSize:11,color:C.sub}}>최적 HP 용량</div>
                <div style={{fontSize:20,fontWeight:800,color:C.res}}>{hpOpt!=null?fmt(hpOpt,1):"—"}<span style={{fontSize:11}}> kW</span></div>
                <div style={{fontSize:10,color:C.sub}}>최적 축열조 기준</div>
              </div>
            </div>
            <div style={ROW}>
              <span style={LBL}>기존 축열조</span><NI v={existTank} s={setExistTank} ph="0" st={{...INP,width:75}} sfx="톤"/>
              <span style={LBL}>계획 축열조</span><NI v={newTankRaw} s={setNewTankRaw} ph="(자동)" st={{...INP,width:75}} sfx="톤"/>
            </div>
            {enteredTank>0&&<div style={{fontSize:12,color:C.acc,marginTop:4}}>입력 축열조 {fmt(enteredTank,1)}톤 기준으로 HP 용량 계산됨</div>}
          </div>)}
          {tankSpace==="no"&&<div style={{padding:"9px 12px",background:"#FEF2F2",border:"1px solid #FCA5A5",borderRadius:8,fontSize:12.5,color:C.err}}>❌ 축열조 불가 → HP 단독 총 피크부하 전체 담당 (+10% 여유)</div>}
        </>)}

        {/* 심야전기 결과 */}
        {elecType==="night"&&nightR&&(<div style={{...RBOX,border:`1px solid ${dark?"#7C3AED":"#DDD6FE"}`,background:dark?"#1C1530":"#FAF5FF"}}>
          <div style={{fontSize:12.5,fontWeight:700,color:dark?"#C4B5FD":"#7C3AED",marginBottom:9}}>⚡ 히트펌프 (심야전기)</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
            <div style={{textAlign:"center",background:dark?"#2D1B4E":"#F5F3FF",border:`1px solid ${dark?"#7C3AED":"#DDD6FE"}`,borderRadius:7,padding:"9px 5px"}}>
              <div style={{fontSize:11,color:C.sub}}>심야 HP 열출력</div>
              <div style={{fontSize:20,fontWeight:800,color:dark?"#C4B5FD":"#7C3AED"}}>{fmt(nightR.nm.kw,1)}<span style={{fontSize:11}}> kW</span></div>
              <div style={{fontSize:10,color:C.sub}}>{nightR.nm.label} / 소비 {nightR.nm.maxPower}kW</div>
            </div>
            <div style={{textAlign:"center",background:dark?"#2D1B4E":"#F5F3FF",border:`1px solid ${dark?"#7C3AED":"#DDD6FE"}`,borderRadius:7,padding:"9px 5px"}}>
              <div style={{fontSize:11,color:C.sub}}>심야 생산가능 ({nightR.nOpH}h)</div>
              <div style={{fontSize:20,fontWeight:800,color:dark?"#C4B5FD":"#7C3AED"}}>{fmt(nightR.nightProduction,1)}<span style={{fontSize:11}}> kWh</span></div>
            </div>
          </div>
          <div style={{padding:"7px 10px",background:nightR.sufficient?(dark?"#064E3B":"#ECFDF5"):(dark?"#3B1515":"#FEF2F2"),border:`1px solid ${nightR.sufficient?C.res:C.err}`,borderRadius:6,fontSize:12.5,marginBottom:8}}>
            일일 총 열량: <b>{fmt(nightR.dailyTotal,1)} kWh</b> &nbsp;|&nbsp;
            {nightR.sufficient?<span style={{color:C.res,fontWeight:700}}>✅ 심야만으로 전부 충당 가능</span>:<span style={{color:C.err,fontWeight:700}}>⚠️ 부족 {fmt(nightR.shortage,1)} kWh — 보조설비 필요</span>}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            <div style={{textAlign:"center"}}>
              <div style={{fontSize:11,color:C.sub}}>축열조 용량</div>
              <div style={{fontSize:22,fontWeight:800,color:dark?"#C4B5FD":"#7C3AED"}}>{fmt(nightR.nightTank,1)}<span style={{fontSize:12}}> 톤</span></div>
              <div style={{fontSize:10,color:C.sub}}>ΔT {nightR.nightDT}℃ 기준</div>
            </div>
            {!nightR.sufficient&&<div style={{textAlign:"center",background:dark?"#3B1515":"#FEF2F2",border:`1px solid ${C.err}`,borderRadius:7,padding:"9px 5px"}}>
              <div style={{fontSize:11,color:C.sub}}>보조설비 필요 열량</div>
              <div style={{fontSize:22,fontWeight:800,color:C.err}}>{fmt(nightR.shortage,1)}<span style={{fontSize:11}}> kWh/일</span></div>
            </div>}
          </div>
        </div>)}

      </div>)}
    </>)}

    {/* ══ TAB 3: 경제성 ══ */}
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
          <div style={{background:dark?"#1E3A5F":"#EFF6FF",border:`1px solid ${dark?"#2563EB":"#BFDBFE"}`,borderRadius:7,padding:"9px 12px",marginBottom:14,fontSize:12.5}}>
            월 총 열부하 <b>{fmt0(totalMonthly)}kWh/월</b> · 적용 COP <b>{fmt(effCOP,2)}</b> · 월 전력소비 <b>{fmt0(monthlyElec)}kWh/월</b>
          </div>
          <div style={{fontSize:13.5,fontWeight:700,color:C.pri,marginBottom:10}}>기존 연료</div>
          <div style={ROW}><span style={LBL}>연료 종류</span>
            <select value={fuelId} onChange={e=>setFuelId(e.target.value)} style={{...SEL,width:140}}>{[["lpg","LPG"],["lng","LNG(도시가스)"],["kerosene","등유"],["diesel","경유"],["electric","전기보일러"]].map(([id,lbl])=><option key={id} value={id}>{lbl}</option>)}</select>
          </div>
          <div style={ROW}><span style={LBL}>월 사용량</span><NI v={fuelMon} s={setFuelMon} ph="0" st={{...INP,width:98}} sfx={fuelId==="electric"?"kWh/월":"단위/월"}/></div>
          <div style={ROW}><span style={LBL}>연료 단가</span><NI v={fuelPrc} s={setFuelPrc} ph="1200" st={{...INP,width:98}} sfx="원/단위"/></div>
          <div style={{fontSize:13.5,fontWeight:700,color:C.pri,marginBottom:10,marginTop:14}}>HP 전기 요금</div>
          <div style={ROW}><span style={LBL}>주간 단가</span><NI v={dayRate} s={setDayRate} ph="120" st={{...INP,width:88}} sfx="원/kWh"/></div>
          <div style={ROW}><span style={LBL}>HP 설치비</span><NI v={instCost} s={setInstCost} ph="0" st={{...INP,width:98}} sfx="만원"/></div>
        </div>
        <div style={SEC}>
          <div style={SECH}>📊 결과</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9,marginBottom:9}}>
            <div style={{...RBOX,textAlign:"center"}}>
              <div style={{fontSize:11,color:C.sub}}>HP 월 운영비</div>
              <div style={{fontSize:28,fontWeight:800,color:C.acc}}>{fmt0(elecCost)}</div><div style={{fontSize:11}}>원/월</div>
            </div>
            {curCost>0&&<div style={{background:dark?"#2D1B0E":"#FFFBEB",border:`1px solid ${dark?"#92400E":"#FDE68A"}`,borderRadius:8,padding:"12px 14px",textAlign:"center"}}>
              <div style={{fontSize:11,color:C.sub}}>현재 연료비</div>
              <div style={{fontSize:28,fontWeight:800,color:C.warn}}>{fmt0(curCost)}</div><div style={{fontSize:11}}>원/월</div>
            </div>}
          </div>
          {curCost>0&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9}}>
            <div style={{background:savings>0?(dark?"#064E3B":"#ECFDF5"):(dark?"#3B1515":"#FEF2F2"),border:`1px solid ${savings>0?C.res:C.err}`,borderRadius:8,padding:"12px 14px",textAlign:"center"}}>
              <div style={{fontSize:11,color:C.sub}}>월 절감</div>
              <div style={{fontSize:28,fontWeight:800,color:savings>0?C.res:C.err}}>{savings>=0?"+":""}{fmt0(savings)}</div><div style={{fontSize:11}}>원/월</div>
            </div>
            {payback&&<div style={{...RBOX,textAlign:"center"}}><div style={{fontSize:11,color:C.sub}}>투자회수</div><div style={{fontSize:34,fontWeight:800,color:C.res}}>{payback.toFixed(1)}</div><div style={{fontSize:11}}>년</div></div>}
          </div>}
        </div>
      </>)}
    </>)}

    </div>
  </div>
  );
}
