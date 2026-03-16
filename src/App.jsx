import { useState, useMemo, useEffect } from "react";
import { supabase } from "./supabase";

// ═══════════════════════ 상수 ═══════════════════════

const CLIMATE = [
  { id:"north",  label:"북부/한랭지", desc:"강원 내륙·철원 (설계외기 -15℃)", heatW:350, tapTemp:5 },
  { id:"central",label:"중부",        desc:"서울·경기·충청 (설계외기 -10℃)", heatW:300, tapTemp:10 },
  { id:"south",  label:"남부/제주",   desc:"부산·광주·제주 (설계외기 -5℃)",  heatW:200, tapTemp:15 },
];
const BIZ = [
  { id:"A", label:"숙박업(호텔/모텔/펜션)", wpu:0.15, pR:.5,  pH:2,   opH:16, uL:"객실 수",    uUnit:"객실",   defSC:"0.6" },
  { id:"B", label:"목욕/사우나/찜질방",     wpu:null, pR:.8,  pH:1,   opH:12, uL:"",           isBath:true,    defSC:"0.8" },
  { id:"C", label:"수영장/스포츠시설",      wpu:2.0,  pR:.4,  pH:2,   opH:14, uL:"수면적",     uUnit:"m²",     div:100, defSC:"0.7" },
  { id:"D", label:"음식점/급식시설",        wpu:0.8,  pR:.6,  pH:1.5, opH:12, uL:"좌석 수",    uUnit:"석",     div:50,  defSC:"0.5" },
  { id:"E", label:"병원/요양시설",          wpu:0.12, pR:.3,  pH:3,   opH:20, uL:"병상 수",    uUnit:"병상",   defSC:"0.6" },
  { id:"F", label:"사무실/상가",            wpu:0.3,  pR:.2,  pH:2,   opH:10, uL:"면적",       uUnit:"평",     div:100, defSC:"0.4" },
  { id:"G", label:"기타/직접 입력",         wpu:null, pR:.5,  pH:2,   opH:12, uL:"일일 온수량", uUnit:"톤/일",  isDirect:true, defSC:"0.7" },
];
const HP_MODELS = [
  { id:"i9",  kw:9,  label:"일체형 9kW",  type:"일체형", maxTemp:60 },
  { id:"i12", kw:12, label:"일체형 12kW", type:"일체형", maxTemp:60 },
  { id:"i16", kw:16, label:"일체형 16kW", type:"일체형", maxTemp:60 },
  { id:"s25", kw:25, label:"구분형 25kW", type:"구분형", maxTemp:80 },
  { id:"s35", kw:35, label:"구분형 35kW", type:"구분형", maxTemp:80 },
];
const MEMBERS = ["군산","그린","자비스","데미안","동하","엠마"];
const WSRC = [
  { id:"tap",    label:"상수도", getT: c => c.tapTemp },
  { id:"ground", label:"지하수", getT: () => 16 },
];
const SITE_OPT = [
  { id:"laundry", label:"세탁시설",        addW:0.5 },
  { id:"kitchen", label:"대형 주방",        addW:0.8 },
  { id:"steam",   label:"습식 스팀사우나",  addW:0.3 },
  { id:"outdoor", label:"야외시설(노천탕)", addW:1.5 },
];
const FUELS = [
  { id:"lpg",      label:"LPG",           units:[{id:"kg",l:"kg"},{id:"m3",l:"m³"}], eff:85 },
  { id:"lng",      label:"LNG(도시가스)", units:[{id:"m3",l:"m³"}],                  eff:88 },
  { id:"kerosene", label:"등유",           units:[{id:"L", l:"L"}],                   eff:82 },
  { id:"diesel",   label:"경유",           units:[{id:"L", l:"L"}],                   eff:82 },
  { id:"electric", label:"전기보일러",     units:[{id:"kWh",l:"kWh"}],                eff:95 },
];
const STATUS_LIST = [
  { id:"active",     label:"대응 중",   color:"#2563EB", bg:"#EFF6FF", border:"#BFDBFE" },
  { id:"site",       label:"현장실사",  color:"#D97706", bg:"#FFFBEB", border:"#FDE68A" },
  { id:"proposed",   label:"제안완료",  color:"#7C3AED", bg:"#F5F3FF", border:"#DDD6FE" },
  { id:"contracted", label:"계약완료",  color:"#065F46", bg:"#ECFDF5", border:"#A7F3D0" },
  { id:"hold",       label:"대응보류",  color:"#6B7280", bg:"#F3F4F6", border:"#D1D5DB" },
  { id:"drop",       label:"Drop",     color:"#DC2626", bg:"#FEF2F2", border:"#FECACA" },
];
const COP_WEIGHTS = [
  { v:"1.0", label:"공격적",  sub:"스펙 그대로" },
  { v:"0.9", label:"표준",    sub:"-10%" },
  { v:"0.8", label:"보수적",  sub:"-20%" },
  { v:"0.7", label:"최보수",  sub:"-30%" },
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
  "세종":["세종시"],
  "제주":["제주시","서귀포시"],
};
const SIDO_GU = Object.fromEntries(
  Object.entries(SIDO_GU_RAW).map(([s,gs]) => [s, [...gs].sort((a,b)=>a.localeCompare(b,"ko"))])
);

// ═══════════════════════ 유틸 ═══════════════════════
const fmt = (n,d=1) => { if(n==null||isNaN(n))return"—"; const f=Number(n).toFixed(d); const[i,dc]=f.split("."); return i.replace(/\B(?=(\d{3})+(?!\d))/g,",")+( dc!==undefined?`.${dc}`:""); };
const fmt0 = n => fmt(n,0);
function evalExpr(s){ if(!s||typeof s!=="string")return NaN; s=s.replace(/,/g,"").trim(); if(!s)return NaN; if(!/^[\d\s+\-*/().]+$/.test(s))return NaN; try{const r=new Function(`"use strict";return(${s});`)();return typeof r==="number"&&isFinite(r)?r:NaN;}catch{return NaN;} }

function NI({v,s,ph,st,sfx,disabled}){
  const[raw,setRaw]=useState(v||"");const[foc,setFoc]=useState(false);
  useEffect(()=>{if(!foc)setRaw(v||"");},[v,foc]);
  return(<span style={{display:"inline-flex",alignItems:"center",gap:3}}>
    <input type="text" inputMode="decimal" disabled={disabled}
      value={foc?raw:(v||"")}
      onChange={e=>{const val=e.target.value;setRaw(val);const ev=evalExpr(val);if(!isNaN(ev))s(String(ev));else s(val);}}
      onFocus={()=>{setFoc(true);setRaw(v||"");}}
      onBlur={()=>{setFoc(false);const ev=evalExpr(raw);if(!isNaN(ev)){setRaw(String(ev));s(String(ev));}}}
      placeholder={ph} style={st}/>
    {sfx&&<span style={{fontSize:12,color:"#718096",flexShrink:0}}>{sfx}</span>}
  </span>);
}

const mkBath = () => ({ id:Date.now()+"_"+Math.random().toString(36).slice(2,5), name:"탕", volume:"5", temp:"42", fills:"1", count:"1" });
const mkTub  = () => ({ id:Date.now()+"_"+Math.random().toString(36).slice(2,5), count:"1", volume:"300", temp:"42" });

// ═══════════════════════ 메인 ═══════════════════════
export default function App(){
  const[dark,setDark]=useState(false);
  const[tab,setTab]=useState("status");
  const[loading,setLoading]=useState(true);
  const[myName,setMyName]=useState(()=>localStorage.getItem("hp_myname")||"");
  const[showNameModal,setShowNameModal]=useState(false);

  const C=dark?{bg:"#0F172A",card:"#1E293B",bd:"#334155",txt:"#F1F5F9",sub:"#94A3B8",pri:"#60A5FA",acc:"#3B82F6",res:"#34D399",warn:"#FBBF24",err:"#F87171",inp:"#0F172A",inpB:"#475569",hi:"#1E3A5F"}
              :{bg:"#F0F4F8",card:"#FFFFFF",bd:"#E2E8F0",txt:"#1A202C",sub:"#718096",pri:"#1B3A5C",acc:"#2563EB",res:"#059669",warn:"#D97706",err:"#DC2626",inp:"#F7FAFC",inpB:"#CBD5E0",hi:"#EFF6FF"};

  // ─── 프로젝트 ───
  const[projects,setProjects]=useState([]);
  const[activePid,setActivePid]=useState(null);

  // ─── 현황 탭 ───
  const EMPTY_FORM={name:"",status:"active",sido:"",sigungu:"",manager:"",distributor:"",installer:"",memo:""};
  const[spForm,setSpForm]=useState(EMPTY_FORM);
  const[spEditId,setSpEditId]=useState(null);
  const[spFilter,setSpFilter]=useState("all");
  const[spSearch,setSpSearch]=useState("");
  const[spFMgr,setSpFMgr]=useState("");
  const[spFSido,setSpFSido]=useState("");

  // ─── 용량 산정 ───
  const[calcMode,setCalcMode]=useState("both");
  const[bizId,setBizId]=useState("");
  const[climId,setClimId]=useState("central");
  const[wsrcId,setWsrcId]=useState("tap");
  const[customSrcT,setCustomSrcT]=useState("");
  const[unitRaw,setUnitRaw]=useState("");
  const[opHRaw,setOpHRaw]=useState("");
  const[baths,setBaths]=useState([mkBath()]);
  const[bathtubs,setBathtubs]=useState([]);
  const[siteOpts,setSiteOpts]=useState([]);
  const[supplyTemp,setSupplyTemp]=useState("55");
  const[copInput,setCopInput]=useState("3.5");
  const[copWeight,setCopWeight]=useState("1.0");
  const[heatArea,setHeatArea]=useState("");
  const[customHeatW,setCustomHeatW]=useState("");
  const[simCoef,setSimCoef]=useState("1.0"); // 난방·급탕 동시사용계수
  const[existTank,setExistTank]=useState("");
  const[newTankRaw,setNewTankRaw]=useState("");
  const[tankSpace,setTankSpace]=useState("yes");
  const[elecType,setElecType]=useState("day");
  const[nightRatio,setNightRatio]=useState("70");
  const[openDet,setOpenDet]=useState({});

  // ─── 경제성 ───
  const[fuelId,setFuelId]=useState("lpg");
  const[fuelUid,setFuelUid]=useState("kg");
  const[fuelMon,setFuelMon]=useState("");
  const[fuelPrc,setFuelPrc]=useState("");
  const[dayRate,setDayRate]=useState("120");
  const[nightRate,setNightRate]=useState("56");
  const[instCost,setInstCost]=useState("");

  // ─── Supabase 연동: 팀 공유 스토리지 ───
  const fetchProjects=async()=>{
    try{
      const{data,error}=await supabase.from("projects").select("*").order("updated_at",{ascending:false});
      if(!error&&data) setProjects(data.map(r=>({...r.data,id:r.id})));
    }catch{}
  };

  useEffect(()=>{
    (async()=>{
      await fetchProjects();
      setLoading(false);
      // 첫 방문 시 이름 입력 모달
      if(!localStorage.getItem("hp_myname")) setShowNameModal(true);
    })();
    // 30초마다 자동 새로고침 (다른 팀원 변경사항 반영)
    const iv=setInterval(fetchProjects,30000);
    return()=>clearInterval(iv);
  },[]);

  const persist=async arr=>{
    setProjects(arr);
    const editor=myName||"(미지정)";
    // Supabase에 각 프로젝트를 upsert
    for(const p of arr){
      const{id,...rest}=p;
      const pWithEditor={...p,lastEditor:editor};
      try{await supabase.from("projects").upsert({id,data:pWithEditor,updated_at:new Date().toISOString()});}catch{}
    }
    // 삭제된 항목 제거
    try{
      const{data:rows}=await supabase.from("projects").select("id");
      if(rows){
        const activeIds=new Set(arr.map(p=>p.id));
        const toDelete=rows.filter(r=>!activeIds.has(r.id)).map(r=>r.id);
        for(const did of toDelete){await supabase.from("projects").delete().eq("id",did);}
      }
    }catch{}
  };

  // ─── 파생 ───
  const clim=CLIMATE.find(c=>c.id===climId)||CLIMATE[1];
  const wsrc=WSRC.find(w=>w.id===wsrcId)||WSRC[0];
  const biz=BIZ.find(b=>b.id===bizId);
  const fuel=FUELS.find(f=>f.id===fuelId);
  const fuelUnit=fuel?.units.find(u=>u.id===fuelUid)||fuel?.units[0];
  const activeProj=projects.find(p=>p.id===activePid);

  // ═══════════════════════ 통합 계산 ═══════════════════════
  const R=useMemo(()=>{
    const srcT   = parseFloat(customSrcT)||wsrc.getT(clim);
    const tSup   = parseFloat(supplyTemp)||55;
    const dT     = tSup - srcT;
    const hpt    = 1.163 * dT;
    const copRaw = Math.max(1.0, parseFloat(copInput)||3.5);
    const copWt  = parseFloat(copWeight)||1.0;
    const effCOP = copRaw * copWt;
    const opH    = parseFloat(opHRaw)||(biz?.opH||12);
    const heatW  = parseFloat(customHeatW)||clim.heatW;
    const peakH  = biz?.pH||2;
    const sc     = parseFloat(simCoef)||1.0; // 동시사용계수

    // ── 급탕 부하 ──
    let hw=null;
    if(calcMode!=="heating"&&biz){
      let dailyHeat=0,dailyWaterEq=0;
      if(biz.isBath){
        baths.forEach(b=>{const bdT=(parseFloat(b.temp)||42)-srcT;if(bdT>0)dailyHeat+=(parseFloat(b.volume)||0)*(parseFloat(b.fills)||1)*(parseFloat(b.count)||1)*1.163*bdT;});
        siteOpts.forEach(sid=>{const o=SITE_OPT.find(x=>x.id===sid);if(o&&hpt>0)dailyHeat+=o.addW*hpt;});
      } else if(biz.isDirect){
        dailyWaterEq=parseFloat(unitRaw)||0; dailyHeat=dailyWaterEq*hpt;
      } else if(biz.wpu!=null){
        const eff=biz.div?(parseFloat(unitRaw)||0)/biz.div:(parseFloat(unitRaw)||0);
        dailyWaterEq=eff*biz.wpu;
        siteOpts.forEach(sid=>{const o=SITE_OPT.find(x=>x.id===sid);if(o)dailyWaterEq+=o.addW;});
        dailyHeat=dailyWaterEq*hpt;
      }
      bathtubs.forEach(tb=>{const tbDT=(parseFloat(tb.temp)||42)-srcT;if(tbDT>0)dailyHeat+=((parseFloat(tb.volume)||300)/1000)*(parseFloat(tb.count)||1)*1.163*tbDT;});
      if(dailyHeat>0&&hpt>0){
        dailyWaterEq=dailyHeat/hpt;
        const monthlyHeat=dailyHeat*30;
        const monthlyOpH=opH*30;
        const baseLoad=monthlyHeat/monthlyOpH;
        let peakLoad;
        if(biz.isBath){let ph=0;baths.forEach(b=>{const bdT=(parseFloat(b.temp)||42)-srcT;if(bdT>0)ph+=(parseFloat(b.volume)||0)*(parseFloat(b.count)||1)*1.163*bdT;});peakLoad=peakH>0?ph/peakH:ph;}
        else{peakLoad=(dailyWaterEq*(biz.pR||0.5)/peakH)*hpt;}
        hw={dailyWater:dailyWaterEq,dailyHeat,monthlyHeat,monthlyOpH,baseLoad,peakLoad};
      }
    }

    // ── 난방 부하 ──
    let ht=null;
    if(calcMode!=="hotwater"){
      const area=parseFloat(heatArea)||0;
      if(area>0){const peakLoad=area*heatW/1000;const monthlyHeat=peakLoad*opH*30*0.5;ht={area,heatW,peakLoad,monthlyHeat};}
    }

    // 동시사용계수 적용한 유효 난방 피크
    const htPeakEff = (ht?.peakLoad||0) * sc;
    const totalPeak = (hw?.peakLoad||0) + htPeakEff;
    const totalMon  = (hw?.monthlyHeat||0) + (ht?.monthlyHeat||0);

    // ── 1단계: HP 산정용 예비 축열조 (condA 기반) ──
    const existT = parseFloat(existTank)||0;
    const newT   = parseFloat(newTankRaw)||0;
    const condA  = (hw?hw.baseLoad*1.25:0) + htPeakEff;
    const tankPrelim = (existT+newT)>0 ? (existT+newT)
      : (tankSpace==="yes"&&hpt>0 ? Math.max(0,(totalPeak-condA)*peakH/hpt*1.1) : 0);

    // ── HP 용량 3조건 ──
    let hpR=null;
    if(totalPeak>0){
      const isNight=elecType==="night"||elecType==="mixed";
      if(isNight&&hw){
        const cA=(hw.dailyHeat/8)*1.1;
        const cB=htPeakEff;
        hpR={needed:Math.max(cA,cB),cA,cB,cC:null,mode:"night"};
      } else if(tankSpace==="no"){
        hpR={needed:totalPeak*1.1,mode:"notank",cA:null,cB:null,cC:null};
      } else {
        const tankDR = hpt>0 ? tankPrelim*hpt/peakH : 0;
        const cB = Math.max(condA, totalPeak-tankDR);
        const tankUsed = Math.max(0,totalPeak-cB)*peakH;
        const rechT = Math.max(0,opH-peakH);
        const facBase = (hw?.baseLoad||0) + htPeakEff;
        const cC = rechT>0 ? Math.max(cB, facBase+tankUsed/rechT) : cB*1.1;
        hpR={needed:Math.max(condA,cB,cC),cA:condA,cB,cC,tankDR,tankUsed,rechT,facBase,mode:"general"};
      }
    }

    // ── 2단계: 최종 HP 용량 기준으로 축열조 산정 ──
    const tankMin = tankSpace==="yes"&&hpR&&hpt>0
      ? Math.max(0, (totalPeak-(hpR.needed||0))*peakH/hpt*1.1)
      : 0;
    const effTank = (newT+existT)>0 ? (newT+existT) : tankMin;

    // ── 추천 모델 ──
    let recM=null,recN=0;
    if(hpR?.needed>0){
      const valid=HP_MODELS.filter(m=>m.maxTemp>=(parseFloat(supplyTemp)||55));
      for(let n=1;n<=20;n++){for(const m of valid){if(m.kw*n>=hpR.needed){recM=m;recN=n;break;}}if(recM)break;}
    }

    // ── 경제성 ──
    const monthlyElec=totalMon>0?totalMon/effCOP:0;
    const nR=Math.min(1,Math.max(0,parseFloat(nightRatio)/100||0.7));
    const dR=parseFloat(dayRate)||120,nRate=parseFloat(nightRate)||56;
    const elecCost=elecType==="night"?monthlyElec*nRate:elecType==="mixed"?monthlyElec*(nR*nRate+(1-nR)*dR):monthlyElec*dR;
    const curCost=(parseFloat(fuelMon)||0)*(parseFloat(fuelPrc)||0);
    const savings=curCost-elecCost;
    const payback=(parseFloat(instCost)>0&&savings>0)?(parseFloat(instCost)*10000)/(savings*12):null;

    // ── 지배조건 분석 ──
    // 조건C가 지배할 때: 탱크를 더 키워도 HP 용량이 더 이상 줄지 않는 상태
    const isCDominated = hpR?.mode==="general" && hpR.cC!=null &&
      hpR.cC >= hpR.cB && hpR.cC >= hpR.cA;
    // 탱크가 의미있는 범위를 벗어났는지 (방열속도 > 합산피크 → 탱크가 충분히 큼)
    const tankOversized = hpR?.mode==="general" && hpR.tankDR >= totalPeak;

    // ── 설계 총평 생성 ──
    const summary = (() => {
      if(!hpR||totalPeak<=0) return null;
      const tips=[];
      const warns=[];
      const recs=[];

      // 축열조 공간 없음
      if(tankSpace==="no"){
        warns.push("축열조 설치 불가로 HP가 피크 전체를 단독 담당합니다. HP 용량이 크게 산정되며, 전기 기본요금 부담도 커집니다.");
        recs.push("공간 확보가 가능하다면 소형 축열조(버퍼탱크)라도 설치하면 HP 용량을 줄이고 피크 대응 안정성이 높아집니다.");
      }

      // 심야 모드
      if(elecType==="night"||elecType==="mixed"){
        tips.push(`심야 모드로 설정되어 급탕을 심야 8h 집중 충전합니다. 축열조가 클수록 심야 전기 비중이 높아져 운영비 절감 효과가 커집니다.`);
        if(effTank<(hw?.dailyWater||0)){
          warns.push(`현재 축열조(${fmt(effTank,1)}톤)가 하루 온수량(${fmt(hw?.dailyWater||0,2)}톤)보다 작습니다. 심야 충전이 불완전해 주간 HP 추가 가동이 발생할 수 있습니다.`);
          recs.push(`심야 완전 축열을 위해 축열조를 최소 ${fmt((hw?.dailyWater||0)*1.1,1)}톤 이상으로 키우는 것을 권장합니다.`);
        } else {
          recs.push("현재 축열조 용량으로 심야 완전 축열이 가능합니다. 운영비 최적화를 위해 심야전력 요금제를 반드시 확인하세요.");
        }
      }

      // 조건C 지배 (탱크 더 키워도 HP 안 줄어듦)
      if(isCDominated){
        tips.push(`현재 HP 용량은 '재충전 완료 조건(조건C)'에 의해 결정되고 있습니다. 이는 축열조를 더 크게 해도 HP 용량이 줄지 않는 상태입니다.`);
        recs.push(`HP 용량을 더 줄이려면 축열조 확장보다 운영시간을 늘리거나(재충전 여유시간 확보), 피크 시간대를 분산하는 운영 방식 변경이 효과적입니다.`);
      } else if(hpR.mode==="general" && hpR.cB > hpR.cA){
        tips.push(`현재 HP 용량은 '피크 보완 조건(조건B)'에 의해 결정됩니다. 축열조를 크게 할수록 HP 용량을 추가로 줄일 수 있습니다.`);
        const extraTank = hpt>0 ? (totalPeak-condA)*peakH/hpt*1.1 : 0;
        if(extraTank>effTank){
          recs.push(`조건C에 도달할 때까지 축열조를 키우면 HP 용량 절감 효과가 있습니다. 최적 탱크 규모는 약 ${fmt(extraTank,1)}톤 수준입니다.`);
        }
      }

      // 온도 경고
      if(tSup>60){
        warns.push(`HP 출수온도(${tSup}℃)가 일체형 최대 온도(60℃)를 초과합니다. 반드시 구분형 HP를 선정해야 합니다.`);
      }

      // COP 가중치
      if(copWt<0.9){
        tips.push(`COP 가중치 ${copWt} 적용 중입니다. 실제 운영 데이터 확보 후 재검토를 권장합니다.`);
      }

      // 난방·급탕 동시
      if(calcMode==="both"&&sc<1.0){
        tips.push(`동시사용계수 ${sc} 적용으로 난방 피크가 ${fmt((ht?.peakLoad||0)*(1-sc),1)}kW 절감되었습니다. 난방·급탕을 별도 HP로 구성할 경우 계수 1.0으로 재산정이 필요합니다.`);
      }

      // 모델 추천 상세
      if(recM){
        const totalKw=recM.kw*recN;
        const margin=((totalKw/hpR.needed)-1)*100;
        if(margin>40){
          recs.push(`추천 구성(${recM.label}×${recN}대, ${totalKw}kW)의 여유율이 ${margin.toFixed(0)}%로 높습니다. 하위 모델 조합도 검토해보세요.`);
        }
        if(recN>=3){
          recs.push(`HP ${recN}대 구성 시 단계 제어(staging) 및 고장 대응 운전 방안을 사전에 확인하세요.`);
        }
      }

      return { tips, warns, recs };
    })();

    return{srcT,tSup,dT,hpt,copRaw,copWt,effCOP,opH,heatW,peakH,sc,
           hw,ht,htPeakEff,totalPeak,totalMon,
           condA,tankPrelim,tankMin,existT,newT,effTank,
           hpR,recM,recN,isCDominated,tankOversized,summary,
           monthlyElec,elecCost,curCost,savings,payback,nR};
  },[customSrcT,wsrc,clim,supplyTemp,copInput,copWeight,opHRaw,biz,customHeatW,simCoef,
     calcMode,baths,bathtubs,siteOpts,unitRaw,heatArea,
     existTank,newTankRaw,tankSpace,elecType,nightRatio,
     fuelMon,fuelPrc,dayRate,nightRate,instCost]);

  // ═══════════════════════ CRUD ═══════════════════════
  const saveSpProj=async()=>{
    if(!spForm.name.trim()){alert("프로젝트명을 입력해주세요.");return;}
    const p={id:spEditId||Date.now().toString(),...spForm,name:spForm.name.trim(),updatedAt:new Date().toISOString(),calcData:null};
    const upd=spEditId?projects.map(x=>x.id===spEditId?{...x,...p,calcData:x.calcData}:x):[p,...projects];
    await persist(upd);setSpEditId(null);setSpForm(EMPTY_FORM);
  };
  const deleteProj=async id=>{if(!window.confirm("삭제하시겠습니까?"))return;await persist(projects.filter(p=>p.id!==id));if(activePid===id)setActivePid(null);};

  const CALC_FIELDS={calcMode,bizId,climId,wsrcId,customSrcT,unitRaw,opHRaw,baths,bathtubs,siteOpts,
    supplyTemp,copInput,copWeight,heatArea,customHeatW,simCoef,existTank,newTankRaw,tankSpace,
    elecType,nightRatio,fuelId,fuelUid,fuelMon,fuelPrc,dayRate,nightRate,instCost};

  const openCalc=p=>{
    setActivePid(p.id);
    if(p.calcData){
      const d=p.calcData;
      if(d.calcMode)setCalcMode(d.calcMode);
      if(d.bizId){setBizId(d.bizId);setOpHRaw(String(BIZ.find(b=>b.id===d.bizId)?.opH||12));}
      if(d.climId)setClimId(d.climId);if(d.wsrcId)setWsrcId(d.wsrcId);if(d.customSrcT!==undefined)setCustomSrcT(d.customSrcT);
      if(d.unitRaw)setUnitRaw(d.unitRaw);if(d.opHRaw)setOpHRaw(d.opHRaw);
      if(d.baths)setBaths(d.baths);if(d.bathtubs)setBathtubs(d.bathtubs);if(d.siteOpts)setSiteOpts(d.siteOpts);
      if(d.supplyTemp)setSupplyTemp(d.supplyTemp);if(d.copInput)setCopInput(d.copInput);if(d.copWeight)setCopWeight(d.copWeight);
      if(d.heatArea)setHeatArea(d.heatArea);if(d.customHeatW)setCustomHeatW(d.customHeatW);
      if(d.simCoef)setSimCoef(d.simCoef);
      if(d.existTank)setExistTank(d.existTank);if(d.newTankRaw)setNewTankRaw(d.newTankRaw);if(d.tankSpace)setTankSpace(d.tankSpace);
      if(d.elecType)setElecType(d.elecType);if(d.nightRatio)setNightRatio(d.nightRatio);
      if(d.fuelId)setFuelId(d.fuelId);if(d.fuelUid)setFuelUid(d.fuelUid);
      if(d.fuelMon)setFuelMon(d.fuelMon);if(d.fuelPrc)setFuelPrc(d.fuelPrc);
      if(d.dayRate)setDayRate(d.dayRate);if(d.nightRate)setNightRate(d.nightRate);if(d.instCost)setInstCost(d.instCost);
    }
    setTab("calc");
  };
  const saveCalc=async()=>{
    if(!activePid){alert("프로젝트를 먼저 선택해주세요.");return;}
    await persist(projects.map(p=>p.id===activePid?{...p,calcData:CALC_FIELDS,updatedAt:new Date().toISOString()}:p));
    alert("저장 완료!");
  };

  // ═══════════════════════ 내보내기 ═══════════════════════
  const exportResult=()=>{
    const proj=projects.find(p=>p.id===activePid);
    const{srcT,tSup,dT,hpt,copRaw,copWt,effCOP,opH,heatW,peakH,sc,
          hw,ht,htPeakEff,totalPeak,totalMon,condA,tankMin,existT,newT,effTank,
          hpR,recM,recN,monthlyElec,elecCost,curCost,savings,payback,nR}=R;
    const climI=CLIMATE.find(c=>c.id===climId);
    const wsrcI=WSRC.find(w=>w.id===wsrcId);
    const bizI=BIZ.find(b=>b.id===bizId);
    const fuelI=FUELS.find(f=>f.id===fuelId);
    const L=[];
    const ln=(s="")=>L.push(s);
    const lnv=(label,val,note="")=>L.push(`  ${label.padEnd(18)}: ${val}${note?" ("+note+")":""}`);
    const div=s=>{ln("");ln(`▌ ${s}`);};

    ln("════════════════════════════════════════════════════════════");
    ln("  HP·축열조 용량 산정 — 전체 설정값 및 산정 결과");
    ln(`  출력일시: ${new Date().toLocaleString("ko-KR")}`);
    ln("════════════════════════════════════════════════════════════");

    div("프로젝트 정보");
    lnv("프로젝트명",proj?.name||"(미연결)");
    lnv("담당자",proj?.manager||"-");
    lnv("진행상황",STATUS_LIST.find(s=>s.id===proj?.status)?.label||"-");
    lnv("지역",[proj?.sido,proj?.sigungu].filter(Boolean).join(" ")||"-");
    lnv("유통사",proj?.distributor||"-");
    lnv("설치업체",proj?.installer||"-");
    lnv("메모",proj?.memo||"-");

    div("기본 조건");
    lnv("분석 대상",calcMode==="both"?"난방+급탕":calcMode==="heating"?"난방만":"급탕만");
    lnv("업종",bizI?.label||"-");
    lnv("기후대",`${climI?.label} (${climI?.desc})`);
    lnv("열원",`${wsrcI?.label} → 입수온도 ${srcT}℃${customSrcT?" (직접입력)":""}`);
    lnv("HP 출수온도",`${tSup}℃ (공급헤더 기준)`);
    lnv("온도차 ΔT",`${dT}℃ → 단위열량 ${fmt(hpt,4)} kWh/톤`);
    lnv("일 운영시간",`${opH}h/일`);
    lnv("COP",`입력 ${copRaw} × 가중치 ${copWt} = 적용 COP ${fmt(effCOP,2)}`);
    lnv("전기 계약",elecType==="day"?"일반전기":elecType==="night"?"심야전기":`혼용(심야${nightRatio}%/주간${100-parseInt(nightRatio||70)}%)`);
    lnv("축열조 공간",tankSpace==="yes"?"있음":"없음");
    if(calcMode==="both") lnv("동시사용계수",`${sc} (난방 부하에 적용)`);

    if(ht||calcMode!=="hotwater"){
      div("난방 부하");
      if(ht){
        lnv("난방 면적",`${heatArea}평 = ${fmt((parseFloat(heatArea)||0)*3.3,0)}m²`);
        lnv("기준부하",`${heatW}W/평`);
        lnv("피크 난방부하",`${fmt(ht.peakLoad,1)}kW`);
        lnv("동시사용계수 적용",`${fmt(ht.peakLoad,1)}kW × ${sc} = ${fmt(htPeakEff,1)}kW`);
        lnv("월 난방열량",`${fmt0(ht.monthlyHeat)}kWh/월`);
      } else { ln("  면적 미입력 → 제외"); }
    }

    if(hw||calcMode!=="heating"){
      div("급탕 부하");
      if(hw){
        lnv("일일 온수량(등가)",`${fmt(hw.dailyWater,2)}톤/일`);
        lnv("일일 급탕열량",`${fmt(hw.dailyHeat,1)}kWh/일`);
        lnv("기준 부하",`${fmt(hw.baseLoad,1)}kW`);
        lnv("피크 열부하",`${fmt(hw.peakLoad,1)}kW`);
        lnv("월 급탕열량",`${fmt0(hw.monthlyHeat)}kWh/월`);
      } else { ln("  조건 미입력 → 제외"); }
    }

    if(hw||ht){
      div("합산 부하");
      lnv("합산 피크",`${fmt(totalPeak,1)}kW (급탕 ${fmt(hw?.peakLoad||0,1)}kW + 난방×계수 ${fmt(htPeakEff,1)}kW)`);
      lnv("월 총 열량",`${fmt0(totalMon)}kWh/월`);
    }

    if(hpR){
      div("히트펌프 산정");
      if(hpR.mode==="notank"){
        lnv("방식","축열조 없음 → HP 단독 피크 담당");
        lnv("HP 필요 용량",`${fmt(hpR.needed,1)}kW = 합산피크 × 1.1`);
      } else if(hpR.mode==="night"){
        lnv("방식","심야 집중충전 (심야 8h)");
        ln("  ※ 심야모드 가정: 급탕은 심야 축열, 난방은 주간 HP 직접 운전 병행");
        lnv("조건A (심야충전)",`${fmt(hpR.cA,1)}kW = 일일급탕열량÷8h×1.1`);
        lnv("조건B (난방×계수)",`${fmt(hpR.cB,1)}kW`);
        lnv("HP 필요 용량",`${fmt(hpR.needed,1)}kW = max(A,B)`);
      } else {
        lnv("조건A",`${fmt(hpR.cA,1)}kW = 급탕기준부하×1.25+난방×계수`);
        lnv("탱크 방열속도",`${fmt(hpR.tankDR,1)}kW`);
        lnv("조건B",`${fmt(hpR.cB,1)}kW = max(A, 합산피크-방열속도)`);
        lnv("탱크 방열량",`${fmt(hpR.tankUsed,1)}kWh`);
        lnv("재충전 가능시간",`${fmt(hpR.rechT,1)}h`);
        lnv("조건C",`${fmt(hpR.cC,1)}kW = 시설수요+방열량÷재충전시간`);
        lnv("HP 필요 용량",`${fmt(hpR.needed,1)}kW = max(A,B,C)`);
      }
      if(recM) lnv("추천 구성",`${recM.label} × ${recN}대 = ${recM.kw*recN}kW`);
      ln("  ※ 최소 대수 우선 선정. 부분부하 효율·백업 운전 필요 시 다중 분할 구성 별도 검토");
    }

    if(tankSpace==="yes"){
      div("축열조 산정");
      lnv("산정 방식","최종 HP 용량 기준 부족열량 역산");
      lnv("산정(최소)",`${fmt(tankMin,1)}톤 = (합산피크-HP용량)×피크시간÷단위열량×1.1`);
      lnv("기존 축열조",`${existT}톤`);
      lnv("계획 축열조",newT>0?`${newT}톤`:"(자동)");
      lnv("적용 축열조",`${fmt(effTank,1)}톤`);
    }

    if(monthlyElec>0){
      div("경제성");
      lnv("월 전력소비",`${fmt0(monthlyElec)}kWh/월`);
      lnv("HP 월 운영비",`${fmt0(elecCost)}원/월`);
      if(curCost>0){lnv("현재 연료비",`${fmt0(curCost)}원/월`);lnv("월 절감",`${fmt0(savings)}원/월`);}
      if(payback) lnv("투자회수기간",`${payback.toFixed(1)}년`);
    }

    const{summary:s2}=R;
    if(s2&&(s2.warns.length>0||s2.tips.length>0||s2.recs.length>0)){
      div("설계 총평 및 추천사항");
      if(s2.warns.length>0){ln("  [주의사항]");s2.warns.forEach(w=>ln("  ⚠ "+w));}
      if(s2.tips.length>0){ln("  [현황 분석]");s2.tips.forEach(t=>ln("  • "+t));}
      if(s2.recs.length>0){ln("  [설계 추천]");s2.recs.forEach((r,i)=>ln(`  ${i+1}. ${r}`));}
    }

    ln("");ln("════════════════════════════════════════════════════════════");
    ln("※ 본 결과는 개략 검토용입니다. 실제 설계 시 정밀 열부하 계산서 작성 필요.");
    ln("════════════════════════════════════════════════════════════");
    const text=L.join("\n");
    navigator.clipboard.writeText(text)
      .then(()=>alert("복사 완료!\n대화창에 붙여넣기하면 Claude가 바로 논의 가능합니다."))
      .catch(()=>{const ta=document.createElement("textarea");ta.value=text;document.body.appendChild(ta);ta.select();document.execCommand("copy");document.body.removeChild(ta);alert("복사 완료!");});
  };

  // ─── 필터 ───
  const filteredProjs=projects.filter(p=>{
    if(spFilter!=="all"&&p.status!==spFilter)return false;
    if(spFMgr&&!(p.manager||"").toLowerCase().includes(spFMgr.toLowerCase()))return false;
    if(spFSido&&p.sido!==spFSido)return false;
    if(spSearch&&!(p.name||"").toLowerCase().includes(spSearch.toLowerCase()))return false;
    return true;
  });

  // ─── 스타일 ───
  const W   ={fontFamily:"'Pretendard','맑은 고딕',sans-serif",background:C.bg,minHeight:"100vh",paddingBottom:60};
  const HDR ={background:C.pri,color:"#fff",padding:"13px 18px",display:"flex",justifyContent:"space-between",alignItems:"center",position:"sticky",top:0,zIndex:100,boxShadow:"0 2px 8px rgba(0,0,0,.25)"};
  const TABS={display:"flex",background:C.card,borderBottom:`1px solid ${C.bd}`,padding:"0 14px",gap:2,overflowX:"auto"};
  const tb  =a=>({padding:"11px 16px",fontSize:13.5,fontWeight:a?700:500,color:a?C.acc:C.sub,background:"none",border:"none",borderBottom:a?`2.5px solid ${C.acc}`:`2.5px solid transparent`,cursor:"pointer",fontFamily:"inherit",whiteSpace:"nowrap"});
  const CONT={maxWidth:760,margin:"0 auto",padding:"14px 12px",width:"100%",boxSizing:"border-box"};
  const SEC ={background:C.card,borderRadius:10,padding:"16px 18px",marginBottom:12,border:`1px solid ${C.bd}`};
  const SECH={fontSize:14.5,fontWeight:700,color:C.pri,marginBottom:14,display:"flex",alignItems:"center",gap:6};
  const ROW ={display:"flex",alignItems:"center",gap:8,marginBottom:10,flexWrap:"wrap"};
  const LBL ={fontSize:13,color:C.sub,minWidth:112,flexShrink:0};
  const IST ={background:C.inp,border:`1px solid ${C.inpB}`,borderRadius:6,padding:"8px 10px",fontSize:14,color:C.txt,outline:"none",fontFamily:"inherit",minHeight:36};
  const INP ={...IST,width:90};
  const SEL ={...IST,cursor:"pointer",width:160};
  const BTN ={border:"none",borderRadius:6,cursor:"pointer",fontFamily:"inherit",fontWeight:600,fontSize:13,transition:"all .15s"};
  const RBOX={background:dark?"#1E3A5F":"#EFF6FF",border:`1px solid ${dark?"#2563EB":"#BFDBFE"}`,borderRadius:8,padding:"14px 16px"};
  const DTBTN={background:"none",border:"none",cursor:"pointer",fontSize:12,color:C.acc,padding:"4px 0 0",fontFamily:"inherit",display:"flex",alignItems:"center",gap:4,marginTop:4};
  const DTBOX=o=>({background:dark?"#0D1F35":"#F0F7FF",border:`1px dashed ${C.bd}`,borderRadius:6,padding:o?"13px":0,marginTop:4,overflow:"hidden",maxHeight:o?2800:0,transition:"max-height .4s ease",fontSize:12.5,color:C.txt,lineHeight:1.85});
  const tog=k=>setOpenDet(p=>({...p,[k]:!p[k]}));

  const FLine=({lbl,f,val,u,n})=>(
    <div style={{marginBottom:5}}>
      <b style={{color:C.pri}}>{lbl}</b>{f&&<span style={{color:C.sub}}> = {f}</span>}
      <b style={{color:C.acc}}> → {val}{u?" "+u:""}</b>
      {n&&<div style={{color:C.sub,fontSize:11.5,paddingLeft:10}}>※ {n}</div>}
    </div>
  );
  const statBadge=sid=>{const s=STATUS_LIST.find(x=>x.id===sid);return s?{color:s.color,background:s.bg,border:`1px solid ${s.border}`,padding:"2px 9px",borderRadius:12,fontSize:12,fontWeight:600,whiteSpace:"nowrap"}:{};};

  const{srcT,tSup,dT,hpt,copRaw,copWt,effCOP,opH,heatW,peakH,sc,
        hw,ht,htPeakEff,totalPeak,totalMon,condA,tankMin,existT,newT,effTank,
        hpR,recM,recN,isCDominated,tankOversized,summary,
        monthlyElec,elecCost,curCost,savings,payback,nR}=R;

  // ─── 이름 저장 ───
  const saveName=(n)=>{setMyName(n);localStorage.setItem("hp_myname",n);setShowNameModal(false);};

  return(
  <div style={W}>
    {/* 이름 입력 모달 */}
    {showNameModal&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <div style={{background:C.card,borderRadius:14,padding:"28px 24px",maxWidth:360,width:"100%",boxShadow:"0 8px 32px rgba(0,0,0,.3)"}}>
        <div style={{fontSize:16,fontWeight:700,color:C.pri,marginBottom:6}}>👋 본인을 선택해주세요</div>
        <div style={{fontSize:13,color:C.sub,marginBottom:16}}>팀원들이 누가 수정했는지 확인할 수 있습니다.</div>
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {MEMBERS.map(m=>(
            <button key={m} onClick={()=>saveName(m)} style={{...BTN,padding:"12px 16px",fontSize:15,background:myName===m?C.acc:"transparent",color:myName===m?"#fff":C.txt,border:`2px solid ${myName===m?C.acc:C.bd}`,borderRadius:8,textAlign:"left"}}>{m}</button>
          ))}
        </div>
      </div>
    </div>}

    <div style={HDR}>
      <div><div style={{fontSize:16,fontWeight:700}}>🌡️ HP 용량 산정 시스템 v10</div><div style={{fontSize:11,opacity:.75}}>히트펌프 · 축열조 산정 & 프로젝트 관리</div></div>
      <div style={{display:"flex",alignItems:"center",gap:8}}>
        <span onClick={()=>setShowNameModal(true)} style={{fontSize:12,color:"rgba(255,255,255,.8)",cursor:"pointer",padding:"4px 8px",borderRadius:4,background:"rgba(255,255,255,.12)"}}>{myName||"이름 설정"}</span>
        <button onClick={()=>setDark(!dark)} style={{...BTN,background:"rgba(255,255,255,.18)",color:"#fff",padding:"6px 13px"}}>{dark?"☀️ 라이트":"🌙 다크"}</button>
      </div>
    </div>
    <div style={TABS}>
      {[["status","📊 프로젝트 현황"],["calc","📐 용량 산정"],["econ","💰 경제성 분석"]].map(([id,lbl])=>(
        <button key={id} style={tb(tab===id)} onClick={()=>{
          if((tab==="calc"||tab==="econ")&&id==="status"&&activePid){
            if(!window.confirm("현재 탭을 나가시겠습니까?\n저장하지 않은 변경사항은 사라집니다."))return;
          }
          setTab(id);
        }}>{lbl}</button>
      ))}
    </div>
    <div style={CONT}>

    {/* ══ TAB 1: 프로젝트 현황 ══ */}
    {tab==="status"&&(<>
      <div style={SEC}>
        <div style={SECH}>{spEditId?"✏️ 프로젝트 수정":"➕ 새 프로젝트 추가"}</div>
        <div style={ROW}><span style={LBL}>프로젝트명 *</span><input value={spForm.name} onChange={e=>setSpForm({...spForm,name:e.target.value})} placeholder="예) 파주 백학 리조트" style={{...IST,width:210}}/><span style={LBL}>담당자</span><select value={spForm.manager} onChange={e=>setSpForm({...spForm,manager:e.target.value})} style={{...SEL,width:110}}><option value="">선택</option>{MEMBERS.map(m=><option key={m} value={m}>{m}</option>)}</select></div>
        <div style={ROW}><span style={LBL}>진행상황 *</span><div style={{display:"flex",gap:5,flexWrap:"wrap"}}>{STATUS_LIST.map(s=>(<button key={s.id} onClick={()=>setSpForm({...spForm,status:s.id})} style={{...BTN,padding:"5px 11px",fontSize:12,background:spForm.status===s.id?s.color:"transparent",color:spForm.status===s.id?"#fff":s.color,border:`1.5px solid ${s.color}`}}>{s.label}</button>))}</div></div>
        <div style={ROW}>
          <span style={LBL}>시도</span>
          <select value={spForm.sido} onChange={e=>setSpForm({...spForm,sido:e.target.value,sigungu:""})} style={{...SEL,width:120}}><option value="">선택</option>{Object.keys(SIDO_GU).map(s=><option key={s} value={s}>{s}</option>)}</select>
          <span style={{fontSize:13,color:C.sub,flexShrink:0}}>시군구</span>
          {spForm.sido?(<select value={spForm.sigungu} onChange={e=>setSpForm({...spForm,sigungu:e.target.value})} style={{...SEL,width:130}}><option value="">선택</option>{(SIDO_GU[spForm.sido]||[]).map(s=><option key={s} value={s}>{s}</option>)}</select>):(<input value={spForm.sigungu} onChange={e=>setSpForm({...spForm,sigungu:e.target.value})} placeholder="직접 입력" style={{...IST,width:120}}/>)}
        </div>
        <div style={ROW}><span style={LBL}>유통사</span><input value={spForm.distributor} onChange={e=>setSpForm({...spForm,distributor:e.target.value})} placeholder="(주)OO유통" style={{...IST,width:140}}/><span style={LBL}>설치업체</span><input value={spForm.installer} onChange={e=>setSpForm({...spForm,installer:e.target.value})} placeholder="OO설비" style={{...IST,width:140}}/></div>
        <div style={ROW}><span style={LBL}>메모</span><input value={spForm.memo} onChange={e=>setSpForm({...spForm,memo:e.target.value})} placeholder="규모·특이사항 등" style={{...IST,width:300}}/></div>
        <div style={{display:"flex",gap:8,marginTop:6}}>
          <button onClick={saveSpProj} style={{...BTN,background:C.acc,color:"#fff",padding:"9px 20px"}}>{spEditId?"✅ 수정 완료":"➕ 프로젝트 추가"}</button>
          {spEditId&&<button onClick={()=>{setSpEditId(null);setSpForm(EMPTY_FORM);}} style={{...BTN,background:"#9CA3AF",color:"#fff",padding:"9px 14px"}}>취소</button>}
        </div>
      </div>
      <div style={SEC}>
        <div style={{...SECH,justifyContent:"space-between"}}><span>📋 프로젝트 목록 ({projects.length}건)</span></div>
        <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:12}}>
          {STATUS_LIST.map(s=>{const cnt=projects.filter(p=>p.status===s.id).length;return(<div key={s.id} style={{padding:"4px 11px",borderRadius:16,background:s.bg,border:`1px solid ${s.border}`,fontSize:12}}><span style={{color:s.color,fontWeight:700}}>{s.label}</span><span style={{color:s.color,fontWeight:600,marginLeft:5}}>{cnt}</span></div>);})}
        </div>
        <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:10,alignItems:"center"}}>
          <div style={{position:"relative",flex:"1 1 120px"}}><span style={{position:"absolute",left:8,top:"50%",transform:"translateY(-50%)",fontSize:13,color:C.sub,pointerEvents:"none"}}>🔍</span><input value={spSearch} onChange={e=>setSpSearch(e.target.value)} placeholder="프로젝트명 검색" style={{...IST,width:"100%",paddingLeft:28,boxSizing:"border-box"}}/></div>
          <select value={spFMgr} onChange={e=>setSpFMgr(e.target.value)} style={{...SEL,width:100}}><option value="">👤 담당자</option>{MEMBERS.map(m=><option key={m} value={m}>{m}</option>)}</select>
          <select value={spFSido} onChange={e=>setSpFSido(e.target.value)} style={{...SEL,width:100}}><option value="">📍 지역 전체</option>{Object.keys(SIDO_GU).map(s=><option key={s} value={s}>{s}</option>)}</select>
          <div style={{display:"flex",gap:3,flexWrap:"wrap"}}>{[["all","전체"],...STATUS_LIST.map(s=>[s.id,s.label])].map(([id,lbl])=>(<button key={id} onClick={()=>setSpFilter(id)} style={{...BTN,padding:"5px 9px",fontSize:12,fontWeight:spFilter===id?700:400,background:spFilter===id?C.acc:"transparent",color:spFilter===id?"#fff":C.sub,border:`1px solid ${spFilter===id?C.acc:C.bd}`}}>{lbl}</button>))}</div>
        </div>
        {loading?(
          <div style={{textAlign:"center",padding:"40px 0",color:C.sub}}><div style={{fontSize:24,marginBottom:8,animation:"spin 1s linear infinite"}}>⏳</div><div>데이터 불러오는 중...</div></div>
        ):filteredProjs.length===0?(
          <div style={{textAlign:"center",padding:"28px 0",color:C.sub}}><div style={{fontSize:28,marginBottom:6}}>📋</div><div>{(spSearch||spFMgr||spFSido||spFilter!=="all")?"검색 결과 없음":"프로젝트가 없습니다. 위에서 추가해주세요."}</div></div>
        ):filteredProjs.map(p=>(
          <div key={p.id} style={{display:"flex",alignItems:"flex-start",gap:7,padding:"12px 14px",borderRadius:8,border:`1px solid ${C.bd}`,marginBottom:7,background:dark?"#1E293B":"#FAFBFF"}}>
            <div style={{flex:1}}>
              <div style={{display:"flex",alignItems:"center",gap:7,flexWrap:"wrap"}}>
                <span style={{fontSize:14,fontWeight:700,color:C.pri}}>{p.name}</span>
                <span style={statBadge(p.status)}>{STATUS_LIST.find(s=>s.id===p.status)?.label}</span>
                {activePid===p.id&&<span style={{fontSize:11,color:C.res,fontWeight:700}}>● 작업 중</span>}
              </div>
              <div style={{fontSize:12,color:C.sub,marginTop:3}}>
                {p.manager&&<span>👤 {p.manager} · </span>}
                {(p.sido||p.sigungu)&&<span>📍 {[p.sido,p.sigungu].filter(Boolean).join(" ")} · </span>}
                {p.distributor&&<span>🏢 {p.distributor} · </span>}
                {p.installer&&<span>🔧 {p.installer} · </span>}
                {p.memo&&<span>{p.memo}</span>}
              </div>
              <div style={{fontSize:11,color:C.sub,marginTop:2,display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
                {p.updatedAt&&<span>{new Date(p.updatedAt).toLocaleString("ko-KR")}</span>}
                {p.lastEditor&&<span style={{color:dark?"#60A5FA":"#2563EB",fontWeight:600}}>✏️ {p.lastEditor}</span>}
                {p.calcData?<span style={{color:C.res,fontWeight:600}}>✅ 산정완료</span>:<span style={{color:C.warn,fontWeight:600}}>⏳ 미산정</span>}
              </div>
            </div>
            <button onClick={()=>openCalc(p)} style={{...BTN,padding:"6px 12px",fontSize:12,background:C.acc,color:"#fff",flexShrink:0}}>📐 용량산정</button>
            <button onClick={()=>{setSpEditId(p.id);setSpForm({name:p.name,status:p.status,sido:p.sido||"",sigungu:p.sigungu||"",manager:p.manager||"",distributor:p.distributor||"",installer:p.installer||"",memo:p.memo||""});window.scrollTo(0,0);}} style={{...BTN,padding:"6px 10px",fontSize:12,background:C.hi,color:C.acc,border:`1px solid ${C.acc}`,flexShrink:0}}>수정</button>
            <button onClick={()=>deleteProj(p.id)} style={{...BTN,padding:"6px 10px",fontSize:12,background:"#FFF5F5",color:C.err,border:"1px solid #FCA5A5",flexShrink:0}}>삭제</button>
          </div>
        ))}
      </div>
    </>)}

    {/* ══ TAB 2: 용량 산정 ══ */}
    {tab==="calc"&&(<>
      <div style={SEC}>
        <div style={SECH}>🗂️ 프로젝트 연결</div>
        {projects.length>0?(
          <div style={ROW}>
            <span style={LBL}>프로젝트 선택</span>
            <select value={activePid||""} onChange={e=>{const p=projects.find(x=>x.id===e.target.value);if(p)openCalc(p);else setActivePid(null);}} style={{...SEL,width:260}}><option value="">-- 선택해주세요 --</option>{projects.map(p=><option key={p.id} value={p.id}>{p.name} [{STATUS_LIST.find(s=>s.id===p.status)?.label||""}]</option>)}</select>
            {activeProj&&<span style={{fontSize:12,color:C.res,fontWeight:600}}>✅ {activeProj.name}</span>}
          </div>
        ):(
          <div style={{fontSize:13,color:C.sub}}>먼저 <button onClick={()=>setTab("status")} style={{...BTN,color:C.acc,background:"none",padding:0,textDecoration:"underline",fontSize:13}}>프로젝트 현황</button> 탭에서 프로젝트를 추가해주세요.</div>
        )}
        <div style={{display:"flex",gap:8,marginTop:10}}>
          <button onClick={saveCalc} style={{...BTN,background:activePid?C.acc:"#9CA3AF",color:"#fff",padding:"8px 18px"}} disabled={!activePid}>💾 저장</button>
          <button onClick={exportResult} style={{...BTN,background:dark?"#065F46":"#ECFDF5",color:C.res,border:`1.5px solid ${C.res}`,padding:"8px 16px"}}>📋 전체 내용 복사</button>
        </div>
      </div>

      {/* STEP 1 */}
      <div style={SEC}>
        <div style={SECH}>STEP 1. 분석 범위</div>
        <div style={{display:"flex",gap:7,flexWrap:"wrap"}}>
          {[["heating","🔥 난방만"],["hotwater","🚿 급탕만"],["both","🔥🚿 난방+급탕"]].map(([id,lbl])=>(
            <button key={id} onClick={()=>setCalcMode(id)} style={{...BTN,padding:"9px 18px",fontSize:13.5,background:calcMode===id?C.pri:"transparent",color:calcMode===id?"#fff":C.sub,border:`1.5px solid ${calcMode===id?C.pri:C.bd}`}}>{lbl}</button>
          ))}
        </div>
      </div>

      {/* STEP 2 */}
      <div style={SEC}>
        <div style={SECH}>STEP 2. 현장 조건</div>

        {/* 업종 */}
        <div style={ROW}>
          <span style={LBL}>업종</span>
          <select value={bizId} onChange={e=>{setBizId(e.target.value);const b=BIZ.find(x=>x.id===e.target.value);if(b){setOpHRaw(String(b.opH));if(calcMode==="both"&&b.defSC)setSimCoef(b.defSC);}}} style={{...SEL,width:230}}><option value="">선택해주세요</option>{BIZ.map(b=><option key={b.id} value={b.id}>{b.label}</option>)}</select>
        </div>

        {/* 기후대 */}
        <div style={ROW}>
          <span style={LBL}>기후대</span>
          <select value={climId} onChange={e=>{setClimId(e.target.value);setCustomSrcT("");}} style={{...SEL,width:165}}>{CLIMATE.map(c=><option key={c.id} value={c.id}>{c.label}</option>)}</select>
          <span style={{fontSize:12,color:C.sub}}>{clim.desc}</span>
        </div>

        {/* 난방 기준부하 */}
        {calcMode!=="hotwater"&&(
          <div style={{background:dark?"#1E3A5F":"#EFF6FF",border:`1px solid ${dark?"#2563EB":"#BFDBFE"}`,borderRadius:7,padding:"10px 14px",marginBottom:10}}>
            <div style={{fontSize:12,color:C.sub,marginBottom:6}}>📌 기후대별 평당 난방 기준부하 (경험 평균치)</div>
            <div style={{display:"flex",gap:16,flexWrap:"wrap",marginBottom:8}}>{CLIMATE.map(c=><span key={c.id} style={{fontSize:13,fontWeight:climId===c.id?700:400,color:climId===c.id?C.acc:C.sub}}>{c.label}: <b>{c.heatW}W/평</b></span>)}</div>
            <div style={{display:"flex",alignItems:"center",gap:8,fontSize:13}}>
              <span style={{color:C.sub}}>적용값:</span>
              <NI v={customHeatW||String(clim.heatW)} s={setCustomHeatW} ph={String(clim.heatW)} st={{...INP,width:70}} sfx="W/평"/>
              {customHeatW&&customHeatW!==String(clim.heatW)&&<button onClick={()=>setCustomHeatW("")} style={{...BTN,fontSize:11,padding:"2px 7px",background:"#F3F4F6",color:C.sub,border:`1px solid ${C.bd}`}}>기본값 복원</button>}
            </div>
          </div>
        )}

        {/* 열원 */}
        <div style={ROW}>
          <span style={LBL}>열원 종류</span>
          <select value={wsrcId} onChange={e=>{setWsrcId(e.target.value);setCustomSrcT("");}} style={{...SEL,width:120}}>{WSRC.map(w=><option key={w.id} value={w.id}>{w.label}</option>)}</select>
          <span style={{fontSize:12.5,color:C.sub,flexShrink:0}}>입수온도:</span>
          <NI v={customSrcT||String(wsrc.getT(clim))} s={setCustomSrcT} ph={String(wsrc.getT(clim))} st={{...INP,width:60}} sfx="℃"/>
          {customSrcT&&<button onClick={()=>setCustomSrcT("")} style={{...BTN,fontSize:11,padding:"2px 7px",background:"#F3F4F6",color:C.sub,border:`1px solid ${C.bd}`}}>기본값</button>}
          <span style={{fontSize:11.5,color:C.sub}}>(기준: {wsrc.getT(clim)}℃)</span>
        </div>

        {/* HP 출수온도 */}
        {calcMode!=="heating"&&(<>
          <div style={ROW}>
            <span style={LBL}>HP 출수온도</span>
            <NI v={supplyTemp} s={setSupplyTemp} ph="55" st={{...INP,width:70}} sfx="℃"/>
            <span style={{fontSize:12,color:C.sub}}>공급 헤더 기준 — 실사용 온도(40~45℃) 대비 +10~15℃ 권장</span>
          </div>
          {tSup>60&&<div style={{padding:"7px 12px",background:"#FEF3C7",border:"1px solid #F59E0B",borderRadius:6,fontSize:12,color:"#92400E",marginBottom:8}}>⚠️ 출수온도 {tSup}℃ → 일체형(최대 60℃) 초과. <b>구분형</b>(최대 80℃) 선정 필요</div>}
        </>)}

        {/* COP */}
        <div style={ROW}>
          <span style={LBL}>COP 입력</span>
          <NI v={copInput} s={setCopInput} ph="3.5" st={{...INP,width:70}}/>
          <span style={{fontSize:12.5,color:C.sub,flexShrink:0}}>가중치:</span>
          <div style={{display:"flex",gap:4}}>
            {COP_WEIGHTS.map(w=>(<button key={w.v} onClick={()=>setCopWeight(w.v)} style={{...BTN,padding:"5px 10px",fontSize:12,background:copWeight===w.v?C.acc:"transparent",color:copWeight===w.v?"#fff":C.sub,border:`1px solid ${copWeight===w.v?C.acc:C.bd}`}}>{w.label}<span style={{fontSize:10,display:"block",opacity:.75}}>{w.v}</span></button>))}
          </div>
          <span style={{fontSize:12.5,color:C.acc,fontWeight:700}}>= 적용 COP {fmt(effCOP,2)}</span>
        </div>

        {/* 동시사용계수 — 난방+급탕 모드에서만 표시 */}
        {calcMode==="both"&&(
          <div style={{background:dark?"#2D1B4E":"#F5F3FF",border:`1px solid ${dark?"#7C3AED":"#DDD6FE"}`,borderRadius:7,padding:"10px 14px",marginBottom:10}}>
            <div style={{fontSize:12.5,fontWeight:700,color:dark?"#C4B5FD":"#7C3AED",marginBottom:7}}>⚡ 난방·급탕 동시사용계수</div>
            <div style={{fontSize:12,color:C.sub,marginBottom:8}}>급탕(단기 집중)과 난방(완만한 지속)은 동시에 최대치로 발생하지 않습니다. 계수 &lt; 1.0이면 난방 피크에 할인 적용.</div>
            <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:8,alignItems:"center"}}>
              <span style={{fontSize:13,color:C.sub,flexShrink:0}}>직접 입력:</span>
              <NI v={simCoef} s={setSimCoef} ph="1.0" st={{...INP,width:65}} sfx=""/>
              <span style={{fontSize:12,color:C.sub,flexShrink:0}}>업종 기본값 →</span>
              {biz?.defSC&&<button onClick={()=>setSimCoef(biz.defSC)} style={{...BTN,padding:"5px 10px",fontSize:12,background:C.acc,color:"#fff"}}>업종 기본 ({biz.defSC})</button>}
              <button onClick={()=>setSimCoef("1.0")} style={{...BTN,padding:"5px 10px",fontSize:12,background:"transparent",color:C.sub,border:`1px solid ${C.bd}`}}>1.0 (동시최대)</button>
            </div>
            <div style={{display:"flex",gap:10,flexWrap:"wrap",fontSize:12,color:C.sub}}>
              {[["숙박업","0.6"],["목욕업","0.8"],["음식점·상업","0.5"]].map(([lbl,v])=>(
                <span key={lbl} style={{cursor:"pointer",color:simCoef===v?C.acc:C.sub,textDecoration:simCoef===v?"underline":"none"}} onClick={()=>setSimCoef(v)}>{lbl}: {v}</span>
              ))}
            </div>
            {sc<1&&<div style={{marginTop:7,fontSize:12,color:dark?"#C4B5FD":"#7C3AED"}}>→ 난방 피크 {fmt(ht?.peakLoad||0,1)}kW × {sc} = <b>{fmt(htPeakEff,1)}kW</b> 적용</div>}
          </div>
        )}

        {/* 전기 계약 */}
        <div style={ROW}>
          <span style={LBL}>전기 계약</span>
          <div style={{display:"flex",gap:6}}>
            {[["day","일반전기"],["night","심야전기"],["mixed","혼용(일반+심야)"]].map(([id,lbl])=>(
              <button key={id} onClick={()=>setElecType(id)} style={{...BTN,padding:"6px 12px",fontSize:12.5,background:elecType===id?C.acc:"transparent",color:elecType===id?"#fff":C.sub,border:`1.5px solid ${elecType===id?C.acc:C.bd}`}}>{lbl}</button>
            ))}
          </div>
          {elecType==="mixed"&&<span style={{display:"flex",alignItems:"center",gap:4,fontSize:13,marginLeft:4}}>심야 비율 <NI v={nightRatio} s={setNightRatio} ph="70" st={{...INP,width:55}} sfx="%"/></span>}
        </div>
        {(elecType==="night"||elecType==="mixed")&&<div style={{padding:"8px 12px",background:"#F5F3FF",border:"1px solid #DDD6FE",borderRadius:6,fontSize:12,color:"#5B21B6",marginBottom:8,lineHeight:1.6}}>
          ⚡ 심야 모드 — <b>급탕은 심야 8h 집중 충전, 주간 방열 위주</b> 운영.<br/>
          <span style={{color:"#7C3AED"}}>※ 난방이 있는 경우: 심야 축열탱크에서 급탕만 저장하고, <b>난방은 주간에 HP가 직접 운전</b>하는 방식 가정. 급탕+난방 동시 축열이 필요한 경우 별도 검토 필요.</span>
        </div>}

        {/* 운영시간 */}
        <div style={ROW}><span style={LBL}>일 운영시간</span><NI v={opHRaw||String(biz?.opH||12)} s={setOpHRaw} ph="12" st={{...INP,width:70}} sfx="h/일"/>{biz&&<span style={{fontSize:12,color:C.sub}}>(업종 기본값: {biz.opH}h)</span>}</div>

        {/* 축열조 공간 */}
        <div style={ROW}>
          <span style={LBL}>축열조 공간</span>
          <button onClick={()=>setTankSpace("yes")} style={{...BTN,padding:"7px 16px",fontSize:13,background:tankSpace==="yes"?C.res:"transparent",color:tankSpace==="yes"?"#fff":C.sub,border:`1.5px solid ${tankSpace==="yes"?C.res:C.bd}`}}>✅ 있음</button>
          <button onClick={()=>setTankSpace("no")}  style={{...BTN,padding:"7px 16px",fontSize:13,background:tankSpace==="no"?C.err:"transparent",color:tankSpace==="no"?"#fff":C.sub,border:`1.5px solid ${tankSpace==="no"?C.err:C.bd}`}}>❌ 없음</button>
          {tankSpace==="no"&&<span style={{fontSize:12,color:C.err}}>→ HP가 피크 전체 담당 (용량 증가)</span>}
        </div>
      </div>

      {/* STEP 3 */}
      <div style={SEC}>
        <div style={SECH}>STEP 3. 부하 입력</div>

        {/* 난방 */}
        {calcMode!=="hotwater"&&(
          <div style={{marginBottom:calcMode==="both"?18:0}}>
            <div style={{fontSize:14,fontWeight:700,color:C.pri,marginBottom:10}}>🔥 난방 부하</div>
            <div style={ROW}><span style={LBL}>난방 면적</span><NI v={heatArea} s={setHeatArea} ph="100" st={{...INP,width:90}} sfx="평"/><span style={{fontSize:12,color:C.sub}}>= {fmt((parseFloat(heatArea)||0)*3.3,0)} m²</span></div>
            {ht&&(<>
              <div style={{...RBOX,marginTop:4}}>
                <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,textAlign:"center"}}>
                  <div><div style={{fontSize:11,color:C.sub}}>기준부하</div><div style={{fontSize:20,fontWeight:800,color:C.acc}}>{heatW}</div><div style={{fontSize:11}}>W/평</div></div>
                  <div><div style={{fontSize:11,color:C.sub}}>피크 난방부하</div><div style={{fontSize:20,fontWeight:800,color:C.warn}}>{fmt(ht.peakLoad,1)}</div><div style={{fontSize:11}}>kW</div></div>
                  <div><div style={{fontSize:11,color:C.sub}}>계수 적용 후{calcMode==="both"?` (×${sc})`:""}</div><div style={{fontSize:20,fontWeight:800,color:calcMode==="both"&&sc<1?C.res:C.warn}}>{fmt(htPeakEff,1)}</div><div style={{fontSize:11}}>kW</div></div>
                </div>
              </div>
              <button style={DTBTN} onClick={()=>tog("ht")}>{openDet.ht?"▲":"▼"} 난방 계산 상세</button>
              <div style={DTBOX(openDet.ht)}>{openDet.ht&&<div>
                <b style={{color:C.pri}}>📐 난방 부하 계산 상세</b>
                <div style={{marginTop:8}}>
                  <FLine lbl="피크 난방부하" f={`${heatArea}평 × ${heatW}W/평 ÷ 1,000`} val={fmt(ht.peakLoad,1)} u="kW" n={`${clim.label} 경험 평균치. 실설계 시 단열등급·창면적·환기량 등 보정 필요`}/>
                  {calcMode==="both"&&<FLine lbl="동시사용계수 적용" f={`${fmt(ht.peakLoad,1)}kW × ${sc}`} val={fmt(htPeakEff,1)} u="kW" n="급탕 피크와 동시 발생하지 않으므로 할인 적용"/>}
                  <FLine lbl="월 난방열량" f={`${fmt(ht.peakLoad,1)}kW × ${opH}h × 30일 × 부하율0.5`} val={fmt0(ht.monthlyHeat)} u="kWh/월" n="부하율 0.5: 설계피크는 최저외기 기준이며 실제 평균 ≈ 50%"/>
                </div>
              </div>}</div>
            </>)}
          </div>
        )}

        {/* 급탕 */}
        {calcMode!=="heating"&&biz&&(
          <div style={{borderTop:calcMode==="both"?`1px dashed ${C.bd}`:"none",paddingTop:calcMode==="both"?16:0}}>
            <div style={{fontSize:14,fontWeight:700,color:C.pri,marginBottom:10}}>🚿 급탕 부하</div>

            {biz.isBath?(
              <div style={{marginBottom:12}}>
                <div style={{fontSize:13,color:C.sub,marginBottom:7}}>탕별 상세 입력</div>
                {baths.map((b,i)=>(
                  <div key={b.id} style={{background:dark?"#1E3A5F":"#F0F7FF",border:`1px solid ${dark?"#2563EB":"#BFDBFE"}`,borderRadius:8,padding:"10px 12px",marginBottom:7}}>
                    <div style={{display:"flex",gap:7,flexWrap:"wrap",alignItems:"center"}}>
                      <span style={{fontSize:12.5,color:C.sub,minWidth:16}}>{i+1}.</span>
                      <input value={b.name} onChange={e=>setBaths(p=>p.map(x=>x.id===b.id?{...x,name:e.target.value}:x))} placeholder="탕 이름" style={{...IST,width:80}}/>
                      <NI v={b.volume} s={v=>setBaths(p=>p.map(x=>x.id===b.id?{...x,volume:v}:x))} ph="5" st={{...INP,width:58}} sfx="톤"/>
                      <span style={{fontSize:12,color:C.sub}}>목표수온</span>
                      <NI v={b.temp}   s={v=>setBaths(p=>p.map(x=>x.id===b.id?{...x,temp:v}:x))}   ph="42" st={{...INP,width:55}} sfx="℃"/>
                      <NI v={b.fills}  s={v=>setBaths(p=>p.map(x=>x.id===b.id?{...x,fills:v}:x))}  ph="1"  st={{...INP,width:45}} sfx="회/일"/>
                      <NI v={b.count}  s={v=>setBaths(p=>p.map(x=>x.id===b.id?{...x,count:v}:x))}  ph="1"  st={{...INP,width:45}} sfx="개"/>
                      {baths.length>1&&<button onClick={()=>setBaths(p=>p.filter(x=>x.id!==b.id))} style={{...BTN,padding:"4px 8px",fontSize:12,background:"#FFF5F5",color:C.err,border:"1px solid #FCA5A5"}}>✕</button>}
                    </div>
                    <div style={{fontSize:11.5,color:C.sub,marginTop:5,paddingLeft:24}}>
                      → {fmt((parseFloat(b.volume)||0)*(parseFloat(b.fills)||1)*(parseFloat(b.count)||1)*1.163*Math.max(0,(parseFloat(b.temp)||42)-srcT),1)} kWh/일
                    </div>
                  </div>
                ))}
                <button onClick={()=>setBaths(p=>[...p,mkBath()])} style={{...BTN,padding:"6px 12px",fontSize:12.5,background:C.hi,color:C.acc,border:`1px solid ${C.acc}`,marginTop:2}}>+ 탕 추가</button>
                <div style={{marginTop:8,padding:"8px 12px",background:dark?"#2D3748":"#FFFBEB",borderRadius:6,fontSize:12,color:C.sub}}>💡 건식 사우나는 온수 수요 없음 → HP 부하 제외. 습식 스팀사우나만 아래 부대시설에서 추가.</div>
              </div>
            ):biz.isDirect?(
              <div style={ROW}><span style={LBL}>일일 온수량</span><NI v={unitRaw} s={setUnitRaw} ph="0" st={{...INP,width:90}} sfx="톤/일"/></div>
            ):(
              <div style={ROW}><span style={LBL}>{biz.uL}</span><NI v={unitRaw} s={setUnitRaw} ph="0" st={{...INP,width:90}} sfx={biz.uUnit}/><span style={{fontSize:12,color:C.sub}}>기준: {biz.div?`${biz.wpu}톤/${biz.div}${biz.uUnit}/일`:`${biz.wpu}톤/${biz.uUnit}/일`}</span></div>
            )}

            {/* 욕조 */}
            <div style={{marginTop:10}}>
              <div style={{fontSize:13,fontWeight:600,color:C.pri,marginBottom:7,display:"flex",alignItems:"center",gap:8}}>
                🛁 욕조 <button onClick={()=>setBathtubs(p=>[...p,mkTub()])} style={{...BTN,padding:"4px 10px",fontSize:12,background:C.hi,color:C.acc,border:`1px solid ${C.acc}`}}>+ 추가</button>
                <span style={{fontSize:11.5,color:C.sub,fontWeight:400}}>(기본값: 300L / 42℃)</span>
              </div>
              {bathtubs.length===0&&<div style={{fontSize:12,color:C.sub,marginBottom:4}}>욕조가 있으면 추가해주세요.</div>}
              {bathtubs.map((tb,i)=>(
                <div key={tb.id} style={{display:"flex",gap:7,flexWrap:"wrap",alignItems:"center",background:dark?"#1E3A5F":"#F0F7FF",borderRadius:7,padding:"9px 12px",marginBottom:6}}>
                  <span style={{fontSize:12,color:C.sub}}>{i+1}.</span>
                  <NI v={tb.count}  s={v=>setBathtubs(p=>p.map(x=>x.id===tb.id?{...x,count:v}:x))}  ph="1"   st={{...INP,width:50}} sfx="개"/>
                  <NI v={tb.volume} s={v=>setBathtubs(p=>p.map(x=>x.id===tb.id?{...x,volume:v}:x))} ph="300" st={{...INP,width:68}} sfx="L/개"/>
                  <span style={{fontSize:12,color:C.sub}}>목표수온</span>
                  <NI v={tb.temp}   s={v=>setBathtubs(p=>p.map(x=>x.id===tb.id?{...x,temp:v}:x))}   ph="42"  st={{...INP,width:55}} sfx="℃"/>
                  <span style={{fontSize:11.5,color:C.sub}}>→ {fmt(((parseFloat(tb.volume)||300)/1000)*(parseFloat(tb.count)||1)*1.163*Math.max(0,(parseFloat(tb.temp)||42)-srcT),3)} kWh/일</span>
                  <button onClick={()=>setBathtubs(p=>p.filter(x=>x.id!==tb.id))} style={{...BTN,padding:"3px 7px",fontSize:12,background:"#FFF5F5",color:C.err,border:"1px solid #FCA5A5"}}>✕</button>
                </div>
              ))}
            </div>

            {/* 부대시설 */}
            <div style={{marginTop:10}}>
              <div style={{fontSize:13,fontWeight:600,color:C.pri,marginBottom:7}}>부대시설 추가</div>
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                {SITE_OPT.map(o=>{const on=siteOpts.includes(o.id);return(
                  <label key={o.id} style={{display:"flex",alignItems:"center",gap:4,fontSize:12.5,cursor:"pointer",background:on?(dark?"#1E3A5F":"#EFF6FF"):(dark?"#334155":C.inp),border:`1px solid ${on?C.acc:C.bd}`,borderRadius:6,padding:"5px 10px",userSelect:"none"}}>
                    <input type="checkbox" checked={on} onChange={e=>setSiteOpts(p=>e.target.checked?[...p,o.id]:p.filter(x=>x!==o.id))} style={{margin:0}}/>
                    {o.label} <span style={{color:C.acc,fontSize:11}}>+{o.addW}톤/일</span>
                  </label>
                );})}
              </div>
            </div>

            {/* 급탕 소계 */}
            {hw&&(<>
              <div style={{...RBOX,marginTop:12}}>
                <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,textAlign:"center"}}>
                  <div><div style={{fontSize:11,color:C.sub}}>일일 온수(등가)</div><div style={{fontSize:20,fontWeight:800,color:C.acc}}>{fmt(hw.dailyWater,2)}</div><div style={{fontSize:11}}>톤/일</div></div>
                  <div><div style={{fontSize:11,color:C.sub}}>기준 부하</div><div style={{fontSize:20,fontWeight:800,color:C.acc}}>{fmt(hw.baseLoad,1)}</div><div style={{fontSize:11}}>kW</div></div>
                  <div><div style={{fontSize:11,color:C.sub}}>피크 열부하</div><div style={{fontSize:20,fontWeight:800,color:C.warn}}>{fmt(hw.peakLoad,1)}</div><div style={{fontSize:11}}>kW</div></div>
                </div>
              </div>
              <button style={DTBTN} onClick={()=>tog("hw")}>{openDet.hw?"▲":"▼"} 급탕 계산 상세</button>
              <div style={DTBOX(openDet.hw)}>{openDet.hw&&<div>
                <b style={{color:C.pri}}>📐 급탕 부하 계산 상세</b>
                <div style={{background:dark?"#0D1F35":"#EFF6FF",borderRadius:7,padding:10,marginTop:8,marginBottom:8}}>
                  <b style={{color:C.acc}}>단위 열량 환산</b>
                  <FLine lbl="열량 = m × Cp × ΔT" f="1,000kg × 4.186×10⁻³ kWh/(kg·℃) × ΔT" val="1.163 × ΔT" u="kWh/톤" n={`Cp(물) = 4.186 kJ/(kg·℃) = 4.186÷3,600 kWh/(kg·℃). 현장 ΔT ${dT}℃ → ${fmt(hpt,4)} kWh/톤`}/>
                </div>
                <div style={{background:dark?"#0D1F35":"#EFF6FF",borderRadius:7,padding:10,marginBottom:8}}>
                  <b style={{color:C.acc}}>월간 부하</b>
                  <FLine lbl="일일 급탕열량" f={`${fmt(hw.dailyWater,2)}톤 × ${fmt(hpt,4)}kWh/톤`} val={fmt(hw.dailyHeat,1)} u="kWh/일"/>
                  <FLine lbl="기준 부하" f={`${fmt0(hw.monthlyHeat)}kWh ÷ (${opH}h×30일)`} val={fmt(hw.baseLoad,1)} u="kW" n="HP 운전 중 평균 공급 필요 열출력"/>
                </div>
                <div style={{background:dark?"#0D1F35":"#EFF6FF",borderRadius:7,padding:10}}>
                  <b style={{color:C.acc}}>피크 부하</b>
                  {biz.isBath?(
                    <div style={{fontSize:12,marginTop:4}}>{baths.map((b,i)=>{const bdT=(parseFloat(b.temp)||42)-srcT;return(<div key={b.id} style={{color:C.sub}}>탕{i+1}({b.name}): {fmt((parseFloat(b.volume)||0)*(parseFloat(b.count)||1)*1.163*Math.max(0,bdT),1)}kWh ÷ {peakH}h</div>);})}</div>
                  ):(
                    <FLine lbl="피크 부하" f={`${fmt(hw.dailyWater,2)}톤 × ${biz.pR} ÷ ${peakH}h × ${fmt(hpt,4)}kWh/톤`} val={fmt(hw.peakLoad,1)} u="kW"/>
                  )}
                </div>
              </div>}</div>
            </>)}
          </div>
        )}
      </div>

      {/* STEP 4 */}
      {(hw||ht)&&(
        <div style={SEC}>
          <div style={SECH}>STEP 4. 산정 결과</div>

          {calcMode==="both"&&(
            <div style={{...RBOX,marginBottom:12}}>
              <div style={{fontSize:13,fontWeight:700,color:C.pri,marginBottom:8}}>합산 피크 부하</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,textAlign:"center"}}>
                <div><div style={{fontSize:11,color:C.sub}}>급탕 피크</div><div style={{fontSize:18,fontWeight:700,color:C.warn}}>{fmt(hw?.peakLoad||0,1)} kW</div></div>
                <div><div style={{fontSize:11,color:C.sub}}>난방×계수({sc})</div><div style={{fontSize:18,fontWeight:700,color:C.warn}}>{fmt(htPeakEff,1)} kW</div></div>
                <div><div style={{fontSize:11,color:C.sub}}>합산</div><div style={{fontSize:22,fontWeight:800,color:C.err}}>{fmt(totalPeak,1)} kW</div></div>
              </div>
            </div>
          )}

          {hpR&&(<>
            <div style={{...RBOX,marginBottom:8}}>
              <div style={{fontSize:13,fontWeight:700,color:C.pri,marginBottom:8}}>🔧 히트펌프</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,textAlign:"center"}}>
                <div><div style={{fontSize:11,color:C.sub}}>적용 COP</div><div style={{fontSize:22,fontWeight:800,color:C.acc}}>{fmt(effCOP,2)}</div><div style={{fontSize:10,color:C.sub}}>{copRaw}×{copWt}</div></div>
                <div><div style={{fontSize:11,color:C.sub}}>필요 HP 용량</div><div style={{fontSize:22,fontWeight:800,color:C.warn}}>{fmt(hpR.needed,1)}<span style={{fontSize:12}}> kW</span></div></div>
                <div>
                  <div style={{fontSize:11,color:C.sub}}>추천 구성</div>
                  {recM?(<><div style={{fontSize:15,fontWeight:800,color:C.res}}>{recM.label}</div><div style={{fontSize:13,color:C.res}}>× {recN}대 = {recM.kw*recN}kW</div><div style={{fontSize:11,color:C.sub}}>{recM.type} | max {recM.maxTemp}℃</div></>):<div style={{color:C.err,fontSize:12}}>모델 확인 필요</div>}
                </div>
              </div>
              {hpR.mode==="general"&&(
                <div style={{marginTop:10,display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:6,textAlign:"center"}}>
                  {[["조건A\n(기준부하)",hpR.cA],["조건B\n(피크보완)",hpR.cB],["조건C\n(재충전)",hpR.cC]].map(([lbl,val])=>{
                    const isMx=val===Math.max(hpR.cA,hpR.cB,hpR.cC||0);
                    return(<div key={lbl} style={{background:isMx?(dark?"#1E3A5F":"#DBEAFE"):"transparent",border:`1px solid ${isMx?C.acc:C.bd}`,borderRadius:6,padding:"6px 4px"}}>
                      <div style={{fontSize:10,color:C.sub,whiteSpace:"pre-wrap"}}>{lbl}</div>
                      <div style={{fontSize:15,fontWeight:isMx?800:600,color:isMx?C.acc:C.sub}}>{fmt(val,1)} kW</div>
                      {isMx&&<div style={{fontSize:10,color:C.acc}}>▲ 지배조건</div>}
                    </div>);
                  })}
                </div>
              )}
              {/* 지배조건 안내 */}
              {hpR.mode==="general"&&isCDominated&&(
                <div style={{marginTop:8,padding:"7px 10px",background:dark?"#1C1F2E":"#F0F4FF",border:`1px solid ${dark?"#4338CA":"#C7D2FE"}`,borderRadius:6,fontSize:12,color:dark?"#A5B4FC":"#4338CA",lineHeight:1.6}}>
                  🔒 <b>조건C(재충전) 지배 중</b> — 탱크를 더 크게 해도 HP 용량이 줄지 않습니다.<br/>
                  HP 용량을 더 줄이려면 <b>운영시간 연장</b> 또는 <b>피크 시간대 분산</b>이 효과적입니다.
                </div>
              )}
              {hpR.mode==="general"&&!isCDominated&&hpR.cB>hpR.cA&&(
                <div style={{marginTop:8,padding:"7px 10px",background:dark?"#1E3A1E":"#F0FDF4",border:`1px solid ${dark?"#166534":"#BBF7D0"}`,borderRadius:6,fontSize:12,color:dark?"#86EFAC":"#166534",lineHeight:1.6}}>
                  📈 <b>조건B(피크보완) 지배 중</b> — 축열조를 키울수록 HP 용량을 추가로 줄일 수 있습니다.
                </div>
              )}
              <div style={{marginTop:8,padding:"6px 10px",background:"transparent",borderTop:`1px solid ${C.bd}`,fontSize:11.5,color:C.sub}}>
                ※ 최소 대수 우선 선정. 부분부하 효율·단계제어·백업 운전이 필요한 경우 다중 분할 구성을 별도 검토하세요.
              </div>
            </div>
            <button style={DTBTN} onClick={()=>tog("hp")}>{openDet.hp?"▲":"▼"} HP 용량 계산 상세</button>
            <div style={{...DTBOX(openDet.hp),marginBottom:10}}>{openDet.hp&&<div>
              <b style={{color:C.pri}}>📐 HP 용량 계산 상세 (3조건 중 최대값)</b>
              <div style={{background:dark?"#0D1F35":"#EFF6FF",borderRadius:7,padding:10,marginTop:8,marginBottom:8}}>
                <b style={{color:C.acc}}>COP</b>
                <FLine lbl="적용 COP" f={`입력 ${copRaw} × 가중치 ${copWt}`} val={fmt(effCOP,2)} n="가중치: 부분부하·노화·배관손실 등 실운전 조건 반영"/>
              </div>
              {hpR.mode==="notank"&&<div style={{background:dark?"#0D1F35":"#EFF6FF",borderRadius:7,padding:10,marginBottom:8}}>
                <b style={{color:C.acc}}>축열조 없음 → HP 단독 피크</b>
                <FLine lbl="HP 필요 용량" f={`합산피크 × 1.1 = ${fmt(totalPeak,1)} × 1.1`} val={fmt(hpR.needed,1)} u="kW"/>
              </div>}
              {hpR.mode==="night"&&<div style={{background:dark?"#0D1F35":"#EFF6FF",borderRadius:7,padding:10,marginBottom:8}}>
                <b style={{color:C.acc}}>심야 충전 모드</b>
                <div style={{fontSize:12,color:C.sub,marginTop:4,marginBottom:4}}>※ 가정: 급탕은 심야 축열, 난방은 주간 HP 직접 운전 병행</div>
                <FLine lbl="조건A(심야충전)" f={`일일급탕열량÷8h×1.1 = ${fmt(hw?.dailyHeat||0,1)}÷8×1.1`} val={fmt(hpR.cA,1)} u="kW"/>
                <FLine lbl="조건B(난방×계수)" val={fmt(hpR.cB,1)} u="kW"/>
                <FLine lbl="HP 필요 용량" f="max(A,B)" val={fmt(hpR.needed,1)} u="kW"/>
              </div>}
              {hpR.mode==="general"&&<>
                <div style={{background:dark?"#0D1F35":"#EFF6FF",borderRadius:7,padding:10,marginBottom:8}}>
                  <b style={{color:C.acc}}>조건A — 기준부하 기반</b>
                  <FLine lbl="조건A" f={`급탕기준부하×1.25 + 난방피크×계수 = ${fmt(hw?.baseLoad||0,1)}×1.25 + ${fmt(htPeakEff,1)}`} val={fmt(hpR.cA,1)} u="kW"/>
                </div>
                <div style={{background:dark?"#0D1F35":"#EFF6FF",borderRadius:7,padding:10,marginBottom:8}}>
                  <b style={{color:C.acc}}>조건B — 피크 보완 (탱크 방열속도 고려)</b>
                  <FLine lbl="탱크 방열속도" f={`${fmt(effTank,1)}톤 × ${fmt(hpt,3)}kWh/톤 ÷ ${peakH}h`} val={fmt(hpR.tankDR,1)} u="kW" n="탱크가 피크 시간에 최대 방열 가능한 속도. 탱크↑ → 이 값↑ → HP 용량↓"/>
                  <FLine lbl="조건B" f={`max(조건A, 합산피크-방열속도) = max(${fmt(hpR.cA,1)}, ${fmt(totalPeak,1)}-${fmt(hpR.tankDR,1)})`} val={fmt(hpR.cB,1)} u="kW"/>
                </div>
                <div style={{background:dark?"#0D1F35":"#EFF6FF",borderRadius:7,padding:10}}>
                  <b style={{color:C.acc}}>조건C — 피크 후 탱크 재충전 완료</b>
                  <FLine lbl="탱크 방열량" f={`(합산피크-조건B)×피크시간 = (${fmt(totalPeak,1)}-${fmt(hpR.cB,1)})×${peakH}h`} val={fmt(hpR.tankUsed,1)} u="kWh"/>
                  <FLine lbl="재충전 가능시간" f={`운영시간-피크시간 = ${opH}-${peakH}`} val={fmt(hpR.rechT,1)} u="h"/>
                  <FLine lbl="조건C" f={`시설수요+방열량÷재충전시간 = ${fmt(hpR.facBase,1)}+${fmt(hpR.tankUsed,1)}÷${fmt(hpR.rechT,1)}`} val={fmt(hpR.cC,1)} u="kW" n="재충전시간 짧거나 방열량 클수록 조건C가 지배"/>
                  <FLine lbl="HP 필요 용량" f="max(A, B, C)" val={fmt(hpR.needed,1)} u="kW"/>
                </div>
              </>}
            </div>}</div>
          </>)}

          {/* 축열조 */}
          {tankSpace==="yes"?(
            <div style={RBOX}>
              <div style={{fontSize:13,fontWeight:700,color:C.pri,marginBottom:10}}>🪣 축열조</div>
              <div style={ROW}>
                <span style={LBL}>기존 축열조</span><NI v={existTank} s={setExistTank} ph="0" st={{...INP,width:80}} sfx="톤"/>
                <span style={LBL}>계획 축열조</span><NI v={newTankRaw} s={setNewTankRaw} ph={fmt(tankMin,1)} st={{...INP,width:80}} sfx="톤"/>
                <span style={{fontSize:12,color:C.sub}}>공란 → 자동 산정값</span>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,textAlign:"center",marginTop:8}}>
                <div><div style={{fontSize:11,color:C.sub}}>산정(최소)</div><div style={{fontSize:22,fontWeight:800,color:C.acc}}>{fmt(tankMin,1)}<span style={{fontSize:12}}> 톤</span></div><div style={{fontSize:10,color:C.sub}}>최종 HP 기준</div></div>
                <div><div style={{fontSize:11,color:C.sub}}>기존</div><div style={{fontSize:22,fontWeight:700,color:C.sub}}>{existT}<span style={{fontSize:12}}> 톤</span></div></div>
                <div><div style={{fontSize:11,color:C.sub}}>적용</div><div style={{fontSize:24,fontWeight:800,color:C.res}}>{fmt(effTank,1)}<span style={{fontSize:13}}> 톤</span></div></div>
              </div>
              <button style={DTBTN} onClick={()=>tog("tank")}>{openDet.tank?"▲":"▼"} 축열조 계산 상세</button>
              <div style={DTBOX(openDet.tank)}>{openDet.tank&&<div>
                <b style={{color:C.pri}}>📐 축열조 용량 계산 상세</b>
                <div style={{background:dark?"#0D1F35":"#EFF6FF",borderRadius:7,padding:10,marginTop:8}}>
                  {(elecType==="night"||elecType==="mixed")?(
                    <><b style={{color:C.acc}}>심야 모드 — 하루치 급탕 저장</b>
                    <FLine lbl="최소 축열조" f={`일일온수량×1.1 = ${fmt(hw?.dailyWater||0,2)}×1.1`} val={fmt(tankMin,1)} u="톤" n="심야 모드에서는 최종 HP 용량과 무관하게 하루치 저장이 기준"/>
                    </>
                  ):(
                    <><b style={{color:C.acc}}>일반 모드 — 최종 HP 용량 기준 역산</b>
                    <div style={{fontSize:12,marginTop:4,marginBottom:4,color:C.sub}}>최종 선정된 HP 용량을 기준으로, 피크 시간 동안 HP가 공급하고 남는 부족량을 탱크가 커버.</div>
                    <FLine lbl="최소 축열조" f={`(합산피크-HP용량)×피크시간÷단위열량×1.1 = (${fmt(totalPeak,1)}-${fmt(hpR?.needed||0,1)})×${peakH}h÷${fmt(hpt,3)}×1.1`} val={fmt(tankMin,1)} u="톤" n="HP 용량 기준 역산이므로 HP·축열조가 서로 일관된 설계기준 유지"/>
                    </>
                  )}
                </div>
              </div>}</div>
            </div>
          ):(
            <div style={{padding:"10px 14px",background:"#FEF2F2",border:"1px solid #FCA5A5",borderRadius:8,fontSize:12.5,color:C.err}}>
              ❌ 축열조 설치 불가 → HP가 피크 부하 전체({fmt(totalPeak,1)}kW)를 단독 담당. +10% 여유 적용.
            </div>
          )}

          {/* ── 설계 총평 ── */}
          {summary&&(summary.warns.length>0||summary.tips.length>0||summary.recs.length>0)&&(
            <div style={{marginTop:14,background:dark?"#1E293B":"#FFFFFF",border:`2px solid ${dark?"#334155":"#E2E8F0"}`,borderRadius:10,overflow:"hidden"}}>
              <div style={{background:dark?"#334155":"#1B3A5C",padding:"10px 16px",display:"flex",alignItems:"center",gap:8}}>
                <span style={{fontSize:16}}>📋</span>
                <span style={{fontSize:14,fontWeight:700,color:"#FFFFFF"}}>설계 총평 및 추천사항</span>
              </div>
              <div style={{padding:"14px 16px"}}>

                {/* 주의사항 */}
                {summary.warns.length>0&&(
                  <div style={{marginBottom:12}}>
                    <div style={{fontSize:12.5,fontWeight:700,color:C.err,marginBottom:6,display:"flex",alignItems:"center",gap:5}}>
                      <span>⚠️</span> 주의사항
                    </div>
                    {summary.warns.map((w,i)=>(
                      <div key={i} style={{display:"flex",gap:8,marginBottom:5,padding:"7px 10px",background:dark?"#3B1515":"#FEF2F2",border:`1px solid ${dark?"#7F1D1D":"#FECACA"}`,borderRadius:6}}>
                        <span style={{color:C.err,flexShrink:0,fontSize:13}}>•</span>
                        <span style={{fontSize:12.5,color:dark?"#FCA5A5":C.err,lineHeight:1.6}}>{w}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* 현황 파악 */}
                {summary.tips.length>0&&(
                  <div style={{marginBottom:12}}>
                    <div style={{fontSize:12.5,fontWeight:700,color:dark?"#60A5FA":C.pri,marginBottom:6,display:"flex",alignItems:"center",gap:5}}>
                      <span>💡</span> 현황 분석
                    </div>
                    {summary.tips.map((t,i)=>(
                      <div key={i} style={{display:"flex",gap:8,marginBottom:5,padding:"7px 10px",background:dark?"#1E3A5F":"#EFF6FF",border:`1px solid ${dark?"#1D4ED8":"#BFDBFE"}`,borderRadius:6}}>
                        <span style={{color:C.acc,flexShrink:0,fontSize:13}}>•</span>
                        <span style={{fontSize:12.5,color:C.txt,lineHeight:1.6}}>{t}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* 추천사항 */}
                {summary.recs.length>0&&(
                  <div>
                    <div style={{fontSize:12.5,fontWeight:700,color:dark?"#34D399":C.res,marginBottom:6,display:"flex",alignItems:"center",gap:5}}>
                      <span>✅</span> 설계 추천
                    </div>
                    {summary.recs.map((r,i)=>(
                      <div key={i} style={{display:"flex",gap:8,marginBottom:5,padding:"7px 10px",background:dark?"#064E3B":"#ECFDF5",border:`1px solid ${dark?"#065F46":"#A7F3D0"}`,borderRadius:6}}>
                        <span style={{color:C.res,flexShrink:0,fontSize:13,fontWeight:700}}>{i+1}</span>
                        <span style={{fontSize:12.5,color:C.txt,lineHeight:1.6}}>{r}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div style={{marginTop:10,fontSize:11,color:C.sub,borderTop:`1px solid ${C.bd}`,paddingTop:8}}>
                  ※ 본 총평은 입력값 기반 자동 생성입니다. 최종 설계 전 전문 엔지니어 검토를 권장합니다.
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </>)}

    {/* ══ TAB 3: 경제성 ══ */}
    {tab==="econ"&&(<>
      {totalMon===0?(
        <div style={{...SEC,textAlign:"center",padding:36,color:C.sub}}>
          <div style={{fontSize:32,marginBottom:10}}>💡</div>
          <div>용량 산정 탭에서 부하를 먼저 입력하세요.</div>
          <button onClick={()=>setTab("calc")} style={{...BTN,marginTop:16,background:C.acc,color:"#fff",padding:"9px 20px"}}>📐 용량 산정 탭으로</button>
        </div>
      ):(<>
        <div style={SEC}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
            <div style={SECH}>💰 경제성 분석</div>
            <div style={{display:"flex",gap:8}}>
              <button onClick={saveCalc} style={{...BTN,background:activePid?C.acc:"#9CA3AF",color:"#fff",padding:"7px 14px",fontSize:12}} disabled={!activePid}>💾 저장</button>
              <button onClick={exportResult} style={{...BTN,background:dark?"#065F46":"#ECFDF5",color:C.res,border:`1.5px solid ${C.res}`,padding:"7px 14px",fontSize:12}}>📋 전체 복사</button>
            </div>
          </div>
          <div style={{background:dark?"#1E3A5F":"#EFF6FF",border:`1px solid ${dark?"#2563EB":"#BFDBFE"}`,borderRadius:7,padding:"10px 14px",marginBottom:16,fontSize:13}}>
            월 총 열부하 <b>{fmt0(totalMon)}kWh/월</b> · 적용 COP <b>{fmt(effCOP,2)}</b> · 월 전력소비 <b>{fmt0(monthlyElec)}kWh/월</b>
            {recM&&<span> · 추천 HP <b>{recM.label}×{recN}대</b></span>}
          </div>
          <div style={{fontSize:13.5,fontWeight:700,color:C.pri,marginBottom:10}}>기존 연료</div>
          <div style={ROW}><span style={LBL}>연료 종류</span><select value={fuelId} onChange={e=>{setFuelId(e.target.value);setFuelUid(FUELS.find(f=>f.id===e.target.value)?.units[0].id||"");}} style={{...SEL,width:170}}>{FUELS.map(f=><option key={f.id} value={f.id}>{f.label}</option>)}</select><select value={fuelUid} onChange={e=>setFuelUid(e.target.value)} style={{...SEL,width:70}}>{fuel?.units.map(u=><option key={u.id} value={u.id}>{u.l}</option>)}</select></div>
          <div style={ROW}><span style={LBL}>월 사용량</span><NI v={fuelMon} s={setFuelMon} ph="0" st={{...INP,width:100}} sfx={(fuelUnit?.l||"")+"/월"}/></div>
          <div style={ROW}><span style={LBL}>연료 단가</span><NI v={fuelPrc} s={setFuelPrc} ph="1200" st={{...INP,width:100}} sfx={"원/"+(fuelUnit?.l||"")}/></div>
          <div style={{fontSize:13.5,fontWeight:700,color:C.pri,marginBottom:10,marginTop:14}}>전기 요금</div>
          <div style={ROW}><span style={LBL}>주간 단가</span><NI v={dayRate} s={setDayRate} ph="120" st={{...INP,width:90}} sfx="원/kWh"/></div>
          {(elecType==="night"||elecType==="mixed")&&<div style={ROW}><span style={LBL}>심야 단가</span><NI v={nightRate} s={setNightRate} ph="56" st={{...INP,width:90}} sfx="원/kWh"/><span style={{fontSize:12,color:C.sub}}>(심야전력(을) 기준 약 56원)</span></div>}
          <div style={ROW}><span style={LBL}>HP 설치비</span><NI v={instCost} s={setInstCost} ph="0" st={{...INP,width:100}} sfx="만원"/></div>
        </div>
        <div style={SEC}>
          <div style={SECH}>📊 경제성 결과</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
            <div style={{...RBOX,textAlign:"center"}}>
              <div style={{fontSize:11,color:C.sub}}>HP 월 운영비</div>
              <div style={{fontSize:30,fontWeight:800,color:C.acc}}>{fmt0(elecCost)}</div>
              <div style={{fontSize:11}}>원/월</div>
              <div style={{fontSize:11,color:C.sub,marginTop:4}}>{fmt0(monthlyElec)}kWh{elecType==="night"?` × ${nightRate}원`:elecType==="mixed"?` 혼용${nightRatio}%`:` × ${dayRate}원`}</div>
            </div>
            {curCost>0&&<div style={{background:dark?"#2D1B0E":"#FFFBEB",border:`1px solid ${dark?"#92400E":"#FDE68A"}`,borderRadius:8,padding:"14px 16px",textAlign:"center"}}>
              <div style={{fontSize:11,color:C.sub}}>현재 연료비</div>
              <div style={{fontSize:30,fontWeight:800,color:C.warn}}>{fmt0(curCost)}</div>
              <div style={{fontSize:11}}>원/월</div>
            </div>}
          </div>
          {curCost>0&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <div style={{background:savings>0?(dark?"#064E3B":"#ECFDF5"):(dark?"#3B1515":"#FEF2F2"),border:`1px solid ${savings>0?C.res:C.err}`,borderRadius:8,padding:"14px 16px",textAlign:"center"}}>
              <div style={{fontSize:11,color:C.sub}}>월 절감 예상</div>
              <div style={{fontSize:30,fontWeight:800,color:savings>0?C.res:C.err}}>{savings>=0?"+":""}{fmt0(savings)}</div>
              <div style={{fontSize:11}}>원/월</div>
            </div>
            {payback&&<div style={{...RBOX,textAlign:"center"}}>
              <div style={{fontSize:11,color:C.sub}}>투자회수기간</div>
              <div style={{fontSize:36,fontWeight:800,color:C.res}}>{payback.toFixed(1)}</div>
              <div style={{fontSize:11}}>년</div>
            </div>}
          </div>}
          <button style={DTBTN} onClick={()=>tog("ec")}>{openDet.ec?"▲":"▼"} 경제성 계산 상세</button>
          <div style={DTBOX(openDet.ec)}>{openDet.ec&&<div>
            <b style={{color:C.pri}}>📐 경제성 계산 상세</b>
            <div style={{background:dark?"#0D1F35":"#EFF6FF",borderRadius:7,padding:10,marginTop:8,marginBottom:8}}>
              <FLine lbl="월 전력소비" f={`월 총 열부하 ÷ 적용COP = ${fmt0(totalMon)} ÷ ${fmt(effCOP,2)}`} val={fmt0(monthlyElec)} u="kWh/월"/>
            </div>
            <div style={{background:dark?"#0D1F35":"#EFF6FF",borderRadius:7,padding:10,marginBottom:8}}>
              {elecType==="day"&&<FLine lbl="월 전기비" f={`${fmt0(monthlyElec)}kWh × ${dayRate}원`} val={fmt0(elecCost)} u="원/월"/>}
              {elecType==="night"&&<FLine lbl="월 전기비(심야)" f={`${fmt0(monthlyElec)}kWh × ${nightRate}원`} val={fmt0(elecCost)} u="원/월"/>}
              {elecType==="mixed"&&<>
                <FLine lbl="심야 전기비" f={`${fmt0(monthlyElec)} × ${nightRatio}% × ${nightRate}원`} val={fmt0(monthlyElec*nR*(parseFloat(nightRate)||56))} u="원/월"/>
                <FLine lbl="주간 전기비" f={`${fmt0(monthlyElec)} × ${100-Math.round(nR*100)}% × ${dayRate}원`} val={fmt0(monthlyElec*(1-nR)*(parseFloat(dayRate)||120))} u="원/월"/>
                <FLine lbl="합 계" f="심야+주간" val={fmt0(elecCost)} u="원/월"/>
              </>}
            </div>
            {curCost>0&&<div style={{background:dark?"#0D1F35":"#EFF6FF",borderRadius:7,padding:10,marginBottom:8}}>
              <FLine lbl="현재 연료비" f={`${fuelMon}${fuelUnit?.l||""} × ${fuelPrc}원`} val={fmt0(curCost)} u="원/월"/>
              <FLine lbl="월 절감액" f={`${fmt0(curCost)} - ${fmt0(elecCost)}`} val={fmt0(savings)} u="원/월"/>
            </div>}
            {payback&&<div style={{background:dark?"#0D1F35":"#EFF6FF",borderRadius:7,padding:10}}>
              <FLine lbl="투자회수기간" f={`${instCost}만원×10,000÷(${fmt0(savings)}×12개월)`} val={payback.toFixed(1)} u="년" n="단순 회수기간. 유지보수비·금리·요금인상 미반영"/>
            </div>}
          </div>}</div>
        </div>
      </>)}
    </>)}

    </div>
  </div>
  );
}
