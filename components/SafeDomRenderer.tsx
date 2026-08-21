import { createElement, type ReactNode } from "react";
import type { ExtractedNode } from "@/types";
import { sanitizeStyles } from "@/lib/renderer/styleSanitizer";

const tags=new Set(["div","span","header","nav","main","section","article","aside","footer","h1","h2","h3","h4","h5","h6","p","a","button","img","picture","source","input","textarea","form","label","ul","ol","li","figure","figcaption","time","small","strong","em","b","i","hr","br","table","thead","tbody","tr","th","td"]);
const voidTags=new Set(["img","source","input","hr","br"]);
function safeUrl(value?:string,allowDataImage=false){if(!value)return undefined;if(allowDataImage&&/^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(value))return value;try{const url=new URL(value);return ["http:","https:"].includes(url.protocol)?url.href:undefined}catch{return value.startsWith("/")?value:undefined}}
function safeSrcSet(value?:string){if(!value)return undefined;const entries=value.split(",").map(part=>part.trim()).filter(Boolean);return entries.every(entry=>safeUrl(entry.split(/\s+/)[0]))?entries.join(", "):undefined}

export function SafeDomRenderer({root,siteName}:{root:ExtractedNode;siteName?:string}){return <div className="safe-dom-canvas" style={{width:1440,minHeight:Math.max(900,Math.min(12000,root.boundingBox?.height??900))}}><SnapshotNode node={root} siteName={siteName}/></div>}
function SnapshotNode({node,siteName}:{node:ExtractedNode;siteName?:string}):ReactNode{
 const tag=node.tag.toLowerCase();const attrs=node.attributes??{};const style=sanitizeStyles(node.styles);const children=node.children?.map((child,index)=><SnapshotNode node={child} siteName={siteName} key={index}/>);
 if(tag==="svg"){const largeTop=Boolean(node.boundingBox&&node.boundingBox.y<250&&node.boundingBox.width>=80&&node.boundingBox.height>=20);const label=attrs["aria-label"]||(largeTop?mastheadLabel(siteName):undefined);if(!label)return null;return <span style={style}>{label}</span>}
 const safeTag=tags.has(tag)?tag:"div";const props:Record<string,unknown>={style};
 if(safeTag==="a"){props.href=safeUrl(attrs.href);props.target="_blank";props.rel="noreferrer"}
 if(safeTag==="img"){props.src=safeUrl(attrs.src,true);props.alt=attrs.alt??"";props.referrerPolicy="no-referrer";if(!props.src)return null}
 if(safeTag==="source"){props.src=safeUrl(attrs.src);props.srcSet=safeSrcSet(attrs.srcset);props.sizes=attrs.sizes;if(!props.src&&!props.srcSet)return null}
 if(safeTag==="input"){props.type=["text","search","email","number","tel","url","button","submit"].includes(attrs.type)?attrs.type:"text";props.placeholder=attrs.placeholder;props.value=attrs.value??"";props.readOnly=true}
 if(safeTag==="textarea"){props.value=attrs.value??"";props.readOnly=true}
 if(safeTag==="button")props.type="button";
 if(attrs["aria-label"])props["aria-label"]=attrs["aria-label"];
 const content:ReactNode[]=voidTags.has(safeTag)?[]:[node.text,children].flat().filter(value=>value!==undefined&&value!==null&&value!=="") as ReactNode[];
 return createElement(safeTag,props,...content);
}
function mastheadLabel(siteName?:string){if(!siteName)return undefined;return siteName.split(/\s+/).filter(word=>word.length>=3&&word===word.toUpperCase()).sort((a,b)=>b.length-a.length)[0]??siteName}
