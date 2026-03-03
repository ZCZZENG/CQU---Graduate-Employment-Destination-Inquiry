import { useData } from '@/hooks/useData';
import { GlobalFilters } from '@/components/GlobalFilters';
import { ChartManager } from '@/components/ChartManager';
import { DataTable } from '@/components/DataTable';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  BarChart3, 
  Table2, 
  GraduationCap, 
  Database,
  LayoutDashboard,
  Filter
} from 'lucide-react';

function App() {
  const {
    data,
    filters,
    filterOptions,
    loading,
    dataSource,
    statistics,
    updateFilter,
    resetFilters,
    toggleDataSource,
  } = useData();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-32 w-full" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Skeleton className="h-80" />
            <Skeleton className="h-80" />
            <Skeleton className="h-80" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* 顶部导航栏 */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-blue-600 to-indigo-600 p-2 rounded-lg">
                <GraduationCap className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">
                  毕业去向数据仪表盘
                </h1>
                <p className="text-xs text-slate-500">
                  重庆大学毕业生就业数据分析系统
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="hidden md:flex items-center gap-2 text-sm text-slate-600">
                <Database className="w-4 h-4" />
                <span>当前数据源:</span>
                <span className={`font-medium ${
                  dataSource === 'cleaned' ? 'text-blue-600' : 'text-green-600'
                }`}>
                  {dataSource === 'cleaned' ? '清洗后数据' : '原始数据'}
                </span>
                <span className="text-slate-400">
                  ({statistics.recordCount.toLocaleString()} 条记录)
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* 主内容区 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="space-y-6">
          {/* 全局筛选 */}
          <GlobalFilters
            filters={filters}
            filterOptions={filterOptions}
            dataSource={dataSource}
            onUpdateFilter={updateFilter}
            onResetFilters={resetFilters}
            onToggleDataSource={toggleDataSource}
            statistics={statistics}
          />

          {/* 标签页内容 */}
          <Tabs defaultValue="charts" className="space-y-4">
            <TabsList className="bg-white border border-slate-200 p-1">
              <TabsTrigger 
                value="charts" 
                className="gap-2 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700"
              >
                <LayoutDashboard className="w-4 h-4" />
                <span className="hidden sm:inline">图表分析</span>
                <span className="sm:hidden">图表</span>
              </TabsTrigger>
              <TabsTrigger 
                value="table"
                className="gap-2 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700"
              >
                <Table2 className="w-4 h-4" />
                <span className="hidden sm:inline">明细数据</span>
                <span className="sm:hidden">数据</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="charts" className="space-y-4">
              {/* 快速统计卡片 */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard
                  title="总人数"
                  value={statistics.totalCount.toLocaleString()}
                  icon={<GraduationCap className="w-5 h-5 text-blue-600" />}
                  color="blue"
                />
                <StatCard
                  title="单位数"
                  value={statistics.uniqueUnits.toLocaleString()}
                  icon={<Database className="w-5 h-5 text-green-600" />}
                  color="green"
                />
                <StatCard
                  title="学院数"
                  value={statistics.uniqueColleges.toString()}
                  icon={<BarChart3 className="w-5 h-5 text-purple-600" />}
                  color="purple"
                />
                <StatCard
                  title="记录数"
                  value={statistics.recordCount.toLocaleString()}
                  icon={<Filter className="w-5 h-5 text-amber-600" />}
                  color="amber"
                />
              </div>

              {/* 图表管理器 */}
              <ChartManager data={data} />
            </TabsContent>

            <TabsContent value="table">
              <DataTable data={data} />
            </TabsContent>
          </Tabs>
        </div>
      </main>

      {/* 页脚 */}
      <footer className="bg-white border-t border-slate-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-slate-500">
              毕业去向数据分析系统 · 数据仅供参考
            </p>
            <p className="text-xs text-slate-400">
              最新更新时间: 2026/3/1
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

// 统计卡片组件
interface StatCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  color: 'blue' | 'green' | 'purple' | 'amber';
}

function StatCard({ title, value, icon, color }: StatCardProps) {
  const colorClasses = {
    blue: 'bg-blue-50 border-blue-100',
    green: 'bg-green-50 border-green-100',
    purple: 'bg-purple-50 border-purple-100',
    amber: 'bg-amber-50 border-amber-100',
  };

  return (
    <Card className={`${colorClasses[color]} border`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-600 mb-1">{title}</p>
            <p className="text-2xl font-bold text-slate-900">{value}</p>
          </div>
          <div className="p-2 bg-white rounded-lg shadow-sm">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default App;
