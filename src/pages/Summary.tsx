import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAppSelector, useAppDispatch } from '@/hooks/useRedux';
import { setActiveSession, deleteSession } from '@/store/slices/comparisonSlice';
import { BarChart3, TrendingUp, TrendingDown, Minus, Trash2, Eye, Calendar } from 'lucide-react';

const Summary: React.FC = () => {
  const dispatch = useAppDispatch();
  const { sessions, activeSessionId } = useAppSelector((state) => state.comparison);
  const { instances } = useAppSelector((state) => state.instances);
  
  const activeSession = sessions.find(s => s.id === activeSessionId);

  const getInstanceName = (id: string) => {
    const instance = instances.find(i => i.id === id);
    return instance?.name || 'Unknown Instance';
  };

  const getDifferenceTypeIcon = (type: string) => {
    switch (type) {
      case 'added':
        return <TrendingUp className="h-4 w-4 text-success" />;
      case 'deleted':
        return <TrendingDown className="h-4 w-4 text-destructive" />;
      case 'edited':
        return <Minus className="h-4 w-4 text-warning" />;
      default:
        return null;
    }
  };

  const getDifferenceTypeColor = (type: string) => {
    switch (type) {
      case 'added':
        return 'success';
      case 'deleted':
        return 'destructive';
      case 'edited':
        return 'warning';
      default:
        return 'secondary';
    }
  };

  const handleDeleteSession = (sessionId: string) => {
    dispatch(deleteSession(sessionId));
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Comparison Summary</h1>
        <p className="mt-2 text-muted-foreground">
          Analysis results and difference reports from your comparison sessions
        </p>
      </div>

      {/* Sessions Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            <span>Comparison Sessions</span>
          </CardTitle>
          <CardDescription>
            {sessions.length} session{sessions.length !== 1 ? 's' : ''} available
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sessions.length === 0 ? (
            <div className="text-center py-12">
              <BarChart3 className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
              <p className="text-lg font-medium text-muted-foreground">No comparison sessions</p>
              <p className="text-sm text-muted-foreground/75 mt-1">
                Start a comparison in the Compare page to see results here
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {sessions.map((session) => (
                <Card 
                  key={session.id}
                  className={`transition-all hover:shadow-md ${
                    session.id === activeSessionId ? 'border-primary bg-primary/5' : ''
                  }`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h3 className="font-semibold">{session.name}</h3>
                          {session.id === activeSessionId && (
                            <Badge variant="default" className="text-xs">Active</Badge>
                          )}
                        </div>
                        
                        <div className="flex items-center space-x-4 text-sm text-muted-foreground mb-2">
                          <div className="flex items-center space-x-1">
                            <Calendar className="h-3 w-3" />
                            <span>{new Date(session.timestamp).toLocaleString()}</span>
                          </div>
                          <span>•</span>
                          <span>{session.instanceIds.length} instances</span>
                          <span>•</span>
                          <span className="capitalize">{session.endpoint.replace('/api/', '').replace('-', ' ')}</span>
                        </div>
                        
                        <div className="flex items-center space-x-1 text-xs">
                          {session.instanceIds.map((id, index) => (
                            <React.Fragment key={id}>
                              <Badge variant="outline" className="text-xs">
                                {getInstanceName(id)}
                              </Badge>
                              {index < session.instanceIds.length - 1 && (
                                <span className="text-muted-foreground">vs</span>
                              )}
                            </React.Fragment>
                          ))}
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <div className="text-right">
                          <p className="text-lg font-semibold text-foreground">
                            {session.summary.totalDifferences}
                          </p>
                          <p className="text-xs text-muted-foreground">differences</p>
                        </div>
                        
                        <div className="flex flex-col space-y-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => dispatch(setActiveSession(session.id))}
                          >
                            <Eye className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteSession(session.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Active Session Details */}
      {activeSession && (
        <>
          {/* Summary Statistics */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Differences</p>
                    <p className="text-2xl font-bold text-foreground">
                      {activeSession.summary.totalDifferences}
                    </p>
                  </div>
                  <BarChart3 className="h-8 w-8 text-primary" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Added</p>
                    <p className="text-2xl font-bold text-success">
                      {activeSession.summary.added}
                    </p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-success" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Deleted</p>
                    <p className="text-2xl font-bold text-destructive">
                      {activeSession.summary.deleted}
                    </p>
                  </div>
                  <TrendingDown className="h-8 w-8 text-destructive" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Modified</p>
                    <p className="text-2xl font-bold text-warning">
                      {activeSession.summary.edited}
                    </p>
                  </div>
                  <Minus className="h-8 w-8 text-warning" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Differences */}
          <Card>
            <CardHeader>
              <CardTitle>Detailed Differences</CardTitle>
              <CardDescription>
                Complete breakdown of all differences found in the comparison
              </CardDescription>
            </CardHeader>
            <CardContent>
              {activeSession.results.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No differences found</p>
                  <p className="text-sm text-muted-foreground/75 mt-1">
                    The compared instances have identical JSON structures and values
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {activeSession.results.map((result, index) => (
                    <div
                      key={index}
                      className="flex items-start space-x-3 rounded-lg border bg-card p-4"
                    >
                      <div className="flex-shrink-0 mt-1">
                        {getDifferenceTypeIcon(result.type)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <Badge 
                            variant={getDifferenceTypeColor(result.type) as any}
                            className="text-xs capitalize"
                          >
                            {result.type}
                          </Badge>
                          <code className="text-sm font-mono bg-muted px-2 py-1 rounded">
                            {result.path}
                          </code>
                        </div>
                        
                        <p className="text-sm text-muted-foreground mb-2">
                          {result.description}
                        </p>
                        
                        {(result.leftValue !== undefined || result.rightValue !== undefined) && (
                          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                            {result.leftValue !== undefined && (
                              <div className="text-xs">
                                <span className="font-medium text-destructive">Before:</span>
                                <code className="ml-2 bg-destructive/10 px-2 py-1 rounded">
                                  {JSON.stringify(result.leftValue)}
                                </code>
                              </div>
                            )}
                            {result.rightValue !== undefined && (
                              <div className="text-xs">
                                <span className="font-medium text-success">After:</span>
                                <code className="ml-2 bg-success/10 px-2 py-1 rounded">
                                  {JSON.stringify(result.rightValue)}
                                </code>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default Summary;