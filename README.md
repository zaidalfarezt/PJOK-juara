# PJOK Juara — Game Belajar PJOK untuk SD

Situs statis (HTML + CSS + JavaScript murni, tanpa framework/build) berisi 3 mini-game PJOK. Semua punya **timer**, **3 tingkat kesulitan** (Kelas 1–2, 3–4, 5–6), skor, combo, bintang 1–3, dan rekor yang tersimpan di browser.

| Game | Cara kerja | Tantangan khusus |
| --- | --- | --- |
| ⚡ Kilat PJOK | Benar/Salah, waktu total; benar +waktu, salah −waktu | Combo 5 beruntun = bonus +3 detik |
| 🤸 Pola Gerak | 10 soal, batas waktu per soal (20/15/12 dtk) | Soal ke-5 dan ke-10 bernilai ×2 |
| 🥗 Hidup Sehat | 10 soal cerita/pengetahuan, batas waktu per soal | Bantuan 50:50 sekali pakai, poin jadi setengah |

## Menjalankan
Buka `index.html` di browser, atau unggah keempat file ke GitHub Pages seperti proyek sebelumnya.

## Menambah materi
- **Kilat PJOK**: tambah baris `[pernyataan benar, pernyataan salah, penjelasan]` di `FACTS`.
- **Hidup Sehat**: tambah `[soal, jawaban benar, [3 salah], penjelasan]` di `BANK`, atau `case` baru di `genHitung`.
- **Pola Gerak**: tambah gerakan di `MOVES` atau pola baru di `UNITS`.
- **Game baru**: buat `quizXxx(level)` yang mengembalikan `{ prompt, options, correct, why }`, daftarkan di `QUIZ`, lalu tambahkan entri di `GAMES`.
