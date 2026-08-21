/* eslint-disable @next/next/no-img-element -- schema images use validated runtime URLs */
import type { ElementType } from "react";
import type { UIComponent, UISchema } from "@/types";
import { sanitizeStyles } from "@/lib/renderer/styleSanitizer";

const safeUrl=(raw:unknown,kind:"href"|"src")=>{ if(typeof raw!=="string")return undefined; try { const u=new URL(raw); return ["http:","https:"].includes(u.protocol)?u.href:undefined; } catch { return kind==="src"&&raw.startsWith("/")?raw:undefined; } };
export function GeneratedRenderer({schema}:{schema:UISchema}) { return <div className="generated-canvas">{schema.components.map((node,i)=><RenderNode key={i} node={node}/>)}</div>; }
function RenderNode({node}:{node:UIComponent}) {
  const p=node.props??{}, style=sanitizeStyles(p.style), children=node.children?.map((child,i)=><RenderNode node={child} key={i}/>);
  const text=typeof p.text==="string"?p.text.slice(0,1000):"";
  switch(node.type){
    case "section": return <section style={style}>{children}</section>;
    case "container": return <div style={style}>{children}</div>;
    case "navbar": return <nav style={style}>{children}</nav>;
    case "footer": return <footer style={style}>{children}</footer>;
    case "heading": { const level=Math.min(6,Math.max(1,Number(p.level)||2)); const Tag=`h${level}` as ElementType; return <Tag style={style}>{text}{children}</Tag>; }
    case "text": return <span style={style}>{text}{children}</span>;
    case "image": { const src=safeUrl(p.src,"src"); return src?<img style={style} src={src} alt={typeof p.alt==="string"?p.alt:""}/>:null; }
    case "button": { const href=safeUrl(p.href,"href"); return href?<a className="schema-button" style={style} href={href} target="_blank" rel="noreferrer">{text}{children}</a>:<button className="schema-button" style={style} type="button">{text}{children}</button>; }
    case "input": return <input style={style} type={typeof p.inputType==="string"?p.inputType:"text"} placeholder={typeof p.placeholder==="string"?p.placeholder:""} value={typeof p.value==="string"?p.value:""} readOnly aria-label={typeof p.placeholder==="string"?p.placeholder:"Recreated input"}/>;
    case "grid": return <div style={{display:"grid",gridTemplateColumns:`repeat(${Math.min(4,Math.max(1,Number(p.columns)||2))}, minmax(0, 1fr))`,...style}}>{children}</div>;
    case "flex": return <div style={{display:"flex",...style}}>{children}</div>;
    case "card": return <article style={style}>{children}</article>;
    case "spacer": return <div aria-hidden style={{height:"24px",...style}}/>;
  }
}
