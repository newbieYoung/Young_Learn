#include <stdio.h>

float bezier1(float t, float p0, float p1) {
    return (1 - t) * p0 + t * p1;
}