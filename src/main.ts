import Phaser from 'phaser';
import './style.css';
import MenuScene from './scenes/MenuScene';
import MainScene from './scenes/MainScene';

document.fonts.load('20px "Press Start 2P"').then(() => {
  const TINGGI = 450;
  const LEBAR = Math.min(
    1000,
    Math.max(800, Math.round((TINGGI * window.innerWidth) / window.innerHeight)),
  );
  new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    width: LEBAR,
    height: TINGGI,
    pixelArt: true,
    backgroundColor: '#8ED6FF',
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    physics: {
      default: 'arcade',
      arcade: { gravity: { x: 0, y: 1300 }, debug: false },
    },
    scene: [MenuScene, MainScene],
  });
});