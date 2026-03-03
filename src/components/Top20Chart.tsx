import { useState, useMemo, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { X, Settings, Trophy, GripVertical } from 'lucide-react';
import * as echarts from 'echarts';
import type { DataRecord } from '@/types';

interface Top20ChartProps {
  id: string;
  data: DataRecord[];
  onRemove: (id: string) => void;
}

interface Top20Config {
  title: string;
  category: string;
  dimension: string;
  topN: number;
}

const defaultConfig: Top20Config = {
  title: 'TOP20 排行',
  category: '全部',
  dimension: '单位名称',
  topN: 20,
};

export function Top20Chart({ id, data, onRemove }: Top20ChartProps) {
  const [config, setConfig] = useState<Top20Config>(defaultConfig);
  const [showSettings, setShowSettings] = useState(true);
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);

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
    let filtered = data;
    
    // 按去向类别筛选
    if (config.category !== '全部') {
      if (config.category === '升学') {
        filtered = data.filter((r) => r.去向类别 === '升学');
      } else if (config.category === '就业') {
        filtered = data.filter((r) => r.去向类别 === '就业');
      } else if (config.category === '出国(境)') {
        filtered = data.filter((r) => r.去向类别 === '出国(境)留学或工作');
      } else if (config.category === '选调生') {
        filtered = data.filter((r) => r.去向类别 === '选调生');
      }
    }
    
    const map = new Map<string, number>();
    filtered.forEach((record) => {
      const key = (record as any)[config.dimension] || '未知';
      const value = record.人数 || 0;
      map.set(key, (map.get(key) || 0) + value);
    });

    const result = Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, config.topN);

    return result;
  }, [data, config]);

  // 更新图表
  useEffect(() => {
    if (!chartInstance.current) return;

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
        trigger: 'axis',
        axisPointer: {
          type: 'shadow',
        },
        formatter: '{b}: {c}人',
      },
      grid: {
        left: '3%',
        right: '8%',
        bottom: '5%',
        top: '15%',
        containLabel: true,
      },
      xAxis: {
        type: 'value',
        name: '人数',
        axisLabel: {
          fontSize: 10,
        },
      },
      yAxis: {
        type: 'category',
        data: chartData.map((d) => d.name).reverse(),
        axisLabel: {
          fontSize: 10,
          width: 120,
          overflow: 'truncate',
        },
      },
      series: [
        {
          type: 'bar',
          data: chartData.map((d) => d.value).reverse(),
          itemStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
              { offset: 0, color: '#3b82f6' },
              { offset: 1, color: '#60a5fa' },
            ]),
            borderRadius: [0, 4, 4, 0],
          },
          label: {
            show: true,
            position: 'right',
            formatter: '{c}',
            fontSize: 10,
          },
          emphasis: {
            itemStyle: {
              color: '#2563eb',
            },
          },
        },
      ],
    };

    chartInstance.current.setOption(option, true);
  }, [chartData, config]);

  const updateConfig = (key: keyof Top20Config, value: string | number) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <Card className="shadow-sm border-slate-200 h-full flex flex-col">
      <CardHeader className="pb-2 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GripVertical className="w-4 h-4 text-slate-400 cursor-move" />
            <Trophy className="w-4 h-4 text-amber-500" />
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
              <Label className="text-xs text-slate-500">标题</Label>
              <Input
                type="text"
                value={config.title}
                onChange={(e) => updateConfig('title', e.target.value)}
                className="h-7 text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-slate-500">去向类别</Label>
              <Select
                value={config.category}
                onValueChange={(value) => updateConfig('category', value)}
              >
                <SelectTrigger className="h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="全部" className="text-xs">全部</SelectItem>
                  <SelectItem value="升学" className="text-xs">升学</SelectItem>
                  <SelectItem value="就业" className="text-xs">就业</SelectItem>
                  <SelectItem value="出国(境)" className="text-xs">出国(境)</SelectItem>
                  <SelectItem value="选调生" className="text-xs">选调生</SelectItem>
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
                  <SelectItem value="单位名称" className="text-xs">单位名称</SelectItem>
                  <SelectItem value="学院" className="text-xs">学院</SelectItem>
                  <SelectItem value="学部" className="text-xs">学部</SelectItem>
                  <SelectItem value="学历" className="text-xs">学历</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-slate-500">显示数量</Label>
              <Input
                type="number"
                value={config.topN}
                onChange={(e) => updateConfig('topN', parseInt(e.target.value) || 20)}
                className="h-7 text-xs"
                min={5}
                max={50}
              />
            </div>
          </div>
        </CardContent>
      )}

      <CardContent className="flex-1 pt-2 min-h-0">
        <div ref={chartRef} className="w-full h-[320px]" />
      </CardContent>
    </Card>
  );
}
