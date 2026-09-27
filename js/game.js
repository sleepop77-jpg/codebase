/* Flappy Bird core simulation — deterministic, headless-capable, render optional. */
(function(global){
class FlappyGame{
  constructor(W=360,H=560){
    this.W=W; this.H=H;
    this.gravity=0.42;
    this.jump=-7.2;
    this.maxFall=14;
    this.birdX=W*0.3;
    this.birdR=11;
    this.pipeW=55;
    this.baseGap=175;
    this.baseSpeed=3;
    this.spawnRate=95;
    this.reset();
  }

  reset(){
    this.birdY=this.H/2;
    this.vy=0;
    this.rot=0;
    this.pipes=[];
    this.frame=0;
    this.score=0;
    this.alive=true;
    this.spawnTimer=this.spawnRate-40; // first pipe arrives sooner
    this.gap=this.baseGap;
    this.speed=this.baseSpeed;
  }

  spawnPipe(){
    const minTop=70, maxTop=this.H-minTop-this.gap;
    const top=minTop+Math.random()*(maxTop-minTop);
    this.pipes.push({x:this.W+60,top,bot:top+this.gap,passed:false});
  }

  getNextPipe(){
    for(const p of this.pipes) if(p.x+this.pipeW>this.birdX) return p;
    return null;
  }

  // advance one frame; action: 0 wait, 1 flap. returns {dead, passed}
  update(action){
    if(!this.alive) return {dead:true,passed:false};

    if(action===1){ this.vy=this.jump; }

    this.vy+=this.gravity;
    if(this.vy>this.maxFall)this.vy=this.maxFall;
    this.birdY+=this.vy;
    this.rot=Math.max(-0.5,Math.min(1.2,this.vy*0.08));
    this.frame++;

    // difficulty ramp
    const prog=Math.min(this.score/100,1);
    this.speed=this.baseSpeed+prog*4.5;
    this.gap=Math.max(115,this.baseGap-prog*55);

    // spawn
    this.spawnTimer++;
    if(this.spawnTimer>=this.spawnRate){ this.spawnPipe(); this.spawnTimer=0; }

    let passed=false;
    for(let i=this.pipes.length-1;i>=0;i--){
      const p=this.pipes[i];
      p.x-=this.speed;
      if(!p.passed && p.x+this.pipeW<this.birdX){ p.passed=true; this.score++; passed=true; }
      if(p.x+this.pipeW<-60) this.pipes.splice(i,1);
    }

    // collisions
    const r=this.birdR, x=this.birdX, y=this.birdY;
    if(y-r<0 || y+r>this.H){ this.alive=false; return {dead:true,passed}; }
    for(const p of this.pipes){
      if(x+r>p.x && x-r<p.x+this.pipeW){
        if(y-r<p.top || y+r>p.bot){ this.alive=false; return {dead:true,passed}; }
      }
    }
    return {dead:false,passed};
  }

  render(ctx){
    const c=ctx;
    c.fillStyle='#05070c'; c.fillRect(0,0,this.W,this.H);

    // grid
    c.strokeStyle='rgba(0,243,255,.06)'; c.lineWidth=1;
    for(let x=0;x<this.W;x+=40){c.beginPath();c.moveTo(x,0);c.lineTo(x,this.H);c.stroke();}
    for(let y=0;y<this.H;y+=40){c.beginPath();c.moveTo(0,y);c.lineTo(this.W,y);c.stroke();}

    // pipes
    c.shadowBlur=12; c.shadowColor='#ff00aa'; c.fillStyle='#ff00aa';
    for(const p of this.pipes){
      c.fillRect(p.x,0,this.pipeW,p.top);
      c.fillRect(p.x,p.bot,this.pipeW,this.H-p.bot);
    }
    c.shadowBlur=0;

    // bird
    c.save();
    c.translate(this.birdX,this.birdY); c.rotate(this.rot);
    c.shadowBlur=20; c.shadowColor='#00f3ff';
    c.fillStyle='#00f3ff'; c.beginPath(); c.arc(0,0,this.birdR+2,0,Math.PI*2); c.fill();
    c.shadowBlur=0;
    c.fillStyle='#fff'; c.beginPath(); c.arc(0,0,this.birdR,0,Math.PI*2); c.fill();
    c.fillStyle='#000'; c.beginPath(); c.arc(5,-3,2.5,0,Math.PI*2); c.fill();
    c.restore();
  }
}
global.FlappyGame=FlappyGame;
})(window);
