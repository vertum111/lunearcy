let context,enabled=true;
export function setSound(value){enabled=Boolean(value);}
export function sound(kind='tap'){
 if(!enabled)return;
 try{
 context??=new (window.AudioContext||window.webkitAudioContext)();
 if(context.state==='suspended')context.resume();
 const notes={tap:[380],feed:[350,470],hatch:[330,440,660],collect:[620,830,1040],buyEgg:[390,520],restore:[260,390,520,780],claim:[440,660,880],error:[170,130]}[kind]||[420,560];
 notes.forEach((frequency,i)=>{const at=context.currentTime+i*.09,osc=context.createOscillator(),gain=context.createGain();osc.type=kind==='error'?'triangle':'sine';osc.frequency.setValueAtTime(frequency,at);gain.gain.setValueAtTime(0,at);gain.gain.linearRampToValueAtTime(.035,at+.015);gain.gain.exponentialRampToValueAtTime(.001,at+.2);osc.connect(gain);gain.connect(context.destination);osc.start(at);osc.stop(at+.23);});
 }catch{}
}
