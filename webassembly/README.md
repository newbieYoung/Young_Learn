# WebAssembly & Emscripten

## 编译命令说明

- `编译优化 flat -O0，-O1，-O2，-Os，-Oz，-O3`，分别表示不同的优化程度；一般建议开发使用 -O0 不进行编译优化，包含很多断言，方便调试；发布使用 -O3 或者 -O2 多了一些 JavaScript 级别的优化以及一些 llvm -O3 的优化项；
