import type { ExtractedNode, PageModel, UIComponent, UISchema } from "@/types";
import { countComponents } from "@/lib/ai/schemas/uiSchema";

const headingTags=new Set(["h1","h2","h3","h4","h5","h6"]);
const containerTags=new Set(["div","main","article","header","aside","ul","ol","li","form","figure","figcaption"]);

export function pageModelToSchema(model:PageModel):UISchema{
  const context={siteName:model.page.siteName};
  const components=model.sections.flatMap(section=>section.content.map(node=>toComponent(node,false,context)).filter(Boolean) as UIComponent[]);
  const firstStyle=components[0]?.props?.style;if(firstStyle&&typeof firstStyle==="object"&&!Array.isArray(firstStyle)&&(firstStyle as Record<string,unknown>).position==="static")(firstStyle as Record<string,unknown>).position="relative";
  return {name:model.page.title||"Rebuilt page",components:components.length?components:[{type:"section",props:{style:{minHeight:`${model.page.viewport.height}px`,backgroundColor:"#ffffff"}}}]};
}

function toComponent(node:ExtractedNode,inNavbar=false,context:{siteName?:string}={}):UIComponent|null{
  const tag=node.tag.toLowerCase();
  const children=(node.children??[]).map(child=>toComponent(child,inNavbar||tag==="nav",context)).filter(Boolean) as UIComponent[];
  const attrs=node.attributes??{}; const directText=tag==="span"?node.text:node.text?.trim(); const largeTopSvg=tag==="svg"&&Boolean(node.boundingBox&&node.boundingBox.y<250&&node.boundingBox.width>=80&&node.boundingBox.height>=20); const text=directText||(tag==="svg"?(attrs["aria-label"]?.trim()||(largeTopSvg?mastheadLabel(context.siteName):undefined)):undefined); const style=normalizeFontFallback(node.styles??{},tag,node.boundingBox?.height);
  if(largeTopSvg&&text&&node.boundingBox){style.position="absolute";style.left=`${node.boundingBox.x}px`;style.top=`${node.boundingBox.y}px`;style.width=`${node.boundingBox.width}px`;style.height=`${node.boundingBox.height}px`;style.display="block";style.zIndex="2"}
  let type:UIComponent["type"];
  if(tag==="nav")type="navbar";
  else if(tag==="footer")type="footer";
  else if(headingTags.has(tag))type="heading";
  else if(tag==="img")type="image";
  else if(tag==="input"||tag==="textarea"||tag==="select")type="input";
  else if(tag==="svg"&&text)type="text";
  else if(tag==="button"||tag==="a")type="button";
  else if(tag==="section")type="section";
  else if(tag==="p"||tag==="span"||tag==="label"||tag==="small"||tag==="strong"||tag==="em"||tag==="time")type="text";
  else if(style.display?.includes("grid"))type="grid";
  else if(style.display?.includes("flex"))type="flex";
  else if(containerTags.has(tag)||children.length)type="container";
  else if(text)type="text";
  else return null;

  const props:Record<string,unknown>={style};
  if(type==="heading"){props.text=text??"";props.level=Number(tag.slice(1))||2}
  else if(type==="text"||type==="button")props.text=text??"";
  if(type==="image"){props.src=attrs.src;props.alt=attrs.alt??""}
  if(type==="input"){props.placeholder=attrs.placeholder??attrs["aria-label"]??"";props.value=attrs.value??"";props.inputType=attrs.type??"text"}
  if(type==="button"&&attrs.href)props.href=attrs.href;
  if(type==="grid")props.columns=inferColumns(style.gridTemplateColumns);
  if(type==="button"&&inNavbar&&(node.children??[]).some(child=>child.tag.toLowerCase()==="svg")){
    const label=attrs["aria-label"]??"";const icon=/search/i.test(label)?"⌕":/close/i.test(label)?"×":"⌄";
    children.push({type:"text",props:{text:icon,style:{display:"inline",margin:"0 0 0 4px",fontSize:"0.85em",color:"inherit"}}});
  }

  // Direct text belongs before nested element children in the rendered DOM.
  if(text&&!["heading","text","button","image"].includes(type))children.unshift({type:"text",props:{text,style:pickInheritedTextStyles(style)}});
  return {type,props,children:children.length?children:undefined};
}

function inferColumns(value?:string){if(!value)return 2;const matches=value.match(/(?:px|fr|%)\s*/g);return Math.max(1,Math.min(4,matches?.length??2))}
function pickInheritedTextStyles(style:Record<string,string>){return Object.fromEntries(Object.entries(style).filter(([key])=>["fontFamily","fontSize","fontWeight","lineHeight","letterSpacing","color","textAlign"].includes(key)))}
function normalizeFontFallback(input:Record<string,string>,tag:string,boxHeight?:number){const style={...input};const family=style.fontFamily;if(headingTags.has(tag)&&family&&/(ivar|didot|bodoni|editorial|display)/i.test(family))style.fontFamily='Didot, "Bodoni 72", "Bodoni MT", Georgia, serif';else if(family&&!/(serif|sans-serif|monospace|system-ui)/i.test(family))style.fontFamily=`${family}, ${headingTags.has(tag)||tag==="svg"?'Didot, "Bodoni 72", Georgia, serif':"Arial, sans-serif"}`;if(tag==="svg"&&boxHeight){style.fontFamily='Didot, "Bodoni 72", Georgia, serif';style.fontSize=`${Math.max(18,Math.round(boxHeight*.82))}px`;style.lineHeight="1";style.textAlign="center"}return style}
function mastheadLabel(siteName?:string){if(!siteName)return undefined;const emphasized=siteName.split(/\s+/).filter(word=>word.length>=3&&word===word.toUpperCase()).sort((a,b)=>b.length-a.length)[0];return emphasized??siteName}

export function preservesBaseline(candidate:UISchema,baseline:UISchema):boolean{
  const baselineContent=collectContent(baseline.components),candidateContent=collectContent(candidate.components);
  const textCoverage=baselineContent.text.size?Array.from(baselineContent.text).filter(x=>candidateContent.text.has(x)).length/baselineContent.text.size:1;
  return textCoverage>=0.9&&candidateContent.images>=baselineContent.images&&countComponents(candidate.components)>=Math.min(40,countComponents(baseline.components)*0.55);
}
function collectContent(nodes:UIComponent[]){const text=new Set<string>();let images=0;const walk=(node:UIComponent)=>{const value=node.props?.text;if(typeof value==="string"&&value.trim())text.add(value.trim());if(node.type==="image")images++;node.children?.forEach(walk)};nodes.forEach(walk);return{text,images}}
