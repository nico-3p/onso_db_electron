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
    clearInterval(this.timer_play);
    this.timer_play = setInterval(() => {
      // 引数endSecが指定されている場合、その秒数で停止
      if (endSec != -1 && this.audioElement.currentTime >= endSec) {
        this.stopAudio();
        this.isPlaying = false;
      }

      // const sPoint = this.audioElement.currentTime * this.sampleRate; // 現在の再生フレーム位置
      // OCanvas.synchronizePlayPoint(sPoint); // 再描画
    }, 1000 / 60);
  }

  /**
   * 音声の停止, 再生位置を開始位置に戻す
   */
  stopAudio() {
    this.audioElement.pause();
    clearInterval(this.timer_play);

    // const sPoint = this.playStartSec * this.sampleRate;
    // OCanvas.synchronizePlayPoint(sPoint);
  }


  /* ==== イベント ==== */

  /**
   * イベント作成
   */
  addEvent() {

    // そもそもクラス内でキー押下時のイベントを作成するのは間違っている
    // document.addEventListener("keypress", (e) => {
    //   const keyCode = e.code;

    //   if (keyCode == "Space") {
    //     this.onPressSpace(this, e);
    //   }
    // }, false);
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
 * 波形描画
 */
class OWave {

  leftPoint = 0;
  _samplePerPx = 128;

  waveSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  waveStep = 1;
  waveLineWidth = 1;

  /**
   * @param {OAudio} oAudio 描画したい音声でインスタンス化されたOAudio
   * @param {document} cvsContainer canvasを格納するコンテナ
   * @param {number} height canvasの高さ
   * @param {number} lineIndex 何行目か
   */
  constructor(oAudio, cvsContainer, height, width = 0, lineIndex = 0) {
    this.oAudio = oAudio;
    this.cvsContainer = cvsContainer;

    this.width = width;
    this._height = height;

    this.lineIndex = lineIndex;

    this.waveSvg.style.height = height;
    this.waveSvg.classList.add("waveSvg");
    this.cvsContainer.appendChild(this.waveSvg);


    this.addEvent();

    if (this.width === 0) {
      this.resizeWave();
    }
    // this.drawWave();
  }



  // height
  get height() {
    return this._height;
  }
  set height(h) {
    this._height = h;
    this.waveSvg.height = this._height;
    this.clearWave();
    this.resizeWave();
    this.drawWave();
  }

  // samplePerPx
  get samplePerPx() {
    return this._samplePerPx;
  }
  set samplePerPx(s) {
    this._samplePerPx = s;
    this.clearWave();
    this.resizeWave();
    this.drawWave();
  }

  /**
   * イベント作成
   */
  addEvent() {
    /**
     * 範囲選択系
     */
    this.cvsContainer.addEventListener("mousedown", (e) => {
      const ox = e.offsetX;
      const oy = e.offsetY;
      console.log("x: " + ox + "\ty: " + oy + "\ti: " + this.lineIndex);

      const oc = new OCanvas(this.cvsContainer, this.lineIndex);
      console.log(oc);
      oc.createLine();
    }), false;
  }



  /**
   * 波形の削除
   */
  clearWave() {
    this.waveSvg.innerHTML = null;
  }

  /**
   * 波形コンテナのリサイズ
   */
  resizeWave() {
    this.clacCvsSize();

    // this.waveSvg.setAttribute("width", this.width);
    this.waveSvg.setAttribute("height", this.height);
    // this.waveSvg.setAttribute("viewbox", `0 0 ${this.width} ${this.height}`);
  }

  /**
   * 音声データのサイズからwidthを計算
   */
  clacCvsSize() {
    // this.width = Math.ceil(this.oAudio.pcmData.length / this._samplePerPx);
    this.width = this.cvsContainer.clientWidth;
  }

  /**
   * 音声波形の描画
   */
  drawWave() {
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
      if (x > this.width) break;

      const newD = this.oAudio.pcmData.slice(i, i + this._samplePerPx * this.waveStep);
      const max = Math.max(...newD);
      const min = Math.min(...newD);

      let ys = -1 * max * this._height / 2 + this._height / 2;
      let ye = -1 * min * this._height / 2 + this._height / 2;

      if (ye - ys < 1) {
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

    const fragment = document.createDocumentFragment();

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

      fragment.appendChild(line);
    });

    this.waveSvg.appendChild(fragment);
  }
}


/**
 * 図形描画
 */
class OCanvas {
  constructor(cvsContainer, lineIndex) {
    this.cvsContainer = cvsContainer;
    this.lineIndex = lineIndex;

    this.createContainer();
  }

  /**
   * クラスを削除する際に使用してください
   */
  destructor() {

  }


  createContainer() {
    this.shapeContainer = document.createElement("div");
    this.shapeContainer.classList.add("shapeContainer");

    this.cvsContainer.appendChild(this.shapeContainer);
  }

  /**
   * 範囲選択用の矩形Elementの作成
   * @returns 矩形Element
   */
  createShapeElem() {
    const elm = document.createElement("div");
    elm.classList.add("selectShape");

    return elm;
  }

  createLine() {
    this.shapeElem = this.createShapeElem();

    this.shapeContainer.appendChild(this.shapeElem);
  }
}


/**
 * 波形積層
 */
class OStackWave {
  horizontalMargin = 120; // 左右の余白 [px]

  upperHeight = 16; // 上余白コンテナの縦幅 [px]

  waveHeight = 70; // 波形の縦幅 [px]
  waveMargin = 0; // 波形の上下方向の余白 [px]

  _samplePerPx = 128; // 1px毎に何サンプル入っているか [sample]

  drawingRowsRange = 50 // 一度に描画する行数

  oWaveList = [];

  constructor(oAudio, stackWaveContainer) {
    this.oAudio = oAudio;
    this.stackWaveContainer = stackWaveContainer;

    this.addEvent();

    this.createWaveStack()
    .then(() => {
      console.log("end");
    });
  }


  // == get/set== //

  // samplePerPx
  get samplePerPx() {
    return this._samplePerPx;
  }
  set samplePerPx(s) {
    this._samplePerPx = s;
    this.resizeWave();
  }


  // == メソッド == //

  addEvent() {
    // リサイズ用
    (() => {
      let timer = 0;

      const observer = new ResizeObserver((entries) => {
        if (timer > 0) {
          clearTimeout(timer);
        }
       
        timer = setTimeout(() => {
          this.resizeWave();
        }, 100);
      });
      observer.observe(this.stackWaveContainer, {
        attriblutes: true,
        attributeFilter: ["style"]
      });
    })();
  }



  createWaveStack() {
    // NOTE: 同期処理の最適解が見つからない...
    return new Promise((resolve) => {
      // 余白なしの波形部分
      this.waveWidth = this.stackWaveContainer.clientWidth - this.horizontalMargin * 2;

      // 合計何段の画像になるか
      const waveCount = Math.ceil(this.oAudio.pcmData.length / this._samplePerPx) / this.waveWidth;


      const footProg = document.getElementById("footProg");
      footProg.max = waveCount;
      const footMsg = document.getElementById("footMsg");


      // const fragment = document.createDocumentFragment();

      for (let i = 0; i < waveCount; i++) {
        setTimeout(() => {
          // 各行のコンテナ作成
          const rowContainer = document.createElement("div");
          rowContainer.classList.add("rowContainer");
      
          // 上余白コンテナ作成
          const upperContainer = document.createElement("div");
          upperContainer.classList.add("upperContainer");
      
          upperContainer.style.height = this.upperHeight + "px";
          
          // oWaveを入れるコンテナ作成
          const cvsContainer = document.createElement("div");
          cvsContainer.classList.add("cvsContainer");
      
          cvsContainer.style.height = this.waveHeight + "px";
          cvsContainer.style.margin = this.waveMargin + "px 0";
      
          // oWave作成
          this.createWave(cvsContainer, i);
      
      
          rowContainer.appendChild(upperContainer);
          rowContainer.appendChild(cvsContainer);
          // fragment.appendChild(rowContainer);
          this.stackWaveContainer.appendChild(rowContainer);
      
          footMsg.textContent = (i / waveCount * 100 | 0) + "%";
          console.log(i);
          footProg.value = i;

          if(i >= waveCount-1) {
            footMsg.textContent = "完了";
            footProg.value = waveCount;
            // this.stackWaveContainer.appendChild(fragment);
            resolve();          
          }
        }, 0);
      }
    });
  }

  createWave(cvsContainer, stackIndex) {
    const oWave = new OWave(this.oAudio, cvsContainer, this.waveHeight, this.stackWaveContainer.clientWidth, stackIndex);
    oWave._samplePerPx = this._samplePerPx;
    oWave.leftPoint = (this.waveWidth) * oWave.samplePerPx * stackIndex;
    oWave.drawWave();

    this.oWaveList[stackIndex] = oWave;
  }

  resizeWave() {
    // this.createWaveStack(false);
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
let oAudio, oStackWave;
(async () => {
  const srcList = [
    "./assets/audio/WDC_Fu_Vocal_2.wav",
    "./assets/audio/__誰より好きなのに.wav",
    "./assets/audio/_Happy Funny Lucky_真乃.wav",
    "./assets/audio/仮_虹になれ_サビ01.wav",
    "./assets/audio/01.wav",
  ]

  oAudio = new OAudio(srcList[0]);
  await oAudio.getAudioBuffer();
  console.log(oAudio);


  const stackWaveContainer = document.querySelector(".stackWaveContainer");
  oStackWave = new OStackWave(oAudio, stackWaveContainer);
  console.log(oStackWave);
})();