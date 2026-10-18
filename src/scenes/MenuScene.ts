import Phaser from 'phaser';
import { KUCING, FONT, bacaRekor, buatTekstur, buatAnimasi, bunyiMulai } from "../umum";
import { ambilMusik } from "../musik";


export default class MenuScene extends Phaser.Scene {
  private awan!: Phaser.GameObjects.TileSprite;
  private bukitJauh!: Phaser.GameObjects.TileSprite;
  private bukitDekat!: Phaser.GameObjects.TileSprite;
  private tanah!: Phaser.GameObjects.TileSprite;
  private sudahMulai = false;

  constructor() {
    super('MenuScene');
  }

  preload() {
    this.load.spritesheet(KUCING.key, KUCING.file, {
      frameWidth: KUCING.frameWidth,
      frameHeight: KUCING.frameHeight,
    });
  }

  create() {
    const { width, height } = this.scale;
    const cx = width / 2;
    const groundY = height - 60;
    this.sudahMulai = false;

    // latar (sama seperti di game)
    buatTekstur(this);
    buatAnimasi(this);
    this.awan = this.add.tileSprite(0, 20, width, 120, 'awan').setOrigin(0, 0);
    this.bukitJauh = this.add
      .tileSprite(0, groundY - 140, width, 140, 'bukit-jauh')
      .setOrigin(0, 0);
    this.bukitDekat = this.add
      .tileSprite(0, groundY - 90, width, 90, 'bukit-dekat')
      .setOrigin(0, 0);
    this.tanah = this.add.tileSprite(0, groundY, width, 60, 'tanah').setOrigin(0, 0);

    // kucing berlari di tempat; kakinya ditaruh tepat di rumput
    const skala = 2.5;
    const kakiLokal = KUCING.hitbox.y + KUCING.hitbox.tinggi;
    const kucing = this.add
      .sprite(cx, groundY + (KUCING.frameHeight - kakiLokal) * skala, KUCING.key)
      .setOrigin(0.5, 1)
      .setScale(skala);
    kucing.play('lari');

    // judul, melayang pelan
    const judul = this.add
      .text(cx, 100, 'CHIBI LARI', {
        fontFamily: FONT,
        fontSize: '44px',
        color: '#FFD23F',
        stroke: '#2B2B3A',
        strokeThickness: 10,
      })
      .setOrigin(0.5);
    this.tweens.add({
      targets: judul,
      y: 108,
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // tombol MAIN: bayangan keras + kotak putih bergaris tebal
    const tombolY = 215;
    this.add.rectangle(cx + 6, tombolY + 6, 260, 60, 0x2b2b3a);
    const tombol = this.add
      .rectangle(cx, tombolY, 260, 60, 0xffffff)
      .setStrokeStyle(4, 0x2b2b3a)
      .setInteractive({ useHandCursor: true });
    this.add
      .text(cx, tombolY, 'MAIN', { fontFamily: FONT, fontSize: '24px', color: '#2B2B3A' })
      .setOrigin(0.5);
    tombol.on('pointerover', () => tombol.setFillStyle(0xffd23f));
    tombol.on('pointerout', () => tombol.setFillStyle(0xffffff));
    tombol.on('pointerdown', () => this.mulai());

    // rekor
    this.add
      .text(cx, 282, `REKOR: ${String(bacaRekor()).padStart(5, '0')}`, {
        fontFamily: FONT,
        fontSize: '12px',
        color: '#2B2B3A',
      })
      .setOrigin(0.5);

    // petunjuk berkedip
    const petunjuk = this.add
      .text(cx, 312, 'TEKAN SPASI / ENTER', {
        fontFamily: FONT,
        fontSize: '10px',
        color: '#2B2B3A',
      })
      .setOrigin(0.5);
    this.tweens.add({ targets: petunjuk, alpha: 0.2, duration: 600, yoyo: true, repeat: -1 });

    // cara main, di atas tanah
    this.add
      .text(cx, height - 28, 'SPASI / TAP: LOMPAT', {
        fontFamily: FONT,
        fontSize: '10px',
        color: '#FFFFFF',
        stroke: '#2B2B3A',
        strokeThickness: 4,
      })
      .setOrigin(0.5);

    // kontrol keyboard
    this.input.keyboard!.on('keydown-SPACE', () => this.mulai());
    this.input.keyboard!.on('keydown-ENTER', () => this.mulai());
  }

  private mulai() {
    if (this.sudahMulai) return;
    this.sudahMulai = true;
    bunyiMulai(this);
    ambilMusik(this).mulai();
    this.cameras.main.fadeOut(250, 43, 43, 58);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('MainScene'));
  }

  update(_time: number, delta: number) {
    const geser = (130 * delta) / 1000;
    this.awan.tilePositionX += geser * 0.1;
    this.bukitJauh.tilePositionX += geser * 0.25;
    this.bukitDekat.tilePositionX += geser * 0.5;
    this.tanah.tilePositionX += geser;
  }
}