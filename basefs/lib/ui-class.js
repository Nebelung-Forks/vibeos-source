var fs = require('fs'),
	events = require('events'),
	colors = {
		window: {
			primary_hover: '#E81123',
			primary_pressed: '#9B4666',
			active: {
				main: '#2997CC',
				border: '#3C9ECD',
				text: '#000000',
				secondary_hover: '#2588B7',
			},
			inactive: {
				main: '#FFFFFF',
				border: '#434343',
				text: '#AAAAAA',
				secondary_hover: '#E5E5E5',
			},
		},
	};

exports.align = {
	left: Symbol(),
	right: Symbol(),
	top: Symbol(),
	bottom: Symbol(),
	middle: Symbol(),
};

exports.gen_uuid = () => [...Array(4)].map(() => {
	var d0 = Math.random() * 0xffffffff | 0;
	return ('' + (d0 & 0xff).toString(16)).padStart(2, 0) + ('' + (d0 >> 8 & 0xff).toString(16)).padStart(2, 0) + ('' + (d0 >> 16 & 0xff).toString(16)).padStart(2, 0) + ('' + (d0 >> 24 & 0xff).toString(16)).padStart(2, 0)
}).join('-').toUpperCase();

exports.percentage = (perc, full) => (perc * full) / 100;

exports.fixed_sp = (data, bounds) => {
	var data = Object.assign({}, data),
		correct = {
			width: 0,
			height: 0,
			x: 0,
			y: 0,
		},
		proc = (val, cor) => {
			var type = ((val || 0) + '').replace(/[^a-z%]/gi, '') || 'px', // get exact type (%, px, rem, etc..)
				actu = Number((val + '').replace(/[a-z%]/gi, '')), // remote types or characters
				ret = actu;
			
			switch(type){
				case'%':
					
					ret = exports.percentage(actu, cor);
					
					break;
			}
			
			return ret;
		};
	
	correct.width = proc(data.width, bounds.width) + (data.offset.width || 0);
	correct.height = proc(data.height, bounds.height) + (data.offset.height || 0);
	
	switch(data.x){
		case exports.align.middle:
			data.x = (bounds.width / 2) - (correct.width / 2);
			break;
		case exports.align.right:
			data.x = bounds.width - correct.width;
			break;
		case exports.align.left:
			data.x = correct.width;
			break;
	}
	
	switch(data.y){
		case exports.align.middle:
			data.y = (bounds.height / 2) - (correct.height / 2);
			break;
		case exports.align.top:
			data.y = correct.height;
			break;
		case exports.align.bottom:
			data.y = bounds.height - correct.height;
			break;
	}
	
	correct.x = bounds.x + proc(data.x, bounds.width) + (data.offset.x || 0);
	correct.y = bounds.y + proc(data.y, bounds.height) + (data.offset.y || 0);
	
	return correct;
}

exports.last_layer = 0;

exports.element = class extends events {
	constructor(opts, addon){
		super();
		
		this.x = 0;
		this.y = 0;
		this.width = 0;
		this.height = 0;
		
		this.uuid = exports.gen_uuid();
		
		this.elements = [];
		// layer out of parent elements
		this.layer = exports.last_layer++;
		
		this.interact = true;
		this.visible = true;
		
		this.deleted = false;
		
		// x-change, y-change are passed to rendering since cant add to any width or height properties if they are 50% or a symbol
		this.offset = {
			x: 0,
			y: 0,
			width: 0,
			height: 0,
		};
		
		Object.assign(this, addon, opts);
		
		return this;
	}
	append(element){
		var layer = this.elements.length + 1;
		
		this.elements.push(element);
		
		Object.defineProperty(element, 'layer', { get: () => this.layer + layer });
		
		return element;
	}
	includes(element){
		var seen = new Set(),
			in_arr = arr => arr.some(val => {
				if(seen.has(val))return;
				
				seen.add(val);
				return val.uuid == element.uuid || in_arr(val.elements);
			});
			
		return this.uuid == element.uuid || in_arr(this.elements);
	}
};

exports.text = class ui_text extends exports.element {
	constructor(opts){
		super(opts, {
			size: 16,
			family: 'Calibri',
			text: 'Placeholder',
			align: 'start',
			color: '#FFF',
		});
	}
	draw(ctx, dims){
		ctx.fillStyle = this.color;
		ctx.textAlign = this.align;
		ctx.textBaseline = this.baseline;
		ctx.font = (this.weight ? this.weight + ' ' : '') + this.size + 'px ' + this.family;
		
		var measured = ctx.measureText(this.text);
		
		this.width = measured.width;
		this.height = this.size;
		
		var fixed = exports.fixed_sp(this, dims);
		
		ctx.fillText(this.text, fixed.x, fixed.y);
	}
}

exports.button = class ui_button extends exports.element {
	constructor(opts){
		super(opts, {
			
		});
	}
	draw(ctx, dims){
		
	}
}

exports.rect = class ui_rect extends exports.element {
	constructor(opts){
		super(opts, {
			color: '#FFF',
		});
	}
	draw(ctx, dims){
		ctx.fillStyle = this.color;
		
		var fixed = exports.fixed_sp(this, dims);
		
		ctx.fillRect(fixed.x, fixed.y, fixed.width, fixed.height);
	}
}

exports.border = class ui_rect extends exports.element {
	constructor(opts){
		super(opts, {
			color: '#FFF',
			size: 2,
			// prevent this from stealing mouse events
			interact: false,
		});
	}
	draw(ctx, dims){
		ctx.strokeStyle = this.color;
		ctx.lineWidth = this.size;
		
		var fixed = exports.fixed_sp(this, dims);
		
		ctx.strokeRect(fixed.x, fixed.y, fixed.width, fixed.height);
	}
}

exports.image = class ui_image extends exports.element {
	constructor(opts){
		super(opts, {
			path: '/usr/share/missing.png',
		});
		
		// determine if there is a protocol for the image, otherwise load from filesystem
		this.image = Object.assign(new Image(), {
			src: /^\w+:\/{2}/.test(this.path) ? this.path : fs.data_uri(this.path),
		});
	}
	draw(ctx, dims){
		var fixed = exports.fixed_sp(this, dims);
		
		ctx.drawImage(this.image, fixed.x, fixed.y, fixed.width, fixed.height);
	}
}

exports.window = class ui_window extends exports.rect {
	constructor(opts){
		var othis = super(opts);
		
		Object.assign(this, {
			title: 'Placeholder',
			width: 200,
			height: 200,
			buttons: {},
		}, opts);
		
		this.border = this.append(new exports.border({
			size: 3,
			width: this.width,
			height: this.height,
		}));
		
		this.title_bar = this.append(new exports.rect({
			width: '100%',
			height: 32,
			drag: this,
		}));
		
		this.title_text = this.title_bar.append(new exports.text({
			x: this.icon ? 32 : 8,
			y: 16,
			size: 14,
			baseline: 'middle',
			height: '100%',
			text: this.title,
			interact: false,
		}));
		
		this.buttons.close = this.title_bar.append(new exports.rect({
			x: exports.align.right,
			y: 0,
			width: 45,
			height: 29,
			offset: {
				x: -1,
				y: 1,
			},
		}));
		
		this.buttons.close.text = this.buttons.close.append(new exports.text({
			x: exports.align.middle,
			y: 15,
			size: 14,
			baseline: 'middle',
			width: '100%',
			height: '100%',
			text: '✕',
			interact: false,
		}));
		
		this.buttons.close.on('mouseup', event => {
			this.deleted = true;
			// setting deleted to true will allow element to be picked up by renderer for deletion
		});
		
		Object.defineProperty(this.buttons.close, 'color', { get: () => this.buttons.close.mouse_pressed
			? colors.window.primary_pressed
			: this.buttons.close.mouse_hover
				? colors.window.primary_hover
				: this.active
					? colors.window.active.main
					: colors.window.inactive.main
		});
		
		Object.defineProperty(this.buttons.close.text, 'color', { get: _ => (this.buttons.close.mouse_pressed || this.buttons.close.mouse_hover) ? '#FFF' : '#000' });
		
		Object.defineProperty(this.border, 'color', {
			get: () => this.active ? colors.window.active.border : colors.window.inactive.border,
		});
		
		Object.defineProperty(this.title_bar, 'color', {
			get: () => this.active ? colors.window.active.main : colors.window.inactive.main,
		});
		
		Object.defineProperty(this.title_text, 'color', {
			get: () => this.active ? colors.window.active.text : colors.window.inactive.text,
		});
		
		if(this.icon)this.title_image = this.title_bar.append(new exports.image({
			path: this.icon,
			width: 16,
			height: 16,
			x: 8,
			y: exports.align.middle,
		}));
		
		this.content = this.append(new exports.rect({
			y: 32,
			color: '#fff',
			width: '100%',
			height: '100%',
			offset: {
				x: 0,
				y: 0,
				width: 0,
				height: -32,
			},
		}));
	}
	draw(ctx, dims){
		
	}
}