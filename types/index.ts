export type Bounds = { x: number; y: number; width: number; height: number };
export type ExtractedNode = { tag: string; text?: string; role?: string; attributes?: Record<string,string>; styles?: Record<string,string>; boundingBox?: Bounds; children?: ExtractedNode[] };
export type PageModel = { page: { title: string; siteName?:string; url: string; viewport: { width: number; height: number } }; sections: Array<{ id:string; type:string; layout:string; content: ExtractedNode[] }> };
export type UIComponent = { type: "section"|"container"|"navbar"|"footer"|"heading"|"text"|"image"|"button"|"input"|"card"|"grid"|"flex"|"spacer"; props?: Record<string, unknown>; children?: UIComponent[] };
export type UISchema = { name: string; components: UIComponent[] };
export type AnalysisResult = { id:string; sourceUrl:string; screenshot?:string; snapshot?:ExtractedNode; siteName?:string; warnings?:string[]; schema:UISchema; metrics:{ analyzed:number; retained:number; processingMs:number; components:number }; pageTitle:string };
