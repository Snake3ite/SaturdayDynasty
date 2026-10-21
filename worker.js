// Share links (/s/?k=…&t=…): give Facebook, X and Messages a preview built from the shared moment,
// then let the page send the visitor to Google Play. Everything else is a plain static asset.
const KINDS=new Set(['score','upset','rivalry','title','conference','perfect','recruit','class','award','milestone','scenario','custom','dynasty']);
const clean=(value,max)=>String(value||'').replace(/[\u0000-\u001f"<>&]/g,' ').replace(/\s+/g,' ').trim().slice(0,max);
export default{
 async fetch(request,env){
  const url=new URL(request.url);
  if(!['/s','/s/','/s/index.html'].includes(url.pathname))return env.ASSETS.fetch(request);
  const page=await env.ASSETS.fetch(new Request(new URL('/s/',url),request));
  const q=url.searchParams,kind=KINDS.has(q.get('k'))?q.get('k'):'dynasty';
  const title=clean(q.get('t'),140)||'Saturday Dynasty Football';
  const detail=[clean(q.get('b'),24),clean(q.get('d'),120)].filter(x=>x&&!/^[^\w]+$/.test(x)).join(' · ');
  const code=clean(q.get('c'),110);
  const description=(code?`Can you beat it? Scenario code ${code}. `:'')+(detail?detail+'. ':'')+'Build your own college football dynasty. Free on Google Play.';
  const image=`${url.origin}/s/og-${kind}.jpg`,set=value=>({element(e){e.setAttribute('content',value)}});
  return new HTMLRewriter()
   .on('title',{element(e){e.setInnerContent(`${title} · Saturday Dynasty Football`)}})
   .on('meta[property="og:title"],meta[name="twitter:title"]',set(title))
   .on('meta[property="og:description"],meta[name="twitter:description"],meta[name="description"]',set(description))
   .on('meta[property="og:image"],meta[name="twitter:image"]',set(image))
   .on('meta[property="og:url"]',set(url.toString()))
   .transform(page);
 }
};
