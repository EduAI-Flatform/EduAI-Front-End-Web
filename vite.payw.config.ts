import path from 'node:path';
import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
// Receipt browser fixtures must never inherit a real API proxy or local .env.
export default defineConfig({envDir:false,plugins:[react()],resolve:{alias:{'@':path.resolve(__dirname,'./src')}},
  server:{host:'127.0.0.1',port:5174,strictPort:true}});