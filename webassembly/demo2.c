#include <stdio.h>
#include <string.h>
#include <math.h>
#include <stdlib.h>
#include <emscripten.h>

//在 C 中执行 JS 函数
EM_JS(void, console_int, (int i), {
  console.log(i);
});
EM_JS(void, console_float, (float f), {
  console.log(f);
});
EM_JS(void, console_gap, (), {
  console.log('---');
});

float bezier1(float t, float p0, float p1) {
    return (1 - t) * p0 + t * p1;
}

float testMath(float f){
  return sqrt(f);
}

char * hello(){
    return "hello WebAssembly";
}

char * sayHi(char* name){
    return strcat("hi ",name);
}

//计算斐波那契数列
int fib(n){
  if(n<2){
    return 1;
  }
  return fib(n-2)+fib(n-1);
}

//返回变长数组
int lenArr(int len){
  float r[len];
  int i;
  static int addr;
  
  for(i = 0; i < len; i++){
    r[i] = 1.0;
  }

  addr = (int)&r;
  
  return addr;
}