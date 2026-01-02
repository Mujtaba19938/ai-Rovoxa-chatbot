"use client"

import React, { useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface SimpleOrbProps {
  orbSize?: number
  animationState?: 'idle' | 'thinking' | 'speaking' | 'error'
  colors?: [string, string, string]
  variant?: 'full' | 'mini'
}

const SimpleOrb: React.FC<SimpleOrbProps> = ({ 
  orbSize = 1, 
  animationState = 'idle', 
  colors = ['#87CEEB', '#FFFFFF', '#A8A2D2'],
  variant = 'full'
}) => {
  const meshRef = useRef<THREE.Mesh>(null)
  
  useFrame((state) => {
    if (meshRef.current) {
      const time = state.clock.getElapsedTime()
      
      // Rotate the orb
      meshRef.current.rotation.x = time * 0.1
      meshRef.current.rotation.y = time * 0.15
      
      // Add pulsing effect for thinking/speaking states
      if (animationState === 'thinking' || animationState === 'speaking') {
        const pulse = Math.sin(time * 3.0) * 0.1 + 1.0
        meshRef.current.scale.setScalar(pulse)
      } else {
        meshRef.current.scale.setScalar(1.0)
      }
    }
  })
  
  // Create gradient material
  const material = new THREE.MeshStandardMaterial({
    color: colors[1], // Use white as base
    emissive: colors[0], // Sky blue emission
    emissiveIntensity: variant === 'mini' ? 0.3 : 0.5,
    roughness: 0.1,
    metalness: 0.1,
  })
  
  return (
    <mesh ref={meshRef} material={material}>
      <sphereGeometry args={[orbSize, 32, 32]} />
    </mesh>
  )
}

const SimpleAnimatedOrb: React.FC<SimpleOrbProps> = React.memo((props) => {
  return (
    <div className="w-full h-full">
      <Canvas
        camera={{ position: [0, 0, 5], fov: 50 }}
        style={{ background: 'transparent' }}
        gl={{ alpha: true, antialias: true }}
      >
        <ambientLight intensity={0.4} />
        <pointLight position={[10, 10, 10]} intensity={0.6} />
        <pointLight position={[-10, -10, -10]} intensity={0.3} />
        <SimpleOrb {...props} />
      </Canvas>
    </div>
  )
})

SimpleAnimatedOrb.displayName = 'SimpleAnimatedOrb'

export default SimpleAnimatedOrb
