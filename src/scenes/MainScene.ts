import Phaser from 'phaser';

const KUCING = {
  key: 'kucing-lari',
  file: 'assets/kucing-lari.png',
  frameWidth: 80,
  frameHeight: 64,
  frameAwal: 0,
  frameAkhir: 7,
  skala: 1.5,
  hitbox: { lebar: 34, tinggi: 20, x: 24, y: 28 },
};

const FONT = '"Press Start 2P"';

export default class MainScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private obstacles!: Phaser.Physics.Arcade.Group;
  private spawnTimer?: Phaser.Time.TimerEvent;
  private spaceKey!: Phaser.Input.Keyboard.Key;
  private upKey!: Phaser.Input.Keyboard.Key;
  private teksSkor!: Phaser.GameObjects.Text;
  private skor = 0;
  private kecepatan = 320;
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

  create() {
    const { width, height } = this.scale;
    const groundY = height - 60;

    // reset status (penting supaya main lagi mulai dari nol)
    this.selesai = false;
    this.bisaUlang = false;
    this.skor = 0;
    this.kecepatan = 320;

    // tanah (tampilan)
    this.add.rectangle(0, groundY, width, 60, 0xb97a4b).setOrigin(0, 0);
    this.add.rectangle(0, groundY, width, 12, 0x6bcb4b).setOrigin(0, 0);

    // tanah (fisik, tidak bergerak)
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

    // kontrol: spasi, panah atas, atau tap/klik
    this.spaceKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.upKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.UP);
    this.input.on('pointerdown', () => this.aksi());

    // judul dan skor
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
    }
  }

  private gameOver() {
    if (this.selesai) return;
    this.selesai = true;
    this.physics.pause();
    this.spawnTimer?.remove();
    this.player.anims.stop();
    this.player.setTint(0xff6b6b);

    const { width, height } = this.scale;
    const cx = width / 2;
    const cy = height / 2;

    this.add
      .rectangle(cx, cy, 460, 170, 0xffffff)
      .setStrokeStyle(4, 0x2b2b3a)
      .setDepth(10);
    this.add
      .text(cx, cy - 45, 'GAME OVER', { fontFamily: FONT, fontSize: '24px', color: '#2B2B3A' })
      .setOrigin(0.5)
      .setDepth(11);
    this.add
      .text(cx, cy, `SKOR: ${Math.floor(this.skor)}`, {
        fontFamily: FONT,
        fontSize: '14px',
        color: '#2B2B3A',
      })
      .setOrigin(0.5)
      .setDepth(11);
    this.add
      .text(cx, cy + 45, 'SPASI / TAP: MAIN LAGI', {
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

    // skor naik sekitar 10 poin per detik
    if (!this.selesai) {
      this.skor += delta * 0.01;
      this.teksSkor.setText(`SKOR ${Math.floor(this.skor).toString().padStart(5, '0')}`);
    }

    // hapus rintangan yang sudah lewat layar
    this.obstacles.getChildren().slice().forEach((o) => {
      if ((o as Phaser.GameObjects.Rectangle).x < -60) o.destroy();
    });
  }
}