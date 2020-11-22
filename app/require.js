var path = require('path'),
	mime = require('mime'),
	web = {};

exports.cache = {};

exports.init = (fs, base_dir, user, stack = 'main') => {
	var require = (dire, options) => {
		var file = path.resolve(dire);
		
		if(/^[^\.\/\\]/g.test(dire) && exports.cache[dire])return exports.cache[dire];
		
		// add js extension if missing
		if(!path.extname(file))file = file + '.js';
		
		if(!fs.existsSync(file))file = path.join(base_dir, file);
		
		if(!fs.existsSync(file))throw new TypeError('Cannot find module \'' + file + '\' <' + stack + '>');
		
		if(exports.cache[file])return exports.cache[file];
		
		return require.exec(fs.readFileSync(file), file, options);
	};
	
	require.user = { name: '', home: '' };
	
	require.exec = (script, file, options = { cache: true }) => {
		if(mime.getType(file) == 'application/json')return JSON.parse(file);
		
		var _exports = {},
			_module = {
				get exports(){
					return _exports;
				},
				set exports(v){
					_exports = v;
					return true;
				},
			},
			args = {
				module: _module,
				exports: _exports,
				require: exports.init(fs, path.dirname(file), require.user, file),
				Buffer: Buffer,
				__filename: file,
				__dirname: path.dirname(file),
				web: web,
			};
		
		args.require.user = require.user;
		
		new Function(Object.keys(args), script)(...Object.values(args));
		
		return options.cache ? exports.cache[file] = _exports : _exports;
	};
	
	return require;
};