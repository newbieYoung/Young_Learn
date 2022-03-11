#include <string.h>

char *hello()
{
    return "hello wasm";
}

char *sayHi(char *name)
{
    return strcat("hi ", name);
}