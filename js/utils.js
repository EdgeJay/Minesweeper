window.requestAnimFrame = (function(){
    return window.requestAnimationFrame ||
        window.webkitRequestAnimationFrame ||
        window.mozRequestAnimationFrame ||
        window.oRequestAnimationFrame ||
        window.msRequestAnimationFrame ||
        function(/* function */ callback, /* DOMElement */ element){
            window.setTimeout(callback, 1000 / 60);
        };
    })();

(function($) {
    $.fn.canvasDragDrop = function( options, arg ) {
        // method calling
        if (typeof options == 'string') {
            var args = Array.prototype.slice.call(arguments, 1),
                res;
            this.each(function() {
                var data = $.data(this, 'canvasDragDrop');
                if (data) {
                    var meth = data[options];
                    if (meth) {
                        var r = meth.apply(this, args);
                        if (res === undefined) {
                            res = r;
                        }
                    }
                }
            });
            if (res !== undefined) {
                return res;
            }
            return this;
        }

        // initialize options
        var opts = $.extend({}, $.fn.canvasDragDrop.defaults, options);
        this.each(function() {
            var canvas = $(this);
            if ( opts.mouse ) {
                var start_event  = 'mousedown';
                var move_event   = 'mousemove';
                var end_event    = 'mouseup';
                var cancel_event = 'mouseup';
            } else {
                var start_event  = 'touchstart';
                var move_event   = 'touchmove';
                var end_event    = 'touchend';
                var cancel_event = 'touchcancel';
            }
            var last_x   = 0;
            var last_y   = 0;
            var dragging = false;
            var positions = [];
            var last_ts  = 0
            var handlers = {
                	start : function(e) {
                	    if ( !opts.mouse ) {
                	        e.preventDefault();
                	        e = e.originalEvent.touches[0] || e.originalEvent.changedTouches[0];
                	    }
                	    last_x = e.pageX;
                	    last_y = e.pageY;
                        canvas.bind( end_event  , handlers.end );
                        canvas.bind( move_event , handlers.move );
                        if ( opts.momentum ) {
	                        var ts = Date.now();
	                        positions.push({ts:Date.now(),x:last_x,y:last_y});
	                        last_ts = ts;
	                    }
                	},
                	move : function(e) {
                	    if ( !opts.mouse ) {
                    	    e.preventDefault();
                    	    e = e.originalEvent.touches[0] || e.originalEvent.changedTouches[0];
                	    }
                	    var delta_x = parseInt(last_x-e.pageX);
                	    var delta_y = parseInt(last_y-e.pageY);
                	    if ( dragging ) {
                	        last_x = e.pageX;
                	        last_y = e.pageY;
                	        var func = opts.onDrag;
                	        if ( func != null ) { func( parseInt(e.pageX), parseInt(e.pageY) ); }
                	    } else if ( (Math.abs(delta_x) > opts.tolerance || Math.abs(delta_y) > opts.tolerance) ) {
                	        dragging = true;
                	        if ( opts.mouse ) { canvas.css({cursor:'all-scroll'}); }
                	        var func = opts.onStart;
                	        if ( func != null ) { 
                	            func( parseInt(e.pageX), parseInt(e.pageY) );
                	        }
                	    }
                	},
                	end : function(e) {
                	    if ( !dragging ) {
                	        var func = opts.onClick
                	        if ( func != null ) { 
                	            if ( !opts.mouse ) {
                    	            e.preventDefault();
                    	            e = e.originalEvent.touches[0] || e.originalEvent.changedTouches[0];
                	            }
                	            canvas.unbind( end_event );
                	            canvas.unbind( move_event );
                	            canvas.unbind( cancel_event );
                	            canvas.css({cursor:'default'});
                	            func( parseInt(e.pageX), parseInt(e.pageY) );
                	        }
                	    } else {
                	 		dragging = false;
                	 		canvas.unbind( end_event );
                	 		canvas.unbind( move_event );
                	 		canvas.unbind( cancel_event );
                	 		canvas.css({cursor:'default'});
                	 		var func = opts.onStop;
                	 		if ( func != null ) { func( parseInt(e.pageX), parseInt(e.pageY) ); }   
                	    }
                	},
                	cancel: function( e ) {
                	    dragging = false;
                	    canvas.unbind( end_event );
                	    canvas.unbind( cancel_event );
                	    canvas.unbind( move_event );
                	    canvas.css({cursor:'default'});
                    }
                };
            canvas.bind( start_event , handlers.start );            
            return this;
        });
    }
    //defaults
    $.fn.canvasDragDrop.defaults = {
        width : 90*32 ,
        height : 60*32 ,
        tolerance : 5 ,
        mouse : true ,
        onClick : null ,
        onDrag : null ,
        onStart : null ,
        onStop : null
    };
})(jQuery); // or Zepto?
