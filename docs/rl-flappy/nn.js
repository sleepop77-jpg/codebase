/**
 * Minimal dense neural network with Adam optimizer.
 * Architecture: 4 → 32 → 32 → 2 (ReLU hidden, linear output)
 * No external dependencies. Pure JS matrix ops.
 */
(function(global){
  'use strict';

  function randn(){
    var u=0,v=0;
    while(u===0)u=Math.random();
    while(v===0)v=Math.random();
    return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v);
  }

  class DenseNet {
    constructor(sizes){
      this.sizes = sizes.slice();
      this.L = sizes.length - 1;
      this.W = [];
      this.b = [];
      for(var l=0;l<this.L;l++){
        var nin=sizes[l], nout=sizes[l+1];
        var scale=Math.sqrt(2/nin);
        var Wl=[];
        for(var i=0;i<nout;i++){
          var row=new Float64Array(nin);
          for(var j=0;j<nin;j++) row[j]=randn()*scale;
          Wl.push(row);
        }
        this.W.push(Wl);
        this.b.push(new Float64Array(nout));
      }
      this._initAdam();
    }

    _initAdam(){
      this.t=0;
      this.beta1=0.9; this.beta2=0.999; this.eps=1e-8;
      this.mW=[]; this.vW=[]; this.mb=[]; this.vb=[];
      for(var l=0;l<this.L;l++){
        var nout=this.sizes[l+1], nin=this.sizes[l];
        var mWl=[],vWl=[];
        for(var i=0;i<nout;i++){
          mWl.push(new Float64Array(nin));
          vWl.push(new Float64Array(nin));
        }
        this.mW.push(mWl); this.vW.push(vWl);
        this.mb.push(new Float64Array(nout));
        this.vb.push(new Float64Array(nout));
      }
    }

    forward(input){
      var acts=[input instanceof Float64Array ? input : Float64Array.from(input)];
      var zs=[];
      var a=acts[0];
      for(var l=0;l<this.L;l++){
        var Wl=this.W[l], bl=this.b[l];
        var nout=Wl.length, nin=Wl[0].length;
        var z=new Float64Array(nout);
        for(var i=0;i<nout;i++){
          var s=bl[i]; var row=Wl[i];
          for(var j=0;j<nin;j++) s+=row[j]*a[j];
          z[i]=s;
        }
        zs.push(z);
        var isOut=(l===this.L-1);
        var out=new Float64Array(nout);
        for(var i2=0;i2<nout;i2++) out[i2]=isOut?z[i2]:Math.max(0,z[i2]);
        acts.push(out);
        a=out;
      }
      this._cache={acts:acts,zs:zs};
      return acts[acts.length-1];
    }

    predict(input){ return this.forward(input); }

    train(input, target, lr){
      var out=this.forward(input);
      var cache=this._cache;
      var n=out.length;
      var delta=new Float64Array(n);
      var loss=0;
      for(var i=0;i<n;i++){
        var d=out[i]-target[i];
        loss+=d*d;
        delta[i]=2*d/n;
      }
      loss/=n;

      var gradW=[], gradb=[];
      for(var l=0;l<this.L;l++){
        var nout=this.sizes[l+1], nin=this.sizes[l];
        var gWl=[];
        for(var gi=0;gi<nout;gi++) gWl.push(new Float64Array(nin));
        gradW.push(gWl);
        gradb.push(new Float64Array(nout));
      }

      for(var l2=this.L-1;l2>=0;l2--){
        var aPrev=cache.acts[l2];
        var isOut2=(l2===this.L-1);
        var dz;
        if(isOut2){ dz=delta; }
        else {
          var z2=cache.zs[l2];
          dz=new Float64Array(delta.length);
          for(var di=0;di<delta.length;di++) dz[di]=z2[di]>0?delta[di]:0;
        }
        for(var oi=0;oi<dz.length;oi++){
          gradb[l2][oi]=dz[oi];
          var gRow=gradW[l2][oi];
          for(var aj=0;aj<aPrev.length;aj++) gRow[aj]+=dz[oi]*aPrev[aj];
        }
        if(l2>0){
          var W2=this.W[l2];
          var prev=new Float64Array(aPrev.length);
          for(var pi=0;pi<dz.length;pi++){
            var dv=dz[pi], pRow=W2[pi];
            for(var pj=0;pj<pRow.length;pj++) prev[pj]+=dv*pRow[pj];
          }
          delta=prev;
        }
      }

      this._adam(gradW,gradb,lr);
      return loss;
    }

    _adam(gW,gB,lr){
      this.t++;
      var b1=this.beta1,b2=this.beta2,e=this.eps;
      var c1=1-Math.pow(b1,this.t), c2=1-Math.pow(b2,this.t);
      for(var l=0;l<this.L;l++){
        var nout=this.sizes[l+1], nin=this.sizes[l];
        for(var i=0;i<nout;i++){
          for(var j=0;j<nin;j++){
            var g=gW[l][i][j];
            this.mW[l][i][j]=b1*this.mW[l][i][j]+(1-b1)*g;
            this.vW[l][i][j]=b2*this.vW[l][i][j]+(1-b2)*g*g;
            var mh=this.mW[l][i][j]/c1, vh=this.vW[l][i][j]/c2;
            this.W[l][i][j]-=lr*mh/(Math.sqrt(vh)+e);
          }
          var gb=gB[l][i];
          this.mb[l][i]=b1*this.mb[l][i]+(1-b1)*gb;
          this.vb[l][i]=b2*this.vb[l][i]+(1-b2)*gb*gb;
          var mbh=this.mb[l][i]/c1, vbh=this.vb[l][i]/c2;
          this.b[l][i]-=lr*mbh/(Math.sqrt(vbh)+e);
        }
      }
    }

    copyFrom(other){
      for(var l=0;l<this.L;l++){
        for(var i=0;i<this.W[l].length;i++){
          this.b[l][i]=other.b[l][i];
          for(var j=0;j<this.W[l][i].length;j++) this.W[l][i][j]=other.W[l][i][j];
        }
      }
    }

    serialize(){
      var wSer=[], bSer=[];
      for(var l=0;l<this.L;l++){
        var wl=[];
        for(var i=0;i<this.W[l].length;i++) wl.push(Array.from(this.W[l][i]));
        wSer.push(wl);
        bSer.push(Array.from(this.b[l]));
      }
      return {sizes:this.sizes,W:wSer,b:bSer};
    }

    static deserialize(data){
      var net=new DenseNet(data.sizes);
      for(var l=0;l<net.L;l++){
        for(var i=0;i<data.W[l].length;i++){
          net.b[l][i]=data.b[l][i];
          for(var j=0;j<data.W[l][i].length;j++) net.W[l][i][j]=data.W[l][i][j];
        }
      }
      net._initAdam();
      return net;
    }
  }

  global.DenseNet=DenseNet;
})(typeof window!=='undefined'?window:globalThis);
