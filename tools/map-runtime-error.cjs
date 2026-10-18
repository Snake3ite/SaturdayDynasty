'use strict';
// Usage: node tools/map-runtime-error.cjs path/to/frozen-source-map.json browser 533
const fs=require('node:fs');
const [mapFile,platform,lineText]=process.argv.slice(2),line=Number(lineText);
if(!mapFile||!['android','browser'].includes(platform)||!Number.isInteger(line)||line<1)throw Error('Usage: map-runtime-error.cjs MAP_FILE android|browser LINE');
const map=JSON.parse(fs.readFileSync(mapFile,'utf8')),offset=platform==='browser'?map.browserLineOffset:0;
const item=map.modules.find(m=>line-offset>=m.first&&line-offset<=m.last);
console.log(JSON.stringify(item?{build:map.build,platform,bundleLine:line,source:item.source,sourceLine:line-offset-item.first+1,bundleSHA256:map.hashes[platform]}:{build:map.build,error:'Line outside archived module ranges'},null,2));
