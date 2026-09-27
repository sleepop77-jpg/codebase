/**
 * Flappy Bird RL Environment
 * State: [birdY, birdVy, pipeDistX, gapOffsetY] (normalized)
 * Actions: 0=WAIT, 1=FLAP
 * Rewards: +0.01 survive, +1 pass pipe, -10 die
 */
(function(global){
  'use strict';

  var GRAVITY = 0.42;
  var JUMP_FORCE = -7.2;
  var TERMINAL_VEL = 14;
  var PIPE_SPEED = 3;
  var PIPE_GAP = 130;
  var PIPE_WIDTH = 52;
  var PIPE_SPACING = 200;
  var BIRD_RADIUS = 12;
  var CANVAS_W = 288;
  var CANVAS_H = 512;
  var GROUND_Y = CANVAS_H - 40;
  var CEILING_Y = 0;
  var BIRD_X = 60;

  class FlappyEnv {
    constructor(canvas){
      this.canvas = canvas || null;
      this.ctx = canvas ? canvas.getContext('2d') : null;
      this.reset();
    }

    reset(){
      this.birdY = CANVAS_H / 2;
      this.birdVy = 0;
      this.pipes = [];
      this.score = 0;
      this.steps = 0;
      this.done = false;
      this._spawnPipe(CANVAS_W + 100);
      this.state = this.getState();
      return this.state;
    }

    _spawnPipe(x){
      var minTop = 60;
      var maxTop = GROUND_Y - PIPE_GAP - 60;
      var topH = minTop + Math.random() * (maxTop - minTop);
      this.pipes.push({x: x, topH: topH, botY: topH + PIPE_GAP, passed: false});
    }

    getState(){
      var nextPipe = null;
      for(var i=0;i<this.pipes.length;i++){
        if(this.pipes[i].x + PIPE_WIDTH > BIRD_X - BIRD_RADIUS){
          nextPipe = this.pipes[i]; break;
        }
      }
      var normY = this.birdY / CANVAS_H;
      var normVy = this.birdVy / TERMINAL_VEL;
      var normDistX = 1.0;
      var normGapOff = 0.0;
      if(nextPipe){
        normDistX = Math.max(0, (nextPipe.x - BIRD_X)) / CANVAS_W;
        var gapCenter = (nextPipe.topH + nextPipe.botY) / 2;
        normGapOff = (gapCenter - this.birdY) / CANVAS_H;
      }
      return new Float64Array([normY, normVy, normDistX, normGapOff]);
    }

    step(action){
      if(this.done) return {state: this.state, reward: 0, done: true, score: this.score};

      if(action === 1) this.birdVy = JUMP_FORCE;

      this.birdVy += GRAVITY;
      if(this.birdVy > TERMINAL_VEL) this.birdVy = TERMINAL_VEL;
      this.birdY += this.birdVy;
      this.steps++;

      var reward = 0.01;

      for(var i=this.pipes.length-1; i>=0; i--){
        this.pipes[i].x -= PIPE_SPEED;
        if(!this.pipes[i].passed && this.pipes[i].x + PIPE_WIDTH < BIRD_X - BIRD_RADIUS){
          this.pipes[i].passed = true;
          this.score++;
          reward += 1.0;
        }
        if(this.pipes[i].x + PIPE_WIDTH < -PIPE_WIDTH) this.pipes.splice(i, 1);
      }

      var rightmost = this.pipes.length > 0 ? this.pipes[this.pipes.length-1].x : BIRD_X;
      if(rightmost < CANVAS_W + 50) this._spawnPipe(rightmost + PIPE_SPACING);

      if(this.birdY + BIRD_RADIUS >= GROUND_Y || this.birdY - BIRD_RADIUS <= CEILING_Y){
        this.done = true;
        reward = -10;
      }

      for(var j=0;j<this.pipes.length;j++){
        var p = this.pipes[j];
        if(BIRD_X + BIRD_RADIUS > p.x && BIRD_X - BIRD_RADIUS < p.x + PIPE_WIDTH){
          if(this.birdY - BIRD_RADIUS < p.topH || this.birdY + BIRD_RADIUS > p.botY){
            this.done = true;
            reward = -10;
          }
        }
      }

      this.state = this.getState();
      return {state: this.state, reward: reward, done: this.done, score: this.score};
    }

    render(){
      if(!this.ctx) return;
      var c = this.ctx;
      c.fillStyle = '#000';
      c.fillRect(0, 0, CANVAS_W, CANVAS_H);

      c.fillStyle = '#1a1a2e';
      c.fillRect(0, GROUND_Y, CANVAS_W, CANVAS_H - GROUND_Y);

      c.fillStyle = '#3fb950';
      for(var i=0;i<this.pipes.length;i++){
        var p = this.pipes[i];
        c.fillRect(p.x, 0, PIPE_WIDTH, p.topH);
        c.fillRect(p.x, p.botY, PIPE_WIDTH, GROUND_Y - p.botY);
        c.fillStyle = '#2ea043';
        c.fillRect(p.x - 2, p.topH - 16, PIPE_WIDTH + 4, 16);
        c.fillRect(p.x - 2, p.botY, PIPE_WIDTH + 4, 16);
        c.fillStyle = '#3fb950';
      }

      c.save();
      c.translate(BIRD_X, this.birdY);
      var angle = Math.min(Math.PI/4, Math.max(-Math.PI/4, this.birdVy * 0.08));
      c.rotate(angle);
      c.fillStyle = '#fbbf24';
      c.beginPath();
      c.arc(0, 0, BIRD_RADIUS, 0, Math.PI*2);
      c.fill();
      c.fillStyle = '#fff';
      c.beginPath();
      c.arc(4, -4, 4, 0, Math.PI*2);
      c.fill();
      c.fillStyle = '#000';
      c.beginPath();
      c.arc(6, -4, 2, 0, Math.PI*2);
      c.fill();
      c.restore();
    }
  }

  global.FlappyEnv = FlappyEnv;
})(typeof window!=='undefined'?window:globalThis);
