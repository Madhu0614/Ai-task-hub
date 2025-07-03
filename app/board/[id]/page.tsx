"use client";

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, Users, Share2, MoreHorizontal, ZoomIn, ZoomOut, MousePointer, Square,
  Circle, Type, Pen, Minus, MessageSquare, StickyNote, Upload, Undo, Redo, Play,
  MessageCircle, Monitor, Crown, Hand, Triangle, ArrowRight, Image as ImageIcon,
  Grid3x3, Sparkles, Move, RotateCcw, Trash2, Copy, Lock, Columns
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { getCurrentUser, User } from '@/lib/auth';
import { Board, boardStorage } from '@/lib/boards';
import GridCanvas from '@/components/canvas/grid-canvas';
import CanvasElement from '@/components/canvas/canvas-element';

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
}

interface CanvasElementData {
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
}

const elementDefaults = {
  rectangle: { width: 120, height: 80, color: '#3B82F6' },
  circle: { width: 100, height: 100, color: '#10B981' },
  frame: { width: 200, height: 150, color: '#8B5CF6' },
  text: { content: 'Type here...', color: '#1f2937' },
  sticky: { width: 120, height: 120, color: '#F97316', content: '' },
  line: { width: 100, height: 2, color: '#64748B' },
  arrow: { width: 100, height: 2, color: '#64748B' },
  kanban: { 
    width: 600, 
    height: 400, 
    kanbanData: {
      columns: [
        {
          id: 'todo',
          title: 'To Do',
          cards: [
            { id: '1', title: 'Task 1', description: 'Description for task 1', color: '#EF4444' },
            { id: '2', title: 'Task 2', description: 'Description for task 2', color: '#F97316' }
          ]
        },
        {
          id: 'inprogress',
          title: 'In Progress',
          cards: [
            { id: '3', title: 'Task 3', description: 'Description for task 3', color: '#3B82F6' }
          ]
        },
        {
          id: 'done',
          title: 'Done',
          cards: [
            { id: '4', title: 'Task 4', description: 'Description for task 4', color: '#10B981' }
          ]
        }
      ]
    }
  }
} as const;

export default function BoardPage() {
  const router = useRouter();
  const params = useParams();
  const boardId = params.id as string;

  const [user, setUser] = useState<User | null>(null);
  const [board, setBoard] = useState<Board | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTool, setSelectedTool] = useState('select');
  const [zoomLevel, setZoomLevel] = useState(100);
  const [elements, setElements] = useState<CanvasElementData[]>([]);
  const [selectedElements, setSelectedElements] = useState<string[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [renderPath, setRenderPath] = useState<{ x: number; y: number }[]>([]);
  const currentPathRef = useRef<{ x: number; y: number }[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number } | null>(null);
  const [history, setHistory] = useState<CanvasElementData[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPos, setContextMenuPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      router.push('/login');
      return;
    }
    setUser(currentUser);

    const boards = boardStorage.getBoards();
    const foundBoard = boards.find(b => b.id === boardId);

    if (!foundBoard) {
      router.push('/dashboard');
      return;
    }
    setBoard(foundBoard);
    setLoading(false);
  }, [router, boardId]);

  const saveToHistory = useCallback((newElements: CanvasElementData[]) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push([...newElements]);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [history, historyIndex]);

const handleCanvasClick = useCallback((e: React.MouseEvent) => {
  if (selectedTool === 'select' || selectedTool === 'hand') return;

  const rect = e.currentTarget.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  const defaults = elementDefaults[selectedTool as keyof typeof elementDefaults] || {};

  let newElement: CanvasElementData;

  if (selectedTool === 'kanban') {
    const kanbanDefaults = elementDefaults.kanban;

    newElement = {
      id: crypto.randomUUID(),
      type: 'kanban',
      x: x - (kanbanDefaults.width / 2),
      y: y - (kanbanDefaults.height / 2),
      width: kanbanDefaults.width,
      height: kanbanDefaults.height,
      rotation: 0,
      locked: false,
      kanbanData: {
        columns: kanbanDefaults.kanbanData.columns.map(col => ({
          ...col,
          cards: col.cards.map(card => ({ ...card })) // deep clone
        }))
      }
    };
  } else {
    // Extract width and height from defaults safely
    const { width = 50, height = 50, ...restDefaults } = defaults as {
      width?: number;
      height?: number;
      [key: string]: any;
    };

    newElement = {
      id: crypto.randomUUID(),
      type: selectedTool as CanvasElementData['type'],
      x: x - (width / 2),
      y: y - (height / 2),
      width,
      height,
      rotation: 0,
      locked: false,
      ...restDefaults
    };
  }

  const newElements = [...elements, newElement];
  setElements(newElements);
  saveToHistory(newElements);
  setSelectedTool('select');
  setSelectedElements([newElement.id]);
}, [selectedTool, elements, saveToHistory]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (selectedTool === 'select' && selectedElements.length > 0) {
      const element = elements.find(el => selectedElements.includes(el.id));
      if (element && !element.locked) {
        setIsDragging(true);
        setDragOffset({ x: x - element.x, y: y - element.y });
      }
    }

    if (selectedTool === 'pen') {
      setIsDrawing(true);
      currentPathRef.current = [{ x, y }];
      setRenderPath([{ x, y }]);
    }
  }, [selectedTool, selectedElements, elements]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (isDragging && selectedElements.length > 0 && dragOffset) {
      const newElements = elements.map(el =>
        selectedElements.includes(el.id) && !el.locked
          ? { ...el, x: x - dragOffset.x, y: y - dragOffset.y }
          : el
      );
      setElements(newElements);
    }

    if (isDrawing && selectedTool === 'pen') {
      currentPathRef.current.push({ x, y });
      setRenderPath([...currentPathRef.current]);
    }
  }, [isDragging, selectedElements, dragOffset, isDrawing, selectedTool, elements]);

  const handleMouseUp = useCallback(() => {
    if (isDragging && selectedElements.length > 0) {
      saveToHistory(elements);
      setIsDragging(false);
      setDragOffset(null);
    }

    if (isDrawing && currentPathRef.current.length > 1) {
      const newElement: CanvasElementData = {
        id: crypto.randomUUID(),
        type: 'pen',
        x: Math.min(...currentPathRef.current.map(p => p.x)),
        y: Math.min(...currentPathRef.current.map(p => p.y)),
        points: [...currentPathRef.current],
        color: '#64748B',
        strokeWidth: 2,
        rotation: 0,
        locked: false
      };
      
      const newElements = [...elements, newElement];
      setElements(newElements);
      saveToHistory(newElements);
    }

    setIsDrawing(false);
    currentPathRef.current = [];
    setRenderPath([]);
  }, [isDragging, isDrawing, elements, selectedElements, saveToHistory]);

  const handleElementUpdate = useCallback((id: string, updates: Partial<CanvasElementData>) => {
    const newElements = elements.map(el => el.id === id ? { ...el, ...updates } : el);
    setElements(newElements);
  }, [elements]);

  const handleElementSelect = useCallback((id: string, multiSelect = false) => {
    if (multiSelect) {
      setSelectedElements(prev => 
        prev.includes(id) ? prev.filter(elId => elId !== id) : [...prev, id]
      );
    } else {
      setSelectedElements([id]);
    }
  }, []);

  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setElements(history[historyIndex - 1]);
    }
  }, [history, historyIndex]);

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setElements(history[historyIndex + 1]);
    }
  }, [history, historyIndex]);

  const handleDelete = useCallback(() => {
    if (selectedElements.length > 0) {
      const newElements = elements.filter(el => !selectedElements.includes(el.id));
      setElements(newElements);
      saveToHistory(newElements);
      setSelectedElements([]);
    }
  }, [elements, selectedElements, saveToHistory]);

  const handleDuplicate = useCallback(() => {
    if (selectedElements.length > 0) {
      const elementsToClone = elements.filter(el => selectedElements.includes(el.id));
      const clonedElements = elementsToClone.map(el => ({
        ...el,
        id: crypto.randomUUID(),
        x: el.x + 20,
        y: el.y + 20
      }));
      
      const newElements = [...elements, ...clonedElements];
      setElements(newElements);
      saveToHistory(newElements);
      setSelectedElements(clonedElements.map(el => el.id));
    }
  }, [elements, selectedElements, saveToHistory]);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenuPos({ x: e.clientX, y: e.clientY });
    setShowContextMenu(true);
  }, []);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Delete' && selectedElements.length > 0) {
      handleDelete();
    }
    if (e.key === 'Escape') {
      setSelectedElements([]);
      setSelectedTool('select');
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
      e.preventDefault();
      handleUndo();
    }
    if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
      e.preventDefault();
      handleRedo();
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
      e.preventDefault();
      handleDuplicate();
    }
  }, [selectedElements, handleDelete, handleUndo, handleRedo, handleDuplicate]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('click', () => setShowContextMenu(false));
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('click', () => setShowContextMenu(false));
    };
  }, [handleKeyDown]);

  if (loading || !user || !board) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  const toolbarItems = [
    { id: 'select', icon: MousePointer, label: 'Select', color: 'text-slate-600', bgColor: 'hover:bg-slate-100' },
    { id: 'hand', icon: Hand, label: 'Hand', color: 'text-blue-600', bgColor: 'hover:bg-blue-50' },
    { id: 'frame', icon: Square, label: 'Frame', color: 'text-violet-600', bgColor: 'hover:bg-violet-50' },
    { id: 'rectangle', icon: Square, label: 'Rectangle', color: 'text-blue-600', bgColor: 'hover:bg-blue-50' },
    { id: 'circle', icon: Circle, label: 'Circle', color: 'text-emerald-600', bgColor: 'hover:bg-emerald-50' },
    { id: 'text', icon: Type, label: 'Text', color: 'text-slate-700', bgColor: 'hover:bg-slate-100' },
    { id: 'pen', icon: Pen, label: 'Pen', color: 'text-orange-600', bgColor: 'hover:bg-orange-50' },
    { id: 'line', icon: Minus, label: 'Line', color: 'text-slate-600', bgColor: 'hover:bg-slate-100' },
    { id: 'arrow', icon: ArrowRight, label: 'Arrow', color: 'text-slate-600', bgColor: 'hover:bg-slate-100' },
    { id: 'sticky', icon: StickyNote, label: 'Sticky Note', color: 'text-orange-600', bgColor: 'hover:bg-orange-50' },
    { id: 'kanban', icon: Columns, label: 'Kanban Board', color: 'text-violet-600', bgColor: 'hover:bg-violet-50' },
    { id: 'comment', icon: MessageSquare, label: 'Comment', color: 'text-blue-600', bgColor: 'hover:bg-blue-50' },
    { id: 'upload', icon: Upload, label: 'Upload', color: 'text-slate-600', bgColor: 'hover:bg-slate-100' },
    { id: 'apps', icon: Grid3x3, label: 'Apps', color: 'text-slate-600', bgColor: 'hover:bg-slate-100' },
  ];

  return (
    <div className="h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-4 py-2 flex items-center justify-between shadow-sm">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-3">
            <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-violet-600 rounded flex items-center justify-center">
              <span className="text-white text-xs font-bold">M</span>
            </div>
            <span className="font-bold text-lg text-slate-900">miro</span>
          </div>
          
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 text-blue-500">🚀</div>
            <span className="font-medium text-slate-900">{board.name}</span>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <Button variant="ghost" size="sm" className="text-slate-600 hover:bg-slate-100">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
          
          <Button variant="outline" size="sm" className="text-slate-700 border-slate-300 hover:bg-slate-50">
            <Crown className="h-4 w-4 mr-2 text-orange-500" />
            Upgrade
          </Button>
          
          <div className="flex items-center space-x-2">
            <div className="flex -space-x-1">
              {['A', 'B', 'C'].map((letter, i) => (
                <Avatar key={i} className="w-8 h-8 border-2 border-white">
                  <AvatarFallback className={`text-white text-xs ${
                    i === 0 ? 'bg-blue-500' : i === 1 ? 'bg-emerald-500' : 'bg-violet-500'
                  }`}>
                    {letter}
                  </AvatarFallback>
                </Avatar>
              ))}
            </div>
            <Button variant="ghost" size="sm" className="text-slate-600 hover:bg-slate-100">
              <Users className="h-4 w-4" />
            </Button>
          </div>
          
          <Button variant="ghost" size="sm" className="text-slate-600 hover:bg-slate-100">
            <MessageCircle className="h-4 w-4" />
          </Button>
          
          <Button variant="ghost" size="sm" className="text-slate-600 hover:bg-slate-100">
            <Monitor className="h-4 w-4" />
          </Button>
          
          <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm">
            <Play className="h-4 w-4 mr-2" />
            Present
          </Button>
          
          <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm">
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </Button>
        </div>
      </header>

      <div className="flex-1 flex">
        {/* Left Toolbar */}
        <motion.div 
          initial={{ x: -50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="w-14 bg-white border-r border-slate-200 flex flex-col items-center py-4 space-y-1 shadow-sm"
        >
          {toolbarItems.map((tool, index) => {
            const Icon = tool.icon;
            const isSelected = selectedTool === tool.id;
            
            return (
              <motion.button
                key={tool.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2, delay: index * 0.05 }}
                whileHover={{ scale: 1.1, y: -2 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setSelectedTool(tool.id)}
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 ${
                  isSelected
                    ? 'bg-blue-100 text-blue-600 shadow-md ring-2 ring-blue-200'
                    : `${tool.color} ${tool.bgColor} shadow-sm`
                }`}
                title={tool.label}
              >
                <Icon className="h-5 w-5" />
              </motion.button>
            );
          })}
          
          <Separator className="w-8 my-3" />
          
          <motion.button
            whileHover={{ scale: 1.1, y: -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleUndo}
            disabled={historyIndex <= 0}
            className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-600 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all duration-200"
            title="Undo"
          >
            <Undo className="h-5 w-5" />
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.1, y: -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleRedo}
            disabled={historyIndex >= history.length - 1}
            className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-600 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all duration-200"
            title="Redo"
          >
            <Redo className="h-5 w-5" />
          </motion.button>
        </motion.div>

        {/* Main Canvas Area */}
        <div className="flex-1 relative">
          <GridCanvas 
            zoom={zoomLevel} 
            onZoomChange={setZoomLevel}
            isPanMode={selectedTool === 'hand'}
          >
            <div 
              className="w-full h-full relative"
              onClick={handleCanvasClick}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onContextMenu={handleContextMenu}
              style={{ cursor: selectedTool === 'pen' ? 'crosshair' : selectedTool === 'hand' ? 'grab' : 'default' }}
            >
              <AnimatePresence>
                {elements.map(element => (
                  <CanvasElement
                    key={element.id}
                    {...element}
                    onUpdate={handleElementUpdate}
                    onSelect={(id) => handleElementSelect(id, false)}
                    isSelected={selectedElements.includes(element.id)}
                    zoom={zoomLevel}
                  />
                ))}
              </AnimatePresence>
              
              {/* Current drawing path */}
              {isDrawing && renderPath.length > 1 && (
                <svg className="absolute inset-0 pointer-events-none">
                  <motion.path
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    d={`M ${renderPath.map(p => `${p.x},${p.y}`).join(' L ')}`}
                    stroke="#64748B"
                    strokeWidth="2"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </div>
          </GridCanvas>

          {/* Context Menu */}
          <AnimatePresence>
            {showContextMenu && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.1 }}
                className="absolute bg-white rounded-lg shadow-lg border border-slate-200 py-2 z-50"
                style={{ left: contextMenuPos.x, top: contextMenuPos.y }}
              >
                <button
                  onClick={handleDuplicate}
                  disabled={selectedElements.length === 0}
                  className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 disabled:opacity-50 flex items-center"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Duplicate
                </button>
                <button
                  onClick={handleDelete}
                  disabled={selectedElements.length === 0}
                  className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 disabled:opacity-50 flex items-center"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Selection Info */}
          <AnimatePresence>
            {selectedElements.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute top-6 left-1/2 transform -translate-x-1/2 bg-white/95 backdrop-blur-sm rounded-lg px-4 py-2 text-sm text-slate-700 border border-slate-200 shadow-sm"
              >
                {selectedElements.length} element{selectedElements.length > 1 ? 's' : ''} selected
              </motion.div>
            )}
          </AnimatePresence>

          {/* Zoom Controls */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="absolute bottom-6 right-6 flex items-center space-x-2 bg-white/95 backdrop-blur-sm rounded-xl border border-slate-200 shadow-lg px-4 py-3"
          >
            <Button
              variant="ghost"
              size="sm"
              className="p-2 h-8 w-8 hover:bg-slate-100"
              onClick={() => setZoomLevel(Math.max(10, zoomLevel - 10))}
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-sm text-slate-600 min-w-[3rem] text-center font-medium">
              {zoomLevel}%
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="p-2 h-8 w-8 hover:bg-slate-100"
              onClick={() => setZoomLevel(Math.min(500, zoomLevel + 10))}
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
          </motion.div>

          {/* Help Button */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
            className="absolute bottom-6 left-6"
          >
            <Button
              variant="ghost"
              size="sm"
              className="w-10 h-10 p-0 bg-white/95 backdrop-blur-sm border border-slate-200 shadow-lg rounded-full text-slate-600 hover:bg-slate-50"
            >
              ?
            </Button>
          </motion.div>

          {/* AI Magic Button */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
            className="absolute top-6 right-6"
          >
            <Button
              variant="ghost"
              size="sm"
              className="w-12 h-12 p-0 bg-gradient-to-br from-orange-100 to-amber-100 border border-orange-200 shadow-lg rounded-full text-orange-600 hover:from-orange-200 hover:to-amber-200 transition-all duration-200"
              title="AI Magic"
            >
              <Sparkles className="h-6 w-6" />
            </Button>
          </motion.div>

          {/* Tool Info */}
          <AnimatePresence>
            {selectedTool !== 'select' && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute top-6 left-6 bg-white/95 backdrop-blur-sm rounded-lg px-4 py-2 text-sm text-slate-600 border border-slate-200 shadow-sm"
              >
                {selectedTool === 'pen' ? 'Click and drag to draw' : 
                 selectedTool === 'hand' ? 'Drag to pan the canvas' :
                 selectedTool === 'kanban' ? 'Click to add Kanban board' :
                 `Click to add ${selectedTool}`}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}