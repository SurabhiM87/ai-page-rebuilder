import puppeteer, { type Browser } from "puppeteer";
import type { ExtractedNode, PageModel } from "@/types";
import { sanitizeDom } from "./sanitizer";
import { validatePublicUrl } from "@/lib/security/urlValidator";

const NAVIGATION_TIMEOUT = 25_000;
const MAX_RESPONSE_BYTES = 8 * 1024 * 1024;

export async function analyzePage(rawUrl:string) {
  const initial = await validatePublicUrl(rawUrl);
  let browser: Browser|undefined;
  try {
    browser = await puppeteer.launch({headless:true, executablePath:process.env.PUPPETEER_EXECUTABLE_PATH || undefined, args:["--no-sandbox","--disable-setuid-sandbox"]});
    const page = await browser.newPage();
    await page.setViewport({width:1440,height:900,deviceScaleFactor:1});
    await page.setJavaScriptEnabled(true);
    let redirects=0;
    page.on("request",req=>{ if(req.isNavigationRequest() && req.redirectChain().length>redirects) redirects=req.redirectChain().length; });
    const response = await page.goto(initial.href,{waitUntil:"domcontentloaded",timeout:NAVIGATION_TIMEOUT});
    if (!response?.ok()) throw new Error(`The page returned HTTP ${response?.status() ?? "unknown"}.`);
    if (redirects>5) throw new Error("The page redirected too many times.");
    await validatePublicUrl(page.url());
    const size=Number(response.headers()["content-length"]||0); if(size>MAX_RESPONSE_BYTES) throw new Error("The page is too large to analyze safely.");
    await new Promise(resolve=>setTimeout(resolve,900));
    await revealLazyContent(page);
    await dismissKnownConsentBanner(page);
    await removeAdvertising(page);
    const visibleIframeCount=await page.$$eval("iframe",frames=>frames.filter(frame=>{const rect=frame.getBoundingClientRect(),style=getComputedStyle(frame);return rect.width>20&&rect.height>20&&style.display!=="none"&&style.visibility!=="hidden"}).length);
    const embeddedCaptures=await captureEmbeddedVisuals(page);
    const screenshot = await page.screenshot({type:"jpeg",quality:78,fullPage:false,encoding:"base64"});
    const extracted = await page.evaluate(() => {
      const styleKeys=["boxSizing","display","position","top","right","bottom","left","zIndex","width","height","minWidth","minHeight","maxWidth","maxHeight","margin","marginTop","marginRight","marginBottom","marginLeft","padding","paddingTop","paddingRight","paddingBottom","paddingLeft","gap","rowGap","columnGap","fontFamily","fontSize","fontWeight","fontStyle","lineHeight","letterSpacing","color","background","backgroundColor","backgroundImage","backgroundSize","backgroundPosition","backgroundRepeat","border","borderTop","borderRight","borderBottom","borderLeft","borderRadius","boxShadow","textAlign","textTransform","textDecoration","whiteSpace","wordBreak","verticalAlign","flexDirection","flexWrap","flexGrow","flexShrink","justifyContent","alignItems","alignSelf","gridTemplateColumns","gridTemplateRows","gridColumn","gridRow","overflow","overflowX","overflowY","objectFit","objectPosition","transform","transformOrigin","listStyle","opacity"] as const;
      let seen=0;
      const walk=(el:Element,depth=0): unknown => {
        if(seen++>1500||depth>16) return null;
        const cs=getComputedStyle(el), rect=el.getBoundingClientRect();
        const outsideCapture=rect.bottom < -20 || rect.top > 12_000;
        const structuralWrapper=cs.display==="contents";
        const visuallyClipped=!structuralWrapper&&((rect.width<=2&&rect.height<=2)||(cs.clip!=="auto"&&cs.clip!=="")||cs.clipPath==="inset(50%)");
        if(cs.display==="none"||cs.visibility==="hidden"||Number(cs.opacity)===0||(!structuralWrapper&&(rect.width===0||rect.height===0))||outsideCapture||visuallyClipped) return null;
        const attrs:Record<string,string>={}; for(const k of ["href","src","srcset","sizes","poster","alt","aria-label","type","placeholder","value","data-rebuilder-capture"]) { const raw=el.getAttribute(k); const v=k==="href"&&el instanceof HTMLAnchorElement?el.href:k==="src"&&el instanceof HTMLImageElement?el.currentSrc||el.src:raw; if(v) attrs[k]=v.slice(0,2000); }
        const styles:Record<string,string>={}; for(const k of styleKeys) styles[k]=cs[k];
        const rawDirectText=Array.from(el.childNodes).filter(n=>n.nodeType===Node.TEXT_NODE).map(n=>n.textContent?.trim()).filter(Boolean).join(" ");
        const pseudoText=(pseudo:"::before"|"::after")=>{const value=getComputedStyle(el,pseudo).content;if(!value||value==="none"||value==="normal"||value.startsWith("url("))return "";return value.replace(/^["']|["']$/g,"").replace(/\\A/g," ").trim()};
        const beforeValue=pseudoText("::before"),afterValue=pseudoText("::after");
        const leafPseudo=el.children.length===0&&!(el instanceof HTMLInputElement)&&!(el instanceof HTMLTextAreaElement);
        const punctuation=/^[>›•·|]$/;
        const before=leafPseudo||punctuation.test(beforeValue)?beforeValue:"",after=leafPseudo||punctuation.test(afterValue)?afterValue:"";
        const textStyles={display:"inline",position:"static",width:"auto",height:"auto",margin:"0px",padding:"0px",fontFamily:cs.fontFamily,fontSize:cs.fontSize,fontWeight:cs.fontWeight,lineHeight:cs.lineHeight,letterSpacing:cs.letterSpacing,color:cs.color,textAlign:cs.textAlign};
        const textNode=(text:string,node?:Node)=>{let textRect=rect;if(node){const range=document.createRange();range.selectNodeContents(node);textRect=range.getBoundingClientRect()}return {tag:"span",text:text.slice(0,500),styles:textStyles,boundingBox:{x:Math.round(textRect.x),y:Math.round(textRect.y),width:Math.round(textRect.width),height:Math.round(textRect.height)}}};
        const childNodes=el.shadowRoot?Array.from(el.shadowRoot.childNodes):Array.from(el.childNodes);
        const hasElementChildren=childNodes.some(node=>node.nodeType===Node.ELEMENT_NODE);
        const children=hasElementChildren?childNodes.map(node=>node.nodeType===Node.ELEMENT_NODE?walk(node as Element,depth+1):node.nodeType===Node.TEXT_NODE&&node.textContent?.trim()?textNode(node.textContent.replace(/\s+/g," "),node):null).filter(Boolean):[];
        if(hasElementChildren&&before)children.unshift(textNode(punctuation.test(before)?` ${before} `:before));if(hasElementChildren&&after)children.push(textNode(punctuation.test(after)?` ${after} `:after));
        const visibleText=hasElementChildren?"":[before,rawDirectText,after].filter(Boolean).join(" ").slice(0,500);
        const boundingBox=structuralWrapper?undefined:{x:Math.round(rect.x),y:Math.round(rect.y),width:Math.round(rect.width),height:Math.round(rect.height)};
        return {tag:el.tagName.toLowerCase(),text:visibleText||undefined,role:el.getAttribute("role")||undefined,attributes:attrs,styles,boundingBox,children};
      };
      const siteName=(document.querySelector('meta[property="og:site_name"]') as HTMLMetaElement|null)?.content||(document.querySelector('meta[name="application-name"]') as HTMLMetaElement|null)?.content;
      return {title:document.title,siteName,root:walk(document.body),url:location.href,sourceTextLength:(document.body.innerText??"").replace(/\s+/g," ").trim().length};
    }) as {title:string;siteName?:string;root:ExtractedNode;url:string;sourceTextLength:number};
    const sanitized=sanitizeDom(extracted.root);
    applyEmbeddedCaptures(sanitized.root,embeddedCaptures);
    const model:PageModel={page:{title:extracted.title||initial.hostname,siteName:extracted.siteName,url:extracted.url,viewport:{width:1440,height:900}},sections:[{id:"section-1",type:"page",layout:inferLayout(sanitized.root),content:[sanitized.root]}]};
    const warnings=visibleIframeCount?[`${visibleIframeCount} embedded iframe region${visibleIframeCount===1?" was":"s were"} captured as an image because its internal DOM is isolated and cannot be safely rebuilt.`]:[];
    const retainedTextLength=countExtractedText(sanitized.root);
    if(extracted.sourceTextLength>500&&retainedTextLength/extracted.sourceTextLength<0.5)warnings.push("Some source content could not be represented in the editable DOM. Check the pixel reference for omitted or browser-isolated regions.");
    return {model,stats:sanitized.stats,screenshot:`data:image/jpeg;base64,${screenshot}`,warnings};
  } finally { await browser?.close(); }
}

async function revealLazyContent(page:import("puppeteer").Page){
  await page.evaluate(async()=>{
    const limit=Math.min(document.documentElement.scrollHeight,12_000);
    for(let y=0;y<limit;y+=700){window.scrollTo(0,y);await new Promise(resolve=>setTimeout(resolve,70))}
    window.scrollTo(0,0);
  });
  await new Promise(resolve=>setTimeout(resolve,350));
}

function inferLayout(node:ExtractedNode) { if(node.styles?.display?.includes("grid"))return "grid"; if(node.styles?.display?.includes("flex"))return node.styles.flexDirection==="column"?"vertical":"horizontal"; return "flow"; }
function countExtractedText(node:ExtractedNode):number{return (node.text?.length??0)+(node.children??[]).reduce((total,child)=>total+countExtractedText(child),0)}

async function dismissKnownConsentBanner(page:import("puppeteer").Page){
  const selectors=[
    "#onetrust-accept-btn-handler",
    "#onetrust-close-btn-container button",
    ".onetrust-close-btn-handler",
    "#onetrust-banner-sdk button[aria-label*='Close']",
    "button[id*='accept'][id*='cookie']",
    "button[data-testid*='accept'][data-testid*='cookie']",
    "button[aria-label*='Accept All']",
    "button[title*='Accept All']",
  ];
  for(const selector of selectors){
    const button=await page.$(selector); if(!button)continue;
    const visible=await button.isVisible().catch(()=>false); if(!visible)continue;
    await button.click().catch(()=>undefined);
    await new Promise(resolve=>setTimeout(resolve,450));
    return;
  }
  await page.evaluate(()=>{
    const phrases=/cookie|privacy notice|consent|technologies that provide information/i;
    for(const element of Array.from(document.querySelectorAll("body *"))){
      const text=(element.textContent??"").trim();if(text.length<25||text.length>2500||!phrases.test(text))continue;
      let current:Element|null=element;
      while(current&&current!==document.body){const style=getComputedStyle(current);if(style.position==="fixed"||style.position==="sticky"){current.remove();return}current=current.parentElement}
    }
  });
}

async function removeAdvertising(page:import("puppeteer").Page){
  await page.evaluate(()=>{
    const selectors=[
      "ins.adsbygoogle","iframe[src*='doubleclick']","iframe[src*='googlesyndication']",
      "[data-ad-container]","[data-ad-unit]","[data-ad-slot]","[data-google-query-id]",
      "[id^='ad-']","[id^='ad_']","[id^='dfp-']","[id*='advertisement']",
      ".ad-container",".ad-wrapper",".ad-slot",".advertisement",".advertisement-container",
      "[class~='ad-unit']","[class~='ad-zone']","[class~='ad-banner']",
    ];
    const collapseCandidates=new Set<Element>();
    document.querySelectorAll(selectors.join(",")).forEach(element=>{let parent=element.parentElement;for(let i=0;i<3&&parent&&parent!==document.body;i++,parent=parent.parentElement)collapseCandidates.add(parent);element.remove()});
    const label=/^(advertisement|advertiser content|sponsored advertisement)$/i;
    for(const element of Array.from(document.querySelectorAll("body *"))){
      const pseudo=(where:"::before"|"::after")=>getComputedStyle(element,where).content.replace(/^['"]|['"]$/g,"");
      const marker=[element.textContent,element.getAttribute("aria-label"),element.getAttribute("data-label"),pseudo("::before"),pseudo("::after")].filter(Boolean).join(" ").trim();
      if(!label.test(marker))continue;
      let target:Element=element;let parent=element.parentElement;
      while(parent&&parent!==document.body){const text=(parent.textContent??"").trim();const rect=parent.getBoundingClientRect();if(text.length>120||rect.height>700)break;target=parent;parent=parent.parentElement}
      const html=target as HTMLElement;html.style.setProperty("display","none","important");html.style.setProperty("height","0","important");html.style.setProperty("min-height","0","important");html.style.setProperty("margin","0","important");html.style.setProperty("padding","0","important");
    }
    for(const element of collapseCandidates){
      if(!element.isConnected)continue;
      const meaningful=element.querySelector("img,video,article,main,h1,h2,h3,button,input")||((element.textContent??"").trim().length>30);
      if(!meaningful){const html=element as HTMLElement;html.style.setProperty("display","none","important");html.style.setProperty("min-height","0","important");html.style.setProperty("height","0","important");html.style.setProperty("margin","0","important");html.style.setProperty("padding","0","important")}
    }
  });
  await new Promise(resolve=>setTimeout(resolve,250));
}

async function captureEmbeddedVisuals(page:import("puppeteer").Page){
  const captures:Record<string,string>={};const handles=await page.$$("iframe,canvas,svg");
  for(let index=0;index<Math.min(handles.length,20);index++){
    const handle=handles[index];const target=await handle.evaluateHandle(element=>{if(element.tagName.toLowerCase()!=="svg")return element;const link=element.closest("a");if(!link)return element;const rect=link.getBoundingClientRect();return rect.width<=100&&rect.height<=100?link:element});
    const elementTarget=target.asElement();if(!elementTarget){await target.dispose();continue}const box=await elementTarget.boundingBox();if(!box||box.width<12||box.height<12||box.y>900||box.x>1440||box.y+box.height<0||box.x+box.width<0){await target.dispose();continue}
    const id=`embedded-${index}`;await elementTarget.evaluate((element,captureId)=>(element as Element).setAttribute("data-rebuilder-capture",captureId),id);
    const clip={x:Math.max(0,box.x),y:Math.max(0,box.y),width:Math.min(1440,box.x+box.width)-Math.max(0,box.x),height:Math.min(900,box.y+box.height)-Math.max(0,box.y)};
    if(clip.width<=0||clip.height<=0){await target.dispose();continue}const image=await page.screenshot({type:"png",encoding:"base64",clip});captures[id]=`data:image/png;base64,${image}`;await target.dispose();
  }
  return captures;
}
function applyEmbeddedCaptures(node:ExtractedNode,captures:Record<string,string>){const id=node.attributes?.["data-rebuilder-capture"];if(id&&captures[id]){node.tag="img";node.attributes={src:captures[id],alt:"Captured embedded page region"};node.children=undefined}node.children?.forEach(child=>applyEmbeddedCaptures(child,captures))}
