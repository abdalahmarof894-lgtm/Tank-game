// audio.js - نظام الصوت
class AudioSystem {
    constructor() {
        this.sounds = {};
        this.enabled = true;
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.initSounds();
        } catch (e) {
            console.log("Audio not supported:", e);
            this.enabled = false;
        }
    }
    
    initSounds() {
        this.createSound('shoot', 0.2, 523, 0.25, 'sawtooth');
        this.createSound('explosion', 0.8, 80, 0.3, 'sawtooth');
        this.createSound('hit', 0.1, 400, 0.2, 'square');
        this.createSound('powerup', 0.3, 1200, 0.15, 'sine');
    }
    
    createSound(name, volume, frequency, duration, type) {
        this.sounds[name] = { volume, frequency, duration, type };
    }
    
    play(soundName) {
        if (!this.enabled || !this.sounds[soundName]) return;
        
        try {
            const sound = this.sounds[soundName];
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.frequency.value = sound.frequency;
            oscillator.type = sound.type;
            
            gainNode.gain.setValueAtTime(sound.volume, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + sound.duration);
            
            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + sound.duration);
        } catch (e) {
            console.log("Error playing sound:", e);
        }
    }
}

// جعل النظام متاحاً عالمياً
window.AudioSystem = AudioSystem;
