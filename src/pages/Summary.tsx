import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAppSelector, useAppDispatch } from '@/hooks/useRedux';
import { setActiveSession, deleteSession } from '@/store/slices/comparisonSlice';
import { postInstanceData } from '@/store/slices/instancesSlice';
import { BarChart3, TrendingUp, TrendingDown, Pencil, Trash2, Eye, Calendar, Save, ArrowRight, ChevronDown, ChevronRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// Legacy comparison result type for backward compatibility
type LegacyComparisonResult = {
  path: string;
  type: 'added' | 'deleted' | 'edited' | 'unchanged';
  leftValue?: unknown;
  rightValue?: unknown;
  description: string;
};

const Summary: React.FC = () => {
  const dispatch = useAppDispatch();
  const { sessions, activeSessionId, baseInstanceId, currentSaveEndpoint, comparisonType, customTypes } = useAppSelector((state) => state.comparison);
  const { instances, loading, instanceData } = useAppSelector((state) => state.instances);
  const { toast } = useToast();
  
  const [selectedForMigration, setSelectedForMigration] = useState<string[]>([]);
  const [migrationTarget, setMigrationTarget] = useState<string>('');
  const [migrationSource, setMigrationSource] = useState<string>('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'added' | 'deleted' | 'edited'>('all');
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());
  
  const activeSession = sessions.find(s => s.id === activeSessionId);

  // Helper to check if result has the new values format
  const hasResultValues = (result: unknown): result is { values: Record<string, unknown>; affectedInstances: string[] } => {
    return typeof result === 'object' && result !== null && 'values' in result && 'affectedInstances' in result;
  };

  const getInstanceName = (id: string) => {
    const instance = instances.find(i => i.id === id);
    return instance?.name || 'Unknown Instance';
  };

  // Helper to filter object based on response fields
  const filterByResponseFields = (data: Record<string, unknown> | unknown[], responseFields: string[]): Record<string, unknown> => {
    if (!responseFields || responseFields.length === 0) {
      return Array.isArray(data) ? { data } : data as Record<string, unknown>; // Return all data if no response fields specified
    }

    // Handle array data (like feature toggles)
    if (Array.isArray(data)) {
      console.log('Filtering array data with', data.length, 'items');
      // For arrays, we typically want to filter fields from the first item or all items
      // Since the user provided example suggests single object structure, let's assume they want the first item
      if (data.length > 0) {
        const firstItem = data[0] as Record<string, unknown>;
        return filterObjectFields(firstItem, responseFields);
      }
      return {};
    }

    // Handle object data
    return filterObjectFields(data as Record<string, unknown>, responseFields);
  };

  // Helper to filter fields from a single object
  const filterObjectFields = (obj: Record<string, unknown>, responseFields: string[]): Record<string, unknown> => {
    const filtered: Record<string, unknown> = {};
    
    responseFields.forEach(field => {
      if (field.includes('.')) {
        // Handle nested fields like "user.name"
        const parts = field.split('.');
        let source = obj;
        let target = filtered;
        
        // Navigate through the nested structure
        for (let i = 0; i < parts.length - 1; i++) {
          const part = parts[i];
          if (source && typeof source === 'object' && part in source) {
            source = source[part] as Record<string, unknown>;
            if (!(part in target)) {
              target[part] = {};
            }
            target = target[part] as Record<string, unknown>;
          } else {
            return; // Skip this field if path doesn't exist
          }
        }
        
        // Set the final value
        const finalPart = parts[parts.length - 1];
        if (source && typeof source === 'object' && finalPart in source) {
          target[finalPart] = source[finalPart];
        }
      } else {
        // Handle top-level fields
        if (field in obj) {
          filtered[field] = obj[field];
        }
      }
    });
    
    return filtered;
  };

  const getFilteredResults = () => {
    if (!activeSession) return [];
    
    if (activeFilter === 'all') {
      return activeSession.results;
    }
    
    return activeSession.results.filter(result => result.type === activeFilter);
  };

  const handleFilterClick = (filterType: 'all' | 'added' | 'deleted' | 'edited') => {
    setActiveFilter(filterType);
  };

  const toggleExpansion = (index: number) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedItems(newExpanded);
  };

  // Clear migration selections and expanded items when filter changes
  useEffect(() => {
    setSelectedForMigration([]);
    setExpandedItems(new Set());
  }, [activeFilter]);

  const getDifferenceTypeIcon = (type: string) => {
    switch (type) {
      case 'added':
        return <TrendingUp className="h-4 w-4 text-success" />;
      case 'deleted':
        return <TrendingDown className="h-4 w-4 text-destructive" />;
      case 'edited':
        return <Pencil className="h-4 w-4 text-warning" />;
      default:
        return null;
    }
  };

  const getDifferenceTypeColor = (type: string) => {
    switch (type) {
      case 'added':
        return 'default';
      case 'deleted':
        return 'destructive';
      case 'edited':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  const handleDeleteSession = (sessionId: string) => {
    dispatch(deleteSession(sessionId));
  };

  const handleMigrationSelection = (path: string, checked: boolean) => {
    if (checked) {
      setSelectedForMigration([...selectedForMigration, path]);
    } else {
      setSelectedForMigration(selectedForMigration.filter(p => p !== path));
    }
  };

  const handleSelectAllMigration = (checked: boolean) => {
    if (checked) {
      const allPaths = getFilteredResults().map(result => result.path);
      setSelectedForMigration(allPaths);
    } else {
      setSelectedForMigration([]);
    }
  };

  const isAllSelected = () => {
    const filteredResults = getFilteredResults();
    return filteredResults.length > 0 && filteredResults.every(result => selectedForMigration.includes(result.path));
  };

  const isIndeterminate = () => {
    const filteredResults = getFilteredResults();
    const selectedCount = filteredResults.filter(result => selectedForMigration.includes(result.path)).length;
    return selectedCount > 0 && selectedCount < filteredResults.length;
  };

  const handleMigration = async () => {
    if (!activeSession || !migrationTarget || !migrationSource || selectedForMigration.length === 0) {
      toast({
        title: "Migration Setup Required",
        description: "Please select source, target, and settings to migrate",
        variant: "destructive",
      });
      return;
    }

    // Check if using custom comparison type with response fields
    const customType = customTypes?.find(type => type.id === comparisonType);
    
    console.log('🔍 Migration Debug:', {
      comparisonType,
      customTypeFound: !!customType,
      customTypeName: customType?.name,
      hasResponseFields: customType?.responseFields?.length > 0,
      responseFields: customType?.responseFields,
      identifierField: customType?.identifierField
    });

    // Check if we should use response field filtering
    // This applies to custom types with response fields OR when we detect array-based data that looks like feature toggles
    const sourceInstanceData = instanceData[migrationSource];
    const isArrayBasedData = sourceInstanceData && Array.isArray(sourceInstanceData.data);
    
    console.log('🔍 Data Structure Analysis:', {
      hasSourceData: !!sourceInstanceData,
      dataType: sourceInstanceData ? (Array.isArray(sourceInstanceData.data) ? 'Array' : typeof sourceInstanceData.data) : 'none',
      isArrayBasedData,
      firstItem: isArrayBasedData ? (sourceInstanceData.data as unknown[])[0] : null,
      hasFeatureNameInFirstItem: isArrayBasedData && 
        (sourceInstanceData.data as unknown[]).length > 0 &&
        typeof (sourceInstanceData.data as unknown[])[0] === 'object' &&
        'FeatureName' in ((sourceInstanceData.data as unknown[])[0] as Record<string, unknown>)
    });
    
    const hasFeatureToggleStructure = isArrayBasedData && 
      (sourceInstanceData.data as unknown[]).length > 0 && 
      typeof (sourceInstanceData.data as unknown[])[0] === 'object' &&
      'FeatureName' in ((sourceInstanceData.data as unknown[])[0] as Record<string, unknown>);

    const shouldUseResponseFieldFiltering = 
      (customType && customType.responseFields && customType.responseFields.length > 0) ||
      (comparisonType === 'featureToggle') ||
      hasFeatureToggleStructure;

    console.log('🔍 Response Field Filtering Debug:', {
      isArrayBasedData,
      hasFeatureToggleStructure,
      shouldUseResponseFieldFiltering,
      dataStructure: isArrayBasedData ? 'Array' : 'Object'
    });

    // For response field filtering logic (custom types, feature toggles, or auto-detected feature toggle structure)
    if (shouldUseResponseFieldFiltering) {
      console.log('✅ Using response field filtering logic');
      
      // Get the source instance data directly
      if (!sourceInstanceData || !sourceInstanceData.data) {
        toast({
          title: "No Source Data",
          description: "Source instance has no data available",
          variant: "destructive",
        });
        return;
      }

      console.log('📊 Source data type:', Array.isArray(sourceInstanceData.data) ? 'Array' : 'Object');
      console.log('📊 Source data sample:', Array.isArray(sourceInstanceData.data) ? sourceInstanceData.data.slice(0, 2) : sourceInstanceData.data);

      // Determine response fields and identifier field
      let responseFields: string[] = [];
      let identifierField: string | undefined;

      if (customType && customType.responseFields && customType.responseFields.length > 0) {
        responseFields = customType.responseFields;
        identifierField = customType.identifierField;
      } else if (comparisonType === 'featureToggle' || hasFeatureToggleStructure) {
        // Default response fields for feature toggles
        responseFields = ['FeatureName', 'CurrentValue'];
        identifierField = 'FeatureName';
      }

      console.log('🔧 Using response fields:', responseFields);
      console.log('🆔 Using identifier field:', identifierField);

      let finalData: Record<string, unknown> | Record<string, unknown>[] = {};      if (identifierField && Array.isArray(sourceInstanceData.data)) {
        // Handle array-based data (like feature toggles)
        console.log('Processing array-based data with identifier field:', identifierField);
        const sourceArray = sourceInstanceData.data as Record<string, unknown>[];
        
        // Collect all unique identifiers from selected paths
        const selectedIdentifiers = new Set<string>();
        selectedForMigration.forEach(path => {
          // Extract identifier from path (e.g., "EnableInfoProtectionTrace.CurrentValue" -> "EnableInfoProtectionTrace")
          const identifierValue = path.split('.')[0];
          selectedIdentifiers.add(identifierValue);
        });

        console.log('Selected identifiers:', Array.from(selectedIdentifiers));

        // Find and filter corresponding items
        const selectedItems: Record<string, unknown>[] = [];
        selectedIdentifiers.forEach(identifier => {
          const sourceItem = sourceArray.find(item => 
            item[identifierField!] === identifier
          );
          
          if (sourceItem) {
            const filteredItem = filterObjectFields(sourceItem, responseFields);
            if (Object.keys(filteredItem).length > 0) {
              selectedItems.push(filteredItem);
            }
          }
        });

        console.log('Selected and filtered items:', selectedItems);

        // Always return as array since backend expects List<T> in Data property
        finalData = selectedItems;
      } else {
        // Handle object-based data or custom types without identifier field
        console.log('Processing object-based data');
        
        // Build migration data from selected paths
        const migrationData: Record<string, unknown> = {};
        
        selectedForMigration.forEach(path => {
          const result = activeSession.results.find(r => r.path === path);
          if (result && hasResultValues(result)) {
            const sourceValue = result.values[migrationSource];
            if (sourceValue !== undefined && sourceValue !== 'MISSING') {
              // Convert path like "config.theme" to nested object structure
              const pathParts = path.split('.');
              let current = migrationData;
              
              for (let i = 0; i < pathParts.length - 1; i++) {
                const part = pathParts[i];
                if (!(part in current)) {
                  current[part] = {};
                }
                current = current[part] as Record<string, unknown>;
              }
              
              current[pathParts[pathParts.length - 1]] = sourceValue;
            }
          }
        });

        // Apply response field filtering to the migration data
        finalData = filterObjectFields(migrationData, responseFields);
      }

      console.log('Final migration data:', finalData);

      if (Object.keys(finalData).length === 0) {
        toast({
          title: "No Data to Migrate",
          description: "No matching data found for the selected response fields",
          variant: "destructive",
        });
        return;
      }
      
      try {
        await dispatch(postInstanceData({
          instanceId: migrationTarget,
          endpoint: currentSaveEndpoint,
          data: { "Data": finalData }
        }));

        toast({
          title: "Migration Successful",
          description: `Selected fields migrated to ${getInstanceName(migrationTarget)}`,
        });

        setSelectedForMigration([]);
        return;
      } catch (error) {
        toast({
          title: "Migration Failed",
          description: "Failed to migrate settings",
          variant: "destructive",
        });
        return;
      }
    }

    // Original logic for built-in comparison types and custom types without response fields
    console.log('⚠️  Using original migration logic (nested path structure)');
    const migrationData: Record<string, unknown> = {};
    
    // Extract values from the selected comparison results
    selectedForMigration.forEach(path => {
      const result = activeSession.results.find(r => r.path === path);
      if (result && hasResultValues(result)) {
        // Get the value from the source instance
        const sourceValue = result.values[migrationSource];
        if (sourceValue !== undefined && sourceValue !== 'MISSING') {
          // Convert path like "config.theme" to nested object structure
          const pathParts = path.split('.');
          let current = migrationData;
          
          for (let i = 0; i < pathParts.length - 1; i++) {
            const part = pathParts[i];
            if (!(part in current)) {
              current[part] = {};
            }
            current = current[part] as Record<string, unknown>;
          }
          
          // Set the final value
          current[pathParts[pathParts.length - 1]] = sourceValue;
        }
      }
    });

    if (Object.keys(migrationData).length === 0) {
      toast({
        title: "No Data to Migrate",
        description: "No valid data found in source instance for selected settings",
        variant: "destructive",
      });
      return;
    }
    
    try {
      await dispatch(postInstanceData({
        instanceId: migrationTarget,
        endpoint: currentSaveEndpoint,
        data: { "Data": migrationData }
      }));

      toast({
        title: "Migration Successful",
        description: `${selectedForMigration.length} settings migrated to ${getInstanceName(migrationTarget)}`,
      });

      setSelectedForMigration([]);
    } catch (error) {
      toast({
        title: "Migration Failed",
        description: "Failed to migrate settings",
        variant: "destructive",
      });
    }
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
                              <Badge 
                                variant={baseInstanceId === id ? "default" : "outline"} 
                                className={`text-xs ${baseInstanceId === id ? 'bg-primary' : ''}`}
                              >
                                {getInstanceName(id)}
                                {baseInstanceId === id && ' (Base)'}
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
                {/* Migration Controls */}
        {activeSession && (
          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <ArrowRight className="h-5 w-5 text-primary" />
                <span>Configuration Migration</span>
              </CardTitle>
              <CardDescription>
                Select differences to migrate between instances
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium mb-2 block">Source Instance</label>
                  <Select value={migrationSource} onValueChange={setMigrationSource}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select source..." />
                    </SelectTrigger>
                    <SelectContent>
                      {activeSession.instanceIds.map((id) => (
                        <SelectItem key={id} value={id}>
                          {getInstanceName(id)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <label className="text-sm font-medium mb-2 block">Target Instance</label>
                  <Select value={migrationTarget} onValueChange={setMigrationTarget}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select target..." />
                    </SelectTrigger>
                    <SelectContent>
                      {activeSession.instanceIds
                        .filter(id => id !== migrationSource)
                        .map((id) => (
                          <SelectItem key={id} value={id}>
                            {getInstanceName(id)}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {selectedForMigration.length > 0 && (
                <div className="flex items-center justify-between p-3 bg-primary/5 rounded-lg">
                  <span className="text-sm">
                    <strong>{selectedForMigration.length}</strong> of <strong>{getFilteredResults().length}</strong> settings selected for migration
                    {getFilteredResults().length > 0 && selectedForMigration.length === getFilteredResults().length && (
                      <span className="text-primary ml-1">(All selected)</span>
                    )}
                  </span>
                  <Button
                    onClick={handleMigration}
                    disabled={loading || !migrationTarget || !migrationSource}
                    size="sm"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Migrating...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Migrate Settings
                      </>
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

          {/* Summary Statistics */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <Card 
              className={`cursor-pointer transition-all hover:shadow-md ${activeFilter === 'all' ? 'border-primary bg-primary/5' : ''}`}
              onClick={() => handleFilterClick('all')}
            >
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
            
            <Card 
              className={`cursor-pointer transition-all hover:shadow-md ${activeFilter === 'added' ? 'border-primary bg-primary/5' : ''}`}
              onClick={() => handleFilterClick('added')}
            >
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
            
            <Card 
              className={`cursor-pointer transition-all hover:shadow-md ${activeFilter === 'deleted' ? 'border-primary bg-primary/5' : ''}`}
              onClick={() => handleFilterClick('deleted')}
            >
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
            
            <Card 
              className={`cursor-pointer transition-all hover:shadow-md ${activeFilter === 'edited' ? 'border-primary bg-primary/5' : ''}`}
              onClick={() => handleFilterClick('edited')}
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Modified</p>
                    <p className="text-2xl font-bold text-warning">
                      {activeSession.summary.edited}
                    </p>
                  </div>
                  <Pencil className="h-8 w-8 text-warning" />
                </div>
              </CardContent>
            </Card>
          </div>

        {/* Detailed Differences */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <CardTitle>
                    Detailed Differences
                    <span className="ml-2 text-sm font-normal text-muted-foreground">
                      ({getFilteredResults().length} {activeFilter === 'all' ? 'total' : activeFilter})
                    </span>
                  </CardTitle>
                  {getFilteredResults().length > 0 && (
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        checked={isAllSelected()}
                        onCheckedChange={handleSelectAllMigration}
                        className={isIndeterminate() ? "data-[state=checked]:bg-primary data-[state=checked]:border-primary" : ""}
                        style={{
                          backgroundColor: isIndeterminate() ? 'var(--primary)' : undefined,
                          borderColor: isIndeterminate() ? 'var(--primary)' : undefined,
                        }}
                      />
                      <label className="text-sm font-medium cursor-pointer" onClick={() => handleSelectAllMigration(!isAllSelected())}>
                        Select All for Migration
                      </label>
                    </div>
                  )}
                </div>
                {activeFilter !== 'all' && (
                  <Badge variant="outline" className="text-xs">
                    Filter: {activeFilter.charAt(0).toUpperCase() + activeFilter.slice(1)}
                  </Badge>
                )}
              </div>
          <CardDescription>
            {activeFilter === 'all' 
              ? 'Complete breakdown of all differences found in the comparison. Select items to migrate.'
              : `Showing ${activeFilter} differences only. Click on any statistics card above to change the filter.`
            }
          </CardDescription>
            </CardHeader>
            <CardContent>
              {getFilteredResults().length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">
                    {activeFilter === 'all' ? 'No differences found' : `No ${activeFilter} differences found`}
                  </p>
                  <p className="text-sm text-muted-foreground/75 mt-1">
                    {activeFilter === 'all' 
                      ? 'The compared instances have identical JSON structures and values'
                      : `There are no ${activeFilter} differences in this comparison. Try selecting a different filter.`
                    }
                  </p>
                </div>
              ) : (
        <div className="grid grid-cols-1 gap-4">
          {getFilteredResults().map((result, index) => {
            const isExpanded = expandedItems.has(index);
            return (
              <div
                key={index}
                className="rounded-lg border bg-card hover:bg-muted/20 transition-colors"
              >
                {/* Card Header - Always Visible - Single Line Layout */}
                <div 
                  className="flex items-center space-x-3 p-3 cursor-pointer"
                  onClick={() => toggleExpansion(index)}
                >
                  {/* Migrate Checkbox */}
                  <div 
                    className="flex-shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Checkbox
                      id={`migrate-${index}`}
                      checked={selectedForMigration.includes(result.path)}
                      onCheckedChange={(checked) => 
                        handleMigrationSelection(result.path, checked as boolean)
                      }
                    />
                    {/* Migrate Label */}
                  <span className="text-xs text-muted-foreground flex-shrink-0 pl-2">
                    Migrate
                  </span>
                  </div>
                  
                  {/* Type Icon */}
                  <div className="flex-shrink-0">
                    {getDifferenceTypeIcon(result.type)}
                  </div>
                  
                  {/* Type Badge */}
                  <Badge 
                    variant={getDifferenceTypeColor(result.type)}
                    className="text-xs capitalize flex-shrink-0"
                  >
                    {result.type}
                  </Badge>
                  
                  {/* Path */}
                  <code className="text-sm font-mono px-2 py-1 rounded flex-1 min-w-0 truncate">
                    {result.path}
                  </code>
                  
                  

                  {/* Expand/Collapse Button */}
                  <div className="flex-shrink-0 p-1">
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </div>

                {/* Card Content - Collapsible */}
                {isExpanded && (
                  <div className="px-3 pb-3 border-t ">
                    <div className="pt-3 space-y-3">
                      {/* Description */}
                      <p className="text-sm text-muted-foreground italic">
                        {result.description}
                      </p>
                      
                      {/* Display values - support both old and new formats */}
                      {hasResultValues(result) ? (
                        // New format: multiple instances with values object
                        <div className="space-y-2">
                          {Object.entries(result.values).map(([instanceId, value]) => {
                            const isBaseInstance = baseInstanceId === instanceId;
                            const isMissing = value === 'MISSING';
                            return (
                              <div key={instanceId} className="text-xs">
                                <span className={`font-medium ${isBaseInstance ? 'text-primary' : isMissing ? 'text-destructive' : 'text-muted-foreground'}`}>
                                  {getInstanceName(instanceId)}
                                  {isBaseInstance && ' (Base)'}:
                                </span>
                                <code className={`ml-2 px-2 py-1 rounded ${isMissing ? 'bg-destructive/10 text-destructive' : isBaseInstance ? 'bg-primary/10' : 'bg-muted'}`}>
                                  {isMissing ? 'MISSING' : JSON.stringify(value)}
                                </code>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        // Legacy format: leftValue/rightValue
                        ((result as LegacyComparisonResult).leftValue !== undefined || (result as LegacyComparisonResult).rightValue !== undefined) && (
                          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                            {(result as LegacyComparisonResult).leftValue !== undefined && (
                              <div className="text-xs">
                                <span className="font-medium text-destructive">
                                  {getInstanceName(activeSession.instanceIds[0])}:
                                </span>
                                <code className="ml-2 bg-destructive/10 px-2 py-1 rounded">
                                  {JSON.stringify((result as LegacyComparisonResult).leftValue)}
                                </code>
                              </div>
                            )}
                            {(result as LegacyComparisonResult).rightValue !== undefined && (
                              <div className="text-xs">
                                <span className="font-medium text-success">
                                  {getInstanceName(activeSession.instanceIds[1])}:
                                </span>
                                <code className="ml-2 bg-success/10 px-2 py-1 rounded">
                                  {JSON.stringify((result as LegacyComparisonResult).rightValue)}
                                </code>
                              </div>
                            )}
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
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