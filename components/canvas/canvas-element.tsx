"use client";

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RotateCcw, Lock, Unlock, Plus, X, Edit3 } from 'lucide-react';
import KanbanBoard from './kanban-board';

interface KanbanColumn {
  id: string;
  title: string;
  cards: KanbanCard[];
}

interface KanbanCard {
  id: string;
  title: string;
  description?: string;
  color?: string;
  priority?: 'low' | 'medium' | 'high';
  tags?: string[];
}

interface CanvasElementProps {
  id: string;
  type: 'rectangle' | 'circle' | 'text' | 'sticky' | 'frame' | 'line' | 'arrow' | 'pen' | 'kanban';
  x: number;
  y: number;
  width?: number;
  height?: number;
  content?: string;
  color?: string;
  strokeWidth?: number;
  points?: { x: number; y: number }[];
  rotation?: number;
  locked?: boolean;
  kanbanData?: {
    columns: KanbanColumn[];
  };
  onUpdate?: (id: string, updates: Partial<CanvasElementProps>) => void;
  onSelect?: (id: string) => void;
  isSelected?: boolean;
  zoom?: number;
}

export default function CanvasElement({
  id,
  type,
  x,
  y,
  width = 100,
  height = 100,
  content = '',
  color = '#6366f1',
  strokeWidth = 2,
  points = [],
  rotation = 0,
  locked = false,
  kanbanData,
  onUpdate,
  onSelect,
  isSelected = false,
  zoom = 100
}: CanvasElementProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isEditing, setIsEditing] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const elementRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (locked) return;
    e.stopPropagation();
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - x,
      y: e.clientY - y
    });
    onSelect?.(id);
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    if (locked) return;
    e.stopPropagation();
    if (type === 'text' || type === 'sticky') {
      setIsEditing(true);
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging && onUpdate && !locked) {
      onUpdate(id, {
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setIsResizing(false);
  };

  const handleContentChange = (newContent: string) => {
    onUpdate?.(id, { content: newContent });
  };

  const handleLockToggle = () => {
    onUpdate?.(id, { locked: !locked });
  };

  const handleKanbanUpdate = (newKanbanData: { columns: KanbanColumn[] }) => {
    onUpdate?.(id, { kanbanData: newKanbanData });
  };

  // Add event listeners when dragging
  useEffect(() => {
    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, isResizing, dragOffset]);

  const renderKanbanBoard = () => {
    if (!kanbanData) return null;

    return (
      <motion.div
        ref={elementRef}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        whileHover={{ scale: isSelected ? 1 : 1.005 }}
        className={`absolute bg-white rounded-2xl shadow-xl border-2 transition-all duration-300 overflow-hidden ${
          isSelected ? 'border-indigo-400 ring-4 ring-indigo-100' : 'border-slate-200 hover:border-slate-300'
        } ${locked ? 'opacity-75' : ''}`}
        style={{
          left: x,
          top: y,
          width,
          height,
          transform: `rotate(${rotation}deg)`
        }}
        onMouseDown={handleMouseDown}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Kanban Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-slate-100">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-sm font-bold">K</span>
            </div>
            <h3 className="font-semibold text-slate-900">Kanban Board</h3>
          </div>
          {!locked && (
            <div className="flex items-center space-x-2">
              <span className="text-xs text-slate-500 bg-slate-200 px-2 py-1 rounded-full">
                {kanbanData.columns.reduce((total, col) => total + col.cards.length, 0)} tasks
              </span>
            </div>
          )}
        </div>

        {/* Kanban Content */}
        <div className="h-full overflow-hidden">
          <KanbanBoard
            data={kanbanData}
            onUpdate={handleKanbanUpdate}
            locked={locked}
          />
        </div>

        {/* Resize Handles */}
        {isSelected && !locked && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 pointer-events-none"
          >
            <div className="absolute -top-2 -left-2 w-4 h-4 bg-indigo-500 rounded-full cursor-nw-resize shadow-lg pointer-events-auto"></div>
            <div className="absolute -top-2 -right-2 w-4 h-4 bg-indigo-500 rounded-full cursor-ne-resize shadow-lg pointer-events-auto"></div>
            <div className="absolute -bottom-2 -left-2 w-4 h-4 bg-indigo-500 rounded-full cursor-sw-resize shadow-lg pointer-events-auto"></div>
            <div className="absolute -bottom-2 -right-2 w-4 h-4 bg-indigo-500 rounded-full cursor-se-resize shadow-lg pointer-events-auto"></div>
          </motion.div>
        )}
      </motion.div>
    );
  };

  const renderElement = () => {
    const baseClasses = `absolute transition-all duration-300 ${
      isSelected ? 'ring-4 ring-indigo-200' : ''
    } ${locked ? 'opacity-75' : ''}`;

    const transform = `rotate(${rotation}deg)`;

    if (type === 'kanban') {
      return renderKanbanBoard();
    }

    switch (type) {
      case 'frame':
        return (
          <motion.div
            ref={elementRef}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            whileHover={{ scale: isSelected ? 1 : 1.02 }}
            className={`${baseClasses} border-2 border-dashed border-purple-400 bg-purple-50/30 rounded-xl cursor-move hover:border-purple-500 hover:bg-purple-50/50 shadow-lg`}
            style={{
              left: x,
              top: y,
              width,
              height,
              transform,
              borderColor: color
            }}
            onMouseDown={handleMouseDown}
            onDoubleClick={handleDoubleClick}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            <div className="absolute -top-8 left-0 text-sm text-purple-600 font-semibold bg-white px-3 py-1 rounded-lg shadow-sm border border-purple-200">
              Frame
            </div>
            {isSelected && !locked && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute inset-0"
              >
                <div className="absolute -top-2 -left-2 w-4 h-4 bg-indigo-500 rounded-full cursor-nw-resize shadow-lg"></div>
                <div className="absolute -top-2 -right-2 w-4 h-4 bg-indigo-500 rounded-full cursor-ne-resize shadow-lg"></div>
                <div className="absolute -bottom-2 -left-2 w-4 h-4 bg-indigo-500 rounded-full cursor-sw-resize shadow-lg"></div>
                <div className="absolute -bottom-2 -right-2 w-4 h-4 bg-indigo-500 rounded-full cursor-se-resize shadow-lg"></div>
              </motion.div>
            )}
          </motion.div>
        );

      case 'rectangle':
        return (
          <motion.div
            ref={elementRef}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            whileHover={{ scale: isSelected ? 1 : 1.02 }}
            className={`${baseClasses} border-2 rounded-xl cursor-move hover:shadow-xl transition-all duration-300`}
            style={{
              left: x,
              top: y,
              width,
              height,
              transform,
              backgroundColor: color + '20',
              borderColor: color,
              boxShadow: `0 4px 20px ${color}20`
            }}
            onMouseDown={handleMouseDown}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            {isSelected && !locked && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute inset-0"
              >
                <div className="absolute -top-2 -left-2 w-4 h-4 bg-indigo-500 rounded-full cursor-nw-resize shadow-lg"></div>
                <div className="absolute -top-2 -right-2 w-4 h-4 bg-indigo-500 rounded-full cursor-ne-resize shadow-lg"></div>
                <div className="absolute -bottom-2 -left-2 w-4 h-4 bg-indigo-500 rounded-full cursor-sw-resize shadow-lg"></div>
                <div className="absolute -bottom-2 -right-2 w-4 h-4 bg-indigo-500 rounded-full cursor-se-resize shadow-lg"></div>
              </motion.div>
            )}
          </motion.div>
        );

      case 'circle':
        return (
          <motion.div
            ref={elementRef}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            whileHover={{ scale: isSelected ? 1 : 1.02 }}
            className={`${baseClasses} border-2 rounded-full cursor-move hover:shadow-xl transition-all duration-300`}
            style={{
              left: x,
              top: y,
              width,
              height,
              transform,
              backgroundColor: color + '20',
              borderColor: color,
              boxShadow: `0 4px 20px ${color}20`
            }}
            onMouseDown={handleMouseDown}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            {isSelected && !locked && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute inset-0"
              >
                <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-4 h-4 bg-indigo-500 rounded-full cursor-n-resize shadow-lg"></div>
                <div className="absolute top-1/2 -right-2 transform -translate-y-1/2 w-4 h-4 bg-indigo-500 rounded-full cursor-e-resize shadow-lg"></div>
                <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-4 h-4 bg-indigo-500 rounded-full cursor-s-resize shadow-lg"></div>
                <div className="absolute top-1/2 -left-2 transform -translate-y-1/2 w-4 h-4 bg-indigo-500 rounded-full cursor-w-resize shadow-lg"></div>
              </motion.div>
            )}
          </motion.div>
        );

      case 'text':
        return (
          <motion.div
            ref={elementRef}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            whileHover={{ scale: isSelected ? 1 : 1.02 }}
            className={`${baseClasses} cursor-move min-w-[100px] min-h-[40px] ${
              isEditing ? 'border-2 border-indigo-400 bg-white shadow-lg' : 'border-2 border-transparent hover:border-slate-300 hover:bg-white/80 hover:shadow-md'
            } rounded-xl transition-all duration-300`}
            style={{
              left: x,
              top: y,
              width: width === 100 ? 'auto' : width,
              height: height === 100 ? 'auto' : height,
              transform
            }}
            onMouseDown={handleMouseDown}
            onDoubleClick={handleDoubleClick}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            {isEditing ? (
              <textarea
                className="w-full h-full outline-none resize-none bg-transparent text-slate-900 font-medium p-4 rounded-xl"
                value={content}
                onChange={(e) => handleContentChange(e.target.value)}
                onBlur={() => setIsEditing(false)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') setIsEditing(false);
                }}
                autoFocus
              />
            ) : (
              <div className="p-4 text-slate-900 font-medium whitespace-pre-wrap">
                {content || 'Double-click to edit'}
              </div>
            )}
          </motion.div>
        );

      case 'sticky':
        return (
          <motion.div
            ref={elementRef}
            initial={{ opacity: 0, scale: 0.9, rotate: -2 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            whileHover={{ scale: isSelected ? 1 : 1.02, rotate: 1 }}
            className={`${baseClasses} rounded-xl shadow-xl cursor-move hover:shadow-2xl transition-all duration-300`}
            style={{
              left: x,
              top: y,
              width,
              height,
              transform,
              backgroundColor: color || '#fbbf24',
              boxShadow: '0 8px 25px rgba(0,0,0,0.15)'
            }}
            onMouseDown={handleMouseDown}
            onDoubleClick={handleDoubleClick}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            {isEditing ? (
              <textarea
                className="w-full h-full p-4 outline-none resize-none bg-transparent text-slate-900 text-sm rounded-xl"
                value={content}
                onChange={(e) => handleContentChange(e.target.value)}
                onBlur={() => setIsEditing(false)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') setIsEditing(false);
                }}
                placeholder="Type your note..."
                autoFocus
              />
            ) : (
              <div 
                className="w-full h-full p-4 text-slate-900 text-sm whitespace-pre-wrap overflow-hidden cursor-text"
                onClick={() => !locked && setIsEditing(true)}
              >
                {content || 'Double-click to edit'}
              </div>
            )}
            {isSelected && !locked && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute inset-0"
              >
                <div className="absolute -top-2 -right-2 w-4 h-4 bg-indigo-500 rounded-full cursor-ne-resize shadow-lg"></div>
                <div className="absolute -bottom-2 -right-2 w-4 h-4 bg-indigo-500 rounded-full cursor-se-resize shadow-lg"></div>
              </motion.div>
            )}
          </motion.div>
        );

      case 'line':
        return (
          <motion.div
            ref={elementRef}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className={`${baseClasses} cursor-move`}
            style={{ left: x, top: y, transform }}
            onMouseDown={handleMouseDown}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            <svg width={width} height="8">
              <line
                x1="0"
                y1="4"
                x2={width}
                y2="4"
                stroke={color}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
              />
            </svg>
          </motion.div>
        );

      case 'arrow':
        return (
          <motion.div
            ref={elementRef}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className={`${baseClasses} cursor-move`}
            style={{ left: x, top: y, transform }}
            onMouseDown={handleMouseDown}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            <svg width={width} height="24">
              <defs>
                <marker
                  id={`arrowhead-${id}`}
                  markerWidth="12"
                  markerHeight="8"
                  refX="11"
                  refY="4"
                  orient="auto"
                >
                  <polygon
                    points="0 0, 12 4, 0 8"
                    fill={color}
                  />
                </marker>
              </defs>
              <line
                x1="0"
                y1="12"
                x2={width - 12}
                y2="12"
                stroke={color}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                markerEnd={`url(#arrowhead-${id})`}
              />
            </svg>
          </motion.div>
        );

      case 'pen':
        if (points.length < 2) return null;
        
        const minX = Math.min(...points.map(p => p.x));
        const minY = Math.min(...points.map(p => p.y));
        const maxX = Math.max(...points.map(p => p.x));
        const maxY = Math.max(...points.map(p => p.y));
        
        return (
          <motion.div
            ref={elementRef}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className={`${baseClasses} cursor-move`}
            style={{
              left: minX,
              top: minY,
              width: maxX - minX,
              height: maxY - minY,
              transform
            }}
            onMouseDown={handleMouseDown}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            <svg width={maxX - minX} height={maxY - minY}>
              <motion.path
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.5 }}
                d={`M ${points.map(p => `${p.x - minX},${p.y - minY}`).join(' L ')}`}
                stroke={color}
                strokeWidth={strokeWidth}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </motion.div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="relative">
      {renderElement()}
      
      {/* Element Controls */}
      <AnimatePresence>
        {(isSelected || isHovered) && type !== 'kanban' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="absolute -top-12 left-0 flex items-center space-x-2 bg-white rounded-xl shadow-lg border border-slate-200 px-3 py-2"
            style={{ left: x, top: y - 48 }}
          >
            <button
              onClick={handleLockToggle}
              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors"
              title={locked ? 'Unlock' : 'Lock'}
            >
              {locked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}