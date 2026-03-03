import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Filter, RotateCcw, Database } from 'lucide-react';
import type { FilterCriteria, FilterOptions, DataSourceType } from '@/types';

interface GlobalFiltersProps {
  filters: FilterCriteria;
  filterOptions: FilterOptions;
  dataSource: DataSourceType;
  onUpdateFilter: (key: keyof FilterCriteria, value: string | number | null) => void;
  onResetFilters: () => void;
  onToggleDataSource: () => void;
  statistics: {
    totalCount: number;
    uniqueUnits: number;
    uniqueColleges: number;
    recordCount: number;
  };
}

export function GlobalFilters({
  filters,
  filterOptions,
  dataSource,
  onUpdateFilter,
  onResetFilters,
  onToggleDataSource,
  statistics,
}: GlobalFiltersProps) {
  const activeFilterCount = Object.entries(filters).filter(([key, value]) => {
    if (key === '人数最小值') return value !== null;
    return value !== '全部' && value !== '';
  }).length;

  return (
    <Card className="shadow-sm border-slate-200">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-blue-600" />
            <CardTitle className="text-lg font-semibold text-slate-800">全局筛选</CardTitle>
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                {activeFilterCount} 个条件
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onToggleDataSource}
              className="gap-2"
            >
              <Database className="w-4 h-4" />
              {dataSource === 'cleaned' ? '清洗数据' : '原始数据'}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onResetFilters}
              className="gap-2 text-slate-600 hover:text-slate-900"
            >
              <RotateCcw className="w-4 h-4" />
              重置
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          {/* 学部筛选 */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-slate-600">学部</Label>
            <Select
              value={filters.学部}
              onValueChange={(value) => onUpdateFilter('学部', value)}
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {filterOptions.faculties.map((faculty) => (
                  <SelectItem key={faculty} value={faculty} className="text-sm">
                    {faculty}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 学院筛选 */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-slate-600">学院</Label>
            <Select
              value={filters.学院}
              onValueChange={(value) => onUpdateFilter('学院', value)}
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {filterOptions.colleges.map((college) => (
                  <SelectItem key={college} value={college} className="text-sm">
                    {college}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 学历筛选 */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-slate-600">学历</Label>
            <Select
              value={filters.学历}
              onValueChange={(value) => onUpdateFilter('学历', value)}
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {filterOptions.degrees.map((degree) => (
                  <SelectItem key={degree} value={degree} className="text-sm">
                    {degree}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 毕业年度筛选 */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-slate-600">毕业年度</Label>
            <Select
              value={filters.毕业年度}
              onValueChange={(value) => onUpdateFilter('毕业年度', value)}
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="全部" className="text-sm">全部</SelectItem>
                {filterOptions.years.map((year) => (
                  <SelectItem key={year} value={String(year)} className="text-sm">
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 去向类别筛选 */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-slate-600">去向类别</Label>
            <Select
              value={filters.去向类别}
              onValueChange={(value) => onUpdateFilter('去向类别', value)}
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {filterOptions.categories.map((category) => (
                  <SelectItem key={category} value={category} className="text-sm">
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 单位名称搜索 */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-slate-600">单位名称</Label>
            <Input
              type="text"
              placeholder="搜索单位..."
              value={filters.单位名称}
              onChange={(e) => onUpdateFilter('单位名称', e.target.value)}
              className="h-9 text-sm"
            />
          </div>

          {/* 人数最小值 */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-slate-600">人数 ≥</Label>
            <Input
              type="number"
              placeholder="最小值"
              value={filters.人数最小值 || ''}
              onChange={(e) => {
                const value = e.target.value ? parseInt(e.target.value) : null;
                onUpdateFilter('人数最小值', value);
              }}
              className="h-9 text-sm"
              min={1}
            />
          </div>
        </div>

        {/* 统计信息 */}
        <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">总人数:</span>
            <span className="text-sm font-semibold text-blue-600">
              {statistics.totalCount.toLocaleString()}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">单位数:</span>
            <span className="text-sm font-semibold text-green-600">
              {statistics.uniqueUnits}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">学院数:</span>
            <span className="text-sm font-semibold text-purple-600">
              {statistics.uniqueColleges}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">记录数:</span>
            <span className="text-sm font-semibold text-slate-700">
              {statistics.recordCount.toLocaleString()}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
