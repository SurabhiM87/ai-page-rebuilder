import type { CSSProperties } from "react";

const ALLOWED = new Set(["boxSizing","display","position","top","right","bottom","left","zIndex","width","height","minWidth","minHeight","maxWidth","maxHeight","margin","marginTop","marginRight","marginBottom","marginLeft","padding","paddingTop","paddingRight","paddingBottom","paddingLeft","gap","rowGap","columnGap","fontFamily","fontSize","fontWeight","fontStyle","lineHeight","letterSpacing","color","background","backgroundColor","backgroundImage","backgroundSize","backgroundPosition","backgroundRepeat","border","borderTop","borderRight","borderBottom","borderLeft","borderRadius","boxShadow","textAlign","textTransform","textDecoration","whiteSpace","wordBreak","verticalAlign","flexDirection","flexWrap","flexGrow","flexShrink","justifyContent","alignItems","alignSelf","gridTemplateColumns","gridTemplateRows","gridColumn","gridRow","overflow","overflowX","overflowY","objectFit","objectPosition","transform","transformOrigin","listStyle","opacity"]);
const DANGEROUS = /(url\s*\(|expression\s*\(|javascript:|@import|behavior\s*:)/i;
export function sanitizeStyles(value: unknown): CSSProperties {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value).filter(([key,v]) => {
    if(!ALLOWED.has(key)||(typeof v!=="string"&&typeof v!=="number"))return false;
    if(key==="backgroundImage")return safeBackgroundImage(String(v));
    return !DANGEROUS.test(String(v));
  }).slice(0,96)) as CSSProperties;
}
function safeBackgroundImage(value:string){if(!value||value==="none")return true;if(/expression|javascript:|@import|behavior\s*:/i.test(value))return false;const urls=Array.from(value.matchAll(/url\(["']?([^"')]+)["']?\)/gi),match=>match[1]);return urls.every(raw=>{try{const url=new URL(raw);return ["http:","https:"].includes(url.protocol)}catch{return raw.startsWith("/")}})}
