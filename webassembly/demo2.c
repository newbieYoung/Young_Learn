#include <stdio.h>
#include <string.h>
#include <math.h>

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