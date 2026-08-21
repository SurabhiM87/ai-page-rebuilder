"use client";
import { useEffect, useState } from "react";
import { ArrowRight, Braces, CheckCircle2, Globe2, Layers3, Play, ShieldCheck, Sparkles, type LucideIcon } from "lucide-react";
import type { AnalysisResult } from "@/types";
import { demoResult } from "@/lib/demo/sample";
import { ProcessingStatus } from "./ProcessingStatus";
import { ComparisonView } from "./ComparisonView";

export function RebuilderApp(){
 const [url,setUrl]=useState(""); const [result,setResult]=useState<AnalysisResult|null>(null); const [stage,setStage]=useState(-1); const [error,setError]=useState("");
 const busy=stage>=0;
 async function run(demo=false){setError("");if(!demo&&!url.trim()){setError("Enter a public webpage URL to analyze.");return}setStage(0); if(demo){for(let i=1;i<=6;i++){await wait(260);setStage(i)}setResult(demoResult);setStage(-1);return} let timer:ReturnType<typeof setInterval>|undefined; try { timer=setInterval(()=>setStage(s=>Math.min(5,s+1)),900); const res=await fetch("/api/analyze",{method:"POST",headers:{"content-type":"application/json","accept":"application/json"},body:JSON.stringify({url:url.trim()})}); const contentType=res.headers.get("content-type")??""; if(!contentType.includes("application/json")){const body=await res.text();console.error("[analyze response]",res.status,body.slice(0,500));throw new Error(res.status>=500?"The analysis server encountered an internal error. Restart the development server and try again.":`The server returned an unexpected response (HTTP ${res.status}).`)} const data=await res.json(); if(!res.ok)throw new Error(data.error||"Analysis failed."); setStage(6); await wait(250);setResult(data); }catch(e){setError(e instanceof Error?e.message:"Something went wrong.")}finally{if(timer)clearInterval(timer);setStage(-1)} }
 useEffect(()=>{if(result)window.scrollTo({top:0,behavior:"smooth"})},[result]);
 if(result)return <ComparisonView result={result} onReset={()=>setResult(null)}/>;
 return <main className="home-shell"><div className="ambient ambient-one"/><div className="ambient ambient-two"/><nav className="topbar"><a className="logo" href="#"><span>AR</span> AI Page Rebuilder</a><div><a href="#how">How it works</a><a href="https://github.com" target="_blank" rel="noreferrer">GitHub ↗</a></div></nav>
 <section className="hero"><div className="hero-copy"><div className="badge"><Sparkles size={13}/> BROWSER AUTOMATION × STRUCTURED AI</div><h1>Turn any webpage<br/>into <span>safe React.</span></h1><p>Analyze a public page, understand its visual structure, and rebuild it as reusable components—without executing AI-generated code.</p></div>
 <div className="input-card"><label htmlFor="url">PUBLIC WEBPAGE URL</label><div className="url-row"><Globe2 size={20}/><input id="url" value={url} onChange={e=>setUrl(e.target.value)} placeholder="https://example.com" onKeyDown={e=>{if(e.key==="Enter"&&!busy)run()}}/><button disabled={busy} onClick={()=>run()}>Analyze & Rebuild <ArrowRight size={17}/></button></div><div className="card-foot"><span><ShieldCheck size={14}/> Public HTTP(S) pages only · SSRF protected</span><button className="demo-link" disabled={busy} onClick={()=>run(true)}><Play size={12} fill="currentColor"/> Try the interactive demo</button></div>{error&&<p className="error"><span>!</span>{error}</p>}</div>
 {busy?<ProcessingStatus active={stage}/>:<div className="pipeline" id="how">{pipelineItems.map(({Icon,n,title,description},i)=><div className="pipeline-item" key={title}><div className="pipe-icon"><Icon size={20}/></div><div><span>{n}</span><h3>{title}</h3><p>{description}</p></div>{i<2&&<ArrowRight className="pipe-arrow"/>}</div>)}</div>}
 <footer><span><CheckCircle2 size={14}/> Schema validated</span><span><CheckCircle2 size={14}/> No eval()</span><span><CheckCircle2 size={14}/> Keys stay server-side</span><p>Built for developers who care about craft.</p></footer></section></main>
}
const wait=(ms:number)=>new Promise(r=>setTimeout(r,ms));
const pipelineItems: Array<{Icon:LucideIcon;n:string;title:string;description:string}> = [
 {Icon:Globe2,n:"01",title:"Capture",description:"Load the public page in an isolated browser."},
 {Icon:Layers3,n:"02",title:"Extract",description:"Reduce visible DOM into structured data."},
 {Icon:Braces,n:"03",title:"Rebuild",description:"Generate and validate a safe UI schema."},
];
