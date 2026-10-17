import Phaser from 'phaser';

const KUCING = {
  key: 'kucing-lari',
  file: 'assets/kucing-lari.png',
  frameWidth: 80,
  frameHeight: 64,
  frameAwal: 0,
  frameAkhir: 7,
  frameLompat: 2, // frame yang dipakai saat kucing melayang (coba 0-7)
  skala: 1.5,
  hitbox: { lebar: 34, tinggi: 20, x: 24, y: 28 },
};

const FONT = '"Press Start 2P"';

// pengaturan kecepatan (piksel per detik)
const KECEPATAN_AWAL = 320;
const KECEPATAN_MAKS = 720;
const TAMBAHAN_PER_POIN = 0.5;

const KUNCI_REKOR = 'kucing-lari-rekor';

function bacaRekor(): number {
  try {
    return Number(localStorage.getItem(KUNCI_REKOR)) || 0;
  } catch {
    return 0;
  }
}

function simpanRekor(nilai: number) {
  try {
    localStorage.setItem(KUNCI_REKOR, String(nilai));
  } catch {
    // abaikan kalau penyimpanan tidak tersedia
  }
}

export default class MainScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private obstacles!: Phaser.Physics.Arcade.Group;
  private spawnTimer?: Phaser.Time.TimerEvent;
  private spaceKey!: Phaser.Input.Keyboard.Key;
  private upKey!: Phaser.Input.Keyboard.Key;
  private teksSkor!: Phaser.GameObjects.Text;
  private teksRekor!: Phaser.GameObjects.Text;
  private teksSuara!: Phaser.GameObjects.Text;
  private awan!: Phaser.GameObjects.TileSprite;
  private bukitJauh!: Phaser.GameObjects.TileSprite;
  private bukitDekat!: Phaser.GameObjects.TileSprite;
  private tanah!: Phaser.GameObjects.TileSprite;
  private skor = 0;
  private rekor = 0;
  private kelipatanTerakhir = 0;
  private kecepatan = KECEPATAN_AWAL;
  private selesai = false;
  private bisaUlang = false;

  constructor() {
    super('MainScene');
  }

  preload() {
    this.load.spritesheet(KUCING.key, KUCING.file, {
      frameWidth: KUCING.frameWidth,
      frameHeight: KUCING.frameHeight,
    });
  }

  // membuat gambar latar lewat kode (hanya sekali)
  private buatTekstur() {
    if (this.textures.exists('tanah')) return;
    const g = this.add.graphics();

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
    g.generateTexture('awan', 800, 120);
    g.clear();

    // bukit berundak (pixel art), tinggi dibulatkan ke kelipatan 8
    const bukit = (x: number, lebar: number, tinggi: number, texH: number) => {
      const langkah = 16;
      const n = lebar / langkah;
      for (let i = 0; i < n; i++) {
        const h = Math.round((tinggi * Math.sin((Math.PI * (i + 0.5)) / n)) / 8) * 8;
        g.fillRect(x + i * langkah, texH - h, langkah, h);
      }
    };

    g.fillStyle(0x9fdcaa);
    bukit(0, 256, 90, 140);
    bukit(240, 304, 120, 140);
    bukit(560, 240, 80, 140);
    g.generateTexture('bukit-jauh', 800, 140);
    g.clear();

    g.fillStyle(0x7fd36b);
    bukit(0, 208, 56, 90);
    bukit(240, 192, 48, 90);
    bukit(592, 208, 64, 90);
    g.generateTexture('bukit-dekat', 800, 90);
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
    g.generateTexture('tanah', 64, 60);

    g.destroy();
  }

  // suara sederhana dibuat langsung dari osilator (tanpa file audio)
  private bunyi(
    freqAwal: number,
    freqAkhir: number,
    durasi: number,
    tipe: OscillatorType = 'square',
    volume = 0.08
  ) {
    const mgr = this.sound as Phaser.Sound.WebAudioSoundManager;
    const ctx = mgr.context;
    if (!ctx || !mgr.masterMuteNode || ctx.state !== 'running') return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const t = ctx.currentTime;

    osc.type = tipe;
    osc.frequency.setValueAtTime(freqAwal, t);
    osc.frequency.exponentialRampToValueAtTime(freqAkhir, t + durasi);
    gain.gain.setValueAtTime(volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + durasi);

    osc.connect(gain);
    gain.connect(mgr.masterMuteNode); // lewat sini supaya tombol mute berfungsi
    osc.start(t);
    osc.stop(t + durasi);
  }

  private perbaruiLabelSuara() {
    this.teksSuara.setText(this.sound.mute ? 'SUARA: OFF (M)' : 'SUARA: ON (M)');
  }

  private ubahSuara() {
    this.sound.mute = !this.sound.mute;
    this.perbaruiLabelSuara();
  }

  create() {
    const { width, height } = this.scale;
    const groundY = height - 60;

    // reset status (penting supaya main lagi mulai dari nol)
    this.selesai = false;
    this.bisaUlang = false;
    this.skor = 0;
    this.kelipatanTerakhir = 0;
    this.kecepatan = KECEPATAN_AWAL;
    this.rekor = bacaRekor();

    // latar berlapis: yang jauh bergerak pelan, yang dekat lebih cepat
    this.buatTekstur();
    this.awan = this.add.tileSprite(0, 20, width, 120, 'awan').setOrigin(0, 0);
    this.bukitJauh = this.add
      .tileSprite(0, groundY - 140, width, 140, 'bukit-jauh')
      .setOrigin(0, 0);
    this.bukitDekat = this.add
      .tileSprite(0, groundY - 90, width, 90, 'bukit-dekat')
      .setOrigin(0, 0);
    this.tanah = this.add.tileSprite(0, groundY, width, 60, 'tanah').setOrigin(0, 0);

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

    if (!this.anims.exists('lari')) {
      this.anims.create({
        key: 'lari',
        frames: this.anims.generateFrameNumbers(KUCING.key, {
          start: KUCING.frameAwal,
          end: KUCING.frameAkhir,
        }),
        frameRate: 12,
        repeat: -1,
      });
    }
    this.player.play('lari');

    this.physics.add.collider(this.player, ground);

    // rintangan
    this.obstacles = this.physics.add.group({ allowGravity: false, immovable: true });
    this.physics.add.overlap(this.player, this.obstacles, () => this.gameOver());
    this.spawnTimer = this.time.delayedCall(1200, () => this.spawnObstacle());

    // kontrol: spasi, panah atas, atau tap/klik (kecuali saat menekan tombol suara)
    this.spaceKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.upKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.UP);
    this.input.on(
      'pointerdown',
      (_pointer: Phaser.Input.Pointer, objek: Phaser.GameObjects.GameObject[]) => {
        if (objek.length === 0) this.aksi();
      }
    );
    this.input.keyboard!.on('keydown-M', () => this.ubahSuara());

    // judul, skor, rekor, dan tombol suara
    this.add
      .text(width / 2, 40, 'KUCING LARI', {
        fontFamily: FONT,
        fontSize: '20px',
        color: '#2B2B3A',
      })
      .setOrigin(0.5);

    this.teksSkor = this.add
      .text(width - 20, 20, 'SKOR 00000', {
        fontFamily: FONT,
        fontSize: '14px',
        color: '#2B2B3A',
      })
      .setOrigin(1, 0);

    this.teksRekor = this.add
      .text(width - 20, 44, `REKOR ${String(this.rekor).padStart(5, '0')}`, {
        fontFamily: FONT,
        fontSize: '10px',
        color: '#2B2B3A',
      })
      .setOrigin(1, 0);

    this.teksSuara = this.add
      .text(20, 20, '', { fontFamily: FONT, fontSize: '10px', color: '#2B2B3A' })
      .setInteractive({ useHandCursor: true });
    this.teksSuara.on('pointerdown', () => this.ubahSuara());
    this.perbaruiLabelSuara();
  }

  private spawnObstacle() {
    if (this.selesai) return;
    const { width, height } = this.scale;
    const tinggi = Phaser.Math.Between(30, 56);

    const rintangan = this.add
      .rectangle(width + 40, height - 60, 28, tinggi, 0xe4572e)
      .setOrigin(0.5, 1)
      .setStrokeStyle(2, 0x2b2b3a);

    this.obstacles.add(rintangan); // masukkan ke grup dulu, baru atur kecepatan
    (rintangan.body as Phaser.Physics.Arcade.Body).setVelocityX(-this.kecepatan);

    this.spawnTimer = this.time.delayedCall(Phaser.Math.Between(1100, 2000), () =>
      this.spawnObstacle()
    );
  }

  // satu aksi untuk semua input: lompat saat main, mulai ulang saat game over
  private aksi() {
    if (this.selesai) {
      if (this.bisaUlang) this.scene.restart();
      return;
    }
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    if (body.blocked.down || body.touching.down) {
      body.setVelocityY(-550);
      this.bunyi(280, 620, 0.12, 'square');
    }
  }

  private gameOver() {
    if (this.selesai) return;
    this.selesai = true;
    this.physics.pause();
    this.spawnTimer?.remove();
    this.player.anims.stop();
    this.player.setTint(0xff6b6b);
    this.cameras.main.shake(250, 0.01);
    this.bunyi(420, 70, 0.45, 'sawtooth', 0.1);

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
      .text(cx, cy - 60, 'GAME OVER', { fontFamily: FONT, fontSize: '24px', color: '#2B2B3A' })
      .setOrigin(0.5)
      .setDepth(11);
    this.add
      .text(cx, cy - 18, `SKOR: ${skorAkhir}`, {
        fontFamily: FONT,
        fontSize: '14px',
        color: '#2B2B3A',
      })
      .setOrigin(0.5)
      .setDepth(11);
    this.add
      .text(cx, cy + 14, rekorBaru ? 'REKOR BARU!' : `REKOR: ${this.rekor}`, {
        fontFamily: FONT,
        fontSize: '12px',
        color: rekorBaru ? '#E4572E' : '#2B2B3A',
      })
      .setOrigin(0.5)
      .setDepth(11);
    this.add
      .text(cx, cy + 58, 'SPASI / TAP: MAIN LAGI', {
        fontFamily: FONT,
        fontSize: '10px',
        color: '#2B2B3A',
      })
      .setOrigin(0.5)
      .setDepth(11);

    // jeda singkat supaya tidak langsung mulai ulang karena menekan spasi terlalu cepat
    this.time.delayedCall(500, () => {
      this.bisaUlang = true;
    });
  }

  update(_time: number, delta: number) {
    if (
      Phaser.Input.Keyboard.JustDown(this.spaceKey) ||
      Phaser.Input.Keyboard.JustDown(this.upKey)
    ) {
      this.aksi();
    }

    if (!this.selesai) {
      // skor naik sekitar 10 poin per detik
      this.skor += delta * 0.01;
      this.teksSkor.setText(`SKOR ${Math.floor(this.skor).toString().padStart(5, '0')}`);

      // tiap kelipatan 100: bunyi "ting" dan angka skor berdenyut
      const kelipatan = Math.floor(this.skor / 100);
      if (kelipatan > this.kelipatanTerakhir) {
        this.kelipatanTerakhir = kelipatan;
        this.bunyi(880, 1320, 0.15, 'triangle', 0.1);
        this.tweens.add({ targets: this.teksSkor, scale: 1.25, duration: 100, yoyo: true });
      }

      // makin tinggi skor, makin cepat (sampai batas maksimum)
      this.kecepatan = Math.min(KECEPATAN_AWAL + this.skor * TAMBAHAN_PER_POIN, KECEPATAN_MAKS);
      this.player.anims.timeScale = this.kecepatan / KECEPATAN_AWAL;

      // pose kucing: berlari di tanah, pose khusus saat melayang
      const body = this.player.body as Phaser.Physics.Arcade.Body;
      const diTanah = body.blocked.down || body.touching.down;
      if (diTanah) {
        if (!this.player.anims.isPlaying) this.player.play('lari');
      } else if (this.player.anims.isPlaying) {
        this.player.anims.stop();
        this.player.setFrame(KUCING.frameLompat);
      }

      // semua rintangan ikut kecepatan terbaru
      this.obstacles.getChildren().forEach((o) => {
        (o.body as Phaser.Physics.Arcade.Body).setVelocityX(-this.kecepatan);
      });

      // geser latar: lapisan dekat lebih cepat dari yang jauh
      const geser = (this.kecepatan * delta) / 1000;
      this.awan.tilePositionX += geser * 0.1;
      this.bukitJauh.tilePositionX += geser * 0.25;
      this.bukitDekat.tilePositionX += geser * 0.5;
      this.tanah.tilePositionX += geser;
    }

    // hapus rintangan yang sudah lewat layar
    this.obstacles.getChildren().slice().forEach((o) => {
      if ((o as Phaser.GameObjects.Rectangle).x < -60) o.destroy();
    });
  }
}