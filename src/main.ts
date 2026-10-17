import Phaser from 'phaser';
import './style.css';
import MainScene from './scenes/MainScene';

document.fonts.load('20px "Press Start 2P"').then(() => {
  new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    width: 800,
    height: 450,
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
    scene: [MainScene],
  });
});