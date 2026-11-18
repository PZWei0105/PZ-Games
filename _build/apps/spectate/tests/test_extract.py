#!/usr/bin/env python3
"""ytextract 的小測試：標題 → 車道、遊戲名稱、語言。python3 _build/apps/spectate/tests/test_extract.py"""
import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'tools'))
import ytextract as X

FAIL = 0


def eq(got, want, label):
    global FAIL
    if got != want:
        FAIL += 1
        print('✗', label, '→', repr(got), '（應該是', repr(want) + '）')
    else:
        print('✓', label, '→', repr(got))


# 車道
eq(X.lane_of('《魔物獵人 荒野》第3彈免費大型更新 宣傳影片'), 'trailer', '中文宣傳影片')
eq(X.lane_of('Monster Hunter Wilds - Official Launch Trailer', 'official'), 'trailer', '英文預告')
eq(X.lane_of('Monster Hunter Wilds Review'), 'review', '英文評測')
eq(X.lane_of('【評測】這款獨立遊戲值不值得買？'), 'review', '中文評測')
eq(X.lane_of('艾爾登法環 全BOSS 攻略 打法教學'), 'guide', '中文攻略')
eq(X.lane_of('本週遊戲新聞 TOP 10'), 'news', '新聞盤點')
eq(X.lane_of('Nintendo Direct 2026.11.20', 'official'), 'news', '直面會')
eq(X.lane_of('為什麼這款遊戲會失敗？劇情深度解析'), 'deep', '深度解析')
eq(X.lane_of('【實況】惡靈古堡 9 #3 好可怕'), 'play', '實況')
eq(X.lane_of('Elden Ring Gameplay Walkthrough Part 1'), 'guide', 'Walkthrough 是攻略')
eq(X.lane_of('隨便一支沒有關鍵字的影片', 'official'), 'trailer', '官方頻道預設預告')
eq(X.lane_of('隨便一支沒有關鍵字的影片', 'creator'), 'play', '創作者預設實況')
eq(X.lane_of('whatever', 'creator', live='live'), 'live', 'API 直播')

# 遊戲名稱
eq(X.names_in('《魔物獵人 荒野》第3彈免費大型更新 宣傳影片'), ['魔物獵人 荒野'], '書名號')
eq(X.names_in('【直播】《惡靈古堡 安魂曲》全劇情 #2'), ['惡靈古堡 安魂曲'], '略過【直播】')
eq(X.names_in('Monster Hunter Wilds - Official Launch Trailer'), ['Monster Hunter Wilds'], '英文 - 預告')
eq(X.names_in('Ghost of Yotei Review'), ['Ghost of Yotei'], '英文 Review')
eq(X.names_in('Death Stranding 2: On the Beach - Official Accolades Trailer | PS5 Games'), ['Death Stranding 2: On the Beach'], '有冒號的英文名')
eq(X.names_in('IGN Daily Fix: Big News Today'), [], '節目名不是遊戲')
eq(X.names_in('We Played 50 Hours of This and Here Is What We Think'), [], '一整句不是遊戲')
eq(X.names_in('【PS5】『ファイナルファンタジーVII リバース』ローンチトレーラー'), ['ファイナルファンタジーVII リバース'], '日文『』')
eq(X.names_in('黑神話：悟空 - 最新實機演示'), ['黑神話'], '中文冒號前（容許只抓到系列名）')

# 語言
eq(X.lang_of('《魔物獵人 荒野》宣傳影片'), 'zh', '中文')
eq(X.lang_of('ファイナルファンタジー トレーラー'), 'ja', '日文')
eq(X.lang_of('Official Trailer'), 'en', '英文')
eq(X.is_simplified('最新实机演示 游戏评测'), True, '簡體')
eq(X.is_simplified('最新實機演示 遊戲評測'), False, '繁體')

# 比對
eq(X.similar('魔物獵人 荒野', '魔物獵人荒野'), True, '空白不算')
eq(X.similar('Monster Hunter Wilds', 'MONSTER HUNTER WILDS™'), True, '大小寫與商標')
eq(X.similar('Hades', 'Hades II'), False, '續作不同款')
eq(X.iso_dur('PT1H2M3S'), 3723, '片長')
eq(X.iso_dur('PT45S'), 45, '短片長')

print('\n全部通過' if not FAIL else '\n%d 項沒過' % FAIL)
sys.exit(1 if FAIL else 0)
