import {loadConfig} from './config.js';import {createApp} from './app.js';
const config=loadConfig();const instance=createApp(config);const server=instance.app.listen(config.port,config.host,()=>console.log(`DreamShield ${config.mode} http://${config.host}:${config.port} (no server signer)`));
process.on('SIGTERM',()=>server.close(()=>{instance.close();process.exit(0);}));process.on('SIGINT',()=>server.close(()=>{instance.close();process.exit(0);}));
