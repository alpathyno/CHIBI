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
  if (!scene.anims.exists("lari")) {
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
  if (!scene.anims.exists("kepak")) {
    scene.anims.create({
      key: "kepak",
      frames: [{ key: "burung-1" }, { key: "burung-2" }],
      frameRate: 8,
      repeat: -1,
    });
  }
  if (!scene.anims.exists("kepakJauh")) {
    scene.anims.create({
      key: "kepakJauh",
      frames: [{ key: "burung-kecil-1" }, { key: "burung-kecil-2" }],
      frameRate: 5,
      repeat: -1,
    });
  }
  if (!scene.anims.exists("kepakKupu")) {
    scene.anims.create({
      key: "kepakKupu",
      frames: [{ key: "kupu-1" }, { key: "kupu-2" }],
      frameRate: 8,
      repeat: -1,
    });
  }
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

  // daftar bukit: [posisi x, lebar, tinggi]
  const BUKIT_JAUH = [
    [0, 256, 90],
    [240, 304, 120],
    [560, 240, 80],
  ];
  const BUKIT_DEKAT = [
    [0, 208, 56],
    [240, 192, 48],
    [592, 208, 64],
  ];

  // tinggi permukaan bukit pada kolom x (rumusnya sama dengan menggambar bukit)
  const permukaan = (daftar: number[][], x: number) => {
    let tinggi = 0;
    for (const [x0, lebar, t] of daftar) {
      if (x < x0 || x >= x0 + lebar) continue;
      const n = lebar / 16;
      const i = Math.floor((x - x0) / 16);
      const h = Math.round((t * Math.sin((Math.PI * (i + 0.5)) / n)) / 8) * 8;
      tinggi = Math.max(tinggi, h);
    }
    return tinggi;
  };

  // menempelkan gambar pixel kecil (rumah, pohon) ke tekstur yang sedang digambar
  const taruh = (
    peta: string[],
    warna: Record<string, number>,
    sel: number,
    x: number,
    yDasar: number,
  ) => {
    peta.forEach((baris, r) => {
      [...baris].forEach((c, k) => {
        if (c === ".") return;
        g.fillStyle(warna[c]);
        g.fillRect(x + k * sel, yDasar - (peta.length - r) * sel, sel, sel);
      });
    });
  };

  const RUMAH = [
    "...rr...",
    "..rrrr..",
    ".rrrrrr.",
    "rrrrrrrr",
    ".wwwwww.",
    ".wkwwdw.",
    ".wwwwdw.",
  ];
  const POHON = [
    "..gg..",
    ".hggg.",
    "hhgggg",
    "hgggkk",
    ".gkkk.",
    "..tt..",
    "..tt..",
    "..tt..",
  ];

  // bukit jauh: warna pucat, dengan rumah dan pohon kecil
  g.fillStyle(0x9fdcaa);
  BUKIT_JAUH.forEach(([x, l, t]) => bukit(x, l, t, 140));
  const WARNA_RUMAH = { r: 0xc9917f, w: 0xefe6d2, k: 0x8fb7d6, d: 0x8a6a4f };
  [64, 400, 640].forEach((x) =>
    taruh(RUMAH, WARNA_RUMAH, 2, x, 140 - permukaan(BUKIT_JAUH, x)),
  );
  const WARNA_POHON_JAUH = {
    g: 0x78c28a,
    h: 0x8ed29d,
    k: 0x62a877,
    t: 0x8a7a66,
  };
  [112, 336, 704].forEach((x) =>
    taruh(POHON, WARNA_POHON_JAUH, 2, x + 2, 140 - permukaan(BUKIT_JAUH, x)),
  );
  g.generateTexture("bukit-jauh", 800, 140);
  g.clear();

  // bukit dekat: pohon lebih besar dan hijau
  g.fillStyle(0x7fd36b);
  BUKIT_DEKAT.forEach(([x, l, t]) => bukit(x, l, t, 90));
  const WARNA_POHON_DEKAT = {
    g: 0x4fb04a,
    h: 0x73ce63,
    k: 0x3a8f3c,
    t: 0x6b4f3a,
  };
  [48, 112, 288, 368, 640, 736].forEach((x) =>
    taruh(POHON, WARNA_POHON_DEKAT, 3, x - 1, 90 - permukaan(BUKIT_DEKAT, x)),
  );
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
    [5, 8],
    [4, 9],
    [3, 10],
    [2, 11],
    [1, 12],
    [1, 12],
    [1, 12],
    [2, 11],
    [3, 10],
    [5, 8],
    [6, 7],
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
        !adaSemak(x - 1, y) ||
        !adaSemak(x + 1, y) ||
        !adaSemak(x, y - 1) ||
        !adaSemak(x, y + 1);
      if (tepi) return "o";
      return y >= 6 ? "k" : "g"; // bagian bawah semak lebih gelap
    }),
  );
  [
    [6, 2],
    [7, 2],
    [5, 3],
    [8, 3],
    [6, 4],
    [7, 4],
  ].forEach(([x, y]) => (petaSemak[y][x] = "f"));
  [
    [6, 3],
    [7, 3],
  ].forEach(([x, y]) => (petaSemak[y][x] = "y")); // putik bunga

  const petaPot = [
    "." + "o".repeat(12) + ".",
    ".o" + "q".repeat(10) + "o.",
    ".o" + "q".repeat(10) + "o.",
    "." + "o".repeat(12) + ".",
    ...Array(5).fill("..o" + "e" + "p".repeat(6) + "u" + "o.."),
    ...Array(2).fill("...o" + "e" + "p".repeat(4) + "u" + "o..."),
    "...oooooooo...",
  ];
  gambarPeta(
    g,
    "pot",
    [...petaSemak.map((b) => b.join("")), ...petaPot],
    WARNA_RINTANGAN,
    2,
  );

  // ===== benda langit =====
  // bintang: kotak putih kecil (diperbesar 1-3x di game)
  g.clear();
  g.fillStyle(0xffffff);
  g.fillRect(0, 0, 2, 2);
  g.generateTexture("bintang", 2, 2);

  // matahari: lingkaran pixel 12x12 sel, tiap sel 4px
  g.clear();
  for (let y = 0; y < 12; y++) {
    for (let x = 0; x < 12; x++) {
      const d = Math.hypot(x - 5.5, y - 5.5);
      if (d <= 5.6) {
        g.fillStyle(d <= 3.6 ? 0xffe680 : 0xffc21a);
        g.fillRect(x * 4, y * 4, 4, 4);
      }
    }
  }
  g.generateTexture("matahari", 48, 48);

  // bulan sabit: lingkaran dikurangi lingkaran lain yang bergeser
  g.clear();
  for (let y = 0; y < 12; y++) {
    for (let x = 0; x < 12; x++) {
      const d = Math.hypot(x - 5.5, y - 5.5);
      const potong = Math.hypot(x - 8, y - 4);
      if (d <= 5.6 && potong > 4.6) {
        g.fillStyle(0xf4f1de);
        g.fillRect(x * 4, y * 4, 4, 4);
      }
    }
  }
  g.generateTexture("bulan", 48, 48);

  // percikan: tanda plus kecil 6x6
  g.clear();
  g.fillStyle(0xffffff);
  g.fillRect(2, 0, 2, 2);
  g.fillRect(0, 2, 6, 2);
  g.fillRect(2, 4, 2, 2);
  g.generateTexture("percik", 6, 6);

  // ===== burung pixel, 2 frame kepakan: 16x12 sel, tiap sel 2px =====
  const WARNA_BURUNG: Record<string, number> = {
    o: 0x2b2b3a,
    y: 0x8e5bd6,
    l: 0xc9a8ff,
    s: 0x6b3fb0,
    k: 0xffd23f,
    w: 0xffffff,
  };
  const buatBurung = (key: string, sayap: "atas" | "bawah") => {
    const W = 16;
    const H = 12;
    const peta: string[][] = Array.from({ length: H }, () =>
      Array(W).fill("."),
    );
    const isi = (rentang: (number[] | null)[], huruf: string) =>
      rentang.forEach((r, y) => {
        if (r) for (let x = r[0]; x <= r[1]; x++) peta[y][x] = huruf;
      });

    // badan, sayap, dan ekor (menghadap kiri)
    isi(
      [
        null,
        null,
        null,
        null,
        [5, 10],
        [3, 12],
        [2, 13],
        [2, 13],
        [3, 12],
        [5, 10],
        null,
        null,
      ],
      "y",
    );
    if (sayap === "atas") {
      isi(
        [
          null,
          [8, 10],
          [7, 10],
          [6, 10],
          null,
          null,
          null,
          null,
          null,
          null,
          null,
          null,
        ],
        "s",
      );
    } else {
      isi(
        [
          null,
          null,
          null,
          null,
          null,
          null,
          null,
          null,
          null,
          null,
          [6, 11],
          [8, 11],
        ],
        "s",
      );
    }
    isi(
      [
        null,
        null,
        null,
        null,
        null,
        null,
        [14, 15],
        [14, 15],
        null,
        null,
        null,
        null,
      ],
      "s",
    );

    // outline otomatis untuk sel di tepi
    const ada = (x: number, y: number) =>
      y >= 0 && y < H && x >= 0 && x < W && peta[y][x] !== ".";
    const hasil = peta.map((baris, y) =>
      baris.map((c, x) => {
        if (c === ".") return ".";
        const tepi =
          !ada(x - 1, y) || !ada(x + 1, y) || !ada(x, y - 1) || !ada(x, y + 1);
        return tepi ? "o" : c;
      }),
    );

    // paruh, perut terang, dan mata
    hasil[6][0] = "k";
    hasil[6][1] = "k";
    hasil[7][1] = "k";
    for (let y = 7; y <= 8; y++)
      for (let x = 0; x < W; x++) if (hasil[y][x] === "y") hasil[y][x] = "l";
    hasil[5][5] = "w";

    gambarPeta(
      g,
      key,
      hasil.map((b) => b.join("")),
      WARNA_BURUNG,
      2,
    );
  };
  buatBurung("burung-1", "atas");
  buatBurung("burung-2", "bawah");

  // ===== jetpack pixel: 12x14 sel, tiap sel 2px -> 24x28 =====
  const WARNA_JETPACK: Record<string, number> = {
    o: 0x2b2b3a,
    y: 0xffd23f,
    c: 0x4dc3e8,
    h: 0xa8ebff,
    d: 0x2c8fb5,
    r: 0xe4572e,
    m: 0x5c616b,
    n: 0x8a8f98,
  };
  const badanJet = ".o" + "h" + "c".repeat(6) + "d" + "o.";
  const pitaJet = ".o" + "r".repeat(8) + "o.";
  gambarPeta(
    g,
    "jetpack",
    [
      "...oooooo...",
      "..o" + "y".repeat(6) + "o..",
      badanJet,
      badanJet,
      badanJet,
      pitaJet,
      pitaJet,
      badanJet,
      badanJet,
      badanJet,
      ".o" + "d".repeat(8) + "o.",
      "..o" + "m".repeat(6) + "o..",
      "...o" + "n".repeat(4) + "o...",
      "...oooooo...",
    ],
    WARNA_JETPACK,
    2,
  );

  // tetes hujan: garis vertikal tipis 2x6
  g.clear();
  g.fillStyle(0xd6ecff);
  g.fillRect(0, 0, 2, 6);
  g.generateTexture("tetes", 2, 6);

  // burung kecil di kejauhan, 2 frame: 5x3 sel, tiap sel 3px
  const WARNA_BURUNG_JAUH = { x: 0x3a4a66 };
  gambarPeta(
    g,
    "burung-kecil-1",
    ["x...x", ".x.x.", "..x.."],
    WARNA_BURUNG_JAUH,
    3,
  );
  gambarPeta(
    g,
    "burung-kecil-2",
    ["xx.xx", "..x..", "....."],
    WARNA_BURUNG_JAUH,
    3,
  );

  // kupu-kupu, 2 frame: 7x5 sel, tiap sel 2px (warna sayap diatur lewat tint di game)
  const WARNA_KUPU = { w: 0xffffff, o: 0x2b2b3a };
  gambarPeta(
    g,
    "kupu-1",
    ["ww...ww", "wwwowww", ".wwoww.", "..wow..", "...o..."],
    WARNA_KUPU,
    2,
  );
  gambarPeta(
    g,
    "kupu-2",
    ["...o...", "..wow..", "..wow..", "...o...", "......."],
    WARNA_KUPU,
    2,
  );

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
