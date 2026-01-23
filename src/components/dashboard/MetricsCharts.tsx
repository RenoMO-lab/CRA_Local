import React, { useMemo, useState } from 'react';
import { format, subDays, startOfDay, startOfWeek, startOfMonth, startOfYear, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval, isWithinInterval } from 'date-fns';
import { TrendingUp, Calendar } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { CustomerRequest } from '@/types';
import { useLanguage } from '@/context/LanguageContext';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';

interface MetricsChartsProps {
  requests: CustomerRequest[];
}

type TimePeriod = 'day' | 'week' | 'month' | 'last30' | 'last90' | 'year';

const COLORS = [
  'hsl(221, 83%, 53%)',  // Blue
  'hsl(142, 71%, 45%)',  // Green
  'hsl(38, 92%, 50%)',   // Orange
  'hsl(280, 87%, 60%)',  // Purple
  'hsl(0, 84%, 60%)',    // Red
  'hsl(180, 70%, 45%)',  // Teal
  'hsl(320, 70%, 55%)',  // Pink
  'hsl(60, 70%, 45%)',   // Yellow
];

const getTimeRange = (period: TimePeriod): { start: Date; end: Date; groupBy: 'day' | 'week' | 'month' } => {
  const now = new Date();
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
  
  switch (period) {
    case 'day':
      return { start: startOfDay(now), end: endOfToday, groupBy: 'day' };
    case 'week':
      return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfToday, groupBy: 'day' };
    case 'month':
      return { start: startOfMonth(now), end: endOfToday, groupBy: 'day' };
    case 'last30':
      return { start: subDays(endOfToday, 30), end: endOfToday, groupBy: 'day' };
    case 'last90':
      return { start: subDays(endOfToday, 90), end: endOfToday, groupBy: 'week' };
    case 'year':
      return { start: startOfYear(now), end: endOfToday, groupBy: 'month' };
    default:
      return { start: subDays(endOfToday, 30), end: endOfToday, groupBy: 'day' };
  }
};

const MetricsCharts: React.FC<MetricsChartsProps> = ({ requests }) => {
  const { t } = useLanguage();
  const [period, setPeriod] = useState<TimePeriod>('last30');
  const [activeTab, setActiveTab] = useState<'requests' | 'replies' | 'response'>('requests');

  // Build chart data for requests per sales
  const requestsPerSalesData = useMemo(() => {
    const { start, end, groupBy } = getTimeRange(period);
    
    // Get unique sales people
    const salesPeople = Array.from(new Set(requests.map(r => r.createdByName))).filter(Boolean);
    
    // Generate time intervals
    let intervals: Date[] = [];
    if (groupBy === 'day') {
      intervals = eachDayOfInterval({ start, end });
    } else if (groupBy === 'week') {
      intervals = eachWeekOfInterval({ start, end }, { weekStartsOn: 1 });
    } else {
      intervals = eachMonthOfInterval({ start, end });
    }

    // Build data points
    const data = intervals.map(date => {
      const intervalEnd = groupBy === 'day' 
        ? new Date(date.getTime() + 24 * 60 * 60 * 1000 - 1)
        : groupBy === 'week'
        ? new Date(date.getTime() + 7 * 24 * 60 * 60 * 1000 - 1)
        : new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59);

      const point: Record<string, any> = {
        date: groupBy === 'month' ? format(date, 'MMM yyyy') : format(date, 'MMM dd'),
      };

      salesPeople.forEach(person => {
        point[person] = requests.filter(r => {
          const createdAt = new Date(r.createdAt);
          return r.createdByName === person && 
                 isWithinInterval(createdAt, { start: date, end: intervalEnd });
        }).length;
      });

      return point;
    });

    return { data, people: salesPeople };
  }, [requests, period]);

  // Build chart data for replies per designer
  const repliesPerDesignerData = useMemo(() => {
    const { start, end, groupBy } = getTimeRange(period);
    
    // Get unique designers from history entries with design actions
    const designerSet = new Set<string>();
    requests.forEach(r => {
      r.history.forEach(h => {
        if (['under_review', 'clarification_needed', 'feasibility_confirmed'].includes(h.status)) {
          designerSet.add(h.userName);
        }
      });
    });
    const designers = Array.from(designerSet).filter(Boolean);

    // Generate time intervals
    let intervals: Date[] = [];
    if (groupBy === 'day') {
      intervals = eachDayOfInterval({ start, end });
    } else if (groupBy === 'week') {
      intervals = eachWeekOfInterval({ start, end }, { weekStartsOn: 1 });
    } else {
      intervals = eachMonthOfInterval({ start, end });
    }

    // Build data points
    const data = intervals.map(date => {
      const intervalEnd = groupBy === 'day' 
        ? new Date(date.getTime() + 24 * 60 * 60 * 1000 - 1)
        : groupBy === 'week'
        ? new Date(date.getTime() + 7 * 24 * 60 * 60 * 1000 - 1)
        : new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59);

      const point: Record<string, any> = {
        date: groupBy === 'month' ? format(date, 'MMM yyyy') : format(date, 'MMM dd'),
      };

      designers.forEach(designer => {
        let count = 0;
        requests.forEach(r => {
          r.history.forEach(h => {
            if (['under_review', 'clarification_needed', 'feasibility_confirmed'].includes(h.status) &&
                h.userName === designer) {
              const timestamp = new Date(h.timestamp);
              if (isWithinInterval(timestamp, { start: date, end: intervalEnd })) {
                count++;
              }
            }
          });
        });
        point[designer] = count;
      });

      return point;
    });

    return { data, people: designers };
  }, [requests, period]);

  // Build chart data for average response time
  const responseTimeData = useMemo(() => {
    const { start, end, groupBy } = getTimeRange(period);

    // Generate time intervals
    let intervals: Date[] = [];
    if (groupBy === 'day') {
      intervals = eachDayOfInterval({ start, end });
    } else if (groupBy === 'week') {
      intervals = eachWeekOfInterval({ start, end }, { weekStartsOn: 1 });
    } else {
      intervals = eachMonthOfInterval({ start, end });
    }

    // Build data points
    const data = intervals.map(date => {
      const intervalEnd = groupBy === 'day' 
        ? new Date(date.getTime() + 24 * 60 * 60 * 1000 - 1)
        : groupBy === 'week'
        ? new Date(date.getTime() + 7 * 24 * 60 * 60 * 1000 - 1)
        : new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59);

      const responseTimes: number[] = [];
      
      requests.forEach(r => {
        const submittedEntry = r.history.find(h => h.status === 'submitted');
        const designReplyEntry = r.history.find(h => 
          ['under_review', 'clarification_needed', 'feasibility_confirmed'].includes(h.status)
        );
        
        if (submittedEntry && designReplyEntry) {
          const replyTime = new Date(designReplyEntry.timestamp);
          if (isWithinInterval(replyTime, { start: date, end: intervalEnd })) {
            const submittedTime = new Date(submittedEntry.timestamp).getTime();
            const diffHours = (replyTime.getTime() - submittedTime) / (1000 * 60 * 60);
            if (diffHours >= 0) {
              responseTimes.push(diffHours);
            }
          }
        }
      });

      const avgHours = responseTimes.length > 0 
        ? responseTimes.reduce((sum, t) => sum + t, 0) / responseTimes.length 
        : 0;

      return {
        date: groupBy === 'month' ? format(date, 'MMM yyyy') : format(date, 'MMM dd'),
        avgHours: Number(avgHours.toFixed(1)),
        count: responseTimes.length,
      };
    });

    return data;
  }, [requests, period]);

  // Build chart configs
  const requestsChartConfig: ChartConfig = useMemo(() => {
    const config: ChartConfig = {};
    requestsPerSalesData.people.forEach((person, index) => {
      config[person] = {
        label: person,
        color: COLORS[index % COLORS.length],
      };
    });
    return config;
  }, [requestsPerSalesData.people]);

  const repliesChartConfig: ChartConfig = useMemo(() => {
    const config: ChartConfig = {};
    repliesPerDesignerData.people.forEach((person, index) => {
      config[person] = {
        label: person,
        color: COLORS[index % COLORS.length],
      };
    });
    return config;
  }, [repliesPerDesignerData.people]);

  const responseChartConfig: ChartConfig = {
    avgHours: {
      label: t.performance.avgResponseHours,
      color: 'hsl(221, 83%, 53%)',
    },
  };

  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">{t.performance.metricsTitle}</h3>
        </div>
        
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <Select value={period} onValueChange={(value) => setPeriod(value as TimePeriod)}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder={t.performance.periodLabel} />
            </SelectTrigger>
            <SelectContent className="bg-card border border-border">
              <SelectItem value="day">{t.performance.periodDay}</SelectItem>
              <SelectItem value="week">{t.performance.periodWeek}</SelectItem>
              <SelectItem value="month">{t.performance.periodMonth}</SelectItem>
              <SelectItem value="last30">{t.performance.periodLast30}</SelectItem>
              <SelectItem value="last90">{t.performance.periodLast90}</SelectItem>
              <SelectItem value="year">{t.performance.periodYear}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-4">
          <TabsTrigger value="requests" className="text-xs sm:text-sm px-2 py-1.5">{t.performance.tabRequestsSales}</TabsTrigger>
          <TabsTrigger value="replies" className="text-xs sm:text-sm px-2 py-1.5">{t.performance.tabRepliesDesigner}</TabsTrigger>
          <TabsTrigger value="response" className="text-xs sm:text-sm px-2 py-1.5">{t.performance.tabResponseTime}</TabsTrigger>
        </TabsList>

        <TabsContent value="requests" className="mt-0">
          {requestsPerSalesData.people.length > 0 ? (
            <div className="space-y-4">
              <ChartContainer config={requestsChartConfig} className="h-[250px] sm:h-[300px] w-full">
                <LineChart data={requestsPerSalesData.data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 10 }} 
                    tickLine={false}
                    axisLine={false}
                    className="text-muted-foreground"
                    interval="preserveStartEnd"
                  />
                  <YAxis 
                    tick={{ fontSize: 10 }} 
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                    className="text-muted-foreground"
                    width={30}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  {requestsPerSalesData.people.map((person, index) => (
                    <Line
                      key={person}
                      type="monotone"
                      dataKey={person}
                      stroke={COLORS[index % COLORS.length]}
                      strokeWidth={2}
                      dot={{ fill: COLORS[index % COLORS.length], strokeWidth: 0, r: 2 }}
                      activeDot={{ r: 4 }}
                    />
                  ))}
                </LineChart>
              </ChartContainer>
              <div className="flex flex-wrap gap-2 justify-center">
                {requestsPerSalesData.people.map((person, index) => (
                  <div key={person} className="flex items-center gap-1.5 text-xs">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span className="text-muted-foreground">{person}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-muted-foreground">
              {t.performance.noData}
            </div>
          )}
        </TabsContent>

        <TabsContent value="replies" className="mt-0">
          {repliesPerDesignerData.people.length > 0 ? (
            <div className="space-y-4">
              <ChartContainer config={repliesChartConfig} className="h-[250px] sm:h-[300px] w-full">
                <LineChart data={repliesPerDesignerData.data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 10 }} 
                    tickLine={false}
                    axisLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis 
                    tick={{ fontSize: 10 }} 
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                    width={30}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  {repliesPerDesignerData.people.map((person, index) => (
                    <Line
                      key={person}
                      type="monotone"
                      dataKey={person}
                      stroke={COLORS[index % COLORS.length]}
                      strokeWidth={2}
                      dot={{ fill: COLORS[index % COLORS.length], strokeWidth: 0, r: 2 }}
                      activeDot={{ r: 4 }}
                    />
                  ))}
                </LineChart>
              </ChartContainer>
              <div className="flex flex-wrap gap-2 justify-center">
                {repliesPerDesignerData.people.map((person, index) => (
                  <div key={person} className="flex items-center gap-1.5 text-xs">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span className="text-muted-foreground">{person}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-muted-foreground">
              {t.performance.noData}
            </div>
          )}
        </TabsContent>

        <TabsContent value="response" className="mt-0">
          <ChartContainer config={responseChartConfig} className="h-[250px] sm:h-[300px] w-full">
            <BarChart data={responseTimeData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 10 }} 
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <YAxis 
                tick={{ fontSize: 10 }} 
                tickLine={false}
                axisLine={false}
                width={40}
                label={{ value: t.performance.hoursLabel, angle: -90, position: 'insideLeft', fontSize: 10, offset: 10 }}
              />
              <ChartTooltip 
                content={<ChartTooltipContent />}
                formatter={(value: number) => [`${value}${t.performance.hoursUnit}`, t.performance.avgResponseLabel]}
              />
              <Bar 
                dataKey="avgHours" 
                fill="hsl(221, 83%, 53%)" 
                radius={[4, 4, 0, 0]}
                name={t.performance.avgResponseHours}
              />
            </BarChart>
          </ChartContainer>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MetricsCharts;
