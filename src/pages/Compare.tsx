import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useAppDispatch, useAppSelector } from '@/hooks/useRedux';
import { fetchInstanceData } from '@/store/slices/instancesSlice';
import { setSelectedInstances, setBaseInstanceId, setComparisonType, createComparisonSession, ComparisonData } from '@/store/slices/comparisonSlice';
import { GitCompare, Settings, Database, ToggleLeft, Play, Loader2, Copy, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import ReactJson from "@microlink/react-json-view";

const Compare: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { instances, instanceData, loading } = useAppSelector((state) => state.instances);
    const { selectedInstances, baseInstanceId, comparisonType, currentEndpoint } = useAppSelector((state) => state.comparison);
  const { toast } = useToast();
  
  const [sessionName, setSessionName] = useState('');
  const [copiedInstances, setCopiedInstances] = useState<Set<string>>(new Set());

  const activeInstances = instances.filter(i => i.isActive);

  const comparisonTypes = [
    { 
      value: 'settings', 
      label: 'Settings', 
      icon: Settings, 
      endpoint: '/api/settings',
      description: 'Compare application configuration settings'
    },
    { 
      value: 'codeTable', 
      label: 'Code Tables', 
      icon: Database, 
      endpoint: '/api/code-table',
      description: 'Compare lookup tables and reference data'
    },
    { 
      value: 'featureToggle', 
      label: 'Feature Toggles', 
      icon: ToggleLeft, 
      endpoint: '/GetAllFeatureFlags',
      description: 'Compare feature flags and toggles'
    },
  ];

  const handleInstanceSelection = (instanceId: string, checked: boolean) => {
    const updated = checked
      ? [...selectedInstances, instanceId]
      : selectedInstances.filter(id => id !== instanceId);
    dispatch(setSelectedInstances(updated));
  };

  const handleComparisonTypeChange = (type: 'settings' | 'codeTable' | 'featureToggle') => {
    dispatch(setComparisonType(type));
  };

  const handleBaseInstanceChange = (instanceId: string) => {
    dispatch(setBaseInstanceId(instanceId));
  };

  const handleFetchData = async () => {
    if (selectedInstances.length < 2) {
      toast({
        title: "Selection Required",
        description: "Please select at least 2 instances to compare",
        variant: "destructive",
      });
      return;
    }

    try {
      // Fetch data from all selected instances
      const fetchPromises = selectedInstances.map(instanceId => 
        dispatch(fetchInstanceData({ instanceId, endpoint: currentEndpoint }))
      );
      
      await Promise.all(fetchPromises);
      
      toast({
        title: "Data Fetched",
        description: `Successfully retrieved data from ${selectedInstances.length} instances`,
      });
    } catch (error) {
      toast({
        title: "Fetch Error",
        description: "Failed to retrieve data from one or more instances",
        variant: "destructive",
      });
    }
  };

  const handleStartComparison = () => {
    if (selectedInstances.length < 2) {
      toast({
        title: "Selection Required",
        description: "Please select at least 2 instances to compare",
        variant: "destructive",
      });
      return;
    }

    const selectedInstanceData: Record<string, ComparisonData> = {};
    selectedInstances.forEach(id => {
      const data = instanceData[id];
      if (data) {
        selectedInstanceData[id] = data.data as ComparisonData;
      }
    });

    const name = sessionName || `${comparisonType} comparison - ${new Date().toLocaleString()}`;
    
    dispatch(createComparisonSession({
      name,
      instanceIds: selectedInstances,
      endpoint: currentEndpoint,
      instanceData: selectedInstanceData,
    }));

    toast({
      title: "Comparison Started",
      description: "Analysis complete! Redirecting to Summary page...",
    });

    // Navigate to Summary page after comparison is created
    setTimeout(() => {
      navigate('/summary');
    }, 1000); // Small delay to let user see the success message
  };

  const getInstanceById = (id: string) => instances.find(i => i.id === id);

  const handleCopyToClipboard = async (instanceId: string) => {
    const data = instanceData[instanceId];
    if (data?.data) {
      try {
        await navigator.clipboard.writeText(JSON.stringify(data.data, null, 2));
        setCopiedInstances(prev => new Set([...prev, instanceId]));
        
        toast({
          title: "Copied to Clipboard",
          description: `JSON data from ${getInstanceById(instanceId)?.name} copied successfully`,
        });

        // Reset the copied state after 2 seconds
        setTimeout(() => {
          setCopiedInstances(prev => {
            const newSet = new Set(prev);
            newSet.delete(instanceId);
            return newSet;
          });
        }, 2000);
      } catch (error) {
        toast({
          title: "Copy Failed",
          description: "Failed to copy data to clipboard",
          variant: "destructive",
        });
      }
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Compare Instances</h1>
        <p className="mt-2 text-muted-foreground">
          Select instances and data type to perform JSON comparison analysis
        </p>
      </div>

      {/* Comparison Type Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Comparison Type</CardTitle>
          <CardDescription>Choose what type of data you want to compare</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {comparisonTypes.map((type) => {
              const Icon = type.icon;
              const isSelected = comparisonType === type.value;
              
              return (
                <Card 
                  key={type.value}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    isSelected ? 'border-primary bg-primary/5' : ''
                  }`}
                  onClick={() => handleComparisonTypeChange(type.value as 'settings' | 'codeTable' | 'featureToggle')}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                        isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted'
                      }`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-medium">{type.label}</h3>
                        <p className="text-xs text-muted-foreground mt-1">{type.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Instance Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select Instances</CardTitle>
          <CardDescription>
            Choose at least 2 instances to compare. Selected: {selectedInstances.length}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {activeInstances.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No active instances configured.</p>
              <p className="text-sm text-muted-foreground mt-1">
                Please configure and activate instances in the Configuration page.
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {activeInstances.map((instance) => {
                const isSelected = selectedInstances.includes(instance.id);
                const hasData = instanceData[instance.id]?.data;
                
                return (
                  <div
                    key={instance.id}
                    className={`flex items-center space-x-4 rounded-lg border p-4 transition-all ${
                      isSelected ? 'border-primary bg-primary/5' : 'border-border'
                    }`}
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={(checked) => 
                        handleInstanceSelection(instance.id, checked as boolean)
                      }
                    />
                    
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h3 className="font-medium">{instance.name}</h3>
                        <Badge 
                          variant={instance.status === 'connected' ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {instance.status || 'disconnected'}
                        </Badge>
                        {hasData && (
                          <Badge variant="outline" className="text-xs text-success">
                            Data loaded
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{instance.url}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Base Instance Selection */}
      {selectedInstances.length >= 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Base Instance</CardTitle>
            <CardDescription>
              Choose which instance to use as the reference for comparison. All other instances will be compared against this base.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Select 
              value={baseInstanceId || ''} 
              onValueChange={handleBaseInstanceChange}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select base instance (optional)" />
              </SelectTrigger>
              <SelectContent>
                {selectedInstances.map((instanceId) => {
                  const instance = getInstanceById(instanceId);
                  return (
                    <SelectItem key={instanceId} value={instanceId}>
                      <div className="flex items-center space-x-2">
                        <span>{instance?.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {instance?.url}
                        </Badge>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            {baseInstanceId && (
              <div className="mt-2 p-2 bg-muted/50 rounded text-sm text-muted-foreground">
                <strong>Base:</strong> {getInstanceById(baseInstanceId)?.name} - Other instances will be compared against this one.
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col space-y-4 sm:flex-row sm:items-end sm:justify-between sm:space-y-0">
            <div className="flex-1 space-y-2">
              <label className="text-sm font-medium">Session Name (Optional)</label>
              <input
                type="text"
                placeholder="Enter comparison session name..."
                value={sessionName}
                onChange={(e) => setSessionName(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              />
            </div>
            
            <div className="flex space-x-2">
              <Button
                variant="outline"
                onClick={handleFetchData}
                disabled={loading || selectedInstances.length === 0}
              >
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Database className="mr-2 h-4 w-4" />
                )}
                Fetch Data
              </Button>
              
              <Button
                onClick={handleStartComparison}
                disabled={selectedInstances.length < 2}
                size="lg"
              >
                <GitCompare className="mr-2 h-4 w-4" />
                Start Comparison
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Preview */}
      {selectedInstances.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Data Preview</CardTitle>
            <CardDescription>Preview of fetched JSON data from selected instances</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 lg:grid-cols-2">
              {selectedInstances.map((instanceId) => {
                const instance = getInstanceById(instanceId);
                const data = instanceData[instanceId];
                
                return (
                  <div key={instanceId} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-sm">{instance?.name}</h4>
                      {data?.data && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCopyToClipboard(instanceId)}
                          className="h-7 px-2"
                        >
                          {copiedInstances.has(instanceId) ? (
                            <Check className="h-3 w-3 text-success" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </Button>
                      )}
                    </div>
                    <div className="max-h-64 overflow-auto rounded border bg-muted/30 p-2">
                      {data?.data ? (
                        <ReactJson
                          src={data.data as object}
                          theme="bright"
                          collapsed={2}
                          displayDataTypes={false}
                          displayObjectSize={false}
                          enableClipboard={false}
                          name={false}
                        />
                      ) : (
                        <p className="text-sm text-muted-foreground py-4 text-center">
                          No data loaded. Click "Fetch Data" to retrieve.
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Compare;