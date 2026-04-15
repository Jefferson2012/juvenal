import { useState, useEffect, useRef, useCallback, createContext, useContext } from "react";

// ══════════════════════════════════════════════════════════════
//  CLIENTE SUPABASE — fetch nativo (sem npm)
// ══════════════════════════════════════════════════════════════
function criarSupabase(url, key) {
  const H = { "apikey":key, "Authorization":`Bearer ${key}`, "Content-Type":"application/json", "Prefer":"return=representation" };
  const q = (tb) => ({
    _tb:tb, _f:[], _ord:null, _lim:null,
    eq(c,v)   { this._f.push(`${c}=eq.${v}`); return this; },
    order(c,{ascending:asc=true}={}) { this._ord=`${c}.${asc?"asc":"desc"}`; return this; },
    limit(n)  { this._lim=n; return this; },
    _url() { let u=`${url}/rest/v1/${this._tb}?select=*`; if(this._f.length) u+="&"+this._f.join("&"); if(this._ord) u+=`&order=${this._ord}`; if(this._lim) u+=`&limit=${this._lim}`; return u; },
    async select() { try { const r=await fetch(this._url(),{headers:H}); return {data:r.ok?await r.json():[],error:null}; } catch(e){return{data:[],error:e.message};} },
    async then(res) { try { const r=await fetch(this._url(),{headers:H}); res({data:r.ok?await r.json():[],error:null}); } catch(e){res({data:[],error:e.message});} },
    async insert(body) { try { const r=await fetch(`${url}/rest/v1/${this._tb}`,{method:"POST",headers:H,body:JSON.stringify(Array.isArray(body)?body:[body])}); const d=r.ok?await r.json():null; return{data:d?.[0]??d,error:r.ok?null:await r.text()}; } catch(e){return{data:null,error:e.message};} },
    async update(body) { try { const fs=this._f.length?"?"+this._f.join("&"):""; const r=await fetch(`${url}/rest/v1/${this._tb}${fs}`,{method:"PATCH",headers:H,body:JSON.stringify(body)}); return{error:r.ok?null:await r.text()}; } catch(e){return{error:e.message};} },
    async delete() { try { const fs=this._f.length?"?"+this._f.join("&"):""; const r=await fetch(`${url}/rest/v1/${this._tb}${fs}`,{method:"DELETE",headers:H}); return{error:r.ok?null:await r.text()}; } catch(e){return{error:e.message};} },
    async single() { const res=await this.select(); return{data:res.data?.[0]??null,error:res.error}; },
  });
  return { from:(tb)=>q(tb) };
}
const CFG_KEY="jac_cfg";
function salvarCfg(u,k){try{localStorage.setItem(CFG_KEY,JSON.stringify({u,k}));}catch{}}
function lerCfg(){try{return JSON.parse(localStorage.getItem(CFG_KEY)||"null");}catch{return null;}}

// ══════════════════════════════════════════════════════════════
//  DESIGN TOKENS — Identidade Visual JAC / Juvenal Advogados
// ══════════════════════════════════════════════════════════════
const T = {
  // Cores principais — extraídas do site JAC
  navy:    "#0d1b2a",   // fundo principal
  navy2:   "#132236",   // cards
  navy3:   "#1a2f4a",   // hover/bordas
  gold:    "#c8a84b",   // dourado JAC
  gold2:   "#e8c86a",   // dourado claro
  goldBg:  "#c8a84b18", // fundo dourado sutil
  cream:   "#f0e6d0",   // texto principal
  cream2:  "#b8a898",   // texto secundário
  muted:   "#4a6a8a",   // texto terciário
  border:  "#1e3050",   // bordas sutis
  borderG: "#c8a84b44", // bordas douradas
  red:     "#c0392b",   // urgente
  redBg:   "#3a0a0a",
  green:   "#27ae60",
  greenBg: "#0a2a0a",
  blue:    "#2980b9",
  blueBg:  "#0a1a3a",
  amber:   "#e67e22",
  amberBg: "#2a1a0a",
};

// Fonte serif elegante via Google Fonts
const FONTS = `@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Crimson+Text:ital,wght@0,400;0,600;1,400&display=swap');`;

const STATUS_COR = {
  "Em andamento": {bg:T.blueBg, text:"#5bc0de", bord:"#2a5a8c"},
  "Aguardando":   {bg:T.amberBg,text:"#e0a030", bord:"#6a4a10"},
  "Urgente":      {bg:T.redBg,  text:"#e05050", bord:"#8a2020"},
  "Concluído":    {bg:T.greenBg,text:"#40c080", bord:"#1a6040"},
};
const PAPEL_LABEL = {socio_fundador:"Sócio-Fundador",socio:"Sócio",advogado_pleno:"Advogado Pleno",advogado_junior:"Advogado Júnior",estagiario:"Estagiário"};
const PAPEL_COR   = {socio_fundador:T.gold,socio:"#5bc0de",advogado_pleno:"#40c080",advogado_junior:T.amber,estagiario:"#8a9ab0"};
const PERMISSOES  = {
  socio_fundador:{processos:{l:1,c:1,e:1,x:1},notas:{l:1,c:1,x:1},arquivos:{l:1,c:1,x:1},usuarios:{l:1,c:1,e:1,x:1},auditoria:{l:1},ia:{l:1,c:1}},
  socio:         {processos:{l:1,c:1,e:1,x:1},notas:{l:1,c:1},     arquivos:{l:1,c:1},     usuarios:{l:1},           auditoria:{l:1},ia:{l:1,c:1}},
  advogado_pleno:{processos:{l:1,c:1,e:1},     notas:{l:1,c:1},     arquivos:{l:1,c:1},     usuarios:{l:1},           auditoria:{},   ia:{l:1,c:1}},
  advogado_junior:{processos:{l:1},             notas:{l:1,c:1},     arquivos:{l:1},          usuarios:{l:1},           auditoria:{},   ia:{l:1}},
  estagiario:    {processos:{l:1},             notas:{l:1},          arquivos:{l:1},          usuarios:{},              auditoria:{},   ia:{}},
};
const MESES=["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
const TIPO_ICO={audiencia:"⚖️",documento:"📄",despacho:"📋",recurso:"🔄",sentenca:"🏛️",notificacao:"🔔",distribuicao:"📥",encerramento:"✅",laudo:"🔬"};
const ARQ_ICO={peticao:"📋",laudo:"🔬",documento:"📄",planilha:"📊"};

function fmtBR(s){if(!s)return"—";const[y,m,d]=s.slice(0,10).split("-");return`${d} ${MESES[+m-1]} ${y}`;}
function fmt(s){if(!s)return"—";const[y,m,d]=s.slice(0,10).split("-");return`${d}/${m}/${y}`;}
function pode(papel,rec,a){return!!PERMISSOES[papel]?.[rec]?.[a];}

// ══════════════════════════════════════════════════════════════
//  CONTEXT
// ══════════════════════════════════════════════════════════════
const Ctx=createContext(null);
const useSeg=()=>useContext(Ctx);

// ══════════════════════════════════════════════════════════════
//  COMPONENTES VISUAIS — Estilo JAC
// ══════════════════════════════════════════════════════════════

// Brasão / Logo JAC
function LogoJAC({size=40,showText=true,horizontal=false}){
  return(
    <div style={{display:"flex",alignItems:"center",gap:horizontal?14:0,flexDirection:horizontal?"row":"column"}}>
      <div style={{width:size,height:size,position:"relative",flexShrink:0}}>
        <svg viewBox="0 0 80 80" width={size} height={size}>
          <circle cx="40" cy="40" r="38" fill="none" stroke={T.gold} strokeWidth="1.5"/>
          <circle cx="40" cy="40" r="33" fill="none" stroke={T.gold} strokeWidth="0.5" opacity="0.5"/>
          {/* Balança da Justiça */}
          <line x1="40" y1="18" x2="40" y2="55" stroke={T.gold} strokeWidth="1.5"/>
          <line x1="22" y1="28" x2="58" y2="28" stroke={T.gold} strokeWidth="1.5"/>
          <ellipse cx="26" cy="36" rx="8" ry="4" fill="none" stroke={T.gold} strokeWidth="1"/>
          <ellipse cx="54" cy="36" rx="8" ry="4" fill="none" stroke={T.gold} strokeWidth="1"/>
          <line x1="22" y1="28" x2="26" y2="32" stroke={T.gold} strokeWidth="1"/>
          <line x1="58" y1="28" x2="54" y2="32" stroke={T.gold} strokeWidth="1"/>
          <path d="M33 55 Q40 52 47 55" fill="none" stroke={T.gold} strokeWidth="1.5"/>
          {/* Letras JAC ao fundo */}
          <text x="40" y="50" textAnchor="middle" fill={T.gold} fontSize="7" fontFamily="serif" opacity="0.3" letterSpacing="3">JAC</text>
        </svg>
      </div>
      {showText&&(
        <div style={{textAlign:horizontal?"left":"center"}}>
          <div style={{fontFamily:"'Playfair Display',serif",fontSize:horizontal?18:14,fontWeight:700,color:T.gold,letterSpacing:horizontal?2:3,textTransform:"uppercase",lineHeight:1.1}}>
            Juvenal Advogados
          </div>
          <div style={{fontFamily:"'Crimson Text',serif",fontSize:horizontal?11:9,color:T.cream2,letterSpacing:horizontal?3:4,textTransform:"uppercase",marginTop:2}}>
            Escritório de Advocacia
          </div>
        </div>
      )}
    </div>
  );
}

function Divider({gold=false,my=16}){
  return(
    <div style={{display:"flex",alignItems:"center",gap:12,margin:`${my}px 0`}}>
      <div style={{flex:1,height:1,background:gold?`linear-gradient(90deg,transparent,${T.gold})`:`linear-gradient(90deg,transparent,${T.border})`}}/>
      {gold&&<div style={{width:4,height:4,background:T.gold,borderRadius:"50%",transform:"rotate(45deg)"}}/>}
      {gold&&<div style={{flex:1,height:1,background:`linear-gradient(90deg,${T.gold},transparent)`}}/>}
    </div>
  );
}

function Card({children,style={},gold=false,onClick}){
  const [hov,setHov]=useState(false);
  return(
    <div onClick={onClick} onMouseEnter={()=>onClick&&setHov(true)} onMouseLeave={()=>setHov(false)} style={{
      background:T.navy2,
      border:`1px solid ${hov&&onClick?T.gold:gold?T.borderG:T.border}`,
      borderRadius:8,padding:20,
      transition:"all 0.2s",
      cursor:onClick?"pointer":"default",
      boxShadow:hov&&onClick?`0 4px 20px ${T.gold}22`:"none",
      ...style
    }}>{children}</div>
  );
}

function Av({u,sz=32}){
  const cor=PAPEL_COR[u?.papel]||u?.cor||T.muted;
  return<div style={{width:sz,height:sz,borderRadius:"50%",background:cor+"22",border:`2px solid ${cor}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:sz*.35,color:cor,fontWeight:"bold",flexShrink:0,fontFamily:"'Playfair Display',serif"}}>{u?.avatar||"?"}</div>;
}
function SBadge({status,lg}){
  const c=STATUS_COR[status]||STATUS_COR["Em andamento"];
  return<span style={{background:c.bg,color:c.text,border:`1px solid ${c.bord}`,borderRadius:20,padding:lg?"6px 16px":"3px 10px",fontSize:lg?12:10,whiteSpace:"nowrap",fontFamily:"'Crimson Text',serif",letterSpacing:0.5}}>{status}</span>;
}
function PBadge({papel}){
  const cor=PAPEL_COR[papel]||T.muted;
  return<span style={{background:cor+"22",color:cor,border:`1px solid ${cor}44`,borderRadius:10,padding:"2px 10px",fontSize:10,fontFamily:"'Crimson Text',serif"}}>{PAPEL_LABEL[papel]||papel}</span>;
}
function Btn({children,onClick,v="p",disabled,sm,sx={}}){
  const [hov,setHov]=useState(false);
  const S={
    p:{background:hov?"#1a3a5c":T.navy3,color:T.gold,border:`1px solid ${T.borderG}`},
    g:{background:"transparent",color:T.cream2,border:`1px solid ${T.border}`},
    d:{background:hov?"#5a1010":T.redBg,color:"#e05050",border:"1px solid #8a2020"},
    ok:{background:hov?"#1a5a2a":T.greenBg,color:"#40c080",border:"1px solid #1a6040"},
    gold:{background:hov?T.gold:T.goldBg,color:hov?T.navy:T.gold,border:`1px solid ${T.gold}`},
  };
  return<button onClick={onClick} disabled={disabled} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)} style={{...S[v],borderRadius:4,padding:sm?"4px 10px":"8px 18px",cursor:disabled?"not-allowed":"pointer",fontSize:sm?10:12,fontFamily:"'Crimson Text',serif",letterSpacing:0.5,opacity:disabled?.4:1,transition:"all 0.2s",...sx}}>{children}</button>;
}
function Inp({label,value,onChange,type="text",ph}){
  return<div><label style={{display:"block",fontSize:9,color:T.muted,textTransform:"uppercase",letterSpacing:2,marginBottom:5,fontFamily:"'Crimson Text',serif"}}>{label}</label><input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={ph} style={{width:"100%",background:T.navy,border:`1px solid ${T.border}`,borderRadius:4,padding:"9px 12px",color:T.cream,fontSize:13,outline:"none",fontFamily:"'Crimson Text',serif",boxSizing:"border-box",transition:"border-color 0.2s"}} onFocus={e=>e.target.style.borderColor=T.gold} onBlur={e=>e.target.style.borderColor=T.border}/></div>;
}
function Spin({txt="Carregando..."}){
  return<div style={{display:"flex",flexDirection:"column",alignItems:"center",padding:60,gap:14}}>
    <LogoJAC size={50} showText={false}/>
    <div style={{color:T.muted,fontSize:13,fontFamily:"'Crimson Text',serif",letterSpacing:1}}>{txt}</div>
  </div>;
}
function Toast({msg,tipo="ok",onClose}){
  useEffect(()=>{const t=setTimeout(onClose,3500);return()=>clearTimeout(t);},[]);
  const C={ok:{bg:T.greenBg,text:"#40c080",bord:"#1a6040"},erro:{bg:T.redBg,text:"#e05050",bord:"#8a2020"},av:{bg:T.amberBg,text:T.amber,bord:"#6a4a10"}};
  const c=C[tipo]||C.ok;
  return<div style={{position:"fixed",bottom:24,right:24,background:c.bg,border:`1px solid ${c.bord}`,borderRadius:8,padding:"12px 20px",color:c.text,fontSize:13,zIndex:9999,boxShadow:`0 4px 24px #000a`,display:"flex",gap:10,alignItems:"center",fontFamily:"'Crimson Text',serif"}}>
    {tipo==="ok"?"✓":tipo==="erro"?"✕":"⚠"} {msg}
    <button onClick={onClose} style={{background:"none",border:"none",color:c.text,cursor:"pointer",marginLeft:4,fontSize:16}}>✕</button>
  </div>;
}

// ══════════════════════════════════════════════════════════════
//  TELA DE CONFIGURAÇÃO
// ══════════════════════════════════════════════════════════════
function TelaConfig({onConectado}){
  const[url,setUrl]=useState("");const[key,setKey]=useState("");const[test,setTest]=useState(false);const[err,setErr]=useState("");
  useEffect(()=>{const c=lerCfg();if(c){setUrl(c.u);setKey(c.k);}});
  const conectar=async()=>{
    if(!url||!key)return;setTest(true);setErr("");
    try{const r=await fetch(`${url}/rest/v1/usuarios?select=id&limit=1`,{headers:{apikey:key,Authorization:`Bearer ${key}`}});
      if(r.ok){salvarCfg(url,key);onConectado(criarSupabase(url,key));}else setErr("Credenciais inválidas.");}
    catch{setErr("Não foi possível conectar.");}
    setTest(false);
  };
  return(
    <div style={{minHeight:"100vh",background:`radial-gradient(ellipse at top, ${T.navy3} 0%, ${T.navy} 60%)`,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Crimson Text',serif"}}>
      <style>{FONTS}</style>
      <div style={{width:520,background:T.navy2,border:`1px solid ${T.borderG}`,borderRadius:12,padding:48,boxShadow:`0 24px 80px #000a`}}>
        <div style={{textAlign:"center",marginBottom:32}}>
          <LogoJAC size={72} showText={true}/>
          <Divider gold my={24}/>
          <div style={{fontFamily:"'Playfair Display',serif",fontSize:13,color:T.cream2,letterSpacing:2,textTransform:"uppercase"}}>Configuração do Sistema</div>
        </div>
        <div style={{background:T.navy,border:`1px solid ${T.border}`,borderRadius:6,padding:16,marginBottom:24}}>
          <div style={{color:T.gold,fontSize:12,marginBottom:8,fontFamily:"'Playfair Display',serif"}}>Como configurar:</div>
          <div style={{color:T.cream2,fontSize:12,lineHeight:1.8}}>
            1. Acesse <strong style={{color:T.cream}}>supabase.com</strong> → seu projeto<br/>
            2. Clique em <strong style={{color:T.cream}}>Project Settings → API</strong><br/>
            3. Copie a <strong style={{color:T.cream}}>Project URL</strong> e a chave <strong style={{color:T.cream}}>anon public</strong>
          </div>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:16,marginBottom:24}}>
          <Inp label="Project URL" value={url} onChange={setUrl} ph="https://xxxxxxxxxxxx.supabase.co"/>
          <Inp label="Chave Anon Public" value={key} onChange={setKey} type="password" ph="eyJhbGci..."/>
        </div>
        {err&&<div style={{color:"#e05050",fontSize:12,marginBottom:16,padding:"8px 12px",background:T.redBg,borderRadius:4,border:"1px solid #8a2020"}}>⚠ {err}</div>}
        <button onClick={conectar} disabled={!url||!key||test} style={{width:"100%",background:url&&key?T.goldBg:"transparent",color:url&&key?T.gold:T.muted,border:`1px solid ${url&&key?T.gold:T.border}`,borderRadius:4,padding:"13px",cursor:url&&key&&!test?"pointer":"not-allowed",fontSize:14,fontFamily:"'Playfair Display',serif",letterSpacing:1,transition:"all 0.2s"}}>
          {test?"Conectando...":"Conectar ao Banco de Dados"}
        </button>
        <Divider my={20}/>
        <div style={{textAlign:"center",color:T.muted,fontSize:11,lineHeight:1.7}}>Execute os arquivos <strong style={{color:T.cream2}}>supabase-schema.sql</strong> e <strong style={{color:T.cream2}}>seguranca-schema.sql</strong> no SQL Editor do Supabase antes de conectar.</div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
//  MODAL DE CONFIRMAÇÃO
// ══════════════════════════════════════════════════════════════
function ModalPin({msg,onOk,onCancel}){
  const{usuario}=useSeg();const[pin,setPin]=useState("");const[err,setErr]=useState("");const[t,setT]=useState(0);
  const ok=()=>{if(pin!==usuario.senha){const n=t+1;setT(n);setErr(n>=3?"Acesso bloqueado após 3 tentativas.":`Senha incorreta. ${3-n} tentativa(s) restante(s).`);if(n>=3)setTimeout(onCancel,1500);return;}onOk();};
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.92)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:500}}>
      <div style={{background:T.navy2,border:`1px solid ${T.red}`,borderRadius:12,padding:40,width:380,textAlign:"center",boxShadow:`0 24px 80px #000`}}>
        <div style={{fontSize:40,marginBottom:16}}>🔐</div>
        <div style={{fontFamily:"'Playfair Display',serif",color:"#e05050",fontSize:16,marginBottom:8}}>Confirmação Necessária</div>
        <div style={{color:T.cream2,fontSize:13,marginBottom:20,lineHeight:1.7,fontFamily:"'Crimson Text',serif"}}>{msg}</div>
        <input type="password" value={pin} onChange={e=>{setPin(e.target.value);setErr("");}} onKeyDown={e=>e.key==="Enter"&&ok()} placeholder="Digite sua senha" style={{width:"100%",background:T.navy,border:"1px solid #8a2020",borderRadius:4,padding:"11px",color:T.cream,fontSize:14,outline:"none",textAlign:"center",letterSpacing:6,fontFamily:"'Crimson Text',serif",boxSizing:"border-box",marginBottom:8}}/>
        {err&&<div style={{color:"#e05050",fontSize:11,marginBottom:12}}>{err}</div>}
        <div style={{display:"flex",gap:10,justifyContent:"center"}}><Btn onClick={onCancel} v="g">Cancelar</Btn><Btn onClick={ok} v="d" disabled={!pin}>Confirmar</Btn></div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
//  ALERTA DE SESSÃO
// ══════════════════════════════════════════════════════════════
function AlertaSessao({onRenovar,onSair}){
  const[s,setS]=useState(300);
  useEffect(()=>{const i=setInterval(()=>setS(x=>x>0?x-1:0),1000);return()=>clearInterval(i);},[]);
  const mm=String(Math.floor(s/60)).padStart(2,"0"),ss=String(s%60).padStart(2,"0");
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:600}}>
      <div style={{background:T.navy2,border:`1px solid ${T.amber}`,borderRadius:12,padding:40,width:340,textAlign:"center"}}>
        <div style={{fontSize:36,marginBottom:12}}>⏱️</div>
        <div style={{fontFamily:"'Playfair Display',serif",color:T.amber,fontSize:15,marginBottom:8}}>Sessão Expirando</div>
        <div style={{fontFamily:"'Playfair Display',serif",color:T.gold,fontSize:36,fontWeight:700,marginBottom:8}}>{mm}:{ss}</div>
        <div style={{color:T.cream2,fontSize:12,marginBottom:20,fontFamily:"'Crimson Text',serif"}}>Sua sessão será encerrada por inatividade.</div>
        <div style={{display:"flex",gap:10,justifyContent:"center"}}><Btn onClick={onSair} v="g">Encerrar</Btn><Btn onClick={onRenovar} v="gold">Continuar</Btn></div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
//  PROVEDOR DE SEGURANÇA
// ══════════════════════════════════════════════════════════════
function SegProvider({sb,children}){
  const[usuario,setUsuario]=useState(null);const[alerta,setAlerta]=useState(false);const[pin,setPin]=useState(null);const[toasts,setToasts]=useState([]);
  const tmr=useRef(null);const atm=useRef(null);
  const toast=(msg,tipo="ok")=>{const id=Date.now();setToasts(p=>[...p,{id,msg,tipo}]);};
  const auditar=useCallback(async(acao,recurso=null,det=null,resultado="sucesso")=>{
    if(!usuario||!sb)return;
    sb.from("auditoria").insert({usuario_id:usuario.id,usuario_nome:usuario.nome,acao,recurso,detalhes:det?JSON.stringify(det):null,resultado});
  },[usuario,sb]);
  const reset=useCallback(()=>{clearTimeout(tmr.current);clearTimeout(atm.current);if(!usuario)return;
    atm.current=setTimeout(()=>setAlerta(true),25*60*1000);
    tmr.current=setTimeout(()=>logout("timeout"),30*60*1000);
  },[usuario]);
  useEffect(()=>{const evs=["mousedown","keydown","scroll","touchstart"];const h=()=>{setAlerta(false);reset();};evs.forEach(e=>window.addEventListener(e,h));return()=>evs.forEach(e=>window.removeEventListener(e,h));},[reset]);
  useEffect(()=>{reset();},[usuario]);
  const login=async(u,senha)=>{
    if(!u.ativo)return{erro:"Conta inativa."};
    if(u.bloqueado_ate&&new Date(u.bloqueado_ate)>new Date()){const m=Math.ceil((new Date(u.bloqueado_ate)-new Date())/60000);return{erro:`Conta bloqueada por ${m} min.`};}
    if(u.senha!==senha){const f=(u.tentativas_falhas||0)+1;const upd=f>=5?{bloqueado_ate:new Date(Date.now()+15*60000).toISOString(),tentativas_falhas:0}:{tentativas_falhas:f};
      await sb.from("usuarios").eq("id",u.id).update(upd);await sb.from("auditoria").insert({usuario_id:u.id,usuario_nome:u.nome,acao:"LOGIN_FALHA",resultado:"negado"});
      if(f>=5)return{erro:"Conta bloqueada após 5 tentativas."};return{erro:`Senha incorreta. ${5-f} tentativa(s).`};}
    await sb.from("usuarios").eq("id",u.id).update({tentativas_falhas:0,ultimo_login:new Date().toISOString()});
    await sb.from("auditoria").insert({usuario_id:u.id,usuario_nome:u.nome,acao:"LOGIN",resultado:"sucesso"});
    setUsuario(u);return{ok:true};
  };
  const logout=async(motivo="manual")=>{if(usuario)await sb.from("auditoria").insert({usuario_id:usuario.id,usuario_nome:usuario.nome,acao:"LOGOUT",detalhes:JSON.stringify({motivo})});clearTimeout(tmr.current);clearTimeout(atm.current);setUsuario(null);setAlerta(false);};
  const confirmar=(msg)=>new Promise(r=>setPin({msg,r}));
  return(
    <Ctx.Provider value={{usuario,sb,login,logout,auditar,pode:(rc,a)=>pode(usuario?.papel,rc,a),confirmar,toast}}>
      {children}
      {alerta&&<AlertaSessao onRenovar={()=>{setAlerta(false);reset();}} onSair={()=>logout("timeout")}/>}
      {pin&&<ModalPin msg={pin.msg} onOk={()=>{pin.r(true);setPin(null);}} onCancel={()=>{pin.r(false);setPin(null);}}/>}
      {toasts.map(t=><Toast key={t.id} msg={t.msg} tipo={t.tipo} onClose={()=>setToasts(p=>p.filter(x=>x.id!==t.id))}/>)}
    </Ctx.Provider>
  );
}

// ══════════════════════════════════════════════════════════════
//  LOGIN — Estilo JAC
// ══════════════════════════════════════════════════════════════
function TelaLogin({onConfig}){
  const{sb,login,toast}=useSeg();const[usuarios,setUsuarios]=useState([]);const[load,setLoad]=useState(true);
  const[sel,setSel]=useState(null);const[senha,setSenha]=useState("");const[err,setErr]=useState("");const[ent,setEnt]=useState(false);
  useEffect(()=>{sb.from("usuarios").select("*").then(({data})=>{setUsuarios(data||[]);setLoad(false);});},[]);
  const tentar=async()=>{if(!sel||!senha)return;setEnt(true);setErr("");const r=await login(sel,senha);if(r.erro){setErr(r.erro);setSenha("");}else toast("Bem-vindo, "+sel.nome.split(" ").slice(1,3).join(" ")+"!");setEnt(false);};
  return(
    <div style={{minHeight:"100vh",background:T.navy,fontFamily:"'Crimson Text',serif",display:"flex"}}>
      <style>{FONTS}</style>
      {/* Painel lateral decorativo */}
      <div style={{width:320,background:`linear-gradient(180deg, ${T.navy2} 0%, ${T.navy3} 100%)`,borderRight:`1px solid ${T.borderG}`,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:40,gap:24}}>
        <LogoJAC size={90} showText={true}/>
        <Divider gold my={0}/>
        <div style={{textAlign:"center"}}>
          <div style={{color:T.cream2,fontSize:12,lineHeight:2,letterSpacing:0.5}}>
            Ética · Competência<br/>Comprometimento · Transparência
          </div>
        </div>
        <Divider my={0}/>
        {/* Selos de segurança */}
        <div style={{width:"100%"}}>
          {[["🔐","Acesso por camadas"],["👁","Auditoria completa"],["⏱","Sessão segura 30min"],["🛡","Controle por papel"]].map(([i,l])=>(
            <div key={l} style={{display:"flex",alignItems:"center",gap:10,padding:"6px 0",borderBottom:`1px solid ${T.border}`}}>
              <span style={{fontSize:14}}>{i}</span>
              <span style={{color:T.cream2,fontSize:11,letterSpacing:0.5}}>{l}</span>
            </div>
          ))}
        </div>
        <div style={{marginTop:"auto",textAlign:"center"}}>
          <div style={{color:T.muted,fontSize:10,letterSpacing:1}}>© JUVENAL ADVOGADOS</div>
          <div style={{color:T.muted,fontSize:9,marginTop:2,letterSpacing:1}}>SISTEMA INTERNO DE GESTÃO</div>
        </div>
      </div>

      {/* Formulário de login */}
      <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",padding:40}}>
        <div style={{width:420}}>
          <div style={{marginBottom:32}}>
            <div style={{fontFamily:"'Playfair Display',serif",fontSize:24,color:T.cream,marginBottom:4}}>Acesso ao Sistema</div>
            <div style={{color:T.muted,fontSize:13,letterSpacing:0.5}}>Selecione seu perfil e informe sua senha para prosseguir.</div>
          </div>

          {load?<Spin txt="Carregando perfis..."/>:<>
            <div style={{marginBottom:20}}>
              <div style={{fontSize:9,color:T.muted,textTransform:"uppercase",letterSpacing:2,marginBottom:10}}>Perfil de Acesso</div>
              {usuarios.map(u=>(
                <div key={u.id} onClick={()=>{setSel(u);setErr("");setSenha("");}} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 16px",background:sel?.id===u.id?T.navy3:T.navy2,border:`1px solid ${sel?.id===u.id?PAPEL_COR[u.papel]||T.gold:T.border}`,borderRadius:6,cursor:"pointer",marginBottom:6,transition:"all 0.15s",boxShadow:sel?.id===u.id?`0 2px 12px ${PAPEL_COR[u.papel]||T.gold}22`:"none"}}>
                  <Av u={u} sz={38}/>
                  <div style={{flex:1}}><div style={{color:T.cream,fontSize:14}}>{u.nome}</div><div style={{marginTop:3}}><PBadge papel={u.papel}/></div></div>
                  {sel?.id===u.id&&<span style={{color:PAPEL_COR[u.papel]||T.gold,fontSize:18}}>✓</span>}
                  {!u.ativo&&<span style={{color:"#e05050",fontSize:10}}>Inativo</span>}
                </div>
              ))}
            </div>

            {sel&&<>
              <Divider my={16}/>
              <div style={{marginBottom:20}}>
                <Inp label="Senha de Acesso" value={senha} onChange={v=>{setSenha(v);setErr("");}} type="password" ph="Digite sua senha..."/>
                {err&&<div style={{color:"#e05050",fontSize:12,marginTop:8,padding:"6px 10px",background:T.redBg,borderRadius:4}}>⚠ {err}</div>}
              </div>
            </>}

            <button onClick={tentar} disabled={!sel||!senha||ent} style={{width:"100%",background:sel&&senha?T.goldBg:"transparent",color:sel&&senha?T.gold:T.muted,border:`1px solid ${sel&&senha?T.gold:T.border}`,borderRadius:4,padding:"13px",cursor:sel&&senha&&!ent?"pointer":"not-allowed",fontSize:14,fontFamily:"'Playfair Display',serif",letterSpacing:2,transition:"all 0.2s"}}>
              {ent?"Verificando...":"ACESSAR O SISTEMA"}
            </button>

            <button onClick={onConfig} style={{display:"block",margin:"14px auto 0",background:"none",border:"none",color:T.muted,fontSize:11,cursor:"pointer",fontFamily:"'Crimson Text',serif",textDecoration:"underline"}}>⚙ Configurações do banco de dados</button>
          </>}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
//  MODAL IA
// ══════════════════════════════════════════════════════════════
function ModalIA({proc,tipo,onClose}){
  const[res,setRes]=useState("");const[load,setLoad]=useState(true);
  const P={sinopse:`Gere uma SINOPSE EXECUTIVA profissional deste processo jurídico em português brasileiro. Inclua: partes, objeto, fase atual, pontos fortes e fracos da tese. Linguagem técnico-jurídica.\n\n${JSON.stringify(proc,null,2)}`,historico:`Gere um HISTÓRICO CRONOLÓGICO DETALHADO do processo. Narre fatos processuais em ordem com marcos relevantes. Português jurídico.\n\n${JSON.stringify(proc,null,2)}`,passos:`Você é advogado sênior em ${proc.area}. Sugira: (1) Medidas processuais imediatas, (2) Estratégias, (3) Petições a elaborar com objetivo, (4) Alertas de risco, (5) Diligências extrajudiciais.\n\n${JSON.stringify(proc,null,2)}`};
  useEffect(()=>{(async()=>{try{const r=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:1000,messages:[{role:"user",content:P[tipo]}]})});const d=await r.json();setRes(d.content?.map(b=>b.text||"").join("")||"Erro.");}catch{setRes("⚠ Erro de conexão.");}setLoad(false);})();},[]);
  const T2={sinopse:"Sinopse Executiva",historico:"Histórico do Caso",passos:"Próximos Passos & Petições"};
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.9)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:200}}>
      <div style={{background:T.navy2,border:`1px solid ${T.borderG}`,borderRadius:12,padding:32,width:720,maxHeight:"86vh",display:"flex",flexDirection:"column",boxShadow:`0 24px 80px #000`}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
          <div style={{fontFamily:"'Playfair Display',serif",color:T.gold,fontSize:18}}>{T2[tipo]}</div>
          <button onClick={onClose} style={{background:"none",border:"none",color:T.cream2,fontSize:22,cursor:"pointer"}}>✕</button>
        </div>
        <div style={{color:T.muted,fontSize:11,marginBottom:16,fontFamily:"'Crimson Text',serif",letterSpacing:0.5}}>{proc.cliente} — {proc.id}</div>
        <Divider gold my={0}/>
        <div style={{flex:1,overflowY:"auto",background:T.navy,borderRadius:6,padding:20,marginTop:16,border:`1px solid ${T.border}`}}>
          {load?<div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:180,gap:14}}><LogoJAC size={48} showText={false}/><div style={{color:T.muted,fontSize:12,fontFamily:"'Crimson Text',serif"}}>Analisando com Inteligência Artificial...</div><div style={{display:"flex",gap:6}}>{[0,1,2].map(i=><div key={i} style={{width:7,height:7,borderRadius:"50%",background:T.gold,animation:"pulse 1.2s ease-in-out infinite",animationDelay:`${i*.2}s`}}/>)}</div></div>
          :<div style={{color:T.cream,fontSize:13,lineHeight:1.9,whiteSpace:"pre-wrap",fontFamily:"'Crimson Text',serif"}}>{res}</div>}
        </div>
        <div style={{marginTop:14,display:"flex",justifyContent:"flex-end",gap:8}}><Btn onClick={()=>navigator.clipboard?.writeText(res)} v="g">Copiar</Btn><Btn onClick={onClose} v="gold">Fechar</Btn></div>
      </div>
      <style>{`@keyframes pulse{0%,100%{opacity:.3;transform:scale(.8)}50%{opacity:1;transform:scale(1)}}`}</style>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
//  DETALHE DO PROCESSO
// ══════════════════════════════════════════════════════════════
function ProcDetalhe({proc0,onBack}){
  const{sb,usuario,pode,auditar,confirmar,toast}=useSeg();
  const[tab,setTab]=useState("resumo");const[and,setAnd]=useState([]);const[notas,setNotas]=useState([]);const[arqs,setArqs]=useState([]);const[load,setLoad]=useState(true);
  const[nota,setNota]=useState("");const[arqN,setArqN]=useState("");const[arqT,setArqT]=useState("peticao");const[mIA,setMIA]=useState(null);
  const carregar=useCallback(async()=>{const[a,n,ar]=await Promise.all([sb.from("andamentos").eq("processo_id",proc0.id).order("data",{ascending:false}).select(),sb.from("notas").eq("processo_id",proc0.id).order("criado_em",{ascending:false}).select(),sb.from("arquivos").eq("processo_id",proc0.id).order("criado_em",{ascending:false}).select()]);setAnd(a.data||[]);setNotas(n.data||[]);setArqs(ar.data||[]);setLoad(false);},[proc0.id]);
  useEffect(()=>{carregar();},[carregar]);
  const addNota=async()=>{if(!pode("notas","c")){toast("Sem permissão.","erro");return;}if(!nota.trim())return;await sb.from("notas").insert({processo_id:proc0.id,texto:nota,autor:usuario.nome,cor:PAPEL_COR[usuario.papel]||T.gold});await auditar("CRIAR_NOTA","processo:"+proc0.id);toast("Nota salva.");setNota("");carregar();};
  const delNota=async(n)=>{if(!pode("notas","x")&&n.autor!==usuario.nome){toast("Sem permissão.","erro");return;}const ok=await confirmar(`Excluir nota de "${n.autor}"? Esta ação não pode ser desfeita.`);if(!ok)return;await sb.from("notas").eq("id",n.id).delete();await auditar("EXCLUIR_NOTA","nota:"+n.id);toast("Nota excluída.");carregar();};
  const addArq=async()=>{if(!pode("arquivos","c")){toast("Sem permissão.","erro");return;}if(!arqN.trim())return;await sb.from("arquivos").insert({processo_id:proc0.id,nome:arqN,tipo:arqT,autor:usuario.nome});await auditar("REGISTRAR_ARQUIVO","processo:"+proc0.id);toast("Arquivo registrado.");setArqN("");carregar();};
  const TABS=[["resumo","Resumo"],["notas","Notas"],["arquivos","Arquivos"],...(pode("ia","l")?[["ia","Assistente IA"]]:[] )];
  const pF={...proc0,andamentos:and,notas,arquivos:arqs};
  return(
    <div>
      {mIA&&<ModalIA proc={pF} tipo={mIA} onClose={()=>setMIA(null)}/>}
      {/* Cabeçalho do processo */}
      <div style={{marginBottom:20}}>
        <button onClick={onBack} style={{background:"none",border:"none",color:T.muted,cursor:"pointer",fontFamily:"'Crimson Text',serif",fontSize:13,marginBottom:12,display:"flex",alignItems:"center",gap:6}}>← Voltar à lista</button>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
          <div>
            <div style={{fontFamily:"'Playfair Display',serif",fontSize:22,color:T.cream,marginBottom:3}}>{proc0.cliente}</div>
            <div style={{color:T.cream2,fontSize:13,fontFamily:"'Crimson Text',serif"}}>vs {proc0.adverso}</div>
            <div style={{color:T.muted,fontSize:11,marginTop:4,letterSpacing:1,fontFamily:"'Crimson Text',serif"}}>{proc0.id}</div>
          </div>
          <SBadge status={proc0.status} lg/>
        </div>
        <Divider gold my={16}/>
      </div>

      {/* Tabs */}
      <div style={{display:"flex",gap:0,marginBottom:24,borderBottom:`1px solid ${T.border}`}}>
        {TABS.map(([v,l])=>(
          <button key={v} onClick={()=>setTab(v)} style={{background:"transparent",color:tab===v?T.gold:T.cream2,border:"none",borderBottom:tab===v?`2px solid ${T.gold}`:"2px solid transparent",padding:"9px 18px",cursor:"pointer",fontSize:13,fontFamily:"'Crimson Text',serif",letterSpacing:0.5,marginBottom:-1,transition:"all 0.15s"}}>
            {l}{v==="notas"&&notas.length>0&&<span style={{background:T.goldBg,color:T.gold,borderRadius:10,padding:"1px 6px",fontSize:9,marginLeft:6,border:`1px solid ${T.gold}44`}}>{notas.length}</span>}
          </button>
        ))}
      </div>

      {load?<Spin/>:<>
        {/* RESUMO */}
        {tab==="resumo"&&(
          <div style={{display:"flex",flexDirection:"column",gap:16}}>
            <Card>
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:18,marginBottom:16}}>
                {[["Parte Adversa",proc0.adverso],["Responsável",proc0.responsavel],["Valor da Causa",proc0.valor],["Vara/Juízo",proc0.vara],["Tribunal",proc0.tribunal],["Fase Processual",proc0.fase],["Data Distribuição",fmtBR(proc0.data_distribuicao)],["Próximo Prazo",fmtBR(proc0.proximo_andamento)],["Tipo de Ação",proc0.tipo]].map(([l,v])=>(
                  <div key={l}><div style={{fontSize:9,color:T.muted,textTransform:"uppercase",letterSpacing:1.5,marginBottom:4,fontFamily:"'Crimson Text',serif"}}>{l}</div><div style={{color:T.cream,fontSize:13,fontFamily:"'Crimson Text',serif"}}>{v||"—"}</div></div>
                ))}
              </div>
              {proc0.descricao&&<><Divider my={12}/><div style={{fontSize:9,color:T.muted,textTransform:"uppercase",letterSpacing:1.5,marginBottom:8,fontFamily:"'Crimson Text',serif"}}>Objeto da Ação</div><div style={{color:T.cream2,fontSize:13,lineHeight:1.8,borderLeft:`3px solid ${T.gold}`,paddingLeft:14,fontFamily:"'Crimson Text',serif",fontStyle:"italic"}}>{proc0.descricao}</div></>}
            </Card>
            <Card>
              <div style={{fontFamily:"'Playfair Display',serif",color:T.gold,fontSize:14,marginBottom:14}}>Andamentos Processuais</div>
              {and.length===0&&<div style={{color:T.muted,fontSize:13,textAlign:"center",padding:20}}>Nenhum andamento registrado.</div>}
              {and.map((a,i)=>(
                <div key={a.id} style={{display:"flex",gap:12,paddingBottom:12,marginBottom:12,borderBottom:i<and.length-1?`1px solid ${T.border}`:"none"}}>
                  <div style={{fontSize:18,minWidth:26}}>{TIPO_ICO[a.tipo]||"📝"}</div>
                  <div><div style={{color:T.cream,fontSize:13,fontFamily:"'Crimson Text',serif"}}>{a.descricao}</div><div style={{color:T.muted,fontSize:11,marginTop:3,fontFamily:"'Crimson Text',serif"}}>{fmtBR(a.data)} · {a.autor}</div></div>
                </div>
              ))}
            </Card>
          </div>
        )}
        {/* NOTAS */}
        {tab==="notas"&&(
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            {pode("notas","c")&&(
              <Card>
                <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}><Av u={usuario} sz={28}/><div><div style={{color:T.cream,fontSize:13}}>{usuario.nome}</div><div style={{color:T.muted,fontSize:10}}>{new Date().toLocaleDateString("pt-BR")}</div></div></div>
                <textarea value={nota} onChange={e=>setNota(e.target.value)} placeholder="Adicione observações, alertas estratégicos ou informações relevantes ao processo..." rows={3} style={{width:"100%",background:T.navy,border:`1px solid ${T.border}`,borderRadius:4,padding:"10px 14px",color:T.cream,fontSize:13,outline:"none",fontFamily:"'Crimson Text',serif",resize:"none",boxSizing:"border-box"}}/>
                <div style={{display:"flex",justifyContent:"flex-end",marginTop:10}}><Btn onClick={addNota} disabled={!nota.trim()} v="gold">Adicionar Nota</Btn></div>
              </Card>
            )}
            {notas.length===0&&<div style={{textAlign:"center",color:T.muted,padding:40,fontFamily:"'Crimson Text',serif"}}>Nenhuma nota registrada para este processo.</div>}
            {notas.map(n=>{
              const uu={avatar:n.autor.split(" ").map(w=>w[0]).slice(0,2).join(""),cor:n.cor||T.gold,papel:"advogado_pleno"};
              return(
                <div key={n.id} style={{background:T.navy2,border:`1px solid ${T.border}`,borderLeft:`4px solid ${n.cor||T.gold}`,borderRadius:8,padding:18}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                    <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}><Av u={uu} sz={28}/><div><div style={{color:T.cream,fontSize:13}}>{n.autor}</div><div style={{color:T.muted,fontSize:11}}>{fmt(n.criado_em)}</div></div></div>
                    {(n.autor===usuario.nome||pode("notas","x"))&&<button onClick={()=>delNota(n)} style={{background:"none",border:"none",color:T.muted,cursor:"pointer",fontSize:14}}>🗑</button>}
                  </div>
                  <div style={{color:T.cream2,fontSize:13,lineHeight:1.8,fontFamily:"'Crimson Text',serif"}}>{n.texto}</div>
                </div>
              );
            })}
          </div>
        )}
        {/* ARQUIVOS */}
        {tab==="arquivos"&&(
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            {pode("arquivos","c")&&(
              <Card>
                <div style={{fontFamily:"'Playfair Display',serif",color:T.gold,fontSize:13,marginBottom:12}}>Registrar Arquivo</div>
                <div style={{display:"flex",gap:10}}>
                  <input value={arqN} onChange={e=>setArqN(e.target.value)} placeholder="Nome do arquivo (ex: Petição de Réplica.pdf)" style={{flex:1,background:T.navy,border:`1px solid ${T.border}`,borderRadius:4,padding:"9px 12px",color:T.cream,fontSize:13,outline:"none",fontFamily:"'Crimson Text',serif"}}/>
                  <select value={arqT} onChange={e=>setArqT(e.target.value)} style={{background:T.navy,border:`1px solid ${T.border}`,borderRadius:4,padding:"9px 12px",color:T.cream,fontSize:13,outline:"none",fontFamily:"'Crimson Text',serif"}}>
                    <option value="peticao">Petição</option><option value="laudo">Laudo</option><option value="documento">Documento</option><option value="planilha">Planilha</option>
                  </select>
                  <Btn onClick={addArq} disabled={!arqN.trim()} v="gold">Registrar</Btn>
                </div>
              </Card>
            )}
            <Card>
              <div style={{fontFamily:"'Playfair Display',serif",color:T.gold,fontSize:13,marginBottom:14}}>Arquivos do Processo ({arqs.length})</div>
              {arqs.length===0&&<div style={{color:T.muted,fontSize:13,textAlign:"center",padding:20}}>Nenhum arquivo registrado.</div>}
              {arqs.map(a=>(
                <div key={a.id} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 14px",background:T.navy,border:`1px solid ${T.border}`,borderRadius:6,marginBottom:6}}>
                  <span style={{fontSize:20}}>{ARQ_ICO[a.tipo]||"📄"}</span>
                  <div style={{flex:1}}><div style={{color:T.cream,fontSize:13,fontFamily:"'Crimson Text',serif"}}>{a.nome}</div><div style={{color:T.muted,fontSize:11,marginTop:1}}>{fmt(a.criado_em)} · {a.autor}</div></div>
                  <span style={{background:T.goldBg,color:T.gold,border:`1px solid ${T.borderG}`,borderRadius:4,padding:"2px 8px",fontSize:9,textTransform:"uppercase",letterSpacing:1}}>{a.tipo}</span>
                </div>
              ))}
            </Card>
          </div>
        )}
        {/* IA */}
        {tab==="ia"&&pode("ia","l")&&(
          <div>
            <div style={{background:T.navy2,border:`1px solid ${T.borderG}`,borderRadius:8,padding:20,marginBottom:16}}>
              <div style={{fontFamily:"'Playfair Display',serif",color:T.gold,fontSize:15,marginBottom:4}}>Assistente de Inteligência Artificial</div>
              <div style={{color:T.cream2,fontSize:13,fontFamily:"'Crimson Text',serif"}}>Gere análises automatizadas baseadas em todos os dados, andamentos e notas deste processo.</div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:14}}>
              {[{t:"sinopse",i:"📋",l:"Sinopse Executiva",d:"Resumo profissional do caso para reuniões e consultas rápidas."},{t:"historico",i:"📜",l:"Histórico Cronológico",d:"Narrativa completa de todos os marcos processuais."},{t:"passos",i:"🎯",l:"Próximos Passos",d:"Estratégias, alertas de prazo e petições sugeridas."}].map(({t,i,l,d})=>(
                <Card key={t} onClick={()=>setMIA(t)} gold style={{cursor:"pointer"}}>
                  <div style={{fontSize:32,marginBottom:10}}>{i}</div>
                  <div style={{fontFamily:"'Playfair Display',serif",color:T.gold,fontSize:14,marginBottom:6}}>{l}</div>
                  <div style={{color:T.cream2,fontSize:12,lineHeight:1.7,fontFamily:"'Crimson Text',serif"}}>{d}</div>
                  <div style={{marginTop:12,color:T.muted,fontSize:11,fontFamily:"'Crimson Text',serif"}}>Gerar análise →</div>
                </Card>
              ))}
            </div>
          </div>
        )}
      </>}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
//  JURISPRUDÊNCIA IA
// ══════════════════════════════════════════════════════════════
function Juris(){
  const{usuario,auditar,sb}=useSeg();const[q,setQ]=useState("");const[msgs,setMsgs]=useState([{role:"assistant",content:`Olá, bem-vindo à pesquisa jurisprudencial do Juvenal Advogados.\n\nPesquise decisões do STJ, STF, TST e TJs em linguagem natural.\n\nExemplos:\n• "Tema 1365 — dano moral plano de saúde 2026"\n• "Rescisão indireta do contrato de trabalho"\n• "Súmulas sobre juros abusivos em contratos bancários"`}]);const[load,setLoad]=useState(false);const[salvas,setSalvas]=useState([]);const[tabJ,setTabJ]=useState("chat");const bot=useRef(null);
  useEffect(()=>{bot.current?.scrollIntoView({behavior:"smooth"});},[msgs,load]);
  useEffect(()=>{sb.from("jurisprudencias").eq("salvo_por",usuario.nome).order("criado_em",{ascending:false}).select().then(({data})=>setSalvas(data||[]));},[]);
  const send=async(txt)=>{const t=txt||q;if(!t.trim())return;setQ("");const h=[...msgs,{role:"user",content:t}];setMsgs(h);setLoad(true);
    try{const r=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:1000,system:"Você é um assistente jurídico brasileiro especializado em jurisprudência (STJ, STF, TST, TJs). Cite processos, temas repetitivos e súmulas. Explique impacto prático. Use linguagem técnico-jurídica em português brasileiro.",messages:h.map(m=>({role:m.role,content:m.content}))})});const d=await r.json();setMsgs(prev=>[...prev,{role:"assistant",content:d.content?.map(b=>b.text||"").join("")||"—"}]);await auditar("PESQUISA_JURIS",null,{query:t});}
    catch{setMsgs(prev=>[...prev,{role:"assistant",content:"⚠ Erro de conexão."}]);}setLoad(false);};
  const salvar=async(m)=>{const{data}=await sb.from("jurisprudencias").insert({tribunal:"STJ/STF",tema:"Consulta",ementa:m.content.slice(0,200)+"...",area:"Pesquisa IA",salvo_por:usuario.nome}).single();if(data)setSalvas(p=>[data,...p]);};
  return(
    <div style={{display:"flex",flexDirection:"column",height:"calc(100vh - 130px)"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
        <div><div style={{fontFamily:"'Playfair Display',serif",fontSize:20,color:T.cream}}>Pesquisa de Jurisprudência</div><div style={{color:T.muted,fontSize:12,marginTop:3,fontFamily:"'Crimson Text',serif"}}>STJ · STF · TST · TJs — Assistente com Inteligência Artificial</div></div>
        <div style={{display:"flex",gap:6}}>{[["chat","Pesquisar"],["salvas","Salvas"]].map(([v,l])=><button key={v} onClick={()=>setTabJ(v)} style={{background:tabJ===v?T.goldBg:"transparent",color:tabJ===v?T.gold:T.cream2,border:`1px solid ${tabJ===v?T.gold:T.border}`,borderRadius:4,padding:"6px 14px",cursor:"pointer",fontSize:12,fontFamily:"'Crimson Text',serif"}}>{l}</button>)}</div>
      </div>
      {tabJ==="chat"&&(<>
        <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:10}}>
          {["Tema 1365 STJ plano de saúde","Rescisão indireta CLT","Juros abusivos contratos bancários","Cobertura TEA plano saúde"].map((s,i)=><button key={i} onClick={()=>send(s)} style={{background:T.navy2,border:`1px solid ${T.border}`,color:T.cream2,borderRadius:20,padding:"5px 12px",fontSize:11,cursor:"pointer",fontFamily:"'Crimson Text',serif"}}>{s}</button>)}
        </div>
        <div style={{flex:1,overflowY:"auto",background:T.navy,border:`1px solid ${T.border}`,borderRadius:"8px 8px 0 0",padding:20}}>
          {msgs.map((m,i)=>(
            <div key={i} style={{display:"flex",justifyContent:m.role==="user"?"flex-end":"flex-start",marginBottom:14,gap:10}}>
              {m.role==="assistant"&&<div style={{width:30,height:30,borderRadius:"50%",background:T.goldBg,border:`2px solid ${T.gold}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,flexShrink:0,marginTop:2}}>⚖</div>}
              <div style={{maxWidth:"78%",background:m.role==="user"?T.navy3:T.navy2,border:`1px solid ${m.role==="user"?T.border:T.borderG}`,borderRadius:m.role==="user"?"14px 14px 4px 14px":"14px 14px 14px 4px",padding:"12px 16px"}}>
                <div style={{color:m.role==="user"?T.cream2:T.cream,fontSize:13,lineHeight:1.8,whiteSpace:"pre-wrap",fontFamily:"'Crimson Text',serif"}}>{m.content}</div>
                {m.role==="assistant"&&i>0&&<button onClick={()=>salvar(m)} style={{marginTop:8,background:"none",border:"none",color:T.muted,cursor:"pointer",fontSize:11,fontFamily:"'Crimson Text',serif"}}>Salvar jurisprudência</button>}
              </div>
            </div>
          ))}
          {load&&<div style={{display:"flex",gap:10}}><div style={{width:30,height:30,borderRadius:"50%",background:T.goldBg,border:`2px solid ${T.gold}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13}}>⚖</div><div style={{background:T.navy2,border:`1px solid ${T.borderG}`,borderRadius:"14px 14px 14px 4px",padding:"12px 20px",display:"flex",gap:6,alignItems:"center"}}>{[0,1,2].map(j=><div key={j} style={{width:7,height:7,borderRadius:"50%",background:T.gold,animation:"pulse 1.2s ease-in-out infinite",animationDelay:`${j*.2}s`}}/>)}</div></div>}
          <div ref={bot}/>
        </div>
        <div style={{display:"flex",border:`1px solid ${T.border}`,borderTop:"none",borderRadius:"0 0 8px 8px",overflow:"hidden",background:T.navy2}}>
          <input value={q} onChange={e=>setQ(e.target.value)} onKeyDown={e=>e.key==="Enter"&&send()} placeholder="Pesquise jurisprudência em linguagem natural..." style={{flex:1,background:"transparent",border:"none",padding:"13px 18px",color:T.cream,fontSize:13,outline:"none",fontFamily:"'Crimson Text',serif"}}/>
          <button onClick={()=>send()} disabled={load||!q.trim()} style={{background:load||!q.trim()?"transparent":T.goldBg,border:"none",borderLeft:`1px solid ${T.border}`,color:load||!q.trim()?T.muted:T.gold,padding:"13px 22px",cursor:"pointer",fontSize:18,transition:"all 0.2s"}}>➤</button>
        </div>
      </>)}
      {tabJ==="salvas"&&<div style={{flex:1,overflowY:"auto",display:"flex",flexDirection:"column",gap:10}}>
        {salvas.length===0&&<div style={{textAlign:"center",color:T.muted,padding:40,fontFamily:"'Crimson Text',serif"}}>Nenhuma jurisprudência salva ainda.</div>}
        {salvas.map(j=>(
          <Card key={j.id}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
              <span style={{fontFamily:"'Playfair Display',serif",color:T.gold,fontSize:13}}>{j.tema}</span>
              <button onClick={async()=>{await sb.from("jurisprudencias").eq("id",j.id).delete();setSalvas(p=>p.filter(x=>x.id!==j.id));}} style={{background:"none",border:"none",cursor:"pointer",fontSize:13,color:T.muted}}>🗑</button>
            </div>
            <div style={{color:T.cream2,fontSize:12,lineHeight:1.7,borderLeft:`3px solid ${T.gold}`,paddingLeft:10,fontFamily:"'Crimson Text',serif",fontStyle:"italic"}}>{j.ementa}</div>
          </Card>
        ))}
      </div>}
      <style>{`@keyframes pulse{0%,100%{opacity:.3;transform:scale(.8)}50%{opacity:1;transform:scale(1)}}`}</style>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
//  APP INTERNO — Layout com sidebar JAC
// ══════════════════════════════════════════════════════════════
function AppInterno({onConfig}){
  const{usuario,logout,pode,auditar,toast,sb,confirmar}=useSeg();
  const[procs,setProcs]=useState([]);const[load,setLoad]=useState(true);const[view,setView]=useState("dashboard");const[sel,setSel]=useState(null);
  const[busca,setBusca]=useState("");const[filtS,setFiltS]=useState("Todos");const[showForm,setShowForm]=useState(false);
  const[form,setForm]=useState({id:"",cliente:"",adverso:"",tipo:"Cível",area:"",status:"Em andamento",fase:"",vara:"",tribunal:"",data_distribuicao:"",proximo_andamento:"",descricao:"",responsavel:"",valor:""});

  const carregar=useCallback(async()=>{const{data}=await sb.from("processos").order("atualizado_em",{ascending:false}).select();setProcs(data||[]);setLoad(false);},[]);
  useEffect(()=>{carregar();},[carregar]);
  const salvar=async()=>{if(!form.id||!form.cliente)return;const{error}=await sb.from("processos").insert(form);if(!error){await auditar("CRIAR_PROCESSO","processo:"+form.id,{cliente:form.cliente});toast("Processo cadastrado com sucesso.");await carregar();setShowForm(false);setForm({id:"",cliente:"",adverso:"",tipo:"Cível",area:"",status:"Em andamento",fase:"",vara:"",tribunal:"",data_distribuicao:"",proximo_andamento:"",descricao:"",responsavel:"",valor:""});}};

  const fil=procs.filter(p=>{const s=busca.toLowerCase();return(s===""||p.cliente?.toLowerCase().includes(s)||p.id.includes(s)||p.adverso?.toLowerCase().includes(s))&&(filtS==="Todos"||p.status===filtS);});
  const stats={total:procs.length,and:procs.filter(p=>p.status==="Em andamento").length,urg:procs.filter(p=>p.status==="Urgente").length,ok:procs.filter(p=>p.status==="Concluído").length};

  const navItems=[
    {v:"dashboard",icon:"⊞",label:"Dashboard"},
    {v:"processos",icon:"⚖",label:"Processos"},
    {v:"juris",icon:"🔍",label:"Jurisprudência",badge:"IA"},
    {v:"agenda",icon:"◷",label:"Agenda"},
    ...(pode("auditoria","l")?[{v:"auditoria",icon:"◈",label:"Auditoria"}]:[]),
    ...(pode("usuarios","l")?[{v:"usuarios",icon:"◉",label:"Equipe"}]:[]),
  ];

  return(
    <div style={{minHeight:"100vh",background:T.navy,display:"flex",fontFamily:"'Crimson Text',serif"}}>
      <style>{FONTS}</style>
      {/* SIDEBAR */}
      <div style={{width:230,background:T.navy2,borderRight:`1px solid ${T.borderG}`,display:"flex",flexDirection:"column",flexShrink:0,minHeight:"100vh"}}>
        {/* Logo */}
        <div style={{padding:"28px 20px 20px",borderBottom:`1px solid ${T.border}`}}>
          <LogoJAC size={44} showText={true}/>
        </div>
        {/* Usuário logado */}
        <div style={{padding:"14px 20px",borderBottom:`1px solid ${T.border}`,display:"flex",alignItems:"center",gap:10}}>
          <Av u={usuario} sz={30}/>
          <div style={{flex:1,overflow:"hidden"}}>
            <div style={{color:T.cream,fontSize:12,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{usuario.nome}</div>
            <PBadge papel={usuario.papel}/>
          </div>
        </div>
        {/* Navegação */}
        <nav style={{flex:1,padding:"12px 0"}}>
          {navItems.map(({v,icon,label,badge})=>(
            <button key={v} onClick={()=>{setView(v);setSel(null);}} style={{width:"100%",display:"flex",alignItems:"center",gap:12,padding:"11px 20px",background:view===v?`linear-gradient(90deg,${T.goldBg},transparent)`:"transparent",border:"none",borderLeft:view===v?`3px solid ${T.gold}`:"3px solid transparent",color:view===v?T.gold:T.cream2,cursor:"pointer",fontSize:13,fontFamily:"'Crimson Text',serif",textAlign:"left",letterSpacing:0.5,transition:"all 0.15s"}}>
              <span style={{fontSize:16,minWidth:20,textAlign:"center"}}>{icon}</span>
              <span style={{flex:1}}>{label}</span>
              {badge&&<span style={{background:T.gold,color:T.navy,borderRadius:4,padding:"1px 5px",fontSize:8,fontWeight:700}}>{badge}</span>}
            </button>
          ))}
        </nav>
        {/* Rodapé sidebar */}
        <div style={{padding:"12px 20px",borderTop:`1px solid ${T.border}`}}>
          <div style={{display:"flex",gap:6,marginBottom:8,alignItems:"center"}}>
            <div style={{width:6,height:6,borderRadius:"50%",background:"#40c080"}}/>
            <div style={{color:T.muted,fontSize:10,letterSpacing:0.5}}>Sessão ativa · 30 min</div>
          </div>
          <button onClick={()=>logout()} style={{width:"100%",background:"transparent",border:`1px solid ${T.border}`,color:T.muted,borderRadius:4,padding:"7px",cursor:"pointer",fontSize:11,fontFamily:"'Crimson Text',serif",letterSpacing:0.5,transition:"all 0.2s"}}>Encerrar Sessão</button>
        </div>
      </div>

      {/* CONTEÚDO PRINCIPAL */}
      <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
        {/* Header */}
        <div style={{background:T.navy2,borderBottom:`1px solid ${T.border}`,padding:"12px 28px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{fontFamily:"'Playfair Display',serif",color:T.cream,fontSize:16,fontWeight:400}}>
            {navItems.find(n=>n.v===view)?.label||"Dashboard"}
          </div>
          <div style={{display:"flex",alignItems:"center",gap:16}}>
            <div style={{color:T.muted,fontSize:11,fontFamily:"'Crimson Text',serif"}}>{new Date().toLocaleDateString("pt-BR",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}</div>
            {pode("processos","c")&&view==="processos"&&!sel&&<Btn onClick={()=>setShowForm(true)} v="gold">+ Novo Processo</Btn>}
          </div>
        </div>

        {/* Área de conteúdo */}
        <div style={{flex:1,overflowY:"auto",padding:28}}>

          {/* DASHBOARD */}
          {view==="dashboard"&&(
            <div>
              {/* Boas-vindas */}
              <div style={{marginBottom:24}}>
                <div style={{fontFamily:"'Playfair Display',serif",fontSize:26,color:T.cream,marginBottom:4}}>
                  Bom dia, {usuario.nome.split(" ")[1]||usuario.nome.split(" ")[0]}.
                </div>
                <div style={{color:T.muted,fontSize:13}}>Aqui está o resumo operacional do escritório.</div>
              </div>
              {/* Stats */}
              <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14,marginBottom:22}}>
                {[{l:"Processos",v:stats.total,ic:"⚖",c:T.gold},{l:"Em Andamento",v:stats.and,ic:"▶",c:"#5bc0de"},{l:"Urgentes",v:stats.urg,ic:"⚑",c:"#e05050"},{l:"Concluídos",v:stats.ok,ic:"✓",c:"#40c080"}].map(({l,v,ic,c})=>(
                  <Card key={l}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                      <div><div style={{fontSize:28,fontWeight:700,color:c,fontFamily:"'Playfair Display',serif"}}>{v}</div><div style={{color:T.cream2,fontSize:12,marginTop:3,fontFamily:"'Crimson Text',serif"}}>{l}</div></div>
                      <span style={{fontSize:22,color:c,opacity:0.5}}>{ic}</span>
                    </div>
                  </Card>
                ))}
              </div>
              {/* Próximos prazos */}
              <Card>
                <div style={{fontFamily:"'Playfair Display',serif",color:T.gold,fontSize:15,marginBottom:4}}>Próximos Prazos</div>
                <Divider gold my={10}/>
                {procs.filter(p=>p.proximo_andamento).sort((a,b)=>a.proximo_andamento.localeCompare(b.proximo_andamento)).slice(0,6).map((p,i,arr)=>(
                  <div key={p.id} onClick={()=>{setSel(p);setView("processos");}} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"11px 0",borderBottom:i<arr.length-1?`1px solid ${T.border}`:"none",cursor:"pointer",transition:"opacity 0.15s"}}
                    onMouseEnter={e=>e.currentTarget.style.opacity="0.8"}
                    onMouseLeave={e=>e.currentTarget.style.opacity="1"}>
                    <div>
                      <div style={{color:T.cream,fontSize:13,fontFamily:"'Crimson Text',serif"}}>{p.cliente}</div>
                      <div style={{color:T.muted,fontSize:11,marginTop:2}}>{p.fase} · {p.responsavel}</div>
                    </div>
                    <div style={{display:"flex",gap:12,alignItems:"center"}}>
                      <SBadge status={p.status}/>
                      <span style={{color:T.gold,fontSize:12,fontFamily:"'Playfair Display',serif"}}>{fmtBR(p.proximo_andamento)}</span>
                    </div>
                  </div>
                ))}
              </Card>
            </div>
          )}

          {/* PROCESSOS lista */}
          {view==="processos"&&!sel&&(
            <div>
              <div style={{display:"flex",gap:10,marginBottom:18}}>
                <input value={busca} onChange={e=>setBusca(e.target.value)} placeholder="Buscar por cliente, número ou parte adversa..." style={{flex:1,background:T.navy2,border:`1px solid ${T.border}`,borderRadius:4,padding:"9px 14px",color:T.cream,fontSize:13,outline:"none",fontFamily:"'Crimson Text',serif"}} onFocus={e=>e.target.style.borderColor=T.gold} onBlur={e=>e.target.style.borderColor=T.border}/>
                <select value={filtS} onChange={e=>setFiltS(e.target.value)} style={{background:T.navy2,border:`1px solid ${T.border}`,borderRadius:4,padding:"9px 14px",color:T.cream,fontSize:13,outline:"none",fontFamily:"'Crimson Text',serif"}}>
                  {["Todos","Em andamento","Aguardando","Urgente","Concluído"].map(s=><option key={s}>{s}</option>)}
                </select>
              </div>
              {load?<Spin/>:<div style={{display:"flex",flexDirection:"column",gap:6}}>
                {fil.map(p=>(
                  <div key={p.id} onClick={()=>{setSel(p);auditar("VER_PROCESSO","processo:"+p.id);}} style={{background:T.navy2,border:`1px solid ${T.border}`,borderRadius:6,padding:"14px 18px",cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center",transition:"all 0.15s"}}
                    onMouseEnter={e=>{e.currentTarget.style.borderColor=T.gold;e.currentTarget.style.boxShadow=`0 2px 12px ${T.gold}18`;}}
                    onMouseLeave={e=>{e.currentTarget.style.borderColor=T.border;e.currentTarget.style.boxShadow="none";}}>
                    <div style={{flex:1}}>
                      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:3}}>
                        <span style={{color:T.cream,fontFamily:"'Playfair Display',serif",fontSize:14}}>{p.cliente}</span>
                        <span style={{color:T.muted,fontSize:12,fontFamily:"'Crimson Text',serif"}}>vs {p.adverso}</span>
                      </div>
                      <div style={{fontSize:10,color:T.muted,letterSpacing:0.5,fontFamily:"'Crimson Text',serif"}}>{p.id} · {p.area} · {p.vara}</div>
                    </div>
                    <div style={{display:"flex",gap:12,alignItems:"center"}}>
                      <span style={{fontSize:12,color:T.cream2,fontFamily:"'Crimson Text',serif"}}>{p.responsavel}</span>
                      <span style={{fontSize:13,color:T.gold,fontFamily:"'Playfair Display',serif"}}>{p.valor}</span>
                      <SBadge status={p.status}/>
                    </div>
                  </div>
                ))}
                {fil.length===0&&<div style={{textAlign:"center",color:T.muted,padding:40,fontFamily:"'Crimson Text',serif"}}>Nenhum processo encontrado.</div>}
              </div>}
            </div>
          )}

          {view==="processos"&&sel&&<ProcDetalhe proc0={sel} onBack={()=>setSel(null)}/>}
          {view==="juris"&&<Juris/>}

          {/* AGENDA */}
          {view==="agenda"&&(
            <div>
              {procs.filter(p=>p.proximo_andamento).sort((a,b)=>a.proximo_andamento.localeCompare(b.proximo_andamento)).map(p=>{
                const[,m,d]=p.proximo_andamento.slice(0,10).split("-");
                return(
                  <div key={p.id} onClick={()=>{setSel(p);setView("processos");}} style={{background:T.navy2,border:`1px solid ${T.border}`,borderRadius:6,padding:"12px 18px",display:"flex",alignItems:"center",gap:16,marginBottom:6,cursor:"pointer",transition:"all 0.15s"}}
                    onMouseEnter={e=>{e.currentTarget.style.borderColor=T.gold;}}
                    onMouseLeave={e=>{e.currentTarget.style.borderColor=T.border;}}>
                    <div style={{textAlign:"center",background:T.navy,border:`1px solid ${T.borderG}`,borderRadius:6,padding:"8px 14px",minWidth:52}}>
                      <div style={{fontFamily:"'Playfair Display',serif",color:T.gold,fontSize:20,fontWeight:700}}>{d}</div>
                      <div style={{color:T.muted,fontSize:9,textTransform:"uppercase",letterSpacing:1}}>{MESES[+m-1]}</div>
                    </div>
                    <div style={{flex:1}}><div style={{color:T.cream,fontSize:14,fontFamily:"'Playfair Display',serif"}}>{p.cliente}</div><div style={{color:T.muted,fontSize:11,marginTop:2,fontFamily:"'Crimson Text',serif"}}>{p.id} · {p.fase} · {p.responsavel}</div></div>
                    <SBadge status={p.status}/>
                  </div>
                );
              })}
            </div>
          )}

          {/* AUDITORIA */}
          {view==="auditoria"&&<AuditoriaView/>}

          {/* EQUIPE */}
          {view==="usuarios"&&<EquipeView sb={sb} usuario={usuario} pode={pode} confirmar={confirmar} auditar={auditar} toast={toast}/>}

          {/* MODAL NOVO PROCESSO */}
          {showForm&&(
            <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.88)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:100}}>
              <div style={{background:T.navy2,border:`1px solid ${T.borderG}`,borderRadius:12,padding:36,width:620,maxHeight:"90vh",overflowY:"auto",boxShadow:`0 24px 80px #000`}}>
                <div style={{fontFamily:"'Playfair Display',serif",color:T.gold,fontSize:18,marginBottom:4}}>Cadastrar Novo Processo</div>
                <div style={{color:T.muted,fontSize:12,marginBottom:20,fontFamily:"'Crimson Text',serif"}}>Preencha os dados do processo para incluir no sistema.</div>
                <Divider gold my={0}/>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginTop:16}}>
                  {[["Número do Processo *","id"],["Cliente *","cliente"],["Parte Adversa","adverso"],["Advogado Responsável","responsavel"],["Área Jurídica","area"],["Fase Processual","fase"],["Vara / Juízo","vara"],["Tribunal","tribunal"],["Valor da Causa","valor"]].map(([l,k])=>(
                    <Inp key={k} label={l} value={form[k]} onChange={v=>setForm(f=>({...f,[k]:v}))}/>
                  ))}
                  {[["Data de Distribuição","data_distribuicao"],["Próximo Prazo","proximo_andamento"]].map(([l,k])=>(
                    <Inp key={k} label={l} value={form[k]} onChange={v=>setForm(f=>({...f,[k]:v}))} type="date"/>
                  ))}
                </div>
                <div style={{marginTop:14}}><label style={{display:"block",fontSize:9,color:T.muted,textTransform:"uppercase",letterSpacing:2,marginBottom:5}}>Descrição / Objeto da Ação</label><textarea value={form.descricao} onChange={e=>setForm(f=>({...f,descricao:e.target.value}))} rows={3} style={{width:"100%",background:T.navy,border:`1px solid ${T.border}`,borderRadius:4,padding:"9px 12px",color:T.cream,fontSize:13,outline:"none",fontFamily:"'Crimson Text',serif",resize:"none",boxSizing:"border-box"}}/></div>
                <Divider my={16}/>
                <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}><Btn onClick={()=>setShowForm(false)} v="g">Cancelar</Btn><Btn onClick={salvar} v="gold" disabled={!form.id||!form.cliente}>Cadastrar Processo</Btn></div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AuditoriaView(){
  const{pode,sb}=useSeg();const[logs,setLogs]=useState([]);const[load,setLoad]=useState(true);const[f,setF]=useState("");
  useEffect(()=>{sb.from("auditoria").order("criado_em",{ascending:false}).limit(200).select().then(({data})=>{setLogs(data||[]);setLoad(false);});},[]);
  if(!pode("auditoria","l"))return<div style={{textAlign:"center",padding:60}}><div style={{fontSize:44}}>🚫</div><div style={{color:"#e05050",marginTop:14,fontFamily:"'Playfair Display',serif"}}>Acesso Restrito</div><div style={{color:T.muted,marginTop:8,fontFamily:"'Crimson Text',serif"}}>Somente Sócios têm acesso ao log de auditoria.</div></div>;
  const COR={LOGIN:{c:"#40c080",bg:T.greenBg},LOGOUT:{c:"#5bc0de",bg:T.blueBg},LOGIN_FALHA:{c:"#e05050",bg:T.redBg},CRIAR_PROCESSO:{c:T.gold,bg:T.goldBg},EXCLUIR_NOTA:{c:T.amber,bg:T.amberBg}};
  const fil=logs.filter(l=>f===""||l.acao?.includes(f.toUpperCase())||l.usuario_nome?.toLowerCase().includes(f.toLowerCase()));
  return<div>
    <div style={{color:T.muted,fontSize:12,marginBottom:16,fontFamily:"'Crimson Text',serif"}}>Registro imutável de todas as ações realizadas no sistema.</div>
    <input value={f} onChange={e=>setF(e.target.value)} placeholder="Filtrar por usuário ou ação..." style={{width:"100%",background:T.navy2,border:`1px solid ${T.border}`,borderRadius:4,padding:"9px 14px",color:T.cream,fontSize:13,outline:"none",fontFamily:"'Crimson Text',serif",boxSizing:"border-box",marginBottom:14}}/>
    {load?<Spin/>:<div style={{display:"flex",flexDirection:"column",gap:5}}>
      {fil.slice(0,100).map(l=>{const ac=COR[l.acao]||{c:T.muted,bg:T.navy2};return<div key={l.id} style={{background:T.navy2,border:`1px solid ${T.border}`,borderRadius:6,padding:"9px 14px",display:"flex",alignItems:"center",gap:10}}>
        <span style={{background:ac.bg,color:ac.c,border:`1px solid ${ac.c}33`,borderRadius:4,padding:"2px 8px",fontSize:9,whiteSpace:"nowrap",minWidth:140,textAlign:"center",fontFamily:"'Crimson Text',serif",letterSpacing:0.5}}>{l.acao}</span>
        <span style={{flex:1,color:T.cream,fontSize:12,fontFamily:"'Crimson Text',serif"}}>{l.usuario_nome}{l.recurso&&<span style={{color:T.muted}}> → {l.recurso}</span>}</span>
        <span style={{color:l.resultado==="sucesso"?"#40c080":"#e05050",fontSize:10}}>{l.resultado}</span>
        <span style={{color:T.muted,fontSize:10,whiteSpace:"nowrap"}}>{l.criado_em?new Date(l.criado_em).toLocaleString("pt-BR"):"—"}</span>
      </div>;})}
    </div>}
  </div>;
}

function EquipeView({sb,usuario,pode,confirmar,auditar,toast}){
  const[lista,setLista]=useState([]);const[load,setLoad]=useState(true);const[editando,setEditando]=useState(null);
  const carregar=async()=>{const{data}=await sb.from("usuarios").select("*");setLista(data||[]);setLoad(false);};
  useEffect(()=>{if(pode("usuarios","l"))carregar();},[]);
  if(!pode("usuarios","l"))return<div style={{textAlign:"center",padding:60}}><div style={{fontSize:44}}>🚫</div><div style={{color:"#e05050",marginTop:14,fontFamily:"'Playfair Display',serif"}}>Acesso Restrito</div></div>;
  const alterarStatus=async(u)=>{if(u.id===usuario.id){toast("Não pode desativar a própria conta.","av");return;}const ok=await confirmar(`${u.ativo?"Desativar":"Ativar"} o acesso de "${u.nome}"?`);if(!ok)return;await sb.from("usuarios").eq("id",u.id).update({ativo:!u.ativo});await auditar(u.ativo?"DESATIVAR_USUARIO":"ATIVAR_USUARIO","usuario:"+u.id);toast(u.ativo?"Acesso desativado.":"Acesso ativado.");carregar();};
  const alterarPapel=async(u,p)=>{const ok=await confirmar(`Alterar papel de "${u.nome}" para "${PAPEL_LABEL[p]}"?`);if(!ok){setEditando(null);return;}await sb.from("usuarios").eq("id",u.id).update({papel:p});await auditar("ALTERAR_PAPEL","usuario:"+u.id,{de:u.papel,para:p});toast("Papel atualizado.");setEditando(null);carregar();};
  return<div>
    <div style={{color:T.muted,fontSize:12,marginBottom:18,fontFamily:"'Crimson Text',serif"}}>Gerencie os perfis de acesso dos membros do escritório.</div>
    {load?<Spin/>:<div style={{display:"flex",flexDirection:"column",gap:10}}>
      {lista.map(u=>(
        <Card key={u.id}>
          <div style={{display:"flex",alignItems:"center",gap:14}}>
            <Av u={u} sz={44}/>
            <div style={{flex:1}}>
              <div style={{color:T.cream,fontSize:15,fontFamily:"'Playfair Display',serif",marginBottom:5}}>{u.nome}</div>
              <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
                {editando===u.id?<select defaultValue={u.papel} onChange={e=>alterarPapel(u,e.target.value)} style={{background:T.navy,border:`1px solid ${T.gold}`,borderRadius:4,padding:"3px 8px",color:T.cream,fontSize:12,outline:"none",fontFamily:"'Crimson Text',serif"}}>{Object.entries(PAPEL_LABEL).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select>:<PBadge papel={u.papel}/>}
                <span style={{color:u.ativo?"#40c080":"#e05050",fontSize:10,fontFamily:"'Crimson Text',serif"}}>● {u.ativo?"Ativo":"Inativo"}</span>
                {u.ultimo_login&&<span style={{color:T.muted,fontSize:10}}>Último acesso: {new Date(u.ultimo_login).toLocaleString("pt-BR")}</span>}
              </div>
            </div>
            {pode("usuarios","e")&&<div style={{display:"flex",gap:8}}>
              <Btn sm v="g" onClick={()=>setEditando(editando===u.id?null:u.id)}>Alterar Papel</Btn>
              {u.id!==usuario.id&&<Btn sm v={u.ativo?"d":"ok"} onClick={()=>alterarStatus(u)}>{u.ativo?"Desativar":"Ativar"}</Btn>}
            </div>}
          </div>
        </Card>
      ))}
    </div>}
    {/* Matriz de permissões */}
    <Card style={{marginTop:20}}>
      <div style={{fontFamily:"'Playfair Display',serif",color:T.gold,fontSize:14,marginBottom:14}}>Matriz de Permissões por Papel</div>
      <Divider gold my={0}/>
      <div style={{overflowX:"auto",marginTop:14}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
          <thead><tr><th style={{color:T.muted,textAlign:"left",padding:"5px 8px",borderBottom:`1px solid ${T.border}`,fontFamily:"'Crimson Text',serif"}}>Recurso</th>
            {Object.keys(PAPEL_LABEL).map(p=><th key={p} style={{color:PAPEL_COR[p],padding:"5px 8px",borderBottom:`1px solid ${T.border}`,textAlign:"center",whiteSpace:"nowrap",fontFamily:"'Crimson Text',serif"}}>{PAPEL_LABEL[p]}</th>)}
          </tr></thead>
          <tbody>{[["processos","Processos"],["notas","Notas"],["arquivos","Arquivos"],["ia","Assist. IA"],["auditoria","Auditoria"],["usuarios","Usuários"]].map(([r,lb])=>(
            <tr key={r}><td style={{color:T.cream2,padding:"5px 8px",borderBottom:`1px solid ${T.border}`,fontFamily:"'Crimson Text',serif"}}>{lb}</td>
              {Object.keys(PAPEL_LABEL).map(p=>{const pm=PERMISSOES[p]?.[r]||{};const aa=["l","c","e","x"].filter(a=>pm[a]);return<td key={p} style={{textAlign:"center",padding:"5px 8px",borderBottom:`1px solid ${T.border}`}}>{aa.length===0?<span style={{color:"#e05050"}}>✕</span>:<span style={{color:"#40c080",fontSize:10,letterSpacing:1}}>{aa.map(a=>({l:"L",c:"C",e:"E",x:"X"})[a]).join(" ")}</span>}</td>;})}
            </tr>
          ))}</tbody>
        </table>
        <div style={{color:T.muted,fontSize:9,marginTop:8,fontFamily:"'Crimson Text',serif"}}>L = Ler · C = Criar · E = Editar · X = Excluir</div>
      </div>
    </Card>
  </div>;
}

// ══════════════════════════════════════════════════════════════
//  ENTRY POINT
// ══════════════════════════════════════════════════════════════
export default function App(){
  const[sb,setSb]=useState(()=>{const c=lerCfg();return c?criarSupabase(c.u,c.k):null;});
  const[config,setConfig]=useState(!sb);
  if(config||!sb)return<TelaConfig onConectado={s=>{setSb(s);setConfig(false);}}/>;
  return(
    <SegProvider sb={sb}>
      <AppComAuth onConfig={()=>setConfig(true)}/>
    </SegProvider>
  );
}
function AppComAuth({onConfig}){
  const{usuario}=useSeg();
  return usuario?<AppInterno onConfig={onConfig}/>:<TelaLogin onConfig={onConfig}/>;
}
