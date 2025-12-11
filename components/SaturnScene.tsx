import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { GestureState } from '../types';
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

const vertexShader = `
  uniform float uTime;
  uniform float uExpansion;
  
  attribute vec3 aRandomPosition;
  attribute float aSize;
  attribute vec3 aColor;
  
  varying vec3 vColor;
  varying float vAlpha;

  // Simple pseudo-random function
  float random(vec2 st) {
      return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
  }

  void main() {
    vColor = aColor;
    
    // Original position (Saturn) vs Target position (Nebula)
    vec3 saturnPos = position;
    vec3 nebulaPos = aRandomPosition;

    // Add some organic movement to the Nebula state
    // We use sin/cos based on time and position to create a "floating" effect
    if (uExpansion > 0.01) {
       float noiseFreq = 0.5;
       float noiseAmp = 2.0;
       nebulaPos.x += sin(uTime * 0.5 + aRandomPosition.y * noiseFreq) * noiseAmp;
       nebulaPos.y += cos(uTime * 0.3 + aRandomPosition.x * noiseFreq) * noiseAmp;
       nebulaPos.z += sin(uTime * 0.4 + aRandomPosition.z * noiseFreq) * noiseAmp;
    }

    // Rotation logic for the Saturn state (Simulated here or in JS container)
    // We'll keep the Saturn particles relatively stable but add a subtle breathing effect
    if (uExpansion < 0.99) {
        saturnPos.y += sin(uTime * 2.0 + position.x) * 0.1;
    }

    // Interpolate positions
    // Smoothstep creates a nicer transition curve
    float t = smoothstep(0.0, 1.0, uExpansion);
    vec3 finalPos = mix(saturnPos, nebulaPos, t);

    vec4 mvPosition = modelViewMatrix * vec4(finalPos, 1.0);
    
    // Size attenuation: particles are smaller when further away
    gl_PointSize = aSize * (300.0 / -mvPosition.z);
    
    // Fade out slightly when expanding to look more ethereal
    vAlpha = 1.0 - (t * 0.3);

    gl_Position = projectionMatrix * mvPosition;
  }
`;

const fragmentShader = `
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    // Create a circular particle with soft edges
    vec2 xy = gl_PointCoord.xy - vec2(0.5);
    float r = length(xy);
    
    if (r > 0.5) discard;

    // Soft glow gradient
    float glow = 1.0 - (r * 2.0);
    glow = pow(glow, 2.0); // Sharpen the core

    gl_FragColor = vec4(vColor, glow * vAlpha);
  }
`;

const SaturnScene: React.FC<SaturnSceneProps> = ({ isExpanded }) => {
  const pointsRef = useRef<THREE.Points>(null);
  
  // Uniforms reference to update in loop
  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uExpansion: { value: 0 }
  }), []);

  // Generate particle data
  const { positions, randomPositions, colors, sizes } = useMemo(() => {
    const pos = new Float32Array(PARTICLE_COUNT * 3);
    const randPos = new Float32Array(PARTICLE_COUNT * 3);
    const cols = new Float32Array(PARTICLE_COUNT * 3);
    const siz = new Float32Array(PARTICLE_COUNT);

    const colorSaturn1 = new THREE.Color('#EAD6B8'); // Sand
    const colorSaturn2 = new THREE.Color('#C5A984'); // Darker Sand
    const colorRing1 = new THREE.Color('#A89F91');   // Grey/Brown
    const colorRing2 = new THREE.Color('#D3C1A5');   // Light Ring

    let idx = 0;

    // 1. Planet Sphere
    const sphereCount = Math.floor(PARTICLE_COUNT * 0.35);
    for (let i = 0; i < sphereCount; i++) {
      const phi = Math.acos(-1 + (2 * i) / sphereCount);
      const theta = Math.sqrt(sphereCount * Math.PI) * phi;
      
      const r = SATURN_RADIUS;
      // Oblate spheroid
      const x = r * Math.cos(theta) * Math.sin(phi);
      const y = (r * Math.sin(theta) * Math.sin(phi)) * 0.9; 
      const z = r * Math.cos(phi);

      pos[idx] = x;
      pos[idx+1] = y;
      pos[idx+2] = z;

      // Random target
      randPos[idx] = (Math.random() - 0.5) * EXPANSION_SCALE * 2.5;
      randPos[idx+1] = (Math.random() - 0.5) * EXPANSION_SCALE * 2.5;
      randPos[idx+2] = (Math.random() - 0.5) * EXPANSION_SCALE * 2.5;

      const c = i % 2 === 0 ? colorSaturn1 : colorSaturn2;
      cols[idx] = c.r;
      cols[idx+1] = c.g;
      cols[idx+2] = c.b;

      siz[i] = Math.random() * 0.4 + 0.2;
      idx += 3;
    }

    // 2. Rings
    const ringCount = PARTICLE_COUNT - sphereCount;
    for (let i = 0; i < ringCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      // Biased distribution for bands
      const t = Math.random();
      const r = Math.sqrt(t) * (RING_OUTER_RADIUS - RING_INNER_RADIUS) + RING_INNER_RADIUS;

      const x = Math.cos(angle) * r;
      const z = Math.sin(angle) * r;
      const y = (Math.random() - 0.5) * 0.4; // Very thin rings

      pos[idx] = x;
      pos[idx+1] = y;
      pos[idx+2] = z;

      randPos[idx] = (Math.random() - 0.5) * EXPANSION_SCALE * 4;
      randPos[idx+1] = (Math.random() - 0.5) * EXPANSION_SCALE * 4;
      randPos[idx+2] = (Math.random() - 0.5) * EXPANSION_SCALE * 4;

      const c = Math.random() > 0.4 ? colorRing1 : colorRing2;
      cols[idx] = c.r;
      cols[idx+1] = c.g;
      cols[idx+2] = c.b;

      siz[sphereCount + i] = Math.random() * 0.25 + 0.1;
      idx += 3;
    }

    return { positions: pos, randomPositions: randPos, colors: cols, sizes: siz };
  }, []);

  useFrame((state) => {
    // Update Uniforms
    uniforms.uTime.value = state.clock.elapsedTime;
    
    // Lerp expansion value for smooth transition
    // 0 = Closed, 1 = Open
    const target = isExpanded ? 1.0 : 0.0;
    // Simple lerp: current + (target - current) * speed
    uniforms.uExpansion.value += (target - uniforms.uExpansion.value) * 0.04;

    // Rotate the entire group for the "Saturn Tilt" and orbital spin
    if (pointsRef.current) {
        // Constant tilt
        pointsRef.current.rotation.z = Math.PI / 6; 
        pointsRef.current.rotation.x = Math.PI / 12;
        
        // Spin on Y axis (which is local Y, so it spins around the tilted pole)
        // We only spin when compact to simulate planet rotation. 
        // When expanded, the shader handles the "float".
        if (!isExpanded) {
            pointsRef.current.rotation.y += 0.001; 
        }
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
          attach="attributes-aRandomPosition"
          count={PARTICLE_COUNT}
          array={randomPositions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-aColor"
          count={PARTICLE_COUNT}
          array={colors}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-aSize"
          count={PARTICLE_COUNT}
          array={sizes}
          itemSize={1}
        />
      </bufferGeometry>
      <shaderMaterial
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent={true}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
};

export default SaturnScene;