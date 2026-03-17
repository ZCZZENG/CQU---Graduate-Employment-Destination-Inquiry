import { useState, useMemo, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { X, Settings, BarChart3, LineChart, PieChart, GripVertical } from 'lucide-react';
import * as echarts from 'echarts';
import type { DataRecord } from '@/types';

interface ConfigurableChartProps {
  id: string;
  data: DataRecord[];
  dimensions: string[];
  onRemove: (id: string) => void;
}

interface ChartConfig {
  type: 'bar' | 'line' | 'pie';
  title: string;
  dimension: string;
  metric: 'sum' | 'percent';
  xAxisLabel: string;
  yAxisLabel: string;
}

const defaultConfig: ChartConfig = {
  type: 'bar',
  title: '新建图表',
  dimension: '学部',
  metric: 'sum',
  xAxisLabel: '维度',
  yAxisLabel: '人数',
};

export function ConfigurableChart({ id, data, dimensions, onRemove }: ConfigurableChartProps) {
  const [config, setConfig] = useState<ChartConfig>(defaultConfig);
  const [showSettings, setShowSettings] = useState(true);
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!dimensions.includes(config.dimension) && dimensions.length > 0) {
      setConfig((prev) => ({ ...prev, dimension: dimensions[0] }));
    }
  }, [config.dimension, dimensions]);

  // 初始化图表
  useEffect(() => {
    if (chartRef.current) {
      chartInstance.current = echarts.init(chartRef.current);
      
      const handleResize = () => {
        chartInstance.current?.resize();
      };
      
      window.addEventListener('resize', handleResize);
      return () => {
        window.removeEventListener('resize', handleResize);
        chartInstance.current?.dispose();
      };
    }
  }, []);

  // 处理数据
  const chartData = useMemo(() => {
    const map = new Map<string, number>();
    
    data.forEach((record) => {
      const key = (record as any)[config.dimension] || '未知';
      const value = record.人数 || 0;
      map.set(key, (map.get(key) || 0) + value);
    });

    let result = Array.from(map.entries()).map(([name, value]) => ({
      name,
      value,
    }));

    // 按值降序排序
    result.sort((a, b) => b.value - a.value);

    // 限制显示数量
    if (result.length > 20) {
      const top20 = result.slice(0, 20);
      const others = result.slice(20);
      const othersSum = others.reduce((sum, item) => sum + item.value, 0);
      result = [...top20, { name: '其他', value: othersSum }];
    }

    // 计算百分比
    if (config.metric === 'percent') {
      const total = result.reduce((sum, item) => sum + item.value, 0);
      result = result.map((item) => ({
        ...item,
        value: parseFloat(((item.value / total) * 100).toFixed(2)),
      }));
    }

    return result;
  }, [data, config.dimension, config.metric]);

  // 更新图表
  useEffect(() => {
    if (!chartInstance.current) return;

    const isPie = config.type === 'pie';
    const yAxisName = config.metric === 'percent' ? '占比(%)' : config.yAxisLabel;

    const option: echarts.EChartsOption = {
      title: {
        text: config.title,
        left: 'center',
        top: 10,
        textStyle: {
          fontSize: 14,
          fontWeight: 'normal',
        },
      },
      tooltip: {
        trigger: isPie ? 'item' : 'axis',
        formatter: config.metric === 'percent' 
          ? '{b}: {c}%' 
          : isPie ? '{b}: {c}人 ({d}%)' : '{b}: {c}人',
      },
      legend: isPie ? {
        type: 'scroll',
        orient: 'vertical',
        right: 10,
        top: 40,
        bottom: 20,
      } : undefined,
      grid: isPie ? undefined : {
        left: '3%',
        right: '4%',
        bottom: '15%',
        top: '20%',
        containLabel: true,
      },
      xAxis: isPie ? undefined : {
        type: 'category',
        data: chartData.map((d) => d.name),
        axisLabel: {
          rotate: 45,
          interval: 0,
          fontSize: 10,
        },
        name: config.xAxisLabel,
        nameLocation: 'middle',
        nameGap: 30,
      },
      yAxis: isPie ? undefined : {
        type: 'value',
        name: yAxisName,
        nameTextStyle: {
          padding: [0, 0, 0, 20],
        },
      },
      series: [
        {
          type: config.type,
          data: isPie 
            ? chartData.map((d) => ({ name: d.name, value: d.value }))
            : chartData.map((d) => d.value),
          radius: isPie ? ['40%', '70%'] : undefined,
          center: isPie ? ['40%', '55%'] : undefined,
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: 'rgba(0, 0, 0, 0.5)',
            },
          },
          label: isPie ? {
            show: false,
          } : undefined,
        },
      ],
      color: [
        '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
        '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1',
        '#14b8a6', '#eab308', '#f43f5e', '#a855f7', '#22d3ee',
      ],
    };

    chartInstance.current.setOption(option, true);
  }, [chartData, config]);

  const updateConfig = (key: keyof ChartConfig, value: string) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <Card className="shadow-sm border-slate-200 h-full flex flex-col">
      <CardHeader className="pb-2 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GripVertical className="w-4 h-4 text-slate-400 cursor-move" />
            {config.type === 'bar' && <BarChart3 className="w-4 h-4 text-blue-600" />}
            {config.type === 'line' && <LineChart className="w-4 h-4 text-green-600" />}
            {config.type === 'pie' && <PieChart className="w-4 h-4 text-purple-600" />}
            <CardTitle className="text-sm font-medium text-slate-700">
              {config.title}
            </CardTitle>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setShowSettings(!showSettings)}
            >
              <Settings className="w-4 h-4 text-slate-500" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => onRemove(id)}
            >
              <X className="w-4 h-4 text-slate-500" />
            </Button>
          </div>
        </div>
      </CardHeader>

      {showSettings && (
        <CardContent className="pb-2 pt-0 border-b border-slate-100 flex-shrink-0">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="space-y-1">
              <Label className="text-xs text-slate-500">图表类型</Label>
              <Select
                value={config.type}
                onValueChange={(value) => updateConfig('type', value as 'bar' | 'line' | 'pie')}
              >
                <SelectTrigger className="h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bar" className="text-xs">柱状图</SelectItem>
                  <SelectItem value="line" className="text-xs">折线图</SelectItem>
                  <SelectItem value="pie" className="text-xs">饼图</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-slate-500">维度</Label>
              <Select
                value={config.dimension}
                onValueChange={(value) => updateConfig('dimension', value)}
              >
                <SelectTrigger className="h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {dimensions.map((dim) => (
                    <SelectItem key={dim} value={dim} className="text-xs">
                      {dim}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-slate-500">指标</Label>
              <Select
                value={config.metric}
                onValueChange={(value) => updateConfig('metric', value as 'sum' | 'percent')}
              >
                <SelectTrigger className="h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sum" className="text-xs">人数</SelectItem>
                  <SelectItem value="percent" className="text-xs">占比(%)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-slate-500">标题</Label>
              <Input
                type="text"
                value={config.title}
                onChange={(e) => updateConfig('title', e.target.value)}
                className="h-7 text-xs"
              />
            </div>

            {config.type !== 'pie' && (
              <>
                <div className="space-y-1">
                  <Label className="text-xs text-slate-500">X轴名称</Label>
                  <Input
                    type="text"
                    value={config.xAxisLabel}
                    onChange={(e) => updateConfig('xAxisLabel', e.target.value)}
                    className="h-7 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs text-slate-500">Y轴名称</Label>
                  <Input
                    type="text"
                    value={config.yAxisLabel}
                    onChange={(e) => updateConfig('yAxisLabel', e.target.value)}
                    className="h-7 text-xs"
                  />
                </div>
              </>
            )}
          </div>
        </CardContent>
      )}

      <CardContent className="flex-1 pt-2 min-h-0">
        <div ref={chartRef} className="w-full h-[280px]" />
      </CardContent>
    </Card>
  );
}
