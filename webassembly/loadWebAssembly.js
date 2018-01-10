function loadWebAssembly(filename,imports = {}) {
    fetch('demo0.wasm')//1.加载wasm文件
        .then(response => response.arrayBuffer())//2.转成arraybuffer
        .then(buffer => WebAssembly.compile(buffer))//3.编译
        .then(module => {
            imports.env = imports.env || {}
            Object.assign(imports.env,{
                memoryBase:0,
                tableBase:0,
                memory:new WebAssembly.Memory({inital:256,maximum:256}),
                table:new WebAssembly.Table({inital:0,maximum:0,element:'anyfunc'})
            })
            return new WebAssembly.Instance(module,imports);//4.实例化
        });
}