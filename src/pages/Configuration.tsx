import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useAppDispatch, useAppSelector } from '@/hooks/useRedux';
import { addInstance, updateInstance, removeInstance, toggleInstanceActive } from '@/store/slices/instancesSlice';
import { Plus, Trash2, Server, Link, Key, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import DemoDataBanner from '@/components/DemoDataBanner';

const Configuration: React.FC = () => {
  const dispatch = useAppDispatch();
  const { instances } = useAppSelector((state) => state.instances);
  const { toast } = useToast();
  
  const [newInstance, setNewInstance] = useState({
    name: '',
    url: '',
    authKey: '',
    isActive: true,
  });

  const handleAddInstance = () => {
    if (!newInstance.name || !newInstance.url) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    dispatch(addInstance(newInstance));
    setNewInstance({ name: '', url: '', authKey: '', isActive: true });
    
    toast({
      title: "Instance Added",
      description: `${newInstance.name} has been successfully configured`,
    });
  };

  const handleRemoveInstance = (id: string) => {
    dispatch(removeInstance(id));
    toast({
      title: "Instance Removed",
      description: "Instance configuration has been deleted",
    });
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'connected':
        return <CheckCircle className="h-4 w-4 text-success" />;
      case 'loading':
        return <Clock className="h-4 w-4 text-warning animate-spin" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-destructive" />;
      default:
        return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'connected':
        return 'success';
      case 'loading':
        return 'warning';
      case 'error':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  return (
    <div className="space-y-8">
      {/* Demo Data Banner */}
      <DemoDataBanner />

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Instance Configuration</h1>
        <p className="mt-2 text-muted-foreground">
          Manage your API endpoints and authentication settings for JSON comparison
        </p>
      </div>

      {/* Add New Instance Card */}
      <Card className="border-primary/20 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Plus className="h-5 w-5 text-primary" />
            <span>Add New Instance</span>
          </CardTitle>
          <CardDescription>
            Configure a new API endpoint for JSON data comparison
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="name">Instance Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Production, Staging, Development"
                value={newInstance.name}
                onChange={(e) => setNewInstance({ ...newInstance, name: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="url">API URL *</Label>
              <Input
                id="url"
                placeholder="https://api.example.com"
                value={newInstance.url}
                onChange={(e) => setNewInstance({ ...newInstance, url: e.target.value })}
                className="mt-1"
              />
            </div>
          </div>
          
          <div>
            <Label htmlFor="authKey">Authentication Key</Label>
            <Input
              id="authKey"
              type="password"
              placeholder="Bearer token or API key"
              value={newInstance.authKey}
              onChange={(e) => setNewInstance({ ...newInstance, authKey: e.target.value })}
              className="mt-1"
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <Switch
              id="active"
              checked={newInstance.isActive}
              onCheckedChange={(checked) => setNewInstance({ ...newInstance, isActive: checked })}
            />
            <Label htmlFor="active">Active by default</Label>
          </div>
          
          <Button 
            onClick={handleAddInstance}
            className="w-full md:w-auto"
            size="lg"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Instance
          </Button>
        </CardContent>
      </Card>

      {/* Instances List */}
      <div>
        <h2 className="mb-6 text-xl font-semibold text-foreground">Configured Instances</h2>
        
        {instances.length === 0 ? (
          <Card className="border-dashed border-2 border-muted-foreground/25">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Server className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-lg font-medium text-muted-foreground">No instances configured</p>
              <p className="text-sm text-muted-foreground/75 mt-1">
                Add your first API endpoint to start comparing JSON data
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {instances.map((instance) => (
              <Card key={instance.id} className="transition-all hover:shadow-md">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                        <Server className="h-6 w-6 text-primary" />
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <h3 className="font-semibold text-foreground">{instance.name}</h3>
                          <Badge 
                            variant={getStatusColor(instance.status) as any}
                            className="text-xs"
                          >
                            <div className="flex items-center space-x-1">
                              {getStatusIcon(instance.status)}
                              <span className="capitalize">{instance.status || 'disconnected'}</span>
                            </div>
                          </Badge>
                        </div>
                        
                        <div className="mt-1 flex items-center space-x-4 text-sm text-muted-foreground">
                          <div className="flex items-center space-x-1">
                            <Link className="h-3 w-3" />
                            <span>{instance.url}</span>
                          </div>
                          {instance.authKey && (
                            <div className="flex items-center space-x-1">
                              <Key className="h-3 w-3" />
                              <span>Authenticated</span>
                            </div>
                          )}
                        </div>
                        
                        {instance.lastSync && (
                          <p className="mt-1 text-xs text-muted-foreground">
                            Last sync: {new Date(instance.lastSync).toLocaleString()}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={instance.isActive}
                        onCheckedChange={() => dispatch(toggleInstanceActive(instance.id))}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRemoveInstance(instance.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Configuration;