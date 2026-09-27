/* RL environment wrapper: normalized state vector + reward signal. */
(function(global){
class FlappyEnv{
  constructor(game){ this.game=game; this.state=this.getState(); }

  getState(){
    const g=this.game, p=g.getNextPipe();
    const normY=g.birdY/g.H;
    const normVy=g.vy/g.maxFall;
    let dist=1, offset=0;
    if(p){
      dist=Math.max(0,(p.x-g.birdX))/g.W;
      const center=(p.top+p.bot)/2;
      offset=(center-g.birdY)/g.H;
    }
    return [normY,normVy,dist,offset];
  }

  reset(){ this.game.reset(); this.state=this.getState(); return this.state; }

  // action 0 wait, 1 flap
  step(action){
    const g=this.game;
    const before=g.score;
    const offset=this.state[3];
    const {dead,passed}=g.update(action);
    const after=g.score;

    let reward=0.01;                       // survive
    reward+=(after-before)*1.0;            // pass pipe
    reward-=0.02*Math.abs(offset);         // light shaping: stay near gap center
    if(dead) reward=-10;

    this.state=this.getState();
    return {state:this.state,reward,done:dead,score:after};
  }
}
global.FlappyEnv=FlappyEnv;
})(window);
