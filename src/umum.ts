import Phaser from "phaser";

export const KUCING = {
  key: "kucing-lari",
  file: "assets/kucing-lari.png",
  frameWidth: 80,
  frameHeight: 64,
  frameAwal: 0,
  frameAkhir: 7,
  frameLompat: 2,
  skala: 1.5,
  hitbox: { lebar: 34, tinggi: 20, x: 24, y: 28 },
};

export const FONT = '"Press Start 2P"';

const KUNCI_REKOR = "kucing-lari-rekor";

export function bacaRekor(): number {
  try {
    return Number(localStorage.getItem(KUNCI_REKOR)) || 0;
  } catch {
    return 0;
  }
}

export function simpanRekor(nilai: number) {
  try {
    localStorage.setItem(KUNCI_REKOR, String(nilai));
  } catch {
    // abaikan kalau penyimpanan tidak tersedia
  }
}

export function buatAnimasi(scene: Phaser.Scene) {
  if (scene.anims.exists("lari")) return;
  scene.anims.create({
    key: "lari",
    frames: scene.anims.generateFrameNumbers(KUCING.key, {
      start: KUCING.frameAwal,
      end: KUCING.frameAkhir,
    }),
    frameRate: 12,
    repeat: -1,
  });
}

// mengubah peta teks menjadi tekstur pixel (satu huruf = satu sel warna)
function gambarPeta(
  g: Phaser.GameObjects.Graphics,
  key: string,
  peta: string[],
  warna: Record<string, number>,
  sel: number,
) {
  g.clear();
  peta.forEach((baris, y) => {
    [...baris].forEach((c, x) => {
      if (c === ".") return;
      g.fillStyle(warna[c]);
      g.fillRect(x * sel, y * sel, sel, sel);
    });
  });
  g.generateTexture(key, peta[0].length * sel, peta.length * sel);
  g.clear();
}

// membuat gambar latar lewat kode (hanya sekali)
export function buatTekstur(scene: Phaser.Scene) {
  if (scene.textures.exists("tanah")) return;
  const g = scene.add.graphics();

  // awan
  g.fillStyle(0xffffff);
  const awan = (x: number, y: number) => {
    g.fillRect(x, y + 16, 80, 16);
    g.fillRect(x + 12, y + 8, 56, 8);
    g.fillRect(x + 28, y, 24, 8);
  };
  awan(40, 20);
  awan(260, 60);
  awan(480, 10);
  awan(680, 50);
  g.generateTexture("awan", 800, 120);
  g.clear();

  // bukit berundak (pixel art), tinggi dibulatkan ke kelipatan 8
  const bukit = (x: number, lebar: number, tinggi: number, texH: number) => {
    const langkah = 16;
    const n = lebar / langkah;
    for (let i = 0; i < n; i++) {
      const h =
        Math.round((tinggi * Math.sin((Math.PI * (i + 0.5)) / n)) / 8) * 8;
      g.fillRect(x + i * langkah, texH - h, langkah, h);
    }
  };

  g.fillStyle(0x9fdcaa);
  bukit(0, 256, 90, 140);
  bukit(240, 304, 120, 140);
  bukit(560, 240, 80, 140);
  g.generateTexture("bukit-jauh", 800, 140);
  g.clear();

  g.fillStyle(0x7fd36b);
  bukit(0, 208, 56, 90);
  bukit(240, 192, 48, 90);
  bukit(592, 208, 64, 90);
  g.generateTexture("bukit-dekat", 800, 90);
  g.clear();

  // tanah: tanah cokelat, rumput di atas, bintik-bintik
  g.fillStyle(0xb97a4b);
  g.fillRect(0, 0, 64, 60);
  g.fillStyle(0x6bcb4b);
  g.fillRect(0, 0, 64, 12);
  g.fillStyle(0x86dc66);
  g.fillRect(10, 2, 4, 4);
  g.fillRect(40, 4, 4, 4);
  g.fillStyle(0x9e6539);
  g.fillRect(8, 26, 6, 4);
  g.fillRect(36, 38, 8, 4);
  g.fillRect(52, 22, 4, 4);
  g.fillRect(20, 48, 6, 4);
  g.generateTexture("tanah", 64, 60);

  g.clear();

  // ikan pixel: grid 20x12, tiap sel 2px -> tekstur 40x24
  const SEL = 2;
  const bodi: (number[] | null)[] = [
    null,
    [4, 9],
    [2, 11],
    [1, 12],
    [0, 13],
    [0, 13],
    [0, 13],
    [0, 13],
    [1, 12],
    [2, 11],
    [4, 9],
    null,
  ];
  const ekor: (number[] | null)[] = [
    null,
    [17, 19],
    [16, 19],
    [14, 19],
    [14, 17],
    [14, 16],
    [14, 16],
    [14, 17],
    [14, 19],
    [16, 19],
    [17, 19],
    null,
  ];
  const isi: boolean[][] = Array.from({ length: 12 }, () =>
    Array(20).fill(false),
  );
  [bodi, ekor].forEach((bagian) =>
    bagian.forEach((r, y) => {
      if (r) for (let x = r[0]; x <= r[1]; x++) isi[y][x] = true;
    }),
  );
  const ada = (x: number, y: number) =>
    y >= 0 && y < 12 && x >= 0 && x < 20 && isi[y][x];

  // sel di tepi jadi outline, sisanya badan (kuning) atau ekor (oranye)
  const peta: string[][] = isi.map((baris, y) =>
    baris.map((terisi, x) => {
      if (!terisi) return ".";
      const tepi =
        !ada(x - 1, y) || !ada(x + 1, y) || !ada(x, y - 1) || !ada(x, y + 1);
      if (tepi) return "o";
      return x >= 14 ? "f" : "y";
    }),
  );
  for (let y = 8; y <= 9; y++)
    for (let x = 0; x <= 13; x++) if (peta[y][x] === "y") peta[y][x] = "l"; // perut terang
  for (let y = 4; y <= 7; y++) if (peta[y][9] === "y") peta[y][9] = "f"; // garis sirip
  peta[4][3] = "w"; // mata (putih)
  peta[4][2] = "k"; // mata (pupil)

  const WARNA: Record<string, number> = {
    o: 0x2b2b3a,
    y: 0xffd23f,
    l: 0xffeb99,
    f: 0xf29e1f,
    w: 0xffffff,
    k: 0x2b2b3a,
  };
  peta.forEach((baris, y) =>
    baris.forEach((c, x) => {
      if (c === ".") return;
      g.fillStyle(WARNA[c]);
      g.fillRect(x * SEL, y * SEL, SEL, SEL);
    }),
  );
  g.generateTexture("ikan", 20 * SEL, 12 * SEL);

    // ===== rintangan pixel (tiap sel 2px) =====
  const WARNA_RINTANGAN: Record<string, number> = {
    o: 0x2b2b3a, // outline
    // kardus
    b: 0xd9a066,
    d: 0xb8844a,
    t: 0xf3ddb0,
    // ember
    r: 0xe4572e,
    h: 0xff8a5c,
    s: 0xb63a1c,
    // pot tanaman
    q: 0xe89a5b,
    p: 0xd2793c,
    e: 0xf0a868,
    u: 0xa85a2a,
    g: 0x3daa4a,
    k: 0x2e8b3d,
    f: 0xff7bac,
    y: 0xffd23f,
  };

  // kardus: 16x14 sel -> 32x28
  const polos = "o" + "b".repeat(14) + "o";
  const pita = "o" + "b".repeat(6) + "tt" + "b".repeat(6) + "o";
  const lipat = "o" + "d".repeat(6) + "tt" + "d".repeat(6) + "o";
  const label = "o" + "b".repeat(3) + "t".repeat(5) + "b".repeat(6) + "o";
  gambarPeta(
    g,
    "kardus",
    [
      "o".repeat(16),
      pita,
      pita,
      lipat,
      polos,
      polos,
      label,
      label,
      polos,
      polos,
      polos,
      polos,
      "o" + "d".repeat(14) + "o",
      "o".repeat(16),
    ],
    WARNA_RINTANGAN,
    2,
  );

  // ember: 14x17 sel -> 28x34
  gambarPeta(
    g,
    "ember",
    [
      ".".repeat(4) + "o".repeat(6) + ".".repeat(4), // gagang
      "...o......o...",
      "..o........o..",
      "..o........o..",
      "." + "o".repeat(12) + ".", // bibir ember
      ".o" + "h".repeat(10) + "o.",
      ".oh" + "r".repeat(9) + "o.",
      ".oh" + "r".repeat(9) + "o.",
      ".oh" + "r".repeat(9) + "o.",
      ".oh" + "r".repeat(9) + "o.",
      "..oh" + "r".repeat(7) + "o..",
      "..oh" + "r".repeat(7) + "o..",
      "..oh" + "r".repeat(7) + "o..",
      "..oh" + "r".repeat(7) + "o..",
      "..o" + "s".repeat(8) + "o..",
      "..o" + "s".repeat(8) + "o..",
      "...oooooooo...",
    ],
    WARNA_RINTANGAN,
    2,
  );

  // pot tanaman: semak (dibuat dari rentang kolom + outline otomatis) di atas pot
  const semak = [
    [5, 8], [4, 9], [3, 10], [2, 11], [1, 12], [1, 12],
    [1, 12], [2, 11], [3, 10], [5, 8], [6, 7],
  ];
  const isiSemak = semak.map((r) =>
    Array.from({ length: 14 }, (_, x) => x >= r[0] && x <= r[1]),
  );
  const adaSemak = (x: number, y: number) =>
    y >= 0 && y < isiSemak.length && x >= 0 && x < 14 && isiSemak[y][x];
  const petaSemak: string[][] = isiSemak.map((baris, y) =>
    baris.map((terisi, x) => {
      if (!terisi) return ".";
      const tepi =
        !adaSemak(x - 1, y) || !adaSemak(x + 1, y) || !adaSemak(x, y - 1) || !adaSemak(x, y + 1);
      if (tepi) return "o";
      return y >= 6 ? "k" : "g"; // bagian bawah semak lebih gelap
    }),
  );
  [[6, 2], [7, 2], [5, 3], [8, 3], [6, 4], [7, 4]].forEach(([x, y]) => (petaSemak[y][x] = "f"));
  [[6, 3], [7, 3]].forEach(([x, y]) => (petaSemak[y][x] = "y")); // putik bunga

  const petaPot = [
    "." + "o".repeat(12) + ".",
    ".o" + "q".repeat(10) + "o.",
    ".o" + "q".repeat(10) + "o.",
    "." + "o".repeat(12) + ".",
    ...Array(5).fill("..o" + "e" + "p".repeat(6) + "u" + "o.."),
    ...Array(2).fill("...o" + "e" + "p".repeat(4) + "u" + "o..."),
    "...oooooooo...",
  ];
  gambarPeta(g, "pot", [...petaSemak.map((b) => b.join("")), ...petaPot], WARNA_RINTANGAN, 2);

  g.destroy();
}

// suara sederhana dibuat langsung dari osilator (tanpa file audio)
export function bunyi(
  scene: Phaser.Scene,
  freqAwal: number,
  freqAkhir: number,
  durasi: number,
  tipe: OscillatorType = "square",
  volume = 0.08,
  tunda = 0, // detik, untuk merangkai beberapa nada
) {
  const mgr = scene.sound as Phaser.Sound.WebAudioSoundManager;
  const ctx = mgr.context;
  if (!ctx || !mgr.masterMuteNode) return;

  const mainkan = () => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const t = ctx.currentTime + tunda;

    osc.type = tipe;
    osc.frequency.setValueAtTime(freqAwal, t);
    osc.frequency.exponentialRampToValueAtTime(freqAkhir, t + durasi);
    gain.gain.setValueAtTime(volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + durasi);

    osc.connect(gain);
    gain.connect(mgr.masterMuteNode); // lewat sini supaya tombol mute berfungsi
    osc.start(t);
    osc.stop(t + durasi);
  };

  // klik pertama di menu sering terjadi saat audio browser masih "tertidur",
  // jadi bangunkan dulu baru bunyikan
  if (ctx.state === "running") mainkan();
  else
    ctx
      .resume()
      .then(mainkan)
      .catch(() => {});
}

// tiga nada naik: tombol MAIN di menu
export function bunyiMulai(scene: Phaser.Scene) {
  bunyi(scene, 392, 392, 0.09, "square", 0.08, 0);
  bunyi(scene, 523, 523, 0.09, "square", 0.08, 0.09);
  bunyi(scene, 659, 880, 0.2, "square", 0.08, 0.18);
}

// dua nada pendek: main lagi setelah game over
export function bunyiUlang(scene: Phaser.Scene) {
  bunyi(scene, 330, 330, 0.07, "square", 0.08, 0);
  bunyi(scene, 494, 740, 0.13, "square", 0.08, 0.07);
}
