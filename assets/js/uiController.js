/**
 * 指定した要素のサイズを変更できるサッシを操作するクラス
 */
class SashControl {
    /**
     * @param {document} sash サッシ要素
     * @param {document} content 動かしたいコンテナ要素
     * @param {number} offset コンテナ横の余白
     * @param {number} limit コンテナの最低サイズ
     */
    constructor(sash, content, offset, limit) {
        this.sash = sash;
        this.content = content;

        this.offset = offset;
        this.limit = limit;

        // リサイズ時にデザインが崩れないようにするためのスペーサー
        this.spacerElement = document.createElement("div");
        this.spacerElement.style.width = this.content.style.width;
        this.spacerElement.style.backgroundColor = window.getComputedStyle(this.content, null).getPropertyValue('background-color');

        // this.disable();
        this.addEvent();
    }

    x = 0;
    sashWidth = 4;
    sashColor = "#007fd4";
    
    enable() {
        this.content.style.display = "";
        // this.content.style.width = this.limit + "px";
        this.sash.style.left = this.content.clientWidth + this.offset - (this.sashWidth / 2) + "px";
    }
    disable() {
        this.content.style.display = "none";
        // this.content.style.width = this.limit + "px";
        this.sash.style.left = this.offset - (this.sashWidth / 2) + "px";
    }

    move() {
        if (this.x >= this.limit + this.offset) {
            this.content.style.display = "";
            this.content.style.width = this.x - this.offset + "px";
            // this.content.style.width = this.content.clientWidth + "px";
            this.sash.style.left = this.content.clientWidth + this.offset - (this.sashWidth / 2) + "px";
        }
        else if (this.x < (this.limit / 2) + this.offset) {
            this.disable();
        }
    }


    addEvent() {
        this.sash.addEventListener("mousedown", (e) => { this.onMousedown(this, e) }, false);
        document.addEventListener("mousemove", (e) => { this.onMousemove(this, e) }, false);
        document.addEventListener("mouseup", (e) => { this.onMouseup(this, e) }, false);

        window.addEventListener('resize', (e) => { this.onWindowResize(this, e) }, false);
    }

    moveflag = false;
    onMousedown(ts, e) {
        ts.moveflag = true;

        // ホバー時スタイルの恒常化
        document.body.style.cursor = "e-resize";
        ts.sash.style.backgroundColor = ts.sashColor;

        // リアルタイムでリサイズすると重いので、positionをabsolute状態でリサイズ
        ts.content.style.position = "absolute";
        ts.content.style.zIndex = "10";
        ts.content.style.left = ts.offset + "px";

        // spacerElementサイズ更新
        ts.spacerElement.style.width = ts.content.style.width;
        ts.spacerElement.style.display = ts.content.style.display;

        // spacerElement挿入
        ts.content.after(ts.spacerElement);
    }
    onMousemove(ts, e) {
        if (!ts.moveflag) return;

        ts.x = e.clientX;
        ts.move();
    }
    onMouseup(ts, e) {
        if (!ts.moveflag) return;

        ts.moveflag = false;

        // ホバー時スタイルの恒常化 解除
        ts.sash.style.backgroundColor = null;
        document.body.style.cursor = null;

        // absolute 解除
        ts.content.style.position = null;
        ts.content.style.zIndex = null;
        ts.content.style.left = null;

        // spacerElement削除
        ts.spacerElement.parentNode.removeChild(ts.spacerElement);
    }

    onWindowResize(ts, e) {
        ts.sash.style.left = ts.content.clientWidth + ts.offset - (ts.sashWidth / 2) + "px";
    }
}

(() => {
    const sash_sidebar = new SashControl(document.querySelector(".sashContainer .sash_sidebar"),
        document.querySelector(".splitViewContainer .sidebar"),
        48, 180);
    
    console.log(sash_sidebar);
})();
