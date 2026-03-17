import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Search, Table2 } from 'lucide-react';
import type { DataRecord } from '@/types';

interface DataTableProps {
  data: DataRecord[];
}

export function DataTable({ data }: DataTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const filteredData = useMemo(() => {
    if (!searchTerm) return data;
    const term = searchTerm.toLowerCase();
    return data.filter((record) => Object.values(record).some((value) => String(value).toLowerCase().includes(term)));
  }, [data, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredData.length / pageSize));
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, currentPage, pageSize]);

  const pageRange = useMemo(() => {
    const range: number[] = [];
    const maxVisible = 5;
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);
    if (end - start + 1 < maxVisible) start = Math.max(1, end - maxVisible + 1);
    for (let i = start; i <= end; i += 1) range.push(i);
    return range;
  }, [currentPage, totalPages]);

  const columns = useMemo(() => {
    const priority = ['学部', '学院', '学历', '毕业年度', '去向类别', '单位名称', '人数'];
    const keys = new Set<string>();
    data.forEach((record) => Object.keys(record).forEach((key) => keys.add(key)));
    const dynamic = Array.from(keys).filter((key) => !priority.includes(key)).sort((a, b) => a.localeCompare(b, 'zh-CN'));
    return [...priority.filter((key) => keys.has(key)), ...dynamic];
  }, [data]);

  return (
    <Card className="shadow-sm border-slate-200">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <Table2 className="w-5 h-5 text-slate-600" />
            <CardTitle className="text-lg font-semibold text-slate-800">明细数据</CardTitle>
            <Badge variant="secondary" className="bg-slate-100 text-slate-600">{filteredData.length.toLocaleString()} 条</Badge>
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
            <select
              className="h-9 px-3 rounded-md border border-input bg-background text-sm"
              value={String(pageSize)}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
            >
              <option value="10">10条/页</option>
              <option value="20">20条/页</option>
              <option value="50">50条/页</option>
              <option value="100">100条/页</option>
            </select>
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
                    <TableHead key={col} className="text-xs font-medium text-slate-600 whitespace-nowrap">{col}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedData.length === 0 ? (
                  <TableRow><TableCell colSpan={columns.length} className="text-center py-8 text-slate-500">暂无数据</TableCell></TableRow>
                ) : (
                  paginatedData.map((record, index) => (
                    <TableRow key={index} className="hover:bg-slate-50 transition-colors">
                      {columns.map((col) => (
                        <TableCell key={`${index}-${col}`} className="text-sm text-slate-700 max-w-xs truncate">{String(record[col] ?? '-')}</TableCell>
                      ))}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-slate-500">第 {currentPage} / {totalPages} 页，共 {filteredData.length.toLocaleString()} 条</div>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentPage(1)} disabled={currentPage === 1}><ChevronsLeft className="w-4 h-4" /></Button>
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}><ChevronLeft className="w-4 h-4" /></Button>
              {pageRange.map((page) => <Button key={page} variant={currentPage === page ? 'default' : 'outline'} size="sm" className="h-8 w-8 px-0" onClick={() => setCurrentPage(page)}>{page}</Button>)}
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}><ChevronRight className="w-4 h-4" /></Button>
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages}><ChevronsRight className="w-4 h-4" /></Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
