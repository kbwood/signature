/* http://keith-wood.name/signature.html
   Signature plugin for jQuery UI v1.0.0.
   Requires excanvas.js in IE.
   Written by Keith Wood (kbwood{at}iinet.com.au) April 2012.
   Dual licensed under the GPL (https://github.com/jquery/jquery/blob/master/GPL-LICENSE.txt) and 
   MIT (https://github.com/jquery/jquery/blob/master/MIT-LICENSE.txt) licenses. 
   Please attribute the author if you use it. */

(function($) { // Hide scope, no $ conflict

/* Signature capture and display.
   Depends on jquery.ui.widget, jquery.ui.mouse. */
$.widget('kbw.signature', $.ui.mouse, {

	// Global defaults for signature
	options: {
		background: '#ffffff', // Colour of the background
		color: '#000000', // Colour of the signature
		thickness: 2, // Thickness of the lines
		guideline: false, // Add a guide line or not?
		guidelineColor: '#a0a0a0', // Guide line colour
		guidelineOffset: 50, // Guide line offset from the bottom
		guidelineIndent: 10, // Guide line indent from the edges
		notAvailable: 'Your browser doesn\'t support signing', // Error message when no canvas
		syncField: null, // Selector for synchronised text field
		change: null // Callback when signature changed
	},

	/* Initialise a new signature area. */
	_create: function() {
		this.element.addClass(this.widgetBaseClass);
		if ($.browser.msie) {
			this.canvas = document.createElement('canvas');
			this.canvas.setAttribute('width', this.element.width());
			this.canvas.setAttribute('height', this.element.height());
			this.canvas.innerHTML = this.options.notAvailable;
			this.element.append(this.canvas);
			if (G_vmlCanvasManager) { // Requires excanvas.js
				G_vmlCanvasManager.initElement(this.canvas);
			}
		}
		else {
			this.canvas = $('<canvas width="' + this.element.width() + '" height="' +
				this.element.height() + '">' + this.options.notAvailable + '</canvas>')[0];
			this.element.append(this.canvas);
		}
		this.ctx = this.canvas.getContext('2d');
		this._refresh(true);
		this._mouseInit();
	},

	/* Refresh the appearance of the signature area.
	   @param  init  (boolean, internal) true if initialising */
	_refresh: function(init) {
		if ($.browser.msie) {
			var parent = $(this.canvas);
			$('div', this.canvas).css({width: parent.width(), height: parent.height()});
		}
		this.ctx.fillStyle = this.options.background;
		this.ctx.strokeStyle = this.options.color;
		this.ctx.lineWidth = this.options.thickness;
		this.ctx.lineCap = 'round';
		this.ctx.lineJoin = 'round';
		this.clear(init);
	},

	/* Clear the signature area.
	   @param  init  (boolean, internal) true if initialising */
	clear: function(init) {
		this.ctx.fillRect(0, 0, this.element.width(), this.element.height());
		if (this.options.guideline) {
			this.ctx.save();
			this.ctx.strokeStyle = this.options.guidelineColor;
			this.ctx.lineWidth = 1;
			this.ctx.beginPath();
			this.ctx.moveTo(this.options.guidelineIndent,
				this.element.height() - this.options.guidelineOffset);
			this.ctx.lineTo(this.element.width() - this.options.guidelineIndent,
				this.element.height() - this.options.guidelineOffset);
			this.ctx.stroke();
			this.ctx.restore();
		}
		this.lines = [];
		if (!init) {
			this._changed();
		}
	},

	/* Synchronise changes and trigger change event.
	   @param  event  (Event) the triggering event */
	_changed: function(event) {
		if (this.options.syncField) {
			$(this.options.syncField).val(this.toJSON());
		}
		this._trigger('change', event, null);
	},

	/* Custom option handling.
	   @param  key    (string) the name of the option being changed
	   @param  value  (any) its new value */
	_setOption: function(key, value) {
		$.Widget.prototype._setOption.apply(this, arguments); // Base widget handling
		if (key != 'disabled') {
			this._refresh();
		}
	},

	/* Start a new line.
	   @param  event  (Event) the triggering mouse event */
	_mouseStart: function(event) {
		if (this.options.disabled) {
			return;
		}
		this.offset = this.element.offset();
		this.offset.left -= document.documentElement.scrollLeft || document.body.scrollLeft;
		this.offset.top -= document.documentElement.scrollTop || document.body.scrollTop;
		this.lastPoint = [this._round(event.clientX - this.offset.left),
			this._round(event.clientY - this.offset.top)];
		this.curLine = [this.lastPoint];
		this.lines.push(this.curLine);
	},

	/* Track the mouse.
	   @param  event  (Event) the triggering mouse event */
	_mouseDrag: function(event) {
		if (this.options.disabled) {
			return;
		}
		var point = [this._round(event.clientX - this.offset.left),
			this._round(event.clientY - this.offset.top)];
		this.curLine.push(point);
		this.ctx.beginPath();
		this.ctx.moveTo(this.lastPoint[0], this.lastPoint[1]);
		this.ctx.lineTo(point[0], point[1]);
		this.ctx.stroke();
		this.lastPoint = point;
	},

	/* End a line.
	   @param  event  (Event) the triggering mouse event */
	_mouseStop: function(event) {
		if (this.options.disabled) {
			return;
		}
		this.lastPoint = null;
		this.curLine = null;
		this._changed(event);
	},

	/* Round to two decimal points.
	   @param  value  (number) the value to round
	   @return  (number) the rounded value */
	_round: function(value) {
		return Math.round(value * 100) / 100;
	},

	/* Convert the captured lines to JSON text.
	   @return  (string) the JSON text version of the lines */
	toJSON: function() {
		var json = '{"lines":[';
		var lineSep = '';
		$.each(this.lines, function() {
			json += lineSep + '[';
			var pointSep = '';
			$.each(this, function() {
				json += pointSep + '[' + this[0] + ',' + this[1] + ']';
				pointSep = ',';
			});
			json += ']';
			lineSep = ',';
		});
		json += ']}';
		return json;
	},

	/* Draw a signature from its JSON description.
	   @param  sigJSON  (object) object with attribute lines
	                    being an array of arrays of points */
	draw: function(sigJSON) {
		this.clear(true);
		this.lines = sigJSON.lines;
		var ctx = this.ctx;
		$.each(this.lines, function() {
			ctx.beginPath();
			$.each(this, function(i) {
				ctx[i == 0 ? 'moveTo' : 'lineTo'](this[0], this[1]);
			});
			ctx.stroke();
		});
		this._changed();
	},

	/* Determine whether or not any drawing has occurred.
	   @return  (boolean) true if not signed, false if signed */
	isEmpty: function() {
		return this.lines.length == 0;
	},

	/* Remove the signature functionality. */
	destroy: function() {
		this.element.removeClass(this.widgetBaseClass);
		$(this.canvas).remove();
		this.canvas = null;
		this.ctx = null;
		this.lines = null;
		this._mouseDestroy();
		$.Widget.prototype.destroy.call(this); // Base widget handling
	},
});

// Make some things more accessible
$.kbw.signature.options = $.kbw.signature.prototype.options;

})(jQuery);
