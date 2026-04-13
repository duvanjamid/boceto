import { useState, useEffect, useCallback, useRef } from "react";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// THEMES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const THEMES = {
  paper:     { bg:"#f8f7f4", surface:"#ffffff", border:"#d6d3cc", borderD:"#b0aca4", ink:"#1a1916", inkMid:"#6b6760", inkFaint:"#a8a49e", fill:"#eceae5", blue:"#3b5bdb", accent:"#1a1916", accentFg:"#f8f7f4" },
  blueprint: { bg:"#0d1f3c", surface:"#112348", border:"#1e4080", borderD:"#2a5aaa", ink:"#a8cfff", inkMid:"#5a8fd4", inkFaint:"#2a5090", fill:"#0a1830", blue:"#60a5fa", accent:"#a8cfff", accentFg:"#0d1f3c" },
  sketch:    { bg:"#ffffff", surface:"#fafafa", border:"#222222", borderD:"#111111", ink:"#111111", inkMid:"#444444", inkFaint:"#999999", fill:"#f0f0f0", blue:"#1a56db", accent:"#111111", accentFg:"#ffffff" },
  noir:      { bg:"#141414", surface:"#1e1e1e", border:"#2e2e2e", borderD:"#444444", ink:"#f0f0f0", inkMid:"#aaaaaa", inkFaint:"#555555", fill:"#252525", blue:"#60a5fa", accent:"#f0f0f0", accentFg:"#141414" },
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PARSER
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function parseDSL(src) {
  const lines = src.split("\n");
  const pages = {}; let cur = null; let stack = [];
  let theme = "paper";
  const indent   = l => l.match(/^(\s*)/)[1].length;
  const unquote  = s => s.replace(/^["']|["']$/g,"").trim();
  const splitDot = s => s.split("·").map(x=>x.trim()).filter(Boolean);
  const arrowT   = s => { const m=s.match(/>\s*(\w+)\s*$/); return m?m[1]:null; };
  const noArrow  = s => s.replace(/>\s*\w+\s*$/,"").trim();

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line.trim()||line.trim().startsWith("//")) continue;
    const ind=indent(line), t=line.trim();
    if (t.startsWith("theme ")) { theme=t.slice(6).trim(); continue; }
    if (t.startsWith("@")) {
      cur={name:t.slice(1).trim(),children:[]}; pages[cur.name]=cur; stack=[]; continue;
    }
    if (!cur) continue;
    while (stack.length&&stack[stack.length-1].indent>=ind) stack.pop();
    const parent=stack.length?stack[stack.length-1].node:cur;
    const rest=t.replace(/^[^\s]+\s*/,"");
    let node=null;

    if (t==="---")                   node={type:"divider"};
    else if (/^#{1,3} /.test(t)) {
      const lvl=t.match(/^(#+)/)[1].length;
      node={type:`h${lvl}`,text:t.replace(/^#+\s*/,"")};
    }
    else if (t.startsWith("p "))     node={type:"para",text:unquote(rest)};
    else if (t.startsWith("note "))  node={type:"note",text:unquote(rest)};
    else if (t.startsWith("nav "))   node={type:"nav",items:splitDot(rest)};
    else if (t.startsWith("tabs "))  node={type:"tabs",items:splitDot(rest)};
    else if (t.startsWith("field ")){ const pw=rest.trimEnd().endsWith("*"),op=rest.trimEnd().endsWith("?");
      node={type:"field",label:unquote(noArrow(rest).replace(/[*?]$/,"").trim()),password:pw,optional:op}; }
    else if (t.startsWith("area "))  node={type:"area",label:unquote(rest)};
    else if (t.startsWith("pick ")){ const [l,...o]=rest.split(">");
      node={type:"pick",label:unquote(l.trim()),options:o.join(">").trim().split(/\s+/).filter(Boolean)}; }
    else if (t.startsWith("check ")) node={type:"check",label:unquote(rest)};
    else if (t.startsWith("toggle "))node={type:"toggle",label:unquote(rest)};
    else if (t.startsWith("btn "))   node={type:"btn",label:unquote(noArrow(rest)),target:arrowT(rest)};
    else if (t.startsWith("ghost ")) node={type:"ghost",label:unquote(noArrow(rest)),target:arrowT(rest)};
    else if (t.startsWith("link "))  node={type:"link",label:unquote(noArrow(rest)),target:arrowT(rest)};
    else if (t.startsWith("img "))   node={type:"img",label:unquote(rest)};
    else if (t.startsWith("avatar "))node={type:"avatar",name:unquote(rest)};
    else if (t.startsWith("badge ")) node={type:"badge",text:unquote(rest)};
    else if (t==="row")  node={type:"row",children:[]};
    else if (t==="card"||t.startsWith("card "))
      node={type:"card",title:t.length>4?unquote(rest):"",children:[]};
    else if (t==="aside")node={type:"aside",children:[]};
    else if (t.startsWith("kpi ")){ const[v,...r]=rest.split(/\s+/);node={type:"kpi",value:v,label:r.join(" ")}; }
    else if (t.startsWith("grid ")) node={type:"grid",cols:splitDot(rest)};
    else if (t.startsWith("list ")) node={type:"list",items:splitDot(rest)};

    if (node) {
      parent.children.push(node);
      if (["row","card","aside"].includes(node.type)) stack.push({indent:ind,node});
    }
  }
  return {pages,theme};
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// WIRE NODE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function WireNode({node,onNav,T,d=0}){
  const [tab,setTab]=useState(0);
  const ch=arr=>(arr||[]).map((c,i)=><WireNode key={i} node={c} onNav={onNav} T={T} d={d+1}/>);
  const R=6;
  switch(node.type){
    case "nav": return(
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",
        padding:"11px 16px",borderBottom:`1.5px solid ${T.border}`,background:T.surface,
        marginLeft:-16,marginRight:-16,marginTop:d===0?-16:0}}>
        <b style={{fontSize:13,color:T.ink,letterSpacing:"-0.3px"}}>{node.items[0]}</b>
        <div style={{display:"flex",gap:16}}>{node.items.slice(1).map((x,i)=>
          <span key={i} style={{fontSize:11,color:T.inkMid}}>{x}</span>)}</div>
      </div>);
    case "tabs": return(
      <div style={{width:"100%"}}>
        <div style={{display:"flex",borderBottom:`1.5px solid ${T.border}`}}>
          {node.items.map((x,i)=><button key={i} onClick={()=>setTab(i)} style={{
            padding:"7px 13px",border:"none",background:"none",cursor:"pointer",
            fontSize:12,fontWeight:tab===i?600:400,color:tab===i?T.ink:T.inkFaint,
            borderBottom:tab===i?`2px solid ${T.ink}`:"2px solid transparent",marginBottom:-1.5,
          }}>{x}</button>)}
        </div>
      </div>);
    case "row": return <div style={{display:"flex",gap:10,width:"100%",flexWrap:"wrap",margin:"2px 0"}}>{ch(node.children)}</div>;
    case "card": return(
      <div style={{background:T.surface,border:`1.5px solid ${T.border}`,borderRadius:R+2,padding:"14px 16px",margin:"3px 0",width:"100%"}}>
        {node.title&&<div style={{fontSize:10,fontWeight:700,color:T.inkMid,textTransform:"uppercase",letterSpacing:".08em",marginBottom:10}}>{node.title}</div>}
        <div style={{display:"flex",flexDirection:"column",gap:8}}>{ch(node.children)}</div>
      </div>);
    case "aside": return(
      <div style={{width:140,flexShrink:0,background:T.fill,borderRadius:R,border:`1.5px solid ${T.border}`,padding:"12px 10px"}}>
        <div style={{display:"flex",flexDirection:"column",gap:6}}>{ch(node.children)}</div>
      </div>);
    case "h1": return <div style={{fontSize:22,fontWeight:700,color:T.ink,letterSpacing:"-0.5px",lineHeight:1.2,margin:"4px 0 2px"}}>{node.text}</div>;
    case "h2": return <div style={{fontSize:16,fontWeight:600,color:T.ink,letterSpacing:"-0.2px",margin:"3px 0 2px"}}>{node.text}</div>;
    case "h3": return <div style={{fontSize:13,fontWeight:600,color:T.inkMid,margin:"2px 0 1px"}}>{node.text}</div>;
    case "para":  return <div style={{fontSize:12,color:T.inkMid,lineHeight:1.6}}>{node.text}</div>;
    case "note":  return <div style={{fontSize:11,color:T.inkFaint,fontStyle:"italic"}}>{node.text}</div>;
    case "divider":return <hr style={{border:"none",borderTop:`1.5px dashed ${T.border}`,margin:"6px 0"}}/>;
    case "field": return(
      <div style={{width:"100%"}}>
        <div style={{fontSize:10,fontWeight:700,color:T.inkMid,textTransform:"uppercase",letterSpacing:".07em",marginBottom:5}}>
          {node.label}{node.optional&&<span style={{color:T.inkFaint,fontWeight:400}}> — opcional</span>}
        </div>
        <div style={{height:34,background:T.bg,border:`1.5px solid ${T.border}`,borderRadius:R,display:"flex",alignItems:"center",padding:"0 11px"}}>
          <span style={{fontSize:11,color:T.inkFaint}}>{node.password?"••••••••••":node.label.toLowerCase()+"..."}</span>
        </div>
      </div>);
    case "area": return(
      <div style={{width:"100%"}}>
        <div style={{fontSize:10,fontWeight:700,color:T.inkMid,textTransform:"uppercase",letterSpacing:".07em",marginBottom:5}}>{node.label}</div>
        <div style={{height:76,background:T.bg,border:`1.5px solid ${T.border}`,borderRadius:R,padding:"9px 11px"}}>
          <span style={{fontSize:11,color:T.inkFaint}}>{node.label.toLowerCase()}...</span>
        </div>
      </div>);
    case "pick": return(
      <div style={{width:"100%"}}>
        <div style={{fontSize:10,fontWeight:700,color:T.inkMid,textTransform:"uppercase",letterSpacing:".07em",marginBottom:5}}>{node.label}</div>
        <div style={{height:34,background:T.bg,border:`1.5px solid ${T.border}`,borderRadius:R,display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 11px"}}>
          <span style={{fontSize:11,color:T.inkFaint}}>{node.options[0]||"Seleccionar…"}</span>
          <span style={{color:T.inkFaint,fontSize:9}}>▾</span>
        </div>
      </div>);
    case "check": return(
      <div style={{display:"flex",alignItems:"center",gap:9}}>
        <div style={{width:15,height:15,border:`1.5px solid ${T.border}`,borderRadius:3,background:T.bg,flexShrink:0}}/>
        <span style={{fontSize:12,color:T.inkMid}}>{node.label}</span>
      </div>);
    case "toggle": return(
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",width:"100%"}}>
        <span style={{fontSize:12,color:T.inkMid}}>{node.label}</span>
        <div style={{width:34,height:18,background:T.fill,borderRadius:9,border:`1.5px solid ${T.border}`,position:"relative"}}>
          <div style={{width:12,height:12,background:T.borderD,borderRadius:"50%",position:"absolute",top:2,left:2}}/>
        </div>
      </div>);
    case "btn": return(
      <button onClick={()=>node.target&&onNav(node.target)} style={{
        height:36,padding:"0 18px",background:T.accent,color:T.accentFg,
        border:"none",borderRadius:R,fontSize:12,fontWeight:600,
        cursor:node.target?"pointer":"default",letterSpacing:".01em",
        display:"inline-flex",alignItems:"center",gap:6,
      }}>{node.label}{node.target&&<span style={{opacity:.5,fontSize:10}}>→</span>}</button>);
    case "ghost": return(
      <button onClick={()=>node.target&&onNav(node.target)} style={{
        height:36,padding:"0 18px",background:"transparent",color:T.ink,
        border:`1.5px solid ${T.borderD}`,borderRadius:R,fontSize:12,fontWeight:500,
        cursor:node.target?"pointer":"default",
        display:"inline-flex",alignItems:"center",gap:6,
      }}>{node.label}</button>);
    case "link": return(
      <span onClick={()=>node.target&&onNav(node.target)} style={{
        fontSize:12,color:T.blue,textDecoration:"underline",
        cursor:node.target?"pointer":"default",textUnderlineOffset:2,
      }}>{node.label}</span>);
    case "img": return(
      <div style={{width:"100%",height:110,background:T.fill,border:`1.5px dashed ${T.border}`,borderRadius:R,
        display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:5}}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={T.inkFaint} strokeWidth="1.5">
          <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
          <path d="M21 15l-5-5L5 21"/>
        </svg>
        <span style={{fontSize:10,color:T.inkFaint}}>{node.label}</span>
      </div>);
    case "avatar":{
      const init=node.name.split(" ").map(x=>x[0]).join("").slice(0,2).toUpperCase();
      return <div style={{width:38,height:38,borderRadius:"50%",background:T.fill,border:`1.5px solid ${T.border}`,
        display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:600,color:T.inkMid,flexShrink:0}}>{init}</div>;}
    case "badge": return(
      <span style={{display:"inline-block",padding:"3px 9px",background:T.fill,border:`1px solid ${T.border}`,
        borderRadius:20,fontSize:10,color:T.inkMid,fontWeight:600}}>{node.text}</span>);
    case "kpi": return(
      <div style={{flex:1,minWidth:70}}>
        <div style={{fontSize:24,fontWeight:700,color:T.ink,letterSpacing:"-0.5px",lineHeight:1}}>{node.value}</div>
        <div style={{fontSize:10,color:T.inkFaint,marginTop:3,fontWeight:500}}>{node.label}</div>
      </div>);
    case "grid": return(
      <div style={{width:"100%",overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
          <thead><tr>{node.cols.map((c,i)=><th key={i} style={{padding:"7px 10px",background:T.fill,border:`1px solid ${T.border}`,
            textAlign:"left",color:T.inkMid,fontWeight:700,fontSize:10,textTransform:"uppercase",letterSpacing:".06em"}}>{c}</th>)}</tr></thead>
          <tbody>{[0,1,2].map(r=><tr key={r}>{node.cols.map((_,c)=><td key={c} style={{padding:"8px 10px",border:`1px solid ${T.border}`}}>
            <div style={{height:8,background:T.fill,borderRadius:3,width:`${40+Math.sin(r*3+c)*25+25}%`}}/></td>)}</tr>)}</tbody>
        </table>
      </div>);
    case "list": return(
      <div style={{width:"100%"}}>
        {node.items.map((item,i)=><div key={i} style={{display:"flex",alignItems:"center",gap:10,
          padding:"8px 0",borderBottom:i<node.items.length-1?`1px solid ${T.border}`:"none"}}>
          <div style={{width:5,height:5,borderRadius:"50%",background:T.borderD,flexShrink:0}}/>
          <span style={{fontSize:12,color:T.inkMid}}>{item}</span>
        </div>)}
      </div>);
    default: return null;
  }
}

function PageView({page,onNav,T}){
  if(!page) return null;
  return(
    <div style={{padding:16,display:"flex",flexDirection:"column",gap:10}}>
      {(page.children||[]).map((n,i)=><WireNode key={i} node={n} onNav={onNav} T={T} d={0}/>)}
    </div>);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// DEFAULT DSL
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const DEMO=`// WireScript v2
// @ pantalla  # título  > navega  · separa ítems

theme paper

@Login
nav Kova
img "Hero illustration"
# Bienvenido de vuelta
p Inicia sesión para continuar
---
field Email
field Contraseña *
check Mantener sesión iniciada
btn Entrar > Dashboard
link ¿Olvidaste tu contraseña? > Reset

@Dashboard
nav Kova · Inicio · Proyectos · Ajustes
# Buenos días, Ana
p Resumen de hoy
row
  kpi 1.284 Usuarios
  kpi 94% Satisfacción
  kpi 38 Tareas
card Proyectos recientes
  grid Nombre · Estado · Fecha · Dueño
row
  btn Nuevo proyecto > Crear
  ghost Ver todos

@Crear
nav Kova · Inicio · Proyectos
# Nuevo proyecto
p Completa los campos para crear el proyecto
field Nombre del proyecto
area Descripción ?
pick Tipo > Web Mobile Backend Diseño
pick Prioridad > Alta Media Baja
check Notificar al equipo
---
row
  btn Crear proyecto > Dashboard
  ghost Cancelar > Dashboard

@Reset
nav Kova
# Recuperar acceso
p Ingresa tu correo y te enviaremos un enlace
field Correo electrónico
btn Enviar instrucciones > Login
link Volver al inicio > Login
`;

const AI_SYS=`Eres experto en wireframes. El usuario tiene este WireScript:

{DSL}

SINTAXIS:
  theme paper|blueprint|sketch|noir
  @Pantalla
  # H1 / ## H2 / ### H3 / p texto / note hint / ---
  nav Logo · Link · Link   (· separa ítems)
  tabs Tab1 · Tab2
  field Etiqueta (* = password, ? = opcional)
  area Etiqueta / pick Etiqueta > Op1 Op2 / check Etiqueta / toggle Etiqueta
  btn Etiqueta > Pantalla / ghost Etiqueta > Pantalla / link Etiqueta > Pantalla
  img "Label" / avatar Nombre / badge Texto
  row / card / card Título / aside  (hijos con 2 espacios de sangría)
  kpi Valor Etiqueta / grid Col1 · Col2 / list · Item1 · Item2

Responde SOLO con el código WireScript. Sin explicaciones ni backticks.`;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// APP
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const THEME_NAMES=["paper","blueprint","sketch","noir"];
const THEME_ICONS={paper:"☕",blueprint:"📐",sketch:"✏️",noir:"🌙"};

export default function App(){
  const [dsl,setDsl]=useState(DEMO);
  const [parsed,setParsed]=useState({pages:{},theme:"paper"});
  const [cur,setCur]=useState(null);
  const [hist,setHist]=useState([]);
  const [view,setView]=useState("preview");
  const [aiMsg,setAiMsg]=useState("");
  const [aiLoading,setAiLoading]=useState(false);
  const [err,setErr]=useState(null);
  const [showSidebar,setShowSidebar]=useState(true);
  const [editingPage,setEditingPage]=useState(null);
  const [newPageName,setNewPageName]=useState("");
  const [showThemePicker,setShowThemePicker]=useState(false);
  const inputRef=useRef();

  useEffect(()=>{
    try{
      const p=parseDSL(dsl);
      setParsed(p);
      const keys=Object.keys(p.pages);
      if(keys.length&&!p.pages[cur]) setCur(keys[0]);
      setErr(null);
    }catch(e){setErr(e.message);}
  },[dsl]);

  const T=THEMES[parsed.theme]||THEMES.paper;
  const pageNames=Object.keys(parsed.pages);

  const nav=useCallback(target=>{
    if(parsed.pages[target]){setHist(h=>[...h,cur]);setCur(target);}
  },[parsed.pages,cur]);

  const back=()=>{
    if(!hist.length) return;
    setCur(hist[hist.length-1]); setHist(h=>h.slice(0,-1));
  };

  // Add page to DSL
  const addPage=()=>{
    const name=newPageName.trim().replace(/\s+/g,"_");
    if(!name) return;
    setDsl(d=>d+`\n\n@${name}\n  # ${name}\n  p Nueva pantalla\n`);
    setNewPageName("");
  };

  // Rename page in DSL
  const renamePage=(oldName,newName)=>{
    const n=newName.trim().replace(/\s+/g,"_");
    if(!n||n===oldName) return;
    setDsl(d=>d.replaceAll(`@${oldName}`,`@${n}`).replaceAll(`> ${oldName}`,`> ${n}`));
    if(cur===oldName) setCur(n);
    setEditingPage(null);
  };

  // Delete page from DSL
  const deletePage=name=>{
    const blocks=dsl.split(/(?=^@)/m);
    const filtered=blocks.filter(b=>!b.trim().startsWith(`@${name}`));
    setDsl(filtered.join("").trimStart());
    if(cur===name){ const others=pageNames.filter(n=>n!==name); setCur(others[0]||null); }
  };

  // Change theme in DSL
  const setTheme=t=>{
    setDsl(d=>{
      if(/^theme\s+\w+/m.test(d)) return d.replace(/^theme\s+\w+/m,`theme ${t}`);
      return `theme ${t}\n\n`+d.replace(/^theme\s+\w+\n?/m,"");
    });
    setShowThemePicker(false);
  };

  const runAI=async()=>{
    if(!aiMsg.trim()||aiLoading) return;
    setAiLoading(true);
    try{
      const res=await fetch("https://api.anthropic.com/v1/messages",{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:2000,
          system:AI_SYS.replace("{DSL}",dsl),
          messages:[{role:"user",content:aiMsg}]}),
      });
      const data=await res.json();
      const text=data.content?.[0]?.text||"";
      const clean=text.replace(/```[a-z]*/g,"").replace(/```/g,"").trim();
      if(clean){setDsl(clean);setAiMsg("");setView("preview");}
    }catch(e){setErr(e.message);}
    finally{setAiLoading(false);}
  };

  // ── colours for editor shell ──
  const S={bg:"#0c0b14",border:"#1a1826",ink:"#e4e0ff",ink2:"#6e6b8a",ink3:"#3d3a50",
    accent:"#7c6ff7",accentSoft:"#1e1a30"};

  const Tab=({id,icon,label})=>(
    <button onClick={()=>setView(id)} style={{flex:1,display:"flex",flexDirection:"column",
      alignItems:"center",justifyContent:"center",gap:3,padding:"9px 0 7px",
      border:"none",background:"none",cursor:"pointer",
      color:view===id?"#c4baff":S.ink3,
      borderTop:view===id?`2px solid ${S.accent}`:"2px solid transparent"}}>
      <span style={{fontSize:15,lineHeight:1}}>{icon}</span>
      <span style={{fontSize:8.5,fontWeight:700,letterSpacing:".08em"}}>{label}</span>
    </button>);

  return(
    <div style={{display:"flex",flexDirection:"column",height:"100vh",
      fontFamily:"'Inter',system-ui,sans-serif",background:S.bg,color:S.ink,overflow:"hidden"}}>

      {/* ── HEADER ── */}
      <header style={{display:"flex",alignItems:"center",height:46,padding:"0 12px",
        borderBottom:`1px solid ${S.border}`,flexShrink:0,gap:8}}>
        {/* Logo */}
        <div style={{display:"flex",alignItems:"center",gap:6,marginRight:4}}>
          <div style={{width:20,height:20,borderRadius:5,
            background:"linear-gradient(135deg,#7c6ff7,#a78bfa)",
            display:"flex",alignItems:"center",justifyContent:"center",
            color:"white",fontWeight:800,fontSize:11}}>W</div>
          <span style={{fontWeight:700,fontSize:13,letterSpacing:"-0.3px"}}>WireScript</span>
        </div>

        {/* Theme picker */}
        <div style={{position:"relative"}}>
          <button onClick={()=>setShowThemePicker(x=>!x)} style={{
            display:"flex",alignItems:"center",gap:5,padding:"3px 9px",
            border:`1px solid ${S.border}`,borderRadius:6,background:S.accentSoft,
            color:S.ink2,fontSize:11,cursor:"pointer",
          }}>
            <span>{THEME_ICONS[parsed.theme]}</span>
            <span>{parsed.theme}</span>
            <span style={{fontSize:9,opacity:.6}}>▾</span>
          </button>
          {showThemePicker&&(
            <div style={{position:"absolute",top:30,left:0,background:"#13111e",
              border:`1px solid ${S.border}`,borderRadius:8,overflow:"hidden",zIndex:50,minWidth:130}}>
              {THEME_NAMES.map(t=>(
                <button key={t} onClick={()=>setTheme(t)} style={{
                  display:"flex",alignItems:"center",gap:8,width:"100%",padding:"8px 12px",
                  border:"none",background:parsed.theme===t?S.accentSoft:"none",
                  color:parsed.theme===t?"#c4baff":S.ink2,fontSize:12,cursor:"pointer",textAlign:"left",
                }}>
                  <span>{THEME_ICONS[t]}</span><span style={{fontWeight:parsed.theme===t?600:400}}>{t}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Preview controls */}
        {view==="preview"&&(
          <div style={{display:"flex",gap:4,flex:1,overflowX:"auto",alignItems:"center"}}>
            <button onClick={back} disabled={!hist.length} style={{
              width:26,height:26,borderRadius:5,border:`1px solid ${S.border}`,
              background:"none",color:hist.length?S.ink:S.ink3,
              cursor:hist.length?"pointer":"default",fontSize:13,flexShrink:0,
              display:"flex",alignItems:"center",justifyContent:"center",
            }}>←</button>
            {pageNames.map(name=>(
              <button key={name} onClick={()=>{setHist(h=>[...h,cur]);setCur(name);}} style={{
                padding:"3px 9px",borderRadius:5,border:"1px solid",
                borderColor:cur===name?S.accent:S.border,
                background:cur===name?S.accentSoft:"none",
                color:cur===name?"#c4baff":S.ink3,
                fontSize:10,fontWeight:cur===name?600:400,
                cursor:"pointer",whiteSpace:"nowrap",flexShrink:0,
              }}>{name}</button>
            ))}
          </div>
        )}
        {view==="code"&&(
          <div style={{flex:1,display:"flex",alignItems:"center",gap:6}}>
            <span style={{width:6,height:6,borderRadius:"50%",background:"#22c55e",display:"inline-block"}}/>
            <span style={{fontSize:10,color:S.ink3}}>en vivo</span>
          </div>
        )}
        {view==="ai"&&<span style={{flex:1,fontSize:11,color:S.ink3}}>✦ IA</span>}

        {/* Sidebar toggle */}
        <button onClick={()=>setShowSidebar(x=>!x)} style={{
          width:28,height:28,borderRadius:6,border:`1px solid ${S.border}`,
          background:showSidebar?S.accentSoft:"none",
          color:showSidebar?"#c4baff":S.ink3,fontSize:14,cursor:"pointer",
          display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,
        }} title="Páginas">⊞</button>
      </header>

      {/* ── BODY ── */}
      <div style={{flex:1,display:"flex",overflow:"hidden"}}>

        {/* ── PAGES SIDEBAR (Figma-like) ── */}
        {showSidebar&&(
          <aside style={{width:170,flexShrink:0,borderRight:`1px solid ${S.border}`,
            background:"#0e0d18",display:"flex",flexDirection:"column",overflow:"hidden"}}>
            <div style={{padding:"10px 12px 6px",fontSize:9,fontWeight:700,
              color:S.ink3,textTransform:"uppercase",letterSpacing:".1em"}}>Páginas</div>

            <div style={{flex:1,overflowY:"auto"}}>
              {pageNames.map(name=>(
                <div key={name} style={{
                  display:"flex",alignItems:"center",gap:6,
                  padding:"6px 8px 6px 12px",
                  background:cur===name?S.accentSoft:"none",
                  borderLeft:cur===name?`2px solid ${S.accent}`:"2px solid transparent",
                  cursor:"pointer",
                }} onClick={()=>{setHist(h=>[...h,cur]);setCur(name);}}>
                  {editingPage===name?(
                    <input autoFocus defaultValue={name} ref={inputRef}
                      onBlur={e=>renamePage(name,e.target.value)}
                      onKeyDown={e=>{if(e.key==="Enter") renamePage(name,e.target.value); if(e.key==="Escape") setEditingPage(null);}}
                      onClick={e=>e.stopPropagation()}
                      style={{flex:1,background:"#13111e",border:`1px solid ${S.accent}`,
                        color:S.ink,fontSize:11,padding:"2px 5px",borderRadius:4,outline:"none",minWidth:0}}/>
                  ):(
                    <span style={{flex:1,fontSize:11,color:cur===name?"#c4baff":S.ink2,
                      fontWeight:cur===name?600:400,truncate:"ellipsis",overflow:"hidden",whiteSpace:"nowrap"}}>
                      @{name}
                    </span>
                  )}
                  <div style={{display:"flex",gap:2,flexShrink:0}}>
                    <button onClick={e=>{e.stopPropagation();setEditingPage(name);}} style={{
                      width:16,height:16,border:"none",background:"none",
                      color:S.ink3,cursor:"pointer",fontSize:10,
                      display:"flex",alignItems:"center",justifyContent:"center",
                    }} title="Renombrar">✎</button>
                    <button onClick={e=>{e.stopPropagation();deletePage(name);}} style={{
                      width:16,height:16,border:"none",background:"none",
                      color:S.ink3,cursor:"pointer",fontSize:11,
                      display:"flex",alignItems:"center",justifyContent:"center",
                    }} title="Eliminar">×</button>
                  </div>
                </div>
              ))}
            </div>

            {/* Add page */}
            <div style={{padding:"8px",borderTop:`1px solid ${S.border}`}}>
              <div style={{display:"flex",gap:4}}>
                <input value={newPageName} onChange={e=>setNewPageName(e.target.value)}
                  onKeyDown={e=>e.key==="Enter"&&addPage()}
                  placeholder="NuevaPantalla" style={{
                    flex:1,background:"#13111e",border:`1px solid ${S.border}`,
                    color:S.ink,fontSize:10,padding:"5px 7px",borderRadius:5,outline:"none",minWidth:0,
                  }}/>
                <button onClick={addPage} style={{
                  width:24,height:24,border:"none",borderRadius:5,
                  background:S.accent,color:"white",fontSize:15,cursor:"pointer",
                  display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,
                }}>+</button>
              </div>
            </div>
          </aside>
        )}

        {/* ── CONTENT ── */}
        <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>

          {view==="preview"&&(
            <div style={{flex:1,overflow:"auto",background:"#07060f",
              display:"flex",flexDirection:"column",alignItems:"center",padding:"20px 16px 32px"}}>
              {cur&&parsed.pages[cur]?(
                <div style={{width:"100%",maxWidth:390}}>
                  <div style={{fontSize:9,color:"#1e1b2e",fontFamily:"monospace",
                    letterSpacing:".07em",marginBottom:8,paddingLeft:2}}>@{cur}</div>
                  <div style={{background:T.bg,borderRadius:14,overflow:"hidden",
                    boxShadow:"0 0 0 1.5px #1a1826, 0 20px 60px rgba(0,0,0,.8)",minHeight:400}}>
                    <PageView page={parsed.pages[cur]} onNav={nav} T={T}/>
                  </div>
                </div>
              ):(
                <div style={{color:"#1e1b2e",textAlign:"center",marginTop:80}}>
                  <div style={{fontSize:28,marginBottom:10}}>◻</div>
                  <div style={{fontSize:12,color:S.ink3}}>Escribe <code style={{color:S.accent}}>@Pantalla</code> o añade desde el panel izquierdo</div>
                </div>
              )}
            </div>
          )}

          {view==="code"&&(
            <textarea value={dsl} onChange={e=>setDsl(e.target.value)}
              spellCheck={false} autoCapitalize="none" autoCorrect="off"
              style={{flex:1,background:S.bg,color:"#b4b0d4",border:"none",outline:"none",
                resize:"none",padding:"14px 16px",
                fontFamily:"'JetBrains Mono','Fira Code',monospace",
                fontSize:12.5,lineHeight:1.85,letterSpacing:".015em"}}/>
          )}

          {view==="ai"&&(
            <div style={{flex:1,display:"flex",flexDirection:"column",padding:"14px 16px",gap:12,overflow:"auto"}}>
              <div style={{background:"#110f1e",border:`1px solid ${S.border}`,borderRadius:10,
                padding:"12px 14px",fontSize:12,color:"#4a4760",lineHeight:1.7}}>
                Describe lo que quieres cambiar. La IA reescribirá el wireframe completo.
              </div>
              <p style={{fontSize:11,color:S.ink3,margin:0,lineHeight:1.8}}>
                Prueba:{" "}
                {[`"cambia el tema a blueprint"`,`"añade pantalla de perfil con avatar"`,`"convierte el login en onboarding de 3 pasos"`].map((ex,i)=>(
                  <span key={i}>
                    <span onClick={()=>setAiMsg(ex.replace(/^"|"$/g,""))} style={{color:"#5a5670",cursor:"pointer",textDecoration:"underline",textUnderlineOffset:2}}>{ex}</span>
                    {i<2&&", "}
                  </span>
                ))}
              </p>
              <textarea value={aiMsg} onChange={e=>setAiMsg(e.target.value)}
                placeholder="Describe el cambio..."
                style={{flex:1,minHeight:100,background:"#110f1e",color:S.ink,
                  border:`1px solid ${S.border}`,borderRadius:10,padding:"12px 14px",
                  fontFamily:"inherit",fontSize:13.5,lineHeight:1.65,outline:"none",resize:"none"}}/>
              <button onClick={runAI} disabled={aiLoading||!aiMsg.trim()} style={{
                padding:13,borderRadius:10,border:"none",
                background:aiLoading||!aiMsg.trim()?"#110f1e":"linear-gradient(135deg,#7c6ff7,#a78bfa)",
                color:aiLoading||!aiMsg.trim()?S.ink3:"#fff",
                fontSize:13.5,fontWeight:600,letterSpacing:".02em",
                cursor:aiLoading||!aiMsg.trim()?"not-allowed":"pointer",
              }}>{aiLoading?"✦  Generando...":"✦  Modificar wireframe"}</button>
              {err&&<div style={{padding:"8px 12px",background:"#1f0a0a",color:"#f87171",fontSize:11,borderRadius:6}}>⚠ {err}</div>}
            </div>
          )}
        </div>
      </div>

      {/* ── TAB BAR ── */}
      <nav style={{display:"flex",borderTop:`1px solid ${S.border}`,background:S.bg,
        flexShrink:0,paddingBottom:"env(safe-area-inset-bottom,0px)"}}>
        <Tab id="preview" icon="◻" label="PREVIEW"/>
        <Tab id="code"    icon="⌨" label="CÓDIGO"/>
        <Tab id="ai"      icon="✦" label="IA"/>
      </nav>

      {/* click outside to close theme picker */}
      {showThemePicker&&<div onClick={()=>setShowThemePicker(false)} style={{position:"fixed",inset:0,zIndex:40}}/>}
    </div>
  );
}
