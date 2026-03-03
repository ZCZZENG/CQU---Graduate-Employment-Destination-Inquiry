import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, BarChart3, LineChart, PieChart, Trophy } from 'lucide-react';
import { ConfigurableChart } from './ConfigurableChart';
import { Top20Chart } from './Top20Chart';
import type { DataRecord } from '@/types';

interface ChartManagerProps {
  data: DataRecord[];
}

type ChartItem = {
  id: string;
  type: 'bar' | 'line' | 'pie' | 'top20';
};

const dimensions = ['学部', '学院', '学历', '毕业年度', '去向类别', '单位名称'];

export function ChartManager({ data }: ChartManagerProps) {
  const [charts, setCharts] = useState<ChartItem[]>([
    { id: 'chart-1', type: 'bar' },
    { id: 'chart-2', type: 'pie' },
    { id: 'chart-3', type: 'top20' },
  ]);

  const addChart = useCallback((type: ChartItem['type']) => {
    const newChart: ChartItem = {
      id: `chart-${Date.now()}`,
      type,
    };
    setCharts((prev) => [...prev, newChart]);
  }, []);

  const removeChart = useCallback((id: string) => {
    setCharts((prev) => prev.filter((chart) => chart.id !== id));
  }, []);

  return (
    <div className="space-y-4">
      {/* 添加图表按钮组 */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-slate-500 mr-2">添加图表:</span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => addChart('bar')}
          className="gap-2"
        >
          <BarChart3 className="w-4 h-4 text-blue-600" />
          柱状图
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => addChart('line')}
          className="gap-2"
        >
          <LineChart className="w-4 h-4 text-green-600" />
          折线图
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => addChart('pie')}
          className="gap-2"
        >
          <PieChart className="w-4 h-4 text-purple-600" />
          饼图
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => addChart('top20')}
          className="gap-2"
        >
          <Trophy className="w-4 h-4 text-amber-500" />
          TOP20
        </Button>
      </div>

      {/* 图表网格 */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {charts.map((chart) => {
          if (chart.type === 'top20') {
            return (
              <Top20Chart
                key={chart.id}
                id={chart.id}
                data={data}
                onRemove={removeChart}
              />
            );
          }
          return (
            <ConfigurableChart
              key={chart.id}
              id={chart.id}
              data={data}
              dimensions={dimensions}
              onRemove={removeChart}
            />
          );
        })}
      </div>

      {charts.length === 0 && (
        <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-lg">
          <Plus className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500 mb-2">还没有添加任何图表</p>
          <p className="text-sm text-slate-400">点击上方按钮添加图表</p>
        </div>
      )}
    </div>
  );
}
