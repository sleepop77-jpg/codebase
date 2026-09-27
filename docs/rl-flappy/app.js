/**
 * Main training loop, UI bindings, save/load, stats, logging.
 */
(function(){
  'use strict';

  var $ = function(s){ return document.querySelector(s); };
  var canvas = $('#game');
  var env = new FlappyEnv(canvas);
  var agent = new DQNAgent();

  var mode = 'idle';
  var running = false;
  var stepsPerFrame = 1;
  var turbo = false;
  var soundOn = true;
  var episode = 0;
  var bestScore = 0;
  var scores = [];
  var totalSteps = 0;
  var currentState = env.reset();

  var audioCtx = null;
  function beep(freq, dur, vol){
    if(!soundOn) return;
    try{
      if(!audioCtx) audioCtx = new (window.AudioContext||window.webkitAudioContext)();
      var o = audioCtx.createOscillator();
      var g = audioCtx.createGain();
      o.type = 'square';
      o.frequency.value = freq;
      g.gain.value = vol;
      g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur);
      o.connect(g); g.connect(audioCtx.destination);
      o.start(); o.stop(audioCtx.currentTime + dur);
    }catch(e){}
  }

  function log(msg, cls){
    var box = $('#logBox');
    if(!box) return;
    var d = document.createElement('div');
    d.textContent = msg;
    if(cls) d.className = cls;
    box.appendChild(d);
    box.scrollTop = box.scrollHeight;
    if(box.children.length > 200) box.removeChild(box.firstChild);
  }

  function updateStats(){
    $('#stEp').textContent = episode;
    $('#stBest').textContent = bestScore;
    var avg = scores.length ? (scores.slice(-50).reduce(function(a,b){return a+b},0)/Math.min(scores.length,50)).toFixed(1) : '0';
    $('#stAvg').textContent = avg;
    $('#stLoss').textContent = agent.lastLoss != null ? agent.lastLoss.toFixed(4) : '—';
    $('#stMem').textContent = agent.memory.size;
    $('#stSteps').textContent = totalSteps;
    $('#epsDisplay').textContent = agent.epsilon.toFixed(3);
    $('#liveScore').textContent = env.score;
  }

  function doStep(){
    var action = agent.act(currentState, mode === 'watch');
    var result = env.step(action);
    if(mode === 'train'){
      agent.remember(currentState, action, result.reward, result.state, result.done);
      agent.learn();
    }
    currentState = result.state;
    totalSteps++;

    if(result.done){
      episode++;
      if(result.score > bestScore) bestScore = result.score;
      scores.push(result.score);
      if(mode === 'train') agent.endEpisode();
      if(result.score > 0 && result.score % 5 === 0) log('Episode '+episode+': score '+result.score, 'good');
      if(result.score === 0 && episode % 20 === 0) log('Episode '+episode+': died immediately', 'bad');
      currentState = env.reset();
      if(soundOn && result.score > 0) beep(880, 0.1, 0.1);
    }
  }

  function frame(){
    if(running){
      var n = turbo ? Math.max(stepsPerFrame, 10) : stepsPerFrame;
      for(var i=0;i<n;i++) doStep();
    }
    if(!turbo) env.render();
    updateStats();
    requestAnimationFrame(frame);
  }

  $('#btnTrain').onclick = function(){
    mode = 'train'; running = true;
    log('Training started', 'info');
    if(audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
  };
  $('#btnWatch').onclick = function(){
    mode = 'watch'; running = true;
    log('Watching (greedy policy)', 'info');
  };
  $('#btnPause').onclick = function(){
    running = !running;
    log(running ? 'Resumed' : 'Paused', 'info');
  };
  $('#speedSlider').oninput = function(e){
    stepsPerFrame = parseInt(e.target.value, 10);
    $('#speedVal').textContent = stepsPerFrame + '×';
  };
  $('#chkTurbo').onchange = function(e){ turbo = e.target.checked; };
  $('#chkSound').onchange = function(e){ soundOn = e.target.checked; };

  $('#btnSave').onclick = function(){
    try{
      localStorage.setItem('vb_rl_flappy', JSON.stringify(agent.serialize()));
      log('Model saved to localStorage', 'good');
    }catch(e){ log('Save failed: '+e.message, 'bad'); }
  };
  $('#btnLoad').onclick = function(){
    try{
      var raw = localStorage.getItem('vb_rl_flappy');
      if(!raw){ log('No saved model found', 'bad'); return; }
      agent.load(JSON.parse(raw));
      log('Model loaded from localStorage', 'good');
    }catch(e){ log('Load failed: '+e.message, 'bad'); }
  };
  $('#btnReset').onclick = function(){
    if(!confirm('Reset the brain? All learned weights will be lost.')) return;
    agent.resetBrain();
    episode = 0; bestScore = 0; scores = []; totalSteps = 0;
    currentState = env.reset();
    log('Brain reset', 'info');
  };

  $('#btnExport').onclick = function(){
    var blob = new Blob([JSON.stringify(agent.serialize())], {type:'application/json'});
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'flappy-dqn-'+Date.now()+'.json';
    a.click();
    log('Model exported as JSON', 'good');
  };
  $('#btnImport').onclick = function(){ $('#fileImport').click(); };
  $('#fileImport').onchange = function(e){
    var file = e.target.files[0];
    if(!file) return;
    var reader = new FileReader();
    reader.onload = function(ev){
      try{
        agent.load(JSON.parse(ev.target.result));
        log('Model imported from '+file.name, 'good');
      }catch(err){ log('Import failed: '+err.message, 'bad'); }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  try{
    var saved = localStorage.getItem('vb_rl_flappy');
    if(saved){ agent.load(JSON.parse(saved)); log('Auto-loaded saved model', 'info'); }
  }catch(e){}

  env.render();
  updateStats();
  log('Ready. Press ▶ Train to start learning.', 'info');
  requestAnimationFrame(frame);
})();