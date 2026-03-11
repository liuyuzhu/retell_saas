"use client";

import { DashboardLayout } from "@/components/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { Bot, Plus, Trash2, Edit, RefreshCw, Settings } from "lucide-react";
import { useEffect, useState } from "react";
import { Agent, CreateAgentRequest, UpdateAgentRequest } from "@/lib/retell-types";

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [formData, setFormData] = useState<CreateAgentRequest>({
    agent_name: "",
    voice_id: "",
    llm_model: "gpt-4o",
    llm_temperature: 0.7,
    llm_system_prompt: "",
    response_engine: {
      type: "retell-llm",
    },
    enable_backchannel: false,
    voicemail_detection_enabled: true,
    emotional_authenticity: 0.5,
    interrupt_sensitivity: 0.5,
    speed: 1.0,
  });

  const fetchAgents = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/agents");
      const data = await res.json();
      setAgents(data.data || []);
    } catch (error) {
      console.error("Error fetching agents:", error);
      toast.error("Failed to fetch agents");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgents();
  }, []);

  const handleCreate = async () => {
    try {
      const res = await fetch("/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to create agent");
      }
      
      toast.success("Agent created successfully");
      setCreateDialogOpen(false);
      resetForm();
      fetchAgents();
    } catch (error) {
      console.error("Error creating agent:", error);
      toast.error(error instanceof Error ? error.message : "Failed to create agent");
    }
  };

  const handleUpdate = async () => {
    if (!selectedAgent) return;
    
    try {
      const updateData: UpdateAgentRequest = { ...formData };
      
      const res = await fetch(`/api/agents/${selectedAgent.agent_id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to update agent");
      }
      
      toast.success("Agent updated successfully");
      setEditDialogOpen(false);
      setSelectedAgent(null);
      fetchAgents();
    } catch (error) {
      console.error("Error updating agent:", error);
      toast.error(error instanceof Error ? error.message : "Failed to update agent");
    }
  };

  const handleDelete = async (agentId: string) => {
    try {
      const res = await fetch(`/api/agents/${agentId}`, {
        method: "DELETE",
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to delete agent");
      }
      
      toast.success("Agent deleted successfully");
      fetchAgents();
    } catch (error) {
      console.error("Error deleting agent:", error);
      toast.error(error instanceof Error ? error.message : "Failed to delete agent");
    }
  };

  const resetForm = () => {
    setFormData({
      agent_name: "",
      voice_id: "",
      llm_model: "gpt-4o",
      llm_temperature: 0.7,
      llm_system_prompt: "",
      response_engine: {
        type: "retell-llm",
      },
      enable_backchannel: false,
      voicemail_detection_enabled: true,
      emotional_authenticity: 0.5,
      interrupt_sensitivity: 0.5,
      speed: 1.0,
    });
  };

  const openEditDialog = (agent: Agent) => {
    setSelectedAgent(agent);
    setFormData({
      agent_name: agent.agent_name || "",
      voice_id: agent.voice_id || "",
      llm_model: agent.llm_model || "gpt-4o",
      llm_temperature: agent.llm_temperature || 0.7,
      llm_system_prompt: agent.llm_system_prompt || "",
      response_engine: agent.response_engine || { type: "retell-llm" },
      enable_backchannel: agent.enable_backchannel || false,
      voicemail_detection_enabled: agent.voicemail_detection_enabled ?? true,
      emotional_authenticity: agent.emotional_authenticity || 0.5,
      interrupt_sensitivity: agent.interrupt_sensitivity || 0.5,
      speed: agent.speed || 1.0,
    });
    setEditDialogOpen(true);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Agents</h1>
            <p className="text-muted-foreground">
              Manage your AI voice agents
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={fetchAgents} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Agent
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create AI Agent</DialogTitle>
                  <DialogDescription>
                    Configure a new AI voice agent
                  </DialogDescription>
                </DialogHeader>
                <AgentForm formData={formData} setFormData={setFormData} />
                <DialogFooter>
                  <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreate}>Create</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Agents</CardTitle>
            <CardDescription>
              A list of all AI voice agents in your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : agents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <Bot className="h-12 w-12 mb-4" />
                <p>No agents found</p>
                <p className="text-sm">Create your first agent to get started</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {agents.map((agent) => (
                  <div
                    key={agent.agent_id}
                    className="flex items-start justify-between rounded-lg border p-4"
                  >
                    <div className="flex items-start gap-4">
                      <Bot className="h-5 w-5 text-muted-foreground mt-1" />
                      <div className="space-y-1">
                        <p className="font-medium">{agent.agent_name || "Unnamed Agent"}</p>
                        <p className="text-sm text-muted-foreground font-mono">{agent.agent_id}</p>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {agent.voice_id && (
                            <Badge variant="outline">Voice: {agent.voice_id}</Badge>
                          )}
                          {agent.llm_model && (
                            <Badge variant="secondary">{agent.llm_model}</Badge>
                          )}
                          {agent.enable_backchannel && (
                            <Badge>Backchannel</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => openEditDialog(agent)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" size="sm">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Agent</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete {agent.agent_name || agent.agent_id}? This action
                              cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(agent.agent_id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Agent</DialogTitle>
              <DialogDescription>
                Update agent configuration
              </DialogDescription>
            </DialogHeader>
            <AgentForm formData={formData} setFormData={setFormData} />
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdate}>Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}

// Agent Form Component
function AgentForm({
  formData,
  setFormData,
}: {
  formData: CreateAgentRequest;
  setFormData: React.Dispatch<React.SetStateAction<CreateAgentRequest>>;
}) {
  return (
    <div className="grid gap-4 py-4">
      <div className="grid gap-2">
        <Label htmlFor="agent_name">Agent Name</Label>
        <Input
          id="agent_name"
          placeholder="My AI Agent"
          value={formData.agent_name}
          onChange={(e) => setFormData({ ...formData, agent_name: e.target.value })}
        />
      </div>
      
      <div className="grid gap-2">
        <Label htmlFor="voice_id">Voice ID</Label>
        <Input
          id="voice_id"
          placeholder="elevenlabs_xxx"
          value={formData.voice_id}
          onChange={(e) => setFormData({ ...formData, voice_id: e.target.value })}
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="llm_model">LLM Model</Label>
        <Select
          value={formData.llm_model}
          onValueChange={(value) => setFormData({ ...formData, llm_model: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select model" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="gpt-4o">GPT-4o</SelectItem>
            <SelectItem value="gpt-4o-mini">GPT-4o Mini</SelectItem>
            <SelectItem value="gpt-4-turbo">GPT-4 Turbo</SelectItem>
            <SelectItem value="claude-3-5-sonnet">Claude 3.5 Sonnet</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-2">
        <Label>Temperature: {formData.llm_temperature}</Label>
        <Slider
          value={[formData.llm_temperature || 0.7]}
          onValueChange={([value]) => setFormData({ ...formData, llm_temperature: value })}
          min={0}
          max={2}
          step={0.1}
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="system_prompt">System Prompt</Label>
        <Textarea
          id="system_prompt"
          placeholder="You are a helpful AI assistant..."
          value={formData.llm_system_prompt}
          onChange={(e) => setFormData({ ...formData, llm_system_prompt: e.target.value })}
          rows={4}
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="response_engine">Response Engine Type</Label>
        <Select
          value={formData.response_engine?.type}
          onValueChange={(value) =>
            setFormData({
              ...formData,
              response_engine: { type: value as "retell-llm" | "bring-your-own-llm" | "llm-webhook" },
            })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Select type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="retell-llm">Retell LLM</SelectItem>
            <SelectItem value="bring-your-own-llm">Bring Your Own LLM</SelectItem>
            <SelectItem value="llm-webhook">LLM Webhook</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-2">
        <Label>Emotional Authenticity: {formData.emotional_authenticity}</Label>
        <Slider
          value={[formData.emotional_authenticity || 0.5]}
          onValueChange={([value]) => setFormData({ ...formData, emotional_authenticity: value })}
          min={0}
          max={1}
          step={0.1}
        />
      </div>

      <div className="grid gap-2">
        <Label>Interrupt Sensitivity: {formData.interrupt_sensitivity}</Label>
        <Slider
          value={[formData.interrupt_sensitivity || 0.5]}
          onValueChange={([value]) => setFormData({ ...formData, interrupt_sensitivity: value })}
          min={0}
          max={1}
          step={0.1}
        />
      </div>

      <div className="grid gap-2">
        <Label>Speed: {formData.speed}x</Label>
        <Slider
          value={[formData.speed || 1]}
          onValueChange={([value]) => setFormData({ ...formData, speed: value })}
          min={0.5}
          max={2}
          step={0.1}
        />
      </div>

      <div className="flex items-center justify-between">
        <Label htmlFor="backchannel">Enable Backchannel</Label>
        <Switch
          id="backchannel"
          checked={formData.enable_backchannel}
          onCheckedChange={(checked) => setFormData({ ...formData, enable_backchannel: checked })}
        />
      </div>

      <div className="flex items-center justify-between">
        <Label htmlFor="voicemail">Voicemail Detection</Label>
        <Switch
          id="voicemail"
          checked={formData.voicemail_detection_enabled}
          onCheckedChange={(checked) =>
            setFormData({ ...formData, voicemail_detection_enabled: checked })
          }
        />
      </div>
    </div>
  );
}
