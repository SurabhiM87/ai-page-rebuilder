import { NextResponse } from "next/server";
import { analyzePage } from "@/lib/browser/pageAnalyzer";
import { getAIProvider } from "@/lib/ai/provider";
import { countComponents, parseUISchema } from "@/lib/ai/schemas/uiSchema";
import { ZodError } from "zod";
import { pageModelToSchema, preservesBaseline } from "@/lib/renderer/domToSchema";
import type { UISchema } from "@/types";

export const runtime="nodejs";
export async function POST(request:Request){
 const started=Date.now();
 try{
  const body=await request.json(); if(!body||typeof body.url!=="string"||body.url.length>2048)return NextResponse.json({error:"Enter a valid URL under 2,048 characters."},{status:400});
  const analyzed=await analyzePage(body.url); const baseline=pageModelToSchema(analyzed.model);
  let schema=baseline;
  if(process.env.AI_REFINEMENT_ENABLED==="true"){
   const refined=parseUISchema(await getAIProvider().generate(analyzed.model,analyzed.screenshot)) as UISchema;
   if(preservesBaseline(refined,baseline))schema=refined;
  }
  return NextResponse.json({id:crypto.randomUUID().slice(0,8),sourceUrl:analyzed.model.page.url,pageTitle:analyzed.model.page.title,siteName:analyzed.model.page.siteName,screenshot:analyzed.screenshot,snapshot:analyzed.model.sections[0]?.content[0],warnings:analyzed.warnings,schema,metrics:{...analyzed.stats,processingMs:Date.now()-started,components:countComponents(schema.components as Array<{children?:unknown[]}>)} });
 }catch(error){
  console.error("[analyze]",error);
  const message=error instanceof Error?error.message:"The page could not be analyzed.";
  const clientSafe=error instanceof ZodError
   ? "The AI returned an unsupported page structure. Please retry; model responses can vary."
   : /^(Enter|Only|Local|Private|The |AI_API_KEY|AI provider|URLs)/.test(message)
    ? message
    : "Analysis failed. The page may block automated access or be unavailable.";
  return NextResponse.json({error:clientSafe},{status:400});
 }
}
