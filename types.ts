export interface DashboardItem {
  id: string;
  title: string;
  url?: string;
  type: 'link' | 'action' | 'folder';
  action?: 'clear-data' | 'add-current';
  iconType?: 'emoji' | 'lucide'; 
  iconValue?: any;
  items?: DashboardItem[]; // For folder contents
}

export interface DashboardSection {
  id: string;
  title: string;
  items: DashboardItem[];
  hidden?: boolean;
}

export interface StorageData {
  sections: DashboardSection[];
}

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    chrome: any;
  }
}