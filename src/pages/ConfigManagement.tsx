import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAppDispatch, useAppSelector } from '@/hooks/useRedux';
import { postInstanceData } from '@/store/slices/instancesSlice';
import { Save, ArrowRight, Settings2, Database, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const ConfigManagement: React.FC = () => {
  const dispatch = useAppDispatch();
  const { instances, instanceData, loading } = useAppSelector((state) => state.instances);
  const { activeSessionId, sessions } = useAppSelector((state) => state.comparison);
  const { toast } = useToast();

  const [sourceInstanceId, setSourceInstanceId] = useState<string>('');
  const [targetInstanceIds, setTargetInstanceIds] = useState<string[]>([]);
  const [selectedSettings, setSelectedSettings] = useState<string[]>([]);
  const [isPreviewMode, setIsPreviewMode] = useState(false);

  const activeSession = sessions.find(s => s.id === activeSessionId);
  const sourceInstance = instances.find(i => i.id === sourceInstanceId);
  const sourceData = sourceInstanceId ? instanceData[sourceInstanceId]?.data : null;

  const getInstanceName = (id: string) => {
    const instance = instances.find(i => i.id === id);
    return instance?.name || 'Unknown Instance';
  };

  const flattenObject = (obj: any, prefix: string = ''): Array<{key: string, value: any, path: string}> => {
    const result: Array<{key: string, value: any, path: string}> = [];
    
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const newKey = prefix ? `${prefix}.${key}` : key;
        
        if (obj[key] && typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
          result.push(...flattenObject(obj[key], newKey));
        } else {
          result.push({
            key: newKey,
            value: obj[key],
            path: newKey
          });
        }
      }
    }
    
    return result;
  };

  const handleTargetInstanceToggle = (instanceId: string, checked: boolean) => {
    if (checked) {
      setTargetInstanceIds([...targetInstanceIds, instanceId]);
    } else {
      setTargetInstanceIds(targetInstanceIds.filter(id => id !== instanceId));
    }
  };

  const handleSettingToggle = (settingPath: string, checked: boolean) => {
    if (checked) {
      setSelectedSettings([...selectedSettings, settingPath]);
    } else {
      setSelectedSettings(selectedSettings.filter(path => path !== settingPath));
    }
  };

  const buildMigrationData = () => {
    if (!sourceData) return {};
    
    const result: any = {};
    const flatData = flattenObject(sourceData);
    
    selectedSettings.forEach(settingPath => {
      const setting = flatData.find(item => item.path === settingPath);
      if (setting) {
        const pathParts = settingPath.split('.');
        let current = result;
        
        for (let i = 0; i < pathParts.length - 1; i++) {
          if (!current[pathParts[i]]) {
            current[pathParts[i]] = {};
          }
          current = current[pathParts[i]];
        }
        
        current[pathParts[pathParts.length - 1]] = setting.value;
      }
    });
    
    return result;
  };

  const handleMigration = async () => {
    if (!sourceInstanceId || targetInstanceIds.length === 0 || selectedSettings.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please select source instance, target instances, and settings to migrate",
        variant: "destructive",
      });
      return;
    }

    const migrationData = buildMigrationData();
    const endpoint = '/api/settings'; // You can make this configurable

    try {
      // Migrate to all selected target instances
      const migrationPromises = targetInstanceIds.map(targetId => 
        dispatch(postInstanceData({
          instanceId: targetId,
          endpoint,
          data: migrationData
        }))
      );

      await Promise.all(migrationPromises);

      toast({
        title: "Migration Successful",
        description: `Settings migrated to ${targetInstanceIds.length} instance(s)`,
      });

      // Reset form
      setSelectedSettings([]);
      setTargetInstanceIds([]);
      setIsPreviewMode(false);

    } catch (error) {
      toast({
        title: "Migration Failed",
        description: "Failed to migrate settings to one or more instances",
        variant: "destructive",
      });
    }
  };

  const availableInstances = instances.filter(i => i.isActive);
  const targetOptions = availableInstances.filter(i => i.id !== sourceInstanceId);
  const flattenedSettings = sourceData ? flattenObject(sourceData) : [];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Configuration Management</h1>
        <p className="mt-2 text-muted-foreground">
          Migrate and synchronize configuration settings between instances
        </p>
      </div>

      {/* Migration Setup */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings2 className="h-5 w-5 text-primary" />
            <span>Migration Setup</span>
          </CardTitle>
          <CardDescription>
            Select source and target instances for configuration migration
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Source Instance Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Source Instance</label>
            <Select value={sourceInstanceId} onValueChange={setSourceInstanceId}>
              <SelectTrigger>
                <SelectValue placeholder="Select source instance..." />
              </SelectTrigger>
              <SelectContent>
                {availableInstances.map((instance) => (
                  <SelectItem key={instance.id} value={instance.id}>
                    <div className="flex items-center space-x-2">
                      <span>{instance.name}</span>
                      <Badge variant="outline" className="text-xs">
                        {instanceData[instance.id] ? 'Data Available' : 'No Data'}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Target Instances Selection */}
          {sourceInstanceId && (
            <div className="space-y-3">
              <label className="text-sm font-medium">Target Instances</label>
              <div className="grid gap-3">
                {targetOptions.map((instance) => (
                  <div
                    key={instance.id}
                    className="flex items-center space-x-3 rounded-lg border p-3"
                  >
                    <Checkbox
                      checked={targetInstanceIds.includes(instance.id)}
                      onCheckedChange={(checked) => 
                        handleTargetInstanceToggle(instance.id, checked as boolean)
                      }
                    />
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">{instance.name}</span>
                        <Badge 
                          variant={instance.status === 'connected' ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {instance.status || 'disconnected'}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{instance.url}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Settings Selection */}
      {sourceInstanceId && sourceData && (
        <Card>
          <CardHeader>
            <CardTitle>Select Settings to Migrate</CardTitle>
            <CardDescription>
              Choose specific configuration settings to migrate from {getInstanceName(sourceInstanceId)}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-1 max-h-96 overflow-y-auto">
              {flattenedSettings.map((setting) => (
                <div
                  key={setting.path}
                  className="flex items-center justify-between space-x-3 rounded p-2 hover:bg-muted/50"
                >
                  <div className="flex items-center space-x-3 flex-1">
                    <Checkbox
                      checked={selectedSettings.includes(setting.path)}
                      onCheckedChange={(checked) => 
                        handleSettingToggle(setting.path, checked as boolean)
                      }
                    />
                    <div className="flex-1 min-w-0">
                      <code className="text-sm font-mono text-primary">
                        {setting.path}
                      </code>
                      <div className="text-sm text-muted-foreground mt-1">
                        <span className="font-medium">Value: </span>
                        <code className="bg-muted px-1 rounded">
                          {JSON.stringify(setting.value)}
                        </code>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {flattenedSettings.length === 0 && (
              <div className="text-center py-8">
                <Database className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                <p className="text-muted-foreground">No configuration data available</p>
                <p className="text-sm text-muted-foreground/75 mt-1">
                  Fetch data from the selected source instance first
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Migration Preview & Actions */}
      {sourceInstanceId && targetInstanceIds.length > 0 && selectedSettings.length > 0 && (
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <ArrowRight className="h-5 w-5 text-primary" />
              <span>Migration Preview</span>
            </CardTitle>
            <CardDescription>
              Review and execute the configuration migration
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Source</p>
                <Badge variant="outline" className="w-full justify-center">
                  {getInstanceName(sourceInstanceId)}
                </Badge>
              </div>
              
              <div className="flex items-center justify-center">
                <ArrowRight className="h-6 w-6 text-primary" />
              </div>
              
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">
                  Targets ({targetInstanceIds.length})
                </p>
                <div className="space-y-1">
                  {targetInstanceIds.map(id => (
                    <Badge key={id} variant="outline" className="w-full justify-center text-xs">
                      {getInstanceName(id)}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">
                Settings to migrate ({selectedSettings.length})
              </p>
              <div className="flex flex-wrap gap-1">
                {selectedSettings.slice(0, 5).map(setting => (
                  <Badge key={setting} variant="secondary" className="text-xs">
                    {setting}
                  </Badge>
                ))}
                {selectedSettings.length > 5 && (
                  <Badge variant="secondary" className="text-xs">
                    +{selectedSettings.length - 5} more
                  </Badge>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-2 pt-4">
              <Button
                onClick={() => setIsPreviewMode(!isPreviewMode)}
                variant="outline"
              >
                {isPreviewMode ? 'Hide Preview' : 'Preview Data'}
              </Button>
              
              <Button
                onClick={handleMigration}
                disabled={loading}
                className="flex items-center space-x-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Migrating...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    <span>Migrate Settings</span>
                  </>
                )}
              </Button>
            </div>

            {isPreviewMode && (
              <div className="mt-4 p-4 bg-muted/30 rounded-lg">
                <p className="text-sm font-medium mb-2">Migration Data Preview:</p>
                <pre className="text-xs bg-background p-3 rounded border overflow-auto max-h-48">
                  {JSON.stringify(buildMigrationData(), null, 2)}
                </pre>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ConfigManagement;