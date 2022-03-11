// 返回变长数组
int lenArr(int len)
{
    float r[len];
    int i;
    static int addr;

    for (i = 0; i < len; i++)
    {
        r[i] = 1.0;
    }

    addr = (int)&r;

    return addr;
}