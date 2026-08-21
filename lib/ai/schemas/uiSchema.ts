import { z } from "zod";

const componentTypes = ["section","container","navbar","footer","heading","text","image","button","input","card","grid","flex","spacer"] as const;
export const uiComponentSchema: z.ZodType<unknown> = z.lazy(() => z.object({
  type: z.enum(componentTypes),
  props: z.record(z.unknown()).optional(),
  children: z.array(uiComponentSchema).max(100).optional(),
}).strict());
export const uiSchema = z.object({ name: z.string().min(1).max(120), components: z.array(uiComponentSchema).min(1).max(100) }).strict();
export function parseUISchema(input: unknown) { return uiSchema.parse(input); }
const aliases: Record<string,string> = {
  header:"section", main:"section", article:"section", hero:"section", content:"container",
  div:"container", wrapper:"container", group:"container", box:"container", layout:"container", stack:"flex", row:"flex", column:"flex", imagecontainer:"container",
  list:"container",
  listitem:"container", "list-item":"container", ul:"container", ol:"container", li:"container",
  nav:"navbar", navigation:"navbar", menu:"flex", menuitem:"text", paragraph:"text", p:"text", span:"text", label:"text", caption:"text", small:"text", strong:"text", em:"text", logo:"text",
  h1:"heading", h2:"heading", h3:"heading", h4:"heading", h5:"heading", h6:"heading",
  link:"button", cta:"button", divider:"spacer", separator:"spacer",
};
const approvedTypes = new Set(componentTypes);
const dangerousTypes = new Set(["script","style","iframe","object","embed","template","canvas","html","javascript","code"]);
const approvedProps = new Set(["text","src","alt","href","level","columns","style","placeholder","value","inputType"]);
export function normalizeUIResponse(input:unknown): unknown {
  if(!input || typeof input!=="object" || Array.isArray(input))return input;
  const root=input as Record<string,unknown>;
  const normalizeNode=(value:unknown):unknown=>{
    if(!value || typeof value!=="object" || Array.isArray(value))return value;
    const node=value as Record<string,unknown>; const suppliedType=typeof node.type==="string"?node.type:typeof node.component==="string"?node.component:"container"; const rawType=suppliedType.toLowerCase().replace(/\s+/g,"");
    const candidate=aliases[rawType]??rawType; const type=dangerousTypes.has(candidate)?candidate:approvedTypes.has(candidate as typeof componentTypes[number])?candidate:"container";
    const props=node.props&&typeof node.props==="object"&&!Array.isArray(node.props)?Object.fromEntries(Object.entries(node.props as Record<string,unknown>).filter(([key])=>approvedProps.has(key))):undefined;
    const children=Array.isArray(node.children)?node.children.slice(0,100).map(normalizeNode):undefined;
    return {type,...(props&&Object.keys(props).length?{props}:{}),...(children?.length?{children}:{})};
  };
  const name=typeof root.name==="string"&&root.name.trim()?root.name.trim().slice(0,120):"Rebuilt page";
  return {name,components:Array.isArray(root.components)?root.components.slice(0,100).map(normalizeNode):root.components};
}
export function parseNormalizedUISchema(input:unknown){return parseUISchema(normalizeUIResponse(input));}
export function countComponents(nodes: Array<{children?:unknown[]}>): number { return nodes.reduce((n,node)=> n + 1 + countComponents((node.children ?? []) as Array<{children?:unknown[]}>),0); }
