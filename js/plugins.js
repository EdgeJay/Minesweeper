// Avoid `console` errors in browsers that lack a console.
(function() {
    var method;
    var noop = function () {};
    var methods = [
        'assert', 'clear', 'count', 'debug', 'dir', 'dirxml', 'error',
        'exception', 'group', 'groupCollapsed', 'groupEnd', 'info', 'log',
        'markTimeline', 'profile', 'profileEnd', 'table', 'time', 'timeEnd',
        'timeStamp', 'trace', 'warn'
    ];
    var length = methods.length;
    var console = (window.console = window.console || {});

    while (length--) {
        method = methods[length];

        // Only stub undefined methods.
        if (!console[method]) {
            console[method] = noop;
        }
    }
}());

// Place any jQuery/helper plugins in here.


// Custom plugins here
function Game (selector, options) {

    this.$canvas                    = jQuery(selector);
    this.canvas                     = this.$canvas[0];
    this.ctx                        = this.canvas.getContext('2d');
    // Grid related settings
    this.cellW                      = 28;
    this.cellH                      = 28;
    this.gridW                      = 9;
    this.gridH                      = 9;
    this.mDownCellX                 = 0;
    this.mDownCellY                 = 0;
    this.$gridData                  = null;

    // Mine settings
    this.mines                      = 10;
    this.minesLeft                  = this.mines;
    this.minesDisplay               = null;

    // Timer settings
    this.timerDisplay               = null;
    this.timerPaused                = true;
    this.timeElapsed                = 0;
    this.totalDeltaTime             = 0;

    this.isRunning                  = true;
    this.isMouseDown                = false;
    this.mouseButtonType            = 0;
    this.leftRightMouseButtonDown   = false;
    this.isDragging                 = false;
    this.click                      = {};
    this.dragpos                    = {};
    this.dragPositions              = [];   // List of previously saved dragpos objects
    this.lastUpdateTimeStamp        = 0;
    // Default settings
    this.backgroundWidth            = 2000;
    this.backgroundHeight           = 2000;
    // Flags
    this.needRedraw                 = false;
    this.gameEnded                  = false;
    // Stats object for debugging
    this.stats                      = null;

    // Default action is to resize canvas to fill window
    var $body = jQuery('body');
    this.canvas.width = ($body.width() > this.backgroundWidth ? this.backgroundWidth: $body.width());
    this.canvas.height = ($body.height() > this.backgroundHeight ? this.backgroundHeight: $body.height());

    // Additional options
    if (options) {
        // If not defined, canvas will automatically fill the window
        if (options.width) { this.canvas.width = options.width; }
        if (options.height) { this.canvas.height = options.height; }

        if (options.gridW) { this.gridW = options.gridW; }
        if (options.gridH) { this.gridH = options.gridH; }

        if (options.mines) {
            this.mines = options.mines;
            this.minesLeft = this.mines;
        }
    }

    // Adjust canvas for screens like retina display
    if (window.devicePixelRatio > 1) {

        var wd = this.canvas.width;
        var ht = this.canvas.height;
        var pixelRatio = window.devicePixelRatio;

        this.canvas.width = wd * pixelRatio;
        this.canvas.height = ht * pixelRatio;
        this.ctx.scale(pixelRatio, pixelRatio);

        var $canvas = jQuery(this.canvas);
        $canvas.css({ width: wd + 'px', height: ht + 'px' });
    }
}

/**
 * Call this method to start the game
 */
Game.prototype.start = function(onStarted) {

    this.assignListeners();
    this.drawGrid();
    this.layMines();
    this.initGameLoop();
};

Game.prototype.restart = function () {

    this.$gridData.find('#container div')
    .attr('is-open', '0')
    .attr('is-revealed', '0')
    .attr('has-mine', '0')
    .attr('has-flag', '0')
    .css('border', '4px solid #ffffff')
    .css('border-right', '4px solid #696969')
    .css('border-bottom', '4px solid #696969');

    this.$gridData.find('#container div p').text('').hide();

    this.drawGrid();

    this.timerPaused = true;
    this.timeElapsed = 0;
    this.totalDeltaTime = 0;
    this.gameEnded = false;
    this.isMouseDown = false;
    this.mouseButtonType = 0;
};

Game.prototype.assignListeners = function () {
    // Assign click handlers to canvas
    this.$canvas.bind('mouseup', { game: this }, this.onCanvasMouseUp)
    .bind('mousemove', { game: this }, this.onCanvasMouseMove)
    .bind('mousedown', { game: this }, this.onCanvasMouseDown)
    .bind('selectstart', this.onCanvasSelect)
    .bind('contextmenu', this.onCanvasContextMenu);
};

Game.prototype.drawGrid = function (onComplete) {

    var that = this;

    var totalW = this.gridW * this.cellW;
    var totalH = this.gridH * this.cellH;

    var data;
    if (!this.$gridData) {
        
        data = new EJS({ url: 'js/views/grid.ejs' }).render({
            totalW: totalW,
            totalH: totalH,
            gridW: this.gridW,
            gridH: this.gridH
        });

        this.$gridData = jQuery('<div>' + data + '</div>');
        //console.log(this.$gridData.html());
        data = this.$gridData.html();
    }
    else {
        data = this.$gridData.html();
    }

    var DOMURL = self.URL || self.webkitURL || self;
    var img = new Image();
    var svg = new Blob([data], {type: "image/svg+xml;charset=utf-8"});
    var url = DOMURL.createObjectURL(svg);
    
    img.onload = function() {
        that.ctx.drawImage(img, 0, 0);
        DOMURL.revokeObjectURL(url);

        if (typeof onComplete === 'function') {
            onComplete();
        }

        that.restoreFlags();
    };
    img.src = url;
};

Game.prototype.layMines = function () {

    var i = this.mines;
    while (--i >= 0) {
        
        var cx = Math.floor(Math.random() * this.gridW);
        var cy = Math.floor(Math.random() * this.gridH);
        var hasMine = this.cellHasMine(cx, cy);

        while (hasMine) {
            cx = Math.floor(Math.random() * this.gridW);
            cy = Math.floor(Math.random() * this.gridH);
            hasMine = this.cellHasMine(cx, cy);
        }
        
        console.log('laid mine at ', cx, cy);
        
        this.setMineAt(cx, cy);
    }
};

Game.prototype.openCell = function (x, y, silent) {

    if (!this.isCellOpen(x, y)) {
        
        this.$gridData.find('[grid-x="' + x + '"][grid-y="' + y + '"]')
        .css('border', '4px solid #bdbdbd')
        .attr('is-open', '1');

        if (!silent) { this.drawGrid(); }
    }  
};

Game.prototype.closeCell = function (x, y) {
    
    if (this.isCellOpen(x, y)) {
        
        this.$gridData.find('[grid-x="' + x + '"][grid-y="' + y + '"]')
        .css('border', '4px solid #ffffff')
        .css('border-right', '4px solid #696969')
        .css('border-bottom', '4px solid #696969')
        .attr('is-open', '0');

        this.drawGrid();
    }
};

Game.prototype.revealCellAt = function (x, y) {

    if (this.isCellRevealed(x, y)) {
        return;
    }

    if (!this.cellHasMine(x, y)) {

        // Gather positions of adjacent cells
        var adjCells = [
            new Cell(x - 1, y - 1), new Cell(x, y - 1), new Cell(x + 1, y - 1),
            new Cell(x - 1, y), new Cell(x + 1, y),
            new Cell(x - 1, y + 1), new Cell(x, y + 1), new Cell(x + 1, y + 1)
        ];

        var mineCount = 0;

        var i = 0;
        while (i < adjCells.length) {

            if ((adjCells[i].x >= 0 && adjCells[i].x < this.gridW) &&
                (adjCells[i].y >= 0 && adjCells[i].y < this.gridH)) {

                if (this.cellHasMine(adjCells[i].x, adjCells[i].y)) {
                    mineCount++;
                }
            }

            i++;
        }

        console.log('mines detected: ' + mineCount);

        this.$gridData.find('[grid-x="' + x + '"][grid-y="' + y + '"]').attr('is-revealed', '1');

        // If no mines found around cell, reveal adjacent cells
        if (mineCount == 0) {

            i = 0;
            while (i < adjCells.length) {

                if ((adjCells[i].x >= 0 && adjCells[i].x < this.gridW) &&
                    (adjCells[i].y >= 0 && adjCells[i].y < this.gridH)) {

                    this.openCell(adjCells[i].x, adjCells[i].y, true);
                    this.revealCellAt(adjCells[i].x, adjCells[i].y);
                }

                i++;
            }
        }
        else {
            this.$gridData.find('[grid-x="' + x + '"][grid-y="' + y + '"] p')
            .text(mineCount)
            .show();
        }

        this.drawGrid();
    }
    else {
        
        this.$gridData.find('[grid-x="' + x + '"][grid-y="' + y + '"]').attr('is-revealed', '1');
        
        console.log('boooom!');

        this.revealAllMines();

        this.timerPaused = true;
        this.gameEnded = true;
    }
};

Game.prototype.restoreFlags = function () {

    var self = this;

    this.$gridData.find('[has-flag="1"]').each(function (idx, ele) {

        var $ele = jQuery(ele);
        
        self.toggleFlagAt($ele.attr('grid-x'), $ele.attr('grid-y'));
    });
};

Game.prototype.toggleFlagAt = function (x, y) {

    if (!this.isCellRevealed(x, y) && this.minesLeft > 0) {

        var self = this;

        if (!this.cellHasFlag(x, y)) {
            var xPos = x * this.cellW + 5;
            var yPos = y * this.cellH + 5;

            var img = new Image();   // Create new img element
            img.addEventListener("load", function() {
                
                self.ctx.drawImage(img, xPos, yPos, 18, 17);

            }, false);
            img.src = 'img/flag.png'; // Set source path

            this.minesLeft--;
            if (this.minesDisplay) {
                this.minesDisplay.text('Mines left: ' + this.minesLeft);
            }

            this.$gridData.find('[grid-x="' + x + '"][grid-y="' + y + '"]').attr('has-flag', '1');
        }
        else {
            this.$gridData.find('[grid-x="' + x + '"][grid-y="' + y + '"]').attr('has-flag', '0');
            
            this.minesLeft++;
            if (this.minesDisplay) {
                this.minesDisplay.text('Mines left: ' + this.minesLeft);
            }

            this.drawGrid();
        }
    }
};

Game.prototype.revealAllMines = function () {
    
    var self = this;

    this.$gridData.find('[has-mine="1"]').each(function (idx, ele) {
        
        var $ele = jQuery(ele);
        var xPos = Number($ele.attr('grid-x'));
        var yPos = Number($ele.attr('grid-y'));

        self.openCell(xPos, yPos, true);
    })

    this.drawGrid(function () {

        self.$gridData.find('[has-mine="1"]').each(function (idx, ele) {
        
            var $ele = jQuery(ele);
            var xPos = Number($ele.attr('grid-x'));
            var yPos = Number($ele.attr('grid-y'));

            self.drawBombAt(xPos, yPos);
        });
    });
};

Game.prototype.drawBombAt = function (x, y) {

    var self = this;

    var xPos = x * this.cellW + 5;
    var yPos = y * this.cellH + 5;

    var img = new Image();   // Create new img element
    img.addEventListener("load", function() {
        
        self.ctx.drawImage(img, xPos, yPos, 18, 15);

    }, false);
    img.src = 'img/bomb.png'; // Set source path
};

Game.prototype.isCellOpen = function (x, y) {
    return (this.$gridData.find('[grid-x="' + x + '"][grid-y="' + y + '"]').attr('is-open') == '1');
};

Game.prototype.isCellRevealed = function (x, y) {
    return (this.$gridData.find('[grid-x="' + x + '"][grid-y="' + y + '"]').attr('is-revealed') == '1');
};

Game.prototype.cellHasMine = function (x, y) {
    return (this.$gridData.find('[grid-x="' + x + '"][grid-y="' + y + '"]').attr('has-mine') == '1');
};

Game.prototype.setMineAt = function (x, y) {
    this.$gridData.find('[grid-x="' + x + '"][grid-y="' + y + '"]')
    .attr('has-mine', '1');
};

Game.prototype.cellHasFlag = function (x, y) {
    return (this.$gridData.find('[grid-x="' + x + '"][grid-y="' + y + '"]').attr('has-flag') == '1');
};

/**
 * Call this method to initialize game loop
 */
Game.prototype.initGameLoop = function () {

    var self = this;

    (function gameLoop() {
        
        var now = Date.now();
        self.deltaTime = now - self.lastUpdateTimeStamp;
        self.lastUpdateTimeStamp = now;

        if (self.isRunning == true) {

            if (self.stats) { self.stats.begin(); }

            self.update();
            self.draw();
            self.click = null;

            if (self.stats) { self.stats.end(); }
        }

        requestAnimFrame(gameLoop, self.canvas);
    })();
};

Game.prototype.update = function() {
    
    if (!this.timerPaused) {

        this.totalDeltaTime += this.deltaTime;
        if (this.totalDeltaTime >= 1000) {
            this.timeElapsed++;
            this.totalDeltaTime = 0;

            if (this.timerDisplay) {
                this.timerDisplay.text('Time Elapsed: ' + this.timeElapsed);
            }
        }
    }
};

Game.prototype.draw = function() {
    
    // draw here to canvas
    

    
    if (this.needRedraw) {

        this.clearCanvas();

        // Redraw assets here


        this.needRedraw = false;
    }
};

Game.prototype.onCanvasMouseDown = function (evt) {
    
    if (!evt.data.game.gameEnded) {

        if (evt.data.game.mouseButtonType != 0) {
            evt.data.game.leftRightMouseButtonDown = true;
        }

        evt.data.game.isMouseDown = true;
        evt.data.game.mouseButtonType = evt.which;
        evt.data.game.mDownCellX = Math.floor(evt.pageX / evt.data.game.cellW);
        evt.data.game.mDownCellY = Math.floor(evt.pageY / evt.data.game.cellH);
        
        // Left mouse click
        if (evt.which == 1) {
            evt.data.game.openCell(evt.data.game.mDownCellX, evt.data.game.mDownCellY);
        }
        // Right mouse click
        else if (evt.which == 3) {

        }
    }
};

Game.prototype.onCanvasMouseMove = function (evt) {
    
    if (!evt.data.game.gameEnded) {
        
        if (evt.data.game.isMouseDown && evt.data.game.mouseButtonType == 1) {
            
            var mx = Math.floor(evt.pageX / evt.data.game.cellW);
            var my = Math.floor(evt.pageY / evt.data.game.cellH);

            if (mx != evt.data.game.mDownCellX || my != evt.data.game.mDownCellY) {
                
                evt.data.game.closeCell(evt.data.game.mDownCellX, evt.data.game.mDownCellY);
                evt.data.game.openCell(mx, my);

                evt.data.game.mDownCellX = mx;
                evt.data.game.mDownCellY = my;
            }
        }
    }
};

Game.prototype.onCanvasMouseUp = function (evt) {

    if (!evt.data.game.gameEnded) {

        evt.data.game.timerPaused = false;
        evt.data.game.isMouseDown = false;
        
        var cx = Math.floor(evt.pageX / evt.data.game.cellW);
        var cy = Math.floor(evt.pageY / evt.data.game.cellH);

        if (evt.data.game.mouseButtonType == 1) {
            evt.data.game.revealCellAt(cx, cy);
        }
        else if (evt.data.game.mouseButtonType == 3) {
            evt.data.game.toggleFlagAt(cx, cy);
        }

        evt.data.game.mouseButtonType = 0;
        evt.data.game.leftRightMouseButtonDown = false;
    }
};

Game.prototype.onCanvasSelect = function (evt) {
    evt.preventDefault();
};

Game.prototype.onCanvasContextMenu = function (evt) {
    return false;
};

/**
 * Calling this method will enable Mr Doob's stats plugin
 */
Game.prototype.enableStats = function () {

    this.stats = new Stats();
    this.stats.setMode(0); // 0: fps, 1: ms
    // Align top-left
    this.stats.domElement.style.position    = 'absolute';
    this.stats.domElement.style.right       = '0px';
    this.stats.domElement.style.top         = '0px';

    document.body.appendChild(this.stats.domElement);
};

/* ===============
 * Helper classes
 * =============== */
function Cell (x, y) {
    this.x = x;
    this.y = y;
    this.open = false;
}
