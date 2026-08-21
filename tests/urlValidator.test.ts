import { describe,expect,it } from "vitest";
import { isPrivateAddress } from "@/lib/security/urlValidator";
describe("isPrivateAddress",()=>{it.each(["127.0.0.1","10.2.3.4","172.16.0.1","172.31.255.1","192.168.1.2","169.254.2.3","0.0.0.0","::1","fc00::1","fe80::1"])("blocks %s",ip=>expect(isPrivateAddress(ip)).toBe(true));it.each(["1.1.1.1","8.8.8.8","172.32.0.1","93.184.216.34","2606:4700:4700::1111"])("allows %s",ip=>expect(isPrivateAddress(ip)).toBe(false));});
