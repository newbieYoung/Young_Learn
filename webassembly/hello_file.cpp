#include <stdio.h>
int main() {
  FILE *file = fopen("./hello_sdl.cpp", "rb");
  if (!file) {
    printf("cannot open file\n");
    return 1;
  }
  while (!feof(file)) {
    char c = fgetc(file);
    if (c != EOF) {
      putchar(c);
    }
  }
  fclose (file);
  return 0;
}
