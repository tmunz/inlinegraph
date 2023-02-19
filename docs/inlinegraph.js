//counter for memory if heatmap to reference must created or not
var heatCount = 0;

$.fn.inlinegraph = function (values, attr) {
	$(this).html(inlinegraph(values, attr));
}

function inlinegraph(values, attr) {
	defaultAttr = {
			type: 'pie',
			interception: 'warn',
			interceptionColor: 'black',
			height: 16,
			width: 16,
			color: ['blue','red','yellow','purple','green','orange'],
			borderColor: 'black',
			borderWidth: 0,
			rotation: 0,
	}

	defaultTypeAttr = function(type) {
		switch (type) {
		case 'heat': return {
			pointerColor: 'gray',
			pointerWidth: 0,
			min: -30,
			max: 30,
		};
		case 'bool': return {
			color: ['green','red','yellow'],
			rotation: -90,
		};
		case 'pie': return {
			//
		};
		case 'angle': return {
			fullAngle: 360,
			innerRadius: 0,
			innerBorderColor: 'gray',
			innerBorderWidth: 1,
			innerBorderRadius: 0.7,
			originColor: 'black',
			originIsColor: false,
			originWidth: 1,
			originInnerRadius: 0,
			pointerColor: 'black',
			pointerIsColor: false,
			pointerWidth: 1,
			pointerInnerRadius: 0,
			direction: 1,
		};
		default: return {
			//
		};
		
		}
	}
	
	//extend attributes with default attributes, if not explicitly defined
	if (attr == null) {attr = defaultAttr;}
	else {attr = $.extend({}, defaultAttr, defaultTypeAttr(attr.type), attr);}
	
	//get values
	if (values == 'html') {values = graph.text().replace(/(^\s*<!--)|(-->\s*$)|\s+/g, '').split(',');}
	else {values = values.split(',');}
	
	values = listOp(values, function(a) {return parse(a);});
	//generate different types of graphs
	var svg = svgElem('svg').attr('style', 'width:'+attr.width+'px; height:'+attr.height+'px;');
	if (isNumbers(values)) {
		switch (attr.type) {
			case 'heat': {
				svg.append(createHeat(values[0], attr)); 
				break;
			}
			case 'bool': {
				var value = values[0]>1 ? 1 : values[0]<-1 ? -1 : values[0];
				if (value<0) {values = [0, (1+value), -value];}
				else {values = [value, 1-value, 0];}
			}
			case 'pie': {
				svg.append(createPie(values, attr)); 
				break;
			}
			case 'angle': {
				svg.append(createAngle(values[0], attr)); 
				break;
			}
			case 'none': {
				//adds an empty graph
				//makes sense if you want to check if values are numbers and if not show interception
				break;
			}
		}
		svg.children().attr({transform: 'rotate(' + attr.rotation + ', ' + (attr.width/2) + ','
			+ (attr.height/2) + ')'});
	}
	else {
		switch (attr.interception) {
			case 'warn': {
				svg.append(createWarn(attr)); 
				break;
			}
		}
	}
	if (attr.highLight != -1) {
		//TODO		
	}
	return svg;

	
	function svgElem(elem) {
		return $(document.createElementNS('http://www.w3.org/2000/svg', elem));
	}


	function createHeat(value, attr) {
		if (heatCount==0) {
			$('html').append(createHeatGradient(7));
		}
		var steps = 100;
		var min = attr['min'];
		var max = attr['max'];
		var dist = max - min;
		var left = -(value-min)*steps/dist;
		if (left<-steps) {left = -steps;}
		if (left>0) {left=0;}
		var group = svgElem('g');
		group.append(svgElem('rect')
				.attr({width: attr.width+steps, height: attr.height, 'clip-path': 'url(#heatgraph_clip_'+heatCount+')',
					x: left, y: 0, fill: 'url(#heatgraph_gradient)'}));
		group.append(svgElem('path')
				.attr({d: 'M ' + (attr.width/2) + ',0' + ' l ' + '0,' + attr.height, 
					stroke: attr.pointerColor, 'stroke-width': attr.pointerWidth, fill: 'none'}));
		group.append(svgElem('clipPath')
				.attr({'id': 'heatgraph_clip_' + heatCount})
				.append(svgElem('rect')
						.attr({width: attr.width, height: attr.height, x: 0, y: 0, fill: 'none'})));
		group.append(svgElem('rect')
				.attr({width: attr.width-(attr.borderWidth), height: attr.height-(attr.borderWidth), x: attr.borderWidth/2, y: attr.borderWidth/2,
					'stroke-width': attr.borderWidth, 'stroke': attr.borderColor, fill: 'none'}));
		heatCount++;
	    return group;
	}


	function createHeatGradient(limit) {
		var svg = svgElem('svg').attr('style', 'width:0px; height:0px; position:fixed;');
		var defs = svgElem('defs');
		var linearGradient = svgElem('linearGradient').attr('id', 'heatgraph_gradient');
		for (var i=0; i<limit; i++) {
			var stop = svgElem('stop');
			var x = i/(limit-1);			
			linearGradient.append(stop.attr({'stop-color': 'hsl('+(255-((i*255/limit+30)%255))+',100%,50%)',
				'stop-opacity': 1, offset: (Math.pow(((x-0.5)*2),3) + 1)/2}));
			
		}
		defs.append(linearGradient);
		svg.append(defs);
		return svg;
	}


	function createPie(values, attr) {	
		var group = svgElem('g');
		var sum = listBinOp(values, function(a, b) {return a+b;});
		var centerX = attr.width/2;
		var centerY = attr.height/2;
		//-1 to compensate rounding errors
		var r = Math.min(attr.width, attr.height)/2-1;
		var x = r;
		var y = 0;
		
		for (i in values) {
			var value = values[i];
			if (value == sum) {
				group.append(svgElem('circle').attr({cx: centerX, cy: centerY, 'r': r, 'fill': attr.color[i]}));
				break;
			}
			else {
				var angleRad = listBinOp(values.slice(0, parse(i)+1), function(a, b) {return a+b;}) * 2 * Math.PI / sum;
				var dX = Math.cos(angleRad) * r - x;
				var dY = Math.sin(-angleRad) * r - y;
				var arcFlag = value>0 ? Math.round(value/sum) : 1-Math.abs(Math.round(value/sum));
			    group.append(svgElem('path')
			    	.attr({d: 'M ' + centerX + ',' + centerY + ' l ' + x + ',' + -y
			    			+ ' a ' + r + ','+ r + ' 0 ' + arcFlag + ' 1 ' + dX + ',' + -dY
			    			+ ' z', fill: attr.color[i]}));
			    x = x + dX;
			    y = y + dY;
			}
		}
		group.append(svgElem('circle')
				.attr({cx: centerX, cy: centerY, 'r': r-attr.borderWidth/2,
					stroke: attr.borderColor, 'stroke-width': attr.borderWidth, 'fill': 'none'}));
	    return group;
	}


	function createAngle(value, attr) {
		value = value%attr.fullAngle;
		var group = svgElem('g');
		var sum = attr.fullAngle;
		var centerX = attr.width/2;
		var centerY = attr.height/2;
		var angleRad = value * 2 * Math.PI / sum;
		var arcFlag = value>0 ? Math.round(value/sum) : 1-Math.abs(Math.round(value/sum));
		var dirFlag = attr.direction<0 ? 1 : 0
		//-1 to compensate rounding errors
		var r = Math.min(attr.width, attr.height)/2-1;
		var dX = Math.cos(angleRad) * r;
		var dY = attr.direction * (Math.sin(angleRad) * r);
		var rb = r*attr.innerBorderRadius + attr.innerBorderWidth/2;
		var dXb = Math.cos(angleRad) * rb;
		var dYb = attr.direction * (Math.sin(angleRad) * rb);
		var ri = r*attr.innerRadius;
		var dXi = Math.cos(angleRad) * ri;
		var dYi = attr.direction * (Math.sin(angleRad) * ri);
		var ro = r*attr.originInnerRadius;
		var rp = r*attr.pointerInnerRadius;
		var dXp = Math.cos(angleRad) * rp;
		var dYp = attr.direction * (Math.sin(angleRad) * rp);
		var color = attr.color[0];
		
		//full inner border
		if(value == 0) {
			group.append(svgElem('circle')
					.attr({cx: centerX, cy: centerY, 'r': rb, fill: 'none',
						stroke: attr.innerBorderColor, 'stroke-width': attr.innerBorderWidth}));
		}
		else {
			if (value < 0) {
				dirFlag = 1-dirFlag;
				arcFlag = 1-arcFlag;
				if (attr.color.length>=2) {
					color = attr.color[1];
				}
			}
			//inner border
			group.append(svgElem('path')
					.attr({d: 'M ' + (centerX+rb) + ',' + centerY
							+ ' a ' + rb + ','+ rb + ' 0 ' + (1-arcFlag) + ' ' + (1-dirFlag) + ' ' + ' ' + (dXb-rb) + ',' + -dYb, 
						fill: 'none', stroke: attr.innerBorderColor, 'stroke-width': attr.innerBorderWidth}));
			//normal pie
			group.append(svgElem('path')
					.attr({d: 'M ' + (centerX+ri) + ',' + centerY
							+ ' l ' + (r-ri) + ',' + 0 
							+ ' a ' + r + ','+ r + ' 0 ' + arcFlag + ' ' + dirFlag + ' ' + (dX-r) + ',' + -dY 
							+ ' l ' + (-dX+dXi) + ',' + (dY-dYi)
							+ ' a ' + ri + ','+ ri + ' 0 ' + arcFlag + ' ' + (1-dirFlag) + ' ' + (-dXi+ri) + ',' + dYi
							+ ' z', fill: color}));
		}
		//lines
		if (attr.originIsColor) {attr.originColor = color;}
		group.append(svgElem('path')
				.attr({d: 'M ' + (centerX+ro) + ',' + centerY + ' l ' + (r-ro) + ',' + 0, 
					stroke: attr.originColor, 'stroke-width': attr.originWidth, fill: 'none'}));
		if (attr.pointerIsColor) {attr.pointerColor = color;}
		group.append(svgElem('path')
				.attr({d: 'M ' + (centerX+dXp) + ',' + (centerY-dYp) + ' l ' + (dX-dXp) + ',' + (-dY+dYp), 
					stroke: attr.pointerColor, 'stroke-width': attr.pointerWidth, fill: 'none'}));
		//border
		group.append(svgElem('circle')
				.attr({cx: centerX, cy: centerY, 'r': r-attr.borderWidth/2, stroke: attr.borderColor,
					'stroke-width': attr.borderWidth, 'fill': 'none'}));
	    return group;
	}


	function createWarn (attr) {
		var group = svgElem('g');
		var centerX = attr.width/2;
		var centerY = attr.height/2;
		var l = Math.min(attr.width, attr.height);
		var ls = 0.6*l;
		var lss = ls*0.09;
		var dY = Math.sqrt(Math.pow(l,2)-(Math.pow(l/2,2)));
		var dYs = Math.sqrt(Math.pow(ls,2)-(Math.pow(ls/2,2)));
		group.append(svgElem('path')
			.attr({d: 'M ' + (centerX+l/2) + ',' + (centerY+dY/2) 
					+ ' l ' + -l + ',' + 0
					+ ' l ' + (l/2) + ',' + -dY
					+ ' z'
					+ ' M ' + (centerX+ls/2) + ',' + (centerY+(dY/2)-(((l-ls)/2)*(Math.sin(Math.PI/180*30)/(Math.sin(Math.PI/180*60)))))
					+ ' l ' + -ls + ',' + 0
					+ ' l ' + (ls/2) + ',' + -dYs
					+ ' z '
					+ ' M ' + centerX + ',' + (centerY + ls*0.5)
					+ ' a ' + lss + ','+ lss + ' 0 0 0 0,' + -lss*2
					+ ' a ' + lss + ','+ lss + ' 0 0 0 0,' + lss*2
					+ ' z'
					+ ' M ' + centerX + ',' +  (centerY + ls*0.28) 
					+ ' c ' + -lss + ',0 ' + -lss + ',' + -4*lss + ' ' + -lss + ',' + -4*lss 
							+ ' 0,' + -0.5*lss + ' ' + 0.5*lss + ',' + -lss + ' ' + lss + ',' + -lss + ' ' 
							+ 0.5*lss + ',0 ' + lss + ',' + 0.5*lss + ' ' + lss + ',' + lss 
							+ ' 0,' + 0.5*lss + ' 0,' + 4*lss + ' ' + -lss + ',' + 4*lss
					+ ' z',
					'fill-rule': 'evenodd', fill: attr.interceptionColor}));
		return group;	
	}

		
	function parse (value) {
	    switch (value) {
	    	case 'null': return null;
	        case 'undefined': return undefined;
	        case 'true': return true;
	        case 'false': return false;
	        default:
	        	var number = parseFloat(value);
	        	if (isNumber(number)) {return number;}
	        	else {return value;}
	    }
	}


	function isNumber(value) {
		return isFinite(value) && !isNaN(parseFloat(value));
	}


	function isNumbers(values) {
		for (value in values) {
			if (!isNumber(values[value])) {
				return false;
			}
		}
		return true;
	}


	function listBinOp(list, fun) {
		temp = 0;
		for (elem in list) {
			temp = fun(temp, list[elem]);
		}
		return temp;
	}


	function listOp(list, fun) {
		temp = [];
		for (elem in list) {
			temp.push(fun(list[elem]));
		}
		return temp;
	}
}