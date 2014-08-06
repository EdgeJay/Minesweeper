(function ($) {

	var game;

	$(document).ready(function (evt) {

		game = new Game('#game-canvas', {
			gridW: 30,
			gridH: 16,
			mines: 99
		});
		game.timerDisplay = $('#timer');
		game.minesDisplay = $('#mines-count');
		game.start();
		game.enableStats();

		$('#mines-count')
		.text('Mines left: ' + game.minesLeft)
		.css('left', (game.cellW * game.gridW + 20) + 'px');

		$('#timer')
		.text('Time Elapsed: ' + game.timeElapsed)
		.css('left', (game.cellW * game.gridW + 20) + 'px');
		
		$('#restart-btn').click(function (evt) {

			evt.preventDefault();

			game.restart();
		})
		.css('left', (game.cellW * game.gridW + 20) + 'px');
	});
})(jQuery);
