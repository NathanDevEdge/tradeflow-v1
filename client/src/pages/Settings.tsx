import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import DashboardLayout from "@/components/DashboardLayout";
import { Upload, Building2, Lock } from "lucide-react";

export default function Settings() {
  const { data: settings, isLoading } = trpc.companySettings.get.useQuery();
  const utils = trpc.useUtils();
  
  const [companyName, setCompanyName] = useState("");
  const [abn, setAbn] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  
  // Password change state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  // Initialize form when settings load
  useEffect(() => {
    if (settings) {
      setCompanyName(settings.companyName || "");
      setAbn(settings.abn || "");
      setAddress(settings.address || "");
      setPhone(settings.phone || "");
      setEmail(settings.email || "");
      setLogoUrl(settings.logoUrl || "");
    }
  }, [settings]);
  
  const upsertMutation = trpc.companySettings.upsert.useMutation({
    onSuccess: () => {
      utils.companySettings.get.invalidate();
      toast.success("Company settings saved successfully");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
  
  const handleSave = () => {
    upsertMutation.mutate({
      companyName: companyName || undefined,
      abn: abn || undefined,
      address: address || undefined,
      phone: phone || undefined,
      email: email || undefined,
      logoUrl: logoUrl || undefined,
    });
  };
  
  const changePasswordMutation = trpc.profile.changePassword.useMutation({
    onSuccess: () => {
      toast.success("Password changed successfully");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
  
  const uploadLogoMutation = trpc.companySettings.uploadLogo.useMutation({
    onSuccess: (data) => {
      setLogoUrl(data.url);
      utils.companySettings.get.invalidate();
      toast.success("Logo uploaded successfully");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
  
  const handleChangePassword = () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error("Please fill in all fields");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }

    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    changePasswordMutation.mutate({
      currentPassword,
      newPassword,
    });
  };
  
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }
    
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB");
      return;
    }
    
    setUploading(true);
    
    try {
      // Read file as base64
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result as string;
        const fileData = base64.split(",")[1]; // Remove data:image/...;base64, prefix
        
        await uploadLogoMutation.mutateAsync({
          fileData,
          fileName: file.name,
          mimeType: file.type,
        });
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload logo");
    } finally {
      setUploading(false);
    }
  };
  
  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" role="status" aria-label="Loading…" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-2xl space-y-6">
        <div className="pb-4 border-b">
          <h1 className="text-base font-semibold">Settings</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Company details and branding
          </p>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Company Details
            </CardTitle>
            <CardDescription>
              These details will appear on your quotes and purchase orders
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Logo Upload */}
            <div className="space-y-2">
              <Label htmlFor="logo">Company Logo</Label>
              <div className="flex items-center gap-4">
                {logoUrl && (
                  <div className="w-24 h-24 border rounded-lg overflow-hidden bg-muted flex items-center justify-center">
                    <img 
                      src={logoUrl} 
                      alt="Company logo" 
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>
                )}
                <div className="flex-1">
                  <Input
                    id="logo"
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    disabled={uploading}
                    className="cursor-pointer"
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    PNG, JPG or SVG. Max 5MB. Recommended: 400x400px
                  </p>
                </div>
              </div>
            </div>
            
            {/* Company Name */}
            <div className="space-y-2">
              <Label htmlFor="companyName">Company Name</Label>
              <Input
                id="companyName"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Your Company Pty Ltd"
              />
            </div>
            
            {/* ABN */}
            <div className="space-y-2">
              <Label htmlFor="abn">ABN / ACN</Label>
              <Input
                id="abn"
                value={abn}
                onChange={(e) => setAbn(e.target.value)}
                placeholder="12 345 678 901"
              />
            </div>
            
            {/* Address */}
            <div className="space-y-2">
              <Label htmlFor="address">Business Address</Label>
              <Textarea
                id="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="123 Business St&#10;Sydney NSW 2000&#10;Australia"
                rows={3}
              />
            </div>
            
            {/* Phone */}
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+61 2 1234 5678"
              />
            </div>
            
            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="info@yourcompany.com.au"
              />
            </div>
            
            {/* Save Button */}
            <div className="flex justify-end pt-4">
              <Button 
                onClick={handleSave}
                disabled={upsertMutation.isPending}
              >
                {upsertMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </CardContent>
        </Card>
        
        {/* Password Change */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Change Password
            </CardTitle>
            <CardDescription>
              Update your password to keep your account secure
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Current Password</Label>
              <Input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password (min 8 characters)"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
              />
            </div>
            <div className="flex justify-end pt-4">
              <Button 
                onClick={handleChangePassword} 
                disabled={changePasswordMutation.isPending}
              >
                {changePasswordMutation.isPending ? "Changing Password..." : "Change Password"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
