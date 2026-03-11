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
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Phone, Plus, Trash2, Edit, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { PhoneNumber, CreatePhoneNumberRequest, UpdatePhoneNumberRequest } from "@/lib/retell-types";

export default function PhoneNumbersPage() {
  const [phoneNumbers, setPhoneNumbers] = useState<PhoneNumber[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedPhone, setSelectedPhone] = useState<PhoneNumber | null>(null);
  const [formData, setFormData] = useState<CreatePhoneNumberRequest>({
    phone_number: "",
    nickname: "",
    agent_id: "",
    inbound_call_recording_enabled: false,
    outbound_call_recording_enabled: false,
  });

  const fetchPhoneNumbers = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/phone-numbers");
      const data = await res.json();
      setPhoneNumbers(data.data || []);
    } catch (error) {
      console.error("Error fetching phone numbers:", error);
      toast.error("Failed to fetch phone numbers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPhoneNumbers();
  }, []);

  const handleCreate = async () => {
    try {
      const res = await fetch("/api/phone-numbers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to create phone number");
      }
      
      toast.success("Phone number created successfully");
      setCreateDialogOpen(false);
      setFormData({
        phone_number: "",
        nickname: "",
        agent_id: "",
        inbound_call_recording_enabled: false,
        outbound_call_recording_enabled: false,
      });
      fetchPhoneNumbers();
    } catch (error) {
      console.error("Error creating phone number:", error);
      toast.error(error instanceof Error ? error.message : "Failed to create phone number");
    }
  };

  const handleUpdate = async () => {
    if (!selectedPhone) return;
    
    try {
      const updateData: UpdatePhoneNumberRequest = {
        nickname: formData.nickname,
        agent_id: formData.agent_id,
        inbound_call_recording_enabled: formData.inbound_call_recording_enabled,
        outbound_call_recording_enabled: formData.outbound_call_recording_enabled,
      };
      
      const res = await fetch(`/api/phone-numbers/${encodeURIComponent(selectedPhone.phone_number)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to update phone number");
      }
      
      toast.success("Phone number updated successfully");
      setEditDialogOpen(false);
      setSelectedPhone(null);
      fetchPhoneNumbers();
    } catch (error) {
      console.error("Error updating phone number:", error);
      toast.error(error instanceof Error ? error.message : "Failed to update phone number");
    }
  };

  const handleDelete = async (phoneNumber: string) => {
    try {
      const res = await fetch(`/api/phone-numbers/${encodeURIComponent(phoneNumber)}`, {
        method: "DELETE",
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to delete phone number");
      }
      
      toast.success("Phone number deleted successfully");
      fetchPhoneNumbers();
    } catch (error) {
      console.error("Error deleting phone number:", error);
      toast.error(error instanceof Error ? error.message : "Failed to delete phone number");
    }
  };

  const openEditDialog = (phone: PhoneNumber) => {
    setSelectedPhone(phone);
    setFormData({
      phone_number: phone.phone_number,
      nickname: phone.nickname || "",
      agent_id: phone.agent_id || "",
      inbound_call_recording_enabled: phone.inbound_call_recording_enabled || false,
      outbound_call_recording_enabled: phone.outbound_call_recording_enabled || false,
    });
    setEditDialogOpen(true);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Phone Numbers</h1>
            <p className="text-muted-foreground">
              Manage your Retell AI phone numbers
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={fetchPhoneNumbers} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Phone Number
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Phone Number</DialogTitle>
                  <DialogDescription>
                    Add a new phone number to your Retell AI account
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="phone_number">Phone Number *</Label>
                    <Input
                      id="phone_number"
                      placeholder="+1234567890"
                      value={formData.phone_number}
                      onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="nickname">Nickname</Label>
                    <Input
                      id="nickname"
                      placeholder="My Phone Number"
                      value={formData.nickname}
                      onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="agent_id">Agent ID</Label>
                    <Input
                      id="agent_id"
                      placeholder="agent_xxx"
                      value={formData.agent_id}
                      onChange={(e) => setFormData({ ...formData, agent_id: e.target.value })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="inbound_recording">Inbound Call Recording</Label>
                    <Switch
                      id="inbound_recording"
                      checked={formData.inbound_call_recording_enabled}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, inbound_call_recording_enabled: checked })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="outbound_recording">Outbound Call Recording</Label>
                    <Switch
                      id="outbound_recording"
                      checked={formData.outbound_call_recording_enabled}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, outbound_call_recording_enabled: checked })
                      }
                    />
                  </div>
                </div>
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
            <CardTitle>All Phone Numbers</CardTitle>
            <CardDescription>
              A list of all phone numbers in your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : phoneNumbers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <Phone className="h-12 w-12 mb-4" />
                <p>No phone numbers found</p>
                <p className="text-sm">Create your first phone number to get started</p>
              </div>
            ) : (
              <div className="space-y-4">
                {phoneNumbers.map((phone) => (
                  <div
                    key={phone.phone_number}
                    className="flex items-center justify-between rounded-lg border p-4"
                  >
                    <div className="flex items-center gap-4">
                      <Phone className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{phone.phone_number}</p>
                        {phone.nickname && (
                          <p className="text-sm text-muted-foreground">{phone.nickname}</p>
                        )}
                      </div>
                      {phone.agent_id && (
                        <Badge variant="secondary">Agent: {phone.agent_id}</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => openEditDialog(phone)}>
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
                            <AlertDialogTitle>Delete Phone Number</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete {phone.phone_number}? This action
                              cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(phone.phone_number)}
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
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Phone Number</DialogTitle>
              <DialogDescription>
                Update phone number settings
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Phone Number</Label>
                <p className="font-mono text-sm">{selectedPhone?.phone_number}</p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit_nickname">Nickname</Label>
                <Input
                  id="edit_nickname"
                  value={formData.nickname}
                  onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit_agent_id">Agent ID</Label>
                <Input
                  id="edit_agent_id"
                  value={formData.agent_id}
                  onChange={(e) => setFormData({ ...formData, agent_id: e.target.value })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="edit_inbound_recording">Inbound Call Recording</Label>
                <Switch
                  id="edit_inbound_recording"
                  checked={formData.inbound_call_recording_enabled}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, inbound_call_recording_enabled: checked })
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="edit_outbound_recording">Outbound Call Recording</Label>
                <Switch
                  id="edit_outbound_recording"
                  checked={formData.outbound_call_recording_enabled}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, outbound_call_recording_enabled: checked })
                  }
                />
              </div>
            </div>
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
