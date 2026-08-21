import type { ExtractedNode } from "@/types";

const BLOCKED_TAGS = new Set(["script","style","noscript","template","iframe","object","embed","meta","link"]);
const STYLE_KEYS = new Set(["boxSizing","display","position","top","right","bottom","left","zIndex","width","height","minWidth","minHeight","maxWidth","maxHeight","margin","marginTop","marginRight","marginBottom","marginLeft","padding","paddingTop","paddingRight","paddingBottom","paddingLeft","gap","rowGap","columnGap","fontFamily","fontSize","fontWeight","fontStyle","lineHeight","letterSpacing","color","background","backgroundColor","backgroundImage","backgroundSize","backgroundPosition","backgroundRepeat","border","borderTop","borderRight","borderBottom","borderLeft","borderRadius","boxShadow","textAlign","textTransform","textDecoration","whiteSpace","wordBreak","verticalAlign","flexDirection","flexWrap","flexGrow","flexShrink","justifyContent","alignItems","alignSelf","gridTemplateColumns","gridTemplateRows","gridColumn","gridRow","overflow","overflowX","overflowY","objectFit","objectPosition","transform","transformOrigin","listStyle","opacity"]);
export type SanitizeStats = { analyzed:number; retained:number };
export function sanitizeDom(root: ExtractedNode, limits={maxNodes:2500,maxDepth:20,maxText:400}): {root:ExtractedNode;stats:SanitizeStats} {
  let analyzed=0,retained=0;
  const walk=(node:ExtractedNode,depth:number): ExtractedNode|null => {
    const tag=node.tag.toLowerCase();
    const capturedEmbedded=(tag==="iframe"||tag==="canvas"||tag==="svg")&&Boolean(node.attributes?.["data-rebuilder-capture"]);
    analyzed++; if (retained>=limits.maxNodes || depth>limits.maxDepth || (BLOCKED_TAGS.has(tag)&&!capturedEmbedded)) return null;
    if (node.styles?.display==="none" || node.styles?.opacity==="0" || (node.boundingBox && (node.boundingBox.width<=0 || node.boundingBox.height<=0))) return null;
    retained++;
    const attributes = Object.fromEntries(Object.entries(node.attributes??{}).filter(([k,v])=>["href","src","srcset","sizes","poster","alt","aria-label","type","placeholder","value","data-rebuilder-capture"].includes(k)&&v.length<2000&&!/^javascript:/i.test(v)));
    const styles = Object.fromEntries(Object.entries(node.styles??{}).filter(([k,v])=>STYLE_KEYS.has(k)&&v.length<200));
    const children=(node.children??[]).map(n=>walk(n,depth+1)).filter(Boolean) as ExtractedNode[];
    const flowContainer=children.length>0&&!["absolute","fixed"].includes(styles.position??"static")&&!['img','video','canvas','iframe'].includes(tag);
    if(flowContainer){delete styles.height;delete styles.minHeight;delete styles.maxHeight}
    const normalizedText=node.text?.replace(/\s+/g," "); const preservedText=node.tag.toLowerCase()==="span"?normalizedText:normalizedText?.trim();
    return {tag:node.tag.toLowerCase(),...(preservedText?.trim()?{text:preservedText.slice(0,limits.maxText)}:{}),...(node.role?{role:node.role}:{}),...(Object.keys(attributes).length?{attributes}:{}),...(Object.keys(styles).length?{styles}:{}),...(node.boundingBox?{boundingBox:node.boundingBox}:{}),...(children.length?{children}:{})};
  };
  return {root:walk(root,0)??{tag:"body"},stats:{analyzed,retained}};
}
