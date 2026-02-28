"use client";

import { useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars, Environment, Float } from '@react-three/drei';
import ThreeGraph from '@/components/ThreeGraph';
import { useInterestStore } from '@/store/useInterestStore';
import { Search, Compass, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Home() {
  const [input, setInput] = useState("");
  const { addNode, nodes } = useInterestStore();

  const [isGenerating, setIsGenerating] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isGenerating) return;

    const label = input.trim();
    setInput("");

    // Create the root node first
    const newNode = addNode(label);

    // Automatically trigger expansion
    try {
      setIsGenerating(true);
      // Import dynamic function here or at the top of the file
      const { generateSubInterests } = await import('@/app/actions');
      const sub = await generateSubInterests(label);
      useInterestStore.getState().addNodes(sub, newNode.id);
    } catch (err) {
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <main className="relative w-full h-screen bg-black overflow-hidden text-neutral-100 font-sans selection:bg-white/20">
      <div className="absolute inset-0 z-0">
        <Canvas camera={{ position: [0, 0, 15], fov: 60 }}>
          <color attach="background" args={['#050505']} />
          <ambientLight intensity={0.5} />
          <pointLight position={[10, 10, 10]} intensity={1} />

          <Float speed={1} rotationIntensity={0.2} floatIntensity={0.2}>
            <ThreeGraph />
          </Float>

          <OrbitControls
            enablePan={false}
            enableZoom={true}
            minDistance={2}
            maxDistance={50}
            autoRotate
            autoRotateSpeed={0.5}
          />
          <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
          <Environment preset="city" />
        </Canvas>
      </div>

      <div className="absolute top-0 w-full p-6 z-10 pointer-events-none">
        <div className="max-w-4xl mx-auto flex items-center justify-between pointer-events-auto">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-black">
              <Compass size={18} />
            </div>
            <h1 className="text-xl font-medium tracking-tight">Intelligence Space</h1>
          </div>
        </div>
      </div>

      <div className="absolute bottom-12 w-full z-10 pointer-events-none flex justify-center px-4">
        <div className="pointer-events-auto w-full max-w-lg">
          <form
            onSubmit={handleSubmit}
            className="relative flex items-center"
          >
            <div className="absolute inset-0 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl -z-10" />

            <Search className="absolute left-4 text-white/50" size={20} />

            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isGenerating}
              placeholder="Enter an interest (e.g. Quantum Physics, Minimalist Art)..."
              className="w-full bg-transparent border-none py-4 pl-12 pr-12 text-white placeholder:text-white/40 focus:outline-none focus:ring-0 text-lg rounded-2xl disabled:opacity-50"
            />

            <button
              type="submit"
              disabled={!input.trim() || isGenerating}
              className="absolute right-3 p-2 bg-white/10 hover:bg-white/20 disabled:opacity-50 disabled:hover:bg-white/10 rounded-xl transition-colors duration-200 backdrop-blur-md border border-white/10 flex items-center justify-center"
            >
              {isGenerating ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Sparkles size={18} className="text-white" />
              )}
            </button>
          </form>

          <AnimatePresence>
            {nodes.length === 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute -top-12 left-0 w-full text-center text-white/60 text-sm font-medium tracking-wide"
              >
                Start typing to generate an intelligence map
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </main>
  );
}
