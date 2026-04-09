import { useEffect, useState } from 'react';
import Particles, { initParticlesEngine } from '@tsparticles/react';
import { loadSlim } from '@tsparticles/slim';

export const ParticleBackground = () => {
  const [init, setInit] = useState(false);

  useEffect(() => {
    initParticlesEngine(async (engine) => {
      await loadSlim(engine);
    }).then(() => setInit(true));
  }, []);

  if (!init) return null;

  return (
    <Particles
      id="tsparticles"
      options={{
        fullScreen: { enable: true, zIndex: 0 },
        particles: {
          number: { value: 40, density: { enable: true } },
          color: { value: ['#10b981', '#f59e0b', '#8b5cf6', '#06b6d4'] },
          opacity: { value: { min: 0.05, max: 0.15 } },
          size: { value: { min: 1, max: 3 } },
          move: {
            enable: true,
            speed: 0.3,
            direction: 'none',
            random: true,
            outModes: { default: 'out' },
          },
          links: {
            enable: true,
            distance: 150,
            color: '#ffffff',
            opacity: 0.03,
            width: 1,
          },
        },
        detectRetina: true,
      }}
    />
  );
};
