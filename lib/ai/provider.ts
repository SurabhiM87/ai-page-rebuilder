import { parseNormalizedUISchema } from "./schemas/uiSchema";
import { SYSTEM_PROMPT, pageAnalysisPrompt } from "./prompts/pageAnalysis";
import type { PageModel, UISchema } from "@/types";

export interface AIProvider { generate(model:PageModel,screenshot?:string):Promise<UISchema> }
export class OpenAICompatibleProvider implements AIProvider {
  async generate(page:PageModel,screenshot?:string):Promise<UISchema> {
    if(!process.env.AI_API_KEY) throw new Error("AI_API_KEY is not configured. Try Demo, or add a provider key.");
    const base=(process.env.AI_BASE_URL||"https://api.openai.com/v1").replace(/\/$/,"");
    const userContent=screenshot
      ? [{type:"text",text:pageAnalysisPrompt(page)},{type:"image_url",image_url:{url:screenshot,detail:"high"}}]
      : pageAnalysisPrompt(page);
    const response=await fetch(`${base}/chat/completions`,{method:"POST",headers:{authorization:`Bearer ${process.env.AI_API_KEY}`,"content-type":"application/json"},body:JSON.stringify({model:process.env.AI_MODEL||"gpt-4o-mini",temperature:0.1,response_format:{type:"json_object"},messages:[{role:"system",content:SYSTEM_PROMPT},{role:"user",content:userContent}]}),signal:AbortSignal.timeout(60_000)});
    if(!response.ok)throw new Error(`AI provider request failed with HTTP ${response.status}.`);
    const payload=await response.json() as {choices?:Array<{message?:{content?:string}}>};
    const content=payload.choices?.[0]?.message?.content; if(!content)throw new Error("AI provider returned an empty response.");
    let parsed:unknown; try{parsed=JSON.parse(content)}catch{throw new Error("AI provider returned malformed JSON.")}
    return parseNormalizedUISchema(parsed) as UISchema;
  }
}
export function getAIProvider():AIProvider { return new OpenAICompatibleProvider(); }
