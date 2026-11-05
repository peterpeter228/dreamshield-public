import {resolve} from 'node:path';
import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
// Rolldown ignores assignment to bundle keys; emit the renamed asset explicitly.
export default defineConfig({root:'apps/web',base:'./',plugins:[react(),{name:'static-root-html',enforce:'post',generateBundle:{order:'post',handler(_options,bundle){const html=bundle['index.static.html'];if(!html||html.type!=='asset'||bundle['index.html'])throw new Error('Expected unique index.static.html');delete bundle['index.static.html'];this.emitFile({type:'asset',fileName:'index.html',source:html.source})}}}],build:{outDir:process.env.REVIEWER_OUT??'../../dist-reviewer/web',emptyOutDir:true,sourcemap:false,assetsInlineLimit:0,rollupOptions:{input:resolve(process.cwd(),'apps/web/index.static.html')}}});
