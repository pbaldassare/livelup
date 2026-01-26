import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader';
import { SectionCard } from '@/components/dashboard/SectionCard';
import { TablePagination } from '@/components/dashboard/TablePagination';
import { DataTableSkeleton } from '@/components/skeletons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  FileText, 
  Search, 
  Download,
  User,
  Settings,
  Shield,
  Database,
  Clock
} from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { toast } from 'sonner';

interface AuditLogEntry {
  id: string;
  user_id: string | null;
  action: string;
  resource: string | null;
  resource_id: string | null;
  details: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  userProfile?: {
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  };
}

const ACTION_ICONS: Record<string, React.ElementType> = {
  'create': Database,
  'update': Settings,
  'delete': Shield,
  'login': User,
  'logout': User,
};

const ACTION_COLORS: Record<string, string> = {
  'create': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  'update': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  'delete': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  'login': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
  'logout': 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
};

export function AdminAuditLogPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Fetch audit logs
  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['admin-audit-logs'],
    queryFn: async () => {
      const { data: logsData, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);

      if (error) throw error;

      // Get user profiles
      const userIds = [...new Set(logsData?.filter(l => l.user_id).map(l => l.user_id) || [])];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, email')
        .in('user_id', userIds);

      const profilesMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      return logsData?.map(log => ({
        ...log,
        userProfile: log.user_id ? profilesMap.get(log.user_id) : undefined
      })) as AuditLogEntry[];
    }
  });

  // Filter and paginate
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const matchesSearch = !searchTerm || 
        log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.resource?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.userProfile?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        `${log.userProfile?.first_name || ''} ${log.userProfile?.last_name || ''}`.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesAction = actionFilter === 'all' || log.action.toLowerCase().includes(actionFilter.toLowerCase());

      return matchesSearch && matchesAction;
    });
  }, [logs, searchTerm, actionFilter]);

  const totalPages = Math.ceil(filteredLogs.length / pageSize);
  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredLogs.slice(start, start + pageSize);
  }, [filteredLogs, currentPage, pageSize]);

  // Get unique actions for filter
  const uniqueActions = useMemo(() => {
    const actions = new Set(logs.map(l => l.action.split('_')[0].toLowerCase()));
    return Array.from(actions);
  }, [logs]);

  // Export to CSV
  const handleExport = () => {
    const csvContent = [
      ['Data', 'Utente', 'Azione', 'Risorsa', 'IP', 'Dettagli'].join(','),
      ...filteredLogs.map(log => [
        format(new Date(log.created_at), 'yyyy-MM-dd HH:mm:ss'),
        log.userProfile?.email || log.user_id || 'Sistema',
        log.action,
        log.resource || '-',
        log.ip_address || '-',
        JSON.stringify(log.details || {}).replace(/,/g, ';')
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `audit_log_${format(new Date(), 'yyyyMMdd_HHmmss')}.csv`;
    link.click();
    toast.success('Export completato');
  };

  const getActionBadgeClass = (action: string) => {
    const baseAction = action.split('_')[0].toLowerCase();
    return ACTION_COLORS[baseAction] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-6 animate-in">
      <DashboardPageHeader
        title="Audit Log"
        subtitle="Registro di tutte le attività sulla piattaforma"
        icon={<FileText className="h-6 w-6" />}
        breadcrumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'Audit Log' }
        ]}
        actions={
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Esporta CSV
          </Button>
        }
      />

      <SectionCard
        title="Log Attività"
        subtitle={`${filteredLogs.length} eventi registrati`}
        icon={Clock}
        iconColor="primary"
      >
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Cerca per utente, azione o risorsa..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-9"
            />
          </div>
          <Select
            value={actionFilter}
            onValueChange={(value) => {
              setActionFilter(value);
              setCurrentPage(1);
            }}
          >
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Filtra azione" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutte le azioni</SelectItem>
              {uniqueActions.map(action => (
                <SelectItem key={action} value={action} className="capitalize">
                  {action}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data/Ora</TableHead>
                <TableHead>Utente</TableHead>
                <TableHead>Azione</TableHead>
                <TableHead>Risorsa</TableHead>
                <TableHead>IP</TableHead>
                <TableHead>Dettagli</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="p-0 border-0">
                    <DataTableSkeleton rows={10} columns={6} showSearch={false} />
                  </TableCell>
                </TableRow>
              ) : paginatedLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Nessun log trovato
                  </TableCell>
                </TableRow>
              ) : (
                paginatedLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-sm">
                      <div>
                        {format(new Date(log.created_at), 'dd/MM/yyyy', { locale: it })}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(log.created_at), 'HH:mm:ss')}
                      </div>
                    </TableCell>
                    <TableCell>
                      {log.userProfile ? (
                        <div>
                          <p className="font-medium text-sm">
                            {log.userProfile.first_name} {log.userProfile.last_name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {log.userProfile.email}
                          </p>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">Sistema</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className={getActionBadgeClass(log.action)}>
                        {log.action}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {log.resource ? (
                        <div>
                          <p>{log.resource}</p>
                          {log.resource_id && (
                            <p className="text-xs text-muted-foreground font-mono">
                              {log.resource_id.slice(0, 8)}...
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm font-mono">
                      {log.ip_address || '-'}
                    </TableCell>
                    <TableCell className="max-w-[200px]">
                      {log.details ? (
                        <pre className="text-xs bg-muted p-1 rounded overflow-hidden text-ellipsis">
                          {JSON.stringify(log.details, null, 0).slice(0, 50)}
                          {JSON.stringify(log.details).length > 50 && '...'}
                        </pre>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <TablePagination
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          totalItems={filteredLogs.length}
          onPageChange={setCurrentPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setCurrentPage(1);
          }}
        />
      </SectionCard>
    </div>
  );
}

export default AdminAuditLogPage;
