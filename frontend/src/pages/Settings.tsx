import { useState } from "react";
import { useAuth } from "@/api/auth";
import { supabase } from "@/lib/supabase";
import NavBar from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

export default function Settings() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const [username, setUsername] = useState(user?.username ?? "");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    if (!user) {
        navigate("/login?redirect=/settings", { replace: true });
        return null;
    }

    async function handleUpdateUsername() {
        const { error } = await supabase.auth.updateUser({
            data: { username },
        });
        if (error) {
            toast.error(error.message);
        } else {
            toast.success("Username updated");
        }
    }

    async function handleChangePassword() {
        if (newPassword !== confirmPassword) {
            toast.error("Passwords do not match");
            return;
        }
        if (newPassword.length < 6) {
            toast.error("Password must be at least 6 characters");
            return;
        }
        const { error } = await supabase.auth.updateUser({
            password: newPassword,
        });
        if (error) {
            toast.error(error.message);
        } else {
            toast.success("Password updated");
            setNewPassword("");
            setConfirmPassword("");
        }
    }

    async function handleDeleteAccount() {
        if (!confirm("Are you sure? This action cannot be undone.")) return;
        // Note: Supabase doesn't allow self-deletion by default.
        // You'd need a backend endpoint or edge function for this.
        toast.error("Account deletion requires contacting support.");
    }

    return (
        <>
            <NavBar />
            <main className="mx-auto w-full max-w-2xl px-6 py-10 space-y-6">
                <h1 className="text-2xl font-bold">Settings</h1>

                {/* Profile */}
                <Card>
                    <CardHeader>
                        <CardTitle>Profile</CardTitle>
                        <CardDescription>
                            Your public account information.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <FieldGroup>
                            <Field>
                                <FieldLabel>Email</FieldLabel>
                                <Input value={user.email} disabled />
                            </Field>
                            <Field>
                                <FieldLabel>Username</FieldLabel>
                                <Input
                                    value={username}
                                    onChange={(e) =>
                                        setUsername(e.target.value)}
                                />
                            </Field>
                            <Button onClick={handleUpdateUsername} size="sm">
                                Save Username
                            </Button>
                        </FieldGroup>
                    </CardContent>
                </Card>

                {/* Password */}
                <Card>
                    <CardHeader>
                        <CardTitle>Change Password</CardTitle>
                        <CardDescription>
                            Update your account password.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <FieldGroup>
                            <Field>
                                <FieldLabel>New Password</FieldLabel>
                                <Input
                                    type="password"
                                    value={newPassword}
                                    onChange={(e) =>
                                        setNewPassword(e.target.value)}
                                />
                            </Field>
                            <Field>
                                <FieldLabel>Confirm Password</FieldLabel>
                                <Input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) =>
                                        setConfirmPassword(e.target.value)}
                                />
                            </Field>
                            <Button onClick={handleChangePassword} size="sm">
                                Update Password
                            </Button>
                        </FieldGroup>
                    </CardContent>
                </Card>

                {/* Danger Zone */}
                <Card className="border-destructive/50">
                    <CardHeader>
                        <CardTitle className="text-destructive">
                            Danger Zone
                        </CardTitle>
                        <CardDescription>
                            Irreversible actions on your account.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <Separator />
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium">
                                    Sign out everywhere
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    Invalidates all active sessions.
                                </p>
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={logout}
                            >
                                Sign out
                            </Button>
                        </div>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium">
                                    Delete account
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    Permanently delete your account and all
                                    data.
                                </p>
                            </div>
                            <Button
                                variant="destructive"
                                size="sm"
                                onClick={handleDeleteAccount}
                            >
                                Delete
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </main>
        </>
    );
}
