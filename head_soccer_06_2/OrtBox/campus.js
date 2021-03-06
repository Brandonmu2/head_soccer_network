var Prototype = {
	Version: '1.6.1_rc2',
	Browser: {
		IE: !!(window.attachEvent && navigator.userAgent.indexOf('Opera') === -1),
		Opera: navigator.userAgent.indexOf('Opera') > -1,
		WebKit: navigator.userAgent.indexOf('AppleWebKit/') > -1,
		Gecko: navigator.userAgent.indexOf('Gecko') > -1 && navigator.userAgent.indexOf('KHTML') === -1,
		MobileSafari: !!navigator.userAgent.match(/Apple.*Mobile.*Safari/)
	},
	BrowserFeatures: {
		XPath: !!document.evaluate,
		SelectorsAPI: !!document.querySelector,
		ElementExtensions: (function () {
			if (window.HTMLElement && window.HTMLElement.prototype) return true;
			if (window.Element && window.Element.prototype) return true
		})(),
		SpecificElementExtensions: (function () {
			if (typeof window.HTMLDivElement !== 'undefined') return true;
			var div = document.createElement('div');
			if (div['__proto__'] && div['__proto__'] !== document.createElement('form')['__proto__']) {
				return true
			}
			return false
		})()
	},
	ScriptFragment: '<script[^>]*>([\\S\\s]*?)<\/script>',
	JSONFilter: /^\/\*-secure-([\s\S]*)\*\/\s*$/,
	emptyFunction: function () {},
	K: function (x) {
		return x
	}
};
if (Prototype.Browser.MobileSafari) Prototype.BrowserFeatures.SpecificElementExtensions = false;
var Abstract = {};
var Try = {
	these: function () {
		var returnValue;
		for (var i = 0, length = arguments.length; i < length; i++) {
			var lambda = arguments[i];
			try {
				returnValue = lambda();
				break
			} catch(e) {}
		}
		return returnValue
	}
};
var Class = (function () {
	function create() {
		var parent = null,
		properties = $A(arguments);
		if (Object.isFunction(properties[0])) parent = properties.shift();
		function klass() {
			this.initialize.apply(this, arguments)
		}
		Object.extend(klass, Class.Methods);
		klass.superclass = parent;
		klass.subclasses = [];
		if (parent) {
			var subclass = function () {};
			subclass.prototype = parent.prototype;
			klass.prototype = new subclass;
			parent.subclasses.push(klass)
		}
		for (var i = 0; i < properties.length; i++) klass.addMethods(properties[i]);
		if (!klass.prototype.initialize) klass.prototype.initialize = Prototype.emptyFunction;
		klass.prototype.constructor = klass;
		return klass
	}
	function addMethods(source) {
		var ancestor = this.superclass && this.superclass.prototype;
		var properties = Object.keys(source);
		if (!Object.keys({
			toString: true
		}).length) {
			if (source.toString != Object.prototype.toString) properties.push("toString");
			if (source.valueOf != Object.prototype.valueOf) properties.push("valueOf")
		}
		for (var i = 0, length = properties.length; i < length; i++) {
			var property = properties[i],
			value = source[property];
			if (ancestor && Object.isFunction(value) && value.argumentNames().first() == "$super") {
				var method = value;
				value = (function (m) {
					return function () {
						return ancestor[m].apply(this, arguments)
					}
				})(property).wrap(method);
				value.valueOf = method.valueOf.bind(method);
				value.toString = method.toString.bind(method)
			}
			this.prototype[property] = value
		}
		return this
	}
	return {
		create: create,
		Methods: {
			addMethods: addMethods
		}
	}
})();
(function () {
	function getClass(object) {
		return Object.prototype.toString.call(object).match(/^\[object\s(.*)\]$/)[1]
	}
	function extend(destination, source) {
		for (var property in source) destination[property] = source[property];
		return destination
	}
	function inspect(object) {
		try {
			if (isUndefined(object)) return 'undefined';
			if (object === null) return 'null';
			return object.inspect ? object.inspect() : String(object)
		} catch(e) {
			if (e instanceof RangeError) return '...';
			throw e
		}
	}
	function toJSON(object) {
		var type = typeof object;
		switch (type) {
		case 'undefined':
		case 'function':
		case 'unknown':
			return;
		case 'boolean':
			return object.toString()
		}
		if (object === null) return 'null';
		if (object.toJSON) return object.toJSON();
		if (isElement(object)) return;
		var results = [];
		for (var property in object) {
			var value = toJSON(object[property]);
			if (!isUndefined(value)) results.push(property.toJSON() + ': ' + value)
		}
		return '{' + results.join(', ') + '}'
	}
	function toQueryString(object) {
		return $H(object).toQueryString()
	}
	function toHTML(object) {
		return object && object.toHTML ? object.toHTML() : String.interpret(object)
	}
	function keys(object) {
		var results = [];
		for (var property in object) results.push(property);
		return results
	}
	function values(object) {
		var results = [];
		for (var property in object) results.push(object[property]);
		return results
	}
	function clone(object) {
		return extend({},
		object)
	}
	function isElement(object) {
		return !! (object && object.nodeType == 1)
	}
	function isArray(object) {
		return getClass(object) === "Array"
	}
	function isHash(object) {
		return object instanceof Hash
	}
	function isFunction(object) {
		return typeof object === "function"
	}
	function isString(object) {
		return getClass(object) === "String"
	}
	function isNumber(object) {
		return getClass(object) === "Number"
	}
	function isUndefined(object) {
		return typeof object === "undefined"
	}
	extend(Object, {
		extend: extend,
		inspect: inspect,
		toJSON: toJSON,
		toQueryString: toQueryString,
		toHTML: toHTML,
		keys: keys,
		values: values,
		clone: clone,
		isElement: isElement,
		isArray: isArray,
		isHash: isHash,
		isFunction: isFunction,
		isString: isString,
		isNumber: isNumber,
		isUndefined: isUndefined
	})
})();
Object.extend(Function.prototype, (function () {
	var slice = Array.prototype.slice;
	function update(array, args) {
		var arrayLength = array.length,
		length = args.length;
		while (length--) array[arrayLength + length] = args[length];
		return array
	}
	function merge(array, args) {
		array = slice.call(array, 0);
		return update(array, args)
	}
	function argumentNames() {
		var names = this.toString().match(/^[\s\(]*function[^(]*\(([^)]*)\)/)[1].replace(/\/\/.*?[\r\n]|\/\*(?:.|[\r\n])*?\*\//g, '').replace(/\s+/g, '').split(',');
		return names.length == 1 && !names[0] ? [] : names
	}
	function bind(context) {
		if (arguments.length < 2 && Object.isUndefined(arguments[0])) return this;
		var __method = this,
		args = slice.call(arguments, 1);
		return function () {
			var a = merge(args, arguments);
			return __method.apply(context, a)
		}
	}
	function bindAsEventListener(context) {
		var __method = this,
		args = slice.call(arguments, 1);
		return function (event) {
			var a = update([event || window.event], args);
			return __method.apply(context, a)
		}
	}
	function curry() {
		if (!arguments.length) return this;
		var __method = this,
		args = slice.call(arguments, 0);
		return function () {
			var a = merge(args, arguments);
			return __method.apply(this, a)
		}
	}
	function delay(timeout) {
		var __method = this,
		args = slice.call(arguments, 1);
		timeout = timeout * 1000;
		return window.setTimeout(function () {
			return __method.apply(__method, args)
		},
		timeout)
	}
	function defer() {
		var args = update([0.01], arguments);
		return this.delay.apply(this, args)
	}
	function wrap(wrapper) {
		var __method = this;
		return function () {
			var a = update([__method.bind(this)], arguments);
			return wrapper.apply(this, a)
		}
	}
	function methodize() {
		if (this._methodized) return this._methodized;
		var __method = this;
		return this._methodized = function () {
			var a = update([this], arguments);
			return __method.apply(null, a)
		}
	}
	return {
		argumentNames: argumentNames,
		bind: bind,
		bindAsEventListener: bindAsEventListener,
		curry: curry,
		delay: delay,
		defer: defer,
		wrap: wrap,
		methodize: methodize
	}
})());
Date.prototype.toJSON = function () {
	return '"' + this.getUTCFullYear() + '-' + (this.getUTCMonth() + 1).toPaddedString(2) + '-' + this.getUTCDate().toPaddedString(2) + 'T' + this.getUTCHours().toPaddedString(2) + ':' + this.getUTCMinutes().toPaddedString(2) + ':' + this.getUTCSeconds().toPaddedString(2) + 'Z"'
};
RegExp.prototype.match = RegExp.prototype.test;
RegExp.escape = function (str) {
	return String(str).replace(/([.*+?^=!:${}()|[\]\/\\])/g, '\\$1')
};
var PeriodicalExecuter = Class.create({
	initialize: function (callback, frequency) {
		this.callback = callback;
		this.frequency = frequency;
		this.currentlyExecuting = false;
		this.registerCallback()
	},
	registerCallback: function () {
		this.timer = setInterval(this.onTimerEvent.bind(this), this.frequency * 1000)
	},
	execute: function () {
		this.callback(this)
	},
	stop: function () {
		if (!this.timer) return;
		clearInterval(this.timer);
		this.timer = null
	},
	onTimerEvent: function () {
		if (!this.currentlyExecuting) {
			try {
				this.currentlyExecuting = true;
				this.execute()
			} catch(e) {} finally {
				this.currentlyExecuting = false
			}
		}
	}
});
Object.extend(String, {
	interpret: function (value) {
		return value == null ? '': String(value)
	},
	specialChar: {
		'\b': '\\b',
		'\t': '\\t',
		'\n': '\\n',
		'\f': '\\f',
		'\r': '\\r',
		'\\': '\\\\'
	}
});
Object.extend(String.prototype, (function () {
	function prepareReplacement(replacement) {
		if (Object.isFunction(replacement)) return replacement;
		var template = new Template(replacement);
		return function (match) {
			return template.evaluate(match)
		}
	}
	function gsub(pattern, replacement) {
		var result = '',
		source = this,
		match;
		replacement = prepareReplacement(replacement);
		if (Object.isString(pattern)) pattern = RegExp.escape(pattern);
		if (! (pattern.length || pattern.source)) {
			replacement = replacement('');
			return replacement + source.split('').join(replacement) + replacement
		}
		while (source.length > 0) {
			if (match = source.match(pattern)) {
				result += source.slice(0, match.index);
				result += String.interpret(replacement(match));
				source = source.slice(match.index + match[0].length)
			} else {
				result += source,
				source = ''
			}
		}
		return result
	}
	function sub(pattern, replacement, count) {
		replacement = prepareReplacement(replacement);
		count = Object.isUndefined(count) ? 1 : count;
		return this.gsub(pattern, function (match) {
			if (--count < 0) return match[0];
			return replacement(match)
		})
	}
	function scan(pattern, iterator) {
		this.gsub(pattern, iterator);
		return String(this)
	}
	function truncate(length, truncation) {
		length = length || 30;
		truncation = Object.isUndefined(truncation) ? '...': truncation;
		return this.length > length ? this.slice(0, length - truncation.length) + truncation: String(this)
	}
	function strip() {
		return this.replace(/^\s+/, '').replace(/\s+$/, '')
	}
	function stripTags() {
		return this.replace(/<\/?[^>]+>/gi, '')
	}
	function stripScripts() {
		return this.replace(new RegExp(Prototype.ScriptFragment, 'img'), '')
	}
	function extractScripts() {
		var matchAll = new RegExp(Prototype.ScriptFragment, 'img');
		var matchOne = new RegExp(Prototype.ScriptFragment, 'im');
		return (this.match(matchAll) || []).map(function (scriptTag) {
			return (scriptTag.match(matchOne) || ['', ''])[1]
		})
	}
	function evalScripts() {
		return this.extractScripts().map(function (script) {
			return eval(script)
		})
	}
	function escapeHTML() {
		escapeHTML.text.data = this;
		return escapeHTML.div.innerHTML
	}
	function unescapeHTML() {
		var div = document.createElement('div');
		div.innerHTML = this.stripTags();
		return div.childNodes[0] ? (div.childNodes.length > 1 ? $A(div.childNodes).inject('', function (memo, node) {
			return memo + node.nodeValue
		}) : div.childNodes[0].nodeValue) : ''
	}
	function toQueryParams(separator) {
		var match = this.strip().match(/([^?#]*)(#.*)?$/);
		if (!match) return {};
		return match[1].split(separator || '&').inject({},
		function (hash, pair) {
			if ((pair = pair.split('='))[0]) {
				var key = decodeURIComponent(pair.shift());
				var value = pair.length > 1 ? pair.join('=') : pair[0];
				if (value != undefined) value = decodeURIComponent(value);
				if (key in hash) {
					if (!Object.isArray(hash[key])) hash[key] = [hash[key]];
					hash[key].push(value)
				} else hash[key] = value
			}
			return hash
		})
	}
	function toArray() {
		return this.split('')
	}
	function succ() {
		return this.slice(0, this.length - 1) + String.fromCharCode(this.charCodeAt(this.length - 1) + 1)
	}
	function times(count) {
		return count < 1 ? '': new Array(count + 1).join(this)
	}
	function camelize() {
		var parts = this.split('-'),
		len = parts.length;
		if (len == 1) return parts[0];
		var camelized = this.charAt(0) == '-' ? parts[0].charAt(0).toUpperCase() + parts[0].substring(1) : parts[0];
		for (var i = 1; i < len; i++) camelized += parts[i].charAt(0).toUpperCase() + parts[i].substring(1);
		return camelized
	}
	function capitalize() {
		return this.charAt(0).toUpperCase() + this.substring(1).toLowerCase()
	}
	function underscore() {
		return this.gsub(/::/, '/').gsub(/([A-Z]+)([A-Z][a-z])/, '#{1}_#{2}').gsub(/([a-z\d])([A-Z])/, '#{1}_#{2}').gsub(/-/, '_').toLowerCase()
	}
	function dasherize() {
		return this.gsub(/_/, '-')
	}
	function inspect(useDoubleQuotes) {
		var escapedString = this.gsub(/[\x00-\x1f\\]/, function (match) {
			var character = String.specialChar[match[0]];
			return character ? character: '\\u00' + match[0].charCodeAt().toPaddedString(2, 16)
		});
		if (useDoubleQuotes) return '"' + escapedString.replace(/"/g, '\\"') + '"';
		return "'" + escapedString.replace(/'/g, '\\\'') + "'"
	}
	function toJSON() {
		return this.inspect(true)
	}
	function unfilterJSON(filter) {
		return this.sub(filter || Prototype.JSONFilter, '#{1}')
	}
	function isJSON() {
		var str = this;
		if (str.blank()) return false;
		str = this.replace(/\\./g, '@').replace(/"[^"\\\n\r]*"/g, '');
		return (/^[,:{}\[\]0-9.\-+Eaeflnr-u \n\r\t]*$/).test(str)
	}
	function evalJSON(sanitize) {
		var json = this.unfilterJSON();
		try {
			if (!sanitize || json.isJSON()) return eval('(' + json + ')')
		} catch(e) {}
		throw new SyntaxError('Badly formed JSON string: ' + this.inspect())
	}
	function include(pattern) {
		return this.indexOf(pattern) > -1
	}
	function startsWith(pattern) {
		return this.indexOf(pattern) === 0
	}
	function endsWith(pattern) {
		var d = this.length - pattern.length;
		return d >= 0 && this.lastIndexOf(pattern) === d
	}
	function empty() {
		return this == ''
	}
	function blank() {
		return /^\s*$/.test(this)
	}
	function interpolate(object, pattern) {
		return new Template(this, pattern).evaluate(object)
	}
	return {
		gsub: gsub,
		sub: sub,
		scan: scan,
		truncate: truncate,
		strip: strip,
		stripTags: stripTags,
		stripScripts: stripScripts,
		extractScripts: extractScripts,
		evalScripts: evalScripts,
		escapeHTML: escapeHTML,
		unescapeHTML: unescapeHTML,
		toQueryParams: toQueryParams,
		parseQuery: toQueryParams,
		toArray: toArray,
		succ: succ,
		times: times,
		camelize: camelize,
		capitalize: capitalize,
		underscore: underscore,
		dasherize: dasherize,
		inspect: inspect,
		toJSON: toJSON,
		unfilterJSON: unfilterJSON,
		isJSON: isJSON,
		evalJSON: evalJSON,
		include: include,
		startsWith: startsWith,
		endsWith: endsWith,
		empty: empty,
		blank: blank,
		interpolate: interpolate
	}
})());
Object.extend(String.prototype.escapeHTML, {
	div: document.createElement('div'),
	text: document.createTextNode('')
});
String.prototype.escapeHTML.div.appendChild(String.prototype.escapeHTML.text);
if ('<\n>'.escapeHTML() !== '&lt;\n&gt;') {
	String.prototype.escapeHTML = function () {
		return this.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
	}
}
if ('&lt;\n&gt;'.unescapeHTML() !== '<\n>') {
	String.prototype.unescapeHTML = function () {
		return this.stripTags().replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
	}
}
var Template = Class.create({
	initialize: function (template, pattern) {
		this.template = template.toString();
		this.pattern = pattern || Template.Pattern
	},
	evaluate: function (object) {
		if (Object.isFunction(object.toTemplateReplacements)) object = object.toTemplateReplacements();
		return this.template.gsub(this.pattern, function (match) {
			if (object == null) return '';
			var before = match[1] || '';
			if (before == '\\') return match[2];
			var ctx = object,
			expr = match[3];
			var pattern = /^([^.[]+|\[((?:.*?[^\\])?)\])(\.|\[|$)/;
			match = pattern.exec(expr);
			if (match == null) return before;
			while (match != null) {
				var comp = match[1].startsWith('[') ? match[2].gsub('\\\\]', ']') : match[1];
				ctx = ctx[comp];
				if (null == ctx || '' == match[3]) break;
				expr = expr.substring('[' == match[3] ? match[1].length: match[0].length);
				match = pattern.exec(expr)
			}
			return before + String.interpret(ctx)
		})
	}
});
Template.Pattern = /(^|.|\r|\n)(#\{(.*?)\})/;
var $break = {};
var Enumerable = (function () {
	function each(iterator, context) {
		var index = 0;
		try {
			this._each(function (value) {
				iterator.call(context, value, index++)
			})
		} catch(e) {
			if (e != $break) throw e
		}
		return this
	}
	function eachSlice(number, iterator, context) {
		var index = -number,
		slices = [],
		array = this.toArray();
		if (number < 1) return array;
		while ((index += number) < array.length) slices.push(array.slice(index, index + number));
		return slices.collect(iterator, context)
	}
	function all(iterator, context) {
		iterator = iterator || Prototype.K;
		var result = true;
		this.each(function (value, index) {
			result = result && !!iterator.call(context, value, index);
			if (!result) throw $break
		});
		return result
	}
	function any(iterator, context) {
		iterator = iterator || Prototype.K;
		var result = false;
		this.each(function (value, index) {
			if (result = !!iterator.call(context, value, index)) throw $break
		});
		return result
	}
	function collect(iterator, context) {
		iterator = iterator || Prototype.K;
		var results = [];
		this.each(function (value, index) {
			results.push(iterator.call(context, value, index))
		});
		return results
	}
	function detect(iterator, context) {
		var result;
		this.each(function (value, index) {
			if (iterator.call(context, value, index)) {
				result = value;
				throw $break
			}
		});
		return result
	}
	function findAll(iterator, context) {
		var results = [];
		this.each(function (value, index) {
			if (iterator.call(context, value, index)) results.push(value)
		});
		return results
	}
	function grep(filter, iterator, context) {
		iterator = iterator || Prototype.K;
		var results = [];
		if (Object.isString(filter)) filter = new RegExp(RegExp.escape(filter));
		this.each(function (value, index) {
			if (filter.match(value)) results.push(iterator.call(context, value, index))
		});
		return results
	}
	function include(object) {
		if (Object.isFunction(this.indexOf)) if (this.indexOf(object) != -1) return true;
		var found = false;
		this.each(function (value) {
			if (value == object) {
				found = true;
				throw $break
			}
		});
		return found
	}
	function inGroupsOf(number, fillWith) {
		fillWith = Object.isUndefined(fillWith) ? null: fillWith;
		return this.eachSlice(number, function (slice) {
			while (slice.length < number) slice.push(fillWith);
			return slice
		})
	}
	function inject(memo, iterator, context) {
		this.each(function (value, index) {
			memo = iterator.call(context, memo, value, index)
		});
		return memo
	}
	function invoke(method) {
		var args = $A(arguments).slice(1);
		return this.map(function (value) {
			return value[method].apply(value, args)
		})
	}
	function max(iterator, context) {
		iterator = iterator || Prototype.K;
		var result;
		this.each(function (value, index) {
			value = iterator.call(context, value, index);
			if (result == null || value >= result) result = value
		});
		return result
	}
	function min(iterator, context) {
		iterator = iterator || Prototype.K;
		var result;
		this.each(function (value, index) {
			value = iterator.call(context, value, index);
			if (result == null || value < result) result = value
		});
		return result
	}
	function partition(iterator, context) {
		iterator = iterator || Prototype.K;
		var trues = [],
		falses = [];
		this.each(function (value, index) { (iterator.call(context, value, index) ? trues: falses).push(value)
		});
		return [trues, falses]
	}
	function pluck(property) {
		var results = [];
		this.each(function (value) {
			results.push(value[property])
		});
		return results
	}
	function reject(iterator, context) {
		var results = [];
		this.each(function (value, index) {
			if (!iterator.call(context, value, index)) results.push(value)
		});
		return results
	}
	function sortBy(iterator, context) {
		return this.map(function (value, index) {
			return {
				value: value,
				criteria: iterator.call(context, value, index)
			}
		}).sort(function (left, right) {
			var a = left.criteria,
			b = right.criteria;
			return a < b ? -1 : a > b ? 1 : 0
		}).pluck('value')
	}
	function toArray() {
		return this.map()
	}
	function zip() {
		var iterator = Prototype.K,
		args = $A(arguments);
		if (Object.isFunction(args.last())) iterator = args.pop();
		var collections = [this].concat(args).map($A);
		return this.map(function (value, index) {
			return iterator(collections.pluck(index))
		})
	}
	function size() {
		return this.toArray().length
	}
	function inspect() {
		return '#<Enumerable:' + this.toArray().inspect() + '>'
	}
	return {
		each: each,
		eachSlice: eachSlice,
		all: all,
		every: all,
		any: any,
		some: any,
		collect: collect,
		map: collect,
		detect: detect,
		findAll: findAll,
		select: findAll,
		filter: findAll,
		grep: grep,
		include: include,
		member: include,
		inGroupsOf: inGroupsOf,
		inject: inject,
		invoke: invoke,
		max: max,
		min: min,
		partition: partition,
		pluck: pluck,
		reject: reject,
		sortBy: sortBy,
		toArray: toArray,
		entries: toArray,
		zip: zip,
		size: size,
		inspect: inspect,
		find: detect
	}
})();
function $A(iterable) {
	if (!iterable) return [];
	if ('toArray' in iterable) return iterable.toArray();
	var length = iterable.length || 0,
	results = new Array(length);
	while (length--) results[length] = iterable[length];
	return results
}
function $w(string) {
	if (!Object.isString(string)) return [];
	string = string.strip();
	return string ? string.split(/\s+/) : []
}
Array.from = $A;
(function () {
	var arrayProto = Array.prototype,
	slice = arrayProto.slice,
	_each = arrayProto.forEach;
	function each(iterator) {
		for (var i = 0, length = this.length; i < length; i++) iterator(this[i])
	}
	if (!_each) _each = each;
	function clear() {
		this.length = 0;
		return this
	}
	function first() {
		return this[0]
	}
	function last() {
		return this[this.length - 1]
	}
	function compact() {
		return this.select(function (value) {
			return value != null
		})
	}
	function flatten() {
		return this.inject([], function (array, value) {
			if (Object.isArray(value)) return array.concat(value.flatten());
			array.push(value);
			return array
		})
	}
	function without() {
		var values = slice.call(arguments, 0);
		return this.select(function (value) {
			return ! values.include(value)
		})
	}
	function reverse(inline) {
		return (inline !== false ? this: this.toArray())._reverse()
	}
	function uniq(sorted) {
		return this.inject([], function (array, value, index) {
			if (0 == index || (sorted ? array.last() != value: !array.include(value))) array.push(value);
			return array
		})
	}
	function intersect(array) {
		return this.uniq().findAll(function (item) {
			return array.detect(function (value) {
				return item === value
			})
		})
	}
	function clone() {
		return slice.call(this, 0)
	}
	function size() {
		return this.length
	}
	function inspect() {
		return '[' + this.map(Object.inspect).join(', ') + ']'
	}
	function toJSON() {
		var results = [];
		this.each(function (object) {
			var value = Object.toJSON(object);
			if (!Object.isUndefined(value)) results.push(value)
		});
		return '[' + results.join(', ') + ']'
	}
	function indexOf(item, i) {
		i || (i = 0);
		var length = this.length;
		if (i < 0) i = length + i;
		for (; i < length; i++) if (this[i] === item) return i;
		return - 1
	}
	function lastIndexOf(item, i) {
		i = isNaN(i) ? this.length: (i < 0 ? this.length + i: i) + 1;
		var n = this.slice(0, i).reverse().indexOf(item);
		return (n < 0) ? n: i - n - 1
	}
	function concat() {
		var array = slice.call(this, 0),
		item;
		for (var i = 0, length = arguments.length; i < length; i++) {
			item = arguments[i];
			if (Object.isArray(item) && !('callee' in item)) {
				for (var j = 0, arrayLength = item.length; j < arrayLength; j++) array.push(item[j])
			} else {
				array.push(item)
			}
		}
		return array
	}
	Object.extend(arrayProto, Enumerable);
	if (!arrayProto._reverse) arrayProto._reverse = arrayProto.reverse;
	Object.extend(arrayProto, {
		_each: _each,
		clear: clear,
		first: first,
		last: last,
		compact: compact,
		flatten: flatten,
		without: without,
		reverse: reverse,
		uniq: uniq,
		intersect: intersect,
		clone: clone,
		toArray: clone,
		size: size,
		inspect: inspect,
		toJSON: toJSON
	});
	var CONCAT_ARGUMENTS_BUGGY = (function () {
		return [].concat(arguments)[0][0] !== 1
	})(1, 2);
	if (CONCAT_ARGUMENTS_BUGGY) arrayProto.concat = concat;
	if (!arrayProto.indexOf) arrayProto.indexOf = indexOf;
	if (!arrayProto.lastIndexOf) arrayProto.lastIndexOf = lastIndexOf
})();
function $H(object) {
	return new Hash(object)
};
var Hash = Class.create(Enumerable, (function () {
	function initialize(object) {
		this._object = Object.isHash(object) ? object.toObject() : Object.clone(object)
	}
	function _each(iterator) {
		for (var key in this._object) {
			var value = this._object[key],
			pair = [key, value];
			pair.key = key;
			pair.value = value;
			iterator(pair)
		}
	}
	function set(key, value) {
		return this._object[key] = value
	}
	function get(key) {
		if (this._object && this._object[key] !== Object.prototype[key]) return this._object[key]
	}
	function unset(key) {
		var value = this._object[key];
		delete this._object[key];
		return value
	}
	function toObject() {
		return Object.clone(this._object)
	}
	function keys() {
		return this.pluck('key')
	}
	function values() {
		return this.pluck('value')
	}
	function index(value) {
		var match = this.detect(function (pair) {
			return pair.value === value
		});
		return match && match.key
	}
	function merge(object) {
		return this.clone().update(object)
	}
	function update(object) {
		return new Hash(object).inject(this, function (result, pair) {
			result.set(pair.key, pair.value);
			return result
		})
	}
	function toQueryPair(key, value) {
		if (Object.isUndefined(value)) return key;
		return key + '=' + encodeURIComponent(String.interpret(value))
	}
	function toQueryString() {
		return this.inject([], function (results, pair) {
			var key = encodeURIComponent(pair.key),
			values = pair.value;
			if (values && typeof values == 'object') {
				if (Object.isArray(values)) return results.concat(values.map(toQueryPair.curry(key)))
			} else results.push(toQueryPair(key, values));
			return results
		}).join('&')
	}
	function inspect() {
		return '#<Hash:{' + this.map(function (pair) {
			return pair.map(Object.inspect).join(': ')
		}).join(', ') + '}>'
	}
	function toJSON() {
		return Object.toJSON(this.toObject())
	}
	function clone() {
		return new Hash(this)
	}
	return {
		initialize: initialize,
		_each: _each,
		set: set,
		get: get,
		unset: unset,
		toObject: toObject,
		toTemplateReplacements: toObject,
		keys: keys,
		values: values,
		index: index,
		merge: merge,
		update: update,
		toQueryString: toQueryString,
		inspect: inspect,
		toJSON: toJSON,
		clone: clone
	}
})());
Hash.from = $H;
Object.extend(Number.prototype, (function () {
	function toColorPart() {
		return this.toPaddedString(2, 16)
	}
	function succ() {
		return this + 1
	}
	function times(iterator, context) {
		$R(0, this, true).each(iterator, context);
		return this
	}
	function toPaddedString(length, radix) {
		var string = this.toString(radix || 10);
		return '0'.times(length - string.length) + string
	}
	function toJSON() {
		return isFinite(this) ? this.toString() : 'null'
	}
	function abs() {
		return Math.abs(this)
	}
	function round() {
		return Math.round(this)
	}
	function ceil() {
		return Math.ceil(this)
	}
	function floor() {
		return Math.floor(this)
	}
	return {
		toColorPart: toColorPart,
		succ: succ,
		times: times,
		toPaddedString: toPaddedString,
		toJSON: toJSON,
		abs: abs,
		round: round,
		ceil: ceil,
		floor: floor
	}
})());
function $R(start, end, exclusive) {
	return new ObjectRange(start, end, exclusive)
}
var ObjectRange = Class.create(Enumerable, (function () {
	function initialize(start, end, exclusive) {
		this.start = start;
		this.end = end;
		this.exclusive = exclusive
	}
	function _each(iterator) {
		var value = this.start;
		while (this.include(value)) {
			iterator(value);
			value = value.succ()
		}
	}
	function include(value) {
		if (value < this.start) return false;
		if (this.exclusive) return value < this.end;
		return value <= this.end
	}
	return {
		initialize: initialize,
		_each: _each,
		include: include
	}
})());
var Ajax = {
	getTransport: function () {
		return Try.these(function () {
			return new XMLHttpRequest()
		},
		function () {
			return new ActiveXObject('Msxml2.XMLHTTP')
		},
		function () {
			return new ActiveXObject('Microsoft.XMLHTTP')
		}) || false
	},
	activeRequestCount: 0
};
Ajax.Responders = {
	responders: [],
	_each: function (iterator) {
		this.responders._each(iterator)
	},
	register: function (responder) {
		if (!this.include(responder)) this.responders.push(responder)
	},
	unregister: function (responder) {
		this.responders = this.responders.without(responder)
	},
	dispatch: function (callback, request, transport, json) {
		this.each(function (responder) {
			if (Object.isFunction(responder[callback])) {
				try {
					responder[callback].apply(responder, [request, transport, json])
				} catch(e) {}
			}
		})
	}
};
Object.extend(Ajax.Responders, Enumerable);
Ajax.Responders.register({
	onCreate: function () {
		Ajax.activeRequestCount++
	},
	onComplete: function () {
		Ajax.activeRequestCount--
	}
});
Ajax.Base = Class.create({
	initialize: function (options) {
		this.options = {
			method: 'post',
			asynchronous: true,
			contentType: 'application/x-www-form-urlencoded',
			encoding: 'UTF-8',
			parameters: '',
			evalJSON: true,
			evalJS: true
		};
		Object.extend(this.options, options || {});
		this.options.method = this.options.method.toLowerCase();
		if (Object.isString(this.options.parameters)) this.options.parameters = this.options.parameters.toQueryParams();
		else if (Object.isHash(this.options.parameters)) this.options.parameters = this.options.parameters.toObject()
	}
});
Ajax.Request = Class.create(Ajax.Base, {
	_complete: false,
	initialize: function ($super, url, options) {
		$super(options);
		this.transport = Ajax.getTransport();
		this.request(url)
	},
	request: function (url) {
		this.url = url;
		this.method = this.options.method;
		var params = Object.clone(this.options.parameters);
		if (! ['get', 'post'].include(this.method)) {
			params['_method'] = this.method;
			this.method = 'post'
		}
		this.parameters = params;
		if (params = Object.toQueryString(params)) {
			if (this.method == 'get') this.url += (this.url.include('?') ? '&': '?') + params;
			else if (/Konqueror|Safari|KHTML/.test(navigator.userAgent)) params += '&_='
		}
		try {
			var response = new Ajax.Response(this);
			if (this.options.onCreate) this.options.onCreate(response);
			Ajax.Responders.dispatch('onCreate', this, response);
			this.transport.open(this.method.toUpperCase(), this.url, this.options.asynchronous);
			if (this.options.asynchronous) this.respondToReadyState.bind(this).defer(1);
			this.transport.onreadystatechange = this.onStateChange.bind(this);
			this.setRequestHeaders();
			this.body = this.method == 'post' ? (this.options.postBody || params) : null;
			this.transport.send(this.body);
			if (!this.options.asynchronous && this.transport.overrideMimeType) this.onStateChange()
		} catch(e) {
			this.dispatchException(e)
		}
	},
	onStateChange: function () {
		var readyState = this.transport.readyState;
		if (readyState > 1 && !((readyState == 4) && this._complete)) this.respondToReadyState(this.transport.readyState)
	},
	setRequestHeaders: function () {
		var headers = {
			'X-Requested-With': 'XMLHttpRequest',
			'X-Prototype-Version': Prototype.Version,
			'Accept': 'text/javascript, text/html, application/xml, text/xml, */*'
		};
		if (this.method == 'post') {
			headers['Content-type'] = this.options.contentType + (this.options.encoding ? '; charset=' + this.options.encoding: '');
			if (this.transport.overrideMimeType && (navigator.userAgent.match(/Gecko\/(\d{4})/) || [0, 2005])[1] < 2005) headers['Connection'] = 'close'
		}
		if (typeof this.options.requestHeaders == 'object') {
			var extras = this.options.requestHeaders;
			if (Object.isFunction(extras.push)) for (var i = 0, length = extras.length; i < length; i += 2) headers[extras[i]] = extras[i + 1];
			else $H(extras).each(function (pair) {
				headers[pair.key] = pair.value
			})
		}
		for (var name in headers) this.transport.setRequestHeader(name, headers[name])
	},
	success: function () {
		var status = this.getStatus();
		return ! status || (status >= 200 && status < 300)
	},
	getStatus: function () {
		try {
			return this.transport.status || 0
		} catch(e) {
			return 0
		}
	},
	respondToReadyState: function (readyState) {
		var state = Ajax.Request.Events[readyState],
		response = new Ajax.Response(this);
		if (state == 'Complete') {
			try {
				this._complete = true;
				(this.options['on' + response.status] || this.options['on' + (this.success() ? 'Success': 'Failure')] || Prototype.emptyFunction)(response, response.headerJSON)
			} catch(e) {
				this.dispatchException(e)
			}
			var contentType = response.getHeader('Content-type');
			if (this.options.evalJS == 'force' || (this.options.evalJS && this.isSameOrigin() && contentType && contentType.match(/^\s*(text|application)\/(x-)?(java|ecma)script(;.*)?\s*$/i))) this.evalResponse()
		}
		try { (this.options['on' + state] || Prototype.emptyFunction)(response, response.headerJSON);
			Ajax.Responders.dispatch('on' + state, this, response, response.headerJSON)
		} catch(e) {
			this.dispatchException(e)
		}
		if (state == 'Complete') {
			this.transport.onreadystatechange = Prototype.emptyFunction
		}
	},
	isSameOrigin: function () {
		var m = this.url.match(/^\s*https?:\/\/[^\/]*/);
		return ! m || (m[0] == '#{protocol}//#{domain}#{port}'.interpolate({
			protocol: location.protocol,
			domain: document.domain,
			port: location.port ? ':' + location.port: ''
		}))
	},
	getHeader: function (name) {
		try {
			return this.transport.getResponseHeader(name) || null
		} catch(e) {
			return null
		}
	},
	evalResponse: function () {
		try {
			return eval((this.transport.responseText || '').unfilterJSON())
		} catch(e) {
			this.dispatchException(e)
		}
	},
	dispatchException: function (exception) { (this.options.onException || Prototype.emptyFunction)(this, exception);
		Ajax.Responders.dispatch('onException', this, exception)
	}
});
Ajax.Request.Events = ['Uninitialized', 'Loading', 'Loaded', 'Interactive', 'Complete'];
Ajax.Response = Class.create({
	initialize: function (request) {
		this.request = request;
		var transport = this.transport = request.transport,
		readyState = this.readyState = transport.readyState;
		if ((readyState > 2 && !Prototype.Browser.IE) || readyState == 4) {
			this.status = this.getStatus();
			this.statusText = this.getStatusText();
			this.responseText = String.interpret(transport.responseText);
			this.headerJSON = this._getHeaderJSON()
		}
		if (readyState == 4) {
			var xml = transport.responseXML;
			this.responseXML = Object.isUndefined(xml) ? null: xml;
			this.responseJSON = this._getResponseJSON()
		}
	},
	status: 0,
	statusText: '',
	getStatus: Ajax.Request.prototype.getStatus,
	getStatusText: function () {
		try {
			return this.transport.statusText || ''
		} catch(e) {
			return ''
		}
	},
	getHeader: Ajax.Request.prototype.getHeader,
	getAllHeaders: function () {
		try {
			return this.getAllResponseHeaders()
		} catch(e) {
			return null
		}
	},
	getResponseHeader: function (name) {
		return this.transport.getResponseHeader(name)
	},
	getAllResponseHeaders: function () {
		return this.transport.getAllResponseHeaders()
	},
	_getHeaderJSON: function () {
		var json = this.getHeader('X-JSON');
		if (!json) return null;
		json = decodeURIComponent(escape(json));
		try {
			return json.evalJSON(this.request.options.sanitizeJSON || !this.request.isSameOrigin())
		} catch(e) {
			this.request.dispatchException(e)
		}
	},
	_getResponseJSON: function () {
		var options = this.request.options;
		if (!options.evalJSON || (options.evalJSON != 'force' && !(this.getHeader('Content-type') || '').include('application/json')) || this.responseText.blank()) return null;
		try {
			return this.responseText.evalJSON(options.sanitizeJSON || !this.request.isSameOrigin())
		} catch(e) {
			this.request.dispatchException(e)
		}
	}
});
Ajax.Updater = Class.create(Ajax.Request, {
	initialize: function ($super, container, url, options) {
		this.container = {
			success: (container.success || container),
			failure: (container.failure || (container.success ? null: container))
		};
		options = Object.clone(options);
		var onComplete = options.onComplete;
		options.onComplete = (function (response, json) {
			this.updateContent(response.responseText);
			if (Object.isFunction(onComplete)) onComplete(response, json)
		}).bind(this);
		$super(url, options)
	},
	updateContent: function (responseText) {
		var receiver = this.container[this.success() ? 'success': 'failure'],
		options = this.options;
		if (!options.evalScripts) responseText = responseText.stripScripts();
		if (receiver = $(receiver)) {
			if (options.insertion) {
				if (Object.isString(options.insertion)) {
					var insertion = {};
					insertion[options.insertion] = responseText;
					receiver.insert(insertion)
				} else options.insertion(receiver, responseText)
			} else receiver.update(responseText)
		}
	}
});
Ajax.PeriodicalUpdater = Class.create(Ajax.Base, {
	initialize: function ($super, container, url, options) {
		$super(options);
		this.onComplete = this.options.onComplete;
		this.frequency = (this.options.frequency || 2);
		this.decay = (this.options.decay || 1);
		this.updater = {};
		this.container = container;
		this.url = url;
		this.start()
	},
	start: function () {
		this.options.onComplete = this.updateComplete.bind(this);
		this.onTimerEvent()
	},
	stop: function () {
		this.updater.options.onComplete = undefined;
		clearTimeout(this.timer);
		(this.onComplete || Prototype.emptyFunction).apply(this, arguments)
	},
	updateComplete: function (response) {
		if (this.options.decay) {
			this.decay = (response.responseText == this.lastText ? this.decay * this.options.decay: 1);
			this.lastText = response.responseText
		}
		this.timer = this.onTimerEvent.bind(this).delay(this.decay * this.frequency)
	},
	onTimerEvent: function () {
		this.updater = new Ajax.Updater(this.container, this.url, this.options)
	}
});
function $(element) {
	if (arguments.length > 1) {
		for (var i = 0, elements = [], length = arguments.length; i < length; i++) elements.push($(arguments[i]));
		return elements
	}
	if (Object.isString(element)) element = document.getElementById(element);
	return Element.extend(element)
}
if (Prototype.BrowserFeatures.XPath) {
	document._getElementsByXPath = function (expression, parentElement) {
		var results = [];
		var query = document.evaluate(expression, $(parentElement) || document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
		for (var i = 0, length = query.snapshotLength; i < length; i++) results.push(Element.extend(query.snapshotItem(i)));
		return results
	}
}
if (!window.Node) var Node = {};
if (!Node.ELEMENT_NODE) {
	Object.extend(Node, {
		ELEMENT_NODE: 1,
		ATTRIBUTE_NODE: 2,
		TEXT_NODE: 3,
		CDATA_SECTION_NODE: 4,
		ENTITY_REFERENCE_NODE: 5,
		ENTITY_NODE: 6,
		PROCESSING_INSTRUCTION_NODE: 7,
		COMMENT_NODE: 8,
		DOCUMENT_NODE: 9,
		DOCUMENT_TYPE_NODE: 10,
		DOCUMENT_FRAGMENT_NODE: 11,
		NOTATION_NODE: 12
	})
} (function (global) {
	var SETATTRIBUTE_IGNORES_NAME = (function () {
		var elForm = document.createElement("form");
		var elInput = document.createElement("input");
		var root = document.documentElement;
		elInput.setAttribute("name", "test");
		elForm.appendChild(elInput);
		root.appendChild(elForm);
		var isBuggy = elForm.elements ? (typeof elForm.elements.test == "undefined") : null;
		root.removeChild(elForm);
		elForm = elInput = null;
		return isBuggy
	})();
	var element = global.Element;
	global.Element = function (tagName, attributes) {
		attributes = attributes || {};
		tagName = tagName.toLowerCase();
		var cache = Element.cache;
		if (SETATTRIBUTE_IGNORES_NAME && attributes.name) {
			tagName = '<' + tagName + ' name="' + attributes.name + '">';
			delete attributes.name;
			return Element.writeAttribute(document.createElement(tagName), attributes)
		}
		if (!cache[tagName]) cache[tagName] = Element.extend(document.createElement(tagName));
		return Element.writeAttribute(cache[tagName].cloneNode(false), attributes)
	};
	Object.extend(global.Element, element || {});
	if (element) global.Element.prototype = element.prototype
})(this);
Element.cache = {};
Element.idCounter = 1;
Element.Methods = {
	visible: function (element) {
		return $(element).style.display != 'none'
	},
	toggle: function (element) {
		element = $(element);
		Element[Element.visible(element) ? 'hide': 'show'](element);
		return element
	},
	hide: function (element) {
		element = $(element);
		element.style.display = 'none';
		return element
	},
	show: function (element) {
		element = $(element);
		element.style.display = '';
		return element
	},
	remove: function (element) {
		element = $(element);
		element.parentNode.removeChild(element);
		return element
	},
	update: (function () {
		var SELECT_ELEMENT_INNERHTML_BUGGY = (function () {
			var el = document.createElement("select"),
			isBuggy = true;
			el.innerHTML = "<option value=\"test\">test</option>";
			if (el.options && el.options[0]) {
				isBuggy = el.options[0].nodeName.toUpperCase() !== "OPTION"
			}
			el = null;
			return isBuggy
		})();
		var TABLE_ELEMENT_INNERHTML_BUGGY = (function () {
			try {
				var el = document.createElement("table");
				if (el && el.tBodies) {
					el.innerHTML = "<tbody><tr><td>test</td></tr></tbody>";
					var isBuggy = typeof el.tBodies[0] == "undefined";
					el = null;
					return isBuggy
				}
			} catch(e) {
				return true
			}
		})();
		var SCRIPT_ELEMENT_REJECTS_TEXTNODE_APPENDING = (function () {
			var s = document.createElement("script"),
			isBuggy = false;
			try {
				s.appendChild(document.createTextNode(""));
				isBuggy = !s.firstChild || s.firstChild && s.firstChild.nodeType !== 3
			} catch(e) {
				isBuggy = true
			}
			s = null;
			return isBuggy
		})();
		function update(element, content) {
			element = $(element);
			if (content && content.toElement) content = content.toElement();
			if (Object.isElement(content)) return element.update().insert(content);
			content = Object.toHTML(content);
			var tagName = element.tagName.toUpperCase();
			if (tagName === 'SCRIPT' && SCRIPT_ELEMENT_REJECTS_TEXTNODE_APPENDING) {
				element.text = content;
				return element
			}
			if (SELECT_ELEMENT_INNERHTML_BUGGY || TABLE_ELEMENT_INNERHTML_BUGGY) {
				if (tagName in Element._insertionTranslations.tags) {
					$A(element.childNodes).each(function (node) {
						element.removeChild(node)
					});
					Element._getContentFromAnonymousElement(tagName, content.stripScripts()).each(function (node) {
						element.appendChild(node)
					})
				} else {
					element.innerHTML = content.stripScripts()
				}
			} else {
				element.innerHTML = content.stripScripts()
			}
			content.evalScripts.bind(content).defer();
			return element
		}
		return update
	})(),
	replace: function (element, content) {
		element = $(element);
		if (content && content.toElement) content = content.toElement();
		else if (!Object.isElement(content)) {
			content = Object.toHTML(content);
			var range = element.ownerDocument.createRange();
			range.selectNode(element);
			content.evalScripts.bind(content).defer();
			content = range.createContextualFragment(content.stripScripts())
		}
		element.parentNode.replaceChild(content, element);
		return element
	},
	insert: function (element, insertions) {
		element = $(element);
		if (Object.isString(insertions) || Object.isNumber(insertions) || Object.isElement(insertions) || (insertions && (insertions.toElement || insertions.toHTML))) insertions = {
			bottom: insertions
		};
		var content, insert, tagName, childNodes;
		for (var position in insertions) {
			content = insertions[position];
			position = position.toLowerCase();
			insert = Element._insertionTranslations[position];
			if (content && content.toElement) content = content.toElement();
			if (Object.isElement(content)) {
				insert(element, content);
				continue
			}
			content = Object.toHTML(content);
			tagName = ((position == 'before' || position == 'after') ? element.parentNode: element).tagName.toUpperCase();
			childNodes = Element._getContentFromAnonymousElement(tagName, content.stripScripts());
			if (position == 'top' || position == 'after') childNodes.reverse();
			childNodes.each(insert.curry(element));
			content.evalScripts.bind(content).defer()
		}
		return element
	},
	wrap: function (element, wrapper, attributes) {
		element = $(element);
		if (Object.isElement(wrapper)) $(wrapper).writeAttribute(attributes || {});
		else if (Object.isString(wrapper)) wrapper = new Element(wrapper, attributes);
		else wrapper = new Element('div', wrapper);
		if (element.parentNode) element.parentNode.replaceChild(wrapper, element);
		wrapper.appendChild(element);
		return wrapper
	},
	inspect: function (element) {
		element = $(element);
		var result = '<' + element.tagName.toLowerCase();
		$H({
			'id': 'id',
			'className': 'class'
		}).each(function (pair) {
			var property = pair.first(),
			attribute = pair.last();
			var value = (element[property] || '').toString();
			if (value) result += ' ' + attribute + '=' + value.inspect(true)
		});
		return result + '>'
	},
	recursivelyCollect: function (element, property) {
		element = $(element);
		var elements = [];
		while (element = element[property]) if (element.nodeType == 1) elements.push(Element.extend(element));
		return elements
	},
	ancestors: function (element) {
		return $(element).recursivelyCollect('parentNode')
	},
	descendants: function (element) {
		return Element.select(element, "*")
	},
	firstDescendant: function (element) {
		element = $(element).firstChild;
		while (element && element.nodeType != 1) element = element.nextSibling;
		return $(element)
	},
	immediateDescendants: function (element) {
		if (! (element = $(element).firstChild)) return [];
		while (element && element.nodeType != 1) element = element.nextSibling;
		if (element) return [element].concat($(element).nextSiblings());
		return []
	},
	previousSiblings: function (element) {
		return $(element).recursivelyCollect('previousSibling')
	},
	nextSiblings: function (element) {
		return $(element).recursivelyCollect('nextSibling')
	},
	siblings: function (element) {
		element = $(element);
		return element.previousSiblings().reverse().concat(element.nextSiblings())
	},
	match: function (element, selector) {
		if (Object.isString(selector)) selector = new Selector(selector);
		return selector.match($(element))
	},
	up: function (element, expression, index) {
		element = $(element);
		if (arguments.length == 1) return $(element.parentNode);
		var ancestors = element.ancestors();
		return Object.isNumber(expression) ? ancestors[expression] : Selector.findElement(ancestors, expression, index)
	},
	down: function (element, expression, index) {
		element = $(element);
		if (arguments.length == 1) return element.firstDescendant();
		return Object.isNumber(expression) ? element.descendants()[expression] : Element.select(element, expression)[index || 0]
	},
	previous: function (element, expression, index) {
		element = $(element);
		if (arguments.length == 1) return $(Selector.handlers.previousElementSibling(element));
		var previousSiblings = element.previousSiblings();
		return Object.isNumber(expression) ? previousSiblings[expression] : Selector.findElement(previousSiblings, expression, index)
	},
	next: function (element, expression, index) {
		element = $(element);
		if (arguments.length == 1) return $(Selector.handlers.nextElementSibling(element));
		var nextSiblings = element.nextSiblings();
		return Object.isNumber(expression) ? nextSiblings[expression] : Selector.findElement(nextSiblings, expression, index)
	},
	select: function () {
		var args = $A(arguments),
		element = $(args.shift());
		return Selector.findChildElements(element, args)
	},
	adjacent: function () {
		var args = $A(arguments),
		element = $(args.shift());
		return Selector.findChildElements(element.parentNode, args).without(element)
	},
	identify: function (element) {
		element = $(element);
		var id = element.readAttribute('id');
		if (id) return id;
		do {
			id = 'anonymous_element_' + Element.idCounter++
		} while ($(id));
		element.writeAttribute('id', id);
		return id
	},
	readAttribute: (function () {
		var iframeGetAttributeThrowsError = (function () {
			var el = document.createElement('iframe'),
			isBuggy = false;
			document.documentElement.appendChild(el);
			try {
				el.getAttribute('type', 2)
			} catch(e) {
				isBuggy = true
			}
			document.documentElement.removeChild(el);
			el = null;
			return isBuggy
		})();
		return function (element, name) {
			element = $(element);
			if (iframeGetAttributeThrowsError && name === 'type' && element.tagName.toUpperCase() == 'IFRAME') {
				return element.getAttribute('type')
			}
			if (Prototype.Browser.IE) {
				var t = Element._attributeTranslations.read;
				if (t.values[name]) return t.values[name](element, name);
				if (t.names[name]) name = t.names[name];
				if (name.include(':')) {
					return (!element.attributes || !element.attributes[name]) ? null: element.attributes[name].value
				}
			}
			return element.getAttribute(name)
		}
	})(),
	writeAttribute: function (element, name, value) {
		element = $(element);
		var attributes = {},
		t = Element._attributeTranslations.write;
		if (typeof name == 'object') attributes = name;
		else attributes[name] = Object.isUndefined(value) ? true: value;
		for (var attr in attributes) {
			name = t.names[attr] || attr;
			value = attributes[attr];
			if (t.values[attr]) name = t.values[attr](element, value);
			if (value === false || value === null) element.removeAttribute(name);
			else if (value === true) element.setAttribute(name, name);
			else element.setAttribute(name, value)
		}
		return element
	},
	getHeight: function (element) {
		return $(element).getDimensions().height
	},
	getWidth: function (element) {
		return $(element).getDimensions().width
	},
	classNames: function (element) {
		return new Element.ClassNames(element)
	},
	hasClassName: function (element, className) {
		if (! (element = $(element))) return;
		var elementClassName = element.className;
		return (elementClassName.length > 0 && (elementClassName == className || new RegExp("(^|\\s)" + className + "(\\s|$)").test(elementClassName)))
	},
	addClassName: function (element, className) {
		if (! (element = $(element))) return;
		if (!element.hasClassName(className)) element.className += (element.className ? ' ': '') + className;
		return element
	},
	removeClassName: function (element, className) {
		if (! (element = $(element))) return;
		element.className = element.className.replace(new RegExp("(^|\\s+)" + className + "(\\s+|$)"), ' ').strip();
		return element
	},
	toggleClassName: function (element, className) {
		if (! (element = $(element))) return;
		return element[element.hasClassName(className) ? 'removeClassName': 'addClassName'](className)
	},
	cleanWhitespace: function (element) {
		element = $(element);
		var node = element.firstChild;
		while (node) {
			var nextNode = node.nextSibling;
			if (node.nodeType == 3 && !/\S/.test(node.nodeValue)) element.removeChild(node);
			node = nextNode
		}
		return element
	},
	empty: function (element) {
		return $(element).innerHTML.blank()
	},
	descendantOf: function (element, ancestor) {
		element = $(element),
		ancestor = $(ancestor);
		if (element.compareDocumentPosition) return (element.compareDocumentPosition(ancestor) & 8) === 8;
		if (ancestor.contains) return ancestor.contains(element) && ancestor !== element;
		while (element = element.parentNode) if (element == ancestor) return true;
		return false
	},
	scrollTo: function (element) {
		element = $(element);
		var pos = element.cumulativeOffset();
		window.scrollTo(pos[0], pos[1]);
		return element
	},
	getStyle: function (element, style) {
		element = $(element);
		style = style == 'float' ? 'cssFloat': style.camelize();
		var value = element.style[style];
		if (!value || value == 'auto') {
			var css = document.defaultView.getComputedStyle(element, null);
			value = css ? css[style] : null
		}
		if (style == 'opacity') return value ? parseFloat(value) : 1.0;
		return value == 'auto' ? null: value
	},
	getOpacity: function (element) {
		return $(element).getStyle('opacity')
	},
	setStyle: function (element, styles) {
		element = $(element);
		var elementStyle = element.style,
		match;
		if (Object.isString(styles)) {
			element.style.cssText += ';' + styles;
			return styles.include('opacity') ? element.setOpacity(styles.match(/opacity:\s*(\d?\.?\d*)/)[1]) : element
		}
		try {
			for (var property in styles) if (property == 'opacity') element.setOpacity(styles[property]);
			else {
				elementStyle[(property == 'float' || property == 'cssFloat') ? (Object.isUndefined(elementStyle.styleFloat) ? 'cssFloat': 'styleFloat') : property] = styles[property]
			}
		} catch(e) {}
		return element
	},
	setOpacity: function (element, value) {
		element = $(element);
		element.style.opacity = (value == 1 || value === '') ? '': (value < 0.00001) ? 0 : value;
		return element
	},
	getDimensions: function (element) {
		element = $(element);
		var display = element.getStyle('display');
		if (display != 'none' && display != null) return {
			width: element.offsetWidth,
			height: element.offsetHeight
		};
		var els = element.style;
		var originalVisibility = els.visibility;
		var originalPosition = els.position;
		var originalDisplay = els.display;
		els.visibility = 'hidden';
		if (originalPosition != 'fixed') els.position = 'absolute';
		els.display = 'block';
		var originalWidth = element.clientWidth;
		var originalHeight = element.clientHeight;
		els.display = originalDisplay;
		els.position = originalPosition;
		els.visibility = originalVisibility;
		return {
			width: originalWidth,
			height: originalHeight
		}
	},
	makePositioned: function (element) {
		element = $(element);
		var pos = Element.getStyle(element, 'position');
		if (pos == 'static' || !pos) {
			element._madePositioned = true;
			element.style.position = 'relative';
			if (Prototype.Browser.Opera) {
				element.style.top = 0;
				element.style.left = 0
			}
		}
		return element
	},
	undoPositioned: function (element) {
		element = $(element);
		if (element._madePositioned) {
			element._madePositioned = undefined;
			element.style.position = element.style.top = element.style.left = element.style.bottom = element.style.right = ''
		}
		return element
	},
	makeClipping: function (element) {
		element = $(element);
		if (element._overflow) return element;
		element._overflow = Element.getStyle(element, 'overflow') || 'auto';
		if (element._overflow !== 'hidden') element.style.overflow = 'hidden';
		return element
	},
	undoClipping: function (element) {
		element = $(element);
		if (!element._overflow) return element;
		element.style.overflow = element._overflow == 'auto' ? '': element._overflow;
		element._overflow = null;
		return element
	},
	cumulativeOffset: function (element) {
		var valueT = 0,
		valueL = 0;
		do {
			valueT += element.offsetTop || 0;
			valueL += element.offsetLeft || 0;
			try {
				element.offsetParent
			} catch(e) {
				return Element._returnOffset(0, 0)
			}
			element = element.offsetParent
		} while (element);
		return Element._returnOffset(valueL, valueT)
	},
	positionedOffset: function (element) {
		var valueT = 0,
		valueL = 0;
		do {
			valueT += element.offsetTop || 0;
			valueL += element.offsetLeft || 0;
			element = element.offsetParent;
			if (element) {
				if (element.tagName.toUpperCase() == 'BODY') break;
				var p = Element.getStyle(element, 'position');
				if (p !== 'static') break
			}
		} while (element);
		return Element._returnOffset(valueL, valueT)
	},
	absolutize: function (element) {
		element = $(element);
		if (element.getStyle('position') == 'absolute') return element;
		var offsets = element.positionedOffset();
		var top = offsets[1];
		var left = offsets[0];
		var width = element.clientWidth;
		var height = element.clientHeight;
		element._originalLeft = left - parseFloat(element.style.left || 0);
		element._originalTop = top - parseFloat(element.style.top || 0);
		element._originalWidth = element.style.width;
		element._originalHeight = element.style.height;
		element.style.position = 'absolute';
		element.style.top = top + 'px';
		element.style.left = left + 'px';
		element.style.width = width + 'px';
		element.style.height = height + 'px';
		return element
	},
	relativize: function (element) {
		element = $(element);
		if (element.getStyle('position') == 'relative') return element;
		element.style.position = 'relative';
		var top = parseFloat(element.style.top || 0) - (element._originalTop || 0);
		var left = parseFloat(element.style.left || 0) - (element._originalLeft || 0);
		element.style.top = top + 'px';
		element.style.left = left + 'px';
		element.style.height = element._originalHeight;
		element.style.width = element._originalWidth;
		return element
	},
	cumulativeScrollOffset: function (element) {
		var valueT = 0,
		valueL = 0;
		do {
			valueT += element.scrollTop || 0;
			valueL += element.scrollLeft || 0;
			element = element.parentNode
		} while (element);
		return Element._returnOffset(valueL, valueT)
	},
	getOffsetParent: function (element) {
		if (element.offsetParent) return $(element.offsetParent);
		if (element == document.body) return $(element);
		while ((element = element.parentNode) && element != document.body) if (Element.getStyle(element, 'position') != 'static') return $(element);
		return $(document.body)
	},
	viewportOffset: function (forElement) {
		var valueT = 0,
		valueL = 0;
		var element = forElement;
		do {
			valueT += element.offsetTop || 0;
			valueL += element.offsetLeft || 0;
			if (element.offsetParent == document.body && Element.getStyle(element, 'position') == 'absolute') break
		} while (element = element.offsetParent);
		element = forElement;
		do {
			if (!Prototype.Browser.Opera || (element.tagName && (element.tagName.toUpperCase() == 'BODY'))) {
				valueT -= element.scrollTop || 0;
				valueL -= element.scrollLeft || 0
			}
		} while (element = element.parentNode);
		return Element._returnOffset(valueL, valueT)
	},
	clonePosition: function (element, source) {
		var options = Object.extend({
			setLeft: true,
			setTop: true,
			setWidth: true,
			setHeight: true,
			offsetTop: 0,
			offsetLeft: 0
		},
		arguments[2] || {});
		source = $(source);
		var p = source.viewportOffset();
		element = $(element);
		var delta = [0, 0];
		var parent = null;
		if (Element.getStyle(element, 'position') == 'absolute') {
			parent = element.getOffsetParent();
			delta = parent.viewportOffset()
		}
		if (parent == document.body) {
			delta[0] -= document.body.offsetLeft;
			delta[1] -= document.body.offsetTop
		}
		if (options.setLeft) element.style.left = (p[0] - delta[0] + options.offsetLeft) + 'px';
		if (options.setTop) element.style.top = (p[1] - delta[1] + options.offsetTop) + 'px';
		if (options.setWidth) element.style.width = source.offsetWidth + 'px';
		if (options.setHeight) element.style.height = source.offsetHeight + 'px';
		return element
	}
};
Object.extend(Element.Methods, {
	getElementsBySelector: Element.Methods.select,
	childElements: Element.Methods.immediateDescendants
});
Element._attributeTranslations = {
	write: {
		names: {
			className: 'class',
			htmlFor: 'for'
		},
		values: {}
	}
};
if (Prototype.Browser.Opera) {
	Element.Methods.getStyle = Element.Methods.getStyle.wrap(function (proceed, element, style) {
		switch (style) {
		case 'left':
		case 'top':
		case 'right':
		case 'bottom':
			if (proceed(element, 'position') === 'static') return null;
		case 'height':
		case 'width':
			if (!Element.visible(element)) return null;
			var dim = parseInt(proceed(element, style), 10);
			if (dim !== element['offset' + style.capitalize()]) return dim + 'px';
			var properties;
			if (style === 'height') {
				properties = ['border-top-width', 'padding-top', 'padding-bottom', 'border-bottom-width']
			} else {
				properties = ['border-left-width', 'padding-left', 'padding-right', 'border-right-width']
			}
			return properties.inject(dim, function (memo, property) {
				var val = proceed(element, property);
				return val === null ? memo: memo - parseInt(val, 10)
			}) + 'px';
		default:
			return proceed(element, style)
		}
	});
	Element.Methods.readAttribute = Element.Methods.readAttribute.wrap(function (proceed, element, attribute) {
		if (attribute === 'title') return element.title;
		return proceed(element, attribute)
	})
} else if (Prototype.Browser.IE) {
	Element.Methods.getOffsetParent = Element.Methods.getOffsetParent.wrap(function (proceed, element) {
		element = $(element);
		try {
			element.offsetParent
		} catch(e) {
			return $(document.body)
		}
		var position = element.getStyle('position');
		if (position !== 'static') return proceed(element);
		element.setStyle({
			position: 'relative'
		});
		var value = proceed(element);
		element.setStyle({
			position: position
		});
		return value
	});
	$w('positionedOffset viewportOffset').each(function (method) {
		Element.Methods[method] = Element.Methods[method].wrap(function (proceed, element) {
			element = $(element);
			try {
				element.offsetParent
			} catch(e) {
				return Element._returnOffset(0, 0)
			}
			var position = element.getStyle('position');
			if (position !== 'static') return proceed(element);
			var offsetParent = element.getOffsetParent();
			if (offsetParent && offsetParent.getStyle('position') === 'fixed') offsetParent.setStyle({
				zoom: 1
			});
			element.setStyle({
				position: 'relative'
			});
			var value = proceed(element);
			element.setStyle({
				position: position
			});
			return value
		})
	});
	Element.Methods.cumulativeOffset = Element.Methods.cumulativeOffset.wrap(function (proceed, element) {
		try {
			element.offsetParent
		} catch(e) {
			return Element._returnOffset(0, 0)
		}
		return proceed(element)
	});
	Element.Methods.getStyle = function (element, style) {
		element = $(element);
		style = (style == 'float' || style == 'cssFloat') ? 'styleFloat': style.camelize();
		var value = element.style[style];
		if (!value && element.currentStyle) value = element.currentStyle[style];
		if (style == 'opacity') {
			if (value = (element.getStyle('filter') || '').match(/alpha\(opacity=(.*)\)/)) if (value[1]) return parseFloat(value[1]) / 100;
			return 1.0
		}
		if (value == 'auto') {
			if ((style == 'width' || style == 'height') && (element.getStyle('display') != 'none')) return element['offset' + style.capitalize()] + 'px';
			return null
		}
		return value
	};
	Element.Methods.setOpacity = function (element, value) {
		function stripAlpha(filter) {
			return filter.replace(/alpha\([^\)]*\)/gi, '')
		}
		element = $(element);
		var currentStyle = element.currentStyle;
		if ((currentStyle && !currentStyle.hasLayout) || (!currentStyle && element.style.zoom == 'normal')) element.style.zoom = 1;
		var filter = element.getStyle('filter'),
		style = element.style;
		if (value == 1 || value === '') { (filter = stripAlpha(filter)) ? style.filter = filter: style.removeAttribute('filter');
			return element
		} else if (value < 0.00001) value = 0;
		style.filter = stripAlpha(filter) + 'alpha(opacity=' + (value * 100) + ')';
		return element
	};
	Element._attributeTranslations = (function () {
		var classProp = 'className';
		var forProp = 'for';
		var el = document.createElement('div');
		el.setAttribute(classProp, 'x');
		if (el.className !== 'x') {
			el.setAttribute('class', 'x');
			if (el.className === 'x') {
				classProp = 'class'
			}
		}
		el = null;
		el = document.createElement('label');
		el.setAttribute(forProp, 'x');
		if (el.htmlFor !== 'x') {
			el.setAttribute('htmlFor', 'x');
			if (el.htmlFor === 'x') {
				forProp = 'htmlFor'
			}
		}
		el = null;
		return {
			read: {
				names: {
					'class': classProp,
					'className': classProp,
					'for': forProp,
					'htmlFor': forProp
				},
				values: {
					_getAttr: function (element, attribute) {
						return element.getAttribute(attribute, 2)
					},
					_getAttrNode: function (element, attribute) {
						var node = element.getAttributeNode(attribute);
						return node ? node.value: ""
					},
					_getEv: (function () {
						var el = document.createElement('div');
						el.onclick = Prototype.emptyFunction;
						var value = el.getAttribute('onclick');
						var f;
						if (String(value).indexOf('{') > -1) {
							f = function (element, attribute) {
								attribute = element.getAttribute(attribute);
								if (!attribute) return null;
								attribute = attribute.toString();
								attribute = attribute.split('{')[1];
								attribute = attribute.split('}')[0];
								return attribute.strip()
							}
						} else if (value === '') {
							f = function (element, attribute) {
								attribute = element.getAttribute(attribute);
								if (!attribute) return null;
								return attribute.strip()
							}
						}
						el = null;
						return f
					})(),
					_flag: function (element, attribute) {
						return $(element).hasAttribute(attribute) ? attribute: null
					},
					style: function (element) {
						return element.style.cssText.toLowerCase()
					},
					title: function (element) {
						return element.title
					}
				}
			}
		}
	})();
	Element._attributeTranslations.write = {
		names: Object.extend({
			cellpadding: 'cellPadding',
			cellspacing: 'cellSpacing'
		},
		Element._attributeTranslations.read.names),
		values: {
			checked: function (element, value) {
				element.checked = !!value
			},
			style: function (element, value) {
				element.style.cssText = value ? value: ''
			}
		}
	};
	Element._attributeTranslations.has = {};
	$w('colSpan rowSpan vAlign dateTime accessKey tabIndex ' + 'encType maxLength readOnly longDesc frameBorder').each(function (attr) {
		Element._attributeTranslations.write.names[attr.toLowerCase()] = attr;
		Element._attributeTranslations.has[attr.toLowerCase()] = attr
	});
	(function (v) {
		Object.extend(v, {
			href: v._getAttr,
			src: v._getAttr,
			type: v._getAttr,
			action: v._getAttrNode,
			disabled: v._flag,
			checked: v._flag,
			readonly: v._flag,
			multiple: v._flag,
			onload: v._getEv,
			onunload: v._getEv,
			onclick: v._getEv,
			ondblclick: v._getEv,
			onmousedown: v._getEv,
			onmouseup: v._getEv,
			onmouseover: v._getEv,
			onmousemove: v._getEv,
			onmouseout: v._getEv,
			onfocus: v._getEv,
			onblur: v._getEv,
			onkeypress: v._getEv,
			onkeydown: v._getEv,
			onkeyup: v._getEv,
			onsubmit: v._getEv,
			onreset: v._getEv,
			onselect: v._getEv,
			onchange: v._getEv
		})
	})(Element._attributeTranslations.read.values);
	if (Prototype.BrowserFeatures.ElementExtensions) { (function () {
			function _descendants(element) {
				var nodes = element.getElementsByTagName('*'),
				results = [];
				for (var i = 0, node; node = nodes[i]; i++) if (node.tagName !== "!") results.push(node);
				return results
			}
			Element.Methods.down = function (element, expression, index) {
				element = $(element);
				if (arguments.length == 1) return element.firstDescendant();
				return Object.isNumber(expression) ? _descendants(element)[expression] : Element.select(element, expression)[index || 0]
			}
		})()
	}
} else if (Prototype.Browser.Gecko && /rv:1\.8\.0/.test(navigator.userAgent)) {
	Element.Methods.setOpacity = function (element, value) {
		element = $(element);
		element.style.opacity = (value == 1) ? 0.999999 : (value === '') ? '': (value < 0.00001) ? 0 : value;
		return element
	}
} else if (Prototype.Browser.WebKit) {
	Element.Methods.setOpacity = function (element, value) {
		element = $(element);
		element.style.opacity = (value == 1 || value === '') ? '': (value < 0.00001) ? 0 : value;
		if (value == 1) if (element.tagName.toUpperCase() == 'IMG' && element.width) {
			element.width++;
			element.width--
		} else try {
			var n = document.createTextNode(' ');
			element.appendChild(n);
			element.removeChild(n)
		} catch(e) {}
		return element
	};
	Element.Methods.cumulativeOffset = function (element) {
		var valueT = 0,
		valueL = 0;
		do {
			valueT += element.offsetTop || 0;
			valueL += element.offsetLeft || 0;
			if (element.offsetParent == document.body) if (Element.getStyle(element, 'position') == 'absolute') break;
			element = element.offsetParent
		} while (element);
		return Element._returnOffset(valueL, valueT)
	}
}
if ('outerHTML' in document.documentElement) {
	Element.Methods.replace = function (element, content) {
		element = $(element);
		if (content && content.toElement) content = content.toElement();
		if (Object.isElement(content)) {
			element.parentNode.replaceChild(content, element);
			return element
		}
		content = Object.toHTML(content);
		var parent = element.parentNode,
		tagName = parent.tagName.toUpperCase();
		if (Element._insertionTranslations.tags[tagName]) {
			var nextSibling = element.next();
			var fragments = Element._getContentFromAnonymousElement(tagName, content.stripScripts());
			parent.removeChild(element);
			if (nextSibling) fragments.each(function (node) {
				parent.insertBefore(node, nextSibling)
			});
			else fragments.each(function (node) {
				parent.appendChild(node)
			})
		} else element.outerHTML = content.stripScripts();
		content.evalScripts.bind(content).defer();
		return element
	}
}
Element._returnOffset = function (l, t) {
	var result = [l, t];
	result.left = l;
	result.top = t;
	return result
};
Element._getContentFromAnonymousElement = function (tagName, html) {
	var div = new Element('div'),
	t = Element._insertionTranslations.tags[tagName];
	if (t) {
		div.innerHTML = t[0] + html + t[1];
		t[2].times(function () {
			div = div.firstChild
		})
	} else div.innerHTML = html;
	return $A(div.childNodes)
};
Element._insertionTranslations = {
	before: function (element, node) {
		element.parentNode.insertBefore(node, element)
	},
	top: function (element, node) {
		element.insertBefore(node, element.firstChild)
	},
	bottom: function (element, node) {
		element.appendChild(node)
	},
	after: function (element, node) {
		element.parentNode.insertBefore(node, element.nextSibling)
	},
	tags: {
		TABLE: ['<table>', '</table>', 1],
		TBODY: ['<table><tbody>', '</tbody></table>', 2],
		TR: ['<table><tbody><tr>', '</tr></tbody></table>', 3],
		TD: ['<table><tbody><tr><td>', '</td></tr></tbody></table>', 4],
		SELECT: ['<select>', '</select>', 1]
	}
};
(function () {
	Object.extend(this.tags, {
		THEAD: this.tags.TBODY,
		TFOOT: this.tags.TBODY,
		TH: this.tags.TD
	})
}).call(Element._insertionTranslations);
Element.Methods.Simulated = {
	hasAttribute: function (element, attribute) {
		attribute = Element._attributeTranslations.has[attribute] || attribute;
		var node = $(element).getAttributeNode(attribute);
		return !! (node && node.specified)
	}
};
Element.Methods.ByTag = {};
Object.extend(Element, Element.Methods);
(function (div) {
	if (!Prototype.BrowserFeatures.ElementExtensions && div['__proto__']) {
		window.HTMLElement = {};
		window.HTMLElement.prototype = div['__proto__'];
		Prototype.BrowserFeatures.ElementExtensions = true
	}
	div = null
})(document.createElement('div'));
Element.extend = (function () {
	function checkDeficiency(tagName) {
		if (typeof window.Element != 'undefined') {
			var proto = window.Element.prototype;
			if (proto) {
				var id = '_' + (Math.random() + '').slice(2);
				var el = document.createElement(tagName);
				proto[id] = 'x';
				var isBuggy = (el[id] !== 'x');
				delete proto[id];
				el = null;
				return isBuggy
			}
		}
		return false
	}
	function extendElementWith(element, methods) {
		for (var property in methods) {
			var value = methods[property];
			if (Object.isFunction(value) && !(property in element)) element[property] = value.methodize()
		}
	}
	var HTMLOBJECTELEMENT_PROTOTYPE_BUGGY = checkDeficiency('object');
	var HTMLAPPLETELEMENT_PROTOTYPE_BUGGY = checkDeficiency('applet');
	if (Prototype.BrowserFeatures.SpecificElementExtensions) {
		if (HTMLOBJECTELEMENT_PROTOTYPE_BUGGY && HTMLAPPLETELEMENT_PROTOTYPE_BUGGY) {
			return function (element) {
				if (element && element.tagName) {
					var tagName = element.tagName.toUpperCase();
					if (tagName === 'OBJECT' || tagName === 'APPLET') {
						extendElementWith(element, Element.Methods);
						if (tagName === 'OBJECT') {
							extendElementWith(element, Element.Methods.ByTag.OBJECT)
						} else if (tagName === 'APPLET') {
							extendElementWith(element, Element.Methods.ByTag.APPLET)
						}
					}
				}
				return element
			}
		}
		return Prototype.K
	}
	var Methods = {},
	ByTag = Element.Methods.ByTag;
	var extend = Object.extend(function (element) {
		if (!element || typeof element._extendedByPrototype != 'undefined' || element.nodeType != 1 || element == window) return element;
		var methods = Object.clone(Methods),
		tagName = element.tagName.toUpperCase();
		if (ByTag[tagName]) Object.extend(methods, ByTag[tagName]);
		extendElementWith(element, methods);
		element._extendedByPrototype = Prototype.emptyFunction;
		return element
	},
	{
		refresh: function () {
			if (!Prototype.BrowserFeatures.ElementExtensions) {
				Object.extend(Methods, Element.Methods);
				Object.extend(Methods, Element.Methods.Simulated)
			}
		}
	});
	extend.refresh();
	return extend
})();
Element.hasAttribute = function (element, attribute) {
	if (element.hasAttribute) return element.hasAttribute(attribute);
	return Element.Methods.Simulated.hasAttribute(element, attribute)
};
Element.addMethods = function (methods) {
	var F = Prototype.BrowserFeatures,
	T = Element.Methods.ByTag;
	if (!methods) {
		Object.extend(Form, Form.Methods);
		Object.extend(Form.Element, Form.Element.Methods);
		Object.extend(Element.Methods.ByTag, {
			"FORM": Object.clone(Form.Methods),
			"INPUT": Object.clone(Form.Element.Methods),
			"SELECT": Object.clone(Form.Element.Methods),
			"TEXTAREA": Object.clone(Form.Element.Methods)
		})
	}
	if (arguments.length == 2) {
		var tagName = methods;
		methods = arguments[1]
	}
	if (!tagName) Object.extend(Element.Methods, methods || {});
	else {
		if (Object.isArray(tagName)) tagName.each(extend);
		else extend(tagName)
	}
	function extend(tagName) {
		tagName = tagName.toUpperCase();
		if (!Element.Methods.ByTag[tagName]) Element.Methods.ByTag[tagName] = {};
		Object.extend(Element.Methods.ByTag[tagName], methods)
	}
	function copy(methods, destination, onlyIfAbsent) {
		onlyIfAbsent = onlyIfAbsent || false;
		for (var property in methods) {
			var value = methods[property];
			if (!Object.isFunction(value)) continue;
			if (!onlyIfAbsent || !(property in destination)) destination[property] = value.methodize()
		}
	}
	function findDOMClass(tagName) {
		var klass;
		var trans = {
			"OPTGROUP": "OptGroup",
			"TEXTAREA": "TextArea",
			"P": "Paragraph",
			"FIELDSET": "FieldSet",
			"UL": "UList",
			"OL": "OList",
			"DL": "DList",
			"DIR": "Directory",
			"H1": "Heading",
			"H2": "Heading",
			"H3": "Heading",
			"H4": "Heading",
			"H5": "Heading",
			"H6": "Heading",
			"Q": "Quote",
			"INS": "Mod",
			"DEL": "Mod",
			"A": "Anchor",
			"IMG": "Image",
			"CAPTION": "TableCaption",
			"COL": "TableCol",
			"COLGROUP": "TableCol",
			"THEAD": "TableSection",
			"TFOOT": "TableSection",
			"TBODY": "TableSection",
			"TR": "TableRow",
			"TH": "TableCell",
			"TD": "TableCell",
			"FRAMESET": "FrameSet",
			"IFRAME": "IFrame"
		};
		if (trans[tagName]) klass = 'HTML' + trans[tagName] + 'Element';
		if (window[klass]) return window[klass];
		klass = 'HTML' + tagName + 'Element';
		if (window[klass]) return window[klass];
		klass = 'HTML' + tagName.capitalize() + 'Element';
		if (window[klass]) return window[klass];
		var element = document.createElement(tagName);
		var proto = element['__proto__'] || element.constructor.prototype;
		element = null;
		return proto
	}
	var elementPrototype = window.HTMLElement ? HTMLElement.prototype: Element.prototype;
	if (F.ElementExtensions) {
		copy(Element.Methods, elementPrototype);
		copy(Element.Methods.Simulated, elementPrototype, true)
	}
	if (F.SpecificElementExtensions) {
		for (var tag in Element.Methods.ByTag) {
			var klass = findDOMClass(tag);
			if (Object.isUndefined(klass)) continue;
			copy(T[tag], klass.prototype)
		}
	}
	Object.extend(Element, Element.Methods);
	delete Element.ByTag;
	if (Element.extend.refresh) Element.extend.refresh();
	Element.cache = {}
};
document.viewport = {
	getDimensions: function () {
		return {
			width: this.getWidth(),
			height: this.getHeight()
		}
	},
	getScrollOffsets: function () {
		return Element._returnOffset(window.pageXOffset || document.documentElement.scrollLeft || document.body.scrollLeft, window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop)
	}
};
(function (viewport) {
	var B = Prototype.Browser,
	doc = document,
	element, property = {};
	function getRootElement() {
		if (B.WebKit && !doc.evaluate) return document;
		if (B.Opera && window.parseFloat(window.opera.version()) < 9.5) return document.body;
		return document.documentElement
	}
	function define(D) {
		if (!element) element = getRootElement();
		property[D] = 'client' + D;
		viewport['get' + D] = function () {
			if (element[property[D]] && element[property[D]] != 0) {
				return element[property[D]]
			} else {
				return document.getElementsByTagName('body')[0][property[D]]
			}
		};
		return viewport['get' + D]()
	}
	viewport.getWidth = define.curry('Width');
	viewport.getHeight = define.curry('Height')
})(document.viewport);
Element.Storage = {
	UID: 1
};
Element.addMethods({
	getStorage: function (element) {
		if (! (element = $(element))) return;
		var uid;
		if (element === window) {
			uid = 0
		} else {
			if (typeof element._prototypeUID === "undefined") element._prototypeUID = [Element.Storage.UID++];
			uid = element._prototypeUID[0]
		}
		if (!Element.Storage[uid]) Element.Storage[uid] = $H();
		return Element.Storage[uid]
	},
	store: function (element, key, value) {
		if (! (element = $(element))) return;
		if (arguments.length === 2) {
			element.getStorage().update(key)
		} else {
			element.getStorage().set(key, value)
		}
		return element
	},
	retrieve: function (element, key, defaultValue) {
		if (! (element = $(element))) return;
		var hash = Element.getStorage(element),
		value = hash.get(key);
		if (Object.isUndefined(value)) {
			hash.set(key, defaultValue);
			value = defaultValue
		}
		return value
	},
	clone: function (element, deep) {
		if (! (element = $(element))) return;
		var clone = element.cloneNode(deep);
		clone._prototypeUID = void 0;
		if (deep) {
			var descendants = Element.select(clone, '*'),
			i = descendants.length;
			while (i--) {
				descendants[i]._prototypeUID = void 0
			}
		}
		return Element.extend(clone)
	}
});
var Selector = Class.create({
	initialize: function (expression) {
		this.expression = expression.strip();
		if (this.shouldUseSelectorsAPI()) {
			this.mode = 'selectorsAPI'
		} else if (this.shouldUseXPath()) {
			this.mode = 'xpath';
			this.compileXPathMatcher()
		} else {
			this.mode = "normal";
			this.compileMatcher()
		}
	},
	shouldUseXPath: (function () {
		var IS_DESCENDANT_SELECTOR_BUGGY = (function () {
			var isBuggy = false;
			if (document.evaluate && window.XPathResult) {
				var el = document.createElement('div');
				el.innerHTML = '<ul><li></li></ul><div><ul><li></li></ul></div>';
				var xpath = ".//*[local-name()='ul' or local-name()='UL']" + "//*[local-name()='li' or local-name()='LI']";
				var result = document.evaluate(xpath, el, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
				isBuggy = (result.snapshotLength !== 2);
				el = null
			}
			return isBuggy
		})();
		return function () {
			if (!Prototype.BrowserFeatures.XPath) return false;
			var e = this.expression;
			if (Prototype.Browser.WebKit && (e.include("-of-type") || e.include(":empty"))) return false;
			if ((/(\[[\w-]*?:|:checked)/).test(e)) return false;
			if (IS_DESCENDANT_SELECTOR_BUGGY) return false;
			return true
		}
	})(),
	shouldUseSelectorsAPI: function () {
		if (!Prototype.BrowserFeatures.SelectorsAPI) return false;
		if (Selector.CASE_INSENSITIVE_CLASS_NAMES) return false;
		if (!Selector._div) Selector._div = new Element('div');
		try {
			Selector._div.querySelector(this.expression)
		} catch(e) {
			return false
		}
		return true
	},
	compileMatcher: function () {
		var e = this.expression,
		ps = Selector.patterns,
		h = Selector.handlers,
		c = Selector.criteria,
		le, p, m, len = ps.length,
		name;
		if (Selector._cache[e]) {
			this.matcher = Selector._cache[e];
			return
		}
		this.matcher = ["this.matcher = function(root) {", "var r = root, h = Selector.handlers, c = false, n;"];
		while (e && le != e && (/\S/).test(e)) {
			le = e;
			for (var i = 0; i < len; i++) {
				p = ps[i].re;
				name = ps[i].name;
				if (m = e.match(p)) {
					this.matcher.push(Object.isFunction(c[name]) ? c[name](m) : new Template(c[name]).evaluate(m));
					e = e.replace(m[0], '');
					break
				}
			}
		}
		this.matcher.push("return h.unique(n);\n}");
		eval(this.matcher.join('\n'));
		Selector._cache[this.expression] = this.matcher
	},
	compileXPathMatcher: function () {
		var e = this.expression,
		ps = Selector.patterns,
		x = Selector.xpath,
		le, m, len = ps.length,
		name;
		if (Selector._cache[e]) {
			this.xpath = Selector._cache[e];
			return
		}
		this.matcher = ['.//*'];
		while (e && le != e && (/\S/).test(e)) {
			le = e;
			for (var i = 0; i < len; i++) {
				name = ps[i].name;
				if (m = e.match(ps[i].re)) {
					this.matcher.push(Object.isFunction(x[name]) ? x[name](m) : new Template(x[name]).evaluate(m));
					e = e.replace(m[0], '');
					break
				}
			}
		}
		this.xpath = this.matcher.join('');
		Selector._cache[this.expression] = this.xpath
	},
	findElements: function (root) {
		root = root || document;
		var e = this.expression,
		results;
		switch (this.mode) {
		case 'selectorsAPI':
			if (root !== document) {
				var oldId = root.id,
				id = $(root).identify();
				id = id.replace(/[\.:]/g, "\\$0");
				e = "#" + id + " " + e
			}
			results = $A(root.querySelectorAll(e)).map(Element.extend);
			root.id = oldId;
			return results;
		case 'xpath':
			return document._getElementsByXPath(this.xpath, root);
		default:
			return this.matcher(root)
		}
	},
	match: function (element) {
		this.tokens = [];
		var e = this.expression,
		ps = Selector.patterns,
		as = Selector.assertions;
		var le, p, m, len = ps.length,
		name;
		while (e && le !== e && (/\S/).test(e)) {
			le = e;
			for (var i = 0; i < len; i++) {
				p = ps[i].re;
				name = ps[i].name;
				if (m = e.match(p)) {
					if (as[name]) {
						this.tokens.push([name, Object.clone(m)]);
						e = e.replace(m[0], '')
					} else {
						return this.findElements(document).include(element)
					}
				}
			}
		}
		var match = true,
		name, matches;
		for (var i = 0, token; token = this.tokens[i]; i++) {
			name = token[0],
			matches = token[1];
			if (!Selector.assertions[name](element, matches)) {
				match = false;
				break
			}
		}
		return match
	},
	toString: function () {
		return this.expression
	},
	inspect: function () {
		return "#<Selector:" + this.expression.inspect() + ">"
	}
});
if (Prototype.BrowserFeatures.SelectorsAPI && document.compatMode === 'BackCompat') {
	Selector.CASE_INSENSITIVE_CLASS_NAMES = (function () {
		var div = document.createElement('div'),
		span = document.createElement('span');
		div.id = "prototype_test_id";
		span.className = 'Test';
		div.appendChild(span);
		var isIgnored = (div.querySelector('#prototype_test_id .test') !== null);
		div = span = null;
		return isIgnored
	})()
}
Object.extend(Selector, {
	_cache: {},
	xpath: {
		descendant: "//*",
		child: "/*",
		adjacent: "/following-sibling::*[1]",
		laterSibling: '/following-sibling::*',
		tagName: function (m) {
			if (m[1] == '*') return '';
			return "[local-name()='" + m[1].toLowerCase() + "' or local-name()='" + m[1].toUpperCase() + "']"
		},
		className: "[contains(concat(' ', @class, ' '), ' #{1} ')]",
		id: "[@id='#{1}']",
		attrPresence: function (m) {
			m[1] = m[1].toLowerCase();
			return new Template("[@#{1}]").evaluate(m)
		},
		attr: function (m) {
			m[1] = m[1].toLowerCase();
			m[3] = m[5] || m[6];
			return new Template(Selector.xpath.operators[m[2]]).evaluate(m)
		},
		pseudo: function (m) {
			var h = Selector.xpath.pseudos[m[1]];
			if (!h) return '';
			if (Object.isFunction(h)) return h(m);
			return new Template(Selector.xpath.pseudos[m[1]]).evaluate(m)
		},
		operators: {
			'=': "[@#{1}='#{3}']",
			'!=': "[@#{1}!='#{3}']",
			'^=': "[starts-with(@#{1}, '#{3}')]",
			'$=': "[substring(@#{1}, (string-length(@#{1}) - string-length('#{3}') + 1))='#{3}']",
			'*=': "[contains(@#{1}, '#{3}')]",
			'~=': "[contains(concat(' ', @#{1}, ' '), ' #{3} ')]",
			'|=': "[contains(concat('-', @#{1}, '-'), '-#{3}-')]"
		},
		pseudos: {
			'first-child': '[not(preceding-sibling::*)]',
			'last-child': '[not(following-sibling::*)]',
			'only-child': '[not(preceding-sibling::* or following-sibling::*)]',
			'empty': "[count(*) = 0 and (count(text()) = 0)]",
			'checked': "[@checked]",
			'disabled': "[(@disabled) and (@type!='hidden')]",
			'enabled': "[not(@disabled) and (@type!='hidden')]",
			'not': function (m) {
				var e = m[6],
				p = Selector.patterns,
				x = Selector.xpath,
				le,
				v,
				len = p.length,
				name;
				var exclusion = [];
				while (e && le != e && (/\S/).test(e)) {
					le = e;
					for (var i = 0; i < len; i++) {
						name = p[i].name;
						if (m = e.match(p[i].re)) {
							v = Object.isFunction(x[name]) ? x[name](m) : new Template(x[name]).evaluate(m);
							exclusion.push("(" + v.substring(1, v.length - 1) + ")");
							e = e.replace(m[0], '');
							break
						}
					}
				}
				return "[not(" + exclusion.join(" and ") + ")]"
			},
			'nth-child': function (m) {
				return Selector.xpath.pseudos.nth("(count(./preceding-sibling::*) + 1) ", m)
			},
			'nth-last-child': function (m) {
				return Selector.xpath.pseudos.nth("(count(./following-sibling::*) + 1) ", m)
			},
			'nth-of-type': function (m) {
				return Selector.xpath.pseudos.nth("position() ", m)
			},
			'nth-last-of-type': function (m) {
				return Selector.xpath.pseudos.nth("(last() + 1 - position()) ", m)
			},
			'first-of-type': function (m) {
				m[6] = "1";
				return Selector.xpath.pseudos['nth-of-type'](m)
			},
			'last-of-type': function (m) {
				m[6] = "1";
				return Selector.xpath.pseudos['nth-last-of-type'](m)
			},
			'only-of-type': function (m) {
				var p = Selector.xpath.pseudos;
				return p['first-of-type'](m) + p['last-of-type'](m)
			},
			nth: function (fragment, m) {
				var mm, formula = m[6],
				predicate;
				if (formula == 'even') formula = '2n+0';
				if (formula == 'odd') formula = '2n+1';
				if (mm = formula.match(/^(\d+)$/)) return '[' + fragment + "= " + mm[1] + ']';
				if (mm = formula.match(/^(-?\d*)?n(([+-])(\d+))?/)) {
					if (mm[1] == "-") mm[1] = -1;
					var a = mm[1] ? Number(mm[1]) : 1;
					var b = mm[2] ? Number(mm[2]) : 0;
					predicate = "[((#{fragment} - #{b}) mod #{a} = 0) and " + "((#{fragment} - #{b}) div #{a} >= 0)]";
					return new Template(predicate).evaluate({
						fragment: fragment,
						a: a,
						b: b
					})
				}
			}
		}
	},
	criteria: {
		tagName: 'n = h.tagName(n, r, "#{1}", c);      c = false;',
		className: 'n = h.className(n, r, "#{1}", c);    c = false;',
		id: 'n = h.id(n, r, "#{1}", c);           c = false;',
		attrPresence: 'n = h.attrPresence(n, r, "#{1}", c); c = false;',
		attr: function (m) {
			m[3] = (m[5] || m[6]);
			return new Template('n = h.attr(n, r, "#{1}", "#{3}", "#{2}", c); c = false;').evaluate(m)
		},
		pseudo: function (m) {
			if (m[6]) m[6] = m[6].replace(/"/g, '\\"');
			return new Template('n = h.pseudo(n, "#{1}", "#{6}", r, c); c = false;').evaluate(m)
		},
		descendant: 'c = "descendant";',
		child: 'c = "child";',
		adjacent: 'c = "adjacent";',
		laterSibling: 'c = "laterSibling";'
	},
	patterns: [{
		name: 'laterSibling',
		re: /^\s*~\s*/
	},
	{
		name: 'child',
		re: /^\s*>\s*/
	},
	{
		name: 'adjacent',
		re: /^\s*\+\s*/
	},
	{
		name: 'descendant',
		re: /^\s/
	},
	{
		name: 'tagName',
		re: /^\s*(\*|[\w\-]+)(\b|$)?/
	},
	{
		name: 'id',
		re: /^#([\w\-\*]+)(\b|$)/
	},
	{
		name: 'className',
		re: /^\.([\w\-\*]+)(\b|$)/
	},
	{
		name: 'pseudo',
		re: /^:((first|last|nth|nth-last|only)(-child|-of-type)|empty|checked|(en|dis)abled|not)(\((.*?)\))?(\b|$|(?=\s|[:+~>]))/
	},
	{
		name: 'attrPresence',
		re: /^\[((?:[\w-]+:)?[\w-]+)\]/
	},
	{
		name: 'attr',
		re: /\[((?:[\w-]*:)?[\w-]+)\s*(?:([!^$*~|]?=)\s*((['"])([^\4]*?)\4|([^'"][^\]]*?)))?\]/
	}],
	assertions: {
		tagName: function (element, matches) {
			return matches[1].toUpperCase() == element.tagName.toUpperCase()
		},
		className: function (element, matches) {
			return Element.hasClassName(element, matches[1])
		},
		id: function (element, matches) {
			return element.id === matches[1]
		},
		attrPresence: function (element, matches) {
			return Element.hasAttribute(element, matches[1])
		},
		attr: function (element, matches) {
			var nodeValue = Element.readAttribute(element, matches[1]);
			return nodeValue && Selector.operators[matches[2]](nodeValue, matches[5] || matches[6])
		}
	},
	handlers: {
		concat: function (a, b) {
			for (var i = 0, node; node = b[i]; i++) a.push(node);
			return a
		},
		mark: function (nodes) {
			var _true = Prototype.emptyFunction;
			for (var i = 0, node; node = nodes[i]; i++) node._countedByPrototype = _true;
			return nodes
		},
		unmark: function (nodes) {
			for (var i = 0, node; node = nodes[i]; i++) node._countedByPrototype = undefined;
			return nodes
		},
		index: function (parentNode, reverse, ofType) {
			parentNode._countedByPrototype = Prototype.emptyFunction;
			if (reverse) {
				for (var nodes = parentNode.childNodes, i = nodes.length - 1, j = 1; i >= 0; i--) {
					var node = nodes[i];
					if (node.nodeType == 1 && (!ofType || node._countedByPrototype)) node.nodeIndex = j++
				}
			} else {
				for (var i = 0, j = 1, nodes = parentNode.childNodes; node = nodes[i]; i++) if (node.nodeType == 1 && (!ofType || node._countedByPrototype)) node.nodeIndex = j++
			}
		},
		unique: function (nodes) {
			if (nodes.length == 0) return nodes;
			var results = [],
			n;
			for (var i = 0, l = nodes.length; i < l; i++) if (typeof(n = nodes[i])._countedByPrototype == 'undefined') {
				n._countedByPrototype = Prototype.emptyFunction;
				results.push(Element.extend(n))
			}
			return Selector.handlers.unmark(results)
		},
		descendant: function (nodes) {
			var h = Selector.handlers;
			for (var i = 0, results = [], node; node = nodes[i]; i++) h.concat(results, node.getElementsByTagName('*'));
			return results
		},
		child: function (nodes) {
			var h = Selector.handlers;
			for (var i = 0, results = [], node; node = nodes[i]; i++) {
				for (var j = 0, child; child = node.childNodes[j]; j++) if (child.nodeType == 1 && child.tagName != '!') results.push(child)
			}
			return results
		},
		adjacent: function (nodes) {
			for (var i = 0, results = [], node; node = nodes[i]; i++) {
				var next = this.nextElementSibling(node);
				if (next) results.push(next)
			}
			return results
		},
		laterSibling: function (nodes) {
			var h = Selector.handlers;
			for (var i = 0, results = [], node; node = nodes[i]; i++) h.concat(results, Element.nextSiblings(node));
			return results
		},
		nextElementSibling: function (node) {
			while (node = node.nextSibling) if (node.nodeType == 1) return node;
			return null
		},
		previousElementSibling: function (node) {
			while (node = node.previousSibling) if (node.nodeType == 1) return node;
			return null
		},
		tagName: function (nodes, root, tagName, combinator) {
			var uTagName = tagName.toUpperCase();
			var results = [],
			h = Selector.handlers;
			if (nodes) {
				if (combinator) {
					if (combinator == "descendant") {
						for (var i = 0, node; node = nodes[i]; i++) h.concat(results, node.getElementsByTagName(tagName));
						return results
					} else nodes = this[combinator](nodes);
					if (tagName == "*") return nodes
				}
				for (var i = 0, node; node = nodes[i]; i++) if (node.tagName.toUpperCase() === uTagName) results.push(node);
				return results
			} else return root.getElementsByTagName(tagName)
		},
		id: function (nodes, root, id, combinator) {
			var targetNode = $(id),
			h = Selector.handlers;
			if (root == document) {
				if (!targetNode) return [];
				if (!nodes) return [targetNode]
			} else {
				if (!root.sourceIndex || root.sourceIndex < 1) {
					var nodes = root.getElementsByTagName('*');
					for (var j = 0, node; node = nodes[j]; j++) {
						if (node.id === id) return [node]
					}
				}
			}
			if (nodes) {
				if (combinator) {
					if (combinator == 'child') {
						for (var i = 0, node; node = nodes[i]; i++) if (targetNode.parentNode == node) return [targetNode]
					} else if (combinator == 'descendant') {
						for (var i = 0, node; node = nodes[i]; i++) if (Element.descendantOf(targetNode, node)) return [targetNode]
					} else if (combinator == 'adjacent') {
						for (var i = 0, node; node = nodes[i]; i++) if (Selector.handlers.previousElementSibling(targetNode) == node) return [targetNode]
					} else nodes = h[combinator](nodes)
				}
				for (var i = 0, node; node = nodes[i]; i++) if (node == targetNode) return [targetNode];
				return []
			}
			return (targetNode && Element.descendantOf(targetNode, root)) ? [targetNode] : []
		},
		className: function (nodes, root, className, combinator) {
			if (nodes && combinator) nodes = this[combinator](nodes);
			return Selector.handlers.byClassName(nodes, root, className)
		},
		byClassName: function (nodes, root, className) {
			if (!nodes) nodes = Selector.handlers.descendant([root]);
			var needle = ' ' + className + ' ';
			for (var i = 0, results = [], node, nodeClassName; node = nodes[i]; i++) {
				nodeClassName = node.className;
				if (nodeClassName.length == 0) continue;
				if (nodeClassName == className || (' ' + nodeClassName + ' ').include(needle)) results.push(node)
			}
			return results
		},
		attrPresence: function (nodes, root, attr, combinator) {
			if (!nodes) nodes = root.getElementsByTagName("*");
			if (nodes && combinator) nodes = this[combinator](nodes);
			var results = [];
			for (var i = 0, node; node = nodes[i]; i++) if (Element.hasAttribute(node, attr)) results.push(node);
			return results
		},
		attr: function (nodes, root, attr, value, operator, combinator) {
			if (!nodes) nodes = root.getElementsByTagName("*");
			if (nodes && combinator) nodes = this[combinator](nodes);
			var handler = Selector.operators[operator],
			results = [];
			for (var i = 0, node; node = nodes[i]; i++) {
				var nodeValue = Element.readAttribute(node, attr);
				if (nodeValue === null) continue;
				if (handler(nodeValue, value)) results.push(node)
			}
			return results
		},
		pseudo: function (nodes, name, value, root, combinator) {
			if (nodes && combinator) nodes = this[combinator](nodes);
			if (!nodes) nodes = root.getElementsByTagName("*");
			return Selector.pseudos[name](nodes, value, root)
		}
	},
	pseudos: {
		'first-child': function (nodes, value, root) {
			for (var i = 0, results = [], node; node = nodes[i]; i++) {
				if (Selector.handlers.previousElementSibling(node)) continue;
				results.push(node)
			}
			return results
		},
		'last-child': function (nodes, value, root) {
			for (var i = 0, results = [], node; node = nodes[i]; i++) {
				if (Selector.handlers.nextElementSibling(node)) continue;
				results.push(node)
			}
			return results
		},
		'only-child': function (nodes, value, root) {
			var h = Selector.handlers;
			for (var i = 0, results = [], node; node = nodes[i]; i++) if (!h.previousElementSibling(node) && !h.nextElementSibling(node)) results.push(node);
			return results
		},
		'nth-child': function (nodes, formula, root) {
			return Selector.pseudos.nth(nodes, formula, root)
		},
		'nth-last-child': function (nodes, formula, root) {
			return Selector.pseudos.nth(nodes, formula, root, true)
		},
		'nth-of-type': function (nodes, formula, root) {
			return Selector.pseudos.nth(nodes, formula, root, false, true)
		},
		'nth-last-of-type': function (nodes, formula, root) {
			return Selector.pseudos.nth(nodes, formula, root, true, true)
		},
		'first-of-type': function (nodes, formula, root) {
			return Selector.pseudos.nth(nodes, "1", root, false, true)
		},
		'last-of-type': function (nodes, formula, root) {
			return Selector.pseudos.nth(nodes, "1", root, true, true)
		},
		'only-of-type': function (nodes, formula, root) {
			var p = Selector.pseudos;
			return p['last-of-type'](p['first-of-type'](nodes, formula, root), formula, root)
		},
		getIndices: function (a, b, total) {
			if (a == 0) return b > 0 ? [b] : [];
			return $R(1, total).inject([], function (memo, i) {
				if (0 == (i - b) % a && (i - b) / a >= 0) memo.push(i);
				return memo
			})
		},
		nth: function (nodes, formula, root, reverse, ofType) {
			if (nodes.length == 0) return [];
			if (formula == 'even') formula = '2n+0';
			if (formula == 'odd') formula = '2n+1';
			var h = Selector.handlers,
			results = [],
			indexed = [],
			m;
			h.mark(nodes);
			for (var i = 0, node; node = nodes[i]; i++) {
				if (!node.parentNode._countedByPrototype) {
					h.index(node.parentNode, reverse, ofType);
					indexed.push(node.parentNode)
				}
			}
			if (formula.match(/^\d+$/)) {
				formula = Number(formula);
				for (var i = 0, node; node = nodes[i]; i++) if (node.nodeIndex == formula) results.push(node)
			} else if (m = formula.match(/^(-?\d*)?n(([+-])(\d+))?/)) {
				if (m[1] == "-") m[1] = -1;
				var a = m[1] ? Number(m[1]) : 1;
				var b = m[2] ? Number(m[2]) : 0;
				var indices = Selector.pseudos.getIndices(a, b, nodes.length);
				for (var i = 0, node, l = indices.length; node = nodes[i]; i++) {
					for (var j = 0; j < l; j++) if (node.nodeIndex == indices[j]) results.push(node)
				}
			}
			h.unmark(nodes);
			h.unmark(indexed);
			return results
		},
		'empty': function (nodes, value, root) {
			for (var i = 0, results = [], node; node = nodes[i]; i++) {
				if (node.tagName == '!' || node.firstChild) continue;
				results.push(node)
			}
			return results
		},
		'not': function (nodes, selector, root) {
			var h = Selector.handlers,
			selectorType, m;
			var exclusions = new Selector(selector).findElements(root);
			h.mark(exclusions);
			for (var i = 0, results = [], node; node = nodes[i]; i++) if (!node._countedByPrototype) results.push(node);
			h.unmark(exclusions);
			return results
		},
		'enabled': function (nodes, value, root) {
			for (var i = 0, results = [], node; node = nodes[i]; i++) if (!node.disabled && (!node.type || node.type !== 'hidden')) results.push(node);
			return results
		},
		'disabled': function (nodes, value, root) {
			for (var i = 0, results = [], node; node = nodes[i]; i++) if (node.disabled) results.push(node);
			return results
		},
		'checked': function (nodes, value, root) {
			for (var i = 0, results = [], node; node = nodes[i]; i++) if (node.checked) results.push(node);
			return results
		}
	},
	operators: {
		'=': function (nv, v) {
			return nv == v
		},
		'!=': function (nv, v) {
			return nv != v
		},
		'^=': function (nv, v) {
			return nv == v || nv && nv.startsWith(v)
		},
		'$=': function (nv, v) {
			return nv == v || nv && nv.endsWith(v)
		},
		'*=': function (nv, v) {
			return nv == v || nv && nv.include(v)
		},
		'~=': function (nv, v) {
			return (' ' + nv + ' ').include(' ' + v + ' ')
		},
		'|=': function (nv, v) {
			return ('-' + (nv || "").toUpperCase() + '-').include('-' + (v || "").toUpperCase() + '-')
		}
	},
	split: function (expression) {
		var expressions = [];
		expression.scan(/(([\w#:.~>+()\s-]+|\*|\[.*?\])+)\s*(,|$)/, function (m) {
			expressions.push(m[1].strip())
		});
		return expressions
	},
	matchElements: function (elements, expression) {
		var matches = $$(expression),
		h = Selector.handlers;
		h.mark(matches);
		for (var i = 0, results = [], element; element = elements[i]; i++) if (element._countedByPrototype) results.push(element);
		h.unmark(matches);
		return results
	},
	findElement: function (elements, expression, index) {
		if (Object.isNumber(expression)) {
			index = expression;
			expression = false
		}
		return Selector.matchElements(elements, expression || '*')[index || 0]
	},
	findChildElements: function (element, expressions) {
		expressions = Selector.split(expressions.join(','));
		var results = [],
		h = Selector.handlers;
		for (var i = 0, l = expressions.length, selector; i < l; i++) {
			selector = new Selector(expressions[i].strip());
			h.concat(results, selector.findElements(element))
		}
		return (l > 1) ? h.unique(results) : results
	}
});
if (Prototype.Browser.IE) {
	Object.extend(Selector.handlers, {
		concat: function (a, b) {
			for (var i = 0, node; node = b[i]; i++) if (node.tagName !== "!") a.push(node);
			return a
		},
		unmark: function (nodes) {
			for (var i = 0, node; node = nodes[i]; i++) node.removeAttribute('_countedByPrototype');
			return nodes
		}
	})
}
function $$() {
	return Selector.findChildElements(document, $A(arguments))
}
var Form = {
	reset: function (form) {
		form = $(form);
		form.reset();
		return form
	},
	serializeElements: function (elements, options) {
		if (typeof options != 'object') options = {
			hash: !!options
		};
		else if (Object.isUndefined(options.hash)) options.hash = true;
		var key, value, submitted = false,
		submit = options.submit;
		var data = elements.inject({},
		function (result, element) {
			if (!element.disabled && element.name) {
				key = element.name;
				value = $(element).getValue();
				if (value != null && element.type != 'file' && (element.type != 'submit' || (!submitted && submit !== false && (!submit || key == submit) && (submitted = true)))) {
					if (key in result) {
						if (!Object.isArray(result[key])) result[key] = [result[key]];
						result[key].push(value)
					} else result[key] = value
				}
			}
			return result
		});
		return options.hash ? data: Object.toQueryString(data)
	}
};
Form.Methods = {
	serialize: function (form, options) {
		return Form.serializeElements(Form.getElements(form), options)
	},
	getElements: function (form) {
		var elements = $(form).getElementsByTagName('*'),
		element,
		arr = [],
		serializers = Form.Element.Serializers;
		for (var i = 0; element = elements[i]; i++) {
			arr.push(element)
		}
		return arr.inject([], function (elements, child) {
			if (serializers[child.tagName.toLowerCase()]) elements.push(Element.extend(child));
			return elements
		})
	},
	getInputs: function (form, typeName, name) {
		form = $(form);
		var inputs = form.getElementsByTagName('input');
		if (!typeName && !name) return $A(inputs).map(Element.extend);
		for (var i = 0, matchingInputs = [], length = inputs.length; i < length; i++) {
			var input = inputs[i];
			if ((typeName && input.type != typeName) || (name && input.name != name)) continue;
			matchingInputs.push(Element.extend(input))
		}
		return matchingInputs
	},
	disable: function (form) {
		form = $(form);
		Form.getElements(form).invoke('disable');
		return form
	},
	enable: function (form) {
		form = $(form);
		Form.getElements(form).invoke('enable');
		return form
	},
	findFirstElement: function (form) {
		var elements = $(form).getElements().findAll(function (element) {
			return 'hidden' != element.type && !element.disabled
		});
		var firstByIndex = elements.findAll(function (element) {
			return element.hasAttribute('tabIndex') && element.tabIndex >= 0
		}).sortBy(function (element) {
			return element.tabIndex
		}).first();
		return firstByIndex ? firstByIndex: elements.find(function (element) {
			return ['input', 'select', 'textarea'].include(element.tagName.toLowerCase())
		})
	},
	focusFirstElement: function (form) {
		form = $(form);
		form.findFirstElement().activate();
		return form
	},
	request: function (form, options) {
		form = $(form),
		options = Object.clone(options || {});
		var params = options.parameters,
		action = form.readAttribute('action') || '';
		if (action.blank()) action = window.location.href;
		options.parameters = form.serialize(true);
		if (params) {
			if (Object.isString(params)) params = params.toQueryParams();
			Object.extend(options.parameters, params)
		}
		if (form.hasAttribute('method') && !options.method) options.method = form.method;
		return new Ajax.Request(action, options)
	}
};
Form.Element = {
	focus: function (element) {
		$(element).focus();
		return element
	},
	select: function (element) {
		$(element).select();
		return element
	}
};
Form.Element.Methods = {
	serialize: function (element) {
		element = $(element);
		if (!element.disabled && element.name) {
			var value = element.getValue();
			if (value != undefined) {
				var pair = {};
				pair[element.name] = value;
				return Object.toQueryString(pair)
			}
		}
		return ''
	},
	getValue: function (element) {
		element = $(element);
		var method = element.tagName.toLowerCase();
		return Form.Element.Serializers[method](element)
	},
	setValue: function (element, value) {
		element = $(element);
		var method = element.tagName.toLowerCase();
		Form.Element.Serializers[method](element, value);
		return element
	},
	clear: function (element) {
		$(element).value = '';
		return element
	},
	present: function (element) {
		return $(element).value != ''
	},
	activate: function (element) {
		element = $(element);
		try {
			element.focus();
			if (element.select && (element.tagName.toLowerCase() != 'input' || !['button', 'reset', 'submit'].include(element.type))) element.select()
		} catch(e) {}
		return element
	},
	disable: function (element) {
		element = $(element);
		element.disabled = true;
		return element
	},
	enable: function (element) {
		element = $(element);
		element.disabled = false;
		return element
	}
};
var Field = Form.Element;
var $F = Form.Element.Methods.getValue;
Form.Element.Serializers = {
	input: function (element, value) {
		switch (element.type.toLowerCase()) {
		case 'checkbox':
		case 'radio':
			return Form.Element.Serializers.inputSelector(element, value);
		default:
			return Form.Element.Serializers.textarea(element, value)
		}
	},
	inputSelector: function (element, value) {
		if (Object.isUndefined(value)) return element.checked ? element.value: null;
		else element.checked = !!value
	},
	textarea: function (element, value) {
		if (Object.isUndefined(value)) return element.value;
		else element.value = value
	},
	select: function (element, value) {
		if (Object.isUndefined(value)) return this[element.type == 'select-one' ? 'selectOne': 'selectMany'](element);
		else {
			var opt, currentValue, single = !Object.isArray(value);
			for (var i = 0, length = element.length; i < length; i++) {
				opt = element.options[i];
				currentValue = this.optionValue(opt);
				if (single) {
					if (currentValue == value) {
						opt.selected = true;
						return
					}
				} else opt.selected = value.include(currentValue)
			}
		}
	},
	selectOne: function (element) {
		var index = element.selectedIndex;
		return index >= 0 ? this.optionValue(element.options[index]) : null
	},
	selectMany: function (element) {
		var values, length = element.length;
		if (!length) return null;
		for (var i = 0, values = []; i < length; i++) {
			var opt = element.options[i];
			if (opt.selected) values.push(this.optionValue(opt))
		}
		return values
	},
	optionValue: function (opt) {
		return Element.extend(opt).hasAttribute('value') ? opt.value: opt.text
	}
};
Abstract.TimedObserver = Class.create(PeriodicalExecuter, {
	initialize: function ($super, element, frequency, callback) {
		$super(callback, frequency);
		this.element = $(element);
		this.lastValue = this.getValue()
	},
	execute: function () {
		var value = this.getValue();
		if (Object.isString(this.lastValue) && Object.isString(value) ? this.lastValue != value: String(this.lastValue) != String(value)) {
			this.callback(this.element, value);
			this.lastValue = value
		}
	}
});
Form.Element.Observer = Class.create(Abstract.TimedObserver, {
	getValue: function () {
		return Form.Element.getValue(this.element)
	}
});
Form.Observer = Class.create(Abstract.TimedObserver, {
	getValue: function () {
		return Form.serialize(this.element)
	}
});
Abstract.EventObserver = Class.create({
	initialize: function (element, callback) {
		this.element = $(element);
		this.callback = callback;
		this.lastValue = this.getValue();
		if (this.element.tagName.toLowerCase() == 'form') this.registerFormCallbacks();
		else this.registerCallback(this.element)
	},
	onElementEvent: function () {
		var value = this.getValue();
		if (this.lastValue != value) {
			this.callback(this.element, value);
			this.lastValue = value
		}
	},
	registerFormCallbacks: function () {
		Form.getElements(this.element).each(this.registerCallback, this)
	},
	registerCallback: function (element) {
		if (element.type) {
			switch (element.type.toLowerCase()) {
			case 'checkbox':
			case 'radio':
				Event.observe(element, 'click', this.onElementEvent.bind(this));
				break;
			default:
				Event.observe(element, 'change', this.onElementEvent.bind(this));
				break
			}
		}
	}
});
Form.Element.EventObserver = Class.create(Abstract.EventObserver, {
	getValue: function () {
		return Form.Element.getValue(this.element)
	}
});
Form.EventObserver = Class.create(Abstract.EventObserver, {
	getValue: function () {
		return Form.serialize(this.element)
	}
});
(function () {
	var Event = {
		KEY_BACKSPACE: 8,
		KEY_TAB: 9,
		KEY_RETURN: 13,
		KEY_ESC: 27,
		KEY_LEFT: 37,
		KEY_UP: 38,
		KEY_RIGHT: 39,
		KEY_DOWN: 40,
		KEY_DELETE: 46,
		KEY_HOME: 36,
		KEY_END: 35,
		KEY_PAGEUP: 33,
		KEY_PAGEDOWN: 34,
		KEY_INSERT: 45,
		cache: {}
	};
	var _isButton;
	if (Prototype.Browser.IE) {
		var buttonMap = {
			0 : 1,
			1 : 4,
			2 : 2
		};
		_isButton = function (event, code) {
			return event.button === buttonMap[code]
		}
	} else if (Prototype.Browser.WebKit) {
		_isButton = function (event, code) {
			switch (code) {
			case 0:
				return event.which == 1 && !event.metaKey;
			case 1:
				return event.which == 1 && event.metaKey;
			default:
				return false
			}
		}
	} else {
		_isButton = function (event, code) {
			return event.which ? (event.which === code + 1) : (event.button === code)
		}
	}
	function isLeftClick(event) {
		return _isButton(event, 0)
	}
	function isMiddleClick(event) {
		return _isButton(event, 1)
	}
	function isRightClick(event) {
		return _isButton(event, 2)
	}
	function element(event) {
		event = Event.extend(event);
		var node = event.target;
		var currentTarget = event.currentTarget;
		if (currentTarget && currentTarget.tagName) {
			var type = event.type;
			if (type === 'load' || type === 'error' || (type === 'click' && currentTarget.tagName.toLowerCase() === 'input' && currentTarget.type === 'radio')) node = currentTarget
		}
		if (node.nodeType == Node.TEXT_NODE) node = node.parentNode;
		return Element.extend(node)
	}
	function findElement(event, expression) {
		var element = Event.element(event);
		if (!expression) return element;
		var elements = [element].concat(element.ancestors());
		return Selector.findElement(elements, expression, 0)
	}
	function pointer(event) {
		return {
			x: pointerX(event),
			y: pointerY(event)
		}
	}
	function pointerX(event) {
		var docElement = document.documentElement,
		body = document.body || {
			scrollLeft: 0
		};
		return event.pageX || (event.clientX + (docElement.scrollLeft || body.scrollLeft) - (docElement.clientLeft || 0))
	}
	function pointerY(event) {
		var docElement = document.documentElement,
		body = document.body || {
			scrollTop: 0
		};
		return event.pageY || (event.clientY + (docElement.scrollTop || body.scrollTop) - (docElement.clientTop || 0))
	}
	function stop(event) {
		Event.extend(event);
		event.preventDefault();
		event.stopPropagation();
		event.stopped = true
	}
	Event.Methods = {
		isLeftClick: isLeftClick,
		isMiddleClick: isMiddleClick,
		isRightClick: isRightClick,
		element: element,
		findElement: findElement,
		pointer: pointer,
		pointerX: pointerX,
		pointerY: pointerY,
		stop: stop
	};
	var methods = Object.keys(Event.Methods).inject({},
	function (m, name) {
		m[name] = Event.Methods[name].methodize();
		return m
	});
	if (Prototype.Browser.IE) {
		function _relatedTarget(event) {
			var element;
			switch (event.type) {
			case 'mouseover':
				element = event.fromElement;
				break;
			case 'mouseout':
				element = event.toElement;
				break;
			default:
				return null
			}
			return Element.extend(element)
		}
		Object.extend(methods, {
			stopPropagation: function () {
				this.cancelBubble = true
			},
			preventDefault: function () {
				this.returnValue = false
			},
			inspect: function () {
				return '[object Event]'
			}
		});
		Event.extend = function (event, element) {
			if (!event) return false;
			if (event._extendedByPrototype) return event;
			event._extendedByPrototype = Prototype.emptyFunction;
			var pointer = Event.pointer(event);
			Object.extend(event, {
				target: event.srcElement || element,
				relatedTarget: _relatedTarget(event),
				pageX: pointer.x,
				pageY: pointer.y
			});
			return Object.extend(event, methods)
		}
	} else {
		Event.prototype = window.Event.prototype || document.createEvent('HTMLEvents').__proto__;
		Object.extend(Event.prototype, methods);
		Event.extend = Prototype.K
	}
	function _createResponder(element, eventName, handler) {
		var registry = Element.retrieve(element, 'prototype_event_registry');
		if (Object.isUndefined(registry)) {
			CACHE.push(element);
			registry = Element.retrieve(element, 'prototype_event_registry', $H())
		}
		var respondersForEvent = registry.get(eventName);
		if (Object.isUndefined()) {
			respondersForEvent = [];
			registry.set(eventName, respondersForEvent)
		}
		if (respondersForEvent.pluck('handler').include(handler)) return false;
		var responder;
		if (eventName.include(":")) {
			responder = function (event) {
				if (Object.isUndefined(event.eventName)) return false;
				if (event.eventName !== eventName) return false;
				Event.extend(event, element);
				handler.call(element, event)
			}
		} else {
			if (!Prototype.Browser.IE && (eventName === "mouseenter" || eventName === "mouseleave")) {
				if (eventName === "mouseenter" || eventName === "mouseleave") {
					responder = function (event) {
						Event.extend(event, element);
						var parent = event.relatedTarget;
						while (parent && parent !== element) {
							try {
								parent = parent.parentNode
							} catch(e) {
								parent = element
							}
						}
						if (parent === element) return;
						handler.call(element, event)
					}
				}
			} else {
				responder = function (event) {
					Event.extend(event, element);
					if (handler) handler.call(element, event)
				}
			}
		}
		responder.handler = handler;
		respondersForEvent.push(responder);
		return responder
	}
	function _destroyCache() {
		for (var i = 0, length = CACHE.length; i < length; i++) {
			Event.stopObserving(CACHE[i]);
			CACHE[i] = null
		}
	}
	var CACHE = [];
	if (Prototype.Browser.IE) window.attachEvent('onunload', _destroyCache);
	if (Prototype.Browser.WebKit) window.addEventListener('unload', Prototype.emptyFunction, false);
	var _getDOMEventName = Prototype.K;
	if (!Prototype.Browser.IE) {
		_getDOMEventName = function (eventName) {
			var translations = {
				mouseenter: "mouseover",
				mouseleave: "mouseout"
			};
			return eventName in translations ? translations[eventName] : eventName
		}
	}
	function observe(element, eventName, handler) {
		element = $(element);
		var responder = _createResponder(element, eventName, handler);
		if (!responder) return element;
		if (eventName.include(':')) {
			if (element.addEventListener) element.addEventListener("dataavailable", responder, false);
			else {
				element.attachEvent("ondataavailable", responder);
				element.attachEvent("onfilterchange", responder)
			}
		} else {
			var actualEventName = _getDOMEventName(eventName);
			if (element.addEventListener) element.addEventListener(actualEventName, responder, false);
			else element.attachEvent("on" + actualEventName, responder)
		}
		return element
	}
	function stopObserving(element, eventName, handler) {
		element = $(element);
		var registry = Element.retrieve(element, 'prototype_event_registry');
		if (Object.isUndefined(registry)) return element;
		if (eventName && !handler) {
			var responders = registry.get(eventName);
			if (Object.isUndefined(responders)) return element;
			responders.each(function (r) {
				Element.stopObserving(element, eventName, r.handler)
			});
			return element
		} else if (!eventName) {
			registry.each(function (pair) {
				var eventName = pair.key,
				responders = pair.value;
				responders.each(function (r) {
					Element.stopObserving(element, eventName, r.handler)
				})
			});
			return element
		}
		var responders = registry.get(eventName);
		if (!responders) return;
		var responder = responders.find(function (r) {
			return r.handler === handler
		});
		if (!responder) return element;
		var actualEventName = _getDOMEventName(eventName);
		if (eventName.include(':')) {
			if (element.removeEventListener) element.removeEventListener("dataavailable", responder, false);
			else {
				element.detachEvent("ondataavailable", responder);
				element.detachEvent("onfilterchange", responder)
			}
		} else {
			if (element.removeEventListener) element.removeEventListener(actualEventName, responder, false);
			else element.detachEvent('on' + actualEventName, responder)
		}
		registry.set(eventName, responders.without(responder));
		return element
	}
	function fire(element, eventName, memo, bubble) {
		element = $(element);
		if (Object.isUndefined(bubble)) bubble = true;
		if (element == document && document.createEvent && !element.dispatchEvent) element = document.documentElement;
		var event;
		if (document.createEvent) {
			event = document.createEvent('HTMLEvents');
			event.initEvent('dataavailable', true, true)
		} else {
			event = document.createEventObject();
			event.eventType = bubble ? 'ondataavailable': 'onfilterchange'
		}
		event.eventName = eventName;
		event.memo = memo || {};
		if (document.createEvent) element.dispatchEvent(event);
		else try {
			element.fireEvent(event.eventType, event)
		} catch(e) {}
		return Event.extend(event)
	}
	Object.extend(Event, Event.Methods);
	Object.extend(Event, {
		fire: fire,
		observe: observe,
		stopObserving: stopObserving
	});
	Element.addMethods({
		fire: fire,
		observe: observe,
		stopObserving: stopObserving
	});
	Object.extend(document, {
		fire: fire.methodize(),
		observe: observe.methodize(),
		stopObserving: stopObserving.methodize(),
		loaded: false
	});
	if (window.Event) Object.extend(window.Event, Event);
	else window.Event = Event
})();
(function () {
	var timer;
	function fireContentLoadedEvent() {
		if (document.loaded) return;
		if (timer) window.clearTimeout(timer);
		document.loaded = true;
		document.fire('dom:loaded')
	}
	function checkReadyState() {
		if (document.readyState === 'complete') {
			document.stopObserving('readystatechange', checkReadyState);
			fireContentLoadedEvent()
		}
	}
	function pollDoScroll() {
		try {
			document.documentElement.doScroll('left')
		} catch(e) {
			timer = pollDoScroll.defer();
			return
		}
		fireContentLoadedEvent()
	}
	if (document.addEventListener) {
		document.addEventListener('DOMContentLoaded', fireContentLoadedEvent, false)
	} else {
		document.observe('readystatechange', checkReadyState);
		if (window == top) timer = pollDoScroll.defer()
	}
	Event.observe(window, 'load', fireContentLoadedEvent)
})();
Element.addMethods();
Hash.toQueryString = Object.toQueryString;
var Toggle = {
	display: Element.toggle
};
Element.Methods.childOf = Element.Methods.descendantOf;
var Insertion = {
	Before: function (element, content) {
		return Element.insert(element, {
			before: content
		})
	},
	Top: function (element, content) {
		return Element.insert(element, {
			top: content
		})
	},
	Bottom: function (element, content) {
		return Element.insert(element, {
			bottom: content
		})
	},
	After: function (element, content) {
		return Element.insert(element, {
			after: content
		})
	}
};
var $continue = new Error('"throw $continue" is deprecated, use "return" instead');
var Position = {
	includeScrollOffsets: false,
	prepare: function () {
		this.deltaX = window.pageXOffset || document.documentElement.scrollLeft || document.body.scrollLeft || 0;
		this.deltaY = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0
	},
	within: function (element, x, y) {
		if (this.includeScrollOffsets) return this.withinIncludingScrolloffsets(element, x, y);
		this.xcomp = x;
		this.ycomp = y;
		this.offset = Element.cumulativeOffset(element);
		return (y >= this.offset[1] && y < this.offset[1] + element.offsetHeight && x >= this.offset[0] && x < this.offset[0] + element.offsetWidth)
	},
	withinIncludingScrolloffsets: function (element, x, y) {
		var offsetcache = Element.cumulativeScrollOffset(element);
		this.xcomp = x + offsetcache[0] - this.deltaX;
		this.ycomp = y + offsetcache[1] - this.deltaY;
		this.offset = Element.cumulativeOffset(element);
		return (this.ycomp >= this.offset[1] && this.ycomp < this.offset[1] + element.offsetHeight && this.xcomp >= this.offset[0] && this.xcomp < this.offset[0] + element.offsetWidth)
	},
	overlap: function (mode, element) {
		if (!mode) return 0;
		if (mode == 'vertical') return ((this.offset[1] + element.offsetHeight) - this.ycomp) / element.offsetHeight;
		if (mode == 'horizontal') return ((this.offset[0] + element.offsetWidth) - this.xcomp) / element.offsetWidth
	},
	cumulativeOffset: Element.Methods.cumulativeOffset,
	positionedOffset: Element.Methods.positionedOffset,
	absolutize: function (element) {
		Position.prepare();
		return Element.absolutize(element)
	},
	relativize: function (element) {
		Position.prepare();
		return Element.relativize(element)
	},
	realOffset: Element.Methods.cumulativeScrollOffset,
	offsetParent: Element.Methods.getOffsetParent,
	page: Element.Methods.viewportOffset,
	clone: function (source, target, options) {
		options = options || {};
		return Element.clonePosition(target, source, options)
	}
};
if (!document.getElementsByClassName) document.getElementsByClassName = function (instanceMethods) {
	function iter(name) {
		return name.blank() ? null: "[contains(concat(' ', @class, ' '), ' " + name + " ')]"
	}
	instanceMethods.getElementsByClassName = Prototype.BrowserFeatures.XPath ?
	function (element, className) {
		className = className.toString().strip();
		var cond = /\s/.test(className) ? $w(className).map(iter).join('') : iter(className);
		return cond ? document._getElementsByXPath('.//*' + cond, element) : []
	}: function (element, className) {
		className = className.toString().strip();
		var elements = [],
		classNames = (/\s/.test(className) ? $w(className) : null);
		if (!classNames && !className) return elements;
		var nodes = $(element).getElementsByTagName('*');
		className = ' ' + className + ' ';
		for (var i = 0, child, cn; child = nodes[i]; i++) {
			if (child.className && (cn = ' ' + child.className + ' ') && (cn.include(className) || (classNames && classNames.all(function (name) {
				return ! name.toString().blank() && cn.include(' ' + name + ' ')
			})))) elements.push(Element.extend(child))
		}
		return elements
	};
	return function (className, parentElement) {
		return $(parentElement || document.body).getElementsByClassName(className)
	}
} (Element.Methods);
Element.ClassNames = Class.create();
Element.ClassNames.prototype = {
	initialize: function (element) {
		this.element = $(element)
	},
	_each: function (iterator) {
		this.element.className.split(/\s+/).select(function (name) {
			return name.length > 0
		})._each(iterator)
	},
	set: function (className) {
		this.element.className = className
	},
	add: function (classNameToAdd) {
		if (this.include(classNameToAdd)) return;
		this.set($A(this).concat(classNameToAdd).join(' '))
	},
	remove: function (classNameToRemove) {
		if (!this.include(classNameToRemove)) return;
		this.set($A(this).without(classNameToRemove).join(' '))
	},
	toString: function () {
		return $A(this).join(' ')
	}
};
Object.extend(Element.ClassNames.prototype, Enumerable);
var UFO = {
	req: ["movie", "width", "height", "majorversion", "build"],
	opt: ["play", "loop", "menu", "quality", "scale", "salign", "wmode", "bgcolor", "base", "flashvars", "devicefont", "allowscriptaccess", "seamlesstabbing", "allowfullscreen"],
	optAtt: ["id", "name", "align"],
	optExc: ["swliveconnect"],
	ximovie: "ufo.swf",
	xiwidth: "215",
	xiheight: "138",
	ua: navigator.userAgent.toLowerCase(),
	pluginType: "",
	fv: [0, 0],
	foList: [],
	create: function (FO, id) {
		if (!UFO.uaHas("w3cdom") || UFO.uaHas("ieMac")) return;
		UFO.getFlashVersion();
		UFO.foList[id] = UFO.updateFO(FO);
		UFO.createCSS("#" + id, "visibility:hidden;");
		UFO.domLoad(id)
	},
	updateFO: function (FO) {
		if (typeof FO.xi != "undefined" && FO.xi == "true") {
			if (typeof FO.ximovie == "undefined") FO.ximovie = UFO.ximovie;
			if (typeof FO.xiwidth == "undefined") FO.xiwidth = UFO.xiwidth;
			if (typeof FO.xiheight == "undefined") FO.xiheight = UFO.xiheight
		}
		FO.mainCalled = false;
		return FO
	},
	domLoad: function (id) {
		var _t = setInterval(function () {
			if ((document.getElementsByTagName("body")[0] != null || document.body != null) && document.getElementById(id) != null) {
				UFO.main(id);
				clearInterval(_t)
			}
		},
		250);
		if (typeof document.addEventListener != "undefined") {
			document.addEventListener("DOMContentLoaded", function () {
				UFO.main(id);
				clearInterval(_t)
			},
			null)
		}
	},
	main: function (id) {
		var _fo = UFO.foList[id];
		if (_fo.mainCalled) return;
		UFO.foList[id].mainCalled = true;
		document.getElementById(id).style.visibility = "hidden";
		if (UFO.hasRequired(id)) {
			if (UFO.hasFlashVersion(parseInt(_fo.majorversion, 10), parseInt(_fo.build, 10))) {
				if (typeof _fo.setcontainercss != "undefined" && _fo.setcontainercss == "true") UFO.setContainerCSS(id);
				UFO.writeSWF(id)
			} else if (_fo.xi == "true" && UFO.hasFlashVersion(6, 65)) {
				UFO.createDialog(id)
			}
		}
		document.getElementById(id).style.visibility = "visible"
	},
	createCSS: function (selector, declaration) {
		var _h = document.getElementsByTagName("head")[0];
		var _s = UFO.createElement("style");
		if (!UFO.uaHas("ieWin")) _s.appendChild(document.createTextNode(selector + " {" + declaration + "}"));
		_s.setAttribute("type", "text/css");
		_s.setAttribute("media", "screen");
		_h.appendChild(_s);
		if (UFO.uaHas("ieWin") && document.styleSheets && document.styleSheets.length > 0) {
			var _ls = document.styleSheets[document.styleSheets.length - 1];
			if (typeof _ls.addRule == "object") _ls.addRule(selector, declaration)
		}
	},
	setContainerCSS: function (id) {
		var _fo = UFO.foList[id];
		var _w = /%/.test(_fo.width) ? "": "px";
		var _h = /%/.test(_fo.height) ? "": "px";
		UFO.createCSS("#" + id, "width:" + _fo.width + _w + "; height:" + _fo.height + _h + ";");
		if (_fo.width == "100%") {
			UFO.createCSS("body", "margin-left:0; margin-right:0; padding-left:0; padding-right:0;")
		}
		if (_fo.height == "100%") {
			UFO.createCSS("html", "height:100%; overflow:hidden;");
			UFO.createCSS("body", "margin-top:0; margin-bottom:0; padding-top:0; padding-bottom:0; height:100%;")
		}
	},
	createElement: function (el) {
		return (UFO.uaHas("xml") && typeof document.createElementNS != "undefined") ? document.createElementNS("http://www.w3.org/1999/xhtml", el) : document.createElement(el)
	},
	createObjParam: function (el, aName, aValue) {
		var _p = UFO.createElement("param");
		_p.setAttribute("name", aName);
		_p.setAttribute("value", aValue);
		el.appendChild(_p)
	},
	uaHas: function (ft) {
		var _u = UFO.ua;
		switch (ft) {
		case "w3cdom":
			return (typeof document.getElementById != "undefined" && typeof document.getElementsByTagName != "undefined" && (typeof document.createElement != "undefined" || typeof document.createElementNS != "undefined"));
		case "xml":
			var _m = document.getElementsByTagName("meta");
			var _l = _m.length;
			for (var i = 0; i < _l; i++) {
				if (/content-type/i.test(_m[i].getAttribute("http-equiv")) && /xml/i.test(_m[i].getAttribute("content"))) return true
			}
			return false;
		case "ieMac":
			return /msie/.test(_u) && !/opera/.test(_u) && /mac/.test(_u);
		case "ieWin":
			return /msie/.test(_u) && !/opera/.test(_u) && /win/.test(_u);
		case "gecko":
			return /gecko/.test(_u) && !/applewebkit/.test(_u);
		case "opera":
			return /opera/.test(_u);
		case "safari":
			return /applewebkit/.test(_u);
		default:
			return false
		}
	},
	getFlashVersion: function () {
		if (UFO.fv[0] != 0) return;
		if (navigator.plugins && typeof navigator.plugins["Shockwave Flash"] == "object") {
			UFO.pluginType = "npapi";
			var _d = navigator.plugins["Shockwave Flash"].description;
			if (typeof _d != "undefined") {
				_d = _d.replace(/^.*\s+(\S+\s+\S+$)/, "$1");
				var _m = parseInt(_d.replace(/^(.*)\..*$/, "$1"), 10);
				var _r = /r/.test(_d) ? parseInt(_d.replace(/^.*r(.*)$/, "$1"), 10) : 0;
				UFO.fv = [_m, _r]
			}
		} else if (window.ActiveXObject) {
			UFO.pluginType = "ax";
			try {
				var _a = new ActiveXObject("ShockwaveFlash.ShockwaveFlash.7")
			} catch(e) {
				try {
					var _a = new ActiveXObject("ShockwaveFlash.ShockwaveFlash.6");
					UFO.fv = [6, 0];
					_a.AllowScriptAccess = "always"
				} catch(e) {
					if (UFO.fv[0] == 6) return
				}
				try {
					var _a = new ActiveXObject("ShockwaveFlash.ShockwaveFlash")
				} catch(e) {}
			}
			if (typeof _a == "object") {
				var _d = _a.GetVariable("$version");
				if (typeof _d != "undefined") {
					_d = _d.replace(/^\S+\s+(.*)$/, "$1").split(",");
					UFO.fv = [parseInt(_d[0], 10), parseInt(_d[2], 10)]
				}
			}
		}
	},
	hasRequired: function (id) {
		var _l = UFO.req.length;
		for (var i = 0; i < _l; i++) {
			if (typeof UFO.foList[id][UFO.req[i]] == "undefined") return false
		}
		return true
	},
	hasFlashVersion: function (major, release) {
		return (UFO.fv[0] > major || (UFO.fv[0] == major && UFO.fv[1] >= release)) ? true: false
	},
	writeSWF: function (id) {
		var _fo = UFO.foList[id];
		var _e = document.getElementById(id);
		if (UFO.pluginType == "npapi") {
			if (UFO.uaHas("gecko") || UFO.uaHas("xml")) {
				while (_e.hasChildNodes()) {
					_e.removeChild(_e.firstChild)
				}
				var _obj = UFO.createElement("object");
				_obj.setAttribute("type", "application/x-shockwave-flash");
				_obj.setAttribute("data", _fo.movie);
				_obj.setAttribute("width", _fo.width);
				_obj.setAttribute("height", _fo.height);
				var _l = UFO.optAtt.length;
				for (var i = 0; i < _l; i++) {
					if (typeof _fo[UFO.optAtt[i]] != "undefined") _obj.setAttribute(UFO.optAtt[i], _fo[UFO.optAtt[i]])
				}
				var _o = UFO.opt.concat(UFO.optExc);
				var _l = _o.length;
				for (var i = 0; i < _l; i++) {
					if (typeof _fo[_o[i]] != "undefined") UFO.createObjParam(_obj, _o[i], _fo[_o[i]])
				}
				_e.appendChild(_obj)
			} else {
				var _emb = "";
				var _o = UFO.opt.concat(UFO.optAtt).concat(UFO.optExc);
				var _l = _o.length;
				for (var i = 0; i < _l; i++) {
					if (typeof _fo[_o[i]] != "undefined") _emb += ' ' + _o[i] + '="' + _fo[_o[i]] + '"'
				}
				_e.innerHTML = '<embed type="application/x-shockwave-flash" src="' + _fo.movie + '" width="' + _fo.width + '" height="' + _fo.height + '" pluginspage="http://www.macromedia.com/go/getflashplayer"' + _emb + '></embed>'
			}
		} else if (UFO.pluginType == "ax") {
			var _objAtt = "";
			var _l = UFO.optAtt.length;
			for (var i = 0; i < _l; i++) {
				if (typeof _fo[UFO.optAtt[i]] != "undefined") _objAtt += ' ' + UFO.optAtt[i] + '="' + _fo[UFO.optAtt[i]] + '"'
			}
			var _objPar = "";
			var _l = UFO.opt.length;
			for (var i = 0; i < _l; i++) {
				if (typeof _fo[UFO.opt[i]] != "undefined") _objPar += '<param name="' + UFO.opt[i] + '" value="' + _fo[UFO.opt[i]] + '" />'
			}
			var _p = window.location.protocol == "https:" ? "https:": "http:";
			_e.innerHTML = '<object classid="clsid:D27CDB6E-AE6D-11cf-96B8-444553540000"' + _objAtt + ' width="' + _fo.width + '" height="' + _fo.height + '" codebase="' + _p + '//download.macromedia.com/pub/shockwave/cabs/flash/swflash.cab#version=' + _fo.majorversion + ',0,' + _fo.build + ',0"><param name="movie" value="' + _fo.movie + '" />' + _objPar + '</object>'
		}
	},
	createDialog: function (id) {
		var _fo = UFO.foList[id];
		UFO.createCSS("html", "height:100%; overflow:hidden;");
		UFO.createCSS("body", "height:100%; overflow:hidden;");
		UFO.createCSS("#xi-con", "position:absolute; left:0; top:0; z-index:1000; width:100%; height:100%; background-color:#fff; filter:alpha(opacity:75); opacity:0.75;");
		UFO.createCSS("#xi-dia", "position:absolute; left:50%; top:50%; margin-left: -" + Math.round(parseInt(_fo.xiwidth, 10) / 2) + "px; margin-top: -" + Math.round(parseInt(_fo.xiheight, 10) / 2) + "px; width:" + _fo.xiwidth + "px; height:" + _fo.xiheight + "px;");
		var _b = document.getElementsByTagName("body")[0];
		var _c = UFO.createElement("div");
		_c.setAttribute("id", "xi-con");
		var _d = UFO.createElement("div");
		_d.setAttribute("id", "xi-dia");
		_c.appendChild(_d);
		_b.appendChild(_c);
		var _mmu = window.location;
		if (UFO.uaHas("xml") && UFO.uaHas("safari")) {
			var _mmd = document.getElementsByTagName("title")[0].firstChild.nodeValue = document.getElementsByTagName("title")[0].firstChild.nodeValue.slice(0, 47) + " - Flash Player Installation"
		} else {
			var _mmd = document.title = document.title.slice(0, 47) + " - Flash Player Installation"
		}
		var _mmp = UFO.pluginType == "ax" ? "ActiveX": "PlugIn";
		var _uc = typeof _fo.xiurlcancel != "undefined" ? "&xiUrlCancel=" + _fo.xiurlcancel: "";
		var _uf = typeof _fo.xiurlfailed != "undefined" ? "&xiUrlFailed=" + _fo.xiurlfailed: "";
		UFO.foList["xi-dia"] = {
			movie: _fo.ximovie,
			width: _fo.xiwidth,
			height: _fo.xiheight,
			majorversion: "6",
			build: "65",
			flashvars: "MMredirectURL=" + _mmu + "&MMplayerType=" + _mmp + "&MMdoctitle=" + _mmd + _uc + _uf
		};
		UFO.writeSWF("xi-dia")
	},
	expressInstallCallback: function () {
		var _b = document.getElementsByTagName("body")[0];
		var _c = document.getElementById("xi-con");
		_b.removeChild(_c);
		UFO.createCSS("body", "height:auto; overflow:auto;");
		UFO.createCSS("html", "height:auto; overflow:auto;")
	},
	cleanupIELeaks: function () {
		var _o = document.getElementsByTagName("object");
		var _l = _o.length;
		for (var i = 0; i < _l; i++) {
			_o[i].style.display = "none";
			for (var x in _o[i]) {
				if (typeof _o[i][x] == "function") {
					_o[i][x] = null
				}
			}
		}
	}
};
if (typeof window.attachEvent != "undefined" && UFO.uaHas("ieWin")) {
	window.attachEvent("onunload", UFO.cleanupIELeaks)
}
var hexcase = 0;
var b64pad = "";
var chrsz = 8;
function hex_md5(s) {
	return binl2hex(core_md5(str2binl(s), s.length * chrsz))
}
function b64_md5(s) {
	return binl2b64(core_md5(str2binl(s), s.length * chrsz))
}
function str_md5(s) {
	return binl2str(core_md5(str2binl(s), s.length * chrsz))
}
function hex_hmac_md5(key, data) {
	return binl2hex(core_hmac_md5(key, data))
}
function b64_hmac_md5(key, data) {
	return binl2b64(core_hmac_md5(key, data))
}
function str_hmac_md5(key, data) {
	return binl2str(core_hmac_md5(key, data))
}
function md5_vm_test() {
	return hex_md5("abc") == "900150983cd24fb0d6963f7d28e17f72"
}
function core_md5(x, len) {
	x[len >> 5] |= 0x80 << ((len) 2);
	x[(((len + 64) >>> 9) << 4) + 14] = len;
	var a = 1732584193;
	var b = -271733879;
	var c = -1732584194;
	var d = 271733878;
	for (var i = 0; i < x.length; i += 16) {
		var olda = a;
		var oldb = b;
		var oldc = c;
		var oldd = d;
		a = md5_ff(a, b, c, d, x[i + 0], 7, -680876936);
		d = md5_ff(d, a, b, c, x[i + 1], 12, -389564586);
		c = md5_ff(c, d, a, b, x[i + 2], 17, 606105819);
		b = md5_ff(b, c, d, a, x[i + 3], 22, -1044525330);
		a = md5_ff(a, b, c, d, x[i + 4], 7, -176418897);
		d = md5_ff(d, a, b, c, x[i + 5], 12, 1200080426);
		c = md5_ff(c, d, a, b, x[i + 6], 17, -1473231341);
		b = md5_ff(b, c, d, a, x[i + 7], 22, -45705983);
		a = md5_ff(a, b, c, d, x[i + 8], 7, 1770035416);
		d = md5_ff(d, a, b, c, x[i + 9], 12, -1958414417);
		c = md5_ff(c, d, a, b, x[i + 10], 17, -42063);
		b = md5_ff(b, c, d, a, x[i + 11], 22, -1990404162);
		a = md5_ff(a, b, c, d, x[i + 12], 7, 1804603682);
		d = md5_ff(d, a, b, c, x[i + 13], 12, -40341101);
		c = md5_ff(c, d, a, b, x[i + 14], 17, -1502002290);
		b = md5_ff(b, c, d, a, x[i + 15], 22, 1236535329);
		a = md5_gg(a, b, c, d, x[i + 1], 5, -165796510);
		d = md5_gg(d, a, b, c, x[i + 6], 9, -1069501632);
		c = md5_gg(c, d, a, b, x[i + 11], 14, 643717713);
		b = md5_gg(b, c, d, a, x[i + 0], 20, -373897302);
		a = md5_gg(a, b, c, d, x[i + 5], 5, -701558691);
		d = md5_gg(d, a, b, c, x[i + 10], 9, 38016083);
		c = md5_gg(c, d, a, b, x[i + 15], 14, -660478335);
		b = md5_gg(b, c, d, a, x[i + 4], 20, -405537848);
		a = md5_gg(a, b, c, d, x[i + 9], 5, 568446438);
		d = md5_gg(d, a, b, c, x[i + 14], 9, -1019803690);
		c = md5_gg(c, d, a, b, x[i + 3], 14, -187363961);
		b = md5_gg(b, c, d, a, x[i + 8], 20, 1163531501);
		a = md5_gg(a, b, c, d, x[i + 13], 5, -1444681467);
		d = md5_gg(d, a, b, c, x[i + 2], 9, -51403784);
		c = md5_gg(c, d, a, b, x[i + 7], 14, 1735328473);
		b = md5_gg(b, c, d, a, x[i + 12], 20, -1926607734);
		a = md5_hh(a, b, c, d, x[i + 5], 4, -378558);
		d = md5_hh(d, a, b, c, x[i + 8], 11, -2022574463);
		c = md5_hh(c, d, a, b, x[i + 11], 16, 1839030562);
		b = md5_hh(b, c, d, a, x[i + 14], 23, -35309556);
		a = md5_hh(a, b, c, d, x[i + 1], 4, -1530992060);
		d = md5_hh(d, a, b, c, x[i + 4], 11, 1272893353);
		c = md5_hh(c, d, a, b, x[i + 7], 16, -155497632);
		b = md5_hh(b, c, d, a, x[i + 10], 23, -1094730640);
		a = md5_hh(a, b, c, d, x[i + 13], 4, 681279174);
		d = md5_hh(d, a, b, c, x[i + 0], 11, -358537222);
		c = md5_hh(c, d, a, b, x[i + 3], 16, -722521979);
		b = md5_hh(b, c, d, a, x[i + 6], 23, 76029189);
		a = md5_hh(a, b, c, d, x[i + 9], 4, -640364487);
		d = md5_hh(d, a, b, c, x[i + 12], 11, -421815835);
		c = md5_hh(c, d, a, b, x[i + 15], 16, 530742520);
		b = md5_hh(b, c, d, a, x[i + 2], 23, -995338651);
		a = md5_ii(a, b, c, d, x[i + 0], 6, -198630844);
		d = md5_ii(d, a, b, c, x[i + 7], 10, 1126891415);
		c = md5_ii(c, d, a, b, x[i + 14], 15, -1416354905);
		b = md5_ii(b, c, d, a, x[i + 5], 21, -57434055);
		a = md5_ii(a, b, c, d, x[i + 12], 6, 1700485571);
		d = md5_ii(d, a, b, c, x[i + 3], 10, -1894986606);
		c = md5_ii(c, d, a, b, x[i + 10], 15, -1051523);
		b = md5_ii(b, c, d, a, x[i + 1], 21, -2054922799);
		a = md5_ii(a, b, c, d, x[i + 8], 6, 1873313359);
		d = md5_ii(d, a, b, c, x[i + 15], 10, -30611744);
		c = md5_ii(c, d, a, b, x[i + 6], 15, -1560198380);
		b = md5_ii(b, c, d, a, x[i + 13], 21, 1309151649);
		a = md5_ii(a, b, c, d, x[i + 4], 6, -145523070);
		d = md5_ii(d, a, b, c, x[i + 11], 10, -1120210379);
		c = md5_ii(c, d, a, b, x[i + 2], 15, 718787259);
		b = md5_ii(b, c, d, a, x[i + 9], 21, -343485551);
		a = safe_add(a, olda);
		b = safe_add(b, oldb);
		c = safe_add(c, oldc);
		d = safe_add(d, oldd)
	}
	return Array(a, b, c, d)
}
function md5_cmn(q, a, b, x, s, t) {
	return safe_add(bit_rol(safe_add(safe_add(a, q), safe_add(x, t)), s), b)
}
function md5_ff(a, b, c, d, x, s, t) {
	return md5_cmn((b & c) | ((~b) & d), a, b, x, s, t)
}
function md5_gg(a, b, c, d, x, s, t) {
	return md5_cmn((b & d) | (c & (~d)), a, b, x, s, t)
}
function md5_hh(a, b, c, d, x, s, t) {
	return md5_cmn(b ^ c ^ d, a, b, x, s, t)
}
function md5_ii(a, b, c, d, x, s, t) {
	return md5_cmn(c ^ (b | (~d)), a, b, x, s, t)
}
function core_hmac_md5(key, data) {
	var bkey = str2binl(key);
	if (bkey.length > 16) bkey = core_md5(bkey, key.length * chrsz);
	var ipad = Array(16),
	opad = Array(16);
	for (var i = 0; i < 16; i++) {
		ipad[i] = bkey[i] ^ 0x36363636;
		opad[i] = bkey[i] ^ 0x5C5C5C5C
	}
	var hash = core_md5(ipad.concat(str2binl(data)), 512 + data.length * chrsz);
	return core_md5(opad.concat(hash), 512 + 128)
}
function safe_add(x, y) {
	var lsw = (x & 0xFFFF) + (y & 0xFFFF);
	var msw = (x >> 16) + (y >> 16) + (lsw >> 16);
	return (msw << 16) | (lsw & 0xFFFF)
}
function bit_rol(num, cnt) {
	return (num << cnt) | (num >>> (32 - cnt))
}
function str2binl(str) {
	var bin = Array();
	var mask = (1 << chrsz) - 1;
	for (var i = 0; i < str.length * chrsz; i += chrsz) bin[i >> 5] |= (str.charCodeAt(i / chrsz) & mask) << (_draggingMultiple);
	return bin
}
function binl2str(bin) {
	var str = "";
	var mask = (1 << chrsz) - 1;
	for (var i = 0; i < bin.length * 32; i += chrsz) str += String.fromCharCode((bin[i >> 5] >>> (_draggingMultiple)) & mask);
	return str
}
function binl2hex(binarray) {
	var hex_tab = hexcase ? "0123456789ABCDEF": "0123456789abcdef";
	var str = "";
	for (var i = 0; i < binarray.length * 4; i++) {
		str += hex_tab.charAt((binarray[i >> 2] >> ((i % 4) * 8 + 4)) & 0xF) + hex_tab.charAt((binarray[i >> 2] >> ((i % 4) * 8)) & 0xF)
	}
	return str
}
function binl2b64(binarray) {
	var tab = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
	var str = "";
	for (var i = 0; i < binarray.length * 4; i += 3) {
		var triplet = (((binarray[i >> 2] >> 8 * (i % 4)) & 0xFF) << 16) | (((binarray[i + 1 >> 2] >> 8 * ((i + 1) % 4)) & 0xFF) << 8) | ((binarray[i + 2 >> 2] >> 8 * ((i + 2) % 4)) & 0xFF);
		for (var j = 0; j < 4; j++) {
			if (i * 8 + j * 6 > binarray.length * 32) str += b64pad;
			else str += tab.charAt((triplet >> 6 * (3 - j)) & 0x3F)
		}
	}
	return str
}
function Timer(nPauseTime) {
	this._pauseTime = typeof nPauseTime == "undefined" ? 1000 : nPauseTime;
	this._timer = null;
	this._isStarted = false
}
Timer.prototype.start = function () {
	if (this.isStarted()) this.stop();
	var oThis = this;
	this._timer = window.setTimeout(function () {
		if (typeof oThis.ontimer == "function") oThis.ontimer()
	},
	this._pauseTime);
	this._isStarted = false
};
Timer.prototype.stop = function () {
	if (this._timer != null) window.clearTimeout(this._timer);
	this._isStarted = false
};
Timer.prototype.isStarted = function () {
	return this._isStarted
};
Timer.prototype.getPauseTime = function () {
	return this._pauseTime
};
Timer.prototype.setPauseTime = function (nPauseTime) {
	this._pauseTime = nPauseTime
};
function Range() {
	this._value = 0;
	this._minimum = 0;
	this._maximum = 100;
	this._extent = 0;
	this._isChanging = false
}
Range.prototype.setValue = function (value) {
	value = Math.round(parseFloat(value));
	if (isNaN(value)) return;
	if (this._value != value) {
		if (value + this._extent > this._maximum) this._value = this._maximum - this._extent;
		else if (value < this._minimum) this._value = this._minimum;
		else this._value = value;
		if (!this._isChanging && typeof this.onchange == "function") this.onchange()
	}
};
Range.prototype.getValue = function () {
	return this._value
};
Range.prototype.setExtent = function (extent) {
	if (this._extent != extent) {
		if (extent < 0) this._extent = 0;
		else if (this._value + extent > this._maximum) this._extent = this._maximum - this._value;
		else this._extent = extent;
		if (!this._isChanging && typeof this.onchange == "function") this.onchange()
	}
};
Range.prototype.getExtent = function () {
	return this._extent
};
Range.prototype.setMinimum = function (minimum) {
	if (this._minimum != minimum) {
		var oldIsChanging = this._isChanging;
		this._isChanging = true;
		this._minimum = minimum;
		if (minimum > this._value) this.setValue(minimum);
		if (minimum > this._maximum) {
			this._extent = 0;
			this.setMaximum(minimum);
			this.setValue(minimum)
		}
		if (minimum + this._extent > this._maximum) this._extent = this._maximum - this._minimum;
		this._isChanging = oldIsChanging;
		if (!this._isChanging && typeof this.onchange == "function") this.onchange()
	}
};
Range.prototype.getMinimum = function () {
	return this._minimum
};
Range.prototype.setMaximum = function (maximum) {
	if (this._maximum != maximum) {
		var oldIsChanging = this._isChanging;
		this._isChanging = true;
		this._maximum = maximum;
		if (maximum < this._value) this.setValue(maximum - this._extent);
		if (maximum < this._minimum) {
			this._extent = 0;
			this.setMinimum(maximum);
			this.setValue(this._maximum)
		}
		if (maximum < this._minimum + this._extent) this._extent = this._maximum - this._minimum;
		if (maximum < this._value + this._extent) this._extent = this._maximum - this._value;
		this._isChanging = oldIsChanging;
		if (!this._isChanging && typeof this.onchange == "function") this.onchange()
	}
};
Range.prototype.getMaximum = function () {
	return this._maximum
};
SelectableElements = Class.create({
	initialize: function (oElement, bMultiple) {
		if (oElement == null) return;
		this.initSelectableItems(oElement, bMultiple)
	},
	initSelectableItems: function (oElement, bMultiple, dragSelectionElement) {
		this._htmlElement = oElement;
		this._multiple = Boolean(bMultiple);
		this._selectedItems = [];
		this._fireChange = true;
		this.hasFocus = false;
		this._onclick = function (e) {
			if (e == null) e = oElement.ownerDocument.parentWindow.event;
			this.click(e)
		}.bind(this);
		$(this._htmlElement).observe('contextmenu', function (e) {
			Event.stop(e);
			if (this._selectedItems.length > 1) return;
			if (Prototype.Browser.WebKit) return;
			this.click(e)
		}.bind(this));
		this._ondblclick = function (e) {
			if (e == null) e = oElement.ownerDocument.parentWindow.event;
			this.dblClick(e)
		}.bind(this);
		if (oElement.addEventListener) {
			oElement.addEventListener("click", this._onclick, false)
		} else if (oElement.attachEvent) {
			oElement.attachEvent("onclick", this._onclick);
			oElement.attachEvent("ondblclick", this._ondblclick)
		}
		this.eventMouseUp = this.dragEnd.bindAsEventListener(this);
		this.eventMouseDown = this.dragStart.bindAsEventListener(this);
		this.eventMouseMove = this.drag.bindAsEventListener(this);
		this.selectorAdded = false;
		if (dragSelectionElement) {
			this.dragSelectionElement = $(dragSelectionElement)
		} else {
			this.dragSelectionElement = $(oElement)
		}
		Event.observe(this.dragSelectionElement, "mousedown", this.eventMouseDown)
	},
	dragStart: function (e) {
		var oElement = this._htmlElement;
		this.originalX = e.clientX;
		this.originalY = e.clientY;
		this.dSEPosition = Position.cumulativeOffset(this.dragSelectionElement);
		this.dSEDimension = Element.getDimensions(this.dragSelectionElement);
		var h = parseInt(this.dragSelectionElement.getStyle('height'));
		if (this.dragSelectionElement.scrollHeight > h) {
			if (this.originalX > (this.dSEPosition[0] + this.dSEDimension.width) - 18) return
		}
		Event.observe(document, "mousemove", this.eventMouseMove);
		Event.observe(document, "mouseup", this.eventMouseUp);
		if (!this.divSelector) {
			this.divSelector = new Element('div', {
				style: "border : 1px dotted #999; background-color:#ddd;	filter:alpha(opacity=50);opacity: 0.5;-moz-opacity:0.5;z-index:100000;position:absolute;top:0px;left:0px;height:0px;width:0px;"
			})
		}
		$(this.dragSelectionElement).setStyle({
			cursor: "move"
		})
	},
	drag: function (e) {
		if (!this.selectorAdded) {
			this.body = document.getElementsByTagName('body')[0];
			this.body.appendChild(this.divSelector);
			this.selectorAdded = true
		}
		var crtX = e.clientX;
		var crtY = e.clientY;
		var minDSEX = this.dSEPosition[0];
		var minDSEY = this.dSEPosition[1];
		var maxDSEX = minDSEX + this.dSEDimension.width;
		var maxDSEY = minDSEY + this.dSEDimension.height;
		crtX = Math.max(crtX, minDSEX);
		crtY = Math.max(crtY, minDSEY);
		crtX = Math.min(crtX, maxDSEX);
		crtY = Math.min(crtY, maxDSEY);
		var top, left, width, height;
		left = Math.min(this.originalX, crtX);
		width = Math.abs((this.originalX - crtX));
		top = Math.min(this.originalY, crtY);
		height = Math.abs((this.originalY - crtY));
		this.divSelector.setStyle({
			top: top + 'px',
			left: left + 'px',
			width: width + 'px',
			height: height + 'px'
		});
		var allItems = this.getItems();
		var minX = left;
		var maxX = left + width;
		var minY = top;
		var maxY = top + height;
		for (var i = 0; i < allItems.length; i++) {
			var element = $(allItems[i]);
			var pos = Position.cumulativeOffset(element);
			var dims = Element.getDimensions(element);
			var x1 = pos[0];
			var x2 = pos[0] + dims.width;
			var y1 = pos[1];
			var y2 = pos[1] + dims.height;
			if (((x1 >= minX && x1 <= maxX) || (x2 >= minX && x2 <= maxX) || (minX >= x1 && maxX <= x2)) && ((y1 >= minY && y1 <= maxY) || (y2 >= minY && y2 <= maxY) || (minY >= y1 && maxY <= y2))) {
				this.setItemSelected(allItems[i], true)
			} else {
				if (!e['shiftKey'] && !e['crtlKey']) {
					this.setItemSelected(allItems[i], false)
				}
			}
		}
	},
	dragEnd: function (e) {
		Event.stopObserving(document, "mousemove", this.eventMouseMove);
		Event.stopObserving(document, "mouseup", this.eventMouseUp);
		if (this.selectorAdded) {
			this.body.removeChild(this.divSelector);
			this.selectorAdded = false
		}
		$(this.dragSelectionElement).setStyle({
			cursor: "default"
		})
	},
	setItemSelected: function (oEl, bSelected) {
		if (!this._multiple) {
			if (bSelected) {
				var old = this._selectedItems[0];
				if (oEl == old) return;
				if (old != null) this.setItemSelectedUi(old, false);
				this.setItemSelectedUi(oEl, true);
				this._selectedItems = [oEl];
				this.fireChange()
			} else {
				if (this._selectedItems[0] == oEl) {
					this.setItemSelectedUi(oEl, false);
					this._selectedItems = []
				}
			}
		} else {
			if (Boolean(oEl._selected) == Boolean(bSelected)) return;
			this.setItemSelectedUi(oEl, bSelected);
			if (bSelected) this._selectedItems[this._selectedItems.length] = oEl;
			else {
				var tmp = [];
				var j = 0;
				for (var i = 0; i < this._selectedItems.length; i++) {
					if (this._selectedItems[i] != oEl) tmp[j++] = this._selectedItems[i]
				}
				this._selectedItems = tmp
			}
			this.fireChange()
		}
	},
	setItemSelectedUi: function (oEl, bSelected) {
		if (bSelected) {
			$(oEl).addClassName("selected");
			$(oEl).addClassName("selected-focus");
			var parent = $('selectable_div');
			if ($('table_rows_container')) parent = $('table_rows_container');
			var scrollOffset = oEl.offsetTop;
			if (scrollOffset + $(oEl).getHeight() > (parent.getHeight() + parent.scrollTop)) {
				parent.scrollTop = scrollOffset - parent.getHeight() + $(oEl).getHeight()
			} else if (scrollOffset < (parent.scrollTop)) {
				parent.scrollTop = scrollOffset - $(oEl).getHeight()
			}
		} else {
			$(oEl).removeClassName("selected");
			$(oEl).removeClassName("selected-focus")
		}
		oEl._selected = bSelected
	},
	focus: function () {
		this.hasFocus = true;
		this.selectFirst();
		for (var i = 0; i < this._selectedItems.length; i++) {
			if (this._selectedItems[i]) {
				$(this._selectedItems[i]).addClassName('selected-focus')
			}
		}
	},
	blur: function () {
		this.hasFocus = false;
		for (var i = 0; i < this._selectedItems.length; i++) {
			if (this._selectedItems[i]) {
				$(this._selectedItems[i]).removeClassName('selected-focus')
			}
		}
	},
	selectFirst: function () {
		if (this._selectedItems.length) return;
		if (this.getItem(0) != null) {
			this.setItemSelected(this.getItem(0), true)
		}
	},
	selectAll: function () {
		var items = this.getItems();
		for (var i = 0; i < items.length; i++) {
			this.setItemSelected(items[i], true)
		}
	},
	getItemSelected: function (oEl) {
		return Boolean(oEl._selected)
	},
	fireChange: function () {
		if (!this._fireChange) return;
		if (typeof this.onchange == "string") this.onchange = new Function(this.onchange);
		if (typeof this.onchange == "function") this.onchange()
	},
	fireDblClick: function () {
		if (!this._fireChange) return;
		if (typeof this.ondblclick == "string" && this.ondblclick != "") this.ondblclick = new Funtion(this.ondblclick);
		if (typeof this.ondblclick == "function") this.ondblclick()
	},
	dblClick: function (e) {
		this.fireDblClick()
	},
	click: function (e) {
		if (e.detail && e.detail > 1) {
			this.fireDblClick()
		}
		var oldFireChange = this._fireChange;
		this._fireChange = false;
		var selectedBefore = this.getSelectedItems();
		var el = e.target != null ? e.target: e.srcElement;
		while (el != null && !this.isItem(el)) el = el.parentNode;
		if (el == null) {
			this._fireChange = oldFireChange;
			return
		}
		var rIndex = el;
		var aIndex = this._anchorIndex;
		if (this._selectedItems.length == 0 || (e.ctrlKey && !e.shiftKey && this._multiple)) {
			aIndex = this._anchorIndex = rIndex
		}
		if (!e.ctrlKey && !e.shiftKey || !this._multiple) {
			var items = this._selectedItems;
			for (var i = items.length - 1; i >= 0; i--) {
				if (items[i]._selected && items[i] != el) this.setItemSelectedUi(items[i], false)
			}
			this._anchorIndex = rIndex;
			if (!el._selected) {
				this.setItemSelectedUi(el, true)
			}
			this._selectedItems = [el]
		} else if (this._multiple && e.ctrlKey && !e.shiftKey) {
			this.setItemSelected(el, !el._selected);
			this._anchorIndex = rIndex
		} else if (this._multiple && e.ctrlKey && e.shiftKey) {
			var dirUp = this.isBefore(rIndex, aIndex);
			var item = aIndex;
			while (item != null && item != rIndex) {
				if (!item._selected && item != el) this.setItemSelected(item, true);
				item = dirUp ? this.getPrevious(item) : this.getNext(item)
			}
			if (!el._selected) this.setItemSelected(el, true)
		} else if (this._multiple && !e.ctrlKey && e.shiftKey) {
			var dirUp = this.isBefore(rIndex, aIndex);
			var items = this._selectedItems;
			for (var i = items.length - 1; i >= 0; i--) this.setItemSelectedUi(items[i], false);
			this._selectedItems = [];
			var item = aIndex;
			while (item != null) {
				this.setItemSelected(item, true);
				if (item == rIndex) break;
				item = dirUp ? this.getPrevious(item) : this.getNext(item)
			}
		}
		var found;
		var changed = selectedBefore.length != this._selectedItems.length;
		if (!changed) {
			for (var i = 0; i < selectedBefore.length; i++) {
				found = false;
				for (var j = 0; j < this._selectedItems.length; j++) {
					if (selectedBefore[i] == this._selectedItems[j]) {
						found = true;
						break
					}
				}
				if (!found) {
					changed = true;
					break
				}
			}
		}
		this._fireChange = oldFireChange;
		if (changed && this._fireChange) this.fireChange()
	},
	getSelectedItems: function () {
		var items = this._selectedItems;
		var l = items.length;
		var tmp = new Array(l);
		for (var i = 0; i < l; i++) tmp[i] = items[i];
		return tmp
	},
	isItem: function (node) {
		return node != null && node.nodeType == 1 && node.parentNode == this._htmlElement
	},
	findSelectableParent: function (el, setSelected) {
		while (el != null && !this.isItem(el)) {
			el = el.parentNode
		}
		if (el != null && setSelected) {
			this.setItemSelected(el, true)
		}
		return el
	},
	destroy: function () {
		if (this._htmlElement.removeEventListener) this._htmlElement.removeEventListener("click", this._onclick, false);
		else if (this._htmlElement.detachEvent) this._htmlElement.detachEvent("onclick", this._onclick);
		this._htmlElement = null;
		this._onclick = null;
		this._selectedItems = null
	},
	getNext: function (el) {
		var n = el.nextSibling;
		if (n == null || this.isItem(n)) return n;
		return this.getNext(n)
	},
	getPrevious: function (el) {
		var p = el.previousSibling;
		if (p == null || this.isItem(p)) return p;
		return this.getPrevious(p)
	},
	isBefore: function (n1, n2) {
		var next = this.getNext(n1);
		while (next != null) {
			if (next == n2) return true;
			next = this.getNext(next)
		}
		return false
	},
	getItems: function () {
		var tmp = [];
		var j = 0;
		var cs = this._htmlElement.childNodes;
		var l = cs.length;
		for (var i = 0; i < l; i++) {
			if (cs[i].nodeType == 1) tmp[j++] = cs[i]
		}
		return tmp
	},
	getItem: function (nIndex) {
		var j = 0;
		var cs = this._htmlElement.childNodes;
		var l = cs.length;
		for (var i = 0; i < l; i++) {
			if (cs[i].nodeType == 1) {
				if (j == nIndex) return cs[i];
				j++
			}
		}
		return null
	},
	getSelectedIndexes: function () {
		var items = this.getSelectedItems();
		var l = items.length;
		var tmp = new Array(l);
		for (var i = 0; i < l; i++) tmp[i] = this.getItemIndex(items[i]);
		return tmp
	},
	getItemIndex: function (el) {
		var j = 0;
		var cs = this._htmlElement.childNodes;
		var l = cs.length;
		for (var i = 0; i < l; i++) {
			if (cs[i] == el) return j;
			if (cs[i].nodeType == 1) j++
		}
		return - 1
	}
});
SortableTable = Class.create({
	initialize: function (oTable, oSortTypes, oTHead) {
		this.gecko = Prototype.Browser.Gecko;
		this.msie = Prototype.Browser.IE;
		this.removeBeforeSort = this.gecko;
		this.sortTypes = oSortTypes || [];
		this.sortColumn = null;
		this.descending = null;
		this._headerOnclick = function (e) {
			this.headerOnclick(e)
		}.bind(this);
		if (oTable) {
			this.setTable(oTable, oTHead);
			this.document = oTable.ownerDocument || oTable.document
		} else {
			this.document = document
		}
		var win = this.document.defaultView || this.document.parentWindow;
		this._onunload = function () {
			this.destroy()
		}.bind(this);
		if (win && typeof win.attachEvent != "undefined") {
			win.attachEvent("onunload", this._onunload)
		}
		this.addSortType("Number", Number);
		this.addSortType("CaseInsensitiveString", this.toUpperCase);
		this.addSortType("Date", this.toDate);
		this.addSortType("String")
	},
	onsort: function () {},
	defaultDescending: false,
	_sortTypeInfo: {},
	setTable: function (oTable, oTHead) {
		if (this.tHead) this.uninitHeader();
		this.element = oTable;
		this.setTHead((oTHead ? oTHead: oTable.tHead));
		this.setTBody(oTable.tBodies[0])
	},
	setTHead: function (oTHead) {
		if (this.tHead && this.tHead != oTHead) this.uninitHeader();
		this.tHead = oTHead;
		this.initHeader(this.sortTypes)
	},
	setTBody: function (oTBody) {
		this.tBody = oTBody
	},
	setSortTypes: function (oSortTypes) {
		if (this.tHead) this.uninitHeader();
		this.sortTypes = oSortTypes || [];
		if (this.tHead) this.initHeader(this.sortTypes)
	},
	initHeader: function (oSortTypes) {
		if (!this.tHead) return;
		var cells = this.tHead.rows[0].cells;
		var doc = this.tHead.ownerDocument || this.tHead.document;
		this.sortTypes = oSortTypes || [];
		var l = cells.length;
		var img, c;
		for (var i = 0; i < l; i++) {
			c = cells[i];
			if (this.sortTypes[i] != null && this.sortTypes[i] != "None") {
				img = doc.createElement("div");
				$(img).setStyle({
					cssFloat: 'right',
					marginRight: '5px',
					width: '16px',
					height: '16px'
				});
				$(c).insert({
					"top": img
				});
				$(img).addClassName("sort-arrow");
				if (this.sortTypes[i] != null) c._sortType = this.sortTypes[i];
				if (typeof c.addEventListener != "undefined") c.addEventListener("click", this._headerOnclick, false);
				else if (typeof c.attachEvent != "undefined") c.attachEvent("onclick", this._headerOnclick);
				else c.onclick = this._headerOnclick
			} else {
				c.setAttribute("_sortType", oSortTypes[i]);
				c._sortType = "None"
			}
		}
		this.updateHeaderArrows()
	},
	uninitHeader: function () {
		if (!this.tHead || !this.tHead.rows || !this.tHead.rows[0]) return;
		try {
			var cells = this.tHead.rows[0].cells
		} catch(e) {
			return
		}
		var l = cells.length;
		var c;
		for (var i = 0; i < l; i++) {
			c = cells[i];
			if (c._sortType != null && c._sortType != "None") {
				c.removeChild(c.firstChild);
				if (typeof c.removeEventListener != "undefined") c.removeEventListener("click", this._headerOnclick, false);
				else if (typeof c.detachEvent != "undefined") c.detachEvent("onclick", this._headerOnclick);
				c._sortType = null;
				c.removeAttribute("_sortType")
			}
		}
	},
	updateHeaderArrows: function () {
		if (!this.tHead) return;
		var cells = this.tHead.rows[0].cells;
		var l = cells.length;
		var img;
		for (var i = 0; i < l; i++) {
			if (cells[i]._sortType != null && cells[i]._sortType != "None") {
				img = cells[i].firstChild;
				if (i == this.sortColumn) {
					img.className = "sort-arrow " + (this.descending ? "descending": "ascending");
					$(cells[i]).className = (this.descending ? "desc": "asc")
				} else {
					img.className = "sort-arrow";
					$(cells[i]).className = ""
				}
			}
		}
	},
	headerOnclick: function (e) {
		var el = e.target || e.srcElement;
		while (el.tagName != "TD") el = el.parentNode;
		this.sort(this.msie ? this.getCellIndex(el) : el.cellIndex)
	},
	getCellIndex: function (oTd) {
		var cells = oTd.parentNode.childNodes;
		var l = cells.length;
		var i;
		for (i = 0; cells[i] != oTd && i < l; i++);
		return i
	},
	getSortType: function (nColumn) {
		return this.sortTypes[nColumn] || "String"
	},
	sort: function (nColumn, bDescending, sSortType) {
		if (!this.tBody) return;
		if (sSortType == null) sSortType = this.getSortType(nColumn);
		if (sSortType == "None") return;
		if (bDescending == null) {
			if (this.sortColumn != nColumn) this.descending = this.defaultDescending;
			else this.descending = !this.descending
		} else this.descending = bDescending;
		this.sortColumn = nColumn;
		if (typeof this.onbeforesort == "function") this.onbeforesort();
		var f = this.getSortFunction(sSortType, nColumn);
		var a = this.getCache(sSortType, nColumn);
		var tBody = this.tBody;
		a.sort(f);
		if (this.descending) a.reverse();
		if (this.removeBeforeSort) {
			var nextSibling = tBody.nextSibling;
			var p = tBody.parentNode;
			p.removeChild(tBody)
		}
		var l = a.length;
		for (var i = 0; i < l; i++) tBody.appendChild(a[i].element);
		if (this.removeBeforeSort) {
			p.insertBefore(tBody, nextSibling)
		}
		this.updateHeaderArrows();
		this.destroyCache(a);
		if (typeof this.onsort == "function") {
			this.onsort()
		}
	},
	asyncSort: function (nColumn, bDescending, sSortType) {
		var oThis = this;
		this._asyncsort = function () {
			oThis.sort(nColumn, bDescending, sSortType)
		};
		window.setTimeout(this._asyncsort, 1)
	},
	getCache: function (sType, nColumn) {
		if (!this.tBody) return [];
		var rows = this.tBody.rows;
		var l = rows.length;
		var a = new Array(l);
		var r;
		for (var i = 0; i < l; i++) {
			r = rows[i];
			a[i] = {
				value: this.getRowValue(r, sType, nColumn),
				element: r
			}
		};
		return a
	},
	destroyCache: function (oArray) {
		var l = oArray.length;
		for (var i = 0; i < l; i++) {
			oArray[i].value = null;
			oArray[i].element = null;
			oArray[i] = null
		}
	},
	getRowValue: function (oRow, sType, nColumn) {
		if (this._sortTypeInfo[sType] && this._sortTypeInfo[sType].getRowValue) return this._sortTypeInfo[sType].getRowValue(oRow, nColumn);
		var s;
		var c = oRow.cells[nColumn];
		if (typeof c.innerText != "undefined") s = c.innerText;
		else s = this.getInnerText(c);
		return this.getValueFromString(s, sType)
	},
	getInnerText: function (oNode) {
		var s = "";
		var cs = oNode.childNodes;
		var l = cs.length;
		for (var i = 0; i < l; i++) {
			switch (cs[i].nodeType) {
			case 1:
				s += this.getInnerText(cs[i]);
				break;
			case 3:
				s += cs[i].nodeValue;
				break
			}
		}
		return s
	},
	getValueFromString: function (sText, sType) {
		if (this._sortTypeInfo[sType]) return this._sortTypeInfo[sType].getValueFromString(sText);
		return sText
	},
	getSortFunction: function (sType, nColumn) {
		if (this._sortTypeInfo[sType]) return this._sortTypeInfo[sType].compare;
		return this.basicCompare
	},
	destroy: function () {
		this.uninitHeader();
		var win = this.document.parentWindow;
		if (win && typeof win.detachEvent != "undefined") {
			win.detachEvent("onunload", this._onunload)
		}
		this._onunload = null;
		this.element = null;
		this.tHead = null;
		this.tBody = null;
		this.document = null;
		this._headerOnclick = null;
		this.sortTypes = null;
		this._asyncsort = null;
		this.onsort = null
	},
	addSortType: function (sType, fGetValueFromString, fCompareFunction, fGetRowValue) {
		this._sortTypeInfo[sType] = {
			type: sType,
			getValueFromString: fGetValueFromString || this.idFunction,
			compare: fCompareFunction || this.basicCompare,
			getRowValue: fGetRowValue
		}
	},
	removeSortType: function (sType) {
		delete this._sortTypeInfo[sType]
	},
	basicCompare: function compare(n1, n2) {
		if (n1.value < n2.value) return - 1;
		if (n2.value < n1.value) return 1;
		return 0
	},
	idFunction: function (x) {
		return x
	},
	toUpperCase: function (s) {
		return s.toUpperCase()
	},
	toDate: function (s) {
		var parts = s.split("-");
		var d = new Date(0);
		d.setFullYear(parts[0]);
		d.setDate(parts[2]);
		d.setMonth(parts[1] - 1);
		return d.valueOf()
	}
});
if (Object.isUndefined(Proto)) {
	var Proto = {}
}
Proto.Menu = Class.create({
	initialize: function () {
		var e = Prototype.emptyFunction;
		this.ie = Prototype.Browser.IE;
		this.options = Object.extend({
			selector: '.contextmenu',
			className: 'protoMenu',
			mouseClick: 'right',
			anchor: 'mouse',
			pageOffset: 25,
			topOffset: 0,
			leftOffset: 0,
			menuTitle: '',
			fade: false,
			zIndex: 100,
			createAnchor: false,
			anchorContainer: null,
			anchorSrc: '',
			anchorTitle: '',
			anchorPosition: 'last',
			beforeShow: e,
			beforeHide: e,
			beforeSelect: e,
			shadowOptions: {
				distance: 4,
				angle: 130,
				opacity: 0.3,
				nestedShadows: 3,
				color: '#000000'
			}
		},
		arguments[0] || {});
		this.shim = new Element('iframe', {
			style: 'position:absolute;filter:progid:DXImageTransform.Microsoft.Alpha(opacity=0);display:none',
			src: 'javascript:false;',
			frameborder: 0
		});
		if (this.options.createAnchor) {
			this.createAnchor()
		} else if (this.options.anchor != 'mouse') {
			this.options.selector = '[id="' + this.options.anchor + '"]'
		}
		this.eventToObserve = ((this.options.mouseClick != 'right' || Prototype.Browser.Opera) ? 'click': 'contextmenu');
		this.options.fade = this.options.fade && !Object.isUndefined(Effect);
		this.container = new Element('div', {
			className: this.options.className,
			style: 'display:none'
		});
		if (this.options.mouseClick == 'right') {
			$(document.body).observe('contextmenu', function (e) {
				Event.stop(e)
			});
			$(document.body).insert(this.container.observe('contextmenu', Event.stop))
		} else {
			$(document.body).insert(this.container)
		}
		if (this.ie) {
			$(document.body).insert(this.shim)
		}
		document.observe('click', function (e) {
			if (this.container.visible() && !e.isRightClick()) {
				this.options.beforeHide(e);
				if (this.ie) this.shim.hide();
				Shadower.deshadow(this.container);
				this.container.setStyle({
					height: 'auto',
					overflowY: 'hidden'
				});
				this.container.hide()
			}
		}.bind(this));
		$$(this.options.selector).invoke('observe', this.eventToObserve, this.observerFunction.bind(this))
	},
	observerFunction: function (e) {
		if (this.options.mouseClick == 'right' && Prototype.Browser.Opera && !e.ctrlKey) return;
		this.show(e)
	},
	removeElements: function (selector) {
		$$(selector).invoke('stopObserving', this.eventToObserve, this.observerFunction.bind(this))
	},
	addElements: function (selectorOrObject) {
		if (typeof(selectorOrObject) == "string") {
			$$(selectorOrObject).invoke('observe', this.eventToObserve, this.observerFunction.bind(this))
		} else {
			$(selectorOrObject).observe(this.eventToObserve, this.observerFunction.bind(this))
		}
	},
	refreshList: function () {
		if (this.container.select('ul').length) this.container.select('ul')[0].remove();
		var list = new Element('ul');
		if (this.options.menuTitle != '') {
			var text = this.options.menuTitle;
			list.insert(new Element('li', {
				text: text,
				className: 'menuTitle'
			}).update(text))
		}
		this.options.menuItems.each(function (item) {
			var newItem = new Element('li', {
				className: item.separator ? 'separator': ''
			});
			if (item.moreActions) {
				var actionsContainer = new Element('div', {
					className: 'menuActions'
				});
				item.moreActions.each(function (action) {
					actionsContainer.insert(new Element('a', {
						title: action.name,
						href: '#'
					}).writeAttribute('onclick', 'return false;').observe('click', action.callback).insert('<img src="' + action.image + '" width="16" height="16" border="0">'))
				});
				newItem.insert(actionsContainer)
			}
			newItem.insert(item.separator ? '': Object.extend(new Element('a', {
				href: '#',
				title: item.alt,
				className: (item.className || '') + (item.disabled ? ' disabled': ' enabled'),
				style: (item.isDefault ? 'font-weight:bold': '')
			}), {
				_callback: item.callback
			}).writeAttribute('onclick', 'return false;').observe('click', this.onClick.bind(this)).observe('contextmenu', Event.stop).update('<img src="' + item.image + '" border="0" height="16" width="16" align="absmiddle"> ' + item.name));
			list.insert(newItem)
		}.bind(this));
		this.container.insert(list);
		try {
			Shadower.shadow(this.container, this.options.shadowOptions, true)
		} catch(e) {}
	},
	show: function (e) {
		this.options.beforeShow(e);
		this.refreshList();
		if (!this.options.menuItems.length) return;
		var elOff = {};
		var elDim = this.container.getDimensions();
		if (this.options.anchor == 'mouse') {
			elOff = this.computeMouseOffset(e)
		} else {
			elOff = this.computeAnchorOffset()
		}
		this.container.setStyle(elOff);
		this.container.setStyle({
			zIndex: this.options.zIndex
		});
		if (this.ie) {
			this.shim.setStyle(Object.extend(Object.extend(elDim, elOff), {
				zIndex: this.options.zIndex - 1
			})).show()
		}
		if (this.options.fade) {
			Effect.Appear(this.container, {
				duration: 0.25,
				afterFinish: function (e) {
					this.checkHeight(elOff.top);
					Shadower.showShadows(this.container, this.options.shadowOptions)
				}.bind(this)
			})
		} else {
			this.container.show();
			this.checkHeight(elOff.top);
			Shadower.showShadows(this.container, this.options.shadowOptions)
		}
		this.event = e
	},
	checkHeight: function (offsetTop) {
		if (this.options.anchor == 'mouse') return;
		var vpHeight = getViewPortHeight();
		var vpOff = document.viewport.getScrollOffsets();
		var elDim = this.container.getDimensions();
		var y = parseInt(offsetTop);
		if ((y - vpOff.top + elDim.height) > vpHeight) {
			this.container.setStyle({
				height: (vpHeight - (y - vpOff.top)) + 'px',
				overflowY: 'scroll'
			});
			if (!this.containerShrinked) this.container.setStyle({
				width: elDim.width + 16 + 'px'
			});
			this.containerShrinked = true
		} else {
			this.container.setStyle({
				height: 'auto',
				overflowY: 'hidden'
			})
		}
	},
	computeMouseOffset: function (e) {
		var x = Event.pointer(e).x,
		y = Event.pointer(e).y,
		vpDim = document.viewport.getDimensions(),
		vpOff = document.viewport.getScrollOffsets(),
		elDim = this.container.getDimensions(),
		elOff = {
			left: ((x + elDim.width + this.options.pageOffset) > vpDim.width ? (vpDim.width - elDim.width - this.options.pageOffset) : x) + 'px',
			top: ((y - vpOff.top + elDim.height) > vpDim.height && (y - vpOff.top) > elDim.height ? (y - elDim.height) : y) + 'px'
		};
		return elOff
	},
	computeAnchorOffset: function () {
		if (this.anchorOffset) return this.anchorOffset;
		var anchorPosition = Position.cumulativeOffset($(this.options.anchor));
		var topPos = anchorPosition[1] + $(this.options.anchor).getHeight() + this.options.topOffset;
		var leftPos = anchorPosition[0] + this.options.leftOffset;
		this.anchorOffset = {
			top: topPos + 'px',
			left: leftPos + 'px'
		};
		return this.anchorOffset
	},
	createAnchor: function () {
		if (!this.options.createAnchor || this.options.anchor == 'mouse') return;
		this.options.anchor = new Element('img', {
			id: this.options.anchor,
			src: this.options.anchorSrc,
			alt: this.options.anchorTitle,
			align: 'absmiddle'
		}).setStyle({
			cursor: 'pointer'
		});
		this.options.anchorContainer.appendChild(this.options.anchor);
		this.options.selector = '[id="' + this.options.anchor.id + '"]'
	},
	onClick: function (e) {
		if (e.target._callback && !e.target.hasClassName('disabled')) {
			this.options.beforeSelect(e);
			if (this.ie) this.shim.hide();
			Shadower.deshadow(this.container);
			this.container.hide();
			e.target._callback(this.event)
		}
	}
});
Splitter = Class.create({
	initialize: function (container, options) {
		this.options = Object.extend({
			direction: 'vertical',
			activeClass: 'active',
			onDrag: Prototype.EmptyFunction,
			endDrag: Prototype.EmptyFunction,
			startDrag: Prototype.EmptyFunction
		},
		arguments[1] || {});
		var verticalOpts = {
			cursor: 'e-resize',
			splitbarClass: 'vsplitbar',
			eventPointer: Event.pointerX,
			set: 'left',
			adjust: 'width',
			getAdjust: this.getWidth,
			offsetAdjust: 'offsetWidth',
			adjSide1: 'Left',
			adjSide2: 'Right',
			fixed: 'height',
			getFixed: this.getHeight,
			offsetFixed: 'offsetHeight',
			fixSide1: 'Top',
			fixSide2: 'Bottom'
		};
		var horizontalOpts = {
			cursor: 'n-resize',
			splitbarClass: 'hsplitbar',
			eventPointer: Event.pointerY,
			set: 'top',
			adjust: 'height',
			getAdjust: this.getHeight,
			offsetAdjust: 'offsetHeight',
			adjSide1: 'Top',
			adjSide2: 'Bottom',
			fixed: 'width',
			getFixed: this.getWidth,
			offsetFixed: 'offsetWidth',
			fixSide1: 'Left',
			fixSide2: 'Right'
		};
		if (this.options.direction == 'vertical') Object.extend(this.options, verticalOpts);
		else Object.extend(this.options, horizontalOpts);
		this.group = $(container).setStyle({
			position: 'relative'
		});
		var divs = this.group.childElements();
		divs.each(function (div) {
			div.setStyle({
				position: 'absolute',
				margin: 0
			})
		});
		this.paneA = divs[0];
		this.paneB = divs[1];
		this.initBorderB = parseInt(this.paneB.getStyle('borderWidth')) || 0;
		this.splitbar = new Element('div', {
			unselectable: 'on'
		});
		this.splitbar.addClassName(this.options.splitbarClass).setStyle({
			position: 'absolute',
			cursor: this.options.cursor,
			fontSize: '1px'
		});
		this.paneA.insert({
			after: this.splitbar
		});
		this.splitbar.observe("mousedown", this.startSplit.bind(this));
		this.splitbar.observe("mouseup", this.endSplit.bind(this));
		this.initCaches();
		this.paneA._init = (this.options.initA == true ? parseInt(this.options.getAdjust(this.paneA)) : this.options.initA) || 0;
		this.paneB._init = (this.options.initB == true ? parseInt(this.options.getAdjust(this.paneB)) : this.options.initB) || 0;
		if (this.paneB._init) {
			this.paneB.setStyle(this.makeStyleObject(this.options.adjust, this.paneB._init))
		}
		if (this.paneA._init) {
			this.paneA.setStyle(this.makeStyleObject(this.options.adjust, this.paneA._init))
		}
		Event.observe(window, "resize", function (e) {
			this.resizeGroup(e, null, true)
		}.bind(this));
		this.resizeGroup(null, this.paneB._init || this.paneA._init || Math.round((this.group[this.options.offsetAdjust] - this.group._borderAdjust - this.splitbar._adjust) / 2))
	},
	resizeGroup: function (event, size, keepPercents) {
		var groupInitAdjust = this.group._adjust;
		this.group._fixed = this.options.getFixed(this.group) - this.group._borderFixed;
		this.group._adjust = this.group[this.options.offsetAdjust] - this.group._borderAdjust;
		if (this.group._fixed <= 0 || this.group._adjust <= 0) return;
		var optName = this.options.fixed;
		this.paneA.setStyle(this.makeStyleObject(optName, this.group._fixed - this.paneA._padFixed + 'px'));
		var borderAdj = (!Prototype.Browser.IE ? (this.initBorderB * 2) : 0);
		this.paneB.setStyle(this.makeStyleObject(optName, this.group._fixed - this.paneB._padFixed - borderAdj + 'px'));
		this.splitbar.setStyle(this.makeStyleObject(optName, this.group._fixed + 'px'));
		if (keepPercents && !size && groupInitAdjust) {
			size = parseInt(this.paneA[this.options.offsetAdjust] * this.group._adjust / groupInitAdjust)
		} else {
			size = size || (!this.options.initB ? this.paneA[this.options.offsetAdjust] : this.group._adjust - this.paneB[this.options.offsetAdjust] - this.splitbar._adjust)
		}
		this.moveSplitter(size)
	},
	startSplit: function (event) {
		this.splitbar.addClassName(this.options.activeClass);
		this.paneA._posAdjust = this.paneA[this.options.offsetAdjust] - this.options.eventPointer(event);
		if (!this.moveObserver) {
			this.moveObserver = this.doSplitMouse.bind(this);
			this.upObserver = this.endSplit.bind(this)
		}
		Event.observe(this.group, "mousemove", this.moveObserver);
		Event.observe(this.group, "mouseup", this.upObserver);
		if (this.options.startDrag) {
			this.options.startDrag(this.getCurrentSize())
		}
	},
	doSplitMouse: function (event) {
		if (!this.splitbar.hasClassName(this.options.activeClass)) {
			return this.endSplit(event)
		}
		this.moveSplitter(this.paneA._posAdjust + this.options.eventPointer(event))
	},
	endSplit: function (event) {
		if (!this.splitbar.hasClassName(this.options.activeClass)) {
			return
		}
		this.splitbar.removeClassName(this.options.activeClass);
		if (this.moveObserver) {
			Event.stopObserving(this.group, "mousemove", this.moveObserver);
			Event.stopObserving(this.group, "mouseup", this.upObserver);
			this.moveObserver = 0;
			this.upObserver = 0
		}
		if (this.options.endDrag) {
			this.options.endDrag(this.getCurrentSize())
		}
	},
	moveSplitter: function (np) {
		np = Math.max(this.paneA._min + this.paneA._padAdjust, this.group._adjust - (this.paneB._max || 9999), 16, Math.min(np, this.paneA._max || 9999, this.group._adjust - this.splitbar._adjust - Math.max(this.paneB._min + this.paneB._padAdjust, 16)));
		var optNameSet = this.options.set;
		var optNameAdjust = this.options.adjust;
		this.splitbar.setStyle(this.makeStyleObject(this.options.set, np + 'px'));
		this.paneA.setStyle(this.makeStyleObject(this.options.adjust, np - this.paneA._padAdjust + 'px'));
		this.paneB.setStyle(this.makeStyleObject(this.options.set, np + this.splitbar._adjust + 'px'));
		var borderAdj = 0;
		if (!Prototype.Browser.IE && this.initBorderB) {
			borderAdj = this.initBorderB * 2
		}
		this.paneB.setStyle(this.makeStyleObject(this.options.adjust, this.group._adjust - this.splitbar._adjust - this.paneB._padAdjust - np - borderAdj + "px"));
		if (!Prototype.Browser.IE) {
			this.paneA.fire("resize");
			this.paneB.fire("resize")
		}
		if (this.options.onDrag) this.options.onDrag()
	},
	cssCache: function (jq, n, pf, m1, m2) {
		var boxModel = (!Prototype.Browser.IE || document.compatMode == "CSS1Compat");
		jq[n] = boxModel ? (parseInt(jq.getStyle(pf + m1)) || 0) + (parseInt(jq.getStyle(pf + m2)) || 0) : 0
	},
	optCache: function (jq, pane) {
		jq._min = Math.max(0, this.options["min" + pane] || parseInt(jq.getStyle("min-" + this.options.adjust)) || 0);
		jq._max = Math.max(0, this.options["max" + pane] || parseInt(jq.getStyle("max-" + this.options.adjust)) || 0)
	},
	initCaches: function () {
		this.splitbar._adjust = this.splitbar[this.options.offsetAdjust];
		this.cssCache(this.group, "_borderAdjust", "border", this.options.adjSide1, this.options.adjSide2);
		this.cssCache(this.group, "_borderFixed", "border", this.options.fixSide1, this.options.fixSide2);
		this.cssCache(this.paneA, "_padAdjust", "padding", this.options.adjSide1, this.options.adjSide2);
		this.cssCache(this.paneA, "_padFixed", "padding", this.options.fixSide1, this.options.fixSide2);
		this.cssCache(this.paneB, "_padAdjust", "padding", this.options.adjSide1, this.options.adjSide2);
		this.cssCache(this.paneB, "_padFixed", "padding", this.options.fixSide1, this.options.fixSide2);
		this.optCache(this.paneA, 'A');
		this.optCache(this.paneB, 'B')
	},
	getWidth: function (el) {
		return el.offsetWidth
	},
	getHeight: function (el) {
		if (el.offsetHeight) {
			return parseInt(el.offsetHeight)
		} else {
			var h = el.getHeight();
			if (!h) {
				h = $(el.parentNode).getHeight();
				if (!Prototype.Browser.IE) h -= parseInt($(el.parentNode).paddingHeight * 2)
			}
			return h
		}
	},
	makeStyleObject: function (propStringName, propValue) {
		var sObject = {};
		sObject[propStringName] = propValue;
		return sObject
	},
	getCurrentSize: function () {
		return this.options.getAdjust(this.paneA)
	}
});
Proto.History = Class.create({
	historyCurrentHash: undefined,
	historyCallback: undefined,
	initialize: function (callback) {
		this.historyCallback = callback;
		var current_hash = location.hash;
		this.historyCurrentHash = current_hash;
		if (Prototype.Browser.IE) {
			if (this.historyCurrentHash == '') {
				this.historyCurrentHash = '#'
			}
			bod = document.getElementsByTagName('body')[0];
			var iframe = new Element('iframe');
			iframe.writeAttribute('id', 'prototype_history').writeAttribute("style", "display:none;");
			bod.appendChild(iframe);
			iframe = $("prototype_history").contentWindow.document;
			iframe.open();
			iframe.close();
			iframe.location.hash = current_hash
		} else if (Prototype.Browser.WebKit) {
			this.historyBackStack = [];
			this.historyBackStack.length = history.length;
			this.historyForwardStack = [];
			this.isFirst = true
		}
		new PeriodicalExecuter(function () {
			this.historyCheck()
		}.bind(this), 0.2)
	},
	historyAddHistory: function (hash) {
		this.historyBackStack.push(hash);
		this.historyForwardStack.length = 0;
		this.isFirst = true
	},
	historyCheck: function () {
		if (Prototype.Browser.IE) {
			var iframe = $('prototype_history').contentDocument || $('prototype_history').contentWindow.document;
			var current_hash = iframe.location.hash;
			if (current_hash != this.historyCurrentHash) {
				location.hash = current_hash;
				this.historyCurrentHash = current_hash;
				this.historyCallback(current_hash.replace(/^#/, ''))
			}
		} else if (Prototype.Browser.WebKit) {
			if (!this.dontCheck) {
				var historyDelta = history.length - this.historyBackStack.length;
				if (historyDelta) {
					this.isFirst = false;
					if (historyDelta < 0) {
						for (var i = 0; i < Math.abs(historyDelta); i++) this.historyForwardStack.unshift(this.historyBackStack.pop())
					} else {
						for (var i = 0; i < historyDelta; i++) this.historyBackStack.push(this.historyForwardStack.shift())
					}
					var cachedHash = this.historyBackStack[this.historyBackStack.length - 1];
					if (cachedHash != undefined) {
						this.historyCurrentHash = location.hash;
						this.historyCallback(cachedHash)
					}
				} else if (this.historyBackStack[this.historyBackStack.length - 1] == undefined && !this.isFirst) {
					if (document.URL.indexOf('#') >= 0) {
						this.historyCallback(document.URL.split('#')[1])
					} else {
						var current_hash = location.hash;
						this.historyCallback('')
					}
					this.isFirst = true
				}
			}
		} else {
			var current_hash = location.hash;
			if (current_hash != this.historyCurrentHash) {
				this.historyCurrentHash = current_hash;
				this.historyCallback(current_hash.replace(/^#/, ''))
			}
		}
	},
	historyLoad: function (hash) {
		var newhash;
		if (Prototype.Browser.WebKit) {
			newhash = hash
		} else {
			newhash = '#' + hash;
			location.hash = newhash
		}
		this.historyCurrentHash = newhash;
		if (Prototype.Browser.IE) {
			var iframe = $("prototype_history").contentWindow.document;
			iframe.open();
			iframe.close();
			iframe.location.hash = newhash
		} else if (Prototype.Browser.WebKit) {
			this.dontCheck = true;
			this.historyAddHistory(hash);
			var fn = function () {
				this.dontCheck = false
			}.bind(this);
			window.setTimeout(fn, 200);
			location.hash = newhash
		} else {}
	}
});
var CookieJar = Class.create();
CookieJar.prototype = {
	appendString: "__CJ_",
	initialize: function (options) {
		this.options = {
			expires: 3600,
			path: '',
			domain: '',
			secure: ''
		};
		Object.extend(this.options, options || {});
		if (this.options.expires != '') {
			var date = new Date();
			date = new Date(date.getTime() + (this.options.expires * 1000));
			this.options.expires = '; expires=' + date.toGMTString()
		}
		if (this.options.path != '') {
			this.options.path = '; path=' + escape(this.options.path)
		}
		if (this.options.domain != '') {
			this.options.domain = '; domain=' + escape(this.options.domain)
		}
		if (this.options.secure == 'secure') {
			this.options.secure = '; secure'
		} else {
			this.options.secure = ''
		}
	},
	put: function (name, value) {
		name = this.appendString + name;
		cookie = this.options;
		var type = typeof value;
		switch (type) {
		case 'undefined':
		case 'function':
		case 'unknown':
			return false;
		case 'boolean':
		case 'string':
		case 'number':
			value = String(value.toString())
		}
		var cookie_str = name + "=" + escape(Object.toJSON(value));
		try {
			document.cookie = cookie_str + cookie.expires + cookie.path + cookie.domain + cookie.secure
		} catch(e) {
			return false
		}
		return true
	},
	remove: function (name) {
		name = this.appendString + name;
		cookie = this.options;
		try {
			var date = new Date();
			date.setTime(date.getTime() - (3600 * 1000));
			var expires = '; expires=' + date.toGMTString();
			document.cookie = name + "=" + expires + cookie.path + cookie.domain + cookie.secure
		} catch(e) {
			return false
		}
		return true
	},
	get: function (name) {
		name = this.appendString + name;
		var cookies = document.cookie.match(name + '=(.*?)(;|$)');
		if (cookies) {
			return (unescape(cookies[1])).evalJSON()
		} else {
			return null
		}
	},
	empty: function () {
		keys = this.getKeys();
		size = keys.size();
		for (i = 0; i < size; i++) {
			this.remove(keys[i])
		}
	},
	getPack: function () {
		pack = {};
		keys = this.getKeys();
		size = keys.size();
		for (i = 0; i < size; i++) {
			pack[keys[i]] = this.get(keys[i])
		}
		return pack
	},
	getKeys: function () {
		keys = $A();
		keyRe = /[^=; ]+(?=\=)/g;
		str = document.cookie;
		CJRe = new RegExp("^" + this.appendString);
		while ((match = keyRe.exec(str)) != undefined) {
			if (CJRe.test(match[0].strip())) {
				keys.push(match[0].strip().gsub("^" + this.appendString, ""))
			}
		}
		return keys
	}
};
var detect = navigator.userAgent.toLowerCase();
var OS, browser, version, total, thestring;
var currentLightBox, currentDraggable;
function getBrowserInfo() {
	if (checkIt('konqueror')) {
		browser = "Konqueror";
		OS = "Linux"
	} else if (checkIt('safari')) browser = "Safari";
	else if (checkIt('omniweb')) browser = "OmniWeb";
	else if (checkIt('opera')) browser = "Opera";
	else if (checkIt('webtv')) browser = "WebTV";
	else if (checkIt('icab')) browser = "iCab";
	else if (checkIt('msie')) browser = "Internet Explorer";
	else if (!checkIt('compatible')) {
		browser = "Netscape Navigator";
		version = detect.charAt(8)
	} else browser = "An unknown browser";
	if (!version) version = detect.charAt(place + thestring.length);
	if (!OS) {
		if (checkIt('linux')) OS = "Linux";
		else if (checkIt('x11')) OS = "Unix";
		else if (checkIt('mac')) OS = "Mac";
		else if (checkIt('win')) OS = "Windows";
		else OS = "an unknown operating system"
	}
}
function checkIt(string) {
	place = detect.indexOf(string) + 1;
	thestring = string;
	return place
}
Event.observe(window, 'load', initialize, false);
Event.observe(window, 'load', getBrowserInfo, false);
Event.observe(window, 'unload', Event.unloadCache, false);
var lightbox = Class.create();
lightbox.prototype = {
	yPos: 0,
	xPos: 0,
	initialize: function (id) {
		this.content = id
	},
	activate: function () {
		if (browser == 'Internet Explorer') {
			this.getScroll();
			this.setScroll(0, 0)
		}
		this.displayLightbox("block")
	},
	prepareIE: function (height, overflow) {
		bod = document.getElementsByTagName('body')[0];
		bod.style.overflow = overflow;
		bod.style.height = height;
		htm = document.getElementsByTagName('html')[0];
		htm.style.overflow = overflow;
		htm.style.height = height
	},
	hideSelects: function (visibility) {
		selects = document.getElementsByTagName('select');
		for (i = 0; i < selects.length; i++) {
			selects[i].style.visibility = visibility
		}
	},
	getScroll: function () {
		if (self.pageYOffset) {
			this.yPos = self.pageYOffset
		} else if (document.documentElement && document.documentElement.scrollTop) {
			this.yPos = document.documentElement.scrollTop
		} else if (document.body) {
			this.yPos = document.body.scrollTop
		}
	},
	setScroll: function (x, y) {
		window.scrollTo(x, y)
	},
	displayLightbox: function (display) {
		if (display == 'none') {
			$('overlay').fade({
				duration: 0.5
			})
		} else {
			$('overlay').style.display = display
		}
		if (this.content != null) {
			$(this.content).style.display = display;
			currentDraggable = new Draggable(this.content, {
				handle: "dialogTitle",
				zindex: 1050,
				starteffect: function (element) {
					if (element.shadows) {
						Shadower.deshadow(element);
						element.hadShadow = true
					}
				},
				endeffect: function (element) {
					if (element.hadShadow) {
						Shadower.shadow(element, {
							distance: 4,
							angle: 130,
							opacity: 0.5,
							nestedShadows: 3,
							color: '#000000',
							shadowStyle: {
								display: 'block'
							}
						})
					}
				}
			})
		}
	},
	actions: function () {
		lbActions = document.getElementsByClassName('lbAction');
		for (i = 0; i < lbActions.length; i++) {
			Event.observe(lbActions[i], 'click', this[lbActions[i].rel].bindAsEventListener(this), false);
			lbActions[i].onclick = function () {
				return false
			}
		}
	},
	deactivate: function () {
		if (browser == "Internet Explorer") {
			this.setScroll(0, this.yPos)
		}
		this.displayLightbox("none")
	}
};
function initialize() {
	addLightboxMarkup();
	Event.observe(document, "keydown", function (e) {
		if (e == null) e = window.event;
		if (e.keyCode == 27) {
			ajaxplorer.cancelCopyOrMove();
			hideLightBox()
		}
		if (e.keyCode == 9) return false;
		return true
	})
}
function displayLightBoxById(id) {
	valid = new lightbox(id);
	valid.activate();
	currentLightBox = valid;
	if (id != 'copymove_div') {}
}
function hideLightBox(onFormSubmit) {
	if (currentLightBox) {
		currentLightBox.deactivate();
		hideOverlay();
		if (!onFormSubmit) {
			currentLightBox = null
		}
		ajaxplorer.getActionBar().fireContextChange();
		ajaxplorer.getActionBar().fireSelectionChange();
		ajaxplorer.getFilesList().focus();
		ajaxplorer.enableNavigation();
		ajaxplorer.focusOn(ajaxplorer.filesList);
		ajaxplorer.enableShortcuts()
	}
	if (currentDraggable) currentDraggable.destroy();
	if (modal.closeFunction) {
		modal.closeFunction();
		modal.closeFunction = null
	}
	Shadower.deshadow($(modal.elementName))
}
function setOverlay() {
	currentLightBox = new lightbox(null);
	currentLightBox.activate()
}
function hideOverlay() {
	if (currentLightBox) {
		currentLightBox.deactivate();
		currentLightBox = null
	}
}
function addLightboxMarkup() {
	bod = document.getElementsByTagName('body')[0];
	overlay = document.createElement('div');
	overlay.id = 'overlay';
	bod.appendChild(overlay)
}
function addLightboxMarkupToElement(element, skipElement) {
	overlay = document.createElement('div');
	overlay.id = 'element_overlay';
	if (Prototype.Browser.IE) {
		var position = Position.positionedOffset($(element));
		overlay.style.top = position[1];
		overlay.style.left = 0
	} else {
		var position = Position.cumulativeOffset($(element));
		overlay.style.top = position[1];
		overlay.style.left = position[0]
	}
	overlay.style.width = element.getWidth();
	overlay.style.height = element.getHeight();
	if (skipElement) {
		var addTop = parseInt(overlay.style.top) + parseInt(skipElement.getHeight());
		var addHeight = parseInt(overlay.style.height) + parseInt(skipElement.getHeight());
		overlay.style.top = addTop + 'px';
		overlay.style.height = addHeight + 'px'
	}
	element.appendChild(overlay)
}
function removeLightboxFromElement(element) {
	var tmp = $(element).select('#element_overlay');
	if (tmp.length) {
		tmp[0].remove()
	}
}
var Builder = {
	NODEMAP: {
		AREA: 'map',
		CAPTION: 'table',
		COL: 'table',
		COLGROUP: 'table',
		LEGEND: 'fieldset',
		OPTGROUP: 'select',
		OPTION: 'select',
		PARAM: 'object',
		TBODY: 'table',
		TD: 'table',
		TFOOT: 'table',
		TH: 'table',
		THEAD: 'table',
		TR: 'table'
	},
	node: function (elementName) {
		elementName = elementName.toUpperCase();
		var parentTag = this.NODEMAP[elementName] || 'div';
		var parentElement = document.createElement(parentTag);
		try {
			parentElement.innerHTML = "<" + elementName + "></" + elementName + ">"
		} catch(e) {}
		var element = parentElement.firstChild || null;
		if (element && (element.tagName.toUpperCase() != elementName)) element = element.getElementsByTagName(elementName)[0];
		if (!element) element = document.createElement(elementName);
		if (!element) return;
		if (arguments[1]) if (this._isStringOrNumber(arguments[1]) || (arguments[1] instanceof Array) || arguments[1].tagName) {
			this._children(element, arguments[1])
		} else {
			var attrs = this._attributes(arguments[1]);
			if (attrs.length) {
				try {
					parentElement.innerHTML = "<" + elementName + " " + attrs + "></" + elementName + ">"
				} catch(e) {}
				element = parentElement.firstChild || null;
				if (!element) {
					element = document.createElement(elementName);
					for (attr in arguments[1]) element[attr == 'class' ? 'className': attr] = arguments[1][attr]
				}
				if (element.tagName.toUpperCase() != elementName) element = parentElement.getElementsByTagName(elementName)[0]
			}
		}
		if (arguments[2]) this._children(element, arguments[2]);
		return element
	},
	_text: function (text) {
		return document.createTextNode(text)
	},
	ATTR_MAP: {
		'className': 'class',
		'htmlFor': 'for'
	},
	_attributes: function (attributes) {
		var attrs = [];
		for (attribute in attributes) attrs.push((attribute in this.ATTR_MAP ? this.ATTR_MAP[attribute] : attribute) + '="' + attributes[attribute].toString().escapeHTML().gsub(/"/, '&quot;') + '"');
		return attrs.join(" ")
	},
	_children: function (element, children) {
		if (children.tagName) {
			element.appendChild(children);
			return
		}
		if (typeof children == 'object') {
			children.flatten().each(function (e) {
				if (typeof e == 'object') element.appendChild(e);
				else if (Builder._isStringOrNumber(e)) element.appendChild(Builder._text(e))
			})
		} else if (Builder._isStringOrNumber(children)) element.appendChild(Builder._text(children))
	},
	_isStringOrNumber: function (param) {
		return (typeof param == 'string' || typeof param == 'number')
	},
	build: function (html) {
		var element = this.node('div');
		$(element).update(html.strip());
		return element.down()
	},
	dump: function (scope) {
		if (typeof scope != 'object' && typeof scope != 'function') scope = window;
		var tags = ("A ABBR ACRONYM ADDRESS APPLET AREA B BASE BASEFONT BDO BIG BLOCKQUOTE BODY " + "BR BUTTON CAPTION CENTER CITE CODE COL COLGROUP DD DEL DFN DIR DIV DL DT EM FIELDSET " + "FONT FORM FRAME FRAMESET H1 H2 H3 H4 H5 H6 HEAD HR HTML I IFRAME IMG INPUT INS ISINDEX " + "KBD LABEL LEGEND LI LINK MAP MENU META NOFRAMES NOSCRIPT OBJECT OL OPTGROUP OPTION P " + "PARAM PRE Q S SAMP SCRIPT SELECT SMALL SPAN STRIKE STRONG STYLE SUB SUP TABLE TBODY TD " + "TEXTAREA TFOOT TH THEAD TITLE TR TT U UL VAR").split(/\s+/);
		tags.each(function (tag) {
			scope[tag] = function () {
				return Builder.node.apply(Builder, [tag].concat($A(arguments)))
			}
		})
	}
};
String.prototype.parseColor = function () {
	var color = '#';
	if (this.slice(0, 4) == 'rgb(') {
		var cols = this.slice(4, this.length - 1).split(',');
		var i = 0;
		do {
			color += parseInt(cols[i]).toColorPart()
		} while (++i < 3)
	} else {
		if (this.slice(0, 1) == '#') {
			if (this.length == 4) for (var i = 1; i < 4; i++) color += (this.charAt(i) + this.charAt(i)).toLowerCase();
			if (this.length == 7) color = this.toLowerCase()
		}
	}
	return (color.length == 7 ? color: (arguments[0] || this))
};
Element.collectTextNodes = function (element) {
	return $A($(element).childNodes).collect(function (node) {
		return (node.nodeType == 3 ? node.nodeValue: (node.hasChildNodes() ? Element.collectTextNodes(node) : ''))
	}).flatten().join('')
};
Element.collectTextNodesIgnoreClass = function (element, className) {
	return $A($(element).childNodes).collect(function (node) {
		return (node.nodeType == 3 ? node.nodeValue: ((node.hasChildNodes() && !Element.hasClassName(node, className)) ? Element.collectTextNodesIgnoreClass(node, className) : ''))
	}).flatten().join('')
};
Element.setContentZoom = function (element, percent) {
	element = $(element);
	element.setStyle({
		fontSize: (percent / 100) + 'em'
	});
	if (Prototype.Browser.WebKit) window.scrollBy(0, 0);
	return element
};
Element.getInlineOpacity = function (element) {
	return $(element).style.opacity || ''
};
Element.forceRerendering = function (element) {
	try {
		element = $(element);
		var n = document.createTextNode(' ');
		element.appendChild(n);
		element.removeChild(n)
	} catch(e) {}
};
var Effect = {
	_elementDoesNotExistError: {
		name: 'ElementDoesNotExistError',
		message: 'The specified DOM element does not exist, but is required for this effect to operate'
	},
	Transitions: {
		linear: Prototype.K,
		sinoidal: function (pos) {
			return ( - Math.cos(pos * Math.PI) / 2) + 0.5
		},
		reverse: function (pos) {
			return 1 - pos
		},
		flicker: function (pos) {
			var pos = (( - Math.cos(pos * Math.PI) / 4) + 0.75) + Math.random() / 4;
			return pos > 1 ? 1 : pos
		},
		wobble: function (pos) {
			return ( - Math.cos(pos * Math.PI * (9 * pos)) / 2) + 0.5
		},
		pulse: function (pos, pulses) {
			pulses = pulses || 5;
			return (((pos % (1 / pulses)) * pulses).round() == 0 ? ((pos * pulses * 2) - (pos * pulses * 2).floor()) : 1 - ((pos * pulses * 2) - (pos * pulses * 2).floor()))
		},
		spring: function (pos) {
			return 1 - (Math.cos(pos * 4.5 * Math.PI) * Math.exp( - pos * 6))
		},
		none: function (pos) {
			return 0
		},
		full: function (pos) {
			return 1
		}
	},
	DefaultOptions: {
		duration: 1.0,
		fps: 100,
		sync: false,
		from: 0.0,
		to: 1.0,
		delay: 0.0,
		queue: 'parallel'
	},
	tagifyText: function (element) {
		var tagifyStyle = 'position:relative';
		if (Prototype.Browser.IE) tagifyStyle += ';zoom:1';
		element = $(element);
		$A(element.childNodes).each(function (child) {
			if (child.nodeType == 3) {
				child.nodeValue.toArray().each(function (character) {
					element.insertBefore(new Element('span', {
						style: tagifyStyle
					}).update(character == ' ' ? String.fromCharCode(160) : character), child)
				});
				Element.remove(child)
			}
		})
	},
	multiple: function (element, effect) {
		var elements;
		if (((typeof element == 'object') || Object.isFunction(element)) && (element.length)) elements = element;
		else elements = $(element).childNodes;
		var options = Object.extend({
			speed: 0.1,
			delay: 0.0
		},
		arguments[2] || {});
		var masterDelay = options.delay;
		$A(elements).each(function (element, index) {
			new effect(element, Object.extend(options, {
				delay: index * options.speed + masterDelay
			}))
		})
	},
	PAIRS: {
		'slide': ['SlideDown', 'SlideUp'],
		'blind': ['BlindDown', 'BlindUp'],
		'appear': ['Appear', 'Fade']
	},
	toggle: function (element, effect) {
		element = $(element);
		effect = (effect || 'appear').toLowerCase();
		var options = Object.extend({
			queue: {
				position: 'end',
				scope: (element.id || 'global'),
				limit: 1
			}
		},
		arguments[2] || {});
		Effect[element.visible() ? Effect.PAIRS[effect][1] : Effect.PAIRS[effect][0]](element, options)
	}
};
Effect.DefaultOptions.transition = Effect.Transitions.sinoidal;
Effect.ScopedQueue = Class.create(Enumerable, {
	initialize: function () {
		this.effects = [];
		this.interval = null
	},
	_each: function (iterator) {
		this.effects._each(iterator)
	},
	add: function (effect) {
		var timestamp = new Date().getTime();
		var position = Object.isString(effect.options.queue) ? effect.options.queue: effect.options.queue.position;
		switch (position) {
		case 'front':
			this.effects.findAll(function (e) {
				return e.state == 'idle'
			}).each(function (e) {
				e.startOn += effect.finishOn;
				e.finishOn += effect.finishOn
			});
			break;
		case 'with-last':
			timestamp = this.effects.pluck('startOn').max() || timestamp;
			break;
		case 'end':
			timestamp = this.effects.pluck('finishOn').max() || timestamp;
			break
		}
		effect.startOn += timestamp;
		effect.finishOn += timestamp;
		if (!effect.options.queue.limit || (this.effects.length < effect.options.queue.limit)) this.effects.push(effect);
		if (!this.interval) this.interval = setInterval(this.loop.bind(this), 15)
	},
	remove: function (effect) {
		this.effects = this.effects.reject(function (e) {
			return e == effect
		});
		if (this.effects.length == 0) {
			clearInterval(this.interval);
			this.interval = null
		}
	},
	loop: function () {
		var timePos = new Date().getTime();
		for (var i = 0, len = this.effects.length; i < len; i++) this.effects[i] && this.effects[i].loop(timePos)
	}
});
Effect.Queues = {
	instances: $H(),
	get: function (queueName) {
		if (!Object.isString(queueName)) return queueName;
		return this.instances.get(queueName) || this.instances.set(queueName, new Effect.ScopedQueue())
	}
};
Effect.Queue = Effect.Queues.get('global');
Effect.Base = Class.create({
	position: null,
	start: function (options) {
		function codeForEvent(options, eventName) {
			return ((options[eventName + 'Internal'] ? 'this.options.' + eventName + 'Internal(this);': '') + (options[eventName] ? 'this.options.' + eventName + '(this);': ''))
		}
		if (options && options.transition === false) options.transition = Effect.Transitions.linear;
		this.options = Object.extend(Object.extend({},
		Effect.DefaultOptions), options || {});
		this.currentFrame = 0;
		this.state = 'idle';
		this.startOn = this.options.delay * 1000;
		this.finishOn = this.startOn + (this.options.duration * 1000);
		this.fromToDelta = this.options.to - this.options.from;
		this.totalTime = this.finishOn - this.startOn;
		this.totalFrames = this.options.fps * this.options.duration;
		eval('this.render = function(pos){ ' + 'if (this.state=="idle"){this.state="running";' + codeForEvent(this.options, 'beforeSetup') + (this.setup ? 'this.setup();': '') + codeForEvent(this.options, 'afterSetup') + '};if (this.state=="running"){' + 'pos=this.options.transition(pos)*' + this.fromToDelta + '+' + this.options.from + ';' + 'this.position=pos;' + codeForEvent(this.options, 'beforeUpdate') + (this.update ? 'this.update(pos);': '') + codeForEvent(this.options, 'afterUpdate') + '}}');
		this.event('beforeStart');
		if (!this.options.sync) Effect.Queues.get(Object.isString(this.options.queue) ? 'global': this.options.queue.scope).add(this)
	},
	loop: function (timePos) {
		if (timePos >= this.startOn) {
			if (timePos >= this.finishOn) {
				this.render(1.0);
				this.cancel();
				this.event('beforeFinish');
				if (this.finish) this.finish();
				this.event('afterFinish');
				return
			}
			var pos = (timePos - this.startOn) / this.totalTime,
			frame = (pos * this.totalFrames).round();
			if (frame > this.currentFrame) {
				this.render(pos);
				this.currentFrame = frame
			}
		}
	},
	cancel: function () {
		if (!this.options.sync) Effect.Queues.get(Object.isString(this.options.queue) ? 'global': this.options.queue.scope).remove(this);
		this.state = 'finished'
	},
	event: function (eventName) {
		if (this.options[eventName + 'Internal']) this.options[eventName + 'Internal'](this);
		if (this.options[eventName]) this.options[eventName](this)
	},
	inspect: function () {
		var data = $H();
		for (property in this) if (!Object.isFunction(this[property])) data.set(property, this[property]);
		return '#<Effect:' + data.inspect() + ',options:' + $H(this.options).inspect() + '>'
	}
});
Effect.Parallel = Class.create(Effect.Base, {
	initialize: function (effects) {
		this.effects = effects || [];
		this.start(arguments[1])
	},
	update: function (position) {
		this.effects.invoke('render', position)
	},
	finish: function (position) {
		this.effects.each(function (effect) {
			effect.render(1.0);
			effect.cancel();
			effect.event('beforeFinish');
			if (effect.finish) effect.finish(position);
			effect.event('afterFinish')
		})
	}
});
Effect.Tween = Class.create(Effect.Base, {
	initialize: function (object, from, to) {
		object = Object.isString(object) ? $(object) : object;
		var args = $A(arguments),
		method = args.last(),
		options = args.length == 5 ? args[3] : null;
		this.method = Object.isFunction(method) ? method.bind(object) : Object.isFunction(object[method]) ? object[method].bind(object) : function (value) {
			object[method] = value
		};
		this.start(Object.extend({
			from: from,
			to: to
		},
		options || {}))
	},
	update: function (position) {
		this.method(position)
	}
});
Effect.Event = Class.create(Effect.Base, {
	initialize: function () {
		this.start(Object.extend({
			duration: 0
		},
		arguments[0] || {}))
	},
	update: Prototype.emptyFunction
});
Effect.Opacity = Class.create(Effect.Base, {
	initialize: function (element) {
		this.element = $(element);
		if (!this.element) throw (Effect._elementDoesNotExistError);
		if (Prototype.Browser.IE && (!this.element.currentStyle.hasLayout)) this.element.setStyle({
			zoom: 1
		});
		var options = Object.extend({
			from: this.element.getOpacity() || 0.0,
			to: 1.0
		},
		arguments[1] || {});
		this.start(options)
	},
	update: function (position) {
		this.element.setOpacity(position)
	}
});
Effect.Move = Class.create(Effect.Base, {
	initialize: function (element) {
		this.element = $(element);
		if (!this.element) throw (Effect._elementDoesNotExistError);
		var options = Object.extend({
			x: 0,
			y: 0,
			mode: 'relative'
		},
		arguments[1] || {});
		this.start(options)
	},
	setup: function () {
		this.element.makePositioned();
		this.originalLeft = parseFloat(this.element.getStyle('left') || '0');
		this.originalTop = parseFloat(this.element.getStyle('top') || '0');
		if (this.options.mode == 'absolute') {
			this.options.x = this.options.x - this.originalLeft;
			this.options.y = this.options.y - this.originalTop
		}
	},
	update: function (position) {
		this.element.setStyle({
			left: (this.options.x * position + this.originalLeft).round() + 'px',
			top: (this.options.y * position + this.originalTop).round() + 'px'
		})
	}
});
Effect.MoveBy = function (element, toTop, toLeft) {
	return new Effect.Move(element, Object.extend({
		x: toLeft,
		y: toTop
	},
	arguments[3] || {}))
};
Effect.Scale = Class.create(Effect.Base, {
	initialize: function (element, percent) {
		this.element = $(element);
		if (!this.element) throw (Effect._elementDoesNotExistError);
		var options = Object.extend({
			scaleX: true,
			scaleY: true,
			scaleContent: true,
			scaleFromCenter: false,
			scaleMode: 'box',
			scaleFrom: 100.0,
			scaleTo: percent
		},
		arguments[2] || {});
		this.start(options)
	},
	setup: function () {
		this.restoreAfterFinish = this.options.restoreAfterFinish || false;
		this.elementPositioning = this.element.getStyle('position');
		this.originalStyle = {};
		['top', 'left', 'width', 'height', 'fontSize'].each(function (k) {
			this.originalStyle[k] = this.element.style[k]
		}.bind(this));
		this.originalTop = this.element.offsetTop;
		this.originalLeft = this.element.offsetLeft;
		var fontSize = this.element.getStyle('font-size') || '100%';
		['em', 'px', '%', 'pt'].each(function (fontSizeType) {
			if (fontSize.indexOf(fontSizeType) > 0) {
				this.fontSize = parseFloat(fontSize);
				this.fontSizeType = fontSizeType
			}
		}.bind(this));
		this.factor = (this.options.scaleTo - this.options.scaleFrom) / 100;
		this.dims = null;
		if (this.options.scaleMode == 'box') this.dims = [this.element.offsetHeight, this.element.offsetWidth];
		if (/^content/.test(this.options.scaleMode)) this.dims = [this.element.scrollHeight, this.element.scrollWidth];
		if (!this.dims) this.dims = [this.options.scaleMode.originalHeight, this.options.scaleMode.originalWidth]
	},
	update: function (position) {
		var currentScale = (this.options.scaleFrom / 100.0) + (this.factor * position);
		if (this.options.scaleContent && this.fontSize) this.element.setStyle({
			fontSize: this.fontSize * currentScale + this.fontSizeType
		});
		this.setDimensions(this.dims[0] * currentScale, this.dims[1] * currentScale)
	},
	finish: function (position) {
		if (this.restoreAfterFinish) this.element.setStyle(this.originalStyle)
	},
	setDimensions: function (height, width) {
		var d = {};
		if (this.options.scaleX) d.width = width.round() + 'px';
		if (this.options.scaleY) d.height = height.round() + 'px';
		if (this.options.scaleFromCenter) {
			var topd = (height - this.dims[0]) / 2;
			var leftd = (width - this.dims[1]) / 2;
			if (this.elementPositioning == 'absolute') {
				if (this.options.scaleY) d.top = this.originalTop - topd + 'px';
				if (this.options.scaleX) d.left = this.originalLeft - leftd + 'px'
			} else {
				if (this.options.scaleY) d.top = -topd + 'px';
				if (this.options.scaleX) d.left = -leftd + 'px'
			}
		}
		this.element.setStyle(d)
	}
});
Effect.Highlight = Class.create(Effect.Base, {
	initialize: function (element) {
		this.element = $(element);
		if (!this.element) throw (Effect._elementDoesNotExistError);
		var options = Object.extend({
			startcolor: '#ffff99'
		},
		arguments[1] || {});
		this.start(options)
	},
	setup: function () {
		if (this.element.getStyle('display') == 'none') {
			this.cancel();
			return
		}
		this.oldStyle = {};
		if (!this.options.keepBackgroundImage) {
			this.oldStyle.backgroundImage = this.element.getStyle('background-image');
			this.element.setStyle({
				backgroundImage: 'none'
			})
		}
		if (!this.options.endcolor) this.options.endcolor = this.element.getStyle('background-color').parseColor('#ffffff');
		if (!this.options.restorecolor) this.options.restorecolor = this.element.getStyle('background-color');
		this._base = $R(0, 2).map(function (i) {
			return parseInt(this.options.startcolor.slice(i * 2 + 1, i * 2 + 3), 16)
		}.bind(this));
		this._delta = $R(0, 2).map(function (i) {
			return parseInt(this.options.endcolor.slice(i * 2 + 1, i * 2 + 3), 16) - this._base[i]
		}.bind(this))
	},
	update: function (position) {
		this.element.setStyle({
			backgroundColor: $R(0, 2).inject('#', function (m, v, i) {
				return m + ((this._base[i] + (this._delta[i] * position)).round().toColorPart())
			}.bind(this))
		})
	},
	finish: function () {
		this.element.setStyle(Object.extend(this.oldStyle, {
			backgroundColor: this.options.restorecolor
		}))
	}
});
Effect.ScrollTo = function (element) {
	var options = arguments[1] || {},
	scrollOffsets = document.viewport.getScrollOffsets(),
	elementOffsets = $(element).cumulativeOffset(),
	max = (window.height || document.body.scrollHeight) - document.viewport.getHeight();
	if (options.offset) elementOffsets[1] += options.offset;
	return new Effect.Tween(null, scrollOffsets.top, elementOffsets[1] > max ? max: elementOffsets[1], options, function (p) {
		scrollTo(scrollOffsets.left, p.round())
	})
};
Effect.Fade = function (element) {
	element = $(element);
	var oldOpacity = element.getInlineOpacity();
	var options = Object.extend({
		from: element.getOpacity() || 1.0,
		to: 0.0,
		afterFinishInternal: function (effect) {
			if (effect.options.to != 0) return;
			effect.element.hide().setStyle({
				opacity: oldOpacity
			})
		}
	},
	arguments[1] || {});
	return new Effect.Opacity(element, options)
};
Effect.Appear = function (element) {
	element = $(element);
	var options = Object.extend({
		from: (element.getStyle('display') == 'none' ? 0.0 : element.getOpacity() || 0.0),
		to: 1.0,
		afterFinishInternal: function (effect) {
			effect.element.forceRerendering()
		},
		beforeSetup: function (effect) {
			effect.element.setOpacity(effect.options.from).show()
		}
	},
	arguments[1] || {});
	return new Effect.Opacity(element, options)
};
Effect.Puff = function (element) {
	element = $(element);
	var oldStyle = {
		opacity: element.getInlineOpacity(),
		position: element.getStyle('position'),
		top: element.style.top,
		left: element.style.left,
		width: element.style.width,
		height: element.style.height
	};
	return new Effect.Parallel([new Effect.Scale(element, 200, {
		sync: true,
		scaleFromCenter: true,
		scaleContent: true,
		restoreAfterFinish: true
	}), new Effect.Opacity(element, {
		sync: true,
		to: 0.0
	})], Object.extend({
		duration: 1.0,
		beforeSetupInternal: function (effect) {
			Position.absolutize(effect.effects[0].element)
		},
		afterFinishInternal: function (effect) {
			effect.effects[0].element.hide().setStyle(oldStyle)
		}
	},
	arguments[1] || {}))
};
Effect.BlindUp = function (element) {
	element = $(element);
	element.makeClipping();
	return new Effect.Scale(element, 0, Object.extend({
		scaleContent: false,
		scaleX: false,
		restoreAfterFinish: true,
		afterFinishInternal: function (effect) {
			effect.element.hide().undoClipping()
		}
	},
	arguments[1] || {}))
};
Effect.BlindDown = function (element) {
	element = $(element);
	var elementDimensions = element.getDimensions();
	return new Effect.Scale(element, 100, Object.extend({
		scaleContent: false,
		scaleX: false,
		scaleFrom: 0,
		scaleMode: {
			originalHeight: elementDimensions.height,
			originalWidth: elementDimensions.width
		},
		restoreAfterFinish: true,
		afterSetup: function (effect) {
			effect.element.makeClipping().setStyle({
				height: '0px'
			}).show()
		},
		afterFinishInternal: function (effect) {
			effect.element.undoClipping()
		}
	},
	arguments[1] || {}))
};
Effect.SwitchOff = function (element) {
	element = $(element);
	var oldOpacity = element.getInlineOpacity();
	return new Effect.Appear(element, Object.extend({
		duration: 0.4,
		from: 0,
		transition: Effect.Transitions.flicker,
		afterFinishInternal: function (effect) {
			new Effect.Scale(effect.element, 1, {
				duration: 0.3,
				scaleFromCenter: true,
				scaleX: false,
				scaleContent: false,
				restoreAfterFinish: true,
				beforeSetup: function (effect) {
					effect.element.makePositioned().makeClipping()
				},
				afterFinishInternal: function (effect) {
					effect.element.hide().undoClipping().undoPositioned().setStyle({
						opacity: oldOpacity
					})
				}
			})
		}
	},
	arguments[1] || {}))
};
Effect.DropOut = function (element) {
	element = $(element);
	var oldStyle = {
		top: element.getStyle('top'),
		left: element.getStyle('left'),
		opacity: element.getInlineOpacity()
	};
	return new Effect.Parallel([new Effect.Move(element, {
		x: 0,
		y: 100,
		sync: true
	}), new Effect.Opacity(element, {
		sync: true,
		to: 0.0
	})], Object.extend({
		duration: 0.5,
		beforeSetup: function (effect) {
			effect.effects[0].element.makePositioned()
		},
		afterFinishInternal: function (effect) {
			effect.effects[0].element.hide().undoPositioned().setStyle(oldStyle)
		}
	},
	arguments[1] || {}))
};
Effect.Shake = function (element) {
	element = $(element);
	var options = Object.extend({
		distance: 20,
		duration: 0.5
	},
	arguments[1] || {});
	var distance = parseFloat(options.distance);
	var split = parseFloat(options.duration) / 10.0;
	var oldStyle = {
		top: element.getStyle('top'),
		left: element.getStyle('left')
	};
	return new Effect.Move(element, {
		x: distance,
		y: 0,
		duration: split,
		afterFinishInternal: function (effect) {
			new Effect.Move(effect.element, {
				x: -distance * 2,
				y: 0,
				duration: split * 2,
				afterFinishInternal: function (effect) {
					new Effect.Move(effect.element, {
						x: distance * 2,
						y: 0,
						duration: split * 2,
						afterFinishInternal: function (effect) {
							new Effect.Move(effect.element, {
								x: -distance * 2,
								y: 0,
								duration: split * 2,
								afterFinishInternal: function (effect) {
									new Effect.Move(effect.element, {
										x: distance * 2,
										y: 0,
										duration: split * 2,
										afterFinishInternal: function (effect) {
											new Effect.Move(effect.element, {
												x: -distance,
												y: 0,
												duration: split,
												afterFinishInternal: function (effect) {
													effect.element.undoPositioned().setStyle(oldStyle)
												}
											})
										}
									})
								}
							})
						}
					})
				}
			})
		}
	})
};
Effect.SlideDown = function (element) {
	element = $(element).cleanWhitespace();
	var oldInnerBottom = element.down().getStyle('bottom');
	var elementDimensions = element.getDimensions();
	return new Effect.Scale(element, 100, Object.extend({
		scaleContent: false,
		scaleX: false,
		scaleFrom: window.opera ? 0 : 1,
		scaleMode: {
			originalHeight: elementDimensions.height,
			originalWidth: elementDimensions.width
		},
		restoreAfterFinish: true,
		afterSetup: function (effect) {
			effect.element.makePositioned();
			effect.element.down().makePositioned();
			if (window.opera) effect.element.setStyle({
				top: ''
			});
			effect.element.makeClipping().setStyle({
				height: '0px'
			}).show()
		},
		afterUpdateInternal: function (effect) {
			effect.element.down().setStyle({
				bottom: (effect.dims[0] - effect.element.clientHeight) + 'px'
			})
		},
		afterFinishInternal: function (effect) {
			effect.element.undoClipping().undoPositioned();
			effect.element.down().undoPositioned().setStyle({
				bottom: oldInnerBottom
			})
		}
	},
	arguments[1] || {}))
};
Effect.SlideUp = function (element) {
	element = $(element).cleanWhitespace();
	var oldInnerBottom = element.down().getStyle('bottom');
	var elementDimensions = element.getDimensions();
	return new Effect.Scale(element, window.opera ? 0 : 1, Object.extend({
		scaleContent: false,
		scaleX: false,
		scaleMode: 'box',
		scaleFrom: 100,
		scaleMode: {
			originalHeight: elementDimensions.height,
			originalWidth: elementDimensions.width
		},
		restoreAfterFinish: true,
		afterSetup: function (effect) {
			effect.element.makePositioned();
			effect.element.down().makePositioned();
			if (window.opera) effect.element.setStyle({
				top: ''
			});
			effect.element.makeClipping().show()
		},
		afterUpdateInternal: function (effect) {
			effect.element.down().setStyle({
				bottom: (effect.dims[0] - effect.element.clientHeight) + 'px'
			})
		},
		afterFinishInternal: function (effect) {
			effect.element.hide().undoClipping().undoPositioned();
			effect.element.down().undoPositioned().setStyle({
				bottom: oldInnerBottom
			})
		}
	},
	arguments[1] || {}))
};
Effect.Squish = function (element) {
	return new Effect.Scale(element, window.opera ? 1 : 0, {
		restoreAfterFinish: true,
		beforeSetup: function (effect) {
			effect.element.makeClipping()
		},
		afterFinishInternal: function (effect) {
			effect.element.hide().undoClipping()
		}
	})
};
Effect.Grow = function (element) {
	element = $(element);
	var options = Object.extend({
		direction: 'center',
		moveTransition: Effect.Transitions.sinoidal,
		scaleTransition: Effect.Transitions.sinoidal,
		opacityTransition: Effect.Transitions.full
	},
	arguments[1] || {});
	var oldStyle = {
		top: element.style.top,
		left: element.style.left,
		height: element.style.height,
		width: element.style.width,
		opacity: element.getInlineOpacity()
	};
	var dims = element.getDimensions();
	var initialMoveX, initialMoveY;
	var moveX, moveY;
	switch (options.direction) {
	case 'top-left':
		initialMoveX = initialMoveY = moveX = moveY = 0;
		break;
	case 'top-right':
		initialMoveX = dims.width;
		initialMoveY = moveY = 0;
		moveX = -dims.width;
		break;
	case 'bottom-left':
		initialMoveX = moveX = 0;
		initialMoveY = dims.height;
		moveY = -dims.height;
		break;
	case 'bottom-right':
		initialMoveX = dims.width;
		initialMoveY = dims.height;
		moveX = -dims.width;
		moveY = -dims.height;
		break;
	case 'center':
		initialMoveX = dims.width / 2;
		initialMoveY = dims.height / 2;
		moveX = -dims.width / 2;
		moveY = -dims.height / 2;
		break
	}
	return new Effect.Move(element, {
		x: initialMoveX,
		y: initialMoveY,
		duration: 0.01,
		beforeSetup: function (effect) {
			effect.element.hide().makeClipping().makePositioned()
		},
		afterFinishInternal: function (effect) {
			new Effect.Parallel([new Effect.Opacity(effect.element, {
				sync: true,
				to: 1.0,
				from: 0.0,
				transition: options.opacityTransition
			}), new Effect.Move(effect.element, {
				x: moveX,
				y: moveY,
				sync: true,
				transition: options.moveTransition
			}), new Effect.Scale(effect.element, 100, {
				scaleMode: {
					originalHeight: dims.height,
					originalWidth: dims.width
				},
				sync: true,
				scaleFrom: window.opera ? 1 : 0,
				transition: options.scaleTransition,
				restoreAfterFinish: true
			})], Object.extend({
				beforeSetup: function (effect) {
					effect.effects[0].element.setStyle({
						height: '0px'
					}).show()
				},
				afterFinishInternal: function (effect) {
					effect.effects[0].element.undoClipping().undoPositioned().setStyle(oldStyle)
				}
			},
			options))
		}
	})
};
Effect.Shrink = function (element) {
	element = $(element);
	var options = Object.extend({
		direction: 'center',
		moveTransition: Effect.Transitions.sinoidal,
		scaleTransition: Effect.Transitions.sinoidal,
		opacityTransition: Effect.Transitions.none
	},
	arguments[1] || {});
	var oldStyle = {
		top: element.style.top,
		left: element.style.left,
		height: element.style.height,
		width: element.style.width,
		opacity: element.getInlineOpacity()
	};
	var dims = element.getDimensions();
	var moveX, moveY;
	switch (options.direction) {
	case 'top-left':
		moveX = moveY = 0;
		break;
	case 'top-right':
		moveX = dims.width;
		moveY = 0;
		break;
	case 'bottom-left':
		moveX = 0;
		moveY = dims.height;
		break;
	case 'bottom-right':
		moveX = dims.width;
		moveY = dims.height;
		break;
	case 'center':
		moveX = dims.width / 2;
		moveY = dims.height / 2;
		break
	}
	return new Effect.Parallel([new Effect.Opacity(element, {
		sync: true,
		to: 0.0,
		from: 1.0,
		transition: options.opacityTransition
	}), new Effect.Scale(element, window.opera ? 1 : 0, {
		sync: true,
		transition: options.scaleTransition,
		restoreAfterFinish: true
	}), new Effect.Move(element, {
		x: moveX,
		y: moveY,
		sync: true,
		transition: options.moveTransition
	})], Object.extend({
		beforeStartInternal: function (effect) {
			effect.effects[0].element.makePositioned().makeClipping()
		},
		afterFinishInternal: function (effect) {
			effect.effects[0].element.hide().undoClipping().undoPositioned().setStyle(oldStyle)
		}
	},
	options))
};
Effect.Pulsate = function (element) {
	element = $(element);
	var options = arguments[1] || {};
	var oldOpacity = element.getInlineOpacity();
	var transition = options.transition || Effect.Transitions.sinoidal;
	var reverser = function (pos) {
		return transition(1 - Effect.Transitions.pulse(pos, options.pulses))
	};
	reverser.bind(transition);
	return new Effect.Opacity(element, Object.extend(Object.extend({
		duration: 2.0,
		from: 0,
		afterFinishInternal: function (effect) {
			effect.element.setStyle({
				opacity: oldOpacity
			})
		}
	},
	options), {
		transition: reverser
	}))
};
Effect.Fold = function (element) {
	element = $(element);
	var oldStyle = {
		top: element.style.top,
		left: element.style.left,
		width: element.style.width,
		height: element.style.height
	};
	element.makeClipping();
	return new Effect.Scale(element, 5, Object.extend({
		scaleContent: false,
		scaleX: false,
		afterFinishInternal: function (effect) {
			new Effect.Scale(element, 1, {
				scaleContent: false,
				scaleY: false,
				afterFinishInternal: function (effect) {
					effect.element.hide().undoClipping().setStyle(oldStyle)
				}
			})
		}
	},
	arguments[1] || {}))
};
Effect.Morph = Class.create(Effect.Base, {
	initialize: function (element) {
		this.element = $(element);
		if (!this.element) throw (Effect._elementDoesNotExistError);
		var options = Object.extend({
			style: {}
		},
		arguments[1] || {});
		if (!Object.isString(options.style)) this.style = $H(options.style);
		else {
			if (options.style.include(':')) this.style = options.style.parseStyle();
			else {
				this.element.addClassName(options.style);
				this.style = $H(this.element.getStyles());
				this.element.removeClassName(options.style);
				var css = this.element.getStyles();
				this.style = this.style.reject(function (style) {
					return style.value == css[style.key]
				});
				options.afterFinishInternal = function (effect) {
					effect.element.addClassName(effect.options.style);
					effect.transforms.each(function (transform) {
						effect.element.style[transform.style] = ''
					})
				}
			}
		}
		this.start(options)
	},
	setup: function () {
		function parseColor(color) {
			if (!color || ['rgba(0, 0, 0, 0)', 'transparent'].include(color)) color = '#ffffff';
			color = color.parseColor();
			return $R(0, 2).map(function (i) {
				return parseInt(color.slice(i * 2 + 1, i * 2 + 3), 16)
			})
		}
		this.transforms = this.style.map(function (pair) {
			var property = pair[0],
			value = pair[1],
			unit = null;
			if (value.parseColor('#zzzzzz') != '#zzzzzz') {
				value = value.parseColor();
				unit = 'color'
			} else if (property == 'opacity') {
				value = parseFloat(value);
				if (Prototype.Browser.IE && (!this.element.currentStyle.hasLayout)) this.element.setStyle({
					zoom: 1
				})
			} else if (Element.CSS_LENGTH.test(value)) {
				var components = value.match(/^([\+\-]?[0-9\.]+)(.*)$/);
				value = parseFloat(components[1]);
				unit = (components.length == 3) ? components[2] : null
			}
			var originalValue = this.element.getStyle(property);
			return {
				style: property.camelize(),
				originalValue: unit == 'color' ? parseColor(originalValue) : parseFloat(originalValue || 0),
				targetValue: unit == 'color' ? parseColor(value) : value,
				unit: unit
			}
		}.bind(this)).reject(function (transform) {
			return ((transform.originalValue == transform.targetValue) || (transform.unit != 'color' && (isNaN(transform.originalValue) || isNaN(transform.targetValue))))
		})
	},
	update: function (position) {
		var style = {},
		transform, i = this.transforms.length;
		while (i--) style[(transform = this.transforms[i]).style] = transform.unit == 'color' ? '#' + (Math.round(transform.originalValue[0] + (transform.targetValue[0] - transform.originalValue[0]) * position)).toColorPart() + (Math.round(transform.originalValue[1] + (transform.targetValue[1] - transform.originalValue[1]) * position)).toColorPart() + (Math.round(transform.originalValue[2] + (transform.targetValue[2] - transform.originalValue[2]) * position)).toColorPart() : (transform.originalValue + (transform.targetValue - transform.originalValue) * position).toFixed(3) + (transform.unit === null ? '': transform.unit);
		this.element.setStyle(style, true)
	}
});
Effect.Transform = Class.create({
	initialize: function (tracks) {
		this.tracks = [];
		this.options = arguments[1] || {};
		this.addTracks(tracks)
	},
	addTracks: function (tracks) {
		tracks.each(function (track) {
			track = $H(track);
			var data = track.values().first();
			this.tracks.push($H({
				ids: track.keys().first(),
				effect: Effect.Morph,
				options: {
					style: data
				}
			}))
		}.bind(this));
		return this
	},
	play: function () {
		return new Effect.Parallel(this.tracks.map(function (track) {
			var ids = track.get('ids'),
			effect = track.get('effect'),
			options = track.get('options');
			var elements = [$(ids) || $$(ids)].flatten();
			return elements.map(function (e) {
				return new effect(e, Object.extend({
					sync: true
				},
				options))
			})
		}).flatten(), this.options)
	}
});
Element.CSS_PROPERTIES = $w('backgroundColor backgroundPosition borderBottomColor borderBottomStyle ' + 'borderBottomWidth borderLeftColor borderLeftStyle borderLeftWidth ' + 'borderRightColor borderRightStyle borderRightWidth borderSpacing ' + 'borderTopColor borderTopStyle borderTopWidth bottom clip color ' + 'fontSize fontWeight height left letterSpacing lineHeight ' + 'marginBottom marginLeft marginRight marginTop markerOffset maxHeight ' + 'maxWidth minHeight minWidth opacity outlineColor outlineOffset ' + 'outlineWidth paddingBottom paddingLeft paddingRight paddingTop ' + 'right textIndent top width wordSpacing zIndex');
Element.CSS_LENGTH = /^(([\+\-]?[0-9\.]+)(em|ex|px|in|cm|mm|pt|pc|\%))|0$/;
String.__parseStyleElement = document.createElement('div');
String.prototype.parseStyle = function () {
	var style, styleRules = $H();
	if (Prototype.Browser.WebKit) style = new Element('div', {
		style: this
	}).style;
	else {
		String.__parseStyleElement.innerHTML = '<div style="' + this + '"></div>';
		style = String.__parseStyleElement.childNodes[0].style
	}
	Element.CSS_PROPERTIES.each(function (property) {
		if (style[property]) styleRules.set(property, style[property])
	});
	if (Prototype.Browser.IE && this.include('opacity')) styleRules.set('opacity', this.match(/opacity:\s*((?:0|1)?(?:\.\d*)?)/)[1]);
	return styleRules
};
if (document.defaultView && document.defaultView.getComputedStyle) {
	Element.getStyles = function (element) {
		var css = document.defaultView.getComputedStyle($(element), null);
		return Element.CSS_PROPERTIES.inject({},
		function (styles, property) {
			styles[property] = css[property];
			return styles
		})
	}
} else {
	Element.getStyles = function (element) {
		element = $(element);
		var css = element.currentStyle,
		styles;
		styles = Element.CSS_PROPERTIES.inject({},
		function (hash, property) {
			hash.set(property, css[property]);
			return hash
		});
		if (!styles.opacity) styles.set('opacity', element.getOpacity());
		return styles
	}
};
Effect.Methods = {
	morph: function (element, style) {
		element = $(element);
		new Effect.Morph(element, Object.extend({
			style: style
		},
		arguments[2] || {}));
		return element
	},
	visualEffect: function (element, effect, options) {
		element = $(element);
		var s = effect.dasherize().camelize(),
		klass = s.charAt(0).toUpperCase() + s.substring(1);
		new Effect[klass](element, options);
		return element
	},
	highlight: function (element, options) {
		element = $(element);
		new Effect.Highlight(element, options);
		return element
	}
};
$w('fade appear grow shrink fold blindUp blindDown slideUp slideDown ' + 'pulsate shake puff squish switchOff dropOut').each(function (effect) {
	Effect.Methods[effect] = function (element, options) {
		element = $(element);
		Effect[effect.charAt(0).toUpperCase() + effect.substring(1)](element, options);
		return element
	}
});
$w('getInlineOpacity forceRerendering setContentZoom collectTextNodes collectTextNodesIgnoreClass getStyles').each(function (f) {
	Effect.Methods[f] = Element[f]
});
Element.addMethods(Effect.Methods);
if (Object.isUndefined(Effect)) throw ("dragdrop.js requires including script.aculo.us' effects.js library");
var Droppables = {
	drops: [],
	remove: function (element) {
		this.drops = this.drops.reject(function (d) {
			return d.element == $(element)
		})
	},
	add: function (element) {
		element = $(element);
		var options = Object.extend({
			greedy: true,
			hoverclass: null,
			tree: false
		},
		arguments[1] || {});
		if (options.containment) {
			options._containers = [];
			var containment = options.containment;
			if (Object.isArray(containment)) {
				containment.each(function (c) {
					options._containers.push($(c))
				})
			} else {
				options._containers.push($(containment))
			}
		}
		if (options.accept) options.accept = [options.accept].flatten();
		Element.makePositioned(element);
		options.element = element;
		this.drops.push(options)
	},
	findDeepestChild: function (drops) {
		deepest = drops[0];
		for (i = 1; i < drops.length; ++i) if (Element.isParent(drops[i].element, deepest.element)) deepest = drops[i];
		return deepest
	},
	isContained: function (element, drop) {
		var containmentNode;
		if (drop.tree) {
			containmentNode = element.treeNode
		} else {
			containmentNode = element.parentNode
		}
		return drop._containers.detect(function (c) {
			return containmentNode == c
		})
	},
	isAffected: function (point, element, drop) {
		return ((drop.element != element) && ((!drop._containers) || this.isContained(element, drop)) && ((!drop.accept) || (Element.classNames(element).detect(function (v) {
			return drop.accept.include(v)
		}))) && Position.within(drop.element, point[0], point[1]))
	},
	deactivate: function (drop) {
		if (drop.hoverclass) Element.removeClassName(drop.element, drop.hoverclass);
		if (drop.onOut) {
			drop.onOut(drop.element)
		}
		this.last_active = null
	},
	activate: function (drop) {
		if (drop.hoverclass) Element.addClassName(drop.element, drop.hoverclass);
		this.last_active = drop
	},
	show: function (point, element) {
		if (!this.drops.length) return;
		var drop, affected = [];
		this.drops.each(function (drop) {
			if (Droppables.isAffected(point, element, drop)) affected.push(drop)
		});
		if (affected.length > 0) drop = Droppables.findDeepestChild(affected);
		if (this.last_active && this.last_active != drop) this.deactivate(this.last_active);
		if (drop) {
			Position.within(drop.element, point[0], point[1]);
			if (drop.onHover) drop.onHover(element, drop.element, Position.overlap(drop.overlap, drop.element));
			if (drop != this.last_active) Droppables.activate(drop)
		}
	},
	fire: function (event, element) {
		if (!this.last_active) return;
		Position.prepare();
		Position.includeScrollOffsets = true;
		if (this.isAffected([Event.pointerX(event), Event.pointerY(event)], element, this.last_active)) if (this.last_active.onDrop) {
			this.last_active.onDrop(element, this.last_active.element, event);
			return true
		}
	},
	reset: function () {
		if (this.last_active) this.deactivate(this.last_active)
	}
};
var Draggables = {
	drags: [],
	observers: [],
	register: function (draggable) {
		if (this.drags.length == 0) {
			this.eventMouseUp = this.endDrag.bindAsEventListener(this);
			this.eventMouseMove = this.updateDrag.bindAsEventListener(this);
			this.eventKeypress = this.keyPress.bindAsEventListener(this);
			Event.observe(document, "mouseup", this.eventMouseUp);
			Event.observe(document, "mousemove", this.eventMouseMove);
			Event.observe(document, "keypress", this.eventKeypress)
		}
		this.drags.push(draggable)
	},
	unregister: function (draggable) {
		this.drags = this.drags.reject(function (d) {
			return d == draggable
		});
		if (this.drags.length == 0) {
			Event.stopObserving(document, "mouseup", this.eventMouseUp);
			Event.stopObserving(document, "mousemove", this.eventMouseMove);
			Event.stopObserving(document, "keypress", this.eventKeypress)
		}
	},
	activate: function (draggable) {
		if (draggable.options.delay) {
			this._timeout = setTimeout(function () {
				Draggables._timeout = null;
				window.focus();
				Draggables.activeDraggable = draggable
			}.bind(this), draggable.options.delay)
		} else {
			window.focus();
			this.activeDraggable = draggable
		}
	},
	deactivate: function () {
		this.activeDraggable = null
	},
	updateDrag: function (event) {
		if (!this.activeDraggable) return;
		var pointer = [Event.pointerX(event), Event.pointerY(event)];
		if (this._lastPointer && (this._lastPointer.inspect() == pointer.inspect())) return;
		this._lastPointer = pointer;
		this.activeDraggable.updateDrag(event, pointer)
	},
	endDrag: function (event) {
		if (this._timeout) {
			clearTimeout(this._timeout);
			this._timeout = null
		}
		if (!this.activeDraggable) return;
		this._lastPointer = null;
		this.activeDraggable.endDrag(event);
		this.activeDraggable = null
	},
	keyPress: function (event) {
		if (this.activeDraggable) this.activeDraggable.keyPress(event)
	},
	addObserver: function (observer) {
		this.observers.push(observer);
		this._cacheObserverCallbacks()
	},
	removeObserver: function (element) {
		this.observers = this.observers.reject(function (o) {
			return o.element == element
		});
		this._cacheObserverCallbacks()
	},
	notify: function (eventName, draggable, event) {
		if (this[eventName + 'Count'] > 0) this.observers.each(function (o) {
			if (o[eventName]) o[eventName](eventName, draggable, event)
		});
		if (draggable.options[eventName]) draggable.options[eventName](draggable, event)
	},
	_cacheObserverCallbacks: function () { ['onStart', 'onEnd', 'onDrag'].each(function (eventName) {
			Draggables[eventName + 'Count'] = Draggables.observers.select(function (o) {
				return o[eventName]
			}).length
		})
	}
};
var Draggable = Class.create({
	initialize: function (element) {
		var defaults = {
			handle: false,
			reverteffect: function (element, top_offset, left_offset) {
				var dur = Math.sqrt(Math.abs(top_offset ^ 2) + Math.abs(left_offset ^ 2)) * 0.02;
				new Effect.Move(element, {
					x: -left_offset,
					y: -top_offset,
					duration: dur,
					queue: {
						scope: '_draggable',
						position: 'end'
					}
				})
			},
			endeffect: function (element) {
				var toOpacity = Object.isNumber(element._opacity) ? element._opacity: 1.0;
				new Effect.Opacity(element, {
					duration: 0.2,
					from: 0.7,
					to: toOpacity,
					queue: {
						scope: '_draggable',
						position: 'end'
					},
					afterFinish: function () {
						Draggable._dragging[element] = false
					}
				})
			},
			zindex: 1000,
			revert: false,
			quiet: false,
			scroll: false,
			scrollSensitivity: 20,
			scrollSpeed: 15,
			snap: false,
			delay: 0
		};
		if (!arguments[1] || Object.isUndefined(arguments[1].endeffect)) Object.extend(defaults, {
			starteffect: function (element) {
				element._opacity = Element.getOpacity(element);
				Draggable._dragging[element] = true;
				new Effect.Opacity(element, {
					duration: 0.2,
					from: element._opacity,
					to: 0.7
				})
			}
		});
		var options = Object.extend(defaults, arguments[1] || {});
		this.element = $(element);
		if (options.handle && Object.isString(options.handle)) this.handle = this.element.down('.' + options.handle, 0);
		if (!this.handle) this.handle = $(options.handle);
		if (!this.handle) this.handle = this.element;
		if (options.scroll && !options.scroll.scrollTo && !options.scroll.outerHTML) {
			options.scroll = $(options.scroll);
			this._isScrollChild = Element.childOf(this.element, options.scroll)
		}
		Element.makePositioned(this.element);
		this.options = options;
		this.dragging = false;
		this.eventMouseDown = this.initDrag.bindAsEventListener(this);
		Event.observe(this.handle, "mousedown", this.eventMouseDown);
		Draggables.register(this)
	},
	destroy: function () {
		Event.stopObserving(this.handle, "mousedown", this.eventMouseDown);
		Draggables.unregister(this)
	},
	currentDelta: function () {
		return ([parseInt(Element.getStyle(this.element, 'left') || '0'), parseInt(Element.getStyle(this.element, 'top') || '0')])
	},
	initDrag: function (event) {
		if (!Object.isUndefined(Draggable._dragging[this.element]) && Draggable._dragging[this.element]) return;
		if (Event.isLeftClick(event)) {
			var src = Event.element(event);
			if ((tag_name = src.tagName.toUpperCase()) && (tag_name == 'INPUT' || tag_name == 'SELECT' || tag_name == 'OPTION' || tag_name == 'BUTTON' || tag_name == 'TEXTAREA')) return;
			var pointer = [Event.pointerX(event), Event.pointerY(event)];
			var pos = Position.cumulativeOffset(this.element);
			this.offset = [0, 1].map(function (i) {
				return (pointer[i] - pos[i])
			});
			Draggables.activate(this);
			Event.stop(event)
		}
	},
	startDrag: function (event) {
		this.dragging = true;
		if (!this.delta) this.delta = this.currentDelta();
		if (this.options.zindex) {
			this.originalZ = parseInt(Element.getStyle(this.element, 'z-index') || 0);
			this.element.style.zIndex = this.options.zindex
		}
		if (this.options.ghosting) {
			this._clone = this.element.cloneNode(true);
			this.element._originallyAbsolute = (this.element.getStyle('position') == 'absolute');
			if (!this.element._originallyAbsolute) Position.absolutize(this.element);
			this.element.parentNode.insertBefore(this._clone, this.element)
		}
		if (this.options.scroll) {
			if (this.options.scroll == window) {
				var where = this._getWindowScroll(this.options.scroll);
				this.originalScrollLeft = where.left;
				this.originalScrollTop = where.top
			} else {
				this.originalScrollLeft = this.options.scroll.scrollLeft;
				this.originalScrollTop = this.options.scroll.scrollTop
			}
		}
		Draggables.notify('onStart', this, event);
		if (this.options.starteffect) this.options.starteffect(this.element)
	},
	updateDrag: function (event, pointer) {
		if (!this.dragging) this.startDrag(event);
		if (!this.options.quiet) {
			Position.prepare();
			Position.includeScrollOffsets = true;
			Droppables.show(pointer, this.element)
		}
		Draggables.notify('onDrag', this, event);
		this.draw(pointer);
		if (this.options.change) this.options.change(this);
		if (this.options.scroll) {
			this.stopScrolling();
			var p;
			if (this.options.scroll == window) {
				with(this._getWindowScroll(this.options.scroll)) {
					p = [left, top, left + width, top + height]
				}
			} else {
				p = Position.page(this.options.scroll);
				p[0] += this.options.scroll.scrollLeft + Position.deltaX;
				p[1] += this.options.scroll.scrollTop + Position.deltaY;
				p.push(p[0] + this.options.scroll.offsetWidth);
				p.push(p[1] + this.options.scroll.offsetHeight)
			}
			var speed = [0, 0];
			if (pointer[0] < (p[0] + this.options.scrollSensitivity)) speed[0] = pointer[0] - (p[0] + this.options.scrollSensitivity);
			if (pointer[1] < (p[1] + this.options.scrollSensitivity)) speed[1] = pointer[1] - (p[1] + this.options.scrollSensitivity);
			if (pointer[0] > (p[2] - this.options.scrollSensitivity)) speed[0] = pointer[0] - (p[2] - this.options.scrollSensitivity);
			if (pointer[1] > (p[3] - this.options.scrollSensitivity)) speed[1] = pointer[1] - (p[3] - this.options.scrollSensitivity);
			this.startScrolling(speed)
		}
		if (Prototype.Browser.WebKit) window.scrollBy(0, 0);
		Event.stop(event)
	},
	finishDrag: function (event, success) {
		this.dragging = false;
		if (this.options.quiet) {
			Position.prepare();
			Position.includeScrollOffsets = true;
			var pointer = [Event.pointerX(event), Event.pointerY(event)];
			Droppables.show(pointer, this.element)
		}
		if (this.options.ghosting) {
			if (!this.element._originallyAbsolute) Position.relativize(this.element);
			delete this.element._originallyAbsolute;
			Element.remove(this._clone);
			this._clone = null
		}
		var dropped = false;
		if (success) {
			dropped = Droppables.fire(event, this.element);
			if (!dropped) dropped = false
		}
		if (dropped && this.options.onDropped) this.options.onDropped(this.element);
		Draggables.notify('onEnd', this, event);
		var revert = this.options.revert;
		if (revert && Object.isFunction(revert)) revert = revert(this.element);
		var d = this.currentDelta();
		if (revert && this.options.reverteffect) {
			if (dropped == 0 || revert != 'failure') this.options.reverteffect(this.element, d[1] - this.delta[1], d[0] - this.delta[0])
		} else {
			this.delta = d
		}
		if (this.options.zindex) this.element.style.zIndex = this.originalZ;
		if (this.options.endeffect) this.options.endeffect(this.element);
		Draggables.deactivate(this);
		Droppables.reset()
	},
	keyPress: function (event) {
		if (event.keyCode != Event.KEY_ESC) return;
		this.finishDrag(event, false);
		Event.stop(event)
	},
	endDrag: function (event) {
		if (!this.dragging) return;
		this.stopScrolling();
		this.finishDrag(event, true);
		Event.stop(event)
	},
	draw: function (point) {
		var pos = Position.cumulativeOffset(this.element);
		if (this.options.ghosting) {
			var r = Position.realOffset(this.element);
			pos[0] += r[0] - Position.deltaX;
			pos[1] += r[1] - Position.deltaY
		}
		var d = this.currentDelta();
		pos[0] -= d[0];
		pos[1] -= d[1];
		if (this.options.scroll && (this.options.scroll != window && this._isScrollChild)) {
			pos[0] -= this.options.scroll.scrollLeft - this.originalScrollLeft;
			pos[1] -= this.options.scroll.scrollTop - this.originalScrollTop
		}
		var p = [0, 1].map(function (i) {
			return (point[i] - pos[i] - this.offset[i])
		}.bind(this));
		if (this.options.snap) {
			if (Object.isFunction(this.options.snap)) {
				p = this.options.snap(p[0], p[1], this)
			} else {
				if (Object.isArray(this.options.snap)) {
					p = p.map(function (v, i) {
						return (v / this.options.snap[i]).round() * this.options.snap[i]
					}.bind(this))
				} else {
					p = p.map(function (v) {
						return (v / this.options.snap).round() * this.options.snap
					}.bind(this))
				}
			}
		}
		var style = this.element.style;
		if ((!this.options.constraint) || (this.options.constraint == 'horizontal')) style.left = p[0] + "px";
		if ((!this.options.constraint) || (this.options.constraint == 'vertical')) style.top = p[1] + "px";
		if (style.visibility == "hidden") style.visibility = ""
	},
	stopScrolling: function () {
		if (this.scrollInterval) {
			clearInterval(this.scrollInterval);
			this.scrollInterval = null;
			Draggables._lastScrollPointer = null
		}
	},
	startScrolling: function (speed) {
		if (! (speed[0] || speed[1])) return;
		this.scrollSpeed = [speed[0] * this.options.scrollSpeed, speed[1] * this.options.scrollSpeed];
		this.lastScrolled = new Date();
		this.scrollInterval = setInterval(this.scroll.bind(this), 10)
	},
	scroll: function () {
		var current = new Date();
		var delta = current - this.lastScrolled;
		this.lastScrolled = current;
		if (this.options.scroll == window) {
			with(this._getWindowScroll(this.options.scroll)) {
				if (this.scrollSpeed[0] || this.scrollSpeed[1]) {
					var d = delta / 1000;
					this.options.scroll.scrollTo(left + d * this.scrollSpeed[0], top + d * this.scrollSpeed[1])
				}
			}
		} else {
			this.options.scroll.scrollLeft += this.scrollSpeed[0] * delta / 1000;
			this.options.scroll.scrollTop += this.scrollSpeed[1] * delta / 1000
		}
		Position.prepare();
		Position.includeScrollOffsets = true;
		Droppables.show(Draggables._lastPointer, this.element);
		Draggables.notify('onDrag', this);
		if (this._isScrollChild) {
			Draggables._lastScrollPointer = Draggables._lastScrollPointer || $A(Draggables._lastPointer);
			Draggables._lastScrollPointer[0] += this.scrollSpeed[0] * delta / 1000;
			Draggables._lastScrollPointer[1] += this.scrollSpeed[1] * delta / 1000;
			if (Draggables._lastScrollPointer[0] < 0) Draggables._lastScrollPointer[0] = 0;
			if (Draggables._lastScrollPointer[1] < 0) Draggables._lastScrollPointer[1] = 0;
			this.draw(Draggables._lastScrollPointer)
		}
		if (this.options.change) this.options.change(this)
	},
	_getWindowScroll: function (w) {
		var T, L, W, H;
		with(w.document) {
			if (w.document.documentElement && documentElement.scrollTop) {
				T = documentElement.scrollTop;
				L = documentElement.scrollLeft
			} else if (w.document.body) {
				T = body.scrollTop;
				L = body.scrollLeft
			}
			if (w.innerWidth) {
				W = w.innerWidth;
				H = w.innerHeight
			} else if (w.document.documentElement && documentElement.clientWidth) {
				W = documentElement.clientWidth;
				H = documentElement.clientHeight
			} else {
				W = body.offsetWidth;
				H = body.offsetHeight
			}
		}
		return {
			top: T,
			left: L,
			width: W,
			height: H
		}
	}
});
Draggable._dragging = {};
var SortableObserver = Class.create({
	initialize: function (element, observer) {
		this.element = $(element);
		this.observer = observer;
		this.lastValue = Sortable.serialize(this.element)
	},
	onStart: function () {
		this.lastValue = Sortable.serialize(this.element)
	},
	onEnd: function () {
		Sortable.unmark();
		if (this.lastValue != Sortable.serialize(this.element)) this.observer(this.element)
	}
});
var Sortable = {
	SERIALIZE_RULE: /^[^_\-](?:[A-Za-z0-9\-\_]*)[_](.*)$/,
	sortables: {},
	_findRootElement: function (element) {
		while (element.tagName.toUpperCase() != "BODY") {
			if (element.id && Sortable.sortables[element.id]) return element;
			element = element.parentNode
		}
	},
	options: function (element) {
		element = Sortable._findRootElement($(element));
		if (!element) return;
		return Sortable.sortables[element.id]
	},
	destroy: function (element) {
		var s = Sortable.options(element);
		if (s) {
			Draggables.removeObserver(s.element);
			s.droppables.each(function (d) {
				Droppables.remove(d)
			});
			s.draggables.invoke('destroy');
			delete Sortable.sortables[s.element.id]
		}
	},
	create: function (element) {
		element = $(element);
		var options = Object.extend({
			element: element,
			tag: 'li',
			dropOnEmpty: false,
			tree: false,
			treeTag: 'ul',
			overlap: 'vertical',
			constraint: 'vertical',
			containment: element,
			handle: false,
			only: false,
			delay: 0,
			hoverclass: null,
			ghosting: false,
			quiet: false,
			scroll: false,
			scrollSensitivity: 20,
			scrollSpeed: 15,
			format: this.SERIALIZE_RULE,
			elements: false,
			handles: false,
			onChange: Prototype.emptyFunction,
			onUpdate: Prototype.emptyFunction
		},
		arguments[1] || {});
		this.destroy(element);
		var options_for_draggable = {
			revert: true,
			quiet: options.quiet,
			scroll: options.scroll,
			scrollSpeed: options.scrollSpeed,
			scrollSensitivity: options.scrollSensitivity,
			delay: options.delay,
			ghosting: options.ghosting,
			constraint: options.constraint,
			handle: options.handle
		};
		if (options.starteffect) options_for_draggable.starteffect = options.starteffect;
		if (options.reverteffect) options_for_draggable.reverteffect = options.reverteffect;
		else if (options.ghosting) options_for_draggable.reverteffect = function (element) {
			element.style.top = 0;
			element.style.left = 0
		};
		if (options.endeffect) options_for_draggable.endeffect = options.endeffect;
		if (options.zindex) options_for_draggable.zindex = options.zindex;
		var options_for_droppable = {
			overlap: options.overlap,
			containment: options.containment,
			tree: options.tree,
			hoverclass: options.hoverclass,
			onHover: Sortable.onHover
		};
		var options_for_tree = {
			onHover: Sortable.onEmptyHover,
			overlap: options.overlap,
			containment: options.containment,
			hoverclass: options.hoverclass
		};
		Element.cleanWhitespace(element);
		options.draggables = [];
		options.droppables = [];
		if (options.dropOnEmpty || options.tree) {
			Droppables.add(element, options_for_tree);
			options.droppables.push(element)
		} (options.elements || this.findElements(element, options) || []).each(function (e, i) {
			var handle = options.handles ? $(options.handles[i]) : (options.handle ? $(e).select('.' + options.handle)[0] : e);
			options.draggables.push(new Draggable(e, Object.extend(options_for_draggable, {
				handle: handle
			})));
			Droppables.add(e, options_for_droppable);
			if (options.tree) e.treeNode = element;
			options.droppables.push(e)
		});
		if (options.tree) { (Sortable.findTreeElements(element, options) || []).each(function (e) {
				Droppables.add(e, options_for_tree);
				e.treeNode = element;
				options.droppables.push(e)
			})
		}
		this.sortables[element.id] = options;
		Draggables.addObserver(new SortableObserver(element, options.onUpdate))
	},
	findElements: function (element, options) {
		return Element.findChildren(element, options.only, options.tree ? true: false, options.tag)
	},
	findTreeElements: function (element, options) {
		return Element.findChildren(element, options.only, options.tree ? true: false, options.treeTag)
	},
	onHover: function (element, dropon, overlap) {
		if (Element.isParent(dropon, element)) return;
		if (overlap > .33 && overlap < .66 && Sortable.options(dropon).tree) {
			return
		} else if (overlap > 0.5) {
			Sortable.mark(dropon, 'before');
			if (dropon.previousSibling != element) {
				var oldParentNode = element.parentNode;
				element.style.visibility = "hidden";
				dropon.parentNode.insertBefore(element, dropon);
				if (dropon.parentNode != oldParentNode) Sortable.options(oldParentNode).onChange(element);
				Sortable.options(dropon.parentNode).onChange(element)
			}
		} else {
			Sortable.mark(dropon, 'after');
			var nextElement = dropon.nextSibling || null;
			if (nextElement != element) {
				var oldParentNode = element.parentNode;
				element.style.visibility = "hidden";
				dropon.parentNode.insertBefore(element, nextElement);
				if (dropon.parentNode != oldParentNode) Sortable.options(oldParentNode).onChange(element);
				Sortable.options(dropon.parentNode).onChange(element)
			}
		}
	},
	onEmptyHover: function (element, dropon, overlap) {
		var oldParentNode = element.parentNode;
		var droponOptions = Sortable.options(dropon);
		if (!Element.isParent(dropon, element)) {
			var index;
			var children = Sortable.findElements(dropon, {
				tag: droponOptions.tag,
				only: droponOptions.only
			});
			var child = null;
			if (children) {
				var offset = Element.offsetSize(dropon, droponOptions.overlap) * (1.0 - overlap);
				for (index = 0; index < children.length; index += 1) {
					if (offset - Element.offsetSize(children[index], droponOptions.overlap) >= 0) {
						offset -= Element.offsetSize(children[index], droponOptions.overlap)
					} else if (offset - (Element.offsetSize(children[index], droponOptions.overlap) / 2) >= 0) {
						child = index + 1 < children.length ? children[index + 1] : null;
						break
					} else {
						child = children[index];
						break
					}
				}
			}
			dropon.insertBefore(element, child);
			Sortable.options(oldParentNode).onChange(element);
			droponOptions.onChange(element)
		}
	},
	unmark: function () {
		if (Sortable._marker) Sortable._marker.hide()
	},
	mark: function (dropon, position) {
		var sortable = Sortable.options(dropon.parentNode);
		if (sortable && !sortable.ghosting) return;
		if (!Sortable._marker) {
			Sortable._marker = ($('dropmarker') || Element.extend(document.createElement('DIV'))).hide().addClassName('dropmarker').setStyle({
				position: 'absolute'
			});
			document.getElementsByTagName("body").item(0).appendChild(Sortable._marker)
		}
		var offsets = Position.cumulativeOffset(dropon);
		Sortable._marker.setStyle({
			left: offsets[0] + 'px',
			top: offsets[1] + 'px'
		});
		if (position == 'after') if (sortable.overlap == 'horizontal') Sortable._marker.setStyle({
			left: (offsets[0] + dropon.clientWidth) + 'px'
		});
		else Sortable._marker.setStyle({
			top: (offsets[1] + dropon.clientHeight) + 'px'
		});
		Sortable._marker.show()
	},
	_tree: function (element, options, parent) {
		var children = Sortable.findElements(element, options) || [];
		for (var i = 0; i < children.length; ++i) {
			var match = children[i].id.match(options.format);
			if (!match) continue;
			var child = {
				id: encodeURIComponent(match ? match[1] : null),
				element: element,
				parent: parent,
				children: [],
				position: parent.children.length,
				container: $(children[i]).down(options.treeTag)
			};
			if (child.container) this._tree(child.container, options, child);
			parent.children.push(child)
		}
		return parent
	},
	tree: function (element) {
		element = $(element);
		var sortableOptions = this.options(element);
		var options = Object.extend({
			tag: sortableOptions.tag,
			treeTag: sortableOptions.treeTag,
			only: sortableOptions.only,
			name: element.id,
			format: sortableOptions.format
		},
		arguments[1] || {});
		var root = {
			id: null,
			parent: null,
			children: [],
			container: element,
			position: 0
		};
		return Sortable._tree(element, options, root)
	},
	_constructIndex: function (node) {
		var index = '';
		do {
			if (node.id) index = '[' + node.position + ']' + index
		} while ((node = node.parent) != null);
		return index
	},
	sequence: function (element) {
		element = $(element);
		var options = Object.extend(this.options(element), arguments[1] || {});
		return $(this.findElements(element, options) || []).map(function (item) {
			return item.id.match(options.format) ? item.id.match(options.format)[1] : ''
		})
	},
	setSequence: function (element, new_sequence) {
		element = $(element);
		var options = Object.extend(this.options(element), arguments[2] || {});
		var nodeMap = {};
		this.findElements(element, options).each(function (n) {
			if (n.id.match(options.format)) nodeMap[n.id.match(options.format)[1]] = [n, n.parentNode];
			n.parentNode.removeChild(n)
		});
		new_sequence.each(function (ident) {
			var n = nodeMap[ident];
			if (n) {
				n[1].appendChild(n[0]);
				delete nodeMap[ident]
			}
		})
	},
	serialize: function (element) {
		element = $(element);
		var options = Object.extend(Sortable.options(element), arguments[1] || {});
		var name = encodeURIComponent((arguments[1] && arguments[1].name) ? arguments[1].name: element.id);
		if (options.tree) {
			return Sortable.tree(element, arguments[1]).children.map(function (item) {
				return [name + Sortable._constructIndex(item) + "[id]=" + encodeURIComponent(item.id)].concat(item.children.map(arguments.callee))
			}).flatten().join('&')
		} else {
			return Sortable.sequence(element, arguments[1]).map(function (item) {
				return name + "[]=" + encodeURIComponent(item)
			}).join('&')
		}
	}
};
Element.isParent = function (child, element) {
	if (!child.parentNode || child == element) return false;
	if (child.parentNode == element) return true;
	return Element.isParent(child.parentNode, element)
};
Element.findChildren = function (element, only, recursive, tagName) {
	if (!element.hasChildNodes()) return null;
	tagName = tagName.toUpperCase();
	if (only) only = [only].flatten();
	var elements = [];
	$A(element.childNodes).each(function (e) {
		if (e.tagName && e.tagName.toUpperCase() == tagName && (!only || (Element.classNames(e).detect(function (v) {
			return only.include(v)
		})))) elements.push(e);
		if (recursive) {
			var grandchildren = Element.findChildren(e, only, recursive, tagName);
			if (grandchildren) elements.push(grandchildren)
		}
	});
	return (elements.length > 0 ? elements.flatten() : [])
};
Element.offsetSize = function (element, type) {
	return element['offset' + ((type == 'vertical' || type == 'height') ? 'Height': 'Width')]
};
if (typeof Effect == 'undefined') throw ("controls.js requires including script.aculo.us' effects.js library");
var Autocompleter = {};
Autocompleter.Base = Class.create({
	baseInitialize: function (element, update, options) {
		element = $(element);
		this.element = element;
		this.update = $(update);
		this.hasFocus = false;
		this.changed = false;
		this.active = false;
		this.index = 0;
		this.entryCount = 0;
		this.oldElementValue = this.element.value;
		if (this.setOptions) this.setOptions(options);
		else this.options = options || {};
		this.options.paramName = this.options.paramName || this.element.name;
		this.options.tokens = this.options.tokens || [];
		this.options.frequency = this.options.frequency || 0.4;
		this.options.minChars = this.options.minChars || 1;
		this.options.onShow = this.options.onShow ||
		function (element, update) {
			if (!update.style.position || update.style.position == 'absolute') {
				update.style.position = 'absolute';
				Position.clone(element, update, {
					setHeight: false,
					offsetTop: element.offsetHeight
				})
			}
			Effect.Appear(update, {
				duration: 0.15
			})
		};
		this.options.onHide = this.options.onHide ||
		function (element, update) {
			new Effect.Fade(update, {
				duration: 0.15
			})
		};
		if (typeof(this.options.tokens) == 'string') this.options.tokens = new Array(this.options.tokens);
		if (!this.options.tokens.include('\n')) this.options.tokens.push('\n');
		this.observer = null;
		this.element.setAttribute('autocomplete', 'off');
		Element.hide(this.update);
		Event.observe(this.element, 'blur', this.onBlur.bindAsEventListener(this));
		Event.observe(this.element, 'keypress', this.onKeyPress.bindAsEventListener(this))
	},
	show: function () {
		if (Element.getStyle(this.update, 'display') == 'none') this.options.onShow(this.element, this.update);
		if (!this.iefix && (Prototype.Browser.IE) && (Element.getStyle(this.update, 'position') == 'absolute')) {
			new Insertion.After(this.update, '<iframe id="' + this.update.id + '_iefix" ' + 'style="display:none;position:absolute;filter:progid:DXImageTransform.Microsoft.Alpha(opacity=0);" ' + 'src="javascript:false;" frameborder="0" scrolling="no"></iframe>');
			this.iefix = $(this.update.id + '_iefix')
		}
		if (this.iefix) setTimeout(this.fixIEOverlapping.bind(this), 50)
	},
	fixIEOverlapping: function () {
		Position.clone(this.update, this.iefix, {
			setTop: (!this.update.style.height)
		});
		this.iefix.style.zIndex = 1;
		this.update.style.zIndex = 2;
		Element.show(this.iefix)
	},
	hide: function () {
		this.stopIndicator();
		if (Element.getStyle(this.update, 'display') != 'none') this.options.onHide(this.element, this.update);
		if (this.iefix) Element.hide(this.iefix)
	},
	startIndicator: function () {
		if (this.options.indicator) Element.show(this.options.indicator)
	},
	stopIndicator: function () {
		if (this.options.indicator) Element.hide(this.options.indicator)
	},
	onKeyPress: function (event) {
		if (this.active) switch (event.keyCode) {
		case Event.KEY_TAB:
		case Event.KEY_RETURN:
			this.selectEntry();
			Event.stop(event);
		case Event.KEY_ESC:
			this.hide();
			this.active = false;
			Event.stop(event);
			return;
		case Event.KEY_LEFT:
		case Event.KEY_RIGHT:
			return;
		case Event.KEY_UP:
			this.markPrevious();
			this.render();
			if (Prototype.Browser.WebKit) Event.stop(event);
			return;
		case Event.KEY_DOWN:
			this.markNext();
			this.render();
			if (Prototype.Browser.WebKit) Event.stop(event);
			return
		} else if (event.keyCode == Event.KEY_TAB || event.keyCode == Event.KEY_RETURN || (Prototype.Browser.WebKit > 0 && event.keyCode == 0)) return;
		this.changed = true;
		this.hasFocus = true;
		if (this.observer) clearTimeout(this.observer);
		this.observer = setTimeout(this.onObserverEvent.bind(this), this.options.frequency * 1000)
	},
	activate: function () {
		this.changed = false;
		this.hasFocus = true;
		this.getUpdatedChoices()
	},
	onHover: function (event) {
		var element = Event.findElement(event, 'LI');
		if (this.index != element.autocompleteIndex) {
			this.index = element.autocompleteIndex;
			this.render()
		}
		Event.stop(event)
	},
	onClick: function (event) {
		var element = Event.findElement(event, 'LI');
		this.index = element.autocompleteIndex;
		this.selectEntry();
		this.hide()
	},
	onBlur: function (event) {
		setTimeout(this.hide.bind(this), 250);
		this.hasFocus = false;
		this.active = false
	},
	render: function () {
		if (this.entryCount > 0) {
			for (var i = 0; i < this.entryCount; i++) this.index == i ? Element.addClassName(this.getEntry(i), "selected") : Element.removeClassName(this.getEntry(i), "selected");
			if (this.hasFocus) {
				this.show();
				this.active = true
			}
		} else {
			this.active = false;
			this.hide()
		}
	},
	markPrevious: function () {
		if (this.index > 0) this.index--;
		else this.index = this.entryCount - 1;
		this.getEntry(this.index).scrollIntoView(true)
	},
	markNext: function () {
		if (this.index < this.entryCount - 1) this.index++;
		else this.index = 0;
		this.getEntry(this.index).scrollIntoView(false)
	},
	getEntry: function (index) {
		return this.update.firstChild.childNodes[index]
	},
	getCurrentEntry: function () {
		return this.getEntry(this.index)
	},
	selectEntry: function () {
		this.active = false;
		this.updateElement(this.getCurrentEntry())
	},
	updateElement: function (selectedElement) {
		if (this.options.updateElement) {
			this.options.updateElement(selectedElement);
			return
		}
		var value = '';
		if (this.options.select) {
			var nodes = $(selectedElement).select('.' + this.options.select) || [];
			if (nodes.length > 0) value = Element.collectTextNodes(nodes[0], this.options.select)
		} else value = Element.collectTextNodesIgnoreClass(selectedElement, 'informal');
		var bounds = this.getTokenBounds();
		if (bounds[0] != -1) {
			var newValue = this.element.value.substr(0, bounds[0]);
			var whitespace = this.element.value.substr(bounds[0]).match(/^\s+/);
			if (whitespace) newValue += whitespace[0];
			this.element.value = newValue + value + this.element.value.substr(bounds[1])
		} else {
			this.element.value = value
		}
		this.oldElementValue = this.element.value;
		this.element.focus();
		if (this.options.afterUpdateElement) this.options.afterUpdateElement(this.element, selectedElement)
	},
	updateChoices: function (choices) {
		if (!this.changed && this.hasFocus) {
			this.update.innerHTML = choices;
			Element.cleanWhitespace(this.update);
			Element.cleanWhitespace(this.update.down());
			if (this.update.firstChild && this.update.down().childNodes) {
				this.entryCount = this.update.down().childNodes.length;
				for (var i = 0; i < this.entryCount; i++) {
					var entry = this.getEntry(i);
					entry.autocompleteIndex = i;
					this.addObservers(entry)
				}
			} else {
				this.entryCount = 0
			}
			this.stopIndicator();
			this.index = 0;
			if (this.entryCount == 1 && this.options.autoSelect) {
				this.selectEntry();
				this.hide()
			} else {
				this.render()
			}
		}
	},
	addObservers: function (element) {
		Event.observe(element, "mouseover", this.onHover.bindAsEventListener(this));
		Event.observe(element, "click", this.onClick.bindAsEventListener(this))
	},
	onObserverEvent: function () {
		this.changed = false;
		this.tokenBounds = null;
		if (this.getToken().length >= this.options.minChars) {
			this.getUpdatedChoices()
		} else {
			this.active = false;
			this.hide()
		}
		this.oldElementValue = this.element.value
	},
	getToken: function () {
		var bounds = this.getTokenBounds();
		return this.element.value.substring(bounds[0], bounds[1]).strip()
	},
	getTokenBounds: function () {
		if (null != this.tokenBounds) return this.tokenBounds;
		var value = this.element.value;
		if (value.strip().empty()) return [ - 1, 0];
		var diff = arguments.callee.getFirstDifferencePos(value, this.oldElementValue);
		var offset = (diff == this.oldElementValue.length ? 1 : 0);
		var prevTokenPos = -1,
		nextTokenPos = value.length;
		var tp;
		for (var index = 0, l = this.options.tokens.length; index < l; ++index) {
			tp = value.lastIndexOf(this.options.tokens[index], diff + offset - 1);
			if (tp > prevTokenPos) prevTokenPos = tp;
			tp = value.indexOf(this.options.tokens[index], diff + offset);
			if ( - 1 != tp && tp < nextTokenPos) nextTokenPos = tp
		}
		return (this.tokenBounds = [prevTokenPos + 1, nextTokenPos])
	}
});
Autocompleter.Base.prototype.getTokenBounds.getFirstDifferencePos = function (newS, oldS) {
	var boundary = Math.min(newS.length, oldS.length);
	for (var index = 0; index < boundary; ++index) if (newS[index] != oldS[index]) return index;
	return boundary
};
Ajax.Autocompleter = Class.create(Autocompleter.Base, {
	initialize: function (element, update, url, options) {
		this.baseInitialize(element, update, options);
		this.options.asynchronous = true;
		this.options.onComplete = this.onComplete.bind(this);
		this.options.defaultParams = this.options.parameters || null;
		this.url = url
	},
	getUpdatedChoices: function () {
		this.startIndicator();
		var entry = encodeURIComponent(this.options.paramName) + '=' + encodeURIComponent(this.getToken());
		this.options.parameters = this.options.callback ? this.options.callback(this.element, entry) : entry;
		if (this.options.defaultParams) this.options.parameters += '&' + this.options.defaultParams;
		new Ajax.Request(this.url, this.options)
	},
	onComplete: function (request) {
		this.updateChoices(request.responseText)
	}
});
Autocompleter.Local = Class.create(Autocompleter.Base, {
	initialize: function (element, update, array, options) {
		this.baseInitialize(element, update, options);
		this.options.array = array
	},
	getUpdatedChoices: function () {
		this.updateChoices(this.options.selector(this))
	},
	setOptions: function (options) {
		this.options = Object.extend({
			choices: 10,
			partialSearch: true,
			partialChars: 2,
			ignoreCase: true,
			fullSearch: false,
			selector: function (instance) {
				var ret = [];
				var partial = [];
				var entry = instance.getToken();
				var count = 0;
				for (var i = 0; i < instance.options.array.length && ret.length < instance.options.choices; i++) {
					var elem = instance.options.array[i];
					var foundPos = instance.options.ignoreCase ? elem.toLowerCase().indexOf(entry.toLowerCase()) : elem.indexOf(entry);
					while (foundPos != -1) {
						if (foundPos == 0 && elem.length != entry.length) {
							ret.push("<li><strong>" + elem.substr(0, entry.length) + "</strong>" + elem.substr(entry.length) + "</li>");
							break
						} else if (entry.length >= instance.options.partialChars && instance.options.partialSearch && foundPos != -1) {
							if (instance.options.fullSearch || /\s/.test(elem.substr(foundPos - 1, 1))) {
								partial.push("<li>" + elem.substr(0, foundPos) + "<strong>" + elem.substr(foundPos, entry.length) + "</strong>" + elem.substr(foundPos + entry.length) + "</li>");
								break
							}
						}
						foundPos = instance.options.ignoreCase ? elem.toLowerCase().indexOf(entry.toLowerCase(), foundPos + 1) : elem.indexOf(entry, foundPos + 1)
					}
				}
				if (partial.length) ret = ret.concat(partial.slice(0, instance.options.choices - ret.length));
				return "<ul>" + ret.join('') + "</ul>"
			}
		},
		options || {})
	}
});
Field.scrollFreeActivate = function (field) {
	setTimeout(function () {
		Field.activate(field)
	},
	1)
};
Ajax.InPlaceEditor = Class.create({
	initialize: function (element, url, options) {
		this.url = url;
		this.element = element = $(element);
		this.prepareOptions();
		this._controls = {};
		arguments.callee.dealWithDeprecatedOptions(options);
		Object.extend(this.options, options || {});
		if (!this.options.formId && this.element.id) {
			this.options.formId = this.element.id + '-inplaceeditor';
			if ($(this.options.formId)) this.options.formId = ''
		}
		if (this.options.externalControl) this.options.externalControl = $(this.options.externalControl);
		if (!this.options.externalControl) this.options.externalControlOnly = false;
		this._originalBackground = this.element.getStyle('background-color') || 'transparent';
		this.element.title = this.options.clickToEditText;
		this._boundCancelHandler = this.handleFormCancellation.bind(this);
		this._boundComplete = (this.options.onComplete || Prototype.emptyFunction).bind(this);
		this._boundFailureHandler = this.handleAJAXFailure.bind(this);
		this._boundSubmitHandler = this.handleFormSubmission.bind(this);
		this._boundWrapperHandler = this.wrapUp.bind(this);
		this.registerListeners()
	},
	checkForEscapeOrReturn: function (e) {
		if (!this._editing || e.ctrlKey || e.altKey || e.shiftKey) return;
		if (Event.KEY_ESC == e.keyCode) this.handleFormCancellation(e);
		else if (Event.KEY_RETURN == e.keyCode) this.handleFormSubmission(e)
	},
	createControl: function (mode, handler, extraClasses) {
		var control = this.options[mode + 'Control'];
		var text = this.options[mode + 'Text'];
		if ('button' == control) {
			var btn = document.createElement('input');
			btn.type = 'submit';
			btn.value = text;
			btn.className = 'editor_' + mode + '_button';
			if ('cancel' == mode) btn.onclick = this._boundCancelHandler;
			this._form.appendChild(btn);
			this._controls[mode] = btn
		} else if ('link' == control) {
			var link = document.createElement('a');
			link.href = '#';
			link.appendChild(document.createTextNode(text));
			link.onclick = 'cancel' == mode ? this._boundCancelHandler: this._boundSubmitHandler;
			link.className = 'editor_' + mode + '_link';
			if (extraClasses) link.className += ' ' + extraClasses;
			this._form.appendChild(link);
			this._controls[mode] = link
		}
	},
	createEditField: function () {
		var text = (this.options.loadTextURL ? this.options.loadingText: this.getText());
		var fld;
		if (1 >= this.options.rows && !/\r|\n/.test(this.getText())) {
			fld = document.createElement('input');
			fld.type = 'text';
			var size = this.options.size || this.options.cols || 0;
			if (0 < size) fld.size = size
		} else {
			fld = document.createElement('textarea');
			fld.rows = (1 >= this.options.rows ? this.options.autoRows: this.options.rows);
			fld.cols = this.options.cols || 40
		}
		fld.name = this.options.paramName;
		fld.value = text;
		fld.className = 'editor_field';
		if (this.options.submitOnBlur) fld.onblur = this._boundSubmitHandler;
		this._controls.editor = fld;
		if (this.options.loadTextURL) this.loadExternalText();
		this._form.appendChild(this._controls.editor)
	},
	createForm: function () {
		var ipe = this;
		function addText(mode, condition) {
			var text = ipe.options['text' + mode + 'Controls'];
			if (!text || condition === false) return;
			ipe._form.appendChild(document.createTextNode(text))
		};
		this._form = $(document.createElement('form'));
		this._form.id = this.options.formId;
		this._form.addClassName(this.options.formClassName);
		this._form.onsubmit = this._boundSubmitHandler;
		this.createEditField();
		if ('textarea' == this._controls.editor.tagName.toLowerCase()) this._form.appendChild(document.createElement('br'));
		if (this.options.onFormCustomization) this.options.onFormCustomization(this, this._form);
		addText('Before', this.options.okControl || this.options.cancelControl);
		this.createControl('ok', this._boundSubmitHandler);
		addText('Between', this.options.okControl && this.options.cancelControl);
		this.createControl('cancel', this._boundCancelHandler, 'editor_cancel');
		addText('After', this.options.okControl || this.options.cancelControl)
	},
	destroy: function () {
		if (this._oldInnerHTML) this.element.innerHTML = this._oldInnerHTML;
		this.leaveEditMode();
		this.unregisterListeners()
	},
	enterEditMode: function (e) {
		if (this._saving || this._editing) return;
		this._editing = true;
		this.triggerCallback('onEnterEditMode');
		if (this.options.externalControl) this.options.externalControl.hide();
		this.element.hide();
		this.createForm();
		this.element.parentNode.insertBefore(this._form, this.element);
		if (!this.options.loadTextURL) this.postProcessEditField();
		if (e) Event.stop(e)
	},
	enterHover: function (e) {
		if (this.options.hoverClassName) this.element.addClassName(this.options.hoverClassName);
		if (this._saving) return;
		this.triggerCallback('onEnterHover')
	},
	getText: function () {
		return this.element.innerHTML
	},
	handleAJAXFailure: function (transport) {
		this.triggerCallback('onFailure', transport);
		if (this._oldInnerHTML) {
			this.element.innerHTML = this._oldInnerHTML;
			this._oldInnerHTML = null
		}
	},
	handleFormCancellation: function (e) {
		this.wrapUp();
		if (e) Event.stop(e)
	},
	handleFormSubmission: function (e) {
		var form = this._form;
		var value = $F(this._controls.editor);
		this.prepareSubmission();
		var params = this.options.callback(form, value) || '';
		if (Object.isString(params)) params = params.toQueryParams();
		params.editorId = this.element.id;
		if (this.options.htmlResponse) {
			var options = Object.extend({
				evalScripts: true
			},
			this.options.ajaxOptions);
			Object.extend(options, {
				parameters: params,
				onComplete: this._boundWrapperHandler,
				onFailure: this._boundFailureHandler
			});
			new Ajax.Updater({
				success: this.element
			},
			this.url, options)
		} else {
			var options = Object.extend({
				method: 'get'
			},
			this.options.ajaxOptions);
			Object.extend(options, {
				parameters: params,
				onComplete: this._boundWrapperHandler,
				onFailure: this._boundFailureHandler
			});
			new Ajax.Request(this.url, options)
		}
		if (e) Event.stop(e)
	},
	leaveEditMode: function () {
		this.element.removeClassName(this.options.savingClassName);
		this.removeForm();
		this.leaveHover();
		this.element.style.backgroundColor = this._originalBackground;
		this.element.show();
		if (this.options.externalControl) this.options.externalControl.show();
		this._saving = false;
		this._editing = false;
		this._oldInnerHTML = null;
		this.triggerCallback('onLeaveEditMode')
	},
	leaveHover: function (e) {
		if (this.options.hoverClassName) this.element.removeClassName(this.options.hoverClassName);
		if (this._saving) return;
		this.triggerCallback('onLeaveHover')
	},
	loadExternalText: function () {
		this._form.addClassName(this.options.loadingClassName);
		this._controls.editor.disabled = true;
		var options = Object.extend({
			method: 'get'
		},
		this.options.ajaxOptions);
		Object.extend(options, {
			parameters: 'editorId=' + encodeURIComponent(this.element.id),
			onComplete: Prototype.emptyFunction,
			onSuccess: function (transport) {
				this._form.removeClassName(this.options.loadingClassName);
				var text = transport.responseText;
				if (this.options.stripLoadedTextTags) text = text.stripTags();
				this._controls.editor.value = text;
				this._controls.editor.disabled = false;
				this.postProcessEditField()
			}.bind(this),
			onFailure: this._boundFailureHandler
		});
		new Ajax.Request(this.options.loadTextURL, options)
	},
	postProcessEditField: function () {
		var fpc = this.options.fieldPostCreation;
		if (fpc) $(this._controls.editor)['focus' == fpc ? 'focus': 'activate']()
	},
	prepareOptions: function () {
		this.options = Object.clone(Ajax.InPlaceEditor.DefaultOptions);
		Object.extend(this.options, Ajax.InPlaceEditor.DefaultCallbacks);
		[this._extraDefaultOptions].flatten().compact().each(function (defs) {
			Object.extend(this.options, defs)
		}.bind(this))
	},
	prepareSubmission: function () {
		this._saving = true;
		this.removeForm();
		this.leaveHover();
		this.showSaving()
	},
	registerListeners: function () {
		this._listeners = {};
		var listener;
		$H(Ajax.InPlaceEditor.Listeners).each(function (pair) {
			listener = this[pair.value].bind(this);
			this._listeners[pair.key] = listener;
			if (!this.options.externalControlOnly) this.element.observe(pair.key, listener);
			if (this.options.externalControl) this.options.externalControl.observe(pair.key, listener)
		}.bind(this))
	},
	removeForm: function () {
		if (!this._form) return;
		this._form.remove();
		this._form = null;
		this._controls = {}
	},
	showSaving: function () {
		this._oldInnerHTML = this.element.innerHTML;
		this.element.innerHTML = this.options.savingText;
		this.element.addClassName(this.options.savingClassName);
		this.element.style.backgroundColor = this._originalBackground;
		this.element.show()
	},
	triggerCallback: function (cbName, arg) {
		if ('function' == typeof this.options[cbName]) {
			this.options[cbName](this, arg)
		}
	},
	unregisterListeners: function () {
		$H(this._listeners).each(function (pair) {
			if (!this.options.externalControlOnly) this.element.stopObserving(pair.key, pair.value);
			if (this.options.externalControl) this.options.externalControl.stopObserving(pair.key, pair.value)
		}.bind(this))
	},
	wrapUp: function (transport) {
		this.leaveEditMode();
		this._boundComplete(transport, this.element)
	}
});
Object.extend(Ajax.InPlaceEditor.prototype, {
	dispose: Ajax.InPlaceEditor.prototype.destroy
});
Ajax.InPlaceCollectionEditor = Class.create(Ajax.InPlaceEditor, {
	initialize: function ($super, element, url, options) {
		this._extraDefaultOptions = Ajax.InPlaceCollectionEditor.DefaultOptions;
		$super(element, url, options)
	},
	createEditField: function () {
		var list = document.createElement('select');
		list.name = this.options.paramName;
		list.size = 1;
		this._controls.editor = list;
		this._collection = this.options.collection || [];
		if (this.options.loadCollectionURL) this.loadCollection();
		else this.checkForExternalText();
		this._form.appendChild(this._controls.editor)
	},
	loadCollection: function () {
		this._form.addClassName(this.options.loadingClassName);
		this.showLoadingText(this.options.loadingCollectionText);
		var options = Object.extend({
			method: 'get'
		},
		this.options.ajaxOptions);
		Object.extend(options, {
			parameters: 'editorId=' + encodeURIComponent(this.element.id),
			onComplete: Prototype.emptyFunction,
			onSuccess: function (transport) {
				var js = transport.responseText.strip();
				if (!/^\[.*\]$/.test(js)) throw 'Server returned an invalid collection representation.';
				this._collection = eval(js);
				this.checkForExternalText()
			}.bind(this),
			onFailure: this.onFailure
		});
		new Ajax.Request(this.options.loadCollectionURL, options)
	},
	showLoadingText: function (text) {
		this._controls.editor.disabled = true;
		var tempOption = this._controls.editor.firstChild;
		if (!tempOption) {
			tempOption = document.createElement('option');
			tempOption.value = '';
			this._controls.editor.appendChild(tempOption);
			tempOption.selected = true
		}
		tempOption.update((text || '').stripScripts().stripTags())
	},
	checkForExternalText: function () {
		this._text = this.getText();
		if (this.options.loadTextURL) this.loadExternalText();
		else this.buildOptionList()
	},
	loadExternalText: function () {
		this.showLoadingText(this.options.loadingText);
		var options = Object.extend({
			method: 'get'
		},
		this.options.ajaxOptions);
		Object.extend(options, {
			parameters: 'editorId=' + encodeURIComponent(this.element.id),
			onComplete: Prototype.emptyFunction,
			onSuccess: function (transport) {
				this._text = transport.responseText.strip();
				this.buildOptionList()
			}.bind(this),
			onFailure: this.onFailure
		});
		new Ajax.Request(this.options.loadTextURL, options)
	},
	buildOptionList: function () {
		this._form.removeClassName(this.options.loadingClassName);
		this._collection = this._collection.map(function (entry) {
			return 2 === entry.length ? entry: [entry, entry].flatten()
		});
		var marker = ('value' in this.options) ? this.options.value: this._text;
		var textFound = this._collection.any(function (entry) {
			return entry[0] == marker
		}.bind(this));
		this._controls.editor.update('');
		var option;
		this._collection.each(function (entry, index) {
			option = document.createElement('option');
			option.value = entry[0];
			option.selected = textFound ? entry[0] == marker: 0 == index;
			option.appendChild(document.createTextNode(entry[1]));
			this._controls.editor.appendChild(option)
		}.bind(this));
		this._controls.editor.disabled = false;
		Field.scrollFreeActivate(this._controls.editor)
	}
});
Ajax.InPlaceEditor.prototype.initialize.dealWithDeprecatedOptions = function (options) {
	if (!options) return;
	function fallback(name, expr) {
		if (name in options || expr === undefined) return;
		options[name] = expr
	};
	fallback('cancelControl', (options.cancelLink ? 'link': (options.cancelButton ? 'button': options.cancelLink == options.cancelButton == false ? false: undefined)));
	fallback('okControl', (options.okLink ? 'link': (options.okButton ? 'button': options.okLink == options.okButton == false ? false: undefined)));
	fallback('highlightColor', options.highlightcolor);
	fallback('highlightEndColor', options.highlightendcolor)
};
Object.extend(Ajax.InPlaceEditor, {
	DefaultOptions: {
		ajaxOptions: {},
		autoRows: 3,
		cancelControl: 'link',
		cancelText: 'cancel',
		clickToEditText: 'Click to edit',
		externalControl: null,
		externalControlOnly: false,
		fieldPostCreation: 'activate',
		formClassName: 'inplaceeditor-form',
		formId: null,
		highlightColor: '#ffff99',
		highlightEndColor: '#ffffff',
		hoverClassName: '',
		htmlResponse: true,
		loadingClassName: 'inplaceeditor-loading',
		loadingText: 'Loading...',
		okControl: 'button',
		okText: 'ok',
		paramName: 'value',
		rows: 1,
		savingClassName: 'inplaceeditor-saving',
		savingText: 'Saving...',
		size: 0,
		stripLoadedTextTags: false,
		submitOnBlur: false,
		textAfterControls: '',
		textBeforeControls: '',
		textBetweenControls: ''
	},
	DefaultCallbacks: {
		callback: function (form) {
			return Form.serialize(form)
		},
		onComplete: function (transport, element) {
			new Effect.Highlight(element, {
				startcolor: this.options.highlightColor,
				keepBackgroundImage: true
			})
		},
		onEnterEditMode: null,
		onEnterHover: function (ipe) {
			ipe.element.style.backgroundColor = ipe.options.highlightColor;
			if (ipe._effect) ipe._effect.cancel()
		},
		onFailure: function (transport, ipe) {
			alert('Error communication with the server: ' + transport.responseText.stripTags())
		},
		onFormCustomization: null,
		onLeaveEditMode: null,
		onLeaveHover: function (ipe) {
			ipe._effect = new Effect.Highlight(ipe.element, {
				startcolor: ipe.options.highlightColor,
				endcolor: ipe.options.highlightEndColor,
				restorecolor: ipe._originalBackground,
				keepBackgroundImage: true
			})
		}
	},
	Listeners: {
		click: 'enterEditMode',
		keydown: 'checkForEscapeOrReturn',
		mouseover: 'enterHover',
		mouseout: 'leaveHover'
	}
});
Ajax.InPlaceCollectionEditor.DefaultOptions = {
	loadingCollectionText: 'Loading options...'
};
Form.Element.DelayedObserver = Class.create({
	initialize: function (element, delay, callback) {
		this.delay = delay || 0.5;
		this.element = $(element);
		this.callback = callback;
		this.timer = null;
		this.lastValue = $F(this.element);
		Event.observe(this.element, 'keyup', this.delayedListener.bindAsEventListener(this))
	},
	delayedListener: function (event) {
		if (this.lastValue == $F(this.element)) return;
		if (this.timer) clearTimeout(this.timer);
		this.timer = setTimeout(this.onTimerEvent.bind(this), this.delay * 1000);
		this.lastValue = $F(this.element)
	},
	onTimerEvent: function () {
		this.timer = null;
		this.callback(this.element, $F(this.element))
	}
});
var Shadower = {
	shadow: function (element) {
		element = $(element);
		var options = Object.extend({
			distance: 8,
			angle: 130,
			opacity: 0.7,
			nestedShadows: 4,
			color: '#000000'
		},
		arguments[1] || {});
		this.options = options;
		var positionStyle = Element.getStyle(element, 'position');
		var parent = element.parentNode;
		if (!element.shadowZIndex) {
			if (positionStyle != 'absolute' && positionStyle != 'fixed') {
				var placeHolder = this.idSafeClone(element);
				placeHolder.id = null;
				parent.insertBefore(placeHolder, element);
				Position.absolutize(element);
				Position.clone(placeHolder, element);
				element.style.margin = '0';
				placeHolder.style.visibility = 'hidden';
				positionStyle = 'absolute'
			}
			element.shadowZIndex = new Number(Element.getStyle(element, 'zIndex') ? Element.getStyle(element, 'zIndex') : 1);
			element.style.zIndex = element.shadowZIndex + options.nestedShadows
		}
		if (arguments[2]) {
			this.deshadow(element)
		}
		if (!element.shadows) {
			element.shadows = new Array(options.nestedShadows);
			for (var i = 0; i < options.nestedShadows; i++) {
				var shadow = new Element('div', {
					className: 'shadow_class'
				});
				Element.hide(shadow);
				shadow.appendChild(document.createTextNode(' '));
				if (parent) parent.appendChild(shadow);
				shadow.style.position = positionStyle;
				shadow.style.backgroundColor = options.color;
				Element.setOpacity(shadow, options.opacity / options.nestedShadows);
				shadow.style.zIndex = element.shadowZIndex + i;
				element.shadows[i] = shadow
			}
		}
		var legendHeight = this.getLegendHeight(element);
		Position.prepare();
		var offsets = Position.positionedOffset(element);
		var topOffset = -Math.cos( - options.angle * Math.PI / 180) * options.distance;
		var leftOffset = -Math.sin( - options.angle * Math.PI / 180) * options.distance;
		element.shadows.each(function (shadow, i) {
			shadow.style.top = Math.ceil(offsets[1] + topOffset + i + (legendHeight / 2)) + 'px';
			shadow.style.left = (offsets[0] + leftOffset + i) + 'px';
			shadow.style.width = (element.offsetWidth - (2 * i)) + 'px';
			shadow.style.height = (element.offsetHeight - (2 * i) - (legendHeight / 2)) + 'px';
			Element.show(shadow)
		})
	},
	showShadows: function (element) {
		if (!element.shadows) return;
		var options = this.options;
		var legendHeight = this.getLegendHeight(element);
		Position.prepare();
		var offsets = Position.positionedOffset(element);
		var topOffset = -Math.cos( - options.angle * Math.PI / 180) * options.distance;
		var leftOffset = -Math.sin( - options.angle * Math.PI / 180) * options.distance;
		if (element.shadowZIndex && element.getStyle('zIndex') && element.getStyle('zIndex') <= element.shadowZIndex) {
			element.setStyle({
				zIndex: element.shadowZIndex + 20
			})
		}
		element.shadows.each(function (shadow, i) {
			shadow.style.top = Math.ceil(offsets[1] + topOffset + i + (legendHeight / 2)) + 'px';
			shadow.style.left = (offsets[0] + leftOffset + i) + 'px';
			shadow.style.width = (element.offsetWidth - (2 * i)) + 'px';
			shadow.style.height = (element.offsetHeight - (2 * i) - (legendHeight / 2)) + 'px';
			Element.show(shadow)
		})
	},
	idSafeClone: function (node) {
		var clone = node.cloneNode(false);
		if (clone.hasAttribute && clone.hasAttribute('id')) {
			clone.removeAttribute('id')
		}
		var clonedChildren = $A(node.childNodes).collect(this.idSafeClone.bind(this));
		clonedChildren.each(function (child) {
			clone.appendChild(child)
		});
		return clone
	},
	getLegendHeight: function (element) {
		if (element.nodeName.toLowerCase() == 'fieldset') {
			var legend;
			$A(element.childNodes).each(function (child) {
				if (child.nodeName.toLowerCase() == 'legend') {
					legend = child;
					throw $break
				}
			});
			if (legend) {
				return Element.getDimensions(legend).height
			}
		}
		return 0
	},
	deshadow: function (element) {
		element = $(element);
		if (element.shadows) {
			element.shadows.each(Element.remove);
			element.shadows = null
		}
	},
	shadowWithClass: function (cssClass, options) {
		$$('.' + cssClass).each(function (element) {
			this.shadow(element, options)
		}.bind(this))
	}
};
if ((typeof Prototype == 'undefined') || (typeof Element == 'undefined') || (typeof Element.Methods == 'undefined') || parseFloat(Prototype.Version.split(".")[0] + "." + Prototype.Version.split(".")[1]) < 1.5) {
	throw ("Shadower requires the Prototype JavaScript framework >= 1.5.0")
}
Effect.Corner = Class.create();
Object.extend(Object.extend(Effect.Corner.prototype, Effect.Base.prototype), {
	hex2: function (s) {
		var s = parseInt(s).toString(16);
		return (s.length < 2) ? '0' + s: s
	},
	gpc: function (node) {
		for (; node && node.nodeName.toLowerCase() != 'html'; node = node.parentNode) {
			var v = Element.getStyle(node, 'backgroundColor');
			if (v.indexOf('rgb') >= 0) {
				rgb = v.match(/\d+/g);
				return '#' + this.hex2(rgb[0]) + this.hex2(rgb[1]) + this.hex2(rgb[2])
			}
			if (v && v != 'transparent') return v
		}
		return '#ffffff'
	},
	getW: function (i) {
		switch (this.fx) {
		case 'round':
			return Math.round(this.width * (1 - Math.cos(Math.asin(i / this.width))));
		case 'cool':
			return Math.round(this.width * (1 + Math.cos(Math.asin(i / this.width))));
		case 'sharp':
			return Math.round(this.width * (1 - Math.cos(Math.acos(i / this.width))));
		case 'bite':
			return Math.round(this.width * (Math.cos(Math.asin((this.width - i - 1) / this.width))));
		case 'slide':
			return Math.round(this.width * (Math.atan2(i, this.width / i)));
		case 'jut':
			return Math.round(this.width * (Math.atan2(this.width, (this.width - i - 1))));
		case 'curl':
			return Math.round(this.width * (Math.atan(i)));
		case 'tear':
			return Math.round(this.width * (Math.cos(i)));
		case 'wicked':
			return Math.round(this.width * (Math.tan(i)));
		case 'long':
			return Math.round(this.width * (Math.sqrt(i)));
		case 'sculpt':
			return Math.round(this.width * (Math.log((this.width - i - 1), this.width)));
		case 'dog':
			return (i & 1) ? (i + 1) : this.width;
		case 'dog2':
			return (i & 2) ? (i + 1) : this.width;
		case 'dog3':
			return (i & 3) ? (i + 1) : this.width;
		case 'fray':
			return (i % 2) * this.width;
		case 'notch':
			return this.width;
		case 'bevel':
			return i + 1
		}
	},
	initialize: function (element, o) {
		element = $(element);
		o = (o || "").toLowerCase();
		var keep = /keep/.test(o);
		var cc = ((o.match(/cc:(#[0-9a-f]+)/) || [])[1]);
		var sc = ((o.match(/sc:(#[0-9a-f]+)/) || [])[1]);
		this.width = parseInt((o.match(/(\d+)px/) || [])[1]) || 10;
		var re = /round|bevel|notch|bite|cool|sharp|slide|jut|curl|tear|fray|wicked|sculpt|long|dog3|dog2|dog/;
		this.fx = ((o.match(re) || ['round'])[0]);
		var edges = {
			T: 0,
			B: 1
		};
		var opts = {
			TL: /top|tl/.test(o),
			TR: /top|tr/.test(o),
			BL: /bottom|bl/.test(o),
			BR: /bottom|br/.test(o)
		};
		if (!opts.TL && !opts.TR && !opts.BL && !opts.BR) opts = {
			TL: 1,
			TR: 1,
			BL: 1,
			BR: 1
		};
		var strip = document.createElement('div');
		strip.style.overflow = 'hidden';
		strip.style.height = '1px';
		strip.style.backgroundColor = sc || 'transparent';
		strip.style.borderStyle = 'solid';
		var pad = {
			T: parseInt(Element.getStyle(element, 'paddingTop')) || 0,
			R: parseInt(Element.getStyle(element, 'paddingRight')) || 0,
			B: parseInt(Element.getStyle(element, 'paddingBottom')) || 0,
			L: parseInt(Element.getStyle(element, 'paddingLeft')) || 0
		};
		if (/MSIE/.test(navigator.userAgent)) element.style.zoom = 1;
		if (!keep) element.style.border = 'none';
		strip.style.borderColor = cc || this.gpc(element.parentNode);
		var cssHeight = Element.getHeight(element);
		for (var j in edges) {
			var bot = edges[j];
			strip.style.borderStyle = 'none ' + (opts[j + 'R'] ? 'solid': 'none') + ' none ' + (opts[j + 'L'] ? 'solid': 'none');
			var d = document.createElement('div');
			var ds = d.style;
			bot ? element.appendChild(d) : element.insertBefore(d, element.firstChild);
			if (bot && cssHeight != 'auto') {
				if (Element.getStyle(element, 'position') == 'static') element.style.position = 'relative';
				ds.position = 'absolute';
				ds.bottom = ds.left = ds.padding = ds.margin = '0';
				if (/MSIE/.test(navigator.userAgent)) ds.setExpression('width', 'this.parentNode.offsetWidth');
				else ds.width = '100%'
			} else {
				ds.margin = !bot ? '-' + pad.T + 'px -' + pad.R + 'px ' + (pad.T - this.width) + 'px -' + pad.L + 'px': (pad.B - this.width) + 'px -' + pad.R + 'px -' + pad.B + 'px -' + pad.L + 'px'
			}
			for (var i = 0; i < this.width; i++) {
				var w = Math.max(0, this.getW(i));
				var e = strip.cloneNode(false);
				e.style.borderWidth = '0 ' + (opts[j + 'R'] ? w: 0) + 'px 0 ' + (opts[j + 'L'] ? w: 0) + 'px';
				bot ? d.appendChild(e) : d.insertBefore(e, d.firstChild)
			}
		}
	}
});
var resourcesFolder = ajxpResourcesFolder;
var webFXTreeConfig = {
	rootIcon: resourcesFolder + '/images/foldericon.png',
	openRootIcon: resourcesFolder + '/images/openfoldericon.png',
	folderIcon: resourcesFolder + '/images/foldericon.png',
	openFolderIcon: resourcesFolder + '/images/openfoldericon.png',
	fileIcon: resourcesFolder + '/images/foldericon.png',
	iIcon: resourcesFolder + '/images/I.png',
	lIcon: resourcesFolder + '/images/L.png',
	lMinusIcon: resourcesFolder + '/images/Lminus.png',
	lPlusIcon: resourcesFolder + '/images/Lplus.png',
	lMinusIconActive: resourcesFolder + '/images/Lminus-active.png',
	lPlusIconActive: resourcesFolder + '/images/Lplus-active.png',
	tIcon: resourcesFolder + '/images/T.png',
	tMinusIcon: resourcesFolder + '/images/Tminus.png',
	tPlusIcon: resourcesFolder + '/images/Tplus.png',
	tMinusIconActive: resourcesFolder + '/images/Tminus-active.png',
	tPlusIconActive: resourcesFolder + '/images/Tplus-active.png',
	blankIcon: resourcesFolder + '/images/blank.png',
	defaultText: 'Tree Item',
	defaultAction: 'javascript:void(0);',
	defaultBehavior: 'classic',
	zipRegexp: new RegExp(/\.zip$/),
	usePersistence: true
};
var webFXTreeHandler = {
	idCounter: 0,
	idPrefix: "webfx-tree-object-",
	all: {},
	behavior: null,
	selected: null,
	contextMenu: null,
	onSelect: null,
	getId: function () {
		return this.idPrefix + this.idCounter++
	},
	toggle: function (oItem) {
		this.all[oItem.id.replace('-plus', '')].toggle()
	},
	select: function (oItem) {
		this.all[oItem.id.replace('-icon', '')].select()
	},
	hasFocus: false,
	focus: function (oItem) {
		this.all[oItem.id.replace('-anchor', '')].focus()
	},
	blur: function (oItem) {
		this.all[oItem.id.replace('-anchor', '')].blur()
	},
	setFocus: function (bFocus) {
		this.hasFocus = bFocus
	},
	keydown: function (oItem, e) {
		return this.all[oItem.id].keydown(e.keyCode)
	},
	linkKeyPress: function (oItem, e) {
		if (!this.hasFocus || e.keyCode == 9) return false;
		return true
	},
	cookies: new WebFXCookie(),
	ajxpNodes: {},
	insertHTMLBeforeEnd: function (oElement, sHTML) {
		if (oElement.insertAdjacentHTML != null) {
			oElement.insertAdjacentHTML("BeforeEnd", sHTML);
			return
		}
		var df;
		var r = oElement.ownerDocument.createRange();
		r.selectNodeContents(oElement);
		r.collapse(false);
		df = r.createContextualFragment(sHTML);
		oElement.appendChild(df)
	}
};
function WebFXCookie() {
	if (document.cookie.length) {
		this.cookies = ' ' + document.cookie
	}
}
WebFXCookie.prototype.setCookie = function (key, value) {
	document.cookie = key + "=" + escape(value)
};
WebFXCookie.prototype.getCookie = function (key) {
	if (this.cookies) {
		var start = this.cookies.indexOf(' ' + key + '=');
		if (start == -1) {
			return null
		}
		var end = this.cookies.indexOf(";", start);
		if (end == -1) {
			end = this.cookies.length
		}
		end -= start;
		var cookie = this.cookies.substr(start, end);
		return unescape(cookie.substr(cookie.indexOf('=') + 1, cookie.length - cookie.indexOf('=') + 1))
	} else {
		return null
	}
};
function WebFXTreeAbstractNode(sText, sAction) {
	this.childNodes = [];
	this.id = webFXTreeHandler.getId();
	this.text = sText || webFXTreeConfig.defaultText;
	this.action = sAction || webFXTreeConfig.defaultAction;
	this.url = "/";
	this._last = false;
	webFXTreeHandler.all[this.id] = this
}
WebFXTreeAbstractNode.prototype.add = function (node, bNoIdent) {
	node.parentNode = this;
	var url = node.parentNode.url;
	if (url == "/") url = "";
	if (node.isRecycle || node.ajxpNode) {
		node.url = url + "/" + getBaseName(node.filename)
	} else {
		node.url = url + "/" + node.text
	}
	if (node.parentNode.inZip) node.inZip = true;
	else {
		if (webFXTreeConfig.zipRegexp.test(node.text) !== false) {
			node.inZip = true
		}
	}
	this.childNodes[this.childNodes.length] = node;
	var root = this;
	if (this.childNodes.length >= 2) {
		this.childNodes[this.childNodes.length - 2]._last = false
	}
	while (root.parentNode) {
		root = root.parentNode
	}
	if (root.rendered) {
		if (this.childNodes.length >= 2) {
			document.getElementById(this.childNodes[this.childNodes.length - 2].id + '-plus').src = ((this.childNodes[this.childNodes.length - 2].folder) ? ((this.childNodes[this.childNodes.length - 2].open) ? webFXTreeConfig.tMinusIcon: webFXTreeConfig.tPlusIcon) : webFXTreeConfig.tIcon);
			this.childNodes[this.childNodes.length - 2].plusIcon = webFXTreeConfig.tPlusIcon;
			this.childNodes[this.childNodes.length - 2].minusIcon = webFXTreeConfig.tMinusIcon;
			this.childNodes[this.childNodes.length - 2]._last = false
		}
		this._last = true;
		var foo = this;
		while (foo.parentNode) {
			for (var i = 0; i < foo.parentNode.childNodes.length; i++) {
				if (foo.id == foo.parentNode.childNodes[i].id) {
					break
				}
			}
			if (i == foo.parentNode.childNodes.length - 1) {
				foo.parentNode._last = true
			} else {
				foo.parentNode._last = false
			}
			foo = foo.parentNode
		}
		webFXTreeHandler.insertHTMLBeforeEnd(document.getElementById(this.id + '-cont'), node.toString());
		if (!node.inZip) {
			AjxpDroppables.add(node.id)
		}
		if (webFXTreeHandler.contextMenu) {
			var action = '';
			Event.observe(node.id + '-anchor', 'contextmenu', function (e) {
				ajaxplorer.focusOn(ajaxplorer.foldersTree);
				eval(this.action)
			}.bind(node));
			webFXTreeHandler.contextMenu.addElements('#' + node.id + '-anchor')
		}
		Event.observe(node.id + '-anchor', 'click', function (e) {
			ajaxplorer.focusOn(ajaxplorer.foldersTree);
			eval(this.action);
			Event.stop(e)
		}.bind(node));
		if ((!this.folder) && (!this.openIcon)) {
			this.icon = webFXTreeConfig.folderIcon;
			this.openIcon = webFXTreeConfig.openFolderIcon
		}
		if (!this.folder) {
			this.folder = true;
			this.collapse(true)
		}
		if (!bNoIdent) {
			this.indent()
		}
	}
	return node
};
WebFXTreeAbstractNode.prototype.toggle = function () {
	if (this.folder) {
		if (this.open) {
			this.collapse()
		} else {
			this.expand()
		}
	}
};
WebFXTreeAbstractNode.prototype.select = function () {
	document.getElementById(this.id + '-anchor').focus()
};
WebFXTreeAbstractNode.prototype.deSelect = function () {
	document.getElementById(this.id + '-anchor').className = '';
	webFXTreeHandler.selected = null;
	document.getElementById(this.id).className = 'webfx-tree-item'
};
WebFXTreeAbstractNode.prototype.focus = function () {
	if ((webFXTreeHandler.selected) && (webFXTreeHandler.selected != this)) {
		webFXTreeHandler.selected.deSelect()
	}
	webFXTreeHandler.selected = this;
	if ((this.openIcon) && (webFXTreeHandler.behavior != 'classic')) {
		document.getElementById(this.id + '-icon').src = this.openIcon
	}
	try {
		document.getElementById(this.id + '-anchor').focus()
	} catch(e) {}
	document.getElementById(this.id).className = 'webfx-tree-item selected-webfx-tree-item';
	if (webFXTreeHandler.onSelect) {
		webFXTreeHandler.onSelect(this)
	}
};
WebFXTreeAbstractNode.prototype.blur = function () {
	if ((this.openIcon) && (webFXTreeHandler.behavior != 'classic')) {
		document.getElementById(this.id + '-icon').src = this.icon
	}
	if (webFXTreeHandler.selected == this) {
		document.getElementById(this.id).className = 'webfx-tree-item selected-webfx-tree-item-inactive'
	} else {
		document.getElementById(this.id).className = 'webfx-tree-item'
	}
	if (Prototype.Browser.IE) {
		document.getElementById(this.id + '-anchor').blur()
	}
};
WebFXTreeAbstractNode.prototype.doExpand = function () {
	if (webFXTreeHandler.behavior == 'classic') {
		document.getElementById(this.id + '-icon').src = this.openIcon
	}
	if (this.childNodes.length) {
		document.getElementById(this.id + '-cont').style.display = 'block'
	}
	this.open = true;
	if (webFXTreeConfig.usePersistence) {
		webFXTreeHandler.cookies.setCookie(this.id.substr(18, this.id.length - 18), '1')
	}
};
WebFXTreeAbstractNode.prototype.doCollapse = function () {
	if (webFXTreeHandler.behavior == 'classic') {
		document.getElementById(this.id + '-icon').src = this.icon
	}
	if (this.childNodes.length) {
		document.getElementById(this.id + '-cont').style.display = 'none'
	}
	this.open = false;
	if (webFXTreeConfig.usePersistence) {
		webFXTreeHandler.cookies.setCookie(this.id.substr(18, this.id.length - 18), '0')
	}
};
WebFXTreeAbstractNode.prototype.expandAll = function () {
	this.expandChildren();
	if ((this.folder) && (!this.open)) {
		this.expand()
	}
};
WebFXTreeAbstractNode.prototype.expandChildren = function () {
	for (var i = 0; i < this.childNodes.length; i++) {
		this.childNodes[i].expandAll()
	}
};
WebFXTreeAbstractNode.prototype.collapseAll = function () {
	this.collapseChildren();
	if ((this.folder) && (this.open)) {
		this.collapse(true)
	}
};
WebFXTreeAbstractNode.prototype.collapseChildren = function () {
	for (var i = 0; i < this.childNodes.length; i++) {
		this.childNodes[i].collapseAll()
	}
};
WebFXTreeAbstractNode.prototype.indent = function (lvl, del, last, level, nodesLeft) {
	if (lvl == null) {
		lvl = -2
	}
	var state = 0;
	for (var i = this.childNodes.length - 1; i >= 0; i--) {
		state = this.childNodes[i].indent(lvl + 1, del, last, level);
		if (state) {
			return
		}
	}
	if (del) {
		if ((level >= this._level) && (document.getElementById(this.id + '-plus'))) {
			if (this.folder) {
				document.getElementById(this.id + '-plus').src = (this.open) ? webFXTreeConfig.lMinusIcon: webFXTreeConfig.lPlusIcon;
				this.plusIcon = webFXTreeConfig.lPlusIcon;
				this.minusIcon = webFXTreeConfig.lMinusIcon
			} else if (nodesLeft) {
				document.getElementById(this.id + '-plus').src = webFXTreeConfig.lIcon
			}
			return 1
		}
	}
	var foo = document.getElementById(this.id + '-indent-' + lvl);
	if (foo) {
		if ((foo._last) || ((del) && (last))) {
			foo.src = webFXTreeConfig.blankIcon
		} else {
			foo.src = webFXTreeConfig.iIcon
		}
	}
	return 0
};
function WebFXTree(sText, sAction, sBehavior, sIcon, sOpenIcon) {
	this.base = WebFXTreeAbstractNode;
	this.base(sText, sAction);
	this.icon = sIcon || webFXTreeConfig.rootIcon;
	this.openIcon = sOpenIcon || webFXTreeConfig.openRootIcon;
	if (webFXTreeConfig.usePersistence) {
		this.open = (webFXTreeHandler.cookies.getCookie(this.id.substr(18, this.id.length - 18)) == '0') ? false: true
	} else {
		this.open = true
	}
	this.folder = true;
	this.rendered = false;
	this.onSelect = null;
	if (!webFXTreeHandler.behavior) {
		webFXTreeHandler.behavior = sBehavior || webFXTreeConfig.defaultBehavior
	}
}
WebFXTree.prototype = new WebFXTreeAbstractNode;
WebFXTree.prototype.setBehavior = function (sBehavior) {
	webFXTreeHandler.behavior = sBehavior
};
WebFXTree.prototype.getBehavior = function (sBehavior) {
	return webFXTreeHandler.behavior
};
WebFXTree.prototype.getSelected = function () {
	if (webFXTreeHandler.selected) {
		return webFXTreeHandler.selected
	} else {
		return null
	}
};
WebFXTree.prototype.remove = function () {};
WebFXTree.prototype.expand = function () {
	this.doExpand()
};
WebFXTree.prototype.collapse = function (b) {
	if (!b) {
		this.focus()
	}
	this.doCollapse()
};
WebFXTree.prototype.getFirst = function () {
	return null
};
WebFXTree.prototype.getLast = function () {
	return null
};
WebFXTree.prototype.getNextSibling = function () {
	return null
};
WebFXTree.prototype.getPreviousSibling = function () {
	return null
};
WebFXTree.prototype.keydown = function (key) {
	if (!webFXTreeHandler.hasFocus) return true;
	if (key == 9) return false;
	if (key == 39) {
		if (!this.open) {
			this.expand()
		} else if (this.childNodes.length) {
			this.childNodes[0].select()
		}
		return false
	}
	if (key == 37) {
		this.collapse();
		return false
	}
	if ((key == 40) && (this.open) && (this.childNodes.length)) {
		this.childNodes[0].select();
		var toExec = this.childNodes[0];
		if (WebFXtimer) clearTimeout(WebFXtimer);
		var jsString = "javascript:";
		WebFXtimer = window.setTimeout(function () {
			eval(toExec.action.substring(jsString.length))
		},
		1000);
		return false
	}
	return true
};
WebFXTree.prototype.toString = function () {
	if (position = this.action.indexOf("CURRENT_ID", 0) > 0) {
		this.action = this.action.replace(new RegExp("CURRENT_ID", "g"), '\'' + this.id + '\'')
	}
	if (this.ajxpNode) {
		webFXTreeHandler.ajxpNodes[this.folderFullName] = this.id
	}
	var str = "<div style=\"padding-top:2px; padding-left:2px;\"  id=\"" + this.id + "\" ondblclick=\"webFXTreeHandler.toggle(this);\" class=\"webfx-tree-item\" onkeydown=\"return webFXTreeHandler.keydown(this, event)\" filename=\"/\">" + "<img id=\"" + this.id + "-icon\" class=\"webfx-tree-icon\" src=\"" + ((webFXTreeHandler.behavior == 'classic' && this.open) ? this.openIcon: this.icon) + "\" onclick=\"webFXTreeHandler.select(this);\">" + "<a href=\"/\" id=\"" + this.id + "-anchor\" onkeydown=\"return webFXTreeHandler.linkKeyPress(this, event);\"  onfocus=\"webFXTreeHandler.focus(this);\" onblur=\"webFXTreeHandler.blur(this);\"" + (this.target ? " target=\"" + this.target + "\"": "") + ">" + this.text + "</a></div>" + "<div id=\"" + this.id + "-cont\" class=\"webfx-tree-container\" style=\"display: " + ((this.open) ? 'block': 'none') + ";\">";
	var sb = [];
	for (var i = 0; i < this.childNodes.length; i++) {
		sb[i] = this.childNodes[i].toString(i, this.childNodes.length)
	}
	this.rendered = true;
	return str + sb.join("") + "</div>"
};
function WebFXTreeItem(sText, sAction, eParent, sIcon, sOpenIcon) {
	this.base = WebFXTreeAbstractNode;
	this.base(sText, sAction);
	if (webFXTreeConfig.usePersistence) {
		this.open = (webFXTreeHandler.cookies.getCookie(this.id.substr(18, this.id.length - 18)) == '1') ? true: false
	} else {
		this.open = false
	}
	if (sIcon) {
		this.icon = sIcon
	}
	if (sOpenIcon) {
		this.openIcon = sOpenIcon
	}
	if (eParent) {
		eParent.add(this)
	}
}
WebFXTreeItem.prototype = new WebFXTreeAbstractNode;
WebFXTreeItem.prototype.remove = function () {
	if (!document.getElementById(this.id + '-plus')) return;
	var iconSrc = document.getElementById(this.id + '-plus').src;
	var parentNode = this.parentNode;
	var prevSibling = this.getPreviousSibling(true);
	var nextSibling = this.getNextSibling(true);
	var folder = this.parentNode.folder;
	var last = ((nextSibling) && (nextSibling.parentNode) && (nextSibling.parentNode.id == parentNode.id)) ? false: true;
	this.getPreviousSibling().focus();
	this._remove();
	Droppables.remove($(this.id));
	if (webFXTreeHandler.contextMenu) webFXTreeHandler.contextMenu.removeElements('#' + this.id);
	if (parentNode.childNodes.length == 0) {
		document.getElementById(parentNode.id + '-cont').style.display = 'none';
		parentNode.doCollapse();
		parentNode.folder = false;
		parentNode.open = false
	}
	if (!nextSibling || last) {
		parentNode.indent(null, true, last, this._level, parentNode.childNodes.length)
	}
	if ((prevSibling == parentNode) && !(parentNode.childNodes.length)) {
		prevSibling.folder = false;
		prevSibling.open = false;
		if (document.getElementById(prevSibling.id + '-plus')) {
			iconSrc = document.getElementById(prevSibling.id + '-plus').src;
			iconSrc = iconSrc.replace('minus', '').replace('plus', '');
			document.getElementById(prevSibling.id + '-plus').src = iconSrc;
			document.getElementById(prevSibling.id + '-icon').src = (webFXTreeHandler.all[prevSibling.id].icon ? webFXTreeHandler.all[prevSibling.id].icon: webFXTreeConfig.fileIcon)
		}
	}
	if (document.getElementById(prevSibling.id + '-plus')) {
		if (parentNode == prevSibling.parentNode) {
			iconSrc = iconSrc.replace('minus', '').replace('plus', '');
			document.getElementById(prevSibling.id + '-plus').src = iconSrc
		}
	}
};
WebFXTreeItem.prototype._remove = function () {
	for (var i = this.childNodes.length - 1; i >= 0; i--) {
		this.childNodes[i]._remove()
	}
	for (var i = 0; i < this.parentNode.childNodes.length; i++) {
		if (this == this.parentNode.childNodes[i]) {
			for (var j = i; j < this.parentNode.childNodes.length; j++) {
				this.parentNode.childNodes[j] = this.parentNode.childNodes[j + 1]
			}
			this.parentNode.childNodes.length -= 1;
			if (i + 1 == this.parentNode.childNodes.length) {
				this.parentNode._last = true
			}
			break
		}
	}
	webFXTreeHandler.all[this.id] = null;
	var tmp = document.getElementById(this.id);
	if (tmp) {
		tmp.parentNode.removeChild(tmp)
	}
	tmp = document.getElementById(this.id + '-cont');
	if (tmp) {
		tmp.parentNode.removeChild(tmp)
	}
};
WebFXTreeItem.prototype.expand = function () {
	this.doExpand();
	document.getElementById(this.id + '-plus').src = this.minusIcon
};
WebFXTreeItem.prototype.collapse = function (b) {
	if (!b) {
		this.focus()
	}
	this.doCollapse();
	document.getElementById(this.id + '-plus').src = this.plusIcon
};
WebFXTreeItem.prototype.getFirst = function () {
	return this.childNodes[0]
};
WebFXTreeItem.prototype.getLast = function () {
	if (this.childNodes[this.childNodes.length - 1].open) {
		return this.childNodes[this.childNodes.length - 1].getLast()
	} else {
		return this.childNodes[this.childNodes.length - 1]
	}
};
WebFXTreeItem.prototype.getNextSibling = function () {
	for (var i = 0; i < this.parentNode.childNodes.length; i++) {
		if (this == this.parentNode.childNodes[i]) {
			break
		}
	}
	if (++i == this.parentNode.childNodes.length) {
		return this.parentNode.getNextSibling()
	} else {
		return this.parentNode.childNodes[i]
	}
};
WebFXTreeItem.prototype.getPreviousSibling = function (b) {
	for (var i = 0; i < this.parentNode.childNodes.length; i++) {
		if (this == this.parentNode.childNodes[i]) {
			break
		}
	}
	if (i == 0) {
		return this.parentNode
	} else {
		if ((this.parentNode.childNodes[--i].open) || (b && this.parentNode.childNodes[i].folder)) {
			return this.parentNode.childNodes[i].getLast()
		} else {
			return this.parentNode.childNodes[i]
		}
	}
};
WebFXTreeItem.prototype.getCurrentPlusIcon = function () {
	return ((this.folder) ? ((this.open) ? ((this.parentNode._last) ? "lMinusIcon": "tMinusIcon") : ((this.parentNode._last) ? "lPlusIcon": "tPlusIcon")) : ((this.parentNode._last) ? "lIcon": "tIcon"))
};
var WebFXtimer;
WebFXTreeItem.prototype.keydown = function (key) {
	if (!webFXTreeHandler.hasFocus) return true;
	else if (key == 9) {
		return false
	}
	if ((key == 39) && (this.folder)) {
		if (!this.open) {
			this.expand()
		} else {
			this.getFirst().select()
		}
		return false
	} else if (key == 37) {
		if (this.open) {
			this.collapse()
		} else {
			this.parentNode.select()
		}
		return false
	} else if (key == 40) {
		if (this.open) {
			this.getFirst().select();
			var toExec = this.getFirst();
			if (WebFXtimer) clearTimeout(WebFXtimer);
			var jsString = "javascript:";
			WebFXtimer = window.setTimeout(function () {
				eval(toExec.action.substring(jsString.length))
			},
			1000)
		} else {
			var sib = this.getNextSibling();
			if (sib) {
				sib.select();
				if (WebFXtimer) clearTimeout(WebFXtimer);
				var jsString = "javascript:";
				WebFXtimer = window.setTimeout(function () {
					eval(sib.action.substring(jsString.length))
				},
				1000)
			}
		}
		return false
	} else if (key == 38) {
		var sib = this.getPreviousSibling();
		sib.select();
		if (WebFXtimer) clearTimeout(WebFXtimer);
		var jsString = "javascript:";
		WebFXtimer = window.setTimeout(function () {
			eval(sib.action.substring(jsString.length))
		},
		1000);
		return false
	}
	return true
};
WebFXTreeItem.prototype.toString = function (nItem, nItemCount) {
	var foo = this.parentNode;
	var indent = '';
	if (nItem + 1 == nItemCount) {
		this.parentNode._last = true
	}
	var i = 0;
	while (foo.parentNode) {
		foo = foo.parentNode;
		indent = "<img id=\"" + this.id + "-indent-" + i + "\" src=\"" + ((foo._last) ? webFXTreeConfig.blankIcon: webFXTreeConfig.iIcon) + "\" width=\"19\" height=\"20\">" + indent;
		i++
	}
	this._level = i;
	if (this.childNodes.length) {
		this.folder = 1
	} else {
		this.open = false
	}
	if ((this.folder) || (webFXTreeHandler.behavior != 'classic')) {
		if (!this.icon) {
			this.icon = webFXTreeConfig.folderIcon
		}
		if (!this.openIcon) {
			this.openIcon = webFXTreeConfig.openFolderIcon
		}
	} else if (!this.icon) {
		this.icon = webFXTreeConfig.fileIcon
	}
	if (position = this.action.indexOf("CURRENT_ID", 0) > 0) {
		this.action = this.action.replace(new RegExp("CURRENT_ID", "g"), '\'' + this.id + '\'')
	}
	var label = this.text.replace(/</g, '&lt;').replace(/>/g, '&gt;');
	var str = "<div id=\"" + this.id + "\" ondblclick=\"webFXTreeHandler.toggle(this);\" class=\"webfx-tree-item\" onkeydown=\"return webFXTreeHandler.keydown(this, event)\" filename=\"" + this.filename + "\">" + indent + "<img  width=\"19\" height=\"20\" id=\"" + this.id + "-plus\" src=\"" + ((this.folder) ? ((this.open) ? ((this.parentNode._last) ? webFXTreeConfig.lMinusIcon: webFXTreeConfig.tMinusIcon) : ((this.parentNode._last) ? webFXTreeConfig.lPlusIcon: webFXTreeConfig.tPlusIcon)) : ((this.parentNode._last) ? webFXTreeConfig.lIcon: webFXTreeConfig.tIcon)) + "\" onclick=\"webFXTreeHandler.toggle(this);\">" + "<a href=\"" + this.url + "\" id=\"" + this.id + "-anchor\" onkeydown=\"return webFXTreeHandler.linkKeyPress(this, event);\" onfocus=\"webFXTreeHandler.focus(this);\" onblur=\"webFXTreeHandler.blur(this);\"" + (this.target ? " target=\"" + this.target + "\"": "") + ">" + "<img id=\"" + this.id + "-icon\" class=\"webfx-tree-icon\" src=\"" + ((webFXTreeHandler.behavior == 'classic' && this.open) ? this.openIcon: this.icon) + "\">" + label + "</a></div>" + "<div id=\"" + this.id + "-cont\" class=\"webfx-tree-container\" style=\"display: " + ((this.open) ? 'block': 'none') + ";\">";
	var sb = [];
	for (var i = 0; i < this.childNodes.length; i++) {
		sb[i] = this.childNodes[i].toString(i, this.childNodes.length)
	}
	this.plusIcon = ((this.parentNode._last) ? webFXTreeConfig.lPlusIcon: webFXTreeConfig.tPlusIcon);
	this.minusIcon = ((this.parentNode._last) ? webFXTreeConfig.lMinusIcon: webFXTreeConfig.tMinusIcon);
	return str + sb.join("") + "</div>"
};
webFXTreeConfig.loadingText = "Loading...";
webFXTreeConfig.loadErrorTextTemplate = "Error loading \"%1%\"";
webFXTreeConfig.emptyErrorTextTemplate = "Error \"%1%\" does not contain any tree items";
function WebFXLoadTree(sText, sXmlSrc, sAction, sBehavior, sIcon, sOpenIcon, queryParameters) {
	this.WebFXTree = WebFXTree;
	this.WebFXTree(sText, sAction, sBehavior, sIcon, sOpenIcon);
	this.queryParameters = queryParameters;
	this.src = sXmlSrc + (this.queryParameters || "");
	this.loading = false;
	this.loaded = false;
	this.errorText = "";
	if (this.open) _startLoadXmlTree(this.src, this);
	else {
		this._loadingItem = new WebFXTreeItem(webFXTreeConfig.loadingText);
		this.add(this._loadingItem)
	}
}
WebFXLoadTree.prototype = new WebFXTree;
WebFXLoadTree.prototype._webfxtree_expand = WebFXTree.prototype.expand;
WebFXLoadTree.prototype.expand = function () {
	if (!this.loaded && !this.loading) {
		_startLoadXmlTree(this.src, this)
	}
	this._webfxtree_expand()
};
function WebFXLoadTreeItem(sText, sXmlSrc, sAction, eParent, sIcon, sOpenIcon) {
	this.WebFXTreeItem = WebFXTreeItem;
	this.WebFXTreeItem(sText, sAction, eParent, sIcon, sOpenIcon);
	this.queryParameters = (eParent && eParent.queryParameters ? eParent.queryParameters: null);
	this.src = sXmlSrc + (this.queryParameters || "");
	this.loading = false;
	this.loaded = false;
	this.errorText = "";
	if (this.open) _startLoadXmlTree(this.src, this);
	else {
		this._loadingItem = new WebFXTreeItem(webFXTreeConfig.loadingText);
		this.add(this._loadingItem)
	}
}
WebFXLoadTreeItem.prototype = new WebFXTreeItem;
WebFXLoadTreeItem.prototype._webfxtreeitem_expand = WebFXTreeItem.prototype.expand;
WebFXLoadTreeItem.prototype.expand = function () {
	if (!this.loaded && !this.loading) {
		_startLoadXmlTree(this.src, this)
	}
	this._webfxtreeitem_expand()
};
WebFXLoadTree.prototype.reload = WebFXLoadTreeItem.prototype.reload = function () {
	if (this.loaded) {
		var open = this.open;
		while (this.childNodes.length > 0) this.childNodes[this.childNodes.length - 1].remove();
		this.loaded = false;
		this._loadingItem = new WebFXTreeItem(webFXTreeConfig.loadingText);
		this.add(this._loadingItem);
		if (open) this.expand()
	} else if (this.open && !this.loading) _startLoadXmlTree(this.src, this);
	if (!this.open && !this.loading) this.toggle()
};
function _startLoadXmlTree(sSrc, jsNode) {
	if (jsNode.loading || jsNode.loaded) return;
	jsNode.loading = true;
	var connexion = new Connexion(encodeURI(decodeURIComponent(sSrc)).replace('&amp;', '&'));
	connexion.onComplete = function (transport) {
		_xmlFileLoaded(transport.responseXML, jsNode)
	};
	connexion.sendAsync()
}
function _xmlTreeToJsTree(oNode, parentNode) {
	var text = oNode.getAttribute("text");
	var action = oNode.getAttribute("action");
	if (!action) {
		action = "javascript:ajaxplorer.getFoldersTree().clickNode(CURRENT_ID)"
	}
	var parent = null;
	var icon = oNode.getAttribute("icon");
	if (icon.indexOf(ajxpResourcesFolder + "/") != 0) {
		icon = resolveImageSource(icon, "/images/crystal/mimes/ICON_SIZE", 16)
	}
	var openIcon = oNode.getAttribute("openicon");
	if (openIcon) {
		if (openIcon.indexOf(ajxpResourcesFolder + "/") != 0) {
			openIcon = resolveImageSource(openIcon, "/images/crystal/mimes/ICON_SIZE", 16)
		}
	} else {
		openIcon = icon
	}
	var src = oNode.getAttribute("src");
	if (parentNode && parentNode.queryParameters) {
		src = src + parentNode.queryParameters;
		var qParams = parentNode.queryParameters
	}
	var target = oNode.getAttribute("target");
	var preloaded = oNode.getAttribute("preloaded");
	var recycle = oNode.getAttribute("is_recycle");
	var folderFullName = oNode.getAttribute("filename");
	var jsNode;
	if (src != null && src != "") jsNode = new WebFXLoadTreeItem(text, src, action, parent, icon, openIcon);
	else jsNode = new WebFXTreeItem(text, action, parent, icon, openIcon);
	if (target != "") {
		jsNode.target = target
	}
	if (qParams) {
		jsNode.queryParameters = qParams
	}
	if (recycle != null && !(ajaxplorer && ajaxplorer.actionBar && ajaxplorer.actionBar.treeCopyActive)) {
		webFXTreeHandler.recycleNode = jsNode.id;
		jsNode.isRecycle = true
	}
	if (oNode.getAttribute('ajxp_node') && oNode.getAttribute('ajxp_node') == "true") {
		jsNode.ajxpNode = true;
		webFXTreeHandler.ajxpNodes[getBaseName(folderFullName)] = jsNode.id
	}
	if (oNode.getAttribute('ajxp_mime')) {
		jsNode.ajxpMime = oNode.getAttribute('ajxp_mime')
	}
	if (src != null && src != "" && preloaded != null && preloaded == 'true') {
		jsNode.loaded = true
	}
	jsNode.filename = folderFullName;
	var cs = oNode.childNodes;
	var l = cs.length;
	for (var i = 0; i < l; i++) {
		if (cs[i].tagName == "tree") jsNode.add(_xmlTreeToJsTree(cs[i], jsNode), true)
	}
	return jsNode
}
function _xmlFileLoaded(oXmlDoc, jsParentNode) {
	if (jsParentNode.loaded) return;
	var bIndent = false;
	var bAnyChildren = false;
	jsParentNode.loaded = true;
	jsParentNode.loading = false;
	if (oXmlDoc == null || oXmlDoc.documentElement == null) {
		jsParentNode.errorText = parseTemplateString(webFXTreeConfig.loadErrorTextTemplate, jsParentNode.src)
	} else {
		var root = oXmlDoc.documentElement;
		var cs = root.childNodes;
		var l = cs.length;
		for (var i = 0; i < l; i++) {
			if (cs[i].tagName == "tree") {
				bAnyChildren = true;
				bIndent = true;
				jsParentNode.add(_xmlTreeToJsTree(cs[i], jsParentNode), true)
			} else if (cs[i].tagName == "error") {
				jsParentNode.errorText = cs[i].firstChild.nodeValue
			}
		}
	}
	if (jsParentNode._loadingItem != null) {
		jsParentNode._loadingItem.remove();
		bIndent = true
	}
	if (bIndent) {
		jsParentNode.indent()
	}
	if (jsParentNode.errorText != "") {
		window.status = jsParentNode.errorText
	}
	if (ajaxplorer) ajaxplorer.foldersTree.asyncExpandAndSelect();
	if (modal.pageLoading) modal.updateLoadingProgress('Tree Loaded')
}
function parseTemplateString(sTemplate) {
	var args = arguments;
	var s = sTemplate;
	s = s.replace(/\%\%/g, "%");
	for (var i = 1; i < args.length; i++) s = s.replace(new RegExp("\%" + i + "\%", "g"), args[i]);
	return s
}
Slider.isSupported = typeof document.createElement != "undefined" && typeof document.documentElement != "undefined" && typeof document.documentElement.offsetWidth == "number";
function Slider(oElement, oInput, sOrientation) {
	if (!oElement) return;
	this._orientation = sOrientation || "horizontal";
	this._range = new Range();
	this._range.setExtent(0);
	this._blockIncrement = 10;
	this._unitIncrement = 1;
	this._timer = new Timer(100);
	if (Slider.isSupported && oElement) {
		this.document = oElement.ownerDocument || oElement.document;
		this.element = oElement;
		this.element.slider = this;
		this.element.unselectable = "on";
		this.element.className = this._orientation + " " + this.classNameTag + " " + this.element.className;
		this.line = this.document.createElement("DIV");
		this.line.className = "line";
		this.line.unselectable = "on";
		this.line.appendChild(this.document.createElement("DIV"));
		this.element.appendChild(this.line);
		this.handle = this.document.createElement("DIV");
		this.handle.className = "handle";
		this.handle.unselectable = "on";
		this.handle.appendChild(this.document.createElement("DIV"));
		this.handle.firstChild.appendChild(this.document.createTextNode(String.fromCharCode(160)));
		this.element.appendChild(this.handle)
	}
	this.input = oInput;
	var oThis = this;
	this._range.onchange = function () {
		oThis.recalculate();
		if (typeof oThis.onchange == "function") oThis.onchange()
	};
	if (Slider.isSupported && oElement) {
		this.element.onfocus = Slider.eventHandlers.onfocus;
		this.element.onblur = Slider.eventHandlers.onblur;
		this.element.onmousedown = Slider.eventHandlers.onmousedown;
		this.element.onmouseover = Slider.eventHandlers.onmouseover;
		this.element.onmouseout = Slider.eventHandlers.onmouseout;
		this.element.onmousewheel = Slider.eventHandlers.onmousewheel;
		this.element.onselectstart = function () {
			return false
		};
		this._timer.ontimer = function () {
			oThis.ontimer()
		};
		window.setTimeout(function () {
			oThis.recalculate()
		},
		1)
	} else {
		this.input.onchange = function (e) {
			oThis.setValue(oThis.input.value)
		}
	}
}
Slider.eventHandlers = {
	getEvent: function (e, el) {
		if (!e) {
			if (el) e = el.document.parentWindow.event;
			else e = window.event
		}
		if (!e.srcElement) {
			var el = e.target;
			while (el != null && el.nodeType != 1) el = el.parentNode;
			e.srcElement = el
		}
		if (typeof e.offsetX == "undefined") {
			e.offsetX = e.layerX;
			e.offsetY = e.layerY
		}
		return e
	},
	getDocument: function (e) {
		if (e.target) return e.target.ownerDocument;
		return e.srcElement.document
	},
	getSlider: function (e) {
		var el = e.target || e.srcElement;
		while (el != null && el.slider == null) {
			el = el.parentNode
		}
		if (el) return el.slider;
		return null
	},
	getLine: function (e) {
		var el = e.target || e.srcElement;
		while (el != null && el.className != "line") {
			el = el.parentNode
		}
		return el
	},
	getHandle: function (e) {
		var el = e.target || e.srcElement;
		var re = /handle/;
		while (el != null && !re.test(el.className)) {
			el = el.parentNode
		}
		return el
	},
	onfocus: function (e) {
		var s = this.slider;
		s._focused = true;
		s.handle.className = "handle hover"
	},
	onblur: function (e) {
		var s = this.slider;
		s._focused = false;
		s.handle.className = "handle"
	},
	onmouseover: function (e) {
		e = Slider.eventHandlers.getEvent(e, this);
		var s = this.slider;
		if (e.srcElement == s.handle) s.handle.className = "handle hover"
	},
	onmouseout: function (e) {
		e = Slider.eventHandlers.getEvent(e, this);
		var s = this.slider;
		if (e.srcElement == s.handle && !s._focused) s.handle.className = "handle"
	},
	onmousedown: function (e) {
		e = Slider.eventHandlers.getEvent(e, this);
		var s = this.slider;
		if (s.element.focus) s.element.focus();
		Slider._currentInstance = s;
		var doc = s.document;
		if (doc.addEventListener) {
			doc.addEventListener("mousemove", Slider.eventHandlers.onmousemove, true);
			doc.addEventListener("mouseup", Slider.eventHandlers.onmouseup, true)
		} else if (doc.attachEvent) {
			doc.attachEvent("onmousemove", Slider.eventHandlers.onmousemove);
			doc.attachEvent("onmouseup", Slider.eventHandlers.onmouseup);
			doc.attachEvent("onlosecapture", Slider.eventHandlers.onmouseup);
			s.element.setCapture()
		}
		if (Slider.eventHandlers.getHandle(e)) {
			Slider._sliderDragData = {
				screenX: e.screenX,
				screenY: e.screenY,
				dx: e.screenX - s.handle.offsetLeft,
				dy: e.screenY - s.handle.offsetTop,
				startValue: s.getValue(),
				slider: s
			}
		} else {
			var lineEl = Slider.eventHandlers.getLine(e);
			s._mouseX = e.offsetX + (lineEl ? s.line.offsetLeft: 0);
			s._mouseY = e.offsetY + (lineEl ? s.line.offsetTop: 0);
			s._increasing = null;
			s.ontimer()
		}
	},
	onmousemove: function (e) {
		e = Slider.eventHandlers.getEvent(e, this);
		if (Slider._sliderDragData) {
			var s = Slider._sliderDragData.slider;
			var boundSize = s.getMaximum() - s.getMinimum();
			var size, pos, reset;
			if (s._orientation == "horizontal") {
				size = s.element.offsetWidth - s.handle.offsetWidth;
				pos = e.screenX - Slider._sliderDragData.dx;
				reset = Math.abs(e.screenY - Slider._sliderDragData.screenY) > 100
			} else {
				size = s.element.offsetHeight - s.handle.offsetHeight;
				pos = s.element.offsetHeight - s.handle.offsetHeight - (e.screenY - Slider._sliderDragData.dy);
				reset = Math.abs(e.screenX - Slider._sliderDragData.screenX) > 100
			}
			s.setValue(reset ? Slider._sliderDragData.startValue: s.getMinimum() + boundSize * pos / size);
			return false
		} else {
			var s = Slider._currentInstance;
			if (s != null) {
				var lineEl = Slider.eventHandlers.getLine(e);
				s._mouseX = e.offsetX + (lineEl ? s.line.offsetLeft: 0);
				s._mouseY = e.offsetY + (lineEl ? s.line.offsetTop: 0)
			}
		}
	},
	onmouseup: function (e) {
		e = Slider.eventHandlers.getEvent(e, this);
		var s = Slider._currentInstance;
		var doc = s.document;
		if (doc.removeEventListener) {
			doc.removeEventListener("mousemove", Slider.eventHandlers.onmousemove, true);
			doc.removeEventListener("mouseup", Slider.eventHandlers.onmouseup, true)
		} else if (doc.detachEvent) {
			doc.detachEvent("onmousemove", Slider.eventHandlers.onmousemove);
			doc.detachEvent("onmouseup", Slider.eventHandlers.onmouseup);
			doc.detachEvent("onlosecapture", Slider.eventHandlers.onmouseup);
			s.element.releaseCapture()
		}
		if (Slider._sliderDragData) {
			Slider._sliderDragData = null
		} else {
			s._timer.stop();
			s._increasing = null
		}
		Slider._currentInstance = null
	},
	onkeydown: function (e) {
		e = Slider.eventHandlers.getEvent(e, this);
		var s = this.slider;
		var kc = e.keyCode;
		switch (kc) {
		case 33:
			s.setValue(s.getValue() + s.getBlockIncrement());
			break;
		case 34:
			s.setValue(s.getValue() - s.getBlockIncrement());
			break;
		case 35:
			s.setValue(s.getOrientation() == "horizontal" ? s.getMaximum() : s.getMinimum());
			break;
		case 36:
			s.setValue(s.getOrientation() == "horizontal" ? s.getMinimum() : s.getMaximum());
			break;
		case 38:
		case 39:
			s.setValue(s.getValue() + s.getUnitIncrement());
			break;
		case 37:
		case 40:
			s.setValue(s.getValue() - s.getUnitIncrement());
			break
		}
		if (kc >= 33 && kc <= 40) {
			return false
		}
	},
	onkeypress: function (e) {
		e = Slider.eventHandlers.getEvent(e, this);
		var kc = e.keyCode;
		if (kc >= 33 && kc <= 40) {
			return false
		}
	},
	onmousewheel: function (e) {
		e = Slider.eventHandlers.getEvent(e, this);
		var s = this.slider;
		if (s._focused) {
			s.setValue(s.getValue() + e.wheelDelta / 120 * s.getUnitIncrement());
			return false
		}
	}
};
Slider.prototype.classNameTag = "dynamic-slider-control",
Slider.prototype.setValue = function (v) {
	this._range.setValue(v);
	this.input.value = this.getValue()
};
Slider.prototype.getValue = function () {
	return this._range.getValue()
};
Slider.prototype.setMinimum = function (v) {
	this._range.setMinimum(v);
	this.input.value = this.getValue()
};
Slider.prototype.getMinimum = function () {
	return this._range.getMinimum()
};
Slider.prototype.setMaximum = function (v) {
	this._range.setMaximum(v);
	this.input.value = this.getValue()
};
Slider.prototype.getMaximum = function () {
	return this._range.getMaximum()
};
Slider.prototype.setUnitIncrement = function (v) {
	this._unitIncrement = v
};
Slider.prototype.getUnitIncrement = function () {
	return this._unitIncrement
};
Slider.prototype.setBlockIncrement = function (v) {
	this._blockIncrement = v
};
Slider.prototype.getBlockIncrement = function () {
	return this._blockIncrement
};
Slider.prototype.getOrientation = function () {
	return this._orientation
};
Slider.prototype.setOrientation = function (sOrientation) {
	if (sOrientation != this._orientation) {
		if (Slider.isSupported && this.element) {
			this.element.className = this.element.className.replace(this._orientation, sOrientation)
		}
		this._orientation = sOrientation;
		this.recalculate()
	}
};
Slider.prototype.recalculate = function () {
	if (!Slider.isSupported || !this.element) return;
	var w = this.element.offsetWidth;
	var h = this.element.offsetHeight;
	var hw = this.handle.offsetWidth;
	var hh = this.handle.offsetHeight;
	var lw = this.line.offsetWidth;
	var lh = this.line.offsetHeight;
	if (this._orientation == "horizontal") {
		this.handle.style.left = (w - hw) * (this.getValue() - this.getMinimum()) / (this.getMaximum() - this.getMinimum()) + "px";
		this.handle.style.top = (h - hh) / 2 + "px";
		this.line.style.top = (h - lh) / 2 + "px";
		this.line.style.left = hw / 2 + "px";
		this.line.style.width = Math.max(0, w - hw - 2) + "px";
		this.line.firstChild.style.width = Math.max(0, w - hw - 4) + "px"
	} else {
		this.handle.style.left = (w - hw) / 2 + "px";
		this.handle.style.top = h - hh - (h - hh) * (this.getValue() - this.getMinimum()) / (this.getMaximum() - this.getMinimum()) + "px";
		this.line.style.left = (w - lw) / 2 + "px";
		this.line.style.top = hh / 2 + "px";
		this.line.style.height = Math.max(0, h - hh - 2) + "px";
		this.line.firstChild.style.height = Math.max(0, h - hh - 4) + "px"
	}
};
Slider.prototype.ontimer = function () {
	var hw = this.handle.offsetWidth;
	var hh = this.handle.offsetHeight;
	var hl = this.handle.offsetLeft;
	var ht = this.handle.offsetTop;
	if (this._orientation == "horizontal") {
		if (this._mouseX > hl + hw && (this._increasing == null || this._increasing)) {
			this.setValue(this.getValue() + this.getBlockIncrement());
			this._increasing = true
		} else if (this._mouseX < hl && (this._increasing == null || !this._increasing)) {
			this.setValue(this.getValue() - this.getBlockIncrement());
			this._increasing = false
		}
	} else {
		if (this._mouseY > ht + hh && (this._increasing == null || !this._increasing)) {
			this.setValue(this.getValue() - this.getBlockIncrement());
			this._increasing = false
		} else if (this._mouseY < ht && (this._increasing == null || this._increasing)) {
			this.setValue(this.getValue() + this.getBlockIncrement());
			this._increasing = true
		}
	}
	this._timer.start()
};
Connexion = Class.create({
	initialize: function (baseUrl) {
		this._baseUrl = ajxpServerAccessPath;
		if (baseUrl) this._baseUrl = baseUrl;
		this._libUrl = ajxpResourcesFolder + '/js';
		this._parameters = new Hash();
		this._method = 'get';
		this.addParameter('get_action', 'ls')
	},
	addParameter: function (paramName, paramValue) {
		this._parameters.set(paramName, paramValue)
	},
	setParameters: function (hParameters) {
		this._parameters = $H(hParameters)
	},
	setMethod: function (method) {
		this._method = 'put'
	},
	sendAsync: function () {
		new Ajax.Request(this._baseUrl, {
			method: this._method,
			onComplete: this.applyComplete.bind(this),
			parameters: this._parameters.toObject()
		})
	},
	sendSync: function () {
		new Ajax.Request(this._baseUrl, {
			method: this._method,
			asynchronous: false,
			onComplete: this.applyComplete.bind(this),
			parameters: this._parameters.toObject()
		})
	},
	applyComplete: function (transport) {
		if (Prototype.Browser.Gecko && transport.responseXML && transport.responseXML.documentElement && transport.responseXML.documentElement.nodeName == "parsererror") {
			alert("Parsing error : \n" + transport.responseXML.documentElement.firstChild.textContent);
			if (ajaxplorer) ajaxplorer.displayMessage("ERROR", transport.responseText)
		} else if (Prototype.Browser.IE && transport.responseXML.parseError && transport.responseXML.parseError.errorCode != 0) {
			alert("Parsing Error : \n" + transport.responseXML.parseError.reason);
			if (ajaxplorer) ajaxplorer.displayMessage("ERROR", transport.responseText)
		} else if (transport.getAllResponseHeaders().indexOf("text/xml") > -1 && transport.responseXML == null) {
			alert("Unknown Parsing Error!");
			if (ajaxplorer) ajaxplorer.displayMessage("ERROR", transport.responseText)
		}
		this.onComplete(transport)
	},
	loadLibrary: function (fileName, onLoadedCode) {
		var path = (this._libUrl ? this._libUrl + '/' + fileName: fileName);
		new Ajax.Request(path, {
			method: 'get',
			asynchronous: false,
			onComplete: function (transport) {
				if (transport.responseText) {
					try {
						var script = transport.responseText;
						if (window.execScript) {
							window.execScript(script)
						} else {
							window.my_code = script;
							var script_tag = document.createElement('script');
							script_tag.type = 'text/javascript';
							script_tag.innerHTML = 'eval(window.my_code)';
							document.getElementsByTagName('head')[0].appendChild(script_tag)
						}
						if (onLoadedCode != null) onLoadedCode()
					} catch(e) {
						alert('error loading ' + fileName + ':' + e)
					}
				}
			}
		})
	}
});
function getBaseName(fileName) {
	if (fileName == null) return null;
	var separator = "/";
	if (fileName.indexOf("\\") != -1) separator = "\\";
	baseName = fileName.substr(fileName.lastIndexOf(separator) + 1, fileName.length);
	return baseName
}
function getRepName(fileName) {
	repName = fileName.substr(0, fileName.lastIndexOf("/"));
	return repName
}
function getAjxpMimeType(item) {
	return (item.getAttribute('ajxp_mime') || getFileExtension(item.getAttribute('filename')))
}
function getFileExtension(fileName) {
	if (!fileName || fileName == "") return "";
	var split = getBaseName(fileName).split('.');
	if (split.length > 1) return split[split.length - 1].toLowerCase();
	return ''
}
function addImageLibrary(aliasName, aliasPath) {
	if (!window.AjxpImageLibraries) window.AjxpImageLibraries = {};
	window.AjxpImageLibraries[aliasName] = aliasPath
}
function resolveImageSource(src, defaultPath, size) {
	if (!window.AjxpImageLibraries || src.indexOf("/") == -1) {
		return ajxpResourcesFolder + (defaultPath ? (size ? defaultPath.replace("ICON_SIZE", size) : defaultPath) : '') + '/' + src
	}
	var radic = src.substring(0, src.indexOf("/"));
	if (window.AjxpImageLibraries[radic]) {
		var src = src.replace(radic, window.AjxpImageLibraries[radic]);
		return (size ? src.replace("ICON_SIZE", size) : src)
	} else {
		return ajxpResourcesFolder + (defaultPath ? (size ? defaultPath.replace("ICON_SIZE", size) : defaultPath) : '') + '/' + src
	}
}
function editWithCodePress(fileName) {
	if (Prototype.Browser.Opera) return "";
	if (fileName.search('\.php$|\.php3$|\.php5$|\.phtml$') > -1) return "php";
	else if (fileName.search("\.js$") > -1) return "javascript";
	else if (fileName.search("\.java$") > -1) return "java";
	else if (fileName.search("\.pl$") > -1) return "perl";
	else if (fileName.search("\.sql$") > -1) return "sql";
	else if (fileName.search("\.htm$|\.html$|\.xml$") > -1) return "html";
	else if (fileName.search("\.css$") > -1) return "css";
	else return ""
}
function roundSize(filesize, size_unit) {
	if (filesize >= 1073741824) {
		filesize = Math.round(filesize / 1073741824 * 100) / 100 + " G" + size_unit
	} else if (filesize >= 1048576) {
		filesize = Math.round(filesize / 1048576 * 100) / 100 + " M" + size_unit
	} else if (filesize >= 1024) {
		filesize = Math.round(filesize / 1024 * 100) / 100 + " K" + size_unit
	} else {
		filesize = filesize + " " + size_unit
	}
	return filesize
}
function formatDate(dateObject, format) {
	if (!format) format = MessageHash["date_format"];
	format = format.replace("d", (dateObject.getDate() < 10 ? '0' + dateObject.getDate() : dateObject.getDate()));
	format = format.replace("D", dateObject.getDay());
	format = format.replace("Y", dateObject.getFullYear());
	format = format.replace("y", dateObject.getYear());
	var month = dateObject.getMonth() + 1;
	format = format.replace("m", (month < 10 ? '0' + month: month));
	format = format.replace("H", (dateObject.getHours() < 10 ? '0': '') + dateObject.getHours());
	format = format.replace("i", (dateObject.getMinutes() < 10 ? '0': '') + dateObject.getMinutes());
	format = format.replace("s", (dateObject.getSeconds() < 10 ? '0': '') + dateObject.getSeconds());
	return format
}
function storeRememberData(user, pass) {
	setAjxpCookie('remember', {
		user: user,
		pass: pass
	})
}
function retrieveRememberData() {
	return getAjxpCookie('remember')
}
function clearRememberData() {
	deleteAjxpCookie('remember')
}
function setAjxpCookie(name, value) {
	var cookieJar = new CookieJar({
		expire: 3600 * 24 * 10,
		path: '',
		secure: true
	});
	cookieJar.put('ajxp_' + name, value)
}
function getAjxpCookie(name) {
	var cookieJar = new CookieJar({});
	return cookieJar.get('ajxp_' + name)
}
function deleteAjxpCookie(name) {
	var cookieJar = new CookieJar({});
	cookieJar.remove('ajxp_' + name)
}
function refreshPNGImages(element) {
	if (element.getAttribute('is_image') && element.getAttribute('is_image') == '1') {
		return element
	}
	var imgs = $(element).getElementsBySelector('img');
	if (imgs.length) imgs.each(function (img) {
		if (img.original_src) img.src = img.original_src
	});
	return element
}
var messageDivOpen = false;
function closeMessageDiv() {
	if (messageDivOpen) {
		new Effect.BlindUp('message_div');
		messageDivOpen = false
	}
}
function tempoMessageDivClosing() {
	messageDivOpen = true;
	setTimeout('closeMessageDiv()', 10000)
}
function disableTextSelection(target) {
	if (!target) return;
	if (typeof target.onselectstart != "undefined") {
		target.onselectstart = function () {
			return false
		}
	} else if (typeof target.style.MozUserSelect != "undefined") {
		var defaultValue = target.style.MozUserSelect;
		target.style.MozUserSelect = "none"
	}
	if ($(target).getElementsBySelector('input[type="text"]').length) {
		$(target).getElementsBySelector('input[type="text"]').each(function (element) {
			if (typeof element.onselectstart != "undefined") {
				element.onselectstart = function () {
					return true
				}
			} else if (typeof element.style.MozUserSelect != "undefined") {
				element.style.MozUserSelect = defaultValue
			}
		})
	}
}
function fitHeightToBottom(element, parentElement, addMarginBottom, skipListener, delay) {
	element = $(element);
	if (!element) return;
	if (typeof(parentElement) == "undefined" || parentElement == null) {
		parentElement = Position.offsetParent($(element))
	} else {
		parentElement = $(parentElement)
	}
	if (typeof(addMarginBottom) == "undefined" || addMarginBottom == null) {
		addMarginBottom = 0
	}
	var observer = function () {
		if (!element) return;
		var top = 0;
		if (parentElement == window) {
			offset = element.cumulativeOffset();
			top = offset.top
		} else {
			offset1 = parentElement.cumulativeOffset();
			offset2 = element.cumulativeOffset();
			top = offset2.top - offset1.top
		}
		var wh;
		if (parentElement == window) {
			wh = getViewPortHeight()
		} else {
			wh = parentElement.getHeight();
			if (Prototype.Browser.IE && parentElement.getStyle('height')) {
				wh = parseInt(parentElement.getStyle('height'))
			}
		}
		var mrg = parseInt(element.getStyle('marginBottom')) || 0;
		var brd = parseInt(element.getStyle('borderWidth')) || 0;
		var pad = parseInt((parentElement != window ? parentElement.getStyle('paddingBottom') : 0)) || 0;
		element.setStyle({
			height: (Math.max(0, wh - top - mrg - brd - addMarginBottom)) + 'px'
		});
		element.fire("resize")
	};
	observer();
	if (!skipListener) {
		if (delay) {
			Event.observe(window, 'resize', function () {
				window.setTimeout(function () {
					observer()
				},
				delay)
			})
		} else {
			Event.observe(window, 'resize', observer)
		}
	}
	return observer
}
function getViewPortHeight() {
	var wh;
	if (typeof(window.innerHeight) == 'number') {
		wh = window.innerHeight
	} else if (document.documentElement && (document.documentElement.clientWidth || document.documentElement.clientHeight)) {
		wh = document.documentElement.clientHeight
	} else if (document.body && (document.body.clientWidth || document.body.clientHeight)) {
		wh = document.body.clientHeight
	}
	return wh
}
function gaTrackEvent(eventCateg, eventName, eventData, eventValue) {
	if (window._gaq && window._gaTrackEvents) {
		_gaq.push(['_trackEvent', eventCateg, eventName, eventData, eventValue])
	}
}
function XPathSelectSingleNode(element, query) {
	if (Prototype.Browser.IE) {
		return element.selectSingleNode(query)
	}
	if (!window.__xpe) {
		window.__xpe = new XPathEvaluator()
	}
	var xpe = window.__xpe;
	try {
		return xpe.evaluate(query, element, xpe.createNSResolver(element), XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue
	} catch(err) {
		throw new Error("selectSingleNode: query: " + query + ", element: " + element + ", error: " + err)
	}
}
function XPathSelectNodes(element, query) {
	if (Prototype.Browser.IE) {
		return element.selectNodes(query)
	}
	var xpe = window.__xpe;
	if (!xpe) {
		window.__xpe = xpe = new XPathEvaluator()
	}
	try {
		var result = xpe.evaluate(query, element, xpe.createNSResolver(element), XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null)
	} catch(err) {
		throw new Error("selectNodes: query: " + query + ", element: " + element + ", error: " + err)
	}
	var nodes = [];
	for (var i = 0; i < result.snapshotLength; i++) {
		nodes[i] = result.snapshotItem(i)
	}
	return nodes
}
function XPathGetSingleNodeText(element, query) {
	var node = XPathSelectSingleNode(element, query);
	return getDomNodeText(node)
}
function getDomNodeText(node) {
	if (!node || !node.nodeType) {
		return null
	}
	switch (node.nodeType) {
	case 1:
		var i, a = [],
		nodes = node.childNodes,
		length = nodes.length;
		for (i = 0; i < length; i++) {
			a[i] = getDomNodeText(nodes[i])
		};
		return a.join("");
	case 2:
		return node.nodeValue;
		break;
	case 3:
		return node.nodeValue;
		break
	}
	return null
}
function ajxpCorners(oElement, cornersString) {
	var tr, tl, bl, br;
	if (cornersString == null) {
		tr = tl = bl = br
	} else {
		tr = (cornersString == 'top' || cornersString == 'tr');
		tl = (cornersString == 'top' || cornersString == 'tl');
		bl = (cornersString == 'bottom' || cornersString == 'bl');
		br = (cornersString == 'bottom' || cornersString == 'br')
	}
	if (br || bl) {
		var botDiv = new Element('div');
		botDiv.setStyle({
			marginTop: '-5px',
			zoom: 1,
			width: '100%'
		});
		botDiv.innerHTML = (bl ? '<div style="overflow: hidden; width: 5px; background-color: rgb(255, 255, 255); height: 5px; float: left;background-image:url(' + ajxpResourcesFolder + '/images/corners/5px_bl.gif);"></div>': '') + (br ? '<div style="border-style: none; overflow: hidden; float: right; background-color: rgb(255, 255, 255); height: 5px; width: 5px;background-image:url(' + ajxpResourcesFolder + '/images/corners/5px_br.gif);"></div>': '');
		oElement.appendChild(botDiv)
	}
	if (tr || tl) {
		var topDiv = new Element('div');
		topDiv.setStyle({
			marginBottom: '-5px',
			zoom: 1,
			width: '100%'
		});
		topDiv.innerHTML = (tl ? '<div style="overflow: hidden; width: 5px; background-color: rgb(255, 255, 255); height: 5px; float: left;background-image:url(' + ajxpResourcesFolder + '/images/corners/5px_tl.gif);"></div>': '') + (tr ? '<div style="border-style: none; overflow: hidden; float: right; background-color: rgb(255, 255, 255); height: 5px; width: 5px;background-image:url(' + ajxpResourcesFolder + '/images/corners/5px_tr.gif);"></div>': '');
		if (oElement.firstChild) {
			oElement.insertBefore(topDiv, oElement.firstChild)
		} else {
			oElement.appendChild(topDiv)
		}
	}
}
function base64_encode(data) {
	var b64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
	var o1, o2, o3, h1, h2, h3, h4, bits, i = 0,
	ac = 0,
	enc = "",
	tmp_arr = [];
	if (!data) {
		return data
	}
	data = utf8_encode(data + '');
	do {
		o1 = data.charCodeAt(i++);
		o2 = data.charCodeAt(i++);
		o3 = data.charCodeAt(i++);
		bits = o1 << 16 | o2 << 8 | o3;
		h1 = bits >> 18 & 0x3f;
		h2 = bits >> 12 & 0x3f;
		h3 = bits >> 6 & 0x3f;
		h4 = bits & 0x3f;
		tmp_arr[ac++] = b64.charAt(h1) + b64.charAt(h2) + b64.charAt(h3) + b64.charAt(h4)
	} while (i < data.length);
	enc = tmp_arr.join('');
	switch (data.length % 3) {
	case 1:
		enc = enc.slice(0, -2) + '==';
		break;
	case 2:
		enc = enc.slice(0, -1) + '=';
		break
	}
	return enc
}
function utf8_encode(string) {
	string = (string + '').replace(/\r\n/g, "\n").replace(/\r/g, "\n");
	var utftext = "";
	var start, end;
	var stringl = 0;
	start = end = 0;
	stringl = string.length;
	for (var n = 0; n < stringl; n++) {
		var c1 = string.charCodeAt(n);
		var enc = null;
		if (c1 < 128) {
			end++
		} else if ((c1 > 127) && (c1 < 2048)) {
			enc = String.fromCharCode((c1 >> 6) | 192) + String.fromCharCode((c1 & 63) | 128)
		} else {
			enc = String.fromCharCode((c1 >> 12) | 224) + String.fromCharCode(((c1 >> 6) & 63) | 128) + String.fromCharCode((c1 & 63) | 128)
		}
		if (enc != null) {
			if (end > start) {
				utftext += string.substring(start, end)
			}
			utftext += enc;
			start = end = n + 1
		}
	}
	if (end > start) {
		utftext += string.substring(start, string.length)
	}
	return utftext
}
User = Class.create({
	id: undefined,
	activeRepository: undefined,
	read: false,
	write: false,
	preferences: undefined,
	repositories: undefined,
	repoIcons: undefined,
	repoSearchEngines: undefined,
	isAdmin: false,
	initialize: function (id, xmlDef) {
		this.id = id;
		this.preferences = new Hash();
		this.repositories = new Hash();
		this.repoIcon = new Hash();
		this.repoSearchEngines = new Hash();
		if (xmlDef) this.loadFromXml(xmlDef)
	},
	setActiveRepository: function (id, read, write) {
		this.activeRepository = id;
		this.read = (read == "1" ? true: false);
		this.write = (write == "1" ? true: false)
	},
	getActiveRepository: function () {
		return this.activeRepository
	},
	canRead: function () {
		return this.read
	},
	canWrite: function () {
		return this.write
	},
	getPreference: function (prefName) {
		return this.preferences.get(prefName)
	},
	getRepositoriesList: function () {
		return this.repositories
	},
	setPreference: function (prefName, prefValue) {
		this.preferences.set(prefName, prefValue)
	},
	setRepositoriesList: function (repoHash) {
		this.repositories = repoHash
	},
	getRepositoryIcon: function (repoId) {
		return this.repoIcon.get(repoId)
	},
	getRepoSearchEngine: function (repoId) {
		return this.repoSearchEngines.get(repoId)
	},
	savePreferences: function (oldPass, newPass, seed, onCompleteFunc) {
		var conn = new Connexion();
		conn.addParameter("get_action", "save_user_pref");
		var i = 0;
		this.preferences.each(function (pair) {
			conn.addParameter("pref_name_" + i, pair.key);
			conn.addParameter("pref_value_" + i, pair.value);
			i++
		});
		if (oldPass && newPass) {
			conn.addParameter("pref_name_" + i, "password");
			conn.addParameter("pref_value_" + i, newPass);
			conn.addParameter("crt", oldPass);
			conn.addParameter("pass_seed", seed)
		}
		conn.onComplete = onCompleteFunc;
		conn.sendAsync()
	},
	loadFromXml: function (userNodes) {
		var repositories = new Hash();
		for (var i = 0; i < userNodes.length; i++) {
			if (userNodes[i].nodeName == "active_repo") {
				this.setActiveRepository(userNodes[i].getAttribute('id'), userNodes[i].getAttribute('read'), userNodes[i].getAttribute('write'))
			} else if (userNodes[i].nodeName == "repositories") {
				for (j = 0; j < userNodes[i].childNodes.length; j++) {
					var repoChild = userNodes[i].childNodes[j];
					if (repoChild.nodeName == "repo") {
						var repository = new Repository(repoChild.getAttribute("id"), repoChild);
						repositories.set(repoChild.getAttribute("id"), repository)
					}
				}
				this.setRepositoriesList(repositories)
			} else if (userNodes[i].nodeName == "preferences") {
				for (j = 0; j < userNodes[i].childNodes.length; j++) {
					var prefChild = userNodes[i].childNodes[j];
					if (prefChild.nodeName == "pref") {
						this.setPreference(prefChild.getAttribute("name"), prefChild.getAttribute("value"))
					}
				}
			} else if (userNodes[i].nodeName == "special_rights") {
				var attr = userNodes[i].getAttribute("is_admin");
				if (attr && attr == "1") this.isAdmin = true
			}
		}
	}
});
Repository = Class.create({
	id: undefined,
	label: 'No Repository',
	icon: ajxpResourcesFolder + '/images/crystal/actions/16/network-wired.png',
	searchEngine: 'SearchEngine',
	resources: undefined,
	allowCrossRepositoryCopy: false,
	initialize: function (id, xmlDef) {
		this.id = id;
		this.resources = {};
		if (xmlDef) this.loadFromXml(xmlDef)
	},
	getId: function () {
		return this.id
	},
	getLabel: function () {
		return this.label
	},
	setLabel: function (label) {
		this.label = label
	},
	getIcon: function () {
		return this.icon
	},
	setIcon: function (icon) {
		this.icon = icon
	},
	getSearchEngine: function () {
		return this.searchEngine
	},
	setSearchEngine: function (searchEngine) {
		this.searchEngine = searchEngine
	},
	addJSResource: function (fileName, className) {
		if (!this.resources.js) {
			this.resources.js = []
		}
		this.resources.js.push({
			fileName: fileName,
			className: className
		})
	},
	addCSSResource: function (fileName) {
		if (!this.resources.css) {
			this.resources.css = []
		}
		this.resources.css.push(fileName)
	},
	loadResources: function () {
		if (this.resources.js) {
			this.resources.js.each(function (value) {
				this.loadJSResource(value.fileName, value.className)
			}.bind(this))
		}
		if (this.resources.css) {
			this.resources.css.each(function (value) {
				this.loadCSSResource(value)
			}.bind(this))
		}
	},
	loadJSResource: function (fileName, className) {
		try {
			eval('window.testTemporaryObject = ' + className);
			delete(window.testTemporaryObject)
		} catch(e) {
			if (typeof(className) != 'function' || typeof(className.prototype) != 'object') {
				var conn = new Connexion();
				conn._libUrl = false;
				conn.loadLibrary(fileName)
			}
		}
	},
	loadCSSResource: function (fileName) {
		var head = $$('head')[0];
		var cssNode = new Element('link', {
			type: 'text/css',
			rel: 'stylesheet',
			href: fileName,
			media: 'screen'
		});
		head.insert(cssNode)
	},
	loadFromXml: function (repoNode) {
		if (repoNode.getAttribute('allowCrossRepositoryCopy') && repoNode.getAttribute('allowCrossRepositoryCopy') == "true") {
			this.allowCrossRepositoryCopy = true
		}
		for (var i = 0; i < repoNode.childNodes.length; i++) {
			var childNode = repoNode.childNodes[i];
			if (childNode.nodeName == "label") {
				this.setLabel(childNode.firstChild.nodeValue)
			} else if (childNode.nodeName == "client_settings") {
				this.setIcon(childNode.getAttribute('icon'));
				this.setSearchEngine(childNode.getAttribute('search_engine'));
				for (var j = 0; j < childNode.childNodes.length; j++) {
					var subCh = childNode.childNodes[j];
					if (subCh.nodeName == 'resources') {
						for (var k = 0; k < subCh.childNodes.length; k++) {
							if (subCh.childNodes[k].nodeName == 'js') {
								this.addJSResource(subCh.childNodes[k].getAttribute('file'), subCh.childNodes[k].getAttribute('className'))
							} else if (subCh.childNodes[k].nodeName == 'css') {
								this.addCSSResource(subCh.childNodes[k].getAttribute('file'))
							} else if (subCh.childNodes[k].nodeName == 'img_library') {
								addImageLibrary(subCh.childNodes[k].getAttribute('alias'), subCh.childNodes[k].getAttribute('path'))
							}
						}
					}
				}
			}
		}
	}
});
var timerClearObserver = {
	onEnd: function () {
		if (WebFXtimer) clearTimeout(WebFXtimer)
	}
};
Event.observe(window, "load", function () {
	Draggables.addObserver(timerClearObserver);
	Draggables.addObserver({
		onDrag: function (eventName, element, event) {
			if (element.updateCtrlKey) {
				element.updateCtrlKey(event)
			}
		}
	})
});
Event.observe(window, "unload", function () {
	Draggables.removeObserver(timerClearObserver);
	if (ajaxplorer) {
		ajaxplorer.filesList.allDraggables.each(function (el) {
			el.destroy()
		});
		ajaxplorer.filesList.allDroppables.each(function (el) {
			Droppables.remove(el)
		})
	}
});
var AjxpDraggable = Class.create(Draggable, {
	initialize: function ($super, element, options) {
		$(element).addClassName('ajxp_draggable');
		$super(element, options);
		this.options.reverteffect = function (element, top_offset, left_offset) {
			new Effect.Move(element, {
				x: -left_offset,
				y: -top_offset,
				duration: 0,
				queue: {
					scope: '_draggable',
					position: 'end'
				}
			})
		}
	},
	destroy: function () {
		Event.stopObserving(this.handle, "mousedown", this.eventMouseDown);
		this.element.removeClassName('ajxp_draggable');
		this.element = null;
		Draggables.unregister(this)
	},
	startDrag: function (event) {
		if (!this.delta) this.delta = this.currentDelta();
		this.dragging = true;
		this._draggingMultiple = false;
		if (this.options.zindex) {
			this.originalZ = parseInt(Element.getStyle(this.element, 'z-index') || 0);
			this.element.style.zIndex = this.options.zindex
		}
		if (this.options.ghosting) {
			var selection = ajaxplorer.filesList.getUserSelection();
			if (selection.isMultiple()) {
				this._draggingMultiple = true;
				this._clone = document.createElement('div');
				$(this._clone).addClassName("ajxp_draggable");
				if (ajaxplorer.filesList._displayMode == 'thumb') {
					$(this._clone).addClassName('multiple_thumbnails_draggable')
				} else {
					$(this._clone).addClassName('multiple_selection_draggable')
				}
				this._clone.setAttribute('user_selection', 'true');
				if (Prototype.Browser.IE || Prototype.Browser.Opera) {
					$('browser').appendChild(this._clone);
					$(this._clone).setStyle({
						width: $(this.element).getWidth() + 'px'
					})
				} else {
					this.element.parentNode.appendChild(this._clone)
				}
				this.original = this.element;
				this.element = this._clone;
				var selectedItems = ajaxplorer.filesList.getSelectedItems();
				for (var i = 0; i < selectedItems.length; i++) {
					var objectToClone;
					if (ajaxplorer.filesList._displayMode == 'thumb') {
						objectToClone = $(selectedItems[i])
					} else {
						objectToClone = $(selectedItems[i]).getElementsBySelector('span.list_selectable_span')[0]
					}
					var newObj = refreshPNGImages(objectToClone.cloneNode(true));
					this.element.appendChild(newObj);
					if (ajaxplorer.filesList._displayMode == 'thumb') {
						$(newObj).addClassName('simple_selection_draggable')
					}
				}
				Position.absolutize(this.element)
			} else {
				if (selection.isEmpty()) {
					ajaxplorer.getFilesList().findSelectableParent(this.element, true)
				}
				this._clone = this.element.cloneNode(true);
				refreshPNGImages(this._clone);
				Position.absolutize(this.element);
				this.element.parentNode.insertBefore(this._clone, this.element);
				$(this.element).addClassName('simple_selection_draggable');
				if (Prototype.Browser.IE || Prototype.Browser.Opera) {
					var newclone = this.element.cloneNode(true);
					refreshPNGImages(newclone);
					$('browser').appendChild(newclone);
					$(newclone).setStyle({
						width: $(this._clone).getWidth() + 'px'
					});
					Element.remove(this.element);
					this.element = newclone
				}
			}
		}
		if (this.options.scroll) {
			if (this.options.scroll == window) {
				var where = this._getWindowScroll(this.options.scroll);
				this.originalScrollLeft = where.left;
				this.originalScrollTop = where.top
			} else {
				this.originalScrollLeft = this.options.scroll.scrollLeft;
				this.originalScrollTop = this.options.scroll.scrollTop
			}
		}
		Draggables.notify('onStart', this, event);
		if (this.options.starteffect) {
			this.options.starteffect(this.element)
		}
		this.dndAction = ajaxplorer.getActionBar().getDefaultAction('dragndrop');
		this.ctrlDndAction = ajaxplorer.getActionBar().getDefaultAction('ctrldragndrop')
	},
	finishDrag: function (event, success) {
		this.dragging = false;
		if (this.options.quiet) {
			Position.prepare();
			var pointer = [Event.pointerX(event), Event.pointerY(event)];
			Droppables.show(pointer, this.element)
		}
		if (this.options.ghosting && !this._draggingMultiple) {
			this.removeCopyClass();
			if (Prototype.Browser.IE || Prototype.Browser.Opera) {
				this._clone.parentNode.insertBefore(this.element, this._clone)
			}
			this.element.removeClassName('simple_selection_draggable');
			Position.relativize(this.element);
			Element.remove(this._clone);
			this._clone = null
		}
		var dropped = false;
		if (success) {
			dropped = Droppables.fire(event, this.element);
			if (!dropped) dropped = false
		}
		if (dropped && this.options.onDropped) this.options.onDropped(this.element);
		Draggables.notify('onEnd', this, event);
		var revert = this.options.revert;
		if (revert && typeof revert == 'function') revert = revert(this.element);
		var d = this.currentDelta();
		if (revert && this.options.reverteffect) {
			if (dropped == 0 || revert != 'failure') {
				if (!this._draggingMultiple) {
					this.options.reverteffect(this.element, d[1] - this.delta[1], d[0] - this.delta[0])
				}
			}
		} else {
			this.delta = d
		}
		if (this.options.zindex) {
			this.element.style.zIndex = this.originalZ
		}
		if (this.options.endeffect) {
			this.options.endeffect(this.element)
		}
		if (this._draggingMultiple) {
			var selectDiv = this.element;
			this.element = this.original;
			Element.remove(selectDiv)
		}
		Draggables.deactivate(this);
		Droppables.reset()
	},
	updateCtrlKey: function (event) {
		if (!event) return;
		var ctrl = event['ctrlKey'];
		if (this.ctrlDndAction && (ctrl || (this.dndAction.deny))) {
			this.addCopyClass()
		} else {
			this.removeCopyClass()
		}
	},
	addCopyClass: function () {
		if (this._draggingMultiple && ajaxplorer.filesList._displayMode == 'thumb') {
			$(this.element).select('div.thumbnail_selectable_cell').each(function (el) {
				el.addClassName('selection_ctrl_key')
			})
		} else {
			$(this.element).addClassName('selection_ctrl_key')
		}
	},
	removeCopyClass: function () {
		if (this._draggingMultiple && ajaxplorer.filesList._displayMode == 'thumb') {
			$(this.element).select('div.thumbnail_selectable_cell').each(function (el) {
				el.removeClassName('selection_ctrl_key')
			})
		} else {
			$(this.element).removeClassName('selection_ctrl_key')
		}
	}
});
var AjxpDroppables = {
	options: {
		hoverclass: 'droppableZone',
		accept: 'ajxp_draggable',
		onDrop: function (draggable, droppable, event) {
			var targetName = droppable.getAttribute('filename');
			var srcName = draggable.getAttribute('filename');
			if (WebFXtimer) clearTimeout(WebFXtimer);
			var nodeId = null;
			if (droppable.id && webFXTreeHandler.all[droppable.id]) {
				nodeId = droppable.id
			}
			ajaxplorer.actionBar.applyDragMove(srcName, targetName, nodeId, event['ctrlKey'])
		},
		onHover: function (draggable, droppable, event) {
			if (WebFXtimer) clearTimeout(WebFXtimer);
			if (droppable.id && webFXTreeHandler.all[droppable.id]) {
				var jsString = "javascript:";
				WebFXtimer = window.setTimeout(function () {
					var node = webFXTreeHandler.all[droppable.id];
					if (node && node.folder && !node.open) node.expand()
				},
				500)
			}
		},
		onOut: function (droppable) {
			if (WebFXtimer) clearTimeout(WebFXtimer)
		}
	},
	add: function (element) {
		Droppables.add(element, this.options)
	}
};
AjxpSortable = Class.create(SortableTable, {
	initialize: function ($super, oTable, oSortTypes, oTHead) {
		$super(oTable, oSortTypes, oTHead);
		this.addSortType("NumberK", this.replace8a8);
		this.addSortType("NumberKo", this.replace8oa8);
		this.addSortType("MyDate", null, false, this.sortTimes);
		this.addSortType("StringDirFile", this.toUpperCase, false, this.splitDirsAndFiles.bind(this))
	},
	setPaginationBehaviour: function (loaderFunc, columnsDefs, crtOrderName, crtOrderDir) {
		this.paginationLoaderFunc = loaderFunc;
		this.columnsDefs = columnsDefs;
		var found = -1;
		for (var i = 0; i < columnsDefs.length; i++) {
			if (columnsDefs[i]['field_name'] == crtOrderName) {
				found = i;
				break
			}
		}
		this.sortColumn = found;
		this.descending = (crtOrderDir == 'desc');
		this.updateHeaderArrows()
	},
	headerOnclick: function (e) {
		var el = e.target || e.srcElement;
		while (el.tagName != "TD") {
			el = el.parentNode
		}
		var cellColumn = (this.msie ? this.getCellIndex(el) : el.cellIndex);
		if (this.paginationLoaderFunc) {
			var params = $H({});
			if (this.sortColumn != cellColumn) {
				this.descending = this.defaultDescending
			} else {
				this.descending = !this.descending
			}
			var column = this.columnsDefs[cellColumn];
			params.set('order_column', column['field_name'] || cellColumn);
			params.set('order_direction', (this.descending ? 'desc': 'asc'));
			this.paginationLoaderFunc(params)
		} else {
			this.sort(cellColumn)
		}
	},
	replace8a8: function (str) {
		str = str.toUpperCase();
		var splitstr = "____";
		var ar = str.replace(/(([0-9]*\.)?[0-9]+([eE][-+]?[0-9]+)?)(.*)/, "$1" + splitstr + "$4").split(splitstr);
		var num = Number(ar[0]).valueOf();
		if (ar[1]) {
			var ml = ar[1].replace(/\s*([KMGB])\s*/, "$1");
			if (ml == "K") num *= 1024;
			else if (ml == "M") num *= 1024 * 1024;
			else if (ml == "G") num *= 1024 * 1024 * 1024;
			else if (ml == "T") num *= 1024 * 1024 * 1024 * 1024
		}
		return num
	},
	replace8oa8: function (str) {
		str = str.toUpperCase();
		if (str == "-") {
			return 0
		}
		var splitstr = "____";
		var ar = str.replace(/(([0-9]*\.)?[0-9]+([eE][-+]?[0-9]+)?)(.*)/, "$1" + splitstr + "$4").split(splitstr);
		var num = Number(ar[0]).valueOf();
		if (ar[1]) {
			var ml = ar[1].replace(/\s*(KO|MO|GO|T|KB|MB|GB)\s*/, "$1");
			if (ml == "KO" || ml == "KB") num *= 1024;
			else if (ml == "MO" || ml == "MB") num *= 1024 * 1024;
			else if (ml == "GO" || ml == "GB") num *= 1024 * 1024 * 1024;
			else if (ml == "T") num *= 1024 * 1024 * 1024 * 1024
		}
		return num
	},
	replaceDate: function (s) {
		var parts1 = s.split(" ");
		var parts = parts1[0].split("/");
		var d = new Date(0);
		d.setFullYear(parts[2]);
		d.setDate(parts[0]);
		d.setMonth(parts[1] - 1);
		var hours = parts1[1].split(":");
		d.setHours(hours[0]);
		d.setMinutes(hours[1]);
		return d.getTime()
	},
	splitDirsAndFiles: function (oRow, nColumn) {
		var s;
		var c = oRow.cells[nColumn];
		if (typeof c.innerText != "undefined") s = c.innerText;
		else s = this.getInnerText(c);
		if (s[0] == ' ') s = s.substr(1, (s.length - 1));
		if (oRow.getAttribute('is_file') == '0') {
			s = '000' + s
		}
		return s.toUpperCase()
	},
	sortTimes: function (oRow, nColumn) {
		if (oRow.ajxp_modiftime) {
			return oRow.ajxp_modiftime
		}
	}
});
AjxpAutocompleter = Class.create(Autocompleter.Base, {
	initialize: function (element, update, url, options) {
		this.baseInitialize(element, update, options);
		this.options.asynchronous = true;
		this.options.onComplete = this.onComplete.bind(this);
		this.options.defaultParams = this.options.parameters || null;
		this.url = ajxpServerAccessPath + "?get_action=ls&mode=complete";
		this.options.paramName = "dir";
		this.options.minChars = 1
	},
	getUpdatedChoices: function () {
		this.startIndicator();
		var value = this.getToken();
		var entry = encodeURIComponent(this.options.paramName) + '=' + encodeURIComponent(value.substring(0, value.lastIndexOf("/") + 1));
		this.options.parameters = this.options.callback ? this.options.callback(this.element, entry) : entry;
		if (this.options.defaultParams) this.options.parameters += '&' + this.options.defaultParams;
		new Ajax.Request(this.url, this.options)
	},
	onComplete: function (request) {
		var oXmlDoc = request.responseXML;
		var token = this.getToken();
		var dirs = new Array();
		if (oXmlDoc == null || oXmlDoc.documentElement == null) {
			this.updateChoices('');
			return
		}
		var root = oXmlDoc.documentElement;
		var cs = root.childNodes;
		var l = cs.length;
		for (var i = 0; i < l; i++) {
			if (cs[i].tagName == "tree") {
				var text = cs[i].getAttribute("text");
				var hasCharAfterSlash = (token.lastIndexOf("/") < token.length - 1);
				if (!hasCharAfterSlash) {
					dirs[dirs.length] = text
				} else {
					var afterSlash = token.substring(token.lastIndexOf("/") + 1, token.length);
					if (text.indexOf(afterSlash) == 0) {
						dirs[dirs.length] = text
					}
				}
			}
		}
		if (!dirs.length) {
			this.updateChoices('');
			return
		}
		var responseText = '<ul>';
		dirs.each(function (dir) {
			value = token.substring(0, token.lastIndexOf("/") + 1);
			responseText += '<li>' + value + dir + '</li>'
		});
		responseText += '</ul>';
		this.updateChoices(responseText)
	}
});
Action = Class.create({
	__DEFAULT_ICON_PATH: "/images/crystal/actions/ICON_SIZE",
	initialize: function () {
		this.options = Object.extend({
			name: '',
			src: '',
			text: '',
			title: '',
			hasAccessKey: false,
			accessKey: '',
			callbackCode: '',
			callback: Prototype.emptyFunction,
			displayAction: false,
			prepareModal: false,
			formId: undefined,
			formCode: undefined
		},
		arguments[0] || {});
		this.context = Object.extend({
			selection: true,
			dir: false,
			allowedMimes: $A([]),
			root: true,
			inZip: true,
			recycle: false,
			behaviour: 'hidden',
			actionBar: false,
			actionBarGroup: 'default',
			contextMenu: false,
			infoPanel: false
		},
		arguments[1] || {});
		this.selectionContext = Object.extend({
			dir: false,
			file: true,
			recycle: false,
			behaviour: 'disabled',
			allowedMimes: $A([]),
			unique: true,
			multipleOnly: false
		},
		arguments[2] || {});
		this.rightsContext = Object.extend({
			noUser: true,
			userLogged: true,
			guestLogged: false,
			read: true,
			write: false,
			adminOnly: false
		},
		arguments[3] || {});
		this.elements = new Array();
		this.contextHidden = false;
		this.deny = false
	},
	apply: function () {
		if (this.deny) return;
		if (this.options.prepareModal) {
			modal.prepareHeader(this.options.title, resolveImageSource(this.options.src, this.__DEFAULT_ICON_PATH, 16))
		}
		window.actionArguments = $A([]);
		if (arguments[0]) window.actionArguments = $A(arguments[0]);
		if (this.options.callbackCode) this.options.callbackCode.evalScripts();
		window.actionArguments = null
	},
	fireContextChange: function () {
		if (arguments.length < 5) return;
		var usersEnabled = arguments[0];
		var crtUser = arguments[1];
		var crtIsRecycle = arguments[2];
		var crtDisplayMode = arguments[3];
		var crtInZip = arguments[4];
		var crtIsRoot = arguments[5];
		var crtAjxpMime = arguments[6] || '';
		if (this.options.listeners && this.options.listeners["contextChange"]) {
			this.options.listeners["contextChange"].evalScripts()
		}
		var rightsContext = this.rightsContext;
		if (!rightsContext.noUser && !usersEnabled) {
			return this.hideForContext()
		}
		if ((rightsContext.userLogged == 'only' && crtUser == null) || (rightsContext.guestLogged && rightsContext.guestLogged == 'hidden' & crtUser != null && crtUser.id == 'guest')) {
			return this.hideForContext()
		}
		if (rightsContext.userLogged == 'hidden' && crtUser != null && !(crtUser.id == 'guest' && rightsContext.guestLogged && rightsContext.guestLogged == 'show')) {
			return this.hideForContext()
		}
		if (rightsContext.adminOnly && (crtUser == null || !crtUser.isAdmin)) {
			return this.hideForContext()
		}
		if (rightsContext.read && crtUser != null && !crtUser.canRead()) {
			return this.hideForContext()
		}
		if (rightsContext.write && crtUser != null && !crtUser.canWrite()) {
			return this.hideForContext()
		}
		if (this.context.allowedMimes.length) {
			if (!this.context.allowedMimes.indexOf(crtAjxpMime) == -1) {
				return this.hideForContext()
			}
		}
		if (this.context.recycle) {
			if (this.context.recycle == 'only' && !crtIsRecycle) {
				return this.hideForContext()
			}
			if (this.context.recycle == 'hidden' && crtIsRecycle) {
				return this.hideForContext()
			}
		}
		if (!this.context.inZip && crtInZip) {
			return this.hideForContext()
		}
		if (!this.context.root && crtIsRoot) {
			return this.hideForContext()
		}
		if (this.options.displayAction && this.options.displayAction == crtDisplayMode) {
			return this.hideForContext()
		}
		this.showForContext()
	},
	fireSelectionChange: function () {
		if (this.options.listeners && this.options.listeners["selectionChange"]) {
			this.options.listeners["selectionChange"].evalScripts()
		}
		if (arguments.length < 1 || this.contextHidden || !this.context.selection) {
			return
		}
		var userSelection = arguments[0];
		var bSelection = false;
		if (userSelection != null) {
			bSelection = !userSelection.isEmpty();
			var bUnique = userSelection.isUnique();
			var bFile = userSelection.hasFile();
			var bDir = userSelection.hasDir();
			var bRecycle = userSelection.isRecycle()
		}
		var selectionContext = this.selectionContext;
		if (selectionContext.allowedMimes.size()) {
			if (selectionContext.behaviour == 'hidden') this.hide();
			else this.disable()
		}
		if (selectionContext.unique && !bUnique) {
			return this.disable()
		}
		if ((selectionContext.file || selectionContext.dir) && !bFile && !bDir) {
			return this.disable()
		}
		if ((selectionContext.dir && !selectionContext.file && bFile) || (!selectionContext.dir && selectionContext.file && bDir)) {
			return this.disable()
		}
		if (!selectionContext.recycle && bRecycle) {
			return this.disable()
		}
		if ((selectionContext.allowedMimes.size() && userSelection && !userSelection.hasMime(selectionContext.allowedMimes)) && !(selectionContext.dir && bDir)) {
			if (selectionContext.behaviour == 'hidden') return this.hide();
			else return this.disable()
		}
		this.show();
		this.enable()
	},
	createFromXML: function (xmlNode) {
		this.options.name = xmlNode.getAttribute('name');
		for (var i = 0; i < xmlNode.childNodes.length; i++) {
			var node = xmlNode.childNodes[i];
			if (node.nodeName == "processing") {
				for (var j = 0; j < node.childNodes.length; j++) {
					var processNode = node.childNodes[j];
					if (processNode.nodeName == "clientForm") {
						this.options.formId = processNode.getAttribute("id");
						this.options.formCode = processNode.firstChild.nodeValue;
						this.insertForm()
					} else if (processNode.nodeName == "clientCallback" && processNode.firstChild) {
						this.options.callbackCode = '<script>' + processNode.firstChild.nodeValue + '</script>';
						if (processNode.getAttribute('prepareModal') && processNode.getAttribute('prepareModal') == "true") {
							this.options.prepareModal = true
						}
						if (processNode.getAttribute('displayModeButton') && processNode.getAttribute('displayModeButton') != '') {
							this.options.displayAction = processNode.getAttribute('displayModeButton')
						}
					} else if (processNode.nodeName == "clientListener" && processNode.firstChild) {
						if (!this.options.listeners) this.options.listeners = [];
						this.options.listeners[processNode.getAttribute('name')] = '<script>' + processNode.firstChild.nodeValue + '</script>'
					}
				}
			} else if (node.nodeName == "gui") {
				this.options.text = MessageHash[node.getAttribute('text')];
				this.options.title = MessageHash[node.getAttribute('title')];
				this.options.src = node.getAttribute('src');
				if (node.getAttribute('hasAccessKey') && node.getAttribute('hasAccessKey') == "true") {
					this.options.accessKey = node.getAttribute('accessKey');
					this.options.hasAccessKey = true
				}
				for (var j = 0; j < node.childNodes.length; j++) {
					if (node.childNodes[j].nodeName == "context") {
						this.attributesToObject(this.context, node.childNodes[j])
					} else if (node.childNodes[j].nodeName == "selectionContext") {
						this.attributesToObject(this.selectionContext, node.childNodes[j])
					}
				}
			} else if (node.nodeName == "rightsContext") {
				this.attributesToObject(this.rightsContext, node)
			}
		}
		if (!this.options.hasAccessKey) return;
		if (this.options.accessKey == '' || !MessageHash[this.options.accessKey] || this.options.text.indexOf(MessageHash[this.options.accessKey]) == -1) {
			this.options.accessKey == this.options.text.charAt(0)
		} else {
			this.options.accessKey = MessageHash[this.options.accessKey]
		}
	},
	toActionBar: function () {
		var button = new Element('a', {
			href: this.options.name,
			id: this.options.name + '_button'
		}).observe('click', function (e) {
			Event.stop(e);
			this.apply()
		}.bind(this));
		var imgPath = resolveImageSource(this.options.src, this.__DEFAULT_ICON_PATH, 22);
		var img = new Element('img', {
			id: this.options.name + '_button_icon',
			src: imgPath,
			width: 18,
			height: 18,
			border: 0,
			align: 'absmiddle',
			alt: this.options.title,
			title: this.options.title
		});
		var titleSpan = new Element('span', {
			id: this.options.name + '_button_label'
		}).setStyle({
			paddingLeft: 6,
			paddingRight: 6,
			cursor: 'pointer'
		});
		button.insert(img).insert(new Element('br')).insert(titleSpan.update(this.getKeyedText()));
		this.elements.push(button);
		button.observe("mouseover", function () {
			if (button.hasClassName('disabled')) return;
			if (this.hideTimeout) clearTimeout(this.hideTimeout);
			new Effect.Morph(img, {
				style: 'width:25px; height:25px;margin-top:0px;',
				duration: 0.08,
				transition: Effect.Transitions.sinoidal,
				afterFinish: function () {
					this.updateTitleSpan(titleSpan, 'big')
				}.bind(this)
			})
		}.bind(this));
		button.observe("mouseout", function () {
			if (button.hasClassName('disabled')) return;
			this.hideTimeout = setTimeout(function () {
				new Effect.Morph(img, {
					style: 'width:18px; height:18px;margin-top:8px;',
					duration: 0.2,
					transition: Effect.Transitions.sinoidal,
					afterFinish: function () {
						this.updateTitleSpan(titleSpan, 'small')
					}.bind(this)
				})
			}.bind(this), 10)
		}.bind(this));
		button.hide();
		return button
	},
	updateTitleSpan: function (span, state) {
		if (!span.orig_width && state == 'big') {
			var origWidth = span.getWidth();
			span.setStyle({
				display: 'block',
				width: origWidth,
				overflow: 'visible',
				padding: 0
			});
			span.orig_width = origWidth
		}
		span.setStyle({
			fontSize: (state == 'big' ? '11px': '9px')
		})
	},
	setIconSrc: function (newSrc) {
		this.options.src = newSrc;
		if ($(this.options.name + '_button_icon')) {
			$(this.options.name + '_button_icon').src = resolveImageSource(this.options.src, this.__DEFAULT_ICON_PATH, 22)
		}
	},
	setLabel: function (newLabel, newTitle) {
		this.options.text = MessageHash[newLabel];
		if ($(this.options.name + '_button_label')) {
			$(this.options.name + '_button_label').update(this.getKeyedText())
		}
		if (!newTitle) return;
		this.options.title = MessageHash[newTitle];
		if ($(this.options.name + '_button_icon')) {
			$(this.options.name + '_button_icon').title = this.options.title
		}
	},
	toInfoPanel: function () {
		return this.options
	},
	toContextMenu: function () {
		return this.options
	},
	hideForContext: function () {
		this.hide();
		this.contextHidden = true
	},
	showForContext: function () {
		this.show();
		this.contextHidden = false
	},
	hide: function () {
		if (this.elements.size() > 0 || (!this.context.actionBar && this.context.infoPanel)) this.deny = true;
		this.elements.each(function (elem) {
			elem.hide()
		})
	},
	show: function () {
		if (this.elements.size() > 0 || (!this.context.actionBar && this.context.infoPanel)) this.deny = false;
		this.elements.each(function (elem) {
			elem.show()
		})
	},
	disable: function () {
		if (this.elements.size() > 0 || (!this.context.actionBar && this.context.infoPanel)) this.deny = true;
		this.elements.each(function (elem) {
			elem.addClassName('disabled')
		})
	},
	enable: function () {
		if (this.elements.size() > 0 || (!this.context.actionBar && this.context.infoPanel)) this.deny = false;
		this.elements.each(function (elem) {
			elem.removeClassName('disabled')
		})
	},
	remove: function () {
		this.elements.each(function (el) {
			$(el).remove()
		});
		if (this.options.formId && $('all_forms').select('[id="' + this.options.formId + '"]').length) {
			$('all_forms').select('[id="' + this.options.formId + '"]')[0].remove()
		}
	},
	getKeyedText: function () {
		var displayString = this.options.text;
		if (!this.options.hasAccessKey) return displayString;
		var accessKey = this.options.accessKey;
		var keyPos = displayString.toLowerCase().indexOf(accessKey.toLowerCase());
		if (keyPos == -1) {
			return displayString + ' (<u>' + accessKey + '</u>)'
		}
		if (displayString.charAt(keyPos) != accessKey) {
			accessKey = displayString.charAt(keyPos)
		}
		returnString = displayString.substring(0, displayString.indexOf(accessKey));
		returnString += '<u>' + accessKey + '</u>';
		returnString += displayString.substring(displayString.indexOf(accessKey) + 1, displayString.length);
		return returnString
	},
	insertForm: function () {
		if (!this.options.formCode || !this.options.formId) return;
		if ($('all_forms').select('[id="' + this.options.formId + '"]').length) return;
		$('all_forms').insert(this.options.formCode)
	},
	attributesToObject: function (object, node) {
		Object.keys(object).each(function (key) {
			if (node.getAttribute(key)) {
				value = node.getAttribute(key);
				if (value == 'true') value = true;
				else if (value == 'false') value = false;
				if (key == 'allowedMimes') {
					if (value && value.split(',').length) {
						value = $A(value.split(','))
					} else {
						value = $A([])
					}
				}
				this[key] = value
			}
		}.bind(object))
	}
});
ActionsManager = Class.create({
	initialize: function (oElement, bUsersEnabled, oUser, oAjaxplorer) {
		this._htmlElement = oElement;
		this._registeredKeys = new Hash();
		this._actions = new Hash();
		this._ajaxplorer = oAjaxplorer;
		this.usersEnabled = bUsersEnabled;
		if (oUser != null) {
			this._currentUser = oUser.id
		} else this._currentUser = 'shared';
		this.oUser = oUser;
		this.bookmarksBar = new BookmarksBar();
		this.bgManager = new BackgroundManager(this);
		this.actions = new Hash();
		this.defaultActions = new Hash();
		this.toolbars = new Hash();
		this.loadActions('ajxp')
	},
	init: function () {
		this._items = this._htmlElement.select('[action]');
		$('current_path').onfocus = function (e) {
			ajaxplorer.disableShortcuts();
			this.hasFocus = true;
			$('current_path').select();
			return false
		}.bind(this);
		var buttons = this._htmlElement.getElementsBySelector("input");
		buttons.each(function (object) {
			$(object).onkeydown = function (e) {
				if (e == null) e = window.event;
				if (e.keyCode == 9) return false;
				return true
			};
			if ($(object) == $('goto_button')) {
				$(object).onfocus = function () {
					$('current_path').focus()
				}
			}
		});
		$('current_path').onblur = function (e) {
			if (!currentLightBox) {
				ajaxplorer.enableShortcuts();
				this.hasFocus = false
			}
		}.bind(this)
	},
	setContextualMenu: function (contextualMenu) {
		this.bookmarksBar.setContextualMenu(contextualMenu)
	},
	setUser: function (oUser) {
		this.oUser = oUser;
		var logging_string = "";
		if (oUser != null) {
			if (oUser.id != 'guest') {
				logging_string = '<ajxp:message ajxp_message_id="142">' + MessageHash[142] + '</ajxp:message><i ajxp_message_title_id="189" title="' + MessageHash[189] + '" onclick="ajaxplorer.actionBar.displayUserPrefs();">' + oUser.id + ' <img src="' + ajxpResourcesFolder + '/images/crystal/actions/16/configure.png" height="16" width="16" border="0" align="absmiddle"></i>';
				if (oUser.getPreference('lang') != null && oUser.getPreference('lang') != "" && oUser.getPreference('lang') != ajaxplorer.currentLanguage) {
					ajaxplorer.loadI18NMessages(oUser.getPreference('lang'))
				}
			} else {
				logging_string = '<ajxp:message ajxp_message_id="143">' + MessageHash[143] + '</ajxp:message>'
			}
		} else {
			logging_string = '<ajxp:message ajxp_message_id="142">' + MessageHash[144] + '</ajxp:message>'
		}
		$('logging_string').innerHTML = logging_string;
		if (oUser != null) {
			disp = oUser.getPreference("display");
			if (disp && (disp == 'thumb' || disp == 'list')) {
				if (disp != ajaxplorer.filesList._displayMode) ajaxplorer.filesList.switchDisplayMode(disp)
			}
		}
		this.loadBookmarks()
	},
	displayUserPrefs: function () {
		if (ajaxplorer.user == null) return;
		var userLang = ajaxplorer.user.getPreference("lang");
		var userDisp = ajaxplorer.user.getPreference("display");
		var onLoad = function () {
			var elements = $('user_pref_form').getElementsBySelector('input[type="radio"]');
			elements.each(function (elem) {
				elem.checked = false;
				if (elem.id == 'display_' + userDisp || elem.id == 'lang_' + userLang) {
					elem.checked = true
				}
			});
			if ($('user_change_ownpass_old')) {
				$('user_change_ownpass_old').value = $('user_change_ownpass1').value = $('user_change_ownpass2').value = '';
				var connexion = new Connexion();
				connexion.addParameter("get_action", "get_seed");
				connexion.onComplete = function (transport) {
					$('pass_seed').value = transport.responseText
				};
				connexion.sendSync()
			}
		};
		var onComplete = function () {
			var elements = $('user_pref_form').getElementsBySelector('input[type="radio"]');
			elements.each(function (elem) {
				if (elem.checked) {
					ajaxplorer.user.setPreference(elem.name, elem.value)
				}
			});
			var userOldPass = null;
			var userPass = null;
			var passSeed = null;
			if ($('user_change_ownpass1') && $('user_change_ownpass1').value != "" && $('user_change_ownpass2').value != "") {
				if ($('user_change_ownpass1').value != $('user_change_ownpass2').value) {
					alert(MessageHash[238]);
					return false
				}
				if ($('user_change_ownpass_old').value == '') {
					alert(MessageHash[239]);
					return false
				}
				passSeed = $('pass_seed').value;
				if (passSeed == '-1') {
					userPass = $('user_change_ownpass1').value;
					userOldPass = $('user_change_ownpass_old').value
				} else {
					userPass = hex_md5($('user_change_ownpass1').value);
					userOldPass = hex_md5(hex_md5($('user_change_ownpass_old').value) + $('pass_seed').value)
				}
			}
			var onComplete = function (transport) {
				var oUser = ajaxplorer.user;
				if (oUser.getPreference('lang') != null && oUser.getPreference('lang') != "" && oUser.getPreference('lang') != ajaxplorer.currentLanguage) {
					ajaxplorer.loadI18NMessages(oUser.getPreference('lang'))
				}
				if (userPass != null) {
					if (transport.responseText == 'PASS_ERROR') {
						alert(MessageHash[240])
					} else if (transport.responseText == 'SUCCESS') {
						ajaxplorer.displayMessage('SUCCESS', MessageHash[197]);
						hideLightBox(true)
					}
				} else {
					ajaxplorer.displayMessage('SUCCESS', MessageHash[241]);
					hideLightBox(true)
				}
			};
			ajaxplorer.user.savePreferences(userOldPass, userPass, passSeed, onComplete);
			return false
		};
		modal.prepareHeader(MessageHash[195], ajxpResourcesFolder + '/images/crystal/actions/16/configure.png');
		modal.showDialogForm('Preferences', 'user_pref_form', onLoad, onComplete)
	},
	getContextActions: function (srcElement) {
		var actionsSelectorAtt = 'selectionContext';
		if (srcElement.id && (srcElement.id == 'table_rows_container' || srcElement.id == 'selectable_div')) {
			actionsSelectorAtt = 'genericContext'
		} else if (srcElement.id.substring(0, 5) == 'webfx') {
			actionsSelectorAtt = 'directoryContext'
		} else {
			var bm = this.bookmarksBar.findBookmarkEventSource(srcElement);
			if (bm != null) {
				return this.bookmarksBar.getContextActions(bm)
			}
		};
		var contextActions = new Array();
		var crtGroup;
		this.actions.each(function (pair) {
			var action = pair.value;
			if (!action.context.contextMenu) return;
			if (actionsSelectorAtt == 'selectionContext' && !action.context.selection) return;
			if (actionsSelectorAtt == 'directoryContext' && !action.context.dir) return;
			if (actionsSelectorAtt == 'genericContext' && action.context.selection) return;
			if (action.contextHidden || action.deny) return;
			if (crtGroup && crtGroup != action.context.actionBarGroup) {
				contextActions.push({
					separator: true
				})
			}
			var isDefault = false;
			if (actionsSelectorAtt == 'selectionContext') {
				var userSelection = ajaxplorer.getFilesList().getUserSelection();
				if (!userSelection.isEmpty()) {
					var defaultAction = 'file';
					if (userSelection.isUnique() && userSelection.hasDir()) {
						defaultAction = 'dir'
					}
					if (this.defaultActions.get(defaultAction) && action.options.name == this.defaultActions.get(defaultAction)) {
						isDefault = true
					}
				}
			}
			contextActions.push({
				name: action.getKeyedText(),
				alt: action.options.title,
				image: resolveImageSource(action.options.src, '/images/crystal/actions/ICON_SIZE', 16),
				isDefault: isDefault,
				callback: function (e) {
					this.apply()
				}.bind(action)
			});
			crtGroup = action.context.actionBarGroup
		}.bind(this));
		return contextActions
	},
	getInfoPanelActions: function () {
		var actions = $A([]);
		this.actions.each(function (pair) {
			var action = pair.value;
			if (action.context.infoPanel && !action.deny) actions.push(action)
		});
		return actions
	},
	fireDefaultAction: function (defaultName) {
		var actionName = this.defaultActions.get(defaultName);
		if (actionName != null) {
			arguments[0] = actionName;
			if (actionName == "ls") {
				var action = this.actions.get(actionName);
				if (action) action.enable()
			}
			this.fireAction.apply(this, arguments)
		}
	},
	fireAction: function (buttonAction) {
		var action = this.actions.get(buttonAction);
		if (action != null) {
			var args = $A(arguments);
			args.shift();
			action.apply(args);
			return
		}
	},
	registerKey: function (key, actionName) {
		this._registeredKeys.set(key.toLowerCase(), actionName)
	},
	clearRegisteredKeys: function () {
		this._registeredKeys = new Hash()
	},
	fireActionByKey: function (event, keyName) {
		if (this._registeredKeys.get(keyName) && !ajaxplorer.blockShortcuts) {
			this.fireAction(this._registeredKeys.get(keyName));
			Event.stop(event)
		}
		return
	},
	applyDragMove: function (fileName, destDir, destNodeName, copy) {
		if ((!copy && !this.defaultActions.get('dragndrop')) || (copy && (!this.defaultActions.get('ctrldragndrop') || this.getDefaultAction('ctrldragndrop').deny))) {
			return
		}
		if (fileName == null) fileNames = ajaxplorer.filesList.getUserSelection().getFileNames();
		else fileNames = [fileName];
		if (destNodeName != null) {
			if (this.checkDestIsChildOfSource(fileNames, destNodeName)) {
				ajaxplorer.displayMessage('ERROR', MessageHash[202]);
				return
			}
			for (var i = 0; i < fileNames.length; i++) {
				if (fileNames[i] == destDir) {
					ajaxplorer.displayMessage('ERROR', MessageHash[202]);
					return
				}
			}
			if (destDir == ajaxplorer.filesList.getCurrentRep()) {
				ajaxplorer.displayMessage('ERROR', MessageHash[203]);
				return
			}
		}
		var connexion = new Connexion();
		if (copy) {
			connexion.addParameter('get_action', this.defaultActions.get('ctrldragndrop'))
		} else {
			connexion.addParameter('get_action', this.defaultActions.get('dragndrop'))
		}
		if (fileName != null) {
			connexion.addParameter('file', fileName)
		} else {
			for (var i = 0; i < fileNames.length; i++) {
				connexion.addParameter('file_' + i, fileNames[i])
			}
		}
		connexion.addParameter('dest', destDir);
		if (destNodeName) connexion.addParameter('dest_node', destNodeName);
		connexion.addParameter('dir', ajaxplorer.getFilesList().getCurrentRep());
		oThis = this;
		connexion.onComplete = function (transport) {
			oThis.parseXmlMessage(transport.responseXML)
		};
		connexion.sendAsync()
	},
	getDefaultAction: function (defaultName) {
		if (this.defaultActions.get(defaultName)) {
			return this.actions.get(this.defaultActions.get(defaultName))
		}
		return null
	},
	checkDestIsChildOfSource: function (srcNames, destNodeName) {
		if (typeof srcNames == "string") {
			srcNames = [srcNames]
		}
		var destNode = webFXTreeHandler.all[destNodeName];
		while (destNode.parentNode) {
			for (var i = 0; i < srcNames.length; i++) {
				if (destNode.filename == srcNames[i]) {
					return true
				}
			}
			destNode = destNode.parentNode
		}
		return false
	},
	submitForm: function (formName, post) {
		var connexion = new Connexion();
		if (post) {
			connexion.setMethod('POST')
		}
		$(formName).getElements().each(function (fElement) {
			var fValue = fElement.getValue();
			if (fElement.name == 'get_action' && fValue.substr(0, 4) == 'http') {
				fValue = getBaseName(fValue)
			}
			if (fElement.type == 'radio' && !fElement.checked) return;
			connexion.addParameter(fElement.name, fValue)
		});
		connexion.addParameter('dir', ajaxplorer.getFilesList().getCurrentRep());
		oThis = this;
		connexion.onComplete = function (transport) {
			oThis.parseXmlMessage(transport.responseXML)
		};
		connexion.sendAsync()
	},
	parseXmlMessage: function (xmlResponse) {
		var messageBox = ajaxplorer.messageBox;
		if (xmlResponse == null || xmlResponse.documentElement == null) return;
		var childs = xmlResponse.documentElement.childNodes;
		for (var i = 0; i < childs.length; i++) {
			if (childs[i].tagName == "message") {
				var messageTxt = "No message";
				if (childs[i].firstChild) messageTxt = childs[i].firstChild.nodeValue;
				ajaxplorer.displayMessage(childs[i].getAttribute('type'), messageTxt)
			} else if (childs[i].tagName == "reload_instruction") {
				var obName = childs[i].getAttribute('object');
				if (obName == 'tree') {
					var node = childs[i].getAttribute('node');
					if (node == null) ajaxplorer.foldersTree.reloadCurrentNode();
					else ajaxplorer.foldersTree.reloadNode(node)
				} else if (obName == 'list') {
					var file = childs[i].getAttribute('file');
					ajaxplorer.filesList.reload(file)
				} else if (obName == 'repository_list') {
					ajaxplorer.reloadRepositoriesList()
				}
			} else if (childs[i].tagName == "logging_result") {
				var result = childs[i].getAttribute('value');
				if (result == '1') {
					hideLightBox(true);
					if (childs[i].getAttribute('remember_login') && childs[i].getAttribute('remember_pass')) {
						var login = childs[i].getAttribute('remember_login');
						var pass = childs[i].getAttribute('remember_pass');
						storeRememberData(login, pass)
					}
					ajaxplorer.getLoggedUserFromServer()
				} else if (result == '0' || result == '-1') {
					alert(MessageHash[285])
				} else if (result == '2') {
					ajaxplorer.getLoggedUserFromServer()
				} else if (result == '-2') {
					alert(MessageHash[286])
				}
			} else if (childs[i].tagName == "trigger_bg_action") {
				var name = childs[i].getAttribute("name");
				var messageId = childs[i].getAttribute("messageId");
				var parameters = new Hash();
				for (var j = 0; j < childs[i].childNodes.length; j++) {
					var paramChild = childs[i].childNodes[j];
					if (paramChild.tagName == 'param') {
						parameters.set(paramChild.getAttribute("name"), paramChild.getAttribute("value"))
					}
				}
				this.bgManager.queueAction(name, parameters, messageId);
				this.bgManager.next()
			}
		}
	},
	removeBookmark: function (path) {
		this.bookmarksBar.removeBookmark(path)
	},
	loadBookmarks: function () {
		this.bookmarksBar.load()
	},
	fireSelectionChange: function () {
		var userSelection = null;
		if (ajaxplorer && ajaxplorer.getFilesList() && ajaxplorer.getFilesList().getUserSelection()) {
			userSelection = ajaxplorer.getFilesList().getUserSelection()
		}
		this.actions.each(function (pair) {
			pair.value.fireSelectionChange(userSelection)
		});
		this.refreshToolbarsSeparator()
	},
	fireContextChange: function () {
		var crtRecycle = false;
		var crtInZip = false;
		var crtIsRoot = false;
		var crtMime;
		if (ajaxplorer && ajaxplorer.foldersTree) {
			crtRecycle = ajaxplorer.foldersTree.currentIsRecycle();
			crtInZip = ajaxplorer.foldersTree.currentInZip();
			crtIsRoot = ajaxplorer.foldersTree.currentIsRoot();
			crtMime = ajaxplorer.foldersTree.getCurrentNodeMime()
		}
		var displayMode = '';
		if (ajaxplorer && ajaxplorer.filesList) displayMode = ajaxplorer.filesList.getDisplayMode();
		this.actions.each(function (pair) {
			pair.value.fireContextChange(this.usersEnabled, this.oUser, crtRecycle, displayMode, crtInZip, crtIsRoot, crtMime)
		}.bind(this));
		this.refreshToolbarsSeparator()
	},
	initToolbars: function () {
		var crtCount = 0;
		var toolbarsList = $A(['default', 'put', 'get', 'change', 'user', 'remote']);
		toolbarsList.each(function (toolbar) {
			var tBar = this.initToolbar(toolbar);
			if (tBar && tBar.actionsCount) {
				if (crtCount < toolbarsList.size() - 1) {
					var separator = new Element('div');
					separator.addClassName('separator');
					tBar.insert({
						top: separator
					})
				}
				$('buttons_bar').insert(tBar);
				crtCount++
			}
		}.bind(this))
	},
	refreshToolbarsSeparator: function () {
		this.toolbars.each(function (pair) {
			var toolbar = $('buttons_bar').select('[id="' + pair.key + '_toolbar"]')[0];
			if (!toolbar) return;
			var sep = toolbar.select('div.separator')[0];
			if (!sep) return;
			var hasVisibleActions = false;
			toolbar.select('a').each(function (action) {
				if (action.visible()) hasVisibleActions = true
			});
			if (hasVisibleActions) sep.show();
			else sep.hide()
		})
	},
	initToolbar: function (toolbar) {
		if (!this.toolbars.get(toolbar)) {
			return
		}
		var toolEl = $(toolbar + '_toolbar');
		if (!toolEl) {
			var bgColor = $('action_bar').getStyle('backgroundColor');
			var toolEl = new Element('div', {
				id: toolbar + '_toolbar',
				style: 'display:inline;background-color:' + bgColor
			})
		}
		toolEl.actionsCount = 0;
		this.toolbars.get(toolbar).each(function (actionName) {
			var action = this.actions.get(actionName);
			toolEl.insert(action.toActionBar());
			toolEl.actionsCount++
		}.bind(this));
		return toolEl
	},
	emptyToolbars: function () {
		$('buttons_bar').select('div').each(function (divElement) {
			divElement.remove()
		}.bind(this));
		this.toolbars = new Hash()
	},
	removeActions: function () {
		this.actions.each(function (pair) {
			pair.value.remove()
		});
		this.actions = new Hash();
		this.emptyToolbars();
		this.clearRegisteredKeys()
	},
	loadActions: function (type) {
		this.removeActions();
		var connexion = new Connexion();
		connexion.onComplete = function (transport) {
			this.parseActions(transport.responseXML)
		}.bind(this);
		connexion.addParameter('get_action', 'get_ajxp_actions');
		connexion.sendSync();
		if (!type) {
			connexion.addParameter('get_action', 'get_driver_actions');
			connexion.sendSync()
		}
		this.initToolbars();
		if (ajaxplorer && ajaxplorer.infoPanel) ajaxplorer.infoPanel.load();
		this.fireContextChange();
		this.fireSelectionChange()
	},
	parseActions: function (xmlResponse) {
		if (xmlResponse == null || xmlResponse.documentElement == null) return;
		var actions = xmlResponse.documentElement.childNodes;
		for (var i = 0; i < actions.length; i++) {
			if (actions[i].nodeName != 'action') continue;
			if (actions[i].getAttribute('enabled') == 'false') continue;
			var newAction = new Action();
			newAction.createFromXML(actions[i]);
			this.actions.set(actions[i].getAttribute('name'), newAction);
			if (actions[i].getAttribute('dirDefault') && actions[i].getAttribute('dirDefault') == "true") {
				this.defaultActions.set('dir', actions[i].getAttribute('name'))
			} else if (actions[i].getAttribute('fileDefault') && actions[i].getAttribute('fileDefault') == "true") {
				this.defaultActions.set('file', actions[i].getAttribute('name'))
			} else if (actions[i].getAttribute('dragndropDefault') && actions[i].getAttribute('dragndropDefault') == "true") {
				this.defaultActions.set('dragndrop', actions[i].getAttribute('name'))
			} else if (actions[i].getAttribute('ctrlDragndropDefault') && actions[i].getAttribute('ctrlDragndropDefault') == "true") {
				this.defaultActions.set('ctrldragndrop', actions[i].getAttribute('name'))
			}
			if (newAction.context.actionBar) {
				if (this.toolbars.get(newAction.context.actionBarGroup) == null) {
					this.toolbars.set(newAction.context.actionBarGroup, new Array())
				}
				this.toolbars.get(newAction.context.actionBarGroup).push(newAction.options.name)
			}
			if (newAction.options.hasAccessKey) {
				this.registerKey(newAction.options.accessKey, newAction.options.name)
			}
			if (ajaxplorer && ajaxplorer.filesList && newAction.options.name == "ls") {
				for (var j = 0; j < actions[i].childNodes.length; j++) {
					if (actions[i].childNodes[j].nodeName == 'displayDefinitions') {
						var displayDef = actions[i].childNodes[j];
						break
					}
				}
				if (!displayDef) continue;
				for (var j = 0; j < displayDef.childNodes.length; j++) {
					if (displayDef.childNodes[j].nodeName == 'display' && displayDef.childNodes[j].getAttribute('mode') == 'list') {
						var columnsDef = displayDef.childNodes[j]
					}
				}
				if (!columnsDef) continue;
				var columns = $A([]);
				$A(columnsDef.childNodes).each(function (column) {
					if (column.nodeName == "column") {
						columns.push({
							messageId: column.getAttribute("messageId"),
							attributeName: column.getAttribute("attributeName")
						})
					}
				});
				ajaxplorer.filesList.setColumnsDef(columns)
			}
		}
	},
	getActionByName: function (actionName) {
		return this.actions.get(actionName)
	},
	locationBarSubmit: function (url) {
		if (url == '') return false;
		this._ajaxplorer.goTo(url);
		return false
	},
	locationBarFocus: function () {
		$('current_path').activate()
	},
	updateLocationBar: function (newPath) {
		$('current_path').value = newPath
	},
	getLocationBarValue: function () {
		return $('current_path').getValue()
	},
	focus: function () {
		$('current_path').focus();
		this.hasFocus = true
	},
	blur: function () {
		$('current_path').blur();
		this.hasFocus = false
	},
	getFlashVersion: function () {
		if (!this.pluginVersion) {
			var x;
			if (navigator.plugins && navigator.mimeTypes.length) {
				x = navigator.plugins["Shockwave Flash"];
				if (x && x.description) x = x.description
			} else if (Prototype.Browser.IE) {
				try {
					x = new ActiveXObject("ShockwaveFlash.ShockwaveFlash");
					x = x.GetVariable("$version")
				} catch(e) {}
			}
			this.pluginVersion = (typeof(x) == 'string') ? parseInt(x.match(/\d+/)[0]) : 0
		}
		return this.pluginVersion
	}
});
BackgroundManager = Class.create({
	queue: $A([]),
	initialize: function (actionManager) {
		this.actionManager = actionManager;
		this.panel = new Element('div').addClassName('backgroundPanel');
		if (Prototype.Browser.IE) {
			this.panel.setStyle({
				width: '35%'
			})
		}
		this.panel.hide();
		this.working = false;
		document.body.insert(this.panel)
	},
	queueAction: function (actionName, parameters, messageId) {
		var actionDef = new Hash();
		actionDef.set('name', actionName);
		actionDef.set('messageId', messageId);
		actionDef.set('parameters', parameters);
		this.queue.push(actionDef)
	},
	next: function () {
		if (!this.queue.size()) {
			this.finished();
			return
		}
		if (this.working) return;
		var actionDef = this.queue[0];
		var connexion = new Connexion();
		connexion.setParameters(actionDef.get('parameters'));
		connexion.addParameter('get_action', actionDef.get('name'));
		connexion.onComplete = function (transport) {
			var xmlResponse = transport.responseXML;
			if (xmlResponse == null || xmlResponse.documentElement == null) {
				alert(transport.responseText);
				this.working = false;
				this.next();
				return
			}
			this.parseAnswer(transport.responseXML);
			this.working = false
		}.bind(this);
		connexion.sendAsync();
		var imgString = '<img src="' + ajxpResourcesFolder + '/images/loadingImage.gif" height="16" width="16" align="absmiddle">';
		this.panel.update(imgString + ' ' + actionDef.get('messageId'));
		this.panel.show();
		new Effect.Corner(this.panel, "round 8px bl");
		new Effect.Corner(this.panel, "round 8px tl");
		this.queue.shift();
		this.working = true
	},
	parseAnswer: function (xmlResponse) {
		var childs = xmlResponse.documentElement.childNodes;
		for (var i = 0; i < childs.length; i++) {
			if (childs[i].tagName == "message") {
				var type = childs[i].getAttribute('type');
				if (type != 'SUCCESS') {
					return this.interruptOnError(childs[i].firstChild.nodeValue)
				}
			} else if (childs[i].nodeName == "trigger_bg_action") {
				var name = childs[i].getAttribute("name");
				var messageId = childs[i].getAttribute("messageId");
				var parameters = new Hash();
				for (var j = 0; j < childs[i].childNodes.length; j++) {
					var paramChild = childs[i].childNodes[j];
					if (paramChild.tagName == 'param') {
						parameters.set(paramChild.getAttribute("name"), paramChild.getAttribute("value"))
					}
				}
				this.queueAction(name, parameters, messageId)
			}
		}
		this.working = false;
		this.next()
	},
	interruptOnError: function (errorMessage) {
		if (this.queue.size()) this.queue = $A([]);
		this.panel.update(errorMessage);
		this.panel.insert(this.makeCloseLink());
		this.working = false
	},
	finished: function () {
		this.working = false;
		this.panel.hide()
	},
	makeCloseLink: function () {
		var link = new Element('a', {
			href: '#'
		}).update('Close').observe('click', function (e) {
			Event.stop(e);
			this.panel.hide()
		}.bind(this));
		return link
	},
	addStub: function () {
		this.queueAction('local_to_remote', new Hash(), 'Stubing a 10s bg action')
	}
});
UserSelection = Class.create({
	_currentRep: undefined,
	_selectedItems: undefined,
	_bEmpty: undefined,
	_bUnique: false,
	_bFile: false,
	_bDir: false,
	_isRecycle: false,
	initialize: function (aSelectedItems, sCurrentRep) {
		this._currentRep = sCurrentRep;
		this._selectedItems = aSelectedItems;
		this._bEmpty = ((aSelectedItems && aSelectedItems.length) ? false: true);
		if (!this._bEmpty) {
			this._bUnique = ((aSelectedItems.length == 1) ? true: false);
			for (var i = 0; i < aSelectedItems.length; i++) {
				var selectedObj = aSelectedItems[i];
				if (selectedObj.getAttribute('is_file') && (selectedObj.getAttribute('is_file') == '1' || selectedObj.getAttribute('is_file') == 'true')) this._bFile = true;
				else this._bDir = true;
				if (selectedObj.getAttribute('is_recycle') && selectedObj.getAttribute('is_recycle') == '1') this._isRecycle = true
			}
		}
	},
	isEmpty: function () {
		return this._bEmpty
	},
	isUnique: function () {
		return this._bUnique
	},
	hasFile: function () {
		return this._bFile
	},
	hasDir: function () {
		return this._bDir
	},
	isRecycle: function () {
		return this._isRecycle
	},
	getCurrentRep: function () {
		return this._currentRep
	},
	isMultiple: function () {
		if (this._selectedItems.length > 1) return true;
		return false
	},
	hasMime: function (mimeTypes) {
		if (mimeTypes.length == 1 && mimeTypes[0] == "*") return true;
		var has = false;
		var selectedItems = $A(this._selectedItems);
		mimeTypes.each(function (mime) {
			if (has) return;
			has = selectedItems.any(function (item) {
				return (getAjxpMimeType(item) == mime)
			})
		});
		return has
	},
	getFileNames: function () {
		if (!this._selectedItems.length) {
			alert('Please select a file!');
			return
		}
		var tmp = new Array(this._selectedItems.length);
		for (i = 0; i < this._selectedItems.length; i++) {
			tmp[i] = this._selectedItems[i].getAttribute('filename')
		}
		return tmp
	},
	getUniqueFileName: function () {
		if (this.getFileNames().length) return this.getFileNames()[0];
		return null
	},
	getUniqueItem: function () {
		return this._selectedItems[0]
	},
	getItem: function (i) {
		return this._selectedItems[i]
	},
	updateFormOrUrl: function (oFormElement, sUrl) {
		if (oFormElement) {
			$(oFormElement).getElementsBySelector("input").each(function (element) {
				if (element.name.indexOf("file_") != -1 || element.name == "file") element.value = ""
			})
		}
		if (oFormElement && oFormElement.rep) oFormElement.rep.value = this._currentRep;
		sUrl += '&dir=' + encodeURIComponent(this._currentRep);
		if (this.isEmpty()) return sUrl;
		var fileNames = this.getFileNames();
		if (this.isUnique()) {
			sUrl += '&' + 'file=' + encodeURIComponent(fileNames[0]);
			if (oFormElement) this._addHiddenField(oFormElement, 'file', fileNames[0])
		} else {
			for (var i = 0; i < fileNames.length; i++) {
				sUrl += '&' + 'file_' + i + '=' + encodeURIComponent(fileNames[i]);
				if (oFormElement) this._addHiddenField(oFormElement, 'file_' + i, fileNames[i])
			}
		}
		return sUrl
	},
	_addHiddenField: function (oFormElement, sFieldName, sFieldValue) {
		if (oFormElement[sFieldName]) oFormElement[sFieldName].value = sFieldValue;
		else {
			var field = document.createElement('input');
			field.type = 'hidden';
			field.name = sFieldName;
			field.value = sFieldValue;
			oFormElement.appendChild(field)
		}
	}
});
FilesList = Class.create(SelectableElements, {
	initialize: function ($super, oElement, bSelectMultiple, oSortTypes, sCurrentRep, oAjaxplorer, sDefaultDisplay) {
		$super(oElement, bSelectMultiple);
		this._displayMode = sDefaultDisplay;
		Event.observe(document, "ajaxplorer:user_logged", function () {
			if (!ajaxplorer || !ajaxplorer.user) return;
			this._thumbSize = parseInt(ajaxplorer.user.getPreference("thumb_size"));
			if (this.slider) {
				this.slider.setValue(this._thumbSize);
				this.resizeThumbnails()
			}
		}.bind(this));
		this._thumbSize = 64;
		this._crtImageIndex = 0;
		this._bSelection = false;
		this._bUnique = false;
		this._bFile = false;
		this._bDir = false;
		this._bEditable = false;
		this._oSortTypes = oSortTypes;
		this._ajaxplorer = oAjaxplorer;
		this._pendingFile = null;
		this._currentRep = sCurrentRep;
		this.allDraggables = new Array();
		this.allDroppables = new Array();
		this.gridStyle = "grid";
		this.paginationData = null;
		this.even = true;
		this.columnsDef = $A([]);
		this.columnsDef.push({
			messageId: 1,
			attributeName: 'ajxp_label'
		});
		this.columnsDef.push({
			messageId: 2,
			attributeName: 'filesize'
		});
		this.columnsDef.push({
			messageId: 3,
			attributeName: 'mimestring'
		});
		this.columnsDef.push({
			messageId: 4,
			attributeName: 'ajxp_modiftime'
		});
		this.defaultSortTypes = ["StringDirFile", "NumberKo", "String", "MyDate"];
		this._oSortTypes = this.defaultSortTypes;
		this.initGUI();
		Event.observe(document, "keydown", function (e) {
			if (e == null) e = $('content_pane').ownerDocument.parentWindow.event;
			return this.keydown(e)
		}.bind(this));
		if (this._currentRep != null) {
			this.loadXmlList(this._currentRep)
		}
	},
	initGUI: function () {
		if (this._displayMode == "list") {
			var buffer = '';
			if (this.gridStyle == "grid") {
				buffer = buffer + '<div style="overflow:hidden;background-color: #aaa;">'
			}
			buffer = buffer + '<TABLE width="100%" cellspacing="0"  id="selectable_div_header" class="sort-table">';
			this.columnsDef.each(function (column) {
				buffer = buffer + '<col\>'
			});
			buffer = buffer + '<thead><tr>';
			for (var i = 0; i < this.columnsDef.length; i++) {
				var column = this.columnsDef[i];
				var last = '';
				if (i == this.columnsDef.length - 1) last = ' id="last_header"';
				buffer = buffer + '<td column_id="' + i + '" ajxp_message_id="' + (column.messageId || '') + '"' + last + '>' + (column.messageId ? MessageHash[column.messageId] : column.messageString) + '</td>'
			}
			buffer = buffer + '</tr></thead></table>';
			if (this.gridStyle == "grid") {
				buffer = buffer + '</div>'
			}
			buffer = buffer + '<div id="table_rows_container" style="overflow:auto;"><table id="selectable_div" class="sort-table" width="100%" cellspacing="0"><tbody></tbody></table></div>';
			$('content_pane').innerHTML = buffer;
			oElement = $('selectable_div');
			if (this.paginationData && parseInt(this.paginationData.get('total')) > 1) {
				$('table_rows_container').insert({
					before: this.createPaginator()
				})
			}
			this.initSelectableItems(oElement, true, $('table_rows_container'));
			this._sortableTable = new AjxpSortable(oElement, this._oSortTypes, $('selectable_div_header'));
			this._sortableTable.onsort = this.redistributeBackgrounds.bind(this);
			if (this.paginationData && this.paginationData.get('remote_order') && parseInt(this.paginationData.get('total')) > 1) {
				this._sortableTable.setPaginationBehaviour(function (params) {
					this.reload(null, null, params)
				}.bind(this), this.columnsDef, this.paginationData.get('currentOrderCol') || -1, this.paginationData.get('currentOrderDir'))
			}
			fitHeightToBottom($('table_rows_container'), $('content_pane'), (!Prototype.Browser.IE ? 2 : 0));
			this.disableTextSelection($('selectable_div_header'));
			this.disableTextSelection($('table_rows_container'));
			fitHeightToBottom($('table_rows_container'), $('content_pane'), (!Prototype.Browser.IE ? 2 : 0));
			document.observe("ajaxplorer:loaded", function () {
				fitHeightToBottom($('table_rows_container'), $('content_pane'), (!Prototype.Browser.IE ? 2 : 0), true)
			})
		} else if (this._displayMode == "thumb") {
			var buffer = '<TABLE width="100%" cellspacing="0" cellpadding="0" class="sort-table">';
			buffer = buffer + '<thead><tr>';
			buffer = buffer + '<td style="border-right:0px;" ajxp_message_id="126">' + MessageHash[126] + '</td>';
			buffer = buffer + '<td align="right" id="last_header"><div class="slider" id="slider-1"><input class="slider-input" id="slider-input-1" name="slider-input-1"/></div></td>';
			buffer = buffer + '</tr></thead><tbody><tr><td colspan="2" style="padding:0px;"><div id="selectable_div" style="overflow:auto; padding:2px 5px;"></div></td></tr></tbody></table>';
			$('content_pane').innerHTML = buffer;
			if (this.paginationData && parseInt(this.paginationData.get('total')) > 1) {
				$('selectable_div').insert({
					before: this.createPaginator()
				})
			}
			fitHeightToBottom($('selectable_div'), $('content_pane'), (!Prototype.Browser.IE ? 6 : 0), false, 100);
			document.observe("ajaxplorer:loaded", function () {
				fitHeightToBottom($('selectable_div'), $('content_pane'), (!Prototype.Browser.IE ? 6 : 0), false, 100)
			});
			if (ajaxplorer && ajaxplorer.user && ajaxplorer.user.getPreference("thumb_size")) {
				this._thumbSize = parseInt(ajaxplorer.user.getPreference("thumb_size"))
			}
			this.slider = new Slider($("slider-1"), $("slider-input-1"));
			this.slider.setMaximum(250);
			this.slider.setMinimum(30);
			this.slider.recalculate();
			this.slider.setValue(this._thumbSize);
			this.slider.onchange = function () {
				this._thumbSize = this.slider.getValue();
				this.resizeThumbnails();
				if (!ajaxplorer || !ajaxplorer.user) return;
				if (this.sliderTimer) clearTimeout(this.sliderTimer);
				this.sliderTimer = setTimeout(function () {
					ajaxplorer.user.setPreference("thumb_size", this._thumbSize);
					ajaxplorer.user.savePreferences()
				}.bind(this), 100)
			}.bind(this);
			this.disableTextSelection($('selectable_div'));
			this.initSelectableItems($('selectable_div'), true)
		}
	},
	createPaginator: function () {
		var current = parseInt(this.paginationData.get('current'));
		var total = parseInt(this.paginationData.get('total'));
		var div = new Element('div').addClassName("paginator");
		div.update('Page ' + current + '/' + total);
		if (current > 1) {
			div.insert({
				top: this.createPaginatorLink(current - 1, '<b>&lt;</b>&nbsp;&nbsp;&nbsp;', 'Previous')
			});
			if (current > 2) {
				div.insert({
					top: this.createPaginatorLink(1, '<b>&lt;&lt;</b>&nbsp;&nbsp;&nbsp;', 'First')
				})
			}
		}
		if (total > 1 && current < total) {
			div.insert({
				bottom: this.createPaginatorLink(current + 1, '&nbsp;&nbsp;&nbsp;<b>&gt;</b>', 'Next')
			});
			if (current < (total - 1)) {
				div.insert({
					bottom: this.createPaginatorLink(total, '&nbsp;&nbsp;&nbsp;<b>&gt;&gt;</b>', 'Last')
				})
			}
		}
		return div
	},
	createPaginatorLink: function (page, text, title) {
		return new Element('a', {
			href: '#',
			style: 'font-size:12px;',
			title: title
		}).update(text).observe('click', function (e) {
			var path = this._currentRep;
			if (this._currentRep.indexOf("#") > -1) {
				var path = this._currentRep.substring(0, this._currentRep.indexOf("#"))
			}
			path = path + "#" + page;
			ajaxplorer.actionBar.updateLocationBar(path);
			ajaxplorer.foldersTree.setCurrentNodeProperty("pagination_anchor", page);
			this.loadXmlList(path);
			Event.stop(e)
		}.bind(this))
	},
	setColumnsDef: function (aColumns) {
		this.columnsDef = aColumns;
		if (this._displayMode == "list") {
			this.initGUI()
		}
	},
	getColumnsDef: function () {
		return this.columnsDef
	},
	setContextualMenu: function (protoMenu) {
		this.protoMenu = protoMenu
	},
	switchDisplayMode: function (mode) {
		if (mode) {
			this._displayMode = mode
		} else {
			if (this._displayMode == "thumb") this._displayMode = "list";
			else this._displayMode = "thumb"
		}
		var currentSelection = this.getSelectedFileNames();
		this.initGUI();
		this.reload(currentSelection);
		this.fireChange();
		if (ajaxplorer && ajaxplorer.user) {
			ajaxplorer.user.setPreference("display", this._displayMode);
			ajaxplorer.user.savePreferences()
		}
		return this._displayMode
	},
	getDisplayMode: function () {
		return this._displayMode
	},
	getHeadersWidth: function () {
		if (this._displayMode == 'thumb') return;
		var tds = $('selectable_div_header').getElementsBySelector('td');
		this.headersWidth = new Hash();
		var index = 0;
		tds.each(function (cell) {
			this.headersWidth.set(index, cell.getWidth() - 8);
			index++
		}.bind(this))
	},
	applyHeadersWidth: function () {
		if (this._displayMode == "thumb") return;
		if (this.gridStyle == "grid") {
			window.setTimeout(function () {
				var allItems = this.getItems();
				if (!allItems.length) return;
				var tds = $(allItems[0]).getElementsBySelector('td');
				var headerCells = $('selectable_div_header').getElementsBySelector('td');
				var divDim = $('selectable_div').getDimensions();
				var contDim = $('table_rows_container').getDimensions();
				if (divDim.height > contDim.height && !(divDim.width > contDim.width)) {
					$('selectable_div_header').setStyle({
						width: ($('selectable_div_header').getWidth() - 17) + 'px'
					})
				}
				var index = 0;
				headerCells.each(function (cell) {
					cell.setStyle({
						padding: 0
					});
					var div = new Element('div').update('&nbsp;' + cell.innerHTML);
					div.setStyle({
						height: cell.getHeight(),
						overflow: 'hidden'
					});
					div.setStyle({
						width: tds[index].getWidth() - 4 + 'px'
					});
					div.setAttribute("title", new String(cell.innerHTML).stripTags());
					cell.update(div);
					cell.setStyle({
						width: tds[index].getWidth() + 'px'
					});
					index++
				})
			}.bind(this), 10);
			return
		}
		this.getHeadersWidth();
		var allItems = this.getItems();
		for (var i = 0; i < allItems.length; i++) {
			var tds = $(allItems[i]).getElementsBySelector('td');
			var index = 0;
			var widthes = this.headersWidth;
			tds.each(function (cell) {
				if (index == (tds.size() - 1)) return;
				cell.setStyle({
					width: widthes.get(index) + 'px'
				});
				index++
			})
		}
	},
	initRows: function () {
		if (this._displayMode == "thumb") {
			this.resizeThumbnails();
			if (this.protoMenu) this.protoMenu.addElements('#selectable_div');
			window.setTimeout(this.loadNextImage.bind(this), 10)
		} else {
			if (this.protoMenu) this.protoMenu.addElements('#table_rows_container');
			this.applyHeadersWidth()
		}
		if (this.protoMenu) this.protoMenu.addElements('.ajxp_draggable');
		var allItems = this.getItems();
		for (var i = 0; i < allItems.length; i++) {
			this.disableTextSelection(allItems[i])
		}
	},
	loadNextImage: function () {
		if (this.imagesHash && this.imagesHash.size()) {
			if (this.loading) return;
			var oImageToLoad = this.imagesHash.unset(this.imagesHash.keys()[0]);
			window.loader = new Image();
			loader.src = "content.php?action=image_proxy&get_thumb=true&file=" + encodeURIComponent(oImageToLoad.filename);
			loader.onload = function () {
				var img = oImageToLoad.rowObject.IMAGE_ELEMENT || $(oImageToLoad.index);
				if (img == null) return;
				img.src = "content.php?action=image_proxy&get_thumb=true&file=" + encodeURIComponent(oImageToLoad.filename);
				img.height = oImageToLoad.height;
				img.width = oImageToLoad.width;
				img.setStyle({
					marginTop: oImageToLoad.marginTop + 'px',
					marginBottom: oImageToLoad.marginBottom + 'px'
				});
				img.setAttribute("is_loaded", "true");
				this.resizeThumbnails(oImageToLoad.rowObject);
				this.loadNextImage()
			}.bind(this)
		} else {
			if (window.loader) window.loader = null
		}
	},
	reload: function (pendingFileToSelect, url, additionnalParameters) {
		if (this._currentRep != null) {
			this.loadXmlList(this._currentRep, pendingFileToSelect, url, additionnalParameters)
		}
	},
	setPendingSelection: function (pendingFilesToSelect) {
		this._pendingFile = pendingFilesToSelect
	},
	loadXmlList: function (repToLoad, pendingFileToSelect, url, additionnalParameters) {
		this._currentRep = repToLoad;
		var connexion = new Connexion(url);
		connexion.addParameter('mode', 'file_list');
		connexion.addParameter('dir', repToLoad);
		if (additionnalParameters) {
			additionnalParameters.each(function (pair) {
				connexion.addParameter(pair.key, pair.value)
			})
		}
		this._pendingFile = pendingFileToSelect;
		this.setOnLoad();
		connexion.onComplete = function (transport) {
			try {
				this.parseXmlAndLoad(transport.responseXML)
			} catch(e) {
				if (ajaxplorer) ajaxplorer.displayMessage('Loading error :' + e.message);
				else alert('Loading error :' + e.message)
			} finally {
				this.removeOnLoad()
			}
		}.bind(this);
		connexion.sendAsync()
	},
	parseXmlAndLoad: function (oXmlDoc) {
		if (oXmlDoc == null || oXmlDoc.documentElement == null) {
			return
		}
		this.loading = false;
		this.imagesHash = new Hash();
		if (this.protoMenu) {
			this.protoMenu.removeElements('.ajxp_draggable');
			this.protoMenu.removeElements('#selectable_div')
		}
		for (var i = 0; i < this.allDroppables.length; i++) {
			Droppables.remove(this.allDroppables[i]);
			delete this.allDroppables[i]
		}
		for (i = 0; i < this.allDraggables.length; i++) {
			this.allDraggables[i].destroy();
			delete this.allDraggables[i]
		}
		this.allDraggables = new Array();
		this.allDroppables = new Array();
		var root = oXmlDoc.documentElement;
		var cs = root.childNodes;
		var l = cs.length;
		for (var i = 0; i < l; i++) {
			if (cs[i].tagName == "require_auth") {
				if (modal.pageLoading) modal.updateLoadingProgress('List Loaded');
				ajaxplorer.actionBar.fireAction('login');
				this.removeCurrentLines();
				this.fireChange();
				return
			}
		}
		var refreshGUI = false;
		this.gridStyle = 'file';
		this.even = false;
		this._oSortTypes = this.defaultSortTypes;
		if (this.paginationData) {
			this.paginationData = null;
			refreshGUI = true
		}
		for (var i = 0; i < l; i++) {
			if (cs[i].nodeName == "error" || cs[i].nodeName == "message") {
				var type = "ERROR";
				if (cs[i].nodeName == "message") type = cs[i].getAttribute('type');
				if (modal.pageLoading) {
					alert(type + ':' + cs[i].firstChild.nodeValue);
					this.fireChange()
				} else {
					ajaxplorer.displayMessage(type, cs[i].firstChild.nodeValue);
					this.fireChange();
					return
				}
			} else if (cs[i].nodeName == "columns") {
				if (cs[i].getAttribute('switchGridMode')) {
					this.gridStyle = cs[i].getAttribute('switchGridMode')
				}
				if (cs[i].getAttribute('switchDisplayMode')) {
					var dispMode = cs[i].getAttribute('switchDisplayMode');
					if (dispMode != this._displayMode) {
						this.switchDisplayMode(dispMode)
					}
				}
				var newCols = $A([]);
				var sortTypes = $A([]);
				for (var j = 0; j < cs[i].childNodes.length; j++) {
					var col = cs[i].childNodes[j];
					if (col.nodeName == "column") {
						var obj = {};
						$A(col.attributes).each(function (att) {
							obj[att.nodeName] = att.nodeValue;
							if (att.nodeName == "sortType") {
								sortTypes.push(att.nodeValue)
							}
						});
						newCols.push(obj)
					}
				}
				if (newCols.size()) {
					this.columnsDef = newCols;
					this._oSortTypes = sortTypes;
					if (this._displayMode == "list") refreshGUI = true
				}
			} else if (cs[i].nodeName == "pagination") {
				this.paginationData = new Hash();
				$A(cs[i].attributes).each(function (att) {
					this.paginationData.set(att.nodeName, att.nodeValue)
				}.bind(this));
				refreshGUI = true
			}
		}
		if (refreshGUI) {
			this.initGUI()
		}
		var items = this.getSelectedItems();
		var setItemSelected = this.setItemSelected.bind(this);
		for (var i = 0; i < items.length; i++) {
			setItemSelected(items[i], false)
		}
		this.removeCurrentLines();
		var parseXmlNodeFunc;
		if (this._displayMode == "list") parseXmlNodeFunc = this.xmlNodeToTableRow.bind(this);
		else parseXmlNodeFunc = this.xmlNodeToDiv.bind(this);
		this.parsingCache = new Hash();
		for (var i = 0; i < l; i++) {
			if (cs[i].nodeName == "tree") {
				parseXmlNodeFunc(cs[i])
			}
		}
		this.initRows();
		ajaxplorer.updateHistory(this._currentRep);
		if (this._displayMode == "list" && (!this.paginationData || !this.paginationData.get('remote_order'))) {
			this._sortableTable.sortColumn = -1;
			this._sortableTable.updateHeaderArrows()
		}
		if (this._pendingFile) {
			if (typeof this._pendingFile == 'string') {
				this.selectFile(this._pendingFile)
			} else if (this._pendingFile.length) {
				for (var f = 0; f < this._pendingFile.length; f++) {
					this.selectFile(this._pendingFile[f], true)
				}
			}
			this.hasFocus = true;
			this._pendingFile = null
		}
		if (this.hasFocus) {
			this._ajaxplorer.foldersTree.blur();
			this._ajaxplorer.sEngine.blur();
			this._ajaxplorer.actionBar.blur();
			this.focus()
		} else {
			this._ajaxplorer.sEngine.blur();
			this._ajaxplorer.actionBar.blur();
			this._ajaxplorer.foldersTree.focus()
		}
		ajaxplorer.getActionBar().fireContextChange();
		ajaxplorer.getActionBar().fireSelectionChange();
		ajaxplorer.infoPanel.update();
		if (modal.pageLoading) modal.updateLoadingProgress('List Loaded')
	},
	scrollDelayer: function (event) {
		if (this.scrollTimer) {
			window.clearTimeout(this.scrollTimer)
		}
		this.scrollTimer = window.setTimeout(function () {
			this.scrollObserver(event)
		}.bind(this), 500)
	},
	scrollObserver: function (event) {
		var target = event.target;
		var scrollHeight = target.scrollHeight;
		var scrollTop = target.scrollTop;
		var rank = Math.floor(scrollTop / 24);
		if ($('fake_row_' + rank)) {
			$('fake_row_' + rank).setStyle({
				backgroundColor: "blue"
			})
		}
	},
	switchCurrentLabelToEdition: function (callback) {
		var sel = this.getSelectedItems();
		var item = sel[0];
		var offset = {
			top: 0,
			left: 0
		};
		var scrollTop = 0;
		if (this._displayMode == "list") {
			var span = item.select('span.ajxp_label')[0];
			var posSpan = item.select('span.list_selectable_span')[0];
			offset.top = 1;
			offset.left = 20;
			scrollTop = $('table_rows_container').scrollTop
		} else {
			var span = item.select('div.thumbLabel')[0];
			var posSpan = span;
			offset.top = 2;
			offset.left = 2;
			scrollTop = $('selectable_div').scrollTop
		}
		var pos = posSpan.cumulativeOffset();
		var text = span.innerHTML;
		var edit = new Element('input', {
			value: item.getAttribute('text'),
			id: 'editbox'
		}).setStyle({
			zIndex: 5000,
			position: 'absolute',
			marginLeft: 0,
			marginTop: 0
		});
		$(document.getElementsByTagName('body')[0]).insert({
			bottom: edit
		});
		modal.showContent('editbox', (posSpan.getWidth() - offset.left) + '', '20', true);
		edit.setStyle({
			left: pos.left + offset.left,
			top: (pos.top + offset.top - scrollTop)
		});
		window.setTimeout(function () {
			edit.focus()
		},
		1000);
		var closeFunc = function () {
			edit.remove()
		};
		modal.setCloseAction(closeFunc);
		edit.observe("keydown", function (event) {
			if (event.keyCode == Event.KEY_RETURN) {
				Event.stop(event);
				var newValue = edit.getValue();
				callback(item, newValue);
				hideLightBox();
				modal.close()
			}
		}.bind(this))
	},
	xmlNodeToTableRow: function (xmlNode) {
		var newRow = document.createElement("tr");
		var tBody = this.parsingCache.get('tBody') || $(this._htmlElement).select("tbody")[0];
		this.parsingCache.set('tBody', tBody);
		for (var i = 0; i < xmlNode.attributes.length; i++) {
			newRow.setAttribute(xmlNode.attributes[i].nodeName, xmlNode.attributes[i].nodeValue);
			if (Prototype.Browser.IE && xmlNode.attributes[i].nodeName == "ID") {
				newRow.setAttribute("ajxp_sql_" + xmlNode.attributes[i].nodeName, xmlNode.attributes[i].nodeValue)
			}
		}
		var attributeList;
		if (!this.parsingCache.get('attributeList')) {
			attributeList = $A([]);
			this.columnsDef.each(function (column) {
				attributeList.push(column.attributeName)
			});
			this.parsingCache.set('attributeList', attributeList)
		} else {
			attributeList = this.parsingCache.get('attributeList')
		}
		for (i = 0; i < attributeList.length; i++) {
			var s = attributeList[i];
			var tableCell = new Element("td");
			if (s == "ajxp_label") {
				var innerSpan = new Element("span", {
					className: "list_selectable_span",
					style: "cursor:default;display:block;"
				}).update("<img src=\"" + resolveImageSource(xmlNode.getAttribute('icon'), "/images/crystal/mimes/ICON_SIZE/", 16) + "\" " + "width=\"16\" height=\"16\" hspace=\"1\" vspace=\"2\" align=\"ABSMIDDLE\" border=\"0\"> <span class=\"ajxp_label\">" + xmlNode.getAttribute('text') + "</span>");
				innerSpan.setAttribute('filename', newRow.getAttribute('filename'));
				tableCell.insert(innerSpan);
				window.setTimeout(function () {
					if (!xmlNode.getAttribute("is_recycle") || xmlNode.getAttribute("is_recycle") != "1") {
						var newDrag = new AjxpDraggable(innerSpan, {
							revert: true,
							ghosting: true,
							scroll: 'tree_container'
						});
						this.allDraggables.push(newDrag);
						if (this.protoMenu) this.protoMenu.addElements(innerSpan)
					}
					if (xmlNode.getAttribute("is_file") == "0") {
						AjxpDroppables.add(innerSpan);
						this.allDroppables.push(innerSpan)
					}
				}.bind(this), 500)
			} else if (s == "ajxp_modiftime") {
				var date = new Date();
				date.setTime(parseInt(xmlNode.getAttribute(s)) * 1000);
				newRow.ajxp_modiftime = date;
				tableCell.innerHTML = formatDate(date)
			} else {
				tableCell.innerHTML = xmlNode.getAttribute(s)
			}
			if (this.gridStyle == "grid") {
				tableCell.setAttribute('valign', 'top');
				tableCell.setStyle({
					verticalAlign: 'top',
					borderRight: '1px solid #eee'
				});
				if (this.even) {
					tableCell.setStyle({
						borderRightColor: '#fff'
					})
				}
				if (tableCell.innerHTML == '') tableCell.innerHTML = '&nbsp;'
			}
			newRow.appendChild(tableCell)
		}
		tBody.appendChild(newRow);
		if (this.even) {
			$(newRow).addClassName('even')
		}
		this.even = !this.even
	},
	xmlNodeToDiv: function (xmlNode) {
		var newRow = new Element('div', {
			className: "thumbnail_selectable_cell"
		});
		var tmpAtts = new Hash();
		for (i = 0; i < xmlNode.attributes.length; i++) {
			newRow.setAttribute(xmlNode.attributes[i].nodeName, xmlNode.attributes[i].nodeValue);
			tmpAtts.set(xmlNode.attributes[i].nodeName, xmlNode.attributes[i].nodeValue)
		}
		var innerSpan = new Element('span', {
			style: "cursor:default;"
		});
		if (tmpAtts.get("is_image") == "1") {
			this._crtImageIndex++;
			var imgIndex = this._crtImageIndex;
			var textNode = tmpAtts.get("text");
			var img = new Element('img', {
				id: "ajxp_image_" + imgIndex,
				src: ajxpResourcesFolder + "/images/crystal/mimes/64/image.png",
				width: "64",
				height: "64",
				style: "margin:5px",
				align: "ABSMIDDLE",
				border: "0",
				is_loaded: "false"
			});
			var label = new Element('div', {
				className: "thumbLabel",
				title: textNode
			});
			label.innerHTML = textNode;
			var width = tmpAtts.get("image_width");
			var height = tmpAtts.get("image_height");
			var marginTop, marginHeight, newHeight, newWidth;
			if (width >= height) {
				newWidth = 64;
				newHeight = parseInt(height / width * 64);
				marginTop = parseInt((64 - newHeight) / 2) + 5;
				marginBottom = 64 + 10 - newHeight - marginTop - 1
			} else {
				newHeight = 64;
				newWidth = parseInt(width / height * 64);
				marginTop = 5;
				marginBottom = 5
			}
			var crtIndex = this._crtImageIndex;
			innerSpan.insert({
				"bottom": img
			});
			innerSpan.insert({
				"bottom": label
			});
			newRow.insert({
				"bottom": innerSpan
			});
			newRow.IMAGE_ELEMENT = img;
			newRow.LABEL_ELEMENT = label;
			this._htmlElement.appendChild(newRow);
			var fileName = tmpAtts.get('filename');
			var oImageToLoad = {
				index: "ajxp_image_" + crtIndex,
				filename: fileName,
				rowObject: newRow,
				height: newHeight,
				width: newWidth,
				marginTop: marginTop,
				marginBottom: marginBottom
			};
			this.imagesHash.set(oImageToLoad.index, oImageToLoad)
		} else {
			src = resolveImageSource(tmpAtts.get('icon'), "/images/crystal/mimes/ICON_SIZE/", 64);
			var imgString = "<img src=\"" + src + "\" ";
			imgString = imgString + "width=\"64\" height=\"64\" align=\"ABSMIDDLE\" border=\"0\"><div class=\"thumbLabel\" title=\"" + tmpAtts.get("text") + "\">" + tmpAtts.get("text") + "</div>";
			innerSpan.innerHTML = imgString;
			newRow.appendChild(innerSpan);
			this._htmlElement.appendChild(newRow)
		}
		if (!tmpAtts.get("is_recycle") || tmpAtts.get("is_recycle") != "1") {
			window.setTimeout(function () {
				var newDrag = new AjxpDraggable(newRow, {
					revert: true,
					ghosting: true,
					scroll: 'tree_container'
				});
				this.allDraggables.push(newDrag)
			}.bind(this), 500)
		}
		if (xmlNode.getAttribute("is_file") == "0") {
			AjxpDroppables.add(newRow);
			this.allDroppables.push(newRow)
		}
		delete(tmpAtts);
		delete(xmlNode)
	},
	resizeThumbnails: function (one_element) {
		var defaultMargin = 5;
		var elList;
		if (one_element) elList = [one_element];
		else elList = this._htmlElement.getElementsBySelector('.thumbnail_selectable_cell');
		elList.each(function (element) {
			var is_image = (element.getAttribute('is_image') == '1' ? true: false);
			var image_element = element.IMAGE_ELEMENT || element.getElementsBySelector('img')[0];
			var label_element = element.LABEL_ELEMENT || element.getElementsBySelector('.thumbLabel')[0];
			var tSize = this._thumbSize;
			var tW, tH, mT, mB;
			if (is_image && image_element.getAttribute("is_loaded") == "true") {
				imgW = parseInt(element.getAttribute("image_width"));
				imgH = parseInt(element.getAttribute("image_height"));
				if (imgW > imgH) {
					tW = tSize;
					tH = parseInt(imgH / imgW * tW);
					mT = parseInt((tW - tH) / 2) + defaultMargin;
					mB = tW + (defaultMargin * 2) - tH - mT - 1
				} else {
					tH = tSize;
					tW = parseInt(imgW / imgH * tH);
					mT = mB = defaultMargin
				}
			} else {
				if (tSize >= 64) {
					tW = tH = 64;
					mT = parseInt((tSize - 64) / 2) + defaultMargin;
					mB = tSize + (defaultMargin * 2) - tH - mT - 1
				} else {
					tW = tH = tSize;
					mT = mB = defaultMargin
				}
			}
			image_element.setStyle({
				width: tW + 'px',
				height: tH + 'px',
				marginTop: mT + 'px',
				marginBottom: mB + 'px'
			});
			element.setStyle({
				width: tSize + 25 + 'px',
				height: tSize + 30 + 'px'
			});
			var el_width = tSize + 25;
			var charRatio = 6;
			var nbChar = parseInt(el_width / charRatio);
			var label = new String(label_element.getAttribute('title'));
			label_element.innerHTML = label.truncate(nbChar, '...')
		}.bind(this))
	},
	redistributeBackgrounds: function () {
		var allItems = this.getItems();
		this.even = false;
		for (var i = 0; i < allItems.length; i++) {
			if (this.even) {
				$(allItems[i]).addClassName('even').removeClassName('odd')
			} else {
				$(allItems[i]).removeClassName('even').addClassName('odd')
			}
			this.even = !this.even
		}
	},
	removeCurrentLines: function () {
		var rows;
		if (this._displayMode == "list") rows = $(this._htmlElement).select('tr');
		else if (this._displayMode == "thumb") rows = $(this._htmlElement).select('div');
		for (i = 0; i < rows.length; i++) {
			try {
				rows[i].innerHTML = '';
				if (rows[i].IMAGE_ELEMENT) {
					rows[i].IMAGE_ELEMENT = null;
					delete rows[i].IMAGE_ELEMENT
				}
			} catch(e) {}
			if (rows[i].parentNode) {
				rows[i].remove()
			}
		}
	},
	setOnLoad: function () {
		if (this.loading) return;
		var parentObject = $('content_pane');
		addLightboxMarkupToElement(parentObject);
		var img = document.createElement("img");
		img.src = ajxpResourcesFolder + '/images/loadingImage.gif';
		$(parentObject).getElementsBySelector("#element_overlay")[0].appendChild(img);
		this.loading = true
	},
	removeOnLoad: function () {
		removeLightboxFromElement($('content_pane'));
		this.loading = false
	},
	fireChange: function () {
		if (this._fireChange) {
			ajaxplorer.actionBar.fireSelectionChange();
			this._ajaxplorer.infoPanel.update()
		}
	},
	fireDblClick: function (e) {
		if (ajaxplorer.foldersTree.currentIsRecycle()) {
			return
		}
		selRaw = this.getSelectedItems();
		if (!selRaw || !selRaw.length) {
			return
		}
		isFile = selRaw[0].getAttribute('is_file');
		fileName = selRaw[0].getAttribute('filename');
		if (isFile == '1' || isFile == 'true') {
			ajaxplorer.getActionBar().fireDefaultAction("file")
		} else {
			ajaxplorer.getActionBar().fireDefaultAction("dir", selRaw[0].getAttribute('filename'))
		}
	},
	getSelectedFileNames: function () {
		selRaw = this.getSelectedItems();
		if (!selRaw.length) {
			return
		}
		var tmp = new Array(selRaw.length);
		for (i = 0; i < selRaw.length; i++) {
			tmp[i] = selRaw[i].getAttribute('filename')
		}
		return tmp
	},
	getFilesCount: function () {
		return this.getItems().length
	},
	fileNameExists: function (newFileName) {
		var allItems = this.getItems();
		if (!allItems.length) {
			return false
		}
		for (i = 0; i < allItems.length; i++) {
			var crtFileName = getBaseName(allItems[i].getAttribute('filename'));
			if (crtFileName && crtFileName.toLowerCase() == getBaseName(newFileName).toLowerCase()) return true
		}
		return false
	},
	getFileNames: function (separator) {
		var fNames = $A([]);
		var allItems = this.getItems();
		for (var i = 0; i < allItems.length; i++) {
			fNames.push(getBaseName(allItems[i].getAttribute('filename')))
		}
		if (separator) {
			return fNames.join(separator)
		} else {
			return fNames.toArray()
		}
	},
	selectFile: function (fileName, multiple) {
		if (!this.fileNameExists(fileName)) {
			return
		}
		var allItems = this.getItems();
		for (var i = 0; i < allItems.length; i++) {
			if (getBaseName(allItems[i].getAttribute('filename')) == getBaseName(fileName)) {
				this.setItemSelected(allItems[i], true)
			} else if (multiple == null) {
				this.setItemSelected(allItems[i], false)
			}
		}
		return
	},
	getCurrentRep: function () {
		return this._currentRep
	},
	getUserSelection: function () {
		return new UserSelection(this.getSelectedItems(), this._currentRep)
	},
	enableTextSelection: function (target) {
		if (target.origOnSelectStart) {
			target.onselectstart = target.origOnSelectStart
		}
		target.unselectable = "off";
		target.style.MozUserSelect = "text"
	},
	disableTextSelection: function (target) {
		if (target.onselectstart) {
			target.origOnSelectStart = target.onselectstart;
			target.onselectstart = function () {
				return false
			}
		}
		target.unselectable = "on";
		target.style.MozUserSelect = "none"
	},
	keydown: function (event) {
		if (this.blockNavigation) return false;
		if (event.keyCode == 9 && !ajaxplorer.blockNavigation) return false;
		if (!this.hasFocus) return true;
		var keyCode = event.keyCode;
		if (this._displayMode == "list" && keyCode != Event.KEY_UP && keyCode != Event.KEY_DOWN && keyCode != Event.KEY_RETURN && keyCode != Event.KEY_END && keyCode != Event.KEY_HOME) {
			return true
		}
		if (this._displayMode == "thumb" && keyCode != Event.KEY_UP && keyCode != Event.KEY_DOWN && keyCode != Event.KEY_LEFT && keyCode != Event.KEY_RIGHT && keyCode != Event.KEY_RETURN && keyCode != Event.KEY_END && keyCode != Event.KEY_HOME) {
			return true
		}
		var items = this._selectedItems;
		if (items.length == 0) {
			return false
		}
		var oldFireChange = this._fireChange;
		this._fireChange = false;
		var selectedBefore = this.getSelectedItems();
		Event.stop(event);
		var nextItem;
		var currentItem;
		var shiftKey = event['shiftKey'];
		currentItem = items[items.length - 1];
		var allItems = this.getItems();
		var currentItemIndex = this.getItemIndex(currentItem);
		var selectLine = false;
		if (event.keyCode == Event.KEY_RETURN) {
			for (var i = 0; i < items.length; i++) {
				this.setItemSelected(items[i], false)
			}
			this.setItemSelected(currentItem, true);
			this.fireDblClick(null);
			this._fireChange = oldFireChange;
			return false
		}
		if (event.keyCode == Event.KEY_END) {
			nextItem = allItems[allItems.length - 1];
			if (shiftKey && this._multiple) {
				selectLine = true;
				nextItemIndex = allItems.length - 1
			}
		} else if (event.keyCode == Event.KEY_HOME) {
			nextItem = allItems[0];
			if (shiftKey && this._multiple) {
				selectLine = true;
				nextItemIndex = 0
			}
		} else if (event.keyCode == Event.KEY_UP) {
			if (this._displayMode == 'list') nextItem = this.getPrevious(currentItem);
			else {
				nextItemIndex = this.findOverlappingItem(currentItemIndex, false);
				if (nextItemIndex != null) {
					nextItem = allItems[nextItemIndex];
					selectLine = true
				}
			}
		} else if (event.keyCode == Event.KEY_LEFT) {
			nextItem = this.getPrevious(currentItem)
		} else if (event.keyCode == Event.KEY_DOWN) {
			if (this._displayMode == 'list') nextItem = this.getNext(currentItem);
			else {
				nextItemIndex = this.findOverlappingItem(currentItemIndex, true);
				if (nextItemIndex != null) {
					nextItem = allItems[nextItemIndex];
					selectLine = true
				}
			}
		} else if (event.keyCode == Event.KEY_RIGHT) {
			nextItem = this.getNext(currentItem)
		}
		if (nextItem == null) {
			this._fireChange = oldFireChange;
			return false
		}
		if (!shiftKey || !this._multiple) {
			for (var i = 0; i < items.length; i++) {
				this.setItemSelected(items[i], false)
			}
		} else if (selectLine) {
			if (nextItemIndex >= currentItemIndex) {
				for (var i = currentItemIndex + 1; i < nextItemIndex; i++) this.setItemSelected(allItems[i], !allItems[i]._selected)
			} else {
				for (var i = nextItemIndex + 1; i < currentItemIndex; i++) this.setItemSelected(allItems[i], !allItems[i]._selected)
			}
		}
		this.setItemSelected(nextItem, !nextItem._selected);
		var found;
		var changed = selectedBefore.length != this._selectedItems.length;
		if (!changed) {
			for (var i = 0; i < selectedBefore.length; i++) {
				found = false;
				for (var j = 0; j < this._selectedItems.length; j++) {
					if (selectedBefore[i] == this._selectedItems[j]) {
						found = true;
						break
					}
				}
				if (!found) {
					changed = true;
					break
				}
			}
		}
		this._fireChange = oldFireChange;
		if (changed && this._fireChange) {
			this.fireChange()
		}
		return false
	},
	findOverlappingItem: function (currentItemIndex, bDown) {
		if (!bDown && currentItemIndex == 0) return;
		var allItems = this.getItems();
		if (bDown && currentItemIndex == allItems.length - 1) return;
		var element = $(allItems[currentItemIndex]);
		var pos = Position.cumulativeOffset(element);
		var dims = Element.getDimensions(element);
		var searchingPosX = pos[0] + parseInt(dims.width / 2);
		if (bDown) {
			var searchingPosY = pos[1] + parseInt(dims.height * 3 / 2);
			for (var i = currentItemIndex + 1; i < allItems.length; i++) {
				if (Position.within($(allItems[i]), searchingPosX, searchingPosY)) {
					return i
				}
			}
			return null
		} else {
			var searchingPosY = pos[1] - parseInt(dims.height / 2);
			for (var i = currentItemIndex - 1; i > -1; i--) {
				if (Position.within($(allItems[i]), searchingPosX, searchingPosY)) {
					return i
				}
			}
			return null
		}
	},
	isItem: function (node) {
		if (this._displayMode == "list") {
			return node != null && (node.tagName == "TR" || node.tagName == "tr") && (node.parentNode.tagName == "TBODY" || node.parentNode.tagName == "tbody") && node.parentNode.parentNode == this._htmlElement
		}
		if (this._displayMode == "thumb") {
			return node != null && (node.tagName == "DIV" || node.tagName == "div") && node.parentNode == this._htmlElement
		}
	},
	getItems: function () {
		if (this._displayMode == "list") {
			return this._htmlElement.rows
		}
		if (this._displayMode == "thumb") {
			var tmp = [];
			var j = 0;
			var cs = this._htmlElement.childNodes;
			var l = cs.length;
			for (var i = 0; i < l; i++) {
				if (cs[i].nodeType == 1) tmp[j++] = cs[i]
			}
			return tmp
		}
	},
	getItemIndex: function (el) {
		if (this._displayMode == "list") {
			return el.rowIndex
		}
		if (this._displayMode == "thumb") {
			var j = 0;
			var cs = this._htmlElement.childNodes;
			var l = cs.length;
			for (var i = 0; i < l; i++) {
				if (cs[i] == el) return j;
				if (cs[i].nodeType == 1) j++
			}
			return - 1
		}
	},
	getItem: function (nIndex) {
		if (this._displayMode == "list") {
			return this._htmlElement.rows[nIndex]
		}
		if (this._displayMode == "thumb") {
			var j = 0;
			var cs = this._htmlElement.childNodes;
			var l = cs.length;
			for (var i = 0; i < l; i++) {
				if (cs[i].nodeType == 1) {
					if (j == nIndex) return cs[i];
					j++
				}
			}
			return null
		}
	}
});
FoldersTree = Class.create({
	initialize: function (oElement, rootFolderName, rootFolderSrc, oAjaxplorer, dontLoad) {
		this._htmlElement = $(oElement);
		this.tree = new WebFXLoadTree(rootFolderName, rootFolderSrc, "javascript:ajaxplorer.foldersTree.clickNode(CURRENT_ID)", 'explorer');
		this._htmlElement.innerHTML = this.tree.toString();
		$(this.tree.id).observe("click", function (e) {
			ajaxplorer.focusOn(this);
			this.clickNode(this.tree.id);
			Event.stop(e)
		}.bind(this));
		AjxpDroppables.add(this.tree.id);
		if (!this.tree.open && !this.tree.loading && !dontLoad) this.tree.toggle();
		this._htmlElement.observe("click", function () {
			ajaxplorer.focusOn(this)
		}.bind(this));
		this.setCurrentNodeName(this.tree.id);
		this.rootNodeId = this.tree.id;
		this.currentNodeName;
		this.goToNextWhenLoaded;
		this.currentDeepPath;
		this.currentDeepIndex;
		this.treeInDestMode = false;
		this._ajaxplorer = oAjaxplorer;
		this.hasFocus
	},
	focus: function () {
		if (webFXTreeHandler.selected) {
			webFXTreeHandler.selected.focus()
		}
		webFXTreeHandler.setFocus(true);
		this.hasFocus = true
	},
	blur: function () {
		if (webFXTreeHandler.selected) {
			webFXTreeHandler.selected.blur()
		}
		webFXTreeHandler.setFocus(false);
		this.hasFocus = false
	},
	setContextualMenu: function (protoMenu) {
		Event.observe(this.rootNodeId + '-anchor', 'contextmenu', function (e) {
			eval(this.action)
		}.bind(webFXTreeHandler.all[this.rootNodeId]));
		protoMenu.addElements('#' + this.rootNodeId + '-anchor');
		webFXTreeHandler.contextMenu = protoMenu
	},
	clickNode: function (nodeId) {
		var path = webFXTreeHandler.all[nodeId].url;
		if (path) {
			if (ajaxplorer.actionBar.treeCopyActive) {
				if (ajaxplorer.actionBar.treeCopyActionDest) ajaxplorer.actionBar.treeCopyActionDest.each(function (element) {
					element.value = path
				});
				if (ajaxplorer.actionBar.treeCopyActionDestNode) ajaxplorer.actionBar.treeCopyActionDestNode.each(function (element) {
					element.value = nodeId
				});
				this.setCurrentNodeName(nodeId);
				return
			}
			this.setCurrentNodeName(nodeId);
			if (this.getCurrentNodeProperty("pagination_anchor")) {
				path = path + "#" + this.getCurrentNodeProperty("pagination_anchor")
			}
			ajaxplorer.actionBar.fireDefaultAction("dir", path)
		}
	},
	setCurrentNodeName: function (newId, skipSelect) {
		this.currentNodeName = newId;
		if (!skipSelect) this.selectCurrentNodeName();
		if (this.goToNextWhenLoaded != null) {
			this.goToNextWhenLoaded = null
		}
	},
	selectCurrentNodeName: function () {
		for (var i = 0; i < webFXTreeHandler.all.length; i++) {
			webFXTreeHandler.all[i].deSelect()
		}
		webFXTreeHandler.all[this.currentNodeName].select()
	},
	setCurrentNodeProperty: function (key, value) {
		if (webFXTreeHandler.all[this.currentNodeName]) {
			webFXTreeHandler.all[this.currentNodeName].key = value
		}
	},
	getCurrentNodeProperty: function (key) {
		if (webFXTreeHandler.all[this.currentNodeName]) {
			return webFXTreeHandler.all[this.currentNodeName].key
		}
		return null
	},
	setTreeInDestMode: function () {
		this.treeInDestMode = true
	},
	setTreeInNormalMode: function () {
		this.treeInDestMode = false
	},
	openCurrentAndGoToNext: function (url) {
		if (this.currentNodeName == null) return;
		webFXTreeHandler.all[this.currentNodeName].expand();
		this.goToNextWhenLoaded = url;
		firstTry = this.getTreeChildNodeByName(url);
		if (firstTry) {
			this.setCurrentNodeName(firstTry, true);
			this.goToNextWhenLoaded = null;
			if (this.currentDeepPath != null && this.currentDeepIndex != null) {
				if (this.currentDeepIndex < this.currentDeepPath.length - 1) {
					this.currentDeepIndex++;
					this.openCurrentAndGoToNext(this.currentDeepPath[this.currentDeepIndex])
				} else {
					this.currentDeepPath = null;
					this.currentDeepIndex = null;
					this.selectCurrentNodeName()
				}
			} else {
				this.selectCurrentNodeName()
			}
		}
	},
	asyncExpandAndSelect: function () {
		if (this.goToNextWhenLoaded != null) {
			secondTry = this.getTreeChildNodeByName(this.goToNextWhenLoaded);
			if (secondTry) this.setCurrentNodeName(secondTry, true);
			if (this.currentDeepPath != null && this.currentDeepIndex != null) {
				if (this.currentDeepIndex < this.currentDeepPath.length - 1) {
					this.currentDeepIndex++;
					this.openCurrentAndGoToNext(this.currentDeepPath[this.currentDeepIndex])
				} else {
					this.currentDeepPath = null;
					this.currentDeepIndex = null;
					this.selectCurrentNodeName()
				}
			} else {
				this.goToNextWhenLoaded = null;
				this.selectCurrentNodeName()
			}
		}
	},
	goToParentNode: function () {
		if (this.currentNodeName == null || this.currentNodeName == this.getRootNodeId()) return;
		this.setCurrentNodeName(webFXTreeHandler.all[this.currentNodeName].parentNode.id)
	},
	reloadCurrentNode: function () {
		this.reloadNode(this.currentNodeName);
		return
	},
	reloadFullTree: function (repositoryLabel, newIcon) {
		webFXTreeHandler.recycleNode = null;
		this.setCurrentToRoot();
		this.changeRootLabel(repositoryLabel, newIcon);
		this.reloadCurrentNode()
	},
	reloadNode: function (nodeName) {
		if (nodeName == null) {
			return
		}
		if (nodeName == this.getRootNodeId()) {
			this.tree.reload()
		} else {
			if (nodeName == 'AJAXPLORER_RECYCLE_NODE' && webFXTreeHandler.recycleNode) {
				nodeName = webFXTreeHandler.recycleNode
			} else if (webFXTreeHandler.ajxpNodes.nodeName) {
				nodeName = webFXTreeHandler.ajxpNodes.nodeName
			}
			if (webFXTreeHandler.all[nodeName] && webFXTreeHandler.all[nodeName].reload) webFXTreeHandler.all[nodeName].reload()
		}
	},
	getTreeChildNodeByName: function (childName) {
		if (this.currentNodeName == null) {
			return
		}
		if (webFXTreeHandler.recycleNode) {
			rec = webFXTreeHandler.all[webFXTreeHandler.recycleNode];
			if (getBaseName(childName) == getBaseName(rec.filename)) {
				return webFXTreeHandler.recycleNode
			}
		}
		if (webFXTreeHandler.ajxpNodes[getBaseName(childName)]) {
			return webFXTreeHandler.ajxpNodes[getBaseName(childName)]
		}
		if (childName.lastIndexOf("/") != -1) {
			childName = childName.substr(childName.lastIndexOf("/") + 1, childName.length)
		}
		var currentNodeObject = webFXTreeHandler.all[this.currentNodeName];
		for (i = 0; i < currentNodeObject.childNodes.length; i++) {
			if (currentNodeObject.childNodes[i].text && currentNodeObject.childNodes[i].text == childName) {
				return currentNodeObject.childNodes[i].id
			}
		}
	},
	goToDeepPath: function (url) {
		var currentPath = "/";
		if (!this.currentNodeName) this.setCurrentToRoot(true);
		if (this.currentNodeName && webFXTreeHandler.all[this.currentNodeName] && webFXTreeHandler.all[this.currentNodeName].url) {
			currentPath = webFXTreeHandler.all[this.currentNodeName].url
		}
		var currentSplit = currentPath.split("/");
		currentSplit.shift();
		var isChild = false;
		var path = this.cleanPathToArray(url);
		if (currentPath != "/" && url.substring(0, currentPath.length) == currentPath) {
			isChild = true;
			for (var i = 0; i < currentSplit.length; i++) {
				path.shift()
			}
		}
		this.currentDeepPath = path;
		this.currentDeepIndex = 0;
		if (!isChild) {
			this.setCurrentNodeName(this.getRootNodeId(), true)
		}
		if (this.currentDeepPath.length > 0) {
			this.openCurrentAndGoToNext(this.currentDeepPath[0])
		}
		return false
	},
	cleanPathToArray: function (url) {
		var splitPath = url.split("/");
		var path = new Array();
		var j = 0;
		for (i = 0; i < splitPath.length; i++) {
			if (splitPath[i] != '') {
				path[j] = splitPath[i];
				j++
			}
		}
		return path
	},
	getRootNodeId: function () {
		return this.rootNodeId
	},
	currentIsRoot: function () {
		return (this.rootNodeId == this.currentNodeName)
	},
	recycleEnabled: function () {
		if (webFXTreeHandler.recycleNode) return true;
		return false
	},
	currentIsRecycle: function () {
		if (webFXTreeHandler.recycleNode && this.currentNodeName == webFXTreeHandler.recycleNode) {
			return true
		}
		return false
	},
	currentInZip: function () {
		if (this.currentNodeName && webFXTreeHandler.all[this.currentNodeName] && webFXTreeHandler.all[this.currentNodeName].inZip) {
			return true
		}
		return false
	},
	getCurrentNodeMime: function () {
		if ((this.rootNodeId == this.currentNodeName)) {
			return "ajxp_root"
		}
		if (this.currentNodeName && webFXTreeHandler.all[this.currentNodeName]) {
			return webFXTreeHandler.all[this.currentNodeName].ajxpMime
		}
		return null
	},
	setCurrentToRoot: function (skipSelect) {
		this.setCurrentNodeName(this.getRootNodeId(), skipSelect)
	},
	changeRootLabel: function (newLabel, newIcon) {
		this.changeNodeLabel(this.getRootNodeId(), newLabel, newIcon)
	},
	changeNodeLabel: function (nodeId, newLabel, newIcon) {
		var node = $(nodeId + '-anchor');
		node.firstChild.nodeValue = newLabel;
		if (newIcon) {
			var realNode = webFXTreeHandler.all[nodeId];
			realNode.icon = newIcon;
			realNode.openIcon = newIcon
		}
	}
});
SearchEngine = Class.create({
	htmlElement: undefined,
	_inputBox: undefined,
	_resultsBox: undefined,
	_searchButtonName: undefined,
	state: 'idle',
	_runningQueries: undefined,
	_queriesIndex: 0,
	initialize: function (mainElementName) {
		this.htmlElement = $(mainElementName);
		this.initGUI()
	},
	initGUI: function () {
		if (!this.htmlElement) return;
		this.htmlElement.update('<div id="search_form"><input style="float:left;" type="text" id="search_txt" name="search_txt" onfocus="blockEvents=true;" onblur="blockEvents=false;"><a href="" id="search_button" ajxp_message_title_id="184" title="' + MessageHash[184] + '"><img width="16" height="16" align="absmiddle" src="' + ajxpResourcesFolder + '/images/crystal/actions/16/search.png" border="0"/></a><a href="" id="stop_search_button" ajxp_message_title_id="185" title="' + MessageHash[185] + '"><img width="16" height="16" align="absmiddle" src="' + ajxpResourcesFolder + '/images/crystal/actions/16/fileclose.png" border="0" /></a></div><div id="search_results"></div>');
		this._inputBox = $("search_txt");
		this._resultsBox = $("search_results");
		this._searchButtonName = "search_button";
		this._runningQueries = new Array();
		$('stop_' + this._searchButtonName).addClassName("disabled");
		this.htmlElement.select('a', 'div[id="search_results"]').each(function (element) {
			disableTextSelection(element)
		});
		this._inputBox.onkeypress = function (e) {
			if (e == null) e = window.event;
			if (e.keyCode == 13) this.search();
			if (e.keyCode == 9) return false
		}.bind(this);
		this._inputBox.onkeydown = function (e) {
			if (e == null) e = window.event;
			if (e.keyCode == 9) return false;
			return true
		};
		this._inputBox.onfocus = function (e) {
			ajaxplorer.disableShortcuts();
			this.hasFocus = true;
			this._inputBox.select();
			return false
		}.bind(this);
		this._inputBox.onblur = function (e) {
			ajaxplorer.enableShortcuts();
			this.hasFocus = false
		}.bind(this);
		$(this._searchButtonName).onclick = function () {
			this.search();
			return false
		}.bind(this);
		$('stop_' + this._searchButtonName).onclick = function () {
			this.interrupt();
			return false
		}.bind(this);
		this.resize()
	},
	showElement: function (show) {
		if (!this.htmlElement) return;
		if (show) this.htmlElement.show();
		else this.htmlElement.hide()
	},
	resize: function () {
		fitHeightToBottom(this._resultsBox, null, (Prototype.Browser.IE ? 1 : 2), true)
	},
	focus: function () {
		if (this.htmlElement && this.htmlElement.visible()) {
			this._inputBox.activate();
			this.hasFocus = true
		}
	},
	blur: function () {
		if (this._inputBox) {
			this._inputBox.blur()
		}
		this.hasFocus = false
	},
	search: function () {
		var text = this._inputBox.value;
		if (text == '') return;
		this.updateStateSearching();
		this.clearResults();
		var folder = ajaxplorer.getActionBar().getLocationBarValue();
		if (folder == "/") folder = "";
		this.searchFolderContent(text, folder)
	},
	interrupt: function () {
		if (this._state == 'idle') return;
		this._state = 'interrupt'
	},
	updateStateSearching: function () {
		this._state = 'searching';
		$(this._searchButtonName).addClassName("disabled");
		$('stop_' + this._searchButtonName).removeClassName("disabled")
	},
	updateStateFinished: function (interrupt) {
		this._state = 'idle';
		this._inputBox.disabled = false;
		$(this._searchButtonName).removeClassName("disabled");
		$('stop_' + this._searchButtonName).addClassName("disabled")
	},
	registerQuery: function (queryId) {
		this._runningQueries.push('' + queryId)
	},
	unregisterQuery: function (queryId) {
		this._runningQueries = this._runningQueries.without('' + queryId);
		if (this._runningQueries.length == 0) {
			if (this._state == 'searching') this.updateStateFinished(false);
			else if (this._state == 'interrupt') this.updateStateFinished(true)
		}
	},
	clear: function () {
		this.clearResults();
		if (this._inputBox) {
			this._inputBox.value = ""
		}
	},
	clearResults: function () {
		while (this._resultsBox.childNodes.length) {
			this._resultsBox.removeChild(this._resultsBox.childNodes[0])
		}
	},
	addResult: function (folderName, fileName, icon) {
		if (folderName == "") folderName = "/";
		var divElement = document.createElement('div');
		var isFolder = false;
		if (icon == null) {
			isFolder = true;
			icon = 'folder.png';
			if (folderName != "/") folderName += "/";
			folderName += fileName
		}
		var imageString = '<img align="absmiddle" width="16" height="16" src="' + ajxpResourcesFolder + '/images/crystal/mimes/16/' + icon + '"> ';
		var stringToDisplay = fileName;
		divElement.innerHTML = imageString + stringToDisplay;
		divElement.title = MessageHash[224] + ' ' + folderName;
		if (isFolder) {
			divElement.onclick = function (e) {
				ajaxplorer.goTo(folderName)
			}
		} else {
			divElement.onclick = function (e) {
				ajaxplorer.goTo(folderName, fileName)
			}
		}
		this._resultsBox.appendChild(divElement)
	},
	searchFolderContent: function (text, currentFolder) {
		if (this._state == 'interrupt') return;
		this._queriesIndex++;
		var queryIndex = this._queriesIndex;
		this.registerQuery(this._queriesIndex);
		var connexion = new Connexion();
		connexion.addParameter('mode', 'search');
		connexion.addParameter('dir', currentFolder);
		connexion.onComplete = function (transport) {
			this._parseXmlAndSearchString(transport.responseXML, text, currentFolder, queryIndex)
		}.bind(this);
		connexion.sendAsync()
	},
	_parseXmlAndSearchString: function (oXmlDoc, text, currentFolder, queryIndex) {
		if (this._state == 'interrupt') {
			this.unregisterQuery(queryIndex);
			return
		}
		if (oXmlDoc == null || oXmlDoc.documentElement == null) {} else {
			var root = oXmlDoc.documentElement;
			var cs = root.childNodes;
			var l = cs.length;
			for (var i = 0; i < l; i++) {
				if (cs[i].tagName == "tree") {
					var icon = cs[i].getAttribute('icon');
					if (cs[i].getAttribute('text').toLowerCase().indexOf(text.toLowerCase()) != -1) {
						this.addResult(currentFolder, cs[i].getAttribute('text'), icon)
					}
					if (cs[i].getAttribute('is_file') == null) {
						this.searchFolderContent(text, currentFolder + "/" + cs[i].getAttribute('text'))
					}
				}
			}
		}
		this.unregisterQuery(queryIndex)
	}
});
InfoPanel = Class.create({
	initialize: function (htmlElement) {
		this.htmlElement = $(htmlElement);
		this.setContent('<br><br><center><i>' + MessageHash[132] + '</i></center>');
		this.mimesTemplates = new Hash();
		this.registeredMimes = new Hash()
	},
	setTemplateForMime: function (mimeType, templateString, attributes, messages) {
		var tId = this.mimesTemplate.size();
		this.registeredMimes.set(mimeType, tId);
		this.mimesTemplates.push($A([templateString, attributes, messages]))
	},
	clearPanels: function () {
		this.mimesTemplates = new Hash();
		this.registeredMimes = new Hash()
	},
	empty: function () {
		this.setContent('')
	},
	update: function () {
		if (!this.htmlElement) return;
		var filesList = ajaxplorer.getFilesList();
		var userSelection = filesList.getUserSelection();
		if (userSelection.isEmpty()) {
			var currentRep = getBaseName(filesList.getCurrentRep());
			if (currentRep == "") {
				currentRep = $('repo_path').value
			}
			var items = filesList.getItems();
			var size = 0;
			var folderNumber = 0;
			var filesNumber = 0;
			for (var i = 0; i < items.length; i++) {
				if (items[i].getAttribute("is_file") == "0") folderNumber++;
				else filesNumber++;
				if (items[i].getAttribute("bytesize") && items[i].getAttribute("bytesize") != "") {
					size += parseInt(items[i].getAttribute("bytesize"))
				}
			}
			this.evalTemplateForMime("no_selection", null, {
				filelist_folders_count: folderNumber,
				filelist_files_count: filesNumber,
				filelist_totalsize: roundSize(size, MessageHash[266]),
				current_folder: currentRep
			});
			try {
				if (!folderNumber && $(this.htmlElement).select('[id="filelist_folders_count"]').length) {
					$(this.htmlElement).select('[id="filelist_folders_count"]')[0].hide()
				}
				if (!filesNumber && $(this.htmlElement).select('[id="filelist_files_count').length) {
					$(this.htmlElement).select('[id="filelist_files_count"]')[0].hide()
				}
				if (!size && $(this.htmlElement).select('[id="filelist_totalsize"]').length) {
					$(this.htmlElement).select('[id="filelist_totalsize"]')[0].hide()
				}
			} catch(e) {}
			return
		}
		if (!userSelection.isUnique()) {
			this.setContent('<br><br><center><i>' + userSelection.getFileNames().length + ' ' + MessageHash[128] + '</i></center><br><br>');
			this.addActions('multiple');
			return
		}
		var uniqItem = userSelection.getUniqueItem();
		var extension = getAjxpMimeType(uniqItem);
		if (extension != "" && this.registeredMimes.get(extension)) {
			this.evalTemplateForMime(extension, uniqItem)
		} else {
			var isFile = parseInt(uniqItem.getAttribute('is_file'));
			this.evalTemplateForMime((isFile ? 'generic_file': 'generic_dir'), uniqItem)
		}
	},
	setContent: function (sHtml) {
		if (!this.htmlElement) return;
		this.htmlElement.update(sHtml)
	},
	showElement: function (show) {
		if (!this.htmlElement) return;
		if (show) this.htmlElement.show();
		else this.htmlElement.hide()
	},
	evalTemplateForMime: function (mimeType, fileData, tArgs) {
		if (!this.htmlElement) return;
		if (!this.registeredMimes.get(mimeType)) return;
		var templateData = this.mimesTemplates.get(this.registeredMimes.get(mimeType));
		var tString = templateData[0];
		var tAttributes = templateData[1];
		var tMessages = templateData[2];
		if (!tArgs) {
			tArgs = new Object()
		}
		var panelWidth = this.htmlElement.getWidth();
		if (fileData) {
			tAttributes.each(function (attName) {
				if (attName == 'basename' && fileData.getAttribute('filename')) {
					this[attName] = getBaseName(fileData.getAttribute('filename'))
				} else if (attName == 'compute_image_dimensions') {
					if (fileData.getAttribute('image_width') && fileData.getAttribute('image_height')) {
						var width = fileData.getAttribute('image_width');
						var height = fileData.getAttribute('image_height');
						var newHeight = 150;
						if (height < newHeight) newHeight = height;
						var newWidth = newHeight * width / height;
						var dimAttr = 'height="' + newHeight + '"';
						if (newWidth > panelWidth - 16) dimAttr = 'width="100%"'
					} else {
						dimAttr = 'height="64" width="64"'
					}
					this[attName] = dimAttr
				} else if (attName == 'encoded_filename' && fileData.getAttribute('filename')) {
					this[attName] = encodeURIComponent(fileData.getAttribute('filename'))
				} else if (attName == 'escaped_filename' && fileData.getAttribute('filename')) {
					this[attName] = escape(encodeURIComponent(fileData.getAttribute('filename')))
				} else if (attName == 'formated_date' && fileData.getAttribute('ajxp_modiftime')) {
					var modiftime = fileData.getAttribute('ajxp_modiftime');
					if (modiftime instanceof Object) {
						this[attName] = formatDate(modiftime)
					} else {
						var date = new Date();
						date.setTime(parseInt(fileData.getAttribute('ajxp_modiftime')) * 1000);
						this[attName] = formatDate(date)
					}
				} else if (attName == 'uri') {
					var url = document.location.href;
					if (url[(url.length - 1)] == '/') {
						url = url.substr(0, url.length - 1)
					} else if (url.lastIndexOf('/') > -1) {
						url = url.substr(0, url.lastIndexOf('/'))
					}
					this[attName] = url
				} else if (fileData.getAttribute(attName)) {
					this[attName] = fileData.getAttribute(attName)
				} else {
					this[attName] = ''
				}
			}.bind(tArgs))
		}
		tMessages.each(function (pair) {
			this[pair.key] = MessageHash[pair.value]
		}.bind(tArgs));
		var template = new Template(tString);
		this.setContent(template.evaluate(tArgs));
		this.addActions('unique')
	},
	addActions: function (selectionType) {
		var actions = ajaxplorer.actionBar.getInfoPanelActions();
		if (!actions.length) return;
		var actionString = '<div class="infoPanelActions">';
		var count = 0;
		actions.each(function (action) {
			if (selectionType == 'multiple' && action.selectionContext.unique) return;
			if (selectionType == 'unique' && (!action.context.selection || action.selectionContext.multipleOnly)) return;
			actionString += '<a href="" onclick="ajaxplorer.actionBar.fireAction(\'' + action.options.name + '\');return false;"><img src="' + ajxpResourcesFolder + '/images/crystal/actions/16/' + action.options.src + '" width="16" height="16" align="absmiddle" border="0"> ' + action.options.title + '</a>';
			count++
		}.bind(this));
		actionString += '</div>';
		if (!count) return;
		this.htmlElement.insert(actionString)
	},
	load: function () {
		if (!this.htmlElement) return;
		var connexion = new Connexion();
		connexion.addParameter('get_action', 'get_driver_info_panels');
		connexion.onComplete = function (transport) {
			this.parseXML(transport.responseXML)
		}.bind(this);
		this.clearPanels();
		connexion.sendSync()
	},
	parseXML: function (xmlResponse) {
		if (xmlResponse == null || xmlResponse.documentElement == null) return;
		var childs = xmlResponse.documentElement.childNodes;
		if (!childs.length) return;
		var panels = childs[0].childNodes;
		for (var i = 0; i < panels.length; i++) {
			if (panels[i].nodeName != 'infoPanel') continue;
			var panelMimes = panels[i].getAttribute('mime');
			var attributes = $A(panels[i].getAttribute('attributes').split(","));
			var messages = new Hash();
			var htmlContent = '';
			var panelChilds = panels[i].childNodes;
			for (j = 0; j < panelChilds.length; j++) {
				if (panelChilds[j].nodeName == 'messages') {
					var messagesList = panelChilds[j].childNodes;
					for (k = 0; k < messagesList.length; k++) {
						if (messagesList[k].nodeName != 'message') continue;
						messages.set(messagesList[k].getAttribute("key"), parseInt(messagesList[k].getAttribute("id")))
					}
				} else if (panelChilds[j].nodeName == 'html') {
					htmlContent = panelChilds[j].firstChild.nodeValue
				}
			}
			var tId = 't_' + this.mimesTemplates.size();
			this.mimesTemplates.set(tId, $A([htmlContent, attributes, messages]));
			$A(panelMimes.split(",")).each(function (mime) {
				this.registeredMimes.set(mime, tId)
			}.bind(this))
		}
	}
});
PropertyPanel = Class.create({
	initialize: function (userSelection, htmlElement) {
		this.rights = ['4', '2', '1'];
		this.accessors = ['u', 'g', 'a'];
		this.accessLabels = [MessageHash[288], MessageHash[289], MessageHash[290]];
		this.rightsLabels = ['r', 'w', 'x'];
		this.htmlElement = $(htmlElement).select("[id='properties_box']")[0];
		if (userSelection.isUnique()) {
			this.origValue = userSelection.getUniqueItem().getAttribute('file_perms')
		} else {
			this.origValue = ''
		}
		this.createChmodForm();
		this.valueInput = new Element('input', {
			value: this.origValue,
			name: 'chmod_value'
		}).setStyle({
			width: '76px',
			marginLeft: '55px'
		});
		this.valueInput.observe((Prototype.Browser.IE ? 'change': 'input'), function (e) {
			this.updateBoxesFromValue(this.valueInput.value)
		}.bind(this));
		this.updateBoxesFromValue(this.valueInput.value);
		this.htmlElement.insert(this.valueInput);
		if (userSelection.hasDir()) {
			this.createRecursiveBox()
		}
	},
	valueChanged: function () {
		return (this.origValue != this.valueInput.value)
	},
	createChmodForm: function () {
		this.checks = $H({});
		var chmodDiv = new Element('div').setStyle({
			width: '142px'
		});
		var emptyLabel = new Element('div').setStyle({
			cssFloat: 'left',
			width: '52px',
			height: '16px'
		});
		chmodDiv.insert(emptyLabel);
		for (var j = 0; j < 3; j++) {
			chmodDiv.insert(new Element('div').update(this.rightsLabels[j] + '&nbsp;&nbsp;').setStyle({
				cssFloat: 'left',
				width: '30px',
				textAlign: 'center'
			}))
		}
		for (var i = 0; i < 3; i++) {
			var label = new Element('div').setStyle({
				cssFloat: 'left',
				width: '50px',
				height: '16px',
				textAlign: 'right',
				paddingRight: '2px'
			});
			label.insert(this.accessLabels[i]);
			chmodDiv.insert(label);
			for (var j = 0; j < 3; j++) {
				var check = this.createCheckBox(this.accessors[i], this.rights[j]);
				chmodDiv.insert(check)
			}
		}
		this.htmlElement.insert(chmodDiv)
	},
	createCheckBox: function (accessor, right) {
		var box = new Element('input', {
			type: 'checkbox',
			id: accessor + '_' + right
		}).setStyle({
			width: '14px',
			height: '14px',
			borderWidth: '0'
		});
		var div = new Element('div', {
			align: "center"
		}).insert(box).setStyle({
			cssFloat: 'left',
			width: '30px',
			height: '25px'
		});
		box.observe('click', function (e) {
			this.updateValueFromBoxes()
		}.bind(this));
		this.checks.set(accessor + '_' + right, box);
		return div
	},
	createRecursiveBox: function () {
		var recuDiv = new Element('div', {
			style: 'padding-top:8px;'
		});
		var recurBox = new Element('input', {
			type: 'checkbox',
			name: 'recursive'
		}).setStyle({
			width: '14px',
			height: '14px',
			borderWidth: '0'
		});
		recuDiv.insert(recurBox);
		recuDiv.insert(MessageHash[291]);
		this.htmlElement.insert(recuDiv);
		var choices = {
			"both": "Both",
			"file": "Files",
			"dir": "Folders"
		};
		var choicesDiv = new Element('div');
		recuDiv.insert(choicesDiv);
		for (var key in choices) {
			var choiceDiv = new Element('div', {
				style: 'padding-left:25px'
			});
			var choiceDivBox = new Element('input', {
				type: 'radio',
				name: 'recur_apply_to',
				value: key,
				style: 'width:25px;border:0;'
			});
			choiceDiv.insert(choiceDivBox);
			if (key == 'both') {
				choiceDivBox.checked = true
			}
			choiceDiv.insert(choices[key]);
			choicesDiv.insert(choiceDiv)
		}
		choicesDiv.hide();
		recurBox.observe('click', function (e) {
			if (recurBox.checked) choicesDiv.show();
			else choicesDiv.hide();
			modal.refreshDialogAppearance()
		})
	},
	updateValueFromBoxes: function () {
		var value = '0';
		for (var i = 0; i < 3; i++) {
			value = value + this.updateValueForAccessor(this.accessors[i])
		}
		this.valueInput.value = value
	},
	updateValueForAccessor: function (accessor) {
		var value = 0;
		for (var i = 0; i < 3; i++) {
			value += (this.checks.get(accessor + '_' + this.rights[i]).checked ? parseInt(this.rights[i]) : 0)
		}
		return value
	},
	updateBoxesFromValue: function (value) {
		if (value.length != 4) return;
		for (var i = 0; i < 3; i++) {
			this.valueToBoxes(parseInt(value.charAt(i + 1)), this.accessors[i])
		}
	},
	valueToBoxes: function (value, accessor) {
		for (var i = 0; i < 3; i++) {
			this.checks.get(accessor + '_' + this.rights[i]).checked = false
		}
		if (value == 0) return;
		var toCheck = $A([]);
		switch (value) {
		case 1:
			toCheck.push('1');
			break;
		case 2:
			toCheck.push('2');
			break;
		case 3:
			toCheck.push('1');
			toCheck.push('2');
			break;
		case 4:
			toCheck.push('4');
			break;
		case 5:
			toCheck.push('4');
			toCheck.push('1');
			break;
		case 6:
			toCheck.push('4');
			toCheck.push('2');
			break;
		case 7:
			toCheck.push('2');
			toCheck.push('4');
			toCheck.push('1');
			break
		}
		toCheck.each(function (ch) {
			this.checks.get(accessor + '_' + ch).checked = true
		}.bind(this))
	}
});
AbstractEditor = Class.create({
	defaultActions: new Hash({
		'close': '<a id="closeButton"><img src="' + ajxpResourcesFolder + '/images/crystal/actions/22/fileclose.png"  width="22" height="22" alt="" border="0"><br><span message_id="86"></span></a>',
		'fs': '<a id="fsButton"><img src="' + ajxpResourcesFolder + '/images/crystal/actions/22/window_fullscreen.png"  width="22" height="22" alt="" border="0"><br><span message_id="235"></span></a>',
		'nofs': '<a id="nofsButton" style="display:none;"><img src="' + ajxpResourcesFolder + '/images/crystal/actions/22/window_nofullscreen.png"  width="22" height="22" alt="" border="0"><br><span message_id="236"></span></a>'
	}),
	toolbarSeparator: '<div class="separator"></div>',
	fullScreenMode: false,
	initialize: function (oContainer) {
		this.element = $(oContainer);
		this.editorOptions = new Hash({
			"fullscreen": true,
			"closable": true
		});
		this.createTitleSpans();
		this.initActions();
		modal.setCloseAction(function () {
			this.close()
		}.bind(this))
	},
	initActions: function () {
		this.actions = new Hash();
		var actionBarSel = this.element.select('.action_bar');
		if (!actionBarSel.length) {
			this.actionBar = new Element('div', {
				className: 'action_bar'
			});
			this.element.insert({
				top: this.actionBar
			})
		} else {
			this.actionBar = actionBarSel[0]
		}
		if (!this.editorOptions.get("fullscreen")) {
			this.defaultActions.unset("fs");
			this.defaultActions.unset("nofs")
		}
		this.actionBar.insert({
			top: this.toolbarSeparator
		});
		this.actionBar.insert({
			top: this.defaultActions.values().join('\n')
		});
		this.actionBar.insert({
			top: this.toolbarSeparator
		});
		this.actionBar.select('a').each(function (link) {
			link.onclick = function () {
				return false
			};
			link.href = "#";
			var span = link.select('span[message_id]')[0];
			span.update(MessageHash[span.readAttribute("message_id")]);
			this.actions.set(link.id, link)
		},
		this);
		if (this.actions.get("closeButton")) {
			this.actions.get("closeButton").observe("click", function () {
				if (this.isModified && !window.confirm(MessageHash[201])) {
					return false
				}
				hideLightBox(true)
			}.bind(this))
		}
		if (this.actions.get("fsButton")) {
			this.actions.get("fsButton").observe("click", this.setFullScreen.bind(this));
			this.actions.get("nofsButton").observe("click", this.exitFullScreen.bind(this));
			this.actions.get("fsButton").show();
			this.actions.get("nofsButton").hide()
		}
	},
	createTitleSpans: function () {
		var crtTitle = $(modal.dialogTitle).select('span.titleString')[0];
		this.filenameSpan = new Element("span", {
			className: "filenameSpan"
		});
		crtTitle.insert({
			bottom: this.filenameSpan
		});
		this.modifSpan = new Element("span", {
			className: "modifiedSpan"
		});
		crtTitle.insert({
			bottom: this.modifSpan
		})
	},
	open: function (userSelection, filesList) {
		this.userSelection = userSelection;
		this.listItems = filesList.getItems()
	},
	updateTitle: function (title) {
		if (title != "") {
			title = " - " + title
		}
		this.filenameSpan.update(title);
		if (this.fullScreenMode) {
			this.refreshFullScreenTitle()
		}
	},
	setModified: function (isModified) {
		this.isModified = isModified;
		this.modifSpan.update((isModified ? "*": ""));
		if (this.actions.get("saveButton")) {
			if (isModified) {
				this.actions.get("saveButton").removeClassName("disabled")
			} else {
				this.actions.get("saveButton").addClassName("disabled")
			}
		}
		if (this.fullScreenMode) {
			this.refreshFullScreenTitle()
		}
		this.element.fire("editor:modified", isModified)
	},
	setFullScreen: function () {
		this.element.fire("editor:enterFS");
		if (!this.contentMainContainer) {
			this.contentMainContainer = this.element
		}
		this.originalHeight = this.contentMainContainer.getHeight();
		this.originalWindowTitle = document.title;
		this.element.absolutize();
		this.actionBar.setStyle({
			marginTop: 0
		});
		$(document.body).insert(this.element);
		this.element.setStyle({
			top: 0,
			left: 0,
			marginBottom: 0,
			backgroundColor: '#fff',
			width: '100%',
			height: document.viewport.getHeight(),
			zIndex: 3000
		});
		this.actions.get("fsButton").hide();
		this.actions.get("nofsButton").show();
		this.fullScreenListener = function () {
			this.element.setStyle({
				height: document.viewport.getHeight()
			});
			this.resize()
		}.bind(this);
		Event.observe(window, "resize", this.fullScreenListener);
		this.refreshFullScreenTitle();
		this.resize();
		this.fullScreenMode = true
	},
	exitFullScreen: function () {
		if (!this.fullScreenMode) return;
		this.element.fire("editor:exitFS");
		Event.stopObserving(window, "resize", this.fullScreenListener);
		this.element.relativize();
		$$('.dialogContent')[0].insert(this.element);
		this.element.setStyle({
			top: 0,
			left: 0,
			zIndex: 100
		});
		this.resize(this.originalHeight);
		this.actions.get("fsButton").show();
		this.actions.get("nofsButton").hide();
		document.title = this.originalWindowTitle;
		this.fullScreenMode = false
	},
	resize: function (size) {
		if (size) {
			this.contentMainContainer.setStyle({
				height: size
			})
		} else {
			fitHeightToBottom(this.contentMainContainer, this.element, 0, true)
		}
		this.element.fire("editor:resize", size)
	},
	close: function () {
		if (this.fullScreenMode) {
			this.exitFullScreen()
		}
		this.element.fire("editor:close");
		modal.setCloseAction(null);
		return false
	},
	refreshFullScreenTitle: function () {
		document.title = "AjaXplorer - " + $(modal.dialogTitle).innerHTML.stripTags().replace("&nbsp;", "")
	},
	setOnLoad: function (element) {
		addLightboxMarkupToElement(element);
		var img = document.createElement("img");
		img.src = ajxpResourcesFolder + "/images/loadingImage.gif";
		$(element).select("#element_overlay")[0].appendChild(img);
		this.loading = true
	},
	removeOnLoad: function (element) {
		removeLightboxFromElement(element);
		this.loading = false
	}
});
Diaporama = Class.create(AbstractEditor, {
	fullscreenMode: false,
	initialize: function ($super, oFormObject) {
		$super(oFormObject);
		this.nextButton = this.actions.get("nextButton");
		this.previousButton = this.actions.get("prevButton");
		this.downloadButton = this.actions.get("downloadDiapoButton");
		this.playButton = this.actions.get("playButton");
		this.stopButton = this.actions.get("stopButton");
		this.actualSizeButton = this.element.select('img[id="actualSizeButton"]')[0];
		this.fitToScreenButton = this.element.select('img[id="fitToScreenButton"]')[0];
		this.imgTag = this.element.select('img[id="mainImage"]')[0];
		this.imgContainer = this.element.select('div[id="imageContainer"]')[0];
		fitHeightToBottom(this.imgContainer);
		this.zoomInput = this.element.select('input[id="zoomValue"]')[0];
		this.timeInput = this.element.select('input[id="time"]')[0];
		this.baseUrl = 'content.php?action=image_proxy&file=';
		this.nextButton.onclick = function () {
			this.next();
			this.updateButtons();
			return false
		}.bind(this);
		this.previousButton.onclick = function () {
			this.previous();
			this.updateButtons();
			return false
		}.bind(this);
		this.downloadButton.onclick = function () {
			if (!this.currentFile) return;
			ajaxplorer.triggerDownload('content.php?action=download&file=' + this.currentFile);
			return false
		}.bind(this);
		this.actualSizeButton.onclick = function () {
			this.slider.setValue(100);
			this.resizeImage(true)
		}.bind(this);
		this.fitToScreenButton.onclick = function () {
			this.toggleFitToScreen()
		}.bind(this);
		this.playButton.onclick = function () {
			this.play();
			this.updateButtons();
			return false
		}.bind(this);
		this.stopButton.onclick = function () {
			this.stop();
			this.updateButtons();
			return false
		}.bind(this);
		this.imgTag.onload = function () {
			this.resizeImage(true);
			this.downloadButton.removeClassName("disabled");
			var text = getBaseName(this.currentFile) + ' (' + this.sizes.get(this.currentFile).width + ' X ' + this.sizes.get(this.currentFile).height + ')';
			this.updateTitle(text)
		}.bind(this);
		Event.observe(this.zoomInput, "keypress", function (e) {
			if (e == null) e = window.event;
			if (e.keyCode == Event.KEY_RETURN || e.keyCode == Event.KEY_UP || e.keyCode == Event.KEY_DOWN) {
				if (e.keyCode == Event.KEY_UP || e.keyCode == Event.KEY_DOWN) {
					var crtValue = parseInt(this.zoomInput.value);
					var value = (e.keyCode == Event.KEY_UP ? (e.shiftKey ? crtValue + 10 : crtValue + 1) : (e.shiftKey ? crtValue - 10 : crtValue - 1));
					this.zoomInput.value = value
				}
				this.slider.setValue(this.zoomInput.value);
				this.resizeImage(false);
				Event.stop(e)
			}
			return true
		}.bind(this));
		this.timeInput.observe('change', function (e) {
			if (this.slideShowPlaying && this.pe) {
				this.stop();
				this.play()
			}
		}.bind(this));
		this.containerDim = $(this.imgContainer).getDimensions();
		if (ajaxplorer && ajaxplorer.user) {
			var autoFit = ajaxplorer.user.getPreference('diapo_autofit');
			if (autoFit && autoFit == "true") {
				this.autoFit = true;
				this.fitToScreenButton.addClassName('diaporamaButtonActive')
			}
		}
		this.contentMainContainer = this.imgContainer;
		this.element.observe("editor:resize", this.resizeImage.bind(this));
		this.element.observe("editor:close", function () {
			this.currentFile = null;
			this.items = null;
			this.imgTag.src = '';
			this.stop()
		}.bind(this))
	},
	open: function ($super, userSelection, aFilesList) {
		$super(userSelection, aFilesList);
		var allItems, sCurrentFile;
		if (userSelection.isUnique()) {
			allItems = aFilesList.getItems();
			sCurrentFile = userSelection.getUniqueFileName()
		} else {
			allItems = aFilesList.getSelectedItems()
		}
		this.items = new Array();
		this.sizes = new Hash();
		$A(allItems).each(function (rowItem) {
			if (rowItem.getAttribute('is_image') == '1') {
				this.items.push(rowItem.getAttribute('filename'));
				this.sizes.set(rowItem.getAttribute('filename'), {
					height: rowItem.getAttribute('image_height') || 'n/a',
					width: rowItem.getAttribute('image_width') || 'n/a'
				})
			}
		}.bind(this));
		if (!sCurrentFile && this.items.length) sCurrentFile = this.items[0];
		this.currentFile = sCurrentFile;
		var sliderDiv = this.element.select('div[id="slider-2"]')[0];
		var sliderInput = this.element.select('input[id="slider-input-2"]')[0];
		this.slider = new Slider(sliderDiv, sliderInput);
		this.slider.setMaximum(200);
		this.slider.setMinimum(10);
		this.slider.setValue(100);
		this.zoomInput.value = '100';
		this.slider.recalculate();
		this.slider.onchange = function () {
			this.resizeImage(false)
		}.bind(this);
		this.updateImage();
		this.updateButtons()
	},
	resizeImage: function (morph) {
		if (this.autoFit) {
			this.computeFitToScreenFactor()
		}
		var nPercent = this.slider.getValue();
		this.zoomInput.value = nPercent;
		var height = parseInt(nPercent * this.crtHeight / 100);
		var width = parseInt(nPercent * this.crtWidth / 100);
		var margin = 0;
		if (height < this.containerDim.height) {
			var margin = parseInt((this.containerDim.height - height) / 2) - 5
		}
		if (morph) {
			new Effect.Morph(this.imgTag, {
				style: {
					height: height + 'px',
					width: width + 'px',
					margin: margin + 'px'
				},
				duration: 0.5
			})
		} else {
			this.imgTag.setStyle({
				height: height + 'px',
				width: width + 'px',
				margin: margin + 'px'
			})
		}
	},
	updateImage: function () {
		var dimObject = this.sizes.get(this.currentFile);
		this.crtHeight = dimObject.height;
		this.crtWidth = dimObject.width;
		if (this.crtWidth) {
			this.crtRatio = this.crtHeight / this.crtWidth
		}
		this.downloadButton.addClassName("disabled");
		this.imgTag.src = this.baseUrl + encodeURIComponent(this.currentFile);
		if (!this.crtWidth && !this.crtHeight) {
			this.crtWidth = this.imgTag.getWidth();
			this.crtHeight = this.imgTag.getHeight();
			this.crtRatio = this.crtHeight / this.crtWidth
		}
	},
	fitToScreen: function () {
		this.computeFitToScreenFactor();
		this.resizeImage(true)
	},
	computeFitToScreenFactor: function () {
		zoomFactor1 = parseInt(this.imgContainer.getHeight() / this.crtHeight * 100);
		zoomFactor2 = parseInt(this.imgContainer.getWidth() / this.crtWidth * 100);
		this.slider.setValue(Math.min(zoomFactor1, zoomFactor2) - 1)
	},
	toggleFitToScreen: function () {
		if (this.autoFit) {
			this.autoFit = false;
			this.fitToScreenButton.removeClassName('diaporamaButtonActive')
		} else {
			this.autoFit = true;
			this.fitToScreenButton.addClassName('diaporamaButtonActive');
			this.fitToScreen()
		}
		if (ajaxplorer && ajaxplorer.user) {
			ajaxplorer.user.setPreference("diapo_autofit", (this.autoFit ? 'true': 'false'));
			ajaxplorer.user.savePreferences()
		}
	},
	play: function () {
		if (!this.timeInput.value) this.timeInput.value = 3;
		this.pe = new PeriodicalExecuter(this.next.bind(this), parseInt(this.timeInput.value));
		this.slideShowPlaying = true
	},
	stop: function () {
		if (this.pe) this.pe.stop();
		this.slideShowPlaying = false
	},
	next: function () {
		if (this.currentFile != this.items.last()) {
			this.currentFile = this.items[this.items.indexOf(this.currentFile) + 1];
			this.updateImage()
		} else if (this.slideShowPlaying) {
			this.currentFile = this.items[0];
			this.updateImage()
		}
	},
	previous: function () {
		if (this.currentFile != this.items.first()) {
			this.currentFile = this.items[this.items.indexOf(this.currentFile) - 1];
			this.updateImage()
		}
	},
	updateButtons: function () {
		if (this.slideShowPlaying) {
			this.previousButton.addClassName("disabled");
			this.nextButton.addClassName("disabled");
			this.playButton.addClassName("disabled");
			this.stopButton.removeClassName("disabled")
		} else {
			if (this.currentFile == this.items.first()) this.previousButton.addClassName("disabled");
			else this.previousButton.removeClassName("disabled");
			if (this.currentFile == this.items.last()) this.nextButton.addClassName("disabled");
			else this.nextButton.removeClassName("disabled");
			this.playButton.removeClassName("disabled");
			this.stopButton.addClassName("disabled")
		}
	}
});
Editor = Class.create(AbstractEditor, {
	initialize: function ($super, oFormObject) {
		$super(oFormObject);
		this.actions.get("saveButton").observe('click', function () {
			this.saveFile();
			return false
		}.bind(this));
		this.actions.get("downloadFileButton").observe('click', function () {
			if (!this.currentFile) return;
			ajaxplorer.triggerDownload('content.php?action=download&file=' + this.currentFile);
			return false
		}.bind(this))
	},
	open: function ($super, userSelection, filesList) {
		$super(userSelection, filesList);
		var fileName = userSelection.getUniqueFileName();
		var cpStyle = editWithCodePress(getBaseName(fileName));
		var textarea;
		this.textareaContainer = document.createElement('div');
		this.textarea = $(document.createElement('textarea'));
		if (cpStyle != "") {
			var hidden = document.createElement('input');
			hidden.type = 'hidden';
			hidden.name = hidden.id = 'code';
			this.element.appendChild(hidden);
			this.textarea.name = this.textarea.id = 'cpCode';
			$(this.textarea).addClassName('codepress');
			$(this.textarea).addClassName(cpStyle);
			$(this.textarea).addClassName('linenumbers-on');
			this.currentUseCp = true;
			this.contentMainContainer = this.textarea.parentNode;
			this.element.observe("editor:resize", function (event) {
				var cpIframe = $(this.contentMainContainer).select('iframe')[0];
				if (!cpIframe) return;
				if (event.memo && Object.isNumber(event.memo)) {
					cpIframe.setStyle({
						height: event.memo
					})
				} else {
					cpIframe.setStyle({
						width: '100%'
					});
					fitHeightToBottom(cpIframe, this.element, 0, true)
				}
			}.bind(this));
			this.element.observe("editor:enterFS", function (e) {
				this.textarea.value = this.element.select('iframe')[0].getCode()
			}.bind(this));
			this.element.observe("editor:exitFS", function (e) {
				this.textarea.value = this.element.select('iframe')[0].getCode()
			}.bind(this))
		} else {
			this.textarea.name = this.textarea.id = 'code';
			this.textarea.addClassName('dialogFocus');
			this.textarea.addClassName('editor');
			this.currentUseCp = false;
			this.contentMainContainer = this.textarea
		}
		this.textarea.setStyle({
			width: '100%'
		});
		this.textarea.setAttribute('wrap', 'off');
		this.element.appendChild(this.textareaContainer);
		this.textareaContainer.appendChild(this.textarea);
		fitHeightToBottom($(this.textarea), $(modal.elementName), 0, true);
		this.loadFileContent(fileName)
	},
	loadFileContent: function (fileName) {
		this.currentFile = fileName;
		var connexion = new Connexion();
		connexion.addParameter('get_action', 'edit');
		connexion.addParameter('file', fileName);
		connexion.onComplete = function (transp) {
			this.parseTxt(transp);
			this.updateTitle(getBaseName(fileName))
		}.bind(this);
		this.setModified(false);
		this.setOnLoad(this.textareaContainer);
		connexion.sendAsync()
	},
	saveFile: function () {
		var connexion = new Connexion();
		connexion.addParameter('get_action', 'edit');
		connexion.addParameter('save', '1');
		var value;
		if (this.currentUseCp) {
			value = this.element.select('iframe')[0].getCode();
			this.textarea.value = value
		} else {
			value = this.textarea.value
		}
		connexion.addParameter('code', value);
		connexion.addParameter('file', this.userSelection.getUniqueFileName());
		connexion.addParameter('dir', this.userSelection.getCurrentRep());
		connexion.onComplete = function (transp) {
			this.parseXml(transp)
		}.bind(this);
		this.setOnLoad(this.textareaContainer);
		connexion.setMethod('put');
		connexion.sendAsync()
	},
	parseXml: function (transport) {
		if (parseInt(transport.responseText).toString() == transport.responseText) {
			alert("Cannot write the file to disk (Error code : " + transport.responseText + ")")
		} else {
			this.setModified(false)
		}
		this.removeOnLoad(this.textareaContainer)
	},
	parseTxt: function (transport) {
		this.textarea.value = transport.responseText;
		var contentObserver = function (el, value) {
			this.setModified(true)
		}.bind(this);
		if (this.currentUseCp) {
			this.textarea.id = 'cpCode_cp';
			code = new CodePress(this.textarea, contentObserver);
			this.cpCodeObject = code;
			this.textarea.parentNode.insertBefore(code, this.textarea);
			this.contentMainContainer = this.textarea.parentNode;
			this.element.observe("editor:close", function () {
				this.cpCodeObject.close();
				modal.clearContent(modal.dialogContent)
			},
			this)
		} else {
			new Form.Element.Observer(this.textarea, 0.2, contentObserver)
		}
		this.removeOnLoad(this.textareaContainer)
	}
});
Modal = Class.create({
	pageLoading: true,
	initialize: function () {},
	initForms: function () {
		this.elementName = 'generic_dialog_box';
		this.htmlElement = $(this.elementName);
		this.dialogTitle = this.htmlElement.getElementsBySelector(".dialogTitle")[0];
		this.dialogContent = this.htmlElement.getElementsBySelector(".dialogContent")[0];
		this.currentForm;
		this.cachedForms = new Hash();
		this.iframeIndex = 0
	},
	prepareHeader: function (sTitle, sIconSrc) {
		var hString = "<span class=\"titleString\">";
		if (sIconSrc != "") hString = "<span class=\"titleString\"><img src=\"" + sIconSrc.replace('22', '16') + "\" width=\"16\" height=\"16\" align=\"top\"/>&nbsp;";
		hString += sTitle + '</span>';
		this.dialogTitle.innerHTML = hString
	},
	showDialogForm: function (sTitle, sFormId, fOnLoad, fOnComplete, fOnCancel, bOkButtonOnly, skipButtons) {
		this.clearContent(this.dialogContent);
		var newForm;
		if ($(sFormId).tagName == 'FORM') {
			newForm = $(sFormId);
			newForm.show()
		} else {
			var formDiv = $(sFormId);
			var newForm = document.createElement('form');
			newForm.id = 'modal_action_form';
			newForm.setAttribute('name', 'modal_action_form');
			newForm.setAttribute('action', 'cont.php');
			newForm.appendChild(formDiv.cloneNode(true));
			var reloadIFrame = null;
			if ($(newForm).getElementsByTagName("iframe")[0]) {
				reloadIFrame = $(newForm).getElementsByTagName("iframe")[0];
				reloadIFrameSrc = $(newForm).getElementsByTagName("iframe")[0].getAttribute("src")
			}
			if (formDiv.getAttribute('action')) {
				var actionField = document.createElement('input');
				actionField.setAttribute('type', 'hidden');
				actionField.setAttribute('name', 'get_action');
				actionField.setAttribute('value', formDiv.getAttribute('action'));
				newForm.appendChild(actionField)
			}
		}
		if (!this.cachedForms.get(sFormId) && !skipButtons) {
			this.addSubmitCancel(newForm, fOnCancel, bOkButtonOnly)
		}
		this.dialogContent.appendChild(newForm);
		var boxPadding = $(sFormId).getAttribute("box_padding");
		if (!boxPadding) boxPadding = 10;
		this.dialogContent.setStyle({
			padding: boxPadding
		});
		if (fOnComplete) {
			newForm.onsubmit = function () {
				try {
					fOnComplete()
				} catch(e) {
					alert('Unexpected Error : please report!\n' + e)
				}
				return false
			}
		} else {
			newForm.onsubmit = function () {
				ajaxplorer.actionBar.submitForm(modal.getForm());
				hideLightBox();
				return false
			}
		}
		this.showContent(this.elementName, $(sFormId).getAttribute("box_width"), $(sFormId).getAttribute("box_height"));
		if ($(newForm).getElementsBySelector(".dialogFocus").length) {
			objToFocus = $(newForm).getElementsBySelector(".dialogFocus")[0];
			setTimeout('objToFocus.focus()', 500)
		}
		if ($(newForm).getElementsBySelector(".replace_rep").length) {
			repDisplay = $(newForm).getElementsBySelector(".replace_rep")[0];
			repDisplay.innerHTML = ajaxplorer.filesList.getCurrentRep()
		}
		if ($(newForm).getElementsBySelector(".replace_file").length) {
			repDisplay = $(newForm).getElementsBySelector(".replace_file")[0];
			repDisplay.innerHTML = getBaseName(ajaxplorer.filesList.getUserSelection().getUniqueFileName())
		}
		this.currentForm = newForm;
		if (fOnLoad != null) {
			fOnLoad(this.currentForm);
			this.refreshDialogAppearance()
		}
		if (Prototype.Browser.WebKit && reloadIFrame && reloadIFrameSrc) reloadIFrame.src = reloadIFrameSrc
	},
	showContent: function (elementName, boxWidth, boxHeight, skipShadow) {
		ajaxplorer.disableShortcuts();
		ajaxplorer.disableNavigation();
		ajaxplorer.filesList.blur();
		var winWidth = $(document.body).getWidth();
		var winHeight = $(document.body).getHeight();
		if (boxWidth != null) {
			if (boxWidth.indexOf('%') > -1) {
				percentWidth = parseInt(boxWidth);
				boxWidth = parseInt((winWidth * percentWidth) / 100)
			}
			$(elementName).setStyle({
				width: boxWidth + 'px'
			})
		}
		if (boxHeight != null) {
			if (boxHeight.indexOf('%') > -1) {
				percentHeight = parseInt(boxHeight);
				boxHeight = parseInt((winHeight * percentHeight) / 100)
			}
			$(elementName).setStyle({
				height: boxHeight + 'px'
			})
		} else {
			if (Prototype.Browser.IE) {
				$(elementName).setStyle({
					height: '1%'
				})
			} else {
				$(elementName).setStyle({
					height: 'auto'
				})
			}
		}
		this.refreshDialogPosition();
		displayLightBoxById(elementName);
		$(elementName).style.position = 'absolute';
		if (Prototype.Browser.Gecko) {
			$(elementName).style.position = 'fixed'
		} else if (Prototype.Browser.IE) {
			$$('select').invoke('show');
			refreshPNGImages(this.dialogContent)
		}
		if (skipShadow) return;
		Shadower.shadow($(elementName), {
			distance: 4,
			angle: 130,
			opacity: 0.5,
			nestedShadows: 3,
			color: '#000000',
			shadowStyle: {
				display: 'block'
			}
		},
		true)
	},
	openEditorDialog: function (editorKlass, formId) {
		var loadFunc = function (oForm) {
			var fList = ajaxplorer.getFilesList();
			ajaxplorer.actionBar.editor = new editorKlass(oForm);
			ajaxplorer.actionBar.editor.open(fList.getUserSelection(), fList)
		};
		this.showDialogForm('', formId, loadFunc, null, null, true, true)
	},
	getForm: function () {
		return this.currentForm
	},
	refreshDialogPosition: function (checkHeight, elementToScroll) {
		var winWidth = $(document.body).getWidth();
		var winHeight = $(document.body).getHeight();
		boxWidth = $(this.elementName).getWidth();
		var boxHeight = $(this.elementName).getHeight();
		if (checkHeight && boxHeight > parseInt(winHeight * 90 / 100)) {
			var maxHeight = parseInt(winHeight * 90 / 100);
			var crtScrollHeight = elementToScroll.getHeight();
			var crtOffset = boxHeight - crtScrollHeight;
			if (maxHeight > crtOffset) {
				elementToScroll.setStyle({
					overflow: 'auto',
					height: (maxHeight - crtOffset) + 'px'
				});
				boxHeight = $(this.elementName).getHeight()
			}
		}
		var offsetLeft = parseInt((winWidth - parseInt(boxWidth)) / 2);
		$(this.elementName).setStyle({
			left: offsetLeft + 'px'
		});
		var offsetTop = parseInt(((winHeight - boxHeight) / 3));
		$(this.elementName).setStyle({
			top: offsetTop + 'px'
		})
	},
	refreshDialogAppearance: function () {
		Shadower.shadow($(this.elementName), {
			distance: 4,
			angle: 130,
			opacity: 0.5,
			nestedShadows: 3,
			color: '#000000',
			shadowStyle: {
				display: 'block'
			}
		},
		true)
	},
	clearContent: function (object) {
		if (object.getElementsBySelector("form").length) {
			var oThis = this;
			object.getElementsBySelector("form").each(function (currentForm) {
				if (currentForm.target == 'hidden_iframe' || currentForm.id == 'login_form' || currentForm.id == 'user_pref_form') {
					currentForm.hide();
					oThis.cachedForms.set(currentForm.id, true)
				} else {
					try {
						object.removeChild(currentForm)
					} catch(e) {}
				}
			})
		}
	},
	addSubmitCancel: function (oForm, fOnCancel, bOkButtonOnly) {
		var contDiv = document.createElement('div');
		contDiv.className = 'dialogButtons';
		var okButton = document.createElement('input');
		okButton.setAttribute('type', 'submit');
		okButton.setAttribute('name', 'sub');
		okButton.setAttribute('value', MessageHash[48]);
		$(okButton).addClassName('dialogButton');
		$(okButton).addClassName('dialogFocus');
		contDiv.appendChild(okButton);
		if (!bOkButtonOnly) {
			var caButton = document.createElement('input');
			caButton.setAttribute('type', 'button');
			caButton.setAttribute('name', 'can');
			caButton.setAttribute('value', MessageHash[49]);
			$(caButton).addClassName('dialogButton');
			if (fOnCancel) {
				caButton.onclick = function () {
					fOnCancel();
					hideLightBox();
					return false
				}
			} else {
				caButton.onclick = function () {
					hideLightBox();
					return false
				}
			}
			contDiv.appendChild(caButton)
		}
		oForm.appendChild(contDiv);
		oForm.hasButtons = true
	},
	setLoadingStepCounts: function (count) {
		this.loadingStepsCount = count;
		this.loadingStep = count
	},
	incrementStepCounts: function (add) {
		this.loadingStepsCount += add;
		this.loadingStep += add
	},
	updateLoadingProgress: function (state) {
		this.loadingStep--;
		var percent = (1 - (this.loadingStep / this.loadingStepsCount));
		var width = parseInt(parseInt($('progressBarBorder').getWidth()) * percent);
		if (state) {
			$('progressState').update(state)
		}
		if ($('progressBar')) {
			var afterFinishFunc;
			if (parseInt(percent) == 1) {
				afterFinishFunc = function (effect) {
					new Effect.Opacity('loading_overlay', {
						from: 1.0,
						to: 0,
						duration: 0.3,
						afterFinish: function (effect) {
							$('loading_overlay').remove()
						}
					})
				}
			}
			new Effect.Morph('progressBar', {
				style: 'width:' + width + 'px',
				duration: 0.8,
				afterFinish: afterFinishFunc
			})
		}
		if (this.loadingStep == 0) {
			this.pageLoading = false
		}
	},
	setCloseAction: function (func) {
		this.closeFunction = func
	},
	close: function () {
		Shadower.deshadow($(this.elementName));
		if (this.closeFunction) {
			this.closeFunction()
		}
	}
});
var modal = new Modal();
var BookmarksBar = Class.create({
	initialize: function ($super) {
		this.oElement = $('bmbar_content');
		this.currentCount = 0;
		this.bookmarks = $A([]);
		this.createMenu()
	},
	parseXml: function (transport) {
		this.clear();
		var oXmlDoc = transport.responseXML;
		if (oXmlDoc == null || oXmlDoc.documentElement == null) return;
		var root = oXmlDoc.documentElement;
		for (var i = 0; i < root.childNodes.length; i++) {
			if (root.childNodes[i].tagName != 'bookmark') continue;
			var bookmark = {
				name: root.childNodes[i].getAttribute('title'),
				alt: root.childNodes[i].getAttribute('path'),
				image: ajxpResourcesFolder + '/images/crystal/actions/16/favorite-folder.png'
			};
			bookmark.callback = function (e) {
				ajaxplorer.goTo(this.alt)
			}.bind(bookmark);
			bookmark.moreActions = this.getContextActions(bookmark.alt, bookmark.name);
			this.bookmarks.push(bookmark)
		}
		this.bmMenu.options.menuItems = this.bookmarks;
		this.bmMenu.refreshList();
		if (this.bookmarks.length) $('bm_goto_button').removeClassName('disabled');
		if (modal.pageLoading) modal.updateLoadingProgress('Bookmarks Loaded')
	},
	createMenu: function () {
		this.bmMenu = new Proto.Menu({
			className: 'menu bookmarksMenu',
			mouseClick: 'left',
			anchor: 'bm_goto_button',
			createAnchor: false,
			topOffset: 4,
			leftOffset: -2,
			menuItems: this.bookmarks,
			fade: true,
			zIndex: 2000
		})
	},
	displayBookmark: function (path, title) {
		this.oElement.innerHTML += '<div id="bookmark_' + this.currentCount + '" bm_path="' + path + '" class="bm" onmouseover="this.className=\'bm_hover\';" onmouseout="this.className=\'bm\';" title="' + path + '"><img width="16" height="16" src="' + ajxpResourcesFolder + '/images/crystal/mimes/16/folder.png" border="0" align="ABSMIDDLE"  hspace="5" style="float:left;"><!--<a href="#" class="disabled" title="' + MessageHash[146] + '" onclick="ajaxplorer.actionBar.removeBookmark(\'' + path + '\'); return false;" onmouseover="$(this).addClassName(\'enabled\');" onmouseout="$(this).removeClassName(\'enabled\');"><img width="16" height="16" src="' + ajxpResourcesFolder + '/images/crystal/actions/16/delete_bookmark.png" border="0" align="ABSMIDDLE" alt="' + MessageHash[146] + '"></a>--> <a href="#" onclick="ajaxplorer.goTo(\'' + path + '\'); return false;" class="bookmark_button">' + title + '</a></div>';
		this.currentCount++
	},
	clear: function () {
		this.currentCount = 0;
		this.bookmarks = $A([]);
		$('bm_goto_button').addClassName('disabled')
	},
	setContextualMenu: function (oMenu) {
		this.contextMenu = oMenu
	},
	findBookmarkEventSource: function (srcElement) {
		for (var i = 0; i < this.currentCount; i++) {
			var bookmark = $('bookmark_' + i);
			if (!bookmark) continue;
			if (srcElement == bookmark) return bookmark;
			if (srcElement.descendantOf(bookmark)) return bookmark
		}
	},
	getContextActions: function (bmPath, bmTitle) {
		var removeAction = {
			name: MessageHash[146],
			alt: MessageHash[146],
			image: ajxpResourcesFolder + '/images/crystal/actions/16/delete_bookmark.png',
			disabled: false,
			className: "edit",
			callback: function (e) {
				this.removeBookmark(bmPath)
			}.bind(this)
		};
		var goToAction = {
			name: MessageHash[224],
			alt: MessageHash[104],
			image: ajxpResourcesFolder + '/images/crystal/actions/16/forward.png',
			disabled: false,
			className: "edit",
			callback: function (e) {
				ajaxplorer.goTo(bmPath)
			}
		};
		var renameAction = {
			name: MessageHash[6],
			alt: MessageHash[6],
			image: ajxpResourcesFolder + '/images/crystal/actions/16/applix.png',
			disabled: false,
			className: "edit",
			callback: function (e) {
				this.toggleRenameForm(bmPath, bmTitle)
			}.bind(this)
		};
		return new Array(renameAction, removeAction)
	},
	toggleRenameForm: function (bmPath, bmTitle) {
		modal.prepareHeader(MessageHash[225], ajxpResourcesFolder + '/images/crystal/actions/16/bookmark.png');
		var onLoad = function (newForm) {
			$(newForm).bm_path.value = bmPath;
			$(newForm).bm_title.value = bmTitle
		};
		var onComplete = function () {
			this.renameBookmark(modal.getForm().bm_path.value, modal.getForm().bm_title.value);
			hideLightBox(true)
		}.bind(this);
		modal.showDialogForm('Rename', 'rename_bookmark', onLoad, onComplete)
	},
	load: function (actionsParameters) {
		this.clear();
		var connexion = new Connexion();
		if (!actionsParameters) actionsParameters = new Hash();
		actionsParameters.set('get_action', 'get_bookmarks');
		connexion.setParameters(actionsParameters);
		connexion.onComplete = function (transport) {
			this.parseXml(transport)
		}.bind(this);
		connexion.sendAsync()
	},
	addBookmark: function (path, title) {
		var parameters = new Hash();
		parameters.set('bm_action', 'add_bookmark');
		parameters.set('bm_path', path);
		if (title) {
			parameters.set('bm_title', title)
		}
		this.load(parameters)
	},
	removeBookmark: function (path) {
		var parameters = new Hash();
		parameters.set('bm_action', 'delete_bookmark');
		parameters.set('bm_path', path);
		this.load(parameters)
	},
	renameBookmark: function (path, title) {
		var parameters = new Hash();
		parameters.set('bm_action', 'rename_bookmark');
		parameters.set('bm_path', path);
		parameters.set('bm_title', title);
		this.load(parameters)
	}
});
FormManager = Class.create({
	initialize: function () {},
	replicateRow: function (templateRow, number, form) {
		for (var index = 0; index < number - 1; index++) {
			tr = $(templateRow.cloneNode(true));
			if (tr.id) tr.id = tr.id + '_' + (index + 1);
			var inputs = tr.select('input', 'select', 'textarea');
			inputs.each(function (input) {
				var newName = input.getAttribute('name') + '_' + (index + 1);
				input.setAttribute('name', newName);
				if (form && Prototype.Browser.IE) {
					form[newName] = input
				}
			});
			templateRow.up().insert({
				bottom: tr
			})
		}
		templateRow.select('input', 'select', 'textarea').each(function (origInput) {
			var newName = origInput.getAttribute('name') + '_0';
			origInput.setAttribute('name', newName);
			if (form && Prototype.Browser.IE) {
				form[newName] = origInput
			}
		})
	},
	fetchValueToForm: function (form, fields, value, suffix) {
		$A(fields).each(function (fieldName) {
			if (!value[fieldName]) return;
			if (suffix != null) {
				realFieldName = fieldName + '_' + suffix
			} else {
				realFieldName = fieldName
			}
			var element = form[realFieldName];
			if (!element) return;
			var nodeName = element.nodeName.toLowerCase();
			switch (nodeName) {
			case 'input':
				if (element.getAttribute('type') == "checkbox") {
					if (element.value == value[fieldName]) element.checked = true
				} else {
					element.value = value[fieldName]
				}
				break;
			case 'select':
				element.select('option').each(function (option) {
					if (option.value == value[fieldName]) {
						option.selected = true
					}
				});
				break;
			case 'textarea':
				element.update(value[fieldName]);
				element.value = value[fieldName];
				break;
			default:
				break
			}
		})
	},
	fetchMultipleValueToForm: function (form, fields, values) {
		var index = 0;
		$A(values).each(function (value) {
			this.fetchValueToForm(form, fields, value, index);
			index++
		}.bind(this))
	}
});
MultiUploader = Class.create({
	initialize: function (formObject, max) {
		formObject = $(formObject);
		this.mainForm = formObject;
		this.list_target = formObject.select('div.uploadFilesList')[0];
		this.count = 0;
		this.id = 0;
		if (max) {
			this.max = max
		} else {
			this.max = -1
		};
		if (window.htmlMultiUploaderOptions && window.htmlMultiUploaderOptions['284']) {
			this.max = parseInt(window.htmlMultiUploaderOptions['284'])
		}
		this.crtList = ajaxplorer.getFilesList();
		this.addElement(formObject.select('.dialogFocus')[0]);
		var rep = new Element('input', {
			type: 'hidden',
			name: 'dir',
			value: this.crtList.getCurrentRep()
		});
		formObject.insert(rep);
		this.currentFileUploading = null;
		this.nextToUpload = -1;
		$('hidden_forms').getElementsBySelector("form").each(function (element) {
			element.remove()
		});
		$('hidden_frames').innerHTML = '<iframe name="hidden_iframe" id="hidden_iframe"></iframe>';
		if (this.list_target.childNodes.length) {
			$A(this.list_target.childNodes).each(function (node) {
				this.removeChild(node)
			}.bind(this.list_target))
		}
		if (formObject.select('input[type="file"]').length > 1) {
			var index = 0;
			$(formObject).select('input[type="file"]').each(function (element) {
				if (Prototype.Browser.Gecko) element.setStyle({
					left: '-100px'
				});
				if (index > 0) element.remove();
				index++
			})
		}
		var sendButton = formObject.select('div[id="uploadSendButton"]')[0];
		if (sendButton.observerSet) return;
		var optionsButton = formObject.select('div[id="uploadOptionsButton"]')[0];
		var closeButton = formObject.select('div[id="uploadCloseButton"]')[0];
		sendButton.observerSet = true;
		sendButton.observe("click", function () {
			this.submitMainForm()
		}.bind(this));
		optionsButton.observe("click", function () {
			if (window.htmlMultiUploaderOptions) {
				var message = MessageHash[281] + '\n';
				for (var key in window.htmlMultiUploaderOptions) {
					message += '. ' + MessageHash[key] + ' : ' + window.htmlMultiUploaderOptions[key] + '\n'
				}
				alert(message)
			}
		}.bind(this));
		closeButton.observe("click", function () {
			hideLightBox()
		}.bind(this))
	},
	addElement: function (element) {
		if (element.tagName == 'INPUT' && element.type == 'file') {
			element.name = 'userfile_' + this.id++;
			element.multi_index = this.id;
			element.id = element.name;
			$(element).addClassName("dialogFocus");
			if (Prototype.Browser.Gecko) $(element).setStyle({
				left: '-100px'
			});
			element.multi_selector = this;
			element.onchange = function () {
				var new_element = document.createElement('input');
				new_element.type = 'file';
				new_element.name = 'toto';
				this.parentNode.insertBefore(new_element, this);
				this.multi_selector.addElement(new_element);
				this.multi_selector.addListRow(this);
				this.style.position = 'absolute';
				this.style.left = '-1000px';
				if (Prototype.Browser.IE) {
					this.onchange = null
				}
			};
			if (this.max != -1 && this.count >= this.max) {
				element.disabled = true
			} else {
				element.disabled = false
			}
			this.count++;
			this.current_element = element
		} else {
			alert('Error: not a file input element')
		}
	},
	addListRow: function (element) {
		var new_row = document.createElement('div');
		var new_row_button = document.createElement('img');
		new_row_button.src = ajxpResourcesFolder + '/images/crystal/actions/22/editdelete.png';
		new_row_button.align = 'absmiddle';
		new_row_button.setAttribute("style", "border:0px;cursor:pointer;");
		new_row.element = element;
		new_row_button.element = element;
		new_row.multi_index = element.multi_index;
		new_row_button.onclick = function () {
			this.element.parentNode.removeChild(this.parentNode.element);
			this.parentNode.parentNode.removeChild(this.parentNode);
			this.element.multi_selector.count--;
			this.element.multi_selector.current_element.disabled = false;
			return false
		};
		var value = element.value;
		var maxLength = 63;
		if (value.length > maxLength) {
			value = value.substr(0, 20) + '[...]' + value.substr(value.length - (maxLength - 20), value.length)
		}
		new_row.appendChild(new_row_button);
		new_row.appendChild(document.createTextNode(value));
		this.list_target.appendChild(new_row)
	},
	getFileNames: function () {
		var fileNames = new Array();
		for (var i = 0; i < this.list_target.childNodes.length; i++) {
			fileNames.push(this.list_target.childNodes[i].element.value)
		}
		return fileNames
	},
	updateRowByIndex: function (multiIndex, state) {
		var row;
		for (var i = 0; i < this.list_target.childNodes.length; i++) {
			if (this.list_target.childNodes[i].element.multi_index == multiIndex) {
				row = this.list_target.childNodes[i];
				break
			}
		}
		if (!row) {
			alert('Error : row "' + multiIndex + '" not found!');
			return
		}
		var stateImg = $(row).getElementsBySelector("img")[0];
		if (state == 'loading') stateImg.src = ajxpResourcesFolder + '/images/crystal/yellowled.png';
		else if (state == 'done') stateImg.src = ajxpResourcesFolder + '/images/crystal/greenled.png';
		else if (state == 'error') stateImg.src = ajxpResourcesFolder + '/images/crystal/redled.png'
	},
	submitMainForm: function () {
		this.currentFileUploading = null;
		this.nextToUpload = -1;
		var formsCount = 0;
		var i = 0;
		for (i = 0; i < this.id + 1; i++) {
			var newForm = this.mainForm.cloneNode(false);
			newForm.id = 'pendingform_' + formsCount;
			var addUserFile = false;
			var inputs = $(this.mainForm).getElementsBySelector("input");
			for (j = 0; j < inputs.length; j++) {
				element = inputs[j];
				if ((element.type == 'file' && element.multi_index == i && element.value != '') || element.type == 'hidden' || element.type == 'submit') {
					if (element.type == 'file') {
						addUserFile = true;
						newForm.multi_index = i;
						newForm.appendChild($(element))
					} else {
						var nodeCopy = element.cloneNode(true);
						nodeCopy.name = element.name;
						nodeCopy.value = element.value;
						newForm.appendChild(nodeCopy)
					}
				}
			}
			if (addUserFile) {
				$('hidden_forms').appendChild(newForm);
				formsCount++
			}
		}
		this.submitNext()
	},
	submitNext: function (error) {
		this.nextToUpload++;
		if (this.currentFileUploading) {
			if (error) this.updateRowByIndex(this.currentFileUploading, 'error');
			else this.updateRowByIndex(this.currentFileUploading, 'done')
		}
		if (error && typeof(error) == "string") alert(error);
		var nextToSubmit = $('pendingform_' + this.nextToUpload);
		if (nextToSubmit) {
			this.currentFileUploading = nextToSubmit.multi_index;
			this.updateRowByIndex(this.currentFileUploading, 'loading');
			var crtValue = $(nextToSubmit).getElementsBySelector('input[type="file"]')[0].value;
			if (this.crtList.fileNameExists(crtValue)) {
				overwrite = confirm(MessageHash[124]);
				if (!overwrite) {
					this.submitNext(true);
					return
				}
			}
			$(nextToSubmit).submit()
		} else {
			this.crtList.reload()
		}
	}
});
MultiDownloader = Class.create({
	initialize: function (list_target, downloadUrl) {
		this.list_target = list_target;
		this.count = 0;
		this.id = 0;
		this.downloadUrl = downloadUrl
	},
	addListRow: function (fileName) {
		this.count++;
		var new_row = new Element('div');
		var new_row_button = new Element('a');
		new_row_button.href = this.downloadUrl + fileName;
		new_row_button.insert('<img src="' + ajxpResourcesFolder + '/images/crystal/actions/16/download_manager.png" height="16" width="16" align="absmiddle" border="0"> ' + getBaseName(fileName));
		new_row_button.multidownloader = this;
		new_row_button.onclick = function () {
			this.parentNode.parentNode.removeChild(this.parentNode);
			this.multidownloader.count--;
			if (this.multidownloader.count == 0 && this.multidownloader.triggerEnd) {
				this.multidownloader.triggerEnd()
			}
			gaTrackEvent("Data", "Download", fileName)
		};
		new_row.insert(new_row_button);
		$(this.list_target).insert(new_row)
	},
	emptyList: function () {}
});
Ajaxplorer = Class.create({
	initialize: function (loadRep, usersEnabled, loggedUser, repositoryId, repoListXML, defaultDisplay) {
		this._initLoadRep = loadRep;
		this._initObj = true;
		this.usersEnabled = usersEnabled;
		this._initLoggedUser = loggedUser;
		this._initRepositoriesList = $H({});
		if (repoListXML && repoListXML.childNodes.length) {
			for (j = 0; j < repoListXML.documentElement.childNodes.length; j++) {
				var repoChild = repoListXML.documentElement.childNodes[j];
				if (repoChild.nodeName != "repo") continue;
				var repository = new Repository(repoChild.getAttribute("id"), repoChild);
				this._initRepositoriesList.set(repoChild.getAttribute("id"), repository)
			}
		}
		this._initRepositoryId = repositoryId;
		this._initDefaultDisp = ((defaultDisplay && defaultDisplay != '') ? defaultDisplay: 'list');
		this.histCount = 0;
		if (!this.usersEnabled) this.repositoryId = repositoryId;
		modal.setLoadingStepCounts(this.usersEnabled ? 6 : 5);
		this.initTemplates();
		modal.initForms();
		this.initObjects();
		window.setTimeout(function () {
			document.fire('ajaxplorer:loaded')
		},
		500)
	},
	initTemplates: function () {
		var connexion = new Connexion();
		connexion.addParameter('get_action', 'get_template');
		connexion.onComplete = function (transport) {
			$(document.body).insert({
				top: transport.responseText
			})
		};
		connexion.addParameter('template_name', 'gui_tpl.html');
		connexion.sendSync();
		modal.updateLoadingProgress('Main template loaded')
	},
	triggerDownload: function (url) {
		document.location.href = url
	},
	loadI18NMessages: function (newLanguage) {
		var connexion = new Connexion();
		connexion.addParameter('get_action', 'get_i18n_messages');
		connexion.onComplete = function (transport) {
			if (transport.responseText) {
				var result = transport.responseText.evalScripts();
				MessageHash = result[0];
				this.updateI18nTags();
				if (this.infoPanel) this.infoPanel.update();
				if (this.actionBar) this.actionBar.loadActions();
				if (this.filesList) this.filesList.reload();
				this.currentLanguage = newLanguage
			}
		}.bind(this);
		connexion.sendSync()
	},
	updateI18nTags: function () {
		var messageTags = $$('[ajxp_message_id]');
		messageTags.each(function (tag) {
			var messageId = tag.getAttribute("ajxp_message_id");
			try {
				tag.innerHTML = MessageHash[messageId]
			} catch(e) {}
		})
	},
	initObjects: function () {
		loadRep = this._initLoadRep;
		crtUser = this._initCrtUser;
		rootDirName = this._initRootDir;
		this.infoPanel = new InfoPanel("info_panel");
		if (!this.usersEnabled) {
			var fakeUser = new User("shared");
			fakeUser.setActiveRepository(this._initRepositoryId, 1, 1);
			fakeUser.setRepositoriesList(this._initRepositoriesList);
			this.actionBar = new ActionsManager($("action_bar"), this.usersEnabled, fakeUser, this);
			var repoObject = this._initRepositoriesList.get(this._initRepositoryId);
			this.foldersTree = new FoldersTree('tree_container', repoObject.getLabel(), ajxpServerAccessPath + '?action=ls', this);
			this.refreshRepositoriesMenu(this._initRepositoriesList, this._initRepositoryId);
			this.actionBar.loadActions();
			this.infoPanel.load();
			this.foldersTree.changeRootLabel(repoObject.getLabel(), repoObject.getIcon())
		} else {
			this.actionBar = new ActionsManager($("action_bar"), this.usersEnabled, null, this);
			this.foldersTree = new FoldersTree('tree_container', 'No Repository', ajxpServerAccessPath + '?action=ls', this);
			if (this._initLoggedUser) {
				this.getLoggedUserFromServer()
			} else {
				this.tryLogUserFromCookie()
			}
		}
		this.actionBar.init();
		modal.updateLoadingProgress('ActionBar Initialized');
		this.contextMenu = new Proto.Menu({
			selector: '',
			className: 'menu desktop',
			menuItems: [],
			fade: true,
			zIndex: 2000
		});
		var protoMenu = this.contextMenu;
		protoMenu.options.beforeShow = function (e) {
			setTimeout(function () {
				this.options.menuItems = ajaxplorer.actionBar.getContextActions(Event.element(e));
				this.refreshList()
			}.bind(protoMenu), 0)
		};
		this.foldersTree.setContextualMenu(this.contextMenu);
		this.actionBar.setContextualMenu(this.contextMenu);
		this.sEngine = new SearchEngine("search_container");
		this.messageBox = $('message_div');
		this.filesList = new FilesList($("selectable_div"), true, ["StringDirFile", "NumberKo", "String", "MyDate"], null, this, this._initDefaultDisp);
		this.filesList.setContextualMenu(this.contextMenu);
		modal.updateLoadingProgress('GUI Initialized');
		this.initFocusBehaviours();
		this.initTabNavigation();
		modal.updateLoadingProgress('Navigation loaded');
		this.focusOn(this.foldersTree);
		this.blockShortcuts = false;
		this.blockNavigation = false;
		new AjxpAutocompleter("current_path", "autocomplete_choices");
		if (!Prototype.Browser.WebKit && !Prototype.Browser.IE) {
			this.history = new Proto.History(function (hash) {
				this.goTo(this.historyHashToPath(hash))
			}.bind(this))
		}
		if (!this.usersEnabled) {
			this.goTo(loadRep)
		}
	},
	tryLogUserFromCookie: function () {
		var connexion = new Connexion();
		var rememberData = retrieveRememberData();
		if (rememberData != null) {
			connexion.addParameter('get_action', 'login');
			connexion.addParameter('userid', rememberData.user);
			connexion.addParameter('password', rememberData.pass);
			connexion.addParameter('cookie_login', 'true');
			connexion.onComplete = function (transport) {
				this.actionBar.parseXmlMessage(transport.responseXML)
			}.bind(this)
		} else {
			connexion.addParameter('get_action', 'logged_user');
			connexion.onComplete = function (transport) {
				this.logXmlUser(transport.responseXML)
			}.bind(this)
		}
		connexion.sendAsync()
	},
	getLoggedUserFromServer: function () {
		var connexion = new Connexion();
		connexion.addParameter('get_action', 'logged_user');
		connexion.onComplete = function (transport) {
			this.logXmlUser(transport.responseXML)
		}.bind(this);
		connexion.sendAsync()
	},
	logXmlUser: function (xmlResponse) {
		this.user = null;
		try {
			var childs = xmlResponse.documentElement.childNodes;
			for (var i = 0; i < childs.length; i++) {
				if (childs[i].tagName == "user") {
					var userId = childs[i].getAttribute('id');
					childs = childs[i].childNodes
				}
			}
			if (userId) {
				this.user = new User(userId, childs)
			}
		} catch(e) {
			alert('Error parsing XML for user : ' + e)
		}
		var repList = null;
		var repId = null;
		var repositoryObject = new Repository(null);
		if (this.user != null) {
			repId = this.user.getActiveRepository();
			repList = this.user.getRepositoriesList();
			repositoryObject = repList.get(repId);
			if (!repositoryObject) {
				alert("Empty repository object!")
			}
		}
		this.actionBar.setUser(this.user);
		this.refreshRepositoriesMenu(repList, repId);
		this.loadRepository(repositoryObject);
		document.fire("ajaxplorer:user_logged")
	},
	reloadRepositoriesList: function () {
		if (!this.user) return;
		var connexion = new Connexion();
		connexion.addParameter('get_action', 'logged_user');
		connexion.onComplete = function (transport) {
			try {
				var childs = transport.responseXML.documentElement.childNodes;
				for (var i = 0; i < childs.length; i++) {
					if (childs[i].tagName == "user") {
						var userId = childs[i].getAttribute('id');
						childs = childs[i].childNodes
					}
				}
				if (userId != this.user.id) {
					return
				}
				this.user.loadFromXml(childs)
			} catch(e) {
				alert('Error parsing XML for user : ' + e)
			}
			repId = this.user.getActiveRepository();
			repList = this.user.getRepositoriesList();
			this.refreshRepositoriesMenu(repList, repId)
		}.bind(this);
		connexion.sendAsync()
	},
	loadRepository: function (repository) {
		repository.loadResources();
		var repositoryId = repository.getId();
		this.actionBar.loadActions();
		var newIcon = repository.getIcon();
		var sEngineName = repository.getSearchEngine();
		this.foldersTree.reloadFullTree(repository.getLabel(), newIcon);
		if (!this._initObj) {
			this.filesList.loadXmlList('/');
			this.repositoryId = repositoryId;
			this.actionBar.loadBookmarks()
		} else {
			this._initObj = null
		}
		if (this._initLoadRep) {
			this.goTo(this._initLoadRep);
			this._initLoadRep = null
		}
		$('repo_path').value = repository.getLabel();
		$('repo_icon').src = newIcon;
		if (! (this.usersEnabled && this.user) && this._initRepositoriesList) {
			this.refreshRepositoriesMenu(this._initRepositoriesList, repositoryId)
		}
		this.sEngine = eval('new ' + sEngineName + '("search_container");')
	},
	goTo: function (rep, selectFile) {
		this.actionBar.updateLocationBar(rep);
		this.foldersTree.goToDeepPath(rep);
		this.filesList.loadXmlList(rep, selectFile)
	},
	refreshRepositoriesMenu: function (rootDirsList, repositoryId) {
		$('goto_repo_button').addClassName('disabled');
		var actions = new Array();
		if (rootDirsList && rootDirsList.size() > 1) {
			rootDirsList.each(function (pair) {
				var repoObject = pair.value;
				var key = pair.key;
				var selected = (key == repositoryId ? true: false);
				actions[actions.length] = {
					name: repoObject.getLabel(),
					alt: repoObject.getLabel(),
					image: repoObject.getIcon(),
					className: "edit",
					disabled: selected,
					callback: function (e) {
						ajaxplorer.triggerRootDirChange('' + key)
					}
				}
			}.bind(this))
		}
		if (this.rootMenu) {
			this.rootMenu.options.menuItems = actions;
			this.rootMenu.refreshList()
		} else {
			this.rootMenu = new Proto.Menu({
				className: 'menu rootDirChooser',
				mouseClick: 'left',
				anchor: 'goto_repo_button',
				createAnchor: false,
				anchorContainer: $('dir_chooser'),
				anchorSrc: ajxpResourcesFolder + '/images/crystal/lower.png',
				anchorTitle: MessageHash[200],
				topOffset: 6,
				leftOffset: -127,
				menuTitle: MessageHash[200],
				menuItems: actions,
				fade: true,
				zIndex: 1500
			})
		}
		if (actions.length) $('goto_repo_button').removeClassName('disabled');
		actions.sort(function (a, b) {
			return a.name > b.name
		})
	},
	triggerRootDirChange: function (repositoryId) {
		this.actionBar.updateLocationBar('/');
		var connexion = new Connexion();
		connexion.addParameter('get_action', 'switch_root_dir');
		connexion.addParameter('root_dir_index', repositoryId);
		oThis = this;
		connexion.onComplete = function (transport) {
			if (this.usersEnabled) {
				this.getLoggedUserFromServer()
			} else {
				this.actionBar.parseXmlMessage(transport.responseXML);
				this.loadRepository(this._initRepositoriesList.get(repositoryId))
			}
		}.bind(this);
		connexion.sendAsync()
	},
	updateHistory: function (path) {
		if (this.history) this.history.historyLoad(this.pathToHistoryHash(path))
	},
	pathToHistoryHash: function (path) {
		document.title = 'AjaXplorer - ' + (getBaseName(path) ? getBaseName(path) : '/');
		if (!this.pathesHash) {
			this.pathesHash = new Hash();
			this.histCount = -1
		}
		var foundKey;
		this.pathesHash.each(function (pair) {
			if (pair.value == path) foundKey = pair.key
		});
		if (foundKey != undefined) return foundKey;
		this.histCount++;
		this.pathesHash.set(this.histCount, path);
		return this.histCount
	},
	historyHashToPath: function (hash) {
		if (!this.pathesHash) return "/";
		var path = this.pathesHash.get(hash);
		if (path == undefined) return "/";
		return path
	},
	cancelCopyOrMove: function () {
		this.foldersTree.setTreeInNormalMode();
		this.foldersTree.selectCurrentNodeName();
		this.actionBar.treeCopyActive = false;
		hideLightBox();
		return false
	},
	disableShortcuts: function () {
		this.blockShortcuts = true
	},
	enableShortcuts: function () {
		this.blockShortcuts = false
	},
	disableNavigation: function () {
		this.blockNavigation = true
	},
	enableNavigation: function () {
		this.blockNavigation = false
	},
	getActionBar: function () {
		return this.actionBar
	},
	getFilesList: function () {
		return this.filesList
	},
	getFoldersTree: function () {
		return this.foldersTree
	},
	closeMessageDiv: function () {
		if (this.messageDivOpen) {
			new Effect.Fade(this.messageBox);
			this.messageDivOpen = false
		}
	},
	tempoMessageDivClosing: function () {
		this.messageDivOpen = true;
		setTimeout('ajaxplorer.closeMessageDiv()', 6000)
	},
	displayMessage: function (messageType, message) {
		message = message.replace(new RegExp("(\\n)", "g"), "<br>");
		if (messageType == "ERROR") {
			this.messageBox.removeClassName('logMessage');
			this.messageBox.addClassName('errorMessage')
		} else {
			this.messageBox.removeClassName('errorMessage');
			this.messageBox.addClassName('logMessage')
		}
		$('message_content').innerHTML = message;
		var containerOffset = Position.cumulativeOffset($('content_pane'));
		var containerDimensions = $('content_pane').getDimensions();
		var boxHeight = $(this.messageBox).getHeight();
		var topPosition = containerOffset[1] + containerDimensions.height - boxHeight - 20;
		var boxWidth = parseInt(containerDimensions.width * 90 / 100);
		var leftPosition = containerOffset[0] + parseInt(containerDimensions.width * 5 / 100);
		this.messageBox.style.top = topPosition + 'px';
		this.messageBox.style.left = leftPosition + 'px';
		this.messageBox.style.width = boxWidth + 'px';
		new Effect.Corner(this.messageBox, "round");
		new Effect.Appear(this.messageBox);
		this.tempoMessageDivClosing()
	},
	initFocusBehaviours: function () {
		$('topPane').observe("click", function () {
			ajaxplorer.focusOn(ajaxplorer.foldersTree)
		});
		$('content_pane').observe("click", function () {
			ajaxplorer.focusOn(ajaxplorer.filesList)
		});
		$('action_bar').observe("click", function () {
			ajaxplorer.focusOn(ajaxplorer.actionBar)
		});
		$('search_div').observe("click", function () {
			ajaxplorer.focusOn(ajaxplorer.sEngine)
		})
	},
	focusOn: function (object) {
		var objects = [this.foldersTree, this.sEngine, this.filesList, this.actionBar];
		objects.each(function (obj) {
			if (obj != object) obj.blur()
		});
		object.focus()
	},
	initTabNavigation: function () {
		var objects = [this.foldersTree, this.filesList, this.actionBar];
		Event.observe(document, "keydown", function (e) {
			if (e.keyCode == Event.KEY_TAB) {
				if (this.blockNavigation) return;
				var shiftKey = e['shiftKey'];
				for (i = 0; i < objects.length; i++) {
					if (objects[i].hasFocus) {
						objects[i].blur();
						var nextIndex;
						if (shiftKey) {
							if (i > 0) nextIndex = i - 1;
							else nextIndex = (objects.length) - 1
						} else {
							if (i < objects.length - 1) nextIndex = i + 1;
							else nextIndex = 0
						}
						objects[nextIndex].focus();
						break
					}
				}
				Event.stop(e)
			}
			if (this.blockShortcuts || e['ctrlKey']) return;
			if (e.keyCode > 90 || e.keyCode < 65) return;
			else return this.actionBar.fireActionByKey(e, String.fromCharCode(e.keyCode).toLowerCase())
		}.bind(this))
	},
	toggleSidePanel: function (srcName) {
		if (srcName == 'info' && this.currentSideToggle != 'info') {
			this.sEngine.showElement(false);
			if ($('search_header')) {
				$('search_header').addClassName("toggleInactive");
				$('search_header').getElementsBySelector("img")[0].hide()
			}
			this.infoPanel.showElement(true);
			if ($('info_panel_header')) {
				$('info_panel_header').removeClassName("toggleInactive");
				$('info_panel_header').getElementsBySelector("img")[0].show()
			}
		} else if (srcName == 'search' && this.currentSideToggle != 'search') {
			this.sEngine.showElement(true);
			if ($('search_header')) {
				$('search_header').removeClassName("toggleInactive");
				$('search_header').getElementsBySelector("img")[0].show()
			}
			this.infoPanel.showElement(false);
			if ($('info_panel_header')) {
				$('info_panel_header').addClassName("toggleInactive");
				$('info_panel_header').getElementsBySelector("img")[0].hide()
			}
			this.sEngine.resize()
		}
		this.currentSideToggle = srcName
	}
});