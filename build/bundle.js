
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_style(node, key, value, important) {
        node.style.setProperty(key, value, important ? 'important' : '');
    }
    function custom_event(type, detail, bubbles = false) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error('Function called outside component initialization');
        return current_component;
    }
    function createEventDispatcher() {
        const component = get_current_component();
        return (type, detail) => {
            const callbacks = component.$$.callbacks[type];
            if (callbacks) {
                // TODO are there situations where events could be dispatched
                // in a server (non-DOM) environment?
                const event = custom_event(type, detail);
                callbacks.slice().forEach(fn => {
                    fn.call(component, event);
                });
            }
        };
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    // flush() calls callbacks in this order:
    // 1. All beforeUpdate callbacks, in order: parents before children
    // 2. All bind:this callbacks, in reverse order: children before parents.
    // 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
    //    for afterUpdates called during the initial onMount, which are called in
    //    reverse order: children before parents.
    // Since callbacks might update component values, which could trigger another
    // call to flush(), the following steps guard against this:
    // 1. During beforeUpdate, any updated components will be added to the
    //    dirty_components array and will cause a reentrant call to flush(). Because
    //    the flush index is kept outside the function, the reentrant call will pick
    //    up where the earlier call left off and go through all dirty components. The
    //    current_component value is saved and restored so that the reentrant call will
    //    not interfere with the "parent" flush() call.
    // 2. bind:this callbacks cannot trigger new flush() calls.
    // 3. During afterUpdate, any updated components will NOT have their afterUpdate
    //    callback called a second time; the seen_callbacks set, outside the flush()
    //    function, guarantees this behavior.
    const seen_callbacks = new Set();
    let flushidx = 0; // Do *not* move this inside the flush() function
    function flush() {
        const saved_component = current_component;
        do {
            // first, call beforeUpdate functions
            // and update components
            while (flushidx < dirty_components.length) {
                const component = dirty_components[flushidx];
                flushidx++;
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            flushidx = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        seen_callbacks.clear();
        set_current_component(saved_component);
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = on_mount.map(run).filter(is_function);
                if (on_destroy) {
                    on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.44.3' }, detail), true));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /* src\Kural.svelte generated by Svelte v3.44.3 */

    const file$4 = "src\\Kural.svelte";

    function get_each_context$3(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[5] = list[i];
    	return child_ctx;
    }

    function get_each_context_1$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[5] = list[i];
    	return child_ctx;
    }

    // (42:0) {#each kural.li.split('\n') as ln}
    function create_each_block_1$1(ctx) {
    	let p;
    	let t_value = /*ln*/ ctx[5] + "";
    	let t;

    	const block = {
    		c: function create() {
    			p = element("p");
    			t = text(t_value);
    			attr_dev(p, "class", "tamil kural-line");
    			add_location(p, file$4, 42, 4, 1392);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    			append_dev(p, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*kural*/ 1 && t_value !== (t_value = /*ln*/ ctx[5] + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_1$1.name,
    		type: "each",
    		source: "(42:0) {#each kural.li.split('\\n') as ln}",
    		ctx
    	});

    	return block;
    }

    // (80:4) {#each kural.tlr.split('\n') as ln}
    function create_each_block$3(ctx) {
    	let p;
    	let t_value = /*ln*/ ctx[5] + "";
    	let t;

    	const block = {
    		c: function create() {
    			p = element("p");
    			t = text(t_value);
    			attr_dev(p, "class", "english kural-english");
    			add_location(p, file$4, 80, 8, 2690);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    			append_dev(p, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*kural*/ 1 && t_value !== (t_value = /*ln*/ ctx[5] + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$3.name,
    		type: "each",
    		source: "(80:4) {#each kural.tlr.split('\\n') as ln}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$4(ctx) {
    	let p0;
    	let t0;
    	let t1;
    	let t2;
    	let t3;
    	let t4;
    	let t5;
    	let div0;
    	let p1;
    	let t7;
    	let p2;
    	let t8_value = /*section*/ ctx[2][0] + "";
    	let t8;
    	let t9;
    	let t10_value = /*section*/ ctx[2][1] + "";
    	let t10;
    	let br0;
    	let t11;
    	let p3;
    	let t13;
    	let p4;
    	let t14_value = /*chapter*/ ctx[3][0] + "";
    	let t14;
    	let t15;
    	let t16_value = /*chapter*/ ctx[3][1] + "";
    	let t16;
    	let br1;
    	let t17;
    	let p5;
    	let t19;
    	let p6;
    	let t20_value = /*subChapter*/ ctx[4][0] + "";
    	let t20;
    	let t21;
    	let t22_value = /*subChapter*/ ctx[4][1] + "";
    	let t22;
    	let t23;
    	let div1;
    	let p7;
    	let t25;
    	let p8;
    	let t26_value = /*kural*/ ctx[0].def[0] + "";
    	let t26;
    	let t27;
    	let div2;
    	let p9;
    	let t29;
    	let p10;
    	let t30_value = /*kural*/ ctx[0].def[1] + "";
    	let t30;
    	let t31;
    	let div3;
    	let p11;
    	let t33;
    	let p12;
    	let t34_value = /*kural*/ ctx[0].def[2] + "";
    	let t34;
    	let t35;
    	let div4;
    	let p13;
    	let t37;
    	let p14;
    	let t38_value = /*kural*/ ctx[0].cpl + "";
    	let t38;
    	let t39;
    	let p15;
    	let t41;
    	let p16;
    	let t42_value = /*kural*/ ctx[0].tl + "";
    	let t42;
    	let t43;
    	let p17;
    	let t45;
    	let each_value_1 = /*kural*/ ctx[0].li.split('\n');
    	validate_each_argument(each_value_1);
    	let each_blocks_1 = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks_1[i] = create_each_block_1$1(get_each_context_1$1(ctx, each_value_1, i));
    	}

    	let each_value = /*kural*/ ctx[0].tlr.split('\n');
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$3(get_each_context$3(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			p0 = element("p");
    			t0 = text("குறள் ");
    			t1 = text(/*kuralEnn*/ ctx[1]);
    			t2 = text(" / Kural ");
    			t3 = text(/*kuralEnn*/ ctx[1]);
    			t4 = space();

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].c();
    			}

    			t5 = space();
    			div0 = element("div");
    			p1 = element("p");
    			p1.textContent = "பால் / Section:";
    			t7 = space();
    			p2 = element("p");
    			t8 = text(t8_value);
    			t9 = text(" / ");
    			t10 = text(t10_value);
    			br0 = element("br");
    			t11 = space();
    			p3 = element("p");
    			p3.textContent = "இயல் / ChapterGroup:";
    			t13 = space();
    			p4 = element("p");
    			t14 = text(t14_value);
    			t15 = text(" / ");
    			t16 = text(t16_value);
    			br1 = element("br");
    			t17 = space();
    			p5 = element("p");
    			p5.textContent = "அதிகாரம் / Chapter:";
    			t19 = space();
    			p6 = element("p");
    			t20 = text(t20_value);
    			t21 = text(" / ");
    			t22 = text(t22_value);
    			t23 = space();
    			div1 = element("div");
    			p7 = element("p");
    			p7.textContent = "மு.வரதராசன் அவர்களின் விளக்கம்";
    			t25 = space();
    			p8 = element("p");
    			t26 = text(t26_value);
    			t27 = space();
    			div2 = element("div");
    			p9 = element("p");
    			p9.textContent = "சாலமன் பாப்பையா அவர்களின் விளக்கம்";
    			t29 = space();
    			p10 = element("p");
    			t30 = text(t30_value);
    			t31 = space();
    			div3 = element("div");
    			p11 = element("p");
    			p11.textContent = "சிவயோகி சிவக்குமார் அவர்களின் விளக்கம்";
    			t33 = space();
    			p12 = element("p");
    			t34 = text(t34_value);
    			t35 = space();
    			div4 = element("div");
    			p13 = element("p");
    			p13.textContent = "English Couplet";
    			t37 = space();
    			p14 = element("p");
    			t38 = text(t38_value);
    			t39 = space();
    			p15 = element("p");
    			p15.textContent = "English Definition";
    			t41 = space();
    			p16 = element("p");
    			t42 = text(t42_value);
    			t43 = space();
    			p17 = element("p");
    			p17.textContent = "English Transliteration";
    			t45 = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(p0, "class", "tamil");
    			add_location(p0, file$4, 39, 0, 1292);
    			attr_dev(p1, "class", "tamil translated kural-bold");
    			add_location(p1, file$4, 46, 4, 1468);
    			attr_dev(p2, "class", "tamil translated");
    			add_location(p2, file$4, 47, 4, 1533);
    			add_location(br0, file$4, 47, 63, 1592);
    			attr_dev(p3, "class", "tamil translated kural-bold");
    			add_location(p3, file$4, 49, 4, 1605);
    			attr_dev(p4, "class", "tamil translated");
    			add_location(p4, file$4, 50, 4, 1675);
    			add_location(br1, file$4, 50, 63, 1734);
    			attr_dev(p5, "class", "tamil translated kural-bold");
    			add_location(p5, file$4, 52, 4, 1747);
    			attr_dev(p6, "class", "tamil translated");
    			add_location(p6, file$4, 53, 4, 1816);
    			attr_dev(div0, "class", "vilakam");
    			add_location(div0, file$4, 45, 0, 1441);
    			attr_dev(p7, "class", "tamil kural-bold");
    			add_location(p7, file$4, 57, 4, 1920);
    			attr_dev(p8, "class", "tamil");
    			add_location(p8, file$4, 58, 4, 1988);
    			attr_dev(div1, "class", "vilakam");
    			add_location(div1, file$4, 56, 0, 1893);
    			attr_dev(p9, "class", "tamil kural-bold");
    			add_location(p9, file$4, 62, 4, 2062);
    			attr_dev(p10, "class", "tamil");
    			add_location(p10, file$4, 63, 4, 2134);
    			attr_dev(div2, "class", "vilakam");
    			add_location(div2, file$4, 61, 0, 2035);
    			attr_dev(p11, "class", "tamil kural-bold");
    			add_location(p11, file$4, 67, 4, 2208);
    			attr_dev(p12, "class", "tamil");
    			add_location(p12, file$4, 68, 4, 2284);
    			attr_dev(div3, "class", "vilakam");
    			add_location(div3, file$4, 66, 0, 2181);
    			attr_dev(p13, "class", "english kural-bold");
    			add_location(p13, file$4, 72, 4, 2358);
    			attr_dev(p14, "class", "english kural-english");
    			add_location(p14, file$4, 73, 4, 2413);
    			attr_dev(p15, "class", "english kural-bold");
    			add_location(p15, file$4, 75, 4, 2469);
    			attr_dev(p16, "class", "english kural-english");
    			add_location(p16, file$4, 76, 4, 2527);
    			attr_dev(p17, "class", "english kural-bold");
    			add_location(p17, file$4, 78, 4, 2582);
    			attr_dev(div4, "class", "vilakam");
    			add_location(div4, file$4, 71, 0, 2331);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p0, anchor);
    			append_dev(p0, t0);
    			append_dev(p0, t1);
    			append_dev(p0, t2);
    			append_dev(p0, t3);
    			insert_dev(target, t4, anchor);

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].m(target, anchor);
    			}

    			insert_dev(target, t5, anchor);
    			insert_dev(target, div0, anchor);
    			append_dev(div0, p1);
    			append_dev(div0, t7);
    			append_dev(div0, p2);
    			append_dev(p2, t8);
    			append_dev(p2, t9);
    			append_dev(p2, t10);
    			append_dev(div0, br0);
    			append_dev(div0, t11);
    			append_dev(div0, p3);
    			append_dev(div0, t13);
    			append_dev(div0, p4);
    			append_dev(p4, t14);
    			append_dev(p4, t15);
    			append_dev(p4, t16);
    			append_dev(div0, br1);
    			append_dev(div0, t17);
    			append_dev(div0, p5);
    			append_dev(div0, t19);
    			append_dev(div0, p6);
    			append_dev(p6, t20);
    			append_dev(p6, t21);
    			append_dev(p6, t22);
    			insert_dev(target, t23, anchor);
    			insert_dev(target, div1, anchor);
    			append_dev(div1, p7);
    			append_dev(div1, t25);
    			append_dev(div1, p8);
    			append_dev(p8, t26);
    			insert_dev(target, t27, anchor);
    			insert_dev(target, div2, anchor);
    			append_dev(div2, p9);
    			append_dev(div2, t29);
    			append_dev(div2, p10);
    			append_dev(p10, t30);
    			insert_dev(target, t31, anchor);
    			insert_dev(target, div3, anchor);
    			append_dev(div3, p11);
    			append_dev(div3, t33);
    			append_dev(div3, p12);
    			append_dev(p12, t34);
    			insert_dev(target, t35, anchor);
    			insert_dev(target, div4, anchor);
    			append_dev(div4, p13);
    			append_dev(div4, t37);
    			append_dev(div4, p14);
    			append_dev(p14, t38);
    			append_dev(div4, t39);
    			append_dev(div4, p15);
    			append_dev(div4, t41);
    			append_dev(div4, p16);
    			append_dev(p16, t42);
    			append_dev(div4, t43);
    			append_dev(div4, p17);
    			append_dev(div4, t45);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div4, null);
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*kuralEnn*/ 2) set_data_dev(t1, /*kuralEnn*/ ctx[1]);
    			if (dirty & /*kuralEnn*/ 2) set_data_dev(t3, /*kuralEnn*/ ctx[1]);

    			if (dirty & /*kural*/ 1) {
    				each_value_1 = /*kural*/ ctx[0].li.split('\n');
    				validate_each_argument(each_value_1);
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1$1(ctx, each_value_1, i);

    					if (each_blocks_1[i]) {
    						each_blocks_1[i].p(child_ctx, dirty);
    					} else {
    						each_blocks_1[i] = create_each_block_1$1(child_ctx);
    						each_blocks_1[i].c();
    						each_blocks_1[i].m(t5.parentNode, t5);
    					}
    				}

    				for (; i < each_blocks_1.length; i += 1) {
    					each_blocks_1[i].d(1);
    				}

    				each_blocks_1.length = each_value_1.length;
    			}

    			if (dirty & /*section*/ 4 && t8_value !== (t8_value = /*section*/ ctx[2][0] + "")) set_data_dev(t8, t8_value);
    			if (dirty & /*section*/ 4 && t10_value !== (t10_value = /*section*/ ctx[2][1] + "")) set_data_dev(t10, t10_value);
    			if (dirty & /*chapter*/ 8 && t14_value !== (t14_value = /*chapter*/ ctx[3][0] + "")) set_data_dev(t14, t14_value);
    			if (dirty & /*chapter*/ 8 && t16_value !== (t16_value = /*chapter*/ ctx[3][1] + "")) set_data_dev(t16, t16_value);
    			if (dirty & /*subChapter*/ 16 && t20_value !== (t20_value = /*subChapter*/ ctx[4][0] + "")) set_data_dev(t20, t20_value);
    			if (dirty & /*subChapter*/ 16 && t22_value !== (t22_value = /*subChapter*/ ctx[4][1] + "")) set_data_dev(t22, t22_value);
    			if (dirty & /*kural*/ 1 && t26_value !== (t26_value = /*kural*/ ctx[0].def[0] + "")) set_data_dev(t26, t26_value);
    			if (dirty & /*kural*/ 1 && t30_value !== (t30_value = /*kural*/ ctx[0].def[1] + "")) set_data_dev(t30, t30_value);
    			if (dirty & /*kural*/ 1 && t34_value !== (t34_value = /*kural*/ ctx[0].def[2] + "")) set_data_dev(t34, t34_value);
    			if (dirty & /*kural*/ 1 && t38_value !== (t38_value = /*kural*/ ctx[0].cpl + "")) set_data_dev(t38, t38_value);
    			if (dirty & /*kural*/ 1 && t42_value !== (t42_value = /*kural*/ ctx[0].tl + "")) set_data_dev(t42, t42_value);

    			if (dirty & /*kural*/ 1) {
    				each_value = /*kural*/ ctx[0].tlr.split('\n');
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$3(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block$3(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div4, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p0);
    			if (detaching) detach_dev(t4);
    			destroy_each(each_blocks_1, detaching);
    			if (detaching) detach_dev(t5);
    			if (detaching) detach_dev(div0);
    			if (detaching) detach_dev(t23);
    			if (detaching) detach_dev(div1);
    			if (detaching) detach_dev(t27);
    			if (detaching) detach_dev(div2);
    			if (detaching) detach_dev(t31);
    			if (detaching) detach_dev(div3);
    			if (detaching) detach_dev(t35);
    			if (detaching) detach_dev(div4);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$4.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$4($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Kural', slots, []);
    	let { kural } = $$props;
    	let { kuralEnn } = $$props;
    	let section, chapter, subChapter;
    	const writable_props = ['kural', 'kuralEnn'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Kural> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('kural' in $$props) $$invalidate(0, kural = $$props.kural);
    		if ('kuralEnn' in $$props) $$invalidate(1, kuralEnn = $$props.kuralEnn);
    	};

    	$$self.$capture_state = () => ({
    		kural,
    		kuralEnn,
    		section,
    		chapter,
    		subChapter
    	});

    	$$self.$inject_state = $$props => {
    		if ('kural' in $$props) $$invalidate(0, kural = $$props.kural);
    		if ('kuralEnn' in $$props) $$invalidate(1, kuralEnn = $$props.kuralEnn);
    		if ('section' in $$props) $$invalidate(2, section = $$props.section);
    		if ('chapter' in $$props) $$invalidate(3, chapter = $$props.chapter);
    		if ('subChapter' in $$props) $$invalidate(4, subChapter = $$props.subChapter);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*kuralEnn*/ 2) {
    			for (let i = 0; i < window.kuralIndices.length; i++) {
    				let [start, end] = window.kuralIndices[i].kurals;

    				if (kuralEnn <= end && kuralEnn >= start) {
    					let section1 = window.kuralIndices[i];
    					$$invalidate(2, section = [section1.name, section1.translation]);

    					for (let i = 0; i < section1.chapters.length; i++) {
    						[start, end] = section1.chapters[i].kurals;

    						if (kuralEnn <= end && kuralEnn >= start) {
    							let chapter1 = section1.chapters[i];
    							$$invalidate(3, chapter = [chapter1.name, chapter1.translation]);

    							for (let i = 0; i < chapter1.chapters.length; i++) {
    								[start, end] = chapter1.chapters[i].se;

    								if (kuralEnn <= end && kuralEnn >= start) {
    									let subChapter1 = chapter1.chapters[i];
    									$$invalidate(4, subChapter = [subChapter1.name, subChapter1.translation]);
    									break;
    								}
    							}

    							break;
    						}
    					}

    					break;
    				}
    			}
    		}
    	};

    	return [kural, kuralEnn, section, chapter, subChapter];
    }

    class Kural extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, { kural: 0, kuralEnn: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Kural",
    			options,
    			id: create_fragment$4.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*kural*/ ctx[0] === undefined && !('kural' in props)) {
    			console.warn("<Kural> was created without expected prop 'kural'");
    		}

    		if (/*kuralEnn*/ ctx[1] === undefined && !('kuralEnn' in props)) {
    			console.warn("<Kural> was created without expected prop 'kuralEnn'");
    		}
    	}

    	get kural() {
    		throw new Error("<Kural>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set kural(value) {
    		throw new Error("<Kural>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get kuralEnn() {
    		throw new Error("<Kural>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set kuralEnn(value) {
    		throw new Error("<Kural>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\MiniKural.svelte generated by Svelte v3.44.3 */

    const file$3 = "src\\MiniKural.svelte";

    function get_each_context$2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[1] = list[i];
    	return child_ctx;
    }

    // (7:0) {#each result.kural.li.split('\n') as ln}
    function create_each_block$2(ctx) {
    	let p;
    	let t_value = /*ln*/ ctx[1] + "";
    	let t;

    	const block = {
    		c: function create() {
    			p = element("p");
    			t = text(t_value);
    			attr_dev(p, "class", "tamil kural-line");
    			add_location(p, file$3, 7, 4, 162);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    			append_dev(p, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*result*/ 1 && t_value !== (t_value = /*ln*/ ctx[1] + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$2.name,
    		type: "each",
    		source: "(7:0) {#each result.kural.li.split('\\n') as ln}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$3(ctx) {
    	let p0;
    	let t0;
    	let t1_value = /*result*/ ctx[0].i + 1 + "";
    	let t1;
    	let t2;
    	let t3_value = /*result*/ ctx[0].i + 1 + "";
    	let t3;
    	let t4;
    	let t5;
    	let p1;
    	let t6_value = /*result*/ ctx[0].kural.tl + "";
    	let t6;
    	let each_value = /*result*/ ctx[0].kural.li.split('\n');
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$2(get_each_context$2(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			p0 = element("p");
    			t0 = text("குறள் ");
    			t1 = text(t1_value);
    			t2 = text(" / Kural ");
    			t3 = text(t3_value);
    			t4 = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t5 = space();
    			p1 = element("p");
    			t6 = text(t6_value);
    			attr_dev(p0, "class", "tamil");
    			add_location(p0, file$3, 4, 0, 47);
    			attr_dev(p1, "class", "english");
    			add_location(p1, file$3, 10, 0, 211);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p0, anchor);
    			append_dev(p0, t0);
    			append_dev(p0, t1);
    			append_dev(p0, t2);
    			append_dev(p0, t3);
    			insert_dev(target, t4, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert_dev(target, t5, anchor);
    			insert_dev(target, p1, anchor);
    			append_dev(p1, t6);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*result*/ 1 && t1_value !== (t1_value = /*result*/ ctx[0].i + 1 + "")) set_data_dev(t1, t1_value);
    			if (dirty & /*result*/ 1 && t3_value !== (t3_value = /*result*/ ctx[0].i + 1 + "")) set_data_dev(t3, t3_value);

    			if (dirty & /*result*/ 1) {
    				each_value = /*result*/ ctx[0].kural.li.split('\n');
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$2(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block$2(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(t5.parentNode, t5);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}

    			if (dirty & /*result*/ 1 && t6_value !== (t6_value = /*result*/ ctx[0].kural.tl + "")) set_data_dev(t6, t6_value);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p0);
    			if (detaching) detach_dev(t4);
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(t5);
    			if (detaching) detach_dev(p1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('MiniKural', slots, []);
    	let { result } = $$props;
    	const writable_props = ['result'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<MiniKural> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('result' in $$props) $$invalidate(0, result = $$props.result);
    	};

    	$$self.$capture_state = () => ({ result });

    	$$self.$inject_state = $$props => {
    		if ('result' in $$props) $$invalidate(0, result = $$props.result);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [result];
    }

    class MiniKural extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, { result: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "MiniKural",
    			options,
    			id: create_fragment$3.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*result*/ ctx[0] === undefined && !('result' in props)) {
    			console.warn("<MiniKural> was created without expected prop 'result'");
    		}
    	}

    	get result() {
    		throw new Error("<MiniKural>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set result(value) {
    		throw new Error("<MiniKural>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\Index.svelte generated by Svelte v3.44.3 */
    const file$2 = "src\\Index.svelte";

    function get_each_context$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[5] = list[i];
    	return child_ctx;
    }

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[8] = list[i];
    	return child_ctx;
    }

    function get_each_context_2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[11] = list[i];
    	return child_ctx;
    }

    // (29:16) {#each chapter.chapters as childChapter}
    function create_each_block_2(ctx) {
    	let h5;
    	let t0_value = /*childChapter*/ ctx[11].name + "";
    	let t0;
    	let t1;
    	let t2_value = /*childChapter*/ ctx[11].translation + "";
    	let t2;
    	let br;
    	let mounted;
    	let dispose;

    	function click_handler_3() {
    		return /*click_handler_3*/ ctx[4](/*childChapter*/ ctx[11]);
    	}

    	const block = {
    		c: function create() {
    			h5 = element("h5");
    			t0 = text(t0_value);
    			t1 = text(" / ");
    			t2 = text(t2_value);
    			br = element("br");
    			attr_dev(h5, "class", "tamil translated bold clickable");
    			add_location(h5, file$2, 29, 20, 1177);
    			add_location(br, file$2, 32, 74, 1415);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h5, anchor);
    			append_dev(h5, t0);
    			append_dev(h5, t1);
    			append_dev(h5, t2);
    			insert_dev(target, br, anchor);

    			if (!mounted) {
    				dispose = listen_dev(h5, "click", click_handler_3, false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h5);
    			if (detaching) detach_dev(br);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_2.name,
    		type: "each",
    		source: "(29:16) {#each chapter.chapters as childChapter}",
    		ctx
    	});

    	return block;
    }

    // (16:8) {#each section.chapters as chapter}
    function create_each_block_1(ctx) {
    	let h4;
    	let a;
    	let i;
    	let t0;
    	let p;
    	let t1_value = /*chapter*/ ctx[8].name + "";
    	let t1;
    	let t2;
    	let t3_value = /*chapter*/ ctx[8].translation + "";
    	let t3;
    	let t4;
    	let div;
    	let t5;
    	let mounted;
    	let dispose;

    	function click_handler_1() {
    		return /*click_handler_1*/ ctx[2](/*chapter*/ ctx[8]);
    	}

    	function click_handler_2() {
    		return /*click_handler_2*/ ctx[3](/*chapter*/ ctx[8]);
    	}

    	let each_value_2 = /*chapter*/ ctx[8].chapters;
    	validate_each_argument(each_value_2);
    	let each_blocks = [];

    	for (let i = 0; i < each_value_2.length; i += 1) {
    		each_blocks[i] = create_each_block_2(get_each_context_2(ctx, each_value_2, i));
    	}

    	const block = {
    		c: function create() {
    			h4 = element("h4");
    			a = element("a");
    			i = element("i");
    			t0 = space();
    			p = element("p");
    			t1 = text(t1_value);
    			t2 = text(" / ");
    			t3 = text(t3_value);
    			t4 = space();
    			div = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t5 = space();
    			attr_dev(i, "class", "fas fa-chevron-right");
    			add_location(i, file$2, 20, 19, 789);
    			add_location(a, file$2, 18, 16, 648);
    			add_location(p, file$2, 22, 16, 849);
    			attr_dev(h4, "class", "tamil translated bold");
    			add_location(h4, file$2, 16, 12, 533);
    			attr_dev(div, "id", "cha-" + /*chapter*/ ctx[8].kurals[0]);
    			attr_dev(div, "class", "hidden subcontents");
    			add_location(div, file$2, 27, 12, 1036);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h4, anchor);
    			append_dev(h4, a);
    			append_dev(a, i);
    			append_dev(h4, t0);
    			append_dev(h4, p);
    			append_dev(p, t1);
    			append_dev(p, t2);
    			append_dev(p, t3);
    			insert_dev(target, t4, anchor);
    			insert_dev(target, div, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div, null);
    			}

    			append_dev(div, t5);

    			if (!mounted) {
    				dispose = [
    					listen_dev(a, "click", click_handler_1, false, false, false),
    					listen_dev(p, "click", click_handler_2, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (dirty & /*dispatch, window*/ 1) {
    				each_value_2 = /*chapter*/ ctx[8].chapters;
    				validate_each_argument(each_value_2);
    				let i;

    				for (i = 0; i < each_value_2.length; i += 1) {
    					const child_ctx = get_each_context_2(ctx, each_value_2, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block_2(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div, t5);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value_2.length;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h4);
    			if (detaching) detach_dev(t4);
    			if (detaching) detach_dev(div);
    			destroy_each(each_blocks, detaching);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_1.name,
    		type: "each",
    		source: "(16:8) {#each section.chapters as chapter}",
    		ctx
    	});

    	return block;
    }

    // (10:4) {#each window.kuralIndices as section}
    function create_each_block$1(ctx) {
    	let h3;
    	let t0_value = /*section*/ ctx[5].name + "";
    	let t0;
    	let t1;
    	let t2_value = /*section*/ ctx[5].translation + "";
    	let t2;
    	let br;
    	let t3;
    	let each_1_anchor;
    	let mounted;
    	let dispose;

    	function click_handler() {
    		return /*click_handler*/ ctx[1](/*section*/ ctx[5]);
    	}

    	let each_value_1 = /*section*/ ctx[5].chapters;
    	validate_each_argument(each_value_1);
    	let each_blocks = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
    	}

    	const block = {
    		c: function create() {
    			h3 = element("h3");
    			t0 = text(t0_value);
    			t1 = text(" / ");
    			t2 = text(t2_value);
    			br = element("br");
    			t3 = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    			attr_dev(h3, "class", "tamil translated bold clickable");
    			add_location(h3, file$2, 10, 8, 275);
    			add_location(br, file$2, 13, 52, 467);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h3, anchor);
    			append_dev(h3, t0);
    			append_dev(h3, t1);
    			append_dev(h3, t2);
    			insert_dev(target, br, anchor);
    			insert_dev(target, t3, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert_dev(target, each_1_anchor, anchor);

    			if (!mounted) {
    				dispose = listen_dev(h3, "click", click_handler, false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (dirty & /*window, dispatch, document*/ 1) {
    				each_value_1 = /*section*/ ctx[5].chapters;
    				validate_each_argument(each_value_1);
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1(ctx, each_value_1, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block_1(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value_1.length;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h3);
    			if (detaching) detach_dev(br);
    			if (detaching) detach_dev(t3);
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(each_1_anchor);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$1.name,
    		type: "each",
    		source: "(10:4) {#each window.kuralIndices as section}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$2(ctx) {
    	let div;
    	let h1;
    	let br;
    	let t1;
    	let each_value = window.kuralIndices;
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$1(get_each_context$1(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			div = element("div");
    			h1 = element("h1");
    			h1.textContent = "பொருளடக்கம் / Index";
    			br = element("br");
    			t1 = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(h1, "class", "tamil translated bold");
    			add_location(h1, file$2, 7, 4, 156);
    			add_location(br, file$2, 7, 62, 214);
    			attr_dev(div, "class", "indices");
    			add_location(div, file$2, 6, 0, 129);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, h1);
    			append_dev(div, br);
    			append_dev(div, t1);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div, null);
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*window, dispatch, document*/ 1) {
    				each_value = window.kuralIndices;
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$1(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block$1(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Index', slots, []);
    	const dispatch = createEventDispatcher();
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Index> was created with unknown prop '${key}'`);
    	});

    	const click_handler = section => dispatch('request', { start: section.kurals[0] });

    	const click_handler_1 = chapter => {
    		document.getElementById(`cha-${chapter.kurals[0]}`).classList.toggle('hidden');
    	};

    	const click_handler_2 = chapter => dispatch('request', { start: chapter.kurals[0] });
    	const click_handler_3 = childChapter => dispatch('request', { start: childChapter.se[0] });
    	$$self.$capture_state = () => ({ createEventDispatcher, dispatch });
    	return [dispatch, click_handler, click_handler_1, click_handler_2, click_handler_3];
    }

    class Index extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Index",
    			options,
    			id: create_fragment$2.name
    		});
    	}
    }

    /* src\Footer.svelte generated by Svelte v3.44.3 */

    const file$1 = "src\\Footer.svelte";

    function create_fragment$1(ctx) {
    	let div;
    	let h1;
    	let t1;
    	let p0;
    	let t2;
    	let a0;
    	let t4;
    	let t5;
    	let p1;
    	let t6;
    	let a1;
    	let t8;
    	let br0;
    	let t9;
    	let p2;
    	let t12;
    	let p3;
    	let br1;
    	let t15;
    	let a2;

    	const block = {
    		c: function create() {
    			div = element("div");
    			h1 = element("h1");
    			h1.textContent = "திருக்குறள்";
    			t1 = space();
    			p0 = element("p");
    			t2 = text("இங்கு பயன்படுத்தப்படும் திருக்குறளின் விவரங்கள் இந்த ");
    			a0 = element("a");
    			a0.textContent = "Repo";
    			t4 = text("-வில் இருந்து பெறப்பட்டது...");
    			t5 = space();
    			p1 = element("p");
    			t6 = text("The data used here is borrowed from this ");
    			a1 = element("a");
    			a1.textContent = "Repo";
    			t8 = text("...");
    			br0 = element("br");
    			t9 = space();
    			p2 = element("p");
    			p2.textContent = `தமிழிலக்கியம் © ${new Date().getFullYear()}`;
    			t12 = space();
    			p3 = element("p");
    			p3.textContent = `Tamizhilakkiyam © ${new Date().getFullYear()}`;
    			br1 = element("br");
    			t15 = space();
    			a2 = element("a");
    			a2.textContent = "Github";
    			attr_dev(h1, "class", "tamil");
    			add_location(h1, file$1, 1, 4, 26);
    			attr_dev(a0, "href", "https://github.com/tk120404/thirukkural");
    			add_location(a0, file$1, 3, 74, 138);
    			attr_dev(p0, "class", "tamil");
    			add_location(p0, file$1, 3, 4, 68);
    			attr_dev(a1, "href", "https://github.com/tk120404/thirukkural");
    			add_location(a1, file$1, 4, 64, 294);
    			attr_dev(p1, "class", "english");
    			add_location(p1, file$1, 4, 4, 234);
    			add_location(br0, file$1, 4, 129, 359);
    			attr_dev(p2, "class", "tamil bold");
    			add_location(p2, file$1, 6, 4, 372);
    			attr_dev(p3, "class", "english bold");
    			add_location(p3, file$1, 7, 4, 446);
    			add_location(br1, file$1, 7, 76, 518);
    			attr_dev(a2, "class", "english");
    			attr_dev(a2, "href", "https://github.com/tamizhilakkiyam/tirukural");
    			add_location(a2, file$1, 9, 4, 531);
    			attr_dev(div, "class", "footer");
    			add_location(div, file$1, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, h1);
    			append_dev(div, t1);
    			append_dev(div, p0);
    			append_dev(p0, t2);
    			append_dev(p0, a0);
    			append_dev(p0, t4);
    			append_dev(div, t5);
    			append_dev(div, p1);
    			append_dev(p1, t6);
    			append_dev(p1, a1);
    			append_dev(p1, t8);
    			append_dev(div, br0);
    			append_dev(div, t9);
    			append_dev(div, p2);
    			append_dev(div, t12);
    			append_dev(div, p3);
    			append_dev(div, br1);
    			append_dev(div, t15);
    			append_dev(div, a2);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Footer', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Footer> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class Footer extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Footer",
    			options,
    			id: create_fragment$1.name
    		});
    	}
    }

    /* src\App.svelte generated by Svelte v3.44.3 */

    const { console: console_1 } = globals;
    const file = "src\\App.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[23] = list[i];
    	return child_ctx;
    }

    // (174:8) {:else}
    function create_else_block_1(ctx) {
    	let div0;
    	let kural;
    	let t0;
    	let a0;
    	let t2;
    	let a1;
    	let t4;
    	let div1;
    	let index;
    	let current;
    	let mounted;
    	let dispose;

    	kural = new Kural({
    			props: {
    				kural: /*loaded*/ ctx[0][/*mainKuralNumber*/ ctx[3]],
    				kuralEnn: /*mainKuralNumber*/ ctx[3] + 1
    			},
    			$$inline: true
    		});

    	index = new Index({ $$inline: true });
    	index.$on("request", /*request_handler*/ ctx[21]);

    	const block = {
    		c: function create() {
    			div0 = element("div");
    			create_component(kural.$$.fragment);
    			t0 = space();
    			a0 = element("a");
    			a0.textContent = "முந்தைய குறள் / Previous Kural";
    			t2 = space();
    			a1 = element("a");
    			a1.textContent = "அடுத்த குறள் / Next Kural";
    			t4 = space();
    			div1 = element("div");
    			create_component(index.$$.fragment);
    			attr_dev(a0, "class", "kural-button");
    			add_location(a0, file, 181, 16, 7311);
    			attr_dev(a1, "class", "kural-button");
    			add_location(a1, file, 183, 16, 7493);
    			attr_dev(div0, "class", "kural-box");
    			add_location(div0, file, 174, 12, 7054);
    			attr_dev(div1, "class", "kural-box");
    			add_location(div1, file, 186, 12, 7624);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div0, anchor);
    			mount_component(kural, div0, null);
    			append_dev(div0, t0);
    			append_dev(div0, a0);
    			append_dev(div0, t2);
    			append_dev(div0, a1);
    			insert_dev(target, t4, anchor);
    			insert_dev(target, div1, anchor);
    			mount_component(index, div1, null);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(a0, "click", /*click_handler_7*/ ctx[19], false, false, false),
    					listen_dev(a1, "click", /*click_handler_8*/ ctx[20], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			const kural_changes = {};
    			if (dirty & /*loaded, mainKuralNumber*/ 9) kural_changes.kural = /*loaded*/ ctx[0][/*mainKuralNumber*/ ctx[3]];
    			if (dirty & /*mainKuralNumber*/ 8) kural_changes.kuralEnn = /*mainKuralNumber*/ ctx[3] + 1;
    			kural.$set(kural_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(kural.$$.fragment, local);
    			transition_in(index.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(kural.$$.fragment, local);
    			transition_out(index.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div0);
    			destroy_component(kural);
    			if (detaching) detach_dev(t4);
    			if (detaching) detach_dev(div1);
    			destroy_component(index);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block_1.name,
    		type: "else",
    		source: "(174:8) {:else}",
    		ctx
    	});

    	return block;
    }

    // (144:32) 
    function create_if_block_3(ctx) {
    	let t0;
    	let t1;
    	let div;
    	let a;
    	let p;
    	let current;
    	let mounted;
    	let dispose;
    	let each_value = /*searchResults*/ ctx[1].slice((/*searchPageIndex*/ ctx[2] - 1) * 6, /*searchPageIndex*/ ctx[2] * 6);
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	function select_block_type_1(ctx, dirty) {
    		if (/*searchResults*/ ctx[1].length == 0) return create_if_block_4;
    		return create_else_block;
    	}

    	let current_block_type = select_block_type_1(ctx);
    	let if_block = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t0 = space();
    			if_block.c();
    			t1 = space();
    			div = element("div");
    			a = element("a");
    			p = element("p");
    			p.textContent = "முகப்புப் பக்கத்திற்குச் செல்ல வேண்டுமா? Back to Homepage?";
    			attr_dev(p, "class", "tamil");
    			add_location(p, file, 170, 20, 6902);
    			attr_dev(a, "class", "bth-link");
    			add_location(a, file, 169, 16, 6829);
    			attr_dev(div, "class", "kural-box");
    			add_location(div, file, 167, 12, 6725);
    		},
    		m: function mount(target, anchor) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert_dev(target, t0, anchor);
    			if_block.m(target, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, div, anchor);
    			append_dev(div, a);
    			append_dev(a, p);
    			current = true;

    			if (!mounted) {
    				dispose = listen_dev(a, "click", /*click_handler_6*/ ctx[18], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*resetConfig, searchResults, searchPageIndex*/ 518) {
    				each_value = /*searchResults*/ ctx[1].slice((/*searchPageIndex*/ ctx[2] - 1) * 6, /*searchPageIndex*/ ctx[2] * 6);
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(t0.parentNode, t0);
    					}
    				}

    				group_outros();

    				for (i = each_value.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}

    			if (current_block_type === (current_block_type = select_block_type_1(ctx)) && if_block) {
    				if_block.p(ctx, dirty);
    			} else {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(t1.parentNode, t1);
    				}
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(t0);
    			if_block.d(detaching);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(div);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_3.name,
    		type: "if",
    		source: "(144:32) ",
    		ctx
    	});

    	return block;
    }

    // (133:33) 
    function create_if_block_2(ctx) {
    	let div2;
    	let div0;
    	let t0;
    	let t1;
    	let t2;
    	let t3;
    	let div1;
    	let t4;
    	let t5;
    	let t6;
    	let t7;
    	let a;
    	let p0;
    	let t9;
    	let p1;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			div0 = element("div");
    			t0 = text("குறள் எண் ");
    			t1 = text(/*requestedKural*/ ctx[5]);
    			t2 = text(" திருக்குறளில் இல்லை");
    			t3 = space();
    			div1 = element("div");
    			t4 = text("Kural number ");
    			t5 = text(/*requestedKural*/ ctx[5]);
    			t6 = text(" does not exists in Tirukkural.");
    			t7 = space();
    			a = element("a");
    			p0 = element("p");
    			p0.textContent = "முகப்புப் பக்கத்திற்குச் செல்ல வேண்டுமா?";
    			t9 = space();
    			p1 = element("p");
    			p1.textContent = "Back to Homepage?";
    			attr_dev(div0, "class", "tamil");
    			add_location(div0, file, 134, 16, 4911);
    			attr_dev(div1, "class", "english");
    			add_location(div1, file, 135, 16, 5000);
    			attr_dev(p0, "class", "tamil");
    			add_location(p0, file, 139, 20, 5243);
    			attr_dev(p1, "class", "english");
    			add_location(p1, file, 140, 20, 5326);
    			attr_dev(a, "class", "bth-link");
    			add_location(a, file, 138, 16, 5170);
    			attr_dev(div2, "class", "kural-box");
    			add_location(div2, file, 133, 12, 4870);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, div0);
    			append_dev(div0, t0);
    			append_dev(div0, t1);
    			append_dev(div0, t2);
    			append_dev(div2, t3);
    			append_dev(div2, div1);
    			append_dev(div1, t4);
    			append_dev(div1, t5);
    			append_dev(div1, t6);
    			append_dev(div2, t7);
    			append_dev(div2, a);
    			append_dev(a, p0);
    			append_dev(a, t9);
    			append_dev(a, p1);

    			if (!mounted) {
    				dispose = listen_dev(a, "click", /*click_handler_2*/ ctx[14], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*requestedKural*/ 32) set_data_dev(t1, /*requestedKural*/ ctx[5]);
    			if (dirty & /*requestedKural*/ 32) set_data_dev(t5, /*requestedKural*/ ctx[5]);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2.name,
    		type: "if",
    		source: "(133:33) ",
    		ctx
    	});

    	return block;
    }

    // (109:8) {#if withinKuralRange(requestedKural)}
    function create_if_block_1(ctx) {
    	let div0;
    	let kural;
    	let t0;
    	let a0;
    	let t2;
    	let div1;
    	let a1;
    	let p;
    	let current;
    	let mounted;
    	let dispose;

    	kural = new Kural({
    			props: {
    				kural: /*loaded*/ ctx[0][/*requestedKural*/ ctx[5] - 1],
    				kuralEnn: /*requestedKural*/ ctx[5]
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			div0 = element("div");
    			create_component(kural.$$.fragment);
    			t0 = space();
    			a0 = element("a");
    			a0.textContent = "இக்குறளை முகப்புப்பக்கத்தில் அமைக்க / Set this kural at homepage";
    			t2 = space();
    			div1 = element("div");
    			a1 = element("a");
    			p = element("p");
    			p.textContent = "முகப்புப் பக்கத்திற்குச் செல்ல வேண்டுமா? Back to Homepage?";
    			attr_dev(a0, "class", "kural-button");
    			set_style(a0, "min-width", "calc(100% - 20px)");
    			add_location(a0, file, 116, 16, 4119);
    			attr_dev(div0, "class", "kural-box");
    			add_location(div0, file, 109, 12, 3864);
    			attr_dev(p, "class", "tamil");
    			add_location(p, file, 129, 20, 4700);
    			attr_dev(a1, "class", "bth-link");
    			add_location(a1, file, 128, 16, 4627);
    			attr_dev(div1, "class", "kural-box");
    			add_location(div1, file, 126, 12, 4523);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div0, anchor);
    			mount_component(kural, div0, null);
    			append_dev(div0, t0);
    			append_dev(div0, a0);
    			insert_dev(target, t2, anchor);
    			insert_dev(target, div1, anchor);
    			append_dev(div1, a1);
    			append_dev(a1, p);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(a0, "click", /*click_handler*/ ctx[12], false, false, false),
    					listen_dev(a1, "click", /*click_handler_1*/ ctx[13], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			const kural_changes = {};
    			if (dirty & /*loaded, requestedKural*/ 33) kural_changes.kural = /*loaded*/ ctx[0][/*requestedKural*/ ctx[5] - 1];
    			if (dirty & /*requestedKural*/ 32) kural_changes.kuralEnn = /*requestedKural*/ ctx[5];
    			kural.$set(kural_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(kural.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(kural.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div0);
    			destroy_component(kural);
    			if (detaching) detach_dev(t2);
    			if (detaching) detach_dev(div1);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(109:8) {#if withinKuralRange(requestedKural)}",
    		ctx
    	});

    	return block;
    }

    // (105:4) {#if loaded.length == 0}
    function create_if_block(ctx) {
    	let p0;
    	let t1;
    	let p1;

    	const block = {
    		c: function create() {
    			p0 = element("p");
    			p0.textContent = "சிறிது நேரம் காத்திருக்கவும்...";
    			t1 = space();
    			p1 = element("p");
    			p1.textContent = "Please wait for some time...";
    			attr_dev(p0, "class", "tamil");
    			add_location(p0, file, 105, 8, 3676);
    			attr_dev(p1, "class", "english");
    			add_location(p1, file, 106, 8, 3738);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p0, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, p1, anchor);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p0);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(p1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(105:4) {#if loaded.length == 0}",
    		ctx
    	});

    	return block;
    }

    // (145:12) {#each searchResults.slice((searchPageIndex - 1) * 6, searchPageIndex * 6) as result}
    function create_each_block(ctx) {
    	let div;
    	let minikural;
    	let t0;
    	let a;
    	let current;
    	let mounted;
    	let dispose;

    	minikural = new MiniKural({
    			props: { result: /*result*/ ctx[23] },
    			$$inline: true
    		});

    	function click_handler_3() {
    		return /*click_handler_3*/ ctx[15](/*result*/ ctx[23]);
    	}

    	const block = {
    		c: function create() {
    			div = element("div");
    			create_component(minikural.$$.fragment);
    			t0 = space();
    			a = element("a");
    			a.textContent = "மேலும் படிக்க / Read More";
    			attr_dev(a, "class", "kural-button");
    			add_location(a, file, 148, 20, 5722);
    			attr_dev(div, "class", "kural-box");
    			add_location(div, file, 145, 16, 5560);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			mount_component(minikural, div, null);
    			append_dev(div, t0);
    			append_dev(div, a);
    			current = true;

    			if (!mounted) {
    				dispose = listen_dev(a, "click", click_handler_3, false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			const minikural_changes = {};
    			if (dirty & /*searchResults, searchPageIndex*/ 6) minikural_changes.result = /*result*/ ctx[23];
    			minikural.$set(minikural_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(minikural.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(minikural.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_component(minikural);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(145:12) {#each searchResults.slice((searchPageIndex - 1) * 6, searchPageIndex * 6) as result}",
    		ctx
    	});

    	return block;
    }

    // (158:12) {:else}
    function create_else_block(ctx) {
    	let br;
    	let t0;
    	let a0;
    	let t2;
    	let a1;
    	let t4;
    	let h3;
    	let t5;
    	let t6;
    	let t7;
    	let t8_value = Math.ceil(/*searchResults*/ ctx[1].length / 10) + "";
    	let t8;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			br = element("br");
    			t0 = space();
    			a0 = element("a");
    			a0.textContent = "முந்தைய பக்கம் / Previous Page";
    			t2 = space();
    			a1 = element("a");
    			a1.textContent = "அடுத்த பக்கம் / Next Page";
    			t4 = space();
    			h3 = element("h3");
    			t5 = text("Page / பக்கம் ");
    			t6 = text(/*searchPageIndex*/ ctx[2]);
    			t7 = text("/");
    			t8 = text(t8_value);
    			add_location(br, file, 158, 16, 6209);
    			attr_dev(a0, "class", "kural-button");
    			add_location(a0, file, 160, 16, 6295);
    			attr_dev(a1, "class", "kural-button");
    			add_location(a1, file, 162, 16, 6477);
    			attr_dev(h3, "class", "tamil bold");
    			add_location(h3, file, 164, 16, 6592);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, br, anchor);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, a0, anchor);
    			insert_dev(target, t2, anchor);
    			insert_dev(target, a1, anchor);
    			insert_dev(target, t4, anchor);
    			insert_dev(target, h3, anchor);
    			append_dev(h3, t5);
    			append_dev(h3, t6);
    			append_dev(h3, t7);
    			append_dev(h3, t8);

    			if (!mounted) {
    				dispose = [
    					listen_dev(a0, "click", /*click_handler_4*/ ctx[16], false, false, false),
    					listen_dev(a1, "click", /*click_handler_5*/ ctx[17], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*searchPageIndex*/ 4) set_data_dev(t6, /*searchPageIndex*/ ctx[2]);
    			if (dirty & /*searchResults*/ 2 && t8_value !== (t8_value = Math.ceil(/*searchResults*/ ctx[1].length / 10) + "")) set_data_dev(t8, t8_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(br);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(a0);
    			if (detaching) detach_dev(t2);
    			if (detaching) detach_dev(a1);
    			if (detaching) detach_dev(t4);
    			if (detaching) detach_dev(h3);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(158:12) {:else}",
    		ctx
    	});

    	return block;
    }

    // (153:12) {#if searchResults.length == 0}
    function create_if_block_4(ctx) {
    	let div2;
    	let div0;
    	let t0;
    	let t1;
    	let t2;
    	let t3;
    	let div1;
    	let t4;
    	let t5;
    	let t6;

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			div0 = element("div");
    			t0 = text("\"");
    			t1 = text(/*searchQuery*/ ctx[4]);
    			t2 = text("\" என்னும் குறளை கண்டுபிடிக்க முடியவில்லை...");
    			t3 = space();
    			div1 = element("div");
    			t4 = text("Cannot find results for \"");
    			t5 = text(/*searchQuery*/ ctx[4]);
    			t6 = text("\"...");
    			attr_dev(div0, "class", "tamil");
    			add_location(div0, file, 154, 20, 5973);
    			attr_dev(div1, "class", "english");
    			add_location(div1, file, 155, 20, 6077);
    			attr_dev(div2, "class", "kural-box");
    			add_location(div2, file, 153, 16, 5928);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, div0);
    			append_dev(div0, t0);
    			append_dev(div0, t1);
    			append_dev(div0, t2);
    			append_dev(div2, t3);
    			append_dev(div2, div1);
    			append_dev(div1, t4);
    			append_dev(div1, t5);
    			append_dev(div1, t6);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*searchQuery*/ 16) set_data_dev(t1, /*searchQuery*/ ctx[4]);
    			if (dirty & /*searchQuery*/ 16) set_data_dev(t5, /*searchQuery*/ ctx[4]);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_4.name,
    		type: "if",
    		source: "(153:12) {#if searchResults.length == 0}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let div0;
    	let h1;
    	let t1;
    	let p0;
    	let t3;
    	let input;
    	let t4;
    	let p1;
    	let t6;
    	let div1;
    	let show_if;
    	let current_block_type_index;
    	let if_block;
    	let t7;
    	let footer;
    	let current;
    	let mounted;
    	let dispose;

    	const if_block_creators = [
    		create_if_block,
    		create_if_block_1,
    		create_if_block_2,
    		create_if_block_3,
    		create_else_block_1
    	];

    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*loaded*/ ctx[0].length == 0) return 0;
    		if (show_if == null || dirty & /*requestedKural*/ 32) show_if = !!/*withinKuralRange*/ ctx[6](/*requestedKural*/ ctx[5]);
    		if (show_if) return 1;
    		if (/*requestedKural*/ ctx[5]) return 2;
    		if (/*searchResults*/ ctx[1]) return 3;
    		return 4;
    	}

    	current_block_type_index = select_block_type(ctx, -1);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    	footer = new Footer({ $$inline: true });

    	const block = {
    		c: function create() {
    			div0 = element("div");
    			h1 = element("h1");
    			h1.textContent = "திருக்குறள்";
    			t1 = space();
    			p0 = element("p");
    			p0.textContent = "திருவள்ளுவரின் திருக்குறள் / Tiruvalluvar's Tirukkural";
    			t3 = space();
    			input = element("input");
    			t4 = space();
    			p1 = element("p");
    			p1.textContent = "தேட enter-ஐ அழுத்தவும் / Press enter to search.";
    			t6 = space();
    			div1 = element("div");
    			if_block.c();
    			t7 = space();
    			create_component(footer.$$.fragment);
    			add_location(h1, file, 92, 4, 3202);
    			add_location(p0, file, 93, 4, 3228);
    			attr_dev(input, "placeholder", "திருக்குறளைத் தேடுங்கள் / Search Tirukkural");
    			attr_dev(input, "id", "search");
    			add_location(input, file, 95, 4, 3297);
    			set_style(p1, "margin-top", "5px");
    			add_location(p1, file, 100, 4, 3511);
    			attr_dev(div0, "class", "cover");
    			attr_dev(div0, "id", "cover");
    			add_location(div0, file, 91, 0, 3166);
    			attr_dev(div1, "class", "content");
    			attr_dev(div1, "id", "content");
    			add_location(div1, file, 103, 0, 3602);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div0, anchor);
    			append_dev(div0, h1);
    			append_dev(div0, t1);
    			append_dev(div0, p0);
    			append_dev(div0, t3);
    			append_dev(div0, input);
    			append_dev(div0, t4);
    			append_dev(div0, p1);
    			insert_dev(target, t6, anchor);
    			insert_dev(target, div1, anchor);
    			if_blocks[current_block_type_index].m(div1, null);
    			insert_dev(target, t7, anchor);
    			mount_component(footer, target, anchor);
    			current = true;

    			if (!mounted) {
    				dispose = listen_dev(input, "keydown", /*keydown_handler*/ ctx[11], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx, dirty);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block = if_blocks[current_block_type_index];

    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				} else {
    					if_block.p(ctx, dirty);
    				}

    				transition_in(if_block, 1);
    				if_block.m(div1, null);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			transition_in(footer.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			transition_out(footer.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div0);
    			if (detaching) detach_dev(t6);
    			if (detaching) detach_dev(div1);
    			if_blocks[current_block_type_index].d();
    			if (detaching) detach_dev(t7);
    			destroy_component(footer, detaching);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    const englishLetterRegex = /^[A-Za-z]+$/;

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('App', slots, []);
    	const queries = new URLSearchParams(window.location.search);
    	const withinKuralRange = x => x > 0 && x <= 1330;
    	let loaded = [];
    	let searchResults = null;
    	let searchPageIndex = 1;
    	let mainKuralNumber = parseInt(localStorage.getItem('kural_no') || '0');
    	let searchQuery = queries.get('search');
    	let requestedKural = parseInt(queries.get('kural'));
    	requestedKural = isNaN(requestedKural) ? null : requestedKural;

    	String.prototype.toProperCase = function () {
    		return this.replace(/\w\S*/g, txt => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
    	};

    	function parseSearchQuery(query) {
    		if (!query?.length) return;
    		let intParsed = parseInt(query);
    		if (!isNaN(intParsed)) return $$invalidate(5, requestedKural = intParsed);
    		$$invalidate(5, requestedKural = null);
    		let results = [];
    		$$invalidate(4, searchQuery = query);

    		if (query.replace(' ', '').match(englishLetterRegex)) {
    			if (query.length < 5) return alert("Query must be atleast 5 characters long for search in english to prevent website crash.");
    			query = query.toProperCase();

    			for (let i = 0; i < loaded.length; i++) {
    				let kural = loaded[i];
    				if (kural.tlr.includes(query)) results.push({ kural, i });
    			}
    		} else if (query.length < 3) alert("இணையதள செயலிழப்பை தடுக்க வினவல் குறைந்தது 5 எழுத்துகள் நீளமாக இருக்க வேண்டும்.");

    		for (let i = 0; i < loaded.length; i++) {
    			let kural = loaded[i];
    			if (kural.li.includes(query)) results.push({ kural, i });
    		}

    		return $$invalidate(1, searchResults = results);
    	}

    	function updateMainKuralNumber(x, isIndex) {
    		console.log(mainKuralNumber);

    		if (isIndex) {
    			if (!withinKuralRange(x + 1)) return;
    			$$invalidate(3, mainKuralNumber = x);
    		} else {
    			if (!withinKuralRange(mainKuralNumber + 1)) return;
    			$$invalidate(3, mainKuralNumber = mainKuralNumber + x);
    		}

    		localStorage.setItem('kural_no', mainKuralNumber);
    	}

    	function resetConfig(n = null) {
    		$$invalidate(5, requestedKural = n);
    		$$invalidate(1, searchResults = null);
    		$$invalidate(2, searchPageIndex = 1);
    		$$invalidate(4, searchQuery = null);
    	}

    	function updateSearchPageIndex(x) {
    		if (searchResults?.length) {
    			let newIndex = searchPageIndex + x;
    			if (Math.ceil(searchResults.length / 10) < newIndex) $$invalidate(2, searchPageIndex = 1); else if (newIndex <= 0) $$invalidate(2, searchPageIndex = Math.ceil(searchResults.length / 10)); else $$invalidate(2, searchPageIndex = newIndex);
    		}
    	}

    	fetch(`${window.location.href}/tirukkural.json`).then(res => res.json()).then(body => {
    		$$invalidate(0, loaded = body);
    		parseSearchQuery(searchQuery);
    	});

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	const keydown_handler = e => {
    		if (e.key == "Enter") parseSearchQuery(document.getElementById('search').value);
    	};

    	const click_handler = () => {
    		updateMainKuralNumber(requestedKural - 1, true);
    		resetConfig();
    	};

    	const click_handler_1 = () => resetConfig();
    	const click_handler_2 = () => resetConfig();
    	const click_handler_3 = result => resetConfig(result.i + 1);
    	const click_handler_4 = () => updateSearchPageIndex(-1);
    	const click_handler_5 = () => updateSearchPageIndex(1);
    	const click_handler_6 = () => resetConfig();
    	const click_handler_7 = () => updateMainKuralNumber(-1);
    	const click_handler_8 = () => updateMainKuralNumber(1);

    	const request_handler = ({ detail }) => {
    		updateMainKuralNumber(detail.start - 1, true);
    		document.getElementById('content').scrollIntoView();
    	};

    	$$self.$capture_state = () => ({
    		Kural,
    		MiniKural,
    		Index,
    		Footer,
    		queries,
    		withinKuralRange,
    		englishLetterRegex,
    		loaded,
    		searchResults,
    		searchPageIndex,
    		mainKuralNumber,
    		searchQuery,
    		requestedKural,
    		parseSearchQuery,
    		updateMainKuralNumber,
    		resetConfig,
    		updateSearchPageIndex
    	});

    	$$self.$inject_state = $$props => {
    		if ('loaded' in $$props) $$invalidate(0, loaded = $$props.loaded);
    		if ('searchResults' in $$props) $$invalidate(1, searchResults = $$props.searchResults);
    		if ('searchPageIndex' in $$props) $$invalidate(2, searchPageIndex = $$props.searchPageIndex);
    		if ('mainKuralNumber' in $$props) $$invalidate(3, mainKuralNumber = $$props.mainKuralNumber);
    		if ('searchQuery' in $$props) $$invalidate(4, searchQuery = $$props.searchQuery);
    		if ('requestedKural' in $$props) $$invalidate(5, requestedKural = $$props.requestedKural);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		loaded,
    		searchResults,
    		searchPageIndex,
    		mainKuralNumber,
    		searchQuery,
    		requestedKural,
    		withinKuralRange,
    		parseSearchQuery,
    		updateMainKuralNumber,
    		resetConfig,
    		updateSearchPageIndex,
    		keydown_handler,
    		click_handler,
    		click_handler_1,
    		click_handler_2,
    		click_handler_3,
    		click_handler_4,
    		click_handler_5,
    		click_handler_6,
    		click_handler_7,
    		click_handler_8,
    		request_handler
    	];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    var main = new App({ target: document.body });

    return main;

})();
