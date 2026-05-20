import { DeletedItem, syncDeleted } from './api';

const SYNC_QUEUE_KEY = 'deleted_logs';

export const getSyncQueue = (): DeletedItem[] => {
    if (typeof window === 'undefined') return [];
    const stored = localStorage.getItem(SYNC_QUEUE_KEY);
    return stored ? JSON.parse(stored) : [];
};

export const addToSyncQueue = (item: DeletedItem): void => {
    const queue = getSyncQueue();
    queue.push({ ...item, timestamp: Date.now() });
    localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
};

export const clearSyncQueue = (): void => {
    localStorage.removeItem(SYNC_QUEUE_KEY);
};

export const syncQueue = async (): Promise<{ success: boolean; processed: number[] }> => {
    const queue = getSyncQueue();
    if (queue.length === 0) {
        return { success: true, processed: [] };
    }

    try {
        const response = await syncDeleted(queue);
        if (response.notFound.length === 0) {
            clearSyncQueue();
            return { success: true, processed: response.processed };
        }
        return { success: true, processed: response.processed };
    } catch (error) {
        console.error('Sync failed:', error);
        return { success: false, processed: [] };
    }
};