import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface ComparisonChartProps {
  data: {
    added: number;
    deleted: number;
    edited: number;
    total: number;
  };
  title?: string;
}

const ComparisonChart: React.FC<ComparisonChartProps> = ({ 
  data, 
  title = "Comparison Overview" 
}) => {
  const { added, deleted, edited, total } = data;
  
  const getPercentage = (value: number) => {
    return total > 0 ? Math.round((value / total) * 100) : 0;
  };

  const chartData = [
    {
      label: 'Added',
      value: added,
      percentage: getPercentage(added),
      color: 'bg-success',
      icon: TrendingUp,
      textColor: 'text-success',
    },
    {
      label: 'Deleted', 
      value: deleted,
      percentage: getPercentage(deleted),
      color: 'bg-destructive',
      icon: TrendingDown,
      textColor: 'text-destructive',
    },
    {
      label: 'Modified',
      value: edited,
      percentage: getPercentage(edited),
      color: 'bg-warning',
      icon: Minus,
      textColor: 'text-warning',
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Visual Bar Chart */}
        <div className="space-y-3">
          {chartData.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-2">
                    <Icon className={`h-4 w-4 ${item.textColor}`} />
                    <span className="font-medium">{item.label}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-muted-foreground">{item.value}</span>
                    <Badge variant="outline" className="text-xs">
                      {item.percentage}%
                    </Badge>
                  </div>
                </div>
                
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full ${item.color} transition-all duration-500 ease-out`}
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Summary */}
        <div className="pt-4 border-t">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">
              Total Differences
            </span>
            <span className="text-lg font-semibold text-foreground">
              {total}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ComparisonChart;