/**
 * 音声全般処理部
 */
class OAudio {
  isPlaying = false;

  timer_play; // 再生位置 再描画用のタイマー

  playStartSec = 0;

  /**
   * @param {string} audioPath 音声ファイルのパス
   */
  constructor(audioPath) {
    this.aCtx = new (window.AudioContext || window.webkitAudioContext)();
    this.audioPath = audioPath;

    this.createAudioElement();

    this.addEvent();
  }



  /* ==== メソッド ==== */

  /**
   * 音声ファイルからオーディオバッファーを作成
   */
  async getAudioBuffer() {
    const response = await fetch(this.audioPath);
    const arrayBuffer = await response.arrayBuffer();
    this.audioBuffer = await this.aCtx.decodeAudioData(arrayBuffer);
    this.sampleRate = this.audioBuffer.sampleRate;
    this.pcmData = this.audioBuffer.getChannelData(0);

    // this.sourceNode.buffer = this.audioBuffer;
  }

  /**
   * audio要素の作成
   */
  createAudioElement() {
    this.audioElement = document.createElement("audio");
    this.audioElement.src = this.audioPath;

    this.passAudioContext();
  }

  /**
   * audio要素をAudioContextに接続
   */
  passAudioContext() {
    this.track = this.aCtx.createMediaElementSource(this.audioElement);
    this.track.connect(this.aCtx.destination);
    // console.log("this.track", this.track);
  }

  /**
   * 音声再生、停止の切り替え
   */
  controlAudio() {
    if (this.isPlaying) {
      this.stopAudio();
      this.isPlaying = false;
    }
    else {
      this.playAudio();
      this.isPlaying = true;
    }
  }

  /**
   * 音声の再生, 再生位置の再描画指示
   * @param {number} startSec 再生開始秒数
   * @param {number} endSec 再生停止秒数
   */
  playAudio(startSec = -1, endSec = -1) {
    if (startSec == -1) { // 引数startSec未指定の場合、グローバル変数から再生
      this.audioElement.currentTime = this.playStartSec;
      console.log(this.playStartSec);
    }
    else { // 引数startSec指定の場合、その秒数から。グローバル変数にも代入
      this.audioElement.currentTime = startSec;
      this.playStartSec = startSec;
    }

    // 再生
    this.audioElement.play();

    // 再生位置縦線の再描画, 指定秒数で停止
    this.timer_play = setInterval(() => {
      // 引数endSecが指定されている場合、その秒数で停止
      if (endSec != -1 && this.audioElement.currentTime >= endSec) {
        this.stopAudio();
        this.isPlaying = false;
      }

      const sPoint = this.audioElement.currentTime * this.sampleRate; // 現在の再生フレーム位置
      OCanvas.synchronizePlayPoint(sPoint); // 再描画
    }, 1000 / 60);
  }

  /**
   * 音声の停止, 再生位置を開始位置に戻す
   */
  stopAudio() {
    this.audioElement.pause();
    clearInterval(this.timer_play);

    const sPoint = this.playStartSec * this.sampleRate;
    OCanvas.synchronizePlayPoint(sPoint);
  }


  /* ==== イベント ==== */

  /**
   * イベント作成
   */
  addEvent() {
    document.addEventListener("keypress", (e) => {
      const keyCode = e.code;

      if (keyCode == "Space") {
        this.onPressSpace(this, e);
      }
    }, false);
  }

  /**
   * スペースkey押下時
   * @param {this} ts 
   * @param {event} e 
   */
  onPressSpace(ts, e) {
    ts.controlAudio();
  }
}


/**
 * 音声解析
 */
class OAnalyzer {
  constructor() {

  }

}


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
  playLineColor = "#000000";

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

    this.waveSvg.id = "waveSvg";
    this.cvsContainer.appendChild(this.waveSvg);

    this.playSvg.id = "playSvg";
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
    this.resizeCanvas();
    this.drawWave();
  }

  // samplePerPx
  get samplePerPx() {
    return this._samplePerPx;
  }
  set samplePerPx(s) {
    this._samplePerPx = s;
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

  /**
   * canvasの内容を消す
   * key が無記入の場合、再起呼び出しで全部クリア
   * @param {string} key レイヤ識別キー
   */
  clearCanvas(key = "") {
    // key が無記入の場合、再起呼び出しで全部クリア
    if (key === "") {
      for (let k in this.cvsList) {
        this.clearCanvas(k);
      }
      return;
    }

    this.cvsList[key].ctx.clearRect(0, 0, this.cvsList[key].cvs.width, this.cvsList[key].cvs.height);
    this.cvsList[key].ctx.beginPath();
  }

  /**
   * 音声波形の描画
   */
  // createWaveLine() {
  //   const lim = window.innerWidth - this.waveSvg.childElementCount;

  //   console.log("window.innerWidth", window.innerWidth);
  //   console.log("this.waveSvg.childElementCount", this.waveSvg.childElementCount);
  //   console.log("lim", lim);

  //   for (let i = 0; i < lim; i++) {
  //     const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  //     this.waveSvg.appendChild(line);
  //   }
  // }
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

      line.setAttribute('x1', e.x);
      line.setAttribute('y1', e.ys);
      line.setAttribute('x2', e.x);
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


/**
 * 静的メソッド群
 */
class OUtility {
  /**
   * HSVをRGBに変換
   * @param {number} h 色相
   * @param {number} s 彩度
   * @param {number} v 明度
   * @returns 
   */
  static hsv2rgb(h, s = 0.7, v = 1) {
    // 引数処理
    h = (h < 0 ? h % 360 + 360 : h) % 360 / 60;
    s = s < 0 ? 0 : s > 1 ? 1 : s;
    v = v < 0 ? 0 : v > 1 ? 1 : v;

    // HSV to RGB 変換
    const c = [5, 3, 1].map(function (i) {
      return Math.round((v - Math.max(0, Math.min(1, 2 - Math.abs(2 - (h + i) % 6))) * s * v) * 255);
    });

    // 戻り値
    return {
      hex: '#' + (('00000' + (c[0] << 16 | c[1] << 8 | c[2]).toString(16)).slice(-6)),
      rgb: c, r: c[0], g: c[1], b: c[2],
    };
  }
}


/**
 * メイン実行部
 */
let oAudio;
(async () => {
  const srcList = [
    "./assets/audio/off.wav",
    "./assets/audio/WDC_Fu_Vocal_2.wav",
    "./assets/audio/sel.wav",
    "./assets/audio/sample.wav",
  ]

  oAudio = new OAudio(srcList[1]);
  await oAudio.getAudioBuffer();
  // console.log(oAudio);

  const cvsOverContainer = document.getElementById("overviewContainer");
  const oCanvas_over = new OCanvas(oAudio, cvsOverContainer, 60, "over");

  const cvsZoomContainer = document.getElementById("zoomviewContainer");
  const oCanvas_zoom = new OCanvas(oAudio, cvsZoomContainer, 320);

  console.log(oCanvasList);

  // console.log(oAudio.pcmData);
  // const array =  Array.prototype.slice.call(oAudio.pcmData);
  // const t = await window.electronAPI.analyzeTest(JSON.stringify(array));
  // console.log(JSON.parse(t));

  // setTimeout(() => {
  //   OAnalyzer.analyzeAudio("/Users/yec2020/Desktop/development/Electron/onso_DB/src/assets/audio/WDC_Fu_Vocal_2.wav");
  // }, 1000);


  const input_audioFile = document.getElementById("input_audioFile");

  // input_audioFile.addEventListener("change", () => {
  //   const data = new Uint8Array(input_audioFile.result);

  //   g['FS_createDataFile']('/', 'filename', data, true, true, true)
  //   // FS




  //   // console.log(input_audioFile.files);
  //   // console.log(filePath);

  //   // window.electronAPI.analyzeTest(filePath);

  //   // OAnalyzer.analyzeAudio(filePath);

  // }, false);
})();

