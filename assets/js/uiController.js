

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

        // this.disable();
        this.addEvent();
    }
    x = 180;
    sashWidth = 4;

    
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
        ts.sash.style.backgroundColor = "#007fd4";
    }
    onMousemove(ts, e) {
        if (!ts.moveflag) return;

        ts.x = e.clientX;
        ts.move();
    }
    onMouseup(ts, e) {
        if (!ts.moveflag) return;

        ts.moveflag = false;
        ts.sash.style.backgroundColor = "";
    }

    onWindowResize(ts, e) {
        ts.sash.style.left = ts.content.clientWidth + ts.offset - (ts.sashWidth / 2) + "px";
    }
}

(() => {
    const sash_sidebar = new SashControl(document.querySelector(".sashContainer .sash_sidebar"),
        document.querySelector(".splitViewContainer .sidebar"),
        48, 180);
})();
