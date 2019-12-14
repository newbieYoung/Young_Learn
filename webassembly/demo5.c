void sqdiff(float dst[], unsigned char src[], int srcW, int srcH, unsigned char tmp[], int tmpW, int tmpH)
{
  //平方差计算相似度
  int depth = 1; //默认按灰度图处理

  int dstW = srcW - tmpW + 1;
  int dstH = srcH - tmpH + 1;
  int dstLen = dstW * dstH;

  for (int i = 0; i < dstW; i++)
  {
    for (int j = 0; j < dstH; j++)
    {
      int no = i * dstW + j;
      int sum = 0;

      for (int r = 0; r < tmpW; r++)
      {
        for (int c = 0; c < tmpH; c++)
        {
          int no1 = r * tmpW + c;
          int v1 = tmp[no1];

          int no2 = (r + i) * srcW + (c + j);
          int v2 = src[no2];

          sum += (v1 - v2) * (v1 - v2);
        }
      }

      dst[no] = sum;
    }
  }

  //查找最大值和最小值
  float max = dst[0];
  float min = dst[0];
  for (int i = 1; i < dstLen; i++)
  {
    int item = dst[i];
    if (item > max)
    {
      max = item;
    }
    else if (item < min)
    {
      min = item;
    }
  }

  //转换为[0-255]
  int len = max - min;
  for (int i = 0; i < dstLen; i++)
  {
    dst[i] = ((dst[i] - min) / len) * 255;
  }
}