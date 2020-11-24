var screen = web.screen = exports;

screen.dims = {
	x: 0,
	y: 0,
	width: 1000,
	height: 600,
};

var fs = require('fs'),
	dom_utils = require('./dom-utils.js'),
	ui = require('./ui.js'),
	events = require('events'),
	request_frame = window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || (func => setTimeout(func, 1000 / 60)),
	container = screen.container = dom_utils.add_ele('div', document.body, {
		width: screen.dims.width,
		height: screen.dims.height,
		style: `
			overflow: hidden;
			display: block;
			position: absolute;
			width: ${screen.dims.width}px;
			height: ${screen.dims.height}px;
			margin: auto;
			top: 0px;
			bottom: 0px;
			left: 0px;
			right: 0px;
			outline: none;`,
	}),
	canvas = screen.canvas = dom_utils.add_ele('canvas', screen.container, {
		contentEditable: true,
		className: 'webos',
		width: screen.dims.width,
		height: screen.dims.height,
		style: `
			width: ${screen.dims.width}px;
			height: ${screen.dims.height}px;
			outline: none;`,
	}),
	mouse = web.mouse = Object.assign(new events(), {
		buttons: {},
		previous: {},
		focused: [],
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
				mouse.emit('mousedown', event, mouse);
			}
			
			var all_elements = [],
				add_elements = (arr, dims) => arr.filter(element => element.visible && element.interact).forEach(element => {
					// only_contents flag exists for interact
					
					if(element.interact === true)all_elements.push(element);
					
					add_elements(element.elements, element.fixed);
				});
			
			add_elements(screen.layers, screen.dims);
			
			/*
			// fix always_on_top elements not recieving cursor events as if they are on top
			*/
			
			all_elements = mouse.all_elements = all_elements.sort((ele, pele) => pele.layer - (pele.always_on_top ? ele.layer - pele.layer : ele.layer));
			
			var target = all_elements.find(element => screen.element_in_mouse(element)) || { emit(){}, cursor: 'pointer', };
			
			target.mouse_hover = true;
			
			mouse.cursor = target.cursor;
			
			if(event.type == 'mousedown' && mouse.buttons.left)mouse.target = target;
			else if(event.type == 'mouseup')mouse.target = null;
			
			mouse.target_hover = target;
			
			if(event.type == 'mousedown' && mouse.buttons.left)target.mouse_left = true;
			else if(event.type == 'mousedown' && mouse.buttons.right)target.mouse_right = true;
			else if(event.type == 'mousedown' && mouse.buttons.middle)target.mouse_middle = true;
			else if(event.type == 'mouseup')target.mouse_left = target.mouse_right = false;
			
			all_elements.filter(element => element.uuid != target.uuid).forEach(element => {
				element.mouse_left = element.mouse_right = element.mouse_middle = element.mouse_hover = element.mouse_pressed = false;
			});
			
			target.emit(event.type, event, mouse);
			
			if(mouse.buttons.left && event.type == 'mouseup')target.emit('click', event, mouse);
			else if(mouse.buttons.right && event.type == 'mouseup')target.emit('contextmenu', event, mouse);
			
			target.mouse_pressed = mouse.buttons.left;
			
			if(mouse.target)mouse.target.mouse_pressed = mouse.buttons.left ? true : false;
			
			if(mouse.target && mouse.target.mouse_pressed)mouse.target.emit('drag', mouse);
			
			if(mouse.target && mouse.target.mouse_pressed && mouse.target.drag){
				mouse.target.drag.offset.x += mouse.movement.x;
				mouse.target.drag.offset.y += mouse.movement.y;
			}
			
			var wins = all_elements.filter(element => element instanceof ui.window).sort((ele, pele) => ele.layer - pele.layer),
				target_win = wins.find(element => element.includes(target));
			
			if(event.type == 'mousedown'){
				if(target_win && target.steal_focus){
					wins.forEach(element => {
						element.active = false;
						target_win.layer = element.layer + element.elements.length + 1;
					});
					
					target_win.active = true;
				}else if(target.steal_focus)wins.forEach(element => element.active = false);
				
				mouse.focused = [];
				all_elements.forEach(element => {
					if(element.includes(target)){
						mouse.focused.push(element);
						element.focused = target.steal_focus ? element.toggle_focus ? !element.focused : true : element.focused;
						
						element.should_be_focused = element.toggle_focus ? !element.should_be_focused : true;
					}else element.focused = element.should_be_focused = false;
				});
			}else if(event.type == 'mousedown')target.focused = target.toggle_focus ? !target.focused : true;
			
			if(event.type == 'mouseup'){
				mouse.buttons[which] = false;
				mouse.emit('mouseup', event, mouse);
			}
		},
	}),
	keyboard = web.keyboard = Object.assign(new events(), {
		handler(event){
			// event.preventDefault();
			
			keyboard.emit(event.type, event);
			
			// if(!screen.mouse.target_hover)return;
			
			/*screen.mouse.all_elements.forEach(element => {
				if(element.includes(screen.mouse.target))element.focused = true;
				else element.focused = false;
			});
			
			// console.log(screen.mouse.target_hover, event.type);
			.emit(event.type, event);*/
		},
		paste(event){
			var data = (event.clipboardData || window.clipboardData).getData('text');
			
			mouse.focused.forEach(ele => ele.emit('paste', { text: data, event: event }));
		},
	});

canvas.addEventListener('mousemove', mouse.handler);
canvas.addEventListener('mousedown', mouse.handler);
canvas.addEventListener('mouseup', mouse.handler);
canvas.addEventListener('wheel', mouse.handler);
canvas.addEventListener('contextmenu', event => (event.preventDefault(), mouse.handler(event)));
canvas.addEventListener('mouseleave', () => mouse.buttons = {});

window.addEventListener('paste', keyboard.paste);
window.addEventListener('keydown', keyboard.handler);
window.addEventListener('keyup', keyboard.handler);

document.body.style = 'margin: 0px; background: #000;';

var ctx = web.ctx = canvas.getContext('2d');



screen.layers = Object.assign([
	// apparently you can assign properties while initating array??
	web.bg = new ui.image({
		width: '100%',
		height: '100%',
		path: '/usr/share/wallpaper/default.png',
		steal_focus: false,
	}),
	web.bar = new ui.bar({}),
], {
	append(...elements){
		screen.layers.push(...elements);
		
		return elements[0];
	}
});

web.bg.context_menu = screen.layers.append(new ui.context_menu({
	triggers: [ web.bg ],
	items: [{
		title: 'browser test',
		icon: '/usr/share/categ/multimedia.png',
		path: '/var/apps/web.js',
	},{
		title: 'About vibeOS',
		icon: '/usr/share/categ/office.png',
		path: '/var/xml/about.xml',
	}],
}));

screen.render = () => {
	container.style.width = screen.dims.width + 'px';
	container.style.height = screen.dims.height + 'px';
	
	canvas.width = screen.dims.width;
	canvas.height = screen.dims.height;
	
	
	var render_through = (elements, dims) => {
		elements.filter(ele => !ele.visible).forEach(element => element.emit('not_visible'));
		
		elements.filter(ele => ele.visible).sort((ele, pele) => ele.layer - pele.layer).forEach(element => {
			if(element.deleted){
				var ind = elements.findIndex(pele => pele.uuid == element.uuid);
				
				if(ind != null)elements.splice(ind, 1);
			}
			
			ctx.save();
			
			element.fixed = ui.fixed_sp(element, dims);
			
			if(dims.clip && element.apply_clip){
				var region = new Path2D();
				region.rect(dims.x, dims.y, dims.width, dims.height);
				ctx.clip(region, 'evenodd');
			}
			
			if(dims.translate && element.apply_translate)ctx.translate(dims.translate.x, dims.translate.y);
			
			ctx.filter = element.filter;
			
			if(element.radius){
				var region = new Path2D(),
					half_rad = (2 * Math.PI) / 2,
					quat_rad = (2 * Math.PI) / 4,
					radius = typeof element.radius == 'number' ? {
						t: { // top
							l: element.radius,
							r: element.radius,
						},
						b: { // bottom
							l: element.radius,
							r: element.radius,
						},
					} : {
						t: typeof element.radius.t == 'number' ? {
							l: element.radius.t,
							r: element.radius.t,
						} : element.radius.t,
						b: typeof element.radius.b == 'number' ? {
							l: element.radius.b,
							r: element.radius.b,
						} : element.radius.b,
					},
					fixed = element.fixed;
				
				// top left
				region.arc(radius.t.l + fixed.x, radius.t.l + fixed.y, radius.t.l, -quat_rad, half_rad, true);
				region.lineTo(fixed.x, fixed.y + fixed.height - radius.t.l);

				// bottom left
				region.arc(radius.b.l + fixed.x, fixed.height - radius.b.l + fixed.y, radius.b.l, half_rad, quat_rad, true);
				region.lineTo(fixed.x + fixed.width - radius.b.l, fixed.y + fixed.height);

				// bottom right
				region.arc(fixed.x + fixed.width - radius.b.r, fixed.y + fixed.height - radius.b.r, radius.b.r, quat_rad, 0, true);
				region.lineTo(fixed.x + fixed.width, fixed.y + radius.b.r);
				
				// top right
				region.arc(fixed.x + fixed.width - radius.t.r, fixed.y + radius.t.r, radius.t.r, 0, -quat_rad, true);
				region.lineTo(fixed.x + radius.t.r, fixed.y);
				
				ctx.clip(region, 'evenodd');
			}
			
			element.draw(ctx, dims);
			ctx.restore();
			
			if(element.scroll){
				ctx.save();
				element.draw_scroll(ctx, dims);
				ctx.restore();
			}
			
			render_through(element.elements, ui.fixed_sp(element, dims));
		});
	};
	
	render_through(screen.layers, screen.dims);
	
	canvas.style.cursor = 'url("' + fs.data_uri('/usr/share/cursor/' + mouse.cursor + '.cur') + '"), none';
	
	request_frame(screen.render);
};

screen.element_in_mouse = element => {
	if(!element.fixed)return;
	
	var region = {
			sx: element.fixed.x,
			sy: element.fixed.y,
			mx: element.fixed.x + element.fixed.width,
			my: element.fixed.y + element.fixed.height,
		};
	
	if(region.sx <= mouse.x && region.sy <= mouse.y && region.mx >= mouse.x && region.my >= mouse.y)return true;
}