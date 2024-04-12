////////////////////////////////////////////////////////////
// MAIN
////////////////////////////////////////////////////////////
var stageW=1280;
var stageH=768;
var contentW = 1024;
var contentH = 576;

var viewport = {isLandscape:true};
var landscapeSize = {w:stageW, h:stageH, cW:contentW, cH:contentH};
var portraitSize = {w:768, h:1024, cW:576, cH:900};

/*!
 * 
 * START BUILD GAME - This is the function that runs build game
 * 
 */
function initMain(){
	if(!$.browser.mobile || !isTablet){
		$('#canvasHolder').show();	
	}
	
	initGameCanvas(stageW,stageH);

	const urlParams = new URLSearchParams(window.location.search);

	const errMessage = urlParams.get('err')
	const tokenkey = urlParams.get('t');

	console.log("err", errMessage)
	if (errMessage != undefined && errMessage != '') {
		var errorHtml = `<!DOCTYPE html>
		<html lang="en">
		<head>
			<meta charset="UTF-8">
			<meta name="viewport" content="width=device-width, initial-scale=1.0">
			<title>`+errMessage+`</title>
			<!-- Bootstrap CSS -->
			<link href="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css" rel="stylesheet">
		</head>
		<body style="background-color: none !important;">
			<div class="container">
				<div class="row mt-5">
					<div class="col-md-6 offset-md-3">
						<div class="alert alert-danger">
							`+errMessage+`
						</div>
					</div>
				</div>
			</div>
		</body>
		</html>
		`
		$('body').css('background', 'none');
		$('body').html(errorHtml);
	} else if (tokenkey != undefined && tokenkey != '')
	{
		// Get the value of a specific parameter
		const tokenkey = urlParams.get('t'); // Returns 'value1'
		localStorage.setItem('t', tokenkey);
		localStorage.setItem('gameID', 1);
		$.ajax({
			url: '/user/info',
			type: 'GET',
			data: {
				't': localStorage.getItem('t'),
				'gameID': localStorage.getItem('gameID')
			},
			success: function(response) {
				buildGameCanvas(response);
				buildGameButton();
				
				if ( typeof buildScoreBoardCanvas == 'function' ) { 
					buildScoreBoardCanvas();
				}
				
				goPage('main');
				if ( typeof initSocket == 'function' && multiplayerSettings.enable) {
					initSocket("connectfour");
				}
				
				checkMobileOrientation();
				resizeCanvas();
			},
			error: function(xhr, status, error) {
			window.location.replace('/login?t='+tokenkey);
			}
		});
	}
}

var windowW=windowH=0;
var scalePercent=0;
var offset = {x:0, y:0, left:0, top:0};

/*!
 * 
 * GAME RESIZE - This is the function that runs to resize and centralize the game
 * 
 */
function resizeGameFunc(){
	setTimeout(function() {
		$('.mobileRotate').css('left', checkContentWidth($('.mobileRotate')));
		$('.mobileRotate').css('top', checkContentHeight($('.mobileRotate')));
		
		windowW = window.innerWidth;
		windowH = window.innerHeight;
		
		scalePercent = windowW/contentW;
		if((contentH*scalePercent)>windowH){
			scalePercent = windowH/contentH;
		}
		
		scalePercent = scalePercent > 1 ? 1 : scalePercent;
		
		if(windowW > stageW && windowH > stageH){
			if(windowW > stageW){
				scalePercent = windowW/stageW;
				if((stageH*scalePercent)>windowH){
					scalePercent = windowH/stageH;
				}	
			}
		}
		
		var newCanvasW = ((stageW)*scalePercent);
		var newCanvasH = ((stageH)*scalePercent);
		
		offset.left = 0;
		offset.top = 0;
		
		if(newCanvasW > windowW){
			offset.left = -((newCanvasW) - windowW);
		}else{
			offset.left = windowW - (newCanvasW);
		}
		
		if(newCanvasH > windowH){
			offset.top = -((newCanvasH) - windowH);
		}else{
			offset.top = windowH - (newCanvasH);	
		}
		
		offset.x = 0;
		offset.y = 0;
		
		if(offset.left < 0){
			offset.x = Math.abs((offset.left/scalePercent)/2);
		}
		if(offset.top < 0){
			offset.y = Math.abs((offset.top/scalePercent)/2);
		}
		
		$('canvas').css('width', newCanvasW);
		$('canvas').css('height', newCanvasH);
		
		$('canvas').css('left', (offset.left/2));
		$('canvas').css('top', (offset.top/2));
		
		//room
		if ( typeof initSocket == 'function' && multiplayerSettings.enable) {
			$('.resizeFont').each(function(index, element) {
				$(this).css('font-size', Math.round(Number($(this).attr('data-fontsize'))*scalePercent));
			});
	
			$('#roomWrapper').css('width', newCanvasW);
			$('#roomWrapper').css('height', newCanvasH);
	
			$('#roomWrapper').css('left', (offset.left/2));
			$('#roomWrapper').css('top', (offset.top/2));

			$('#notificationHolder').css('width', newCanvasW);
			$('#notificationHolder').css('height', newCanvasH);
	
			$('#notificationHolder').css('left', (offset.left/2));
			$('#notificationHolder').css('top', (offset.top/2));
		}
		$(window).scrollTop(0);
		
		resizeCanvas();
		if ( typeof resizeScore == 'function' ) { 
			resizeScore();
		}
	}, 100);	
}