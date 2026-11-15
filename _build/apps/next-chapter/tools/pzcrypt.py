"""PZX：書房與單行本共用的加密格式（跟 App 的 src/crypt.js 是同一套，改一邊要改另一邊）。

檔案：
  b'PZX1' | flags（1 byte；bit0 = 內容先 raw-deflate 壓過）| nonce（12 byte）| AES-GCM 密文（尾巴 16 byte 是驗證碼）
  AAD   = b'PZX1' + flags
  nonce = HMAC-SHA256(key, b'pzx-nonce' + flags + 要加密的內容)[:12]
          → 同一把鑰匙、同樣的內容，加密出來的檔案一模一樣：重組不會讓 git 每次都變，衝突時重組一次就好。

鑰匙：
  每本書一把 AES-128（K_b）：單行本連結 #k= 後面就是它（base64url，22 字）。
  書房一把 AES-256 總鑰匙（K_m）：只加密書架目錄 library.pzx（裡面有各本書的 K_b）。
  keyring.json（公開）：用密語、備用碼各包一份 K_m。
    KEK = PBKDF2-SHA256(正規化後的密語, salt, 600000 次, 32 byte)
    包法 = AES-GCM(KEK, 隨機 nonce, K_m, AAD = b'pz-keyring:' + id)
  密語正規化：Unicode NFC、拿掉所有空白。備用碼正規化：轉大寫、I/L→1、O→0、只留英數。
"""
import base64, hashlib, hmac, json, os, secrets, unicodedata, zlib

from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC

MAGIC = b'PZX1'
ITER = 600000
B62 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
CROCK = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'


def b64u(b):
    return base64.urlsafe_b64encode(b).rstrip(b'=').decode()


def unb64u(s):
    return base64.urlsafe_b64decode(s + '=' * (-len(s) % 4))


def rand_id(n):
    return ''.join(secrets.choice(B62) for _ in range(n))


def new_book_key():
    return b64u(os.urandom(16))


def new_master():
    return b64u(os.urandom(32))


def new_code():
    s = ''.join(secrets.choice(CROCK) for _ in range(16))
    return '-'.join(s[i:i + 4] for i in range(0, 16, 4))


def _deflate(b):
    co = zlib.compressobj(9, zlib.DEFLATED, -15)
    return co.compress(b) + co.flush()


def seal(key_b64, data, compress=True):
    """加密（決定性）：同一把鑰匙、同樣的內容 → 同樣的位元組。"""
    key = unb64u(key_b64)
    flags = 1 if compress else 0
    body = _deflate(data) if compress else data
    head = MAGIC + bytes([flags])
    nonce = hmac.new(key, b'pzx-nonce' + bytes([flags]) + body, hashlib.sha256).digest()[:12]
    return head + nonce + AESGCM(key).encrypt(nonce, body, head)


def unseal(key_b64, blob):
    if blob[:4] != MAGIC or len(blob) < 33:
        raise ValueError('not a PZX1 file')
    head, nonce, ct = blob[:5], blob[5:17], blob[17:]
    body = AESGCM(unb64u(key_b64)).decrypt(nonce, ct, head)
    return zlib.decompress(body, -15) if head[4] & 1 else body


def seal_json(key_b64, obj):
    return seal(key_b64, json.dumps(obj, ensure_ascii=False, separators=(',', ':')).encode('utf-8'))


def unseal_json(key_b64, blob):
    return json.loads(unseal(key_b64, blob).decode('utf-8'))


def norm_pass(s):
    return ''.join(unicodedata.normalize('NFC', s or '').split())


def norm_code(s):
    s = (s or '').upper().replace('I', '1').replace('L', '1').replace('O', '0')
    return ''.join(c for c in s if c.isascii() and c.isalnum())


def _kek(secret, salt, it=ITER):
    return PBKDF2HMAC(algorithm=hashes.SHA256(), length=32, salt=salt, iterations=it).derive(secret.encode('utf-8'))


def make_keyring(master_b64, passphrase, code):
    p, c = norm_pass(passphrase), norm_code(code)
    if len(p) < 2:
        raise ValueError('密語太短')
    if len(c) != 16:
        raise ValueError('備用碼要 16 碼')
    salt = os.urandom(16)
    master = unb64u(master_b64)
    wraps = []
    for wid, secret in (('pass', p), ('code', c)):
        n = os.urandom(12)
        wraps.append({'id': wid, 'n': b64u(n), 'c': b64u(AESGCM(_kek(secret, salt)).encrypt(n, master, b'pz-keyring:' + wid.encode()))})
    return {'v': 1, 'kdf': {'alg': 'PBKDF2-SHA256', 'iter': ITER, 'salt': b64u(salt)}, 'wraps': wraps}


def try_keyring(ring, text):
    """拿密語或備用碼試開 keyring，開得了回傳總鑰匙（base64url），不然 None。"""
    salt, it = unb64u(ring['kdf']['salt']), ring['kdf']['iter']
    for w in ring['wraps']:
        secret = norm_code(text) if w['id'] == 'code' else norm_pass(text)
        if not secret:
            continue
        try:
            return b64u(AESGCM(_kek(secret, salt, it)).decrypt(unb64u(w['n']), unb64u(w['c']), b'pz-keyring:' + w['id'].encode()))
        except Exception:
            pass
    return None
