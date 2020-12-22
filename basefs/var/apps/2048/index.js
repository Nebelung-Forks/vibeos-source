var ui = require('/lib/ui.js');

exports.opts = {
	x: ui.align.middle, 
	y: ui.align.middle,
	width: 300,
	height: 400,
	menu: {
		File: {
			Exit(window){
				window.close();
			},
		},
		Game: {
			Reset(window){
				window.game.start();
			},
		},
	},
};

exports.open = window => {
	var game = window.game = {
			color: {
				// BG | TEXT
				2: ["#eee4da", "#776e65"],
				4: ["#ede0c8", "#776e65"],
				8: ["#f2b179", "#f9f6f2"],
				16: ["#f59563", "#f9f6f2"],
				32: ["#f67c5f", "#f9f6f2"],
				64: ["#f65e3b", "#f9f6f2"],
				128: ["#edcf72", "#f9f6f2"],
				256: ["#edcc61", "#f9f6f2"],
				512: ["#edc850", "#f9f6f2"],
				1024: ["#edc53f", "#f9f6f2"],
				2048: ["#edc22e", "#f9f6f2"],
			},
			con: window.content.append(new ui.rect({
				color: '#BAA',
				radius: 6,
				width: '80%',
				get height(){
					return this.fixed.width;
				},
				x: ui.align.middle,
				y: ui.align.bottom,
				offset: {
					get y(){
						return (window.content.fixed.width - game.con.fixed.width) * -0.5;
					},
				},
			})),
			dirs: {
				ArrowUp: 'up',
				ArrowDown: 'down',
				ArrowLeft: 'left',
				ArrowRight: 'right',
			},
			score: 0,
			best: 0,
			start(){
				game.cells.forEach(cell => {
					cell.deleted = true;
				});
				
				game.cells = [];
				
				game.score = 0;
				game.add_cell();
			},
			grid: 4,
			cells: [],
			get_cell(x, y){
				return this.cells.find(cell => cell.grid_x == x && cell.grid_y == y);
			},
			cell: class extends ui.element {
				constructor(x, y){
					super({
						margin: 5,
						radius: 5,
						get x(){
							return ((this.width + this.margin) * this.grid_x) + (this.margin * 2);
						},
						get y(){
							return ((this.height + this.margin) * this.grid_y) + (this.margin * 2);
						},
						get width(){
							return (game.con.fixed.width / game.grid) - (this.margin * 2);
						},
						get height(){
							return (game.con.fixed.height / game.grid) - (this.margin * 2);
						},
						grid_x: x,
						grid_y: y,
						count: 2,
						get visible(){
							return this.count;
						},
					}, {});
					
					var thise = this;
					
					this.text = this.append(new ui.text({
						x: ui.align.middle,
						y: ui.align.middle,
						get text(){
							return thise.count;
						},
						get color(){
							return game.color[thise.count][1];
						},
						weight: 'bold',
					}));
				}
				draw(ctx, dims){
					ctx.fillStyle = game.color[this.count][0];
					
					ctx.fillRect(this.fixed.x, this.fixed.y, this.fixed.width, this.fixed.height);
				}
			},
			over(){
				
			},
			add_cell(){
				var shuffled = [];
				
				for (var i = game.cells.length - 1; i > 0; i--) {
					var j = Math.floor(Math.random() * (i + 1));
					var temp = game.cells[i];
					
					shuffled[i] = game.cells[j];
					shuffled[j] = temp;
				}
				
				var grid_spaces = game.grid_spaces();
				
				if(!grid_spaces.length)return game.over();
				
				var space = grid_spaces[~~(Math.random() * grid_spaces.length)],
					cell = game.con.append(new game.cell(space[0], space[1]));
				
				game.cells.push(cell);
				
				return cell;
			},
			max_cells(){
				return Array.from(Array(this.grid * this.grid)).map((val, ind) => [ ind % 4, ~~(ind / 4) ]);
			},
			grid_spaces(){
				var max_cells = this.max_cells();
				
				return max_cells.filter(([ x, y ]) => !this.get_cell(x, y));
			},
			key(dir){
				var change = {
					x: dir == 'left' ? -1 : dir == 'right' ? 1 : 0,
					y: dir == 'up' ? -1 : dir == 'down' ? 1 : 0,
				};
				
				Array.from(Array(game.grid)).forEach((x, ind) => game.cells.forEach(cell => {
					var inc_x = Math.min(Math.max(cell.grid_x + change.x, 0), game.grid - 1),
						inc_y = Math.min(Math.max(cell.grid_y + change.y, 0), game.grid - 1),
						intersect = game.cells.find(fe => fe.grid_x == inc_x && fe.grid_y == inc_y && fe.count);
					
					if(intersect && intersect != cell && intersect.count == cell.count){
						game.score += intersect.count *= 2;
						
						if(game.score > game.best)game.best = game.score;
						
						var in_arr = game.cells.findIndex(c => c == cell);
						
						if(in_arr != -1)game.cells.splice(in_arr, 1);
						
						cell.deleted = true;
					}
					
					if(!intersect){
						cell.grid_x = inc_x;
						cell.grid_y = inc_y;
					}
				}));
				
				game.add_cell();
			},
			counter: class extends ui.rect {
				constructor(label, gen_text, ofs){
					super({
						color: '#BAA',
						radius: 6,
						width: 80,
						height: 50,
						x: ui.align.right,
						y: 10,
					});
					
					Object.defineProperty(this.offset, 'x', { get: _ => (window.content.fixed.width - game.con.fixed.width) * -(0.5 + ofs) });
					
					this.value = 0;
					
					this.label = this.append(new ui.text({
						color: '#EEE4DA',
						text: label,
						x: ui.align.middle,
						y: 15,
						wrap: false,
					}));
					
					this.counter = this.append(new ui.text({
						color: '#F0F8FF',
						get text(){
							return gen_text();
						},
						x: ui.align.middle,
						y: 35,
						size: 24,
						weight: 'bold',
						wrap: false,
					}));
					
					window.content.append(this);
				}
			},
		},
		score = new game.counter('SCORE', () => game.score, 0),
		best = new game.counter('BEST', () => game.best, 1.5);

	window.content.on('keydown', event => {
		if(game.dirs[event.code])game.key(game.dirs[event.code]);
	});

	game.add_cell();
	
	window.content.color = '#FFE';
};