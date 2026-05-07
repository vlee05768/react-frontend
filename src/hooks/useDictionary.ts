import { useQuery } from '@tanstack/react-query';
import { DICTIONARY_REGISTRY } from '@/config/dictionaryRegistry';
import type { DictKey } from '@/config/dictionaryRegistry';

export const useDictionary = (dictKey: DictKey) => {
  return useQuery({
    queryKey: ['dictionary', dictKey],
    queryFn: DICTIONARY_REGISTRY[dictKey].queryFn,
    staleTime: Infinity, // 取回後永不過期，只有主動 refetch 才會更新
    refetchOnWindowFocus: false,
  });
};
