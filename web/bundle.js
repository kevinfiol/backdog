(function () {
	'use strict';

	function Vnode(tag, key, attrs, children, text, dom) {
		return {tag: tag, key: key, attrs: attrs, children: children, text: text, dom: dom, domSize: undefined, state: undefined, events: undefined, instance: undefined}
	}
	Vnode.normalize = function(node) {
		if (Array.isArray(node)) { return Vnode("[", undefined, undefined, Vnode.normalizeChildren(node), undefined, undefined) }
		if (node != null && typeof node !== "object") { return Vnode("#", undefined, undefined, node === false ? "" : node, undefined, undefined) }
		return node
	};
	Vnode.normalizeChildren = function(input) {
		var children = [];
		for (var i = 0; i < input.length; i++) {
			children[i] = Vnode.normalize(input[i]);
		}
		return children
	};

	var vnode = Vnode;

	// Call via `hyperscriptVnode.apply(startOffset, arguments)`
	//
	// The reason I do it this way, forwarding the arguments and passing the start
	// offset in `this`, is so I don't have to create a temporary array in a
	// performance-critical path.
	//
	// In native ES6, I'd instead add a final `...args` parameter to the
	// `hyperscript` and `fragment` factories and define this as
	// `hyperscriptVnode(...args)`, since modern engines do optimize that away. But
	// ES5 (what Mithril requires thanks to IE support) doesn't give me that luxury,
	// and engines aren't nearly intelligent enough to do either of these:
	//
	// 1. Elide the allocation for `[].slice.call(arguments, 1)` when it's passed to
	//    another function only to be indexed.
	// 2. Elide an `arguments` allocation when it's passed to any function other
	//    than `Function.prototype.apply` or `Reflect.apply`.
	//
	// In ES6, it'd probably look closer to this (I'd need to profile it, though):
	// module.exports = function(attrs, ...children) {
	//     if (attrs == null || typeof attrs === "object" && attrs.tag == null && !Array.isArray(attrs)) {
	//         if (children.length === 1 && Array.isArray(children[0])) children = children[0]
	//     } else {
	//         children = children.length === 0 && Array.isArray(attrs) ? attrs : [attrs, ...children]
	//         attrs = undefined
	//     }
	//
	//     if (attrs == null) attrs = {}
	//     return Vnode("", attrs.key, attrs, children)
	// }
	var hyperscriptVnode = function() {
		var arguments$1 = arguments;

		var attrs = arguments[this], start = this + 1, children;

		if (attrs == null) {
			attrs = {};
		} else if (typeof attrs !== "object" || attrs.tag != null || Array.isArray(attrs)) {
			attrs = {};
			start = this;
		}

		if (arguments.length === start + 1) {
			children = arguments[start];
			if (!Array.isArray(children)) { children = [children]; }
		} else {
			children = [];
			while (start < arguments.length) { children.push(arguments$1[start++]); }
		}

		return vnode("", attrs.key, attrs, children)
	};

	var selectorParser = /(?:(^|#|\.)([^#\.\[\]]+))|(\[(.+?)(?:\s*=\s*("|'|)((?:\\["'\]]|.)*?)\5)?\])/g;
	var selectorCache = {};
	var hasOwn = {}.hasOwnProperty;

	function isEmpty(object) {
		for (var key in object) { if (hasOwn.call(object, key)) { return false } }
		return true
	}

	function compileSelector(selector) {
		var match, tag = "div", classes = [], attrs = {};
		while (match = selectorParser.exec(selector)) {
			var type = match[1], value = match[2];
			if (type === "" && value !== "") { tag = value; }
			else if (type === "#") { attrs.id = value; }
			else if (type === ".") { classes.push(value); }
			else if (match[3][0] === "[") {
				var attrValue = match[6];
				if (attrValue) { attrValue = attrValue.replace(/\\(["'])/g, "$1").replace(/\\\\/g, "\\"); }
				if (match[4] === "class") { classes.push(attrValue); }
				else { attrs[match[4]] = attrValue === "" ? attrValue : attrValue || true; }
			}
		}
		if (classes.length > 0) { attrs.className = classes.join(" "); }
		return selectorCache[selector] = {tag: tag, attrs: attrs}
	}

	function execSelector(state, vnode$1) {
		var attrs = vnode$1.attrs;
		var children = vnode.normalizeChildren(vnode$1.children);
		var hasClass = hasOwn.call(attrs, "class");
		var className = hasClass ? attrs.class : attrs.className;

		vnode$1.tag = state.tag;
		vnode$1.attrs = null;
		vnode$1.children = undefined;

		if (!isEmpty(state.attrs) && !isEmpty(attrs)) {
			var newAttrs = {};

			for (var key in attrs) {
				if (hasOwn.call(attrs, key)) { newAttrs[key] = attrs[key]; }
			}

			attrs = newAttrs;
		}

		for (var key in state.attrs) {
			if (hasOwn.call(state.attrs, key) && key !== "className" && !hasOwn.call(attrs, key)){
				attrs[key] = state.attrs[key];
			}
		}
		if (className != null || state.attrs.className != null) { attrs.className =
			className != null
				? state.attrs.className != null
					? String(state.attrs.className) + " " + String(className)
					: className
				: state.attrs.className != null
					? state.attrs.className
					: null; }

		if (hasClass) { attrs.class = null; }

		for (var key in attrs) {
			if (hasOwn.call(attrs, key) && key !== "key") {
				vnode$1.attrs = attrs;
				break
			}
		}

		if (Array.isArray(children) && children.length === 1 && children[0] != null && children[0].tag === "#") {
			vnode$1.text = children[0].children;
		} else {
			vnode$1.children = children;
		}

		return vnode$1
	}

	function hyperscript(selector) {
		if (selector == null || typeof selector !== "string" && typeof selector !== "function" && typeof selector.view !== "function") {
			throw Error("The selector must be either a string or a component.");
		}

		var vnode$1 = hyperscriptVnode.apply(1, arguments);

		if (typeof selector === "string") {
			vnode$1.children = vnode.normalizeChildren(vnode$1.children);
			if (selector !== "[") { return execSelector(selectorCache[selector] || compileSelector(selector), vnode$1) }
		}
		
		vnode$1.tag = selector;
		return vnode$1
	}

	var hyperscript_1 = hyperscript;

	var trust = function(html) {
		if (html == null) { html = ""; }
		return vnode("<", undefined, undefined, html, undefined, undefined)
	};

	var fragment = function() {
		var vnode$1 = hyperscriptVnode.apply(0, arguments);

		vnode$1.tag = "[";
		vnode$1.children = vnode.normalizeChildren(vnode$1.children);
		return vnode$1
	};

	hyperscript_1.trust = trust;
	hyperscript_1.fragment = fragment;

	var hyperscript_1$1 = hyperscript_1;

	var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

	function createCommonjsModule(fn, module) {
		return module = { exports: {} }, fn(module, module.exports), module.exports;
	}

	/** @constructor */
	var PromisePolyfill = function(executor) {
		if (!(this instanceof PromisePolyfill)) { throw new Error("Promise must be called with `new`") }
		if (typeof executor !== "function") { throw new TypeError("executor must be a function") }

		var self = this, resolvers = [], rejectors = [], resolveCurrent = handler(resolvers, true), rejectCurrent = handler(rejectors, false);
		var instance = self._instance = {resolvers: resolvers, rejectors: rejectors};
		var callAsync = typeof setImmediate === "function" ? setImmediate : setTimeout;
		function handler(list, shouldAbsorb) {
			return function execute(value) {
				var then;
				try {
					if (shouldAbsorb && value != null && (typeof value === "object" || typeof value === "function") && typeof (then = value.then) === "function") {
						if (value === self) { throw new TypeError("Promise can't be resolved w/ itself") }
						executeOnce(then.bind(value));
					}
					else {
						callAsync(function() {
							if (!shouldAbsorb && list.length === 0) { console.error("Possible unhandled promise rejection:", value); }
							for (var i = 0; i < list.length; i++) { list[i](value); }
							resolvers.length = 0, rejectors.length = 0;
							instance.state = shouldAbsorb;
							instance.retry = function() {execute(value);};
						});
					}
				}
				catch (e) {
					rejectCurrent(e);
				}
			}
		}
		function executeOnce(then) {
			var runs = 0;
			function run(fn) {
				return function(value) {
					if (runs++ > 0) { return }
					fn(value);
				}
			}
			var onerror = run(rejectCurrent);
			try {then(run(resolveCurrent), onerror);} catch (e) {onerror(e);}
		}

		executeOnce(executor);
	};
	PromisePolyfill.prototype.then = function(onFulfilled, onRejection) {
		var self = this, instance = self._instance;
		function handle(callback, list, next, state) {
			list.push(function(value) {
				if (typeof callback !== "function") { next(value); }
				else { try {resolveNext(callback(value));} catch (e) {if (rejectNext) { rejectNext(e); }} }
			});
			if (typeof instance.retry === "function" && state === instance.state) { instance.retry(); }
		}
		var resolveNext, rejectNext;
		var promise = new PromisePolyfill(function(resolve, reject) {resolveNext = resolve, rejectNext = reject;});
		handle(onFulfilled, instance.resolvers, resolveNext, true), handle(onRejection, instance.rejectors, rejectNext, false);
		return promise
	};
	PromisePolyfill.prototype.catch = function(onRejection) {
		return this.then(null, onRejection)
	};
	PromisePolyfill.prototype.finally = function(callback) {
		return this.then(
			function(value) {
				return PromisePolyfill.resolve(callback()).then(function() {
					return value
				})
			},
			function(reason) {
				return PromisePolyfill.resolve(callback()).then(function() {
					return PromisePolyfill.reject(reason);
				})
			}
		)
	};
	PromisePolyfill.resolve = function(value) {
		if (value instanceof PromisePolyfill) { return value }
		return new PromisePolyfill(function(resolve) {resolve(value);})
	};
	PromisePolyfill.reject = function(value) {
		return new PromisePolyfill(function(resolve, reject) {reject(value);})
	};
	PromisePolyfill.all = function(list) {
		return new PromisePolyfill(function(resolve, reject) {
			var total = list.length, count = 0, values = [];
			if (list.length === 0) { resolve([]); }
			else { for (var i = 0; i < list.length; i++) {
				(function(i) {
					function consume(value) {
						count++;
						values[i] = value;
						if (count === total) { resolve(values); }
					}
					if (list[i] != null && (typeof list[i] === "object" || typeof list[i] === "function") && typeof list[i].then === "function") {
						list[i].then(consume, reject);
					}
					else { consume(list[i]); }
				})(i);
			} }
		})
	};
	PromisePolyfill.race = function(list) {
		return new PromisePolyfill(function(resolve, reject) {
			for (var i = 0; i < list.length; i++) {
				list[i].then(resolve, reject);
			}
		})
	};

	var polyfill = PromisePolyfill;

	var promise = createCommonjsModule(function (module) {



	if (typeof window !== "undefined") {
		if (typeof window.Promise === "undefined") {
			window.Promise = polyfill;
		} else if (!window.Promise.prototype.finally) {
			window.Promise.prototype.finally = polyfill.prototype.finally;
		}
		module.exports = window.Promise;
	} else if (typeof commonjsGlobal !== "undefined") {
		if (typeof commonjsGlobal.Promise === "undefined") {
			commonjsGlobal.Promise = polyfill;
		} else if (!commonjsGlobal.Promise.prototype.finally) {
			commonjsGlobal.Promise.prototype.finally = polyfill.prototype.finally;
		}
		module.exports = commonjsGlobal.Promise;
	} else {
		module.exports = polyfill;
	}
	});

	var build = function(object) {
		if (Object.prototype.toString.call(object) !== "[object Object]") { return "" }

		var args = [];
		for (var key in object) {
			destructure(key, object[key]);
		}

		return args.join("&")

		function destructure(key, value) {
			if (Array.isArray(value)) {
				for (var i = 0; i < value.length; i++) {
					destructure(key + "[" + i + "]", value[i]);
				}
			}
			else if (Object.prototype.toString.call(value) === "[object Object]") {
				for (var i in value) {
					destructure(key + "[" + i + "]", value[i]);
				}
			}
			else { args.push(encodeURIComponent(key) + (value != null && value !== "" ? "=" + encodeURIComponent(value) : "")); }
		}
	};

	var assign = Object.assign || function(target, source) {
		Object.keys(source).forEach(function(key) { target[key] = source[key]; });
	};

	// Returns `path` from `template` + `params`
	var build$1 = function(template, params) {
		if ((/:([^\/\.-]+)(\.{3})?:/).test(template)) {
			throw new SyntaxError("Template parameter names *must* be separated")
		}
		if (params == null) { return template }
		var queryIndex = template.indexOf("?");
		var hashIndex = template.indexOf("#");
		var queryEnd = hashIndex < 0 ? template.length : hashIndex;
		var pathEnd = queryIndex < 0 ? queryEnd : queryIndex;
		var path = template.slice(0, pathEnd);
		var query = {};

		assign(query, params);

		var resolved = path.replace(/:([^\/\.-]+)(\.{3})?/g, function(m, key, variadic) {
			delete query[key];
			// If no such parameter exists, don't interpolate it.
			if (params[key] == null) { return m }
			// Escape normal parameters, but not variadic ones.
			return variadic ? params[key] : encodeURIComponent(String(params[key]))
		});

		// In case the template substitution adds new query/hash parameters.
		var newQueryIndex = resolved.indexOf("?");
		var newHashIndex = resolved.indexOf("#");
		var newQueryEnd = newHashIndex < 0 ? resolved.length : newHashIndex;
		var newPathEnd = newQueryIndex < 0 ? newQueryEnd : newQueryIndex;
		var result = resolved.slice(0, newPathEnd);

		if (queryIndex >= 0) { result += "?" + template.slice(queryIndex, queryEnd); }
		if (newQueryIndex >= 0) { result += (queryIndex < 0 ? "?" : "&") + resolved.slice(newQueryIndex, newQueryEnd); }
		var querystring = build(query);
		if (querystring) { result += (queryIndex < 0 && newQueryIndex < 0 ? "?" : "&") + querystring; }
		if (hashIndex >= 0) { result += template.slice(hashIndex); }
		if (newHashIndex >= 0) { result += (hashIndex < 0 ? "" : "&") + resolved.slice(newHashIndex); }
		return result
	};

	var request = function($window, Promise) {
		var callbackCount = 0;
		var oncompletion;

		function makeRequest(factory) {
			return function(url, args) {
				if (typeof url !== "string") { args = url; url = url.url; }
				else if (args == null) { args = {}; }
				var promise = new Promise(function(resolve, reject) {
					factory(build$1(url, args.params), args, function (data) {
						if (typeof args.type === "function") {
							if (Array.isArray(data)) {
								for (var i = 0; i < data.length; i++) {
									data[i] = new args.type(data[i]);
								}
							}
							else { data = new args.type(data); }
						}
						resolve(data);
					}, reject);
				});
				if (args.background === true) { return promise }
				var count = 0;
				function complete() {
					if (--count === 0 && typeof oncompletion === "function") { oncompletion(); }
				}

				return wrap(promise)

				function wrap(promise) {
					var then = promise.then;
					promise.then = function() {
						count++;
						var next = then.apply(promise, arguments);
						next.then(complete, function(e) {
							complete();
							if (count === 0) { throw e }
						});
						return wrap(next)
					};
					return promise
				}
			}
		}

		function hasHeader(args, name) {
			for (var key in args.headers) {
				if ({}.hasOwnProperty.call(args.headers, key) && name.test(key)) { return true }
			}
			return false
		}

		return {
			request: makeRequest(function(url, args, resolve, reject) {
				var method = args.method != null ? args.method.toUpperCase() : "GET";
				var body = args.body;
				var assumeJSON = (args.serialize == null || args.serialize === JSON.serialize) && !(body instanceof $window.FormData);

				var xhr = new $window.XMLHttpRequest(),
					aborted = false,
					_abort = xhr.abort;

				xhr.abort = function abort() {
					aborted = true;
					_abort.call(xhr);
				};

				xhr.open(method, url, args.async !== false, typeof args.user === "string" ? args.user : undefined, typeof args.password === "string" ? args.password : undefined);

				if (assumeJSON && body != null && !hasHeader(args, /^content-type$/i)) {
					xhr.setRequestHeader("Content-Type", "application/json; charset=utf-8");
				}
				if (typeof args.deserialize !== "function" && !hasHeader(args, /^accept$/i)) {
					xhr.setRequestHeader("Accept", "application/json, text/*");
				}
				if (args.withCredentials) { xhr.withCredentials = args.withCredentials; }
				if (args.timeout) { xhr.timeout = args.timeout; }
				xhr.responseType = args.responseType || (typeof args.extract === "function" ? "" : "json");

				for (var key in args.headers) {
					if ({}.hasOwnProperty.call(args.headers, key)) {
						xhr.setRequestHeader(key, args.headers[key]);
					}
				}

				if (typeof args.config === "function") { xhr = args.config(xhr, args) || xhr; }

				xhr.onreadystatechange = function() {
					// Don't throw errors on xhr.abort().
					if(aborted) { return }

					if (xhr.readyState === 4) {
						try {
							var success = (xhr.status >= 200 && xhr.status < 300) || xhr.status === 304 || (/^file:\/\//i).test(url);
							// When the response type isn't "" or "text",
							// `xhr.responseText` is the wrong thing to use.
							// Browsers do the right thing and throw here, and we
							// should honor that and do the right thing by
							// preferring `xhr.response` where possible/practical.
							var response = xhr.response, message;

							if (response == null) {
								try {
									response = xhr.responseText;
									// Note: this snippet is intentionally *after*
									// `xhr.responseText` is accessed, since the
									// above will throw in modern browsers (thus
									// skipping the rest of this section). It's an
									// IE hack to detect and work around the lack of
									// native `responseType: "json"` support there.
									if (typeof args.extract !== "function" && xhr.responseType === "json") { response = JSON.parse(response); }
								}
								catch (e) { response = null; }
							}

							if (typeof args.extract === "function") {
								response = args.extract(xhr, args);
								success = true;
							} else if (typeof args.deserialize === "function") {
								response = args.deserialize(response);
							}
							if (success) { resolve(response); }
							else {
								try { message = xhr.responseText; }
								catch (e) { message = response; }
								var error = new Error(message);
								error.code = xhr.status;
								error.response = response;
								reject(error);
							}
						}
						catch (e) {
							reject(e);
						}
					}
				};

				if (body == null) { xhr.send(); }
				else if (typeof args.serialize === "function") { xhr.send(args.serialize(body)); }
				else if (body instanceof $window.FormData) { xhr.send(body); }
				else { xhr.send(JSON.stringify(body)); }
			}),
			jsonp: makeRequest(function(url, args, resolve, reject) {
				var callbackName = args.callbackName || "_mithril_" + Math.round(Math.random() * 1e16) + "_" + callbackCount++;
				var script = $window.document.createElement("script");
				$window[callbackName] = function(data) {
					delete $window[callbackName];
					script.parentNode.removeChild(script);
					resolve(data);
				};
				script.onerror = function() {
					delete $window[callbackName];
					script.parentNode.removeChild(script);
					reject(new Error("JSONP request failed"));
				};
				script.src = url + (url.indexOf("?") < 0 ? "?" : "&") +
					encodeURIComponent(args.callbackKey || "callback") + "=" +
					encodeURIComponent(callbackName);
				$window.document.documentElement.appendChild(script);
			}),
			setCompletionCallback: function(callback) {
				oncompletion = callback;
			},
		}
	};

	var request$1 = request(window, promise);

	var render = function($window) {
		var $doc = $window.document;

		var nameSpace = {
			svg: "http://www.w3.org/2000/svg",
			math: "http://www.w3.org/1998/Math/MathML"
		};

		var redraw;
		function setRedraw(callback) {return redraw = callback}

		function getNameSpace(vnode) {
			return vnode.attrs && vnode.attrs.xmlns || nameSpace[vnode.tag]
		}

		//sanity check to discourage people from doing `vnode.state = ...`
		function checkState(vnode, original) {
			if (vnode.state !== original) { throw new Error("`vnode.state` must not be modified") }
		}

		//Note: the hook is passed as the `this` argument to allow proxying the
		//arguments without requiring a full array allocation to do so. It also
		//takes advantage of the fact the current `vnode` is the first argument in
		//all lifecycle methods.
		function callHook(vnode) {
			var original = vnode.state;
			try {
				return this.apply(original, arguments)
			} finally {
				checkState(vnode, original);
			}
		}

		// IE11 (at least) throws an UnspecifiedError when accessing document.activeElement when
		// inside an iframe. Catch and swallow this error, and heavy-handidly return null.
		function activeElement() {
			try {
				return $doc.activeElement
			} catch (e) {
				return null
			}
		}
		//create
		function createNodes(parent, vnodes, start, end, hooks, nextSibling, ns) {
			for (var i = start; i < end; i++) {
				var vnode = vnodes[i];
				if (vnode != null) {
					createNode(parent, vnode, hooks, ns, nextSibling);
				}
			}
		}
		function createNode(parent, vnode, hooks, ns, nextSibling) {
			var tag = vnode.tag;
			if (typeof tag === "string") {
				vnode.state = {};
				if (vnode.attrs != null) { initLifecycle(vnode.attrs, vnode, hooks); }
				switch (tag) {
					case "#": createText(parent, vnode, nextSibling); break
					case "<": createHTML(parent, vnode, ns, nextSibling); break
					case "[": createFragment(parent, vnode, hooks, ns, nextSibling); break
					default: createElement(parent, vnode, hooks, ns, nextSibling);
				}
			}
			else { createComponent(parent, vnode, hooks, ns, nextSibling); }
		}
		function createText(parent, vnode, nextSibling) {
			vnode.dom = $doc.createTextNode(vnode.children);
			insertNode(parent, vnode.dom, nextSibling);
		}
		var possibleParents = {caption: "table", thead: "table", tbody: "table", tfoot: "table", tr: "tbody", th: "tr", td: "tr", colgroup: "table", col: "colgroup"};
		function createHTML(parent, vnode, ns, nextSibling) {
			var match = vnode.children.match(/^\s*?<(\w+)/im) || [];
			// not using the proper parent makes the child element(s) vanish.
			//     var div = document.createElement("div")
			//     div.innerHTML = "<td>i</td><td>j</td>"
			//     console.log(div.innerHTML)
			// --> "ij", no <td> in sight.
			var temp = $doc.createElement(possibleParents[match[1]] || "div");
			if (ns === "http://www.w3.org/2000/svg") {
				temp.innerHTML = "<svg xmlns=\"http://www.w3.org/2000/svg\">" + vnode.children + "</svg>";
				temp = temp.firstChild;
			} else {
				temp.innerHTML = vnode.children;
			}
			vnode.dom = temp.firstChild;
			vnode.domSize = temp.childNodes.length;
			var fragment = $doc.createDocumentFragment();
			var child;
			while (child = temp.firstChild) {
				fragment.appendChild(child);
			}
			insertNode(parent, fragment, nextSibling);
		}
		function createFragment(parent, vnode, hooks, ns, nextSibling) {
			var fragment = $doc.createDocumentFragment();
			if (vnode.children != null) {
				var children = vnode.children;
				createNodes(fragment, children, 0, children.length, hooks, null, ns);
			}
			vnode.dom = fragment.firstChild;
			vnode.domSize = fragment.childNodes.length;
			insertNode(parent, fragment, nextSibling);
		}
		function createElement(parent, vnode$1, hooks, ns, nextSibling) {
			var tag = vnode$1.tag;
			var attrs = vnode$1.attrs;
			var is = attrs && attrs.is;

			ns = getNameSpace(vnode$1) || ns;

			var element = ns ?
				is ? $doc.createElementNS(ns, tag, {is: is}) : $doc.createElementNS(ns, tag) :
				is ? $doc.createElement(tag, {is: is}) : $doc.createElement(tag);
			vnode$1.dom = element;

			if (attrs != null) {
				setAttrs(vnode$1, attrs, ns);
			}

			insertNode(parent, element, nextSibling);

			if (attrs != null && attrs.contenteditable != null) {
				setContentEditable(vnode$1);
			}
			else {
				if (vnode$1.text != null) {
					if (vnode$1.text !== "") { element.textContent = vnode$1.text; }
					else { vnode$1.children = [vnode("#", undefined, undefined, vnode$1.text, undefined, undefined)]; }
				}
				if (vnode$1.children != null) {
					var children = vnode$1.children;
					createNodes(element, children, 0, children.length, hooks, null, ns);
					if (vnode$1.tag === "select" && attrs != null) { setLateSelectAttrs(vnode$1, attrs); }
				}
			}
		}
		function initComponent(vnode$1, hooks) {
			var sentinel;
			if (typeof vnode$1.tag.view === "function") {
				vnode$1.state = Object.create(vnode$1.tag);
				sentinel = vnode$1.state.view;
				if (sentinel.$$reentrantLock$$ != null) { return }
				sentinel.$$reentrantLock$$ = true;
			} else {
				vnode$1.state = void 0;
				sentinel = vnode$1.tag;
				if (sentinel.$$reentrantLock$$ != null) { return }
				sentinel.$$reentrantLock$$ = true;
				vnode$1.state = (vnode$1.tag.prototype != null && typeof vnode$1.tag.prototype.view === "function") ? new vnode$1.tag(vnode$1) : vnode$1.tag(vnode$1);
			}
			initLifecycle(vnode$1.state, vnode$1, hooks);
			if (vnode$1.attrs != null) { initLifecycle(vnode$1.attrs, vnode$1, hooks); }
			vnode$1.instance = vnode.normalize(callHook.call(vnode$1.state.view, vnode$1));
			if (vnode$1.instance === vnode$1) { throw Error("A view cannot return the vnode it received as argument") }
			sentinel.$$reentrantLock$$ = null;
		}
		function createComponent(parent, vnode, hooks, ns, nextSibling) {
			initComponent(vnode, hooks);
			if (vnode.instance != null) {
				createNode(parent, vnode.instance, hooks, ns, nextSibling);
				vnode.dom = vnode.instance.dom;
				vnode.domSize = vnode.dom != null ? vnode.instance.domSize : 0;
			}
			else {
				vnode.domSize = 0;
			}
		}

		//update
		/**
		 * @param {Element|Fragment} parent - the parent element
		 * @param {Vnode[] | null} old - the list of vnodes of the last `render()` call for
		 *                               this part of the tree
		 * @param {Vnode[] | null} vnodes - as above, but for the current `render()` call.
		 * @param {Function[]} hooks - an accumulator of post-render hooks (oncreate/onupdate)
		 * @param {Element | null} nextSibling - the next DOM node if we're dealing with a
		 *                                       fragment that is not the last item in its
		 *                                       parent
		 * @param {'svg' | 'math' | String | null} ns) - the current XML namespace, if any
		 * @returns void
		 */
		// This function diffs and patches lists of vnodes, both keyed and unkeyed.
		//
		// We will:
		//
		// 1. describe its general structure
		// 2. focus on the diff algorithm optimizations
		// 3. discuss DOM node operations.

		// ## Overview:
		//
		// The updateNodes() function:
		// - deals with trivial cases
		// - determines whether the lists are keyed or unkeyed based on the first non-null node
		//   of each list.
		// - diffs them and patches the DOM if needed (that's the brunt of the code)
		// - manages the leftovers: after diffing, are there:
		//   - old nodes left to remove?
		// 	 - new nodes to insert?
		// 	 deal with them!
		//
		// The lists are only iterated over once, with an exception for the nodes in `old` that
		// are visited in the fourth part of the diff and in the `removeNodes` loop.

		// ## Diffing
		//
		// Reading https://github.com/localvoid/ivi/blob/ddc09d06abaef45248e6133f7040d00d3c6be853/packages/ivi/src/vdom/implementation.ts#L617-L837
		// may be good for context on longest increasing subsequence-based logic for moving nodes.
		//
		// In order to diff keyed lists, one has to
		//
		// 1) match nodes in both lists, per key, and update them accordingly
		// 2) create the nodes present in the new list, but absent in the old one
		// 3) remove the nodes present in the old list, but absent in the new one
		// 4) figure out what nodes in 1) to move in order to minimize the DOM operations.
		//
		// To achieve 1) one can create a dictionary of keys => index (for the old list), then iterate
		// over the new list and for each new vnode, find the corresponding vnode in the old list using
		// the map.
		// 2) is achieved in the same step: if a new node has no corresponding entry in the map, it is new
		// and must be created.
		// For the removals, we actually remove the nodes that have been updated from the old list.
		// The nodes that remain in that list after 1) and 2) have been performed can be safely removed.
		// The fourth step is a bit more complex and relies on the longest increasing subsequence (LIS)
		// algorithm.
		//
		// the longest increasing subsequence is the list of nodes that can remain in place. Imagine going
		// from `1,2,3,4,5` to `4,5,1,2,3` where the numbers are not necessarily the keys, but the indices
		// corresponding to the keyed nodes in the old list (keyed nodes `e,d,c,b,a` => `b,a,e,d,c` would
		//  match the above lists, for example).
		//
		// In there are two increasing subsequences: `4,5` and `1,2,3`, the latter being the longest. We
		// can update those nodes without moving them, and only call `insertNode` on `4` and `5`.
		//
		// @localvoid adapted the algo to also support node deletions and insertions (the `lis` is actually
		// the longest increasing subsequence *of old nodes still present in the new list*).
		//
		// It is a general algorithm that is fireproof in all circumstances, but it requires the allocation
		// and the construction of a `key => oldIndex` map, and three arrays (one with `newIndex => oldIndex`,
		// the `LIS` and a temporary one to create the LIS).
		//
		// So we cheat where we can: if the tails of the lists are identical, they are guaranteed to be part of
		// the LIS and can be updated without moving them.
		//
		// If two nodes are swapped, they are guaranteed not to be part of the LIS, and must be moved (with
		// the exception of the last node if the list is fully reversed).
		//
		// ## Finding the next sibling.
		//
		// `updateNode()` and `createNode()` expect a nextSibling parameter to perform DOM operations.
		// When the list is being traversed top-down, at any index, the DOM nodes up to the previous
		// vnode reflect the content of the new list, whereas the rest of the DOM nodes reflect the old
		// list. The next sibling must be looked for in the old list using `getNextSibling(... oldStart + 1 ...)`.
		//
		// In the other scenarios (swaps, upwards traversal, map-based diff),
		// the new vnodes list is traversed upwards. The DOM nodes at the bottom of the list reflect the
		// bottom part of the new vnodes list, and we can use the `v.dom`  value of the previous node
		// as the next sibling (cached in the `nextSibling` variable).


		// ## DOM node moves
		//
		// In most scenarios `updateNode()` and `createNode()` perform the DOM operations. However,
		// this is not the case if the node moved (second and fourth part of the diff algo). We move
		// the old DOM nodes before updateNode runs because it enables us to use the cached `nextSibling`
		// variable rather than fetching it using `getNextSibling()`.
		//
		// The fourth part of the diff currently inserts nodes unconditionally, leading to issues
		// like #1791 and #1999. We need to be smarter about those situations where adjascent old
		// nodes remain together in the new list in a way that isn't covered by parts one and
		// three of the diff algo.

		function updateNodes(parent, old, vnodes, hooks, nextSibling, ns) {
			if (old === vnodes || old == null && vnodes == null) { return }
			else if (old == null || old.length === 0) { createNodes(parent, vnodes, 0, vnodes.length, hooks, nextSibling, ns); }
			else if (vnodes == null || vnodes.length === 0) { removeNodes(old, 0, old.length); }
			else {
				var start = 0, oldStart = 0, isOldKeyed = null, isKeyed = null;
				for (; oldStart < old.length; oldStart++) {
					if (old[oldStart] != null) {
						isOldKeyed = old[oldStart].key != null;
						break
					}
				}
				for (; start < vnodes.length; start++) {
					if (vnodes[start] != null) {
						isKeyed = vnodes[start].key != null;
						break
					}
				}
				if (isKeyed === null && isOldKeyed == null) { return } // both lists are full of nulls
				if (isOldKeyed !== isKeyed) {
					removeNodes(old, oldStart, old.length);
					createNodes(parent, vnodes, start, vnodes.length, hooks, nextSibling, ns);
				} else if (!isKeyed) {
					// Don't index past the end of either list (causes deopts).
					var commonLength = old.length < vnodes.length ? old.length : vnodes.length;
					// Rewind if necessary to the first non-null index on either side.
					// We could alternatively either explicitly create or remove nodes when `start !== oldStart`
					// but that would be optimizing for sparse lists which are more rare than dense ones.
					start = start < oldStart ? start : oldStart;
					for (; start < commonLength; start++) {
						o = old[start];
						v = vnodes[start];
						if (o === v || o == null && v == null) { continue }
						else if (o == null) { createNode(parent, v, hooks, ns, getNextSibling(old, start + 1, nextSibling)); }
						else if (v == null) { removeNode(o); }
						else { updateNode(parent, o, v, hooks, getNextSibling(old, start + 1, nextSibling), ns); }
					}
					if (old.length > commonLength) { removeNodes(old, start, old.length); }
					if (vnodes.length > commonLength) { createNodes(parent, vnodes, start, vnodes.length, hooks, nextSibling, ns); }
				} else {
					// keyed diff
					var oldEnd = old.length - 1, end = vnodes.length - 1, map, o, v, oe, ve, topSibling;

					// bottom-up
					while (oldEnd >= oldStart && end >= start) {
						oe = old[oldEnd];
						ve = vnodes[end];
						if (oe == null) { oldEnd--; }
						else if (ve == null) { end--; }
						else if (oe.key === ve.key) {
							if (oe !== ve) { updateNode(parent, oe, ve, hooks, nextSibling, ns); }
							if (ve.dom != null) { nextSibling = ve.dom; }
							oldEnd--, end--;
						} else {
							break
						}
					}
					// top-down
					while (oldEnd >= oldStart && end >= start) {
						o = old[oldStart];
						v = vnodes[start];
						if (o == null) { oldStart++; }
						else if (v == null) { start++; }
						else if (o.key === v.key) {
							oldStart++, start++;
							if (o !== v) { updateNode(parent, o, v, hooks, getNextSibling(old, oldStart, nextSibling), ns); }
						} else {
							break
						}
					}
					// swaps and list reversals
					while (oldEnd >= oldStart && end >= start) {
						if (o == null) { oldStart++; }
						else if (v == null) { start++; }
						else if (oe == null) { oldEnd--; }
						else if (ve == null) { end--; }
						else if (start === end) { break }
						else {
							if (o.key !== ve.key || oe.key !== v.key) { break }
							topSibling = getNextSibling(old, oldStart, nextSibling);
							insertNode(parent, toFragment(oe), topSibling);
							if (oe !== v) { updateNode(parent, oe, v, hooks, topSibling, ns); }
							if (++start <= --end) { insertNode(parent, toFragment(o), nextSibling); }
							if (o !== ve) { updateNode(parent, o, ve, hooks, nextSibling, ns); }
							if (ve.dom != null) { nextSibling = ve.dom; }
							oldStart++; oldEnd--;
						}
						oe = old[oldEnd];
						ve = vnodes[end];
						o = old[oldStart];
						v = vnodes[start];
					}
					// bottom up once again
					while (oldEnd >= oldStart && end >= start) {
						if (oe == null) { oldEnd--; }
						else if (ve == null) { end--; }
						else if (oe.key === ve.key) {
							if (oe !== ve) { updateNode(parent, oe, ve, hooks, nextSibling, ns); }
							if (ve.dom != null) { nextSibling = ve.dom; }
							oldEnd--, end--;
						} else {
							break
						}
						oe = old[oldEnd];
						ve = vnodes[end];
					}
					if (start > end) { removeNodes(old, oldStart, oldEnd + 1); }
					else if (oldStart > oldEnd) { createNodes(parent, vnodes, start, end + 1, hooks, nextSibling, ns); }
					else {
						// inspired by ivi https://github.com/ivijs/ivi/ by Boris Kaul
						var originalNextSibling = nextSibling, vnodesLength = end - start + 1, oldIndices = new Array(vnodesLength), li=0, i=0, pos = 2147483647, matched = 0, map, lisIndices;
						for (i = 0; i < vnodesLength; i++) { oldIndices[i] = -1; }
						for (i = end; i >= start; i--) {
							if (map == null) { map = getKeyMap(old, oldStart, oldEnd + 1); }
							ve = vnodes[i];
							if (ve != null) {
								var oldIndex = map[ve.key];
								if (oldIndex != null) {
									pos = (oldIndex < pos) ? oldIndex : -1; // becomes -1 if nodes were re-ordered
									oldIndices[i-start] = oldIndex;
									oe = old[oldIndex];
									old[oldIndex] = null;
									if (oe !== ve) { updateNode(parent, oe, ve, hooks, nextSibling, ns); }
									if (ve.dom != null) { nextSibling = ve.dom; }
									matched++;
								}
							}
						}
						nextSibling = originalNextSibling;
						if (matched !== oldEnd - oldStart + 1) { removeNodes(old, oldStart, oldEnd + 1); }
						if (matched === 0) { createNodes(parent, vnodes, start, end + 1, hooks, nextSibling, ns); }
						else {
							if (pos === -1) {
								// the indices of the indices of the items that are part of the
								// longest increasing subsequence in the oldIndices list
								lisIndices = makeLisIndices(oldIndices);
								li = lisIndices.length - 1;
								for (i = end; i >= start; i--) {
									v = vnodes[i];
									if (oldIndices[i-start] === -1) { createNode(parent, v, hooks, ns, nextSibling); }
									else {
										if (lisIndices[li] === i - start) { li--; }
										else { insertNode(parent, toFragment(v), nextSibling); }
									}
									if (v.dom != null) { nextSibling = vnodes[i].dom; }
								}
							} else {
								for (i = end; i >= start; i--) {
									v = vnodes[i];
									if (oldIndices[i-start] === -1) { createNode(parent, v, hooks, ns, nextSibling); }
									if (v.dom != null) { nextSibling = vnodes[i].dom; }
								}
							}
						}
					}
				}
			}
		}
		function updateNode(parent, old, vnode, hooks, nextSibling, ns) {
			var oldTag = old.tag, tag = vnode.tag;
			if (oldTag === tag) {
				vnode.state = old.state;
				vnode.events = old.events;
				if (shouldNotUpdate(vnode, old)) { return }
				if (typeof oldTag === "string") {
					if (vnode.attrs != null) {
						updateLifecycle(vnode.attrs, vnode, hooks);
					}
					switch (oldTag) {
						case "#": updateText(old, vnode); break
						case "<": updateHTML(parent, old, vnode, ns, nextSibling); break
						case "[": updateFragment(parent, old, vnode, hooks, nextSibling, ns); break
						default: updateElement(old, vnode, hooks, ns);
					}
				}
				else { updateComponent(parent, old, vnode, hooks, nextSibling, ns); }
			}
			else {
				removeNode(old);
				createNode(parent, vnode, hooks, ns, nextSibling);
			}
		}
		function updateText(old, vnode) {
			if (old.children.toString() !== vnode.children.toString()) {
				old.dom.nodeValue = vnode.children;
			}
			vnode.dom = old.dom;
		}
		function updateHTML(parent, old, vnode, ns, nextSibling) {
			if (old.children !== vnode.children) {
				toFragment(old);
				createHTML(parent, vnode, ns, nextSibling);
			}
			else { vnode.dom = old.dom, vnode.domSize = old.domSize; }
		}
		function updateFragment(parent, old, vnode, hooks, nextSibling, ns) {
			updateNodes(parent, old.children, vnode.children, hooks, nextSibling, ns);
			var domSize = 0, children = vnode.children;
			vnode.dom = null;
			if (children != null) {
				for (var i = 0; i < children.length; i++) {
					var child = children[i];
					if (child != null && child.dom != null) {
						if (vnode.dom == null) { vnode.dom = child.dom; }
						domSize += child.domSize || 1;
					}
				}
				if (domSize !== 1) { vnode.domSize = domSize; }
			}
		}
		function updateElement(old, vnode$1, hooks, ns) {
			var element = vnode$1.dom = old.dom;
			ns = getNameSpace(vnode$1) || ns;

			if (vnode$1.tag === "textarea") {
				if (vnode$1.attrs == null) { vnode$1.attrs = {}; }
				if (vnode$1.text != null) {
					vnode$1.attrs.value = vnode$1.text; //FIXME handle multiple children
					vnode$1.text = undefined;
				}
			}
			updateAttrs(vnode$1, old.attrs, vnode$1.attrs, ns);
			if (vnode$1.attrs != null && vnode$1.attrs.contenteditable != null) {
				setContentEditable(vnode$1);
			}
			else if (old.text != null && vnode$1.text != null && vnode$1.text !== "") {
				if (old.text.toString() !== vnode$1.text.toString()) { old.dom.firstChild.nodeValue = vnode$1.text; }
			}
			else {
				if (old.text != null) { old.children = [vnode("#", undefined, undefined, old.text, undefined, old.dom.firstChild)]; }
				if (vnode$1.text != null) { vnode$1.children = [vnode("#", undefined, undefined, vnode$1.text, undefined, undefined)]; }
				updateNodes(element, old.children, vnode$1.children, hooks, null, ns);
			}
		}
		function updateComponent(parent, old, vnode$1, hooks, nextSibling, ns) {
			vnode$1.instance = vnode.normalize(callHook.call(vnode$1.state.view, vnode$1));
			if (vnode$1.instance === vnode$1) { throw Error("A view cannot return the vnode it received as argument") }
			updateLifecycle(vnode$1.state, vnode$1, hooks);
			if (vnode$1.attrs != null) { updateLifecycle(vnode$1.attrs, vnode$1, hooks); }
			if (vnode$1.instance != null) {
				if (old.instance == null) { createNode(parent, vnode$1.instance, hooks, ns, nextSibling); }
				else { updateNode(parent, old.instance, vnode$1.instance, hooks, nextSibling, ns); }
				vnode$1.dom = vnode$1.instance.dom;
				vnode$1.domSize = vnode$1.instance.domSize;
			}
			else if (old.instance != null) {
				removeNode(old.instance);
				vnode$1.dom = undefined;
				vnode$1.domSize = 0;
			}
			else {
				vnode$1.dom = old.dom;
				vnode$1.domSize = old.domSize;
			}
		}
		function getKeyMap(vnodes, start, end) {
			var map = Object.create(null);
			for (; start < end; start++) {
				var vnode = vnodes[start];
				if (vnode != null) {
					var key = vnode.key;
					if (key != null) { map[key] = start; }
				}
			}
			return map
		}
		// Lifted from ivi https://github.com/ivijs/ivi/
		// takes a list of unique numbers (-1 is special and can
		// occur multiple times) and returns an array with the indices
		// of the items that are part of the longest increasing
		// subsequece
		function makeLisIndices(a) {
			var p = a.slice();
			var result = [];
			result.push(0);
			var u;
			var v;
			for (var i = 0, il = a.length; i < il; ++i) {
				if (a[i] === -1) {
					continue
				}
				var j = result[result.length - 1];
				if (a[j] < a[i]) {
					p[i] = j;
					result.push(i);
					continue
				}
				u = 0;
				v = result.length - 1;
				while (u < v) {
					var c = ((u + v) / 2) | 0; // eslint-disable-line no-bitwise
					if (a[result[c]] < a[i]) {
						u = c + 1;
					}
					else {
						v = c;
					}
				}
				if (a[i] < a[result[u]]) {
					if (u > 0) {
						p[i] = result[u - 1];
					}
					result[u] = i;
				}
			}
			u = result.length;
			v = result[u - 1];
			while (u-- > 0) {
				result[u] = v;
				v = p[v];
			}
			return result
		}

		function toFragment(vnode) {
			var count = vnode.domSize;
			if (count != null || vnode.dom == null) {
				var fragment = $doc.createDocumentFragment();
				if (count > 0) {
					var dom = vnode.dom;
					while (--count) { fragment.appendChild(dom.nextSibling); }
					fragment.insertBefore(dom, fragment.firstChild);
				}
				return fragment
			}
			else { return vnode.dom }
		}
		function getNextSibling(vnodes, i, nextSibling) {
			for (; i < vnodes.length; i++) {
				if (vnodes[i] != null && vnodes[i].dom != null) { return vnodes[i].dom }
			}
			return nextSibling
		}

		function insertNode(parent, dom, nextSibling) {
			if (nextSibling != null) { parent.insertBefore(dom, nextSibling); }
			else { parent.appendChild(dom); }
		}

		function setContentEditable(vnode) {
			var children = vnode.children;
			if (children != null && children.length === 1 && children[0].tag === "<") {
				var content = children[0].children;
				if (vnode.dom.innerHTML !== content) { vnode.dom.innerHTML = content; }
			}
			else if (vnode.text != null || children != null && children.length !== 0) { throw new Error("Child node of a contenteditable must be trusted") }
		}

		//remove
		function removeNodes(vnodes, start, end) {
			for (var i = start; i < end; i++) {
				var vnode = vnodes[i];
				if (vnode != null) { removeNode(vnode); }
			}
		}
		function removeNode(vnode) {
			var expected = 1, called = 0;
			var original = vnode.state;
			if (typeof vnode.tag !== "string" && typeof vnode.state.onbeforeremove === "function") {
				var result = callHook.call(vnode.state.onbeforeremove, vnode);
				if (result != null && typeof result.then === "function") {
					expected++;
					result.then(continuation, continuation);
				}
			}
			if (vnode.attrs && typeof vnode.attrs.onbeforeremove === "function") {
				var result = callHook.call(vnode.attrs.onbeforeremove, vnode);
				if (result != null && typeof result.then === "function") {
					expected++;
					result.then(continuation, continuation);
				}
			}
			continuation();
			function continuation() {
				if (++called === expected) {
					checkState(vnode, original);
					onremove(vnode);
					if (vnode.dom) {
						var parent = vnode.dom.parentNode;
						var count = vnode.domSize || 1;
						while (--count) { parent.removeChild(vnode.dom.nextSibling); }
						parent.removeChild(vnode.dom);
					}
				}
			}
		}
		function onremove(vnode) {
			if (typeof vnode.tag !== "string" && typeof vnode.state.onremove === "function") { callHook.call(vnode.state.onremove, vnode); }
			if (vnode.attrs && typeof vnode.attrs.onremove === "function") { callHook.call(vnode.attrs.onremove, vnode); }
			if (typeof vnode.tag !== "string") {
				if (vnode.instance != null) { onremove(vnode.instance); }
			} else {
				var children = vnode.children;
				if (Array.isArray(children)) {
					for (var i = 0; i < children.length; i++) {
						var child = children[i];
						if (child != null) { onremove(child); }
					}
				}
			}
		}

		//attrs
		function setAttrs(vnode, attrs, ns) {
			for (var key in attrs) {
				setAttr(vnode, key, null, attrs[key], ns);
			}
		}
		function setAttr(vnode, key, old, value, ns) {
			if (key === "key" || key === "is" || value == null || isLifecycleMethod(key) || (old === value && !isFormAttribute(vnode, key)) && typeof value !== "object") { return }
			if (key[0] === "o" && key[1] === "n") { return updateEvent(vnode, key, value) }
			if (key.slice(0, 6) === "xlink:") { vnode.dom.setAttributeNS("http://www.w3.org/1999/xlink", key.slice(6), value); }
			else if (key === "style") { updateStyle(vnode.dom, old, value); }
			else if (hasPropertyKey(vnode, key, ns)) {
				if (key === "value") {
					// Only do the coercion if we're actually going to check the value.
					/* eslint-disable no-implicit-coercion */
					//setting input[value] to same value by typing on focused element moves cursor to end in Chrome
					if ((vnode.tag === "input" || vnode.tag === "textarea") && vnode.dom.value === "" + value && vnode.dom === activeElement()) { return }
					//setting select[value] to same value while having select open blinks select dropdown in Chrome
					if (vnode.tag === "select" && old !== null && vnode.dom.value === "" + value) { return }
					//setting option[value] to same value while having select open blinks select dropdown in Chrome
					if (vnode.tag === "option" && old !== null && vnode.dom.value === "" + value) { return }
					/* eslint-enable no-implicit-coercion */
				}
				// If you assign an input type that is not supported by IE 11 with an assignment expression, an error will occur.
				if (vnode.tag === "input" && key === "type") { vnode.dom.setAttribute(key, value); }
				else { vnode.dom[key] = value; }
			} else {
				if (typeof value === "boolean") {
					if (value) { vnode.dom.setAttribute(key, ""); }
					else { vnode.dom.removeAttribute(key); }
				}
				else { vnode.dom.setAttribute(key === "className" ? "class" : key, value); }
			}
		}
		function removeAttr(vnode, key, old, ns) {
			if (key === "key" || key === "is" || old == null || isLifecycleMethod(key)) { return }
			if (key[0] === "o" && key[1] === "n" && !isLifecycleMethod(key)) { updateEvent(vnode, key, undefined); }
			else if (key === "style") { updateStyle(vnode.dom, old, null); }
			else if (
				hasPropertyKey(vnode, key, ns)
				&& key !== "className"
				&& !(key === "value" && (
					vnode.tag === "option"
					|| vnode.tag === "select" && vnode.dom.selectedIndex === -1 && vnode.dom === activeElement()
				))
				&& !(vnode.tag === "input" && key === "type")
			) {
				vnode.dom[key] = null;
			} else {
				var nsLastIndex = key.indexOf(":");
				if (nsLastIndex !== -1) { key = key.slice(nsLastIndex + 1); }
				if (old !== false) { vnode.dom.removeAttribute(key === "className" ? "class" : key); }
			}
		}
		function setLateSelectAttrs(vnode, attrs) {
			if ("value" in attrs) {
				if(attrs.value === null) {
					if (vnode.dom.selectedIndex !== -1) { vnode.dom.value = null; }
				} else {
					var normalized = "" + attrs.value; // eslint-disable-line no-implicit-coercion
					if (vnode.dom.value !== normalized || vnode.dom.selectedIndex === -1) {
						vnode.dom.value = normalized;
					}
				}
			}
			if ("selectedIndex" in attrs) { setAttr(vnode, "selectedIndex", null, attrs.selectedIndex, undefined); }
		}
		function updateAttrs(vnode, old, attrs, ns) {
			if (attrs != null) {
				for (var key in attrs) {
					setAttr(vnode, key, old && old[key], attrs[key], ns);
				}
			}
			var val;
			if (old != null) {
				for (var key in old) {
					if (((val = old[key]) != null) && (attrs == null || attrs[key] == null)) {
						removeAttr(vnode, key, val, ns);
					}
				}
			}
		}
		function isFormAttribute(vnode, attr) {
			return attr === "value" || attr === "checked" || attr === "selectedIndex" || attr === "selected" && vnode.dom === activeElement() || vnode.tag === "option" && vnode.dom.parentNode === $doc.activeElement
		}
		function isLifecycleMethod(attr) {
			return attr === "oninit" || attr === "oncreate" || attr === "onupdate" || attr === "onremove" || attr === "onbeforeremove" || attr === "onbeforeupdate"
		}
		function hasPropertyKey(vnode, key, ns) {
			// Filter out namespaced keys
			return ns === undefined && (
				// If it's a custom element, just keep it.
				vnode.tag.indexOf("-") > -1 || vnode.attrs != null && vnode.attrs.is ||
				// If it's a normal element, let's try to avoid a few browser bugs.
				key !== "href" && key !== "list" && key !== "form" && key !== "width" && key !== "height"// && key !== "type"
				// Defer the property check until *after* we check everything.
			) && key in vnode.dom
		}

		//style
		var uppercaseRegex = /[A-Z]/g;
		function toLowerCase(capital) { return "-" + capital.toLowerCase() }
		function normalizeKey(key) {
			return key[0] === "-" && key[1] === "-" ? key :
				key === "cssFloat" ? "float" :
					key.replace(uppercaseRegex, toLowerCase)
		}
		function updateStyle(element, old, style) {
			if (old === style) ; else if (style == null) {
				// New style is missing, just clear it.
				element.style.cssText = "";
			} else if (typeof style !== "object") {
				// New style is a string, let engine deal with patching.
				element.style.cssText = style;
			} else if (old == null || typeof old !== "object") {
				// `old` is missing or a string, `style` is an object.
				element.style.cssText = "";
				// Add new style properties
				for (var key in style) {
					var value = style[key];
					if (value != null) { element.style.setProperty(normalizeKey(key), String(value)); }
				}
			} else {
				// Both old & new are (different) objects.
				// Update style properties that have changed
				for (var key in style) {
					var value = style[key];
					if (value != null && (value = String(value)) !== String(old[key])) {
						element.style.setProperty(normalizeKey(key), value);
					}
				}
				// Remove style properties that no longer exist
				for (var key in old) {
					if (old[key] != null && style[key] == null) {
						element.style.removeProperty(normalizeKey(key));
					}
				}
			}
		}

		// Here's an explanation of how this works:
		// 1. The event names are always (by design) prefixed by `on`.
		// 2. The EventListener interface accepts either a function or an object
		//    with a `handleEvent` method.
		// 3. The object does not inherit from `Object.prototype`, to avoid
		//    any potential interference with that (e.g. setters).
		// 4. The event name is remapped to the handler before calling it.
		// 5. In function-based event handlers, `ev.target === this`. We replicate
		//    that below.
		// 6. In function-based event handlers, `return false` prevents the default
		//    action and stops event propagation. We replicate that below.
		function EventDict() {}
		EventDict.prototype = Object.create(null);
		EventDict.prototype.handleEvent = function (ev) {
			var handler = this["on" + ev.type];
			var result;
			if (typeof handler === "function") { result = handler.call(ev.currentTarget, ev); }
			else if (typeof handler.handleEvent === "function") { handler.handleEvent(ev); }
			if (ev.redraw === false) { ev.redraw = undefined; }
			else if (typeof redraw === "function") { redraw(); }
			if (result === false) {
				ev.preventDefault();
				ev.stopPropagation();
			}
		};

		//event
		function updateEvent(vnode, key, value) {
			if (vnode.events != null) {
				if (vnode.events[key] === value) { return }
				if (value != null && (typeof value === "function" || typeof value === "object")) {
					if (vnode.events[key] == null) { vnode.dom.addEventListener(key.slice(2), vnode.events, false); }
					vnode.events[key] = value;
				} else {
					if (vnode.events[key] != null) { vnode.dom.removeEventListener(key.slice(2), vnode.events, false); }
					vnode.events[key] = undefined;
				}
			} else if (value != null && (typeof value === "function" || typeof value === "object")) {
				vnode.events = new EventDict();
				vnode.dom.addEventListener(key.slice(2), vnode.events, false);
				vnode.events[key] = value;
			}
		}

		//lifecycle
		function initLifecycle(source, vnode, hooks) {
			if (typeof source.oninit === "function") { callHook.call(source.oninit, vnode); }
			if (typeof source.oncreate === "function") { hooks.push(callHook.bind(source.oncreate, vnode)); }
		}
		function updateLifecycle(source, vnode, hooks) {
			if (typeof source.onupdate === "function") { hooks.push(callHook.bind(source.onupdate, vnode)); }
		}
		function shouldNotUpdate(vnode, old) {
			do {
				if (vnode.attrs != null && typeof vnode.attrs.onbeforeupdate === "function") {
					var force = callHook.call(vnode.attrs.onbeforeupdate, vnode, old);
					if (force !== undefined && !force) { break }
				}
				if (typeof vnode.tag !== "string" && typeof vnode.state.onbeforeupdate === "function") {
					var force = callHook.call(vnode.state.onbeforeupdate, vnode, old);
					if (force !== undefined && !force) { break }
				}
				return false
			} while (false); // eslint-disable-line no-constant-condition
			vnode.dom = old.dom;
			vnode.domSize = old.domSize;
			vnode.instance = old.instance;
			return true
		}

		function render(dom, vnodes) {
			if (!dom) { throw new Error("Ensure the DOM element being passed to m.route/m.mount/m.render is not undefined.") }
			var hooks = [];
			var active = activeElement();
			var namespace = dom.namespaceURI;

			// First time rendering into a node clears it out
			if (dom.vnodes == null) { dom.textContent = ""; }

			vnodes = vnode.normalizeChildren(Array.isArray(vnodes) ? vnodes : [vnodes]);
			updateNodes(dom, dom.vnodes, vnodes, hooks, null, namespace === "http://www.w3.org/1999/xhtml" ? undefined : namespace);
			dom.vnodes = vnodes;
			// `document.activeElement` can return null: https://html.spec.whatwg.org/multipage/interaction.html#dom-document-activeelement
			if (active != null && activeElement() !== active && typeof active.focus === "function") { active.focus(); }
			for (var i = 0; i < hooks.length; i++) { hooks[i](); }
		}

		return {render: render, setRedraw: setRedraw}
	};

	function throttle(callback) {
		var pending = null;
		return function() {
			if (pending === null) {
				pending = requestAnimationFrame(function() {
					pending = null;
					callback();
				});
			}
		}
	}


	var redraw = function($window, throttleMock) {
		var renderService = render($window);
		var callbacks = [];
		var rendering = false;

		function subscribe(key, callback) {
			unsubscribe(key);
			callbacks.push(key, callback);
		}
		function unsubscribe(key) {
			var index = callbacks.indexOf(key);
			if (index > -1) { callbacks.splice(index, 2); }
		}
		function sync() {
			if (rendering) { throw new Error("Nested m.redraw.sync() call") }
			rendering = true;
			for (var i = 1; i < callbacks.length; i+=2) { try {callbacks[i]();} catch (e) {if (typeof console !== "undefined") { console.error(e); }} }
			rendering = false;
		}

		var redraw = (throttleMock || throttle)(sync);
		redraw.sync = sync;
		renderService.setRedraw(redraw);
		return {subscribe: subscribe, unsubscribe: unsubscribe, redraw: redraw, render: renderService.render}
	};

	var redraw$1 = redraw(window);

	var mount = function(redrawService) {
		return function(root, component) {
			if (component === null) {
				redrawService.render(root, []);
				redrawService.unsubscribe(root);
				return
			}
			
			if (component.view == null && typeof component !== "function") { throw new Error("m.mount(element, component) expects a component, not a vnode") }
			
			var run = function() {
				redrawService.render(root, vnode(component));
			};
			redrawService.subscribe(root, run);
			run();
		}
	};

	var mount$1 = mount(redraw$1);

	// The extra `data` parameter is for if you want to append to an existing
	// parameters object.
	var parse = function(string, data) {
		if (data == null) { data = {}; }
		if (string === "" || string == null) { return {} }
		if (string.charAt(0) === "?") { string = string.slice(1); }

		var entries = string.split("&"), counters = {};
		for (var i = 0; i < entries.length; i++) {
			var entry = entries[i].split("=");
			var key = decodeURIComponent(entry[0]);
			var value = entry.length === 2 ? decodeURIComponent(entry[1]) : "";

			if (value === "true") { value = true; }
			else if (value === "false") { value = false; }

			var levels = key.split(/\]\[?|\[/);
			var cursor = data;
			if (key.indexOf("[") > -1) { levels.pop(); }
			for (var j = 0; j < levels.length; j++) {
				var level = levels[j], nextLevel = levels[j + 1];
				var isNumber = nextLevel == "" || !isNaN(parseInt(nextLevel, 10));
				var isValue = j === levels.length - 1;
				if (level === "") {
					var key = levels.slice(0, j).join();
					if (counters[key] == null) {
						counters[key] = Array.isArray(cursor) ? cursor.length : 0;
					}
					level = counters[key]++;
				}
				if (isValue) { cursor[level] = value; }
				else if (cursor[level] == null) { cursor[level] = isNumber ? [] : {}; }
				cursor = cursor[level];
			}
		}
		return data
	};

	// Returns `{path, params}` from `url`
	var parse$1 = function(url) {
		var queryIndex = url.indexOf("?");
		var hashIndex = url.indexOf("#");
		var queryEnd = hashIndex < 0 ? url.length : hashIndex;
		var pathEnd = queryIndex < 0 ? queryEnd : queryIndex;
		var path = url.slice(0, pathEnd).replace(/\/{2,}/g, "/");
		var params = {};

		if (!path) { path = "/"; }
		else {
			if (path[0] !== "/") { path = "/" + path; }
			if (path.length > 1 && path[path.length - 1] === "/") { path = path.slice(0, -1); }
		}
		// Note: these are reversed because `parseQueryString` appends parameters
		// only if they don't exist. Please don't flip them.
		if (queryIndex >= 0) { parse(url.slice(queryIndex + 1, queryEnd), params); }
		if (hashIndex >= 0) { parse(url.slice(hashIndex + 1), params); }
		return {path: path, params: params}
	};

	// Compiles a template into a function that takes a resolved path (without query
	// strings) and returns an object containing the template parameters with their
	// parsed values. This expects the input of the compiled template to be the
	// output of `parsePathname`. Note that it does *not* remove query parameters
	// specified in the template.
	var compileTemplate = function(template) {
		var templateData = parse$1(template);
		var templateKeys = Object.keys(templateData.params);
		var keys = [];
		var regexp = new RegExp("^" + templateData.path.replace(
			// I escape literal text so people can use things like `:file.:ext` or
			// `:lang-:locale` in routes. This is all merged into one pass so I
			// don't also accidentally escape `-` and make it harder to detect it to
			// ban it from template parameters.
			/:([^\/.-]+)(\.{3}|\.(?!\.)|-)?|[\\^$*+.()|\[\]{}]/g,
			function(m, key, extra) {
				if (key == null) { return "\\" + m }
				keys.push({k: key, r: extra === "..."});
				if (extra === "...") { return "(.*)" }
				if (extra === ".") { return "([^/]+)\\." }
				return "([^/]+)" + (extra || "")
			}
		) + "$");
		return function(data) {
			// First, check the params. Usually, there isn't any, and it's just
			// checking a static set.
			for (var i = 0; i < templateKeys.length; i++) {
				if (templateData.params[templateKeys[i]] !== data.params[templateKeys[i]]) { return false }
			}
			// If no interpolations exist, let's skip all the ceremony
			if (!keys.length) { return regexp.test(data.path) }
			var values = regexp.exec(data.path);
			if (values == null) { return false }
			for (var i = 0; i < keys.length; i++) {
				data.params[keys[i].k] = keys[i].r ? values[i + 1] : decodeURIComponent(values[i + 1]);
			}
			return true
		}
	};

	var router = function($window) {
		var supportsPushState = typeof $window.history.pushState === "function";
		var callAsync = typeof setImmediate === "function" ? setImmediate : setTimeout;

		function normalize(fragment) {
			var data = $window.location[fragment].replace(/(?:%[a-f89][a-f0-9])+/gim, decodeURIComponent);
			if (fragment === "pathname" && data[0] !== "/") { data = "/" + data; }
			return data
		}

		var asyncId;
		var router = {prefix: "#!"};
		router.getPath = function() {
			if (router.prefix.charAt(0) === "#") { return normalize("hash").slice(router.prefix.length) }
			if (router.prefix.charAt(0) === "?") { return normalize("search").slice(router.prefix.length) + normalize("hash") }
			return normalize("pathname").slice(router.prefix.length) + normalize("search") + normalize("hash")
		};

		router.setPath = function(path, data, options) {
			path = build$1(path, data);
			if (supportsPushState) {
				var state = options ? options.state : null;
				var title = options ? options.title : null;
				$window.onpopstate();
				if (options && options.replace) { $window.history.replaceState(state, title, router.prefix + path); }
				else { $window.history.pushState(state, title, router.prefix + path); }
			}
			else { $window.location.href = router.prefix + path; }
		};

		router.defineRoutes = function(routes, resolve, reject, defaultRoute) {
			var compiled = Object.keys(routes).map(function(route) {
				if (route.charAt(0) !== "/") { throw new SyntaxError("Routes must start with a `/`") }
				if ((/:([^\/\.-]+)(\.{3})?:/).test(route)) {
					throw new SyntaxError("Route parameter names must be separated with either `/`, `.`, or `-`")
				}
				return {
					route: route,
					component: routes[route],
					check: compileTemplate(route),
				}
			});

			if (defaultRoute != null) {
				var defaultData = parse$1(defaultRoute);

				if (!compiled.some(function (i) { return i.check(defaultData) })) {
					throw new ReferenceError("Default route doesn't match any known routes")
				}
			}

			function resolveRoute() {
				var path = router.getPath();
				var data = parse$1(path);

				assign(data.params, $window.history.state);

				for (var i = 0; i < compiled.length; i++) {
					if (compiled[i].check(data)) {
						resolve(compiled[i].component, data.params, path, compiled[i].route);
						return
					}
				}

				reject(path, data.params);
			}

			if (supportsPushState) {
				$window.onpopstate = function() {
					if (asyncId) { return }
					asyncId = callAsync(function() {
						asyncId = null;
						resolveRoute();
					});
				};
			}
			else if (router.prefix.charAt(0) === "#") { $window.onhashchange = resolveRoute; }
			resolveRoute();
		};

		return router
	};

	var router$1 = function($window, redrawService) {
		var routeService = router($window);

		var identity = function(v) {return v};
		var render, component, attrs, currentPath, lastUpdate;
		var route = function(root, defaultRoute, routes) {
			if (root == null) { throw new Error("Ensure the DOM element that was passed to `m.route` is not undefined") }
			function run() {
				if (render != null) { redrawService.render(root, render(vnode(component, attrs.key, attrs))); }
			}
			var redraw = function() {
				run();
				redraw = redrawService.redraw;
			};
			redrawService.subscribe(root, run);
			var bail = function(path) {
				if (path !== defaultRoute) { routeService.setPath(defaultRoute, null, {replace: true}); }
				else { throw new Error("Could not resolve default route " + defaultRoute) }
			};
			routeService.defineRoutes(routes, function(payload, params, path, route) {
				var update = lastUpdate = function(routeResolver, comp) {
					if (update !== lastUpdate) { return }
					component = comp != null && (typeof comp.view === "function" || typeof comp === "function")? comp : "div";
					attrs = params, currentPath = path, lastUpdate = null;
					render = (routeResolver.render || identity).bind(routeResolver);
					redraw();
				};
				if (payload.view || typeof payload === "function") { update({}, payload); }
				else {
					if (payload.onmatch) {
						promise.resolve(payload.onmatch(params, path, route)).then(function(resolved) {
							update(payload, resolved);
						}, function () { bail(path); });
					}
					else { update(payload, "div"); }
				}
			}, bail, defaultRoute);
		};
		route.set = function(path, data, options) {
			if (lastUpdate != null) {
				options = options || {};
				options.replace = true;
			}
			lastUpdate = null;
			routeService.setPath(path, data, options);
		};
		route.get = function() {return currentPath};
		route.prefix = function(prefix) {routeService.prefix = prefix;};
		var link = function(options, vnode) {
			vnode.dom.setAttribute("href", routeService.prefix + vnode.attrs.href);
			vnode.dom.onclick = function(e) {
				if (e.ctrlKey || e.metaKey || e.shiftKey || e.which === 2) { return }
				e.preventDefault();
				e.redraw = false;
				var href = this.getAttribute("href");
				if (href.indexOf(routeService.prefix) === 0) { href = href.slice(routeService.prefix.length); }
				route.set(href, undefined, options);
			};
		};
		route.link = function(args) {
			if (args.tag == null) { return link.bind(link, args) }
			return link({}, args)
		};
		route.param = function(key) {
			if(typeof attrs !== "undefined" && typeof key !== "undefined") { return attrs[key] }
			return attrs
		};

		return route
	};

	var route = router$1(window, redraw$1);

	var render$1 = render(window);

	var m = function m() { return hyperscript_1$1.apply(this, arguments) };
	m.m = hyperscript_1$1;
	m.trust = hyperscript_1$1.trust;
	m.fragment = hyperscript_1$1.fragment;




	request$1.setCompletionCallback(redraw$1.redraw);

	m.mount = mount$1;
	m.route = route;
	m.render = render$1.render;
	m.redraw = redraw$1.redraw;
	m.request = request$1.request;
	m.jsonp = request$1.jsonp;
	m.parseQueryString = parse;
	m.buildQueryString = build;
	m.parsePathname = parse$1;
	m.buildPathname = build$1;
	m.version = "bleeding-edge";
	m.vnode = vnode;
	m.PromisePolyfill = polyfill;

	var mithril = m;

	var stream = createCommonjsModule(function (module) {
	(function() {
	/* eslint-enable */
	Stream.SKIP = {};
	Stream.lift = lift;
	Stream.scan = scan;
	Stream.merge = merge;
	Stream.combine = combine;
	Stream.scanMerge = scanMerge;
	Stream["fantasy-land/of"] = Stream;

	var warnedHalt = false;
	Object.defineProperty(Stream, "HALT", {
		get: function() {
			warnedHalt || console.log("HALT is deprecated and has been renamed to SKIP");
			warnedHalt = true;
			return Stream.SKIP
		}
	});

	function Stream(value) {
		var dependentStreams = [];
		var dependentFns = [];

		function stream(v) {
			if (arguments.length && v !== Stream.SKIP) {
				value = v;
				if (open(stream)) {
					stream.changing();
					stream.state = "active";
					dependentStreams.forEach(function(s, i) { s(dependentFns[i](value)); });
				}
			}

			return value
		}

		stream.constructor = Stream;
		stream.state = arguments.length && value !== Stream.SKIP ? "active" : "pending";
		stream.parents = [];

		stream.changing = function() {
			open(stream) && (stream.state = "changing");
			dependentStreams.forEach(function(s) {
				s.changing();
			});
		};

		stream.map = function(fn, ignoreInitial) {
			var target = stream.state === "active" && ignoreInitial !== Stream.SKIP
				? Stream(fn(value))
				: Stream();
			target.parents.push(stream);

			dependentStreams.push(target);
			dependentFns.push(fn);
			return target
		};

		var end;
		function createEnd() {
			end = Stream();
			end.map(function(value) {
				if (value === true) {
					stream.parents.forEach(function (p) {p.unregisterChild(stream);});
					stream.state = "ended";
					stream.parents.length = dependentStreams.length = dependentFns.length = 0;
				}
				return value
			});
			return end
		}

		stream.toJSON = function() { return value != null && typeof value.toJSON === "function" ? value.toJSON() : value };

		stream["fantasy-land/map"] = stream.map;
		stream["fantasy-land/ap"] = function(x) { return combine(function(s1, s2) { return s1()(s2()) }, [x, stream]) };

		stream.unregisterChild = function(child) {
			var childIndex = dependentStreams.indexOf(child);
			if (childIndex !== -1) {
				dependentStreams.splice(childIndex, 1);
				dependentFns.splice(childIndex, 1);
			}
		};

		Object.defineProperty(stream, "end", {
			get: function() { return end || createEnd() }
		});

		return stream
	}

	function combine(fn, streams) {
		var ready = streams.every(function(s) {
			if (s.constructor !== Stream)
				{ throw new Error("Ensure that each item passed to stream.combine/stream.merge/lift is a stream") }
			return s.state === "active"
		});
		var stream = ready
			? Stream(fn.apply(null, streams.concat([streams])))
			: Stream();

		var changed = [];

		var mappers = streams.map(function(s) {
			return s.map(function(value) {
				changed.push(s);
				if (ready || streams.every(function(s) { return s.state !== "pending" })) {
					ready = true;
					stream(fn.apply(null, streams.concat([changed])));
					changed = [];
				}
				return value
			}, Stream.SKIP)
		});

		var endStream = stream.end.map(function(value) {
			if (value === true) {
				mappers.forEach(function(mapper) { mapper.end(true); });
				endStream.end(true);
			}
			return undefined
		});

		return stream
	}

	function merge(streams) {
		return combine(function() { return streams.map(function(s) { return s() }) }, streams)
	}

	function scan(fn, acc, origin) {
		var stream = origin.map(function(v) {
			var next = fn(acc, v);
			if (next !== Stream.SKIP) { acc = next; }
			return next
		});
		stream(acc);
		return stream
	}

	function scanMerge(tuples, seed) {
		var streams = tuples.map(function(tuple) { return tuple[0] });

		var stream = combine(function() {
			var changed = arguments[arguments.length - 1];
			streams.forEach(function(stream, i) {
				if (changed.indexOf(stream) > -1)
					{ seed = tuples[i][1](seed, stream()); }
			});

			return seed
		}, streams);

		stream(seed);

		return stream
	}

	function lift() {
		var fn = arguments[0];
		var streams = Array.prototype.slice.call(arguments, 1);
		return merge(streams).map(function(streams) {
			return fn.apply(undefined, streams)
		})
	}

	function open(s) {
		return s.state === "pending" || s.state === "active" || s.state === "changing"
	}

	{ module["exports"] = Stream; }

	}());
	});

	var stream$1 = stream;

	var actions = function (update) { return ({
	    incrementNum: function () { return update(function (state) {
	        state.num += 1;
	        return state;
	    }); },

	    decrementNum: function () { return update(function (state) {
	        state.num -= 1;
	        return state;
	    }); }
	}); };

	var asyncActions = function (actions, redraw) { return ({
	    delayedIncrement: function () {
	        setTimeout(function () {
	            actions.incrementNum();
	            redraw();
	        }, 1000);
	    }
	}); };

	var initialState = {
	    num: 0
	};

	var update = stream$1();
	var state  = stream$1.scan(function (x, f) { return f(x); }, initialState, update);

	var actions$1      = actions(update);
	var asyncActions$1 = asyncActions(actions$1, mithril.redraw);
	var allActions   = Object.assign({}, actions$1, asyncActions$1);

	var pseudos = [
	  ':active',
	  ':any',
	  ':checked',
	  ':default',
	  ':disabled',
	  ':empty',
	  ':enabled',
	  ':first',
	  ':first-child',
	  ':first-of-type',
	  ':fullscreen',
	  ':focus',
	  ':hover',
	  ':indeterminate',
	  ':in-range',
	  ':invalid',
	  ':last-child',
	  ':last-of-type',
	  ':left',
	  ':link',
	  ':only-child',
	  ':only-of-type',
	  ':optional',
	  ':out-of-range',
	  ':read-only',
	  ':read-write',
	  ':required',
	  ':right',
	  ':root',
	  ':scope',
	  ':target',
	  ':valid',
	  ':visited',

	  // With value
	  ':dir',
	  ':lang',
	  ':not',
	  ':nth-child',
	  ':nth-last-child',
	  ':nth-last-of-type',
	  ':nth-of-type',

	  // Elements
	  '::after',
	  '::before',
	  '::first-letter',
	  '::first-line',
	  '::selection',
	  '::backdrop',
	  '::placeholder',
	  '::marker',
	  '::spelling-error',
	  '::grammar-error'
	];

	var popular = {
	  ai : 'alignItems',
	  b  : 'bottom',
	  bc : 'backgroundColor',
	  br : 'borderRadius',
	  bs : 'boxShadow',
	  bi : 'backgroundImage',
	  c  : 'color',
	  d  : 'display',
	  f  : 'float',
	  fd : 'flexDirection',
	  ff : 'fontFamily',
	  fs : 'fontSize',
	  h  : 'height',
	  jc : 'justifyContent',
	  l  : 'left',
	  lh : 'lineHeight',
	  ls : 'letterSpacing',
	  m  : 'margin',
	  mb : 'marginBottom',
	  ml : 'marginLeft',
	  mr : 'marginRight',
	  mt : 'marginTop',
	  o  : 'opacity',
	  p  : 'padding',
	  pb : 'paddingBottom',
	  pl : 'paddingLeft',
	  pr : 'paddingRight',
	  pt : 'paddingTop',
	  r  : 'right',
	  t  : 'top',
	  ta : 'textAlign',
	  td : 'textDecoration',
	  tt : 'textTransform',
	  w  : 'width'
	};

	var cssProperties = ['float'].concat(Object.keys(
	  typeof document === 'undefined'
	    ? {}
	    : findWidth(document.documentElement.style)
	).filter(function (p) { return p.indexOf('-') === -1 && p !== 'length'; }));

	function findWidth(obj) {
	  return obj
	    ? obj.hasOwnProperty('width')
	      ? obj
	      : findWidth(Object.getPrototypeOf(obj))
	    : {}
	}

	var isProp = /^-?-?[a-z][a-z-_0-9]*$/i;

	var memoize = function (fn, cache) {
	  if ( cache === void 0 ) { cache = {}; }

	  return function (item) { return item in cache
	    ? cache[item]
	    : cache[item] = fn(item); };
	};

	function add(style, prop, values) {
	  if (prop in style) // Recursively increase specificity
	    { add(style, '!' + prop, values); }
	  else
	    { style[prop] = formatValues(prop, values); }
	}

	var vendorMap = Object.create(null, {});
	var vendorValuePrefix = Object.create(null, {});

	var vendorRegex = /^(o|O|ms|MS|Ms|moz|Moz|webkit|Webkit|WebKit)([A-Z])/;

	var appendPx = memoize(function (prop) {
	  var el = document.createElement('div');

	  try {
	    el.style[prop] = '1px';
	    el.style.setProperty(prop, '1px');
	    return el.style[prop].slice(-3) === '1px' ? 'px' : ''
	  } catch (err) {
	    return ''
	  }
	}, {
	  flex: '',
	  boxShadow: 'px',
	  border: 'px',
	  borderTop: 'px',
	  borderRight: 'px',
	  borderBottom: 'px',
	  borderLeft: 'px'
	});

	function lowercaseFirst(string) {
	  return string.charAt(0).toLowerCase() + string.slice(1)
	}

	function assign$1(obj, obj2) {
	  for (var key in obj2) {
	    if (obj2.hasOwnProperty(key)) {
	      obj[key] = typeof obj2[key] === 'string'
	        ? obj2[key]
	        : assign$1(obj[key] || {}, obj2[key]);
	    }
	  }
	  return obj
	}

	function hyphenToCamelCase(hyphen) {
	  return hyphen.slice(hyphen.charAt(0) === '-' ? 1 : 0).replace(/-([a-z])/g, function(match) {
	    return match[1].toUpperCase()
	  })
	}

	function camelCaseToHyphen(camelCase) {
	  return camelCase.replace(/(\B[A-Z])/g, '-$1').toLowerCase()
	}

	function initials(camelCase) {
	  return camelCase.charAt(0) + (camelCase.match(/([A-Z])/g) || []).join('').toLowerCase()
	}

	function objectToRules(style, selector, suffix, single) {
	  if ( suffix === void 0 ) { suffix = ''; }

	  var base = {};
	  var extra = suffix.indexOf('&') > -1 && suffix.indexOf(',') === -1 ? '' : '&';
	  var rules = [];

	  Object.keys(style).forEach(function (prop) {
	    if (prop.charAt(0) === '@')
	      { rules.push(prop + '{' + objectToRules(style[prop], selector, suffix, single).join('') + '}'); }
	    else if (typeof style[prop] === 'object')
	      { rules = rules.concat(objectToRules(style[prop], selector, suffix + prop, single)); }
	    else
	      { base[prop] = style[prop]; }
	  });

	  if (Object.keys(base).length) {
	    rules.unshift(
	      ((single || (suffix.charAt(0) === ' ') ? '' : '&') + extra + suffix).replace(/&/g, selector).trim() +
	      '{' + stylesToCss(base) + '}'
	    );
	  }

	  return rules
	}

	var selectorSplit = /,(?=(?:(?:[^"]*"){2})*[^"]*$)/;

	function stylesToCss(style) {
	  return Object.keys(style).reduce(function (acc, prop) { return acc + propToString(prop.replace(/!/g, ''), style[prop]); }
	  , '')
	}

	function propToString(prop, value) {
	  prop = prop in vendorMap ? vendorMap[prop] : prop;
	  return (vendorRegex.test(prop) ? '-' : '')
	    + (cssVar(prop)
	      ? prop
	      : camelCaseToHyphen(prop)
	    )
	    + ':'
	    + value
	    + ';'
	}

	function formatValues(prop, value) {
	  return Array.isArray(value)
	    ? value.map(function (v) { return formatValue(prop, v); }).join(' ')
	    : typeof value === 'string'
	      ? formatValues(prop, value.split(' '))
	      : formatValue(prop, value)
	}

	function formatValue(prop, value) {
	  return value in vendorValuePrefix
	    ? vendorValuePrefix[value]
	    : value + (isNaN(value) || value === null || value === 0 || value === '0' || typeof value === 'boolean' || cssVar(prop) ? '' : appendPx(prop))
	}

	function cssVar(prop) {
	  return prop.charAt(0) === '-' && prop.charAt(1) === '-'
	}

	var classPrefix = 'b' + ('000' + ((Math.random() * 46656) | 0).toString(36)).slice(-3) +
	                    ('000' + ((Math.random() * 46656) | 0).toString(36)).slice(-3);

	var styleSheet = typeof document === 'object' && document.createElement('style');
	styleSheet && document.head && document.head.appendChild(styleSheet);
	styleSheet && (styleSheet.id = classPrefix);

	var sheet = styleSheet && styleSheet.sheet;

	var debug = false;
	var classes = Object.create(null, {});
	var rules = [];
	var count = 0;

	function setDebug(d) {
	  debug = d;
	}

	function getSheet() {
	  var content = rules.join('');
	  rules = [];
	  classes = Object.create(null, {});
	  count = 0;
	  return content
	}

	function getRules() {
	  return rules
	}

	function insert(rule, index) {
	  rules.push(rule);

	  if (debug)
	    { return styleSheet.textContent = rules.join('\n') }

	  try {
	    sheet && sheet.insertRule(rule, arguments.length > 1
	      ? index
	      : sheet.cssRules.length);
	  } catch (e) {
	    // Ignore thrown errors in eg. firefox for unsupported strings (::-webkit-inner-spin-button)
	  }
	}

	function createClass(style) {
	  var json = JSON.stringify(style);

	  if (json in classes)
	    { return classes[json] }

	  var className = classPrefix + (++count)
	      , rules = objectToRules(style, '.' + className);

	  for (var i = 0; i < rules.length; i++)
	    { insert(rules[i]); }

	  classes[json] = className;

	  return className
	}

	/* eslint no-invalid-this: 0 */

	var shorts = Object.create(null);

	function bss(input, value) {
	  var b = chain(bss);
	  input && assign$1(b.__style, parse$2.apply(null, arguments));
	  return b
	}

	function setProp(prop, value) {
	  Object.defineProperty(bss, prop, {
	    configurable: true,
	    value: value
	  });
	}

	Object.defineProperties(bss, {
	  __style: {
	    configurable: true,
	    writable: true,
	    value: {}
	  },
	  valueOf: {
	    configurable: true,
	    writable: true,
	    value: function() {
	      return '.' + this.class
	    }
	  },
	  toString: {
	    configurable: true,
	    writable: true,
	    value: function() {
	      return this.class
	    }
	  }
	});

	setProp('setDebug', setDebug);

	setProp('$keyframes', keyframes);
	setProp('$media', $media);
	setProp('$import', $import);
	setProp('$nest', $nest);
	setProp('getSheet', getSheet);
	setProp('getRules', getRules);
	setProp('helper', helper);
	setProp('css', css);
	setProp('classPrefix', classPrefix);

	function chain(instance) {
	  var newInstance = Object.create(bss, {
	    __style: {
	      value: assign$1({}, instance.__style)
	    },
	    style: {
	      enumerable: true,
	      get: function() {
	        var this$1 = this;

	        return Object.keys(this.__style).reduce(function (acc, key) {
	          if (typeof this$1.__style[key] === 'number' || typeof this$1.__style[key] === 'string')
	            { acc[key.replace(/^!/, '')] = this$1.__style[key]; }
	          return acc
	        }, {})
	      }
	    }
	  });

	  if (instance === bss)
	    { bss.__style = {}; }

	  return newInstance
	}

	cssProperties.forEach(function (prop) {
	  var vendor = prop.match(vendorRegex);
	  if (vendor) {
	    var unprefixed = lowercaseFirst(prop.replace(vendorRegex, '$2'));
	    if (cssProperties.indexOf(unprefixed) === -1) {
	      if (unprefixed === 'flexDirection')
	        { vendorValuePrefix.flex = '-' + vendor[1].toLowerCase() + '-flex'; }

	      vendorMap[unprefixed] = prop;
	      setProp(unprefixed, setter(prop));
	      setProp(short(unprefixed), bss[unprefixed]);
	      return
	    }
	  }

	  setProp(prop, setter(prop));
	  setProp(short(prop), bss[prop]);
	});

	setProp('content', function Content(arg) {
	  var b = chain(this);
	  arg === null || arg === undefined || arg === false
	    ? delete b.__style.content
	    : b.__style.content = '"' + arg + '"';
	  return b
	});

	Object.defineProperty(bss, 'class', {
	  set: function(value) {
	    this.__class = value;
	  },
	  get: function() {
	    return this.__class || createClass(this.__style)
	  }
	});

	function $media(value, style) {
	  var b = chain(this);
	  if (value)
	    { b.__style['@media ' + value] = parse$2(style); }

	  return b
	}

	function $import(value) {
	  if (value && !/^('|"|url\('|url\(")/.test(value))
	    { value = '"' + value + '"'; }

	  if (value)
	    { insert('@import ' + value + ';', 0); }

	  return chain(this)
	}

	function $nest(selector, properties) {
	  var b = chain(this);
	  if (arguments.length === 1)
	    { Object.keys(selector).forEach(function (x) { return addNest(b.__style, x, selector[x]); }); }
	  else if (selector)
	    { addNest(b.__style, selector, properties); }

	  return b
	}

	function addNest(style, selector, properties) {
	  var prop = selector.split(selectorSplit).map(function (x) {
	    x = x.trim();
	    return (x.charAt(0) === ':' || x.charAt(0) === '[' ? '' : ' ') + x
	  }).join(',&');

	  prop in style
	    ? assign$1(style[prop], parse$2(properties))
	    : style[prop] = parse$2(properties);
	}

	pseudos.forEach(function (name) { return setProp('$' + hyphenToCamelCase(name.replace(/:/g, '')), function Pseudo(value, style) {
	    var b = chain(this);
	    if (isTagged(value))
	      { b.__style[name] = parse$2.apply(null, arguments); }
	    else if (value || style)
	      { b.__style[name + (style ? '(' + value + ')' : '')] = parse$2(style || value); }
	    return b
	  }); }
	);

	function setter(prop) {
	  return function CssProperty(value) {
	    var b = chain(this);
	    if (!value && value !== 0)
	      { delete b.__style[prop]; }
	    else if (arguments.length > 0)
	      { add(b.__style, prop, Array.prototype.slice.call(arguments)); }

	    return b
	  }
	}

	function css(selector, style) {
	  if (arguments.length === 1)
	    { Object.keys(selector).forEach(function (key) { return addCss(key, selector[key]); }); }
	  else
	    { addCss(selector, style); }

	  return chain(this)
	}

	function addCss(selector, style) {
	  objectToRules(parse$2(style), selector, '', true).forEach(function (rule) { return insert(rule); });
	}

	function helper(name, styling) {
	  if (arguments.length === 1)
	    { return Object.keys(name).forEach(function (key) { return helper(key, name[key]); }) }

	  delete bss[name]; // Needed to avoid weird get calls in chrome

	  if (typeof styling === 'function') {
	    helper[name] = styling;
	    Object.defineProperty(bss, name, {
	      configurable: true,
	      value: function Helper(input) {
	        var b = chain(this);
	        var result = isTagged(input)
	          ? styling(raw(input, arguments))
	          : styling.apply(null, arguments);
	        assign$1(b.__style, result.__style);
	        return b
	      }
	    });
	  } else {
	    helper[name] = parse$2(styling);
	    Object.defineProperty(bss, name, {
	      configurable: true,
	      get: function() {
	        var b = chain(this);
	        assign$1(b.__style, parse$2(styling));
	        return b
	      }
	    });
	  }
	}

	bss.helper('$animate', function (value, props) { return bss.animation(bss.$keyframes(props) + ' ' + value); }
	);

	function short(prop) {
	  var acronym = initials(prop)
	      , short = popular[acronym] && popular[acronym] !== prop ? prop : acronym;

	  shorts[short] = prop;
	  return short
	}

	var stringToObject = memoize(function (string) {
	  var last = ''
	    , prev;

	  return string.trim().replace(/\/\*[\s\S]*?\*\/|([^:]|^)\/\/.*(?![^("]*[)"])/g, '').split(/;(?![^("]*[)"])|\n/).reduce(function (acc, line) {
	    if (!line)
	      { return acc }
	    line = last + line.trim();
	    var ref = line.replace(/[ :]+/, ' ').split(' ');
	    var key = ref[0];
	    var tokens = ref.slice(1);

	    last = line.charAt(line.length - 1) === ',' ? line : '';
	    if (last)
	      { return acc }

	    if (line.charAt(0) === ',' || !isProp.test(key)) {
	      acc[prev] += ' ' + line;
	      return acc
	    }

	    if (!key)
	      { return acc }

	    var prop = key.charAt(0) === '-' && key.charAt(1) === '-'
	      ? key
	      : hyphenToCamelCase(key);

	    prev = shorts[prop] || prop;

	    if (key in helper) {
	      typeof helper[key] === 'function'
	        ? assign$1(acc, helper[key].apply(helper, tokens).__style)
	        : assign$1(acc, helper[key]);
	    } else if (prop in helper) {
	      typeof helper[prop] === 'function'
	        ? assign$1(acc, helper[prop].apply(helper, tokens).__style)
	        : assign$1(acc, helper[prop]);
	    } else if (tokens.length > 0) {
	      add(acc, prev, tokens);
	    }

	    return acc
	  }, {})
	});

	var count$1 = 0;
	var keyframeCache = {};

	function keyframes(props) {
	  var content = Object.keys(props).reduce(function (acc, key) { return acc + key + '{' + stylesToCss(parse$2(props[key])) + '}'; }
	  , '');

	  if (content in keyframeCache)
	    { return keyframeCache[content] }

	  var name = classPrefix + count$1++;
	  keyframeCache[content] = name;
	  insert('@keyframes ' + name + '{' + content + '}');

	  return name
	}

	function parse$2(input, value) {
	  var obj;

	  if (typeof input === 'string') {
	    if (typeof value === 'string' || typeof value === 'number')
	      { return (( obj = {}, obj[input] = value, obj )) }

	    return stringToObject(input)
	  } else if (isTagged(input)) {
	    return stringToObject(raw(input, arguments))
	  }

	  return input.__style || sanitize(input)
	}

	function isTagged(input) {
	  return Array.isArray(input) && typeof input[0] === 'string'
	}

	function raw(input, args) {
	  var str = '';
	  for (var i = 0; i < input.length; i++)
	    { str += input[i] + (args[i + 1] || args[i + 1] === 0 ? args[i + 1] : ''); }
	  return str
	}

	function sanitize(styles) {
	  return Object.keys(styles).reduce(function (acc, key) {
	    var value = styles[key];
	    key = shorts[key] || key;

	    if (!value && value !== 0 && value !== '')
	      { return acc }

	    if (key === 'content' && value.charAt(0) !== '"')
	      { acc[key] = '"' + value + '"'; }
	    else if (typeof value === 'object')
	      { acc[key] = sanitize(value); }
	    else
	      { add(acc, key, value); }

	    return acc
	  }, {})
	}

	var templateObject$1 = Object.freeze(["\n        transition all 0.2s ease\n    "]);
	var templateObject = Object.freeze(["\n        background-color darkblue\n    "]);

	var StyledBtn =
	    'button.btn.btn-primary.not-rounded' +
	    bss(templateObject$1).$hover(templateObject)
	;

	var Btn = {
	    view: function (ref) {
	        var attrs = ref.attrs;
	        var children = ref.children;

	        return mithril(StyledBtn, attrs, children);
	}
	};

	var Counter = {
	    view: function (ref) {
	            var ref_attrs = ref.attrs;
	            var state = ref_attrs.state;
	            var actions = ref_attrs.actions;

	            return mithril('div',
	            mithril('h2', state.num),

	            mithril('div.center',
	                mithril(Btn, { onclick: actions.incrementNum }, 'Increment'),
	                mithril(Btn, { onclick: actions.decrementNum }, 'Decrement'),
	                mithril(Btn, { onclick: actions.delayedIncrement }, 'Delayed Increment')
	            )
	        );
	}
	};

	var App = {
	    view: function (ref) {
	            var ref_attrs = ref.attrs;
	            var state = ref_attrs.state;
	            var actions = ref_attrs.actions;

	            return mithril('div.px3.max-width-3.mx-auto',
	            mithril('h1', 'Mithril Starter'),
	            mithril('p', 'This is a sample Mithril.js application. It uses the Meiosis State Management Pattern.'),
	            mithril(Counter, { state: state, actions: actions })
	        );
	}
	};

	mithril.mount(document.getElementById('app'), {
	    view: function () { return mithril(App, { state: state(), actions: allActions }); }
	});

}());
//# sourceMappingURL=bundle.js.map
