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
   */
  constructor(oAudio, cvsContainer, height) {
    this.oAudio = oAudio;
    this.cvsContainer = cvsContainer;

    this.width = 0;
    this._height = height;

    this.waveSvg.classList.add("waveSvg");
    this.cvsContainer.appendChild(this.waveSvg);

    this.resizeWave();
    // this.drawWave();
  }



  // height
  get height() {
    return this._height;
  }
  set height(h) {
    this._height = h;
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
}


/**
 * 波形積層
 */
class OStackWave {
  margin = 120; // [px]
  waveHeight = 80; // [px]
  _samplePerPx = 16; // [sample]

  constructor(oAudio, stackWaveContainer) {
    this.oAudio = oAudio;
    this.stackWaveContainer = stackWaveContainer;

    this.createWaveStack()
    .then(() => {
      console.log("end");
    });
  }

  async createWaveStack() {
    return new Promise((resolve) => {
      // 余白なしの波形部分
      this.waveWidth = this.stackWaveContainer.clientWidth - this.margin * 2;

      // 合計何段の画像になるか
      const waveCount = Math.ceil(this.oAudio.pcmData.length / this._samplePerPx) / this.waveWidth;

      let i = 0;
      // HACK: 画像描画を別スレッドに投げる
      setInterval(() => {
        if (i >= waveCount) {
          return;
        }
        const cvsContainer = document.createElement("div");
        cvsContainer.classList.add("cvsContainer");
        this.stackWaveContainer.appendChild(cvsContainer);

        const oWave = new OWave(this.oAudio, cvsContainer, this.waveHeight);
        oWave._samplePerPx = this._samplePerPx

        oWave.leftPoint = (this.waveWidth) * oWave.samplePerPx * i;

        oWave.drawWave();

        i++;

        if (i >= waveCount) {
          resolve();
        }
      }, 0);
    });
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
    "./assets/audio/WDC_Fu_Vocal_2.wav",
    "./assets/audio/__誰より好きなのに.wav",

  ]

  oAudio = new OAudio(srcList[0]);
  await oAudio.getAudioBuffer();
  // console.log(oAudio);


  const stackWaveContainer = document.querySelector(".stackWaveContainer");
  new OStackWave(oAudio, stackWaveContainer);
})();

