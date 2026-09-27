# GPT Equation to Word

Lightweight Chrome extension untuk menyalin equation yang dirender di ChatGPT ke Microsoft Word.

Extension ini mendeteksi sumber LaTeX dari KaTeX/ChatGPT, memberi highlight pada equation, lalu menyalin format yang siap ditempel ke Word.

## Fitur

- Klik equation untuk menyalin ke clipboard.
- Seleksi lalu salin paragraf yang mengandung equation; delimiter `\(...\)`, `\[...\]`, dan `$$...$$` akan diformat otomatis.
- Format equation otomatis untuk Word: delimiter dirapikan, `\frac12` menjadi `\frac{1}{2}`, subscript setelah panah diperbaiki, dan `\tag{...}` diubah menjadi `#(...)`.
- Highlight equation dengan warna pilihan pengguna.
- Popup toolbar dengan color picker dan tombol **Refresh equation**.
- Equation baru pada streaming, chat baru, dan halaman yang kembali dari tab lain dipindai otomatis.
- Tidak menggunakan framework, build step, atau request ke server eksternal.

## Instalasi

1. Download repository ini atau clone dengan Git.
2. Buka `chrome://extensions` di Chrome.
3. Aktifkan **Developer mode**.
4. Klik **Load unpacked**.
5. Pilih folder repository yang langsung berisi `manifest.json`.
6. Buka atau refresh ChatGPT.

Setelah mengubah source code, klik **Reload** pada kartu extension lalu refresh halaman ChatGPT.

## Penggunaan

1. Buka [ChatGPT](https://chatgpt.com/) dan tampilkan jawaban yang berisi equation.
2. Equation yang terdeteksi akan memiliki highlight.
3. Klik equation untuk menyalin formatnya.
4. Di Microsoft Word, buat equation dengan `Alt` + `=` lalu paste hasilnya.

Klik ikon extension di toolbar untuk membuka popup. Pilih **Warna highlight** dan tekan **Simpan** untuk mengubah warna. Gunakan **Refresh equation** bila ingin memindai ulang halaman secara manual tanpa reload.

## Situs yang didukung

- `https://chatgpt.com/*`
- `https://chat.openai.com/*`

## Batasan

Extension hanya dapat mendeteksi equation yang memiliki sumber LaTeX atau markup KaTeX. Teks Unicode biasa seperti `β^​=(XTWX)−1XTWY.` tidak memiliki sumber tersebut, sehingga tidak dapat dibedakan secara aman dari teks biasa.

Chrome juga dapat men-throttle tab yang berjalan di background. Extension akan melakukan rescan otomatis saat tab kembali terlihat atau mendapat fokus.

## Struktur

```text
manifest.json  # Manifest V3 dan permission
content.js     # Deteksi, highlight, format, dan copy equation
popup.html     # Tampilan popup toolbar
popup.css      # Gaya dan animasi popup
popup.js       # Pengaturan warna dan refresh manual
assets/        # Ikon extension
```

## Lisensi

MIT
