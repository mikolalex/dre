(function() {
	
	var error = function() {
		console.log.apply(console, ['ERROR!'].concat(Array.prototype.slice.call(arguments)));
	}
	
	var hashCode = function() {
		var hash = 0, i, chr, len;
		if (this.length === 0)
			return hash;
		for (i = 0, len = this.length; i < len; i++) {
			chr = this.charCodeAt(i);
			hash = ((hash << 5) - hash) + chr;
			hash |= 0; // Convert to 32bit integer
		}
		return hash;
	};

	var compile = function(text) {
		
		var get_token_type = function(token){
			if(token.indexOf('{') === 0 || token.indexOf('%') === 0 ){
				return 'obj';
			}
			if(token.indexOf('[') === 0){
				return 'arr';
			}
			if(token.indexOf('(') === 0){
				return 'func';
			}
			return 'scalar';
		}
		
		var funcnames = 0;
		var arrnames = 0;
		var objnames = 0;
		
		var parse = {
			obj: function(conf){
				var body = conf.token.slice(1, -1);
				conf.create_level = 'inherit';
				if(conf.token.indexOf('%') === 0){// it has defined scope
					body = body.split('{');
					conf.create_level = body[0];
					//conf.push_level = body[0];
					conf.defined_scope = body[0];
					conf.create_level_decrease = true;
					body = body[1];
				}
				var fields = body.split(",");
				conf.fields = [];
				for(var i = 0; i < fields.length; i++){
					var res = {};
					var x = fields[i].split(":");
					var key = x[0];
					var val = x[1];
					if(val[0] === ' ') val = val.slice(1);
					if(key[0] === ' ') key = key.slice(1);
					//console.log('keyval', key, val);
					switch(key[0]){
						case '$': 
							res.key_type = 'layer';
							var this_key = key.slice(1);
							if(this_key.indexOf('.') !== -1){// some field of object
								var ps = this_key.split('.');
								res.key_layer = ps[0];
								res.key_field = ps[1];
							} else {
								res.key_layer = this_key;
							}
							conf.push_level = res.key_layer;
						break;
						case '@': // its link to another var 
							res.key_type = 'link_to_another_token';
							res.key_depends_on = key.slice(1);
						break;
						default: // it's static name  
							res.key_type = 'static';
							res.key_name = key;
						break;
					}
					switch(val[0]){
						case '$': 
							res.val_type = 'layer';
							var this_val = val.slice(1);
							if(this_val.indexOf('.') !== -1){// some field of object
								var ps = this_val.split('.');
								res.val_layer = ps[0];
								res.val_field = ps[1];
							} else {
								res.val_layer = this_val;
							}
						break;
						case '@': // its link to another var 
							res.val_type = 'link_to_another_token';
							res.val_depends_on = val.slice(1);
						break;
						default: // it's static name  
							res.val_type = 'static';
							res.val_val = val;
						break;
					}
					conf.fields.push(res);
				}
				if(!conf.push_level) conf.push_level = conf.create_level;
				conf.name = objnames++;
			},
			arr: function(conf){
				var body = conf.token.slice(1, -1);
				conf.create_level = 'inherit';
				if(conf.token.indexOf('%') === 0){// it has defined scope
					body = body.split('{');
					conf.create_level = body[0];
					body = body[1];
				}
				switch(body[0]){
					case '$': 
						conf.item_type = 'layer';
						var this_item = body.slice(1);
						if(this_item.indexOf('.') !== -1){// some field of object
							var ps = this_item.split('.');
							conf.item_layer = ps[0];
							conf.item_field = ps[1];
						} else {
							conf.item_layer = this_item;
						}
						conf.push_level = conf.item_layer;
					break;
					case '@': // its link to another var 
						conf.item_type = 'link_to_another_token';
						conf.depends_on = Number(body.slice(1)) + 0;
						
						conf.push_level = 'ask your child';
					break;
				}
				conf.name = arrnames++;
			},
			func: function(conf){
				var body = conf.token.slice(1, -1);
				//console.log('body', body);
				var args = body.split(",");
				var args_max_level_num = 0;
				var args_max_level = false;
				conf.args = [];
				for(var i = 0; i < args.length; i++){
					var res = {};
					var parts = args[i].match(/\s?(\@(\d{1,}))?(\$([^\?\^]*)?)?(\^)?(\?(.*)?)?/mi);
					//console.log('paria', parts);
					if(parts[2]){// it's @num link
						res.depends_on = parts[2];
					} else {
						var pz = parts[4].split('.');
						var level = pz[0];
						if(pz[1]){
							res.use_key = pz[1];
						}
						//console.log('level', level);
						res.push_level = level;
						res.type = 'scalar';
						//console.log('lll', get_level_num_by_name(level), level, args_max_level_num);
						if(get_level_num_by_name(level) > args_max_level_num) {
							args_max_level = level;
							args_max_level_num = get_level_num_by_name(level);
						}
					}
					if(parts[5]) {
						conf.func_type = 'count';
					} else {
						if(!parts[7]){
							// this function is passed as an argument to dre()
						} else {
							//console.log('FUNC is', parts[7][0]);
							switch(parts[7][0]){
								case '!': // reduce function
									conf.func_type = 'reduce';
									if(parts[4].indexOf('.') !== -1){
										var prts = parts[4].split('.');
										conf.key = prts[1];
									}
									if(parts[7][1]){
										conf.func = parts[7][1];
									}
								break;
								case '?': // map function
									conf.func_type = 'map';
								break;
								case '=': // filter function
									conf.func_type = 'filter';
								break;
								case '+': // 
								case '-': // 
								case '*': // 
								case '/': // aryphmetic function
									conf.func_type = 'aryphmetic';
									conf.func = parts[7][0];
								break;
							}
						}
					}
					conf.args.push(res);
				}
				conf.push_level = args_max_level;
				conf.create_level = 'inherit';
				conf.name = funcnames++;
				//console.log('args', args);
			},
		}
		
		var parts = text.match(/([^>]*?)\s?>\s?([^>]*)/);
		//console.log('main parts are', parts[1]);
		var levels_vars = {
			0: 'u',
			1: 'i',
			2: 'j',
			3: 'k',
			4: 'l',
			5: 'm',
			6: 'n',
			7: 'o',
			8: 'p',
			9: 'q',
		}
		
		get_iterator_name = function(num){
			return levels_vars[num];
		}
		
		var filter_functions_counter = 1;
		var filter_functions = {};
		var filter_functions_keys = {};
		
		var nesting_levels = parts[1].split("/");
		var levels_result = [];
		var level_num_count = 0;
		var level_names_to_count = {0: 0};
		var level_counts_to_names = {0: 0};
		var keys_to_add = [];
		var skip_counter = 1;
		for(var i in nesting_levels){
			//console.log('nl', nesting_levels[i]);
			if(nesting_levels[i][0] === '$'){
				var res = {}, has_filter = false, func_field = false;
				if(nesting_levels[i].indexOf('?') !== -1){
					// It has filter function!
					var func_parts = nesting_levels[i].split('?');
					nesting_levels[i] = func_parts[0];
					var func_parts = func_parts[1].split('.');
					if(func_parts[1]){
						func_field = func_parts[1];
					}
					has_filter = true;
				}
				var name = nesting_levels[i].slice(1);
				if(!name.length) {
					name = 'skip_' + skip_counter++;
				}
				
				if(has_filter){
					filter_functions[name] = filter_functions_counter;
					filter_functions_counter++;
				}
				if(func_field){
					filter_functions_keys[name] = func_field;
				}
				
				level_names_to_count[name] = ++level_num_count;
				level_counts_to_names[level_num_count] = name;
				res.name = name;
				
				if(keys_to_add){
					res.keys = keys_to_add.slice();
					keys_to_add = [];
				}
				levels_result.push(res);
			} else {
				keys_to_add.push(nesting_levels[i]);
				//levels_result[prev_level].key = nesting_levels[i];
			}
		}
		//console.log('levels_result', levels_result);
		
		//console.log('kokoko', level_names_to_count, level_counts_to_names);
		
		var get_level_num_by_name = function(level){
			return level_names_to_count[level];
		}
		
		// Parsing tail!
		if(parts[2]){

	////
	////
	//// PARSING STRING TO ARRAY OF TOKENS
	////
	////

	var tokens = [];
	var tail = parts[2];
	var deepest_brackets;
	while(true){
		deepest_brackets = tail.match(/\(([^\(\)\{\}\[\]]*)\)|(\%\w*)?\{([^\(\)\{\}\[\]]*)\}|\[([^\(\)\{\}\[\]]*)\]/g);
		//console.log('Deepest brackets are', deepest_brackets);
		if(!deepest_brackets) {
			//tokens.push(tail);
			break;
		}
		for(var i = 0; i < deepest_brackets.length; i++){
			var num = tokens.push(deepest_brackets[i]);
			tail = tail.replace(deepest_brackets[i], '@' + (num - 1));
		}
		//console.log('tail', tail);
	}
	//console.log('TOKENS', tokens);
	var level = 0;

	////
	////
	//// PARSING TOKENS TO PARTS
	////
	////

	var new_tokens = [];
	for(var i = 0; i < tokens.length; i++){
		var type = get_token_type(tokens[i]);
		var res = {
			token: tokens[i],
			type: type,
			create_level: null,
			push_level: null,
		}
		parse[type](res);
		new_tokens.push(res);	
	}

	////
	////
	//// ASSIGNING LEVEL FOR PARTS
	////
	////

	var get_token_var_name = function(token){
		return token.type + token.name;
	}
	
	var next_level = function(level){
		//console.log('WE ARE GIVEN', level, 'we give', level_counts_to_names[Number(level_names_to_count[level]) + 1]);
		return level_counts_to_names[Number(level_names_to_count[level]) + 1];
	}
	var prev_level = function(level){
		//console.log('WE ARE GIVEN', level, 'we give', level_counts_to_names[Number(level_names_to_count[level]) + 1]);
		return level_counts_to_names[Number(level_names_to_count[level]) - 1];
	}

	var set_level = function(token, level){
		//console.log('setting level for', token.type + token.name, level, token.create_level, token.push_level, token);
		switch(token.type){
			case 'arr':
				token.create_level = level;
				if(token.depends_on !== undefined){
					var dependent = new_tokens[token.depends_on];
					dependent.user = token;
					token.depends_on_var = get_token_var_name(dependent);
					token.push_level = next_level(level);
					set_level(new_tokens[token.depends_on], next_level(level));
				}
			break;
			case 'obj':
				if(token.create_level_decrease){
					token.create_level = prev_level(token.create_level);
				}
				if(token.create_level && token.create_level !== 'inherit'){
					level = token.create_level;
				} else {
					token.create_level = level;
				}
				if(!token.push_level || token.push_level === 'inherit'){
					token.push_level = level;
				} else {
					level = token.push_level;
				}
				if(token.defined_scope){
					//console.log('DS', token.defined_scope, level, token.push_level);
					//level = token.defined_scope;
				}
				for(var i in token.fields){
					if(token.fields[i].val_layer){
						if(token.user){
							 token.create_level = token.user.push_level = token.fields[i].val_layer
						}
						level = token.push_level = token.fields[i].val_layer;
					}
					if(token.fields[i].key_depends_on){
						token.fields[i].key_depends_on_var = new_tokens[token.fields[i].key_depends_on].type + token.fields[i].key_depends_on;
						set_level(new_tokens[token.fields[i].key_depends_on], level);
					}
					if(token.fields[i].val_depends_on){
						//console.log('REAL', new_tokens[token.fields[i].val_depends_on]);
						token.fields[i].val_depends_on_var = new_tokens[token.fields[i].val_depends_on].type +  new_tokens[token.fields[i].val_depends_on].name;
						set_level(new_tokens[token.fields[i].val_depends_on], level);
					}
				}
			break;
			case 'func':
				token.create_level = level;
				for(var i in token.args){
					if(token.args[i].depends_on){
						token.args[i].depends_on_var = new_tokens[token.args[i].depends_on].type + token.args[i].depends_on;
						set_level(new_tokens[token.args[i].depends_on], level);
					}
				}
			break;
		}
	}	

	//console.log('OLD TOKENS', new_tokens);
	set_level(new_tokens[new_tokens.length - 1], 0);
	//console.log('NEW TOKENS', new_tokens);

	////
	////
	//// LOOKING FOR ACTION FOR EACH LEVEL
	////
	////

	var actions = Object.keys(level_names_to_count);
	actions.unshift('0');
	var ko = {};
	for(var i in actions){
		ko[actions[i]] = {
			before: [],
			after: [],					
		}
	}
	var first_var_name = true;
	var min_level = 10000;
	//new_tokens.reverse();
	for(var i  = new_tokens.length - 1; i >= 0; i--){
		var tk = new_tokens[i];
		var varname = get_token_var_name(tk);
		//if(tk.create_level === 0){
			//console.log(, tk.create_level);
		if(level_names_to_count[tk.create_level] < min_level){
			min_level = level_names_to_count[tk.create_level];
			first_var_name = varname;
		}
			
		//}
		switch(new_tokens[i].type){
			case 'arr':
				ko[tk.create_level].before.push({createArray: varname});
				//console.log('we push array push of', tk);
				ko[tk.push_level].after.push({pushToArray: {
						arrvar: varname,
						itemvar: tk.item_type === 'layer' ? {field: tk.item_field} : tk.depends_on_var,
				}});
			break;
			case 'func':
				switch(tk.func_type){
					case 'count':
						ko[tk.create_level].before.push({assignVarZero: varname});
						ko[tk.args[0].push_level].after.push({incrementVar: varname});
					break;
					case 'reduce':
						ko[tk.create_level].before.push({assignVarZero: varname});
						//console.log('TK', tk);
						ko[tk.args[0].push_level].after.push({reduceVar: {name: varname, func: tk.func, key: tk.key}});
					break;
					case 'aryphmetic':
						var res = {func: tk.func, varname: varname, args: []};
						for(var j in tk.args){
							res.args.push(tk.args[j].depends_on_var);
						}
						ko[tk.create_level].after.push({'assignFunc': res});
					break;
				}
				//ko[tk.create_level].before.push({createArray: get_token_var_name(tk)})
			break;
			case 'obj':{
				//var next_level = level_counts_to_names[level_names_to_count[tk.create_level] + 1];
				//var prev_level = level_counts_to_names[level_names_to_count[tk.create_level] - 1];
				if(tk.defined_scope){
					console.log('!!!!!!!!');
				}
				//console.log('AAA', ko[tk.create_level], ko, tk.create_level);
				ko[tk.create_level].before.push({assignObj: {name: varname, fields: tk.fields}});
				ko[tk.push_level].after.push({fillObj: {name: varname, fields: tk.fields}});
			}
		}
	}
	//console.log('ko', ko, 'fist var name', first_var_name);

	////
	////
	//// MAKING FUCKING FUNCTION!
	////
	////
	
	var before = [];
	var after = [];
	var spaces = '';
	
	var lpush = function(str, add_space){
		var spc = '';
		if(add_space){
			for(var i = 0; i <= Number(add_space); i++){
				spc += '	';
			}
		}
		var str2 = '\n\
' + spaces + spc + str ;
//+ '//spcnum = ' + spaces.length
			
		//console.log('we LPUSH', str2, spaces.length);
		return this.push(str2);
	}
	
	before.lpush = lpush;
	after.lpush = lpush;
	
	var vars_brackets_string = '';
	
	levels_result.unshift({name: 0});
//////////////////////////////////////////////////////////////
	for(var i in levels_result){
		//console.log('LR', levels_result[i], i);
		if(levels_vars[i - 1] && level_name != 0) vars_brackets_string += '[' + levels_vars[i - 1] + ']';
		if(levels_result[i].keys) {
			for(var k in levels_result[i].keys){
				vars_brackets_string += '.' + levels_result[i].keys[k];
			}
		}
		var level_name = levels_result[i].name;
		var current_var = 'data' + vars_brackets_string + '[' + levels_vars[i] + ']';
		var current_iterator = levels_vars[i];
		
		if(level_name != 0){
			before.lpush('for(var ' + levels_vars[i] + ' in data' + vars_brackets_string + '){// ' + levels_result[i].name);
		}
		spaces += '    ';
		if(filter_functions[level_name]){
			var func_name = 'arguments[' + filter_functions[level_name] + ']';
			var arg_name = current_var + (filter_functions_keys[level_name]?'.' + filter_functions_keys[level_name]:'');
			before.lpush('if(' + func_name + ' instanceof Array){');
				before.lpush('if(' + func_name + '.indexOf(' + arg_name + ') == -1) { continue; }', 1);
			before.lpush('} else {');
				before.lpush('if(' + func_name + ' instanceof Function){', 1);
					before.lpush('if(!' + func_name + '(' + arg_name + ')) continue;', 2);
				before.lpush('} else { //console.log("comparing as string", ' + func_name + ', ' + arg_name + '); ', 1)
					before.lpush('if(' + func_name + ' != ' + arg_name + ') continue;', 2);
				before.lpush('}', 1);
			before.lpush('}');
		}								
		if(ko[level_name] && ko[level_name].before){
			for(var j in ko[level_name].before){
				var ob = ko[level_name].before[j];
				//console.log('OB', ob);
				for(var k in ob){
					switch(k){
						case 'assignVarZero':
							before.lpush('var ' + ob[k] + ' = 0;');
						break;
						case 'createArray':
							before.lpush('var ' + ob[k] + ' = [];');
						break;
						case 'assignObj':
							before.lpush('var ' + ob[k].name + ' = {};');
						break;
					}
				}
			}
		}							
											
		spaces = spaces.slice(0, spaces.length - 4);
		if(level_name != 0){								
			after.lpush('}');
		}
		spaces += '    ';
		
		if(ko[level_name] && ko[level_name].after){
			//ko[level_name].after.reverse();
			for(var j in ko[level_name].after){
				var ob = ko[level_name].after[j];
				for(var k in ob){
					switch(k){
						case 'assignFunc':
							if(['+', '-', '*', '/'].indexOf(ob[k].func) !== -1){
								after.lpush('var ' + ob[k].varname + ' = ' + ob[k].args[0] + ' ' + ob[k].func + ' ' + ob[k].args[1] + ';');
							} else {
								error('Unknown function!');// temporarily
							}
						break;
						case 'reduceVar':
							if(['+', '-', '*', '/'].indexOf(ob[k].func) !== -1){
								after.lpush(ob[k].name + ' = Number(' + ob[k].name + ') ' + ob[k].func + ' Number(' + current_var + (ob[k].key ? '.' + ob[k].key : '') + ');');
							} else {
								error('Unknown function: ' + ob[k].func);// temporarily
							}
						break;
						case 'incrementVar':
							after.lpush(ob[k] + '++;');
						break;
						case 'fillObj':
							for(var b in ob[k].fields){
								var field = ob[k].fields[b];
								switch(field.val_type){
									case 'link_to_another_token':
										after.push(field.val_depends_on_var + ';');
									break;
									case 'layer':
										if(field.val_field === '~'){
											after.push(current_iterator + ';');
										} else {
											after.push(current_var + (field.val_field ? '.' + field.val_field : '') + ';');
										}
										//after.push(current_var + (field.val_field ? '.' + field.val_field : '') + ';');
									break;
									case 'static':
										after.push(field.val_val + ';');
									break;
								}
								switch(field.key_type){
									case 'static':
										after.lpush(ob[k].name + '["' + field.key_name + '"] = ');
									break;
									case 'layer':
										if(field.key_field === '~'){
											after.lpush(ob[k].name + '[' + current_iterator + '] = ');
										} else {
											after.lpush(ob[k].name + '[' + current_var + '.' + field.key_field + '] = ');
										}
									break;
								}								
							}
						break;
						case 'pushToArray':
							after.lpush(ob[k].arrvar + '.push(' + ((ob[k].itemvar instanceof Object)? current_var + (ob[k].itemvar.field ? '.' + ob[k].itemvar.field : '') : ob[k].itemvar) + ');');
						break;
					}
				}
			}
		}
	}
//////////////////////////////////////////////////////////////
	
	after.reverse();
	
	before.lpush('//console.log(' + current_var + ');')
	
	var func_body_string = before.join('') + after.join('') + '\n\
	return ' + first_var_name + ';\n';


		} else { // just performing functions
			
		}
		
		//console.log('var mk = function(data){' + func_body_string + '\}');
		var func = new Function('data', func_body_string);
		return func;
	}
	
	var compiled_expressions_table = {};

	var lib = function(obj, regex, other_funcs) {
		var func;
		var regex_hash = hashCode.apply(regex);
		if(!compiled_expressions_table[regex_hash]){
			compiled_expressions_table[regex_hash] = compile(regex);
		}
		func = compiled_expressions_table[regex_hash];
		var new_args = Array.prototype.slice.call(arguments);
		new_args.splice(1, 1);
		//console.log('applying');
		var res = func.apply(null, new_args);
		//console.log('FUNCTION RETURNED:', res);
		return res;
	}
	
	lib.debug = function(expr){
		var regex_hash = hashCode.apply(expr);
		if(!compiled_expressions_table[regex_hash]){
			compiled_expressions_table[regex_hash] = compile(expr);
		}
		console.log(compiled_expressions_table[regex_hash]);
	}

	dre = lib;// setting it global
})()

