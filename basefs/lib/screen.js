var dims = exports.dims = {
		x: 0,
		y: 0,
		width: 854,
		height: 480,
	},
	fs = require('fs'),
	dom_utils = require('./dom-utils.js'),
	ui = require('./ui-class.js'),
	request_frame = window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || (func => setTimeout(func, 1000 / 60)),
	canvas = exports.canvas = dom_utils.add_ele('canvas', document.body, {
		className: 'webos',
		width: dims.width,
		height: dims.height,
		style: `
			display: block;
			position: absolute;
			width: ${dims.width}px;
			height: ${dims.height}px;
			margin: auto;
			top: 0px;
			bottom: 0px;
			left: 0px;
			right: 0px;`,
	}),
	mouse = exports.mouse = Object.assign(new (require('events')), {
		buttons: {},
		previous: {},
		cursor: 'pointer',
		handler(event){
			mouse.previous.x = mouse.x || 0;
			mouse.previous.y = mouse.y || 0;
			
			mouse.x = event.layerX;
			mouse.y = event.layerY;
			
			mouse.movement = {
				x: mouse.x - mouse.previous.x,
				y: mouse.y - mouse.previous.y,
			};
			
			var which = ([
				'none',
				'left',
				'middle',
				'right',
			])[event.which];
			
			if(event.type == 'mousedown'){
				mouse.buttons[which] = true;
				mouse.emit('mousedown');
			}else if(event.type == 'mouseup'){
				mouse.buttons[which] = false;
				mouse.emit('mouseup');
			}
			
			var all_elements = [],
				add_elements = (arr, dims) => arr.filter(element => element.visible && element.interact).forEach(element => {
					var fixed = ui.fixed_sp(element, dims);
					
					element.fixed = fixed;
					
					all_elements.push(element);
					
					add_elements(element.elements, fixed);
				});
			
			add_elements(exports.render_layers, dims);
			
			all_elements = all_elements.sort((ele, pele) => pele.layer - ele.layer);
			
			var target = all_elements.find(element => exports.element_in_mouse(element)) || { emit(){} };
			
			target.mouse_hover = true;
			
			if(event.type == 'mousedown' && mouse.buttons.left)mouse.target = target;
			else if(event.type == 'mouseup')mouse.target = null;
			
			if(event.type == 'mousedown' && mouse.buttons.left)target.mouse_left = true;
			else if(event.type == 'mousedown' && mouse.buttons.right)target.mouse_right = true;
			else if(event.type == 'mousedown' && mouse.buttons.middle)target.mouse_middle = true;
			else if(event.type == 'mouseup')target.mouse_left = target.mouse_right = false;
			
			all_elements.filter(element => element.uuid != target.uuid).forEach(element => {
				element.mouse_left = element.mouse_right = element.mouse_middle = element.mouse_hover = element.mouse_pressed = false;
			});
			
			target.emit(event.type, event);
			
			target.mouse_pressed = mouse.buttons.left;
			
			if(mouse.target)mouse.target.mouse_pressed = mouse.buttons.left ? true : false;
			
			if(mouse.target && mouse.target.mouse_pressed && mouse.target.drag){
				mouse.target.drag.offset.x += mouse.movement.x;
				mouse.target.drag.offset.y += mouse.movement.y;
			}
			
			var wins = all_elements.filter(element => element instanceof ui.window).sort((ele, pele) => ele.layer - pele.layer),
				target_win = wins.find(element => element.includes(target));
			
			if(target_win && event.type == 'mousedown'){
				wins.forEach(element => {
					element.active = false;
					target_win.layer = element.layer + element.elements.length + 1;
				});
				
				target_win.active = true;
			}else if(event.type == 'mousedown')wins.forEach(element => element.active = false);
		},
	}),
	render_layers = class extends Array {
		append(...elements){
			this.push(...elements);
			
			return this;
		}
	};

canvas.addEventListener('mousemove', mouse.handler);
canvas.addEventListener('mousedown', mouse.handler);
canvas.addEventListener('mouseup', mouse.handler);
canvas.addEventListener('mousescroll', mouse.handler);
canvas.addEventListener('contextmenu', event => (event.preventDefault(), mouse.handler(event)));
canvas.addEventListener('mouseleave', () => mouse.buttons = {});

document.body.style = 'margin: 0px; background: #000;';

var ctx = exports.ctx = canvas.getContext('2d');

exports.render_layers = new render_layers();

exports.render = () => {
	var render_through = (orig_elements, dims) => {
		// keep original elements reference to delete any garbage
		var elements = orig_elements.filter(element => element.visible);
		
		elements.sort((ele, pele) => ele.layer - pele.layer).forEach(element => {
			if(element.deleted){
				var ind = orig_elements.findIndex(pele => pele.uuid == element.uuid);
				
				if(ind)orig_elements.splice(ind, 1);
			}
			
			ctx.save();
			element.draw(ctx, dims);
			ctx.restore();
			
			render_through(element.elements, ui.fixed_sp(element, dims));
		});
	};
	
	render_through(exports.render_layers, dims);
	
	canvas.style.cursor = 'url("' + fs.data_uri('/usr/share/cursor/' + mouse.cursor + '.cur') + '"), none';
	
	request_frame(exports.render);
};

exports.element_in_mouse = element => {
	var region = {
			sx: element.fixed.x,
			sy: element.fixed.y,
			mx: element.fixed.x + element.fixed.width,
			my: element.fixed.y + element.fixed.height,
		};
	
	if(region.sx <= mouse.x && region.sy <= mouse.y && region.mx >= mouse.x && region.my >= mouse.y)return true;
}