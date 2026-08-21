import { promises as dns } from "node:dns";
import { isIP } from "node:net";

const BLOCKED_HOSTS = /(^|\.)(localhost|local|internal|home|lan)$/i;
function isPrivateV4(ip:string) { const p=ip.split(".").map(Number); return p[0]===10 || p[0]===127 || p[0]===0 || (p[0]===169&&p[1]===254) || (p[0]===172&&p[1]>=16&&p[1]<=31) || (p[0]===192&&p[1]===168) || (p[0]===100&&p[1]>=64&&p[1]<=127) || p[0]>=224; }
function isPrivateV6(ip:string) { const x=ip.toLowerCase(); return x==="::1" || x==="::" || x.startsWith("fc") || x.startsWith("fd") || x.startsWith("fe8") || x.startsWith("fe9") || x.startsWith("fea") || x.startsWith("feb") || x.startsWith("::ffff:127.") || x.startsWith("::ffff:10.") || x.startsWith("::ffff:192.168."); }
export function isPrivateAddress(ip:string) { return isIP(ip) === 4 ? isPrivateV4(ip) : isIP(ip) === 6 ? isPrivateV6(ip) : true; }
export async function validatePublicUrl(raw:string): Promise<URL> {
  let url: URL; try { url = new URL(raw); } catch { throw new Error("Enter a valid, complete URL."); }
  if (!["http:","https:"].includes(url.protocol)) throw new Error("Only HTTP and HTTPS URLs are supported.");
  if (url.username || url.password) throw new Error("URLs containing credentials are not supported.");
  if (BLOCKED_HOSTS.test(url.hostname) || url.hostname.endsWith(".localhost")) throw new Error("Local and internal hosts are not allowed.");
  if (isIP(url.hostname) && isPrivateAddress(url.hostname)) throw new Error("Private and reserved network addresses are not allowed.");
  let addresses; try { addresses = await dns.lookup(url.hostname,{all:true,verbatim:true}); } catch { throw new Error("The hostname could not be resolved."); }
  if (!addresses.length || addresses.some(a=>isPrivateAddress(a.address))) throw new Error("The URL resolves to a private or reserved network address.");
  return url;
}
