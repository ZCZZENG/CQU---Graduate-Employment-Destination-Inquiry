import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Search,
  Table2,
} from 'lucide-react';
import type { DataRecord } from '@/types';

interface DataTableProps {
  data: DataRecord[];
}

export function DataTable({ data }: DataTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // 搜索过滤
  const filteredData = useMemo(() => {
    if (!searchTerm) return data;
    
    const term = searchTerm.toLowerCase();
    return data.filter((record) =>
      Object.values(record).some((value) =>
        String(value).toLowerCase().includes(term)
      )
    );
  }, [data, searchTerm]);

  // 分页
  const totalPages = Math.ceil(filteredData.length / pageSize);
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, currentPage, pageSize]);

  // 页码范围
  const pageRange = useMemo(() => {
    const range: number[] = [];
    const maxVisible = 5;
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);
    
    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }
    
    for (let i = start; i <= end; i++) {
      range.push(i);
    }
    return range;
  }, [currentPage, totalPages]);

  const columns = [
    { key: '学部', label: '学部', width: 'w-24' },
    { key: '学院', label: '学院', width: 'w-32' },
    { key: '学历', label: '学历', width: 'w-16' },
    { key: '毕业年度', label: '毕业年度', width: 'w-20' },
    { key: '去向类别', label: '去向类别', width: 'w-28' },
    { key: '单位名称', label: '单位名称', width: 'flex-1' },
    { key: '人数', label: '人数', width: 'w-16' },
  ];

  const getCategoryColor = (category: string) => {
    switch (category) {
      case '升学':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case '就业':
        return 'bg-green-100 text-green-700 border-green-200';
      case '出国(境)留学或工作':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      case '选调生':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      case '志愿服务西部计划':
        return 'bg-rose-100 text-rose-700 border-rose-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <Card className="shadow-sm border-slate-200">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <Table2 className="w-5 h-5 text-slate-600" />
            <CardTitle className="text-lg font-semibold text-slate-800">明细数据</CardTitle>
            <Badge variant="secondary" className="bg-slate-100 text-slate-600">
              {filteredData.length.toLocaleString()} 条
            </Badge>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                type="text"
                placeholder="搜索数据..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-9 h-9 w-64 text-sm"
              />
            </div>
            <Select
              value={String(pageSize)}
              onValueChange={(value) => {
                setPageSize(Number(value));
                setCurrentPage(1);
              }}
            >
              <select className="h-9 px-3 rounded-md border border-input bg-background text-sm">
                <option value="10">10条/页</option>
                <option value="20">20条/页</option>
                <option value="50">50条/页</option>
                <option value="100">100条/页</option>
              </select>
            </Select>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="border rounded-md overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  {columns.map((col) => (
                    <TableHead
                      key={col.key}
                      className={`${col.width} text-xs font-medium text-slate-600`}
                    >
                      {col.label}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedData.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={columns.length}
                      className="text-center py-8 text-slate-500"
                    >
                      暂无数据
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedData.map((record, index) => (
                    <TableRow
                      key={index}
                      className="hover:bg-slate-50 transition-colors"
                    >
                      <TableCell className="text-sm text-slate-700">
                        {record.学部}
                      </TableCell>
                      <TableCell className="text-sm text-slate-700">
                        {record.学院}
                      </TableCell>
                      <TableCell className="text-sm text-slate-700">
                        {record.学历}
                      </TableCell>
                      <TableCell className="text-sm text-slate-700">
                        {record.毕业年度}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`text-xs ${getCategoryColor(record.去向类别)}`}
                        >
                          {record.去向类别}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-slate-700 max-w-xs truncate">
                        {record.单位名称}
                      </TableCell>
                      <TableCell className="text-sm font-medium text-slate-700">
                        {record.人数}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* 分页 */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-slate-500">
              第 {currentPage} / {totalPages} 页，共 {filteredData.length.toLocaleString()} 条
            </div>
            
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
              >
                <ChevronsLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              
              {pageRange.map((page) => (
                <Button
                  key={page}
                  variant={currentPage === page ? 'default' : 'outline'}
                  size="sm"
                  className="h-8 w-8 px-0"
                  onClick={() => setCurrentPage(page)}
                >
                  {page}
                </Button>
              ))}
              
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
              >
                <ChevronsRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// 简单的Select组件
function Select({
  children,
}: {
  value: string;
  onValueChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="relative">
      {children}
    </div>
  );
}
