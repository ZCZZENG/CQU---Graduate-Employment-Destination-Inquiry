import { useData } from '@/hooks/useData';
import { GlobalFilters } from '@/components/GlobalFilters';
import { ChartManager } from '@/components/ChartManager';
import { DataTable } from '@/components/DataTable';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import {
  BarChart3,
  Table2,
  GraduationCap,
  Database,
  LayoutDashboard,
  Users,
  Building2,
  BookOpen,
  FileText
} from 'lucide-react';

function App() {
  const {
    data,
    filters,
    filterOptions,
    dynamicFilterOptions,
    extraFilters,
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
    <div className="min-h-screen" style={{ background: '#f4f6fa' }}>

      {/* Hero 横幅 */}
      <header style={{ background: 'linear-gradient(135deg, #003d82 0%, #1a5ca8 60%, #0f4a94 100%)' }}>
        {/* 顶部细条：数据源指示 */}
        <div className="border-b border-white/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-9 flex items-center justify-end gap-3">
            <div className="flex items-center gap-2 text-xs text-white/70">
              <Database className="w-3.5 h-3.5" />
              <span>数据源:</span>
              <span className="text-white font-medium">
                {dataSource === 'cleaned' ? '清洗后数据' : dataSource === 'original' ? '原始数据' : '上传数据'}
              </span>
              <span className="text-white/50">· {statistics.recordCount.toLocaleString()} 条记录</span>
            </div>
          </div>
        </div>

        {/* 主 Hero 区 */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            {/* 左：标题 + 描述 */}
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20">
                <GraduationCap className="w-8 h-8 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium tracking-widest uppercase px-2 py-0.5 rounded-full border border-white/30 text-white/80">
                    重庆大学
                  </span>
                </div>
                <h1 className="text-2xl font-bold text-white leading-tight">
                  毕业去向数据仪表盘
                </h1>
                <p className="text-sm text-white/60 mt-0.5">
                  2021 – 2023 届毕业生就业数据分析系统
                </p>
              </div>
            </div>

            {/* 右：4 个核心指标 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
              <HeroStat label="毕业人数" value={statistics.totalCount.toLocaleString()} icon={<Users className="w-4 h-4" />} />
              <HeroStat label="就业单位" value={statistics.uniqueUnits.toLocaleString()} icon={<Building2 className="w-4 h-4" />} />
              <HeroStat label="覆盖学院" value={statistics.uniqueColleges.toString()} icon={<BookOpen className="w-4 h-4" />} />
              <HeroStat label="数据记录" value={statistics.recordCount.toLocaleString()} icon={<FileText className="w-4 h-4" />} />
            </div>
          </div>
        </div>

        {/* 金色底边装饰线 */}
        <div style={{ height: '3px', background: 'linear-gradient(90deg, #c8a951, #e0c270, #c8a951)' }} />
      </header>

      {/* 主内容区 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="space-y-6">
          {/* 全局筛选 */}
          <GlobalFilters
            filters={filters}
            filterOptions={filterOptions}
            dynamicFilterOptions={dynamicFilterOptions}
            extraFilters={extraFilters}
            dataSource={dataSource}
            onUpdateFilter={updateFilter}
            onResetFilters={resetFilters}
            onUpdateExtraFilter={updateExtraFilter}
            onToggleDataSource={toggleDataSource}
            onUploadFile={uploadFile}
            uploadMessage={uploadMessage}
            statistics={statistics}
          />

          {/* 标签页内容 */}
          <Tabs defaultValue="charts" className="space-y-4">
            <TabsList className="bg-white border border-slate-200 p-1 shadow-sm">
              <TabsTrigger
                value="charts"
                className="gap-2 data-[state=active]:bg-[#003d82] data-[state=active]:text-white"
              >
                <LayoutDashboard className="w-4 h-4" />
                <span className="hidden sm:inline">图表分析</span>
                <span className="sm:hidden">图表</span>
              </TabsTrigger>
              <TabsTrigger
                value="table"
                className="gap-2 data-[state=active]:bg-[#003d82] data-[state=active]:text-white"
              >
                <Table2 className="w-4 h-4" />
                <span className="hidden sm:inline">明细数据</span>
                <span className="sm:hidden">数据</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="charts" className="space-y-4">
              <ChartManager data={data} dimensions={dimensions} />
            </TabsContent>

            <TabsContent value="table">
              <DataTable data={data} />
            </TabsContent>
          </Tabs>
        </div>
      </main>

      {/* 页脚 */}
      <footer className="bg-white border-t border-slate-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="w-1 h-4 rounded-full" style={{ background: '#c8a951' }} />
              <p className="text-sm text-slate-500">
                重庆大学毕业去向数据分析系统 · 数据仅供参考
              </p>
            </div>
            <p className="text-xs text-slate-400">最新更新时间: 2026/3/1</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

// Hero 区统计小卡片
interface HeroStatProps {
  label: string;
  value: string;
  icon: React.ReactNode;
}

function HeroStat({ label, value, icon }: HeroStatProps) {
  return (
    <div className="flex flex-col gap-1 px-4 py-3 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 min-w-[90px]">
      <div className="flex items-center gap-1.5 text-white/70">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <p className="text-xl font-bold text-white leading-none">{value}</p>
    </div>
  );
}

export default App;
