'use client';

import { useEffect, useState } from 'react';
import { syncQueue } from '@/lib/syncQueue';

export const useSyncOnMount = () => {
    const [synced, setSynced] = useState(false);

    useEffect(() => {
        const runSync = async () => {
            const result = await syncQueue();
            if (result.success) {
                setSynced(true);
            }
        };
        runSync();
    }, []);

    return synced;
};