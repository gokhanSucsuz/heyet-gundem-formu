

// We'll move the interfaces to db_types.ts later or just keep them here
export interface Member {
  id: string;
  name: string;
  title: string;
  order: number;
  isProxy?: boolean;
  proxyName?: string;
  proxyTitle?: string;
}

export interface MemberSnapshot {
  id: string;
  name: string;
  title: string;
  isProxy?: boolean;
  proxyName?: string;
  proxyTitle?: string;
  order: number;
}

export interface TableConfig {
  columns: string[];
  rows: string[][];
  showBorders?: boolean;
}

export interface FormSubItem {
  id: string;
  type: 'numbered' | 'bullet' | 'text';
  text: string;
}

export interface FormItem {
  id: string;
  type: 'numbered' | 'bullet' | 'text';
  text: string;
  hasTable?: boolean;
  table?: TableConfig;
  indent?: number;
  subItems?: FormSubItem[];
}

export interface OfficialForm {
  id: string;
  title: string;
  documentDate: string;
  decisionNo: string;
  decisionDate: string;
  decisionTime: string;
  isPostponed: boolean;
  isLocked?: boolean;
  headerTop: string;
  headerMiddle: string;
  headerBottom: string;
  headerLine4: string; 
  items: FormItem[];
  footerText: string;
  signatureMembers: string[];
  signatureSnapshots?: MemberSnapshot[];
  createdAt: number;
  updatedAt: number;
  layout?: any;
}

export interface Settings {
  id: string;
  leftLogoBase64?: string;
  rightLogoBase64?: string;
  layout?: any;
}

class MongoTable<T extends { id: string }> {
  constructor(private collection: string) {}

  async toArray(): Promise<T[]> {
    try {
      const res = await fetch(`/api/db/${this.collection}`);
      const data = await res.json();
      if (!res.ok || data.error) {
        console.error(`DB Error (${this.collection}):`, data?.error || res.statusText);
        return [];
      }
      return Array.isArray(data) ? data : [];
    } catch (e) {
      console.error(`Fetch Error (${this.collection}):`, e);
      return [];
    }
  }

  async get(id: string): Promise<T | undefined> {
    try {
      const res = await fetch(`/api/db/${this.collection}?id=${id}`);
      if (!res.ok) return undefined;
      const data = await res.json();
      return data?.error ? undefined : data;
    } catch (e) {
      return undefined;
    }
  }

  async add(data: T, silent = false): Promise<string> {
    await fetch(`/api/db/${this.collection}${silent ? '?silent=true' : ''}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return data.id;
  }

  async put(data: T, silent = false): Promise<string> {
    await fetch(`/api/db/${this.collection}${silent ? '?silent=true' : ''}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return data.id;
  }

  async update(id: string, changes: Partial<T>, silent = false): Promise<number> {
    const existing = await this.get(id);
    if (!existing) return 0;
    const updated = { ...existing, ...changes };
    await this.put(updated, silent);
    // Trigger a refresh event for useLiveQuery mock
    window.dispatchEvent(new CustomEvent(`db-update-${this.collection}`));
    return 1;
  }

  async delete(id: string, silent = false): Promise<void> {
    await fetch(`/api/db/${this.collection}?id=${id}${silent ? '&silent=true' : ''}`, { method: 'DELETE' });
    window.dispatchEvent(new CustomEvent(`db-update-${this.collection}`));
  }

  async count(): Promise<number> {
    const arr = await this.toArray();
    return arr.length;
  }

  async clear(silent = false): Promise<void> {
    const arr = await this.toArray();
    for (const item of arr) {
      await this.delete(item.id, silent);
    }
  }

  async bulkAdd(data: T[], silent = false): Promise<void> {
    for (const item of data) {
      await this.add(item, silent);
    }
    window.dispatchEvent(new CustomEvent(`db-update-${this.collection}`));
  }

  // Add more methods as needed by the UI
  orderBy(field: string) {
    return {
      reverse: () => ({
        toArray: async () => {
          const arr = await this.toArray();
          return arr.sort((a: any, b: any) => (a[field] < b[field] ? 1 : -1));
        }
      }),
      toArray: async () => {
        const arr = await this.toArray();
        return arr.sort((a: any, b: any) => (a[field] > b[field] ? 1 : -1));
      }
    };
  }
}

export const db = {
  members: new MongoTable<Member>('members'),
  forms: new MongoTable<OfficialForm>('forms'),
  settings: new MongoTable<Settings>('settings'),
};
