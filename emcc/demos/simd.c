#include <wasm_simd128.h>

void simd_multiply_arrays(int *out, int *in_a, int *in_b, int size)
{
    for (int i = 0; i < size; i += 4)
    {
        v128_t a = wasm_v128_load(&in_a[i]);
        v128_t b = wasm_v128_load(&in_b[i]);
        v128_t prod = wasm_i32x4_mul(a, b);
        wasm_v128_store(&out[i], prod);
    }
}

void multiply_arrays(int *out, int *in_a, int *in_b, int size)
{
    for (int i = 0; i < size; i += 1)
    {
        out[i] = in_a[i] * in_b[i];
    }
}
