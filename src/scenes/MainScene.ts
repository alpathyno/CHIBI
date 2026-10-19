import Phaser from "phaser";
import {
  KUCING,
  FONT,
  bacaRekor,
  simpanRekor,
  buatTekstur,
  buatAnimasi,
  bunyi,
  bunyiUlang,
} from "../umum";
import { ambilMusik, Musik } from "../musik";

// pengaturan kecepatan (piksel per detik)
const KECEPATAN_AWAL = 320;
const KECEPATAN_MAKS = 720;
const TAMBAHAN_PER_DETIK = 5;
const LOMPAT_PENUH = 550;
const LOMPAT_POTONG = 200;
const NILAI_IKAN = 20;
const JENIS_RINTANGAN = [
  { key: "kardus", lebar: 28, tinggi: 24, offX: 2, offY: 4 },
  { key: "ember", lebar: 22, tinggi: 30, offX: 3, offY: 4 },
  { key: "pot", lebar: 22, tinggi: 42, offX: 3, offY: 4 },
];
type Jenis = (typeof JENIS_RINTANGAN)[number];
type Kelompok = { jenis: Jenis[]; gap: number[]; span: number };

const WAKTU_POLA_MULAI = 25000; // ms: kelompok rintangan mulai muncul setelah 25 detik
const MARGIN_POLA = 0.6; // kelompok hanya boleh memakai 60% waktu "di udara" lompatan penuh
const PANJANG_SIKLUS = 100000; // milidetik: 100 detik untuk satu putaran penuh
const WAKTU_BURUNG_MULAI = 15000; // ms: burung mulai muncul setelah 15 detik
const TAMBAHAN_KECEPATAN_BURUNG = 70; // burung terbang sedikit lebih cepat dari dunia

const JETPACK_DURASI = 5000; // ms
const NILAI_IKAN_JETPACK = 10;
const BONUS_BARISAN = 30; // bonus kalau ketiga ikan dalam satu barisan terambil semua
const BONUS_POLA = 50; // bonus kalau semua ikan dalam satu pola jetpack terambil
type StatusKelompok = {
  total: number;
  terambil: number;
  bonus: number;
  label: string;
};

// pola ikan di udara saat jetpack: n = jumlah ikan, tinggi(i, a) = ketinggian ikan ke-i
const POLA_UDARA: { n: number; tinggi: (i: number, a: number) => number }[] = [
  { n: 7, tinggi: (_i, a) => a }, // garis lurus
  { n: 9, tinggi: (i, a) => a + Math.sin(i * 0.55) * 40 }, // gelombang
  { n: 8, tinggi: (i, a) => a + (Math.floor(i / 2) % 2) * 60 }, // zig-zag
  { n: 7, tinggi: (i, a) => a + i * 18 }, // tangga naik
  { n: 7, tinggi: (i, a) => a - i * 18 }, // tangga turun
  { n: 9, tinggi: (i, a) => a + Math.sin((i / 8) * Math.PI) * 80 }, // busur
];

const SIKLUS = [
  {
    t: 0.0,
    langit: 0x8ed6ff,
    tint: 0xffffff,
    bintang: 0,
    surya: 100,
    bulan: 420,
  },
  {
    t: 0.3,
    langit: 0x8ed6ff,
    tint: 0xffffff,
    bintang: 0,
    surya: 100,
    bulan: 420,
  },
  {
    t: 0.42,
    langit: 0xffa56b,
    tint: 0xffd2a8,
    bintang: 0,
    surya: 210,
    bulan: 420,
  },
  {
    t: 0.52,
    langit: 0x6c5b9e,
    tint: 0x9a88c0,
    bintang: 0.3,
    surya: 420,
    bulan: 420,
  },
  {
    t: 0.62,
    langit: 0x1b1f4b,
    tint: 0x4a5588,
    bintang: 1,
    surya: 420,
    bulan: 100,
  },
  {
    t: 0.84,
    langit: 0x1b1f4b,
    tint: 0x4a5588,
    bintang: 1,
    surya: 420,
    bulan: 100,
  },
  {
    t: 0.94,
    langit: 0xf7a8b8,
    tint: 0xffd6dc,
    bintang: 0.1,
    surya: 420,
    bulan: 420,
  },
  {
    t: 1.0,
    langit: 0x8ed6ff,
    tint: 0xffffff,
    bintang: 0,
    surya: 100,
    bulan: 420,
  },
];

export default class MainScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private obstacles!: Phaser.Physics.Arcade.Group;
  private musik!: Musik;
  private spawnTimer?: Phaser.Time.TimerEvent;
  private timerIkan?: Phaser.Time.TimerEvent;
  private spaceKey!: Phaser.Input.Keyboard.Key;
  private upKey!: Phaser.Input.Keyboard.Key;
  private teksSkor!: Phaser.GameObjects.Text;
  private teksSuara!: Phaser.GameObjects.Text;
  private awan!: Phaser.GameObjects.TileSprite;
  private bukitJauh!: Phaser.GameObjects.TileSprite;
  private bukitDekat!: Phaser.GameObjects.TileSprite;
  private jumlahIkan = 0;
  private teksIkan!: Phaser.GameObjects.Text;
  private ikonIkan!: Phaser.GameObjects.Image;
  private kelompokIkan = new Map<number, StatusKelompok>();
  private idKelompok = 0;
  private tanah!: Phaser.GameObjects.TileSprite;
  private ikan!: Phaser.Physics.Arcade.Group;
  private teksHud: Phaser.GameObjects.Text[] = [];
  private bintang: Phaser.GameObjects.Image[] = [];
  private matahari!: Phaser.GameObjects.Image;
  private waktuMain = 0;
  private burung!: Phaser.Physics.Arcade.Group;
  private timerBurung?: Phaser.Time.TimerEvent;
  private burungAkanDatang = false;
  private bulan!: Phaser.GameObjects.Image;
  private debuLari!: Phaser.GameObjects.Particles.ParticleEmitter;
  private debuMendarat!: Phaser.GameObjects.Particles.ParticleEmitter;
  private percikIkan!: Phaser.GameObjects.Particles.ParticleEmitter;
  private serpihan!: Phaser.GameObjects.Particles.ParticleEmitter;
  private semuaPartikel: Phaser.GameObjects.Particles.ParticleEmitter[] = [];
  private sebelumnyaDiTanah = false;
  private dijeda = false;
  private panelJeda!: Phaser.GameObjects.Container;
  private itemJetpack!: Phaser.Physics.Arcade.Group;
  private jetpackPakai!: Phaser.GameObjects.Image;
  private apiJetpack!: Phaser.GameObjects.Particles.ParticleEmitter;
  private hudJetpack!: Phaser.GameObjects.Container;
  private barJetpack!: Phaser.GameObjects.Rectangle;
  private timerJetpack?: Phaser.Time.TimerEvent;
  private timerPola?: Phaser.Time.TimerEvent;
  private terbang = false;
  private sisaTerbang = 0;
  private bipTerakhir = -1;
  private kebalSampai = 0;

  // dipanggil otomatis saat tab ditinggalkan atau jendela kehilangan fokus
  private jedaOtomatis = () => {
    if (!this.dijeda) this.ubahJeda();
  };
  private warnaHud = "";
  private skor = 0;
  private rekor = 0;
  private kelipatanTerakhir = 0;
  private kecepatan = KECEPATAN_AWAL;
  private selesai = false;
  private bisaUlang = false;

  constructor() {
    super("MainScene");
  }

  preload() {
    this.load.spritesheet(KUCING.key, KUCING.file, {
      frameWidth: KUCING.frameWidth,
      frameHeight: KUCING.frameHeight,
    });
  }

  private perbaruiLabelSuara() {
    this.teksSuara.setText(
      this.sound.mute ? "SUARA: OFF (M)" : "SUARA: ON (M)",
    );
  }

  private ubahSuara() {
    this.sound.mute = !this.sound.mute;
    this.perbaruiLabelSuara();
  }

  // jeda: bekukan semua gerakan, tampilkan atau sembunyikan panel
  private ubahJeda() {
    if (this.selesai) return;
    this.dijeda = !this.dijeda;

    if (this.dijeda) {
      this.physics.pause();
      this.time.paused = true;
      this.tweens.pauseAll();
      this.player.anims.pause();
    } else {
      this.physics.resume();
      this.time.paused = false;
      this.tweens.resumeAll();
      this.player.anims.resume();
    }

    this.semuaPartikel.forEach((e) => e.setActive(!this.dijeda));

    this.musik.jeda(this.dijeda);
    this.burung.getChildren().forEach((b) => {
      const a = (b as Phaser.GameObjects.Sprite).anims;
      if (this.dijeda) a.pause();
      else a.resume();
    });
    this.panelJeda.setVisible(this.dijeda);
    bunyi(
      this,
      this.dijeda ? 520 : 390,
      this.dijeda ? 390 : 520,
      0.08,
      "square",
      0.06,
    );
  }

  // atur langit, warna latar, bintang, matahari/bulan, dan warna teks sesuai skor
  private terapkanSiklus(time: number) {
    const fase = (this.waktuMain % PANJANG_SIKLUS) / PANJANG_SIKLUS;

    let a = SIKLUS[0];
    let b = SIKLUS[SIKLUS.length - 1];
    for (let i = 0; i < SIKLUS.length - 1; i++) {
      if (fase >= SIKLUS[i].t && fase <= SIKLUS[i + 1].t) {
        a = SIKLUS[i];
        b = SIKLUS[i + 1];
        break;
      }
    }
    const f = b.t === a.t ? 0 : (fase - a.t) / (b.t - a.t);

    const lerp = (x: number, y: number) => x + (y - x) * f;
    const campur = (c1: number, c2: number, porsi: number) => {
      const m = Phaser.Display.Color.Interpolate.ColorWithColor(
        Phaser.Display.Color.IntegerToColor(c1),
        Phaser.Display.Color.IntegerToColor(c2),
        100,
        Math.round(porsi * 100),
      );
      return Phaser.Display.Color.GetColor(
        Math.round(m.r),
        Math.round(m.g),
        Math.round(m.b),
      );
    };

    // langit dan lapisan latar
    this.cameras.main.setBackgroundColor(campur(a.langit, b.langit, f));
    const tint = campur(a.tint, b.tint, f);
    [this.awan, this.bukitJauh, this.bukitDekat, this.tanah].forEach((t) =>
      t.setTint(tint),
    );

    // bintang berkelap-kelip, matahari dan bulan naik-turun
    const terangBintang = lerp(a.bintang, b.bintang);
    this.musik.setMalam(terangBintang);
    this.bintang.forEach((s) =>
      s.setAlpha(
        terangBintang *
          (0.6 + 0.4 * Math.sin(time / 300 + (s.getData("fase") as number))),
      ),
    );
    this.matahari.y = lerp(a.surya, b.surya);
    this.bulan.y = lerp(a.bulan, b.bulan);

    // teks HUD: gelap saat siang, putih saat malam
    const terang = Math.min(1, terangBintang * 2.5);
    const m = Phaser.Display.Color.Interpolate.ColorWithColor(
      Phaser.Display.Color.IntegerToColor(0x2b2b3a),
      Phaser.Display.Color.IntegerToColor(0xf4f4ff),
      100,
      Math.round(terang * 100),
    );
    const css = Phaser.Display.Color.RGBToString(
      Math.round(m.r),
      Math.round(m.g),
      Math.round(m.b),
    );
    if (css !== this.warnaHud) {
      this.warnaHud = css;
      this.teksHud.forEach((t) => t.setColor(css));
    }
  }

  create() {
    const { width, height } = this.scale;
    const groundY = height - 60;

    this.cameras.main.fadeIn(250, 43, 43, 58);
    // reset status (penting supaya main lagi mulai dari nol)
    this.selesai = false;
    this.bisaUlang = false;
    this.skor = 0;
    this.burungAkanDatang = false;
    this.waktuMain = 0;
    this.jumlahIkan = 0;
    this.idKelompok = 0;
    this.kelompokIkan.clear();
    this.terbang = false;
    this.sisaTerbang = 0;
    this.bipTerakhir = -1;
    this.kebalSampai = 0;
    this.sebelumnyaDiTanah = false;
    this.kelipatanTerakhir = 0;
    this.kecepatan = KECEPATAN_AWAL;
    this.rekor = bacaRekor();
    // musik latar (selalu mulai dari suasana siang)
    this.musik = ambilMusik(this);
    this.musik.mulai();
    this.musik.jeda(false);
    this.musik.redam(false);
    this.musik.setMalam(0, true);

    // latar berlapis: yang jauh bergerak pelan, yang dekat lebih cepat
    buatTekstur(this);
    // benda langit (dibuat sebelum awan dan bukit supaya berada di belakangnya)
    this.bintang = Array.from({ length: 45 }, () =>
      this.add
        .image(
          Phaser.Math.Between(0, width),
          Phaser.Math.Between(10, 230),
          "bintang",
        )
        .setScale(Phaser.Math.Between(1, 3))
        .setAlpha(0)
        .setData("fase", Math.random() * 6),
    );
    this.matahari = this.add.image(width * 0.78, 100, "matahari");
    this.bulan = this.add.image(width * 0.78, 420, "bulan");
    this.awan = this.add.tileSprite(0, 20, width, 120, "awan").setOrigin(0, 0);
    this.bukitJauh = this.add
      .tileSprite(0, groundY - 140, width, 140, "bukit-jauh")
      .setOrigin(0, 0);
    this.bukitDekat = this.add
      .tileSprite(0, groundY - 90, width, 90, "bukit-dekat")
      .setOrigin(0, 0);
    this.tanah = this.add
      .tileSprite(0, groundY, width, 60, "tanah")
      .setOrigin(0, 0);

    // tanah (fisik, tidak terlihat, tidak bergerak)
    const ground = this.add.rectangle(0, groundY, width, 60).setOrigin(0, 0);
    this.physics.add.existing(ground, true);

    // partikel
    this.debuLari = this.add.particles(92, groundY - 2, "bintang", {
      lifespan: { min: 250, max: 450 },
      speedX: { min: -150, max: -70 },
      speedY: { min: -45, max: -10 },
      scale: { start: 2.5, end: 0.5 },
      alpha: { start: 0.9, end: 0 },
      tint: 0xe8d9b5,
      frequency: 70,
      emitting: false,
    });
    this.debuMendarat = this.add.particles(0, 0, "bintang", {
      lifespan: { min: 300, max: 500 },
      speedX: { min: -170, max: 170 },
      speedY: { min: -90, max: -20 },
      gravityY: 220,
      scale: { start: 3, end: 0.5 },
      alpha: { start: 0.9, end: 0 },
      tint: 0xe8d9b5,
      emitting: false,
    });
    this.percikIkan = this.add
      .particles(0, 0, "percik", {
        lifespan: 500,
        speed: { min: 80, max: 200 },
        angle: { min: 0, max: 360 },
        gravityY: 260,
        scale: { start: 1.4, end: 0 },
        alpha: { start: 1, end: 0 },
        tint: [0xffd23f, 0xffffff, 0xffeb99],
        emitting: false,
      })
      .setDepth(6);
    this.serpihan = this.add
      .particles(0, 0, "bintang", {
        lifespan: { min: 500, max: 900 },
        speed: { min: 120, max: 320 },
        angle: { min: 200, max: 340 },
        gravityY: 900,
        scale: { start: 3, end: 1 },
        alpha: { start: 1, end: 0 },
        tint: [0x625b54, 0x1e1c1c, 0xc4924a, 0x9e9a96],
        emitting: false,
      })
      .setDepth(9);
    this.semuaPartikel = [
      this.debuLari,
      this.debuMendarat,
      this.percikIkan,
      this.serpihan,
    ];

    // kucing
    this.player = this.physics.add
      .sprite(120, groundY, KUCING.key)
      .setOrigin(0.5, 1)
      .setScale(KUCING.skala);
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    body.setSize(KUCING.hitbox.lebar, KUCING.hitbox.tinggi);
    body.setOffset(KUCING.hitbox.x, KUCING.hitbox.y);

    buatAnimasi(this);
    this.player.play("lari");

    this.physics.add.collider(this.player, ground);

    // rintangan
    this.obstacles = this.physics.add.group({
      allowGravity: false,
      immovable: true,
    });
    this.physics.add.overlap(this.player, this.obstacles, () =>
      this.gameOver(),
    );
    this.ikan = this.physics.add.group({ allowGravity: false });
    this.physics.add.overlap(this.player, this.ikan, (_kucing, ikan) =>
      this.ambilIkan(ikan as Phaser.GameObjects.GameObject),
    );
    this.burung = this.physics.add.group({
      allowGravity: false,
      immovable: true,
    });
    this.physics.add.overlap(this.player, this.burung, () => this.gameOver());
    // jetpack: item yang bisa diambil, dipakai di punggung kucing
    this.itemJetpack = this.physics.add.group({ allowGravity: false });
    this.physics.add.overlap(this.player, this.itemJetpack, (_kucing, item) =>
      this.ambilJetpack(item as Phaser.GameObjects.GameObject),
    );
    this.jetpackPakai = this.add.image(0, 0, "jetpack").setVisible(false);
    this.apiJetpack = this.add.particles(0, 0, "bintang", {
      lifespan: { min: 200, max: 380 },
      speedX: { min: -110, max: -40 },
      speedY: { min: 90, max: 170 },
      scale: { start: 3.5, end: 0 },
      alpha: { start: 1, end: 0 },
      tint: [0xffd23f, 0xff8a5c, 0xe4572e],
      frequency: 22,
      emitting: false,
    });
    this.semuaPartikel.push(this.apiJetpack);
    this.spawnTimer = this.time.delayedCall(1200, () => this.spawnObstacle());
    this.jadwalkanIkan();
    this.jadwalkanBurung();
    this.jadwalkanJetpack(Phaser.Math.Between(18000, 28000));

    // kontrol: spasi, panah atas, atau tap/klik (kecuali saat menekan tombol suara)
    this.spaceKey = this.input.keyboard!.addKey(
      Phaser.Input.Keyboard.KeyCodes.SPACE,
    );
    this.upKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.UP);
    this.input.on(
      "pointerdown",
      (
        _pointer: Phaser.Input.Pointer,
        objek: Phaser.GameObjects.GameObject[],
      ) => {
        if (objek.length === 0) {
          if (this.dijeda) this.ubahJeda();
          else this.aksi();
        }
      },
    );
    this.input.on("pointerup", () => this.lepasLompat());

    this.input.keyboard!.on("keydown-M", () => this.ubahSuara());

    // judul, skor, rekor, dan tombol suara
    const judul = this.add
      .text(width / 2, 40, "CHIBI LARI", {
        fontFamily: FONT,
        fontSize: "20px",
        color: "#2B2B3A",
      })
      .setOrigin(0.5);

    this.teksSkor = this.add
      .text(width - 20, 20, "SKOR 00000", {
        fontFamily: FONT,
        fontSize: "14px",
        color: "#2B2B3A",
      })
      .setOrigin(1, 0);

    const teksRekor = this.add
      .text(width - 20, 44, `REKOR ${String(this.rekor).padStart(5, "0")}`, {
        fontFamily: FONT,
        fontSize: "10px",
        color: "#2B2B3A",
      })
      .setOrigin(1, 0);

    // penghitung ikan di bawah rekor
    this.teksIkan = this.add
      .text(width - 20, 66, "x00", {
        fontFamily: FONT,
        fontSize: "10px",
        color: "#2B2B3A",
      })
      .setOrigin(1, 0);
    this.ikonIkan = this.add.image(0, 71, "ikan").setScale(0.7);
    this.perbaruiHitunganIkan();

    this.teksSuara = this.add
      .text(20, 20, "", {
        fontFamily: FONT,
        fontSize: "10px",
        color: "#2B2B3A",
      })
      .setInteractive({ useHandCursor: true });
    this.teksSuara.on("pointerdown", () => this.ubahSuara());
    this.perbaruiLabelSuara();
    // tombol jeda (untuk layar sentuh)
    const tombolJeda = this.add
      .text(20, 38, "JEDA (P)", {
        fontFamily: FONT,
        fontSize: "10px",
        color: "#2B2B3A",
      })
      .setInteractive({ useHandCursor: true });
    tombolJeda.on("pointerdown", () => this.ubahJeda());

    // panel jeda (disembunyikan dulu)
    this.dijeda = false;
    const redup = this.add.rectangle(0, 0, width, height, 0x000000, 0.35);
    const kotak = this.add
      .rectangle(0, 0, 380, 150, 0xffffff)
      .setStrokeStyle(4, 0x2b2b3a);
    const teksJeda = this.add
      .text(0, -25, "JEDA", {
        fontFamily: FONT,
        fontSize: "24px",
        color: "#2B2B3A",
      })
      .setOrigin(0.5);
    const teksLanjut = this.add
      .text(0, 30, "P / ESC / TAP: LANJUT", {
        fontFamily: FONT,
        fontSize: "10px",
        color: "#2B2B3A",
      })
      .setOrigin(0.5);
    this.panelJeda = this.add
      .container(width / 2, height / 2, [redup, kotak, teksJeda, teksLanjut])
      .setDepth(20)
      .setVisible(false);

    // tombol P dan Esc, serta jeda otomatis
    this.input.keyboard!.on("keydown-P", () => this.ubahJeda());
    this.input.keyboard!.on("keydown-ESC", () => this.ubahJeda());
    this.game.events.on(Phaser.Core.Events.BLUR, this.jedaOtomatis);
    this.game.events.on(Phaser.Core.Events.HIDDEN, this.jedaOtomatis);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.game.events.off(Phaser.Core.Events.BLUR, this.jedaOtomatis);
      this.game.events.off(Phaser.Core.Events.HIDDEN, this.jedaOtomatis);
    });
    // penunjuk sisa waktu jetpack
    const bingkaiJet = this.add
      .rectangle(0, 0, 184, 16, 0xffffff, 0.7)
      .setStrokeStyle(3, 0x2b2b3a);
    this.barJetpack = this.add
      .rectangle(-86, 0, 172, 8, 0x4dc3e8)
      .setOrigin(0, 0.5);
    const labelJetpack = this.add
      .text(0, 20, "JETPACK", {
        fontFamily: FONT,
        fontSize: "10px",
        color: "#2B2B3A",
      })
      .setOrigin(0.5);
    this.hudJetpack = this.add
      .container(width / 2, 74, [bingkaiJet, this.barJetpack, labelJetpack])
      .setVisible(false);
    this.teksHud = [
      judul,
      this.teksSkor,
      teksRekor,
      this.teksIkan,
      this.teksSuara,
      tombolJeda,
      labelJetpack,
    ];
    this.warnaHud = "";
    this.terapkanSiklus(0);
  }

  // lebar maksimum satu kelompok rintangan agar masih bisa dilewati satu lompatan penuh
  private spanMaks(tinggi: number): number {
    const g = this.physics.world.gravity.y;
    const sisa = LOMPAT_PENUH * LOMPAT_PENUH - 2 * g * tinggi;
    if (sisa <= 0) return 0;
    // lama kaki kucing berada di atas tinggi rintangan, dalam detik
    const lamaDiAtas = (2 * Math.sqrt(sisa)) / g;
    const lebarKucing = KUCING.hitbox.lebar * KUCING.skala;
    return MARGIN_POLA * this.kecepatan * lamaDiAtas - lebarKucing;
  }

  // tentukan satu rintangan biasa atau kelompok 2-3 rintangan yang berdekatan
  private buatKelompok(): Kelompok {
    const satu = Phaser.Utils.Array.GetRandom(JENIS_RINTANGAN) as Jenis;
    const biasa: Kelompok = { jenis: [satu], gap: [], span: satu.lebar };

    // peluang kelompok naik pelan seiring waktu bermain
    const peluang =
      this.waktuMain < WAKTU_POLA_MULAI
        ? 0
        : Phaser.Math.Clamp(
            (this.waktuMain - WAKTU_POLA_MULAI) / 150000 + 0.2,
            0.2,
            0.5,
          );
    if (Math.random() >= peluang) return biasa;

    // coba 3 rintangan (jarang) atau 2; kalau terlalu lebar, kecilkan jumlahnya
    let jumlah = Phaser.Math.Between(1, 100) <= 30 ? 3 : 2;
    while (jumlah >= 2) {
      const jenis = Array.from(
        { length: jumlah },
        () => Phaser.Utils.Array.GetRandom(JENIS_RINTANGAN) as Jenis,
      );
      const gap = Array.from({ length: jumlah - 1 }, () =>
        Phaser.Math.Between(24, 44),
      );
      const span =
        jenis.reduce((s, j) => s + j.lebar, 0) + gap.reduce((s, g) => s + g, 0);
      const tinggiMaks = Math.max(...jenis.map((j) => j.tinggi));
      if (span <= this.spanMaks(tinggiMaks)) return { jenis, gap, span };
      jumlah--;
    }
    return biasa;
  }

  private spawnObstacle() {
    if (this.selesai) return;
    const { width, height } = this.scale;
    // beri ruang untuk burung: tunda kalau burung akan atau baru saja masuk dari kanan
    const burungDekat = this.burung
      .getChildren()
      .some((b) => (b as Phaser.GameObjects.Sprite).x > width - 260);
    if (this.burungAkanDatang || burungDekat) {
      this.spawnTimer = this.time.delayedCall(500, () => this.spawnObstacle());
      return;
    }

    // satu rintangan, atau kelompok 2-3 rintangan berdekatan
    const kelompok = this.buatKelompok();
    let xKiri = width + 40; // tepi kiri kotak tabrakan rintangan berikutnya
    kelompok.jenis.forEach((jenis, i) => {
      const rintangan = this.obstacles.create(
        xKiri + jenis.lebar / 2,
        height - 60,
        jenis.key,
      ) as Phaser.Physics.Arcade.Sprite;
      rintangan.setOrigin(0.5, 1);

      const body = rintangan.body as Phaser.Physics.Arcade.Body;
      body.setSize(jenis.lebar, jenis.tinggi);
      body.setOffset(jenis.offX, jenis.offY);
      body.setVelocityX(-this.kecepatan);

      xKiri += jenis.lebar + (kelompok.gap[i] ?? 0);
    });

    // setelah kelompok, beri jeda lebih lama supaya kucing sempat mendarat
    const tambahan =
      (kelompok.span / this.kecepatan) * 1000 +
      (kelompok.jenis.length > 1 ? 400 : 0);
    this.spawnTimer = this.time.delayedCall(
      Phaser.Math.Between(1100, 2000) + tambahan,
      () => this.spawnObstacle(),
    );
  }

  // ikan muncul sendiri, jarang: sekali tiap 7-12 detik
  private jadwalkanIkan() {
    this.timerIkan = this.time.delayedCall(
      Phaser.Math.Between(7000, 12000),
      () => {
        if (this.selesai) return;
        if (!this.terbang) this.spawnIkan(this.scale.width + 40);
        this.jadwalkanIkan();
      },
    );
  }

  // tiga ikan melayang tinggi, hanya terjangkau kalau spasi ditahan lama
  // tiga ikan melayang tinggi, hanya terjangkau kalau spasi ditahan lama
  private spawnIkan(xTengah: number) {
    const groundY = this.scale.height - 60;
    const tinggiDasar = Phaser.Math.Between(120, 140);
    const lengkung = [0, 12, 0]; // tengah sedikit lebih tinggi
    const id = ++this.idKelompok;
    this.kelompokIkan.set(id, {
      total: lengkung.length,
      terambil: 0,
      bonus: BONUS_BARISAN,
      label: "COMBO!",
    });
    lengkung.forEach((tambah, i) => {
      const ikan = this.ikan.create(
        xTengah + (i - 1) * 52,
        groundY - tinggiDasar - tambah,
        "ikan",
      ) as Phaser.Physics.Arcade.Sprite;
      (ikan.body as Phaser.Physics.Arcade.Body).setSize(34, 20);
      ikan.setVelocityX(-this.kecepatan);
      ikan.setData("fase", i * 1.2);
      ikan.setData("kelompok", id);
    });
  }

  // burung terbang rendah: jarang, dan hanya kalau jalur aman
  private jadwalkanBurung(tunda = Phaser.Math.Between(5000, 9000)) {
    this.timerBurung = this.time.delayedCall(tunda, () => {
      if (this.selesai) return;
      if (this.terbang) {
        this.jadwalkanBurung();
        return;
      }
      const { width } = this.scale;
      if (this.waktuMain < WAKTU_BURUNG_MULAI) {
        this.jadwalkanBurung();
        return;
      }
      const rintanganDekat = this.obstacles
        .getChildren()
        .some((o) => (o as Phaser.GameObjects.Sprite).x > width - 350);
      if (rintanganDekat) {
        this.jadwalkanBurung(600); // coba lagi sebentar lagi
        return;
      }
      this.peringatanBurung();
      this.jadwalkanBurung();
    });
  }

  // tanda "!" berkedip di tepi kanan sebelum burung muncul
  private peringatanBurung() {
    const { width, height } = this.scale;
    const y = height - 60 - Phaser.Math.Between(65, 80);
    this.burungAkanDatang = true;

    const tanda = this.add
      .text(width - 36, y, "!", {
        fontFamily: FONT,
        fontSize: "28px",
        color: "#E4572E",
        stroke: "#2B2B3A",
        strokeThickness: 6,
      })
      .setOrigin(0.5)
      .setDepth(8);
    this.tweens.add({
      targets: tanda,
      alpha: 0.15,
      duration: 100,
      yoyo: true,
      repeat: 3,
    });
    bunyi(this, 740, 740, 0.09, "square", 0.07);
    bunyi(this, 740, 740, 0.09, "square", 0.07, 0.18);

    this.time.delayedCall(900, () => {
      this.tweens.killTweensOf(tanda);
      tanda.destroy();
      this.burungAkanDatang = false;
      if (!this.selesai) this.spawnBurung(y);
    });
  }

  private spawnBurung(y: number) {
    const { width } = this.scale;
    const burung = this.burung.create(
      width + 40,
      y,
      "burung-1",
    ) as Phaser.Physics.Arcade.Sprite;
    burung.setScale(1.5);
    burung.play("kepak");

    const body = burung.body as Phaser.Physics.Arcade.Body;
    body.setSize(22, 12); // kotak tabrakan hanya badan, sayap tidak dihitung
    body.setOffset(5, 8);
    burung.setVelocityX(-(this.kecepatan + TAMBAHAN_KECEPATAN_BURUNG));
    burung.setData("yDasar", y);
    burung.setData("fase", Math.random() * 6);
  }

  // item jetpack muncul jarang di udara
  private jadwalkanJetpack(tunda = Phaser.Math.Between(25000, 40000)) {
    this.timerJetpack = this.time.delayedCall(tunda, () => {
      if (this.selesai) return;
      if (this.terbang || this.burungAkanDatang) {
        this.jadwalkanJetpack(2000);
        return;
      }
      const groundY = this.scale.height - 60;
      const item = this.itemJetpack.create(
        this.scale.width + 40,
        groundY - Phaser.Math.Between(95, 120),
        "jetpack",
      ) as Phaser.Physics.Arcade.Sprite;
      item.setScale(1.5);
      item.setVelocityX(-this.kecepatan);
      item.setData("fase", Math.random() * 6);
      this.jadwalkanJetpack();
    });
  }

  private ambilJetpack(item: Phaser.GameObjects.GameObject) {
    const s = item as Phaser.GameObjects.Sprite;
    this.percikIkan.explode(14, s.x, s.y);
    s.destroy();
    if (this.terbang) {
      // mengambil lagi saat terbang: waktu terisi penuh
      this.sisaTerbang = JETPACK_DURASI;
      this.timerPola?.remove();
      this.spawnPola();
      this.jadwalkanPola();
      return;
    }
    this.mulaiTerbang();
  }

  private mulaiTerbang() {
    if (this.terbang || this.selesai) return;
    this.terbang = true;
    this.sisaTerbang = JETPACK_DURASI;
    this.bipTerakhir = -1;

    const body = this.player.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);
    body.setVelocityY(-260);

    this.jetpackPakai.setVisible(true);
    this.apiJetpack.start();
    this.barJetpack.setScale(1, 1);
    this.hudJetpack.setVisible(true);
    bunyi(this, 180, 900, 0.5, "sawtooth", 0.07);

    this.spawnPola();
    this.jadwalkanPola();
  }

  private akhiriTerbang() {
    this.terbang = false;
    this.kebalSampai = this.waktuMain + 1500; // kebal sebentar saat mendarat
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(true);
    this.player.setAngle(0);
    this.jetpackPakai.setVisible(false);
    this.apiJetpack.stop();
    this.hudJetpack.setVisible(false);
    this.timerPola?.remove();
    bunyi(this, 520, 160, 0.3, "triangle", 0.08);
  }

  // pola ikan baru tiap 1,4 detik selama jetpack (berhenti 2 detik sebelum habis)
  private jadwalkanPola() {
    this.timerPola = this.time.delayedCall(1400, () => {
      if (!this.terbang || this.selesai) return;
      if (this.sisaTerbang > 2200) {
        this.spawnPola();
        this.jadwalkanPola();
      }
    });
  }

  private spawnPola() {
    const groundY = this.scale.height - 60;
    const x0 = this.scale.width + 40;
    // jarak melebar saat game cepat, supaya kecepatan naik-turun yang dibutuhkan tetap sama
    const jarak = Phaser.Math.Clamp(
      46 * (this.kecepatan / KECEPATAN_AWAL),
      46,
      90,
    );
    const pola = Phaser.Utils.Array.GetRandom(POLA_UDARA);

    // pilih tinggi dasar acak, tapi semua ikan tetap di antara 75 dan 215 px dari tanah
    const dasar = Array.from({ length: pola.n }, (_, i) => pola.tinggi(i, 0));
    const aMin = Math.ceil(75 - Math.min(...dasar));
    const aMax = Math.floor(215 - Math.max(...dasar));
    const a = Phaser.Math.Between(aMin, aMax);

    const id = ++this.idKelompok;
    this.kelompokIkan.set(id, {
      total: pola.n,
      terambil: 0,
      bonus: BONUS_POLA,
      label: "SEMPURNA!",
    });

    for (let i = 0; i < pola.n; i++) {
      const ikan = this.ikan.create(
        x0 + i * jarak,
        groundY - pola.tinggi(i, a),
        "ikan",
      ) as Phaser.Physics.Arcade.Sprite;
      (ikan.body as Phaser.Physics.Arcade.Body).setSize(34, 20);
      ikan.setVelocityX(-this.kecepatan);
      ikan.setData("fase", i * 0.6);
      ikan.setData("nilai", NILAI_IKAN_JETPACK);
      ikan.setData("kelompok", id);
    }
  }

  // dipanggil tiap frame selama terbang
  private perbaruiTerbang(time: number, delta: number) {
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    const groundY = this.scale.height - 60;
    this.sisaTerbang -= delta;

    // tahan = naik, lepas = turun pelan (gerakan dihaluskan)
    const tahan =
      this.spaceKey.isDown ||
      this.upKey.isDown ||
      this.input.activePointer.isDown;
    const target = tahan ? -260 : 220;
    const k = 1 - Math.exp(-delta / 90);
    let v = Phaser.Math.Linear(body.velocity.y, target, k);
    if (body.top < 100 && v < 0) v = 0; // batas atas
    if (body.bottom > groundY - 4 && v > 0) v = 0; // batas bawah
    body.setVelocityY(v);

    // miring sedikit mengikuti gerak; jetpack dan api menempel di punggung
    this.player.setAngle(Phaser.Math.Clamp(v * 0.04, -10, 10));
    this.jetpackPakai
      .setPosition(this.player.x - 4, this.player.y - 44)
      .setAngle(this.player.angle);
    this.apiJetpack.setPosition(this.player.x - 14, this.player.y - 30);

    // bar sisa waktu, lalu kedip dan bip di 1,5 detik terakhir
    this.barJetpack.setScale(Math.max(0, this.sisaTerbang / JETPACK_DURASI), 1);
    if (this.sisaTerbang < 1500) {
      this.player.setAlpha(Math.floor(time / 90) % 2 === 0 ? 1 : 0.4);
      const bip = Math.ceil(this.sisaTerbang / 300);
      if (bip !== this.bipTerakhir) {
        this.bipTerakhir = bip;
        bunyi(this, 660, 660, 0.06, "square", 0.06);
      }
    }
    if (this.sisaTerbang <= 0) this.akhiriTerbang();
  }

  // tombol dilepas saat kucing masih naik: potong lompatnya
  private lepasLompat() {
    if (this.selesai || this.dijeda || this.terbang) return;
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    if (body.velocity.y < -LOMPAT_POTONG) body.setVelocityY(-LOMPAT_POTONG);
  }

  // perbarui tulisan jumlah ikan dan posisi ikonnya di sebelah kiri tulisan
  private perbaruiHitunganIkan() {
    this.teksIkan.setText(`x${String(this.jumlahIkan).padStart(2, "0")}`);
    this.ikonIkan.setX(this.teksIkan.x - this.teksIkan.width - 18);
  }

  // tulisan yang melayang naik lalu memudar
  private teksMelayang(
    x: number,
    y: number,
    isi: string,
    warna: string,
    ukuran = "12px",
    durasi = 600,
  ) {
    const t = this.add
      .text(x, y, isi, {
        fontFamily: FONT,
        fontSize: ukuran,
        color: warna,
        stroke: "#2B2B3A",
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setDepth(5);
    this.tweens.add({
      targets: t,
      y: y - 40,
      alpha: 0,
      duration: durasi,
      onComplete: () => t.destroy(),
    });
  }

  private ambilIkan(ikan: Phaser.GameObjects.GameObject) {
    const s = ikan as Phaser.GameObjects.Sprite;
    const { x, y } = s;
    const nilai = (s.getData("nilai") as number | undefined) ?? NILAI_IKAN;
    const id = s.getData("kelompok") as number | undefined;
    s.destroy();

    // penghitung ikan di pojok, ikonnya berdenyut
    this.jumlahIkan += 1;
    this.perbaruiHitunganIkan();
    this.tweens.killTweensOf(this.ikonIkan);
    this.ikonIkan.setScale(0.7);
    this.tweens.add({
      targets: this.ikonIkan,
      scale: 1,
      duration: 90,
      yoyo: true,
    });

    // hitung berapa ikan dalam barisan ini yang sudah terambil
    const kel = id !== undefined ? this.kelompokIkan.get(id) : undefined;
    let terambil = 1;
    if (kel) {
      kel.terambil += 1;
      terambil = kel.terambil;
    }

    this.percikIkan.explode(nilai === NILAI_IKAN ? 12 : 5, x, y);
    this.skor += nilai;
    // makin banyak ikan berurutan, makin tinggi nadanya
    const nada = 988 * Math.pow(1.06, Math.min(terambil - 1, 8));
    bunyi(this, nada, nada * 1.33, 0.1, "square", 0.07);
    this.teksMelayang(x, y - 10, `+${nilai}`, "#FFD23F");

    // semua ikan dalam barisan terambil: bonus
    if (kel && id !== undefined && kel.terambil === kel.total) {
      this.kelompokIkan.delete(id);
      this.skor += kel.bonus;
      this.percikIkan.explode(22, x, y);
      bunyi(this, 784, 784, 0.08, "square", 0.08, 0.1);
      bunyi(this, 988, 988, 0.08, "square", 0.08, 0.18);
      bunyi(this, 1319, 1568, 0.2, "square", 0.08, 0.26);
      this.teksMelayang(
        x,
        y - 42,
        `${kel.label} +${kel.bonus}`,
        "#FF7BAC",
        "14px",
        1000,
      );
    }
  }

  // satu aksi untuk semua input: lompat saat main, mulai ulang saat game over
  private aksi() {
    if (this.selesai) {
      if (this.bisaUlang) {
        bunyiUlang(this);
        this.scene.restart();
      }
      return;
    }
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    if (body.blocked.down || body.touching.down) {
      body.setVelocityY(-LOMPAT_PENUH);
      bunyi(this, 280, 620, 0.12, "square");
      this.debuMendarat.explode(5, this.player.x - 10, this.scale.height - 62);
    }
  }

  private gameOver() {
    if (this.selesai || this.terbang || this.waktuMain < this.kebalSampai)
      return;
    this.selesai = true;
    this.physics.pause();
    this.spawnTimer?.remove();
    this.timerIkan?.remove();
    this.timerBurung?.remove();
    this.timerJetpack?.remove();
    this.timerPola?.remove();
    this.hudJetpack.setVisible(false);
    this.apiJetpack.stop();
    this.jetpackPakai.setVisible(false);
    this.burung
      .getChildren()
      .forEach((b) => (b as Phaser.GameObjects.Sprite).anims.stop());
    this.player.anims.stop();
    this.player.setTint(0xff6b6b);
    this.musik.redam(true);
    this.debuLari.stop();
    const badan = this.player.body as Phaser.Physics.Arcade.Body;
    this.serpihan.explode(18, badan.center.x, badan.center.y);
    this.cameras.main.shake(250, 0.01);
    bunyi(this, 420, 70, 0.45, "sawtooth", 0.1);

    // cek dan simpan rekor
    const skorAkhir = Math.floor(this.skor);
    const rekorBaru = skorAkhir > this.rekor;
    if (rekorBaru) {
      this.rekor = skorAkhir;
      simpanRekor(skorAkhir);
    }

    const { width, height } = this.scale;

    const cx = width / 2;
    const cy = height / 2;

    this.add
      .rectangle(cx, cy, 460, 190, 0xffffff)
      .setStrokeStyle(4, 0x2b2b3a)
      .setDepth(10);
    this.add
      .text(cx, cy - 60, "GAME OVER", {
        fontFamily: FONT,
        fontSize: "24px",
        color: "#2B2B3A",
      })
      .setOrigin(0.5)
      .setDepth(11);
    this.add
      .text(cx, cy - 18, `SKOR: ${skorAkhir}   IKAN: ${this.jumlahIkan}`, {
        fontFamily: FONT,
        fontSize: "14px",
        color: "#2B2B3A",
      })
      .setOrigin(0.5)
      .setDepth(11);
    this.add
      .text(cx, cy + 14, rekorBaru ? "REKOR BARU!" : `REKOR: ${this.rekor}`, {
        fontFamily: FONT,
        fontSize: "12px",
        color: rekorBaru ? "#E4572E" : "#2B2B3A",
      })
      .setOrigin(0.5)
      .setDepth(11);
    this.add
      .text(cx, cy + 58, "SPASI / TAP: MAIN LAGI", {
        fontFamily: FONT,
        fontSize: "10px",
        color: "#2B2B3A",
      })
      .setOrigin(0.5)
      .setDepth(11);

    // jeda singkat supaya tidak langsung mulai ulang karena menekan spasi terlalu cepat
    this.time.delayedCall(500, () => {
      this.bisaUlang = true;
    });
  }

  update(time: number, delta: number) {
    const tekanLompat =
      Phaser.Input.Keyboard.JustDown(this.spaceKey) ||
      Phaser.Input.Keyboard.JustDown(this.upKey);
    const lepasTombol =
      Phaser.Input.Keyboard.JustUp(this.spaceKey) ||
      Phaser.Input.Keyboard.JustUp(this.upKey);

    // saat dijeda, tombol tetap "dibaca" supaya tidak ada lompatan tertunda
    if (this.dijeda) return;

    if (tekanLompat) this.aksi();
    if (lepasTombol) this.lepasLompat();

    if (!this.selesai) {
      // skor naik sekitar 10 poin per detik
      this.skor += delta * 0.01;
      this.teksSkor.setText(
        `SKOR ${Math.floor(this.skor).toString().padStart(5, "0")}`,
      );
      this.waktuMain += delta;
      this.terapkanSiklus(time);

      // tiap kelipatan 100: bunyi "ting" dan angka skor berdenyut
      const kelipatan = Math.floor(this.skor / 100);
      if (kelipatan > this.kelipatanTerakhir) {
        this.kelipatanTerakhir = kelipatan;
        bunyi(this, 880, 1320, 0.15, "triangle", 0.1);
        this.tweens.add({
          targets: this.teksSkor,
          scale: 1.25,
          duration: 100,
          yoyo: true,
        });
      }

      // makin tinggi skor, makin cepat (sampai batas maksimum)
      this.kecepatan = Math.min(
        KECEPATAN_AWAL + (this.waktuMain / 1000) * TAMBAHAN_PER_DETIK,
        KECEPATAN_MAKS,
      );
      // lompat bisa dikontrol: tahan = tinggi, lepas cepat = pendek
      this.player.anims.timeScale = this.kecepatan / KECEPATAN_AWAL;

      // pose kucing: berlari di tanah, pose khusus saat melayang
      const body = this.player.body as Phaser.Physics.Arcade.Body;
      const diTanah = body.blocked.down || body.touching.down;
      // puff saat mendarat, dan debu mengalir selama di tanah
      if (diTanah && !this.sebelumnyaDiTanah) {
        this.debuMendarat.explode(
          7,
          this.player.x - 10,
          this.scale.height - 62,
        );
      }
      this.sebelumnyaDiTanah = diTanah;
      if (diTanah && !this.debuLari.emitting) this.debuLari.start();
      else if (!diTanah && this.debuLari.emitting) this.debuLari.stop();
      this.debuLari.timeScale = this.kecepatan / KECEPATAN_AWAL;
      if (diTanah) {
        if (!this.player.anims.isPlaying) this.player.play("lari");
      } else if (this.player.anims.isPlaying) {
        this.player.anims.stop();
        this.player.setFrame(KUCING.frameLompat);
      }

      // semua rintangan ikut kecepatan terbaru
      this.obstacles.getChildren().forEach((o) => {
        (o.body as Phaser.Physics.Arcade.Body).setVelocityX(-this.kecepatan);
      });
      // ikan ikut kecepatan dan bergoyang pelan
      this.ikan.getChildren().forEach((o) => {
        (o.body as Phaser.Physics.Arcade.Body).setVelocityX(-this.kecepatan);
        (o as Phaser.GameObjects.Sprite).angle =
          Math.sin(time / 150 + (o.getData("fase") as number)) * 8;
      });

      // burung terbang sedikit lebih cepat dan melayang naik-turun tipis
      // burung terbang sedikit lebih cepat dan melayang naik-turun tipis
      this.burung.getChildren().forEach((o) => {
        const b = o as Phaser.Physics.Arcade.Sprite;
        (b.body as Phaser.Physics.Arcade.Body).setVelocityX(
          -(this.kecepatan + TAMBAHAN_KECEPATAN_BURUNG),
        );
        b.y =
          (b.getData("yDasar") as number) +
          Math.sin(time / 220 + (b.getData("fase") as number)) * 3;
      });

      // item jetpack bergerak dan bergoyang pelan
      this.itemJetpack.getChildren().forEach((o) => {
        (o.body as Phaser.Physics.Arcade.Body).setVelocityX(-this.kecepatan);
        (o as Phaser.GameObjects.Sprite).angle =
          Math.sin(time / 200 + (o.getData("fase") as number)) * 6;
      });

      // jetpack aktif, atau masa kebal sesudahnya (kucing berkedip)
      if (this.terbang) {
        this.perbaruiTerbang(time, delta);
      } else {
        this.player.setAlpha(
          this.waktuMain < this.kebalSampai
            ? Math.floor(time / 90) % 2 === 0
              ? 1
              : 0.4
            : 1,
        );
      }

      // geser latar: lapisan dekat lebih cepat dari yang jauh

      // geser latar: lapisan dekat lebih cepat dari yang jauh
      const geser = (this.kecepatan * delta) / 1000;
      this.awan.tilePositionX += geser * 0.1;
      this.bukitJauh.tilePositionX += geser * 0.25;
      this.bukitDekat.tilePositionX += geser * 0.5;
      this.tanah.tilePositionX += geser;
    }

    // hapus rintangan yang sudah lewat layar
    this.obstacles
      .getChildren()
      .slice()
      .forEach((o) => {
        if ((o as Phaser.GameObjects.Sprite).x < -60) o.destroy();
      });

    this.itemJetpack
      .getChildren()
      .slice()
      .forEach((o) => {
        if ((o as Phaser.GameObjects.Sprite).x < -60) o.destroy();
      });

    this.ikan
      .getChildren()
      .slice()
      .forEach((o) => {
        if ((o as Phaser.GameObjects.Sprite).x < -60) o.destroy();
      });

    this.burung
      .getChildren()
      .slice()
      .forEach((o) => {
        if ((o as Phaser.GameObjects.Sprite).x < -60) o.destroy();
      });
  }
}
