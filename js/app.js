/* Main controller: training loop, watch mode, stats, save/load, UI bindings. */
(function(){
  const canvas=document.getElementById('game');
  const ctx=canvas.getContext('2d');

  const game=new FlappyGame(canvas.width,canvas.height);
  const env=new FlappyEnv(game);
  const agent=new DQNAgent({stateSize:4,actions:2,hidden:[32,32]});

  // ---- state ----
  let mode='idle';           // idle | train | watch
  let running=false;
  let stepsPerFrame=10;
  let doRender=true;
  let episode=0,totalSteps=0,best=0;
  const scores=[];

  // ---- DOM ----
  const $=id=>document.getElementById(id);
  const toastEl=$('toast');
  function toast(msg){ toastEl.textContent=msg; toastEl.classList.add('show');
    clearTimeout(toast._t); toast._t=setTimeout(()=>toastEl.classList.remove('show'),1600); }

  function avg(n){ if(!scores.length)return 0;
    const s=scores.slice(-n); return s.reduce((a,b)=>a+b,0)/s.length; }

  function updateUI(){
    $('statEp').textContent=episode;
    $('statSteps').textContent=totalSteps;
    $('statScore').textContent=game.score;
    $('statBest').textContent=best;
    $('statAvg').textContent=avg(50).toFixed(1);
    $('statEps').textContent=agent.epsilon.toFixed(3);
    $('statLoss').textContent=agent.lastLoss? agent.lastLoss.toFixed(4):'–';
    $('statMem').textContent=agent.memory.size;
  }

  // ---- core step ----
  let lastState=env.reset();
  function stepOnce(greedy){
    const action=agent.act(lastState,greedy);
    const {state,reward,done,score}=env.step(action);

    if(mode==='train'){
      agent.remember(lastState,action,reward,state,done);
      agent.learn();
    }
    lastState=state; totalSteps++;

    if(done){
      if(score>best)best=score;
      scores.push(score);
      episode++;
      if(mode==='train') agent.endEpisode();
      lastState=env.reset();
    }
  }

  // ---- main loop ----
  function loop(){
    if(running){
      const n=stepsPerFrame;
      const greedy=(mode==='watch');
      for(let i=0;i<n;i++) stepOnce(greedy);
    }
    if(doRender || mode==='watch' || !running) game.render(ctx);
    updateUI();
    requestAnimationFrame(loop);
  }

  // ---- controls ----
  $('btnTrain').onclick=()=>{ mode='train'; running=true; toast('Training…'); };
  $('btnWatch').onclick=()=>{ mode='watch'; running=true; toast('Watching (greedy)'); };
  $('btnPause').onclick=()=>{ running=!running; toast(running?'Resumed':'Paused'); };

  $('speed').oninput=e=>{ stepsPerFrame=+e.target.value; $('speedVal').textContent=stepsPerFrame; };
  $('render').onchange=e=>{ doRender=e.target.checked; };

  $('btnSave').onclick=()=>{
    const data={agent:agent.serialize(),episode,best};
    localStorage.setItem('flappy_dqn',JSON.stringify(data));
    toast('Model saved');
  };
  $('btnLoad').onclick=()=>{
    const raw=localStorage.getItem('flappy_dqn');
    if(!raw){toast('No saved model');return;}
    const data=JSON.parse(raw);
    agent.load(data.agent); episode=data.episode||0; best=data.best||0;
    toast('Model loaded');
  };
  $('btnReset').onclick=()=>{
    agent.resetBrain(); episode=0;best=0;scores.length=0;totalSteps=0;
    lastState=env.reset(); toast('Brain reset');
  };

  loop();
})();