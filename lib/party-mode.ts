import confetti from 'canvas-confetti';
import { toast } from 'sonner';

export const playPartySound = () => {
  // Simple "Ta-da" or party horn sound effect using Audio API with a base64 placeholder or public URL.
  // Using a short, pleasant notification sound.
  const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2013/2013-preview.mp3'); // Example: Success bell
  // Or a more "party" sound:
  // const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3'); // Party horn
  
  // Let's use a party horn sound
  const partyAudio = new Audio('https://cdn.pixabay.com/download/audio/2021/08/04/audio_12b0c7443c.mp3?filename=party-horn-68443.mp3'); 
  partyAudio.volume = 0.5;
  partyAudio.play().catch(e => console.error('Audio play failed', e));
};

export const triggerConfetti = () => {
  const duration = 3000;
  const animationEnd = Date.now() + duration;
  const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

  const randomInRange = (min: number, max: number) => {
    return Math.random() * (max - min) + min;
  };

  const interval: any = setInterval(function() {
    const timeLeft = animationEnd - Date.now();

    if (timeLeft <= 0) {
      return clearInterval(interval);
    }

    const particleCount = 50 * (timeLeft / duration);
    
    // since particles fall down, start a bit higher than random
    confetti({
      ...defaults,
      particleCount,
      origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
    });
    confetti({
      ...defaults,
      particleCount,
      origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
    });
  }, 250);
};

export const showPartyNotification = (message: string) => {
  playPartySound();
  triggerConfetti();
  toast.success(message, {
    duration: 5000,
    style: {
      background: '#10B981', // Emerald 500
      color: 'white',
      border: 'none',
      fontSize: '1.1rem',
      fontWeight: 'bold',
    },
    icon: '🎉',
  });
};
