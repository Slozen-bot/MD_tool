(() => {
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __commonJS = (cb, mod) => function __require() {
    try {
      return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
    } catch (e) {
      throw mod = 0, e;
    }
  };

  // node_modules/@tauri-apps/api/external/tslib/tslib.es6.cjs
  var require_tslib_es6 = __commonJS({
    "node_modules/@tauri-apps/api/external/tslib/tslib.es6.cjs"(exports) {
      "use strict";
      function __classPrivateFieldGet(receiver, state, kind, f) {
        if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
        if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
        return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
      }
      function __classPrivateFieldSet(receiver, state, value, kind, f) {
        if (kind === "m") throw new TypeError("Private method is not writable");
        if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
        if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
        return kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value), value;
      }
      exports.__classPrivateFieldGet = __classPrivateFieldGet;
      exports.__classPrivateFieldSet = __classPrivateFieldSet;
    }
  });

  // node_modules/@tauri-apps/api/core.cjs
  var require_core = __commonJS({
    "node_modules/@tauri-apps/api/core.cjs"(exports) {
      "use strict";
      var tslib_es6 = require_tslib_es6();
      var _Channel_onmessage;
      var _Channel_nextMessageIndex;
      var _Channel_pendingMessages;
      var _Channel_messageEndIndex;
      var _Resource_rid;
      var SERIALIZE_TO_IPC_FN = "__TAURI_TO_IPC_KEY__";
      function transformCallback(callback, once = false) {
        return window.__TAURI_INTERNALS__.transformCallback(callback, once);
      }
      var Channel = class {
        constructor(onmessage) {
          _Channel_onmessage.set(this, void 0);
          _Channel_nextMessageIndex.set(this, 0);
          _Channel_pendingMessages.set(this, []);
          _Channel_messageEndIndex.set(this, void 0);
          tslib_es6.__classPrivateFieldSet(this, _Channel_onmessage, onmessage || (() => {
          }), "f");
          this.id = transformCallback((rawMessage) => {
            const index = rawMessage.index;
            if ("end" in rawMessage) {
              if (index == tslib_es6.__classPrivateFieldGet(this, _Channel_nextMessageIndex, "f")) {
                this.cleanupCallback();
              } else {
                tslib_es6.__classPrivateFieldSet(this, _Channel_messageEndIndex, index, "f");
              }
              return;
            }
            const message = rawMessage.message;
            if (index == tslib_es6.__classPrivateFieldGet(this, _Channel_nextMessageIndex, "f")) {
              tslib_es6.__classPrivateFieldGet(this, _Channel_onmessage, "f").call(this, message);
              tslib_es6.__classPrivateFieldSet(this, _Channel_nextMessageIndex, tslib_es6.__classPrivateFieldGet(this, _Channel_nextMessageIndex, "f") + 1, "f");
              while (tslib_es6.__classPrivateFieldGet(this, _Channel_nextMessageIndex, "f") in tslib_es6.__classPrivateFieldGet(this, _Channel_pendingMessages, "f")) {
                const message2 = tslib_es6.__classPrivateFieldGet(this, _Channel_pendingMessages, "f")[tslib_es6.__classPrivateFieldGet(this, _Channel_nextMessageIndex, "f")];
                tslib_es6.__classPrivateFieldGet(this, _Channel_onmessage, "f").call(this, message2);
                delete tslib_es6.__classPrivateFieldGet(this, _Channel_pendingMessages, "f")[tslib_es6.__classPrivateFieldGet(this, _Channel_nextMessageIndex, "f")];
                tslib_es6.__classPrivateFieldSet(this, _Channel_nextMessageIndex, tslib_es6.__classPrivateFieldGet(this, _Channel_nextMessageIndex, "f") + 1, "f");
              }
              if (tslib_es6.__classPrivateFieldGet(this, _Channel_nextMessageIndex, "f") === tslib_es6.__classPrivateFieldGet(this, _Channel_messageEndIndex, "f")) {
                this.cleanupCallback();
              }
            } else {
              tslib_es6.__classPrivateFieldGet(this, _Channel_pendingMessages, "f")[index] = message;
            }
          });
        }
        cleanupCallback() {
          window.__TAURI_INTERNALS__.unregisterCallback(this.id);
        }
        set onmessage(handler) {
          tslib_es6.__classPrivateFieldSet(this, _Channel_onmessage, handler, "f");
        }
        get onmessage() {
          return tslib_es6.__classPrivateFieldGet(this, _Channel_onmessage, "f");
        }
        [(_Channel_onmessage = /* @__PURE__ */ new WeakMap(), _Channel_nextMessageIndex = /* @__PURE__ */ new WeakMap(), _Channel_pendingMessages = /* @__PURE__ */ new WeakMap(), _Channel_messageEndIndex = /* @__PURE__ */ new WeakMap(), SERIALIZE_TO_IPC_FN)]() {
          return `__CHANNEL__:${this.id}`;
        }
        toJSON() {
          return this[SERIALIZE_TO_IPC_FN]();
        }
      };
      var PluginListener = class {
        constructor(plugin, event, channelId) {
          this.plugin = plugin;
          this.event = event;
          this.channelId = channelId;
        }
        async unregister() {
          return invoke2(`plugin:${this.plugin}|remove_listener`, {
            event: this.event,
            channelId: this.channelId
          });
        }
      };
      async function addPluginListener(plugin, event, cb) {
        const handler = new Channel(cb);
        try {
          await invoke2(`plugin:${plugin}|register_listener`, {
            event,
            handler
          });
          return new PluginListener(plugin, event, handler.id);
        } catch {
          await invoke2(`plugin:${plugin}|registerListener`, { event, handler });
          return new PluginListener(plugin, event, handler.id);
        }
      }
      async function checkPermissions(plugin) {
        return invoke2(`plugin:${plugin}|check_permissions`);
      }
      async function requestPermissions(plugin) {
        return invoke2(`plugin:${plugin}|request_permissions`);
      }
      async function invoke2(cmd, args = {}, options) {
        return window.__TAURI_INTERNALS__.invoke(cmd, args, options);
      }
      function convertFileSrc(filePath, protocol = "asset") {
        return window.__TAURI_INTERNALS__.convertFileSrc(filePath, protocol);
      }
      var Resource = class {
        get rid() {
          return tslib_es6.__classPrivateFieldGet(this, _Resource_rid, "f");
        }
        constructor(rid) {
          _Resource_rid.set(this, void 0);
          tslib_es6.__classPrivateFieldSet(this, _Resource_rid, rid, "f");
        }
        /**
         * Destroys and cleans up this resource from memory.
         * **You should not call any method on this object anymore and should drop any reference to it.**
         */
        async close() {
          return invoke2("plugin:resources|close", {
            rid: this.rid
          });
        }
      };
      _Resource_rid = /* @__PURE__ */ new WeakMap();
      function isTauri() {
        return !!(globalThis || window).isTauri;
      }
      exports.Channel = Channel;
      exports.PluginListener = PluginListener;
      exports.Resource = Resource;
      exports.SERIALIZE_TO_IPC_FN = SERIALIZE_TO_IPC_FN;
      exports.addPluginListener = addPluginListener;
      exports.checkPermissions = checkPermissions;
      exports.convertFileSrc = convertFileSrc;
      exports.invoke = invoke2;
      exports.isTauri = isTauri;
      exports.requestPermissions = requestPermissions;
      exports.transformCallback = transformCallback;
    }
  });

  // node_modules/@tauri-apps/api/dpi.cjs
  var require_dpi = __commonJS({
    "node_modules/@tauri-apps/api/dpi.cjs"(exports) {
      "use strict";
      var core = require_core();
      var LogicalSize = class {
        constructor(...args) {
          this.type = "Logical";
          if (args.length === 1) {
            if ("Logical" in args[0]) {
              this.width = args[0].Logical.width;
              this.height = args[0].Logical.height;
            } else {
              this.width = args[0].width;
              this.height = args[0].height;
            }
          } else {
            this.width = args[0];
            this.height = args[1];
          }
        }
        /**
         * Converts the logical size to a physical one.
         * @example
         * ```typescript
         * import { LogicalSize } from '@tauri-apps/api/dpi';
         * import { getCurrentWindow } from '@tauri-apps/api/window';
         *
         * const appWindow = getCurrentWindow();
         * const factor = await appWindow.scaleFactor();
         * const size = new LogicalSize(400, 500);
         * const physical = size.toPhysical(factor);
         * ```
         *
         * @since 2.0.0
         */
        toPhysical(scaleFactor) {
          return new PhysicalSize(this.width * scaleFactor, this.height * scaleFactor);
        }
        [core.SERIALIZE_TO_IPC_FN]() {
          return {
            width: this.width,
            height: this.height
          };
        }
        toJSON() {
          return this[core.SERIALIZE_TO_IPC_FN]();
        }
      };
      var PhysicalSize = class {
        constructor(...args) {
          this.type = "Physical";
          if (args.length === 1) {
            if ("Physical" in args[0]) {
              this.width = args[0].Physical.width;
              this.height = args[0].Physical.height;
            } else {
              this.width = args[0].width;
              this.height = args[0].height;
            }
          } else {
            this.width = args[0];
            this.height = args[1];
          }
        }
        /**
         * Converts the physical size to a logical one.
         * @example
         * ```typescript
         * import { getCurrentWindow } from '@tauri-apps/api/window';
         * const appWindow = getCurrentWindow();
         * const factor = await appWindow.scaleFactor();
         * const size = await appWindow.innerSize(); // PhysicalSize
         * const logical = size.toLogical(factor);
         * ```
         */
        toLogical(scaleFactor) {
          return new LogicalSize(this.width / scaleFactor, this.height / scaleFactor);
        }
        [core.SERIALIZE_TO_IPC_FN]() {
          return {
            width: this.width,
            height: this.height
          };
        }
        toJSON() {
          return this[core.SERIALIZE_TO_IPC_FN]();
        }
      };
      var Size = class {
        constructor(size) {
          this.size = size;
        }
        toLogical(scaleFactor) {
          return this.size instanceof LogicalSize ? this.size : this.size.toLogical(scaleFactor);
        }
        toPhysical(scaleFactor) {
          return this.size instanceof PhysicalSize ? this.size : this.size.toPhysical(scaleFactor);
        }
        [core.SERIALIZE_TO_IPC_FN]() {
          return {
            [`${this.size.type}`]: {
              width: this.size.width,
              height: this.size.height
            }
          };
        }
        toJSON() {
          return this[core.SERIALIZE_TO_IPC_FN]();
        }
      };
      var LogicalPosition = class {
        constructor(...args) {
          this.type = "Logical";
          if (args.length === 1) {
            if ("Logical" in args[0]) {
              this.x = args[0].Logical.x;
              this.y = args[0].Logical.y;
            } else {
              this.x = args[0].x;
              this.y = args[0].y;
            }
          } else {
            this.x = args[0];
            this.y = args[1];
          }
        }
        /**
         * Converts the logical position to a physical one.
         * @example
         * ```typescript
         * import { LogicalPosition } from '@tauri-apps/api/dpi';
         * import { getCurrentWindow } from '@tauri-apps/api/window';
         *
         * const appWindow = getCurrentWindow();
         * const factor = await appWindow.scaleFactor();
         * const position = new LogicalPosition(400, 500);
         * const physical = position.toPhysical(factor);
         * ```
         *
         * @since 2.0.0
         */
        toPhysical(scaleFactor) {
          return new PhysicalPosition(this.x * scaleFactor, this.y * scaleFactor);
        }
        [core.SERIALIZE_TO_IPC_FN]() {
          return {
            x: this.x,
            y: this.y
          };
        }
        toJSON() {
          return this[core.SERIALIZE_TO_IPC_FN]();
        }
      };
      var PhysicalPosition = class {
        constructor(...args) {
          this.type = "Physical";
          if (args.length === 1) {
            if ("Physical" in args[0]) {
              this.x = args[0].Physical.x;
              this.y = args[0].Physical.y;
            } else {
              this.x = args[0].x;
              this.y = args[0].y;
            }
          } else {
            this.x = args[0];
            this.y = args[1];
          }
        }
        /**
         * Converts the physical position to a logical one.
         * @example
         * ```typescript
         * import { PhysicalPosition } from '@tauri-apps/api/dpi';
         * import { getCurrentWindow } from '@tauri-apps/api/window';
         *
         * const appWindow = getCurrentWindow();
         * const factor = await appWindow.scaleFactor();
         * const position = new PhysicalPosition(400, 500);
         * const physical = position.toLogical(factor);
         * ```
         *
         * @since 2.0.0
         */
        toLogical(scaleFactor) {
          return new LogicalPosition(this.x / scaleFactor, this.y / scaleFactor);
        }
        [core.SERIALIZE_TO_IPC_FN]() {
          return {
            x: this.x,
            y: this.y
          };
        }
        toJSON() {
          return this[core.SERIALIZE_TO_IPC_FN]();
        }
      };
      var Position = class {
        constructor(position) {
          this.position = position;
        }
        toLogical(scaleFactor) {
          return this.position instanceof LogicalPosition ? this.position : this.position.toLogical(scaleFactor);
        }
        toPhysical(scaleFactor) {
          return this.position instanceof PhysicalPosition ? this.position : this.position.toPhysical(scaleFactor);
        }
        [core.SERIALIZE_TO_IPC_FN]() {
          return {
            [`${this.position.type}`]: {
              x: this.position.x,
              y: this.position.y
            }
          };
        }
        toJSON() {
          return this[core.SERIALIZE_TO_IPC_FN]();
        }
      };
      exports.LogicalPosition = LogicalPosition;
      exports.LogicalSize = LogicalSize;
      exports.PhysicalPosition = PhysicalPosition;
      exports.PhysicalSize = PhysicalSize;
      exports.Position = Position;
      exports.Size = Size;
    }
  });

  // node_modules/@tauri-apps/api/event.cjs
  var require_event = __commonJS({
    "node_modules/@tauri-apps/api/event.cjs"(exports) {
      "use strict";
      var core = require_core();
      exports.TauriEvent = void 0;
      (function(TauriEvent) {
        TauriEvent["WINDOW_RESIZED"] = "tauri://resize";
        TauriEvent["WINDOW_MOVED"] = "tauri://move";
        TauriEvent["WINDOW_CLOSE_REQUESTED"] = "tauri://close-requested";
        TauriEvent["WINDOW_DESTROYED"] = "tauri://destroyed";
        TauriEvent["WINDOW_FOCUS"] = "tauri://focus";
        TauriEvent["WINDOW_BLUR"] = "tauri://blur";
        TauriEvent["WINDOW_SCALE_FACTOR_CHANGED"] = "tauri://scale-change";
        TauriEvent["WINDOW_THEME_CHANGED"] = "tauri://theme-changed";
        TauriEvent["WINDOW_CREATED"] = "tauri://window-created";
        TauriEvent["WEBVIEW_CREATED"] = "tauri://webview-created";
        TauriEvent["DRAG_ENTER"] = "tauri://drag-enter";
        TauriEvent["DRAG_OVER"] = "tauri://drag-over";
        TauriEvent["DRAG_DROP"] = "tauri://drag-drop";
        TauriEvent["DRAG_LEAVE"] = "tauri://drag-leave";
      })(exports.TauriEvent || (exports.TauriEvent = {}));
      async function _unlisten(event, eventId) {
        window.__TAURI_EVENT_PLUGIN_INTERNALS__.unregisterListener(event, eventId);
        await core.invoke("plugin:event|unlisten", {
          event,
          eventId
        });
      }
      async function listen(event, handler, options) {
        var _a;
        const target = typeof (options === null || options === void 0 ? void 0 : options.target) === "string" ? { kind: "AnyLabel", label: options.target } : (_a = options === null || options === void 0 ? void 0 : options.target) !== null && _a !== void 0 ? _a : { kind: "Any" };
        return core.invoke("plugin:event|listen", {
          event,
          target,
          handler: core.transformCallback(handler)
        }).then((eventId) => {
          return async () => _unlisten(event, eventId);
        });
      }
      async function once(event, handler, options) {
        return listen(event, (eventData) => {
          void _unlisten(event, eventData.id);
          handler(eventData);
        }, options);
      }
      async function emit(event, payload) {
        await core.invoke("plugin:event|emit", {
          event,
          payload
        });
      }
      async function emitTo(target, event, payload) {
        const eventTarget = typeof target === "string" ? { kind: "AnyLabel", label: target } : target;
        await core.invoke("plugin:event|emit_to", {
          target: eventTarget,
          event,
          payload
        });
      }
      exports.emit = emit;
      exports.emitTo = emitTo;
      exports.listen = listen;
      exports.once = once;
    }
  });

  // node_modules/@tauri-apps/api/image.cjs
  var require_image = __commonJS({
    "node_modules/@tauri-apps/api/image.cjs"(exports) {
      "use strict";
      var core = require_core();
      var Image = class _Image extends core.Resource {
        /**
         * Creates an Image from a resource ID. For internal use only.
         *
         * @ignore
         */
        constructor(rid) {
          super(rid);
        }
        /** Creates a new Image using RGBA data, in row-major order from top to bottom, and with specified width and height. */
        static async new(rgba, width, height) {
          return core.invoke("plugin:image|new", {
            rgba: transformImage(rgba),
            width,
            height
          }).then((rid) => new _Image(rid));
        }
        /**
         * Creates a new image using the provided bytes by inferring the file format.
         * If the format is known, prefer [@link Image.fromPngBytes] or [@link Image.fromIcoBytes].
         *
         * Only `ico` and `png` are supported (based on activated feature flag).
         *
         * Note that you need the `image-ico` or `image-png` Cargo features to use this API.
         * To enable it, change your Cargo.toml file:
         * ```toml
         * [dependencies]
         * tauri = { version = "...", features = ["...", "image-png"] }
         * ```
         */
        static async fromBytes(bytes) {
          return core.invoke("plugin:image|from_bytes", {
            bytes: transformImage(bytes)
          }).then((rid) => new _Image(rid));
        }
        /**
         * Creates a new image using the provided path.
         *
         * Only `ico` and `png` are supported (based on activated feature flag).
         *
         * Note that you need the `image-ico` or `image-png` Cargo features to use this API.
         * To enable it, change your Cargo.toml file:
         * ```toml
         * [dependencies]
         * tauri = { version = "...", features = ["...", "image-png"] }
         * ```
         */
        static async fromPath(path) {
          return core.invoke("plugin:image|from_path", { path }).then((rid) => new _Image(rid));
        }
        /** Returns the RGBA data for this image, in row-major order from top to bottom.  */
        async rgba() {
          return core.invoke("plugin:image|rgba", {
            rid: this.rid
          }).then((buffer) => new Uint8Array(buffer));
        }
        /** Returns the size of this image.  */
        async size() {
          return core.invoke("plugin:image|size", { rid: this.rid });
        }
      };
      function transformImage(image) {
        const ret = image == null ? null : typeof image === "string" ? image : image instanceof Image ? image.rid : image;
        return ret;
      }
      exports.Image = Image;
      exports.transformImage = transformImage;
    }
  });

  // node_modules/@tauri-apps/api/window.cjs
  var require_window = __commonJS({
    "node_modules/@tauri-apps/api/window.cjs"(exports) {
      "use strict";
      var dpi = require_dpi();
      var event = require_event();
      var core = require_core();
      var image = require_image();
      exports.UserAttentionType = void 0;
      (function(UserAttentionType) {
        UserAttentionType[UserAttentionType["Critical"] = 1] = "Critical";
        UserAttentionType[UserAttentionType["Informational"] = 2] = "Informational";
      })(exports.UserAttentionType || (exports.UserAttentionType = {}));
      var CloseRequestedEvent = class {
        constructor(event2) {
          this._preventDefault = false;
          this.event = event2.event;
          this.id = event2.id;
        }
        preventDefault() {
          this._preventDefault = true;
        }
        isPreventDefault() {
          return this._preventDefault;
        }
      };
      exports.ProgressBarStatus = void 0;
      (function(ProgressBarStatus) {
        ProgressBarStatus["None"] = "none";
        ProgressBarStatus["Normal"] = "normal";
        ProgressBarStatus["Indeterminate"] = "indeterminate";
        ProgressBarStatus["Paused"] = "paused";
        ProgressBarStatus["Error"] = "error";
      })(exports.ProgressBarStatus || (exports.ProgressBarStatus = {}));
      function getCurrentWindow2() {
        return new Window(window.__TAURI_INTERNALS__.metadata.currentWindow.label, {
          // @ts-expect-error `skip` is not defined in the public API but it is handled by the constructor
          skip: true
        });
      }
      async function getAllWindows() {
        return core.invoke("plugin:window|get_all_windows").then((windows) => windows.map((w) => new Window(w, {
          // @ts-expect-error `skip` is not defined in the public API but it is handled by the constructor
          skip: true
        })));
      }
      var localTauriEvents = ["tauri://created", "tauri://error"];
      var Window = class {
        /**
         * Creates a new Window.
         * @example
         * ```typescript
         * import { Window } from '@tauri-apps/api/window';
         * const appWindow = new Window('my-label');
         * appWindow.once('tauri://created', function () {
         *  // window successfully created
         * });
         * appWindow.once('tauri://error', function (e) {
         *  // an error happened creating the window
         * });
         * ```
         *
         * @param label The unique window label. Must be alphanumeric: `a-zA-Z-/:_`.
         * @returns The {@link Window} instance to communicate with the window.
         */
        constructor(label, options = {}) {
          var _a;
          this.label = label;
          this.listeners = /* @__PURE__ */ Object.create(null);
          if (!(options === null || options === void 0 ? void 0 : options.skip)) {
            core.invoke("plugin:window|create", {
              options: {
                ...options,
                parent: typeof options.parent === "string" ? options.parent : (_a = options.parent) === null || _a === void 0 ? void 0 : _a.label,
                label
              }
            }).then(async () => this.emit("tauri://created")).catch(async (e) => this.emit("tauri://error", e));
          }
        }
        /**
         * Gets the Window associated with the given label.
         * @example
         * ```typescript
         * import { Window } from '@tauri-apps/api/window';
         * const mainWindow = Window.getByLabel('main');
         * ```
         *
         * @param label The window label.
         * @returns The Window instance to communicate with the window or null if the window doesn't exist.
         */
        static async getByLabel(label) {
          var _a;
          return (_a = (await getAllWindows()).find((w) => w.label === label)) !== null && _a !== void 0 ? _a : null;
        }
        /**
         * Get an instance of `Window` for the current window.
         */
        static getCurrent() {
          return getCurrentWindow2();
        }
        /**
         * Gets a list of instances of `Window` for all available windows.
         */
        static async getAll() {
          return getAllWindows();
        }
        /**
         *  Gets the focused window.
         * @example
         * ```typescript
         * import { Window } from '@tauri-apps/api/window';
         * const focusedWindow = Window.getFocusedWindow();
         * ```
         *
         * @returns The Window instance or `undefined` if there is not any focused window.
         */
        static async getFocusedWindow() {
          for (const w of await getAllWindows()) {
            if (await w.isFocused()) {
              return w;
            }
          }
          return null;
        }
        /**
         * Listen to an emitted event on this window.
         *
         * @example
         * ```typescript
         * import { getCurrentWindow } from '@tauri-apps/api/window';
         * const unlisten = await getCurrentWindow().listen<string>('state-changed', (event) => {
         *   console.log(`Got error: ${payload}`);
         * });
         *
         * // you need to call unlisten if your handler goes out of scope e.g. the component is unmounted
         * unlisten();
         * ```
         *
         * @param event Event name. Must include only alphanumeric characters, `-`, `/`, `:` and `_`.
         * @param handler Event handler.
         * @returns A promise resolving to a function to unlisten to the event.
         * Note that removing the listener is required if your listener goes out of scope e.g. the component is unmounted.
         */
        async listen(event$1, handler) {
          if (this._handleTauriEvent(event$1, handler)) {
            return () => {
              const listeners = this.listeners[event$1];
              listeners.splice(listeners.indexOf(handler), 1);
            };
          }
          return event.listen(event$1, handler, {
            target: { kind: "Window", label: this.label }
          });
        }
        /**
         * Listen to an emitted event on this window only once.
         *
         * @example
         * ```typescript
         * import { getCurrentWindow } from '@tauri-apps/api/window';
         * const unlisten = await getCurrentWindow().once<null>('initialized', (event) => {
         *   console.log(`Window initialized!`);
         * });
         *
         * // you need to call unlisten if your handler goes out of scope e.g. the component is unmounted
         * unlisten();
         * ```
         *
         * @param event Event name. Must include only alphanumeric characters, `-`, `/`, `:` and `_`.
         * @param handler Event handler.
         * @returns A promise resolving to a function to unlisten to the event.
         * Note that removing the listener is required if your listener goes out of scope e.g. the component is unmounted.
         */
        async once(event$1, handler) {
          if (this._handleTauriEvent(event$1, handler)) {
            return () => {
              const listeners = this.listeners[event$1];
              listeners.splice(listeners.indexOf(handler), 1);
            };
          }
          return event.once(event$1, handler, {
            target: { kind: "Window", label: this.label }
          });
        }
        /**
         * Emits an event to all {@link EventTarget|targets}.
         * @example
         * ```typescript
         * import { getCurrentWindow } from '@tauri-apps/api/window';
         * await getCurrentWindow().emit('window-loaded', { loggedIn: true, token: 'authToken' });
         * ```
         *
         * @param event Event name. Must include only alphanumeric characters, `-`, `/`, `:` and `_`.
         * @param payload Event payload.
         */
        async emit(event$1, payload) {
          if (localTauriEvents.includes(event$1)) {
            for (const handler of this.listeners[event$1] || []) {
              handler({
                event: event$1,
                id: -1,
                payload
              });
            }
            return;
          }
          return event.emit(event$1, payload);
        }
        /**
         * Emits an event to all {@link EventTarget|targets} matching the given target.
         *
         * @example
         * ```typescript
         * import { getCurrentWindow } from '@tauri-apps/api/window';
         * await getCurrentWindow().emit('main', 'window-loaded', { loggedIn: true, token: 'authToken' });
         * ```
         * @param target Label of the target Window/Webview/WebviewWindow or raw {@link EventTarget} object.
         * @param event Event name. Must include only alphanumeric characters, `-`, `/`, `:` and `_`.
         * @param payload Event payload.
         */
        async emitTo(target, event$1, payload) {
          if (localTauriEvents.includes(event$1)) {
            for (const handler of this.listeners[event$1] || []) {
              handler({
                event: event$1,
                id: -1,
                payload
              });
            }
            return;
          }
          return event.emitTo(target, event$1, payload);
        }
        /** @ignore */
        _handleTauriEvent(event2, handler) {
          if (localTauriEvents.includes(event2)) {
            if (!(event2 in this.listeners)) {
              this.listeners[event2] = [handler];
            } else {
              this.listeners[event2].push(handler);
            }
            return true;
          }
          return false;
        }
        // Getters
        /**
         * The scale factor that can be used to map physical pixels to logical pixels.
         * @example
         * ```typescript
         * import { getCurrentWindow } from '@tauri-apps/api/window';
         * const factor = await getCurrentWindow().scaleFactor();
         * ```
         *
         * @returns The window's monitor scale factor.
         */
        async scaleFactor() {
          return core.invoke("plugin:window|scale_factor", {
            label: this.label
          });
        }
        /**
         * The position of the top-left hand corner of the window's client area relative to the top-left hand corner of the desktop.
         * @example
         * ```typescript
         * import { getCurrentWindow } from '@tauri-apps/api/window';
         * const position = await getCurrentWindow().innerPosition();
         * ```
         *
         * @returns The window's inner position.
         */
        async innerPosition() {
          return core.invoke("plugin:window|inner_position", {
            label: this.label
          }).then((p) => new dpi.PhysicalPosition(p));
        }
        /**
         * The position of the top-left hand corner of the window relative to the top-left hand corner of the desktop.
         * @example
         * ```typescript
         * import { getCurrentWindow } from '@tauri-apps/api/window';
         * const position = await getCurrentWindow().outerPosition();
         * ```
         *
         * @returns The window's outer position.
         */
        async outerPosition() {
          return core.invoke("plugin:window|outer_position", {
            label: this.label
          }).then((p) => new dpi.PhysicalPosition(p));
        }
        /**
         * The physical size of the window's client area.
         * The client area is the content of the window, excluding the title bar and borders.
         * @example
         * ```typescript
         * import { getCurrentWindow } from '@tauri-apps/api/window';
         * const size = await getCurrentWindow().innerSize();
         * ```
         *
         * @returns The window's inner size.
         */
        async innerSize() {
          return core.invoke("plugin:window|inner_size", {
            label: this.label
          }).then((s) => new dpi.PhysicalSize(s));
        }
        /**
         * The physical size of the entire window.
         * These dimensions include the title bar and borders. If you don't want that (and you usually don't), use inner_size instead.
         * @example
         * ```typescript
         * import { getCurrentWindow } from '@tauri-apps/api/window';
         * const size = await getCurrentWindow().outerSize();
         * ```
         *
         * @returns The window's outer size.
         */
        async outerSize() {
          return core.invoke("plugin:window|outer_size", {
            label: this.label
          }).then((s) => new dpi.PhysicalSize(s));
        }
        /**
         * Gets the window's current fullscreen state.
         * @example
         * ```typescript
         * import { getCurrentWindow } from '@tauri-apps/api/window';
         * const fullscreen = await getCurrentWindow().isFullscreen();
         * ```
         *
         * @returns Whether the window is in fullscreen mode or not.
         */
        async isFullscreen() {
          return core.invoke("plugin:window|is_fullscreen", {
            label: this.label
          });
        }
        /**
         * Gets the window's current minimized state.
         * @example
         * ```typescript
         * import { getCurrentWindow } from '@tauri-apps/api/window';
         * const minimized = await getCurrentWindow().isMinimized();
         * ```
         */
        async isMinimized() {
          return core.invoke("plugin:window|is_minimized", {
            label: this.label
          });
        }
        /**
         * Gets the window's current maximized state.
         * @example
         * ```typescript
         * import { getCurrentWindow } from '@tauri-apps/api/window';
         * const maximized = await getCurrentWindow().isMaximized();
         * ```
         *
         * @returns Whether the window is maximized or not.
         */
        async isMaximized() {
          return core.invoke("plugin:window|is_maximized", {
            label: this.label
          });
        }
        /**
         * Gets the window's current focus state.
         * @example
         * ```typescript
         * import { getCurrentWindow } from '@tauri-apps/api/window';
         * const focused = await getCurrentWindow().isFocused();
         * ```
         *
         * @returns Whether the window is focused or not.
         */
        async isFocused() {
          return core.invoke("plugin:window|is_focused", {
            label: this.label
          });
        }
        /**
         * Gets the window's current decorated state.
         * @example
         * ```typescript
         * import { getCurrentWindow } from '@tauri-apps/api/window';
         * const decorated = await getCurrentWindow().isDecorated();
         * ```
         *
         * @returns Whether the window is decorated or not.
         */
        async isDecorated() {
          return core.invoke("plugin:window|is_decorated", {
            label: this.label
          });
        }
        /**
         * Gets the window's current resizable state.
         * @example
         * ```typescript
         * import { getCurrentWindow } from '@tauri-apps/api/window';
         * const resizable = await getCurrentWindow().isResizable();
         * ```
         *
         * @returns Whether the window is resizable or not.
         */
        async isResizable() {
          return core.invoke("plugin:window|is_resizable", {
            label: this.label
          });
        }
        /**
         * Gets the window's native maximize button state.
         *
         * #### Platform-specific
         *
         * - **Linux / iOS / Android:** Unsupported.
         *
         * @example
         * ```typescript
         * import { getCurrentWindow } from '@tauri-apps/api/window';
         * const maximizable = await getCurrentWindow().isMaximizable();
         * ```
         *
         * @returns Whether the window's native maximize button is enabled or not.
         */
        async isMaximizable() {
          return core.invoke("plugin:window|is_maximizable", {
            label: this.label
          });
        }
        /**
         * Gets the window's native minimize button state.
         *
         * #### Platform-specific
         *
         * - **Linux / iOS / Android:** Unsupported.
         *
         * @example
         * ```typescript
         * import { getCurrentWindow } from '@tauri-apps/api/window';
         * const minimizable = await getCurrentWindow().isMinimizable();
         * ```
         *
         * @returns Whether the window's native minimize button is enabled or not.
         */
        async isMinimizable() {
          return core.invoke("plugin:window|is_minimizable", {
            label: this.label
          });
        }
        /**
         * Gets the window's native close button state.
         *
         * #### Platform-specific
         *
         * - **iOS / Android:** Unsupported.
         *
         * @example
         * ```typescript
         * import { getCurrentWindow } from '@tauri-apps/api/window';
         * const closable = await getCurrentWindow().isClosable();
         * ```
         *
         * @returns Whether the window's native close button is enabled or not.
         */
        async isClosable() {
          return core.invoke("plugin:window|is_closable", {
            label: this.label
          });
        }
        /**
         * Gets the window's current visible state.
         * @example
         * ```typescript
         * import { getCurrentWindow } from '@tauri-apps/api/window';
         * const visible = await getCurrentWindow().isVisible();
         * ```
         *
         * @returns Whether the window is visible or not.
         */
        async isVisible() {
          return core.invoke("plugin:window|is_visible", {
            label: this.label
          });
        }
        /**
         * Gets the window's current title.
         * @example
         * ```typescript
         * import { getCurrentWindow } from '@tauri-apps/api/window';
         * const title = await getCurrentWindow().title();
         * ```
         */
        async title() {
          return core.invoke("plugin:window|title", {
            label: this.label
          });
        }
        /**
         * Gets the window's current theme.
         *
         * #### Platform-specific
         *
         * - **macOS:** Theme was introduced on macOS 10.14. Returns `light` on macOS 10.13 and below.
         *
         * @example
         * ```typescript
         * import { getCurrentWindow } from '@tauri-apps/api/window';
         * const theme = await getCurrentWindow().theme();
         * ```
         *
         * @returns The window theme.
         */
        async theme() {
          return core.invoke("plugin:window|theme", {
            label: this.label
          });
        }
        /**
         * Whether the window is configured to be always on top of other windows or not.
         * @example
         * ```typescript
         * import { getCurrentWindow } from '@tauri-apps/api/window';
         * const alwaysOnTop = await getCurrentWindow().isAlwaysOnTop();
         * ```
         *
         * @returns Whether the window is visible or not.
         */
        async isAlwaysOnTop() {
          return core.invoke("plugin:window|is_always_on_top", {
            label: this.label
          });
        }
        // Setters
        /**
         * Centers the window.
         * @example
         * ```typescript
         * import { getCurrentWindow } from '@tauri-apps/api/window';
         * await getCurrentWindow().center();
         * ```
         *
         * @returns A promise indicating the success or failure of the operation.
         */
        async center() {
          return core.invoke("plugin:window|center", {
            label: this.label
          });
        }
        /**
         *  Requests user attention to the window, this has no effect if the application
         * is already focused. How requesting for user attention manifests is platform dependent,
         * see `UserAttentionType` for details.
         *
         * Providing `null` will unset the request for user attention. Unsetting the request for
         * user attention might not be done automatically by the WM when the window receives input.
         *
         * #### Platform-specific
         *
         * - **macOS:** `null` has no effect.
         * - **Linux:** Urgency levels have the same effect.
         * @example
         * ```typescript
         * import { getCurrentWindow } from '@tauri-apps/api/window';
         * await getCurrentWindow().requestUserAttention();
         * ```
         *
         * @returns A promise indicating the success or failure of the operation.
         */
        async requestUserAttention(requestType) {
          let requestType_ = null;
          if (requestType) {
            if (requestType === exports.UserAttentionType.Critical) {
              requestType_ = { type: "Critical" };
            } else {
              requestType_ = { type: "Informational" };
            }
          }
          return core.invoke("plugin:window|request_user_attention", {
            label: this.label,
            value: requestType_
          });
        }
        /**
         * Updates the window resizable flag.
         * @example
         * ```typescript
         * import { getCurrentWindow } from '@tauri-apps/api/window';
         * await getCurrentWindow().setResizable(false);
         * ```
         *
         * @returns A promise indicating the success or failure of the operation.
         */
        async setResizable(resizable) {
          return core.invoke("plugin:window|set_resizable", {
            label: this.label,
            value: resizable
          });
        }
        /**
         * Enable or disable the window.
         * @example
         * ```typescript
         * import { getCurrentWindow } from '@tauri-apps/api/window';
         * await getCurrentWindow().setEnabled(false);
         * ```
         *
         * @returns A promise indicating the success or failure of the operation.
         *
         * @since 2.0.0
         */
        async setEnabled(enabled) {
          return core.invoke("plugin:window|set_enabled", {
            label: this.label,
            value: enabled
          });
        }
        /**
         * Whether the window is enabled or disabled.
         * @example
         * ```typescript
         * import { getCurrentWindow } from '@tauri-apps/api/window';
         * await getCurrentWindow().setEnabled(false);
         * ```
         *
         * @returns A promise indicating the success or failure of the operation.
         *
         * @since 2.0.0
         */
        async isEnabled() {
          return core.invoke("plugin:window|is_enabled", {
            label: this.label
          });
        }
        /**
         * Sets whether the window's native maximize button is enabled or not.
         * If resizable is set to false, this setting is ignored.
         *
         * #### Platform-specific
         *
         * - **macOS:** Disables the "zoom" button in the window titlebar, which is also used to enter fullscreen mode.
         * - **Linux / iOS / Android:** Unsupported.
         *
         * @example
         * ```typescript
         * import { getCurrentWindow } from '@tauri-apps/api/window';
         * await getCurrentWindow().setMaximizable(false);
         * ```
         *
         * @returns A promise indicating the success or failure of the operation.
         */
        async setMaximizable(maximizable) {
          return core.invoke("plugin:window|set_maximizable", {
            label: this.label,
            value: maximizable
          });
        }
        /**
         * Sets whether the window's native minimize button is enabled or not.
         *
         * #### Platform-specific
         *
         * - **Linux / iOS / Android:** Unsupported.
         *
         * @example
         * ```typescript
         * import { getCurrentWindow } from '@tauri-apps/api/window';
         * await getCurrentWindow().setMinimizable(false);
         * ```
         *
         * @returns A promise indicating the success or failure of the operation.
         */
        async setMinimizable(minimizable) {
          return core.invoke("plugin:window|set_minimizable", {
            label: this.label,
            value: minimizable
          });
        }
        /**
         * Sets whether the window's native close button is enabled or not.
         *
         * #### Platform-specific
         *
         * - **Linux:** GTK+ will do its best to convince the window manager not to show a close button. Depending on the system, this function may not have any effect when called on a window that is already visible
         * - **iOS / Android:** Unsupported.
         *
         * @example
         * ```typescript
         * import { getCurrentWindow } from '@tauri-apps/api/window';
         * await getCurrentWindow().setClosable(false);
         * ```
         *
         * @returns A promise indicating the success or failure of the operation.
         */
        async setClosable(closable) {
          return core.invoke("plugin:window|set_closable", {
            label: this.label,
            value: closable
          });
        }
        /**
         * Sets the window title.
         * @example
         * ```typescript
         * import { getCurrentWindow } from '@tauri-apps/api/window';
         * await getCurrentWindow().setTitle('Tauri');
         * ```
         *
         * @param title The new title
         * @returns A promise indicating the success or failure of the operation.
         */
        async setTitle(title) {
          return core.invoke("plugin:window|set_title", {
            label: this.label,
            value: title
          });
        }
        /**
         * Maximizes the window.
         * @example
         * ```typescript
         * import { getCurrentWindow } from '@tauri-apps/api/window';
         * await getCurrentWindow().maximize();
         * ```
         *
         * @returns A promise indicating the success or failure of the operation.
         */
        async maximize() {
          return core.invoke("plugin:window|maximize", {
            label: this.label
          });
        }
        /**
         * Unmaximizes the window.
         * @example
         * ```typescript
         * import { getCurrentWindow } from '@tauri-apps/api/window';
         * await getCurrentWindow().unmaximize();
         * ```
         *
         * @returns A promise indicating the success or failure of the operation.
         */
        async unmaximize() {
          return core.invoke("plugin:window|unmaximize", {
            label: this.label
          });
        }
        /**
         * Toggles the window maximized state.
         * @example
         * ```typescript
         * import { getCurrentWindow } from '@tauri-apps/api/window';
         * await getCurrentWindow().toggleMaximize();
         * ```
         *
         * @returns A promise indicating the success or failure of the operation.
         */
        async toggleMaximize() {
          return core.invoke("plugin:window|toggle_maximize", {
            label: this.label
          });
        }
        /**
         * Minimizes the window.
         * @example
         * ```typescript
         * import { getCurrentWindow } from '@tauri-apps/api/window';
         * await getCurrentWindow().minimize();
         * ```
         *
         * @returns A promise indicating the success or failure of the operation.
         */
        async minimize() {
          return core.invoke("plugin:window|minimize", {
            label: this.label
          });
        }
        /**
         * Unminimizes the window.
         * @example
         * ```typescript
         * import { getCurrentWindow } from '@tauri-apps/api/window';
         * await getCurrentWindow().unminimize();
         * ```
         *
         * @returns A promise indicating the success or failure of the operation.
         */
        async unminimize() {
          return core.invoke("plugin:window|unminimize", {
            label: this.label
          });
        }
        /**
         * Sets the window visibility to true.
         * @example
         * ```typescript
         * import { getCurrentWindow } from '@tauri-apps/api/window';
         * await getCurrentWindow().show();
         * ```
         *
         * @returns A promise indicating the success or failure of the operation.
         */
        async show() {
          return core.invoke("plugin:window|show", {
            label: this.label
          });
        }
        /**
         * Sets the window visibility to false.
         * @example
         * ```typescript
         * import { getCurrentWindow } from '@tauri-apps/api/window';
         * await getCurrentWindow().hide();
         * ```
         *
         * @returns A promise indicating the success or failure of the operation.
         */
        async hide() {
          return core.invoke("plugin:window|hide", {
            label: this.label
          });
        }
        /**
         * Closes the window.
         *
         * Note this emits a closeRequested event so you can intercept it. To force window close, use {@link Window.destroy}.
         * @example
         * ```typescript
         * import { getCurrentWindow } from '@tauri-apps/api/window';
         * await getCurrentWindow().close();
         * ```
         *
         * @returns A promise indicating the success or failure of the operation.
         */
        async close() {
          return core.invoke("plugin:window|close", {
            label: this.label
          });
        }
        /**
         * Destroys the window. Behaves like {@link Window.close} but forces the window close instead of emitting a closeRequested event.
         * @example
         * ```typescript
         * import { getCurrentWindow } from '@tauri-apps/api/window';
         * await getCurrentWindow().destroy();
         * ```
         *
         * @returns A promise indicating the success or failure of the operation.
         */
        async destroy() {
          return core.invoke("plugin:window|destroy", {
            label: this.label
          });
        }
        /**
         * Whether the window should have borders and bars.
         * @example
         * ```typescript
         * import { getCurrentWindow } from '@tauri-apps/api/window';
         * await getCurrentWindow().setDecorations(false);
         * ```
         *
         * @param decorations Whether the window should have borders and bars.
         * @returns A promise indicating the success or failure of the operation.
         */
        async setDecorations(decorations) {
          return core.invoke("plugin:window|set_decorations", {
            label: this.label,
            value: decorations
          });
        }
        /**
         * Whether or not the window should have shadow.
         *
         * #### Platform-specific
         *
         * - **Windows:**
         *   - `false` has no effect on decorated window, shadows are always ON.
         *   - `true` will make undecorated window have a 1px white border,
         * and on Windows 11, it will have a rounded corners.
         * - **Linux:** Unsupported.
         *
         * @example
         * ```typescript
         * import { getCurrentWindow } from '@tauri-apps/api/window';
         * await getCurrentWindow().setShadow(false);
         * ```
         *
         * @returns A promise indicating the success or failure of the operation.
         */
        async setShadow(enable) {
          return core.invoke("plugin:window|set_shadow", {
            label: this.label,
            value: enable
          });
        }
        /**
         * Set window effects.
         */
        async setEffects(effects) {
          return core.invoke("plugin:window|set_effects", {
            label: this.label,
            value: effects
          });
        }
        /**
         * Clear any applied effects if possible.
         */
        async clearEffects() {
          return core.invoke("plugin:window|set_effects", {
            label: this.label,
            value: null
          });
        }
        /**
         * Whether the window should always be on top of other windows.
         * @example
         * ```typescript
         * import { getCurrentWindow } from '@tauri-apps/api/window';
         * await getCurrentWindow().setAlwaysOnTop(true);
         * ```
         *
         * @param alwaysOnTop Whether the window should always be on top of other windows or not.
         * @returns A promise indicating the success or failure of the operation.
         */
        async setAlwaysOnTop(alwaysOnTop) {
          return core.invoke("plugin:window|set_always_on_top", {
            label: this.label,
            value: alwaysOnTop
          });
        }
        /**
         * Whether the window should always be below other windows.
         * @example
         * ```typescript
         * import { getCurrentWindow } from '@tauri-apps/api/window';
         * await getCurrentWindow().setAlwaysOnBottom(true);
         * ```
         *
         * @param alwaysOnBottom Whether the window should always be below other windows or not.
         * @returns A promise indicating the success or failure of the operation.
         */
        async setAlwaysOnBottom(alwaysOnBottom) {
          return core.invoke("plugin:window|set_always_on_bottom", {
            label: this.label,
            value: alwaysOnBottom
          });
        }
        /**
         * Prevents the window contents from being captured by other apps.
         * @example
         * ```typescript
         * import { getCurrentWindow } from '@tauri-apps/api/window';
         * await getCurrentWindow().setContentProtected(true);
         * ```
         *
         * @returns A promise indicating the success or failure of the operation.
         */
        async setContentProtected(protected_) {
          return core.invoke("plugin:window|set_content_protected", {
            label: this.label,
            value: protected_
          });
        }
        /**
         * Resizes the window with a new inner size.
         * @example
         * ```typescript
         * import { getCurrentWindow, LogicalSize } from '@tauri-apps/api/window';
         * await getCurrentWindow().setSize(new LogicalSize(600, 500));
         * ```
         *
         * @param size The logical or physical inner size.
         * @returns A promise indicating the success or failure of the operation.
         */
        async setSize(size) {
          return core.invoke("plugin:window|set_size", {
            label: this.label,
            value: size instanceof dpi.Size ? size : new dpi.Size(size)
          });
        }
        /**
         * Sets the window minimum inner size. If the `size` argument is not provided, the constraint is unset.
         * @example
         * ```typescript
         * import { getCurrentWindow, PhysicalSize } from '@tauri-apps/api/window';
         * await getCurrentWindow().setMinSize(new PhysicalSize(600, 500));
         * ```
         *
         * @param size The logical or physical inner size, or `null` to unset the constraint.
         * @returns A promise indicating the success or failure of the operation.
         */
        async setMinSize(size) {
          return core.invoke("plugin:window|set_min_size", {
            label: this.label,
            value: size instanceof dpi.Size ? size : size ? new dpi.Size(size) : null
          });
        }
        /**
         * Sets the window maximum inner size. If the `size` argument is undefined, the constraint is unset.
         * @example
         * ```typescript
         * import { getCurrentWindow, LogicalSize } from '@tauri-apps/api/window';
         * await getCurrentWindow().setMaxSize(new LogicalSize(600, 500));
         * ```
         *
         * @param size The logical or physical inner size, or `null` to unset the constraint.
         * @returns A promise indicating the success or failure of the operation.
         */
        async setMaxSize(size) {
          return core.invoke("plugin:window|set_max_size", {
            label: this.label,
            value: size instanceof dpi.Size ? size : size ? new dpi.Size(size) : null
          });
        }
        /**
         * Sets the window inner size constraints.
         * @example
         * ```typescript
         * import { getCurrentWindow } from '@tauri-apps/api/window';
         * await getCurrentWindow().setSizeConstraints({ minWidth: 300 });
         * ```
         *
         * @param constraints The logical or physical inner size, or `null` to unset the constraint.
         * @returns A promise indicating the success or failure of the operation.
         */
        async setSizeConstraints(constraints) {
          function logical(pixel) {
            return pixel ? { Logical: pixel } : null;
          }
          return core.invoke("plugin:window|set_size_constraints", {
            label: this.label,
            value: {
              minWidth: logical(constraints === null || constraints === void 0 ? void 0 : constraints.minWidth),
              minHeight: logical(constraints === null || constraints === void 0 ? void 0 : constraints.minHeight),
              maxWidth: logical(constraints === null || constraints === void 0 ? void 0 : constraints.maxWidth),
              maxHeight: logical(constraints === null || constraints === void 0 ? void 0 : constraints.maxHeight)
            }
          });
        }
        /**
         * Sets the window outer position.
         * @example
         * ```typescript
         * import { getCurrentWindow, LogicalPosition } from '@tauri-apps/api/window';
         * await getCurrentWindow().setPosition(new LogicalPosition(600, 500));
         * ```
         *
         * @param position The new position, in logical or physical pixels.
         * @returns A promise indicating the success or failure of the operation.
         */
        async setPosition(position) {
          return core.invoke("plugin:window|set_position", {
            label: this.label,
            value: position instanceof dpi.Position ? position : new dpi.Position(position)
          });
        }
        /**
         * Sets the window fullscreen state.
         * @example
         * ```typescript
         * import { getCurrentWindow } from '@tauri-apps/api/window';
         * await getCurrentWindow().setFullscreen(true);
         * ```
         *
         * @param fullscreen Whether the window should go to fullscreen or not.
         * @returns A promise indicating the success or failure of the operation.
         */
        async setFullscreen(fullscreen) {
          return core.invoke("plugin:window|set_fullscreen", {
            label: this.label,
            value: fullscreen
          });
        }
        /**
         * On macOS, Toggles a fullscreen mode that doesn’t require a new macOS space. Returns a boolean indicating whether the transition was successful (this won’t work if the window was already in the native fullscreen).
         * This is how fullscreen used to work on macOS in versions before Lion. And allows the user to have a fullscreen window without using another space or taking control over the entire monitor.
         *
         * On other platforms, this is the same as {@link Window.setFullscreen}.
         *
         * @param fullscreen Whether the window should go to simple fullscreen or not.
         * @returns A promise indicating the success or failure of the operation.
         */
        async setSimpleFullscreen(fullscreen) {
          return core.invoke("plugin:window|set_simple_fullscreen", {
            label: this.label,
            value: fullscreen
          });
        }
        /**
         * Bring the window to front and focus.
         * @example
         * ```typescript
         * import { getCurrentWindow } from '@tauri-apps/api/window';
         * await getCurrentWindow().setFocus();
         * ```
         *
         * @returns A promise indicating the success or failure of the operation.
         */
        async setFocus() {
          return core.invoke("plugin:window|set_focus", {
            label: this.label
          });
        }
        /**
         * Sets whether the window can be focused.
         *
         * #### Platform-specific
         *
         * - **macOS**: If the window is already focused, it is not possible to unfocus it after calling `set_focusable(false)`.
         *   In this case, you might consider calling {@link Window.setFocus} but it will move the window to the back i.e. at the bottom in terms of z-order.
         *
         * @example
         * ```typescript
         * import { getCurrentWindow } from '@tauri-apps/api/window';
         * await getCurrentWindow().setFocusable(true);
         * ```
         *
         * @param focusable Whether the window can be focused.
         * @returns A promise indicating the success or failure of the operation.
         */
        async setFocusable(focusable) {
          return core.invoke("plugin:window|set_focusable", {
            label: this.label,
            value: focusable
          });
        }
        /**
         * Sets the window icon.
         * @example
         * ```typescript
         * import { getCurrentWindow } from '@tauri-apps/api/window';
         * await getCurrentWindow().setIcon('/tauri/awesome.png');
         * ```
         *
         * Note that you may need the `image-ico` or `image-png` Cargo features to use this API.
         * To enable it, change your Cargo.toml file:
         * ```toml
         * [dependencies]
         * tauri = { version = "...", features = ["...", "image-png"] }
         * ```
         *
         * @param icon Icon bytes or path to the icon file.
         * @returns A promise indicating the success or failure of the operation.
         */
        async setIcon(icon) {
          return core.invoke("plugin:window|set_icon", {
            label: this.label,
            value: image.transformImage(icon)
          });
        }
        /**
         * Whether the window icon should be hidden from the taskbar or not.
         *
         * #### Platform-specific
         *
         * - **macOS:** Unsupported.
         * @example
         * ```typescript
         * import { getCurrentWindow } from '@tauri-apps/api/window';
         * await getCurrentWindow().setSkipTaskbar(true);
         * ```
         *
         * @param skip true to hide window icon, false to show it.
         * @returns A promise indicating the success or failure of the operation.
         */
        async setSkipTaskbar(skip) {
          return core.invoke("plugin:window|set_skip_taskbar", {
            label: this.label,
            value: skip
          });
        }
        /**
         * Grabs the cursor, preventing it from leaving the window.
         *
         * There's no guarantee that the cursor will be hidden. You should
         * hide it by yourself if you want so.
         *
         * #### Platform-specific
         *
         * - **Linux:** Unsupported.
         * - **macOS:** This locks the cursor in a fixed location, which looks visually awkward.
         * @example
         * ```typescript
         * import { getCurrentWindow } from '@tauri-apps/api/window';
         * await getCurrentWindow().setCursorGrab(true);
         * ```
         *
         * @param grab `true` to grab the cursor icon, `false` to release it.
         * @returns A promise indicating the success or failure of the operation.
         */
        async setCursorGrab(grab) {
          return core.invoke("plugin:window|set_cursor_grab", {
            label: this.label,
            value: grab
          });
        }
        /**
         * Modifies the cursor's visibility.
         *
         * #### Platform-specific
         *
         * - **Windows:** The cursor is only hidden within the confines of the window.
         * - **macOS:** The cursor is hidden as long as the window has input focus, even if the cursor is
         *   outside of the window.
         * @example
         * ```typescript
         * import { getCurrentWindow } from '@tauri-apps/api/window';
         * await getCurrentWindow().setCursorVisible(false);
         * ```
         *
         * @param visible If `false`, this will hide the cursor. If `true`, this will show the cursor.
         * @returns A promise indicating the success or failure of the operation.
         */
        async setCursorVisible(visible) {
          return core.invoke("plugin:window|set_cursor_visible", {
            label: this.label,
            value: visible
          });
        }
        /**
         * Modifies the cursor icon of the window.
         * @example
         * ```typescript
         * import { getCurrentWindow } from '@tauri-apps/api/window';
         * await getCurrentWindow().setCursorIcon('help');
         * ```
         *
         * @param icon The new cursor icon.
         * @returns A promise indicating the success or failure of the operation.
         */
        async setCursorIcon(icon) {
          return core.invoke("plugin:window|set_cursor_icon", {
            label: this.label,
            value: icon
          });
        }
        /**
         * Sets the window background color.
         *
         * #### Platform-specific:
         *
         * - **Windows:** alpha channel is ignored.
         * - **iOS / Android:** Unsupported.
         *
         * @returns A promise indicating the success or failure of the operation.
         *
         * @since 2.1.0
         */
        async setBackgroundColor(color) {
          return core.invoke("plugin:window|set_background_color", { color });
        }
        /**
         * Changes the position of the cursor in window coordinates.
         * @example
         * ```typescript
         * import { getCurrentWindow, LogicalPosition } from '@tauri-apps/api/window';
         * await getCurrentWindow().setCursorPosition(new LogicalPosition(600, 300));
         * ```
         *
         * @param position The new cursor position.
         * @returns A promise indicating the success or failure of the operation.
         */
        async setCursorPosition(position) {
          return core.invoke("plugin:window|set_cursor_position", {
            label: this.label,
            value: position instanceof dpi.Position ? position : new dpi.Position(position)
          });
        }
        /**
         * Changes the cursor events behavior.
         *
         * @example
         * ```typescript
         * import { getCurrentWindow } from '@tauri-apps/api/window';
         * await getCurrentWindow().setIgnoreCursorEvents(true);
         * ```
         *
         * @param ignore `true` to ignore the cursor events; `false` to process them as usual.
         * @returns A promise indicating the success or failure of the operation.
         */
        async setIgnoreCursorEvents(ignore) {
          return core.invoke("plugin:window|set_ignore_cursor_events", {
            label: this.label,
            value: ignore
          });
        }
        /**
         * Starts dragging the window.
         * @example
         * ```typescript
         * import { getCurrentWindow } from '@tauri-apps/api/window';
         * await getCurrentWindow().startDragging();
         * ```
         *
         * @return A promise indicating the success or failure of the operation.
         */
        async startDragging() {
          return core.invoke("plugin:window|start_dragging", {
            label: this.label
          });
        }
        /**
         * Starts resize-dragging the window.
         * @example
         * ```typescript
         * import { getCurrentWindow } from '@tauri-apps/api/window';
         * await getCurrentWindow().startResizeDragging();
         * ```
         *
         * @return A promise indicating the success or failure of the operation.
         */
        async startResizeDragging(direction) {
          return core.invoke("plugin:window|start_resize_dragging", {
            label: this.label,
            value: direction
          });
        }
        /**
         * Sets the badge count. It is app wide and not specific to this window.
         *
         * #### Platform-specific
         *
         * - **Windows**: Unsupported. Use @{linkcode Window.setOverlayIcon} instead.
         *
         * @example
         * ```typescript
         * import { getCurrentWindow } from '@tauri-apps/api/window';
         * await getCurrentWindow().setBadgeCount(5);
         * ```
         *
         * @param count The badge count. Use `undefined` to remove the badge.
         * @return A promise indicating the success or failure of the operation.
         */
        async setBadgeCount(count) {
          return core.invoke("plugin:window|set_badge_count", {
            label: this.label,
            value: count
          });
        }
        /**
         * Sets the badge cont **macOS only**.
         *
         * @example
         * ```typescript
         * import { getCurrentWindow } from '@tauri-apps/api/window';
         * await getCurrentWindow().setBadgeLabel("Hello");
         * ```
         *
         * @param label The badge label. Use `undefined` to remove the badge.
         * @return A promise indicating the success or failure of the operation.
         */
        async setBadgeLabel(label) {
          return core.invoke("plugin:window|set_badge_label", {
            label: this.label,
            value: label
          });
        }
        /**
         * Sets the overlay icon. **Windows only**
         * The overlay icon can be set for every window.
         *
         *
         * Note that you may need the `image-ico` or `image-png` Cargo features to use this API.
         * To enable it, change your Cargo.toml file:
         *
         * ```toml
         * [dependencies]
         * tauri = { version = "...", features = ["...", "image-png"] }
         * ```
         *
         * @example
         * ```typescript
         * import { getCurrentWindow } from '@tauri-apps/api/window';
         * await getCurrentWindow().setOverlayIcon("/tauri/awesome.png");
         * ```
         *
         * @param icon Icon bytes or path to the icon file. Use `undefined` to remove the overlay icon.
         * @return A promise indicating the success or failure of the operation.
         */
        async setOverlayIcon(icon) {
          return core.invoke("plugin:window|set_overlay_icon", {
            label: this.label,
            value: icon ? image.transformImage(icon) : void 0
          });
        }
        /**
         * Sets the taskbar progress state.
         *
         * #### Platform-specific
         *
         * - **Linux / macOS**: Progress bar is app-wide and not specific to this window.
         * - **Linux**: Only supported desktop environments with `libunity` (e.g. GNOME).
         *
         * @example
         * ```typescript
         * import { getCurrentWindow, ProgressBarStatus } from '@tauri-apps/api/window';
         * await getCurrentWindow().setProgressBar({
         *   status: ProgressBarStatus.Normal,
         *   progress: 50,
         * });
         * ```
         *
         * @return A promise indicating the success or failure of the operation.
         */
        async setProgressBar(state) {
          return core.invoke("plugin:window|set_progress_bar", {
            label: this.label,
            value: state
          });
        }
        /**
         * Sets whether the window should be visible on all workspaces or virtual desktops.
         *
         * #### Platform-specific
         *
         * - **Windows / iOS / Android:** Unsupported.
         *
         * @since 2.0.0
         */
        async setVisibleOnAllWorkspaces(visible) {
          return core.invoke("plugin:window|set_visible_on_all_workspaces", {
            label: this.label,
            value: visible
          });
        }
        /**
         * Sets the title bar style. **macOS only**.
         *
         * @since 2.0.0
         */
        async setTitleBarStyle(style) {
          return core.invoke("plugin:window|set_title_bar_style", {
            label: this.label,
            value: style
          });
        }
        /**
         * Set window theme, pass in `null` or `undefined` to follow system theme
         *
         * #### Platform-specific
         *
         * - **Linux / macOS**: Theme is app-wide and not specific to this window.
         * - **iOS / Android:** Unsupported.
         *
         * @since 2.0.0
         */
        async setTheme(theme) {
          return core.invoke("plugin:window|set_theme", {
            label: this.label,
            value: theme
          });
        }
        // Listeners
        /**
         * Listen to window resize.
         *
         * @example
         * ```typescript
         * import { getCurrentWindow } from "@tauri-apps/api/window";
         * const unlisten = await getCurrentWindow().onResized(({ payload: size }) => {
         *  console.log('Window resized', size);
         * });
         *
         * // you need to call unlisten if your handler goes out of scope e.g. the component is unmounted
         * unlisten();
         * ```
         *
         * @returns A promise resolving to a function to unlisten to the event.
         * Note that removing the listener is required if your listener goes out of scope e.g. the component is unmounted.
         */
        async onResized(handler) {
          return this.listen(event.TauriEvent.WINDOW_RESIZED, (e) => {
            e.payload = new dpi.PhysicalSize(e.payload);
            handler(e);
          });
        }
        /**
         * Listen to window move.
         *
         * @example
         * ```typescript
         * import { getCurrentWindow } from "@tauri-apps/api/window";
         * const unlisten = await getCurrentWindow().onMoved(({ payload: position }) => {
         *  console.log('Window moved', position);
         * });
         *
         * // you need to call unlisten if your handler goes out of scope e.g. the component is unmounted
         * unlisten();
         * ```
         *
         * @returns A promise resolving to a function to unlisten to the event.
         * Note that removing the listener is required if your listener goes out of scope e.g. the component is unmounted.
         */
        async onMoved(handler) {
          return this.listen(event.TauriEvent.WINDOW_MOVED, (e) => {
            e.payload = new dpi.PhysicalPosition(e.payload);
            handler(e);
          });
        }
        /**
         * Listen to window close requested. Emitted when the user requests to closes the window.
         *
         * @example
         * ```typescript
         * import { getCurrentWindow } from "@tauri-apps/api/window";
         * import { confirm } from '@tauri-apps/api/dialog';
         * const unlisten = await getCurrentWindow().onCloseRequested(async (event) => {
         *   const confirmed = await confirm('Are you sure?');
         *   if (!confirmed) {
         *     // user did not confirm closing the window; let's prevent it
         *     event.preventDefault();
         *   }
         * });
         *
         * // you need to call unlisten if your handler goes out of scope e.g. the component is unmounted
         * unlisten();
         * ```
         *
         * @returns A promise resolving to a function to unlisten to the event.
         * Note that removing the listener is required if your listener goes out of scope e.g. the component is unmounted.
         */
        async onCloseRequested(handler) {
          return this.listen(event.TauriEvent.WINDOW_CLOSE_REQUESTED, async (event2) => {
            const evt = new CloseRequestedEvent(event2);
            await handler(evt);
            if (!evt.isPreventDefault()) {
              await this.destroy();
            }
          });
        }
        /**
         * Listen to a file drop event.
         * The listener is triggered when the user hovers the selected files on the webview,
         * drops the files or cancels the operation.
         *
         * @example
         * ```typescript
         * import { getCurrentWindow } from "@tauri-apps/api/webview";
         * const unlisten = await getCurrentWindow().onDragDropEvent((event) => {
         *  if (event.payload.type === 'over') {
         *    console.log('User hovering', event.payload.position);
         *  } else if (event.payload.type === 'drop') {
         *    console.log('User dropped', event.payload.paths);
         *  } else {
         *    console.log('File drop cancelled');
         *  }
         * });
         *
         * // you need to call unlisten if your handler goes out of scope e.g. the component is unmounted
         * unlisten();
         * ```
         *
         * @returns A promise resolving to a function to unlisten to the event.
         * Note that removing the listener is required if your listener goes out of scope e.g. the component is unmounted.
         */
        async onDragDropEvent(handler) {
          const unlistenDrag = await this.listen(event.TauriEvent.DRAG_ENTER, (event2) => {
            handler({
              ...event2,
              payload: {
                type: "enter",
                paths: event2.payload.paths,
                position: new dpi.PhysicalPosition(event2.payload.position)
              }
            });
          });
          const unlistenDragOver = await this.listen(event.TauriEvent.DRAG_OVER, (event2) => {
            handler({
              ...event2,
              payload: {
                type: "over",
                position: new dpi.PhysicalPosition(event2.payload.position)
              }
            });
          });
          const unlistenDrop = await this.listen(event.TauriEvent.DRAG_DROP, (event2) => {
            handler({
              ...event2,
              payload: {
                type: "drop",
                paths: event2.payload.paths,
                position: new dpi.PhysicalPosition(event2.payload.position)
              }
            });
          });
          const unlistenCancel = await this.listen(event.TauriEvent.DRAG_LEAVE, (event2) => {
            handler({ ...event2, payload: { type: "leave" } });
          });
          return () => {
            unlistenDrag();
            unlistenDrop();
            unlistenDragOver();
            unlistenCancel();
          };
        }
        /**
         * Listen to window focus change.
         *
         * @example
         * ```typescript
         * import { getCurrentWindow } from "@tauri-apps/api/window";
         * const unlisten = await getCurrentWindow().onFocusChanged(({ payload: focused }) => {
         *  console.log('Focus changed, window is focused? ' + focused);
         * });
         *
         * // you need to call unlisten if your handler goes out of scope e.g. the component is unmounted
         * unlisten();
         * ```
         *
         * @returns A promise resolving to a function to unlisten to the event.
         * Note that removing the listener is required if your listener goes out of scope e.g. the component is unmounted.
         */
        async onFocusChanged(handler) {
          const unlistenFocus = await this.listen(event.TauriEvent.WINDOW_FOCUS, (event2) => {
            handler({ ...event2, payload: true });
          });
          const unlistenBlur = await this.listen(event.TauriEvent.WINDOW_BLUR, (event2) => {
            handler({ ...event2, payload: false });
          });
          return () => {
            unlistenFocus();
            unlistenBlur();
          };
        }
        /**
         * Listen to window scale change. Emitted when the window's scale factor has changed.
         * The following user actions can cause DPI changes:
         * - Changing the display's resolution.
         * - Changing the display's scale factor (e.g. in Control Panel on Windows).
         * - Moving the window to a display with a different scale factor.
         *
         * @example
         * ```typescript
         * import { getCurrentWindow } from "@tauri-apps/api/window";
         * const unlisten = await getCurrentWindow().onScaleChanged(({ payload }) => {
         *  console.log('Scale changed', payload.scaleFactor, payload.size);
         * });
         *
         * // you need to call unlisten if your handler goes out of scope e.g. the component is unmounted
         * unlisten();
         * ```
         *
         * @returns A promise resolving to a function to unlisten to the event.
         * Note that removing the listener is required if your listener goes out of scope e.g. the component is unmounted.
         */
        async onScaleChanged(handler) {
          return this.listen(event.TauriEvent.WINDOW_SCALE_FACTOR_CHANGED, handler);
        }
        /**
         * Listen to the system theme change.
         *
         * @example
         * ```typescript
         * import { getCurrentWindow } from "@tauri-apps/api/window";
         * const unlisten = await getCurrentWindow().onThemeChanged(({ payload: theme }) => {
         *  console.log('New theme: ' + theme);
         * });
         *
         * // you need to call unlisten if your handler goes out of scope e.g. the component is unmounted
         * unlisten();
         * ```
         *
         * @returns A promise resolving to a function to unlisten to the event.
         * Note that removing the listener is required if your listener goes out of scope e.g. the component is unmounted.
         */
        async onThemeChanged(handler) {
          return this.listen(event.TauriEvent.WINDOW_THEME_CHANGED, handler);
        }
      };
      var BackgroundThrottlingPolicy;
      (function(BackgroundThrottlingPolicy2) {
        BackgroundThrottlingPolicy2["Disabled"] = "disabled";
        BackgroundThrottlingPolicy2["Throttle"] = "throttle";
        BackgroundThrottlingPolicy2["Suspend"] = "suspend";
      })(BackgroundThrottlingPolicy || (BackgroundThrottlingPolicy = {}));
      var ScrollBarStyle;
      (function(ScrollBarStyle2) {
        ScrollBarStyle2["Default"] = "default";
        ScrollBarStyle2["FluentOverlay"] = "fluentOverlay";
      })(ScrollBarStyle || (ScrollBarStyle = {}));
      exports.Effect = void 0;
      (function(Effect) {
        Effect["AppearanceBased"] = "appearanceBased";
        Effect["Light"] = "light";
        Effect["Dark"] = "dark";
        Effect["MediumLight"] = "mediumLight";
        Effect["UltraDark"] = "ultraDark";
        Effect["Titlebar"] = "titlebar";
        Effect["Selection"] = "selection";
        Effect["Menu"] = "menu";
        Effect["Popover"] = "popover";
        Effect["Sidebar"] = "sidebar";
        Effect["HeaderView"] = "headerView";
        Effect["Sheet"] = "sheet";
        Effect["WindowBackground"] = "windowBackground";
        Effect["HudWindow"] = "hudWindow";
        Effect["FullScreenUI"] = "fullScreenUI";
        Effect["Tooltip"] = "tooltip";
        Effect["ContentBackground"] = "contentBackground";
        Effect["UnderWindowBackground"] = "underWindowBackground";
        Effect["UnderPageBackground"] = "underPageBackground";
        Effect["Mica"] = "mica";
        Effect["Blur"] = "blur";
        Effect["Acrylic"] = "acrylic";
        Effect["Tabbed"] = "tabbed";
        Effect["TabbedDark"] = "tabbedDark";
        Effect["TabbedLight"] = "tabbedLight";
      })(exports.Effect || (exports.Effect = {}));
      exports.EffectState = void 0;
      (function(EffectState) {
        EffectState["FollowsWindowActiveState"] = "followsWindowActiveState";
        EffectState["Active"] = "active";
        EffectState["Inactive"] = "inactive";
      })(exports.EffectState || (exports.EffectState = {}));
      function mapMonitor(m) {
        return m === null ? null : {
          name: m.name,
          scaleFactor: m.scaleFactor,
          position: new dpi.PhysicalPosition(m.position),
          size: new dpi.PhysicalSize(m.size),
          workArea: {
            position: new dpi.PhysicalPosition(m.workArea.position),
            size: new dpi.PhysicalSize(m.workArea.size)
          }
        };
      }
      async function currentMonitor() {
        return core.invoke("plugin:window|current_monitor").then(mapMonitor);
      }
      async function primaryMonitor() {
        return core.invoke("plugin:window|primary_monitor").then(mapMonitor);
      }
      async function monitorFromPoint(x, y) {
        return core.invoke("plugin:window|monitor_from_point", {
          x,
          y
        }).then(mapMonitor);
      }
      async function availableMonitors() {
        return core.invoke("plugin:window|available_monitors").then((ms) => ms.map(mapMonitor));
      }
      async function cursorPosition() {
        return core.invoke("plugin:window|cursor_position").then((v) => new dpi.PhysicalPosition(v));
      }
      exports.LogicalPosition = dpi.LogicalPosition;
      exports.LogicalSize = dpi.LogicalSize;
      exports.PhysicalPosition = dpi.PhysicalPosition;
      exports.PhysicalSize = dpi.PhysicalSize;
      exports.CloseRequestedEvent = CloseRequestedEvent;
      exports.Window = Window;
      exports.availableMonitors = availableMonitors;
      exports.currentMonitor = currentMonitor;
      exports.cursorPosition = cursorPosition;
      exports.getAllWindows = getAllWindows;
      exports.getCurrentWindow = getCurrentWindow2;
      exports.monitorFromPoint = monitorFromPoint;
      exports.primaryMonitor = primaryMonitor;
    }
  });

  // scripts/_tauri-api-entry.tmp.mjs
  var { invoke } = require_core();
  var { getCurrentWindow } = require_window();
  window.__TAURI_API__ = { invoke, getCurrentWindow };
})();
