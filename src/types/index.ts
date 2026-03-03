// 数据记录类型
export interface DataRecord {
  学部: string;
  学院: string;
  学历: string;
  毕业年度: number;
  去向类别: string;
  单位名称: string;
  人数: number;
}

// 筛选条件类型
export interface FilterCriteria {
  学部: string;
  学院: string;
  学历: string;
  毕业年度: string;
  去向类别: string;
  单位名称: string;
  人数最小值: number | null;
}

// 图表配置类型
export interface ChartConfig {
  id: string;
  type: 'bar' | 'line' | 'pie';
  title: string;
  xAxis?: string;
  yAxis?: string;
  dimension: string;
  metric: 'sum' | 'count' | 'percent';
}

// 数据源类型
export type DataSourceType = 'cleaned' | 'original';

// 筛选选项类型
export interface FilterOptions {
  faculties: string[];
  colleges: string[];
  degrees: string[];
  years: number[];
  categories: string[];
}

// TOP20配置类型
export interface Top20Config {
  id: string;
  title: string;
  category: string; // '升学' | '就业' | '全部'
  filterCriteria?: Partial<FilterCriteria>;
}

// 图表数据类型
export interface ChartData {
  name: string;
  value: number;
  percent?: number;
}
