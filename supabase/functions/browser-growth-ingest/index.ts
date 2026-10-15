import { createGrowthHandler } from './handler.mjs';
Deno.serve(createGrowthHandler({env:(name:string)=>Deno.env.get(name)}));
