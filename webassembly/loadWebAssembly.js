/**
 * @param {String} path wasm 文件路径
 * @param {Object} imports 传递到 wasm 代码中的变量
 */
function loadWebAssembly (path, imports = {}) {
    return fetch(path)                                                                  //1.加载文件
            .then(response => response.arrayBuffer())                                   //2.转成ArrayBuffer
            .then(buffer => WebAssembly.compile(buffer))                                //3.编译
            .then(module => {
                imports.env = imports.env || {}
                // 开辟内存空间
                imports.env.memoryBase = imports.env.memoryBase || 0
                if (!imports.env.memory) {
                    imports.env.memory = new WebAssembly.Memory({ initial: 256 })
                }
                // 创建变量映射表
                imports.env.tableBase = imports.env.tableBase || 0
                if (!imports.env.table) {
                    // 在 MVP 版本中 element 只能是 "anyfunc"
                    imports.env.table = new WebAssembly.Table({ initial: 0, element: 'anyfunc' })
                }

                return new WebAssembly.Instance(module, imports)                       //4.创建WebAssembly实例
            })
}