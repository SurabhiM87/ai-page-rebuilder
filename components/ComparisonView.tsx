"use client";
/* eslint-disable @next/next/no-img-element -- screenshots are data URLs supplied at runtime */
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ExternalLink, RotateCcw } from "lucide-react";
import type { AnalysisResult } from "@/types";
import { GeneratedRenderer } from "./GeneratedRenderer";
import { SafeDomRenderer } from "./SafeDomRenderer";

type Mode="split"|"original"|"generated"|"editable";
export function ComparisonView({result,onReset}:{result:AnalysisResult;onReset:()=>void}) {
 const [mode,setMode]=useState<Mode>("split");
 return <main className="results-shell"><header className="result-header"><button className="back" onClick={onReset}><ArrowLeft size={16}/> New rebuild</button><div className="result-brand"><span className="brand-mark">AR</span><b>AI Page Rebuilder</b><span className="live-dot">Complete</span></div><a className="source-link" href={result.sourceUrl} target="_blank" rel="noreferrer">View source <ExternalLink size={14}/></a></header>
 <section className="result-top"><div><p className="eyebrow">REBUILD / {result.id.toUpperCase()}</p><h1>{result.pageTitle}</h1><p className="result-url">{result.sourceUrl}</p></div><div className="metrics">{[[result.metrics.analyzed,"Analyzed"],[result.metrics.retained,"Retained"],[`${(result.metrics.processingMs/1000).toFixed(1)}s`,"Processing"],[result.metrics.components,"Components"]].map(([v,l])=><div key={l}><strong>{v}</strong><span>{l}</span></div>)}</div></section>
 {result.warnings?.map(warning=><p className="analysis-warning" key={warning}><b>Embedded content:</b> {warning}</p>)}
 <div className="view-toolbar"><div className="segmented">{(["split",...(result.snapshot?["editable" as const]:[]),"original","generated"] as Mode[]).map(x=><button key={x} className={mode===x?"selected":""} onClick={()=>setMode(x)}>{x==="split"?"Side by side":x==="generated"&&result.screenshot?"Pixel reference":x==="editable"?"Editable DOM":x[0].toUpperCase()+x.slice(1)}</button>)}</div><button className="icon-btn" onClick={()=>setMode("split")} aria-label="Reset view"><RotateCcw size={15}/></button></div>
 <section className={`comparison ${mode}`}>
  {(mode==="split"||mode==="original")&&<Panel label="Original" detail="Captured at 1440 × 900">{result.screenshot?<img className="capture" src={result.screenshot} alt={`Screenshot of ${result.pageTitle}`}/>:<OriginalMock/>}</Panel>}
  {mode==="generated"&&<Panel label={result.screenshot?"Pixel reference":"AI recreation"} detail={result.screenshot?"Visual accuracy target":"Safe React snapshot"}>{result.screenshot?<img className="capture" src={result.screenshot} alt={`Pixel reference for ${result.pageTitle}`}/>:<ScaledGeneratedPreview result={result}/>}</Panel>}
  {(mode==="split"||mode==="editable")&&<Panel label="Editable DOM" detail="Sanitized React reconstruction"><ScaledGeneratedPreview result={result}/></Panel>}
 </section><p className="safe-note"><span/> The rebuild is a manipulable DOM. Raster fallbacks are used only for source regions without accessible DOM.</p></main>;
}
function Panel({label,detail,children}:{label:string;detail:string;children:React.ReactNode}) {return <article className="preview-panel"><div className="panel-bar"><div><i/><i/><i/></div><b>{label}</b><span>{detail}</span></div><div className="panel-content">{children}</div></article>}
function ScaledGeneratedPreview({result}:{result:AnalysisResult}){
 const hostRef=useRef<HTMLDivElement>(null); const [scale,setScale]=useState(1);
 useEffect(()=>{const host=hostRef.current;if(!host)return;const resize=()=>setScale(Math.min(1,host.clientWidth/1440));resize();const observer=new ResizeObserver(resize);observer.observe(host);return()=>observer.disconnect()},[]);
 const documentHeight=Math.max(900,Math.min(12000,result.snapshot?.boundingBox?.height??900));
 return <div className="generated-stage" ref={hostRef} style={{height:documentHeight*scale}}><div className="generated-frame" style={{transform:`scale(${scale})`}}>{result.snapshot?<SafeDomRenderer root={result.snapshot} siteName={result.siteName}/>:<GeneratedRenderer schema={result.schema}/>}</div></div>
}
function OriginalMock(){return <div className="original-mock"><nav><b>NORTHSTAR</b><span>Product　 Method　 <em>Join waitlist</em></span></nav><div className="mock-hero"><small>A QUIETER WAY TO BUILD</small><h2>Ship meaningful work,<br/>without the noise.</h2><p>Northstar brings planning, decisions, and progress into one calm workspace for focused product teams.</p><button>Get early access　→</button></div><div className="mock-cards"><div>01　ALIGN<h3>Decisions stay visible.</h3></div><div>02　FOCUS<h3>Less status. More momentum.</h3></div><div>03　LEARN<h3>Context compounds.</h3></div></div></div>}
