'use client';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { PaginationState, SortingState, Updater } from '@tanstack/react-table';
import { useEffect, useState } from 'react';

export function useServerTable(total: number, defaultSort = 'dateNow', defaultDesc = true) {
  const router = useRouter(), pathname = usePathname(), params = useSearchParams();
  const page = Math.max(1, Number(params.get('page')) || 1);
  const limit = Math.min(100, Math.max(1, Number(params.get('limit')) || 25));
  const pagination = { pageIndex: page - 1, pageSize: limit };
  const sorting = [{ id: params.get('sort') || defaultSort, desc: params.get('direction') ? params.get('direction') !== 'ASC' : defaultDesc }];
  const remoteSearch = params.get('search') || params.get('lastName') || '';
  const [search, setSearch] = useState(remoteSearch);
  useEffect(() => { setSearch(remoteSearch); }, [remoteSearch]);
  useEffect(() => {
    if (search === remoteSearch) return;
    const timer = setTimeout(() => update({ search, lastName: '', page: '1' }), 300);
    return () => clearTimeout(timer);
  }, [search, remoteSearch, params.toString()]);
  const update = (values: Record<string, string>) => {
    const next = new URLSearchParams(params.toString());
    Object.entries(values).forEach(([key, value]) => value ? next.set(key, value) : next.delete(key));
    router.replace(pathname + '?' + next.toString(), { scroll: false });
  };
  return {
    pagination, sorting, search,
    searchChange: setSearch,
    options: { manualPagination: true, manualFiltering: true, manualSorting: true, rowCount: total,
      onPaginationChange: (updater: Updater<PaginationState>) => { const next = typeof updater === 'function' ? updater(pagination) : updater; update({ page: String(next.pageSize !== limit ? 1 : next.pageIndex + 1), limit: String(next.pageSize) }); },
      onSortingChange: (updater: Updater<SortingState>) => { const next = typeof updater === 'function' ? updater(sorting) : updater; update({ sort: next[0]?.id || defaultSort, direction: next[0]?.desc === false ? 'ASC' : 'DESC', page: '1' }); },
    },
  };
}
