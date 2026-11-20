"""測試、截圖用的上鎖紀錄（2026-11-21）：在瀏覽器放一筆「這台裝置記得」的紀錄，開門畫面才不會停在鎖。
指紋照 src/lock.js 的 UNP_RING 算（跟 App 的 LockCore.ringId 一樣：salt 前 10 碼 + '.' + 密語那一份的 nonce 前 8 碼），
書房換了密語、UNP_RING 改了也會跟著對。要拍「鎖」的畫面就不要加這段（shoot.py：UNP_LOCKED=1）。"""
import datetime
import json
import pathlib
import re

LOCK_JS = pathlib.Path(__file__).resolve().parent.parent / 'src' / 'lock.js'


def ring_id(src=None):
    s = (src or LOCK_JS.read_text(encoding='utf-8'))
    ring = s[s.index('const UNP_RING'):s.index('};', s.index('const UNP_RING'))]
    salt = re.search(r"salt: '([^']+)'", ring).group(1)
    n = re.search(r"\{ id: 'pass', n: '([^']+)'", ring).group(1)
    return salt[:10] + '.' + n[:8]


def record():
    now = datetime.datetime.now(datetime.timezone.utc).isoformat(timespec='milliseconds').replace('+00:00', 'Z')
    return {'v': 1, 'ring': ring_id(), 'at': now, 'pol': 'trust', 'hid': 0, 'lk': False}


def trust_js():
    return ("(() => { try { if (!localStorage.getItem('unpacked.v1.lock')) localStorage.setItem('unpacked.v1.lock', %s); } catch (e) {} })();"
            % json.dumps(json.dumps(record())))


if __name__ == '__main__':
    print(ring_id())
