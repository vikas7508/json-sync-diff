import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAppDispatch, useAppSelector } from '@/hooks/useRedux';
import { fetchInstanceData } from '@/store/slices/instancesSlice';
import { setSelectedInstances, setBaseInstanceId, setComparisonType, createComparisonSession, ComparisonData, addCustomComparisonType, updateCustomComparisonType, deleteCustomComparisonType, updateBuiltInEndpoints } from '@/store/slices/comparisonSlice';
import { GitCompare, Settings, Database, ToggleLeft, Play, Loader2, Copy, Check, Plus, Trash2, Edit } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import ReactJson from "@microlink/react-json-view";

const Compare: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { instances, instanceData, loading } = useAppSelector((state) => state.instances);
  const { selectedInstances, baseInstanceId, comparisonType, currentFetchEndpoint, currentSaveEndpoint, customTypes, builtInEndpoints } = useAppSelector((state) => state.comparison);
  const { toast } = useToast();
  
  const [sessionName, setSessionName] = useState('');
  const [copiedInstances, setCopiedInstances] = useState<Set<string>>(new Set());
  const [showCustomTypeDialog, setShowCustomTypeDialog] = useState(false);
  const [showEditEndpointsDialog, setShowEditEndpointsDialog] = useState(false);
  const [editingType, setEditingType] = useState<string>('');
  const [editingEndpoints, setEditingEndpoints] = useState({ 
    fetchEndpoint: '', 
    saveEndpoint: '', 
    requestBody: '' 
  });
  const [newCustomType, setNewCustomType] = useState({
    name: '',
    label: '',
    fetchEndpoint: '',
    saveEndpoint: '',
    description: '',
    sampleData: '',
    comparisonFields: [] as string[],
    responseFields: [] as string[],
    identifierField: '',
    requestBody: '',
  });

  const activeInstances = instances.filter(i => i.isActive);

  const comparisonTypes = [
    { 
      value: 'settings', 
      label: 'Settings', 
      icon: Settings, 
      fetchEndpoint: '/api/settings',
      saveEndpoint: '/TurnOn',
      description: 'Compare application configuration settings'
    },
    { 
      value: 'codeTable', 
      label: 'Code Tables', 
      icon: Database, 
      fetchEndpoint: '/api/code-table',
      saveEndpoint: '/TurnOn',
      description: 'Compare lookup tables and reference data'
    },
    { 
      value: 'featureToggle', 
      label: 'Feature Toggles', 
      icon: ToggleLeft, 
      fetchEndpoint: '/GetAllFeatureFlags',
      saveEndpoint: '/TurnOnToggles',
      description: 'Compare feature flags and toggles'
    },
    // Add custom types
    ...(customTypes || []).map(customType => ({
      value: customType.id,
      label: customType.label,
      icon: Database, // Default icon for custom types
      fetchEndpoint: customType.fetchEndpoint,
      saveEndpoint: customType.saveEndpoint,
      description: customType.description,
      isCustom: true,
    })),
  ];

  const handleInstanceSelection = (instanceId: string, checked: boolean) => {
    const updated = checked
      ? [...selectedInstances, instanceId]
      : selectedInstances.filter(id => id !== instanceId);
    dispatch(setSelectedInstances(updated));
  };

  const handleComparisonTypeChange = (type: 'settings' | 'codeTable' | 'featureToggle' | string) => {
    dispatch(setComparisonType(type));
  };

  const handleCreateCustomType = () => {
    if (!newCustomType.name || !newCustomType.label || !newCustomType.fetchEndpoint || !newCustomType.saveEndpoint) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    let parsedSampleData;
    try {
      parsedSampleData = JSON.parse(newCustomType.sampleData);
    } catch (error) {
      toast({
        title: "Invalid JSON",
        description: "Please provide valid JSON sample data",
        variant: "destructive",
      });
      return;
    }

    const fields = newCustomType.comparisonFields.filter(f => f.trim());
    if (fields.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please specify at least one comparison field",
        variant: "destructive",
      });
      return;
    }

    // Parse request body if provided
    let parsedRequestBody: Record<string, unknown> | undefined;
    if (newCustomType.requestBody.trim()) {
      try {
        parsedRequestBody = JSON.parse(newCustomType.requestBody);
      } catch (error) {
        toast({
          title: "Invalid JSON",
          description: "Request body must be valid JSON format",
          variant: "destructive",
        });
        return;
      }
    }

    dispatch(addCustomComparisonType({
      name: newCustomType.name,
      label: newCustomType.label,
      fetchEndpoint: newCustomType.fetchEndpoint,
      saveEndpoint: newCustomType.saveEndpoint,
      description: newCustomType.description,
      sampleData: parsedSampleData,
      comparisonFields: fields,
      responseFields: newCustomType.responseFields,
      identifierField: newCustomType.identifierField || undefined,
      requestBody: parsedRequestBody,
    }));

    // Reset form and close dialog
    setNewCustomType({
      name: '',
      label: '',
      fetchEndpoint: '',
      saveEndpoint: '',
      description: '',
      sampleData: '',
      comparisonFields: [],
      responseFields: [],
      identifierField: '',
      requestBody: '',
    });
    setShowCustomTypeDialog(false);

    toast({
      title: "Custom Type Created",
      description: `${newCustomType.label} comparison type has been created successfully`,
    });
  };

  const handleDeleteCustomType = (customTypeId: string) => {
    const customType = customTypes?.find(t => t.id === customTypeId);
    dispatch(deleteCustomComparisonType(customTypeId));
    
    toast({
      title: "Custom Type Deleted",
      description: `${customType?.label || 'Custom type'} has been deleted`,
    });
  };

  const handleEditBuiltInType = (typeName: string) => {
    const config = builtInEndpoints[typeName];
    if (config) {
      setEditingType(typeName);
      setEditingEndpoints({
        fetchEndpoint: config.fetchEndpoint,
        saveEndpoint: config.saveEndpoint,
        requestBody: config.requestBody ? JSON.stringify(config.requestBody, null, 2) : ''
      });
      setShowEditEndpointsDialog(true);
    }
  };

  const handleEditCustomType = (customTypeId: string) => {
    const customType = customTypes?.find(t => t.id === customTypeId);
    if (customType) {
      setNewCustomType({
        name: customType.name,
        label: customType.label,
        fetchEndpoint: customType.fetchEndpoint,
        saveEndpoint: customType.saveEndpoint,
        description: customType.description,
        sampleData: JSON.stringify(customType.sampleData, null, 2),
        comparisonFields: customType.comparisonFields,
        identifierField: customType.identifierField || '',
        responseFields: customType.responseFields || [],
        requestBody: customType.requestBody ? JSON.stringify(customType.requestBody, null, 2) : '',
      });
      setEditingType(customTypeId);
      setShowCustomTypeDialog(true);
    }
  };

  const handleUpdateBuiltInEndpoints = () => {
    if (editingType && editingEndpoints.fetchEndpoint && editingEndpoints.saveEndpoint) {
      // Parse request body if provided
      let requestBody: Record<string, unknown> | undefined;
      if (editingEndpoints.requestBody.trim()) {
        try {
          requestBody = JSON.parse(editingEndpoints.requestBody);
        } catch (error) {
          toast({
            title: "Invalid JSON",
            description: "Request body must be valid JSON format",
            variant: "destructive",
          });
          return;
        }
      }

      dispatch(updateBuiltInEndpoints({
        type: editingType,
        fetchEndpoint: editingEndpoints.fetchEndpoint,
        saveEndpoint: editingEndpoints.saveEndpoint,
        requestBody
      }));
      
      toast({
        title: "Endpoints Updated",
        description: `${editingType} endpoints have been updated`,
      });
      
      setShowEditEndpointsDialog(false);
      setEditingType('');
      setEditingEndpoints({ fetchEndpoint: '', saveEndpoint: '', requestBody: '' });
    }
  };

  const handleUpdateCustomType = () => {
    if (editingType) {
      const customType = customTypes?.find(t => t.id === editingType);
      if (customType) {
        // Parse request body if provided
        let parsedRequestBody: Record<string, unknown> | undefined;
        if (newCustomType.requestBody.trim()) {
          try {
            parsedRequestBody = JSON.parse(newCustomType.requestBody);
          } catch (error) {
            toast({
              title: "Invalid JSON",
              description: "Request body must be valid JSON format",
              variant: "destructive",
            });
            return;
          }
        }

        dispatch(updateCustomComparisonType({
          ...customType,
          name: newCustomType.name,
          label: newCustomType.label,
          fetchEndpoint: newCustomType.fetchEndpoint,
          saveEndpoint: newCustomType.saveEndpoint,
          description: newCustomType.description,
          sampleData: JSON.parse(newCustomType.sampleData),
          comparisonFields: newCustomType.comparisonFields,
          responseFields: newCustomType.responseFields,
          identifierField: newCustomType.identifierField || undefined,
          requestBody: parsedRequestBody,
        }));
        
        toast({
          title: "Custom Type Updated",
          description: `${newCustomType.label} has been updated`,
        });
        
        setShowCustomTypeDialog(false);
        setEditingType('');
        setNewCustomType({
          name: '',
          label: '',
          fetchEndpoint: '',
          saveEndpoint: '',
          description: '',
          sampleData: '',
          comparisonFields: [],
          identifierField: '',
          responseFields: [],
          requestBody: '',
        });
      }
    }
  };

  const extractFieldsFromSampleData = (jsonData: string) => {
    try {
      const parsed = JSON.parse(jsonData);
      const paths: string[] = [];
      
      const traverse = (obj: unknown, currentPath: string = '') => {
        if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
          Object.keys(obj as Record<string, unknown>).forEach(key => {
            const newPath = currentPath ? `${currentPath}.${key}` : key;
            paths.push(newPath);
            const value = (obj as Record<string, unknown>)[key];
            if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
              traverse(value, newPath);
            }
          });
        }
      };
      
      if (Array.isArray(parsed) && parsed.length > 0) {
        traverse(parsed[0]);
      } else {
        traverse(parsed);
      }
      
      return paths;
    } catch {
      return [];
    }
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
      // Get request body configuration for the current comparison type
      let requestBody: Record<string, unknown> | undefined;
      
      // Check if it's a built-in type
      const endpointConfig = builtInEndpoints[comparisonType as keyof typeof builtInEndpoints];
      if (endpointConfig) {
        requestBody = endpointConfig.requestBody;
      } else {
        // Check if it's a custom type
        const customType = customTypes?.find(t => t.id === comparisonType);
        if (customType) {
          requestBody = customType.requestBody;
        }
      }

      // Fetch data from all selected instances
      const fetchPromises = selectedInstances.map(instanceId => 
        dispatch(fetchInstanceData({ 
          instanceId, 
          endpoint: currentFetchEndpoint,
          requestBody 
        }))
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
      endpoint: currentFetchEndpoint,
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
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Comparison Type</CardTitle>
              <CardDescription>Choose what type of data you want to compare</CardDescription>
            </div>
            <Dialog open={showCustomTypeDialog} onOpenChange={setShowCustomTypeDialog}>
              <DialogTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    setEditingType(''); // Reset editing state for create mode
                    setNewCustomType({
                      name: '',
                      label: '',
                      fetchEndpoint: '',
                      saveEndpoint: '',
                      description: '',
                      sampleData: '',
                      comparisonFields: [],
                      identifierField: '',
                      responseFields: [],
                      requestBody: '',
                    });
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Custom Type
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingType ? 'Edit Custom Comparison Type' : 'Create Custom Comparison Type'}
                  </DialogTitle>
                  <DialogDescription>
                    {editingType 
                      ? 'Modify the settings for this custom comparison type'
                      : 'Define a new comparison type with custom JSON structure and comparison fields'
                    }
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="type-name">Name *</Label>
                      <Input
                        id="type-name"
                        placeholder="e.g., userSettings"
                        value={newCustomType.name}
                        onChange={(e) => setNewCustomType({ ...newCustomType, name: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="type-label">Display Label *</Label>
                      <Input
                        id="type-label"
                        placeholder="e.g., User Settings"
                        value={newCustomType.label}
                        onChange={(e) => setNewCustomType({ ...newCustomType, label: e.target.value })}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="type-fetch-endpoint">Fetch Endpoint *</Label>
                    <Input
                      id="type-fetch-endpoint"
                      placeholder="e.g., /api/fetch-user-settings"
                      value={newCustomType.fetchEndpoint}
                      onChange={(e) => setNewCustomType({ ...newCustomType, fetchEndpoint: e.target.value })}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="type-save-endpoint">Save Endpoint *</Label>
                    <Input
                      id="type-save-endpoint"
                      placeholder="e.g., /api/save-user-settings"
                      value={newCustomType.saveEndpoint}
                      onChange={(e) => setNewCustomType({ ...newCustomType, saveEndpoint: e.target.value })}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="type-description">Description</Label>
                    <Input
                      id="type-description"
                      placeholder="Brief description of this comparison type"
                      value={newCustomType.description}
                      onChange={(e) => setNewCustomType({ ...newCustomType, description: e.target.value })}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="sample-data">Sample JSON Data *</Label>
                    <Textarea
                      id="sample-data"
                      placeholder='Paste sample JSON here, e.g., {"settings": {"theme": "dark"}, "preferences": {"notifications": true}}'
                      value={newCustomType.sampleData}
                      onChange={(e) => {
                        setNewCustomType({ ...newCustomType, sampleData: e.target.value });
                        // Auto-extract fields when valid JSON is pasted
                        const fields = extractFieldsFromSampleData(e.target.value);
                        if (fields.length > 0) {
                          setNewCustomType(prev => ({ ...prev, comparisonFields: fields }));
                        }
                      }}
                      className="min-h-[120px] font-mono"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="identifier-field">Identifier Field (for arrays)</Label>
                    <Input
                      id="identifier-field"
                      placeholder="e.g., id, name, key (leave empty for object comparison)"
                      value={newCustomType.identifierField}
                      onChange={(e) => setNewCustomType({ ...newCustomType, identifierField: e.target.value })}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      If your data is an array of objects, specify the field that uniquely identifies each item
                    </p>
                  </div>
                  
                  <div>
                    <Label>Comparison Fields *</Label>
                    <div className="space-y-2 mt-2">
                      {newCustomType.comparisonFields.map((field, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <Input
                            value={field}
                            onChange={(e) => {
                              const newFields = [...newCustomType.comparisonFields];
                              newFields[index] = e.target.value;
                              setNewCustomType({ ...newCustomType, comparisonFields: newFields });
                            }}
                            placeholder="Field path (e.g., settings.theme)"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const newFields = newCustomType.comparisonFields.filter((_, i) => i !== index);
                              setNewCustomType({ ...newCustomType, comparisonFields: newFields });
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setNewCustomType({ 
                            ...newCustomType, 
                            comparisonFields: [...newCustomType.comparisonFields, ''] 
                          });
                        }}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Field
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Specify which fields to compare. Use dot notation for nested fields (e.g., "user.preferences.theme")
                    </p>
                  </div>
                  
                  <div>
                    <Label>Response Fields (Optional)</Label>
                    <div className="space-y-2 mt-2">
                      {newCustomType.responseFields.map((field, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <Input
                            value={field}
                            onChange={(e) => {
                              const newFields = [...newCustomType.responseFields];
                              newFields[index] = e.target.value;
                              setNewCustomType({ ...newCustomType, responseFields: newFields });
                            }}
                            placeholder="Field path (e.g., user.id, settings.lastModified)"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const newFields = newCustomType.responseFields.filter((_, i) => i !== index);
                              setNewCustomType({ ...newCustomType, responseFields: newFields });
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setNewCustomType({ 
                            ...newCustomType, 
                            responseFields: [...newCustomType.responseFields, ''] 
                          });
                        }}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Response Field
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Specify which additional fields to include in the response object. Leave empty to include all fields from the source data.
                    </p>
                  </div>
                  
                  <div>
                    <Label htmlFor="custom-request-body">Request Body (Optional)</Label>
                    <Textarea
                      id="custom-request-body"
                      placeholder='Optional JSON body to send with requests, e.g., {"settingContextRecno": 1}'
                      value={newCustomType.requestBody}
                      onChange={(e) => setNewCustomType({ ...newCustomType, requestBody: e.target.value })}
                      className="min-h-[100px] font-mono"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      JSON object to include in the request body when fetching data. Leave empty for default behavior.
                    </p>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => {
                    setShowCustomTypeDialog(false);
                    setEditingType('');
                    setNewCustomType({
                      name: '',
                      label: '',
                      fetchEndpoint: '',
                      saveEndpoint: '',
                      description: '',
                      sampleData: '',
                      comparisonFields: [],
                      identifierField: '',
                      responseFields: [],
                      requestBody: '',
                    });
                  }}>
                    Cancel
                  </Button>
                  <Button onClick={editingType ? handleUpdateCustomType : handleCreateCustomType}>
                    {editingType ? 'Update Type' : 'Create Type'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Built-in Endpoints Edit Dialog */}
            <Dialog open={showEditEndpointsDialog} onOpenChange={setShowEditEndpointsDialog}>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Edit {editingType} Endpoints</DialogTitle>
                  <DialogDescription>
                    Configure the fetch and save endpoints for {editingType}
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="edit-fetch-endpoint">Fetch Endpoint *</Label>
                    <Input
                      id="edit-fetch-endpoint"
                      placeholder="e.g., /api/fetch-settings"
                      value={editingEndpoints.fetchEndpoint}
                      onChange={(e) => setEditingEndpoints({ 
                        ...editingEndpoints, 
                        fetchEndpoint: e.target.value 
                      })}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="edit-save-endpoint">Save Endpoint *</Label>
                    <Input
                      id="edit-save-endpoint"
                      placeholder="e.g., /api/save-settings"
                      value={editingEndpoints.saveEndpoint}
                      onChange={(e) => setEditingEndpoints({ 
                        ...editingEndpoints, 
                        saveEndpoint: e.target.value 
                      })}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="edit-request-body">Request Body (Optional)</Label>
                    <Textarea
                      id="edit-request-body"
                      placeholder='Optional JSON body to send with requests, e.g., {"settingContextRecno": 1}'
                      value={editingEndpoints.requestBody}
                      onChange={(e) => setEditingEndpoints({ 
                        ...editingEndpoints, 
                        requestBody: e.target.value 
                      })}
                      className="min-h-[100px] font-mono"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      JSON object to include in the request body when fetching data. Leave empty for default behavior.
                    </p>
                  </div>
                </div>

                <DialogFooter>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setShowEditEndpointsDialog(false);
                      setEditingType('');
                      setEditingEndpoints({ fetchEndpoint: '', saveEndpoint: '', requestBody: '' });
                    }}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleUpdateBuiltInEndpoints}>
                    Update Endpoints
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
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
                  onClick={() => handleComparisonTypeChange(type.value)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
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
                      <div className="flex items-center space-x-2">
                        {/* Edit button for all types */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            if ('isCustom' in type && type.isCustom) {
                              handleEditCustomType(type.value);
                            } else {
                              handleEditBuiltInType(type.value);
                            }
                          }}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        {/* Delete button only for custom types */}
                        {'isCustom' in type && type.isCustom && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteCustomType(type.value);
                            }}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
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