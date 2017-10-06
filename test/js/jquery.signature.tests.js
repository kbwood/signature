var subVers = parseInt($.ui.version.substring(2));

$(function() {
	QUnit.testStart(function() {
		$('#qunit-fixture').css({left: 0, top: 0});
	});
	
	QUnit.testDone(function() {
		$('#qunit-fixture').css({left: -10000, top: -10000});
	});
	
	test('Set Defaults', function() {
		expect(2);
		init();
		equal($.kbw.signature.options.guideline, false, 'Initial guideline');
		$.extend($.kbw.signature.options, {guideline: true});
		equal($.kbw.signature.options.guideline, true, 'Changed guideline');
		$.extend($.kbw.signature.options, {guideline: false});
	});

	test('Options', function() {
		expect(12);
		var sig = init();
		contains(sig.signature('option'), {disabled: false,
			distance: 0, delay: 0, background: '#fff', color: '#000',
			thickness: 2, guideline: false, guidelineColor: '#a0a0a0', guidelineOffset: 50,
			guidelineIndent: 10, notAvailable: 'Your browser doesn\'t support signing',
			syncField: null, syncFormat: 'JSON', svgStyles: false, change: null}, 'Initial settings');
		equal(sig.signature('option', 'thickness'), 2, 'Initial max setting');
		equal(sig.signature('option', 'guideline'), false, 'Initial guideline setting');
		sig.signature('option', {notAvailable: 'N/A'});
		contains(sig.signature('option'), {disabled: false,
			distance: 0, delay: 0, background: '#fff', color: '#000',
			thickness: 2, guideline: false, guidelineColor: '#a0a0a0', guidelineOffset: 50,
			guidelineIndent: 10, notAvailable: 'N/A',
			syncField: null, syncFormat: 'JSON', svgStyles: false, change: null}, 'Changed settings');
		equal(sig.signature('option', 'thickness'), 2, 'Unchanged thickness setting');
		equal(sig.signature('option', 'guideline'), false, 'Unchanged guideline setting');
		sig.signature('option', {thickness: 5, background: '#fcc'});
		contains(sig.signature('option'), {disabled: false,
			distance: 0, delay: 0, background: '#fcc', color: '#000',
			thickness: 5, guideline: false, guidelineColor: '#a0a0a0', guidelineOffset: 50,
			guidelineIndent: 10, notAvailable: 'N/A',
			syncField: null, syncFormat: 'JSON', svgStyles: false, change: null}, 'Changed settings');
		equal(sig.signature('option', 'thickness'), 5, 'Changed thickness setting');
		equal(sig.signature('option', 'guideline'), false, 'Unchanged guideline setting');
		sig.signature('option', 'guideline', true);
		contains(sig.signature('option'), {disabled: false,
			distance: 0, delay: 0, background: '#fcc', color: '#000',
			thickness: 5, guideline: true, guidelineColor: '#a0a0a0', guidelineOffset: 50,
			guidelineIndent: 10, notAvailable: 'N/A',
			syncField: null, syncFormat: 'JSON', svgStyles: false, change: null}, 'Changed named setting');
		equal(sig.signature('option', 'thickness'), 5, 'Unchanged thickness setting');
		equal(sig.signature('option', 'guideline'), true, 'Changed guideline setting');
	});

	test('Enable/disable', function() {
		expect(7);
		var sig = init();
		ok(!sig.hasClass('kbw-signature-disabled'), 'Div not disabled state');
		sig.signature('disable');
		ok(sig.hasClass('kbw-signature-disabled'), 'Div is disabled state');
		sig.simulate('mousedown', {clientX: 100, clientY: 100}).
			simulate('mousemove', {clientX: 200, clientY: 150}).
			simulate('mouseup', {clientX: 200, clientY: 150});
		ok(sig.signature('toJSON').length === 12, 'No drawing');
		sig.signature('clear')
		ok(sig.signature('toJSON').length === 12, 'No clearing');
		sig.signature('enable');
		ok(!sig.hasClass('kbw-signature-disabled'), 'Div not disabled state');
		sig.simulate('mousedown', {clientX: 100, clientY: 100}).
			simulate('mousemove', {clientX: 200, clientY: 150}).
			simulate('mouseup', {clientX: 200, clientY: 150});
		ok(sig.signature('toJSON').length > 12, 'Drawing');
		sig.signature('clear')
		ok(sig.signature('toJSON').length === 12, 'Clearing');
	});

	test('Single point', function() {
		expect(4);
		var sig = init();
		sig.simulate('mousedown', {clientX: 100, clientY: 100}).
			simulate('mouseup', {clientX: 100, clientY: 100});
		var draw = $.parseJSON(sig.signature('toJSON'));
		equal(draw.lines.length, 1, 'One line drawn');
		equal(draw.lines[0].length, 2, 'Two points drawn');
		equal(draw.lines[0][0][0], draw.lines[0][1][0], 'X is equal');
		equal(draw.lines[0][0][1] + 2, draw.lines[0][1][1], 'Y is offset by thickness');
	});

	test('Destroy', function() {
		expect(6);
		var sig = init();
		var dataName = (subVers < 9 ? 'signature' : 'kbw-signature');
		ok(sig.hasClass('kbw-signature'), 'Marker class present');
		ok($.data(sig[0], dataName) != null, 'Instance settings present');
		ok(sig.children('canvas').length === 1, 'Canvas present');
		sig.signature('destroy');
		sig = $('#sig');
		ok(!sig.hasClass('kbw-signature'), 'Marker class gone');
		ok($.data(sig[0], dataName) == null, 'Instance settings absent');
		ok(sig.children('canvas').length === 0, 'Canvas absent');
	});

	test('Events', function() {
		expect(22);
        var count = 0;
        var changedEvent = null;
        var changedUI = null;
        function changed(event, ui) {
            count++;
            changedEvent = event;
            changedUI = ui;
        }

		var sig = init({change: changed, syncField: '#synch'});
		var synch = $('#synch');
		equal(count, 0, 'No event');
		equal(synch.val(), '', 'Initial synch');
		sig.simulate('mousedown', {clientX: 100, clientY: 100}).
			simulate('mousemove', {clientX: 200, clientY: 150}).
			simulate('mouseup', {clientX: 200, clientY: 150});
		equal(count, 1, 'Changed event');
		equal(changedEvent.type, 'signaturechange', 'Event type');
		deepEqual(changedUI, {}, 'No UI');
		equal(synch.val(), '{"lines":[[[100,100],[200,150]]]}', 'Mouse synch');
		sig.signature('clear');
		equal(count, 2, 'Changed event');
		equal(changedEvent.type, 'signaturechange', 'Event type');
		deepEqual(changedUI, {}, 'No UI');
		equal(synch.val(), '{"lines":[]}', 'Clear synch');
		sig = init({syncField: '#synch'}).bind('signaturechange', changed);
		sig.simulate('mousedown', {clientX: 100, clientY: 100}).
			simulate('mousemove', {clientX: 200, clientY: 150}).
			simulate('mouseup', {clientX: 200, clientY: 150});
		equal(count, 3, 'Changed event');
		equal(changedEvent.type, 'signaturechange', 'Event type');
		deepEqual(changedUI, {}, 'No UI');
		equal(synch.val(), '{"lines":[[[100,100],[200,150]]]}', 'Mouse synch');
		sig.signature('draw', $.parseJSON('{"lines":[[[100,100],[150,200]]]}'));
		equal(count, 4, 'Changed event');
		equal(changedEvent.type, 'signaturechange', 'Event type');
		deepEqual(changedUI, {}, 'No UI');
		equal(synch.val(), '{"lines":[[[100,100],[150,200]]]}', 'Draw synch');
		sig.signature('draw', '{"lines":[[[150,200],[100,100]]]}');
		equal(count, 5, 'Changed event');
		equal(changedEvent.type, 'signaturechange', 'Event type');
		deepEqual(changedUI, {}, 'No UI');
		equal(synch.val(), '{"lines":[[[150,200],[100,100]]]}', 'Draw synch');
	});

	test('JSON', function() {
		expect(8);
		var sig = init();
		sig.simulate('mousedown', {clientX: 100, clientY: 100}).
			simulate('mousemove', {clientX: 200, clientY: 150}).
			simulate('mouseup', {clientX: 200, clientY: 150});
		equal(sig.signature('toJSON'), '{"lines":[[[100,100],[200,150]]]}', 'JSON one line');
		equal(sig.signature('isEmpty'), false, 'Not empty one line');
		sig.simulate('mousedown', {clientX: 50, clientY: 60}).
			simulate('mousemove', {clientX: 55, clientY: 65}).
			simulate('mousemove', {clientX: 70, clientY: 40}).
			simulate('mouseup', {clientX: 70, clientY: 40});
		equal(sig.signature('toJSON'), '{"lines":[[[100,100],[200,150]],[[50,60],[55,65],[70,40]]]}', 'JSON two lines');
		equal(sig.signature('isEmpty'), false, 'Not empty two lines');
		sig.signature('clear');
		equal(sig.signature('toJSON'), '{"lines":[]}', 'JSON cleared');
		equal(sig.signature('isEmpty'), true, 'Empty cleared');
		sig.signature('draw', {lines: [[[100, 100], [150, 200]]]});
		equal(sig.signature('toJSON'), '{"lines":[[[100,100],[150,200]]]}', 'JSON redrawn');
		equal(sig.signature('isEmpty'), false, 'Not empty redrawn');
	});

	test('SVG', function() {
		expect(12);
		var svgStart = '<?xml version="1.0"?>\n' +
			'<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">\n' +
			'<svg xmlns="http://www.w3.org/2000/svg" width="15cm" height="15cm">\n' +
			'	<g fill="#fff">\n' +
			'		<rect x="0" y="0" width="400" height="200"/>\n' +
			'		<g fill="none" stroke="#000" stroke-width="2">\n';
		var svgLineStart = '			<polyline points="';
		var svgLineEnd = '"/>\n';
		var svgEnd = '		</g>\n' +
			'	</g>\n' +
			'</svg>\n';
		var sig = init({syncField: '#synch', syncFormat: 'SVG'});
        var synch = $('#synch');
		function line(points) {
			var output = '';
			for (var i = 0; i < points.length; i++) {
				output += ' ' + points[i][0] + ',' + points[i][1];
			}
			return svgLineStart + output.substring(1) + svgLineEnd;
		}
		sig.simulate('mousedown', {clientX: 100, clientY: 100}).
			simulate('mousemove', {clientX: 200, clientY: 150}).
			simulate('mouseup', {clientX: 200, clientY: 150});
        var svgOutput = svgStart + line([[100, 100], [200, 150]]) + svgEnd;
		equal(sig.signature('toSVG'), svgOutput, 'SVG one line');
		equal(synch.val(), svgOutput, 'Synched SVG one line');
		equal(sig.signature('isEmpty'), false, 'Not empty one line');
		sig.simulate('mousedown', {clientX: 50, clientY: 60}).
			simulate('mousemove', {clientX: 55, clientY: 65}).
			simulate('mousemove', {clientX: 70, clientY: 40}).
			simulate('mouseup', {clientX: 70, clientY: 40});
        svgOutput = svgStart + line([[100, 100], [200, 150]]) + line([[50, 60], [55, 65], [70, 40]]) + svgEnd;
		equal(sig.signature('toSVG'), svgOutput, 'SVG two lines');
		equal(synch.val(), svgOutput, 'Synched SVG two lines');
		equal(sig.signature('isEmpty'), false, 'Not empty two lines');
		sig.signature('clear');
		equal(sig.signature('toSVG'), svgStart + svgEnd, 'SVG cleared');
		equal(synch.val(), svgStart + svgEnd, 'Synched SVG cleared');
		equal(sig.signature('isEmpty'), true, 'Empty cleared');
        sig.signature('draw', svgOutput);
		equal(sig.signature('toSVG'), svgOutput, 'SVG redrawn');
		equal(synch.val(), svgOutput, 'Synched SVG redrawn');
		equal(sig.signature('isEmpty'), false, 'Not empty redrawn');
	});

	test('SVG Style', function() {
		expect(1);
		var svgStart = '<?xml version="1.0"?>\n' +
			'<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">\n' +
			'<svg xmlns="http://www.w3.org/2000/svg" width="15cm" height="15cm">\n' +
			'	<g style="fill: #f00;">\n' +
			'		<rect x="0" y="0" width="400" height="200"/>\n' +
			'		<g style="fill: none; stroke: #0f0; stroke-width: 4;">\n';
		var svgLineStart = '			<polyline points="';
		var svgLineEnd = '"/>\n';
		var svgEnd = '		</g>\n' +
			'	</g>\n' +
			'</svg>\n';
		var sig = init({svgStyles: true, background: '#f00', color: '#0f0', thickness: 4});
		function line(points) {
			var output = '';
			for (var i = 0; i < points.length; i++) {
				output += ' ' + points[i][0] + ',' + points[i][1];
			}
			return svgLineStart + output.substring(1) + svgLineEnd;
		}
		sig.simulate('mousedown', {clientX: 100, clientY: 100}).
			simulate('mousemove', {clientX: 200, clientY: 150}).
			simulate('mouseup', {clientX: 200, clientY: 150});
		equal(sig.signature('toSVG'), svgStart + line([[100, 100], [200, 150]]) + svgEnd, 'SVG one line');
	});

	test('Data URL PNG', function() {
		expect(5);
		var sig = init({syncField: '#synch', syncFormat: 'PNG'});
		var synch = $('#synch');
		sig.simulate('mousedown', {clientX: 100, clientY: 100}).
			simulate('mousemove', {clientX: 200, clientY: 150}).
			simulate('mouseup', {clientX: 200, clientY: 150});
        var pngOutput = sig.signature('toDataURL');
		ok(pngOutput.indexOf('data:image/png;base64,iVBOR') === 0, 'PNG URL');
        equal(pngOutput, synch.val(), 'PNG content');
		sig.signature('clear');
        var pngCleared = sig.signature('toDataURL');
		ok(pngCleared.indexOf('data:image/png;base64,iVBOR') === 0, 'PNG cleared');
        equal(pngCleared, synch.val(), 'PNG cleared content');
        ok(pngOutput !== pngCleared, 'PNG outputs differ');
	});

	test('Data URL JPEG', function() {
		expect(5);
        document.documentElement.scrollLeft = 1;
        document.documentElement.scrollTop = 1;
		var sig = init({syncField: '#synch', syncFormat: 'JPEG'});
		var synch = $('#synch');
		sig.simulate('mousedown', {clientX: 100, clientY: 100}).
			simulate('mousemove', {clientX: 200, clientY: 150}).
			simulate('mouseup', {clientX: 200, clientY: 150});
        var jpegOutput = sig.signature('toDataURL', 'image/jpeg');
		ok(jpegOutput.indexOf('data:image/jpeg;base64,/9j/4AAQS') === 0, 'JPEG output');
        equal(jpegOutput, synch.val(), 'JPEG content');
		sig.signature('clear');
        var jpegCleared = sig.signature('toDataURL', 'image/jpeg');
		ok(jpegCleared.indexOf('data:image/jpeg;base64,/9j/4AAQS') === 0, 'JPEG cleared');
        equal(jpegCleared, synch.val(), 'JPEG cleared content');
        ok(jpegOutput !== jpegCleared, 'JPEG outputs differ');
	});
});

function init(settings) {
	if ($('#sig').hasClass('kbw-signature')) {
		$('#sig').signature('destroy');
	}
	return $('#sig').signature(settings);
}

function contains(source, contents, message) {
	var matches = true;
	for (var name in contents) {
		matches = matches && source[name] === contents[name];
	}
	ok(matches, message + '\n' + JSON.stringify(source) + '\n' + JSON.stringify(contents));
}
