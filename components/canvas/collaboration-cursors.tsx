"use client";

import { motion, AnimatePresence } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { CursorPosition } from '@/lib/realtime';

interface CollaborationCursorsProps {
  cursors: CursorPosition[];
  zoom: number;
}

const cursorColors = [
  '#3B82F6', // Blue
  '#8B5CF6', // Violet
  '#10B981', // Emerald
  '#F97316', // Orange
  '#EF4444', // Red
  '#EC4899', // Pink
  '#14B8A6', // Teal
  '#F59E0B', // Amber
];

export default function CollaborationCursors({ cursors, zoom }: CollaborationCursorsProps) {
  return (
    <div className="absolute inset-0 pointer-events-none z-50">
      <AnimatePresence>
        {cursors.map((cursor, index) => {
          const color = cursorColors[index % cursorColors.length];
          
          return (
            <motion.div
              key={cursor.user.id}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute"
              style={{
                left: cursor.x * (zoom / 100),
                top: cursor.y * (zoom / 100),
                transform: 'translate(-2px, -2px)',
              }}
            >
              {/* Cursor */}
              <motion.div
                animate={{
                  x: [0, 2, 0],
                  y: [0, 2, 0],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="relative"
              >
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  className="drop-shadow-lg"
                >
                  <path
                    d="M5.65376 12.3673H5.46026L5.31717 12.4976L0.500002 16.8829L0.500002 1.19841L11.7841 12.3673H5.65376Z"
                    fill={color}
                    stroke="white"
                    strokeWidth="1"
                  />
                </svg>
              </motion.div>

              {/* User info */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="absolute top-6 left-2 flex items-center space-x-2 bg-white/95 backdrop-blur-sm rounded-lg px-3 py-2 shadow-lg border border-slate-200"
                style={{ borderLeftColor: color, borderLeftWidth: '3px' }}
              >
                <Avatar className="w-6 h-6">
                  <AvatarImage src={cursor.user.avatar_url} alt={cursor.user.name} />
                  <AvatarFallback 
                    className="text-white text-xs font-medium"
                    style={{ backgroundColor: color }}
                  >
                    {cursor.user.name.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium text-slate-900">
                  {cursor.user.name}
                </span>
              </motion.div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}