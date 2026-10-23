import Phaser from "phaser";

const LANGKAH = 0.36; // detik per nada seperdelapan (sekitar 83 bpm)
const VOLUME_MUSIK = 0.95; // kecilkan kalau terlalu keras dibanding efek suara

const hz = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12);

type Akor = { bass: number; nada: number[] };
const _ = null;

// ===== TEMA SIANG: C mayor, hangat dan riang (8 birama x 8 langkah) =====
const AKOR_SIANG: Akor[] = [
  { bass: 36, nada: [60, 64, 67] }, // C
  { bass: 43, nada: [59, 62, 67] }, // G
  { bass: 45, nada: [57, 60, 64] }, // Am
  { bass: 41, nada: [57, 60, 65] }, // F
  { bass: 36, nada: [60, 64, 67] }, // C
  { bass: 40, nada: [59, 64, 67] }, // Em
  { bass: 41, nada: [57, 60, 65] }, // F
  { bass: 43, nada: [59, 62, 67] }, // G
];
const MELODI_SIANG: (number | null)[] = [
  76,
  _,
  79,
  _,
  76,
  74,
  72,
  _,
  74,
  _,
  76,
  _,
  74,
  72,
  67,
  _,
  72,
  _,
  76,
  _,
  81,
  _,
  79,
  _,
  72,
  _,
  69,
  _,
  72,
  74,
  72,
  _,
  76,
  _,
  79,
  _,
  81,
  79,
  76,
  _,
  79,
  _,
  76,
  _,
  74,
  _,
  72,
  _,
  69,
  _,
  72,
  _,
  74,
  72,
  69,
  _,
  74,
  _,
  72,
  _,
  74,
  _,
  _,
  _,
];

// ===== TEMA MALAM: A minor, tenang dan jarang nada =====
const AKOR_MALAM: Akor[] = [
  { bass: 45, nada: [57, 60, 64] }, // Am
  { bass: 41, nada: [57, 60, 65] }, // F
  { bass: 48, nada: [55, 60, 64] }, // C
  { bass: 43, nada: [55, 59, 62] }, // G
  { bass: 45, nada: [57, 60, 64] }, // Am
  { bass: 41, nada: [57, 60, 65] }, // F
  { bass: 48, nada: [55, 60, 64] }, // C
  { bass: 43, nada: [55, 59, 62] }, // G
];
const MELODI_MALAM: (number | null)[] = [
  76,
  _,
  _,
  _,
  _,
  _,
  72,
  _,
  69,
  _,
  _,
  _,
  72,
  _,
  _,
  _,
  74,
  _,
  _,
  _,
  76,
  _,
  _,
  _,
  79,
  _,
  _,
  74,
  _,
  _,
  _,
  _,
  76,
  _,
  _,
  _,
  72,
  _,
  69,
  _,
  72,
  _,
  _,
  _,
  69,
  _,
  _,
  _,
  67,
  _,
  _,
  _,
  72,
  _,
  76,
  _,
  74,
  _,
  _,
  _,
  _,
  _,
  _,
  _,
];

export class Musik {
  private ctx!: AudioContext;
  private keluar!: GainNode;
  private gainSiang!: GainNode;
  private gainMalam!: GainNode;
  private siap = false;
  private berjalan = false;
  private ditahan = false;
  private tingkat = 1;
  private levelSiang = 1;
  private levelMalam = 0;
  private terakhirMalam = 0;
  private langkah = 0;
  private waktuLangkah = 0;
  private gainHujan?: GainNode;
  private hujanTerakhir = 0;

  constructor(scene: Phaser.Scene) {
    const mgr = scene.sound as Phaser.Sound.WebAudioSoundManager;
    if (!mgr.context || !mgr.masterMuteNode) return; // tanpa WebAudio: musik dilewati

    const ctx = mgr.context;
    this.ctx = ctx;
    this.keluar = ctx.createGain();
    this.keluar.gain.value = VOLUME_MUSIK;
    this.keluar.connect(mgr.masterMuteNode); // lewat sini supaya tombol mute berfungsi

    // gema sederhana supaya terasa lapang
    const bus = ctx.createGain();
    const tunda = ctx.createDelay(1);
    const umpan = ctx.createGain();
    const saring = ctx.createBiquadFilter();
    const basah = ctx.createGain();
    tunda.delayTime.value = 0.32;
    umpan.gain.value = 0.35;
    saring.type = "lowpass";
    saring.frequency.value = 2200;
    basah.gain.value = 0.3;
    bus.connect(this.keluar);
    bus.connect(tunda);
    tunda.connect(saring);
    saring.connect(umpan);
    umpan.connect(tunda);
    saring.connect(basah);
    basah.connect(this.keluar);

    this.gainSiang = ctx.createGain();
    this.gainSiang.gain.value = 1;
    this.gainSiang.connect(bus);
    this.gainMalam = ctx.createGain();
    this.gainMalam.gain.value = 0;
    this.gainMalam.connect(bus);

    this.siap = true;
  }

  // mulai memutar (aman dipanggil berkali-kali)
  mulai() {
    if (!this.siap || this.berjalan) return;
    this.berjalan = true;
    this.ctx.resume().catch(() => {});
    this.waktuLangkah = this.ctx.currentTime + 0.1;
    window.setInterval(() => this.jadwalkan(), 100);
  }

  // 0 = musik siang penuh, 1 = musik malam penuh
  setMalam(f: number, langsung = false) {
    if (!this.siap) return;
    const m = Math.min(1, Math.max(0, f));
    if (!langsung && Math.abs(m - this.terakhirMalam) < 0.01) return;
    this.terakhirMalam = m;
    this.levelMalam = m;
    this.levelSiang = 1 - m;
    const t = this.ctx.currentTime;
    if (langsung) {
      this.gainSiang.gain.cancelScheduledValues(t);
      this.gainMalam.gain.cancelScheduledValues(t);
      this.gainSiang.gain.setValueAtTime(1 - m, t);
      this.gainMalam.gain.setValueAtTime(m, t);
    } else {
      this.gainSiang.gain.setTargetAtTime(1 - m, t, 0.4);
      this.gainMalam.gain.setTargetAtTime(m, t, 0.4);
    }
  }

  jeda(ya: boolean) {
    this.ditahan = ya;
    this.terapkanVolume();
  }

  // mengecil saat game over
  redam(ya: boolean) {
    this.tingkat = ya ? 0.3 : 1;
    this.terapkanVolume();
  }

  // suara hujan: derau yang disaring, volumenya mengikuti intensitas hujan (0 sampai 1)
  setHujan(level: number, langsung = false) {
    if (!this.siap) return;
    const l = Math.min(1, Math.max(0, level));
    if (!langsung && Math.abs(l - this.hujanTerakhir) < 0.02) return;
    if (!this.gainHujan) {
      if (l === 0) return;
      this.buatHujan();
    }
    this.hujanTerakhir = l;
    const t = this.ctx.currentTime;
    const g = this.gainHujan!.gain;
    if (langsung) {
      g.cancelScheduledValues(t);
      g.setValueAtTime(l * 0.2, t);
    } else {
      g.setTargetAtTime(l * 0.2, t, 0.5);
    }
  }

  private buatHujan() {
    const ctx = this.ctx;
    const panjang = ctx.sampleRate * 2;
    const penyangga = ctx.createBuffer(1, panjang, ctx.sampleRate);
    const data = penyangga.getChannelData(0);
    for (let i = 0; i < panjang; i++) data[i] = Math.random() * 2 - 1;

    const sumber = ctx.createBufferSource();
    sumber.buffer = penyangga;
    sumber.loop = true;
    const atas = ctx.createBiquadFilter();
    atas.type = "highpass";
    atas.frequency.value = 900;
    const bawah = ctx.createBiquadFilter();
    bawah.type = "lowpass";
    bawah.frequency.value = 5200;
    this.gainHujan = ctx.createGain();
    this.gainHujan.gain.value = 0;

    sumber.connect(atas);
    atas.connect(bawah);
    bawah.connect(this.gainHujan);
    this.gainHujan.connect(this.keluar);
    sumber.start();
  }

  // gemuruh petir: derau rendah yang meredup, dibunyikan setelah jeda (detik)
  gemuruh(tunda = 0.4) {
    if (!this.siap || this.ctx.state !== "running") return;
    const ctx = this.ctx;
    const t = ctx.currentTime + tunda;

    const panjang = Math.floor(ctx.sampleRate * 2);
    const penyangga = ctx.createBuffer(1, panjang, ctx.sampleRate);
    const data = penyangga.getChannelData(0);
    for (let i = 0; i < panjang; i++) data[i] = Math.random() * 2 - 1;

    const sumber = ctx.createBufferSource();
    sumber.buffer = penyangga;
    const saring = ctx.createBiquadFilter();
    saring.type = "lowpass";
    saring.frequency.setValueAtTime(500, t);
    saring.frequency.exponentialRampToValueAtTime(70, t + 1.8);
    const amp = ctx.createGain();
    amp.gain.setValueAtTime(0.0001, t);
    amp.gain.linearRampToValueAtTime(0.5, t + 0.08);
    amp.gain.exponentialRampToValueAtTime(0.0001, t + 1.9);

    sumber.connect(saring);
    saring.connect(amp);
    amp.connect(this.keluar);
    sumber.start(t);
    sumber.stop(t + 2);
  }

  private terapkanVolume() {
    if (!this.siap) return;
    const t = this.ctx.currentTime;
    const v = this.ditahan ? 0 : VOLUME_MUSIK * this.tingkat;
    this.keluar.gain.cancelScheduledValues(t);
    this.keluar.gain.setTargetAtTime(v, t, 0.12);
  }

  // menjadwalkan nada sedikit ke depan supaya iramanya rapi
  private jadwalkan() {
    const ctx = this.ctx;
    if (ctx.state !== "running" || this.ditahan) {
      this.waktuLangkah = ctx.currentTime + 0.1;
      return;
    }
    if (this.waktuLangkah < ctx.currentTime - 0.05) {
      this.waktuLangkah = ctx.currentTime + 0.05; // tertinggal (misalnya tab di-throttle): lewati
    }
    while (this.waktuLangkah < ctx.currentTime + 0.3) {
      const l = this.langkah;
      const bar = Math.floor(l / 8);
      const s = l % 8;
      if (this.levelSiang > 0.02)
        this.langkahSiang(bar, s, l, this.waktuLangkah);
      if (this.levelMalam > 0.02)
        this.langkahMalam(bar, s, l, this.waktuLangkah);
      this.waktuLangkah += LANGKAH;
      this.langkah = (l + 1) % 64;
    }
  }

  private langkahSiang(bar: number, s: number, l: number, t: number) {
    const akor = AKOR_SIANG[bar];
    const tujuan = this.gainSiang;
    // bass
    if (s === 0)
      this.suara({
        tipe: "sine",
        midi: akor.bass,
        t,
        dur: LANGKAH * 3.6,
        vol: 0.1,
        tujuan,
      });
    if (s === 4)
      this.suara({
        tipe: "sine",
        midi: akor.bass + 7,
        t,
        dur: LANGKAH * 3.2,
        vol: 0.06,
        tujuan,
      });
    // petikan arpeggio
    const pola = [-1, -1, 0, 1, 2, 1, 0, -1];
    const i = pola[s];
    if (i >= 0)
      this.suara({
        tipe: "triangle",
        midi: akor.nada[i],
        t,
        dur: 0.6,
        vol: 0.055,
        lowpass: 2400,
        tujuan,
      });
    // melodi "siulan"
    const m = MELODI_SIANG[l];
    if (m !== null)
      this.suara({
        tipe: "sine",
        midi: m,
        t,
        dur: LANGKAH * 2.4,
        vol: 0.08,
        atak: 0.03,
        vibrato: 4,
        tujuan,
      });
  }

  private langkahMalam(bar: number, s: number, l: number, t: number) {
    const akor = AKOR_MALAM[bar];
    const tujuan = this.gainMalam;
    // pad lembut sepanjang satu birama
    if (s === 0) {
      akor.nada.forEach((m) =>
        this.suara({
          tipe: "triangle",
          midi: m,
          t,
          dur: LANGKAH * 8,
          vol: 0.035,
          atak: 0.7,
          lepas: 1,
          lowpass: 1300,
          tujuan,
        }),
      );
      this.suara({
        tipe: "sine",
        midi: akor.bass,
        t,
        dur: LANGKAH * 8,
        vol: 0.08,
        atak: 0.25,
        lepas: 1,
        tujuan,
      });
    }
    // melodi kotak musik
    const m = MELODI_MALAM[l];
    if (m !== null) {
      this.suara({
        tipe: "sine",
        midi: m,
        t,
        dur: 1.9,
        vol: 0.08,
        atak: 0.004,
        tujuan,
      });
      this.suara({
        tipe: "sine",
        midi: m + 12,
        t,
        dur: 1.1,
        vol: 0.03,
        atak: 0.004,
        tujuan,
      });
    }
    // kerlip nada tinggi acak, seperti bintang
    if (s % 2 === 1 && Math.random() < 0.06) {
      const tinggi = [88, 91, 93, 96][Math.floor(Math.random() * 4)];
      this.suara({
        tipe: "sine",
        midi: tinggi,
        t,
        dur: 1.2,
        vol: 0.025,
        atak: 0.004,
        tujuan,
      });
    }
  }

  // satu nada: osilator + selubung volume (+ filter dan vibrato opsional)
  private suara(o: {
    tipe: OscillatorType;
    midi: number;
    t: number;
    dur: number;
    vol: number;
    tujuan: AudioNode;
    atak?: number;
    lepas?: number;
    lowpass?: number;
    vibrato?: number;
  }) {
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();
    osc.type = o.tipe;
    osc.frequency.value = hz(o.midi);

    const atak = o.atak ?? 0.01;
    amp.gain.setValueAtTime(0.0001, o.t);
    amp.gain.linearRampToValueAtTime(o.vol, o.t + atak);
    if (o.lepas) amp.gain.setValueAtTime(o.vol, o.t + o.dur - o.lepas);
    amp.gain.exponentialRampToValueAtTime(0.0001, o.t + o.dur);

    let sumber: AudioNode = osc;
    if (o.lowpass) {
      const f = ctx.createBiquadFilter();
      f.type = "lowpass";
      f.frequency.value = o.lowpass;
      osc.connect(f);
      sumber = f;
    }
    sumber.connect(amp);
    amp.connect(o.tujuan);

    if (o.vibrato) {
      const lfo = ctx.createOscillator();
      const kedalaman = ctx.createGain();
      lfo.frequency.value = 5;
      kedalaman.gain.value = o.vibrato; // dalam Hz
      lfo.connect(kedalaman);
      kedalaman.connect(osc.frequency);
      lfo.start(o.t);
      lfo.stop(o.t + o.dur + 0.1);
    }

    osc.start(o.t);
    osc.stop(o.t + o.dur + 0.1);
  }
}

// satu instance dipakai bersama semua scene, supaya musik tidak putus saat main lagi
let instans: Musik | null = null;
export function ambilMusik(scene: Phaser.Scene): Musik {
  if (!instans) instans = new Musik(scene);
  return instans;
}
