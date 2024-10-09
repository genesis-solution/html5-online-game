/**
 * Minimax (+Alpha-Beta) Implementation 
 * @plain javascript version
 */
function Game(_rows, _columns, _depth) {
    this.rows = _rows; // Height
    this.columns = _columns; // Width
    this.status = 0; // 0: running, 1: won, 2: lost, 3: tie
    this.depth = _depth; // Search depth
    this.score = 100000, // Win/loss score
    this.round = 0; // 0: Human, 1: Computer
    this.winning_array = []; // Winning (chips) array
    this.iterations = 0; // Iteration count
    
    that = this;

    that.init(this.round);
}

Game.prototype.init = function(_round) {
    // Generate 'real' board
    // Create 2-dimensional array
    var game_board = new Array(that.rows);
    for (var i = 0; i < game_board.length; i++) {
        game_board[i] = new Array(that.columns);

        for (var j = 0; j < game_board[i].length; j++) {
            game_board[i][j] = null;
        }
    }

    // Create from board object (see board.js)
    this.board = new Board(this, game_board, _round);
}

/**
 * On-click event
 */

Game.prototype.place = function(column) {
    // If not finished
    if (that.board.score() != that.score && that.board.score() != -that.score && !that.board.isFull()) {

        if (!that.board.place(column)) {
            return alert("Invalid move!");
        }

        that.updateStatus();
    }
}

Game.prototype.generateComputerDecision = async function() {
    if (that.board.score() != that.score && that.board.score() != -that.score && !that.board.isFull()) {
        that.iterations = 0; // Reset iteration count

        // Debug time
        var startzeit = new Date().getTime();

        // Algorithm call
        var ai_move = that.maximizePlay(that.board, that.depth);

        var laufzeit = new Date().getTime() - startzeit;

        // Place ai decision
        that.place(ai_move[0]);

        return parseInt(ai_move[0]);

        // Debug
        // document.getElementById('ai-column').innerHTML = 'Column: ' + parseInt(ai_move[0] + 1);
        // document.getElementById('ai-score').innerHTML = 'Score: ' + ai_move[1];
        // document.getElementById('ai-iterations').innerHTML = that.iterations;
    }
    else {
        return -1;
    }
}

/**
 * Algorithm
 * Minimax principle
 */
Game.prototype.maximizePlay = function(board, depth, alpha, beta) {
    // Call score of our board
    var score = board.score();

    // Break
    if (board.isFinished(depth, score)) return [null, score];

    // Column, Score
    var max = [null, -99999];

    // For all possible moves
    for (var column = 0; column < that.columns; column++) {
        var new_board = board.copy(); // Create new board

        if (new_board.place(column)) {

            that.iterations++; // Debug

            var next_move = that.minimizePlay(new_board, depth - 1, alpha, beta); // Recursive calling

            // Evaluate new move
            if (max[0] == null || next_move[1] > max[1]) {
                max[0] = column;
                max[1] = next_move[1];
                alpha = next_move[1];
            }

            if (alpha >= beta) return max;
        }
    }

    return max;
}

Game.prototype.minimizePlay = function(board, depth, alpha, beta) {
    var score = board.score();

    if (board.isFinished(depth, score)) return [null, score];

    // Column, score
    var min = [null, 99999];

    for (var column = 0; column < that.columns; column++) {
        var new_board = board.copy();

        if (new_board.place(column)) {

            that.iterations++;

            var next_move = that.maximizePlay(new_board, depth - 1, alpha, beta);

            if (min[0] == null || next_move[1] < min[1]) {
                min[0] = column;
                min[1] = next_move[1];
                beta = next_move[1];
            }

            if (alpha >= beta) return min;

        }
    }
    return min;
}

Game.prototype.switchRound = function(round) {
    // 0 Human, 1 Computer
    if (round == 0) {
        return 1;
    } else {
        return 0;
    }
}

Game.prototype.updateStatus = function() {
    // Human won
    if (that.board.score() == -that.score) {
        that.status = 1;
    }

    // Computer won
    if (that.board.score() == that.score) {
        that.status = 2;
    }

    // Tie
    if (that.board.isFull()) {
        that.status = 3;
    }
}

Game.prototype.restartGame = function(_depth, _round) {
    var depth = _depth;
    that.depth = depth;
    that.status = 0;
    that.round = _round;
    that.winning_array = [];
    that.winning_array_cpu = [];
    that.winning_array_human = [];
    that.init(_round);
    that.updateStatus();
}