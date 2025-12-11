import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { GestureState, ParticlePoint } from '../types';
import { 
  PARTICLE_COUNT, 
  SATURN_RADIUS, 
  RING_INNER_RADIUS, 
  RING_OUTER_RADIUS, 
  EXPANSION_SCALE 
} from '../constants';

interface SaturnSceneProps {
  gestureState: GestureState;
  isExpanded: boolean;
}

const SaturnScene: React.FC<SaturnSceneProps> = ({ gestureState, isExpanded }) => {
  const pointsRef = useRef<THREE.Points>(null);
  
  // Initialize particles
  const particles = useMemo(() => {
    const temp: ParticlePoint[] = [];
    
    // Create Planet Sphere
    const sphereCount = Math.floor(PARTICLE_COUNT * 0.4);
    for (let i = 0; i < sphereCount; i++) {
      const phi = Math.acos(-1 + (2 * i) / sphereCount);
      const theta = Math.sqrt(sphereCount * Math.PI) * phi;
      
      const x = SATURN_RADIUS * Math.cos(theta) * Math.sin(phi);
      const y = SATURN_RADIUS * Math.sin(theta) * Math.sin(phi);
      const z = SATURN_RADIUS * Math.cos(phi);
      
      // Flatten slighty for oblate spheroid
      const flattenedY = y * 0.9;

      temp.push({
        x: x,
        y: flattenedY,
        z: z,
        initialX: x,
        initialY: flattenedY,
        initialZ: z,
        randomX: (Math.random() - 0.5) * EXPANSION_SCALE * 2,
        randomY: (Math.random() - 0.5) * EXPANSION_SCALE * 2,
        randomZ: (Math.random() - 0.5) * EXPANSION_SCALE * 2,
        color: i % 2 === 0 ? '#C5A984' : '#EAD6B8', // Beige/Sand tones
        size: Math.random() * 0.3 + 0.1
      });
    }

    // Create Rings
    const ringCount = PARTICLE_COUNT - sphereCount;
    for (let i = 0; i < ringCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      // Distribute particles in ring bands
      const distance = Math.sqrt(Math.random()) * (RING_OUTER_RADIUS - RING_INNER_RADIUS) + RING_INNER_RADIUS;
      
      const x = Math.cos(angle) * distance;
      const z = Math.sin(angle) * distance;
      const y = (Math.random() - 0.5) * 0.5; // Thin ring height

      temp.push({
        x: x,
        y: y,
        z: z,
        initialX: x,
        initialY: y,
        initialZ: z,
        randomX: (Math.random() - 0.5) * EXPANSION_SCALE * 3,
        randomY: (Math.random() - 0.5) * EXPANSION_SCALE * 3,
        randomZ: (Math.random() - 0.5) * EXPANSION_SCALE * 3,
        color: Math.random() > 0.5 ? '#A89F91' : '#8B7355', // Darker ring dust
        size: Math.random() * 0.2 + 0.05
      });
    }
    return temp;
  }, []);

  // BufferAttributes for Three.js
  const positions = useMemo(() => new Float32Array(PARTICLE_COUNT * 3), []);
  const colors = useMemo(() => new Float32Array(PARTICLE_COUNT * 3), []);
  const sizes = useMemo(() => new Float32Array(PARTICLE_COUNT), []);

  // Pre-fill colors and sizes (static)
  useMemo(() => {
    const colorObj = new THREE.Color();
    particles.forEach((p, i) => {
      colorObj.set(p.color);
      colors[i * 3] = colorObj.r;
      colors[i * 3 + 1] = colorObj.g;
      colors[i * 3 + 2] = colorObj.b;
      sizes[i] = p.size;
    });
  }, [particles, colors, sizes]);

  useFrame((state) => {
    if (!pointsRef.current) return;
    
    const time = state.clock.getElapsedTime();
    const positionsArray = pointsRef.current.geometry.attributes.position.array as Float32Array;

    // Animation Logic
    // Target logic: If expanded, move towards random. If closed, move towards initial.
    // We add a "breath" effect or rotation in both states.

    const expansionFactor = isExpanded ? 1 : 0;
    
    // Smooth lerp for state transition (using a ref approach would be cleaner for complex state, but direct array manip is fast)
    // To keep it performant in React, we calculate the target position per frame based on the 'isExpanded' prop passed down.
    
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const p = particles[i];
      const i3 = i * 3;

      let targetX, targetY, targetZ;

      if (isExpanded) {
        // Dispersed state: Move towards random coordinates, add some wave motion
        targetX = p.initialX + p.randomX + Math.sin(time + i) * 2;
        targetY = p.initialY + p.randomY + Math.cos(time + i) * 2;
        targetZ = p.initialZ + p.randomZ + Math.sin(time * 0.5 + i) * 2;
      } else {
        // Contracted state: Saturn shape
        // Add rotation to the rings and planet
        const rotationSpeed = 0.2;
        const cosRot = Math.cos(time * rotationSpeed);
        const sinRot = Math.sin(time * rotationSpeed);
        
        // Simple Y-axis rotation
        targetX = p.initialX * cosRot - p.initialZ * sinRot;
        targetY = p.initialY; // Keep Y stable relative to rotation
        targetZ = p.initialX * sinRot + p.initialZ * cosRot;

        // Add subtle hover/noise
        targetY += Math.sin(time * 2 + p.initialX) * 0.1;
      }

      // Linear Interpolation for smoothness
      // We read current pos and lerp to target
      const currentX = positionsArray[i3];
      const currentY = positionsArray[i3 + 1];
      const currentZ = positionsArray[i3 + 2];

      // Lerp factor determines speed of transition. 
      // 0.05 is standard smooth, 0.02 is slow/floaty.
      const lerpSpeed = isExpanded ? 0.03 : 0.05;

      positionsArray[i3] = currentX + (targetX - currentX) * lerpSpeed;
      positionsArray[i3 + 1] = currentY + (targetY - currentY) * lerpSpeed;
      positionsArray[i3 + 2] = currentZ + (targetZ - currentZ) * lerpSpeed;
    }

    pointsRef.current.geometry.attributes.position.needsUpdate = true;
    
    // Slow rotation of the entire system container
    if (pointsRef.current) {
      pointsRef.current.rotation.z = Math.PI / 6; // Tilt Saturn
      pointsRef.current.rotation.x = Math.PI / 12; 
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={PARTICLE_COUNT}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={PARTICLE_COUNT}
          array={colors}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-size"
          count={PARTICLE_COUNT}
          array={sizes}
          itemSize={1}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.15} // Fallback size
        vertexColors
        transparent
        opacity={0.8}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
};

export default SaturnScene;