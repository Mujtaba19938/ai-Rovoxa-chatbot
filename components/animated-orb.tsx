"use client"

import React, { useRef, useMemo } from 'react'
import { Canvas, useFrame, extend } from '@react-three/fiber'
import { shaderMaterial } from '@react-three/drei'
import * as THREE from 'three'

// Define the shader material
const OrbMaterial = shaderMaterial(
  {
    time: 0,
    color1: new THREE.Color('#87CEEB'), // Sky Blue
    color2: new THREE.Color('#FFFFFF'), // White
    color3: new THREE.Color('#A8A2D2'), // Soft Indigo
    intensity: 1.0,
    isMini: 0.0 // Use float instead of string for variant
  },
  // Vertex shader
  `
    varying vec2 vUv;
    varying vec3 vPosition;
    varying vec3 vNormal;
    
    void main() {
      vUv = uv;
      vPosition = position;
      vNormal = normal;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  // Fragment shader
  `
    uniform float time;
    uniform vec3 color1;
    uniform vec3 color2;
    uniform vec3 color3;
    uniform float intensity;
    uniform float isMini;
    
    varying vec2 vUv;
    varying vec3 vPosition;
    varying vec3 vNormal;
    
    // Noise function for organic movement
    float noise(vec3 p) {
      return sin(p.x) * sin(p.y) * sin(p.z);
    }
    
    // Smooth interpolation
    float smoothstep3(float edge0, float edge1, float x) {
      float t = clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
      return t * t * (3.0 - 2.0 * t);
    }
    
    void main() {
      vec3 pos = vPosition;
      
      // Create flowing patterns
      float flow1 = sin(pos.x * 2.0 + time * 0.5) * 0.5 + 0.5;
      float flow2 = sin(pos.y * 1.5 + time * 0.3) * 0.5 + 0.5;
      float flow3 = sin(pos.z * 2.5 + time * 0.7) * 0.5 + 0.5;
      
      // Combine flows for organic movement
      float combinedFlow = (flow1 + flow2 + flow3) / 3.0;
      
      // Create color gradients based on position and flow
      vec3 color = mix(color1, color2, combinedFlow);
      color = mix(color, color3, flow2);
      
      // Add subtle noise for texture
      float noiseValue = noise(pos * 3.0 + time * 0.2) * 0.1;
      color += noiseValue;
      
      // Create rim lighting effect
      float rim = 1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0)));
      rim = pow(rim, 2.0);
      color += rim * 0.3;
      
      // Add glow effect
      float glow = smoothstep3(0.3, 0.8, combinedFlow);
      color += glow * 0.2;
      
      // Adjust intensity based on variant
      float finalIntensity = intensity;
      if (isMini > 0.5) {
        finalIntensity *= 0.6;
      }
      
      gl_FragColor = vec4(color * finalIntensity, 1.0);
    }
  `
)

// Extend the material to make it available in JSX
extend({ OrbMaterial })

// Extend the material type
declare global {
  namespace JSX {
    interface IntrinsicElements {
      orbMaterial: any
    }
  }
}

interface OrbProps {
  orbSize?: number
  animationState?: 'idle' | 'thinking' | 'speaking' | 'error'
  colors?: [string, string, string]
  isInteractive?: boolean
  variant?: 'full' | 'mini'
}

const Orb: React.FC<OrbProps> = ({ 
  orbSize = 1, 
  animationState = 'idle', 
  colors = ['#87CEEB', '#FFFFFF', '#A8A2D2'],
  isInteractive = false,
  variant = 'full'
}) => {
  const meshRef = useRef<THREE.Mesh>(null)
  const materialRef = useRef<any>(null)
  
  // Animation parameters based on state
  const animationParams = useMemo(() => {
    switch (animationState) {
      case 'thinking':
        return { speed: 2.0, intensity: 1.2, pulse: true }
      case 'speaking':
        return { speed: 3.0, intensity: 1.5, pulse: true }
      case 'error':
        return { speed: 0.5, intensity: 0.8, pulse: false }
      default: // idle
        return { speed: 1.0, intensity: 1.0, pulse: false }
    }
  }, [animationState])
  
  useFrame((state) => {
    if (meshRef.current && materialRef.current) {
      const time = state.clock.getElapsedTime()
      
      // Rotate the orb
      meshRef.current.rotation.x = time * animationParams.speed * 0.1
      meshRef.current.rotation.y = time * animationParams.speed * 0.15
      
      // Update shader uniforms
      materialRef.current.time = time
      materialRef.current.intensity = animationParams.intensity
      materialRef.current.isMini = variant === 'mini' ? 1.0 : 0.0
      
      // Add pulsing effect for thinking/speaking states
      if (animationParams.pulse) {
        const pulse = Math.sin(time * 3.0) * 0.1 + 1.0
        meshRef.current.scale.setScalar(pulse)
      } else {
        meshRef.current.scale.setScalar(1.0)
      }
    }
  })
  
  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[orbSize, 64, 64]} />
      <orbMaterial
        ref={materialRef}
        color1={new THREE.Color(colors[0])}
        color2={new THREE.Color(colors[1])}
        color3={new THREE.Color(colors[2])}
        transparent={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}

const AnimatedOrb: React.FC<OrbProps> = React.memo((props) => {
  return (
    <div className="w-full h-full">
      <Canvas
        camera={{ position: [0, 0, 5], fov: 50 }}
        style={{ background: 'transparent' }}
        gl={{ alpha: true, antialias: true }}
      >
        <ambientLight intensity={0.2} />
        <pointLight position={[10, 10, 10]} intensity={0.5} />
        <Orb {...props} />
      </Canvas>
    </div>
  )
})

AnimatedOrb.displayName = 'AnimatedOrb'

export default AnimatedOrb