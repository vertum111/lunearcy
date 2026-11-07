// The testnet bridge stays on the local development server; it is never bundled
// into the static game or exposed by a production preview.
export default {
  server:{fs:{deny:['.env','.env.*','*.{crt,pem}','**/.git/**','**/.local/**']}},
  plugins: [{
    name: 'local-testnet-demo',
    async configureServer(server) {
      try{
        const {middleware}=await import(new URL('./tools/near/bridge.mjs',import.meta.url).href);
        server.middlewares.use(middleware);
      }catch(error){
        if(error.code!=='ERR_MODULE_NOT_FOUND')throw error;
        server.middlewares.use((req,res,next)=>{
          if(!(req.url||'').startsWith('/api/near/'))return next();
          res.statusCode=503;res.setHeader('content-type','application/json');res.setHeader('cache-control','no-store');
          res.end(JSON.stringify({available:false,network:'testnet',walletConnected:false,reason:'Optional local testnet tools are not installed.'}));
        });
      }
    }
  }]
};
