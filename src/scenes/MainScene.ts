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
const PANJANG_SIKLUS = 100000; // milidetik: 100 detik untuk satu putaran penuh
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
  private tanah!: Phaser.GameObjects.TileSprite;
  private ikan!: Phaser.Physics.Arcade.Group;
  private teksHud: Phaser.GameObjects.Text[] = [];
  private bintang: Phaser.GameObjects.Image[] = [];
  private matahari!: Phaser.GameObjects.Image;
  private waktuMain = 0;
  private bulan!: Phaser.GameObjects.Image;
  private debuLari!: Phaser.GameObjects.Particles.ParticleEmitter;
  private debuMendarat!: Phaser.GameObjects.Particles.ParticleEmitter;
  private percikIkan!: Phaser.GameObjects.Particles.ParticleEmitter;
  private serpihan!: Phaser.GameObjects.Particles.ParticleEmitter;
  private semuaPartikel: Phaser.GameObjects.Particles.ParticleEmitter[] = [];
  private sebelumnyaDiTanah = false;
  private dijeda = false;
  private panelJeda!: Phaser.GameObjects.Container;
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
    this.waktuMain = 0;
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
    this.spawnTimer = this.time.delayedCall(1200, () => this.spawnObstacle());
    this.jadwalkanIkan();

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

    this.add
      .text(width - 20, 44, `REKOR ${String(this.rekor).padStart(5, "0")}`, {
        fontFamily: FONT,
        fontSize: "10px",
        color: "#2B2B3A",
      })
      .setOrigin(1, 0);

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
    this.teksHud = [
      judul,
      this.teksSkor,
      teksRekor,
      this.teksSuara,
      tombolJeda,
    ];
    this.warnaHud = "";
    this.terapkanSiklus(0);
  }

  private spawnObstacle() {
    if (this.selesai) return;
    const { width, height } = this.scale;
    const jenis = Phaser.Utils.Array.GetRandom(JENIS_RINTANGAN);

    const rintangan = this.obstacles.create(
      width + 40,
      height - 60,
      jenis.key,
    ) as Phaser.Physics.Arcade.Sprite;
    rintangan.setOrigin(0.5, 1);

    const body = rintangan.body as Phaser.Physics.Arcade.Body;
    body.setSize(jenis.lebar, jenis.tinggi);
    body.setOffset(jenis.offX, jenis.offY);
    body.setVelocityX(-this.kecepatan);

    this.spawnTimer = this.time.delayedCall(
      Phaser.Math.Between(1100, 2000),
      () => this.spawnObstacle(),
    );
  }

  // ikan muncul sendiri, jarang: sekali tiap 7-12 detik
  private jadwalkanIkan() {
    this.timerIkan = this.time.delayedCall(
      Phaser.Math.Between(7000, 12000),
      () => {
        if (this.selesai) return;
        this.spawnIkan(this.scale.width + 40);
        this.jadwalkanIkan();
      },
    );
  }

  // tiga ikan melayang tinggi, hanya terjangkau kalau spasi ditahan lama
  private spawnIkan(xTengah: number) {
    const groundY = this.scale.height - 60;
    const tinggiDasar = Phaser.Math.Between(120, 140);
    const lengkung = [0, 12, 0]; // tengah sedikit lebih tinggi
    lengkung.forEach((tambah, i) => {
      const ikan = this.ikan.create(
        xTengah + (i - 1) * 52,
        groundY - tinggiDasar - tambah,
        "ikan",
      ) as Phaser.Physics.Arcade.Sprite;
      (ikan.body as Phaser.Physics.Arcade.Body).setSize(34, 20);
      ikan.setVelocityX(-this.kecepatan);
      ikan.setData("fase", i * 1.2);
    });
  }

  // tombol dilepas saat kucing masih naik: potong lompatnya
  private lepasLompat() {
    if (this.selesai) return;
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    if (body.velocity.y < -LOMPAT_POTONG) body.setVelocityY(-LOMPAT_POTONG);
  }

  private ambilIkan(ikan: Phaser.GameObjects.GameObject) {
    const s = ikan as Phaser.GameObjects.Sprite;
    const { x, y } = s;
    s.destroy();

    this.percikIkan.explode(12, x, y);

    this.skor += NILAI_IKAN;
    bunyi(this, 988, 1319, 0.1, "square", 0.07);

    const teks = this.add
      .text(x, y - 10, "+50", {
        fontFamily: FONT,
        fontSize: "12px",
        color: "#FFD23F",
        stroke: "#2B2B3A",
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setDepth(5);
    this.tweens.add({
      targets: teks,
      y: y - 50,
      alpha: 0,
      duration: 600,
      onComplete: () => teks.destroy(),
    });
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
    if (this.selesai) return;
    this.selesai = true;
    this.physics.pause();
    this.spawnTimer?.remove();
    this.timerIkan?.remove();
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
      .text(cx, cy - 18, `SKOR: ${skorAkhir}`, {
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

    this.ikan
      .getChildren()
      .slice()
      .forEach((o) => {
        if ((o as Phaser.GameObjects.Sprite).x < -60) o.destroy();
      });
  }
}
