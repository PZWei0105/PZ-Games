/* ===================== tag reader: ID3v1/v2 (MP3), MP4/M4A, FLAC, WAV ===================== */
R.meta = (() => {
  const slice = async (file, a, b) => new Uint8Array(await file.slice(a, b).arrayBuffer());
  const ascii = (u, o, n) => { let s = ''; for (let i = 0; i < n; i++) s += String.fromCharCode(u[o + i]); return s; };
  const u32 = (u, o) => ((u[o] << 24) >>> 0) + (u[o + 1] << 16) + (u[o + 2] << 8) + u[o + 3];
  const u32le = (u, o) => (u[o] | (u[o + 1] << 8) | (u[o + 2] << 16)) + u[o + 3] * 16777216;
  const syncsafe = (u, o) => ((u[o] & 0x7f) << 21) | ((u[o + 1] & 0x7f) << 14) | ((u[o + 2] & 0x7f) << 7) | (u[o + 3] & 0x7f);
  const clean = (s) => String(s || '').replace(/\u0000+/g, ' ').replace(/\s+/g, ' ').trim();

  const decoders = {};
  function dec(label, bytes, fatal) {
    const key = label + (fatal ? '!' : '');
    try { if (!decoders[key]) decoders[key] = new TextDecoder(label, { fatal: !!fatal }); return decoders[key].decode(bytes); }
    catch (e) { return null; }
  }
  // "Latin-1" tags written by Taiwanese / Chinese tools are usually Big5 or GBK in disguise
  function smart(bytes) {
    let hi = false;
    for (let i = 0; i < bytes.length; i++) if (bytes[i] > 0x7f) { hi = true; break; }
    if (!hi) return dec('latin1', bytes) || '';
    return dec('utf-8', bytes, true) || dec('big5', bytes, true) || dec('gbk', bytes, true) || dec('windows-1252', bytes) || '';
  }
  function decodeText(b, enc) {
    if (!b || !b.length) return '';
    if (enc === 0) return smart(b);
    if (enc === 3) return dec('utf-8', b) || '';
    if (enc === 2) return dec('utf-16be', b) || '';
    // 1: UTF-16 with BOM (each value may carry its own BOM)
    if (b[0] === 0xfe && b[1] === 0xff) return dec('utf-16be', b.subarray(2)) || '';
    if (b[0] === 0xff && b[1] === 0xfe) return dec('utf-16le', b.subarray(2)) || '';
    return dec('utf-16le', b) || '';
  }
  // find end of a null-terminated string (1 or 2 byte terminator)
  function termEnd(b, start, enc) {
    if (enc === 1 || enc === 2) { for (let i = start; i + 1 < b.length; i += 2) if (b[i] === 0 && b[i + 1] === 0) return i; return b.length; }
    for (let i = start; i < b.length; i++) if (b[i] === 0) return i;
    return b.length;
  }
  const unsync = (b) => { const out = []; for (let i = 0; i < b.length; i++) { out.push(b[i]); if (b[i] === 0xff && b[i + 1] === 0x00) i++; } return new Uint8Array(out); };
  const firstVal = (s) => clean(String(s || '').split('\u0000').filter(Boolean)[0] || s);

  async function id3v2(file) {
    const h = await slice(file, 0, 10);
    if (h[0] !== 0x49 || h[1] !== 0x44 || h[2] !== 0x33) return null;
    const ver = h[3], flags = h[5], size = syncsafe(h, 6);
    if (ver < 2 || ver > 4 || size <= 0) return null;
    let tag = await slice(file, 10, 10 + size);
    if ((flags & 0x80) && ver < 4) tag = unsync(tag);
    let p = 0;
    if ((flags & 0x40) && ver >= 3) p = ver === 3 ? u32(tag, 0) + 4 : syncsafe(tag, 0);
    const out = { tagSize: 10 + size };
    const pics = [];
    const validId = (o, n) => { for (let i = 0; i < n; i++) { const c = tag[o + i]; if (!((c >= 65 && c <= 90) || (c >= 48 && c <= 57))) return false; } return true; };
    while (p < tag.length) {
      let id, fsz, hdr, ff = 0;
      if (ver === 2) {
        if (p + 6 > tag.length || !validId(p, 3)) break;
        id = ascii(tag, p, 3); fsz = (tag[p + 3] << 16) | (tag[p + 4] << 8) | tag[p + 5]; hdr = 6;
      } else {
        if (p + 10 > tag.length || !validId(p, 4)) break;
        id = ascii(tag, p, 4); hdr = 10; ff = (tag[p + 8] << 8) | tag[p + 9];
        fsz = ver === 4 ? syncsafe(tag, p + 4) : u32(tag, p + 4);
        if (ver === 4) { // some taggers write plain sizes in v2.4
          const plain = u32(tag, p + 4);
          if (plain !== fsz) { const nx = p + 10 + fsz; const nxPlain = p + 10 + plain; if (!(nx + 4 <= tag.length && validId(nx, 4)) && nxPlain <= tag.length && (nxPlain + 4 > tag.length || validId(nxPlain, 4) || tag[nxPlain] === 0)) fsz = plain; }
        }
      }
      if (fsz <= 0 || p + hdr + fsz > tag.length) break;
      let d = tag.subarray(p + hdr, p + hdr + fsz);
      p += hdr + fsz;
      if (ver === 4) {
        if (ff & 0x000c) continue; // compressed / encrypted
        if (ff & 0x0002) d = unsync(d);
        if (ff & 0x0001) d = d.subarray(4);
      } else if (ver === 3 && (ff & 0x00c0)) continue;
      const T = (k) => { const enc = d[0]; out[k] = firstVal(decodeText(d.subarray(1), enc)); };
      switch (id) {
        case 'TIT2': case 'TT2': T('title'); break;
        case 'TPE1': case 'TP1': T('artist'); break;
        case 'TALB': case 'TAL': T('album'); break;
        case 'TPE2': case 'TP2': T('albumArtist'); break;
        case 'TYER': case 'TYE': case 'TDRC': T('year'); break;
        case 'TCON': case 'TCO': T('genre'); break;
        case 'TLEN': case 'TLE': { const enc = d[0]; const ms = parseInt(decodeText(d.subarray(1), enc), 10); if (ms > 0) out.duration = ms / 1000; break; }
        case 'USLT': case 'ULT': {
          const enc = d[0]; const e1 = termEnd(d, 4, enc); const st = e1 + (enc === 1 || enc === 2 ? 2 : 1);
          const txt = decodeText(d.subarray(st), enc); if (txt && !out.lyrics) out.lyrics = txt.replace(/\u0000/g, '').trim();
          break;
        }
        case 'APIC': {
          const enc = d[0]; const mEnd = termEnd(d, 1, 0); const mime = ascii(d, 1, mEnd - 1).toLowerCase();
          const type = d[mEnd + 1]; const dEnd = termEnd(d, mEnd + 2, enc);
          const st = dEnd + (enc === 1 || enc === 2 ? 2 : 1);
          if (st < d.length) pics.push({ type, mime: mime.includes('/') ? mime : 'image/' + (mime || 'jpeg'), data: d.slice(st) });
          break;
        }
        case 'PIC': {
          const enc = d[0]; const fmt = ascii(d, 1, 3).toLowerCase(); const type = d[4];
          const dEnd = termEnd(d, 5, enc); const st = dEnd + (enc === 1 || enc === 2 ? 2 : 1);
          if (st < d.length) pics.push({ type, mime: fmt === 'png' ? 'image/png' : 'image/jpeg', data: d.slice(st) });
          break;
        }
        default: break;
      }
    }
    if (pics.length) { const fr = pics.find((x) => x.type === 3) || pics[0]; out.picture = { mime: fr.mime, data: fr.data }; }
    return out;
  }

  async function id3v1(file) {
    if (file.size < 128) return null;
    const b = await slice(file, file.size - 128, file.size);
    if (ascii(b, 0, 3) !== 'TAG') return null;
    const f = (o, n) => { let e = o; while (e < o + n && b[e] !== 0) e++; return clean(smart(b.subarray(o, e))); };
    return { title: f(3, 30), artist: f(33, 30), album: f(63, 30), year: f(93, 4) };
  }

  async function mp4(file) {
    let off = 0, moov = null, guard = 0;
    while (off + 8 <= file.size && guard++ < 64) {
      const h = await slice(file, off, off + 16);
      let len = u32(h, 0); const type = ascii(h, 4, 4); let hdr = 8;
      if (len === 1) { len = u32(h, 8) * 4294967296 + u32(h, 12); hdr = 16; } else if (len === 0) len = file.size - off;
      if (len < hdr) break;
      if (type === 'moov') { if (len > 64 * 1024 * 1024) break; moov = await slice(file, off + hdr, off + len); break; }
      off += len;
    }
    if (!moov) return null;
    const out = {};
    const walk = (b, s, e, depth) => {
      let p = s;
      while (p + 8 <= e) {
        let len = u32(b, p); const type = ascii(b, p + 4, 4); let hdr = 8;
        if (len === 1) { len = u32(b, p + 8) * 4294967296 + u32(b, p + 12); hdr = 16; } else if (len === 0) len = e - p;
        if (len < 8 || p + len > e) break;
        const cs = p + hdr, ce = p + len;
        if (type === 'mvhd') {
          const v = b[cs]; const ts = v === 1 ? u32(b, cs + 20) : u32(b, cs + 12);
          const du = v === 1 ? u32(b, cs + 24) * 4294967296 + u32(b, cs + 28) : u32(b, cs + 16);
          if (ts > 0 && du > 0) out.duration = du / ts;
        } else if (type === 'udta' || type === 'ilst' || type === 'moov') walk(b, cs, ce, depth + 1);
        else if (type === 'meta') walk(b, cs + 4, ce, depth + 1);
        else if (depth >= 2 && b[cs + 4] !== undefined) {
          // item inside ilst: contains a 'data' atom
          let q = cs;
          while (q + 16 <= ce) {
            const dl = u32(b, q); const dt = ascii(b, q + 4, 4);
            if (dl < 8) break;
            if (dt === 'data') {
              const kind = u32(b, q + 8) & 0xffffff; const val = b.subarray(q + 16, q + dl);
              const txt = () => clean(dec('utf-8', val) || '');
              if (type === '©nam') out.title = txt();
              else if (type === '©ART') out.artist = txt();
              else if (type === '©alb') out.album = txt();
              else if (type === 'aART') out.albumArtist = txt();
              else if (type === '©day') out.year = txt().slice(0, 4);
              else if (type === '©gen') out.genre = txt();
              else if (type === '©lyr') out.lyrics = (dec('utf-8', val) || '').trim();
              else if (type === 'covr' && !out.picture) out.picture = { mime: kind === 14 ? 'image/png' : 'image/jpeg', data: val.slice() };
              break;
            }
            q += dl;
          }
        }
        p += len;
      }
    };
    walk(moov, 0, moov.length, 0);
    return out;
  }

  async function flac(file) {
    const h = await slice(file, 0, 4);
    let off = 0;
    if (ascii(h, 0, 4) !== 'fLaC') {
      // FLAC with a leading ID3 tag
      const id = await id3v2(file);
      if (!id) return null;
      const h2 = await slice(file, id.tagSize, id.tagSize + 4);
      if (ascii(h2, 0, 4) !== 'fLaC') return null;
      off = id.tagSize;
    }
    off += 4;
    const out = {};
    for (let i = 0; i < 128 && off + 4 <= file.size; i++) {
      const b = await slice(file, off, off + 4);
      const last = b[0] & 0x80, type = b[0] & 0x7f, len = (b[1] << 16) | (b[2] << 8) | b[3];
      if (type === 0 || type === 4 || type === 6) {
        const d = await slice(file, off + 4, off + 4 + len);
        if (type === 0 && d.length >= 18) {
          const sr = (d[10] << 12) | (d[11] << 4) | (d[12] >> 4);
          const total = (d[13] & 0x0f) * 4294967296 + u32(d, 14);
          if (sr > 0 && total > 0) out.duration = total / sr;
        } else if (type === 4) {
          let p = 0; const vl = u32le(d, p); p += 4 + vl; const n = u32le(d, p); p += 4;
          for (let k = 0; k < n && p + 4 <= d.length; k++) {
            const l = u32le(d, p); p += 4;
            const s = dec('utf-8', d.subarray(p, p + l)) || ''; p += l;
            const eq = s.indexOf('='); if (eq < 0) continue;
            const key = s.slice(0, eq).toUpperCase(), val = clean(s.slice(eq + 1));
            if (key === 'TITLE' && !out.title) out.title = val;
            else if (key === 'ARTIST' && !out.artist) out.artist = val;
            else if (key === 'ALBUM' && !out.album) out.album = val;
            else if (key === 'ALBUMARTIST') out.albumArtist = val;
            else if (key === 'DATE' && !out.year) out.year = val.slice(0, 4);
            else if (key === 'GENRE') out.genre = val;
            else if ((key === 'LYRICS' || key === 'UNSYNCEDLYRICS') && !out.lyrics) out.lyrics = s.slice(eq + 1).trim();
          }
        } else if (type === 6 && !out.picture) {
          let p = 0; const pt = u32(d, p); p += 4; const ml = u32(d, p); p += 4; const mime = ascii(d, p, ml); p += ml;
          const dl = u32(d, p); p += 4 + dl; p += 16; const sz = u32(d, p); p += 4;
          if (p + sz <= d.length) out.picture = { mime: mime || 'image/jpeg', data: d.slice(p, p + sz), type: pt };
        }
      }
      off += 4 + len;
      if (last) break;
    }
    return out;
  }

  async function wav(file) {
    const h = await slice(file, 0, 12);
    if (ascii(h, 0, 4) !== 'RIFF' || ascii(h, 8, 4) !== 'WAVE') return null;
    const out = {}; let off = 12; let fmt = null;
    for (let i = 0; i < 64 && off + 8 <= file.size; i++) {
      const c = await slice(file, off, off + 8);
      const id = ascii(c, 0, 4), len = u32le(c, 4);
      if (id === 'fmt ') { const d = await slice(file, off + 8, off + 8 + Math.min(len, 32)); fmt = { ch: d[2] | (d[3] << 8), sr: u32le(d, 4), bps: u32le(d, 8) }; }
      else if (id === 'data' && fmt && fmt.bps) out.duration = len / fmt.bps;
      else if (id === 'LIST' && len < 1e6) {
        const d = await slice(file, off + 8, off + 8 + len);
        if (ascii(d, 0, 4) === 'INFO') {
          let p = 4;
          while (p + 8 <= d.length) {
            const k = ascii(d, p, 4), l = u32le(d, p + 4); const v = clean(smart(d.subarray(p + 8, p + 8 + l)));
            if (k === 'INAM') out.title = v; else if (k === 'IART') out.artist = v; else if (k === 'IPRD') out.album = v;
            p += 8 + l + (l & 1);
          }
        }
      } else if (id === 'id3 ' || id === 'ID3 ') {
        // some editors put an ID3 tag inside a WAV chunk
        const blob = file.slice(off + 8, off + 8 + len);
        const t = await id3v2(blob).catch(() => null);
        if (t) for (const k of ['title', 'artist', 'album', 'picture', 'lyrics']) if (t[k] && !out[k]) out[k] = t[k];
      }
      off += 8 + len + (len & 1);
    }
    return out;
  }

  // MP3 length without decoding: Xing/Info/VBRI frame count, otherwise a CBR estimate
  const BR1 = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320];
  const BR2 = [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160];
  const SRS = { 3: [44100, 48000, 32000], 2: [22050, 24000, 16000], 0: [11025, 12000, 8000] };
  async function mp3Duration(file, start) {
    const b = await slice(file, start, start + 16384);
    let i = 0;
    while (i + 4 < b.length && !(b[i] === 0xff && (b[i + 1] & 0xe0) === 0xe0 && ((b[i + 1] >> 1) & 3) === 1 && (b[i + 2] >> 4) !== 15 && (b[i + 2] >> 4) !== 0 && ((b[i + 2] >> 2) & 3) !== 3)) i++;
    if (i + 4 >= b.length) return 0;
    const ver = (b[i + 1] >> 3) & 3, bri = b[i + 2] >> 4, sri = (b[i + 2] >> 2) & 3, mono = (b[i + 3] >> 6) === 3;
    if (ver === 1) return 0;
    const sr = SRS[ver][sri], spf = ver === 3 ? 1152 : 576;
    const xo = i + (ver === 3 ? (mono ? 21 : 36) : (mono ? 13 : 21));
    const tag = ascii(b, xo, 4);
    if ((tag === 'Xing' || tag === 'Info') && (u32(b, xo + 4) & 1)) { const frames = u32(b, xo + 8); if (frames > 0) return frames * spf / sr; }
    if (ascii(b, i + 36, 4) === 'VBRI') { const frames = u32(b, i + 36 + 14); if (frames > 0) return frames * spf / sr; }
    const kbps = (ver === 3 ? BR1 : BR2)[bri];
    if (!kbps) return 0;
    let end = file.size;
    if (file.size > 128) { const t = await slice(file, file.size - 128, file.size - 125); if (ascii(t, 0, 3) === 'TAG') end -= 128; }
    return ((end - start - i) * 8) / (kbps * 1000);
  }

  function fromName(name) {
    let base = String(name || '').replace(/\.[^.]+$/, '').replace(/_/g, ' ').trim();
    base = base.replace(/^\d{1,3}\s*[-.、]\s*/, '');
    const m = base.split(/\s+[-–—]\s+/);
    if (m.length >= 2) return { artist: clean(m[0]), title: clean(m.slice(1).join(' - ')) };
    return { title: clean(base) || '未命名', artist: '' };
  }

  async function read(file) {
    const head = await slice(file, 0, 12);
    const tag = ascii(head, 0, 4);
    let r = null;
    try {
      if (tag === 'fLaC') r = await flac(file);
      else if (ascii(head, 4, 4) === 'ftyp') r = await mp4(file);
      else if (tag === 'RIFF') r = await wav(file);
      else if (ascii(head, 0, 3) === 'ID3') {
        r = await id3v2(file);
        if (r) {
          const h2 = await slice(file, r.tagSize, r.tagSize + 4);
          if (ascii(h2, 0, 4) === 'fLaC') { const f = await flac(file); if (f) r = Object.assign({}, r, f, { picture: f.picture || r.picture }); }
          else if (!r.duration) r.duration = await mp3Duration(file, r.tagSize).catch(() => 0);
        }
      } else if (head[0] === 0xff && (head[1] & 0xe0) === 0xe0) r = { duration: await mp3Duration(file, 0).catch(() => 0) };
    } catch (e) { console.warn('tag read failed', file.name, e); r = null; }
    r = r || {};
    if (!r.title || !r.artist) {
      try { const v1 = await id3v1(file); if (v1) { if (!r.title && v1.title) r.title = v1.title; if (!r.artist && v1.artist) r.artist = v1.artist; if (!r.album && v1.album) r.album = v1.album; } } catch (e) { /* ignore */ }
    }
    const fn = fromName(file.name);
    if (!r.title) { r.title = fn.title; if (!r.artist && fn.artist) r.artist = fn.artist; }
    r.title = clean(r.title).slice(0, 200) || '未命名';
    r.artist = clean(r.artist).slice(0, 160);
    r.album = clean(r.album).slice(0, 160);
    return r;
  }

  return { read, fromName, smart };
})();
