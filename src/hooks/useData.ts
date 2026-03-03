import { useState, useEffect, useCallback, useMemo } from 'react';
import type { DataRecord, FilterCriteria, FilterOptions, DataSourceType } from '@/types';

const initialFilters: FilterCriteria = {
  学部: '全部',
  学院: '全部',
  学历: '全部',
  毕业年度: '全部',
  去向类别: '全部',
  单位名称: '',
  人数最小值: null,
};

export function useData() {
  const [dataSource, setDataSource] = useState<DataSourceType>('cleaned');
  const [rawData, setRawData] = useState<DataRecord[]>([]);
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    faculties: [],
    colleges: [],
    degrees: [],
    years: [],
    categories: [],
  });
  const [filters, setFilters] = useState<FilterCriteria>(initialFilters);
  const [loading, setLoading] = useState(true);

  // 加载数据
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const dataUrl = dataSource === 'cleaned' 
          ? '/data/data_cleaned.json' 
          : '/data/data_original.json';
        
        const [dataRes, optionsRes] = await Promise.all([
          fetch(dataUrl),
          fetch('/data/filter_options.json'),
        ]);

        const data = await dataRes.json();
        const options = await optionsRes.json();

        setRawData(data);
        setFilterOptions({
          faculties: ['全部', ...options.faculties],
          colleges: ['全部', ...options.colleges],
          degrees: ['全部', ...options.degrees],
          years: options.years,
          categories: ['全部', ...options.categories],
        });
      } catch (error) {
        console.error('加载数据失败:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [dataSource]);

  // 应用筛选
  const filteredData = useMemo(() => {
    return rawData.filter((record) => {
      // 学部筛选
      if (filters.学部 !== '全部' && record.学部 !== filters.学部) return false;
      
      // 学院筛选
      if (filters.学院 !== '全部' && record.学院 !== filters.学院) return false;
      
      // 学历筛选
      if (filters.学历 !== '全部' && record.学历 !== filters.学历) return false;
      
      // 毕业年度筛选
      if (filters.毕业年度 !== '全部' && record.毕业年度 !== parseInt(filters.毕业年度)) return false;
      
      // 去向类别筛选
      if (filters.去向类别 !== '全部' && record.去向类别 !== filters.去向类别) return false;
      
      // 单位名称筛选
      if (filters.单位名称 && !record.单位名称.includes(filters.单位名称)) return false;
      
      // 人数最小值筛选
      if (filters.人数最小值 !== null && record.人数 < filters.人数最小值) return false;
      
      return true;
    });
  }, [rawData, filters]);

  // 更新单个筛选条件
  const updateFilter = useCallback((key: keyof FilterCriteria, value: string | number | null) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  // 重置筛选
  const resetFilters = useCallback(() => {
    setFilters(initialFilters);
  }, []);

  // 切换数据源
  const toggleDataSource = useCallback(() => {
    setDataSource((prev) => (prev === 'cleaned' ? 'original' : 'cleaned'));
  }, []);

  // 统计数据
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

  return {
    data: filteredData,
    rawData,
    filters,
    filterOptions,
    loading,
    dataSource,
    statistics,
    updateFilter,
    resetFilters,
    toggleDataSource,
    setDataSource,
  };
}

// 数据分组聚合钩子
export function useDataGrouping(data: DataRecord[]) {
  // 按维度分组并计算指标
  const groupBy = useCallback((dimension: string, metric: 'sum' | 'count' | 'percent' = 'sum') => {
    const map = new Map<string, number>();
    
    data.forEach((record) => {
      const key = (record as any)[dimension] || '未知';
      const value = record.人数 || 0;
      map.set(key, (map.get(key) || 0) + value);
    });

    let result = Array.from(map.entries()).map(([name, value]) => ({
      name,
      value,
    }));

    // 按值降序排序
    result.sort((a, b) => b.value - a.value);

    // 计算百分比
    if (metric === 'percent') {
      const total = result.reduce((sum, item) => sum + item.value, 0);
      result = result.map((item) => ({
        ...item,
        value: parseFloat(((item.value / total) * 100).toFixed(2)),
      }));
    }

    return result;
  }, [data]);

  // 获取TOP N数据
  const getTopN = useCallback((dimension: string, n: number = 20, category?: string) => {
    let filtered = data;
    if (category && category !== '全部') {
      filtered = data.filter((r) => r.去向类别 === category || (category === '升学' && r.去向类别 === '升学') || (category === '就业' && r.去向类别 === '就业'));
    }
    
    const map = new Map<string, number>();
    filtered.forEach((record) => {
      const key = (record as any)[dimension] || '未知';
      const value = record.人数 || 0;
      map.set(key, (map.get(key) || 0) + value);
    });

    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, n);
  }, [data]);

  // 按两个维度交叉分析
  const crossAnalysis = useCallback((dim1: string, dim2: string) => {
    const result: Record<string, Record<string, number>> = {};
    
    data.forEach((record) => {
      const key1 = (record as any)[dim1] || '未知';
      const key2 = (record as any)[dim2] || '未知';
      
      if (!result[key1]) result[key1] = {};
      result[key1][key2] = (result[key1][key2] || 0) + record.人数;
    });

    return result;
  }, [data]);

  return { groupBy, getTopN, crossAnalysis };
}
