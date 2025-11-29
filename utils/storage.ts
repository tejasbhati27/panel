import { DashboardSection, DashboardItem } from '../types';

const STORAGE_KEY = 'safari_dashboard_data';

const DEFAULT_SECTIONS: DashboardSection[] = [
  {
    id: 'favorites',
    title: 'Favorites',
    hidden: false,
    items: [
      { id: 'google', title: 'Google', url: 'https://google.com', type: 'link' },
      { id: 'youtube', title: 'YouTube', url: 'https://youtube.com', type: 'link' },
      { 
        id: 'tech-folder', 
        title: 'Tech & News', 
        type: 'folder',
        items: [
           { id: 'verge', title: 'The Verge', url: 'https://theverge.com', type: 'link' },
           { id: 'techcrunch', title: 'TechCrunch', url: 'https://techcrunch.com', type: 'link' },
           { id: 'wired', title: 'Wired', url: 'https://wired.com', type: 'link' },
           { id: 'ycombinator', title: 'Y Combinator', url: 'https://news.ycombinator.com', type: 'link' }
        ]
      },
      { id: 'github', title: 'GitHub', url: 'https://github.com', type: 'link' },
      { id: 'add-btn', title: 'Add Page', type: 'action', action: 'add-current', iconType: 'lucide', iconValue: 'plus' }
    ]
  },
  {
    id: 'social',
    title: 'Social',
    hidden: false,
    items: [
      { id: 'twitter', title: 'X / Twitter', url: 'https://twitter.com', type: 'link' },
      { id: 'reddit', title: 'Reddit', url: 'https://reddit.com', type: 'link' },
      { id: 'linkedin', title: 'LinkedIn', url: 'https://linkedin.com', type: 'link' }
    ]
  },
  {
    id: 'privacy',
    title: 'Privacy & Tools',
    hidden: false,
    items: [
      { 
        id: 'clear-data', 
        title: 'Clear Data (24h)', 
        type: 'action', 
        action: 'clear-data',
        iconType: 'lucide',
        iconValue: 'trash'
      }
    ]
  }
];

export const getSections = async (): Promise<DashboardSection[]> => {
  if (typeof window.chrome !== 'undefined' && window.chrome.storage) {
    return new Promise((resolve) => {
      window.chrome.storage.local.get([STORAGE_KEY], (result: any) => {
        resolve(result[STORAGE_KEY] || DEFAULT_SECTIONS);
      });
    });
  } else {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : DEFAULT_SECTIONS;
  }
};

const saveSections = async (sections: DashboardSection[]) => {
  if (typeof window.chrome !== 'undefined' && window.chrome.storage) {
    return new Promise<void>((resolve) => {
      window.chrome.storage.local.set({ [STORAGE_KEY]: sections }, () => resolve());
    });
  } else {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sections));
  }
};

// --- Helper: Cleanup Empty Folders ---
const cleanupData = (sections: DashboardSection[]) => {
    const cleanItems = (items: DashboardItem[]) => {
        // 1. Recurse first
        items.forEach(item => {
            if (item.type === 'folder' && item.items) {
                cleanItems(item.items);
            }
        });

        // 2. Remove empty folders (iterate backwards to safe splice)
        for (let i = items.length - 1; i >= 0; i--) {
            const item = items[i];
            if (item.type === 'folder' && item.items && item.items.length === 0) {
                items.splice(i, 1);
            }
        }
    };

    sections.forEach(section => {
        cleanItems(section.items);
    });
};

export const saveItemToFavorites = async (item: DashboardItem): Promise<void> => {
  const sections = await getSections();
  const favIndex = sections.findIndex(s => s.id === 'favorites');
  if (favIndex === -1) return;

  const newItems = [...sections[favIndex].items];
  const addButtonIndex = newItems.findIndex(i => i.action === 'add-current');
  
  if (addButtonIndex >= 0) {
    newItems.splice(addButtonIndex, 0, item);
  } else {
    newItems.push(item);
  }

  sections[favIndex] = { ...sections[favIndex], items: newItems };
  cleanupData(sections);
  await saveSections(sections);
};

export const toggleSectionVisibility = async (sectionId: string): Promise<DashboardSection[]> => {
  const sections = await getSections();
  const updatedSections = sections.map(s => 
    s.id === sectionId ? { ...s, hidden: !s.hidden } : s
  );
  await saveSections(updatedSections);
  return updatedSections;
};

// --- Item Management (Delete, Rename, Move, Reorder) ---

export const deleteItem = async (itemId: string): Promise<DashboardSection[]> => {
  const sections = await getSections();
  
  const removeRecursive = (items: DashboardItem[]): boolean => {
    const idx = items.findIndex(i => i.id === itemId);
    if (idx !== -1) {
      items.splice(idx, 1);
      return true;
    }
    for (const item of items) {
      if (item.type === 'folder' && item.items) {
        if (removeRecursive(item.items)) return true;
      }
    }
    return false;
  };

  for (const section of sections) {
    if (removeRecursive(section.items)) break;
  }

  cleanupData(sections);
  await saveSections(sections);
  return sections;
};

export const renameItem = async (itemId: string, newTitle: string): Promise<DashboardSection[]> => {
  const sections = await getSections();

  const updateRecursive = (items: DashboardItem[]): boolean => {
    const item = items.find(i => i.id === itemId);
    if (item) {
      item.title = newTitle;
      return true;
    }
    for (const subItem of items) {
      if (subItem.type === 'folder' && subItem.items) {
        if (updateRecursive(subItem.items)) return true;
      }
    }
    return false;
  };

  for (const section of sections) {
    if (updateRecursive(section.items)) break;
  }

  await saveSections(sections);
  return sections;
};

export const moveItem = async (itemId: string, targetId: string): Promise<DashboardSection[]> => {
  const sections = await getSections();
  let itemToMove: DashboardItem | null = null;

  // 1. Find and Remove Item
  const removeRecursive = (items: DashboardItem[]): DashboardItem | null => {
    const idx = items.findIndex(i => i.id === itemId);
    if (idx !== -1) {
      const [removed] = items.splice(idx, 1);
      return removed;
    }
    for (const item of items) {
      if (item.type === 'folder' && item.items) {
        const found = removeRecursive(item.items);
        if (found) return found;
      }
    }
    return null;
  };

  for (const section of sections) {
    itemToMove = removeRecursive(section.items);
    if (itemToMove) break;
  }

  if (!itemToMove) return sections; // Item not found

  // 2. Add to Target
  // If targetId is 'root' or 'favorites', add to Favorites section
  if (targetId === 'root' || targetId === 'favorites') {
    const favSection = sections.find(s => s.id === 'favorites');
    if (favSection) {
       // Insert before add button if exists
       const addBtnIdx = favSection.items.findIndex(i => i.action === 'add-current');
       if (addBtnIdx !== -1) favSection.items.splice(addBtnIdx, 0, itemToMove);
       else favSection.items.push(itemToMove);
    }
  } else {
    // Find target folder
    const findFolderRecursive = (items: DashboardItem[]): DashboardItem | null => {
      for (const item of items) {
        if (item.id === targetId && item.type === 'folder') return item;
        if (item.type === 'folder' && item.items) {
          const found = findFolderRecursive(item.items);
          if (found) return found;
        }
      }
      return null;
    }

    let targetFolder: DashboardItem | null = null;
    for (const section of sections) {
      targetFolder = findFolderRecursive(section.items);
      if (targetFolder) break;
    }

    if (targetFolder && targetFolder.items) {
      targetFolder.items.push(itemToMove);
    } else {
      // Fallback
      const favSection = sections.find(s => s.id === 'favorites');
      if (favSection) favSection.items.push(itemToMove);
    }
  }

  cleanupData(sections);
  await saveSections(sections);
  return sections;
};

export const reorderItem = async (sourceId: string, targetId: string): Promise<DashboardSection[]> => {
    const sections = await getSections();
    let sourceItem: DashboardItem | null = null;
    let sourceArray: DashboardItem[] | undefined;
    
    // 1. Find Source and its Array
    const findSourceRecursive = (items: DashboardItem[]): boolean => {
        const idx = items.findIndex(i => i.id === sourceId);
        if (idx !== -1) {
            sourceItem = items[idx];
            sourceArray = items;
            return true;
        }
        for (const item of items) {
            if (item.type === 'folder' && item.items) {
                if (findSourceRecursive(item.items)) return true;
            }
        }
        return false;
    };

    for (const section of sections) {
        if (findSourceRecursive(section.items)) break;
    }

    if (!sourceItem || !sourceArray) return sections;

    // 2. Find Target and its Array
    let targetArray: DashboardItem[] | undefined;
    let targetIndex = -1;

    const findTargetRecursive = (items: DashboardItem[]): boolean => {
        const idx = items.findIndex(i => i.id === targetId);
        if (idx !== -1) {
            targetArray = items;
            targetIndex = idx;
            return true;
        }
        for (const item of items) {
            if (item.type === 'folder' && item.items) {
                if (findTargetRecursive(item.items)) return true;
            }
        }
        return false;
    };

    for (const section of sections) {
        if (findTargetRecursive(section.items)) break;
    }

    if (!targetArray || targetIndex === -1) return sections;

    // 3. Perform the move
    // Remove from source (safely using non-null assertion because we found it)
    const srcArr = sourceArray as DashboardItem[];
    const sourceIndex = srcArr.indexOf(sourceItem);
    srcArr.splice(sourceIndex, 1);

    // If arrays are same, index might have shifted
    const tgtArr = targetArray as DashboardItem[];
    
    // If we removed from before the target in the same array, targetIndex decreases
    if (srcArr === tgtArr) {
        if (sourceIndex < targetIndex) targetIndex--;
    }

    // Insert at target
    tgtArr.splice(targetIndex, 0, sourceItem);

    await saveSections(sections);
    return sections;
};

export const createFolderWithItems = async (sourceId: string, targetId: string): Promise<DashboardSection[]> => {
  const sections = await getSections();
  let sourceItem: DashboardItem | null = null;

  // 1. Remove Source Item
  const removeRecursive = (items: DashboardItem[]): DashboardItem | null => {
    const idx = items.findIndex(i => i.id === sourceId);
    if (idx !== -1) {
      const [removed] = items.splice(idx, 1);
      return removed;
    }
    for (const item of items) {
      if (item.type === 'folder' && item.items) {
        const found = removeRecursive(item.items);
        if (found) return found;
      }
    }
    return null;
  };

  for (const section of sections) {
    sourceItem = removeRecursive(section.items);
    if (sourceItem) break;
  }

  if (!sourceItem) return sections;

  // 2. Find Target and Replace with New Folder
  const replaceRecursive = (items: DashboardItem[]): boolean => {
    const idx = items.findIndex(i => i.id === targetId);
    if (idx !== -1) {
      const targetItem = items[idx];
      
      const newFolder: DashboardItem = {
        id: `folder-${Date.now()}`,
        title: 'New Folder',
        type: 'folder',
        items: [targetItem, sourceItem!]
      };
      
      items[idx] = newFolder;
      return true;
    }
    for (const item of items) {
      if (item.type === 'folder' && item.items) {
        if (replaceRecursive(item.items)) return true;
      }
    }
    return false;
  };

  let replaced = false;
  for (const section of sections) {
    replaced = replaceRecursive(section.items);
    if (replaced) break;
  }

  // Fallback if target not found
  if (!replaced) {
      const fav = sections.find(s => s.id === 'favorites');
      if (fav) fav.items.push(sourceItem);
  }

  cleanupData(sections);
  await saveSections(sections);
  return sections;
};

export const clearBrowsingData = async (): Promise<void> => {
  if (typeof window.chrome !== 'undefined' && window.chrome.runtime) {
    return new Promise((resolve) => {
      window.chrome.runtime.sendMessage({ type: 'CLEAR_DATA' }, () => {
        resolve();
      });
    });
  } else {
    return new Promise(resolve => setTimeout(resolve, 800));
  }
};