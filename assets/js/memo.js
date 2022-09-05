/**
 * キャンバス部
 */
 const oCanvasList = [];
 class OCanvas {
   mode = "zoom";
 
   leftPoint = 0;
   _samplePerPx = 128;
 
   cvsList = {}; // canvasは複数枚重ねるため、連想配列に格納しておく
 
   waveSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
   waveStep = 1;
   waveLineWidth = 1;
   waveBlockSize = 256;
 
   playSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
   playLineSvg = document.createElementNS('http://www.w3.org/2000/svg', 'line');
   _playSvgPoint = -1;
   _playSamplePoint = 0;
   playLineWidth = 1;
   playLineColor = "#ffffff";
 
   /**
    * @param {OAudio} oAudio 描画したい音声でインスタンス化されたOAudio
    * @param {document} canvasContainer canvasを格納するコンテナ
    * @param {number} height canvasの高さ
    */
   constructor(oAudio, canvasContainer, height, mode = "zoom") {
     oCanvasList.push(this);
 
     this.oAudio = oAudio;
     this.cvsContainer = canvasContainer;
 
     this.width = 0;
     this._height = height;
 
     this.waveSvg.classList.add("waveSvg");
     this.cvsContainer.appendChild(this.waveSvg);
 
     this.playSvg.classList.add("playSvg");
     this.cvsContainer.appendChild(this.playSvg);
 
     this.playLineSvg.id = "playLineSvg";
     this.playSvg.appendChild(this.playLineSvg);
 
     this.createNewCanvas("select");
     // this.createNewCanvas("line");
 
     this.mode = mode;
     if (this.mode == "over") {
       this._samplePerPx = Math.min(Math.ceil(this.oAudio.pcmData.length / window.innerWidth), 2048);
     }
 
     this.resizeCanvas();
 
     // this.createWaveLine();
     this.drawWave();
 
     this.addEvent();
   }
 
 
 
   /* ==== get/set ==== */
 
   // height
   get height() {
     return this._height;
   }
   set height(h) {
     this._height = h;
     this.clearSvg();
     this.resizeCanvas();
     this.drawWave();
   }
 
   // samplePerPx
   get samplePerPx() {
     return this._samplePerPx;
   }
   set samplePerPx(s) {
     this._samplePerPx = s;
     this.clearSvg();
     this.resizeCanvas();
     this.drawWave();
   }
 
   // playSvgPoint
   get playSvgPoint() {
     return this._playSvgPoint;
   }
   set playSvgPoint(x) {
     this._playSvgPoint = x;
     OCanvas.synchronizePlayPoint(x * this._samplePerPx);
   }
 
   // playSamplePoint
   get playSamplePoint() {
     return this._playSamplePoint;
   }
   set playSamplePoint(p) {
     this._playSamplePoint = p;
     OCanvas.synchronizePlayPoint(p);
   }
 
 
 
   /* ==== メソッド ==== */
 
   /**
    * 新しいcanvasを作成しコンテナに追加
    * キャンバスをレイヤさせるために連想配列に格納
    * @param {string} key レイヤ識別キー
    */
   createNewCanvas(key) {
     const cvs = document.createElement("canvas");
     cvs.classList.add("cvs_" + key); // 必要ないかも
 
     this.cvsList[key] = {
       "cvs": cvs,
       "ctx": cvs.getContext('2d'),
     };
 
     this.cvsContainer.appendChild(cvs);
   }
 
   /**
    * canvasのサイズを指定
    */
   resizeCanvas() {
     this.clacCvsSize();
 
     const svgs = [
       this.waveSvg,
       this.playSvg,
     ]
     // this.waveSvg.setAttribute("width", window.innerWidth);
     // this.waveSvg.setAttribute("viewbox", `0 0 ${window.innerWidth} ${this.height}`);
 
 
 
     for (let s of svgs) {
       s.setAttribute("width", this.width);
       s.setAttribute("height", this.height);
       s.setAttribute("viewbox", `0 0 ${this.width} ${this.height}`);
     }
 
 
     for (let key in this.cvsList) {
       this.cvsList[key].cvs.width = this.width;
       this.cvsList[key].cvs.height = this._height;
     }
   }
 
   /**
    * 音声データのサイズからwidthを計算
    */
   clacCvsSize() {
     this.width = Math.ceil(this.oAudio.pcmData.length / this._samplePerPx);
   }
 
   clearSvg() {
     this.waveSvg.innerHTML = null;
   }
 
   /**
    * 音声波形の描画
    */
   drawWave() {
     this.resizeCanvas();
 
     const paramList = this.drawWave_clacPram();
     this.drawWave_pushSvg(paramList);
 
     // this.setWaveColor();
   }
   drawWave_clacPram() {
     const paramList = [];
     /**
      * i がLengthの外に出るか、x がcanvasの外に出るまでループ
      * 
      * i オーディオバッファ呼び出し用index
      * x 描画時のx座標
      */
     let x = 0;
     let i = this.leftPoint;
 
     while (true) {
       if (i >= this.oAudio.pcmData.length) break;
       // if (x > this.width) break;
 
       const newD = this.oAudio.pcmData.slice(i, i + this._samplePerPx * this.waveStep);
       const max = Math.max(...newD);
       const min = Math.min(...newD);
 
       let ys = max * this._height / 2 + this._height / 2;
       let ye = min * this._height / 2 + this._height / 2;
 
       if (ys - ye < 1) {
         ys = 0.25 + this._height / 2;
         ye = -0.25 + this._height / 2;
       }
 
       paramList.push(
         {
           "x": x,
           "ys": ys,
           "ye": ye,
           "i": i,
           "max": max,
           "min": min,
         }
       );
 
 
       i += this._samplePerPx * this.waveStep;
       x += this.waveStep;
     }
 
     return paramList;
   }
   drawWave_pushSvg(paramList) {
     // const lines = Array.from(this.waveSvg.querySelectorAll("line"));
 
     paramList.forEach((e, i) => {
       // const e = paramList[i];
       // if (e == undefined) return;
 
       const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
 
       line.setAttribute('x1', e.x + 0.5);
       line.setAttribute('y1', e.ys);
       line.setAttribute('x2', e.x + 0.5);
       line.setAttribute('y2', e.ye);
       line.setAttribute('stroke', OUtility.hsv2rgb(180).hex);
       line.setAttribute('stroke-width', this.waveLineWidth);
 
       line.dataset.index = e.i + " " + (e.i + this._samplePerPx * this.waveStep);
       line.dataset.wBlockIndex = e.wBlockIndex;
       line.dataset.max = e.max;
       line.dataset.min = e.min;
 
       this.waveSvg.appendChild(line);
     });
   }
 
   /**
    * 波形の色変更
    */
   async setWaveColor() {
     const lines = Array.from(this.waveSvg.querySelectorAll("line"));
 
     lines.forEach((line, i) => {
       const h = Math.min((Math.abs(line.dataset.max) + Math.abs(line.dataset.min)) * 2, 1) * -240 + 240;
       line.setAttribute('stroke', OUtility.hsv2rgb(h).hex);
     });
 
     // const response = await fetch("assets/sample.lab");
     // const text = await response.text();
     // const timestamp = text.split(/\r\n|\n|\r/).map(e => e.split(" "));
     // console.log(timestamp);
 
     // timestamp.forEach((t, i) => {
     //   const s = t[0] * this.oAudio.sampleRate / this._samplePerPx;
     //   const e = t[1] * this.oAudio.sampleRate / this._samplePerPx;
     //   console.log("s", s, "e", e);
     //   console.log(this.oAudio.sampleRate);
     //   lines.slice(s, e).map(e => e.setAttribute('stroke', OUtility.hsv2rgb(i*60).hex));
     // });
   }
 
   movePlayPoint(x = -1) {
     this._playSamplePoint = x * this._samplePerPx;
 
     this.oAudio.playStartSec = this._playSamplePoint / this.oAudio.sampleRate;
 
     OCanvas.synchronizePlayPoint(this._playSamplePoint);
     OCanvas.scrollCenter(this);
   }
 
   /**
    * 
    * @param {number} sp playSamplePoint
    */
   static synchronizePlayPoint(sp = -1) {
     oCanvasList.map(e => {
       if (sp != -1) {
         e._playSamplePoint = sp;
         e._playSvgPoint = sp / e._samplePerPx;
       }
 
       e.playLineSvg.setAttribute('x1', e._playSvgPoint);
       e.playLineSvg.setAttribute('y1', 0);
       e.playLineSvg.setAttribute('x2', e._playSvgPoint);
       e.playLineSvg.setAttribute('y2', e._height);
       e.playLineSvg.setAttribute('stroke', e.playLineColor);
       e.playLineSvg.setAttribute('stroke-width', e.playLineWidth);
     });
   }
 
   static scrollCenter(me = null) {
     oCanvasList.map(e => {
       if (me == e) return;
 
       const p = e._playSvgPoint - (window.innerWidth / 2);
       e.cvsContainer.scrollTo(p, 0);
     });
   }
 
 
   /* ==== イベント ==== */
 
   isMouseDown = false;
 
   addEvent() {
     this.cvsContainer.addEventListener("scroll", (e) => { this.onScroll(this, e) }, false);
 
     this.cvsContainer.addEventListener("mousedown", (e) => { this.onMouesDown(this, e) }, false);
     this.cvsContainer.addEventListener("mousemove", (e) => { this.onMouesMove(this, e) }, false);
     this.cvsContainer.addEventListener("mouseup", (e) => { this.onMouesUp(this, e) }, false);
   }
 
   onScroll(ts, e) {
     // ts.leftPoint = ts.cvsContainer.scrollLeft * ts._samplePerPx;
 
     // console.log(ts.leftPoint);
 
     // ts.drawWave();
   }
 
   onMouesDown(ts, e) {
     ts.isMouseDown = true;
 
     ts.movePlayPoint(e.offsetX);
 
     if (ts.oAudio.isPlaying) {
       ts.oAudio.isPlaying = false;
       ts.oAudio.stopAudio();
     }
   }
 
   onMouesMove(ts, e) {
     if (!ts.isMouseDown) return;
 
     ts.movePlayPoint(e.offsetX);
   }
 
   onMouesUp(ts, e) {
     ts.isMouseDown = false;
   }
 }