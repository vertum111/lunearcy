// Email / Google sign-in with Privy, loaded only when a player asks for it (the guest game never pays for it).
// Privy gives each player an embedded NEAR wallet (an implicit testnet account) and signs silently: no seed phrase,
// no wallet pop-up. The game's sponsor still pays the gas. Pattern from near-examples/hello-privy, without JSX.
import {createElement as h,useEffect,useRef} from 'react';
import {createRoot} from 'react-dom/client';
import {PrivyProvider,usePrivy,useLogin,useLogout} from '@privy-io/react-auth';
import {useCreateWallet,useSignRawHash} from '@privy-io/react-auth/extended-chains';
import {Signer,PublicKey} from 'near-api-js';
import {bytesToHex,hexToBytes} from '@noble/hashes/utils';

/** A near-api-js signer backed by Privy's embedded wallet (implicit account: the id is the public key in hex). */
class PrivySigner extends Signer {
 constructor(signRawHash,accountId){super();this.signRawHash=signRawHash;this.accountId=accountId;}
 async getPublicKey(){return new PublicKey({keyType:0,data:hexToBytes(this.accountId)});}
 async signBytes(bytes){const {signature}=await this.signRawHash({address:this.accountId,chainType:'near',hash:`0x${bytesToHex(bytes)}`});return hexToBytes(signature.replace(/^0x/,''));}
}

/** Mounts Privy once. `onAccount({accountId, signer, email})` fires after sign-in (and on a restored session);
 *  `onLogout()` after sign-out. Returns {login, logout}. */
export function startPrivy({appId,onAccount,onLogout}){
 const holder=document.createElement('div');holder.id='privy-root';document.body.append(holder);
 const api={login:()=>{},logout:()=>{}};
 function Bridge(){
  const {ready,authenticated,user}=usePrivy();
  const {login}=useLogin();const {logout}=useLogout();
  const {createWallet}=useCreateWallet();const {signRawHash}=useSignRawHash();
  const creating=useRef(false),reported=useRef('');
  api.login=login;api.logout=async()=>{await logout();reported.current='';onLogout?.();};
  useEffect(()=>{
   if(!ready||!authenticated||!user)return;
   const wallet=user.linkedAccounts.find(a=>a.type==='wallet'&&a.chainType==='near');
   if(!wallet){
    if(!creating.current){creating.current=true;createWallet({chainType:'near'}).catch(e=>console.warn('Privy NEAR wallet',e)).finally(()=>{creating.current=false;});}
    return;
   }
   if(reported.current===wallet.address)return;reported.current=wallet.address;
   onAccount?.({accountId:wallet.address,signer:new PrivySigner(signRawHash,wallet.address),email:user.email?.address||user.google?.email||''});
  },[ready,authenticated,user,createWallet,signRawHash]);
  return null;
 }
 createRoot(holder).render(h(PrivyProvider,{appId,config:{
  loginMethods:['email','google'],
  appearance:{theme:'dark',accentColor:'#62b6a6',logo:'/brand/lunearcy-mark.svg',landingHeader:'Lunearcy',loginMessage:'Save your valley and play on any device.'},
  embeddedWallets:{ethereum:{createOnLogin:'off'},solana:{createOnLogin:'off'}}
 }},h(Bridge)));
 return api;
}
