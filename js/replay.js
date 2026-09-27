/* Circular experience replay buffer. */
(function(global){
class ReplayBuffer{
  constructor(capacity=20000){ this.cap=capacity; this.data=[]; this.pos=0; }
  push(item){
    if(this.data.length<this.cap) this.data.push(item);
    else this.data[this.pos]=item;
    this.pos=(this.pos+1)%this.cap;
  }
  sample(n){
    const out=new Array(n);
    for(let i=0;i<n;i++) out[i]=this.data[(Math.random()*this.data.length)|0];
    return out;
  }
  get size(){ return this.data.length; }
  clear(){ this.data=[]; this.pos=0; }
}
global.ReplayBuffer=ReplayBuffer;
})(window);
