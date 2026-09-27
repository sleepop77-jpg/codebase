/**
 * DQN Agent for Flappy Bird
 * - Policy net + Target net (sync every N steps)
 * - Epsilon-greedy exploration with decay
 * - Experience replay buffer
 * - TD error clipping for stability
 */
(function(global){
  'use strict';

  var REPLAY_CAP = 20000;
  var BATCH_SIZE = 64;
  var GAMMA = 0.99;
  var LR = 0.001;
  var SYNC_EVERY = 1000;
  var WARMUP_STEPS = 500;
  var EPS_START = 1.0;
  var EPS_END = 0.02;
  var EPS_DECAY = 0.995;
  var CLIP_DELTA = 1.0;

  class ReplayBuffer {
    constructor(cap){ this.cap=cap; this.data=[]; this.pos=0; }
    push(item){
      if(this.data.length < this.cap) this.data.push(item);
      else this.data[this.pos] = item;
      this.pos = (this.pos + 1) % this.cap;
    }
    sample(n){
      var out = new Array(n);
      for(var i=0;i<n;i++) out[i] = this.data[(Math.random()*this.data.length)|0];
      return out;
    }
    get size(){ return this.data.length; }
    clear(){ this.data=[]; this.pos=0; }
  }

  class DQNAgent {
    constructor(){
      this.policy = new global.DenseNet([4, 32, 32, 2]);
      this.target = new global.DenseNet([4, 32, 32, 2]);
      this.target.copyFrom(this.policy);
      this.memory = new ReplayBuffer(REPLAY_CAP);
      this.epsilon = EPS_START;
      this.totalSteps = 0;
      this.lastLoss = null;
    }

    act(state, greedy){
      if(!greedy && Math.random() < this.epsilon){
        return Math.random() < 0.5 ? 0 : 1;
      }
      var q = this.policy.predict(state);
      return q[0] >= q[1] ? 0 : 1;
    }

    remember(s, a, r, s2, done){
      this.memory.push({s:s, a:a, r:r, s2:s2, done:done});
    }

    learn(){
      this.totalSteps++;
      if(this.memory.size < Math.max(BATCH_SIZE, WARMUP_STEPS)) return null;

      var batch = this.memory.sample(BATCH_SIZE);
      var lossSum = 0;

      for(var bi=0;bi<batch.length;bi++){
        var t = batch[bi];
        var qNext = this.target.predict(t.s2);
        var maxNext = Math.max(qNext[0], qNext[1]);
        var y = t.done ? t.r : t.r + GAMMA * maxNext;

        var qCur = this.policy.predict(t.s);
        var tdErr = y - qCur[t.a];
        tdErr = Math.max(-CLIP_DELTA, Math.min(CLIP_DELTA, tdErr));

        var targetVec = new Float64Array([qCur[0], qCur[1]]);
        targetVec[t.a] = qCur[t.a] + tdErr;

        lossSum += this.policy.train(t.s, targetVec, LR);
      }

      if(this.totalSteps % SYNC_EVERY === 0){
        this.target.copyFrom(this.policy);
      }

      this.lastLoss = lossSum / BATCH_SIZE;
      return this.lastLoss;
    }

    endEpisode(){
      this.epsilon = Math.max(EPS_END, this.epsilon * EPS_DECAY);
    }

    resetBrain(){
      this.policy = new global.DenseNet([4, 32, 32, 2]);
      this.target = new global.DenseNet([4, 32, 32, 2]);
      this.target.copyFrom(this.policy);
      this.memory.clear();
      this.epsilon = EPS_START;
      this.totalSteps = 0;
      this.lastLoss = null;
    }

    serialize(){
      return {
        policy: this.policy.serialize(),
        epsilon: this.epsilon,
        totalSteps: this.totalSteps
      };
    }

    load(data){
      this.policy = global.DenseNet.deserialize(data.policy);
      this.target = new global.DenseNet([4, 32, 32, 2]);
      this.target.copyFrom(this.policy);
      this.epsilon = data.epsilon != null ? data.epsilon : EPS_END;
      this.totalSteps = data.totalSteps || 0;
      this.memory.clear();
      this.lastLoss = null;
    }
  }

  global.DQNAgent = DQNAgent;
})(typeof window!=='undefined'?window:globalThis);
