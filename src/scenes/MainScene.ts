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

// pengaturan kecepatan (piksel per detik)
const KECEPATAN_AWAL = 320;
const KECEPATAN_MAKS = 720;
const TAMBAHAN_PER_POIN = 0.5;
const LOMPAT_PENUH = 550;
const LOMPAT_POTONG = 200;
const NILAI_IKAN = 20;
const JENIS_RINTANGAN = [
  { key: "kardus", lebar: 28, tinggi: 24, offX: 2, offY: 4 },
  { key: "ember", lebar: 22, tinggi: 30, offX: 3, offY: 4 },
  { key: "pot", lebar: 22, tinggi: 42, offX: 3, offY: 4 },
];

export default class MainScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private obstacles!: Phaser.Physics.Arcade.Group;
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

  create() {
    const { width, height } = this.scale;
    const groundY = height - 60;

    this.cameras.main.fadeIn(250, 43, 43, 58);
    // reset status (penting supaya main lagi mulai dari nol)
    this.selesai = false;
    this.bisaUlang = false;
    this.skor = 0;
    this.kelipatanTerakhir = 0;
    this.kecepatan = KECEPATAN_AWAL;
    this.rekor = bacaRekor();

    // latar berlapis: yang jauh bergerak pelan, yang dekat lebih cepat
    buatTekstur(this);
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
        if (objek.length === 0) this.aksi();
      },
    );
    this.input.on("pointerup", () => this.lepasLompat());

    this.input.keyboard!.on("keydown-M", () => this.ubahSuara());

    // judul, skor, rekor, dan tombol suara
    this.add
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
    if (
      Phaser.Input.Keyboard.JustDown(this.spaceKey) ||
      Phaser.Input.Keyboard.JustDown(this.upKey)
    ) {
      this.aksi();
    }

    if (
      Phaser.Input.Keyboard.JustUp(this.spaceKey) ||
      Phaser.Input.Keyboard.JustUp(this.upKey)
    ) {
      this.lepasLompat();
    }

    if (!this.selesai) {
      // skor naik sekitar 10 poin per detik
      this.skor += delta * 0.01;
      this.teksSkor.setText(
        `SKOR ${Math.floor(this.skor).toString().padStart(5, "0")}`,
      );

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
        KECEPATAN_AWAL + this.skor * TAMBAHAN_PER_POIN,
        KECEPATAN_MAKS,
      );
      // lompat bisa dikontrol: tahan = tinggi, lepas cepat = pendek
      this.player.anims.timeScale = this.kecepatan / KECEPATAN_AWAL;

      // pose kucing: berlari di tanah, pose khusus saat melayang
      const body = this.player.body as Phaser.Physics.Arcade.Body;
      const diTanah = body.blocked.down || body.touching.down;
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
