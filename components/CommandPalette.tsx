import React, { useState, useEffect, useRef } from 'react';
import { DashboardSection, DashboardItem } from '../types';
import { 
  getSections, 
  saveItemToFavorites, 
  clearBrowsingData, 
  toggleSectionVisibility,
  deleteItem,
  renameItem,
  moveItem,
  createFolderWithItems,
  reorderItem
} from '../utils/storage';
import { Plus, Trash2, CheckCircle2, X, SlidersHorizontal, Check, ChevronLeft, MoreHorizontal, Edit2, ExternalLink } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const CommandPalette: React.FC<Props> = ({ isOpen, onClose }) => {
  const [sections, setSections] = useState<DashboardSection[]>([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{msg: string, type: 'success' | 'loading'} | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  // Folder Navigation State
  const [activeFolder, setActiveFolder] = useState<DashboardItem | null>(null);

  // Context Menu State
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, item: DashboardItem } | null>(null);
  const [editingItem, setEditingItem] = useState<DashboardItem | null>(null);
  const [editTitle, setEditTitle] = useState('');
  
  const settingsRef = useRef<HTMLDivElement>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);
  
  // Drag State
  const dragTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reorderTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadData();
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      setIsSettingsOpen(false);
      setActiveFolder(null);
      setContextMenu(null);
      clearTimers();
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  const clearTimers = () => {
      if (dragTimerRef.current) {
        clearTimeout(dragTimerRef.current);
        dragTimerRef.current = null;
      }
      if (reorderTimerRef.current) {
          clearTimeout(reorderTimerRef.current);
          reorderTimerRef.current = null;
      }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
        setIsSettingsOpen(false);
      }
      if (contextMenuRef.current && !contextMenuRef.current.contains(event.target as Node)) {
        setContextMenu(null);
      }
    };
    if (isSettingsOpen || contextMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isSettingsOpen, contextMenu]);

  useEffect(() => {
    if (activeFolder) {
      let updatedFolder: DashboardItem | undefined;
      for (const section of sections) {
        for (const item of section.items) {
          if (item.id === activeFolder.id) updatedFolder = item;
          if (item.type === 'folder' && item.items) {
             const found = item.items.find(sub => sub.id === activeFolder.id);
             if (found) updatedFolder = found;
          }
        }
      }
      if (updatedFolder) {
        setActiveFolder(updatedFolder);
      } else {
          // If active folder was deleted (cleanup), go home
          setActiveFolder(null);
      }
    }
  }, [sections]);


  const loadData = async () => {
    const data = await getSections();
    setSections(data);
  };

  const toggleSection = async (sectionId: string) => {
    const updated = await toggleSectionVisibility(sectionId);
    setSections(updated);
  };

  const getFaviconUrl = (url?: string) => {
    if (!url) return null;
    try {
      const hostname = new URL(url).hostname;
      return `https://www.google.com/s2/favicons?domain=${hostname}&sz=128`;
    } catch (e) {
      return null;
    }
  };

  const showToast = (msg: string, type: 'success' | 'loading' = 'success') => {
    setToast({ msg, type });
    if (type === 'success') {
      setTimeout(() => setToast(null), 3000);
    }
  };

  const handleItemClick = async (item: DashboardItem) => {
    if (item.type === 'folder' && item.items) {
      setActiveFolder(item);
    } else if (item.type === 'link' && item.url) {
      window.location.href = item.url;
    } else if (item.action === 'clear-data') {
      setLoading(true);
      showToast('Cleaning browsing data...', 'loading');
      await clearBrowsingData();
      setLoading(false);
      showToast('History & Cache Cleared (24h)');
    } else if (item.action === 'add-current') {
      const newItem: DashboardItem = {
        id: Date.now().toString(),
        title: document.title || 'New Page',
        url: window.location.href,
        type: 'link'
      };
      await saveItemToFavorites(newItem);
      await loadData();
      showToast('Added to Favorites');
    }
  };

  // --- Context Menu Handlers ---

  const handleContextMenu = (e: React.MouseEvent, item: DashboardItem) => {
    if (item.type === 'action') return; 
    e.preventDefault();
    e.stopPropagation();
    
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const modalRect = document.querySelector('.modal-window')?.getBoundingClientRect();
    
    if (modalRect) {
        setContextMenu({
            x: e.clientX - modalRect.left,
            y: e.clientY - modalRect.top,
            item
        });
    }
  };

  const handleDelete = async (itemId: string) => {
    setContextMenu(null);
    const updated = await deleteItem(itemId);
    setSections(updated);
    showToast('Item deleted');
  };

  const handleRenameInit = () => {
    if (!contextMenu) return;
    setEditTitle(contextMenu.item.title);
    setEditingItem(contextMenu.item);
    setContextMenu(null);
  };

  const handleRenameSave = async () => {
    if (!editingItem) return;
    const updated = await renameItem(editingItem.id, editTitle);
    setSections(updated);
    setEditingItem(null);
  };

  // --- Drag & Drop Handlers ---

  const handleDragStart = (e: React.DragEvent, item: DashboardItem) => {
    if (item.type === 'action') {
        e.preventDefault();
        return;
    }
    setDraggedItemId(item.id);
    e.dataTransfer.setData('text/plain', item.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  // Drag Enter Item - Triggers Timer for Reordering
  const handleDragEnterItem = (e: React.DragEvent, targetItem: DashboardItem) => {
      e.preventDefault();
      e.stopPropagation();

      if (!draggedItemId || draggedItemId === targetItem.id) return;
      if (targetItem.type === 'action') return;

      // Reset timer if we enter a new item
      if (reorderTimerRef.current) clearTimeout(reorderTimerRef.current);

      // Start Reorder Timer (Mobile style: Hold to reorder)
      reorderTimerRef.current = setTimeout(async () => {
          // Perform Reorder
          const updated = await reorderItem(draggedItemId, targetItem.id);
          setSections(updated);
          reorderTimerRef.current = null;
      }, 400); // 400ms delay to distinguish between dropping-ON (merge) and holding-TO-REORDER
  };

  const handleDragLeaveItem = (e: React.DragEvent) => {
      e.preventDefault();
      // If we leave the item, cancel reorder timer
      if (reorderTimerRef.current) {
          clearTimeout(reorderTimerRef.current);
          reorderTimerRef.current = null;
      }
  };

  const handleDropOnBackground = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    clearTimers();
    setDraggedItemId(null);

    // Only allow moving to home if we are currently at root view
    if (!activeFolder) {
        const itemId = e.dataTransfer.getData('text/plain');
        if (!itemId) return;

        const updated = await moveItem(itemId, 'favorites');
        setSections(updated);
    }
  };

  const handleDropOnItem = async (e: React.DragEvent, targetItem: DashboardItem) => {
    e.preventDefault();
    e.stopPropagation();
    clearTimers(); // Cancel any pending reorder
    setDraggedItemId(null);

    const sourceId = e.dataTransfer.getData('text/plain');
    
    if (!sourceId || sourceId === targetItem.id) return;
    if (targetItem.type === 'action') return;

    // NOTE: If a reorder happened immediately before drop (timer fired), 
    // the UI has shifted, and the item under the mouse might have changed to the dragged item itself.
    // In that case sourceId === targetItem.id check above saves us.
    
    // If we are here, it means we dropped BEFORE reorder timer fired.
    // This implies a "Merge" or "Move Into" intent.

    if (targetItem.type === 'folder') {
        const updated = await moveItem(sourceId, targetItem.id);
        setSections(updated);
        showToast('Moved to folder');
    } else {
        const updated = await createFolderWithItems(sourceId, targetItem.id);
        setSections(updated);
        showToast('Folder created');
    }
  };

  const handleDropOnHeader = async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      clearTimers();
      setDraggedItemId(null);

      const itemId = e.dataTransfer.getData('text/plain');
      if (itemId) {
        const updated = await moveItem(itemId, 'favorites');
        setSections(updated);
        setActiveFolder(null);
        showToast('Moved to Favorites');
      }
  };

  const handleDragEnterHeader = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (activeFolder && !dragTimerRef.current) {
        dragTimerRef.current = setTimeout(() => {
            setActiveFolder(null);
            dragTimerRef.current = null;
        }, 500);
    }
  };

  const handleDragLeaveHeader = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.relatedTarget && (e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) {
       return;
    }
    if (dragTimerRef.current) {
        clearTimeout(dragTimerRef.current);
        dragTimerRef.current = null;
    }
  };

  if (!isOpen) return null;

  const visibleSections = sections.filter(s => !s.hidden);

  const FolderIcon = ({ items }: { items: DashboardItem[] }) => {
    const slots = [0, 1, 2, 3];
    return (
      <div className="w-full h-full bg-slate-200/50 backdrop-blur-sm rounded-2xl p-2 grid grid-cols-2 gap-1.5 border border-white/40 pointer-events-none">
        {slots.map((slotIndex) => {
           const subItem = items[slotIndex];
           const icon = subItem ? getFaviconUrl(subItem.url) : null;
           
           return (
             <div key={slotIndex} className="w-full h-full aspect-square bg-white/80 rounded-md flex items-center justify-center shadow-sm overflow-hidden">
                {subItem ? (
                   icon ? <img src={icon} className="w-4 h-4 object-contain" alt="" /> : <div className="text-[8px] font-bold text-slate-400">{subItem.title.charAt(0)}</div>
                ) : null}
             </div>
           )
        })}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[2147483647] flex items-center justify-center font-sans p-4 sm:p-6 text-slate-900">
      <div className="absolute inset-0 bg-black/25 backdrop-blur-sm transition-opacity duration-300" onClick={onClose} />

      <div className="modal-window relative w-full max-w-5xl h-[85vh] max-h-[800px] flex flex-col bg-slate-100/90 backdrop-blur-2xl rounded-3xl shadow-2xl border border-white/40 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        <div 
            className="flex-none flex justify-between items-center px-6 py-4 border-b border-black/5 bg-white/20 min-h-[70px]"
            onDragOver={handleDragOver}
            onDrop={handleDropOnHeader}
            onDragEnter={handleDragEnterHeader}
            onDragLeave={handleDragLeaveHeader}
        >
             <div className="flex items-center gap-2 pointer-events-none"> 
                {activeFolder ? (
                    <button 
                        onClick={(e) => { e.stopPropagation(); setActiveFolder(null); }}
                        className="pointer-events-auto flex items-center gap-1 text-indigo-600 font-medium hover:bg-white/50 px-3 py-1.5 rounded-lg transition-colors border-2 border-transparent hover:border-indigo-200"
                    >
                        <ChevronLeft size={20} />
                        Back to Home
                    </button>
                ) : <div className="w-4 h-4" />}
             </div>

            <button onClick={onClose} className="pointer-events-auto p-2 bg-black/5 hover:bg-black/10 rounded-full transition-colors text-slate-500 hover:text-slate-800">
                <X size={20} />
            </button>
        </div>

        <div 
            className="flex-1 overflow-y-auto p-8 lg:p-12 custom-scrollbar relative"
            onDragOver={handleDragOver}
            onDrop={handleDropOnBackground}
        >
          <div className="space-y-12 pb-12">
            {activeFolder ? (
               <div className="animate-in slide-in-from-right-8 fade-in duration-300">
                   <h2 className="text-3xl font-bold text-slate-800 mb-8 tracking-tight pl-2 flex items-center gap-3">
                       <span className="text-slate-400 font-normal">Folder /</span>
                       {activeFolder.title}
                   </h2>
                   
                   <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-x-4 gap-y-8">
                      {activeFolder.items?.map(item => {
                         const isFolder = item.type === 'folder';
                         return (
                            <div 
                                key={item.id}
                                draggable
                                onDragStart={(e) => handleDragStart(e, item)}
                                onDragOver={handleDragOver}
                                onDragEnter={(e) => handleDragEnterItem(e, item)}
                                onDragLeave={handleDragLeaveItem}
                                onDrop={(e) => handleDropOnItem(e, item)}
                                onClick={() => handleItemClick(item)}
                                onContextMenu={(e) => handleContextMenu(e, item)}
                                className="group flex flex-col items-center gap-3 cursor-pointer relative"
                            >
                                <div className={`
                                    relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center shadow-sm transition-all duration-300 
                                    group-hover:scale-105 group-hover:shadow-lg border border-white/50
                                    ${isFolder ? 'bg-transparent p-0 shadow-none border-0' : 'bg-white'}
                                `}>
                                    {isFolder ? <FolderIcon items={item.items || []} /> : (
                                        getFaviconUrl(item.url) ? <img src={getFaviconUrl(item.url)!} alt={item.title} className="w-10 h-10 sm:w-12 sm:h-12 object-contain drop-shadow-sm" /> : <div className="text-slate-500 font-bold">{item.title.charAt(0)}</div>
                                    )}
                                    <button 
                                        onClick={(e) => handleContextMenu(e, item)}
                                        className="absolute top-1 right-1 p-1 rounded-full bg-slate-200/80 hover:bg-white text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                                    >
                                        <MoreHorizontal size={14} />
                                    </button>
                                </div>
                                <span className="text-[11px] sm:text-xs font-medium text-center truncate max-w-full px-1 py-0.5 rounded leading-tight text-slate-600">
                                    {item.title}
                                </span>
                            </div>
                         );
                      })}
                   </div>
               </div>
            ) : (
                <>
                {visibleSections.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                        <p>No sections visible.</p>
                        <button onClick={() => setIsSettingsOpen(true)} className="mt-2 text-indigo-600 hover:underline">Customize Dashboard</button>
                    </div>
                ) : visibleSections.map((section) => (
                <div key={section.id} className="animate-in slide-in-from-bottom-4 fade-in duration-500">
                    <h2 className="text-xl sm:text-2xl font-bold text-slate-800 mb-6 tracking-tight pl-2">
                    {section.title}
                    </h2>
                    
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-x-4 gap-y-8">
                    {section.items.map((item) => {
                        const favicon = getFaviconUrl(item.url);
                        const isAction = item.type === 'action';
                        const isFolder = item.type === 'folder';

                        return (
                        <div 
                            key={item.id}
                            draggable={!isAction}
                            onDragStart={(e) => handleDragStart(e, item)}
                            onDragOver={handleDragOver}
                            onDragEnter={(e) => handleDragEnterItem(e, item)}
                            onDragLeave={handleDragLeaveItem}
                            onDrop={(e) => handleDropOnItem(e, item)}
                            onClick={() => handleItemClick(item)}
                            onContextMenu={(e) => handleContextMenu(e, item)}
                            className="group flex flex-col items-center gap-3 cursor-pointer relative"
                        >
                            <div className={`
                            relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center shadow-sm transition-all duration-300 
                            group-hover:scale-105 group-hover:shadow-lg border border-white/50
                            ${isFolder ? 'bg-transparent p-0 shadow-none border-0' : ''}
                            ${isAction && item.action === 'clear-data' ? 'bg-rose-50' : !isFolder ? 'bg-white' : ''}
                            ${isAction && item.action === 'add-current' ? 'bg-slate-50 border-2 border-dashed border-slate-300 shadow-none' : ''}
                            `}>
                            {isFolder ? <FolderIcon items={item.items || []} /> : isAction ? (
                                item.action === 'add-current' ? <Plus className="w-8 h-8 text-slate-400 group-hover:text-slate-600" /> : <Trash2 className="w-8 h-8 text-rose-500" />
                            ) : (
                                favicon ? <img src={favicon} alt={item.title} className="w-10 h-10 sm:w-12 sm:h-12 object-contain drop-shadow-sm" /> : <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center text-slate-500 font-bold text-lg">{item.title.charAt(0)}</div>
                            )}

                            {loading && item.action === 'clear-data' && (
                                <div className="absolute inset-0 bg-white/80 rounded-2xl flex items-center justify-center">
                                    <div className="w-6 h-6 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
                                </div>
                            )}

                            {!isAction && (
                                <button 
                                    onClick={(e) => handleContextMenu(e, item)}
                                    className="absolute top-1 right-1 p-1 rounded-full bg-slate-200/80 hover:bg-white text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                                >
                                    <MoreHorizontal size={14} />
                                </button>
                            )}
                            </div>

                            <span className={`text-[11px] sm:text-xs font-medium text-center truncate max-w-full px-1 py-0.5 rounded leading-tight ${isAction && item.action === 'clear-data' ? 'text-rose-600' : 'text-slate-600'}`}>
                                {item.title}
                            </span>
                        </div>
                        );
                    })}
                    </div>
                </div>
                ))}
                </>
            )}
          </div>

          {contextMenu && (
             <div 
               ref={contextMenuRef}
               className="absolute z-50 bg-white/95 backdrop-blur-md rounded-lg shadow-xl border border-white/20 p-1 w-40 animate-in fade-in zoom-in-95 duration-100 origin-top-left"
               style={{ top: contextMenu.y, left: contextMenu.x }}
             >
                {contextMenu.item.url && (
                    <a href={contextMenu.item.url} className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 rounded-md">
                        <ExternalLink size={14} /> Open
                    </a>
                )}
                <button onClick={handleRenameInit} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 rounded-md text-left">
                    <Edit2 size={14} /> Rename
                </button>
                <div className="h-px bg-slate-100 my-1" />
                <button onClick={() => handleDelete(contextMenu.item.id)} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-rose-600 hover:bg-rose-50 rounded-md text-left">
                    <Trash2 size={14} /> Delete
                </button>
             </div>
          )}

          {!activeFolder && (
              <div className="absolute bottom-6 right-6 z-20 flex flex-col items-end gap-2" ref={settingsRef}>
                {isSettingsOpen && (
                    <div className="mb-2 w-64 bg-white/90 backdrop-blur-xl rounded-xl shadow-xl border border-white/20 p-2 animate-in slide-in-from-bottom-2 fade-in duration-200">
                        <div className="px-3 py-2 border-b border-black/5 mb-1">
                            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Customize</span>
                        </div>
                        <div className="flex flex-col gap-1">
                            {sections.map(section => (
                                <label key={section.id} className="flex items-center justify-between px-3 py-2 hover:bg-black/5 rounded-lg cursor-pointer group">
                                    <span className="text-sm font-medium text-slate-700">{section.title}</span>
                                    <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${!section.hidden ? 'bg-indigo-500 border-indigo-500' : 'bg-white border-slate-300 group-hover:border-slate-400'}`}>
                                        <input type="checkbox" checked={!section.hidden} onChange={() => toggleSection(section.id)} className="hidden" />
                                        {!section.hidden && <Check size={14} className="text-white" strokeWidth={3} />}
                                    </div>
                                </label>
                            ))}
                        </div>
                    </div>
                )}
                <button onClick={() => setIsSettingsOpen(!isSettingsOpen)} className={`p-3 rounded-full shadow-lg transition-all duration-200 ${isSettingsOpen ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}>
                    <SlidersHorizontal size={20} />
                </button>
            </div>
          )}
        </div>
      </div>

      {editingItem && (
        <div className="fixed inset-0 z-[2147483660] flex items-center justify-center">
            <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setEditingItem(null)} />
            <div className="relative bg-white rounded-2xl shadow-2xl p-6 w-80 animate-in zoom-in-95 duration-200">
                <h3 className="text-lg font-bold text-slate-800 mb-4">Rename Bookmark</h3>
                <input 
                    type="text" 
                    value={editTitle} 
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    autoFocus
                />
                <div className="flex justify-end gap-2">
                    <button onClick={() => setEditingItem(null)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button>
                    <button onClick={handleRenameSave} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg">Save</button>
                </div>
            </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[2147483650]">
          <div className="bg-white/90 backdrop-blur-md border border-slate-200 shadow-xl rounded-full px-6 py-3 flex items-center gap-3 animate-in slide-in-from-bottom-5 fade-in">
            {toast.type === 'success' ? <CheckCircle2 className="text-emerald-500 w-5 h-5" /> : <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />}
            <span className="text-sm font-semibold text-slate-800">{toast.msg}</span>
          </div>
        </div>
      )}
    </div>
  );
};