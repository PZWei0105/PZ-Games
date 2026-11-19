from PIL import Image, ImageFilter
import numpy as np, colorsys
src=Image.open('原圖_GPT.png').convert('RGB').filter(ImageFilter.MedianFilter(5))
a=np.asarray(src).astype(float)/255
H,W=a.shape[:2]
L=0.299*a[...,0]+0.587*a[...,1]+0.114*a[...,2]
mx=a.max(-1); mn=a.min(-1); sat=(mx-mn)/(mx+1e-6)
red=(a[...,0]>0.55)&(a[...,0]>a[...,1]*1.6)&(a[...,0]>a[...,2]*1.05)   # 紅、桃紅的光
# 對比拉開
L=np.clip((L-0.05)/0.75,0,1)**0.8
BLK=np.array([17,17,17]);PNK=np.array([255,46,136]);YEL=np.array([255,230,0]);WHT=np.array([255,255,255])
P=10  # 網點間距
yy,xx=np.mgrid[0:H,0:W]
cx=(xx%P)-P/2+.5; cy=(yy%P)-P/2+.5; d=np.sqrt(cx*cx+cy*cy)/(P/2)  # 0 中心 ~1.4 角落
out=np.zeros((H,W,3))
def dots(t): # t 0..1 → 網點覆蓋
    return d < np.sqrt(np.clip(t,0,1))*1.15
c1=L<0.17
c2=(L>=0.17)&(L<0.34)
c3=(L>=0.34)&(L<0.55)
c4=(L>=0.55)&(L<0.80)
c5=L>=0.80
out[c1]=BLK
t2=(L-0.17)/0.17; m2=c2&dots(t2); out[c2]=BLK; out[m2]=PNK
out[c3]=PNK
t4=(L-0.55)/0.25; m4=c4&dots(t4); out[c4]=PNK; out[m4]=YEL
out[c5]=YEL
out[(L>0.93)]=WHT
out[red&(L>0.22)]=PNK
out[red&(L>0.42)]=YEL
out[red&(L>0.80)]=WHT
Image.fromarray(out.astype('uint8')).save('tri.png')
Image.fromarray(out.astype('uint8')).resize((512,512),Image.LANCZOS).save('tri_s.png')

# 貼紙：去背＋白邊＋黑外框
from scipy import ndimage as nd
m=np.asarray(Image.open('mask.png'))>128
def grow(mm,r):
    yy,xx=np.mgrid[-r:r+1,-r:r+1]; k=(xx*xx+yy*yy)<=r*r
    return nd.binary_dilation(mm,structure=k)
pad=60
M=np.pad(m,pad); O=np.pad(out,((pad,pad),(pad,pad),(0,0)))
w=grow(M,16); b=grow(M,28)
rgba=np.zeros(M.shape+(4,),dtype='uint8')
rgba[b]=[17,17,17,255]; rgba[w]=[255,255,255,255]; rgba[M,:3]=O[M]; rgba[M,3]=255
im=Image.fromarray(rgba)
# 邊緣柔一點
a=im.split()[3].filter(ImageFilter.GaussianBlur(1.2)); im.putalpha(a)
im.save('sticker.png')
