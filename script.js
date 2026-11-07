'use strict';
/* =====================================================================
   PJOK Juara — game PJOK untuk SD dengan 3 tingkat kesulitan.
   Kerangka sama dengan OtakKilat:
   1 helper · 2 generator soal · 3 engine game · 4 UI & router
   ===================================================================== */

/* ---------- 1. Helper ---------- */
const $ = (s, r = document) => r.querySelector(s);
const ri = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
const pick = arr => arr[ri(0, arr.length - 1)];
const shuffle = arr => { const x = [...arr]; for (let i = x.length - 1; i > 0; i--) { const j = ri(0, i); [x[i], x[j]] = [x[j], x[i]]; } return x; };
const fmtN = n => new Intl.NumberFormat('id-ID').format(n);
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* abaikan */ } }
};
const LEVELS = [
  { id: 'mudah', name: 'Mudah', icon: '🌱', kelas: 'Kelas 1–2', mult: 1 },
  { id: 'sedang', name: 'Sedang', icon: '🔥', kelas: 'Kelas 3–4', mult: 2 },
  { id: 'sulit', name: 'Sulit', icon: '🚀', kelas: 'Kelas 5–6', mult: 3 }
];
const LV = Object.fromEntries(LEVELS.map(l => [l.id, l]));

const snd = {
  on: store.get('pj-snd', true), ctx: null,
  beep(f, d = 0.12, type = 'sine', v = 0.08, at = 0) {
    if (!this.on) return;
    try {
      this.ctx = this.ctx || new (window.AudioContext || window.webkitAudioContext)();
      const c = this.ctx, o = c.createOscillator(), g = c.createGain(), t = c.currentTime + at;
      o.type = type; o.frequency.value = f;
      g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + d + 0.02);
    } catch (e) { /* abaikan */ }
  },
  ok() { this.beep(660, 0.1); this.beep(880, 0.14, 'sine', 0.08, 0.09); },
  bad() { this.beep(160, 0.25, 'sawtooth', 0.05); },
  tick() { this.beep(1000, 0.05, 'square', 0.025); },
  win() { [523, 659, 784, 1046].forEach((f, i) => this.beep(f, 0.18, 'triangle', 0.08, i * 0.12)); },
  end() { [392, 330, 262].forEach((f, i) => this.beep(f, 0.2, 'triangle', 0.07, i * 0.15)); }
};

/* =====================================================================
   2. GENERATOR SOAL
   ===================================================================== */

/* ---- Kilat PJOK: pernyataan Benar/Salah. Format: [benar, salah, penjelasan] ---- */
const FACTS = {
  mudah: [
    ['Sebelum berolahraga, kita harus pemanasan.', 'Sebelum berolahraga, kita tidak perlu pemanasan.', 'Pemanasan menyiapkan otot supaya tidak cedera.'],
    ['Setelah berolahraga, kita perlu minum air putih.', 'Setelah berolahraga, kita tidak boleh minum air.', 'Tubuh kehilangan cairan lewat keringat, jadi perlu minum.'],
    ['Kita mencuci tangan dengan sabun sebelum makan.', 'Kita mencuci tangan hanya setelah makan.', 'Cuci tangan sebelum makan membuang kuman.'],
    ['Sepak bola dimainkan dengan kaki.', 'Sepak bola dimainkan dengan tangan.', 'Pemain sepak bola menendang bola dengan kaki.'],
    ['Menggosok gigi dilakukan pagi dan sebelum tidur.', 'Menggosok gigi cukup sekali seminggu.', 'Gigi digosok minimal dua kali sehari.'],
    ['Sayur dan buah membuat tubuh sehat.', 'Anak sehat hanya perlu makan permen.', 'Sayur dan buah mengandung banyak vitamin.'],
    ['Berlari termasuk gerak berpindah tempat.', 'Berlari termasuk gerak di tempat.', 'Berlari memindahkan tubuh dari satu tempat ke tempat lain.'],
    ['Anak SD butuh tidur sekitar 9–11 jam.', 'Anak SD cukup tidur 3 jam.', 'Tidur cukup membuat badan segar dan kuat.'],
    ['Bola basket dimasukkan ke dalam keranjang.', 'Bola basket dimasukkan ke dalam gawang.', 'Basket mencetak angka lewat keranjang.'],
    ['Saat bermain, kita tidak boleh mendorong teman.', 'Saat bermain, boleh mendorong teman.', 'Bermain harus tertib dan aman.']
  ],
  sedang: [
    ['Satu regu bola voli bermain dengan 6 pemain di lapangan.', 'Satu regu bola voli bermain dengan 11 pemain di lapangan.', 'Bola voli 6 pemain, sepak bola 11 pemain.'],
    ['Satu tim sepak bola terdiri dari 11 pemain.', 'Satu tim sepak bola terdiri dari 5 pemain.', 'Sepak bola dimainkan 11 pemain per tim.'],
    ['Lompat jauh dinilai dari jarak lompatan.', 'Lompat jauh dinilai dari lamanya melayang.', 'Semakin jauh lompatan, semakin baik nilainya.'],
    ['Lari estafet memakai tongkat yang dioper antarpelari.', 'Lari estafet tidak memakai tongkat.', 'Tongkat estafet dioper dari pelari ke pelari.'],
    ['Protein dari telur dan ikan membantu membangun otot.', 'Protein hanya terdapat pada permen.', 'Telur, ikan, dan tempe kaya protein.'],
    ['Denyut nadi dapat dirasakan di pergelangan tangan.', 'Denyut nadi hanya dapat dirasakan di telapak kaki.', 'Letakkan jari di pergelangan tangan untuk merasakan nadi.'],
    ['Kasti dimainkan dengan bola dan pemukul.', 'Kasti dimainkan dengan raket dan kok.', 'Raket dan kok dipakai pada bulutangkis.'],
    ['Luka kecil harus dibersihkan lalu ditutup plester.', 'Luka kecil sebaiknya dibiarkan kotor.', 'Luka yang bersih mencegah infeksi.'],
    ['Pendinginan dilakukan setelah berolahraga.', 'Pendinginan dilakukan sebelum berolahraga.', 'Sebelum olahraga namanya pemanasan, sesudahnya pendinginan.'],
    ['Guling depan termasuk gerakan senam lantai.', 'Guling depan termasuk permainan bola besar.', 'Guling depan, kayang, dan roda adalah senam lantai.']
  ],
  sulit: [
    ['Kelincahan adalah kemampuan mengubah arah dengan cepat.', 'Kelincahan adalah kemampuan mengangkat beban berat.', 'Mengangkat beban berkaitan dengan kekuatan, bukan kelincahan.'],
    ['Sprint adalah lari jarak pendek dengan kecepatan tinggi.', 'Sprint adalah lari jarak jauh dengan santai.', 'Sprint biasanya 60–100 meter.'],
    ['Push-up melatih kekuatan otot lengan dan dada.', 'Push-up melatih kelenturan kaki saja.', 'Push-up termasuk latihan kekuatan.'],
    ['Peregangan melatih kelenturan sendi dan otot.', 'Menahan napas melatih kelenturan sendi dan otot.', 'Kelenturan dilatih dengan peregangan.'],
    ['Jeruk dan jambu kaya vitamin C.', 'Nasi putih adalah sumber vitamin C terbaik.', 'Buah segar seperti jeruk kaya vitamin C.'],
    ['Passing bawah bola voli memakai kedua lengan bawah.', 'Passing bawah bola voli memakai ujung jari.', 'Ujung jari dipakai untuk passing atas.'],
    ['Pada bulutangkis, angka didapat saat kok jatuh di lapangan lawan.', 'Bulutangkis dimainkan dengan bola karet.', 'Bulutangkis memakai raket dan kok.'],
    ['Lari jarak jauh melatih daya tahan jantung dan paru-paru.', 'Tidur siang melatih daya tahan jantung dan paru-paru.', 'Olahraga seperti lari melatih jantung dan paru-paru.'],
    ['Rokok merusak paru-paru, termasuk paru-paru atlet.', 'Rokok baik untuk paru-paru atlet.', 'Rokok berbahaya bagi kesehatan.'],
    ['Kebugaran jasmani membuat tubuh tidak mudah lelah saat belajar.', 'Kebugaran jasmani tidak berhubungan dengan kesehatan.', 'Tubuh yang bugar lebih kuat dan tahan lelah.']
  ]
};
const KILAT = {
  mudah: { time: 60, bonus: 2, penalty: 3 },
  sedang: { time: 50, bonus: 2, penalty: 4 },
  sulit: { time: 45, bonus: 2, penalty: 5 }
};
const KILAT_STARS = { mudah: [8, 14, 20], sedang: [8, 14, 20], sulit: [7, 12, 18] };
const COMBO_EVERY = 5, COMBO_BONUS = 3; // tantangan: combo kelipatan 5 = bonus waktu
function genFact(deck, level) {
  if (!deck.length) deck.push(...shuffle(FACTS[level]));
  const f = deck.pop(), val = Math.random() < 0.5;
  return { text: val ? f[0] : f[1], answer: val, why: f[2] };
}

/* ---- Pilihan jawaban numerik (sama seperti OtakKilat) ---- */
function makeOptions(answer, others, trap) {
  const ok = x => Number.isFinite(x) && x >= 0 && x !== answer;
  const pool = [];
  if (trap !== undefined && ok(Math.round(trap))) pool.push(Math.round(trap));
  shuffle([...new Set(others.map(Math.round).filter(ok))]).forEach(x => { if (pool.length < 3 && !pool.includes(x)) pool.push(x); });
  for (let k = 1; pool.length < 3 && k < 50; k++) {
    for (const x of [answer + k, answer - k]) if (pool.length < 3 && ok(x) && !pool.includes(x)) pool.push(x);
  }
  const options = shuffle([answer, ...pool]);
  return { options, index: options.indexOf(answer) };
}
function niceStep(ans) { const s = Math.max(ans * 0.1, 1), mag = Math.pow(10, Math.floor(Math.log10(s))); return Math.ceil(s / mag) * mag; }

/* ---- Pola Gerak: tebak gerakan berikutnya ---- */
const MOVES = [['🦘', 'Lompat'], ['🧎', 'Jongkok'], ['👏', 'Tepuk tangan'], ['🔄', 'Putar badan'], ['🏃', 'Lari di tempat'], ['🙆', 'Rentang tangan']];
const UNITS = { mudah: ['AB'], sedang: ['ABC', 'AAB', 'ABB'], sulit: ['ABCD', 'AABB', 'ABAC', 'AABC'] };
function genPat(level) {
  const unit = pick(UNITS[level]), letters = [...new Set(unit)], mv = shuffle(MOVES);
  const map = Object.fromEntries(letters.map((l, i) => [l, mv[i]]));
  const seq = Array.from({ length: 6 }, (_, i) => map[unit[i % unit.length]]);
  return { shown: seq.slice(0, 5), answer: seq[5], names: [...unit].map(l => map[l][1]) };
}
function quizPat(level) {
  const g = genPat(level), others = shuffle(MOVES.filter(m => m !== g.answer)).slice(0, 3);
  const opts = shuffle([g.answer, ...others]);
  return {
    prompt: `<div class="seq">${g.shown.map(m => `<span class="chip">${m[0]}<small>${m[1]}</small></span>`).join('')}<span class="chip q">?</span></div><p class="hint">Gerakan apa yang datang berikutnya?</p>`,
    options: opts.map(m => `${m[0]} ${m[1]}`), correct: opts.indexOf(g.answer),
    why: `Pola berulang: ${g.names.join(' → ')}. Jadi gerakan berikutnya: ${g.answer[1]}.`
  };
}

/* ---- Hidup Sehat: soal cerita hitungan + kuis pengetahuan ---- */
function genHitung(level) {
  const kinds = { mudah: ['putar', 'air', 'skor'], sedang: ['putar', 'air', 'skor', 'menit'], sulit: ['putar', 'menit', 'tim', 'skor'] };
  const k = pick(kinds[level]), s = { mudah: 1, sedang: 2, sulit: 3 }[level];
  if (k === 'putar') { const n = ri(2, 3 + s), m = pick([50, 100, 200]); return { q: `Kamu berlari ${n} putaran. Satu putaran lapangan panjangnya ${m} meter. Berapa meter yang kamu tempuh?`, ans: n * m, u: ' m', why: `${n} × ${m} = ${n * m} meter.` }; }
  if (k === 'air') { const t = pick([6, 8]), x = ri(1, t - 1); return { q: `Hari ini kamu harus minum ${t} gelas air. Kamu sudah minum ${x} gelas. Berapa gelas lagi yang harus diminum?`, ans: t - x, u: ' gelas', trap: t + x, why: `${t} − ${x} = ${t - x} gelas lagi.` }; }
  if (k === 'skor') { const a = ri(1, 3 * s), b = ri(1, 3 * s); return { q: `Timmu mencetak ${a} gol di babak pertama dan ${b} gol di babak kedua. Berapa total golnya?`, ans: a + b, u: ' gol', why: `${a} + ${b} = ${a + b} gol.` }; }
  if (k === 'menit') { const m = pick([15, 20, 30]), d = ri(3, 6); return { q: `Setiap hari kamu berlatih ${m} menit selama ${d} hari. Berapa menit total latihanmu?`, ans: m * d, u: ' menit', why: `${m} × ${d} = ${m * d} menit.` }; }
  const t = ri(3, 6), p = pick([4, 5, 6]); return { q: `Ada ${t * p} siswa dibagi sama banyak ke dalam tim berisi ${p} orang. Berapa tim yang terbentuk?`, ans: t, u: ' tim', why: `${t * p} ÷ ${p} = ${t} tim.` };
}
/* Format: [pertanyaan, jawaban benar, [3 jawaban salah], penjelasan] */
const BANK = {
  mudah: [
    ['Badanmu berkeringat setelah olahraga. Apa yang sebaiknya kamu lakukan?', 'Mandi dan ganti baju bersih', ['Langsung tidur tanpa mandi', 'Memakai baju basah seharian', 'Makan permen banyak-banyak'], 'Mandi dan ganti baju menjaga tubuh tetap bersih dan sehat.'],
    ['Makanan apa yang sehat sebelum berolahraga?', 'Pisang', ['Permen', 'Es krim banyak', 'Minuman bersoda'], 'Pisang memberi tenaga dan lebih sehat.'],
    ['Alat apa yang dipakai untuk bermain bulutangkis?', 'Raket dan kok', ['Pemukul dan bola kasti', 'Bola dan keranjang', 'Tongkat estafet'], 'Bulutangkis dimainkan dengan raket dan kok.'],
    ['Kapan kita harus mencuci tangan?', 'Sebelum makan dan setelah dari toilet', ['Hanya hari Senin', 'Tidak perlu dicuci', 'Hanya sebelum tidur'], 'Cuci tangan pakai sabun mencegah penyakit.'],
    ['Pakaian apa yang cocok untuk pelajaran PJOK?', 'Baju olahraga dan sepatu karet', ['Jaket tebal dan sandal jepit', 'Baju tidur', 'Seragam resmi dan sepatu pantofel'], 'Baju olahraga nyaman dan sepatu karet tidak licin.'],
    ['Agar bermain di lapangan aman, kita harus …', 'Bermain sesuai aturan', ['Berlari sambil mendorong teman', 'Melempar bola ke wajah teman', 'Bermain tanpa mendengar guru'], 'Aturan membuat permainan aman dan adil.']
  ],
  sedang: [
    ['Lutut temanmu lecet karena jatuh. Apa langkah pertama?', 'Mencuci luka dengan air bersih', ['Menaburi luka dengan tanah', 'Menyuruhnya lari lagi', 'Membiarkan luka terbuka kotor'], 'Luka dibersihkan dulu agar tidak infeksi.'],
    ['Zat gizi yang membangun otot adalah …', 'Protein', ['Garam', 'Air', 'Gula'], 'Protein dari telur, ikan, dan tempe membangun otot.'],
    ['Apa yang dioper antarpelari pada lari estafet?', 'Tongkat estafet', ['Bola kasti', 'Kok', 'Raket'], 'Pelari mengoper tongkat estafet ke pelari berikutnya.'],
    ['Denyut nadi biasanya paling cepat saat …', 'Berlari', ['Duduk santai', 'Tidur', 'Membaca'], 'Saat bergerak cepat, jantung berdetak lebih cepat.'],
    ['Menendang bola ke arah teman disebut …', 'Mengumpan (passing)', ['Menyundul', 'Menangkap', 'Servis'], 'Mengumpan berarti mengoper bola ke teman.'],
    ['Berapa lama anak sekolah disarankan aktif bergerak tiap hari?', 'Sekitar 60 menit', ['5 menit', 'Tidak perlu bergerak', '8 jam'], 'Anak usia sekolah disarankan aktif sekitar 60 menit per hari.']
  ],
  sulit: [
    ['Urutan kegiatan olahraga yang benar adalah …', 'Pemanasan, kegiatan inti, pendinginan', ['Kegiatan inti, pemanasan, pendinginan', 'Pendinginan, inti, pemanasan', 'Kegiatan inti saja'], 'Mulai dengan pemanasan dan akhiri dengan pendinginan.'],
    ['Latihan sit-up terutama melatih otot …', 'Perut', ['Telinga', 'Jari kaki', 'Mata'], 'Sit-up menguatkan otot perut.'],
    ['Kekuatan, kelincahan, kelenturan, dan … adalah unsur kebugaran jasmani.', 'Daya tahan', ['Keberuntungan', 'Warna kulit', 'Tinggi bangunan'], 'Daya tahan adalah kemampuan tubuh bekerja lama tanpa lelah.'],
    ['Gizi seimbang berarti makan …', 'Beragam: nasi, lauk, sayur, dan buah', ['Hanya daging', 'Hanya nasi', 'Hanya makanan manis'], 'Tubuh butuh banyak jenis zat gizi.'],
    ['Pada lompat jauh, tolakan dilakukan dengan …', 'Satu kaki yang kuat', ['Kedua tangan', 'Kepala', 'Perut'], 'Tolakan satu kaki di papan tumpu memberi dorongan ke depan.'],
    ['Temanmu pingsan saat olahraga. Tindakan awal yang tepat?', 'Pindahkan ke tempat teduh dan panggil guru', ['Siram dengan air es', 'Suruh dia berdiri', 'Tinggalkan sendirian'], 'Tempat teduh membantunya pulih, guru akan menolong.']
  ]
};
const sehatDeck = { bank: [], lv: '' };
function quizSehat(level) {
  if (Math.random() < 0.35) {
    const g = genHitung(level), a = g.ans, st = niceStep(a), o = makeOptions(a, [a + st, a - st, a + 2 * st, a - 2 * st, a + 1, a - 1], g.trap);
    return { prompt: `<p class="story">${g.q}</p>`, options: o.options.map(x => fmtN(x) + g.u), correct: o.index, why: g.why };
  }
  if (!sehatDeck.bank.length || sehatDeck.lv !== level) { sehatDeck.lv = level; sehatDeck.bank = shuffle(BANK[level]); }
  const [q, c, w, why] = sehatDeck.bank.pop(), opts = shuffle([c, ...w]);
  return { prompt: `<p class="story">${q}</p>`, options: opts, correct: opts.indexOf(c), why };
}
const QUIZ = {
  pola: { total: 10, time: { mudah: 20, sedang: 15, sulit: 12 }, gen: quizPat, bonusEvery: 5 },
  sehat: { total: 10, time: { mudah: 40, sedang: 35, sulit: 30 }, gen: quizSehat, help: true }
};

/* =====================================================================
   3. ENGINE GAME (sama seperti OtakKilat)
   ===================================================================== */
class Timer {
  constructor(onTick, onEnd) { this.onTick = onTick; this.onEnd = onEnd; this.left = 0; this.running = false; this.id = null; this.last = 0; }
  start(ms) { this.stop(); this.left = ms; this.last = performance.now(); this.running = true; this.id = setInterval(() => this.tick(), 100); this.onTick(this.left); }
  tick() {
    if (!this.running) return;
    const n = performance.now(); this.left -= n - this.last; this.last = n;
    if (this.left <= 0) { this.left = 0; this.stop(); this.onTick(0); this.onEnd(); return; }
    this.onTick(this.left);
  }
  pause() { if (!this.running) return; this.left -= performance.now() - this.last; this.running = false; }
  resume() { if (this.id === null || this.running) return; this.last = performance.now(); this.running = true; }
  add(ms, cap = Infinity) { this.left = Math.min(cap, this.left + ms); this.onTick(Math.max(0, this.left)); }
  stop() { clearInterval(this.id); this.id = null; this.running = false; }
}

let active = null, runId = 0, lastSec = -1;
const newSession = (game, level) => ({ game, level, mult: LV[level].mult, score: 0, correct: 0, wrong: 0, combo: 0, bestCombo: 0, stars: 0, extra: [], started: Date.now() });

function hudMarkup(mid) {
  return `<div class="hud">
    <div class="hud-i"><span>Skor</span><b id="hScore">0</b></div>
    <div class="hud-i"><span>Combo</span><b id="hCombo">0</b></div>
    <div class="hud-i"><span>${mid}</span><b id="hMid">0</b></div>
    <div class="hud-i t" id="hTimeBox"><span>Waktu</span><b id="hTime">0</b></div>
    <button type="button" class="icon-btn" id="pauseBtn" aria-label="Jeda">⏸</button>
  </div><div class="bar" id="bar"><i></i></div><div class="pop" id="pop"></div>`;
}
function setHud(S, mid) {
  $('#hScore').textContent = fmtN(S.score);
  $('#hCombo').textContent = S.combo > 1 ? '🔥' + S.combo : String(S.combo);
  if (mid !== undefined) $('#hMid').textContent = mid;
}
function setTime(ms, total) {
  const sec = Math.ceil(ms / 1000), low = ms > 0 && ms <= 5000;
  $('#hTime').textContent = sec;
  $('#bar i').style.width = Math.max(0, Math.min(100, (ms / total) * 100)) + '%';
  $('#hTimeBox').classList.toggle('low', low); $('#bar').classList.toggle('low', low);
  if (low && sec !== lastSec) snd.tick();
  lastSec = sec;
}
function pop(text, cls) { const el = $('#pop'); if (!el) return; el.textContent = text; el.className = 'pop ' + cls; void el.offsetWidth; el.classList.add('go'); }
function bindPause() { $('#pauseBtn').addEventListener('click', doPause); }
function doPause() {
  if (!active || active.paused || active.locked) return;
  active.paused = true; active.pause();
  const o = document.createElement('div'); o.className = 'overlay'; o.id = 'pauseOv';
  o.innerHTML = `<div class="ov-box" role="dialog" aria-label="Jeda"><h2>Jeda</h2><p>Waktu berhenti dan soal disembunyikan.</p><button class="btn primary big" id="resume">Lanjut</button><button class="btn" id="quit">Keluar ke menu</button></div>`;
  document.body.appendChild(o); $('#resume').focus();
  $('#resume').addEventListener('click', doResume);
  $('#quit').addEventListener('click', () => { removeOverlay(); go('#home'); });
}
function removeOverlay() { const o = $('#pauseOv'); if (o) o.remove(); }
function doResume() { removeOverlay(); if (active && active.paused) { active.paused = false; active.resume(); } }

function finish(S) {
  if (active) active.locked = true;
  const all = store.get('pj-best', {}), key = S.game + ':' + S.level, prev = all[key] || 0;
  S.record = S.score > prev; S.prev = prev;
  if (S.record) { all[key] = S.score; store.set('pj-best', all); }
  S.stars > 0 ? snd.win() : snd.end();
  showResult(S);
}
function showResult(S) {
  const g = GAMES.find(x => x.id === S.game), lv = LV[S.level];
  const acc = S.correct + S.wrong > 0 ? Math.round((S.correct / (S.correct + S.wrong)) * 100) : 0;
  $('#app').innerHTML = `<section class="result" style="--accent:${g.color}">
    <p class="muted">${g.icon} ${g.title} · ${lv.icon} ${lv.name}</p>
    <h1>${S.title || 'Waktu habis!'}</h1>
    <div class="stars" aria-label="${S.stars} dari 3 bintang">${[1, 2, 3].map(i => `<span class="${i <= S.stars ? '' : 'off'}">★</span>`).join('')}</div>
    <div class="score-big">${fmtN(S.score)}</div>
    ${S.record ? '<span class="badge">🎉 Rekor baru!</span>' : ''}
    <p class="rec">${S.prev ? `Rekor sebelumnya: ${fmtN(S.prev)}` : 'Belum ada rekor sebelumnya'}</p>
    <div class="stats">${S.extra.map(([k, v]) => `<div class="stat"><span>${k}</span><b>${v}</b></div>`).join('')}<div class="stat"><span>Ketepatan</span><b>${acc}%</b></div></div>
    <div class="r-actions"><button class="btn primary big" id="again">↻ Main lagi</button><button class="btn" id="chg">Ganti level</button><button class="btn" id="home">Menu</button></div></section>`;
  $('#again').addEventListener('click', () => go(`#p/${S.game}/${S.level}`));
  $('#chg').addEventListener('click', () => go(`#g/${S.game}`));
  $('#home').addEventListener('click', () => go('#home'));
  $('#again').focus();
}

/* ---------- Game 1: Kilat PJOK (Benar / Salah, waktu total) ---------- */
function playKilat(S) {
  const cfg = KILAT[S.level], cap = cfg.time * 1500, deck = [], runIdNow = runId;
  $('#app').innerHTML = `<section class="play" style="--accent:${GAMES[0].color}">${hudMarkup('Benar')}
    <div class="q-card" id="qcard"><div class="q-text" id="qtext"></div></div>
    <div class="tf"><button type="button" class="btn tfb yes" data-v="1">✅ Benar <kbd>B</kbd></button><button type="button" class="btn tfb no" data-v="0">❌ Salah <kbd>S</kbd></button></div>
    <div id="fb" class="fb-s"></div></section>`;
  bindPause();
  const card = $('#qcard'); let q, over = false;
  const timer = new Timer(ms => setTime(ms, cap), () => {
    over = true; if (active) active.locked = true; S.title = 'Waktu habis!';
    setTimeout(() => { if (runIdNow === runId) end(); }, 500);
  });
  function flash(c) { card.classList.remove('good', 'bad'); void card.offsetWidth; card.classList.add(c); setTimeout(() => card.classList.remove(c), 300); }
  function next() { q = genFact(deck, S.level); $('#qtext').textContent = q.text; }
  function answer(v) {
    if (over || (active && active.paused)) return;
    const prevWhy = q.why;
    if (v === q.answer) {
      S.correct++; S.combo++; S.bestCombo = Math.max(S.bestCombo, S.combo);
      S.score += Math.round(10 * S.mult * (1 + Math.min(S.combo, 10) * 0.1));
      const comboHit = S.combo % COMBO_EVERY === 0, add = cfg.bonus + (comboHit ? COMBO_BONUS : 0);
      timer.add(add * 1000, cap); pop(comboHit ? `🔥 Combo! +${add} dtk` : `+${add} dtk`, 'good'); snd.ok(); flash('good');
      $('#fb').innerHTML = `<b>✅ Betul!</b> ${prevWhy}`;
    } else {
      S.wrong++; S.combo = 0; timer.add(-cfg.penalty * 1000, cap); pop(`−${cfg.penalty} dtk`, 'bad'); snd.bad(); flash('bad');
      $('#fb').innerHTML = `<b>❌ Belum tepat.</b> ${prevWhy}`;
    }
    setHud(S, S.correct); next();
  }
  function end() {
    const t = Math.round((Date.now() - S.started) / 1000), [s1, s2, s3] = KILAT_STARS[S.level];
    S.stars = S.correct >= s3 ? 3 : S.correct >= s2 ? 2 : S.correct >= s1 ? 1 : 0;
    S.extra = [['Jawaban benar', S.correct], ['Combo terbaik', S.bestCombo], ['Durasi main', t + ' dtk']];
    finish(S);
  }
  document.querySelectorAll('.tfb').forEach(b => b.addEventListener('click', () => answer(b.dataset.v === '1')));
  const onKey = e => {
    const k = e.key.toLowerCase();
    if (k === 'b' || k === 'arrowleft') answer(true); else if (k === 's' || k === 'arrowright') answer(false);
  };
  document.addEventListener('keydown', onKey);
  active = { paused: false, locked: false, pause() { timer.pause(); }, resume() { timer.resume(); }, destroy() { timer.stop(); document.removeEventListener('keydown', onKey); } };
  setHud(S, 0); next(); timer.start(cfg.time * 1000);
}

/* ---------- Game 2 & 3: Kuis berwaktu per soal (Pola Gerak, Hidup Sehat) ---------- */
function playQuiz(S, spec, color) {
  const secs = spec.time[S.level], total = spec.total, runIdNow = runId;
  let idx = 0, q, answered = false, advance = null, over = false, bonus = false, halved = false, helpGone = false;
  $('#app').innerHTML = `<section class="play" style="--accent:${color}">${hudMarkup('Soal')}
    <div class="q-card" id="qcard"><div id="prompt"></div>${spec.help ? '<button class="btn ghost" id="help" type="button">💡 Bantuan 50:50 (1x)</button>' : ''}</div>
    <div class="opts" id="opts"></div><div id="fb"></div></section>`;
  bindPause();
  const timer = new Timer(ms => setTime(ms, secs * 1000), () => answer(-1));
  function show() {
    q = spec.gen(S.level); idx++; answered = false; halved = false;
    bonus = !!spec.bonusEvery && idx % spec.bonusEvery === 0;
    $('#prompt').innerHTML = (bonus ? '<span class="tag">⭐ Soal Bonus ×2</span>' : '') + q.prompt; $('#fb').innerHTML = '';
    $('#qcard').classList.remove('good', 'bad');
    $('#opts').innerHTML = q.options.map((o, i) => `<button type="button" class="opt" data-i="${i}"><kbd>${i + 1}</kbd><span>${o}</span></button>`).join('');
    if (spec.help) $('#help').disabled = helpGone;
    setHud(S, `${idx}/${total}`);
    if (active) active.locked = false;
    timer.start(secs * 1000);
  }
  function answer(i) {
    if (answered || over) return;
    answered = true; timer.stop(); if (active) active.locked = true;
    const ok = i === q.correct, frac = Math.max(0, timer.left) / (secs * 1000);
    document.querySelectorAll('.opt').forEach((b, k) => { b.disabled = true; if (k === q.correct) b.classList.add('right'); else if (k === i) b.classList.add('wrong'); });
    let msg;
    if (ok) {
      S.correct++; S.combo++; S.bestCombo = Math.max(S.bestCombo, S.combo);
      let pts = (100 + Math.round(frac * 50) + Math.min(S.combo - 1, 5) * 10) * S.mult;
      if (bonus) pts *= 2; if (halved) pts = Math.round(pts / 2);
      S.score += pts; snd.ok(); $('#qcard').classList.add('good'); pop(`+${pts}`, 'good');
      msg = `<div class="fb good"><b>✅ Benar! +${pts} poin</b>${q.why}</div>`;
    } else {
      S.wrong++; S.combo = 0; snd.bad(); $('#qcard').classList.add('bad');
      msg = `<div class="fb bad"><b>${i === -1 ? '⏰ Waktu habis!' : '❌ Belum tepat'}</b>${q.why}<br><button class="btn primary" id="nextBtn" type="button">${idx >= total ? 'Lihat hasil' : 'Lanjut'} ↵</button></div>`;
    }
    setHud(S, `${idx}/${total}`); $('#fb').innerHTML = msg;
    if (ok) advance = setTimeout(nextQ, 1500); else { $('#nextBtn').addEventListener('click', nextQ); $('#nextBtn').focus(); }
  }
  function nextQ() { if (runIdNow !== runId || over) return; clearTimeout(advance); if (idx >= total) { over = true; return end(); } show(); }
  function end() {
    S.stars = S.correct >= 9 ? 3 : S.correct >= 7 ? 2 : S.correct >= 4 ? 1 : 0;
    S.title = S.correct >= 7 ? 'Hebat, kamu juara!' : S.correct >= 4 ? 'Lumayan, terus berlatih!' : 'Ayo coba lagi!';
    S.extra = [['Jawaban benar', `${S.correct}/${total}`], ['Combo terbaik', S.bestCombo], ['Waktu per soal', secs + ' dtk']];
    finish(S);
  }
  $('#opts').addEventListener('click', e => { const b = e.target.closest('.opt'); if (b && !b.disabled && !(active && active.paused)) answer(Number(b.dataset.i)); });
  if (spec.help) $('#help').addEventListener('click', () => {
    if (answered || helpGone || over || (active && active.paused)) return;
    helpGone = halved = true; $('#help').disabled = true;
    shuffle(q.options.map((_, i) => i).filter(i => i !== q.correct)).slice(0, 2).forEach(i => { const b = document.querySelector(`.opt[data-i="${i}"]`); b.disabled = true; b.style.visibility = 'hidden'; });
  });
  const onKey = e => {
    if (active && active.paused) return;
    if (e.key >= '1' && e.key <= '4' && !answered) { const b = document.querySelector(`.opt[data-i="${Number(e.key) - 1}"]`); if (b && !b.disabled) answer(Number(e.key) - 1); }
    else if ((e.key === 'Enter' || e.key === ' ') && answered && $('#nextBtn')) { e.preventDefault(); nextQ(); }
  };
  document.addEventListener('keydown', onKey);
  active = { paused: false, locked: true, pause() { timer.pause(); }, resume() { timer.resume(); }, destroy() { timer.stop(); clearTimeout(advance); document.removeEventListener('keydown', onKey); } };
  show();
}

/* =====================================================================
   4. DAFTAR GAME, UI, ROUTER
   ===================================================================== */
const GAMES = [
  {
    id: 'kilat', icon: '⚡', title: 'Kilat PJOK', color: '#d97706', play: playKilat,
    desc: 'Pernyataan PJOK muncul satu per satu. Pilih Benar atau Salah secepat mungkin!',
    how: ['Baca pernyataan, lalu tekan Benar atau Salah.', 'Jawaban benar menambah waktu, salah mengurangi.', 'Penjelasan singkat muncul setelah tiap jawaban.'],
    challenge: `Combo ${COMBO_EVERY} jawaban benar beruntun memberi bonus waktu +${COMBO_BONUS} detik!`,
    levels: { mudah: 'Kebiasaan sehat dan permainan dasar', sedang: 'Aturan permainan, gizi, dan P3K', sulit: 'Unsur kebugaran dan teknik olahraga' },
    info: lv => { const c = KILAT[lv]; return `${c.time} dtk · benar +${c.bonus} dtk · salah −${c.penalty} dtk`; }
  },
  {
    id: 'pola', icon: '🤸', title: 'Pola Gerak', color: '#2563eb', play: s => playQuiz(s, QUIZ.pola, '#2563eb'),
    desc: 'Lihat urutan gerakan senam, temukan polanya, lalu tebak gerakan berikutnya. 10 soal berwaktu.',
    how: ['Lihat 5 gerakan pertama dan cari pola yang berulang.', 'Pilih gerakan ke-6.', 'Makin cepat menjawab, makin besar poinnya.'],
    challenge: 'Soal ke-5 dan ke-10 adalah Soal Bonus ⭐ — poinnya dikali 2!',
    levels: { mudah: 'Pola dua gerakan (A-B-A-B)', sedang: 'Pola tiga gerakan dan pola ganda', sulit: 'Pola empat gerakan dan pola campuran' },
    info: lv => `10 soal · ${QUIZ.pola.time[lv]} dtk per soal`
  },
  {
    id: 'sehat', icon: '🥗', title: 'Hidup Sehat', color: '#059669', play: s => playQuiz(s, QUIZ.sehat, '#059669'),
    desc: 'Soal cerita tentang olahraga, makanan sehat, dan pertolongan pertama. 10 soal berwaktu.',
    how: ['Baca soal, lalu pilih jawaban yang benar.', 'Ada soal hitungan dan soal pengetahuan.', 'Penjelasan muncul setelah menjawab.'],
    challenge: 'Kamu punya 1 kali Bantuan 💡 50:50, tapi poin soal itu jadi setengah. Pakai di saat yang tepat!',
    levels: { mudah: 'Kebersihan, makanan sehat, dan aturan bermain', sedang: 'P3K, gizi, dan istilah olahraga', sulit: 'Kebugaran, teknik, dan penanganan darurat' },
    info: lv => `10 soal · ${QUIZ.sehat.time[lv]} dtk per soal`
  }
];

function go(hash) { if (location.hash === hash) route(); else location.hash = hash; }

function renderHome() {
  const best = store.get('pj-best', {});
  $('#app').innerHTML = `<section class="hero"><h1>Ayo jadi juara PJOK! 🏅</h1>
    <p>Main game, belajar olahraga dan hidup sehat. Pilih permainan, pilih level, lalu lawan waktu!</p>
    <p>Nama = Zaid Alfarezt Zahran</p>
    <p>NPM = 41182191240082</p>
    <p>Paralel 3</p></section>
    <div class="g-grid">${GAMES.map(g => `<a class="g-card" href="#g/${g.id}" style="--accent:${g.color}"><span class="g-ic">${g.icon}</span><h3>${g.title}</h3><p>${g.desc}</p>
      <div class="g-best"><small>Rekor terbaik</small>${LEVELS.map(l => `<span title="${l.name}">${l.icon} ${best[g.id + ':' + l.id] ? fmtN(best[g.id + ':' + l.id]) : '—'}</span>`).join('')}</div></a>`).join('')}</div>`;
}

function renderSetup(g) {
  const best = store.get('pj-best', {});
  let sel = store.get('pj-lv', 'mudah'); if (!LV[sel]) sel = 'mudah';
  $('#app').innerHTML = `<a class="back" href="#home">← Semua game</a>
    <section class="setup" style="--accent:${g.color}">
      <div class="setup-head"><span class="g-ic">${g.icon}</span><div><h1>${g.title}</h1><p class="lead">${g.desc}</p></div></div>
      <ul class="how">${g.how.map(h => `<li>${h}</li>`).join('')}</ul>
      <p class="challenge">🎯 <b>Tantangan:</b> ${g.challenge}</p>
      <h2>Pilih tingkat kesulitan</h2>
      <div class="levels" role="radiogroup" aria-label="Tingkat kesulitan">${LEVELS.map(l => `<button type="button" class="lv" role="radio" data-lv="${l.id}" aria-checked="${l.id === sel}">
        <b>${l.icon} ${l.name} <small>${l.kelas}</small></b><span class="d">${g.levels[l.id]}</span><span class="i">${g.info(l.id)}</span><span class="r">Rekor: ${best[g.id + ':' + l.id] ? fmtN(best[g.id + ':' + l.id]) : '—'}</span></button>`).join('')}</div>
      <div class="start-row"><button class="btn primary big" id="startBtn" type="button">Mulai main</button></div></section>`;
  document.querySelectorAll('.lv').forEach(b => b.addEventListener('click', () => {
    sel = b.dataset.lv; store.set('pj-lv', sel);
    document.querySelectorAll('.lv').forEach(x => x.setAttribute('aria-checked', String(x === b)));
  }));
  $('#startBtn').addEventListener('click', () => go(`#p/${g.id}/${sel}`));
  $('#startBtn').focus();
}

function startGame(g, level) {
  const token = runId; sehatDeck.bank = [];
  $('#app').innerHTML = `<div class="cd" style="--accent:${g.color}"><p class="muted">${g.icon} ${g.title} · ${LV[level].icon} ${LV[level].name}</p><div class="cd-n" id="cdn">3</div><p>Bersiap…</p></div>`;
  let n = 3; snd.beep(440, 0.1);
  const id = setInterval(() => {
    if (token !== runId) { clearInterval(id); return; }
    n--;
    if (n > 0) { $('#cdn').textContent = n; snd.beep(440, 0.1); }
    else { clearInterval(id); snd.beep(880, 0.2); lastSec = -1; g.play(newSession(g.id, level)); }
  }, 800);
  active = { paused: false, locked: true, pause() { }, resume() { }, destroy() { clearInterval(id); } };
}

function route() {
  runId++; removeOverlay();
  if (active) { active.destroy(); active = null; }
  const parts = (location.hash || '#home').slice(1).split('/'), g = GAMES.find(x => x.id === parts[1]);
  if (parts[0] === 'g' && g) renderSetup(g);
  else if (parts[0] === 'p' && g && LV[parts[2]]) startGame(g, parts[2]);
  else renderHome();
  window.scrollTo(0, 0);
}

function init() {
  const sb = $('#sndBtn'), paintSnd = () => { sb.textContent = snd.on ? '🔊' : '🔇'; sb.setAttribute('aria-pressed', String(snd.on)); };
  sb.addEventListener('click', () => { snd.on = !snd.on; store.set('pj-snd', snd.on); paintSnd(); if (snd.on) snd.ok(); });
  paintSnd();
  $('#resetBtn').addEventListener('click', () => { if (confirm('Hapus semua rekor di perangkat ini?')) { store.set('pj-best', {}); route(); } });
  document.addEventListener('visibilitychange', () => { if (document.hidden) doPause(); });
  window.addEventListener('hashchange', route);
  route();
}
if (typeof document !== 'undefined') init();
if (typeof module !== 'undefined') module.exports = { genFact, genPat, quizPat, genHitung, quizSehat, makeOptions, FACTS, BANK, KILAT, QUIZ };
