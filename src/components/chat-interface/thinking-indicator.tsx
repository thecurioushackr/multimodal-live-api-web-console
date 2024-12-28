"use client";

import { motion } from "framer-motion";

export function ThinkingIndicator() {
  return (
    <motion.div 
      className="absolute bottom-20 left-1/2 transform -translate-x-1/2"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-center gap-2 bg-content2 rounded-full px-4 py-2">
        <div className="flex gap-1">
          {[1, 2, 3].map((i) => (
            <motion.div
              key={i}
              className="w-2 h-2 bg-primary rounded-full"
              animate={{
                y: ["0%", "-50%", "0%"],
              }}
              transition={{
                duration: 0.8,
                repeat: Infinity,
                delay: i * 0.2,
              }}
            />
          ))}
        </div>
        <span className="text-sm text-default-500">Thinking...</span>
      </div>
    </motion.div>
  );
} 