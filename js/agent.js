/* DQN agent: policy net + target net + epsilon-greedy + experience replay. */
(function(global){
class DQNAgent{
  constructor(opts={}){
    this.stateSize=opts.stateSize||4;
    this.actions=opts.actions||2;
    this.hidden=opts.hidden||[32,32];
    this.lr=opts.lr||0.001;
    this.gamma=opts.gamma||0.99;
    this.batch=opts.batch||64;
    this.warmup=opts.warmup||500;
    this.syncEvery=opts.syncEvery||1000;

    this.epsilon=1.0;
    this.epsMin=opts.epsMin||0.02;
    this.epsDecay=opts.epsDecay||0.995; // per episode

    const sizes=[this.stateSize,...this.hidden,this.actions];
    this.policy=new global.NeuralNet(sizes);
    this.target=new global.NeuralNet(sizes);
    this.target.copyFrom(this.policy);

    this.memory=new global.ReplayBuffer(opts.capacity||20000);
    this.steps=0;
    this.lastLoss=null;
  }

  act(state,greedy=false){
    if(!greedy && Math.random()<this.epsilon) return (Math.random()*this.actions)|0;
    const q=this.policy.predict(state);
    return q[0]>=q[1]?0:1;
  }

  remember(s,a,r,s2,done){ this.memory.push({s,a,r,s2,done}); }

  learn(){
    this.steps++;
    if(this.memory.size<Math.max(this.batch,this.warmup)) return null;

    const batch=this.memory.sample(this.batch);
    let lossSum=0;

    for(const t of batch){
      const qNext=this.target.predict(t.s2);
      const maxNext=Math.max(qNext[0],qNext[1]);
      const y=t.done? t.r : t.r + this.gamma*maxNext;

      const qCur=this.policy.predict(t.s);
      const target=qCur.slice();
      target[t.a]=y;
      lossSum+=this.policy.train(t.s,target,this.lr);
    }

    if(this.steps%this.syncEvery===0) this.target.copyFrom(this.policy);

    this.lastLoss=lossSum/this.batch;
    return this.lastLoss;
  }

  endEpisode(){
    this.epsilon=Math.max(this.epsMin,this.epsilon*this.epsDecay);
  }

  resetBrain(){
    const sizes=[this.stateSize,...this.hidden,this.actions];
    this.policy=new global.NeuralNet(sizes);
    this.target=new global.NeuralNet(sizes);
    this.target.copyFrom(this.policy);
    this.memory.clear();
    this.epsilon=1.0; this.steps=0; this.lastLoss=null;
  }

  serialize(){
    return {net:this.policy.serialize(),epsilon:this.epsilon,steps:this.steps};
  }
  load(data){
    this.policy.load(data.net);
    this.target.copyFrom(this.policy);
    this.epsilon=data.epsilon??this.epsMin;
    this.steps=data.steps||0;
    this.memory.clear();
  }
}
global.DQNAgent=DQNAgent;
})(window);
