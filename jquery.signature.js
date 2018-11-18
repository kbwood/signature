/* http://keith-wood.name/signature.html
   Signature plugin for jQuery UI v1.1.2.
   Requires excanvas.js in IE.
   Written by Keith Wood (kbwood{at}iinet.com.au) April 2012.
   Available under the MIT (http://keith-wood.name/licence.html) license. 
   Please attribute the author if you use it. 
   
   Following features added by Marco Janc (marcojanc{at}hotmail.com) February 2017:
   
   - responsive
   - data normalization
   - signature resizing
   - signature loading by synchronized field */

(function($) { // Hide scope, no $ conflict

var signatureOverrides = {

	// last canvas dimension for resizing
	origDim : null, 
		
	// Global defaults for signature
	options: {
		distance: 0, // Minimum distance for a drag
		background: '#ffffff', // Colour of the background
		color: '#000000', // Colour of the signature
		thickness: 2, // Thickness of the lines
		guideline: false, // Add a guide line or not?
		guidelineColor: '#a0a0a0', // Guide line colour
		guidelineOffset: 50, // Guide line offset from the bottom
		guidelineIndent: 10, // Guide line indent from the edges
		notAvailable: 'Your browser doesn\'t support signing', // Error message when no canvas
		syncField: null, // Selector for synchronised text field
		change: null, // Callback when signature changed
		responsive : false, // Turns responsive features on, if screen resolution changes the element is resized and current signature redrawn
		aspectRatio : null, // Aspect ratio on responsive resizing
		keepSignature : false, // if true the signature is kept on resolution change
		dataDim : null, // Optional json dimension data is normalized to
	},

	/* Initialise a new signature area. */
	_create: function() {
		this.element.addClass(this.widgetFullName || this.widgetBaseClass);
		try {
			this.canvas = $('<canvas width="' + this.element.width() + '" height="' +
				this.element.height() + '">' + this.options.notAvailable + '</canvas>')[0];
			this.element.append(this.canvas);
			this.ctx = this.canvas.getContext('2d');
		}
		catch (e) {
			$(this.canvas).remove();
			this.resize = true;
			this.canvas = document.createElement('canvas');
			this.canvas.setAttribute('width', this.element.width());
			this.canvas.setAttribute('height', this.element.height());
			this.canvas.innerHTML = this.options.notAvailable;
			this.element.append(this.canvas);
			if (G_vmlCanvasManager) { // Requires excanvas.js
				G_vmlCanvasManager.initElement(this.canvas);
			}
			this.ctx = this.canvas.getContext('2d');
		}
		
		// resize on window resize
		if (this.options.responsive)
		{
			this.resize = true;
			
			var that = this;
			var element = this.element;

			// DOM must be ready since resize may be called prior to initalia
			$(window).on("resize" + this.eventNamespace, function () { 
	    		element.signature('resizeResponsive'); 
			});
	    	
	    	// resize canvas on init if parent has percentage-width like 100% 
	    	// need timeout since width will be set to 0 or 100px since DOM not yet ready
	    	// unnecessary if element width, height would be set as property
			window.setTimeout(function () 
			{ 
				var canvas = $(that.canvas);

				that.drawSyncField();
				that._initOrigDim();
				
				element.signature('resizeResponsive');
		 	}, 500);
		}
		else
		{
			this.drawSyncField();
			this._initOrigDim();
		}
		
		this._refresh(true);
		this._mouseInit();
	},
	
	/* Saves initial dimension for signature resizing */
	_initOrigDim : function()
	{
		// save original dimension for resizing
		if (this.options.keepSignature)
		{
			var canvas = $(this.canvas);
			this.origDim = [canvas.width(), canvas.height()];
		}
	}, 

	/* Refresh the appearance of the signature area.
	   @param  init  (boolean, internal) true if initialising */
	_refresh: function(init) {
		if (this.resize) {
			var parent = $(this.canvas);
			var parentHeight = parent.height();
			
			var width = this.element.width();
			var height = this.element.height();

			// if no aspect ratio specified deduct it from element
			var aspectRatio = this.options.aspectRatio;
			if (!aspectRatio)
				aspectRatio = this.element.width() / this.element.height();
			
			// responsive resizing
			height = Math.round(width / aspectRatio);
			parentHeight = Math.round(width / aspectRatio);
			
			parent.attr('width', width);
			parent.attr('height', height);
			$('div', this.canvas).css({width: parent.width(), height: parentHeight});
		}
		this._initMainCtx();

		this.clear(init);
	},
	
	/*
	 * Redraw signature
	 */
	resizeResponsive: function()
	{
		if (this.options.responsive)
		{
			// redraw image after resize
			var json = this.toJSON();
			this.resize = true;
			this._refresh(false);
			this.draw(json);
		}
    }, 
	
	/* Initializes the context with the main option */
	_initMainCtx: function() {
		var options = this.options;
		this.ctx.fillStyle = options.background;
		this.ctx.strokeStyle = options.color;
		this.ctx.lineWidth = options.thickness;
		this.ctx.lineCap = 'round';
		this.ctx.lineJoin = 'round';
	},

	/* Clear the signature area.
	   @param  init  (boolean, internal) true if initialising */
	clear: function(init) {
		this.ctx.clearRect(0, 0, this.element.width(), this.element.height());
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
		if (!init)
			this._changed();
	},

	/* Synchronise changes and trigger change event.
	   @param  event  (Event) the triggering event */
	_changed: function(event) {
		if (this.options.syncField) 
		{
			var json = this.lines.length == 0 ? null : this._toNormalizedJSON(this.options.dataDim);
			$(this.options.syncField).val(json);
		}
		this._trigger('change', event, {});
	},

	/* Custom options handling.
	   @param  options  (object) the new option values */
	_setOptions: function(options) {
		if (this._superApply) {
			this._superApply(arguments); // Base widget handling
		}
		else {
			$.Widget.prototype._setOptions.apply(this, arguments); // Base widget handling
		}
		this._refresh();
	},

	/* Determine if dragging can start.
	   @param  event  (Event) the triggering mouse event
	   @return  (boolean) true if allowed, false if not */
	_mouseCapture: function(event) {
		return !this.options.disabled;
	},
	
	/* 
	 * Get data point for mouse event
 	 * @param  event  (Event) the triggering mouse event */ 
	_mouseGetPoint : function(event)
	{
		var x = event.clientX - this.offset.left;
		var y = event.clientY - this.offset.top;
		
		return [this._round(x), this._round(y)];
	}, 
	
	/* 
	 * @param encode 
	 * @param x X-coordinate
	 * @param y Y-coordinate
	 * @param dim Dimension to normalize to if responsive
	 */
	_convertPoint : function(encode, x, y, dim)
	{
		var canvas = $(this.canvas);

		if (dim)
		{
			if (encode)
			{
				x = (x / canvas.width()) * dim[0];
				y = (y / canvas.height()) * dim[1];
			}
			else
			{
				x = (x / dim[0]) * canvas.width();
				y = (y / dim[1]) * canvas.height();
			}
		}
		
		return [this._round(x), this._round(y)];
	},

	/* Start a new line.
	   @param  event  (Event) the triggering mouse event */
	_mouseStart: function(event) {
		this.offset = this.element.offset();
		this.offset.left -= document.documentElement.scrollLeft || document.body.scrollLeft;
		this.offset.top -= document.documentElement.scrollTop || document.body.scrollTop;
		
		this.lastPoint = this._mouseGetPoint(event);
		this.curLine = [this.lastPoint];
		this.lines.push(this.curLine);
	},

	/* Track the mouse.
	   @param  event  (Event) the triggering mouse event */
	_mouseDrag: function(event) {
		var point = this._mouseGetPoint(event);
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
		if (this.curLine.length === 1) {
			event.clientY += this.options.thickness;
			this._mouseDrag(event);
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
		return this._toNormalizedJSON(this.origDim);
	},
	
	/* Convert the captured lines to JSON text.
	 * @param Resizing dimension if responsive
	   @return  (string) the JSON text version of the lines */
	_toNormalizedJSON : function(dim)
	{
		var that = this;
		return '{"lines":[' + $.map(this.lines, function(line) {
			return '[' + $.map(line, function(point) {
					return '[' + that._convertPoint(true, point[0], point[1], dim) + ']';
				}) + ']';
		}) + ']}';
	}, 

	/* Convert the captured lines to SVG text.
	   @return  (string) the SVG text version of the lines */
	toSVG: function() {
		return '<?xml version="1.0"?>\n<!DOCTYPE svg PUBLIC ' +
			'"-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">\n' +
			'<svg xmlns="http://www.w3.org/2000/svg" width="15cm" height="15cm">\n' +
			'	<g fill="' + this.options.background + '">\n' +
			'		<rect x="0" y="0" width="' + this.canvas.width +
			'" height="' + this.canvas.height + '"/>\n' +
			'		<g fill="none" stroke="' + this.options.color + '" stroke-width="' +
			this.options.thickness + '">\n'+
			$.map(this.lines, function(line) {
				return '			<polyline points="' +
					$.map(line, function(point) { return point + ''; }).join(' ') + '"/>\n';
			}).join('') +
			'		</g>\n	</g>\n</svg>\n';
	},

	/* draw signature from synchronized field */
	drawSyncField : function()
	{
		if (this.options.syncField) 
		{
			var json = $(this.options.syncField).val();
			if (json.trim() != "")
				this._draw(json, this.options.dataDim);
		}
	}, 
	
	/* Draw a signature from its JSON description.
	   @param  sigJSON  (object) object with attribute lines
	                    being an array of arrays of points or
	                    (string) text version of the JSON */
	draw: function(sigJSON) {
		this._draw(sigJSON, this.origDim);
		this._changed();
	},


	/* Draw a signature from its JSON description and the given dimension.
	 * 
	   @param  sigJSON  (object) object with attribute lines
	                    being an array of arrays of points or
	                    (string) text version of the JSON 
       @param dimension*/
	_draw : function(sigJSON, dim) {
		this.clear(true);
		if (typeof sigJSON === 'string') {
			try {
				sigJSON = $.parseJSON(sigJSON);
			}
			catch(err) {
			    return;
			}
		}

		this.lines = sigJSON.lines || [];
		var ctx = this.ctx;
		var that = this;
		
		// init context - if responsive options were lost
		this._initMainCtx();

		$.each(this.lines, function() {
			ctx.beginPath();

			$.each(this, function(i) {
				var point = that._convertPoint(false, this[0], this[1], dim);
				this[0] = point[0];
				this[1] = point[1];
				ctx[i === 0 ? 'moveTo' : 'lineTo'](this[0], this[1]);
			});
			ctx.stroke();
		});
	},

	/* Determine whether or not any drawing has occurred.
	   @return  (boolean) true if not signed, false if signed */
	isEmpty: function() {
		return this.lines.length === 0;
	},

	/* Remove the signature functionality. */
	_destroy: function() {
		this.element.removeClass(this.widgetFullName || this.widgetBaseClass);
		$(this.canvas).remove();
		this.canvas = this.ctx = this.lines = null;
		this._mouseDestroy();
		
		// remove resize handler
		if (this.options.responsive)
			$(window).off("resize" + this.eventNamespace);
	}
};

if (!$.Widget.prototype._destroy) {
	$.extend(signatureOverrides, {
		/* Remove the signature functionality. */
		destroy: function() {
			this._destroy();
			$.Widget.prototype.destroy.call(this); // Base widget handling
		}
	});
}

if ($.Widget.prototype._getCreateOptions === $.noop) {
	$.extend(signatureOverrides, {
		/* Restore the metadata functionality. */
		_getCreateOptions: function() {
			return $.metadata && $.metadata.get(this.element[0])[this.widgetName];
		}
	});
}

/* Signature capture and display.
   Depends on jquery.ui.widget, jquery.ui.mouse. */
$.widget('kbw.signature', $.ui.mouse, signatureOverrides);

// Make some things more accessible
$.kbw.signature.options = $.kbw.signature.prototype.options;
$.kbw.signature.origDim = $.kbw.signature.prototype.origDim;

})(jQuery);
