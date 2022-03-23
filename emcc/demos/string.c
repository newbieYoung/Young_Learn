#include <string.h>
#include <stdlib.h>

char *hello()
{
    return "hello wasm";
}

char *sayHi(char *name)
{
    char *hi = "hi ";
    char *result = malloc(strlen(hi) + strlen(name) + 1); // +1 end
    if (result == NULL)
    {
        exit(1);
    }
    strcpy(result, hi);
    strcat(result, name);

    return result;
}