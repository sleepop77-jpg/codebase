/* Minimal dense neural network with Adam optimizer (no dependencies). */
(function(global){

function randn(){ // Box-Muller
  let u=0,v=0; while(u===0)u=Math.random(); while(v===0)v=Math.random();
  return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v);
}

class NeuralNet{
  constructor(sizes){
    this.sizes=sizes.slice();
    this.L=sizes.length-1;
    this.W=[]; this.b=[];
    for(let l=0;l<this.L;l++){
      const nin=sizes[l], nout=sizes[l+1];
      const scale=Math.sqrt(2/nin); // He init
      const W=new Array(nout);
      for(let i=0;i<nout;i++){
        W[i]=new Array(nin);
        for(let j=0;j<nin;j++) W[i][j]=randn()*scale;
      }
      this.W.push(W);
      this.b.push(new Array(nout).fill(0));
    }
    this._initAdam();
  }

  _initAdam(){
    this.t=0; this.beta1=0.9; this.beta2=0.999; this.eps=1e-8;
    this.mW=this.W.map(W=>W.map(r=>r.map(()=>0)));
    this.vW=this.W.map(W=>W.map(r=>r.map(()=>0)));
    this.mb=this.b.map(b=>b.map(()=>0));
    this.vb=this.b.map(b=>b.map(()=>0));
  }

  forward(x){
    const acts=[x.slice()];   // a[0]
    const zs=[];
    let a=x.slice();
    for(let l=0;l<this.L;l++){
      const W=this.W[l], b=this.b[l];
      const nout=W.length, nin=W[0].length;
      const z=new Array(nout);
      for(let i=0;i<nout;i++){
        let s=b[i]; const row=W[i];
        for(let j=0;j<nin;j++) s+=row[j]*a[j];
        z[i]=s;
      }
      zs.push(z);
      const isOut=(l===this.L-1);
      const out=new Array(nout);
      for(let i=0;i<nout;i++) out[i]=isOut? z[i] : Math.max(0,z[i]); // ReLU hidden, linear out
      acts.push(out);
      a=out;
    }
    this.cache={acts,zs};
    return acts[acts.length-1];
  }

  predict(x){ return this.forward(x); }

  // One SGD/Adam step on MSE vs target. Returns loss.
  train(x,target,lr){
    const out=this.forward(x);
    const {acts,zs}=this.cache;
    const n=out.length;

    // dL/dOut for MSE (masked naturally since target==out for untouched actions)
    let delta=new Array(n);
    let loss=0;
    for(let i=0;i<n;i++){ const d=out[i]-target[i]; loss+=d*d; delta[i]=2*d/n; }
    loss/=n;

    const gradsW=this.W.map(W=>W.map(r=>r.map(()=>0)));
    const gradsb=this.b.map(b=>b.map(()=>0));

    for(let l=this.L-1;l>=0;l--){
      const aPrev=acts[l];
      const isOut=(l===this.L-1);
      let dz;
      if(isOut){ dz=delta; }
      else{
        const z=zs[l];
        dz=delta.map((d,i)=> z[i]>0 ? d : 0); // ReLU'
      }
      // grads
      for(let i=0;i<dz.length;i++){
        gradsb[l][i]=dz[i];
        const gRow=gradsW[l][i];
        for(let j=0;j<aPrev.length;j++) gRow[j]+=dz[i]*aPrev[j];
      }
      // propagate
      if(l>0){
        const W=this.W[l];
        const prev=new Array(aPrev.length).fill(0);
        for(let i=0;i<dz.length;i++){
          const d=dz[i], row=W[i];
          for(let j=0;j<row.length;j++) prev[j]+=d*row[j];
        }
        delta=prev;
      }
    }

    this._adam(gradsW,gradsb,lr);
    return loss;
  }

  _adam(gW,gb,lr){
    this.t++;
    const b1=this.beta1,b2=this.beta2,e=this.eps;
    const c1=1-Math.pow(b1,this.t), c2=1-Math.pow(b2,this.t);
    for(let l=0;l<this.L;l++){
      for(let i=0;i<this.W[l].length;i++){
        for(let j=0;j<this.W[l][i].length;j++){
          const g=gW[l][i][j];
          this.mW[l][i][j]=b1*this.mW[l][i][j]+(1-b1)*g;
          this.vW[l][i][j]=b2*this.vW[l][i][j]+(1-b2)*g*g;
          const mh=this.mW[l][i][j]/c1, vh=this.vW[l][i][j]/c2;
          this.W[l][i][j]-=lr*mh/(Math.sqrt(vh)+e);
        }
        const g2=gb[l][i];
        this.mb[l][i]=b1*this.mb[l][i]+(1-b1)*g2;
        this.vb[l][i]=b2*this.vb[l][i]+(1-b2)*g2*g2;
        const mh=this.mb[l][i]/c1, vh=this.vb[l][i]/c2;
        this.b[l][i]-=lr*mh/(Math.sqrt(vh)+e);
      }
    }
  }

  copyFrom(other){
    for(let l=0;l<this.L;l++){
      for(let i=0;i<this.W[l].length;i++){
        this.b[l][i]=other.b[l][i];
        for(let j=0;j<this.W[l][i].length;j++) this.W[l][i][j]=other.W[l][i][j];
      }
    }
  }

  serialize(){ return {sizes:this.sizes,W:this.W,b:this.b}; }
  load(data){
    this.sizes=data.sizes.slice();
    this.W=data.W.map(r=>r.map(row=>row.slice()));
    this.b=data.b.map(row=>row.slice());
    this.L=this.sizes.length-1;
    this._initAdam();
  }
}

global.NeuralNet=NeuralNet;
})(window);
