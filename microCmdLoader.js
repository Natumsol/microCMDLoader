(function (global) {
    global.myLoader = {
        use: use, // 入口函数
        modules: [],// 模块池
        config: {
            root: "/"
        },
        set: function (obj) {
            for (var key in obj) {
                this.config[key] = obj[key];
            }
        },
        version: "0.0.1",
        MODULE_STATUS: {
            PENDDING: 0,
            LOADING: 1,
            COMPLETED: 2,
            ERROR: 3
        }
    };

    global.require = require;
    global.define = define;

    /**
     * 模块类
     */
    function Module(id) {
        this.id = id;
        myLoader.modules[id] = this; // cached
        this.status = myLoader.MODULE_STATUS.PENDDING;
        this.dependences = [];
        this.callbacks = {};
        this.load(); // load module
    }

    Module.create = function (id) {
        return new Module(id);
    }

    Module.prototype = {
        constructor: Module,
        load: function () {
            var id = this.id;
            var script = document.createElement("script");
            script.src = id;
            var self = this;
            script.onerror = function (event) {
                self.setStatus(myLoader.MODULE_STATUS.ERROR)
            }
            document.head.appendChild(script);
            this.status = myLoader.MODULE_STATUS.LOADING;
        },
        on: function (event, callback) {
            if (!this.callbacks[event]) this.callbacks[event] = [];
            if ((this.status == myLoader.MODULE_STATUS.LOADING && event == "load") || (this.status == myLoader.MODULE_STATUS.COMPLETED && event == "complete")) {
                callback(this);
            } else {
                this.callbacks[event].push(callback);
            }
        },
        fire: function (event) {
            if (this.callbacks[event] == undefined)
                this.callbacks[event] = [];
            var self = this;
            this.callbacks[event].forEach(function (callback) {
                callback(self);
            });
        },
        setStatus: function (status) {
            if (this.status != status) {
                this.status = status;
                switch (status) {
                    case myLoader.MODULE_STATUS.LOADING:
                        this.fire("load");
                        break;
                    case myLoader.MODULE_STATUS.COMPLETED:
                        this.fire("complete");
                        break;
                    case myLoader.MODULE_STATUS.ERROR:
                        this.fire("error");
                        break;
                    default:
                        break;
                }
            }
        }
    }

    function use(ids, callback) {
        if (!Array.isArray(ids)) ids = [ids];
        Promise.all(ids.map(function (id) {
            return load(myLoader.config.root + id);
        })).then(function (list) {
            callback.apply(global, list);// 加载完成， 调用回调函数
        }, function (error) {
            throw error;
        });
    }

    function require(id) {
        var module = myLoader.modules[myLoader.config.root + id];
        if (!module) throw "can not load find module by id:" + id;
        else {
            return getModuleExports(module); // 返回模块的对外接口。
        }
    }

    function define(factory) {
        var id = getCurrentScript();
        id = id.replace(location.origin, "");
        var module = myLoader.modules[id];
        module.factory = factory;
        var dependences = getDependcencs(factory);
        if (dependences) {
            Promise.all(dependences.map(function (dep) {
                return load(myLoader.config.root + dep);
            })).then(function () {
                module.fire("complete"); // 依赖加载完成，通知模块。
            }, function () {
                module.fire("error");
            });
        } else {
            module.fire("complete");//没有依赖，通知模块加载完成
        }
    }

    function load(id) {
        return new Promise(function (resolve, reject) {
            var module = myLoader.modules[id] || Module.create(id); // 取得模块或者新建模块 此时模块正在加载或者已经加载完成
            module.on("complete", function () {
                var exports = getModuleExports(module);
                resolve(exports);// 加载完成-> 通知调用者
            })
            module.on("error", reject);
        })
    }
    function getCurrentScript() {
        var doc = document;
        if (doc.currentScript) {
            return doc.currentScript.src;
        }
        var stack;
        try {
            a.b.c();
        } catch (e) {
            stack = e.stack;
            if (!stack && window.opera) {
                stack = (String(e).match(/of linked script \S+/g) || []).join(" ");
            }
        }
        if (stack) {
            stack = stack.split(/[@ ]/g).pop();
            stack = stack[0] == "(" ? stack.slice(1, -1) : stack;
            return stack.replace(/(:\d+)?:\d+$/i, "");
        }
        var nodes = head.getElementsByTagName("script");
        for (var i = 0, node; node = nodes[i++];) {
            if (node.readyState === "interactive") {
                return node.className = node.src;
            }
        }
    }

    function getDependcencs(factory) {
        if(typeof factory != "string") factory = factory.toString();
        var deps = factory.match(/require\(.+?\)/g) || [];
        deps = deps.map(function (dep) {
            return dep.replace(/^require\(["']|["']\)$/g, "");
        });
        return deps;
    }
    function getModuleExports(module) {
        if (!module.exports) {
            module.exports = {};
            module.factory(require, module.exports, module);
        }
        return module.exports;
    }

})(window);