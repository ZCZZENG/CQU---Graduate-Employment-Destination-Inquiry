import { useState, useEffect, useCallback, useMemo } from 'react';
import type { DataRecord, FilterCriteria, FilterOptions, DataSourceType, DynamicFilterOption } from '@/types';
import { buildDynamicFilterOptions, cleanRows, parseFileToRows } from '@/lib/dataParser';

const initialFilters: FilterCriteria = {
  学部: '全部',
  学院: '全部',
  学历: '全部',
  毕业年度: '全部',
  去向类别: '全部',
  单位名称: '',
  人数最小值: null,
};

function buildFilterOptions(data: DataRecord[]): FilterOptions {
  return {
    faculties: ['全部', ...new Set(data.map((r) => String(r.学部 || '未知')))],
    colleges: ['全部', ...new Set(data.map((r) => String(r.学院 || '未知')))],
    degrees: ['全部', ...new Set(data.map((r) => String(r.学历 || '未知')))],
    years: Array.from(new Set(data.map((r) => Number(r.毕业年度 || 0)).filter((y) => y > 0))).sort((a, b) => b - a),
    categories: ['全部', ...new Set(data.map((r) => String(r.去向类别 || '未知')))],
  };
}

export function useData() {
  const [dataSource, setDataSource] = useState<DataSourceType>('cleaned');
  const [rawData, setRawData] = useState<DataRecord[]>([]);
  const [uploadedData, setUploadedData] = useState<DataRecord[]>([]);
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    faculties: [],
    colleges: [],
    degrees: [],
    years: [],
    categories: [],
  });
  const [dynamicFilterOptions, setDynamicFilterOptions] = useState<DynamicFilterOption[]>([]);
  const [extraFilters, setExtraFilters] = useState<Record<string, string>>({});
  const [uploadMessage, setUploadMessage] = useState('');
  const [filters, setFilters] = useState<FilterCriteria>(initialFilters);
  const [loading, setLoading] = useState(true);

  // 加载默认数据
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const dataUrl = dataSource === 'original' ? '/data/data_original.json' : '/data/data_cleaned.json';
        const dataRes = await fetch(dataUrl);
        const data = await dataRes.json();

        setRawData(data);
      } catch (error) {
        console.error('加载数据失败:', error);
      } finally {
        setLoading(false);
      }
    };

    if (dataSource !== 'uploaded') {
      loadData();
    }
  }, [dataSource]);

  const activeRawData = dataSource === 'uploaded' ? uploadedData : rawData;

  useEffect(() => {
    const options = buildFilterOptions(activeRawData);
    setFilterOptions(options);

    const dynamicOptions = buildDynamicFilterOptions(activeRawData);
    setDynamicFilterOptions(dynamicOptions);

    setExtraFilters((prev) => {
      const next: Record<string, string> = {};
      dynamicOptions.forEach((item) => {
        next[item.key] = prev[item.key] ?? '全部';
      });
      return next;
    });
  }, [activeRawData]);

  // 应用筛选
  const filteredData = useMemo(() => {
    return activeRawData.filter((record) => {
      if (filters.学部 !== '全部' && record.学部 !== filters.学部) return false;
      if (filters.学院 !== '全部' && record.学院 !== filters.学院) return false;
      if (filters.学历 !== '全部' && record.学历 !== filters.学历) return false;
      if (filters.毕业年度 !== '全部' && record.毕业年度 !== parseInt(filters.毕业年度, 10)) return false;
      if (filters.去向类别 !== '全部' && record.去向类别 !== filters.去向类别) return false;
      if (filters.单位名称 && !String(record.单位名称).includes(filters.单位名称)) return false;
      if (filters.人数最小值 !== null && record.人数 < filters.人数最小值) return false;

      const dynamicBlocked = Object.entries(extraFilters).some(([key, value]) => {
        if (value === '全部') return false;
        return String(record[key] ?? '') !== value;
      });

      return !dynamicBlocked;
    });
  }, [activeRawData, extraFilters, filters]);

  const updateFilter = useCallback((key: keyof FilterCriteria, value: string | number | null) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const updateExtraFilter = useCallback((key: string, value: string) => {
    setExtraFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(initialFilters);
    setExtraFilters((prev) => {
      const reset: Record<string, string> = {};
      Object.keys(prev).forEach((key) => {
        reset[key] = '全部';
      });
      return reset;
    });
  }, []);

  const toggleDataSource = useCallback(() => {
    setDataSource((prev) => (prev === 'cleaned' ? 'original' : 'cleaned'));
  }, []);

  const uploadFile = useCallback(async (file: File) => {
    setLoading(true);
    try {
      const rows = await parseFileToRows(file);
      const cleaned = cleanRows(rows);
      setUploadedData(cleaned);
      setDataSource('uploaded');
      setUploadMessage(`已加载 ${cleaned.length.toLocaleString()} 条数据（${file.name}）`);
      setFilters(initialFilters);
    } catch (error) {
      console.error(error);
      setUploadMessage('文件解析失败，请检查格式是否为 CSV 或可读的 Excel XML。');
    } finally {
      setLoading(false);
    }
  }, []);

  const statistics = useMemo(() => {
    const totalCount = filteredData.reduce((sum, r) => sum + r.人数, 0);
    const uniqueUnits = new Set(filteredData.map((r) => r.单位名称)).size;
    const uniqueColleges = new Set(filteredData.map((r) => r.学院)).size;

    return {
      totalCount,
      uniqueUnits,
      uniqueColleges,
      recordCount: filteredData.length,
    };
  }, [filteredData]);

  const dimensions = useMemo(() => {
    const keySet = new Set<string>();
    activeRawData.forEach((row) => {
      Object.keys(row).forEach((key) => {
        if (key !== '人数') keySet.add(key);
      });
    });
    return Array.from(keySet);
  }, [activeRawData]);

  return {
    data: filteredData,
    rawData: activeRawData,
    filters,
    extraFilters,
    filterOptions,
    dynamicFilterOptions,
    loading,
    dataSource,
    statistics,
    dimensions,
    uploadMessage,
    updateFilter,
    updateExtraFilter,
    resetFilters,
    toggleDataSource,
    uploadFile,
    setDataSource,
  };
}

export function useDataGrouping(data: DataRecord[]) {
  const groupBy = useCallback((dimension: string, metric: 'sum' | 'count' | 'percent' = 'sum') => {
    const map = new Map<string, number>();

    data.forEach((record) => {
      const key = String(record[dimension] || '未知');
      const value = Number(record.人数 || 0);
      map.set(key, (map.get(key) || 0) + value);
    });

    let result = Array.from(map.entries()).map(([name, value]) => ({
      name,
      value,
    }));

    result.sort((a, b) => b.value - a.value);

    if (metric === 'percent') {
      const total = result.reduce((sum, item) => sum + item.value, 0);
      result = result.map((item) => ({
        ...item,
        value: parseFloat(((item.value / total) * 100).toFixed(2)),
      }));
    }

    return result;
  }, [data]);

  const getTopN = useCallback((dimension: string, n = 20, category?: string) => {
    let filtered = data;
    if (category && category !== '全部') {
      filtered = data.filter((r) => r.去向类别 === category);
    }

    const map = new Map<string, number>();
    filtered.forEach((record) => {
      const key = String(record[dimension] || '未知');
      const value = Number(record.人数 || 0);
      map.set(key, (map.get(key) || 0) + value);
    });

    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, n);
  }, [data]);

  const crossAnalysis = useCallback((dim1: string, dim2: string) => {
    const result: Record<string, Record<string, number>> = {};

    data.forEach((record) => {
      const key1 = String(record[dim1] || '未知');
      const key2 = String(record[dim2] || '未知');

      if (!result[key1]) result[key1] = {};
      result[key1][key2] = (result[key1][key2] || 0) + record.人数;
    });

    return result;
  }, [data]);

  return { groupBy, getTopN, crossAnalysis };
}
